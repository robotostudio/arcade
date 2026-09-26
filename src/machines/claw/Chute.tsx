'use client'

import { useRef } from 'react'
import { CuboidCollider, RigidBody, type IntersectionEnterPayload } from '@react-three/rapier'
import { CLAW } from './constants'

// Rapier RigidBodyType numeric enum (0.12): 0 Dynamic, 1 Fixed, 2 KinematicPosition.
const FIXED = 1

export function Chute({ onScore }: { onScore: (prizeId: number) => void }) {
  const scored = useRef(new Set<number>())
  const [cx, cz] = CLAW.chuteXZ
  const [sx, sy, sz] = CLAW.chuteSize
  const sensorY = CLAW.baseH + sy / 2 + 0.05

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
      {/* dark hole marker on the pit floor with a low rim */}
      <mesh position={[cx, CLAW.baseH + 0.005, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[sx, sz]} />
        <meshLambertMaterial color="#050406" />
      </mesh>
      <mesh position={[cx + sx / 2 + 0.02, CLAW.baseH + 0.12, cz]}>
        <boxGeometry args={[0.04, 0.24, sz + 0.08]} />
        <meshLambertMaterial color="#6b1f1f" />
      </mesh>
      <mesh position={[cx, CLAW.baseH + 0.12, cz - sz / 2 - 0.02]}>
        <boxGeometry args={[sx + 0.08, 0.24, 0.04]} />
        <meshLambertMaterial color="#6b1f1f" />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[sx / 2, sy / 2, sz / 2]}
          position={[cx, sensorY, cz]}
          sensor
          onIntersectionEnter={onEnter}
        />
      </RigidBody>
    </group>
  )
}
