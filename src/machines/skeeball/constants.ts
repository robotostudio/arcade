// Skeeball tuning and geometry contract. Machine-local metres, y up, origin = floor centre of the
// cabinet, player stands at +z looking toward -z. Every module (Lane colliders, Ball spawn, the
// calibration script, the aim/power indicators) reads its numbers from here, nowhere else.
import { PAYOUT } from '@/arcade/economy'

// One landing trough behind the lip. Higher and deeper = worth more. `x` is the trough centre,
// `halfW` its half width; the two 100 pockets share the top row with the 50.
export type Trough = { value: number; x: number; z: number; y: number; halfW: number }

const TOP_Z = -2.03
const TOP_Y = 1.75

export const SKEE = {
  cabinet: { w: 1.8, h: 3.2, d: 4.4 }, // outer size; z runs -2.2 (back) to +2.2 (player end)
  laneY: 0.75, // flat lane surface
  lane: { zStart: 2.0, zEnd: -0.4, w: 1.2 }, // flat lane from the player end to the ramp foot; inner width
  wallT: 0.12, // side wall thickness
  wallH: 0.3, // side wall height above the lane surface (runs the whole length, incl. the target well)
  // Ramp from the lane foot up to the lip. The ball rolls up and hops off the lip into the well.
  ramp: { zStart: -0.4, zEnd: -1.0, rise: 0.4 }, // lip at y = laneY + rise = 1.15
  // Target well: stacked troughs, each a shelf with a small front lip so the ball settles and scores.
  // Row order is front (low) to back (high). Depth of a row in z = the gap between neighbours (0.22).
  troughDepth: 0.22,
  troughLip: 0.06, // front lip height on each shelf
  troughs: [
    { value: 10, x: 0, z: -1.15, y: 0.95, halfW: 0.6 },
    { value: 20, x: 0, z: -1.37, y: 1.15, halfW: 0.6 },
    { value: 30, x: 0, z: -1.59, y: 1.35, halfW: 0.6 },
    { value: 40, x: 0, z: -1.81, y: 1.55, halfW: 0.6 },
    { value: 50, x: 0, z: TOP_Z, y: TOP_Y, halfW: 0.26 },
    { value: 100, x: -0.44, z: TOP_Z, y: TOP_Y, halfW: 0.14 },
    { value: 100, x: 0.44, z: TOP_Z, y: TOP_Y, halfW: 0.14 },
  ] as readonly Trough[],
  backWall: { z: -2.16, h: 1.4 }, // behind the top row; a hard throw bounces back into the 40/50
  gutterY: 0.3, // a ball below this (fell out of the well or off the lane) scores 0 and the next ball loads
  ball: { r: 0.08, spawn: [0, 0.75 + 0.08 + 0.01, 1.7] as readonly [number, number, number] },
  // Stage one: an arrow sweeps left/right, angle = maxDeg * sin(t * omega). A press locks it.
  aim: { maxDeg: 14, omega: 2.6 },
  // Stage two: a power meter oscillates p = 0.5 + 0.5 * sin(t * omega). A press locks it.
  power: { omega: 3.2 },
  // Launch speed along the lane, lerp(min, max, power). Calibrated with a headless rapier sim so
  // p ~ 0.5 lands the 30 row (the impulse is spent on slide-to-roll before the ramp: a 9 m/s
  // impulse reaches the ramp foot at ~5 m/s). p 0 -> 20, 0.4-0.6 -> 30, 0.7-0.8 -> 40, 0.9+ -> 50,
  // full power at full aim -> 100. The 10 row catches bounce-backs.
  launch: { min: 8.0, max: 16.0 },
  balls: 9,
  rollTimeout: 5, // s after launch with no trough or gutter hit: score 0, next ball
  hitTime: 0.6, // s the hit value shows before the next ball loads
  resultTime: 2, // s the Round result shows before the machine idles
  scoreDivisor: PAYOUT.skeeball.scoreDivisor, // Tickets = round(score / scoreDivisor)
} as const

// Camera dock for Play mode, relative to the machine origin (floor centre, player at +z).
export const DOCK = {
  position: [0, 2.7, 5.4] as const,
  target: [0, 1.2, -1.2] as const,
}
