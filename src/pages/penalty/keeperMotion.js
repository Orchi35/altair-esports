const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t) }
const phase = (p, a, b) => clamp((p - a) / (b - a))
const GROUND = 382
const BASE_Y = GROUND - 85.546875
export const KEEPER_CONTACT = .62

// Returning from a full dive needs more time than a central body block.
export function keeperRecoveryDuration(result) {
  const end = sampleKeeper(result, 1)
  return (end.pose === 'land' ? 1550 : 900) + Math.abs(end.x - 500) * 2
}

// Local coordinates are for the left-facing, unrotated sprite viewport.
export const KEEPER_ANCHORS = {
  ready: { feet: [0, 85.546875] }, crouch: { glove: [0, -6], feet: [0, 64.6] },
  push: { glove: [-65, -65], feet: [70, 65] },
  dive: { glove: [-90, -30.5], feet: [0, 55] },
  land: { feet: [0, 39] }, kneel: { glove: [-40, 48], feet: [0, 57] },
  block: { glove: [0, -76], feet: [0, 83.5] },
}

const hermite = (a, b, va, vb, t, duration) => {
  const t2 = t * t, t3 = t2 * t
  return (2*t3 - 3*t2 + 1)*a + (t3 - 2*t2 + t)*duration*va +
    (-2*t3 + 3*t2)*b + (t3 - t2)*duration*vb
}
const target = result => {
  const saved = result.outcome === 'saved'
  const nx = (saved ? result.impactX : result.keeperX) ?? .5
  const ny = (saved ? result.impactY : result.keeperY) ?? .5
  return { nx, ny, x: 220 + nx * 560, y: 145 + ny * 235 }
}
const isRestrained = r => r.outcome === 'wide' || r.outcome === 'weak' || r.outcome === 'missed'
const shape = (pose, x, y, facing, angle = 0, reaction = 1) => {
  const height = Math.max(0, GROUND - (y + (KEEPER_ANCHORS[pose]?.feet[1] || 55)))
  const airborne = clamp(height / 150)
  return {
    pose, x, y, angle, facing, scaleY: 1, shadowX: x,
    shadowRx: lerp(pose === 'dive' || pose === 'land' ? 76 : 48, 36, airborne),
    shadowOpacity: lerp(.28, .10, airborne), reaction,
  }
}

export function sampleKeeper(result, progress) {
  const p = clamp(progress), t = target(result), facing = t.x > 500 ? -1 : 1
  if (p < .1) return shape('ready', 500, BASE_Y, facing, 0, 0)
  if (isRestrained(result)) {
    const step = 35 * -facing * smooth(phase(p, .1, .5))
    return shape(p < .75 ? 'crouch' : 'ready', 500 + step,
      p < .75 ? GROUND - 64.6 : BASE_Y, facing, 0, smooth(phase(p, .1, .2)))
  }
  if (Math.abs(t.nx - .5) < .12) {
    // Close-range central shots are blocked with the body, not a sideways dive.
    if (t.y > 242) {
      const x = lerp(500, t.x, smooth(phase(p, .1, .5)))
      const low = t.ny > .82 && p >= .4
      return shape(low ? 'kneel' : 'crouch', x, GROUND - (low ? 57 : 64.6), facing)
    }
    if (p < .29) return shape('crouch', 500, GROUND - 64.6, facing, 0, smooth(phase(p, .1, .2)))
    if (p >= .84) return shape('crouch', t.x, GROUND - 64.6, facing)
    const scale = Math.min(1, (GROUND - t.y) / 159.5)
    const contactY = t.y + 76 * scale
    const u = p <= KEEPER_CONTACT ? smooth(phase(p, .29, KEEPER_CONTACT)) : 1 - smooth(phase(p, KEEPER_CONTACT, .84))
    const s = shape('block', lerp(500, t.x, smooth(phase(p, .29, KEEPER_CONTACT))), lerp(GROUND - 83.5 * scale, contactY, u), facing)
    s.scaleY = scale
    return s
  }
  if (p < .2) return shape('crouch', 500, GROUND - 64.6, facing, 0, smooth(phase(p, .1, .2)))
  const angle = lerp(30, -50, smooth(phase(t.ny, .1, .9))) * facing
  const radians = angle * Math.PI / 180
  const gx = -90 * facing, gy = -30.5
  const contactX = t.x - (gx * Math.cos(radians) - gy * Math.sin(radians))
  const contactY = t.y - (gx * Math.sin(radians) + gy * Math.cos(radians))
  const launchX = 500 - facing * 35, launchY = GROUND - 65
  if (p < .29) {
    const x = 500 - facing * 35 * smooth(phase(p, .2, .29))
    return shape('push', x, GROUND - 65, facing)
  }
  const vx = (contactX - launchX) / .33 * .7
  // Keep forward momentum through glove contact, then absorb it on landing.
  const vy = (contactY - launchY) / .33 * .35
  if (p < .84) {
    let x, y
    if (p <= KEEPER_CONTACT) {
      const u = phase(p, .29, KEEPER_CONTACT)
      x = hermite(launchX, contactX, vx, vx, u, .33)
      y = hermite(launchY, contactY, -100, vy, u, .33)
    } else {
      const u = phase(p, KEEPER_CONTACT, .84)
      x = hermite(contactX, contactX + vx * .10, vx, 0, u, .22)
      y = hermite(contactY, GROUND - 55, vy, 0, u, .22)
    }
    const turn = lerp(0, angle, smooth(phase(p, .29, .5)))
    return shape('dive', x, y, facing, turn * (1 - smooth(phase(p, KEEPER_CONTACT, .84))))
  }
  const landX = contactX + vx * .10
  const settle = phase(p, .84, 1)
  const landing = shape('land', landX - facing * 10 * smooth(settle), GROUND - 39, facing)
  // A small damped compression absorbs the impact; feet remain on the turf.
  landing.scaleY = 1 - Math.sin(settle * Math.PI) * .055
  landing.y = GROUND - 39 * landing.scaleY
  landing.impact = Math.sin(settle * Math.PI) * (1 - settle)
  return landing
}

export function sampleKeeperRecovery(result, progress) {
  const p = clamp(progress), end = sampleKeeper(result, 1)
  if (end.pose !== 'land') {
    if (p < .25 && end.pose !== 'ready') return end
    const u = smooth(phase(p, end.pose === 'ready' ? 0 : .25, 1))
    return shape('ready', lerp(end.x, 500, u), BASE_Y, end.facing, 0, 1 - u)
  }
  if (p < .2) return end
  if (p < .4) return shape('kneel', end.x, GROUND - 57, end.facing)
  if (p < .55) return shape('crouch', end.x, GROUND - 64.6, end.facing)
  const u = phase(p, .55, 1)
  const x = lerp(end.x, 500, smooth(u))
  const steps = Math.max(2, Math.round(Math.abs(end.x - 500) / 45))
  const bob = Math.sin(u * Math.PI * steps) * Math.sin(u * Math.PI) * 3
  return shape('ready', x, BASE_Y - Math.abs(bob), end.facing, 0, 1 - smooth(u))
}
