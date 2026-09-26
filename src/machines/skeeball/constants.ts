// Skeeball tuning. Machine-local metres, y up, origin = floor centre,
// player stands at +z and rolls toward -z. Issue 05 / physics recipe §2.
// Hero scale: a real alley (3 m long, 3" ball) blown up ~1.6x so the cabinet
// tops out level with the Claw and Stack to the Top in the hub.
export const SKEE = {
  balls: 9,
  ballR: 0.07,
  gravity: 12, // a touch over 9.81 so the ball arcs heavy, like a bowling ball
  aimAmp: (4.5 * Math.PI) / 180,
  aimGain: 3, // the arrow draws the aim this many times wider than the physical sweep
  aimOmega: 1.5,
  powerOmega: 2.15,
  minSpeed: 4.7, // m/s at release, along the lane
  maxSpeed: 6.4,
  rollDrag: 0.12, // 1/s of rolling resistance while on the lane; rapier has none
  swingLen: 0.9, // arm from shoulder to ball
  swingBack: (70 * Math.PI) / 180, // backswing at full power
  swingSecs: 0.18,
  grace: 0.15,
  flightSecs: 4.5,
  afterScore: 0.5,
  resultSecs: 2.2,
  lane: {
    startZ: 1.5, // foul line
    y0: 0.8, // lane surface at the foul line
    run: 2.5,
    slope: (10 * Math.PI) / 180,
    width: 0.7,
    thick: 0.07,
  },
  // Ball jump at the top of the lane: an arc that bends the roll up into flight.
  hump: { radius: 0.82, exit: (38 * Math.PI) / 180, segments: 6 },
  gap: 0.13, // open drop between the hump and the ring board
} as const

export type Segment = { center: [number, number, number]; angle: number; length: number }

// Surface profile in (z, y): the straight lane then the hump arc. Each segment is a
// slab whose top face is the rolling surface; colliders and meshes both read this.
export function laneSegments(): Segment[] {
  const { startZ, y0, run, slope, thick } = SKEE.lane
  const segs: Segment[] = []
  const slab = (z0: number, y0_: number, z1: number, y1: number, overlap = 0) => {
    const length = Math.hypot(z1 - z0, y1 - y0_) + overlap
    const angle = Math.atan2(y1 - y0_, z0 - z1)
    // Rotated [angle, 0, 0], the slab's up is (0, cos, sin); sink it half a thickness along that.
    segs.push({
      center: [0, (y0_ + y1) / 2 - Math.cos(angle) * (thick / 2), (z0 + z1) / 2 - Math.sin(angle) * (thick / 2)],
      angle,
      length,
    })
  }
  const top = { z: startZ - run * Math.cos(slope), y: y0 + run * Math.sin(slope) }
  slab(startZ, y0, top.z, top.y)
  const { radius, exit, segments } = SKEE.hump
  let prev = top
  for (let i = 1; i <= segments; i++) {
    const a = slope + ((exit - slope) * i) / segments
    const p = {
      z: top.z - radius * (Math.sin(a) - Math.sin(slope)),
      y: top.y + radius * (Math.cos(slope) - Math.cos(a)),
    }
    slab(prev.z, prev.y, p.z, p.y, 0.01)
    prev = p
  }
  return segs
}

export function laneTop() {
  const { startZ, y0, run, slope } = SKEE.lane
  return { z: startZ - run * Math.cos(slope), y: y0 + run * Math.sin(slope) }
}

export function humpEnd() {
  const top = laneTop()
  const { radius, exit } = SKEE.hump
  const s = SKEE.lane.slope
  return {
    z: top.z - radius * (Math.sin(exit) - Math.sin(s)),
    y: top.y + radius * (Math.cos(s) - Math.cos(exit)),
  }
}

// Where the ball leaves the swing: on the lane just past the foul line.
export function releasePoint() {
  const { startZ, y0, slope } = SKEE.lane
  const s = 0.14
  return {
    x: 0,
    y: y0 + s * Math.sin(slope) + SKEE.ballR / Math.cos(slope) + 0.005,
    z: startZ - s * Math.cos(slope),
  }
}

// Underhand pendulum: the shoulder hangs straight above the release point.
export function swingPoint(phi: number) {
  const r = releasePoint()
  const L = SKEE.swingLen
  return { x: r.x, y: r.y + L * (1 - Math.cos(phi)), z: r.z + L * Math.sin(phi) }
}

// Bottom edge of the ring board, past the gap.
export function lip() {
  const h = humpEnd()
  return { y: h.y - 0.06, z: h.z - SKEE.gap }
}

// Scoring face after the gap. Steep so stacked holes read from the dock.
export const BOARD = { run: 1.1, rise: 1.0, thick: 0.08, width: 1.3 } as const

export function boardTheta() {
  return Math.atan2(BOARD.rise, BOARD.run)
}

export function onBoard(x: number, s: number, lift = 0): [number, number, number] {
  const end = lip()
  const slope = BOARD.rise / BOARD.run
  return [x, end.y + slope * s + lift, end.z - s]
}

// A ball below this has dropped into the gap trough or off the machine.
export function missY() {
  return lip().y - 0.3
}

export type HoleMat = 'ring10' | 'ring20' | 'ring30' | 'ring40' | 'ring50' | 'ring100'

export type Hole = {
  value: number
  x: number
  s: number
  r: number
  mat: HoleMat
}

// Classic stacked cups, not a dartboard. 10 is the wide lower hole; 50/100s sit at the top.
export const HOLES: Hole[] = [
  { value: 10, x: 0, s: 0.22, r: 0.17, mat: 'ring10' },
  { value: 20, x: 0, s: 0.5, r: 0.12, mat: 'ring20' },
  { value: 30, x: 0, s: 0.72, r: 0.105, mat: 'ring30' },
  { value: 40, x: 0, s: 0.89, r: 0.09, mat: 'ring40' },
  { value: 50, x: 0, s: 1.03, r: 0.075, mat: 'ring50' },
  { value: 100, x: -0.33, s: 1.0, r: 0.056, mat: 'ring100' },
  { value: 100, x: 0.33, s: 1.0, r: 0.056, mat: 'ring100' },
]

export const CABINET = { width: 1.7, backZ: -2.75, towerH: 3.5, marqueeH: 0.46 } as const

// Player's eye behind the foul line, looking down the alley at the rings.
export const DOCK = {
  position: [0, 2.7, 4.6] as const,
  target: [0, 1.3, -1.1] as const,
}
