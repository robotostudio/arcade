import { MeshLambertMaterial } from 'three'
import { psxify } from '@/world/look/psx-material'
import { COLORS, MATERIALS } from '@/world/palette'

// Skeeball materials, one shared psxified MeshLambertMaterial per colour (psx-look.md section 2).
// Palette colours reuse the shared MATERIALS instance; off-palette ones are made here once.
const lambert = (p: ConstructorParameters<typeof MeshLambertMaterial>[0]) => psxify(new MeshLambertMaterial(p))

export const SKEE_MATS = {
  lane: lambert({ color: '#4a3a2a' }), // warm dark wood
  laneStripe: MATERIALS.bone,
  ramp: lambert({ color: '#5a4632' }), // a shade lighter so the slope reads against the lane
  wall: MATERIALS.stone,
  trough: lambert({ color: '#1a1c22' }), // shelves, risers, well floor
  lip: MATERIALS.slate,
  divider: MATERIALS.slate,
  plate: MATERIALS.void, // dark inset behind the amber digits
  plateFrame: MATERIALS.bone,
  ringGlow: lambert({ color: COLORS.amber, emissive: COLORS.amber, emissiveIntensity: 0.9 }), // lit trough lamp / digits
  ringDim: lambert({ color: COLORS.amber, emissive: COLORS.amber, emissiveIntensity: 0.25 }), // unlit trough lamp
  meter: lambert({ color: COLORS.bone, emissive: COLORS.bone, emissiveIntensity: 0.8 }),
  arrow: lambert({ color: COLORS.amber, emissive: COLORS.amber, emissiveIntensity: 0.8 }),
  ball: lambert({ color: COLORS.bone, emissive: COLORS.bone, emissiveIntensity: 0.15 }),
  button: lambert({ color: COLORS.bone, emissive: COLORS.bone, emissiveIntensity: 0.3 }),
  marquee: lambert({ color: COLORS.amber, emissive: COLORS.amber, emissiveIntensity: 0.6 }),
  glass: lambert({ color: COLORS.bone, transparent: true, opacity: 0.05, depthWrite: false }),
}
