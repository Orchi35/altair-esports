import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateShot, powerFromMeter, keeperSaveChance } from '../src/pages/penalty/shotModel.js'

const shot = overrides => calculateShot({ x: 0.2, y: 0.2, power: 0.8, keeperX: 0.8, keeperY: 0.8, ...overrides })

test('meter reserves 100% for its narrow center band', () => {
  assert.equal(powerFromMeter(0.5), 1)
  assert.equal(powerFromMeter(0.511), 1)
  assert.ok(powerFromMeter(0.513) < 1)
  assert.equal(powerFromMeter(0), 0)
  assert.equal(powerFromMeter(1), 0)
})

test('weak and inaccurate shots visibly miss the goal', () => {
  const weak = shot({ power: 0.19 })
  assert.equal(weak.outcome, 'weak')
  assert.ok(weak.targetY > 1)
  for (const x of [0.2, 0.8]) {
    const wide = shot({ x, power: 0.3 })
    assert.equal(wide.outcome, 'wide')
    assert.ok(wide.targetX < 0 || wide.targetX > 1)
    assert.equal(wide.points, 0)
  }
})

test('keeper can save a perfect shot and goals score points', () => {
  const saved = shot({ power: 1, keeperX: 0.2, keeperY: 0.2, saveRoll:0 })
  assert.equal(saved.outcome, 'saved')
  assert.equal(saved.perfect, true)
  assert.equal(saved.goal, false)
  assert.equal(saved.points, 0)
  assert.equal(saved.impactX, 0.2)
  const goal = shot({ power: 1 })
  assert.equal(goal.outcome, 'goal')
  assert.equal(goal.perfect, true)
  assert.ok(goal.points > 0 && goal.points <= 150)
})

test('save rates decrease smoothly with power and reward corner placement', () => {
  for(const [x,y] of [[.5,.5],[.2,.2],[0,0],[1,1]]) {
    let previous=1;
    for(let i=45;i<=100;i++) {
      const chance=keeperSaveChance({x,y,power:i/100});
      assert.ok(chance<=previous+1e-12);
      assert.ok(chance>=.05-1e-12 && chance<=.75);
      previous=chance;
    }
  }
  assert.ok(Math.abs(keeperSaveChance({x:.5,y:.5,power:.45})-.75)<1e-10);
  assert.ok(Math.abs(keeperSaveChance({x:0,y:0,power:.45})-.70)<1e-10);
  assert.ok(Math.abs(keeperSaveChance({x:.5,y:.5,power:.75})-.39545454545)<1e-10);
  assert.ok(Math.abs(keeperSaveChance({x:0,y:0,power:.75})-.34545454545)<1e-10);
  assert.ok(Math.abs(keeperSaveChance({x:.5,y:.5,power:1})-.10)<1e-10);
  assert.ok(Math.abs(keeperSaveChance({x:0,y:0,power:1})-.05)<1e-10);
  // Exhaustive deterministic rolls verify the outcome frequency, not just the formula.
  for(const power of [.45,.5,.75,.99,1]) for(const [x,y] of [[.5,.5],[.1,.1],[.9,.9]]) {
    let saves=0;
    for(let i=0;i<1000;i++) {
      const saveRoll=(i+.5)/1000;
      const left=shot({x,y,power,saveRoll,keeperX:.1,keeperY:.5});
      const right=shot({x,y,power,saveRoll,keeperX:.9,keeperY:.5});
      assert.equal(left.outcome,right.outcome);
      if(left.outcome==='saved')saves++;
    }
    assert.equal(saves,Math.round(1000*keeperSaveChance({x,y,power})));
  }
  for(const power of [.45,.5,.75,.99,1]) {
    assert.ok(Math.abs(keeperSaveChance({x:.1,y:.1,power})-keeperSaveChance({x:.9,y:.9,power}))<1e-12);
  }
})

test('keeper animations follow the save or move clear of a scoring shot',()=>{
 const saved=shot({saveRoll:0});
 assert.equal(saved.keeperX,.2);
 assert.equal(saved.keeperY,.2);
 const goal=shot({saveRoll:.99,keeperX:.2,keeperY:.2});
 assert.equal(goal.outcome,'goal');
 assert.ok(Math.abs(goal.keeperX-.2)>=.3);
});

test('shot outcomes remain consistent across the goal and power range', () => {
  for (let xi = 0; xi <= 10; xi++) for (let yi = 0; yi <= 10; yi++) for (let pi = 0; pi <= 10; pi++) {
    const x = xi / 10, y = yi / 10, power = pi / 10
    const result = shot({ x, y, power, keeperX: 0.5, keeperY: 0.5 })
    assert.equal(result.goal, result.outcome === 'goal')
    assert.equal(result.perfect, power === 1)
    assert.ok(result.points >= 0 && result.points <= 150)
    if (!result.goal) assert.equal(result.points, 0)
    if (result.outcome === 'wide') assert.ok(result.targetX < 0 || result.targetX > 1)
    if (result.outcome === 'weak') assert.ok(result.targetY > 1)
    if (result.outcome === 'saved') {
      assert.equal(result.impactX, x)
      assert.equal(result.impactY, y)
      assert.ok(result.targetY > 1)
    }
  }
})
