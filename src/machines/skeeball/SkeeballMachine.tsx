'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
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
import { usePrompt } from '@/machines/prompt'
import { useDisplay } from '@/world/Display'
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

const FOOTER = `${SKEE.balls} BALLS / ${PAYOUT.skeeball.scoreDivisor} PTS A TICKET`

// One prompt string per phase for the Shell (issue 12): the real key and the verb. Space (or Enter)
// and a click both press, so the prompt names both. Flight and result take no input.
function promptFor(active: boolean, phase: Phase): string {
  if (!active) return ''
  if (phase === 'idle') return 'Space or click: start'
  if (phase === 'aim') return 'Space or click: lock aim'
  if (phase === 'power') return 'Space or click: throw'
  return ''
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

export function SkeeballMachine({ position, rotation, active, onRoundEnd, onPrompt }: MachineProps) {
  const ball = useRef<RapierRigidBody>(null)
  const arrow = useRef<Group>(null)
  const game = useRef<Game>(freshGame())
  const onRoundEndRef = useRef(onRoundEnd)
  onRoundEndRef.current = onRoundEnd
  const readPress = useSkeeballPress(active)
  const display = useDisplay({ accent: 'skeeball', title: 'SKEEBALL' })
  // React-driven parts only: the lit ring on the Board and the power LEDs. Numbers go to the Display.
  const [hud, setHud] = useState({ phase: 'idle' as Phase, lit: 0, power: 0 })

  const sendPrompt = usePrompt(onPrompt)

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
    if (!active) {
      display.show({ headline: 'STEP RIGHT UP!', footer: FOOTER })
      sendPrompt('')
      return
    }

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

    const ballN = Math.min(g.phase === 'aim' || g.phase === 'power' ? g.balls + 1 : Math.max(1, g.balls), SKEE.balls)
    const lit = g.scored && g.lastThrow > 0 ? g.lastThrow : 0
    setHud((prev) => {
      if (prev.phase === g.phase && prev.lit === lit && Math.abs(prev.power - g.power) < 0.04) return prev
      return { phase: g.phase, lit, power: g.power }
    })

    // Balls left and score live on the Display (ADR 0001); the result shows the Tickets paid.
    if (g.phase === 'idle') display.show({ headline: 'SPACE TO START', footer: FOOTER })
    else if (g.phase === 'result') display.show({ headline: `+${ticketsFor(g.score)} TICKETS`, sub: `SCORE ${g.score}`, footer: g.score === 0 ? 'MISSED' : FOOTER })
    else display.show({ headline: `BALL ${ballN} / ${SKEE.balls}`, sub: `SCORE ${g.score}`, footer: g.phase === 'flight' ? (g.scored && g.lastThrow > 0 ? `+${g.lastThrow}` : 'IN THE AIR') : FOOTER })
    sendPrompt(promptFor(active, g.phase))
  })

  return (
    <group position={position} rotation={rotation} name="skeeball">
      <Cabinet display={display} />
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
    </group>
  )
}
