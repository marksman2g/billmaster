const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app-harness');
const fixture = (overrides = {}) => ({ issuer: 'Example issuer', program: 'Annual certificate', year: '2026', amount: '125.50', unit: 'USD', deadline: '2026-12-31', source: 'Issuer notice', sourceUrl: 'https://example.com/notice', observedAt: '2026-09-30', status: 'Needs verification', offsets: '90,60,30,7,1', ...overrides });
const setup = () => createApp({ now: '2026-10-20T12:00:00' }).hooks;

test('rejects impossible dates and unsafe source links', () => {
  const h = setup();
  assert.equal(h.watchUpsert(fixture({ deadline: '2026-02-30' })).ok, false);
  assert.equal(h.watchUpsert(fixture({ sourceUrl: 'javascript:alert(1)' })).ok, false);
  assert.equal(h.watchUpsert(fixture({ observedAt: '2026-12-31' })).ok, false);
  assert.equal(h.watchSafeUrl('https://user:pass@example.com'), '');
});
test('deduplicates notices for the same program/year but keeps future certificates separate', () => {
  const h = setup();
  assert.equal(h.watchUpsert(fixture()).ok, true);
  assert.equal(h.watchUpsert(fixture({ source: 'Second notice' })).ok, false);
  assert.equal(h.watchUpsert(fixture({ year: '2027', deadline: '2027-12-31' })).ok, true);
  assert.equal(h.financialWatchItems().length, 2);
  assert.equal(h.financialWatchNotices().length, 1);
});
test('preserves unknown value and does not turn reward values into cash balances', () => {
  const h = setup();
  const balance = h.dashboardCashBalance();
  assert.equal(h.watchUpsert(fixture({ amount: '' })).item.amount, null);
  assert.equal(h.dashboardCashBalance(), balance);
  assert.match(h.renderFinancialWatch(), /Amount unknown/);
});
test('editing an existing certificate updates instead of duplicating it', () => {
  const h = setup();
  const first = h.watchUpsert(fixture()).item;
  assert.equal(h.watchUpsert({ ...first, amount: '200' }).ok, true);
  assert.equal(h.financialWatchItems().length, 1);
  assert.equal(h.financialWatchItems()[0].amount, 200);
});
test('snooze expires, redeemed items stop alerting, reopening restores alerts', () => {
  const h = setup();
  const r = h.watchUpsert(fixture()).item;
  h.watchUpdateStatus(r.id, 'snooze');
  assert.equal(h.financialWatchNotices().length, 0);
  assert.equal(h.financialWatchNotices('2026-10-27').length, 1);
  h.watchUpdateStatus(r.id, 'Redeemed');
  assert.equal(h.financialWatchNotices('2026-12-31').length, 0);
  h.watchUpdateStatus(r.id, 'Active');
  assert.equal(h.financialWatchNotices().length, 1);
});
test('lead times, deadline day and passed deadlines follow calendar days across DST', () => {
  const h = setup();
  h.watchUpsert(fixture({ offsets: '7,1' }));
  assert.equal(h.financialWatchNotices().length, 0);
  assert.equal(h.financialWatchNotices('2026-12-24').length, 1);
  assert.equal(h.financialWatchNotices('2026-12-24')[0].reminderStage, '7-day reminder');
  assert.equal(h.financialWatchNotices('2026-12-30')[0].reminderStage, '1-day reminder');
  assert.equal(h.financialWatchNotices('2026-12-31')[0].days, 0);
  assert.equal(h.financialWatchNotices('2027-01-01')[0].days, -1);
  assert.equal(h.financialWatchItems('2026-10-31')[0].days, 61);
});
test('snoozing near expiration cannot suppress the deadline-day notice', () => {
  const h = setup();
  const r = h.watchUpsert(fixture()).item;
  h.watchUpdateStatus(r.id, 'snooze', '2026-12-30');
  assert.equal(h.financialWatchNotices('2026-12-30').length, 0);
  assert.equal(h.financialWatchNotices('2026-12-31').length, 1);
});
test('reward records survive save normalization and reach durable browser storage', () => {
  const app = createApp({ now: '2026-10-20T12:00:00' });
  app.hooks.watchUpsert(fixture());
  assert.equal(app.hooks.saveData({ cloudSync: false }), true);
  assert.ok([...app.storage.values()].some((v) => v.includes('Annual certificate')));
  assert.equal(app.hooks.financialWatchItems().length, 1);
});
test('source text and reward names render escaped; no executable URL is rendered', () => {
  const h = setup();
  h.watchUpsert(fixture({ program: '<img src=x onerror=alert(1)>', source: '<script>bad()</script>' }));
  const html = h.renderFinancialWatch();
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<script>bad()'));
});
test('saved timeline excludes paid/provider-confirmed cancellations, keeps passed dates and linked occurrences', () => {
  const h = setup();
  h.data.bills = [{ id: 'b1', name: 'Upcoming bill', dueDate: '2026-10-25', status: 'Pending', amount: 40 }, { id: 'b2', name: 'Paid', dueDate: '2026-10-25', status: 'Paid', amount: 40 }];
  h.data.subscriptions = [{ id: 's1', name: 'Linked', billId: 'b1', nextDate: '2026-10-25', amount: 40, status: 'Active' }, { id: 's2', name: 'Old date', nextDate: '2026-09-01', amount: 10, status: 'Active' }, { id: 's3', name: 'Canceled', nextDate: '2026-10-25', amount: 10, status: 'Cancelled', cancellationState: 'confirmed' }];
  const items = h.watchWithdrawalItems();
  assert.equal(items.length, 2);
  assert.equal(items[0].date, '2026-09-01');
  assert.match(items[0].status, /refresh/);
  assert.equal(items[1].amountConfidence, 'Estimate');
  h.data.subscriptions.push({ id: 'next', billId: 'b2', name: 'New cycle of a paid bill', nextDate: '2026-10-29', amount: 12, status: 'Active' });
  assert.equal(h.watchWithdrawalItems().length, 3);
});
