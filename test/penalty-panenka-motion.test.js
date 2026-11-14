import test from 'node:test';
import assert from 'node:assert/strict';
import {flightDuration, sampleFlight, POST_CONTACT} from '../src/pages/penalty/flightMotion.js';
import {sampleKeeper, KEEPER_CONTACT} from '../src/pages/penalty/keeperMotion.js';

const shot = {shotType:'panenka', goal:false, outcome:'saved', targetX:.3, targetY:.65, impactX:.28, impactY:.4, keeperX:.28, keeperY:.4};
const close = (a,b) => assert.ok(Math.abs(a-b)<.01, `${a} != ${b}`);

test('chip has a slower, higher, backspinning flight', () => {
  const goal = {...shot, goal:true, outcome:'goal'};
  const normal = {...goal, shotType:'normal'};
  assert.equal(flightDuration(goal),1650);
  assert.equal(flightDuration(normal),1150);
  assert.ok(sampleFlight(goal,.5).y < sampleFlight(normal,.5).y);
  assert.ok(sampleFlight(goal,.5).rotation < 0);
  assert.notDeepEqual(sampleKeeper(goal,.2),sampleKeeper(normal,.2));
});

test('chip trajectories remain finite and meet rebound contacts continuously', () => {
  for (const outcome of ['goal','saved','post','weak']) {
    const result = {...shot, outcome, goal:outcome==='goal'};
    for (let i=0;i<=100;i++) for (const value of Object.values(sampleFlight(result,i/100))) assert.ok(Number.isFinite(value));
    close(sampleFlight(result,0).x,500);
    close(sampleFlight(result,0).y,562);
    if (outcome==='saved'||outcome==='post') {
      const at = outcome==='post'?POST_CONTACT:KEEPER_CONTACT;
      const contact=sampleFlight(result,at), after=sampleFlight(result,at+1e-7);
      close(contact.x,220+result.impactX*560);
      close(contact.y,145+result.impactY*235);
      close(after.x,contact.x); close(after.y,contact.y); close(after.scale,contact.scale);
    }
  }
});
