import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalShotClock} from '../src/pages/penalty/localShotClock.js';
import {meterPosition} from '../src/pages/penalty/shotTiming.js';
import {powerFromMeter} from '../src/pages/penalty/shotModel.js';

function fixture(){let mono=0,wall=100000;const clock=createLocalShotClock({monotonic:()=>mono,wall:()=>wall});clock.begin();return {clock,at(ms,wallMs=ms){mono=ms;wall=100000+wallMs;}};}
test('press samples elapsed time, never the cached perfect frame',()=>{
 const f=fixture();f.at(310);assert.equal(f.clock.frame(),.5);
 f.at(340);const shot=f.clock.sample();assert.equal(shot.ok,true);
 assert.equal(shot.meterPosition,meterPosition(340));assert.ok(powerFromMeter(shot.meterPosition)<1);
 f.at(600);assert.deepEqual(f.clock.sample(),{ok:false,reason:'stale'});
 f.clock.frame();assert.equal(f.clock.sample().meterPosition,meterPosition(600));
});
test('60, 30 and 15 FPS use the same speed and dropped frames do not reset phase',()=>{
 for(const step of [1000/60,1000/30,1000/15,240]){
  const f=fixture();for(let time=0;time<3000;time+=step){f.at(time);assert.ok(Math.abs(f.clock.frame()-meterPosition(time))<1e-9);}
  f.at(3100);f.clock.frame();assert.equal(f.clock.sample().meterPosition,meterPosition(3100));
 }
});
test('no first frame or hidden stale frames can consume a shot',()=>{
 const f=fixture();assert.equal(f.clock.sample().ok,false);f.clock.frame();
 assert.equal(f.clock.sample(false).ok,false);f.clock.invalidateFrame();assert.equal(f.clock.sample().ok,false);
 f.at(1500);f.clock.frame();assert.equal(f.clock.sample().meterPosition,meterPosition(1500));
 f.clock.end();assert.equal(f.clock.sample().ok,false);
});
test('slowing one clock cannot extend the perfect window; large clock changes require restart',()=>{
 const f=fixture();f.at(310,400);assert.equal(f.clock.frame(),meterPosition(400));
 assert.ok(powerFromMeter(f.clock.sample().meterPosition)<1);
 f.at(320,1000);assert.equal(f.clock.frame(),null);assert.equal(f.clock.sample().reason,'clock');
 f.at(1000,1000);assert.equal(f.clock.sample().ok,false,'integrity failure is sticky for this attempt');
 f.clock.begin();f.clock.frame();assert.equal(f.clock.sample().ok,true);
 const backwards=fixture();backwards.at(100,-1);assert.equal(backwards.clock.sample().reason,'clock');
});
