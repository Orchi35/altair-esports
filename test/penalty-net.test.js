import test from 'node:test';
import assert from 'node:assert/strict';
import {deformNetPoint,netContact,sampleGoalBall,NET_SETTLE_MS} from '../src/pages/penalty/netMotion.js';
import {sampleFlight} from '../src/pages/penalty/flightMotion.js';

const goal={goal:true,outcome:'goal',targetX:.65,targetY:.4,perfect:false};
test('net responds only to a goal impact and keeps its attachment points fixed',()=>{
 for(const age of [0,100,300,800,NET_SETTLE_MS]) {
  for(const [x,y] of [[250,250],[750,250],[500,180],[500,357]]) assert.deepEqual(deformNetPoint(x,y,goal,age),{x,y});
  assert.deepEqual(deformNetPoint(500,250,{goal:false},age),{x:500,y:250});
 }
 assert.deepEqual(deformNetPoint(500,250,goal,0),{x:500,y:250});
 assert.deepEqual(deformNetPoint(500,250,goal,NET_SETTLE_MS),{x:500,y:250});
});
test('net impulse is concentrated near impact and fades away',()=>{
 const hit=netContact(goal);
 const displacement=(x,y,age)=>{const p=deformNetPoint(x,y,goal,age);return Math.hypot(p.x-x,p.y-y);};
 assert.ok(displacement(hit.x,hit.y,100)>5);
 assert.ok(displacement(hit.x,hit.y,100)>displacement(300,200,100));
 assert.ok(displacement(hit.x,hit.y,900)<displacement(hit.x,hit.y,100)*.1);
});
test('goal flight joins the net animation continuously and the ball settles inside',()=>{
 for(const y of [.1,.4,.99]) for(const perfect of [false,true]) {
  const result={...goal,targetY:y,perfect};
  const first=sampleGoalBall(result,0),last=sampleFlight(result,1);
  for(const key of ['x','y','scale','rotation']) assert.ok(Math.abs(first[key]-last[key])<1e-8);
  const resting=sampleGoalBall(result,NET_SETTLE_MS),hit=netContact(result);
  assert.equal(resting.x,hit.x);
  assert.equal(resting.y,Math.max(345,hit.y));
 }
});
