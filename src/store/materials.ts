// The Store's materials. The counter wears the Livery (Plinth, trim, cream panels, Display frame)
// through the shared factory, so the ?livery=1 panel repaints it live; the Store has no Accent.
// Tier rings and piles keep White, Blue, Gold as the Store's own colours, wrapped in psxify so they
// take the vertex snap. psx-look.md: Lambert without flatShading (Gouraud). Module-level, never per render.
import * as THREE from 'three'
import { accentMaterial, bodyMaterial } from '@/world/livery'
import { psxify } from '@/world/look/psx-material'
import { TIER_HEX } from './items'

export const MAT = {
  plinth: bodyMaterial('plinth'), // counter body
  trim: bodyMaterial('trim'), // kick plate, shelving, uprights, sign chains
  panel: bodyMaterial('panel'), // cream: the top slab and the counter's front panel
  frame: bodyMaterial('frame'), // the sign board
  glow: accentMaterial('text'), // sign lettering and the selected-Item marker: cream the bloom lifts
} as const

const lambert = (color: string, extra: THREE.MeshLambertMaterialParameters = {}) =>
  psxify(new THREE.MeshLambertMaterial({ color, ...extra }))

// Garment piles: folded flats in the Tier colour, two shades so the layers read.
// Every Tier glows (emissive top flat catches the bloom), not just Gold.
export const PILE = {
  white: [lambert('#e8e4d8', { emissive: new THREE.Color('#5a5648'), emissiveIntensity: 0.5 }), lambert('#bfb9a8')],
  blue: [lambert('#3d7bff', { emissive: new THREE.Color('#1a3a8a'), emissiveIntensity: 0.5 }), lambert('#2a54b8')],
  gold: [lambert('#f2c14e', { emissive: new THREE.Color('#5a4000'), emissiveIntensity: 0.5 }), lambert('#c9962a')],
} as const

// Tier rings under each Item: shiny and lit in the Tier colour.
const ring = (color: string, emissive: string) =>
  psxify(new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.25, emissive: new THREE.Color(emissive), emissiveIntensity: 0.6 }))

export const RING = {
  white: ring(TIER_HEX.white, '#6a6650'),
  blue: ring(TIER_HEX.blue, '#1d3b8a'),
  gold: ring(TIER_HEX.gold, '#7a5a00'),
} as const
