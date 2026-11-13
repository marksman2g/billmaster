const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

const root = path.join(__dirname, '..');

function loadTypescript(relativePath, names) {
  const fullPath = path.join(root, relativePath);
  const source = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
  const hooks = names.map((name) => `${name}: typeof ${name} === 'function' ? ${name} : undefined`).join(',');
  const code = stripTypeScriptTypes(source.replace(/^export /gm, '') + `\nglobalThis.hooks = {${hooks}};`, { mode: 'strip' });
  const sandbox = { structuredClone, URL, crypto, console };
  vm.runInNewContext(code, sandbox);
  return sandbox.hooks;
}

function subscription(endpoint = 'https://push.example.test/device-a') {
  return { endpoint, expirationTime: null, keys: { p256dh: 'p256dh-fixture', auth: 'auth-fixture' } };
}

function subscriptionRepository() {
  const rows = [];
  return {
    rows,
    async upsert(userId, value) {
      const existing = rows.find((row) => row.endpoint === value.endpoint);
      if (existing) {
        const duplicate = existing.user_id === userId;
        Object.assign(existing, { user_id: userId, subscription: structuredClone(value), revoked_at: null });
        return { duplicate };
      }
      rows.push({ user_id: userId, endpoint: value.endpoint, subscription: structuredClone(value), revoked_at: null });
      return { duplicate: false };
    },
    async revoke(userId, endpoint) {
      const row = rows.find((item) => item.user_id === userId && item.endpoint === endpoint && !item.revoked_at);
      if (!row) return false;
      row.revoked_at = '2026-11-13T12:00:00.000Z';
      return true;
    },
    async status(userId) { return rows.filter((row) => row.user_id === userId && !row.revoked_at).length; },
    async acknowledge(userId, occurrenceKey) { return { user_id: userId, occurrence_key: occurrenceKey, acknowledged: true }; }
  };
}

test('authenticated enrollment ignores a forged user id and binds the subscription to the verified user', async () => {
  const { executeSubscriptionAction } = loadTypescript('supabase/functions/push-subscriptions/actions.ts', ['executeSubscriptionAction']);
  assert.equal(typeof executeSubscriptionAction, 'function');
  const repository = subscriptionRepository();
  const result = await executeSubscriptionAction({ action: 'enroll', user_id: 'user-b', subscription: subscription() }, { userId: 'user-a', repository });
  assert.equal(result.enrolled, true);
  assert.equal(repository.rows[0].user_id, 'user-a');
  assert.equal(repository.rows.some((row) => row.user_id === 'user-b'), false);
});

test('duplicate enrollment remains idempotent and revocation cannot cross user boundaries', async () => {
  const { executeSubscriptionAction } = loadTypescript('supabase/functions/push-subscriptions/actions.ts', ['executeSubscriptionAction']);
  assert.equal(typeof executeSubscriptionAction, 'function');
  const repository = subscriptionRepository();
  await executeSubscriptionAction({ action: 'enroll', subscription: subscription() }, { userId: 'user-a', repository });
  const duplicate = await executeSubscriptionAction({ action: 'enroll', subscription: subscription() }, { userId: 'user-a', repository });
  assert.equal(duplicate.duplicate, true);
  const otherUser = await executeSubscriptionAction({ action: 'revoke', endpoint: subscription().endpoint }, { userId: 'user-b', repository });
  assert.equal(otherUser.revoked, true);
  assert.equal(otherUser.changed, false);
  assert.equal(repository.rows[0].revoked_at, null);
  const owner = await executeSubscriptionAction({ action: 'revoke', endpoint: subscription().endpoint }, { userId: 'user-a', repository });
  assert.equal(owner.revoked, true);
  assert.equal(owner.changed, true);
  const repeated = await executeSubscriptionAction({ action: 'revoke', endpoint: subscription().endpoint }, { userId: 'user-a', repository });
  assert.equal(repeated.revoked, true);
  assert.equal(repeated.changed, false);
});

test('acknowledgment is scoped from authentication and malformed subscriptions fail closed', async () => {
  const { executeSubscriptionAction } = loadTypescript('supabase/functions/push-subscriptions/actions.ts', ['executeSubscriptionAction']);
  assert.equal(typeof executeSubscriptionAction, 'function');
  const repository = subscriptionRepository();
  const receipt = await executeSubscriptionAction({ action: 'acknowledge', user_id: 'user-b', occurrence_key: 'task-a:2026-11-13' }, { userId: 'user-a', repository });
  assert.equal(receipt.user_id, 'user-a');
  await assert.rejects(
    executeSubscriptionAction({ action: 'enroll', subscription: { endpoint: 'javascript:alert(1)', keys: {} } }, { userId: 'user-a', repository }),
    /valid HTTPS push subscription/
  );
  await assert.rejects(
    executeSubscriptionAction({ action: 'enroll', subscription: subscription('https://push.example.test/device\nheader') }, { userId: 'user-a', repository }),
    /valid HTTPS push subscription/
  );
  await assert.rejects(
    executeSubscriptionAction({ action: 'enroll', subscription: { ...subscription(), keys: { p256dh: 'key\nheader', auth: 'auth' } } }, { userId: 'user-a', repository }),
    /valid HTTPS push subscription/
  );
});

