// Display-only prediction of when the next request will reach the server.
// requestReceivedAt - sentAt combines the clock offset and outbound delay;
// unlike RTT/2 it does not assume equal upload/download latency. Never submit it.
export function createArrivalClock() {
 const samples=[];
 const prune=now=>{while(samples.length&&now-samples[0].observedAt>60000)samples.shift();};
 return {
  reset(){samples.length=0;},
  observe({sentAt,receivedAt,requestReceivedAt,serverNow}){
   if(![sentAt,receivedAt,requestReceivedAt,serverNow].every(Number.isFinite))return;
   const elapsed=receivedAt-sentAt,processing=serverNow-requestReceivedAt;
   if(elapsed<0||processing<0||processing>elapsed+5)return;
   prune(receivedAt);
   samples.push({offset:requestReceivedAt-sentAt,observedAt:receivedAt});
   if(samples.length>5)samples.shift();
  },
  localStart(startsAt,now){
   prune(now);
   if(!Number.isFinite(startsAt)||!samples.length)throw new Error('INVALID_TIMING');
   // A cold first start must not pull the first warm arm halfway off target.
   // Once warm, a median prevents a single delayed request shifting the bar.
   const offsets=samples.map(sample=>sample.offset).sort((a,b)=>a-b);
   // Lower median for an even warm-up window avoids averaging a lingering
   // cold-start spike and a second isolated slow request into normal timing.
   const offset=offsets.length<3?samples.at(-1).offset:offsets[Math.floor((offsets.length-1)/2)];
   return startsAt-offset;
  },
 };
}
