const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const begin = '// BEGIN BILLMASTER CLOUD CAS';
const end = '// END BILLMASTER CLOUD CAS';
if (!appSource.includes(begin) || !appSource.includes(end)) throw new Error('Cloud CAS section missing from application');
const snippetSource = appSource.slice(appSource.indexOf(begin), appSource.indexOf(end) + end.length);
// Exercise the application's actual collection merge with the exact CAS section,
// while replacing network, clock, profile and storage boundaries with fixtures.
const collectionMergeSource = appSource.slice(appSource.indexOf('  function mergeSyncCollection('), appSource.indexOf('  function pushUndoSnapshot('));
const clone = structuredClone;
const stamp = '2026-10-20T10:00:00.000Z';
const task = (id, title = id, updatedAt = stamp) => ({ id, title, updatedAt });
const payload = (tasks = []) => ({ tasks, settings: { deletedItems: {}, cloudAutoSync: true } });

function backend(initial = null) {
  const state = { row: clone(initial), calls: [], beforeWrite: null, forceConflicts: false };
  state.fetch = async (url, options) => {
    state.calls.push({ url, method: options.method });
    if (options.method === 'GET') return state.row ? [clone(state.row)] : [];
    if (state.beforeWrite) await state.beforeWrite(url, options);
    const incoming = JSON.parse(options.body);
    if (state.forceConflicts) return [];
    if (options.method === 'POST') {
      assert.match(options.headers.Prefer, /ignore-duplicates/);
      if (state.row) return [];
    } else {
      assert.equal(options.method, 'PATCH');
      const query = new URL(url, 'https://example.invalid').searchParams;
      if (!state.row || query.get('updated_at') !== `eq.${state.row.updated_at}`) return [];
    }
    state.row = { payload: clone(incoming.payload), updated_at: incoming.updated_at };
    return [{ updated_at: state.row.updated_at }];
  };
  return state;
}

function client(service, initial) {
  const snapshots = [];
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-20T12:00:00Z'])); } static now() { return Date.parse('2026-10-20T12:00:00Z'); } }
  const context = {
    Date: FixedDate, Map, Set, JSON, Object, Array, Math, Error, encodeURIComponent,
    data: clone(initial), seed: payload(), cloudSession: { user: { id: 'fixture-owner' } }, currentProfileId: 'fixture-profile',
    cloudHasLocalUnsyncedChanges: true, clone, normalizeData: (v) => v,
    mergeSeed: (base, saved) => ({ ...base, ...saved, settings: { ...base.settings, ...saved.settings } }),
    safeArray: (v) => Array.isArray(v) ? v.filter((item) => item && typeof item === 'object') : [],
    syncCollectionKeys: () => ['tasks'], syncItemId: (_name, item) => item?.id || '',
    cloudTimeValue: (v) => Number.isFinite(Date.parse(v)) ? Date.parse(v) : 0,
    syncItemTime: (item, fallback = '') => Date.parse(item?.updatedAt || item?.syncUpdatedAt || fallback) || 0,
    syncFingerprint: (value) => JSON.stringify(value, (key, v) => ['updatedAt', 'syncUpdatedAt'].includes(key) ? undefined : v),
    workspaceFallbackTime: (v) => v?.settings?.cloudRemoteUpdatedAt || '',
    mergeDeletedItems: (a = {}, b = {}) => {
      const result = clone(a); for (const [collection, items] of Object.entries(b)) for (const [id, at] of Object.entries(items)) {
        result[collection] ||= {}; if (!result[collection][id] || at > result[collection][id]) result[collection][id] = at;
      } return result;
    },
    activeProfile: () => ({ displayName: 'Fixture' }), cloudFetch: service.fetch,
    clearCloudConflict() { context.data.settings.cloudSyncConflictAt = ''; },
    markCloudConflict() { context.data.settings.cloudSyncConflictAt = new FixedDate().toISOString(); context.cloudHasLocalUnsyncedChanges = true; },
    setCloudSyncState(state, message) { context.data.settings.cloudSyncState = state; context.data.settings.cloudSyncMessage = message; },
    saveData() { snapshots.push(clone(context.data)); return !context.storageFails; },
    cloudAutoSyncEnabled: () => true, scheduleCloudAutoPush() { context.scheduled = (context.scheduled || 0) + 1; }
  };
  context.fetchCloudWorkspaceRow = async () => (await context.cloudFetch('/rest/v1/billmaster_workspaces?select=payload,updated_at', { method: 'GET' }))[0] || null;
  vm.createContext(context);
  vm.runInContext(collectionMergeSource + '\n' + snippetSource, context);
  return { context, snapshots, push: () => context.pushWorkspaceToCloud() };
}

