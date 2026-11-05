const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app-harness.js');

const today = '2026-09-08';

function task(id, overrides = {}) {
  return { id, title: id, description: '', date: today, endDate: today,
    start: '12:15', end: '12:45', priority: 'Medium', status: 'Not Started',
    repeat: 'None', category: 'General', completedDates: [], subtasks: [],
    ...overrides };
}

test('daily and weekly tasks appear once on each scheduled date, including the calendar', () => {
  const { hooks } = createApp();
  hooks.data.tasks = [
    task('daily', { date: '2026-09-07', endDate: '2026-09-07', repeat: 'Daily' }),
    task('weekly', { date: '2026-09-01', endDate: '2026-09-01', repeat: 'Weekly' }),
    task('once', { date: today })
  ];
  hooks.data.habits = [];
  hooks.ui.taskFilter = 'today';
  assert.deepEqual([...hooks.visibleTaskListIds()].sort(), ['daily', 'once', 'weekly']);
  const calendar = hooks.calendarItemsForDay(today);
  assert.equal(calendar.filter((item) => item.id === 'daily').length, 1);
  assert.equal(calendar.find((item) => item.id === 'weekly').date, today);
  const range = hooks.calendarItemsForRange('2026-09-08', '2026-09-10');
  assert.deepEqual(Array.from(range.filter((item) => item.id === 'daily'), (item) => item.date),
    ['2026-09-08', '2026-09-09', '2026-09-10']);
  assert.equal(range.filter((item) => item.id === 'weekly').length, 1);
});

test('recurring deadlines retain their offset from each planned occurrence', () => {
  const { hooks } = createApp();
  const series = task('series', { date: '2026-09-07', endDate: '2026-09-07',
    deadline: '2026-09-09', repeat: 'Daily' });
  assert.equal(hooks.taskOccurrenceForDate(series, '2026-09-08').deadline, '2026-09-10');
  assert.equal(hooks.taskOccurrenceForDate(series, '2026-09-10').deadline, '2026-09-12');
  series.deadline = '2026-09-06';
  assert.equal(hooks.taskOccurrenceForDate(series, '2026-09-08').deadline, '2026-09-07');
});

test('My Day shows due and missed recurring deadlines until their occurrence is completed', () => {
  const { hooks } = createApp();
  hooks.data.tasks = [task('daily-due', { date: '2026-09-06', endDate: '2026-09-06',
    deadline: '2026-09-07', repeat: 'Daily' })];
  const groups = hooks.myDayTaskGroups();
  assert.deepEqual(Array.from(groups.find((group) => group.title === 'Past deadline').tasks,
    (item) => item.date), ['2026-09-06']);
  assert.deepEqual(Array.from(groups.find((group) => group.title === 'Deadline today').tasks,
    (item) => item.date), ['2026-09-07']);
  assert.match(hooks.renderDashboard(), /1 overdue deadlines/);
  hooks.toggleTaskOccurrence('daily-due', '2026-09-06');
  const updated = hooks.myDayTaskGroups();
  assert.equal(updated.find((group) => group.title === 'Past deadline').tasks.length, 0);
  assert.equal(updated.find((group) => group.title === 'Deadline today').tasks.length, 1);
});

test('completing one repeating occurrence persists without ending later occurrences or firing its alert', () => {
  const { hooks, storage } = createApp({ now: '2026-09-08T12:00:00' });
  hooks.data.tasks = [task('repeat', { date: '2026-09-07', endDate: '2026-09-07', repeat: 'Daily',
    alertConfigured: true, alertOffsets: [15], alertDevice: false, alertSound: false, alertEmail: false })];
  hooks.data.habits = [];
  assert.equal(hooks.toggleTaskOccurrence('repeat', today), true);
  assert.equal(hooks.data.tasks[0].status, 'Not Started');
  assert.deepEqual([...hooks.data.tasks[0].completedDates], [today]);
  assert.equal(hooks.taskOccurrenceForDate(hooks.data.tasks[0], today).status, 'Completed');
  assert.equal(hooks.taskOccurrenceForDate(hooks.data.tasks[0], '2026-09-09').status, 'Not Started');
  hooks.scanTaskAlerts();
  assert.equal(hooks.data.tasks[0].alertFiredKeys.length, 0);
  assert.ok([...storage.values()].some((value) => value.includes('"completedDates":["2026-09-08"]')));
  assert.equal(hooks.toggleTaskOccurrence('repeat', today), true);
  hooks.scanTaskAlerts();
  assert.equal(hooks.data.tasks[0].alertFiredKeys.length, 1);
  assert.match(hooks.taskAlertSummary(hooks.data.tasks[0]), /no channel available/i);
  assert.match(hooks.taskAlertSummary(hooks.data.tasks[0]), /does not confirm receipt/i);
});

