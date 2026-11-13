const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app-harness');

function pushFixture({ permission = 'default', existing = null, backendStatus = 200 } = {}) {
  const calls = { subscribe: [], unsubscribe: 0, backend: [] };
  const subscription = existing || {
    endpoint: 'https://push.example.test/device-a',
    expirationTime: null,
    toJSON() {
      return { endpoint: this.endpoint, expirationTime: null, keys: { p256dh: 'p256dh-fixture', auth: 'auth-fixture' } };
    },
    async unsubscribe() { calls.unsubscribe += 1; return true; }
  };
  const pushManager = {
    async getSubscription() { return existing; },
    async subscribe(options) { calls.subscribe.push(options); return subscription; }
  };
  const Notification = {
    permission,
    async requestPermission() { this.permission = permission === 'default' ? 'granted' : permission; return this.permission; }
  };
  const fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.backend.push({ url, options, body });
    const success = body.action === 'revoke' ? { revoked: true } : { enrolled: true, duplicate: Boolean(existing) };
    return new Response(JSON.stringify(backendStatus === 200 ? success : { error: 'backend unavailable' }), {
      status: backendStatus,
      headers: { 'content-type': 'application/json' }
    });
  };
  const navigator = { serviceWorker: { ready: Promise.resolve({ pushManager }) } };
  const app = createApp({ navigator, Notification, fetch });
  app.hooks.setTestCloud(
    { url: 'https://project.supabase.co', anonKey: 'publishable-fixture', pushPublicKey: 'AQID' },
    { accessToken: 'user-jwt', refreshToken: 'refresh', expiresAt: Date.now() + 600000, user: { id: 'user-a' } }
  );
  return { app, calls, subscription };
}

test('explicit opt-in creates and enrolls a real PushManager subscription', async () => {
  const { app, calls } = pushFixture();
  assert.equal(typeof app.hooks.enrollPushDevice, 'function');
  const result = await app.hooks.enrollPushDevice();
  assert.equal(result.enrolled, true);
  assert.equal(calls.subscribe.length, 1);
  assert.equal(calls.subscribe[0].userVisibleOnly, true);
  assert.deepEqual(Array.from(calls.subscribe[0].applicationServerKey), [1, 2, 3]);
  assert.equal(calls.backend.length, 1);
  assert.equal(calls.backend[0].body.action, 'enroll');
  assert.equal(calls.backend[0].body.subscription.endpoint, 'https://push.example.test/device-a');
  assert.equal(typeof app.hooks.pushDeviceState, 'function');
  assert.equal(app.hooks.pushDeviceState().status, 'enabled');
  assert.notEqual(app.hooks.data.settings.pushEnrollmentStatus, 'enabled');
});

test('an existing subscription is reused without creating a duplicate browser subscription', async () => {
  const existing = {
    endpoint: 'https://push.example.test/device-existing', expirationTime: null,
    toJSON() { return { endpoint: this.endpoint, expirationTime: null, keys: { p256dh: 'existing-key', auth: 'existing-auth' } }; },
    async unsubscribe() { return true; }
  };
  const { app, calls } = pushFixture({ permission: 'granted', existing });
  assert.equal(typeof app.hooks.enrollPushDevice, 'function');
  const result = await app.hooks.enrollPushDevice();
  assert.equal(result.duplicate, true);
  assert.equal(calls.subscribe.length, 0);
  assert.equal(calls.backend.length, 1);
});

test('blocked notifications keep closed-app push disabled and never contact the backend', async () => {
  const { app, calls } = pushFixture({ permission: 'denied' });
  assert.equal(typeof app.hooks.enrollPushDevice, 'function');
  const result = await app.hooks.enrollPushDevice();
  assert.equal(result.enrolled, false);
  assert.equal(result.reason, 'permission-denied');
  assert.equal(calls.subscribe.length, 0);
  assert.equal(calls.backend.length, 0);
  assert.equal(typeof app.hooks.pushDeviceState, 'function');
  assert.equal(app.hooks.pushDeviceState().status, 'disabled');
});

test('failed backend enrollment rolls back only the newly created browser subscription', async () => {
  const { app, calls } = pushFixture({ backendStatus: 503 });
  assert.equal(typeof app.hooks.enrollPushDevice, 'function');
  const result = await app.hooks.enrollPushDevice();
  assert.equal(result.enrolled, false);
  assert.equal(result.reason, 'backend-failure');
  assert.equal(calls.unsubscribe, 1);
  assert.equal(typeof app.hooks.pushDeviceState, 'function');
  assert.equal(app.hooks.pushDeviceState().status, 'error');
});

test('revocation removes the scoped backend row before unsubscribing the browser', async () => {
  const order = [];
  const existing = {
    endpoint: 'https://push.example.test/device-revoke', expirationTime: null,
    toJSON() { return { endpoint: this.endpoint, expirationTime: null, keys: { p256dh: 'revoke-key', auth: 'revoke-auth' } }; },
    async unsubscribe() { order.push('browser'); return true; }
  };
  const { app, calls } = pushFixture({ permission: 'granted', existing });
  const originalFetch = app.sandbox.fetch;
  app.sandbox.fetch = async (...args) => { order.push('backend'); return originalFetch(...args); };
  assert.equal(typeof app.hooks.revokePushDevice, 'function');
  const result = await app.hooks.revokePushDevice();
  assert.equal(result.revoked, true);
  assert.deepEqual(order, ['backend', 'browser']);
  assert.equal(calls.backend[0].body.action, 'revoke');
  assert.equal(typeof app.hooks.pushDeviceState, 'function');
  assert.equal(app.hooks.pushDeviceState().status, 'disabled');
});