function subscriptionDatabase() {
  const rows = [];
  return {
    rows,
    from(table) {
      assert.equal(table, 'billmaster_push_subscriptions');
      const filters = [];
      let operation = 'select';
      let update = null;
      let countRequested = false;
      const matchingRows = () => rows.filter((row) => filters.every((filter) => filter(row)));
      const query = {
        select(_columns, options = {}) { countRequested = options.count === 'exact'; return query; },
        eq(key, value) { filters.push((row) => row[key] === value); return query; },
        is(key, value) { filters.push((row) => row[key] === value); return query; },
        update(value) { operation = 'update'; update = value; return query; },
        delete() { operation = 'delete'; return query; },
        async maybeSingle() { return { data: structuredClone(matchingRows()[0] || null), error: null }; },
        async upsert(value) {
          const previous = rows.find((row) => row.endpoint === value.endpoint);
          if (previous) Object.assign(previous, structuredClone(value));
          else rows.push({ subscription_id: `sub-${rows.length + 1}`, ...structuredClone(value) });
          return { data: null, error: null };
        },
        then(resolve, reject) {
          try {
            const matches = matchingRows();
            if (operation === 'update') matches.forEach((row) => Object.assign(row, structuredClone(update)));
            if (operation === 'delete') matches.forEach((row) => rows.splice(rows.indexOf(row), 1));
            return Promise.resolve({ data: structuredClone(matches), count: countRequested ? matches.length : null, error: null }).then(resolve, reject);
          } catch (error) { return Promise.reject(error).then(resolve, reject); }
        }
      };
      return query;
    }
  };
}

test('the real subscription repository deletes only the authenticated owner row on revoke', async () => {
  const { createSubscriptionRepository } = loadTypescript('supabase/functions/push-subscriptions/repository.ts', ['createSubscriptionRepository']);
  assert.equal(typeof createSubscriptionRepository, 'function');
  const database = subscriptionDatabase();
  const repository = createSubscriptionRepository(database, () => '2026-11-13T12:00:00.000Z');
  assert.equal((await repository.upsert('user-a', subscription())).duplicate, false);
  assert.equal((await repository.upsert('user-a', subscription())).duplicate, true);
  assert.equal(await repository.status('user-a'), 1);
  assert.equal(await repository.revoke('user-b', subscription().endpoint), false);
  assert.equal(database.rows.length, 1);
  assert.equal(database.rows[0].user_id, 'user-a');
  assert.equal(await repository.revoke('user-a', subscription().endpoint), true);
  assert.equal(database.rows.length, 0);
  assert.equal(await repository.status('user-a'), 0);
});

function reminderRepository() {
  const deliveries = new Map();
  const subscriptions = new Map([['user-a', [subscription()]]]);
  return {
    deliveries,
    revoked: [],
    acknowledged: new Set(),
    monthSpend: 0,
    async getDelivery(userId, occurrenceKey) { return deliveries.get(`${userId}:${occurrenceKey}`) || null; },
    async saveDelivery(userId, occurrenceKey, patch) {
      const key = `${userId}:${occurrenceKey}`;
      const row = { ...(deliveries.get(key) || {}), user_id: userId, occurrence_key: occurrenceKey, ...structuredClone(patch) };
      deliveries.set(key, row);
      return structuredClone(row);
    },
    async claimPush(userId, occurrenceKey, patch) {
      const key = `${userId}:${occurrenceKey}`;
      if (deliveries.has(key)) return { claimed: false, delivery: structuredClone(deliveries.get(key)) };
      const delivery = { user_id: userId, occurrence_key: occurrenceKey, push_status: 'pending', ...structuredClone(patch) };
      deliveries.set(key, delivery);
      return { claimed: true, delivery: structuredClone(delivery) };
    },
    async listSubscriptions(userId) { return structuredClone(subscriptions.get(userId) || []); },
    async revokeSubscription(userId, endpoint) { this.revoked.push({ userId, endpoint }); },
    async isAcknowledged(userId, occurrenceKey) { return this.acknowledged.has(`${userId}:${occurrenceKey}`); },
    async monthSmsSpendCents() { return this.monthSpend; }
  };
}

function senderHooks() {
  return loadTypescript('supabase/functions/push-reminders/delivery.ts', ['dispatchPushReminder', 'dispatchSmsFallback']);
}

