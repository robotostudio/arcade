'use client'

import type { Material } from 'three'
import { accentMaterial, bodyMaterial } from '@/world/livery'
import { CLAW } from './constants'
import { CLAW_MATS } from './materials'

// The Claw's shell in the Livery (issue 12): a chunky teal body on the dark Plinth, trim posts and
// edges, cream panels for the control ledge, coin panel and chute surround, Accent-lit marquee strip
// and details. The play volume stays open at the front and sides so the prizes and the claw read
// from the Play-mode camera at DOCK. Footprint (CLAW.cabinet, CLAW.baseH, CLAW.chuteXZ) is unchanged
// so the mechanism, prizes and chute stay where they are. The Display sits on the roof; the
// controller mounts it because it draws the phase.
const POST = 0.1
const ROOF_T = 0.14
const PLINTH_H = 0.18
const LIP = 0.1

function Box({ at, size, material }: { at: [number, number, number]; size: [number, number, number]; material: Material }) {
  return <mesh position={at} material={material}><boxGeometry args={size} /></mesh>
}

export function Cabinet() {
  const { w, h, d } = CLAW.cabinet
  const baseH = CLAW.baseH
  const openH = h - baseH - ROOF_T
  const openY = baseH + openH / 2
  const front = d / 2
  const [chuteX] = CLAW.chuteXZ
  const body = bodyMaterial('claw')
  const plinth = bodyMaterial('plinth')
  const trim = bodyMaterial('trim')
  const panel = bodyMaterial('panel')
  const accent = accentMaterial('claw')

  return (
    <group>
      {/* Plinth and the teal base the pit sits in */}
      <Box at={[0, PLINTH_H / 2, 0]} size={[w + 0.1, PLINTH_H, d + 0.1]} material={plinth} />
      <Box at={[0, PLINTH_H + (baseH - PLINTH_H) / 2, 0]} size={[w, baseH - PLINTH_H, d]} material={body} />
      {/* pit lip: a trim rail round the top of the base, over the wall colliders */}
      <Box at={[0, baseH + LIP / 2, front - LIP / 2]} size={[w, LIP, LIP]} material={trim} />
      <Box at={[0, baseH + LIP / 2, -front + LIP / 2]} size={[w, LIP, LIP]} material={trim} />
      <Box at={[-w / 2 + LIP / 2, baseH + LIP / 2, 0]} size={[LIP, LIP, d]} material={trim} />
      <Box at={[w / 2 - LIP / 2, baseH + LIP / 2, 0]} size={[LIP, LIP, d]} material={trim} />

      {/* corner posts: the play volume is open between them */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
        <Box key={`${sx}${sz}`} at={[(sx * (w - POST)) / 2, openY, (sz * (d - POST)) / 2]} size={[POST, openH, POST]} material={trim} />
      ))}
      {/* Accent strips down the inside of the front posts so the opening reads */}
      {[-1, 1].map((sx) => (
        <Box key={sx} at={[(sx * (w - POST * 2 - 0.03)) / 2, openY, front - POST / 2]} size={[0.03, openH, 0.02]} material={accent} />
      ))}

      {/* roof: teal slab with a trim edge and the lit marquee strip along its front */}
      <Box at={[0, h - ROOF_T / 2, 0]} size={[w + 0.06, ROOF_T, d + 0.06]} material={body} />
      <Box at={[0, h - ROOF_T - 0.03, 0]} size={[w + 0.1, 0.06, d + 0.1]} material={trim} />
      <Box at={[0, h - ROOF_T / 2, front + 0.03 + 0.015]} size={[w - 0.3, 0.08, 0.03]} material={accent} />
      {/* marquee shelf on the roof that the Display stands on */}
      <Box at={[0, h + 0.03, front - 0.42]} size={[w - 0.2, 0.06, 0.6]} material={plinth} />

      {/* control ledge: cream top on a trim block, proud of the base */}
      <Box at={[0.35, baseH - 0.26, front + 0.11]} size={[1.6, 0.36, 0.22]} material={trim} />
      <Box at={[0.35, baseH - 0.04, front + 0.14]} size={[1.64, 0.08, 0.3]} material={panel} />
      {/* joystick */}
      <mesh position={[0.1, baseH + 0.1, front + 0.14]} material={trim}>
        <cylinderGeometry args={[0.018, 0.018, 0.2, 8]} />
      </mesh>
      <mesh position={[0.1, baseH + 0.22, front + 0.14]} material={accent}>
        <icosahedronGeometry args={[0.05, 0]} />
      </mesh>
      {/* drop button */}
      <mesh position={[0.6, baseH + 0.02, front + 0.14]} material={accent}>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 8]} />
      </mesh>

      {/* coin panel: cream face, trim slots, one lit dot */}
      <Box at={[0.8, 0.45, front + 0.02]} size={[0.36, 0.3, 0.04]} material={panel} />
      {[-0.07, 0.07].map((cx) => (
        <Box key={cx} at={[0.8 + cx, 0.47, front + 0.045]} size={[0.03, 0.09, 0.01]} material={trim} />
      ))}
      <Box at={[0.8, 0.36, front + 0.045]} size={[0.05, 0.03, 0.01]} material={accent} />

      {/* chute door, front-left of base: cream surround round a dark opening */}
      <Box at={[chuteX + 0.1, 0.4, front + 0.02]} size={[0.56, 0.46, 0.04]} material={panel} />
      <Box at={[chuteX + 0.1, 0.4, front + 0.045]} size={[0.4, 0.3, 0.01]} material={CLAW_MATS.hole} />
    </group>
  )
}
