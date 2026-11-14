import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePenaltyReviews} from '../server/penalty/review.js';
test('review reports only bounded public identity and safe summary, never credentials',()=>{
 const entry={playerId:'Review-QA',score:1800,timingMode:'instant',review:{durationMs:30000,perfectShots:10,repeatedSamples:9,token:'secret'},ownerToken:'secret',id:'private-id',session:'secret'};
 const result=summarizePenaltyReviews([JSON.stringify(entry),'bad json','null',JSON.stringify({...entry,score:1801})]);
 assert.deepEqual(result,[{playerId:'Review-QA',score:1800,timingMode:'instant',review:{durationMs:30000,perfectShots:10,repeatedSamples:9},flags:['all-perfect','repeated-position']}]);
 assert.equal(JSON.stringify(result).includes('secret'),false);
 assert.equal(summarizePenaltyReviews(Array(1002).fill(JSON.stringify(entry))).length,1000);
});
test('old or corrupt metadata has no fabricated review findings',()=>{
 assert.throws(()=>summarizePenaltyReviews({}),/INVALID_REVIEW_RESPONSE/);
 for(const review of [undefined,{perfectShots:100,durationMs:-1,repeatedSamples:100}]){
  const [entry]=summarizePenaltyReviews([JSON.stringify({name:'Old-QA',score:100,review})]);
  assert.equal(entry.review,null);assert.deepEqual(entry.flags,[]);
 }
});
