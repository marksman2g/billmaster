const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

const root = path.join(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'supabase/functions/plaid-sync/index.ts'), 'utf8');
const deliverySource = fs.readFileSync(path.join(root, 'supabase/functions/plaid-sync/delivery.ts'), 'utf8');

function mockDatabase() {
  const tables = {
    billmaster_plaid_tokens: [{ user_id: 'user-a', item_id: 'item-a', access_token: 'fixture-only', cursor: 'cursor-0', environment: 'sandbox' }],
    billmaster_plaid_connections: [{ user_id: 'user-a', item_id: 'item-a', accounts: [{ account_id: 'old-account' }], updated_at: '2026-01-01' }],
    billmaster_plaid_sync_batches: []
  };
  let nextSequence = 0;
  const db = { tables, calls: [], failStage: false, failMetadata: false, failBatchRead: false };
  db.from = (table) => {
    let filters = [], order = '', limit = Infinity, single = false, update = null;
    const query = {
      select() { return query; }, eq(key, value) { filters.push((row) => row[key] === value); return query; },
      is(key, value) { filters.push((row) => row[key] === value); return query; },
      gt(key, value) { filters.push((row) => row[key] > value); return query; },
      order(key) { order = key; return query; }, limit(value) { limit = value; return query; },
      maybeSingle() { single = true; return query; }, update(value) { update = value; return query; },
      then(resolve, reject) {
        try {
          db.calls.push({ table, update });
          if (table === 'billmaster_plaid_sync_batches' && db.failBatchRead) return Promise.resolve({ data: null, error: { code: '42P01', message: 'missing journal' } }).then(resolve, reject);
          if (table === 'billmaster_plaid_connections' && update && db.failMetadata) return Promise.resolve({ data: null, error: { message: 'metadata write failed' } }).then(resolve, reject);
          const rows = (tables[table] || []).filter((row) => filters.every((fn) => fn(row)));
          if (order) rows.sort((a, b) => a[order] - b[order]);
          if (update) rows.forEach((row) => Object.assign(row, structuredClone(update)));
          const found = rows.slice(0, limit);
          return Promise.resolve({ data: structuredClone(single ? found[0] || null : found), error: null }).then(resolve, reject);
        } catch (error) { return Promise.reject(error).then(resolve, reject); }
      }
    };
    return query;
  };
  db.rpc = async (name, params) => {
    db.calls.push({ rpc: name, params });
    const token = tables.billmaster_plaid_tokens.find((r) => r.user_id === params.p_user_id && r.item_id === params.p_item_id && r.environment === params.p_environment);
    if (!token) return { error: { code: '40001' } };
    const scoped = tables.billmaster_plaid_sync_batches.filter((r) => r.user_id === params.p_user_id && r.item_id === params.p_item_id);
    if (name === 'billmaster_stage_plaid_batch') {
      if (db.failStage) return { error: { code: 'XX000', message: 'journal unavailable' } };
      const pending = scoped.find((r) => !r.acknowledged_at);
      if (pending) return { data: structuredClone(pending), error: null };
      if (token.cursor !== params.p_expected_cursor) return { error: { code: '40001' } };
      const row = { batch_id: `00000000-0000-4000-8000-${String(++nextSequence).padStart(12, '0')}`, batch_sequence: nextSequence, user_id: params.p_user_id, item_id: params.p_item_id, environment: params.p_environment, base_cursor: params.p_expected_cursor, next_cursor: params.p_next_cursor, payload: structuredClone(params.p_payload), acknowledged_at: null };
      tables.billmaster_plaid_sync_batches.push(row);
      return { data: structuredClone(row), error: null };
    }
    const row = scoped.find((r) => r.batch_id === params.p_batch_id);
    if (!row) return { error: { code: 'P0002' } };
    if (row.acknowledged_at) return { data: { acknowledged: true, already_acknowledged: true, batch_id: row.batch_id } };
    if (token.cursor !== row.base_cursor) return { error: { code: '40001' } };
    token.cursor = row.next_cursor;
    row.acknowledged_at = 'fixture-time';
    return { data: { acknowledged: true, already_acknowledged: false, batch_id: row.batch_id } };
  };
  return db;
}

