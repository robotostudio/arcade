'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  type RapierRigidBody,
} from '@react-three/rapier'
import { MathUtils, Quaternion, Vector3, type Group, type Mesh } from 'three'
import { PAYOUT } from '@/arcade/economy'
import type { MachineProps } from '@/machines/types'
import { Board } from './Board'
import { Cabinet } from './Cabinet'
import {
  BOARD,
  CABINET,
  HOLES,
  SKEE,
  boardTheta,
  humpEnd,
  laneSegments,
  laneTop,
  lip,
  missY,
  onBoard,
  releasePoint,
  swingPoint,
} from './constants'
import { SKEE_MATS } from './materials'
import { useSkeeballPress } from './useSkeeballInput'

type Phase = 'aim' | 'power' | 'swing' | 'flight' | 'result' | 'idle'

type Game = {
  phase: Phase
  aim: number
  power: number
  powerT: number
  swingT: number
  score: number
  lastThrow: number
  balls: number
  overHole: number
  touching: number[]
  heldSince: number
  caught: number
  scored: boolean
  scoredAt: number
  thrownAt: number
  flightUntil: number
  resultUntil: number
  reported: boolean
  needsReset: boolean
}

const RELEASE = releasePoint()
const ZERO = { x: 0, y: 0, z: 0 }
const LEDS = 8
const TRAIL = 9
function ticketsFor(score: number) {
  return Math.max(0, Math.round(score / PAYOUT.skeeball.scoreDivisor))
}

const HUD_CSS = `
.sk { position:absolute; inset:0; pointer-events:none; font-family: Impact, "Arial Black", "Helvetica Neue", Arial, sans-serif; color:#fff6d0; text-transform:uppercase; letter-spacing:0.04em; }
.sk-pills { position:absolute; right:16px; top:16px; display:flex; gap:6px; }
.sk-pill { border-radius:999px; padding:4px 12px; font-size:13px; line-height:1; background:#111; border:2px solid #f2c230; color:#f2c230; box-shadow: 3px 3px 0 #7a1020; }
.sk-pill.on { background:#f2c230; color:#3a0a10; }
.sk-tiles { position:absolute; right:16px; top:52px; display:flex; gap:4px; align-items:flex-end; }
.sk-tile { min-width:30px; height:40px; display:grid; place-items:center; font-size:26px; background:#f2c230; color:#3a0a10; border:3px solid #7a1020; box-shadow: 0 4px 0 #3a0a10; }
.sk-tiles small { font-size:11px; color:#f2c230; margin-right:6px; align-self:center; }
.sk-prompt { position:absolute; left:50%; bottom:36px; transform:translateX(-50%); font-size:22px; white-space:nowrap; text-shadow: 2px 2px 0 #7a1020; }
.sk-over { position:absolute; inset:0; display:grid; place-items:center; }
.sk-card { background:#111; border:4px solid #f2c230; padding:18px 28px; box-shadow: 8px 8px 0 #7a1020; text-align:center; }
.sk-card h2 { margin:0; font-size:28px; }
.sk-sub { margin-top:8px; font-size:18px; text-shadow: 2px 2px 0 #7a1020; }
`

