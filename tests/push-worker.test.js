const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function workerFixture() {
  const handlers = {};
  const shown = [];
  const opened = [];
  const scope = 'https://example.test/billmaster/';
  vm.runInNewContext(readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8'), {
    URL,
    self: {
      addEventListener(name, handler) { handlers[name] = handler; },
      registration: { scope, async showNotification(title, options) { shown.push({ title, options }); } },
      clients: { async matchAll() { return []; }, async openWindow(url) { opened.push(url); } }
    }
  });
  return { handlers, shown, opened };
}

test('closed-app receiver requests a generic notification and opens the review inbox', async () => {
  const { handlers, shown, opened } = workerFixture();
  let pending;
  const waitUntil = promise => { pending = promise; };
  handlers.push({ waitUntil });
  await pending;
  assert.equal(shown.length, 1);
  assert.equal(shown[0].title, 'BillMaster reminder');
  let closed = false;
  handlers.notificationclick({ waitUntil, notification: {
    data: shown[0].options.data, close() { closed = true; }
  } });
  await pending;
  assert.equal(closed, true);
  assert.deepEqual(opened, ['https://example.test/billmaster/index.html#inbox']);
});
