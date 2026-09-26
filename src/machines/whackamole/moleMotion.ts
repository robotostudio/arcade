// Presentation-only spring for a Mole. The Round still lives in whackLogic; this just
// makes a Pop arrive with weight and a Whack knock the body back down.

export type MoleMotion = {
  y: number
  v: number
  x: number
  xv: number
  roll: number
  rv: number
  falling: boolean
}

export const stillMole = (): MoleMotion => ({ y: 0, v: 0, x: 0, xv: 0, roll: 0, rv: 0, falling: false })

export function stepMole(m: MoleMotion, up: boolean, whacked: boolean, dt: number) {
  if (whacked && !m.falling) {
    m.falling = true
    m.v = 2.6
    m.xv = (Math.random() * 2 - 1) * 0.7
    m.rv = (Math.random() * 2 - 1) * 7
  }
  let left = Math.min(Math.max(dt, 0), 0.1)
  while (left > 0) {
    const s = Math.min(left, 1 / 60)
    left -= s
    if (m.falling) {
      m.v -= 30 * s
      m.y += m.v * s
      m.x += m.xv * s
      m.xv -= m.xv * 2.2 * s
      m.roll += m.rv * s
      m.rv -= m.rv * 1.5 * s
      if (m.y <= 0) {
        m.y = 0
        m.v = 0
        m.x = 0
        m.xv = 0
        m.roll = 0
        m.rv = 0
        m.falling = false
      }
      continue
    }
    const target = up ? 1 : 0
    const k = up ? 58 : 46
    const d = up ? 7.6 : 13
    m.v += ((target - m.y) * k - m.v * d) * s
    m.y += m.v * s
    if (m.y < 0) {
      m.y = 0
      if (m.v < 0) m.v = 0
    }
    m.rv += (m.v * 1.2 - m.roll * 34 - m.rv * 5.5) * s
    m.roll += m.rv * s
    m.x -= m.x * 6 * s
  }
}