test('server push sends one generic reminder, schedules fallback at 15 minutes, and suppresses duplicate sends', async () => {
  const { dispatchPushReminder } = senderHooks();
  assert.equal(typeof dispatchPushReminder, 'function');
  const repository = reminderRepository();
  const sent = [];
  const request = { userId: 'user-a', occurrenceKey: 'task-a:2026-11-13', importance: 'important', pushEnabled: true, smsFallbackEnabled: true };
  const dependencies = { repository, pushProvider: { async send(value, payload) { sent.push({ value, payload }); return { statusCode: 201 }; } }, now: () => new Date('2026-11-13T12:00:00.000Z') };
  const first = await dispatchPushReminder(request, dependencies);
  assert.equal(first.status, 'sent');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].payload, undefined);
  assert.equal(first.fallbackEligibleAt, '2026-11-13T12:15:00.000Z');
  const duplicate = await dispatchPushReminder(request, dependencies);
  assert.equal(duplicate.duplicate, true);
  assert.equal(sent.length, 1);
});

test('concurrent server dispatches atomically claim one occurrence and send only once', async () => {
  const { dispatchPushReminder } = senderHooks();
  assert.equal(typeof dispatchPushReminder, 'function');
  const repository = reminderRepository();
  let sends = 0;
  const request = { userId: 'user-a', occurrenceKey: 'race', importance: 'important', pushEnabled: true, smsFallbackEnabled: true };
  const dependencies = {
    repository,
    pushProvider: { async send() { sends += 1; await Promise.resolve(); return { statusCode: 201 }; } },
    now: () => new Date('2026-11-13T12:00:00.000Z')
  };
  const results = await Promise.all([dispatchPushReminder(request, dependencies), dispatchPushReminder(request, dependencies)]);
  assert.equal(sends, 1);
  assert.equal(results.filter((result) => result.duplicate).length, 1);
  assert.equal(results.filter((result) => result.status === 'sent').length, 1);
  assert.equal(results.find((result) => result.duplicate).status, 'pending');
});

