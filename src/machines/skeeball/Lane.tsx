'use client'

import { useMemo } from 'react'
import {
  CoefficientCombineRule,
  CuboidCollider,
  RigidBody,
  type IntersectionEnterPayload,
  type IntersectionExitPayload,
} from '@react-three/rapier'
import type { MeshLambertMaterial } from 'three'
import { SKEE } from './constants'
import { laneSolids, laneSensors, lipY, LIP_T, type Box, type SolidKind } from './geometry'
import { SKEE_MATS } from './materials'

// Lane, ramp and target well: one fixed body of cuboid colliders (from geometry.ts) plus a visible
// mesh per collider built from the same box, so visuals and physics cannot drift apart.
// Trough lamps are named `lamp-<index>` (index into SKEE.troughs); the machine may find one with
// group.getObjectByName('lamp-3') and swap its material to SKEE_MATS.ringGlow to flash it.

const MAT_FOR: Record<SolidKind, MeshLambertMaterial> = {
  lane: SKEE_MATS.lane,
  ramp: SKEE_MATS.ramp,
  wall: SKEE_MATS.wall,
  shelf: SKEE_MATS.trough,
  lip: SKEE_MATS.lip,
  riser: SKEE_MATS.trough,
  divider: SKEE_MATS.divider,
  backWall: SKEE_MATS.wall,
  floor: SKEE_MATS.trough,
  endStop: SKEE_MATS.wall,
}

// 7-segment digit layout: segments a..g as [cx, cy, w, h] in digit-local units where the digit is
// 1 wide and 2 tall, centred on 0. Under dither only chunky bars read, so segments are fat.
const SEG_T = 0.28
const SEGS: Record<string, [number, number, number, number]> = {
  a: [0, 1 - SEG_T / 2, 1, SEG_T],
  b: [0.5 - SEG_T / 2, 0.5, SEG_T, 1],
  c: [0.5 - SEG_T / 2, -0.5, SEG_T, 1],
  d: [0, -1 + SEG_T / 2, 1, SEG_T],
  e: [-0.5 + SEG_T / 2, -0.5, SEG_T, 1],
  f: [-0.5 + SEG_T / 2, 0.5, SEG_T, 1],
  g: [0, 0, 1, SEG_T],
}
const DIGIT_SEGS: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgedc',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
}

const DIGIT_H = 0.13 // digit height on the riser plates (risers are 0.2 tall)
const DIGIT_W = DIGIT_H / 2
const DIGIT_GAP = 0.025
const PLATE_PAD = 0.02
const PLATE_T = 0.012 // plate proud of the riser face
const DIGIT_T = 0.01 // digits proud of the plate

function NumberPlate({ value, position }: { value: number; position: [number, number, number] }) {
  const text = String(value)
  const totalW = text.length * DIGIT_W + (text.length - 1) * DIGIT_GAP
  const [px, py, pz] = position
  return (
    <group position={[px, py, pz]}>
      <mesh position={[0, 0, PLATE_T / 2]} material={SKEE_MATS.plateFrame}>
        <boxGeometry args={[totalW + PLATE_PAD * 3, DIGIT_H + PLATE_PAD * 3, PLATE_T]} />
      </mesh>
      <mesh position={[0, 0, PLATE_T + 0.002]} material={SKEE_MATS.plate}>
        <boxGeometry args={[totalW + PLATE_PAD * 2, DIGIT_H + PLATE_PAD * 2, 0.004]} />
      </mesh>
      {text.split('').map((ch, i) => {
        const dx = -totalW / 2 + DIGIT_W / 2 + i * (DIGIT_W + DIGIT_GAP)
        return (DIGIT_SEGS[ch] ?? '').split('').map((s) => {
          const [sx, sy, sw, sh] = SEGS[s]!
          return (
            <mesh
              key={`${i}${s}`}
              position={[dx + sx * DIGIT_W, (sy * DIGIT_H) / 2, PLATE_T + 0.004 + DIGIT_T / 2]}
              material={SKEE_MATS.ringGlow}
            >
              <boxGeometry args={[sw * DIGIT_W, (sh * DIGIT_H) / 2, DIGIT_T]} />
            </mesh>
          )
        })
      })}
    </group>
  )
}

