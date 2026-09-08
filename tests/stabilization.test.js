const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, scheduleFixture } = require('./app-harness');

test('AI answers the exact reported task-count question, without extra details', () => {
  const { hooks } = scheduleFixture(createApp());
  assert.equal(hooks.aiAppDataAnswer('How many tasks do I have for today?'), 'three');
  assert.equal(hooks.aiAppDataAnswer('How many bills do I have today?'), 'one');
  assert.equal(hooks.aiAppDataAnswer('Please tell me how many events I have today.'), 'three');
});

test('AI honors time windows and meaningful title filters', () => {
  const { hooks } = scheduleFixture(createApp());
  assert.equal(hooks.aiAppDataAnswer('How many events do I have after 9:00 a.m. today?'), 'two');
  assert.equal(hooks.aiAppDataAnswer('How many gym tasks do I have today?'), 'one');
  assert.equal(hooks.aiAppDataAnswer('How many appointments do I have today?'), 'three');
});

test('AI this/next week are anchored to today, not a previously viewed calendar', () => {
  const { hooks } = createApp();
  hooks.ui.selectedDate = '2026-12-15';
  assert.equal(hooks.aiCalendarRange('this week').startIso, '2026-09-06');
  assert.equal(hooks.aiCalendarRange('next week').startIso, '2026-09-13');
});

test('temporary category filters cannot hide saved tasks from AI', () => {
  const { hooks } = scheduleFixture(createApp());
  hooks.ui.taskCategoryFilters = { Work: false, Habit: false, Personal: false, General: false };
  assert.equal(hooks.aiAppDataAnswer('How many tasks do I have today?'), 'three');
});

test('Today task display and bulk selection use the same current-date filter', () => {
  const { hooks } = scheduleFixture(createApp());
  hooks.ui.taskFilter = 'today';
  assert.deepEqual(Array.from(hooks.visibleTaskListIds()).sort(), ['early', 'later']);
  const html = hooks.renderTasks();
  assert.ok(html.includes('Morning review'));
  assert.ok(!html.includes('Old task'));
});

test('bill relative dates use real local today', () => {
  const { hooks } = createApp();
  assert.equal(hooks.daysBetween('2026-09-08'), 0);
  assert.equal(hooks.daysBetween('2026-09-07'), -1);
  assert.equal(hooks.daysBetween('2026-09-09'), 1);
  assert.equal(hooks.nextBillMonthlyDate({ dueDate: '2026-05-06' }), '2026-10-06');
  assert.equal(hooks.nextBillIntervalDate({ dueDate: '2026-09-01' }, 7), '2026-09-08');
  assert.equal(hooks.nextBillYearlyDate({ dueDate: '2024-05-06' }), '2027-05-06');
});

test('destructive actions fail closed without a working confirmation API', () => {
  const { hooks } = scheduleFixture(createApp());
  assert.equal(hooks.confirmDelete('task'), false);
  assert.equal(hooks.confirmStartFresh('Tasks', '4 tasks'), false);
  const before = JSON.stringify(hooks.data);
  hooks.startFreshSection('tasks');
  hooks.resetData();
  assert.equal(JSON.stringify(hooks.data), before);
});

test('toast expiry never replaces the app or erases an in-progress form', () => {
  const app = createApp();
  app.hooks.showToast('Saved');
  const renders = app.renders;
  app.timers.at(-1)();
  assert.equal(app.renders, renders);
});

test('resetting notebooks preserves notes not inside any notebook', () => {
  const { hooks } = createApp({ confirm: () => true });
  hooks.data.notebooks = [{ id: 'book', title: 'My book' }];
  hooks.data.notes = [{ id: 'inside', title: 'In book', notebookId: 'book' }, { id: 'loose', title: 'Standalone', notebookId: null }];
  hooks.startFreshSection('notebooks');
  assert.deepEqual(Array.from(hooks.data.notes, (note) => note.id), ['loose']);
});

test('canceling destructive actions preserves all data, including individual deletes', () => {
  const { hooks } = scheduleFixture(createApp({ confirm: () => false }));
  hooks.ui.selectedTasks = ['early'];
  const before = JSON.stringify(hooks.data);
  hooks.deleteTask('early');
  hooks.deleteNote(hooks.data.notes[0]?.id);
  hooks.deleteHabitSeries('habit');
  hooks.deleteSelectedTasks();
  hooks.resetData();
  assert.equal(JSON.stringify(hooks.data), before);
});

test('cash balance excludes debt, investments, hidden accounts and double-counted transactions', () => {
  const { hooks } = createApp();
  hooks.data.accounts = [
    { id: 'a', type: 'Checking', balance: 100.07 },
    { id: 'b', type: 'Savings', balance: 0.1 },
    { id: 'c', type: 'Credit', balance: 1000 },
    { id: 'd', type: 'Checking', balance: 999, plaidLinked: true, plaidIncluded: false },
    { id: 'e', type: 'Investment', balance: 5000 }
  ];
  hooks.data.transactions = [{ type: 'income', amount: 100000 }];
  assert.equal(hooks.dashboardCashBalance(), 100.17);
});

test('today briefing counts all unpaid bills due today, not a capped upcoming list', () => {
  const { hooks } = createApp();
  const bills = Array.from({length: 5}, (_, i) => ({id: String(i), dueDate:'2026-09-08', status:'Pending'}));
  bills.push({dueDate:'2026-09-07',status:'Pending'}, {dueDate:'2026-09-09',status:'Pending'}, {dueDate:'2026-09-08',status:'Paid'});
  assert.match(hooks.todayBriefingCard('2026-09-08', [], bills, 0, 0), /<strong>5<\/strong><span>bills due<\/span>/);
});

test('relative dates work across daylight-saving transitions', () => {
  const { hooks } = createApp({now:'2026-03-08T12:00:00'});
  assert.equal(hooks.daysBetween('2026-03-07'), -1);
  assert.equal(hooks.daysBetween('2026-03-09'), 1);
});

test('monthly expense questions use financial data, not the calendar, and honor dates', () => {
  const { hooks } = createApp();
  hooks.data.transactions = [
    {type:'expense',category:'Food',amount:25,date:'2026-09-07'},
    {type:'expense',category:'Travel',amount:1000,date:'2026-08-01'},
    {type:'expense',category:'Transfer',amount:999,date:'2026-09-07',isTransfer:true}
  ];
  const answer = hooks.aiAppDataAnswer('What are my biggest expenses this month?');
  assert.ok(answer.includes('Food at $25.00'));
  assert.ok(!answer.includes('Travel') && !answer.includes('Transfer') && !answer.includes('calendar'));
});