test('legacy completed series remains ended and is not silently revived', () => {
  const { hooks } = createApp();
  const series = task('ended', { date: '2026-09-07', repeat: 'Daily', status: 'Completed' });
  hooks.data.tasks = [series];
  assert.equal(hooks.taskOccurrenceForDate(series, today), null);
  assert.equal(hooks.toggleTaskOccurrence('ended', today), false);
});

test('search input filters task titles, descriptions, projects and checklist terms', () => {
  const app = createApp();
  const { hooks } = app;
  hooks.data.tasks = [task('buy', { title: 'Buy supplies', description: 'For the workshop', subtasks: [{ text: 'Check screws' }] }),
    task('call', { title: 'Call supplier', projectId: 'proj', description: 'Ask about delivery' })];
  hooks.data.projects = [{ id: 'proj', name: 'Garage build' }];
  hooks.ui.view = 'tasks';
  const input = app.listeners.input.find((handler) => handler.toString().includes('task-search'));
  assert.ok(input);
  input({ target: { id: 'taskSearch', dataset: { action: 'task-search' }, value: 'garage delivery' } });
  assert.deepEqual([...hooks.visibleTaskListIds()], ['call']);
  assert.match(app.html, /Call supplier/);
  assert.doesNotMatch(app.html, /Buy supplies/);
  hooks.ui.taskQuery = 'screws';
  assert.deepEqual([...hooks.visibleTaskListIds()], ['buy']);
});

test('My Day separates missed plans from real deadlines and shows current recurring work', () => {
  const { hooks } = createApp();
  hooks.data.tasks = [
    task('missed-plan', { date: '2026-09-07', endDate: '2026-09-07' }),
    task('past-deadline', { date: '2026-09-07', endDate: '2026-09-07', deadline: '2026-09-07' }),
    task('due-today', { date: '2026-09-09', endDate: '2026-09-09', deadline: today }),
    task('today-plan'),
    task('daily', { date: '2026-09-07', endDate: '2026-09-07', repeat: 'Daily' })
  ];
  hooks.ui.taskFilter = 'my-day';
  const groups = hooks.myDayTaskGroups();
  const find = (title) => Array.from(groups.find((group) => group.title === title).tasks, (item) => item.id);
  assert.deepEqual(find('Past deadline'), ['past-deadline']);
  assert.deepEqual(find('Deadline today'), ['due-today']);
  assert.deepEqual([...find('Planned today')].sort(), ['daily', 'today-plan']);
  assert.deepEqual(find('Needs replanning'), ['missed-plan']);
  assert.match(hooks.renderTasks(), /A planned date is not a deadline/);
  hooks.ui.view = 'dashboard';
  hooks.handleAction({ dataset: { action: 'show-my-day' } });
  assert.equal(hooks.ui.view, 'tasks');
  assert.equal(hooks.ui.taskFilter, 'my-day');
});

test('normalization preserves old tasks without inventing deadlines and deduplicates completed dates', () => {
  const { hooks } = createApp();
  const snapshot = structuredClone(hooks.data);
  snapshot.tasks = [task('old', { date: '2026-09-01', repeat: 'Daily',
    completedDates: [today, today, 'bad-date'] })];
  const normalized = hooks.normalizeData(snapshot).tasks[0];
  assert.equal(normalized.deadline, '');
  assert.deepEqual([...normalized.completedDates], [today]);
});