const isBall = (e: IntersectionEnterPayload | IntersectionExitPayload) =>
  (e.other.rigidBodyObject?.userData as { ball?: boolean } | undefined)?.ball === true

function SolidMesh({ b }: { b: Box }) {
  return (
    <mesh position={b.center} rotation={[b.rotX ?? 0, 0, 0]} material={MAT_FOR[b.kind ?? 'wall']}>
      <boxGeometry args={[b.half[0] * 2, b.half[1] * 2, b.half[2] * 2]} />
    </mesh>
  )
}

type LaneProps = {
  /** The ball's collider started (`inside` true) or stopped overlapping the sensor for this trough value. */
  onTrough: (value: number, inside: boolean) => void
  onGutter: () => void
}

export function Lane({ onTrough, onGutter }: LaneProps) {
  const solids = useMemo(() => laneSolids(), [])
  const sensors = useMemo(() => laneSensors(), [])
  const { lane, laneY, troughs, troughDepth, troughLip, ball, aim } = SKEE

  const handlers = useMemo(
    () =>
      sensors.map((s) => ({
        enter: (e: IntersectionEnterPayload) => {
          if (!isBall(e)) return
          if (s.value === 0) onGutter()
          else onTrough(s.value, true)
        },
        exit: (e: IntersectionExitPayload) => {
          if (isBall(e) && s.value > 0) onTrough(s.value, false)
        },
      })),
    [sensors, onTrough, onGutter],
  )

  // One plate per distinct row, on the riser's front face; the top row gets one per pocket. A row
  // whose riser face sits inside the crest backing (the front row) gets none: it could never be seen.
  const plates = useMemo(() => {
    const rowZs = [...new Set(troughs.map((t) => t.z))]
    return rowZs.flatMap((z) => {
      const inRow = troughs.filter((t) => t.z === z)
      const prevY = Math.max(laneY, ...troughs.filter((t) => t.z > z).map((t) => t.y))
      const faceZ = z + troughDepth / 2 + 0.001
      const y = (prevY + inRow[0]!.y) / 2
      const buried = faceZ <= SKEE.ramp.zEnd && faceZ >= SKEE.ramp.zEnd - LIP_T && y < lipY()
      if (buried) return []
      return inRow.map((t) => ({ value: t.value, position: [t.x, y, faceZ] as [number, number, number] }))
    })
  }, [troughs, troughDepth, laneY])

  // The bone centre stripe stops short of the aim arrow so the amber arrow reads on dark wood.
  const stripeEnd = ball.spawn[2] - aim.arrowReach

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {solids.map((b, i) => (
          <CuboidCollider
            key={`s${i}`}
            args={b.half}
            position={b.center}
            rotation={[b.rotX ?? 0, 0, 0]}
            friction={SKEE.laneFriction}
            frictionCombineRule={CoefficientCombineRule.Min}
          />
        ))}
        {sensors.map((s, i) => (
          <CuboidCollider
            key={`t${i}`}
            args={s.half}
            position={s.center}
            sensor
            onIntersectionEnter={handlers[i]!.enter}
            onIntersectionExit={handlers[i]!.exit}
          />
        ))}
      </RigidBody>

      {solids.map((b, i) => (
        <SolidMesh key={i} b={b} />
      ))}

      {/* bone centre stripe down the flat lane, ending ahead of the arrow */}
      <mesh position={[0, laneY + 0.005, (stripeEnd + lane.zEnd) / 2]} material={SKEE_MATS.laneStripe}>
        <boxGeometry args={[0.06, 0.01, stripeEnd - lane.zEnd]} />
      </mesh>

      {plates.map((p, i) => (
        <NumberPlate key={i} value={p.value} position={p.position} />
      ))}

      {/* one lamp per trough on top of its front lip; the machine flashes these by name */}
      {troughs.map((t, i) => (
        <mesh
          key={i}
          name={`lamp-${i}`}
          position={[t.x, t.y + troughLip + 0.01, t.z + troughDepth / 2 - 0.03]}
          material={SKEE_MATS.ringDim}
        >
          <boxGeometry args={[t.halfW * 2 - 0.08, 0.02, 0.04]} />
        </mesh>
      ))}
    </group>
  )
}
