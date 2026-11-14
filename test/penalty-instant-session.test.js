import test from 'node:test';
import assert from 'node:assert/strict';
import {createInstantSession as makeSession,validShotPlan} from '../src/pages/penalty/instantSession.js';

const owner='a'.repeat(64);
const createInstantSession=(token,send)=>makeSession(token,send,owner);
const expected=shot=>({shot,panenkasUsed:0,total:shot*100,finished:shot===10,result:{shotType:'normal',power:.85,meterPosition:.425,points:100,goal:true,outcome:'goal',keeperX:.2,keeperY:.3,targetX:.8,targetY:.4}});
test('instant shots queue without waiting and serialize returned session tokens before final save',async()=>{
 const calls=[],release=[];
 const session=createInstantSession('start',body=>new Promise(resolve=>{calls.push(body);release.push(resolve);}));
 session.enqueue({x:.8,y:.4,meterPosition:.425},expected(1));
 session.enqueue({x:.8,y:.4,meterPosition:.425},expected(2));
 await Promise.resolve();assert.equal(calls.length,1);assert.equal(calls[0].token,'start');
 let finished=false;const flush=session.flush().then(token=>{finished=true;return token;});
 release.shift()({...expected(1),token:'shot-1'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(finished,false);assert.equal(calls.length,2);assert.equal(calls[1].token,'shot-1');
 release.shift()({...expected(2),token:'shot-2'});
 assert.equal(await flush,'shot-2');
});
test('mismatched outcome or failed request blocks save and all later queued requests',async()=>{
 for(const failure of ['mismatch','network']){
  let calls=0;
  const session=createInstantSession('start',async()=>{calls++;if(failure==='network')throw new Error('offline');return {...expected(1),total:150,token:'wrong'};});
  session.enqueue({},expected(1));session.enqueue({},expected(2));
  await assert.rejects(session.flush(),failure==='network'?/offline/:/SHOT_SYNC_MISMATCH/);
  assert.equal(calls,1);
 }
});
test('restarting cancels unsent shots from the previous round',async()=>{
 let calls=0;const session=createInstantSession('start',async()=>{calls++;return {...expected(1),token:'one'};});
 session.enqueue({},expected(1));session.cancel();
 await assert.rejects(session.flush(),/ROUND_CANCELLED/);assert.equal(calls,0);
});
test('instant plan requires exactly ten finite complete keeper rolls',()=>{
 const shots=Array.from({length:10},()=>({keeperX:.4,keeperY:.5,saveRoll:.6}));
 assert.equal(validShotPlan(shots),true);
 for(const invalid of [null,shots.slice(1),[...shots.slice(1),{}],[...shots.slice(1),{...shots[0],saveRoll:NaN}],[...shots.slice(1),{...shots[0],saveRoll:1.1}]])assert.equal(validShotPlan(invalid),false);
});


test('queue snapshots inputs and binds the original owner without accepting caller credentials',async()=>{
 const calls=[];const e=expected(1),input={x:.8,y:.4,meterPosition:.425,ownerToken:'b'.repeat(64),token:'stolen',action:'submit'};
 const session=createInstantSession('original',async body=>{calls.push(body);return {...expected(1),token:'next'};});
 session.enqueue(input,e);input.meterPosition=.5;e.total=150;e.result.power=1;
 assert.equal(await session.flush(),'next');
 assert.deepEqual(calls,[{action:'shot',token:'original',ownerToken:owner,x:.8,y:.4,meterPosition:.425,shotType:'normal'}]);
});
test('missing owner or out-of-order enqueue cannot produce ranked writes',async()=>{
 assert.throws(()=>makeSession('t',async()=>{}),/IDENTITY_REQUIRED/);
 let calls=0;const session=createInstantSession('t',async()=>{calls++;});
 session.enqueue({},expected(2));await assert.rejects(session.flush(),/INVALID_SHOT_SEQUENCE/);assert.equal(calls,0);
});

test('Panenka queue snapshots type and rejects altered type or remaining allowance',async()=>{
 for(const mismatch of [null,'type','count']){
  const calls=[],e={...expected(1),panenkasUsed:1,result:{...expected(1).result,shotType:'panenka',points:200}};
  e.total=200;
  const response={...e,result:{...e.result},token:'panenka-1'};
  if(mismatch==='type')response.result.shotType='normal';
  if(mismatch==='count')response.panenkasUsed=0;
  const session=createInstantSession('start',async body=>{calls.push(body);return response;});
  const input={x:.8,y:.4,meterPosition:.425,shotType:'panenka'};
  session.enqueue(input,e);input.shotType='normal';e.panenkasUsed=2;e.result.shotType='normal';
  if(mismatch)await assert.rejects(session.flush(),/SHOT_SYNC_MISMATCH/);
  else assert.equal(await session.flush(),'panenka-1');
  assert.equal(calls[0].shotType,'panenka');
 }
});
