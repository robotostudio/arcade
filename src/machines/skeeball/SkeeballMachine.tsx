'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import {
  CoefficientCombineRule,
  CuboidCollider,
  Physics,
  RigidBody,
  type RapierRigidBody,
} from '@react-three/rapier'
import { MathUtils, Vector3, type Group } from 'three'
import { PAYOUT } from '@/arcade/economy'
import { sfx } from '@/arcade/sfx'
import type { MachineProps } from '@/machines/types'
import { Board } from './Board'
import { Cabinet } from './Cabinet'
import {
  BOARD,
  HOLES,
  SKEE,
  ballSpawn,
  boardTheta,
  lip,
  onBoard,
  rampCenter,
  rampLength,
  rampTheta,
} from './constants'
import { SKEE_MATS } from './materials'
import { useSkeeballPress } from './useSkeeballInput'

type Phase = 'aim' | 'power' | 'flight' | 'result' | 'idle'

type Game = {
  phase: Phase
  aim: number
  power: number
  powerT: number
  score: number
  lastThrow: number
  balls: number
  overHole: number
  touching: number[]
  heldSince: number
  caught: number
  scored: boolean
  scoredAt: number
  flightUntil: number
  resultUntil: number
  reported: boolean
  needsReset: boolean
}

const SPAWN = ballSpawn()
const ZERO = { x: 0, y: 0, z: 0 }
const _dir = new Vector3()
const LEDS = 8

function ticketsFor(score: number) {
  return Math.max(0, Math.round(score / PAYOUT.skeeball.scoreDivisor))
}