test('two clients racing from one revision preserve both edits through CAS retry', async () => {
  const service = backend({ payload: payload(), updated_at: stamp });
  const a = client(service, payload([task('a')]));
  const b = client(service, payload([task('b')]));
  await Promise.all([a.push(), b.push()]);
  assert.deepEqual(service.row.payload.tasks.map((t) => t.id).sort(), ['a', 'b']);
  assert.equal(service.calls.filter((c) => c.method === 'PATCH').length, 3);
});

test('simultaneous first inserts ignore conflict then merge rather than overwrite', async () => {
  const service = backend();
  const a = client(service, payload([task('a')]));
  const b = client(service, payload([task('b')]));
  await Promise.all([a.push(), b.push()]);
  assert.deepEqual(service.row.payload.tasks.map((t) => t.id).sort(), ['a', 'b']);
  assert.equal(service.calls.filter((c) => c.method === 'POST').length, 2);
});

test('edits and deletion during request survive acknowledgement and stay queued', async () => {
  const service = backend({ payload: payload([task('edit'), task('remove')]), updated_at: stamp });
  const c = client(service, payload([task('edit'), task('remove')]));
  service.beforeWrite = () => {
    c.context.data.tasks = [task('edit', 'Changed during request'), task('new')];
    service.beforeWrite = null;
  };
  const result = await c.push();
  assert.equal(result.pendingLocalChanges, true);
  assert.deepEqual(Array.from(c.context.data.tasks, (t) => t.id).sort(), ['edit', 'new']);
  assert.equal(c.context.data.tasks.find((t) => t.id === 'edit').title, 'Changed during request');
  assert.ok(c.context.data.settings.deletedItems.tasks.remove);
  assert.equal(c.context.cloudHasLocalUnsyncedChanges, true);
  assert.equal(c.context.scheduled, 1);
  await c.push();
  assert.deepEqual(service.row.payload.tasks.map((t) => t.id).sort(), ['edit', 'new']);
});

test('a settings edit during the request remains local and queues a follow-up write', async () => {
  const service = backend({ payload: payload(), updated_at: stamp });
  const c = client(service, payload());
  service.beforeWrite = () => { c.context.data.settings.interfaceMode = 'simple'; service.beforeWrite = null; };
  await c.push();
  assert.equal(c.context.data.settings.interfaceMode, 'simple');
  assert.equal(c.context.cloudHasLocalUnsyncedChanges, true);
  await c.push();
  assert.equal(service.row.payload.settings.interfaceMode, 'simple');
});

test('in-flight edit wins causally even when other device clock is ahead', async () => {
  const future = '2026-10-21T12:00:00.000Z';
  const service = backend({ payload: payload([task('edit', 'Future remote', future)]), updated_at: future });
  const c = client(service, payload([task('edit', 'Original local')]));
  service.beforeWrite = () => { c.context.data.tasks = [task('edit', 'Newest local')]; service.beforeWrite = null; };
  await c.push();
  assert.equal(c.context.data.tasks[0].title, 'Newest local');
  assert.ok(Date.parse(c.context.data.tasks[0].updatedAt) > Date.parse(future));
  await c.push();
  assert.equal(service.row.payload.tasks[0].title, 'Newest local');
});

test('conflict retries are bounded and preserve local records', async () => {
  const service = backend({ payload: payload(), updated_at: stamp }); service.forceConflicts = true;
  const c = client(service, payload([task('keep')]));
  await assert.rejects(c.push(), /changed repeatedly/);
  assert.equal(service.calls.filter((call) => call.method === 'PATCH').length, 3);
  assert.equal(c.context.data.tasks[0].id, 'keep');
  assert.equal(c.context.cloudHasLocalUnsyncedChanges, true);
});

test('network or local storage failure never reports all changes synchronized', async () => {
  const service = backend({ payload: payload(), updated_at: stamp });
  const c = client(service, payload([task('keep')]));
  service.beforeWrite = () => { throw new Error('Network unavailable'); };
  await assert.rejects(c.push(), /Network unavailable/);
  assert.equal(c.context.cloudHasLocalUnsyncedChanges, true);
  assert.equal(c.context.data.tasks[0].id, 'keep');
  service.beforeWrite = null; c.context.storageFails = true;
  await assert.rejects(c.push(), /could not store/);
  assert.equal(c.context.cloudHasLocalUnsyncedChanges, true);
});

test('changing active profile during request cannot replace new profile data', async () => {
  const service = backend({ payload: payload(), updated_at: stamp });
  const c = client(service, payload([task('old-profile')]));
  service.beforeWrite = () => { c.context.currentProfileId = 'new-profile'; c.context.data = payload([task('new-profile')]); };
  await assert.rejects(c.push(), /active workspace changed/);
  assert.equal(c.context.data.tasks[0].id, 'new-profile');
});
