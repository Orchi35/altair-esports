import test from 'node:test'
import assert from 'node:assert/strict'
import { sampleKeeper, sampleKeeperRecovery, keeperRecoveryDuration, KEEPER_ANCHORS, KEEPER_CONTACT } from '../src/pages/penalty/keeperMotion.js'
import { sampleFlight } from '../src/pages/penalty/flightMotion.js'
import { calculateShot } from '../src/pages/penalty/shotModel.js'

test('saved shots meet the rotated gloves or the grounded central body block', () => {
  for (const impactX of [.1, .3, .5, .7, .9]) for (const impactY of [.1, .5, .9]) {
    const pose = sampleKeeper({ outcome: 'saved', impactX, impactY }, .62)
    if (impactX === .5 && impactY >= .5) {
      // A central shot meets the keeper's torso/legs in a grounded body block.
      assert.ok(['crouch', 'kneel'].includes(pose.pose))
      assert.equal(pose.x, 500)
      assert.equal(pose.y + KEEPER_ANCHORS[pose.pose].feet[1], 382)
      assert.ok(Math.abs((145 + impactY * 235) - pose.y) < 65)
      continue
    }
    const [gx, gy] = KEEPER_ANCHORS[pose.pose].glove
    const a = pose.angle * Math.PI / 180
    assert.ok(['dive', 'block'].includes(pose.pose))
    assert.ok(Math.abs(pose.x + gx * pose.facing * Math.cos(a) - gy * pose.scaleY * Math.sin(a) - (220 + impactX * 560)) < 1e-8)
    assert.ok(Math.abs(pose.y + gx * pose.facing * Math.sin(a) + gy * pose.scaleY * Math.cos(a) - (145 + impactY * 235)) < 1e-8)
    const before = sampleKeeper({ outcome: 'saved', impactX, impactY }, .6199)
    const after = sampleKeeper({ outcome: 'saved', impactX, impactY }, .6201)
    if (pose.pose === 'dive') assert.ok(Math.hypot(after.x - before.x, after.y - before.y) > .001)
  }
})

test('upright misses do not trigger a kneeling recovery', () => {
  for (const outcome of ['weak', 'wide']) {
    const result = { outcome, keeperX: .8, keeperY: .3 }
    for (let i=0; i<=20; i++) assert.equal(sampleKeeperRecovery(result, i/20).pose, 'ready')
    assert.equal(sampleKeeperRecovery(result, 1).x, 500)
  }
})

test('central and restrained shots remain upright', () => {
  for (const result of [{outcome:'saved', impactX:.5, impactY:.1}, {outcome:'saved', impactX:.5, impactY:.5}, {outcome:'saved', impactX:.5, impactY:.9}, {outcome:'weak', keeperX:.1, keeperY:.5}, {outcome:'wide', keeperX:.9, keeperY:.5}]) {
    for (let p = 0; p <= 1; p += .01) assert.ok(!['dive', 'land'].includes(sampleKeeper(result, p).pose))
  }
})

test('landing and recovery remain grounded and finish at the ready position', () => {
  const result = { outcome:'saved', impactX:.2, impactY:.3 }
  const end = sampleKeeper(result, 1)
  assert.equal(end.y + KEEPER_ANCHORS.land.feet[1], 382)
  assert.equal(sampleKeeperRecovery(result, .1).x, end.x)
  for (const p of [.25, .45, 1]) {
    const s = sampleKeeperRecovery(result, p)
    assert.equal(s.y + KEEPER_ANCHORS[s.pose].feet[1], 382)
  }
  const final = sampleKeeperRecovery(result, 1)
  assert.equal(final.pose, 'ready')
  assert.equal(final.x, 500)
  assert.equal(final.y, 382 - 85.546875)
})

test('each frame uses one opaque pose and progress is clamped', () => {
  const result = { outcome:'goal', keeperX:.8, keeperY:.4 }
  assert.deepEqual(sampleKeeper(result, -1), sampleKeeper(result, 0))
  assert.deepEqual(sampleKeeper(result, 2), sampleKeeper(result, 1))
  for (let p = 0; p <= 1; p += .01) {
    const s = sampleKeeper(result, p)
    assert.equal(typeof s.pose, 'string')
    assert.equal('diveMix' in s, false)
    assert.equal('landMix' in s, false)
  }
})



test('motion remains finite and continuous within each pose', () => {
  for (const impactX of [.1, .3, .5, .7, .9]) for (const impactY of [.1, .5, .9]) {
    const result = { outcome: 'saved', impactX, impactY }
    let previous = sampleKeeper(result, 0)
    for (let i = 1; i <= 1000; i++) {
      const current = sampleKeeper(result, i / 1000)
      for (const key of ['x', 'y', 'angle', 'scaleY']) assert.ok(Number.isFinite(current[key]))
      if (current.pose === previous.pose) assert.ok(Math.hypot(current.x - previous.x, current.y - previous.y) < 5)
      previous = current
    }
  }
})

test('sideways launch does not teleport and landing feet stay on the turf', () => {
  for (const impactX of [.1, .9]) {
    const result = {outcome:'saved',impactX,impactY:.2}
    for (const boundary of [.2,.29,.84]) {
      const a=sampleKeeper(result,boundary-1e-6), b=sampleKeeper(result,boundary+1e-6)
      assert.ok(Math.abs(a.x-b.x)<.01, `Horizontal jump at ${boundary}`)
    }
    for (let i=84;i<=100;i++) {
      const pose=sampleKeeper(result,i/100)
      assert.ok(Math.abs(pose.y+KEEPER_ANCHORS.land.feet[1]*pose.scaleY-382)<1e-8)
    }
    const contact=sampleKeeper(result,KEEPER_CONTACT)
    const grounded=sampleKeeper(result,1)
    assert.ok(contact.shadowOpacity<grounded.shadowOpacity)
    assert.ok(contact.shadowRx<grounded.shadowRx)
    assert.ok(keeperRecoveryDuration(result)>keeperRecoveryDuration({outcome:'weak',keeperX:.5,keeperY:.5}))
  }
})

test('ball and gloves share contact time on both sides of the goal',()=>{
  for (const x of [.05,.2,.8,.95]) for (const y of [.06,.3,.7,.98]) {
    const result=calculateShot({x,y,power:1,keeperX:.5,keeperY:.5,saveRoll:0})
    const ball=sampleFlight(result,KEEPER_CONTACT), keeper=sampleKeeper(result,KEEPER_CONTACT)
    const [gx,gy]=KEEPER_ANCHORS[keeper.pose].glove, a=keeper.angle*Math.PI/180
    assert.ok(Math.hypot(ball.x-(keeper.x+gx*keeper.facing*Math.cos(a)-gy*keeper.scaleY*Math.sin(a)),ball.y-(keeper.y+gx*keeper.facing*Math.sin(a)+gy*keeper.scaleY*Math.cos(a)))<1e-8)
  }
})
