import { MeshLambertMaterial } from 'three'
import { psxify } from '@/world/look/psx-material'
import { COLORS } from '@/world/palette'

// Off-palette / special Claw materials. Palette colours come from '@/world/palette' MATERIALS.
// One shared psxified instance each (psx-look.md section 2).
const lambert = (p: ConstructorParameters<typeof MeshLambertMaterial>[0]) => psxify(new MeshLambertMaterial(p))

export const CLAW_MATS = {
  amberGlow: lambert({ color: COLORS.amber, emissive: COLORS.amber, emissiveIntensity: 0.6 }),
  amberDim: lambert({ color: COLORS.amber, emissive: COLORS.amber, emissiveIntensity: 0.3 }),
  glass: lambert({ color: COLORS.bone, transparent: true, opacity: 0.05, depthWrite: false }),
  // Aim marker: a dark shadow disc under the head plus an amber ring; the ring swaps to aimLock
  // when a drop from here would reach a prize. Solid emissive colours survive the dither.
  aimShadow: lambert({ color: COLORS.void, transparent: true, opacity: 0.7, depthWrite: false }),
  // transparent so the ring sorts after the shadow disc instead of being darkened by it
  aimRing: lambert({ color: COLORS.amber, emissive: COLORS.amber, emissiveIntensity: 0.9, transparent: true, depthWrite: false }),
  aimLock: lambert({ color: COLORS.bone, emissive: COLORS.bone, emissiveIntensity: 1.2, transparent: true, depthWrite: false }),
  pitFloor: lambert({ color: '#1a1c22' }),
  heavy: lambert({ color: '#23262e' }), // iron crates: the ones the claw cannot keep
}

// Prizes are the treasure: the brightest things in the cabinet. Bone twice to weight it.
export const PRIZE_MATS = ['#d8cfc0', '#c98a3a', '#a33a3a', '#6f8fb0', '#4f8a80', '#d8cfc0'].map((color) =>
  lambert({ color }),
)

export function makeLampMaterial() {
  return lambert({ color: COLORS.amber, emissive: COLORS.amber, emissiveIntensity: 0.8 })
}
