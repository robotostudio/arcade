'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Mesh } from 'three'
import { CLAW } from './constants'
import { CLAW_MATS } from './materials'

/** Machine-local head pose, written by the controller every frame (no React re-render).
 *  aimLock: a drop from here would close on a prize (the ring lights up). */
export type ClawPose = { x: number; y: number; z: number; grip: number; showAim: boolean; aimLock: boolean }

type Props = { pose: React.RefObject<ClawPose> }

const STEEL = CLAW_MATS.steel
const DARK_STEEL = CLAW_MATS.darkSteel
const BRASS = CLAW_MATS.brass
const CABLE_TOP = CLAW.homeY + 0.5
const RAIL_Y = CLAW.cabinet.h - 0.18
const HOME: [number, number, number] = [CLAW.homeXZ[0], CLAW.homeY, CLAW.homeXZ[1]]
const FINGER_ANGLES = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]
// open ~ +0.6 rad (splayed out), closed ~ -0.15 rad (tucked in)
const tiltFor = (grip: number) => 0.6 + (-0.15 - 0.6) * grip

// The head has no collider: the grab is decided by distance in the controller, so the rig is
// pure visuals and the prizes never get squeezed by a kinematic body.
export function ClawRig({ pose }: Props) {
  const head = useRef<Group>(null!)
  const carriage = useRef<Mesh>(null!)
  const trolley = useRef<Mesh>(null!)
  const cable = useRef<Mesh>(null!)
  const aim = useRef<Group>(null!)
  const ring = useRef<Mesh>(null!)
  const fingers = useRef<(Group | null)[]>([])

  useFrame(() => {
    const p = pose.current
    if (!p) return
    head.current.position.set(p.x, p.y, p.z)
    carriage.current.position.x = p.x
    trolley.current.position.set(p.x, RAIL_Y - 0.12, p.z)
    const cableLen = Math.max(0.01, CABLE_TOP - p.y)
    cable.current.position.set(p.x, CABLE_TOP - cableLen / 2, p.z)
    cable.current.scale.y = cableLen
    aim.current.visible = p.showAim
    aim.current.position.set(p.x, CLAW.baseH + 0.012, p.z)
    ring.current.material = p.aimLock ? CLAW_MATS.aimLock : CLAW_MATS.aimRing
    const tilt = tiltFor(p.grip)
    for (const f of fingers.current) if (f) f.rotation.x = tilt
  })

  const [xMin, xMax] = CLAW.bounds.x
  const [zMin, zMax] = CLAW.bounds.z
  const railLen = xMax - xMin + 0.3
  const carriageLen = zMax - zMin + 0.3
  const cable0 = CABLE_TOP - CLAW.homeY

  return (
    <group>
      {/* gantry rails along x at the z bounds */}
      {[zMin - 0.1, zMax + 0.1].map((rz) => (
        <mesh key={rz} position={[0, RAIL_Y, rz]} material={DARK_STEEL}>
          <boxGeometry args={[railLen, 0.06, 0.06]} />
        </mesh>
      ))}
      {/* carriage bar along z, rides at head x */}
      <mesh ref={carriage} position={[HOME[0], RAIL_Y - 0.06, 0]} material={STEEL}>
        <boxGeometry args={[0.08, 0.06, carriageLen]} />
      </mesh>
      {/* trolley on the carriage */}
      <mesh ref={trolley} position={[HOME[0], RAIL_Y - 0.12, HOME[2]]} material={BRASS}>
        <boxGeometry args={[0.18, 0.08, 0.18]} />
      </mesh>
      {/* cable from trolley down to head */}
      <mesh
        ref={cable}
        position={[HOME[0], CABLE_TOP - cable0 / 2, HOME[2]]}
        scale={[1, cable0, 1]}
        material={DARK_STEEL}
      >
        <cylinderGeometry args={[0.012, 0.012, 1, 6]} />
      </mesh>
      {/* drop marker on the pit floor: a fake shadow disc under the head and an Accent ring that
          turns cream when the drop would reach a prize (not a shadow; there are none in this look) */}
      <group ref={aim} position={[HOME[0], CLAW.baseH + 0.012, HOME[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh material={CLAW_MATS.aimShadow} renderOrder={1}>
          <circleGeometry args={[CLAW.reach, 8]} />
        </mesh>
        <mesh ref={ring} position={[0, 0, 0.004]} material={CLAW_MATS.aimRing} renderOrder={2}>
          <ringGeometry args={[CLAW.grabRadius - 0.04, CLAW.grabRadius, 8]} />
        </mesh>
      </group>

      {/* head; position is driven every frame */}
      <group ref={head} position={HOME}>
        <mesh material={BRASS}>
          <cylinderGeometry args={[0.13, 0.16, 0.16, 8]} />
        </mesh>
        <mesh position={[0, 0.11, 0]} material={DARK_STEEL}>
          <cylinderGeometry args={[0.05, 0.08, 0.08, 8]} />
        </mesh>
        {FINGER_ANGLES.map((a, i) => (
          <group key={a} rotation={[0, a, 0]}>
            <group
              ref={(g) => {
                fingers.current[i] = g
              }}
              position={[0, -0.08, 0.12]}
              rotation={[tiltFor(0), 0, 0]}
            >
              {/* upper segment */}
              <mesh position={[0, -0.14, 0]} material={STEEL}>
                <boxGeometry args={[0.05, 0.28, 0.04]} />
              </mesh>
              {/* hooked tip */}
              <mesh position={[0, -0.3, -0.04]} rotation={[-0.7, 0, 0]} material={STEEL}>
                <boxGeometry args={[0.05, 0.1, 0.04]} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  )
}
