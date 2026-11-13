const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, scheduleFixture } = require('./app-harness');
test('acknowledging today preserves tomorrow and does not complete the task', () => {
  const { hooks } = createApp();
  const task = {id:'weekly',title:'Review',date:'2026-09-08',endDate:'2026-09-08',start:'12:00',end:'12:30',repeat:'Daily',status:'Pending',alertConfigured:true,alertOffsets:[0]};
  hooks.setTestProfile('test'); hooks.data.tasks=[task];
  hooks.handleAction({dataset:{action:'ack-reminder', id:'weekly', date:'2026-09-08'}});
  hooks.scanTaskAlerts();
  assert.deepEqual([...task.acknowledgedAlerts],['2026-09-08']);
  assert.equal(task.status,'Pending');
  assert.equal(task.alertLastAttempt,undefined);
  assert.ok(hooks.taskOccurrenceForDate(task,'2026-09-09'));
  assert.match(hooks.reminderSummaryPanel(),/1 acknowledged/);
});
test('focus suppresses a due alert without consuming it', () => {
  const { hooks }=createApp();
  hooks.setTestProfile('test');
  const task={id:'sample',title:'Check',date:'2026-09-08',start:'12:00',end:'12:30',alertConfigured:true,alertOffsets:[0],alertSound:false,alertDevice:false};
  hooks.data.tasks=[task]; hooks.data.settings.reminderFocus=true;
  hooks.scanTaskAlerts(); assert.equal(task.alertLastAttempt,undefined);
  hooks.data.settings.reminderFocus=false; hooks.scanTaskAlerts();
  assert.equal(task.alertLastAttempt.key,'2026-09-08:12:00:0');
});
test('period planning separates unpaid scheduled bills and recurring hours', () => {
  const {hooks}=scheduleFixture(createApp());
  hooks.data.tasks=[{id:'weekly',title:'Review',date:'2026-09-08',endDate:'2026-09-08',start:'12:00',end:'13:30',repeat:'Weekly',status:'Pending'}];
  hooks.data.bills.push({name:'Paid sample',status:'Paid',amount:900,dueDate:'2026-09-09'});
  hooks.ui.planPeriod='Month'; const html=hooks.planningView();
  assert.match(html,/2026-09-30/); assert.match(html,/6H of planned task time/);
  assert.match(html,/Review &times; 4/); assert.match(html,/Internet/); assert.doesNotMatch(html,/Paid sample/);
});
