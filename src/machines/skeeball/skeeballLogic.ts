// Pure skeeball state machine. No three/rapier/react imports; deterministic given inputs.
//
//   idle --(press)--> aiming                    (startRound: round += 1, score 0, ballsLeft = SKEE.balls)
//   aiming --(press)--> powering                (aim locked from aimAngle)
//   powering --(press)--> rolling               (power locked, launch = true for that one returned state)
//   rolling --(settled)--> hit                  (score += value, lastHit = value; see `pending`)
//   rolling --(gutter | t >= rollTimeout)--> hit (lastHit = 0, or the pending trough on a timeout)
//   hit --(t >= hitTime)--> aiming              (next ball, while ballsLeft > 0)
//   hit --(t >= hitTime)--> result              (last ball: result = {round, score, tickets})
//   result --(t >= resultTime)--> idle          (result stays set so the controller pays exactly once)
//
// `launch` is set only on the state returned by the powering -> rolling step; the next step clears it.
// `ballsLeft` counts balls not yet launched; `ballIndex` is the 0-based ball currently on the lane.
// Settling: while rolling, `pending` mirrors the trough the ball is inside and `pendingT` how long
// that has been so; the ball scores `pending` once pendingT reaches SKEE.settle.grace, so a ball
// that clips the 30 row and drops into the 20 scores 20, not the first sensor it touched.
import { SKEE } from './constants'

export type SkeePhase = 'idle' | 'aiming' | 'powering' | 'rolling' | 'hit' | 'result'

/** One edge-triggered press since the last read. */
export type SkeeControls = { press: boolean }

/** What the physics sensed this frame: the trough value the ball is inside (the lowest if a bounce
 *  overlaps two sensors), and whether it is out of play (fell below gutterY or rolled back off the hump). */
export type SkeeSense = { inside: number | null; gutter: boolean }

export type SkeeInput = SkeeControls & SkeeSense

export type SkeeState = {
  phase: SkeePhase
  t: number // seconds in phase
  sweepT: number // seconds since aiming started, drives the arrow
  aim: number // radians, locked at powering
  power: number // 0..1, locked at rolling
  ballsLeft: number // balls not yet launched this Round
  ballIndex: number // 0-based, which ball is on the lane
  pending: number | null // trough the rolling ball is inside, null while airborne or on the lane
  pendingT: number // seconds `pending` has been unchanged
  score: number
  lastHit: number | null
  round: number
  launch: boolean // true for exactly the one frame the ball must be fired
  result: null | { round: number; score: number; tickets: number }
}

const DEG = Math.PI / 180

export function initialSkeeState(): SkeeState {
  return {
    phase: 'idle',
    t: 0,
    sweepT: 0,
    aim: 0,
    power: 0,
    ballsLeft: 0,
    ballIndex: 0,
    pending: null,
    pendingT: 0,
    score: 0,
    lastHit: null,
    round: 0,
    launch: false,
    result: null,
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Tickets paid for a Round score. */
export function ticketsFor(score: number): number {
  return Math.round(score / SKEE.scoreDivisor)
}

/** Current arrow angle in radians: sweeping while aiming, locked afterwards, centred while idle. */
export function aimAngle(s: SkeeState): number {
  if (s.phase === 'aiming') return SKEE.aim.maxDeg * DEG * Math.sin(s.sweepT * SKEE.aim.omega)
  if (s.phase === 'idle') return 0
  return s.aim
}

/** Current meter 0..1: oscillating while powering, locked afterwards, empty before. */
export function powerLevel(s: SkeeState): number {
  if (s.phase === 'powering') return 0.5 + 0.5 * Math.sin(s.t * SKEE.power.omega)
  if (s.phase === 'idle' || s.phase === 'aiming') return 0
  return s.power
}

/** Begin a Round: first ball on the lane, arrow sweeping. Keeps `result` so the last payout stays visible. */
export function startRound(s: SkeeState): SkeeState {
  return {
    ...s,
    phase: 'aiming',
    t: 0,
    sweepT: 0,
    aim: 0,
    power: 0,
    ballsLeft: SKEE.balls,
    ballIndex: 0,
    pending: null,
    pendingT: 0,
    score: 0,
    lastHit: null,
    round: s.round + 1,
    launch: false,
  }
}

export function stepSkee(prev: SkeeState, input: SkeeInput, dt: number): SkeeState {
  dt = clamp(dt, 0, 1 / 20)
  const n: SkeeState = { ...prev, t: prev.t + dt, launch: false }
  const go = (phase: SkeePhase) => {
    n.phase = phase
    n.t = 0
  }
  // Ball done: record the value, show it, then decide on the next ball or the result in 'hit'.
  const settle = (value: number) => {
    n.score = prev.score + value
    n.lastHit = value
    go('hit')
  }

  switch (prev.phase) {
    case 'idle': {
      if (input.press) return startRound(prev)
      break
    }
    case 'aiming': {
      n.sweepT = prev.sweepT + dt
      if (input.press) {
        n.aim = aimAngle(n)
        go('powering')
      }
      break
    }
    case 'powering': {
      if (input.press) {
        n.power = powerLevel(n)
        n.ballsLeft = prev.ballsLeft - 1
        n.pending = null
        n.pendingT = 0
        n.launch = true
        go('rolling')
      }
      break
    }
    case 'rolling': {
      n.pending = input.inside
      n.pendingT = input.inside === prev.pending ? prev.pendingT + dt : 0
      if (input.gutter) settle(0)
      else if (n.pending !== null && n.pendingT >= SKEE.settle.grace) settle(n.pending)
      else if (n.t >= SKEE.rollTimeout) settle(n.pending ?? 0)
      break
    }
    case 'hit': {
      if (n.t >= SKEE.hitTime) {
        if (prev.ballsLeft > 0) {
          n.ballIndex = prev.ballIndex + 1
          n.sweepT = 0
          n.aim = 0
          n.power = 0
          go('aiming')
        } else {
          n.result = { round: prev.round, score: prev.score, tickets: ticketsFor(prev.score) }
          go('result')
        }
      }
      break
    }
    case 'result': {
      if (n.t >= SKEE.resultTime) go('idle')
      break
    }
  }
  return n
}
