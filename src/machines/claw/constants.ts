// Claw machine tuning. Machine-local metres, y up, origin = floor centre of the
// cabinet, player stands at +z looking toward -z.
export const CLAW = {
  cabinet: { w: 3.0, h: 3.6, d: 2.6 }, // outer size, glass box above a 0.9 m base
  baseH: 0.9, // pit floor is at y = baseH
  bounds: { x: [-1.05, 1.05], z: [-0.85, 0.85] }, // head travel
  homeXZ: [0, 0],
  homeY: 3.1,
  floorY: 1.3, // lowest head y; mouth (head - 0.25) = 1.05, level with resting prize centres
  speed: 1.4, // m/s while a key is held: crosses the pit in about 1.5 s
  tapNudge: 0.12, // m per key tap, glided in at nudgeSpeed
  nudgeSpeed: 1.8, // m/s
  dropSpeed: 2.0,
  riseSpeed: 1.3, // m/s
  closeTime: 0.45,
  releaseTime: 0.35, // s
  chuteXZ: [-1.0, 0.75],
  chuteSize: [0.55, 0.3, 0.55], // chute sensor centre (x,z) and box size; chute sits at pit floor front-left
  grabRadius: 0.22,
  reach: 0.26, // a prize centre within this of the mouth gets grabbed (grabRadius + fingers)
  // Odds are decided at close time, not by a per-frame roll, so a miss is legible: the prize
  // lifts, dangles, and drops back into the pile during the rise.
  holdChance: { centred: 0.6, edge: 0.1 }, // P(hold) for a dead-centre grab and one at the reach limit; linear between
  slipWindow: [0.15, 1.8], // s after the grab in which a failed grab lets go (rise is ~1.4 s)
  heavyCount: 3, // dark crates: the claw always drops them a moment into the rise
  heavySlipWindow: [0.25, 0.6],
  payout: 100,
  prizeCount: 14,
} as const
