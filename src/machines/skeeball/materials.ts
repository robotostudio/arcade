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
  boardFrame: bodyMaterial('panel'),
  hole: litMaterial('#120608'),
  ball: unlitMaterial('#d41c1c'),
  ballStripe: unlitMaterial('#fff6d0'),
  glow: accentMaterial('skeeball'),
  dot: unlitMaterial('#8ec0ff'),
  dotAlt: unlitMaterial('#f4f7ff'),
  glowDim: unlitMaterial('#8ec0ff'),
  ledOff: unlitMaterial('#1c0b0e'),
  // Power gauge bars light cool to hot, bottom to top.
  ledRamp: ['#8ec0ff', '#8ec0ff', '#f4f7ff', '#f2c230', '#f2c230', '#ffa033', '#ff6a3a', '#ff3a2a'].map((hex) => unlitMaterial(hex)),
  ring10: unlitMaterial('#d41c1c'),
  ring20: unlitMaterial('#8ec0ff'),
  ring30: unlitMaterial('#f4f7ff'),
  ring40: unlitMaterial('#f2c230'),
  ring50: unlitMaterial('#ffd24a'),
  ring100: unlitMaterial('#ff6a3a'),
  hit: unlitMaterial('#ffffff'),
}
