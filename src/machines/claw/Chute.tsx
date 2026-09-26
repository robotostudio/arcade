'use client'

import { useRef } from 'react'
import { CuboidCollider, RigidBody, type IntersectionEnterPayload } from '@react-three/rapier'
import { CLAW } from './constants'
import { CLAW_MATS } from './materials'

// Rapier RigidBodyType numeric enum (compat 0.19.2): 0 Dynamic, 1 Fixed, 2 KinematicPosition.
const FIXED = 1
const SENSOR_HALF_H = 0.06

export function Chute({ onScore }: { onScore: (prizeId: number) => void }) {
  const scored = useRef(new Set<number>())
  const [cx, cz] = CLAW.chuteXZ
  const [sx, , sz] = CLAW.chuteSize
  // Low sensor: the prize visibly reaches the hole before it vanishes.
  const sensorY = CLAW.baseH + SENSOR_HALF_H

  const onEnter = (e: IntersectionEnterPayload) => {
    const ud = e.other.rigidBodyObject?.userData as { prize?: boolean; id?: number } | undefined
    const body = e.other.rigidBody
    if (!ud?.prize || typeof ud.id !== 'number' || !body) return
    if (scored.current.has(ud.id)) return
    scored.current.add(ud.id)
    onScore(ud.id)
    // Park it far below the machine and freeze it so it cannot rescore.
    body.setBodyType(FIXED, false)
    body.setTranslation({ x: 0, y: -50, z: 0 }, false)
  }

  return (
    <group>
      {/* dark hole marker on the pit floor with a lit Accent rim: the target */}
      <mesh position={[cx, CLAW.baseH + 0.015, cz]} rotation={[-Math.PI / 2, 0, 0]} material={CLAW_MATS.hole}>
        <planeGeometry args={[sx, sz]} />
      </mesh>
      <mesh position={[cx + sx / 2 + 0.02, CLAW.baseH + 0.12, cz]} material={CLAW_MATS.rim}>
        <boxGeometry args={[0.04, 0.24, sz + 0.08]} />
      </mesh>
      <mesh position={[cx, CLAW.baseH + 0.12, cz - sz / 2 - 0.02]} material={CLAW_MATS.rim}>
        <boxGeometry args={[sx + 0.08, 0.24, 0.04]} />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[sx / 2, SENSOR_HALF_H, sz / 2]}
          position={[cx, sensorY, cz]}
          sensor
          onIntersectionEnter={onEnter}
        />
      </RigidBody>
    </group>
  )
}
