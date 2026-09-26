import { LIVERY, accentMaterial, bodyMaterial, litMaterial, unlitMaterial } from '@/world/livery'
import { DECAL } from '@/world/look/psx-material'

// Claw materials on the Livery factory (issue 12). The cabinet shell takes bodyMaterial /
// accentMaterial directly in Cabinet.tsx; these are the colours the mechanism, pit and prizes own.
// Every instance is shared and snapped by the factory (psx-look.md section 2).
export const CLAW_MATS = {
  // rig
  steel: litMaterial('#48505e'),
  darkSteel: bodyMaterial('trim'),
  brass: litMaterial('#c98a3a'),
  // Aim marker: a dark shadow disc under the head plus an Accent ring; the ring swaps to aimLock
  // when a drop from here would reach a prize. Transparent so the ring sorts after the shadow disc
  // instead of being darkened by it. Hex from the table: the panel does not repaint these live.
  aimShadow: unlitMaterial('#171535', { transparent: true, opacity: 0.7, depthWrite: false }),
  aimRing: unlitMaterial(LIVERY.claw, { transparent: true, depthWrite: false }),
  aimLock: unlitMaterial(LIVERY.text, { transparent: true, depthWrite: false }),
  // pit and chute
  pitFloor: litMaterial('#1a1c22', DECAL), // lies on the base box top
  hole: unlitMaterial('#171535'), // the chute opening: a true dark, no lighting
  rim: accentMaterial('claw'), // lit rim around the chute hole: the target
  // prizes
  heavy: litMaterial('#23262e'), // iron crates: the ones the claw cannot keep
  band: litMaterial('#6b7686'), // riveted band on the iron crates
  lid: litMaterial('#d8cfc0'), // can lids
}

// Prizes are the treasure: the brightest things in the cabinet. Bone twice to weight it.
export const PRIZE_MATS = ['#d8cfc0', '#c98a3a', '#a33a3a', '#6f8fb0', '#4f8a80', '#d8cfc0'].map((hex) => litMaterial(hex))
