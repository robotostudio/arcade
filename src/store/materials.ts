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
  // Item silhouettes
  bone: lambert('#e8e4d8'),
  red: lambert('#8c2a22'),
  canvas: lambert('#c9b98f'),
  hoodie: lambert('#2a3550'),
  roboBlue: lambert('#3d7bff'),
  ceramic: lambert('#d8d2c2'),
  plinth: lambert('#2b2724'),
  glow: lambert('#ffd76a', { emissive: new THREE.Color('#c08a10'), emissiveIntensity: 0.9 }),
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
