'use client'

import { MATERIALS, COLORS } from '@/world/palette'
import { SKEE } from './constants'
import { SKEE_MATS } from './materials'

// Visual shell around the Lane: plinth, side rails, hood over the target well with a marquee,
// control ledge with the press button. No physics here; the Lane owns every collider.
export function Cabinet() {
  const { w, h, d } = SKEE.cabinet
  const { laneY, lane, wallT, ramp, backWall, hood } = SKEE
  const { cheekT, roofT, railH, lintelT, marqueeY, marqueeH, stripZ } = hood
  const front = d / 2
  const back = -d / 2
  const plinthH = laneY - 0.1 // the lane slab (0.1 thick) sits on the plinth
  const wallOuterX = lane.w / 2 + wallT // outer face of the Lane's side walls
  const cheekX = wallOuterX + cheekT / 2
  const hoodFront = ramp.zStart - hood.setback // hood starts over the upper ramp
  const roofY = h - roofT / 2
  const wellWallTop = laneY + backWall.h
  const ledgeD = front - lane.zStart // 0.2: between the lane end and the cabinet front

  return (
    <group>
      {/* amber gaslamp over the well so the troughs read through the dither; no shadows */}
      <pointLight position={[0, h - 0.5, -1.5]} color={COLORS.amber} intensity={4} distance={4.5} decay={1.2} />

      {/* base plinth */}
      <mesh position={[0, plinthH / 2, 0]} material={MATERIALS.oxblood}>
        <boxGeometry args={[w, plinthH, d]} />
      </mesh>
      {/* kick plate */}
      <mesh position={[0, 0.06, front + 0.005]} material={MATERIALS.void}>
        <boxGeometry args={[w, 0.12, 0.02]} />
      </mesh>

      {/* low side rails along the lane, outside the Lane's walls */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * cheekX, plinthH + railH / 2, (lane.zStart + hoodFront) / 2]}
          material={MATERIALS.oxblood}
        >
          <boxGeometry args={[cheekT, railH, lane.zStart - hoodFront]} />
        </mesh>
      ))}

      {/* hood cheeks: tall side panels around the well */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * cheekX, (plinthH + h) / 2, (hoodFront + back) / 2]} material={MATERIALS.oxblood}>
          <boxGeometry args={[cheekT, h - plinthH, hoodFront - back]} />
        </mesh>
      ))}
      {/* backboard above the Lane's back wall */}
      <mesh position={[0, (wellWallTop + h) / 2, backWall.z]} material={MATERIALS.oxblood}>
        <boxGeometry args={[wallOuterX * 2 + cheekT * 2, h - wellWallTop, 0.08]} />
      </mesh>
      {/* hood roof */}
      <mesh position={[0, roofY, (hoodFront + back) / 2]} material={MATERIALS.oxblood}>
        <boxGeometry args={[wallOuterX * 2 + cheekT * 2, roofT, hoodFront - back]} />
      </mesh>
      {/* hood front lintel: the marquee band up top, the value board (Indicators) in the band below */}
      <mesh position={[0, h - 0.45, hoodFront + lintelT / 2]} material={MATERIALS.floor}>
        <boxGeometry args={[wallOuterX * 2 + cheekT * 2, 0.9 - roofT, lintelT]} />
      </mesh>
      <mesh position={[0, marqueeY, hoodFront + lintelT + 0.02]} material={SKEE_MATS.marquee}>
        <boxGeometry args={[wallOuterX * 2, marqueeH, 0.06]} />
      </mesh>
      <mesh position={[0, marqueeY, hoodFront + stripZ]} material={MATERIALS.void}>
        <boxGeometry args={[wallOuterX * 2 - 0.3, 0.16, 0.01]} />
      </mesh>
      {/* bone edge strips on the hood front so the opening reads */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (wallOuterX + cheekT - 0.02), (plinthH + h) / 2, hoodFront + 0.005]} material={MATERIALS.bone}>
          <boxGeometry args={[0.03, h - plinthH, 0.02]} />
        </mesh>
      ))}

      {/* control ledge at the player end, with the press button */}
      <mesh position={[0, plinthH + 0.06, lane.zStart + ledgeD / 2]} material={MATERIALS.stone}>
        <boxGeometry args={[w - 0.2, 0.12, ledgeD]} />
      </mesh>
      <mesh position={[0, plinthH + 0.12 + 0.025, lane.zStart + ledgeD / 2]} material={SKEE_MATS.button}>
        <cylinderGeometry args={[0.09, 0.09, 0.05, 8]} />
      </mesh>
      <mesh position={[0, plinthH + 0.12 + 0.005, lane.zStart + ledgeD / 2]} material={MATERIALS.void}>
        <cylinderGeometry args={[0.11, 0.11, 0.01, 8]} />
      </mesh>

      {/* coin panel on the front face */}
      <mesh position={[0.6, 0.4, front + 0.02]} material={MATERIALS.floor}>
        <boxGeometry args={[0.36, 0.3, 0.04]} />
      </mesh>
      {[-0.07, 0.07].map((cx) => (
        <mesh key={cx} position={[0.6 + cx, 0.42, front + 0.045]} material={SKEE_MATS.ringDim}>
          <boxGeometry args={[0.03, 0.09, 0.01]} />
        </mesh>
      ))}
    </group>
  )
}