function backend(responses = []) {
  const requests = [];
  const env = { PLAID_ENV: 'sandbox', PLAID_CLIENT_ID: 'fixture', PLAID_SECRET: 'fixture' };
  const sandbox = {
    console, URL, Response, Request,
    createClient() { throw new Error('No real database clients in tests'); },
    Deno: { serve() {}, env: { get: (key) => env[key] } },
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      const next = responses.shift();
      if (!next) throw new Error('Unexpected provider request');
      if (next.check) next.check(requests.at(-1));
      if (next.throw) throw new Error('offline');
      return { ok: !next.error, status: next.error ? 400 : 200, json: async () => next.error ? { error_code: next.error } : next };
    }
  };
  const code = stripTypeScriptTypes(deliverySource.replace('export function', 'function') + '\n' + indexSource.replace(/^import .*;\r?\n/gm, ''), { mode: 'strip' });
  vm.runInNewContext(code + '\nglobalThis.hooks = { syncOnePlaidItem, acknowledgeTransactions, nextDeliveryBatch, listConnections, syncTransactions };', sandbox);
  return { ...sandbox.hooks, requests, env };
}
const token = (db) => structuredClone(db.tables.billmaster_plaid_tokens[0]);
const page = (overrides = {}) => ({ next_cursor: 'cursor-1', has_more: false, added: [{ transaction_id: 'tx-added', amount: 10, date: '2026-10-20' }], modified: [{ transaction_id: 'tx-edited', amount: 20 }], removed: [{ transaction_id: 'tx-removed', account_id: 'account-a' }], ...overrides });
const accounts = { accounts: [{ account_id: 'account-a', name: 'Checking', type: 'depository', balances: { current: 50 } }] };

