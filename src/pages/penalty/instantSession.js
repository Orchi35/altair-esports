// Network writes are ordered in the background; they never drive the meter or flight.
export function validShotPlan(shots) {
 return Array.isArray(shots)&&shots.length===10&&shots.every(s=>s&&['keeperX','keeperY','saveRoll'].every(k=>Number.isFinite(s[k])&&s[k]>=0&&s[k]<=1));
}
export function createInstantSession(initialToken,send,ownerToken) {
 if(typeof ownerToken!=='string'||!/^[a-f0-9]{64}$/.test(ownerToken))throw new Error('IDENTITY_REQUIRED');
 const fields=['shotType','power','meterPosition','points','goal','outcome','keeperX','keeperY','targetX','targetY'];
 let token=initialToken,tail=Promise.resolve(),failure=null,cancelled=false,count=0;
 return {
  enqueue(input,expected){
   if(cancelled||failure)return;
   if(count>=10||expected.shot!==count+1){failure=new Error('INVALID_SHOT_SEQUENCE');return;}
   count++;
   // Capture values now: neither a later UI mutation nor caller-supplied
   // action/token/owner fields may change an already queued request.
   const shot={x:input.x,y:input.y,meterPosition:input.meterPosition,shotType:input.shotType??'normal'};
   const snapshot={panenkasUsed:expected.panenkasUsed,shot:expected.shot,total:expected.total,finished:expected.finished,result:Object.fromEntries(fields.map(k=>[k,expected.result[k]]))};
   tail=tail.then(async()=>{
    if(cancelled||failure)return;
    const next=await send({action:'shot',token,ownerToken,...shot});
    if(next.panenkasUsed!==snapshot.panenkasUsed||!next.token||next.shot!==snapshot.shot||next.total!==snapshot.total||next.finished!==snapshot.finished||fields.some(k=>next.result?.[k]!==snapshot.result[k]))throw new Error('SHOT_SYNC_MISMATCH');
    token=next.token;
   }).catch(error=>{failure=error;});
  },
  async flush(){await tail;if(cancelled)throw new Error('ROUND_CANCELLED');if(failure)throw failure;return token;},
  cancel(){cancelled=true;},
 };
}
