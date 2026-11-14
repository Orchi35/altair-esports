import {normalizePlayerId} from '../../src/pages/penalty/playerId.js';

import {MAX_ROUND_POINTS} from '../../src/pages/penalty/shotModel.js';

// Private, bounded review output. Flags are leads for manual review, never verdicts.
export function summarizePenaltyReviews(members) {
 if(!Array.isArray(members))throw new Error('INVALID_REVIEW_RESPONSE');
 return members.slice(0,1000).flatMap(member=>{
  let entry;try{entry=JSON.parse(member);}catch{return [];}
  const playerId=normalizePlayerId(entry?.playerId??entry?.name,{minLength:2});
  if(!playerId||!Number.isInteger(entry.score)||entry.score<0||entry.score>MAX_ROUND_POINTS)return [];
  const review=entry.review;
  const valid=review&&Number.isFinite(review.durationMs)&&review.durationMs>=0&&Number.isInteger(review.perfectShots)&&review.perfectShots>=0&&review.perfectShots<=10&&Number.isInteger(review.repeatedSamples)&&review.repeatedSamples>=0&&review.repeatedSamples<=9;
  const flags=[];
  if(valid){
   if(review.perfectShots===10)flags.push('all-perfect');
   if(review.repeatedSamples>=7)flags.push('repeated-position');
   if(review.durationMs<10000)flags.push('short-round');
  }
  return [{playerId,score:entry.score,timingMode:entry.timingMode==='instant'?'instant':entry.timingMode==='server'?'server':'legacy',review:valid?{durationMs:review.durationMs,perfectShots:review.perfectShots,repeatedSamples:review.repeatedSamples}:null,flags}];
 });
}
