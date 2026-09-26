// Skeeball tuning. Machine-local metres, y up, origin = floor centre,
// player stands at +z and throws toward -z. Issue 05 / physics recipe §2.
export const SKEE = {
  balls: 9,
  ballR: 0.07,
  aimAmp: (18 * Math.PI) / 180,
  aimOmega: 1.45,
  powerOmega: 2.55,
  minSpeed: 4.8,
  maxSpeed: 8.6,
  hop: 1.15, // extra upward m/s at full power, added after the along-ramp velocity
  catchSpeed: 1.22,
  flightSecs: 4.6,
  afterScore: 0.85,
  resultSecs: 2.6,
  ramp: {
    startZ: 1.18,
    run: 1.62,
    rise: 0.3,
    width: 0.56,
    thick: 0.07,
    y0: 0.5,
  },
} as const

export function rampTheta() {
  return Math.atan2(SKEE.ramp.rise, SKEE.ramp.run)
}

export function rampLength() {
  return Math.hypot(SKEE.ramp.run, SKEE.ramp.rise)
}

export function rampCenter(): [number, number, number] {
  const { startZ, run, rise, y0, thick } = SKEE.ramp
  const theta = rampTheta()
  const h = thick / 2
  return [0, y0 + rise / 2 - Math.cos(theta) * h, startZ - run / 2 - Math.sin(theta) * h]
}

export function ballSpawn() {
  const { startZ, run, rise, y0 } = SKEE.ramp
  const s = 0.78
  return {
    x: 0,
    y: y0 + (rise / run) * s + SKEE.ballR + 0.01,
    z: startZ - s,
  }
}

export function lip() {
  const { startZ, run, rise, y0 } = SKEE.ramp
  return { y: y0 + rise, z: startZ - run }
}

// Scoring face after the lip. Steep so stacked holes read from the dock.
export const BOARD = { run: 0.98, rise: 1.12, thick: 0.08, width: 1.08 } as const

export function boardTheta() {
  return Math.atan2(BOARD.rise, BOARD.run)
}

export function onBoard(x: number, s: number, lift = 0): [number, number, number] {
  const end = lip()
  const slope = BOARD.rise / BOARD.run
  return [x, end.y + slope * s + lift, end.z - s]
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
  { value: 10, x: 0, s: 0.2, r: 0.152, mat: 'ring10' },
  { value: 20, x: 0, s: 0.46, r: 0.092, mat: 'ring20' },
  { value: 30, x: 0, s: 0.66, r: 0.08, mat: 'ring30' },
  { value: 40, x: 0, s: 0.84, r: 0.068, mat: 'ring40' },
  { value: 50, x: 0, s: 1.03, r: 0.056, mat: 'ring50' },
  { value: 100, x: -0.34, s: 1.03, r: 0.05, mat: 'ring100' },
  { value: 100, x: 0.34, s: 1.03, r: 0.05, mat: 'ring100' },
]

// Head-on, far enough back that both flanks and the marquee sit in frame.
export const DOCK = {
  position: [0, 2.15, 3.55] as const,
  target: [0, 1.35, -0.55] as const,
}
