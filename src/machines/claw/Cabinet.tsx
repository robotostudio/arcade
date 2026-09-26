'use client'

import { CLAW } from './constants'

const OXBLOOD = '#6b1f1f'
const VOID = '#050406'
const IRON = '#1c2026'
const BLUE_GREY = '#3a4450'
const AMBER = '#c98a3a'
const BONE = '#d8cfc0'

function Glass({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh position={position} renderOrder={2}>
      <boxGeometry args={size} />
      <meshLambertMaterial color={BONE} transparent opacity={0.05} depthWrite={false} />
    </mesh>
  )
}

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
      <mesh position={[0, baseH / 2, 0]}>
        <boxGeometry args={[w, baseH, d]} />
        <meshLambertMaterial color={OXBLOOD} />
      </mesh>
      {/* kick plate */}
      <mesh position={[0, 0.06, front + 0.005]}>
        <boxGeometry args={[w, 0.12, 0.02]} />
        <meshLambertMaterial color={VOID} />
      </mesh>
      {/* pit floor surface (visual only) */}
      <mesh position={[0, baseH + 0.005, 0]}>
        <boxGeometry args={[w - 0.1, 0.01, d - 0.1]} />
        <meshLambertMaterial color={IRON} />
      </mesh>

      {/* glass panes */}
      <Glass position={[0, glassY, front - t / 2]} size={[w, glassH, t]} />
      <Glass position={[0, glassY, -front + t / 2]} size={[w, glassH, t]} />
      <Glass position={[-w / 2 + t / 2, glassY, 0]} size={[t, glassH, d]} />
      <Glass position={[w / 2 - t / 2, glassY, 0]} size={[t, glassH, d]} />

      {/* corner posts */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[(sx * (w - post)) / 2, glassY, (sz * (d - post)) / 2]}>
          <boxGeometry args={[post, glassH, post]} />
          <meshLambertMaterial color={IRON} />
        </mesh>
      ))}

      {/* roof slab */}
      <mesh position={[0, h - roofT / 2, 0]}>
        <boxGeometry args={[w + 0.06, roofT, d + 0.06]} />
        <meshLambertMaterial color={OXBLOOD} />
      </mesh>
      {/* marquee strip, front top */}
      <mesh position={[0, h - roofT - 0.14, front + 0.02]}>
        <boxGeometry args={[w - 0.2, 0.26, 0.04]} />
        <meshLambertMaterial color={AMBER} emissive={AMBER} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, h - roofT - 0.14, front + 0.045]}>
        <boxGeometry args={[w - 0.5, 0.1, 0.01]} />
        <meshLambertMaterial color={VOID} />
      </mesh>

      {/* control ledge */}
      <mesh position={[0.35, baseH - 0.04, front + 0.12]}>
        <boxGeometry args={[1.6, 0.08, 0.26]} />
        <meshLambertMaterial color={BLUE_GREY} />
      </mesh>
      {/* joystick */}
      <mesh position={[0.1, baseH + 0.1, front + 0.14]}>
        <cylinderGeometry args={[0.018, 0.018, 0.2, 8]} />
        <meshLambertMaterial color={IRON} />
      </mesh>
      <mesh position={[0.1, baseH + 0.22, front + 0.14]}>
        <icosahedronGeometry args={[0.05, 0]} />
        <meshLambertMaterial color={OXBLOOD} />
      </mesh>
      {/* drop button */}
      <mesh position={[0.6, baseH + 0.02, front + 0.14]}>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 8]} />
        <meshLambertMaterial color={AMBER} emissive={AMBER} emissiveIntensity={0.3} />
      </mesh>

      {/* coin panel */}
      <mesh position={[0.8, 0.45, front + 0.02]}>
        <boxGeometry args={[0.36, 0.3, 0.04]} />
        <meshLambertMaterial color={IRON} />
      </mesh>
      {[-0.07, 0.07].map((cx) => (
        <mesh key={cx} position={[0.8 + cx, 0.47, front + 0.045]}>
          <boxGeometry args={[0.03, 0.09, 0.01]} />
          <meshLambertMaterial color={AMBER} emissive={AMBER} emissiveIntensity={0.4} />
        </mesh>
      ))}

      {/* chute door, front-left of base */}
      <mesh position={[chuteX + 0.1, 0.4, front + 0.02]}>
        <boxGeometry args={[0.5, 0.4, 0.04]} />
        <meshLambertMaterial color={BLUE_GREY} />
      </mesh>
      <mesh position={[chuteX + 0.1, 0.4, front + 0.045]}>
        <boxGeometry args={[0.4, 0.3, 0.01]} />
        <meshLambertMaterial color={VOID} />
      </mesh>
    </group>
  )
}
