'use client'

import { BOARD, SKEE, lip } from './constants'
import { SKEE_MATS } from './materials'
import { useSignMat } from './textures'

// Visual only. Colliders live on the lane. Maroon body, blue flanks and a yellow
// bulb marquee, the same cabinet language as Stack to the Top.
export function Cabinet() {
  const { startZ } = SKEE.ramp
  const end = lip()
  const zMid = (startZ + end.z - BOARD.run) / 2
  const len = startZ - (end.z - BOARD.run) + 0.55
  const wallX = SKEE.ramp.width / 2 + 0.28
  const sign = useSignMat()

  return (
    <group>
      <pointLight position={[0, 2.8, 1.8]} color="#ffd98a" intensity={5} distance={8} decay={2} />
      <pointLight position={[0, 1.2, 2.2]} color="#ff5a3a" intensity={2.2} distance={6} decay={2} />

      <mesh position={[0, 0.16, zMid]} material={SKEE_MATS.cabinetMid}>
        <boxGeometry args={[1.62, 0.32, len + 0.08]} />
      </mesh>
      <mesh position={[0, 0.38, zMid]} material={SKEE_MATS.cabinetDark}>
        <boxGeometry args={[1.4, 0.06, len - 0.1]} />
      </mesh>

      <mesh position={[0, 0.22, startZ + 0.28]} material={SKEE_MATS.cabinet}>
        <boxGeometry args={[1.62, 0.44, 0.1]} />
      </mesh>
      <mesh position={[0, 0.46, startZ + 0.32]} material={SKEE_MATS.trim}>
        <boxGeometry args={[1.5, 0.04, 0.04]} />
      </mesh>

      {([-wallX, wallX] as const).map((x) => (
        <group key={x}>
          <mesh position={[x, 0.62, zMid]} material={SKEE_MATS.side}>
            <boxGeometry args={[0.1, 0.52, len]} />
          </mesh>
          <mesh position={[x, 0.9, zMid]} material={SKEE_MATS.trim}>
            <boxGeometry args={[0.12, 0.04, len]} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 1.78, end.z - BOARD.run - 0.58]} material={SKEE_MATS.cabinet}>
        <boxGeometry args={[1.5, 0.08, 0.28]} />
      </mesh>
      <mesh position={[0, 1.84, end.z - BOARD.run - 0.58]} material={SKEE_MATS.trim}>
        <boxGeometry args={[1.58, 0.04, 0.32]} />
      </mesh>
      <mesh position={[0, 1.32, end.z - BOARD.run - 0.62]} material={SKEE_MATS.cabinet}>
        <boxGeometry args={[1.62, 1.15, 0.12]} />
      </mesh>

      <mesh position={[0, end.y + BOARD.rise + 0.32, end.z - BOARD.run + 0.06]} material={sign}>
        <planeGeometry args={[1.42, 0.52]} />
      </mesh>
    </group>
  )
}
