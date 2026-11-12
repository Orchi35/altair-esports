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

// All on-target shots fall from 75% at 45% power to 10% at full power.
// Both keepers use the same probability, independent of shot location.
export function keeperSaveChance({power}) {
  if(power < .45)return 0;
  const strength=clamp((power-.45)/.55,0,1);
  return .75-.65*strength;
}

// Coordinates are normalized to the goal, with y increasing downward.
// Ranked play supplies a secret-seeded roll; practice supplies its own random roll.
export function calculateShot({ x, y, power, keeperX, keeperY, saveRoll=.5 }) {
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
    const saved = saveRoll < keeperSaveChance({x,y,power})
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
  return { goal, points, keeperX, keeperY, outcome, perfect, postSide, targetX, targetY, impactX: outcome === 'post' ? impactX : outcome === 'saved' ? x : targetX, impactY: outcome === 'post' ? impactY : outcome === 'saved' ? y : targetY }
}
