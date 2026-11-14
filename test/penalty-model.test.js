import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateShot, powerFromMeter, keeperSaveChance, goalPoints, MAX_GOAL_POINTS, powerPercentage } from '../src/pages/penalty/shotModel.js'

const shot = overrides => calculateShot({ x: 0.2, y: 0.2, power: 0.8, keeperX: 0.8, keeperY: 0.8, ...overrides })

test('consecutive shots in a zone increase saves, switching zones or restarting resets learning',()=>{
  let keeperRead=null
  for(let i=1;i<=10;i++) {
    const result=shot({x:.2+(i%2)*.04,y:.2,power:1,saveRoll:.25,keeperRead})
    assert.equal(result.keeperRead.streak,i)
    assert.ok(Math.abs(result.saveChance-(.1+Math.min(i-1,4)*.08))<1e-12)
    assert.equal(result.outcome,i<3?'goal':'saved')
    keeperRead=result.keeperRead
  }
  for(const [x,y] of [[.8,.2],[.2,.8],[.5,.2]]) {
    const changed=shot({x,y,power:1,keeperRead})
    assert.equal(changed.saveChance,.1)
    assert.equal(changed.keeperRead.streak,1)
  }
  assert.equal(shot({power:1}).saveChance,.1)
  assert.equal(shot({power:.45,keeperRead}).saveChance,.95)
  assert.equal(shot({power:.1,keeperRead}).outcome,'weak')
  assert.equal(shot({power:.3,keeperRead}).outcome,'wide')
  assert.equal(shot({x:0,power:1,keeperRead}).outcome,'post')
})

test('goal points prioritize power and reserve the maximum for exact perfect timing', () => {
  for (const [power, points] of [[.45,28],[.5,35],[.75,79],[.9,113],[.99,137],[1,150]]) {
    assert.equal(goalPoints(power), points)
    assert.equal(shot({ power, saveRoll:1 }).points, points)
  }
  let previous = 0
  for (let percentage=0;percentage<=100;percentage++) {
    const points=goalPoints(percentage/100)
    assert.ok(points>=previous)
    if (percentage>=45) assert.ok(points>previous)
    if (percentage<100) assert.ok(points<MAX_GOAL_POINTS)
    previous=points
  }
  assert.equal(goalPoints(1-Number.EPSILON),137)
  assert.equal(goalPoints(.9099),goalPoints(.9))
  assert.equal(powerPercentage(.58),58)
  assert.equal(powerPercentage(1-Number.EPSILON),99)
  assert.equal(powerPercentage(1),100)
  for (const invalid of [NaN,Infinity,-1,1.01,'1',null]) assert.equal(goalPoints(invalid),0)
})

test('perfect goals always earn the maximum and failed shots never earn timing points', () => {
  for (const [x,y] of [[.5,.5],[.1,.1],[.9,.9]]) {
    for (const power of [.5,.75,.99,1]) assert.equal(shot({x,y,power,saveRoll:1}).points,goalPoints(power))
    assert.equal(shot({x,y,power:1,saveRoll:0}).points,0)
  }
  for (const result of [shot({x:0,power:1}),shot({y:0,power:1}),shot({power:.3}),shot({power:.1})]) assert.equal(result.points,0)
  assert.equal(Array.from({length:10},()=>shot({power:1,saveRoll:1})).reduce((total,result)=>total+result.points,0),1500)
})

