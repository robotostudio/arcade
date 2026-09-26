'use client'

import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { HOLES, boardTheta, onBoard, type Hole } from './constants'
import { SKEE_MATS } from './materials'
import { useLabelMat } from './textures'

function Cup({ hole, lit, onHole }: { hole: Hole; lit: number; onHole: (value: number, inside: boolean) => void }) {
  const tilt = boardTheta()
  const [x, y, z] = onBoard(hole.x, hole.s, 0.012)
  const hot = lit === hole.value
  const label = useLabelMat(hole.value)
  const labelOff = hole.value === 100 ? (hole.x < 0 ? -0.13 : 0.13) : hole.r + 0.11

  return (
    <group position={[x, y, z]} rotation={[tilt, 0, 0]}>
      <mesh material={SKEE_MATS.hole} position={[0, 0, -0.006]}>
        <cylinderGeometry args={[hole.r * 0.92, hole.r * 0.86, 0.03, 16]} />
      </mesh>
      <mesh material={hot ? SKEE_MATS.hit : SKEE_MATS[hole.mat]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[hole.r, 0.022, 6, 18]} />
      </mesh>
      <mesh position={[labelOff, 0, 0.012]} material={label}>
        <planeGeometry args={[hole.value >= 100 ? 0.16 : 0.14, 0.07]} />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider
          args={[0.2, hole.r * 1.2]}
          sensor
          onIntersectionEnter={(e) => {
            const ud = e.other.rigidBodyObject?.userData as { ball?: boolean } | undefined
            if (ud?.ball) onHole(hole.value, true)
          }}
          onIntersectionExit={(e) => {
            const ud = e.other.rigidBodyObject?.userData as { ball?: boolean } | undefined
            if (ud?.ball) onHole(hole.value, false)
          }}
        />
      </RigidBody>
    </group>
  )
}

function FlankDots() {
  const tilt = boardTheta()
  const dots = []
  for (let i = 0; i < 7; i++) {
    const s = 0.12 + i * 0.15
    for (const x of [-0.56, 0.56] as const) {
      dots.push(
        <mesh
          key={`${x}:${i}`}
          position={onBoard(x, s, 0.03)}
          rotation={[tilt, 0, 0]}
          material={i % 2 === 0 ? SKEE_MATS.dot : SKEE_MATS.dotAlt}
        >
          <sphereGeometry args={[0.038, 8, 6]} />
        </mesh>,
      )
    }
  }
  return <>{dots}</>
}

export function Board({ onHole, lit }: { onHole: (value: number, inside: boolean) => void; lit: number }) {
  return (
    <group>
      <FlankDots />
      {HOLES.map((hole) => (
        <Cup key={`${hole.value}:${hole.x}`} hole={hole} lit={lit} onHole={onHole} />
      ))}
    </group>
  )
}
