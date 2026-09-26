'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Mesh } from 'three'
import { MATERIALS } from '@/world/palette'
import { SKEE } from './constants'
import { SKEE_MATS } from './materials'
import type { SkeePhase } from './skeeballLogic'

/** Written by the controller every frame, read here in useFrame (no React state at 60 Hz).
 *  hitT: clock time (s) the last ball settled; drives the trough-lamp and value-board flash. */
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

// Arrow on the lane at the spawn point: a shaft and two chevron blades, all flat boxes. Drawn at
// aim * SKEE.aim.visualGain: the physical +-4 deg is a few pixels under the dither.
const ARROW_Y = SKEE.laneY + 0.014
const ARROW_LEN = 0.5
const ARROW_W = 0.05
const ARROW_HEAD = 0.18
const ARROW_GAP = SKEE.ball.r + 0.06 // shaft starts this far ahead of the ball centre (arrow-local -z)

// Power meters: a post on each cabinet cheek rail beside the lane, filling upward. The fill stands
// proud of a thin backing slab behind it (a box around it hid the fill completely).
const METER_X = SKEE.lane.w / 2 + SKEE.wallT + SKEE.hood.cheekT / 2
const METER_Z = 1.45
const METER_BASE = SKEE.laneY - 0.1 + SKEE.hood.railH // top of the Cabinet's low side rail
const METER_H = 0.7
const METER_W = 0.1
const METER_BACK_T = 0.02

// Ball lamps on the player face of the lane's end stop, above the control ledge.
const LAMP_Z = SKEE.lane.zStart + 0.06 + 0.012
const LAMP_Y = SKEE.laneY + 0.2
const LAMP_STEP = 0.11
const LAMP_SIZE = 0.07

// Score digits in the marquee's dark strip on the hood lintel, and the value board (one numeral per
// trough value, lit on a hit) on the lintel face below the marquee. The 10/20 rows are hidden behind
// the crest from the dock, so the board is how every result reads.
const HOOD_FRONT = SKEE.ramp.zStart - SKEE.hood.setback
const SCORE_Y = SKEE.hood.marqueeY
const SCORE_Z = HOOD_FRONT + SKEE.hood.stripZ + 0.008
const BOARD_Y = SKEE.hood.boardY
const BOARD_Z = HOOD_FRONT + SKEE.hood.lintelT + 0.002
const BOARD_GAP = 0.1 // between numerals
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
const numeralW = (text: string) => text.length * DIGIT_W + (text.length - 1) * DIGIT_GAP

/** Distinct trough values, low to high, each with its x on the board. */
const BOARD = (() => {
  const values = [...new Set(SKEE.troughs.map((t) => t.value))].sort((a, b) => a - b)
  const widths = values.map((v) => numeralW(String(v)))
  const total = widths.reduce((a, w) => a + w, 0) + (values.length - 1) * BOARD_GAP
  let x = -total / 2
  return values.map((value, i) => {
    const cx = x + widths[i]! / 2
    x += widths[i]! + BOARD_GAP
    return { value, x: cx }
  })
})()

export function Indicators({ pose, lampRoot }: Props) {
  const arrow = useRef<Group>(null!)
  const fills = useRef<(Mesh | null)[]>([])
  const tips = useRef<(Mesh | null)[]>([])
  const meters = useRef<(Group | null)[]>([])
  const ballLamps = useRef<(Mesh | null)[]>([])
  const segs = useRef<(Mesh | null)[]>([]) // DIGITS * 7, index d * 7 + s
  const board = useRef<(Group | null)[]>([]) // one group of segment meshes per BOARD entry
  const troughLamps = useRef<(Mesh | null)[]>([])
  const lampsFound = useRef(false)
  const values = useMemo(() => SKEE.troughs.map((t) => t.value), [])

  useFrame((three) => {
    const p = pose.current
    if (!p) return
    const now = three.clock.elapsedTime

    // aim arrow: local -z rotated about y so it points along (sin aim, 0, -cos aim), exaggerated
    arrow.current.visible = AIM_PHASES.has(p.phase)
    arrow.current.rotation.y = -p.aim * SKEE.aim.visualGain

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

    // score digits: the ball's value blinks there for the hit display (a miss shows 0), the running
    // score otherwise; the Round result blinks too
    const hit = p.phase === 'hit' ? p.lastHit : null
    const blink = p.phase === 'result' || hit !== null ? Math.floor(now * 4) % 2 === 0 : true
    let n = Math.min(Math.max(0, Math.round(hit ?? p.score)), 10 ** DIGITS - 1)
    for (let d = DIGITS - 1; d >= 0; d--) {
      const digit = n % 10
      n = Math.floor(n / 10)
      const leading = d < DIGITS - 1 && digit === 0 && n === 0 // blank leading zeros, keep the ones digit
      for (let s = 0; s < 7; s++) {
        const m = segs.current[d * 7 + s]
        if (m) m.visible = blink && !leading && segOn(digit, s) === 1
      }
    }

    // trough lamp and value-board flash on the value just hit (both 100 pockets share a value)
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
    for (let i = 0; i < BOARD.length; i++) {
      const g = board.current[i]
      if (!g) continue
      const mat = on && BOARD[i]!.value === p.lastHit ? SKEE_MATS.ringGlow : SKEE_MATS.ringDim
      for (const c of g.children) (c as Mesh).material = mat
    }
  })

  const scoreW = numeralW('0'.repeat(DIGITS))

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

      {/* power meters on both cheek rails: backing slab behind, fill and tip proud of it */}
      {[-1, 1].map((s, i) => (
        <group
          key={s}
          ref={(g) => {
            meters.current[i] = g
          }}
          visible={false}
        >
          <mesh position={[s * METER_X, METER_BASE + METER_H / 2, METER_Z - METER_W / 2 - METER_BACK_T / 2]} material={MATERIALS.void}>
            <boxGeometry args={[METER_W + 0.08, METER_H + 0.06, METER_BACK_T]} />
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

      {/* value board on the lintel: every trough value, dim until that value is hit */}
      {BOARD.map(({ value, x }, i) => {
        const text = String(value)
        const w = numeralW(text)
        return (
          <group
            key={value}
            ref={(g) => {
              board.current[i] = g
            }}
            position={[x, BOARD_Y, BOARD_Z]}
          >
            {text.split('').flatMap((ch, d) => {
              const dx = -w / 2 + DIGIT_W / 2 + d * (DIGIT_W + DIGIT_GAP)
              const digit = Number(ch)
              return SEGS.map(([sx, sy, sw, sh], s) =>
                segOn(digit, s) === 1 ? (
                  <mesh
                    key={`${d}-${s}`}
                    position={[dx + sx * DIGIT_W, (sy * DIGIT_H) / 2, DIGIT_T / 2]}
                    material={SKEE_MATS.ringDim}
                  >
                    <boxGeometry args={[sw * DIGIT_W, (sh * DIGIT_H) / 2, DIGIT_T]} />
                  </mesh>
                ) : null,
              )
            })}
          </group>
        )
      })}
    </group>
  )
}