test('the Edge sender claims each occurrence through a service-only atomic database function', () => {
  const sender = fs.readFileSync(path.join(root, 'supabase/functions/push-reminders/index.ts'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261113225759_push_reminders.sql'), 'utf8');
  const schema = fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');
  assert.match(sender, /rpc\("billmaster_claim_push_reminder"/);
  for (const sql of [migration, schema]) {
    assert.match(sql, /create or replace function public\.billmaster_claim_push_reminder/);
    assert.match(sql, /on conflict \(user_id, occurrence_key\) do nothing/);
    assert.match(sql, /revoke all on function public\.billmaster_claim_push_reminder[\s\S]*from public, anon, authenticated/);
    assert.match(sql, /grant execute on function public\.billmaster_claim_push_reminder[\s\S]*to service_role/);
  }
});

test('disabled push never calls the provider and terminal push failure revokes the dead subscription', async () => {
  const { dispatchPushReminder } = senderHooks();
  assert.equal(typeof dispatchPushReminder, 'function');
  const repository = reminderRepository();
  let calls = 0;
  const disabled = await dispatchPushReminder(
    { userId: 'user-a', occurrenceKey: 'disabled', importance: 'normal', pushEnabled: false, smsFallbackEnabled: false },
    { repository, pushProvider: { async send() { calls += 1; } }, now: () => new Date('2026-11-13T12:00:00.000Z') }
  );
  assert.equal(disabled.status, 'disabled');
  assert.equal(calls, 0);
  const failed = await dispatchPushReminder(
    { userId: 'user-a', occurrenceKey: 'failed', importance: 'important', pushEnabled: true, smsFallbackEnabled: true },
    { repository, pushProvider: { async send() { const error = new Error('gone'); error.statusCode = 410; throw error; } }, now: () => new Date('2026-11-13T12:00:00.000Z') }
  );
  assert.equal(failed.status, 'failed');
  assert.deepEqual(repository.revoked, [{ userId: 'user-a', endpoint: subscription().endpoint }]);
});

test('SMS fallback sends only opted-in unacknowledged important alerts after 15 minutes', async () => {
  const { dispatchPushReminder, dispatchSmsFallback } = senderHooks();
  assert.equal(typeof dispatchSmsFallback, 'function');
  const repository = reminderRepository();
  const request = { userId: 'user-a', occurrenceKey: 'important', importance: 'important', pushEnabled: true, smsFallbackEnabled: true };
  await dispatchPushReminder(request, { repository, pushProvider: { async send() { return { statusCode: 201 }; } }, now: () => new Date('2026-11-13T12:00:00.000Z') });
  const sends = [];
  const smsProvider = { async quote() { return { costCents: 3, balanceCents: 100 }; }, async send(value) { sends.push(value); return { providerId: 'synthetic-1', costCents: 3 }; } };
  const policy = { perMessageCapCents: 5, monthlyCapCents: 50 };
  const result = await dispatchSmsFallback(request, { repository, smsProvider, policy, now: () => new Date('2026-11-13T12:15:00.000Z') });
  assert.equal(result.status, 'sent');
  assert.equal(sends.length, 1);
  const duplicate = await dispatchSmsFallback(request, { repository, smsProvider, policy, now: () => new Date('2026-11-13T12:16:00.000Z') });
  assert.equal(duplicate.duplicate, true);
  assert.equal(sends.length, 1);
});

test('SMS fallback blocks normal, early, acknowledged, spending-cap, balance, and provider-failure paths', async () => {
  const { dispatchPushReminder, dispatchSmsFallback } = senderHooks();
  assert.equal(typeof dispatchSmsFallback, 'function');
  const repository = reminderRepository();
  let sends = 0;
  const smsProvider = { async quote() { return { costCents: 7, balanceCents: 6 }; }, async send() { sends += 1; return { providerId: 'unexpected', costCents: 7 }; } };
  const policy = { perMessageCapCents: 5, monthlyCapCents: 10 };
  const normal = await dispatchSmsFallback(
    { userId: 'user-a', occurrenceKey: 'normal', importance: 'normal', smsFallbackEnabled: true },
    { repository, smsProvider, policy, now: () => new Date('2026-11-13T12:30:00.000Z') }
  );
  assert.equal(normal.status, 'disabled');
  const important = { userId: 'user-a', occurrenceKey: 'guarded', importance: 'important', pushEnabled: true, smsFallbackEnabled: true };
  await dispatchPushReminder(important, { repository, pushProvider: { async send() { return { statusCode: 201 }; } }, now: () => new Date('2026-11-13T12:00:00.000Z') });
  const early = await dispatchSmsFallback(important, { repository, smsProvider, policy, now: () => new Date('2026-11-13T12:14:59.000Z') });
  assert.equal(early.status, 'not-due');
  repository.acknowledged.add('user-a:guarded');
  const acknowledged = await dispatchSmsFallback(important, { repository, smsProvider, policy, now: () => new Date('2026-11-13T12:15:00.000Z') });
  assert.equal(acknowledged.status, 'acknowledged');
  repository.acknowledged.clear();
  const overCap = await dispatchSmsFallback(important, { repository, smsProvider, policy, now: () => new Date('2026-11-13T12:15:00.000Z') });
  assert.equal(overCap.status, 'spending-blocked');
  assert.match(overCap.reason, /per-message cap/);

  const monthly = { ...important, occurrenceKey: 'monthly-cap' };
  await dispatchPushReminder(monthly, { repository, pushProvider: { async send() { return { statusCode: 201 }; } }, now: () => new Date('2026-11-13T12:00:00.000Z') });
  repository.monthSpend = 8;
  const monthlyBlocked = await dispatchSmsFallback(monthly, {
    repository,
    smsProvider: { async quote() { return { costCents: 3, balanceCents: 100 }; }, async send() { sends += 1; } },
    policy,
    now: () => new Date('2026-11-13T12:15:00.000Z')
  });
  assert.equal(monthlyBlocked.status, 'spending-blocked');
  assert.match(monthlyBlocked.reason, /monthly cap/);

  const balance = { ...important, occurrenceKey: 'low-balance' };
  await dispatchPushReminder(balance, { repository, pushProvider: { async send() { return { statusCode: 201 }; } }, now: () => new Date('2026-11-13T12:00:00.000Z') });
  repository.monthSpend = 0;
  const balanceBlocked = await dispatchSmsFallback(balance, {
    repository,
    smsProvider: { async quote() { return { costCents: 3, balanceCents: 2 }; }, async send() { sends += 1; } },
    policy,
    now: () => new Date('2026-11-13T12:15:00.000Z')
  });
  assert.equal(balanceBlocked.status, 'spending-blocked');
  assert.match(balanceBlocked.reason, /balance is insufficient/);

  const providerFailure = { ...important, occurrenceKey: 'provider-failure' };
  await dispatchPushReminder(providerFailure, { repository, pushProvider: { async send() { return { statusCode: 201 }; } }, now: () => new Date('2026-11-13T12:00:00.000Z') });
  const failed = await dispatchSmsFallback(providerFailure, {
    repository,
    smsProvider: { async quote() { return { costCents: 3, balanceCents: 100 }; }, async send() { throw new Error('synthetic provider offline'); } },
    policy,
    now: () => new Date('2026-11-13T12:15:00.000Z')
  });
  assert.equal(failed.status, 'failed');
  assert.match(failed.reason, /synthetic provider offline/);
  assert.equal(sends, 0);
});
