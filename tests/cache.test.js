const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const workerSource = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');
const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const currentCache = workerSource.match(/const CACHE_NAME = "([^"]+)"/)[1];
const appAsset = index.match(/src="(app\.js\?[^\"]+)"/)[1];

function worker({ cacheUnavailable = false, matchUnavailable = false } = {}) {
  const handlers = {};
  const entries = new Map();
  const deleted = [];
  let network = 0;
  let offline = false;
  const scope = 'https://example.test/billmaster/';
  const key = (request) => new URL(typeof request === 'string' ? request : request.url, scope).href;
  const cache = { match: async (req) => { if (matchUnavailable) throw new Error('Cache read unavailable'); return entries.get(key(req)); }, put: async (req, response) => entries.set(key(req), response), addAll: async (urls) => urls.forEach((url) => entries.set(key(url), {url: key(url), cached: true})) };
  vm.runInNewContext(workerSource, {
    URL, Response,
    self: { location: {origin:'https://example.test'}, registration: {scope}, addEventListener: (name, fn) => handlers[name] = fn, skipWaiting: async () => {}, clients: {claim: async () => {}} },
    caches: { open: async () => { if (cacheUnavailable) throw new Error('Cache unavailable'); return cache; }, keys: async () => ['billmaster-shell-v96', currentCache, 'another-app'], delete: async (name) => deleted.push(name) },
    fetch: async () => { network++; if (offline) throw new Error('Offline'); return {ok:true,type:'basic',clone(){return this;}}; }
  });
  return {handlers, entries, deleted, get network(){return network;}, set offline(value){offline=value;}};
}

test('worker install caches the exact versioned scripts in index.html', async () => {
  const w = worker();
  let pending;
  w.handlers.install({waitUntil: (promise) => pending = promise});
  await pending;
  for (const match of index.matchAll(/(?:src|href)="((?:app\.js|styles\.css|billmaster-config\.js)\?[^\"]+)"/g)) {
    assert.ok(w.entries.has(`https://example.test/billmaster/${match[1]}`), match[1]);
  }
  let result;
  w.handlers.fetch({request:{method:'GET',url:`https://example.test/billmaster/${appAsset}`},respondWith:(promise)=>result=promise});
  assert.ok((await result).cached);
  assert.equal(w.network, 0, 'warm app.js must not download again');
});

test('worker cleanup preserves other applications and offline navigation works', async () => {
  const w = worker();
  let pending;
  w.handlers.install({waitUntil:(promise)=>pending=promise}); await pending;
  w.handlers.activate({waitUntil:(promise)=>pending=promise}); await pending;
  assert.deepEqual(w.deleted, ['billmaster-shell-v96']);
  w.offline = true;
  w.handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://example.test/billmaster/index.html?cachebust=test'},respondWith:(promise)=>pending=promise});
  assert.ok((await pending).cached);
});

test('unavailable cache storage never blocks a successful network response', async () => {
  for (const failure of [{cacheUnavailable:true}, {matchUnavailable:true}]) {
    const w = worker(failure);
    let pending;
    w.handlers.fetch({request:{method:'GET',url:`https://example.test/billmaster/${appAsset}`},respondWith:(promise)=>pending=promise});
    assert.ok((await pending).ok);
    assert.equal(w.network, 1);
  }
});
