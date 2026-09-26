import { MeshLambertMaterial } from 'three'
import { psxify } from './look/psx-material'

// Shared palette (first cut, issue 09). One material instance per colour, reused by every mesh.
// Sne owns this in Phase 2.
export const COLORS = {
  void: '#171535', // the Void is indigo, same as LOOK.void; never black
  floor: '#1c1f26',
  stone: '#2e3440',
  slate: '#48505e',
  steel: '#6b7686',
  bone: '#d8cfc0',
  amber: '#c98a3a',
  oxblood: '#6b1f1f',
} as const

export type PaletteColor = keyof typeof COLORS

const make = (color: string) => psxify(new MeshLambertMaterial({ color }))

export const MATERIALS: Record<PaletteColor, MeshLambertMaterial> = Object.fromEntries(
  Object.entries(COLORS).map(([k, c]) => [k, make(c)]),
) as Record<PaletteColor, MeshLambertMaterial>
