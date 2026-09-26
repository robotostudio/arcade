'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Mesh } from 'three'
import { MATERIALS } from '@/world/palette'
import { SKEE } from './constants'
import { SKEE_MATS } from './materials'
import type { SkeePhase } from './skeeballLogic'

/** Written by the controller every frame, read here in useFrame (no React state at 60 Hz).
 *  hitT: clock time (s) the last ball settled; drives the trough-lamp flash. */
export type SkeePose = {
  phase: SkeePhase
  aim: number // radians, + is toward +x
  power: number // 0..1
  lastHit: number | null
  score: number
  ballsLeft: number
  hitT: number
}

type Props = {
  pose: React.RefObject<SkeePose>
  /** Root the Lane lives under, so the trough lamps can be found by name ('lamp-<i>'). */
  lampRoot: React.RefObject<Group | null>
}

const AIM_PHASES = new Set<SkeePhase>(['aiming', 'powering'])
const METER_PHASES = new Set<SkeePhase>(['powering', 'rolling'])

// Arrow on the lane at the spawn point: a shaft and two chevron blades, all flat boxes.
const ARROW_Y = SKEE.laneY + 0.014
const ARROW_LEN = 0.5
const ARROW_W = 0.05
const ARROW_HEAD = 0.18
const ARROW_GAP = SKEE.ball.r + 0.06 // shaft starts this far ahead of the ball centre (arrow-local -z)

// Power meters: a post on each cabinet cheek rail beside the lane, filling upward.
const CHEEK_T = 0.12 // matches Cabinet
const METER_X = SKEE.lane.w / 2 + SKEE.wallT + CHEEK_T / 2
const METER_Z = 1.45
const METER_BASE = SKEE.laneY - 0.1 + 0.25 // top of the Cabinet's low side rail
const METER_H = 0.7
const METER_W = 0.1

// Ball lamps on the player face of the lane's end stop, above the control ledge.
const LAMP_Z = SKEE.lane.zStart + 0.06 + 0.012
const LAMP_Y = SKEE.laneY + 0.2
const LAMP_STEP = 0.11
const LAMP_SIZE = 0.07

// Score digits in the marquee's dark strip on the hood lintel (Cabinet: y h-0.45, z hoodFront+0.135).
const SCORE_Y = SKEE.cabinet.h - 0.45
const SCORE_Z = SKEE.ramp.zStart - 0.4 + 0.135 + 0.008
const DIGITS = 3
const DIGIT_H = 0.12
const DIGIT_W = DIGIT_H / 2
const DIGIT_GAP = 0.03
const DIGIT_T = 0.01
const SEG_T = 0.28
// 7-segment layout, digit-local units (1 wide, 2 tall, centred): [cx, cy, w, h]
const SEGS: [number, number, number, number][] = [
  [0, 1 - SEG_T / 2, 1, SEG_T], // a
  [0.5 - SEG_T / 2, 0.5, SEG_T, 1], // b
  [0.5 - SEG_T / 2, -0.5, SEG_T, 1], // c
  [0, -1 + SEG_T / 2, 1, SEG_T], // d
  [-0.5 + SEG_T / 2, -0.5, SEG_T, 1], // e
  [-0.5 + SEG_T / 2, 0.5, SEG_T, 1], // f
  [0, 0, 1, SEG_T], // g
]
const DIGIT_MASK = [0b1111110, 0b0110000, 0b1101101, 0b1111001, 0b0110011, 0b1011011, 0b1011111, 0b1110000, 0b1111111, 0b1111011]
const segOn = (digit: number, seg: number) => (DIGIT_MASK[digit]! >> (6 - seg)) & 1