test('durable journal precedes ACK-only cursor advancement; retries and second-device replay do not lose removals', async () => {
  const db = mockDatabase(), h = backend([page(), accounts]);
  const result = await h.syncOnePlaidItem(db, 'user-a', token(db), '2026-10-20');
  assert.equal(db.tables.billmaster_plaid_tokens[0].cursor, 'cursor-0');
  assert.equal(result.accounts_complete, true);
  assert.equal(result.removed[0].transaction_id, 'tx-removed');
  assert.equal(result.added[0].transaction_id, 'tx-added');
  assert.equal(result.modified[0].transaction_id, 'tx-edited');
  const retry = await h.syncOnePlaidItem(db, 'user-a', token(db), 'later');
  assert.equal(retry.batch_id, result.batch_id);
  assert.equal(h.requests.length, 2);
  await h.acknowledgeTransactions(db, 'user-a', { item_id: 'item-a', batch_id: result.batch_id });
  assert.equal(db.tables.billmaster_plaid_tokens[0].cursor, 'cursor-1');
  assert.equal((await h.acknowledgeTransactions(db, 'user-a', { item_id: 'item-a', batch_id: result.batch_id })).already_acknowledged, true);
  const secondDevice = await h.syncOnePlaidItem(db, 'user-a', token(db), 'later');
  assert.equal(secondDevice.batch_id, result.batch_id);
  assert.equal(h.requests.length, 2);
});
test('database failure leaves original cursor unchanged and does not report a successful delivery', async () => {
  const db = mockDatabase(), h = backend([page(), accounts]); db.failStage = true;
  await assert.rejects(h.syncOnePlaidItem(db, 'user-a', token(db), 'now'), /journal unavailable/);
  assert.equal(db.tables.billmaster_plaid_tokens[0].cursor, 'cursor-0');
  assert.equal(db.tables.billmaster_plaid_sync_batches.length, 0);
});
test('pagination mutation discards the partial attempt and restarts at the original cursor', async () => {
  const db = mockDatabase(), h = backend([
    page({ next_cursor: 'partial', has_more: true, added: [{ transaction_id: 'discard-me' }] }),
    { error: 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION' },
    page({ check: (request) => assert.equal(request.body.cursor, 'cursor-0') }), accounts
  ]);
  const result = await h.syncOnePlaidItem(db, 'user-a', token(db), 'now');
  assert.equal(result.added.length, 1);
  assert.equal(result.added[0].transaction_id, 'tx-added');
  assert.equal(result.requests, 3);
});
test('an endless page stream never persists a partial transaction update', async () => {
  const db = mockDatabase(), h = backend(Array.from({ length: 50 }, (_, i) => page({ next_cursor: `page-${i}`, has_more: true })));
  await assert.rejects(h.syncOnePlaidItem(db, 'user-a', token(db), 'now'), /No partial delivery/);
  assert.equal(db.tables.billmaster_plaid_tokens[0].cursor, 'cursor-0');
  assert.equal(db.tables.billmaster_plaid_sync_batches.length, 0);
});
test('account refresh failures preserve account membership; a successful empty list is authoritative', async () => {
  const db = mockDatabase(), h = backend([page(), { throw: true }]);
  const stale = await h.syncOnePlaidItem(db, 'user-a', token(db), 'now');
  assert.equal(stale.accounts_complete, false);
  assert.match(stale.accounts_refresh_error, /retain saved/);
  assert.equal(db.tables.billmaster_plaid_connections[0].accounts[0].account_id, 'old-account');
  const db2 = mockDatabase(), h2 = backend([page(), { accounts: [] }]);
  const empty = await h2.syncOnePlaidItem(db2, 'user-a', token(db2), 'now');
  assert.equal(empty.accounts_complete, true);
  assert.equal(empty.accounts.length, 0);
  assert.equal(db2.tables.billmaster_plaid_connections[0].accounts.length, 0);
});
test('replay ordering uses each device marker and remains scoped to user, item and environment', async () => {
  const db = mockDatabase(), h = backend([page(), accounts, page({ next_cursor: 'cursor-2' }), accounts]);
  const first = await h.syncOnePlaidItem(db, 'user-a', token(db), 'now');
  await h.acknowledgeTransactions(db, 'user-a', { item_id: 'item-a', batch_id: first.batch_id });
  const second = await h.syncOnePlaidItem(db, 'user-a', token(db), 'later', first.batch_id);
  assert.notEqual(first.batch_id, second.batch_id);
  const catchup = await h.syncOnePlaidItem(db, 'user-a', token(db), 'later');
  assert.equal(catchup.batch_id, first.batch_id);
  assert.equal(catchup.has_more, true);
  assert.equal((await h.nextDeliveryBatch(db, 'user-a', 'item-a', first.batch_id)).batch_id, second.batch_id);
  await assert.rejects(h.nextDeliveryBatch(db, 'different-user', 'item-a', first.batch_id), (error) => error.status === 409);
  await assert.rejects(h.syncOnePlaidItem(db, 'user-a', { ...token(db), environment: 'production' }, 'now'), (error) => error.status === 409);
});
test('ACK cannot be forged for another user and a cursor race is retryable without overwriting newer work', async () => {
  const db = mockDatabase(), h = backend([page(), accounts]);
  const result = await h.syncOnePlaidItem(db, 'user-a', token(db), 'now');
  await assert.rejects(h.acknowledgeTransactions(db, 'user-b', { item_id: 'item-a', batch_id: result.batch_id }), (error) => error.status === 409);
  db.tables.billmaster_plaid_tokens[0].cursor = 'someone-elses-progress';
  await assert.rejects(h.acknowledgeTransactions(db, 'user-a', { item_id: 'item-a', batch_id: result.batch_id }), (error) => error.status === 409);
  assert.equal(db.tables.billmaster_plaid_tokens[0].cursor, 'someone-elses-progress');
});
test('scheduled sync skips acknowledged history but reuses its pending durable batch', async () => {
  const db = mockDatabase(), h = backend([page(), accounts, page({ next_cursor: 'cursor-2' }), accounts]);
  const first = await h.syncOnePlaidItem(db, 'user-a', token(db), 'first', '', false);
  await h.acknowledgeTransactions(db, 'user-a', { item_id: 'item-a', batch_id: first.batch_id });
  const second = await h.syncOnePlaidItem(db, 'user-a', token(db), 'second', '', false);
  assert.notEqual(second.batch_id, first.batch_id);
  assert.equal((await h.syncOnePlaidItem(db, 'user-a', token(db), 'retry', '', false)).batch_id, second.batch_id);
  assert.equal(h.requests.length, 4);
});
test('missing migration fails closed before any provider request; failed metadata cannot discard a staged batch', async () => {
  const db = mockDatabase(), h = backend([]); db.failBatchRead = true;
  await assert.rejects(h.syncOnePlaidItem(db, 'user-a', token(db), 'now'), /missing journal/);
  assert.equal(h.requests.length, 0);
  const db2 = mockDatabase(), h2 = backend([page(), accounts]); db2.failMetadata = true;
  const result = await h2.syncOnePlaidItem(db2, 'user-a', token(db2), 'now');
  assert.match(result.metadata_refresh_error, /durable batch remains/);
  assert.ok(result.batch_id);
  assert.equal(db2.tables.billmaster_plaid_tokens[0].cursor, 'cursor-0');
});
test('connection refresh exposes stale status and allows authoritative account removal', async () => {
  const db = mockDatabase(), h = backend([{ throw: true }]);
  const stale = (await h.listConnections(db, 'user-a')).connections[0];
  assert.equal(stale.accounts_complete, false);
  assert.equal(stale.accounts_stale, true);
  assert.equal(stale.accounts[0].account_id, 'old-account');
  const h2 = backend([{ accounts: [] }]);
  const fresh = (await h2.listConnections(db, 'user-a')).connections[0];
  assert.equal(fresh.accounts_complete, true);
  assert.equal(fresh.accounts.length, 0);
});
test('migration restricts journal and RPCs to service_role, locks cursor rows, and cascades deletion', () => {
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/202610200001_plaid_delivery_journal.sql'), 'utf8');
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table .* from public, anon, authenticated/);
  assert.match(sql, /foreign key \(user_id, item_id\).*on delete cascade/);
  assert.match(sql, /where user_id=p_user_id and item_id=p_item_id for update/);
  assert.match(sql, /token_row.cursor is distinct from batch_row.base_cursor/);
  assert.match(sql, /revoke all on function .* from public,anon,authenticated/);
});
