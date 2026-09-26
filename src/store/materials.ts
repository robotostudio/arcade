// Shared material instances for the Store counter, one per colour.
// psx-look.md: Lambert without flatShading (Gouraud). Module-level, never created per render.
import * as THREE from 'three'
import { TIER_HEX } from './items'

const lambert = (color: string, extra: THREE.MeshLambertMaterialParameters = {}) =>
  new THREE.MeshLambertMaterial({ color, ...extra })

export const MAT = {
  body: lambert('#4a3a2c'), // muddy brown counter body
  slab: lambert('#6b665e'), // stone grey top slab
  shelf: lambert('#3a2e24'), // dark wood shelving
  sign: lambert('#1c1a20', { emissive: new THREE.Color('#0c1a3a') }),
  signText: lambert('#3d7bff', { emissive: new THREE.Color('#1d3b8a') }),
  marker: lambert('#f2ecd8', { emissive: new THREE.Color('#6a6250') }),
  plinth: lambert('#2b2724'),
} as const

// Garment piles: folded flats in the Tier colour, two shades so the layers read.
export const PILE = {
  white: [lambert('#e8e4d8'), lambert('#bfb9a8')],
  blue: [lambert('#3d7bff'), lambert('#2a54b8')],
  gold: [lambert('#f2c14e', { emissive: new THREE.Color('#5a4000'), emissiveIntensity: 0.5 }), lambert('#c9962a')],
} as const

// Tier rings under each Item.
export const RING = {
  white: lambert(TIER_HEX.white),
  blue: lambert(TIER_HEX.blue),
  gold: new THREE.MeshStandardMaterial({
    color: TIER_HEX.gold,
    metalness: 0.9,
    roughness: 0.25,
    emissive: new THREE.Color('#7a5a00'),
    emissiveIntensity: 0.6,
  }),
} as const
