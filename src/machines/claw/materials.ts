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
  aim: lambert({
    color: COLORS.amber,
    emissive: COLORS.amber,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  }),
  pitFloor: lambert({ color: '#1a1c22' }),
}

// Prizes are the treasure: the brightest things in the cabinet. Bone twice to weight it.
export const PRIZE_MATS = ['#d8cfc0', '#c98a3a', '#a33a3a', '#6f8fb0', '#4f8a80', '#d8cfc0'].map((color) =>
  lambert({ color }),
)

export function makeLampMaterial() {
  return lambert({ color: COLORS.amber, emissive: COLORS.amber, emissiveIntensity: 0.8 })
}
