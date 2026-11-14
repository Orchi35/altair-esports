import {powerFromMeter} from './shotModel.js'

export const METER_LEG_MS = 620
export const SHOT_WARMUP_MS = 800
export const SHOT_WINDOW_MS = 30000

export function meterPosition(elapsed, legMs = METER_LEG_MS) {
  const cycle = (Math.max(0, elapsed) / legMs) % 2
  return cycle <= 1 ? cycle : 2 - cycle
}

export function timedShotSample(receivedAt, timing) {
  const position = meterPosition(receivedAt - timing.startsAt, timing.legMs)
  return { meterPosition: position, power: powerFromMeter(position) }
}
