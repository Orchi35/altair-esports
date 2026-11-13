const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export const MAX_GOAL_POINTS = 150
export const PERFECT_WINDOW_HALF_WIDTH = 0.009

export function powerPercentage(power) {
  if (!Number.isFinite(power)) return 0
  if (power === 1) return 100
  return clamp(Math.floor(power * 100 + 1e-9), 0, 99)
}

// Timing determines scoring; aiming selects the ball's trajectory.
// Perfect timing earns an exclusive bonus. Near-perfect values cannot round up to it.
export function goalPoints(power) {
  if (!Number.isFinite(power) || power < .45 || power > 1) return 0
  if (power === 1) return MAX_GOAL_POINTS
  const displayedPower = powerPercentage(power) / 100
  return Math.round(140 * displayedPower * displayedPower)
}

// Only the narrow center band awards a perfect strike.
export function powerFromMeter(position) {
  const distance = Math.abs(clamp(position, 0, 1) - 0.5)
  return distance <= PERFECT_WINDOW_HALF_WIDTH + Number.EPSILON ? 1 : Math.min(0.99, 1 - distance * 2)
}

// One rate per displayed whole percentage, shared by ranked and practice play.
// Below 45% the shot is already weak/wide, so no keeper save is evaluated.
export const KEEPER_SAVE_RATES = Object.freeze(Array.from({length:101}, (_, percent) => {
  if (percent < 45) return 0
  const strength = (percent - 45) / 55
  return Math.round((.75 - .65 * strength ** 1.2) * 10000) / 10000
}))

export function shotZone(x, y) {
  return `${x < .4 ? 'left' : x > .6 ? 'right' : 'center'}-${y < .5 ? 'high' : 'low'}`
}

export function nextKeeperRead(previous, x, y) {
  const zone = shotZone(x, y)
  const previousStreak = Number.isInteger(previous?.streak) ? previous.streak : 0
  return {zone, streak:previous?.zone === zone ? Math.min(10, previousStreak + 1) : 1}
}

export function repetitionBonus(streak = 1) {
  return Math.min(4, Math.max(0, Math.floor(streak) - 1)) * .08
}

// The location itself has no advantage; consecutive attempts in one zone do.
export function keeperSaveChance({power, streak = 1}) {
  if (!Number.isFinite(power) || power < .45 || power > 1) return 0
  return Math.min(.95, KEEPER_SAVE_RATES[powerPercentage(power)] + repetitionBonus(streak))
}

// Coordinates are normalized to the goal, with y increasing downward.
// Ranked play supplies a secret-seeded roll; practice supplies its own random roll.
export function calculateShot({ x, y, power, keeperX, keeperY, saveRoll=.5, keeperRead=null }) {
  const read = nextKeeperRead(keeperRead, x, y)
  const saveChance = keeperSaveChance({power, streak:read.streak})
  const perfect = power === 1
  let outcome
  let postSide = null
  let impactX = x
  let impactY = y
  let targetX = x
  let targetY = y
  if (power < 0.2) {
    outcome = 'weak'
    targetY = 1.55
  } else if (power < 0.45) {
    outcome = 'wide'
    targetX = x < 0.5 ? -0.14 : 1.14
  } else if (x <= .025 || x >= .975 || y <= .045) {
    outcome = 'post'
    // Collision bands include the radius of the ball, not just the post center.
    postSide = x <= .025 ? 'left' : x >= .975 ? 'right' : 'crossbar'
    impactX = postSide === 'left' ? 0 : postSide === 'right' ? 1 : x
    impactY = postSide === 'crossbar' ? 0 : y
    targetX = postSide === 'left' ? -.25 : postSide === 'right' ? 1.25 : clamp(x + (x < .5 ? .14 : -.14), .1, .9)
    targetY = postSide === 'crossbar' ? 1.65 : 1.4
    if(Math.hypot(x-keeperX,y-keeperY)<.3)keeperX=x<.5?.82:.18
  } else {
    const saved = saveRoll < saveChance
    outcome = saved ? 'saved' : 'goal'
    if (saved) {
      keeperX = x
      keeperY = y
      targetX = clamp(x + (x < 0.5 ? -0.12 : 0.12), -0.1, 1.1)
      targetY = 1.35
    } else if (Math.hypot(x-keeperX,y-keeperY)<.3) {
      // A beaten keeper must not visually dive into the scoring ball's path.
      keeperX=x<.5?.82:.18
    }
  }
  const goal = outcome === 'goal'
  const points = goal ? goalPoints(power) : 0
  return { goal, points, keeperX, keeperY, outcome, perfect, postSide, targetX, targetY, keeperRead:read, saveChance, impactX: outcome === 'post' ? impactX : outcome === 'saved' ? x : targetX, impactY: outcome === 'post' ? impactY : outcome === 'saved' ? y : targetY }
}
