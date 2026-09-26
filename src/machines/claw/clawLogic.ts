// Pure claw state machine. No three/rapier imports; deterministic given rng.
//
//   idle --(dx/dz)--> moving --(no input)--> idle
//   idle|moving --(drop)--> descending        (round += 1, result = null)
//   descending --(y <= floorY)--> closing
//   closing --(t >= closeTime)--> rising      (holding = prizeInReach, grip = 1)
//   rising --(y >= homeY)--> carrying   (slip roll runs here too)
//   carrying: head -> chuteXZ, each frame while holding: rng() < slip*dt -> slipped
//   carrying --(at chute)--> releasing        (grip 1 -> 0 over releaseTime)
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

export type ClawInput = { dx: -1 | 0 | 1; dz: -1 | 0 | 1; drop: boolean; prizeInReach: boolean }

export type ClawState = {
  phase: ClawPhase
  x: number
  y: number
  z: number
  grip: number // 0 open .. 1 closed
  holding: boolean
  slipped: boolean
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
    grip: 0,
    holding: false,
    slipped: false,
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

export function stepClaw(s: ClawState, input: ClawInput, dt: number, rng: () => number): ClawState {
  dt = clamp(dt, 0, 1 / 20)
  const n: ClawState = { ...s, t: s.t + dt }
  const go = (phase: ClawPhase) => {
    n.phase = phase
    n.t = 0
  }

  switch (s.phase) {
    case 'idle':
    case 'moving': {
      if (input.drop) {
        n.round = s.round + 1
        n.result = null
        n.holding = false
        n.slipped = false
        n.grip = 0
        go('descending')
        break
      }
      if (input.dx !== 0 || input.dz !== 0) {
        n.x = clamp(s.x + input.dx * CLAW.speed * dt, CLAW.bounds.x[0], CLAW.bounds.x[1])
        n.z = clamp(s.z + input.dz * CLAW.speed * dt, CLAW.bounds.z[0], CLAW.bounds.z[1])
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
        go('rising')
      }
      break
    }
    case 'rising': {
      if (n.holding && rng() < CLAW.slipChancePerSecond * dt) {
        n.holding = false
        n.slipped = true
      }
      n.y = Math.min(CLAW.homeY, s.y + CLAW.riseSpeed * dt)
      if (n.y >= CLAW.homeY) go('carrying')
      break
    }
    case 'carrying': {
      if (n.holding && rng() < CLAW.slipChancePerSecond * dt) {
        n.holding = false
        n.slipped = true
      }
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
