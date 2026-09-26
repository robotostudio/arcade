// Stack to the Top materials, one instance per colour. The cabinet is the one bright
// object in the dark Room, so the face and the cells are unlit (MeshBasicMaterial):
// they read the same whatever the Room's lights do. The body stays Lambert.
import { Color, MeshBasicMaterial, MeshLambertMaterial } from 'three'

export const materials = {
  body: new MeshLambertMaterial({ color: '#3a0a10' }), // maroon cabinet
  side: new MeshLambertMaterial({ color: '#1b3f9c' }), // blue flanks
  plinth: new MeshLambertMaterial({ color: '#120608' }),
  deck: new MeshLambertMaterial({ color: '#241014' }),
  trim: new MeshBasicMaterial({ color: '#f2c230' }), // yellow edge strips, unlit like the marquee
  cell: new MeshBasicMaterial({ color: '#ffffff' }), // tinted per instance
  stop: new MeshBasicMaterial({ color: '#ff2a2a' }),
  take: new MeshBasicMaterial({ color: '#e8f0ff' }),
  risk: new MeshBasicMaterial({ color: '#f2c230' }),
  hit: new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
}

// Cell tints, allocated once. Brighter than the Stacker's: this face glows.
export const cellColors = {
  placed: new Color('#d41c1c'),
  moving: new Color('#ff6a3a'),
  gold: new Color('#ffd24a'),
  miss: new Color('#4a1010'),
}
