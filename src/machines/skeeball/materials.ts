import { accentMaterial, bodyMaterial, litMaterial, unlitMaterial } from '@/world/livery'

// The Livery (issue 12): Plinth base and gutters, dark trim for the lane, board and backstop,
// cream panels for the rails and lane stripe, the body in the Skeeball Accent, and the Accent unlit
// for the edge strips, aim arrow and lit LEDs so the bloom lifts them. Ring colours, the ball, the
// LED-off shade, the hit flash and the flank dots stay Skeeball's own hexes, snapped like the rest.
export const SKEE_MATS = {
  cabinet: bodyMaterial('skeeball'),
  cabinetMid: bodyMaterial('plinth'),
  cabinetDark: bodyMaterial('trim'),
  side: bodyMaterial('skeeball'),
  trim: accentMaterial('skeeball'),
  wood: bodyMaterial('trim'),
  woodDark: bodyMaterial('panel'),
  woodStripe: bodyMaterial('panel'),
  gutter: bodyMaterial('plinth'),
  board: bodyMaterial('trim'),
  hole: litMaterial('#120608'),
  ball: unlitMaterial('#d41c1c'),
  ballStripe: unlitMaterial('#fff6d0'),
  glow: accentMaterial('skeeball'),
  dot: unlitMaterial('#8ec0ff'),
  dotAlt: unlitMaterial('#f4f7ff'),
  ledOff: unlitMaterial('#4a1010'),
  ledOn: accentMaterial('skeeball'),
  ring10: unlitMaterial('#d41c1c'),
  ring20: unlitMaterial('#8ec0ff'),
  ring30: unlitMaterial('#f4f7ff'),
  ring40: unlitMaterial('#f2c230'),
  ring50: unlitMaterial('#ffd24a'),
  ring100: unlitMaterial('#ff6a3a'),
  hit: unlitMaterial('#ffffff'),
}