function SkeeballHud({ ball, score, prompt, result }: { ball: number; score: number; prompt: string; result: boolean }) {
  const digits = String(score).split('')
  const tickets = ticketsFor(score)
  return (
    <div className="sk">
      <style>{HUD_CSS}</style>
      <div className="sk-pills">
        <span className="sk-pill on">Skee-Ball</span>
        <span className="sk-pill">
          Ball {ball}/{SKEE.balls}
        </span>
      </div>
      <div className="sk-tiles" aria-label={`${score} points`}>
        <small>Score</small>
        {digits.map((d, i) => (
          <span key={i} className="sk-tile">
            {d}
          </span>
        ))}
      </div>
      {prompt ? <div className="sk-prompt">{prompt}</div> : null}
      {result ? (
        <div className="sk-over">
          <div className="sk-card">
            <h2>{score === 0 ? 'Missed' : 'Round'}</h2>
            <div className="sk-sub">
              {score} pts · +{tickets} Tickets
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function freshGame(): Game {
  return {
    phase: 'idle',
    aim: 0,
    power: 0,
    powerT: 0,
    swingT: 0,
    score: 0,
    lastThrow: 0,
    balls: 0,
    overHole: 0,
    touching: [],
    heldSince: 0,
    caught: 0,
    scored: false,
    scoredAt: 0,
    thrownAt: 0,
    flightUntil: 0,
    resultUntil: 0,
    reported: false,
    needsReset: true,
  }
}

function beginRound(g: Game) {
  g.phase = 'aim'
  g.aim = 0
  g.power = 0
  g.powerT = 0
  g.swingT = 0
  g.score = 0
  g.lastThrow = 0
  g.balls = 0
  g.overHole = 0
  g.touching = []
  g.heldSince = 0
  g.caught = 0
  g.scored = false
  g.scoredAt = 0
  g.reported = false
  g.needsReset = true
}

function holeUnder(px: number, py: number, pz: number) {
  let best = 0
  let bestD = 0.18 * 0.18
  for (const hole of HOLES) {
    const [hx, hy, hz] = onBoard(hole.x, hole.s, 0)
    const d = (px - hx) ** 2 + (py - hy) ** 2 * 0.2 + (pz - hz) ** 2
    if (d < bestD) {
      bestD = d
      best = hole.value
    }
  }
  return best
}

// Where the ball hangs at a given backswing angle; the arm swings in the aimed plane.
function swingAt(phi: number, aim: number) {
  const p = swingPoint(phi)
  const back = p.z - RELEASE.z
  return { x: p.x - back * Math.sin(aim), y: p.y, z: RELEASE.z + back * Math.cos(aim) }
}

type V3 = { x: number; y: number; z: number }
const _p = new Vector3()
const _q = new Quaternion()

// Rapier reads and writes in world space; the game thinks in machine-local metres.
function toWorld(root: Group | null, at: V3, dir = false): V3 {
  _p.set(at.x, at.y, at.z)
  if (!root) return { x: _p.x, y: _p.y, z: _p.z }
  if (dir) _p.applyQuaternion(root.getWorldQuaternion(_q))
  else root.localToWorld(_p)
  return { x: _p.x, y: _p.y, z: _p.z }
}

function toLocal(root: Group | null, at: V3, dir = false): V3 {
  _p.set(at.x, at.y, at.z)
  if (!root) return { x: _p.x, y: _p.y, z: _p.z }
  if (dir) _p.applyQuaternion(root.getWorldQuaternion(_q).invert())
  else root.worldToLocal(_p)
  return { x: _p.x, y: _p.y, z: _p.z }
}

function holdBall(body: RapierRigidBody | null, root: Group | null, at: V3) {
  if (!body) return
  body.setTranslation(toWorld(root, at), true)
  body.setLinvel(ZERO, true)
  body.setAngvel(ZERO, true)
}

function Lane() {
  const segs = laneSegments()
  const { width, thick, slope, run, startZ } = SKEE.lane
  const top = laneTop()
  const end = lip()
  const hump = humpEnd()
  const bTheta = boardTheta()
  const boardLen = Math.hypot(BOARD.run, BOARD.rise)
  const bh = BOARD.thick / 2
  const boardCenter: [number, number, number] = [
    0,
    end.y + BOARD.rise / 2 - Math.cos(bTheta) * bh,
    end.z - BOARD.run / 2 - Math.sin(bTheta) * bh,
  ]
  const railX = width / 2 + 0.03
  const flankX = BOARD.width / 2 + 0.03
  const lane = segs[0]
  const backstop: [number, number, number] = [0, end.y + BOARD.rise + 0.2, end.z - BOARD.run - 0.05]
  const trough: [number, number, number] = [0, missY() - 0.05, (hump.z + end.z) / 2]

  return (
    <group>
      {segs.map((s, i) => (
        <group key={i}>
          <mesh position={s.center} rotation={[s.angle, 0, 0]} material={i === 0 ? SKEE_MATS.wood : SKEE_MATS.woodDark}>
            <boxGeometry args={[width, thick, s.length]} />
          </mesh>
          <RigidBody type="fixed" position={s.center} rotation={[s.angle, 0, 0]} colliders={false}>
            <CuboidCollider args={[width / 2, thick / 2, s.length / 2]} friction={0.5} restitution={0.05} />
          </RigidBody>
          {([-railX, railX] as const).map((x) => (
            <group key={x}>
              <mesh position={[x, s.center[1] + 0.07, s.center[2]]} rotation={[s.angle, 0, 0]} material={SKEE_MATS.woodDark}>
                <boxGeometry args={[0.06, 0.24, s.length]} />
              </mesh>
              <RigidBody type="fixed" position={[x, s.center[1] + 0.07, s.center[2]]} rotation={[s.angle, 0, 0]} colliders={false}>
                <CuboidCollider args={[0.03, 0.12, s.length / 2]} friction={0.2} />
              </RigidBody>
            </group>
          ))}
        </group>
      ))}
      {/* Centre stripe down the lane and a yellow lip on the jump. */}
      <mesh position={[0, lane.center[1] + thick / 2 + 0.004, lane.center[2]]} rotation={[slope, 0, 0]} material={SKEE_MATS.woodStripe}>
        <boxGeometry args={[0.03, 0.006, run * 0.9]} />
      </mesh>
      <mesh position={[0, hump.y - 0.02, hump.z + 0.01]} material={SKEE_MATS.trim}>
        <boxGeometry args={[width, 0.03, 0.03]} />
      </mesh>
      <mesh position={[0, top.y + thick / 2 - 0.02, top.z]} material={SKEE_MATS.woodStripe}>
        <boxGeometry args={[width, 0.012, 0.02]} />
      </mesh>
      {/* Foul line. */}
      <mesh position={[0, SKEE.lane.y0 + 0.004, startZ - 0.03]} rotation={[slope, 0, 0]} material={SKEE_MATS.trim}>
        <boxGeometry args={[width, 0.006, 0.03]} />
      </mesh>

      <mesh position={boardCenter} rotation={[bTheta, 0, 0]} material={SKEE_MATS.board}>
        <boxGeometry args={[BOARD.width, BOARD.thick, boardLen]} />
      </mesh>
      <RigidBody type="fixed" position={boardCenter} rotation={[bTheta, 0, 0]} colliders={false}>
        <CuboidCollider args={[BOARD.width / 2, bh, boardLen / 2]} friction={0.42} restitution={0.05} />
      </RigidBody>
      {([-flankX, flankX] as const).map((x) => (
        <group key={x}>
          <mesh position={[x, end.y + BOARD.rise / 2 + 0.1, end.z - BOARD.run / 2]} rotation={[bTheta, 0, 0]} material={SKEE_MATS.boardFrame}>
            <boxGeometry args={[0.06, 0.5, boardLen]} />
          </mesh>
          <RigidBody type="fixed" position={[x, end.y + BOARD.rise / 2 + 0.1, end.z - BOARD.run / 2]} rotation={[bTheta, 0, 0]} colliders={false}>
            <CuboidCollider args={[0.03, 0.25, boardLen / 2]} friction={0.2} />
          </RigidBody>
        </group>
      ))}

      <mesh position={backstop} material={SKEE_MATS.cabinetDark}>
        <boxGeometry args={[BOARD.width + 0.1, 0.6, 0.08]} />
      </mesh>
      <RigidBody type="fixed" position={backstop} colliders={false}>
        <CuboidCollider args={[BOARD.width / 2 + 0.05, 0.3, 0.04]} friction={0.3} restitution={0.2} />
      </RigidBody>

      {/* Trough under the gap: a short ball drops here and scores nothing. */}
      <mesh position={trough} material={SKEE_MATS.gutter}>
        <boxGeometry args={[BOARD.width, 0.1, 0.8]} />
      </mesh>
      <RigidBody type="fixed" position={trough} colliders={false}>
        <CuboidCollider args={[0.8, 0.05, 0.4]} friction={0.6} />
      </RigidBody>

      <RigidBody type="fixed" position={[0, 0.04, 0]} colliders={false}>
        <CuboidCollider args={[CABINET.width, 0.04, 3.5]} />
      </RigidBody>
    </group>
  )
}

// Power gauge standing on the right deck, tipped back to face the player. Lit from
// the frame loop, not React state.
function PowerLeds({ leds, bars }: { leds: RefObject<Group | null>; bars: RefObject<Group | null> }) {
  const { width, y0, startZ } = SKEE.lane
  const h = LEDS * 0.075 + 0.06
  return (
    <group ref={leds} position={[width / 2 + 0.2, y0 + 0.03, startZ - 0.16]} rotation={[-0.45, -0.15, 0]} visible={false}>
      <mesh position={[0, h / 2, -0.02]} material={SKEE_MATS.cabinetMid}>
        <boxGeometry args={[0.17, h, 0.03]} />
      </mesh>
      <mesh position={[0, h / 2, -0.03]} material={SKEE_MATS.trim}>
        <boxGeometry args={[0.2, h + 0.03, 0.02]} />
      </mesh>
      <group ref={bars}>
        {Array.from({ length: LEDS }, (_, i) => (
          <mesh key={i} position={[0, 0.06 + i * 0.075, 0]} material={SKEE_MATS.ledOff}>
            <boxGeometry args={[0.12, 0.055, 0.012]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// Balls waiting in the return tray on the left deck.
function ReturnBalls({ left }: { left: number }) {
  const { width, y0, startZ } = SKEE.lane
  const x0 = -(width / 2 + 0.14)
  return (
    <group>
      <mesh position={[x0 - 0.08, y0 + 0.02, startZ - 0.28]} material={SKEE_MATS.gutter}>
        <boxGeometry args={[0.3, 0.04, 0.5]} />
      </mesh>
      {Array.from({ length: Math.min(left, 6) }, (_, i) => (
        <mesh
          key={i}
          position={[x0 - (i % 2) * 0.15, y0 + 0.04 + SKEE.ballR, startZ - 0.1 - Math.floor(i / 2) * 0.15]}
          material={SKEE_MATS.ball}
        >
          <sphereGeometry args={[SKEE.ballR, 10, 8]} />
        </mesh>
      ))}
    </group>
  )
}

// Faint dotted arc of the underhand swing. The frame loop yaws it to the aim.
function SwingTrail({ trail }: { trail: RefObject<Group | null> }) {
  return (
    <group ref={trail} position={[RELEASE.x, RELEASE.y, RELEASE.z]} visible={false}>
      {Array.from({ length: TRAIL }, (_, i) => {
        const p = swingPoint((SKEE.swingBack * (i + 0.5)) / TRAIL)
        return (
          <mesh key={i} position={[0, p.y - RELEASE.y, p.z - RELEASE.z]} material={SKEE_MATS.glowDim}>
            <sphereGeometry args={[0.012, 4, 3]} />
          </mesh>
        )
      })}
    </group>
  )
}

export function SkeeballMachine({ position, rotation, active, onRoundEnd }: MachineProps) {
  const ball = useRef<RapierRigidBody>(null)
  const root = useRef<Group>(null)
  const arrow = useRef<Group>(null)
  const leds = useRef<Group>(null)
  const bars = useRef<Group>(null)
  const trail = useRef<Group>(null)
  const game = useRef<Game>(freshGame())
  const onRoundEndRef = useRef(onRoundEnd)
  onRoundEndRef.current = onRoundEnd
  const readPress = useSkeeballPress(active)
  const [hud, setHud] = useState({ phase: 'idle' as Phase, score: 0, ball: 1, last: 0, lit: 0 })

  const onHole = useCallback((value: number, inside: boolean) => {
    const g = game.current
    if (g.phase !== 'flight' || g.scored) return
    if (inside) {
      if (!g.touching.includes(value)) g.touching.push(value)
    } else {
      g.touching = g.touching.filter((v) => v !== value)
    }
  }, [])

  const finishThrow = useCallback((value: number) => {
    const g = game.current
    if (g.phase !== 'flight' || g.scored) return
    g.lastThrow = value
    g.score += value
    g.scored = true
    g.overHole = value
  }, [])

  useEffect(() => {
    if (active) beginRound(game.current)
    else game.current.needsReset = true
  }, [active])

  useFrame((state, delta) => {
    const g = game.current
    const t = state.clock.elapsedTime
    if (g.needsReset || !active) {
      holdBall(ball.current, root.current, RELEASE)
      g.needsReset = false
    }
    if (!active) return

    const press = g.phase === 'flight' || g.phase === 'swing' ? false : readPress()

    if (g.phase === 'aim') {
      g.aim = SKEE.aimAmp * Math.sin(t * SKEE.aimOmega)
      if (press) {
        g.phase = 'power'
        g.powerT = t
      }
    } else if (g.phase === 'power') {
      g.power = 0.5 - 0.5 * Math.cos((t - g.powerT) * SKEE.powerOmega)
      if (press) {
        g.phase = 'swing'
        g.swingT = t
      }
    } else if (g.phase === 'swing') {
      // Underhand: the ball drops through the arc and leaves the hand at the foul line.
      if (t - g.swingT >= SKEE.swingSecs) {
        const body = ball.current
        if (body) {
          const speed = MathUtils.lerp(SKEE.minSpeed, SKEE.maxSpeed, g.power)
          const s = SKEE.lane.slope
          const v = {
            x: speed * Math.sin(g.aim),
            y: speed * Math.sin(s) * Math.cos(g.aim),
            z: -speed * Math.cos(s) * Math.cos(g.aim),
          }
          body.setTranslation(toWorld(root.current, RELEASE), true)
          body.setLinvel(toWorld(root.current, v, true), true)
          // Rolling without slipping: w = (up x v) / r.
          body.setAngvel(toWorld(root.current, { x: v.z / SKEE.ballR, y: 0, z: -v.x / SKEE.ballR }, true), true)
        }
        g.balls += 1
        g.scored = false
        g.lastThrow = 0
        g.overHole = 0
        g.touching = []
        g.heldSince = 0
        g.caught = 0
        g.scoredAt = 0
        g.thrownAt = t
        g.flightUntil = t + SKEE.flightSecs
        g.phase = 'flight'
      }
    } else if (g.phase === 'flight') {
      const body = ball.current
      if (body && !g.scored) {
        const vel = toLocal(root.current, body.linvel(), true)
        const pos = toLocal(root.current, body.translation())
        const speed = Math.hypot(vel.x, vel.y, vel.z)
        const since = t - g.thrownAt
        // Rapier has no rolling resistance; bleed a little speed while on the lane.
        if (pos.z > laneTop().z && vel.z < 0) {
          const k = 1 - SKEE.rollDrag * Math.min(delta, 0.05)
          body.setLinvel(toWorld(root.current, { x: vel.x * k, y: vel.y * k, z: vel.z * k }, true), true)
        }
        const sensed = g.touching.length ? Math.max(...g.touching) : 0
        const pastLip = pos.z < lip().z + 0.02
        // Only rings past the lip count. A bounce on the lane must not lock the 10.
        if (pastLip && sensed && vel.z < -0.15) g.overHole = Math.max(g.overHole, sensed)
        const here = sensed || (pastLip && vel.z > -0.05 && speed < 2.8 ? holeUnder(pos.x, pos.y, pos.z) : 0)
        if (!g.caught && pastLip && vel.z > 0.08 && (g.overHole || here)) {
          g.caught = Math.max(g.overHole, here)
          g.heldSince = t
        }
        if (g.caught) {
          body.setLinvel(ZERO, true)
          body.setAngvel(ZERO, true)
          if (t > g.heldSince + SKEE.grace) finishThrow(g.caught)
        } else if (pos.y < 0.3 || (pos.z < humpEnd().z && pos.y < missY() + 0.08)) finishThrow(g.overHole)
        else if (pos.z > lip().z + 0.6 && vel.z > 0.45 && since > 0.85) finishThrow(g.overHole)
        else if (speed < 0.35 && since > 1) finishThrow(Math.max(g.overHole, here))
      }
      if (g.scored && g.scoredAt === 0) g.scoredAt = t
      const settled = g.scored && t > g.scoredAt + SKEE.afterScore
      const timedOut = t > g.flightUntil
      if (settled || timedOut) {
        if (timedOut && !g.scored) g.lastThrow = 0
        holdBall(ball.current, root.current, RELEASE)
        g.power = 0
        if (g.balls >= SKEE.balls) {
          g.phase = 'result'
          g.resultUntil = t + SKEE.resultSecs
          if (!g.reported) {
            g.reported = true
            onRoundEndRef.current(ticketsFor(g.score))
          }
        } else {
          g.scored = false
          g.overHole = 0
          g.phase = 'aim'
        }
      }
    } else if (g.phase === 'result') {
      if (t > g.resultUntil) g.phase = 'idle'
    } else if (press) {
      beginRound(g)
    }

    // Out of flight the ball rides the arm: hanging at the foul line, backswing with power, then the drop.
    if (g.phase === 'power') holdBall(ball.current, root.current, swingAt(g.power * SKEE.swingBack, g.aim))
    else if (g.phase === 'swing') {
      const u = Math.min(1, (t - g.swingT) / SKEE.swingSecs)
      holdBall(ball.current, root.current, swingAt(g.power * SKEE.swingBack * (1 - u * u), g.aim))
    } else if (g.phase !== 'flight') holdBall(ball.current, root.current, RELEASE)

    if (arrow.current) {
      arrow.current.visible = g.phase === 'aim' || g.phase === 'power'
      arrow.current.rotation.y = -g.aim * SKEE.aimGain
    }
    const winding = g.phase === 'power' || g.phase === 'swing'
    if (trail.current) {
      trail.current.visible = winding
      trail.current.rotation.y = -g.aim
    }
    if (leds.current) leds.current.visible = winding
    bars.current?.children.forEach((bar, i) => {
      ;(bar as Mesh).material = g.power > (i + 0.15) / LEDS ? SKEE_MATS.ledRamp[i] : SKEE_MATS.ledOff
    })

    const ballN = g.phase === 'aim' || g.phase === 'power' || g.phase === 'swing' ? g.balls + 1 : Math.max(1, g.balls)
    const lit = g.scored && g.lastThrow > 0 ? g.lastThrow : 0
    setHud((prev) => {
      if (
        prev.phase === g.phase &&
        prev.score === g.score &&
        prev.ball === ballN &&
        prev.last === g.lastThrow &&
        prev.lit === lit
      ) {
        return prev
      }
      return {
        phase: g.phase,
        score: g.score,
        ball: Math.min(ballN, SKEE.balls),
        last: g.lastThrow,
        lit,
      }
    })
  })

  const prompt =
    hud.phase === 'aim'
      ? 'Space to lock aim'
      : hud.phase === 'power'
        ? 'Space to roll'
        : hud.phase === 'flight'
          ? hud.last > 0
            ? `+${hud.last}`
            : ''
          : hud.phase === 'idle'
            ? 'Space to start'
            : ''
  const left = hud.phase === 'idle' || hud.phase === 'result' ? SKEE.balls : SKEE.balls - hud.ball

  return (
    <group ref={root} position={position} rotation={rotation} name="skeeball">
      <Cabinet />
      <ReturnBalls left={left} />
      <Physics gravity={[0, -SKEE.gravity, 0]} timeStep={1 / 60} paused={!active}>
        <Lane />
        <Board onHole={onHole} lit={hud.lit} />
        <RigidBody
          ref={ball}
          type="dynamic"
          colliders={false}
          position={[RELEASE.x, RELEASE.y, RELEASE.z]}
          ccd
          linearDamping={0.02}
          angularDamping={0.05}
          canSleep={false}
          userData={{ ball: true }}
        >
          <BallCollider args={[SKEE.ballR]} restitution={0.08} friction={0.5} density={3} />
          <mesh material={SKEE_MATS.ball}>
            <sphereGeometry args={[SKEE.ballR, 12, 10]} />
          </mesh>
          <mesh material={SKEE_MATS.ballStripe}>
            <torusGeometry args={[SKEE.ballR * 0.97, 0.012, 4, 14]} />
          </mesh>
        </RigidBody>
      </Physics>

      <SwingTrail trail={trail} />

      <group ref={arrow} position={[RELEASE.x, RELEASE.y - SKEE.ballR + 0.02, RELEASE.z]} rotation={[SKEE.lane.slope, 0, 0]}>
        <mesh position={[0, 0, -0.32]} material={SKEE_MATS.glow}>
          <boxGeometry args={[0.03, 0.012, 0.42]} />
        </mesh>
        <mesh position={[0, 0, -0.58]} rotation={[-Math.PI / 2, 0, 0]} material={SKEE_MATS.glow}>
          <coneGeometry args={[0.06, 0.12, 6]} />
        </mesh>
      </group>

      <PowerLeds leds={leds} bars={bars} />

      {active ? (
        <Html fullscreen style={{ pointerEvents: 'none' }} zIndexRange={[30, 10]}>
          <SkeeballHud ball={hud.ball} score={hud.score} prompt={prompt} result={hud.phase === 'result'} />
        </Html>
      ) : null}
    </group>
  )
}
