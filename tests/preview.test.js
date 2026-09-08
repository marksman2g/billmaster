const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPreviewServer } = require('../scripts/serve-billmaster');

test('preview serves the app, rejects malformed URLs, and never serves project/private files', async (t) => {
  const server = createPreviewServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await fetch(`${base}/app.js?v=20260908-2`)).status, 200);
  assert.equal((await fetch(`${base}/%E0%A4%A`)).status, 400);
  for (const resource of ['.git/config', '.env', 'supabase/.temp/project-ref', 'package.json', 'tests/app-harness.js', 'scripts/set-supabase-key.js', '%2e%2e%5cpackage.json']) {
    assert.ok([403, 404].includes((await fetch(`${base}/${resource}`)).status), resource);
  }
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  assert.equal(await (await fetch(base, { method: 'HEAD' })).text(), '');
});
