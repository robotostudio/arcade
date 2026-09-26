import { MeshBasicMaterial, MeshLambertMaterial } from 'three'

// Same cabinet language as Stack to the Top: maroon body, blue flanks, unlit yellow
// trim. The face and the ball stay MeshBasic so they read through the Room lights.
const lambert = (color: string) => new MeshLambertMaterial({ color })
const basic = (color: string) => new MeshBasicMaterial({ color })

export const SKEE_MATS = {
  cabinet: lambert('#3a0a10'),
  cabinetMid: lambert('#120608'),
  cabinetDark: lambert('#241014'),
  side: lambert('#1b3f9c'),
  trim: basic('#f2c230'),
  wood: lambert('#241014'),
  woodDark: lambert('#3a0a10'),
  woodStripe: basic('#f2c230'),
  gutter: lambert('#120608'),
  board: lambert('#2a0507'),
  boardFrame: lambert('#7a1020'),
  hole: lambert('#120608'),
  ball: basic('#d41c1c'),
  ballStripe: basic('#fff6d0'),
  glow: basic('#f2c230'),
  glowDim: basic('#8ec0ff'),
  dot: basic('#8ec0ff'),
  dotAlt: basic('#f4f7ff'),
  ledOff: basic('#4a1010'),
  ledOn: basic('#f2c230'),
  ring10: basic('#d41c1c'),
  ring20: basic('#8ec0ff'),
  ring30: basic('#f4f7ff'),
  ring40: basic('#f2c230'),
  ring50: basic('#ffd24a'),
  ring100: basic('#ff6a3a'),
  hit: basic('#ffffff'),
}
