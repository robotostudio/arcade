'use client'

import { BOARD, CABINET, SKEE, laneTop, lip } from './constants'
import { SKEE_MATS } from './materials'
import { useSignMat } from './textures'

// Visual only. Colliders live on the lane. Maroon body, blue flanks and a yellow
// bulb marquee, the same cabinet language as Stack to the Top. Hero scale: the
// marquee tops out near 3.7 m, level with the Claw and Stack to the Top.
export function Cabinet() {
  const { startZ, y0, slope, run, width } = SKEE.lane
  const { width: W, backZ, towerH, marqueeH } = CABINET
  const top = laneTop()
  const end = lip()
  const sign = useSignMat()

  const front = startZ + 0.12
  const laneMid = { y: y0 + (top.y - y0) / 2, z: (startZ + top.z) / 2 }
  const sideX = W / 2 - 0.06
  const towerFront = top.z + 0.12
  const towerTop = end.y + BOARD.rise + 0.4
  const deckX = (width / 2 + 0.05 + sideX - 0.06) / 2
  const deckW = sideX - 0.06 - (width / 2 + 0.05)

  return (
    <group>
      <pointLight position={[0, towerTop + 0.2, end.z - 0.2]} color="#ffd98a" intensity={5} distance={5} decay={2} />
      <pointLight position={[0, 2.4, startZ - 0.4]} color="#ffd98a" intensity={4} distance={6} decay={2} />

      {/* Plinth and front panel at the foul line. */}
      <mesh position={[0, 0.06, (front + backZ) / 2]} material={SKEE_MATS.cabinetMid}>
        <boxGeometry args={[W + 0.08, 0.12, front - backZ + 0.06]} />
      </mesh>
      <mesh position={[0, y0 / 2, startZ + 0.06]} material={SKEE_MATS.cabinet}>
        <boxGeometry args={[W, y0, 0.12]} />
      </mesh>
      <mesh position={[0, y0 + 0.01, startZ + 0.1]} material={SKEE_MATS.trim}>
        <boxGeometry args={[W + 0.02, 0.04, 0.05]} />
      </mesh>

      {/* Under the lane: a body that rises with it. */}
      <mesh position={[0, (y0 - 0.1) / 2, laneMid.z]} material={SKEE_MATS.cabinetMid}>
        <boxGeometry args={[W - 0.2, y0 - 0.1, startZ - top.z]} />
      </mesh>
      <mesh position={[0, laneMid.y - 0.35, laneMid.z]} rotation={[slope, 0, 0]} material={SKEE_MATS.cabinetMid}>
        <boxGeometry args={[W - 0.2, 0.5, run]} />
      </mesh>

      {/* Side decks beside the lane, sloped with it. */}
      {([-deckX, deckX] as const).map((x) => (
        <mesh key={x} position={[x, laneMid.y + 0.02, laneMid.z]} rotation={[slope, 0, 0]} material={SKEE_MATS.cabinetDark}>
          <boxGeometry args={[deckW, 0.05, run]} />
        </mesh>
      ))}

      {([-sideX, sideX] as const).map((x) => (
        <group key={x}>
          {/* Low flank along the lane, capped by a rail that climbs with it. */}
          <mesh position={[x, (y0 + 0.2) / 2, laneMid.z]} material={SKEE_MATS.side}>
            <boxGeometry args={[0.12, y0 + 0.2, startZ - top.z]} />
          </mesh>
          <mesh position={[x, laneMid.y - 0.15, laneMid.z]} rotation={[slope, 0, 0]} material={SKEE_MATS.side}>
            <boxGeometry args={[0.12, 0.7, run]} />
          </mesh>
          <mesh position={[x, laneMid.y + 0.21, laneMid.z]} rotation={[slope, 0, 0]} material={SKEE_MATS.trim}>
            <boxGeometry args={[0.14, 0.04, run]} />
          </mesh>
          {/* Tall flank around the ring board. */}
          <mesh position={[x, towerTop / 2, (towerFront + backZ) / 2]} material={SKEE_MATS.side}>
            <boxGeometry args={[0.12, towerTop, towerFront - backZ]} />
          </mesh>
          <mesh position={[x, towerTop / 2, towerFront]} material={SKEE_MATS.trim}>
            <boxGeometry args={[0.14, towerTop, 0.04]} />
          </mesh>
        </group>
      ))}

      {/* Canopy over the rings, glow strip underneath. */}
      <mesh position={[0, towerTop + 0.04, (towerFront + backZ) / 2]} material={SKEE_MATS.cabinet}>
        <boxGeometry args={[W + 0.04, 0.08, towerFront - backZ]} />
      </mesh>
      <mesh position={[0, towerTop + 0.09, towerFront]} material={SKEE_MATS.trim}>
        <boxGeometry args={[W + 0.06, 0.04, 0.06]} />
      </mesh>
      <mesh position={[0, towerTop - 0.01, towerFront - 0.08]} material={SKEE_MATS.glow}>
        <boxGeometry args={[W - 0.3, 0.02, 0.04]} />
      </mesh>

      {/* Back tower and marquee. */}
      <mesh position={[0, towerH / 2, backZ + 0.06]} material={SKEE_MATS.cabinet}>
        <boxGeometry args={[W, towerH, 0.12]} />
      </mesh>
      <mesh position={[0, towerH + marqueeH / 2, backZ + 0.18]} material={SKEE_MATS.cabinet}>
        <boxGeometry args={[W + 0.1, marqueeH, 0.36]} />
      </mesh>
      <mesh position={[0, towerH + marqueeH / 2, backZ + 0.365]} material={sign}>
        <planeGeometry args={[W - 0.04, marqueeH - 0.06]} />
      </mesh>
      <mesh position={[0, towerH + marqueeH + 0.02, backZ + 0.18]} material={SKEE_MATS.trim}>
        <boxGeometry args={[W + 0.16, 0.04, 0.4]} />
      </mesh>
    </group>
  )
}
