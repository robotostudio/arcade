// Claw machine tuning. Machine-local metres, y up, origin = floor centre of the
// cabinet, player stands at +z looking toward -z.
export const CLAW = {
  cabinet: { w: 3.0, h: 3.6, d: 2.6 }, // outer size, glass box above a 0.9 m base
  baseH: 0.9, // pit floor is at y = baseH
  bounds: { x: [-1.05, 1.05], z: [-0.85, 0.85] }, // head travel
  homeXZ: [0, 0],
  homeY: 3.1,
  floorY: 1.3, // lowest head y; mouth (head - 0.25) = 1.05, level with resting prize centres
  speed: 1.0,
  dropSpeed: 2.0,
  riseSpeed: 1.3, // m/s
  closeTime: 0.45,
  releaseTime: 0.35, // s
  chuteXZ: [-1.0, 0.75],
  chuteSize: [0.55, 0.3, 0.55], // chute sensor centre (x,z) and box size; chute sits at pit floor front-left
  grabRadius: 0.22,
  slipChancePerSecond: 0.15, // rolled per frame during rise and carry
  payout: 100,
  prizeCount: 14,
} as const
