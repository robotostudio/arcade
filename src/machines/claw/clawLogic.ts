// Pure claw state machine. No three/rapier imports; deterministic given rng.
//
//   idle --(dx/dz or nudge)--> moving --(no input, nudge drained)--> idle
//   idle|moving --(drop)--> descending        (round += 1, result = null)
//   descending --(y <= floorY)--> closing
//   closing --(t >= closeTime)--> rising      (holding = prizeInReach, grip = 1, slipAt rolled once)
//   rising --(y >= homeY)--> carrying         (held clock runs through rising and carrying)
//   carrying: head -> chuteXZ; while holding: held >= slipAt -> slipped
//   releasing --(t >= releaseTime)--> returning  (result = {round, won}, holding = false)
//   returning --(at homeXZ)--> idle
import { CLAW } from './constants'

export type ClawPhase =
  | 'idle'
  | 'moving'
  | 'descending'
  | 'closing'
  | 'rising'
  | 'carrying'
  | 'releasing'
  | 'returning'

/** What the keyboard says this frame. nudgeX/Z are metres requested by taps since the last read. */
export type ClawControls = { dx: -1 | 0 | 1; dz: -1 | 0 | 1; nudgeX: number; nudgeZ: number; drop: boolean }

/** What the mouth senses at close time. quality 1 = prize centre dead under the mouth, 0 = at reach. */
export type ClawGrabSense = { prizeInReach: boolean; grabQuality: number; prizeHeavy: boolean }

export type ClawInput = ClawControls & ClawGrabSense

export type ClawState = {
  phase: ClawPhase
  x: number
  y: number
  z: number
  pendX: number // tap travel still to glide through, metres, signed
  pendZ: number
  grip: number // 0 open .. 1 closed
  holding: boolean
  slipped: boolean
  held: number // seconds since the grab closed on a prize
  slipAt: number // held time at which a failed grab lets go; Infinity for a good grab
  t: number // seconds in phase
  round: number
  result: null | { round: number; won: boolean }
}

const ARRIVE = 0.02

export function initialClawState(): ClawState {
  return {
    phase: 'idle',
    x: CLAW.homeXZ[0],
    y: CLAW.homeY,
    z: CLAW.homeXZ[1],
    pendX: 0,
    pendZ: 0,
    grip: 0,
    holding: false,
    slipped: false,
    held: 0,
    slipAt: Infinity,
    t: 0,
    round: 0,
    result: null,
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Move (x,z) toward target at CLAW.speed. Returns new xz and whether arrived. */
function moveToward(x: number, z: number, tx: number, tz: number, dt: number) {
  const ddx = tx - x
  const ddz = tz - z
  const dist = Math.hypot(ddx, ddz)
  const step = CLAW.speed * dt
  if (dist <= ARRIVE || dist <= step) return { x: tx, z: tz, arrived: true }
  const k = step / dist
  const nx = x + ddx * k
  const nz = z + ddz * k
  return { x: nx, z: nz, arrived: Math.hypot(tx - nx, tz - nz) <= ARRIVE }
}

/** Drain a pending tap nudge at nudgeSpeed. Returns the distance moved this frame and what is left. */
function drainNudge(pend: number, dt: number) {
  const step = Math.min(Math.abs(pend), CLAW.nudgeSpeed * dt)
  const moved = Math.sign(pend) * step
  return { moved, left: pend - moved }
}

/** P(hold) for a grab of the given centring quality; heavy prizes never hold. */
export function holdChance(quality: number, heavy: boolean): number {
  if (heavy) return 0
  const q = clamp(quality, 0, 1)
  const { centred, edge } = CLAW.holdChance
  return edge + (centred - edge) * q
}

/** Roll, once at close time, when this grab lets go: Infinity means it holds to the chute. */
export function rollSlipAt(sense: ClawGrabSense, rng: () => number): number {
  if (rng() < holdChance(sense.grabQuality, sense.prizeHeavy)) return Infinity
  const [lo, hi] = sense.prizeHeavy ? CLAW.heavySlipWindow : CLAW.slipWindow
  return lo + (hi - lo) * rng()
}

export function stepClaw(s: ClawState, input: ClawInput, dt: number, rng: () => number): ClawState {
  dt = clamp(dt, 0, 1 / 20)
  const n: ClawState = { ...s, t: s.t + dt }
  const go = (phase: ClawPhase) => {
    n.phase = phase
    n.t = 0
  }
  const slipCheck = () => {
    if (n.holding && n.held >= n.slipAt) {
      n.holding = false
      n.slipped = true
    }
  }

  switch (s.phase) {
    case 'idle':
    case 'moving': {
      if (input.drop) {
        n.round = s.round + 1
        n.result = null
        n.holding = false
        n.slipped = false
        n.held = 0
        n.slipAt = Infinity
        n.grip = 0
        n.pendX = 0
        n.pendZ = 0
        go('descending')
        break
      }
      const px = drainNudge(s.pendX + input.nudgeX, dt)
      const pz = drainNudge(s.pendZ + input.nudgeZ, dt)
      n.pendX = px.left
      n.pendZ = pz.left
      const heldMove = input.dx !== 0 || input.dz !== 0
      const nudging = px.moved !== 0 || pz.moved !== 0
      if (heldMove || nudging) {
        n.x = clamp(s.x + input.dx * CLAW.speed * dt + px.moved, CLAW.bounds.x[0], CLAW.bounds.x[1])
        n.z = clamp(s.z + input.dz * CLAW.speed * dt + pz.moved, CLAW.bounds.z[0], CLAW.bounds.z[1])
        if (s.phase !== 'moving') go('moving')
      } else if (s.phase === 'moving') {
        go('idle')
      }
      break
    }
    case 'descending': {
      n.y = Math.max(CLAW.floorY, s.y - CLAW.dropSpeed * dt)
      if (n.y <= CLAW.floorY) go('closing')
      break
    }
    case 'closing': {
      n.grip = clamp(n.t / CLAW.closeTime, 0, 1)
      if (n.t >= CLAW.closeTime) {
        n.grip = 1
        n.holding = input.prizeInReach
        n.held = 0
        n.slipAt = n.holding ? rollSlipAt(input, rng) : Infinity
        go('rising')
      }
      break
    }
    case 'rising': {
      n.held = s.held + dt
      slipCheck()
      n.y = Math.min(CLAW.homeY, s.y + CLAW.riseSpeed * dt)
      if (n.y >= CLAW.homeY) go('carrying')
      break
    }
    case 'carrying': {
      n.held = s.held + dt
      slipCheck()
      const m = moveToward(s.x, s.z, CLAW.chuteXZ[0], CLAW.chuteXZ[1], dt)
      n.x = m.x
      n.z = m.z
      if (m.arrived) go('releasing')
      break
    }
    case 'releasing': {
      n.grip = clamp(1 - n.t / CLAW.releaseTime, 0, 1)
      if (n.t >= CLAW.releaseTime) {
        n.grip = 0
        n.result = { round: s.round, won: s.holding }
        n.holding = false
        go('returning')
      }
      break
    }
    case 'returning': {
      const m = moveToward(s.x, s.z, CLAW.homeXZ[0], CLAW.homeXZ[1], dt)
      n.x = m.x
      n.z = m.z
      if (m.arrived) go('idle')
      break
    }
  }
  return n
}
