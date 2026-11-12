import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateShot} from '../src/pages/penalty/shotModel.js';
import {sampleFlight,samplePostImpact,POST_CONTACT} from '../src/pages/penalty/flightMotion.js';
import {resolveShot} from '../server/penalty/service.js';

const shoot=(x,y,power=.9)=>calculateShot({x,y,power,keeperX:.5,keeperY:.5,saveRoll:.99});

test('left/right posts and crossbar are collisions, including the ball radius',()=>{
 for(const [x,y,side] of [[0,.5,'left'],[.025,.7,'left'],[1,.5,'right'],[.975,.7,'right'],[.5,0,'crossbar'],[.5,.045,'crossbar'],[0,0,'left']]){
  const shot=shoot(x,y);
  assert.equal(shot.outcome,'post');assert.equal(shot.postSide,side);
  assert.equal(shot.goal,false);assert.equal(shot.points,0);
  if(side==='crossbar')assert.equal(shot.impactY,0);
  else assert.equal(shot.impactX,side==='left'?0:1);
 }
 for(const [x,y] of [[.026,.5],[.974,.5],[.5,.046]])assert.equal(shoot(x,y).outcome,'goal');
 assert.equal(shoot(0,.5,.1).outcome,'weak');
 assert.equal(shoot(0,.5,.3).outcome,'wide');
});

test('post rebound is continuous at impact and ends outside the goal with reversed spin',()=>{
 for(const [x,y] of [[0,.5],[1,.5],[.5,0]]){
  const shot=shoot(x,y),hit=sampleFlight(shot,POST_CONTACT);
  assert.ok(Math.abs(hit.x-(220+560*shot.impactX))<1e-8);
  assert.ok(Math.abs(hit.y-(145+235*shot.impactY))<1e-8);
  const before=sampleFlight(shot,POST_CONTACT-1e-6),after=sampleFlight(shot,POST_CONTACT+1e-6);
  assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<.01);
  assert.ok(Math.abs(after.scale-before.scale)<.0001);
  const end=sampleFlight(shot,1);
  assert.ok(end.y>380);assert.ok(end.scale>hit.scale);assert.ok(end.rotation<hit.rotation);
  assert.equal(samplePostImpact(shot,POST_CONTACT-.01).offset,0);
  assert.ok(samplePostImpact(shot,POST_CONTACT+.02).flash>0);
  assert.ok(Math.abs(samplePostImpact(shot,POST_CONTACT+.02).offset)>0);
  assert.deepEqual(samplePostImpact(shot,1),{offset:0,flash:0});
 }
 assert.deepEqual(samplePostImpact(shoot(.5,.5),.7),{offset:0,flash:0});
});

test('ranked server uses the same post collision rules even for perfect shots',()=>{
 for(const x of [0,1]){
  const result=resolveShot({id:'post-test',shot:1,x,y:.5,power:1},'test-secret');
  assert.equal(result.outcome,'post');assert.equal(result.points,0);
 }
});
