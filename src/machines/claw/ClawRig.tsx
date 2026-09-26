'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BallCollider, RigidBody, type IntersectionEnterPayload, type IntersectionExitPayload, type RapierRigidBody } from '@react-three/rapier'
import { Group, Vector3 } from 'three'
import { CLAW } from './constants'

type Props = {
  x: number
  y: number
  z: number
  grip: number
  onReach: (inReach: boolean, prizeId: number | null) => void
}

const STEEL = '#5a6470'
const DARK_STEEL = '#2a3038'
const BRASS = '#c98a3a'
const CABLE_TOP = CLAW.homeY + 0.5
const RAIL_Y = CLAW.cabinet.h - 0.18
// Constant initial position: a changing position prop makes @react-three/rapier re-teleport the body.
const HOME: [number, number, number] = [CLAW.homeXZ[0], CLAW.homeY, CLAW.homeXZ[1]]

function prizeIdOf(e: IntersectionEnterPayload | IntersectionExitPayload): number | null {
  const ud = (e.other.rigidBodyObject?.userData ?? e.other.rigidBody?.userData) as
    | { prize?: boolean; id?: number }
    | undefined
  return ud?.prize && typeof ud.id === 'number' ? ud.id : null
}

function Finger({ angle, grip }: { angle: number; grip: number }) {
  // open ~ +0.6 rad (splayed out), closed ~ -0.15 rad (tucked in)
  const tilt = 0.6 + (-0.15 - 0.6) * grip
  return (
    <group rotation={[0, angle, 0]}>
      <group position={[0, -0.08, 0.12]} rotation={[tilt, 0, 0]}>
        {/* upper segment */}
        <mesh position={[0, -0.14, 0]}>
          <boxGeometry args={[0.05, 0.28, 0.04]} />
          <meshLambertMaterial color={STEEL} />
        </mesh>
        {/* hooked tip */}
        <mesh position={[0, -0.3, -0.04]} rotation={[-0.7, 0, 0]}>
          <boxGeometry args={[0.05, 0.1, 0.04]} />
          <meshLambertMaterial color={STEEL} />
        </mesh>
      </group>
    </group>
  )
}

export function ClawRig({ x, y, z, grip, onReach }: Props) {
  const originRef = useRef<Group>(null!)
  const bodyRef = useRef<RapierRigidBody>(null!)
  const world = useMemo(() => new Vector3(), [])
  const inReach = useRef(new Set<number>())
  const props = useRef({ x, y, z })
  props.current.x = x
  props.current.y = y
  props.current.z = z
  const onReachRef = useRef(onReach)
  onReachRef.current = onReach

  useFrame(() => {
    const body = bodyRef.current
    const origin = originRef.current
    if (!body || !origin) return
    world.set(props.current.x, props.current.y, props.current.z)
    origin.localToWorld(world)
    body.setNextKinematicTranslation(world)
  })

  const cableLen = Math.max(0.01, CABLE_TOP - y)
  const [xMin, xMax] = CLAW.bounds.x
  const [zMin, zMax] = CLAW.bounds.z
  const railLen = xMax - xMin + 0.3
  const carriageLen = zMax - zMin + 0.3

  return (
    <group ref={originRef}>
      {/* gantry rails along x at the z bounds */}
      {[zMin - 0.1, zMax + 0.1].map((rz) => (
        <mesh key={rz} position={[0, RAIL_Y, rz]}>
          <boxGeometry args={[railLen, 0.06, 0.06]} />
          <meshLambertMaterial color={DARK_STEEL} />
        </mesh>
      ))}
      {/* carriage bar along z, rides at head x */}
      <mesh position={[x, RAIL_Y - 0.06, 0]}>
        <boxGeometry args={[0.08, 0.06, carriageLen]} />
        <meshLambertMaterial color={STEEL} />
      </mesh>
      {/* trolley on the carriage */}
      <mesh position={[x, RAIL_Y - 0.12, z]}>
        <boxGeometry args={[0.18, 0.08, 0.18]} />
        <meshLambertMaterial color={BRASS} />
      </mesh>
      {/* cable from trolley down to head */}
      <mesh position={[x, CABLE_TOP - cableLen / 2, z]} scale={[1, cableLen, 1]}>
        <cylinderGeometry args={[0.012, 0.012, 1, 6]} />
        <meshLambertMaterial color={DARK_STEEL} />
      </mesh>

      {/* kinematic head; position is driven every frame in world space */}
      <RigidBody ref={bodyRef} type="kinematicPosition" colliders={false} position={HOME}>
        <mesh>
          <cylinderGeometry args={[0.13, 0.16, 0.16, 8]} />
          <meshLambertMaterial color={BRASS} />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.05, 0.08, 0.08, 8]} />
          <meshLambertMaterial color={DARK_STEEL} />
        </mesh>
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => (
          <Finger key={a} angle={a} grip={grip} />
        ))}
        <BallCollider
          args={[CLAW.grabRadius]}
          sensor
          position={[0, -0.25, 0]}
          onIntersectionEnter={(e) => {
            const id = prizeIdOf(e)
            if (id === null) return
            inReach.current.add(id)
            onReachRef.current(true, id)
          }}
          onIntersectionExit={(e) => {
            const id = prizeIdOf(e)
            if (id === null) return
            inReach.current.delete(id)
            const next = inReach.current.values().next()
            if (next.done) onReachRef.current(false, null)
            else onReachRef.current(true, next.value)
          }}
        />
      </RigidBody>
    </group>
  )
}
