import {summarizePenaltyReviews} from '../server/penalty/review.js';
import {weekKey} from '../server/penalty/service.js';

// Read-only administrative CLI. Use a read-only Redis token where available.
const period=process.argv[2]??'all';
try{
 if(!['all','week'].includes(period))throw new Error('Use all or week.');
 const {PENALTY_REDIS_REST_URL:url,PENALTY_REDIS_REST_TOKEN:token}=process.env;
 if(!url||!token)throw new Error('Redis configuration is missing.');
 let parsed;try{parsed=new URL(url);}catch{throw new Error('Invalid Redis URL.');}
 if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw new Error('Invalid Redis URL.');
 const key=period==='all'?'altair:penalty:v1:all':weekKey(Date.now());
 const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(['ZREVRANGE',key,0,999]),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Review read failed.');
 const data=await response.json();
 if(data.error||!Array.isArray(data.result))throw new Error('Invalid review response.');
 console.log(JSON.stringify({period,notice:'Review hints only; perfect play, repeated samples and reduced motion can be legitimate. No automatic bans.',entries:summarizePenaltyReviews(data.result)},null,2));
}catch{
 // Never log raw upstream errors, URLs, credentials or session payloads.
 console.error('Penalty review could not be read. Check period (all/week), configuration and connection.');
 process.exitCode=1;
}
