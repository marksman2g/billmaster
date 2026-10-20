const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createApp({ now = '2026-09-08T12:00:00', confirm } = {}) {
  const NativeDate = Date;
  class FixedDate extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return new NativeDate(now).getTime(); }
  }
  let renders = 0;
  let html = '';
  const overlayNodes = [];
  const app = {
    get innerHTML() { return html; },
    set innerHTML(value) { html = value; overlayNodes.length = 0; renders++; },
    appendChild(node) { overlayNodes.push(node); }
  };
  const timers = [];
  const storage = new Map();
  const temporaryStorage = new Map();
  const warnings = [];
  const sandbox = {
    Date: FixedDate,
    document: {
      getElementById(id) { return id === 'app' ? app : null; },
      addEventListener() {},
      querySelectorAll(selector) {
        return overlayNodes.filter((node) => !node.removed && node.html.includes(`class="${selector.slice(1)}"`));
      },
      createElement(tag) {
        if (tag !== 'template') return { click() {} };
        return {
          innerHTML: '',
          get content() { return { firstElementChild: { html: this.innerHTML, remove() { this.removed = true; } } }; }
        };
      }
    },
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    sessionStorage: { getItem: (key) => temporaryStorage.get(key) || null, setItem: (key, value) => temporaryStorage.set(key, value), removeItem: (key) => temporaryStorage.delete(key) },
    window: { location: { hash: '#dashboard' }, history: { pushState() {} }, addEventListener() {}, open() {}, confirm },
    requestAnimationFrame(callback) { callback(); },
    setTimeout(callback) { timers.push(callback); return timers.length; }, clearTimeout() {},
    structuredClone, Blob, URL, console: { ...console, warn: (...args) => warnings.push(args) }
  };
  const exports = `globalThis.testHooks = {
    get data() { return data; }, set data(value) { data = value; }, ui,
    setTestProfile(value) { currentProfileId = value; plaidWorkspaceEpoch += 1; },
    aiAppDataAnswer, aiCalendarAnswer, aiCalendarTopic, aiCalendarRange, aiLeastEventsAnswer,
    daysBetween, nextBillMonthlyDate, nextBillIntervalDate, nextBillYearlyDate,
    visibleTaskListIds, renderTasks, render, showToast, confirmDelete, confirmStartFresh,
    startFreshSection, resetData, saveData, resetUndoBaseline, undoLastChange, renderSaveWarning,
    get undoCount() { return undoStack.length; }, get savedSnapshot() { return lastSavedSnapshot; },
    reconcilePlaidAccounts, applyPlaidConnectionResult, applyPlaidSyncResult, persistPlaidDelivery, acknowledgeSavedPlaidBatches, plaidDeviceDeliveryState, reportableTransactions, visibleAccounts,
    normalizeData, mergeSeed, mergeWorkspacePayloads, normalizeFinancialWatch, saveWatchSchedule, subscriptionCancellationState, subscriptionStillRecurring, monthlySubAmount, monthlySubProjected, watchWithdrawalNotices, watchResolveObligation, financialWatchGuidance, weatherForDate, weatherChip, weatherMotionLayer, modalImportStatement, paySubscription, setSubscriptionStatus,
    financialWatchItems, financialWatchNotices, watchDate, watchSafeUrl, watchUpsert, watchUpdateStatus, renderFinancialWatch, financialWatchDashboardCard, watchWithdrawalItems,
    habitCompletionSummary, habitInstancesForRange, dashboardCashBalance, renderDashboard, todayBriefingCard,
    deleteTask, deleteNote, deleteHabitSeries, deleteSelectedTasks
  };`;
  const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, `${exports}\n})();`), sandbox, { timeout: 10000 });
  return {
    hooks: sandbox.testHooks, sandbox, storage, temporaryStorage, warnings, timers,
    get renders() { return renders; }, get html() { return html; },
    get overlayHtml() { return overlayNodes.filter((node) => !node.removed).map((node) => node.html).join(''); }
  };
}

function scheduleFixture(app) {
  const { data } = app.hooks;
  data.tasks = [
    { id: 'early', title: 'Morning review', date: '2026-09-08', start: '08:00', end: '08:30', category: 'Work', status: 'Pending' },
    { id: 'later', title: 'Team meeting', date: '2026-09-08', start: '10:00', end: '11:00', category: 'Work', status: 'Pending' },
    { id: 'tomorrow', title: 'Dentist appointment', date: '2026-09-09', start: '09:00', end: '10:00', category: 'Personal', status: 'Pending' },
    { id: 'historical', title: 'Old task', date: '2026-05-06', start: '10:00', end: '11:00', category: 'Work', status: 'Pending' }
  ];
  data.habits = [{ id: 'habit', title: 'Gym session', schedule: 'Daily', status: 'Active', startDate: '2026-09-01', start: '18:00', end: '19:00', completions: [] }];
  data.bills = [{ id: 'bill', name: 'Internet', dueDate: '2026-09-08', amount: 50, status: 'Pending' }];
  data.subscriptions = [];
  data.projects = [];
  return app;
}

module.exports = { createApp, scheduleFixture };
