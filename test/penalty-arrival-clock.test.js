import test from 'node:test';
import assert from 'node:assert/strict';
import {createArrivalClock} from '../src/pages/penalty/arrivalClock.js';
import {meterPosition} from '../src/pages/penalty/shotTiming.js';

const offset=1700000000000;
function sample(clock,sentAt,upload=40,download=20,processing=150){
 clock.observe({sentAt,receivedAt:sentAt+upload+processing+download,requestReceivedAt:offset+sentAt+upload,serverNow:offset+sentAt+upload+processing});
}

test('arrival prediction excludes server work and asymmetric download latency',()=>{
 const clock=createArrivalClock();
 sample(clock,1000,40,300,1700);
 const startsAt=offset+4000;
 const localStart=clock.localStart(startsAt,3100);
 const clickAt=localStart+310;
 assert.equal(localStart,3960);
 assert.equal(meterPosition(clickAt-localStart),meterPosition(offset+clickAt+40-startsAt));
 // A much slower return path and server do not change predicted outbound timing.
 sample(clock,5000,40,900,2500);
 assert.equal(clock.localStart(startsAt,8500),localStart);
});

test('first warm arm replaces a cold startup sample instead of averaging it',()=>{
 const clock=createArrivalClock();
 sample(clock,0,600);
 sample(clock,2000,40);
 assert.equal(clock.localStart(offset+4000,2500),3960);
 sample(clock,5000,42);
 assert.equal(clock.localStart(offset+7000,5500),6958);
 sample(clock,8000,240);
 assert.equal(clock.localStart(offset+10000,8500),9958);
});

test('one delayed arm does not shift a warmed meter away from the next shot arrival',()=>{
 const clock=createArrivalClock();
 [40,42,39,41,240].forEach((upload,i)=>sample(clock,i*2000,upload));
 const startsAt=offset+10000;
 const predicted=clock.localStart(startsAt,9000);
 const actualNextUpload=40;
 const stabilizedError=Math.abs(predicted+actualNextUpload+offset-startsAt);
 const singleArmError=Math.abs(240-actualNextUpload);
 assert.equal(stabilizedError,1);
 assert.equal(singleArmError,200);
});

test('sustained connection changes replace old estimates, without changing a frozen shot',()=>{
 const clock=createArrivalClock();
 [40,40,40,40,40].forEach((upload,i)=>sample(clock,i*2000,upload));
 const frozen=clock.localStart(offset+10000,9000);
 [120,120,120].forEach((upload,i)=>sample(clock,10000+i*2000,upload));
 assert.equal(clock.localStart(offset+17000,15000),16880);
 assert.equal(frozen,9960);
});

test('invalid metadata is ignored; stale and reset estimates cannot cross rounds',()=>{
 const clock=createArrivalClock();
 sample(clock,0);
 for(const values of [
  {},{sentAt:0,receivedAt:1,requestReceivedAt:NaN,serverNow:1},
  {sentAt:2,receivedAt:1,requestReceivedAt:offset,serverNow:offset},
  {sentAt:0,receivedAt:10,requestReceivedAt:offset,serverNow:offset-1},
  {sentAt:0,receivedAt:10,requestReceivedAt:offset,serverNow:offset+100},
 ])clock.observe(values);
 assert.equal(clock.localStart(offset+1000,500),960);
 assert.throws(()=>clock.localStart(offset+70000,61000),/INVALID_TIMING/);
 sample(clock,62000,100);
 assert.equal(clock.localStart(offset+64000,63000),63900);
 clock.reset();
 assert.throws(()=>clock.localStart(offset+64000,63000),/INVALID_TIMING/);
 // Older API versions have timestamps on arm only; a single sample still works.
 sample(clock,65000,40);
 assert.equal(clock.localStart(offset+67000,66000),66960);
});