test('cloud merge keeps separate completed occurrences and a later undo', () => {
  const { hooks } = createApp();
  const base = structuredClone(hooks.data);
  base.tasks = [task('series', { date: '2026-09-07', repeat: 'Daily' })];
  const left = structuredClone(base);
  left.tasks[0].updatedAt = '2026-09-08T12:00:00Z';
  left.tasks[0].occurrenceStates = { '2026-09-08': { done: true, updatedAt: '2026-09-08T12:00:00Z' } };
  const right = structuredClone(base);
  right.tasks[0].updatedAt = '2026-09-09T12:00:00Z';
  right.tasks[0].occurrenceStates = { '2026-09-09': { done: true, updatedAt: '2026-09-09T12:00:00Z' } };
  const merged = hooks.mergeWorkspacePayloads(left, right);
  assert.deepEqual(Array.from(merged.tasks[0].completedDates), ['2026-09-08', '2026-09-09']);
  const undone = structuredClone(merged);
  undone.tasks[0].updatedAt = '2026-09-10T12:00:00Z';
  undone.tasks[0].occurrenceStates['2026-09-08'] = { done: false, updatedAt: '2026-09-10T12:00:00Z' };
  undone.tasks[0].completedDates = ['2026-09-09'];
  const afterUndo = hooks.mergeWorkspacePayloads(merged, undone);
  assert.deepEqual(Array.from(afterUndo.tasks[0].completedDates), ['2026-09-09']);
  assert.equal(afterUndo.tasks[0].occurrenceStates['2026-09-08'].done, false);
  const tied = structuredClone(merged);
  tied.tasks[0].occurrenceStates['2026-09-09'] = { done: false, updatedAt: '2026-09-09T12:00:00Z' };
  tied.tasks[0].completedDates = ['2026-09-08'];
  const tieResult = hooks.mergeWorkspacePayloads(merged, tied);
  assert.equal(tieResult.tasks[0].occurrenceStates['2026-09-09'].done, false);
});

test('biweekly and monthly recurrence respect their cadence and end dates', () => {
  const { hooks } = createApp();
  const biweekly = task('biweekly', { date: '2026-09-01', repeat: 'Bi-Weekly', repeatEndDate: '2026-09-30' });
  assert.equal(hooks.taskOccurrenceForDate(biweekly, '2026-09-08'), null);
  assert.equal(hooks.taskOccurrenceForDate(biweekly, '2026-09-15').date, '2026-09-15');
  assert.equal(hooks.taskOccurrenceForDate(biweekly, '2026-10-13'), null);
  const monthly = task('monthly', { date: '2026-08-31', repeat: 'Monthly' });
  assert.equal(hooks.taskOccurrenceForDate(monthly, '2026-09-30'), null);
  assert.equal(hooks.taskOccurrenceForDate(monthly, '2026-10-31').date, '2026-10-31');
});

test('a missed planned date alone is never called an overdue deadline', () => {
  const { hooks } = createApp();
  hooks.data.tasks = [task('old-plan', { date: '2026-09-07', endDate: '2026-09-07' })];
  const html = hooks.renderDashboard();
  assert.match(html, /0 overdue deadlines/);
  assert.doesNotMatch(html, /old-plan<\/span><span class="status danger">/);
});

test('task editor keeps the optional deadline separate and later occurrences can still alert', () => {
  const { hooks } = createApp({ now: '2026-09-09T12:00:00' });
  hooks.data.tasks = [task('series', { date: '2026-09-07', endDate: '2026-09-07', repeat: 'Daily',
    deadline: '2026-09-30', completedDates: ['2026-09-08'],
    occurrenceStates: { '2026-09-08': { done: true, updatedAt: '2026-09-08T12:00:00Z' } },
    alertConfigured: true, alertOffsets: [15], alertDevice: false, alertSound: false, alertEmail: false })];
  const editor = hooks.modalTask('series');
  assert.match(editor, /id="taskDate"/);
  assert.match(editor, /id="taskDeadline"/);
  assert.match(editor, /2026-09-30/);
  hooks.scanTaskAlerts();
  assert.match(hooks.data.tasks[0].alertFiredKeys[0], /^2026-09-09:/);
  assert.match(hooks.taskAlertSummary({ alertConfigured: true, alertOffsets: [15],
    alertDevice: true, alertSound: false, alertEmail: true }), /not sent automatically/i);
});
