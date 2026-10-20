const test=require('node:test'),assert=require('node:assert/strict');
const {createApp}=require('./app-harness');
const make=()=>createApp({now:'2026-10-20T12:00:00'});
const reward=(program,extra={})=>({issuer:'Fixture bank',program,year:'2026',deadline:'2026-12-31',source:'Issuer notice',observedAt:'2026-10-20',amount:'40',...extra});
const batch=(extra={})=>({item_id:'item1',batch_id:'batch1',environment:'production',accounts_complete:true,accounts_refreshed_at:'2026-10-20T12:00:00Z',synced_at:'2026-10-20T12:00:00Z',accounts:[{account_id:'account1',name:'Checking',type:'depository',subtype:'checking',current_balance:500}],added:[{transaction_id:'tx1',account_id:'account1',name:'Phone',type:'expense',amount:30,date:'2026-10-19'}],...extra});

test('legacy rewards migrate into item-level cloud merge; distinct device records and later redemption survive',()=>{
 const h=make().hooks,local=structuredClone(h.data),remote=structuredClone(h.data);
 local.settings.financialWatch={records:[{...reward('Certificate A'),id:'legacy-a',updatedAt:'2026-10-20T10:00:00Z'}]};
 remote.settings.financialWatch={records:[{...reward('Certificate B'),id:'legacy-b',updatedAt:'2026-10-20T11:00:00Z'}]};
 let merged=h.mergeWorkspacePayloads(local,remote,{prefer:'incoming'});
 assert.equal(merged.financialWatchRecords.length,2);assert.equal(merged.settings.financialWatch.records,undefined);
 const changed=structuredClone(merged);changed.financialWatchRecords[0].status='Redeemed';changed.financialWatchRecords[0].updatedAt='2026-10-20T12:00:00Z';
 merged=h.mergeWorkspacePayloads(merged,changed,{prefer:'incoming'});
 assert.equal(merged.financialWatchRecords.filter(r=>r.status==='Redeemed').length,1);
});
test('reward tombstones prevent a removed record returning from an older device',()=>{
 const h=make().hooks;h.watchUpsert(reward('A'));const old=structuredClone(h.data),deleted=structuredClone(old),id=old.financialWatchRecords[0].id;
 deleted.financialWatchRecords=[];deleted.settings.deletedItems.financialWatchRecords={[id]:'2026-10-21T12:00:00Z'};
 assert.equal(h.mergeWorkspacePayloads(deleted,old).financialWatchRecords.length,0);
});
test('legacy cancellation is a request; only evidence-confirmed cancellation removes recurring cost',()=>{
 const h=make().hooks;h.data.subscriptions=[{id:'sub',name:'Service',amount:20,projected:20,cycle:'monthly',status:'Cancelled',autopay:true,nextDate:'2026-10-25'}];
 assert.equal(h.monthlySubAmount(h.data.subscriptions[0]),20);assert.equal(h.watchWithdrawalItems().length>0,true);
 const r=h.saveWatchSchedule({kind:'subscription',targetId:'sub',date:'2026-10-25',amount:'20',source:'Provider confirmation',observedAt:'2026-10-20',cancellationState:'confirmed',refundExpected:'20',refundReceived:'5'});
 assert.equal(r.ok,true);assert.equal(h.monthlySubAmount(h.data.subscriptions[0]),0);assert.equal(h.data.cancellations[0].refundExpected,20);
 assert.ok(h.financialWatchGuidance().some(s=>s.includes('$15.00')));
});
test('missing or future evidence cannot turn an estimated plan into a verified amount',()=>{
 const h=make().hooks;h.data.bills=[];h.data.subscriptions=[{id:'s',name:'Service',nextDate:'2026-10-25',amount:20,status:'Active'}];
 h.data.financialSchedules=[{id:'subscription:s',date:'2026-10-25',source:'Old source',observedAt:'2026-10-20'}];
 assert.equal(h.watchWithdrawalItems()[0].amountConfidence,'Estimate');
 h.data.financialSchedules[0].observedAt='2026-10-30';h.data.financialSchedules[0].amount=20;
 assert.equal(h.watchWithdrawalItems()[0].verified,false);
});
test('per-obligation lead times, reviewed occurrence and future renewal alert independently',()=>{
 const h=make().hooks;h.data.bills=[];h.data.subscriptions=[{id:'s',name:'Service',nextDate:'2026-10-25',amount:20,status:'Active'}];
 assert.equal(h.watchWithdrawalNotices().length,1);
 const key=h.watchWithdrawalNotices()[0].key;h.watchResolveObligation(key,'resolve');assert.equal(h.watchWithdrawalNotices().length,0);
 h.data.subscriptions[0].nextDate='2026-10-26';assert.equal(h.watchWithdrawalNotices().length,1);
 h.data.financialSchedules=[{id:'subscription:s',date:'2026-10-26',offsets:'3,1'}];assert.equal(h.watchWithdrawalNotices().length,0);
});
test('durable save precedes ACK; replay updates stable transactions once',async()=>{
 const app=make(),h=app.hooks,calls=[];
 const transport=async(action,payload)=>{assert.ok([...app.storage.values()].some(v=>v.includes('"plaidTransactionId":"tx1"')));calls.push([action,payload]);return {acknowledged:true};};
 await h.persistPlaidDelivery(batch(),'2026-10-20T12:00:00Z',transport);
 await h.persistPlaidDelivery(batch(),'2026-10-20T12:00:00Z',transport);
 assert.equal(h.data.transactions.filter(t=>t.plaidTransactionId==='tx1').length,1);assert.equal(calls.length,2);
});
test('blocked durable storage never sends ACK, including temporary-tab fallback',async()=>{
 const app=make(),h=app.hooks;let calls=0;
 app.sandbox.localStorage.setItem=(key,value)=>{if(key.startsWith('billmaster-plaid-device'))return app.storage.set(key,value);throw Error('Full');};
 await assert.rejects(h.persistPlaidDelivery(batch(),'2026-10-20T12:00:00Z',async()=>{calls++;return {acknowledged:true};}),/not saved permanently/);
 assert.equal(calls,0);assert.equal(h.data.transactions.some(t=>t.plaidTransactionId==='tx1'),false);
});
test('failed ACK preserves imported data and pending delivery for safe retry',async()=>{
 const app=make(),h=app.hooks;
 await assert.rejects(h.persistPlaidDelivery(batch(),'2026-10-20T12:00:00Z',async()=>{throw Error('offline');}),/offline/);
 assert.equal(h.data.transactions.filter(t=>t.plaidTransactionId==='tx1').length,1);assert.equal(h.plaidDeviceDeliveryState().pendingAcks.length,1);
 await h.acknowledgeSavedPlaidBatches(async()=>({acknowledged:true}));assert.equal(h.plaidDeviceDeliveryState().pendingAcks.length,0);
});
test('authoritative removals retire accounts without removing history; stale errors do not retire',()=>{
 const h=make().hooks;h.data.accounts=[];h.applyPlaidSyncResult({items:[batch()]});
 h.applyPlaidConnectionResult({connections:[batch({accounts:[],accounts_complete:false,accounts_refresh_error:'offline'})]});
 assert.equal(h.visibleAccounts().length,1);
 h.applyPlaidConnectionResult({connections:[batch({accounts:[],accounts_complete:true})]});assert.equal(h.visibleAccounts().length,0);assert.equal(h.data.transactions.some(r=>r.plaidTransactionId==='tx1'),true);
 h.applyPlaidConnectionResult({connections:[batch()]});assert.equal(h.visibleAccounts().length,1);
});
test('bank removals remain auditable but stop inflating expense reports',()=>{
 const h=make().hooks;h.data.transactions=[];h.applyPlaidSyncResult({items:[batch()]});
 h.applyPlaidSyncResult({items:[batch({added:[],removed:[{transaction_id:'tx1'}]})]});
 assert.equal(h.data.transactions[0].status,'Removed');assert.equal(h.reportableTransactions('expense').length,0);
});
test('missing weather and simulated imports do not claim verified service data',()=>{
 const h=make().hooks;assert.equal(h.weatherForDate('2030-01-01').unavailable,true);
 assert.match(h.weatherChip('2030-01-01'),/not verified/);assert.equal(h.weatherMotionLayer('2030-01-01'),'');
 assert.doesNotMatch(h.modalImportStatement(),/Last synced: 15:48/);assert.match(h.modalImportStatement(),/sample/i);
});
test('pending data recovered from a temporary tab cannot ACK while durable storage is blocked',async()=>{
 const app=make(),h=app.hooks;h.plaidDeviceDeliveryState().pendingAcks.push({item_id:'item1',batch_id:'batch1'});
 app.sandbox.localStorage.setItem=()=>{throw Error('blocked');};let calls=0;
 await assert.rejects(h.acknowledgeSavedPlaidBatches(async()=>{calls++;return {acknowledged:true};}),/No acknowledgement/);
 assert.equal(calls,0);
});
test('profile switch during an awaited ACK cannot save into the replacement workspace',async()=>{
 const app=make(),h=app.hooks;let unblock;const gate=new Promise(r=>unblock=r);
 const pending=h.persistPlaidDelivery(batch(),'2026-10-20T12:00:00Z',async()=>{await gate;return {acknowledged:true};});
 h.setTestProfile('new-profile');h.data={settings:{marker:'replacement'},transactions:[]};unblock();
 await assert.rejects(pending,/workspace changed/);assert.equal(h.data.settings.marker,'replacement');assert.equal(app.storage.has('billmaster-web-data-v1:new-profile'),false);
});
test('identical provider IDs across bank items and environments stay separate on removal',()=>{
 const h=make().hooks;h.data.accounts=[];h.data.transactions=[];
 h.applyPlaidSyncResult({items:[batch(),batch({item_id:'item2'}),batch({environment:'sandbox'})]});assert.equal(h.data.transactions.length,3);assert.equal(h.data.accounts.length,3);
 h.applyPlaidSyncResult({items:[batch({added:[],removed:[{transaction_id:'tx1'}]})]});
 assert.equal(h.data.transactions.filter(t=>t.status==='Removed').length,1);assert.equal(h.reportableTransactions().length,2);
});
test('old journal replays cannot replace newer balances, membership or transaction values',()=>{
 const h=make().hooks;h.data.accounts=[];h.data.transactions=[];h.applyPlaidSyncResult({items:[batch()]});
 const older=batch({accounts_refreshed_at:'2026-10-19T12:00:00Z',synced_at:'2026-10-19T12:00:00Z',accounts:[{account_id:'account1',name:'Checking',type:'depository',current_balance:25}],added:[{transaction_id:'tx1',account_id:'account1',amount:1,type:'expense',date:'2026-10-19'}]});
 h.applyPlaidSyncResult({items:[older]});assert.equal(h.data.accounts[0].balance,500);assert.equal(h.data.transactions[0].amount,30);
 h.applyPlaidConnectionResult({connections:[{...older,accounts:[]}]});assert.equal(h.visibleAccounts().length,1);
 h.applyPlaidConnectionResult({connections:[batch({accounts:[]})]});assert.equal(h.visibleAccounts().length,0);
 h.applyPlaidConnectionResult({connections:[older]});assert.equal(h.visibleAccounts().length,0);
});
