// Stack to the Top materials in the Livery (issue 12): the body and flanks in the one
// Accent, the shared Plinth and trim, the edge strips unlit in the Accent so the bloom
// lifts them. The deck buttons and the cells keep their own colours; the cells stay a
// white unlit material tinted per instance by paintGrid (psxify's program cache key is
// fixed, and three keeps an instanced variant of the program beside it).
import { Color, MeshBasicMaterial } from 'three'
import { accentMaterial, bodyMaterial, unlitMaterial } from '@/world/livery'

export const materials = {
  body: bodyMaterial('stacktop'),
  side: bodyMaterial('stacktop'),
  plinth: bodyMaterial('plinth'),
  deck: bodyMaterial('trim'),
  trim: accentMaterial('stacktop'),
  cell: unlitMaterial('#ffffff'), // tinted per instance
  stop: unlitMaterial('#ff2a2a'),
  take: unlitMaterial('#e8f0ff'),
  risk: unlitMaterial('#f2c230'),
  hit: new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
}

// Cell tints, allocated once. Brighter than the Stacker's: this face glows.
export const cellColors = {
  placed: new Color('#d41c1c'),
  moving: new Color('#ff6a3a'),
  gold: new Color('#ffd24a'),
  miss: new Color('#4a1010'),
}