export function Indicators({ pose, lampRoot }: Props) {
  const arrow = useRef<Group>(null!)
  const fills = useRef<(Mesh | null)[]>([])
  const tips = useRef<(Mesh | null)[]>([])
  const meters = useRef<(Group | null)[]>([])
  const ballLamps = useRef<(Mesh | null)[]>([])
  const segs = useRef<(Mesh | null)[]>([]) // DIGITS * 7, index d * 7 + s
  const troughLamps = useRef<(Mesh | null)[]>([])
  const lampsFound = useRef(false)
  const values = useMemo(() => SKEE.troughs.map((t) => t.value), [])

  useFrame((three) => {
    const p = pose.current
    if (!p) return
    const now = three.clock.elapsedTime

    // aim arrow: local -z rotated about y so it points along (sin aim, 0, -cos aim)
    arrow.current.visible = AIM_PHASES.has(p.phase)
    arrow.current.rotation.y = -p.aim

    // power meters
    const showMeter = METER_PHASES.has(p.phase)
    const level = Math.max(0.02, p.power)
    for (let i = 0; i < 2; i++) {
      const m = meters.current[i]
      const f = fills.current[i]
      const t = tips.current[i]
      if (!m || !f || !t) continue
      m.visible = showMeter
      f.scale.y = level
      f.position.y = METER_BASE + (METER_H * level) / 2
      t.position.y = METER_BASE + METER_H * level + 0.015
    }

    // ball lamps: one lit per ball still to fire
    for (let i = 0; i < SKEE.balls; i++) {
      const l = ballLamps.current[i]
      if (l) l.material = i < p.ballsLeft ? SKEE_MATS.ringGlow : SKEE_MATS.lip
    }

    // score digits; blink while the Round result shows
    const blink = p.phase === 'result' ? Math.floor(now * 4) % 2 === 0 : true
    let n = Math.min(Math.max(0, Math.round(p.score)), 10 ** DIGITS - 1)
    for (let d = DIGITS - 1; d >= 0; d--) {
      const digit = n % 10
      n = Math.floor(n / 10)
      const leading = d < DIGITS - 1 && digit === 0 && n === 0 // blank leading zeros, keep the ones digit
      for (let s = 0; s < 7; s++) {
        const m = segs.current[d * 7 + s]
        if (m) m.visible = blink && !leading && segOn(digit, s) === 1
      }
    }

    // trough lamp flash on the row just hit (both 100 pockets share a value; both flash)
    if (!lampsFound.current && lampRoot.current) {
      let all = true
      for (let i = 0; i < values.length; i++) {
        const o = lampRoot.current.getObjectByName(`lamp-${i}`)
        if (o instanceof Mesh) troughLamps.current[i] = o
        else all = false
      }
      lampsFound.current = all
    }
    const flashing = p.lastHit !== null && p.lastHit > 0 && now - p.hitT < SKEE.hitTime
    const on = flashing && Math.floor(now * 10) % 2 === 0
    for (let i = 0; i < values.length; i++) {
      const l = troughLamps.current[i]
      if (l) l.material = on && values[i] === p.lastHit ? SKEE_MATS.ringGlow : SKEE_MATS.ringDim
    }
  })

  const scoreW = DIGITS * DIGIT_W + (DIGITS - 1) * DIGIT_GAP

  return (
    <group>
      {/* aim arrow, pivot at the spawn point */}
      <group ref={arrow} position={[SKEE.ball.spawn[0], ARROW_Y, SKEE.ball.spawn[2]]}>
        <mesh position={[0, 0, -(ARROW_GAP + ARROW_LEN / 2)]} material={SKEE_MATS.arrow}>
          <boxGeometry args={[ARROW_W, 0.012, ARROW_LEN]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            position={[s * ARROW_HEAD * 0.32, 0, -(ARROW_GAP + ARROW_LEN) + ARROW_HEAD * 0.32]}
            rotation={[0, s * 0.75, 0]}
            material={SKEE_MATS.arrow}
          >
            <boxGeometry args={[ARROW_W, 0.012, ARROW_HEAD]} />
          </mesh>
        ))}
      </group>

      {/* power meters on both cheek rails */}
      {[-1, 1].map((s, i) => (
        <group
          key={s}
          ref={(g) => {
            meters.current[i] = g
          }}
          visible={false}
        >
          <mesh position={[s * METER_X, METER_BASE + METER_H / 2, METER_Z]} material={MATERIALS.void}>
            <boxGeometry args={[METER_W + 0.04, METER_H + 0.04, METER_W + 0.04]} />
          </mesh>
          <mesh
            ref={(m) => {
              fills.current[i] = m
            }}
            position={[s * METER_X, METER_BASE + 0.01, METER_Z]}
            scale={[1, 0.02, 1]}
            material={SKEE_MATS.meter}
          >
            <boxGeometry args={[METER_W, METER_H, METER_W]} />
          </mesh>
          <mesh
            ref={(m) => {
              tips.current[i] = m
            }}
            position={[s * METER_X, METER_BASE + 0.03, METER_Z]}
            material={SKEE_MATS.ringGlow}
          >
            <boxGeometry args={[METER_W + 0.06, 0.03, METER_W + 0.06]} />
          </mesh>
        </group>
      ))}

      {/* ball lamps: balls left to fire */}
      {Array.from({ length: SKEE.balls }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            ballLamps.current[i] = m
          }}
          position={[(i - (SKEE.balls - 1) / 2) * LAMP_STEP, LAMP_Y, LAMP_Z]}
          material={SKEE_MATS.lip}
        >
          <boxGeometry args={[LAMP_SIZE, LAMP_SIZE, 0.024]} />
        </mesh>
      ))}

      {/* running score in the marquee strip */}
      <group position={[0, SCORE_Y, SCORE_Z]}>
        {Array.from({ length: DIGITS }, (_, d) => {
          const dx = -scoreW / 2 + DIGIT_W / 2 + d * (DIGIT_W + DIGIT_GAP)
          return SEGS.map(([sx, sy, sw, sh], s) => (
            <mesh
              key={`${d}-${s}`}
              ref={(m) => {
                segs.current[d * 7 + s] = m
              }}
              position={[dx + sx * DIGIT_W, (sy * DIGIT_H) / 2, DIGIT_T / 2]}
              material={SKEE_MATS.ringGlow}
            >
              <boxGeometry args={[sw * DIGIT_W, (sh * DIGIT_H) / 2, DIGIT_T]} />
            </mesh>
          ))
        })}
      </group>
    </group>
  )
}
