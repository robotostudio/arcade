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
  // Ramp (hump) from the lane foot up to the crest. Steep on purpose: the ball pops off the foot
  // kink into a lob that comes DOWN onto the stacked shelves, so the shelf it lands on follows the
  // launch speed monotonically. At 0.4 (34 deg) the ball was still climbing when it reached the
  // rows, clipped lip edges on the way up and ricocheted off the hood ceiling (headless sim).
  ramp: { zStart: -0.4, zEnd: -1.0, rise: 0.7 }, // crest at y = laneY + rise = 1.45 (49 deg)
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
  // Ball body tuning. The launch table below was calibrated against exactly these (the headless sim
  // reads them from here too), so a change here means a recalibration.
  ballPhys: { restitution: 0.3, friction: 0.6, linearDamping: 0.1, angularDamping: 0.2 },
  laneFriction: 0.3, // every fixed collider; combined with the ball's by Min
  // Stage one: an arrow sweeps left/right, angle = maxDeg * sin(t * omega). A press locks it.
  // Small on purpose: sideways speed survives the hump while forward speed collapses at the crest,
  // so a few degrees drift the ball a full pocket. At 50-power: |aim| < 1.5 -> 50, 2..2.5 -> the
  // divider (40), >= 3 -> 100 (outer quarter of the sweep). The physical angle is invisible under
  // the dither (+-4.5 cm at the arrow tip), so the arrow is drawn at aim * visualGain (+-20 deg);
  // the lane's centre stripe stops arrowReach ahead of the ball so the amber arrow sits on dark wood.
  aim: { maxDeg: 4, omega: 2.6, visualGain: 5, arrowReach: 0.8 },
  // Stage two: a power meter oscillates p = 0.5 + 0.5 * sin(t * omega). A press locks it.
  power: { omega: 3.2 },
  // Launch speed along the lane, lerp(min, max, power). Calibrated with a headless rapier sim
  // (scratch skee-calib.mjs, same colliders and ball params) at aim 0 under the settle rule below:
  // 7.2 -> rolls back off the hump (MISS), 7.4-7.9 -> 10 or 20 (only just crests), 8.2-8.9 -> 20,
  // 9.1-10.1 -> 30, 10.3-11 -> 40, 11.3-12 -> 50 (the ball taps the back wall above the top lip and
  // drops in). So p 0 -> miss, 0.05-0.15 -> 10/20, 0.2-0.35 -> 20, 0.4-0.6 -> 30, 0.65-0.8 -> 40,
  // 0.85+ -> 50; 100 needs 50-power and |aim| >= 3 deg.
  launch: { min: 7.2, max: 12.0 },
  // A ball scores the trough it comes to rest in, not the first one it clips: the trough sensor the
  // ball is inside (the lowest, if a bounce overlaps two) is pending, and it settles once that has
  // not changed for `grace` seconds. A ball back on the flat lane moving toward the player (rolled
  // off the hump) is a miss at once rather than waiting out rollTimeout.
  settle: { grace: 0.4 },
  balls: 9,
  rollTimeout: 5, // s after launch with no trough, gutter or roll-back: score 0, next ball
  hitTime: 0.6, // s the hit value shows before the next ball loads
  resultTime: 2, // s the Round result shows before the machine idles
  scoreDivisor: PAYOUT.skeeball.scoreDivisor, // Tickets = round(score / scoreDivisor)
  // Cabinet shell around the Lane (Cabinet.tsx draws it, geometry.ts puts colliders just inside it,
  // Indicators.tsx hangs the meters, score strip and value board on it). Hood front z = ramp.zStart - setback.
  hood: {
    setback: 0.4,
    roofT: 0.14,
    cheekT: 0.12, // hood cheeks and the low side rails, outside the Lane's walls
    railH: 0.25, // low side rail height on the plinth; the power meters stand on its top
    lintelT: 0.08, // lintel plate thickness, visual and collider
    marqueeY: 2.88, // centre of the amber marquee band (0.5 tall) on the lintel face, up against the roof
    marqueeH: 0.5,
    stripZ: 0.135, // score strip face, ahead of the hood front
    boardY: 2.5, // value board (one lit numeral per trough value) on the lintel below the marquee
  },
} as const

// Camera dock for Play mode, relative to the machine origin (floor centre, player at +z).
// High enough that the 30 row's plate clears the 1.45 crest; the 10/20 rows never will, which is
// what the lintel value board is for.
export const DOCK = {
  position: [0, 3.2, 5.4] as const,
  target: [0, 1.2, -1.2] as const,
}
