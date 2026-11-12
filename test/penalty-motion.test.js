import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateShot} from '../src/pages/penalty/shotModel.js';
import {sampleFlight} from '../src/pages/penalty/flightMotion.js';
import {netContact} from '../src/pages/penalty/netMotion.js';

test('all shot animations start at the ball and finish at the authoritative endpoint',()=>{
 for(const power of [.1,.3,.8,1]) {
  const result=calculateShot({x:.7,y:.3,power,keeperX:.7,keeperY:.3});
  assert.deepEqual(sampleFlight(result,0),{x:500,y:562,scale:1,rotation:0});
  const end=sampleFlight(result,1);
  const target=result.goal?netContact(result):{x:220+result.targetX*560,y:145+result.targetY*235};
  assert.ok(Math.abs(end.x-target.x)<1e-8);
  assert.ok(Math.abs(end.y-target.y)<1e-8);
  if(result.outcome==='wide') assert.ok(end.x<220||end.x>780);
  if(result.outcome==='weak'||result.outcome==='saved') assert.ok(end.y>380);
 }
});

test('a save reaches the glove contact before rebounding continuously onto the pitch',()=>{
 const result=calculateShot({x:.7,y:.3,power:.8,keeperX:.7,keeperY:.3,saveRoll:0});
 assert.equal(result.outcome,'saved');
 const contact=sampleFlight(result,.62);
 assert.ok(Math.abs(contact.x-(220+result.impactX*560))<1e-8);
 assert.ok(Math.abs(contact.y-(145+result.impactY*235))<1e-8);
 const before=sampleFlight(result,.62-1e-6),after=sampleFlight(result,.62+1e-6);
 assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<.01);
});
