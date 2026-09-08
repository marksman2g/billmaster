const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, scheduleFixture } = require('./app-harness');

function blockedStorage() { throw new Error('Storage is blocked for this isolated test'); }

test('a fully failed save cannot advance the saved baseline or create phantom undo history', () => {
  const app = scheduleFixture(createApp());
  const { hooks, sandbox } = app;
  hooks.resetUndoBaseline();
  const baseline = hooks.savedSnapshot;
  sandbox.localStorage.setItem = blockedStorage;
  sandbox.sessionStorage.setItem = blockedStorage;
  hooks.data.tasks[0].title = 'Unsaved draft';
  assert.equal(hooks.saveData(), false);
  assert.equal(hooks.savedSnapshot === baseline, true);
  assert.equal(hooks.undoCount, 0);
  assert.match(hooks.ui.lastSaveError, /could not save/);
});

test('temporary storage preserves recovery and undo until permanent storage works again', () => {
  const app = scheduleFixture(createApp());
  const { hooks, sandbox, temporaryStorage, storage } = app;
  hooks.resetUndoBaseline();
  const write = sandbox.localStorage.setItem;
  sandbox.localStorage.setItem = blockedStorage;
  hooks.data.tasks[0].title = 'Recovered draft';
  assert.equal(hooks.saveData(), false);
  assert.equal(hooks.undoCount, 1);
  assert.equal(temporaryStorage.size, 1);
  assert.match(hooks.ui.lastSaveError, /temporarily/);
  sandbox.localStorage.setItem = write;
  assert.equal(hooks.saveData(), true);
  assert.equal(temporaryStorage.size, 0);
  assert.equal(hooks.undoCount, 1);
  assert.equal(hooks.ui.lastSaveError, '');
  const saved = [...storage.values()].find((value) => value.includes('Recovered draft'));
  assert.ok(saved, 'the recovered draft must exist in durable storage');
  assert.equal(JSON.parse(saved).tasks.find((task) => task.id === 'early').title, 'Recovered draft');
});

test('an undo whose save fails remains retryable until the restored data is saved', () => {
  const app = scheduleFixture(createApp());
  const { hooks, sandbox } = app;
  hooks.resetUndoBaseline();
  hooks.data.tasks[0].title = 'Changed title';
  assert.equal(hooks.saveData(), true);
  assert.equal(hooks.undoCount, 1);
  const write = sandbox.localStorage.setItem;
  sandbox.localStorage.setItem = blockedStorage;
  sandbox.sessionStorage.setItem = blockedStorage;
  hooks.undoLastChange();
  assert.equal(hooks.undoCount, 1);
  assert.match(hooks.ui.lastSaveError, /could not save/);
  sandbox.localStorage.setItem = write;
  hooks.undoLastChange();
  assert.equal(hooks.undoCount, 0);
  assert.equal(hooks.ui.lastSaveError, '');
  assert.equal(JSON.parse(hooks.savedSnapshot).tasks.find((task) => task.id === 'early').title, 'Morning review');
});

test('storage warning and backup action reappear after a toast without redrawing an active form', () => {
  const app = createApp();
  app.hooks.ui.lastSaveError = 'Storage full: unsaved changes';
  app.hooks.showToast('Saved');
  const renders = app.renders;
  app.timers.at(-1)();
  assert.equal(app.renders, renders);
  assert.match(app.overlayHtml, /Storage full: unsaved changes/);
  assert.match(app.overlayHtml, /data-action="download-data"/);
  app.hooks.ui.lastSaveError = '';
  app.hooks.showToast('Storage recovered', 'success', { render: false });
  app.timers.at(-1)();
  assert.equal(app.renders, renders);
  assert.doesNotMatch(app.overlayHtml, /save-warning/);
});
