import {meterPosition} from './shotTiming.js';

// Capture clocks before gameplay. Later console replacements cannot slow this
// clock, but a modified client remains outside this client-side guarantee.
const monotonicNow=globalThis.performance.now.bind(globalThis.performance);
const wallNow=Date.now.bind(Date);
export const MAX_FRAME_AGE_MS=100;
export const MAX_CLOCK_DRIFT_MS=250;

export function createLocalShotClock({monotonic=monotonicNow,wall=wallNow}={}) {
 let origin=null,lastFrame=null,clockFailed=false;
 function read(){
  const point={mono:monotonic(),wall:wall()};
  if(!origin||![point.mono,point.wall].every(Number.isFinite))return null;
  const a=point.mono-origin.mono,b=point.wall-origin.wall;
  if(a<0||b<0||Math.abs(a-b)>MAX_CLOCK_DRIFT_MS)clockFailed=true;
  return {...point,elapsed:Math.max(0,a,b)};
 }
 return {
  begin(){origin={mono:monotonic(),wall:wall()};lastFrame=null;clockFailed=false;},
  frame(visible=true){
   const point=read();
   if(!point||clockFailed||!visible){lastFrame=null;return null;}
   // Repainting an identical, stopped clock is not evidence of a fresh frame.
   if(!lastFrame||point.mono>lastFrame.mono||point.wall>lastFrame.wall)lastFrame=point;
   return meterPosition(point.elapsed);
  },
  sample(visible=true){
   const point=read();
   if(!visible)return {ok:false,reason:'hidden'};
   if(!point||clockFailed)return {ok:false,reason:'clock'};
   if(!lastFrame)return {ok:false,reason:'not-ready'};
   const age=Math.max(point.mono-lastFrame.mono,point.wall-lastFrame.wall);
   if(age<0||age>MAX_FRAME_AGE_MS)return {ok:false,reason:'stale'};
   return {ok:true,meterPosition:meterPosition(point.elapsed)};
  },
  invalidateFrame(){lastFrame=null;},
  end(){origin=null;lastFrame=null;},
 };
}