const HUD_CSS = `
.sk { position:absolute; inset:0; pointer-events:none; font-family: Impact, "Arial Black", "Helvetica Neue", Arial, sans-serif; color:#fff6d0; text-transform:uppercase; letter-spacing:0.04em; }
.sk-pills { position:absolute; right:72px; top:16px; display:flex; gap:6px; }
.sk-pill { border-radius:999px; padding:4px 12px; font-size:13px; line-height:1; background:#111; border:2px solid #f2c230; color:#f2c230; box-shadow: 3px 3px 0 #7a1020; }
.sk-pill.on { background:#f2c230; color:#3a0a10; }
.sk-tiles { position:absolute; right:72px; top:52px; display:flex; gap:4px; align-items:flex-end; }
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
    score: 0,
    lastThrow: 0,
    balls: 0,
    overHole: 0,
    touching: [],
    heldSince: 0,
    caught: 0,
    scored: false,
    scoredAt: 0,
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

function resetBall(body: RapierRigidBody | null) {
  if (!body) return
  body.setTranslation(SPAWN, true)
  body.setLinvel(ZERO, true)
  body.setAngvel(ZERO, true)
}

function Lane() {
  const center = rampCenter()
  const theta = rampTheta()
  const length = rampLength()
  const { width, thick, startZ, run } = SKEE.ramp
  const end = lip()
  const bTheta = boardTheta()
  const boardLen = Math.hypot(BOARD.run, BOARD.rise)
  const bh = BOARD.thick / 2
  const boardCenter: [number, number, number] = [
    0,
    end.y + BOARD.rise / 2 - Math.cos(bTheta) * bh,
    end.z - BOARD.run / 2 - Math.sin(bTheta) * bh,
  ]
  const railX = width / 2 + 0.045

  return (
    <group>
      <mesh position={center} rotation={[theta, 0, 0]} material={SKEE_MATS.wood}>
        <boxGeometry args={[width, thick, length]} />
      </mesh>
      <mesh position={[0, center[1] + 0.038, center[2]]} rotation={[theta, 0, 0]} material={SKEE_MATS.woodStripe}>
        <boxGeometry args={[0.03, 0.01, length * 0.86]} />
      </mesh>
      <RigidBody type="fixed" position={center} rotation={[theta, 0, 0]} colliders={false}>
        <CuboidCollider
          args={[width / 2, thick / 2, length / 2]}
          friction={0.08}
          frictionCombineRule={CoefficientCombineRule.Min}
          restitution={0.05}
        />
      </RigidBody>

      <mesh position={boardCenter} rotation={[bTheta, 0, 0]} material={SKEE_MATS.board}>
        <boxGeometry args={[BOARD.width, BOARD.thick, boardLen]} />
      </mesh>
      <RigidBody type="fixed" position={boardCenter} rotation={[bTheta, 0, 0]} colliders={false}>
        <CuboidCollider args={[BOARD.width / 2, bh, boardLen / 2]} friction={0.42} restitution={0.05} />
      </RigidBody>

      <mesh position={[0, end.y + 0.03, end.z]} material={SKEE_MATS.woodDark}>
        <boxGeometry args={[width + 0.05, 0.05, 0.07]} />
      </mesh>
      <RigidBody type="fixed" position={[0, end.y + 0.03, end.z]} colliders={false}>
        <CuboidCollider args={[(width + 0.05) / 2, 0.025, 0.032]} friction={0.15} restitution={0.42} />
      </RigidBody>

      {([-railX, railX] as const).map((x) => (
        <group key={x}>
          <mesh position={[x, center[1] + 0.07, (startZ + end.z) / 2]} rotation={[theta, 0, 0]} material={SKEE_MATS.woodDark}>
            <boxGeometry args={[0.045, 0.14, length]} />
          </mesh>
          <RigidBody
            type="fixed"
            position={[x, center[1] + 0.07, (startZ + end.z) / 2]}
            rotation={[theta, 0, 0]}
            colliders={false}
          >
            <CuboidCollider args={[0.022, 0.07, length / 2]} friction={0.2} />
          </RigidBody>
          <mesh position={[x + Math.sign(x) * 0.11, 0.48, (startZ + end.z) / 2]} material={SKEE_MATS.gutter}>
            <boxGeometry args={[0.14, 0.08, length + 0.15]} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, end.y + BOARD.rise + 0.16, end.z - BOARD.run - 0.04]} material={SKEE_MATS.cabinetDark}>
        <boxGeometry args={[BOARD.width + 0.1, 0.4, 0.07]} />
      </mesh>
      <RigidBody type="fixed" position={[0, end.y + BOARD.rise + 0.16, end.z - BOARD.run - 0.04]} colliders={false}>
        <CuboidCollider args={[(BOARD.width + 0.1) / 2, 0.2, 0.035]} restitution={0.2} />
      </RigidBody>

      <RigidBody type="fixed" position={[0, 0.04, 0]} colliders={false}>
        <CuboidCollider args={[1.6, 0.04, 2.8]} />
      </RigidBody>
    </group>
  )
}

function PowerLeds({ power, show }: { power: number; show: boolean }) {
  if (!show) return null
  return (
    <group position={[0.42, 0.68, 1.02]}>
      {Array.from({ length: LEDS }, (_, i) => {
        const on = show && power > (i + 0.15) / LEDS
        return (
          <mesh key={i} position={[0, i * 0.08, 0]} material={on ? SKEE_MATS.ledOn : SKEE_MATS.ledOff}>
            <sphereGeometry args={[0.034, 8, 6]} />
          </mesh>
        )
      })}
    </group>
  )
}

function ReturnBalls() {
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-0.34 + (i % 3) * 0.08, 0.58, SKEE.ramp.startZ - 0.22 - Math.floor(i / 3) * 0.09]} material={SKEE_MATS.ball}>
          <sphereGeometry args={[0.035, 8, 6]} />
        </mesh>
      ))}
    </group>
  )
}

export function SkeeballMachine({ position, rotation, active, onRoundEnd }: MachineProps) {
  const ball = useRef<RapierRigidBody>(null)
  const arrow = useRef<Group>(null)
  const game = useRef<Game>(freshGame())
  const onRoundEndRef = useRef(onRoundEnd)
  onRoundEndRef.current = onRoundEnd
  const readPress = useSkeeballPress(active)
  const [hud, setHud] = useState({ phase: 'idle' as Phase, score: 0, ball: 1, last: 0, lit: 0, power: 0 })

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
    // Higher rings ring higher: 10 → level 1, 100 → level 10.
    if (value > 0) sfx.hit(value / 10)
    else sfx.miss()
  }, [])

  useEffect(() => {
    if (active) beginRound(game.current)
    else game.current.needsReset = true
  }, [active])

  useFrame((state) => {
    const g = game.current
    const t = state.clock.elapsedTime
    if (g.needsReset || !active) {
      resetBall(ball.current)
      g.needsReset = false
    }
    if (!active) return

    const press = g.phase === 'flight' ? false : readPress()

    if (g.phase === 'aim') {
      g.aim = SKEE.aimAmp * Math.sin(t * SKEE.aimOmega)
      if (press) {
        sfx.click()
        g.phase = 'power'
        g.powerT = t
      }
    } else if (g.phase === 'power') {
      g.power = 0.5 - 0.5 * Math.cos((t - g.powerT) * SKEE.powerOmega)
      if (press) {
        const body = ball.current
        if (body) {
          const speed = MathUtils.lerp(SKEE.minSpeed, SKEE.maxSpeed, g.power)
          const theta = rampTheta()
          const hop = 0.85 + g.power * 0.9
          _dir.set(Math.sin(g.aim), Math.sin(theta), -Math.cos(theta) * Math.cos(g.aim)).normalize().multiplyScalar(speed)
          body.setLinvel({ x: _dir.x, y: _dir.y + hop, z: _dir.z }, true)
          body.setAngvel(ZERO, true)
        }
        sfx.launch()
        g.balls += 1
        g.scored = false
        g.lastThrow = 0
        g.overHole = 0
        g.touching = []
        g.heldSince = 0
        g.caught = 0
        g.scoredAt = 0
        g.flightUntil = t + SKEE.flightSecs
        g.phase = 'flight'
      }
    } else if (g.phase === 'flight') {
      const body = ball.current
      if (body && !g.scored) {
        const vel = body.linvel()
        const pos = body.translation()
        const speed = Math.hypot(vel.x, vel.y, vel.z)
        const sensed = g.touching.length ? Math.max(...g.touching) : 0
        const pastLip = pos.z < lip().z + 0.02
        // Only rings past the lip count. A bounce on the ramp must not lock the 10.
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
        } else if (pos.y < 0.34) finishThrow(g.overHole)
        else if (pos.z > lip().z + 0.55 && vel.z > 0.45 && t > g.flightUntil - SKEE.flightSecs + 0.85) finishThrow(g.overHole)
        else if (speed < 0.35 && t > g.flightUntil - SKEE.flightSecs + 1) finishThrow(Math.max(g.overHole, here))
      }
      if (g.scored && g.scoredAt === 0) g.scoredAt = t
      const settled = g.scored && t > g.scoredAt + SKEE.afterScore
      const timedOut = t > g.flightUntil
      if (settled || timedOut) {
        if (timedOut && !g.scored) { g.lastThrow = 0; sfx.miss() }
        resetBall(ball.current)
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
      sfx.start()
      beginRound(g)
    }

    if (g.phase !== 'flight') resetBall(ball.current)

    if (arrow.current) {
      arrow.current.visible = g.phase === 'aim'
      arrow.current.rotation.y = g.aim
    }

    const ballN = g.phase === 'aim' || g.phase === 'power' ? g.balls + 1 : Math.max(1, g.balls)
    const lit = g.scored && g.lastThrow > 0 ? g.lastThrow : 0
    setHud((prev) => {
      if (
        prev.phase === g.phase &&
        prev.score === g.score &&
        prev.ball === ballN &&
        prev.last === g.lastThrow &&
        prev.lit === lit &&
        Math.abs(prev.power - g.power) < 0.04
      ) {
        return prev
      }
      return {
        phase: g.phase,
        score: g.score,
        ball: Math.min(ballN, SKEE.balls),
        last: g.lastThrow,
        lit,
        power: g.power,
      }
    })
  })

  const prompt =
    hud.phase === 'aim'
      ? 'Space to lock aim'
      : hud.phase === 'power'
        ? 'Space to throw'
        : hud.phase === 'flight'
          ? hud.last > 0
            ? `+${hud.last}`
            : 'In the air'
          : hud.phase === 'idle'
            ? 'Space to start'
            : ''

  return (
    <group position={position} rotation={rotation} name="skeeball">
      <Cabinet />
      <ReturnBalls />
      <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60} paused={!active}>
        <Lane />
        <Board onHole={onHole} lit={hud.lit} />
        <RigidBody
          ref={ball}
          type="dynamic"
          colliders="ball"
          position={[SPAWN.x, SPAWN.y, SPAWN.z]}
          ccd
          restitution={0.22}
          friction={0.35}
          linearDamping={0.05}
          angularDamping={0.12}
          canSleep={false}
          userData={{ ball: true }}
        >
          <mesh material={SKEE_MATS.ball}>
            <sphereGeometry args={[SKEE.ballR, 10, 8]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={SKEE_MATS.ballStripe}>
            <torusGeometry args={[SKEE.ballR * 0.9, 0.012, 4, 10]} />
          </mesh>
        </RigidBody>
      </Physics>

      <group ref={arrow} position={[SPAWN.x, SPAWN.y + 0.02, SPAWN.z]}>
        <mesh position={[0, 0.01, -0.22]} material={SKEE_MATS.glow}>
          <boxGeometry args={[0.028, 0.012, 0.32]} />
        </mesh>
        <mesh position={[0, 0.01, -0.42]} rotation={[-Math.PI / 2, 0, 0]} material={SKEE_MATS.glow}>
          <coneGeometry args={[0.045, 0.1, 6]} />
        </mesh>
      </group>

      <PowerLeds power={hud.power} show={hud.phase === 'power'} />

      {active ? (
        <Html fullscreen style={{ pointerEvents: 'none' }} zIndexRange={[30, 10]}>
          <SkeeballHud ball={hud.ball} score={hud.score} prompt={prompt} result={hud.phase === 'result'} />
        </Html>
      ) : null}
    </group>
  )
}