test('meter reserves 100% for its narrow center band', () => {
  assert.equal(powerFromMeter(0.5), 1)
  for (const position of [0.491,0.492,0.508,0.509]) assert.equal(powerFromMeter(position),1)
  for (const position of [0.4909,0.5091,0.489,0.511]) {
    assert.ok(powerFromMeter(position)<1)
    assert.ok(powerPercentage(powerFromMeter(position))<100)
  }
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

test('save rates decrease with power and are equal across shot locations', () => {
  for(const [x,y] of [[.5,.5],[.2,.2],[0,0],[1,1]]) {
    let previous=1;
    for(let i=45;i<=100;i++) {
      const chance=keeperSaveChance({x,y,power:i/100});
      assert.ok(chance<previous);
      assert.ok(chance>=.10-1e-12 && chance<=.75);
      previous=chance;
    }
  }
  assert.ok(Math.abs(keeperSaveChance({x:.5,y:.5,power:.45})-.75)<1e-10);
  assert.ok(Math.abs(keeperSaveChance({x:0,y:0,power:.45})-.75)<1e-10);
  assert.ok(Math.abs(keeperSaveChance({x:.5,y:.5,power:.75})-.4359)<1e-10);
  assert.ok(Math.abs(keeperSaveChance({x:0,y:0,power:.75})-.4359)<1e-10);
  assert.ok(Math.abs(keeperSaveChance({x:.5,y:.5,power:1})-.10)<1e-10);
  assert.ok(Math.abs(keeperSaveChance({x:0,y:0,power:1})-.10)<1e-10);
  // Exhaustive deterministic rolls verify the outcome frequency, not just the formula.
  for(const power of [.45,.5,.75,.99,1]) for(const [x,y] of [[.5,.5],[.1,.1],[.9,.9]]) {
    let saves=0;
    for(let i=0;i<1000;i++) {
      const saveRoll=(i+.5)/1000;
      const left=shot({x,y,power,saveRoll,keeperX:.1,keeperY:.5});
      const right=shot({x,y,power,saveRoll,keeperX:.9,keeperY:.5});
      assert.equal(left.outcome,right.outcome);
      assert.equal(left.outcome,shot({x:.5,y:.5,power,saveRoll}).outcome);
      if(left.outcome==='saved')saves++;
    }
    assert.equal(saves,Math.round(1000*keeperSaveChance({x,y,power})));
  }
  for(const power of [.45,.5,.75,.99,1]) {
    for (const [x,y] of [[.1,.1],[.9,.9],[.5,.1],[.1,.5],[.9,.5],[.5,.9]]) {
      assert.equal(keeperSaveChance({x,y,power}),keeperSaveChance({x:.5,y:.5,power}));
    }
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


test('each displayed power percentage has one distinct save rate', () => {
  const rates=new Set();
  for(let percent=45;percent<=100;percent++) {
    const rate=keeperSaveChance({power:percent/100});
    rates.add(rate);
    if(percent<100) assert.equal(keeperSaveChance({power:(percent+.99)/100}),rate);
    assert.equal(shot({power:percent/100,saveRoll:rate-.000001}).outcome,'saved');
    assert.equal(shot({power:percent/100,saveRoll:rate}).outcome,'goal');
  }
  assert.equal(rates.size,56);
  for(const [percent,rate] of [[100,.1],[99,.1142],[90,.2391],[80,.3721],[70,.4976],[60,.6133],[50,.7134],[45,.75]]) {
    assert.equal(keeperSaveChance({power:percent/100}),rate);
  }
  assert.equal(keeperSaveChance({power:1-Number.EPSILON}),.1142);
  for(const power of [NaN,Infinity,-1,1.01,'1',null,.44999]) assert.equal(keeperSaveChance({power}),0);
});

test('Panenka narrows timing, doubles goals and changes keeper saves', () => {
  assert.equal(powerFromMeter(.505), 1)
  assert.ok(powerFromMeter(.505, 'panenka') < 1)
  assert.equal(goalPoints(1, 'panenka'), 300)
  assert.equal(goalPoints(.8, 'panenka'), 2 * goalPoints(.8))
  assert.equal(keeperSaveChance({power:1, streak:10, shotType:'panenka'}), 0)
  assert.ok(Math.abs(keeperSaveChance({power:.8, shotType:'panenka'}) - keeperSaveChance({power:.8}) - .2) < 1e-12)
  assert.equal(keeperSaveChance({power:.45, streak:10, shotType:'panenka'}), .98)
  assert.equal(shot({power:1, saveRoll:0, shotType:'panenka'}).points, 300)
  assert.equal(shot({x:0, power:1, shotType:'panenka'}).outcome, 'post')
  assert.equal(shot({power:.1, shotType:'panenka'}).outcome, 'weak')
  assert.equal(shot({power:.3, shotType:'panenka'}).outcome, 'wide')
})
