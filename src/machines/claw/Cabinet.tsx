'use client'

import { MATERIALS } from '@/world/palette'
import { CLAW } from './constants'
import { CLAW_MATS } from './materials'

const AMBER = '#c98a3a'

export function Cabinet() {
  const { w, h, d } = CLAW.cabinet
  const baseH = CLAW.baseH
  const roofT = 0.14
  const glassH = h - baseH - roofT
  const glassY = baseH + glassH / 2
  const t = 0.02
  const post = 0.08
  const front = d / 2
  const [chuteX] = CLAW.chuteXZ

  return (
    <group>
      {/* gaslamp inside the roof so the pit reads through the void + dither; no shadows */}
      <pointLight position={[0, h - 0.4, 0.4]} color={AMBER} intensity={4} distance={4.5} decay={1.2} />
      {/* base */}
      <mesh position={[0, baseH / 2, 0]} material={MATERIALS.oxblood}>
        <boxGeometry args={[w, baseH, d]} />
      </mesh>
      {/* kick plate */}
      <mesh position={[0, 0.06, front + 0.005]} material={MATERIALS.void}>
        <boxGeometry args={[w, 0.12, 0.02]} />
      </mesh>

      {/* side glass only: front/back panes stacked into dither noise over the whole window */}
      <mesh position={[-w / 2 + t / 2, glassY, 0]} renderOrder={2} material={CLAW_MATS.glass}>
        <boxGeometry args={[t, glassH, d]} />
      </mesh>
      <mesh position={[w / 2 - t / 2, glassY, 0]} renderOrder={2} material={CLAW_MATS.glass}>
        <boxGeometry args={[t, glassH, d]} />
      </mesh>
      {/* bone edge strips on the front posts so the glass edge still reads */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[(sx * (w - post * 2 - 0.03)) / 2, glassY, front - post / 2]} material={MATERIALS.bone}>
          <boxGeometry args={[0.03, glassH, 0.02]} />
        </mesh>
      ))}

      {/* corner posts */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[(sx * (w - post)) / 2, glassY, (sz * (d - post)) / 2]} material={MATERIALS.floor}>
          <boxGeometry args={[post, glassH, post]} />
        </mesh>
      ))}

      {/* roof slab */}
      <mesh position={[0, h - roofT / 2, 0]} material={MATERIALS.oxblood}>
        <boxGeometry args={[w + 0.06, roofT, d + 0.06]} />
      </mesh>
      {/* marquee topper above the roof, like a real claw machine (keeps the head and rails visible) */}
      <mesh position={[0, h + 0.15, front - 0.15]} material={CLAW_MATS.amberGlow}>
        <boxGeometry args={[w - 0.2, 0.3, 0.06]} />
      </mesh>
      <mesh position={[0, h + 0.15, front - 0.115]} material={MATERIALS.void}>
        <boxGeometry args={[w - 0.5, 0.1, 0.01]} />
      </mesh>

      {/* control ledge */}
      <mesh position={[0.35, baseH - 0.04, front + 0.12]} material={MATERIALS.stone}>
        <boxGeometry args={[1.6, 0.08, 0.26]} />
      </mesh>
      {/* joystick */}
      <mesh position={[0.1, baseH + 0.1, front + 0.14]} material={MATERIALS.floor}>
        <cylinderGeometry args={[0.018, 0.018, 0.2, 8]} />
      </mesh>
      <mesh position={[0.1, baseH + 0.22, front + 0.14]} material={MATERIALS.oxblood}>
        <icosahedronGeometry args={[0.05, 0]} />
      </mesh>
      {/* drop button */}
      <mesh position={[0.6, baseH + 0.02, front + 0.14]} material={CLAW_MATS.amberDim}>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 8]} />
      </mesh>

      {/* coin panel */}
      <mesh position={[0.8, 0.45, front + 0.02]} material={MATERIALS.floor}>
        <boxGeometry args={[0.36, 0.3, 0.04]} />
      </mesh>
      {[-0.07, 0.07].map((cx) => (
        <mesh key={cx} position={[0.8 + cx, 0.47, front + 0.045]} material={CLAW_MATS.amberDim}>
          <boxGeometry args={[0.03, 0.09, 0.01]} />
        </mesh>
      ))}

      {/* chute door, front-left of base */}
      <mesh position={[chuteX + 0.1, 0.4, front + 0.02]} material={MATERIALS.stone}>
        <boxGeometry args={[0.5, 0.4, 0.04]} />
      </mesh>
      <mesh position={[chuteX + 0.1, 0.4, front + 0.045]} material={MATERIALS.void}>
        <boxGeometry args={[0.4, 0.3, 0.01]} />
      </mesh>
    </group>
  )
}
