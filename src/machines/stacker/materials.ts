// Shared Stacker materials: one instance per colour, Lambert (Gouraud), no flatShading.
// Colours for the grid cells go through instanceColor; the cell material stays white.
import { Color, MeshBasicMaterial, MeshLambertMaterial } from 'three'

export const materials = {
  body: new MeshLambertMaterial({ color: '#2b201c' }), // muddy brown cabinet
  bezel: new MeshLambertMaterial({ color: '#0c0909' }), // near-black screen surround
  trim: new MeshLambertMaterial({ color: '#5a4a36' }), // brass-ish edge strips
  plinth: new MeshLambertMaterial({ color: '#16110f' }),
  marquee: new MeshLambertMaterial({ color: '#3a0e0e', emissive: '#6a1212' }), // glowing blood-red sign
  cell: new MeshLambertMaterial({ color: '#ffffff', emissive: '#1a0606' }), // tinted per instance
  hit: new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), // invisible click target
}

// Cell tints, allocated once (never inside useFrame).
export const cellColors = {
  placed: new Color('#8a1c1c'), // blood red
  moving: new Color('#e0482a'), // brighter red-orange for the sliding row
  gold: new Color('#e6b84a'), // the winning top row
  miss: new Color('#3a1a14'), // the row that missed, shown dim while the result is up
}
