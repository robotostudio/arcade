// The cabinet face as one CanvasTexture drawn once on mount: the yellow bulb marquee
// with the title, the maroon MAJOR PRIZE banner above the glass, the blue side columns
// of circles, the dark red glass with its dim squares, and the MINOR PRIZE band in the
// gap under row 10. One plane, one draw call. World layout constants live here too so
// the texture and the 3D grid agree.
import { CanvasTexture, LinearFilter, NearestFilter, SRGBColorSpace } from 'three'
import { H, W } from '@/machines/stacker/logic'

export const BODY_W = 2.0
export const BODY_D = 1.0
export const BODY_H = 4.6
export const FACE_Z = BODY_D / 2
export const FACE_Y0 = 0.6 // the textured face covers y 0.6..4.6; below it is the deck
export const CELL = 0.2
export const BOX = 0.16
export const GRID_Y = 0.75 // bottom of row 0
export const MINOR_ROW = 10 // the pause fires with this many rows stacked
export const BAND = 0.2 // the MINOR PRIZE band sits in a gap this tall before row MINOR_ROW
export const GLASS_X = (W * CELL) / 2 // half-width of the glass (0.7)
const GRID_TOP = GRID_Y + H * CELL + BAND // 3.95
const MAJOR_Y = [GRID_TOP + 0.03, GRID_TOP + 0.23] as const
const MARQUEE_Y = [MAJOR_Y[1] + 0.02, BODY_H] as const

// Centre height of a row: the rows above the Minor line shift up by the band.
export function rowY(r: number): number {
  return GRID_Y + r * CELL + (r >= MINOR_ROW ? BAND : 0) + CELL / 2
}
export const MINOR_LINE_Y = GRID_Y + MINOR_ROW * CELL + BAND / 2 // centre of the band (2.85)

const PX = 256 // pixels per metre
const CW = BODY_W * PX // 512
const CH = (BODY_H - FACE_Y0) * PX // 1024

const px = (x: number) => (x + BODY_W / 2) * PX
const py = (y: number) => (BODY_H - y) * PX

const YELLOW = '#f2c230'
const MAROON = '#7a1020'
const BLUE = '#1b3f9c'
const GLASS = '#2a0507'
const DIM_CELL = '#4a0a0e'
const FONT = 'Impact, "Arial Black", "Helvetica Neue", Arial, sans-serif'

function banner(ctx: CanvasRenderingContext2D, text: string, x0: number, x1: number, y0: number, y1: number) {
  ctx.fillStyle = MAROON
  ctx.fillRect(px(x0), py(y1), (x1 - x0) * PX, (y1 - y0) * PX)
  ctx.strokeStyle = YELLOW
  ctx.lineWidth = 3
  ctx.strokeRect(px(x0) + 3, py(y1) + 3, (x1 - x0) * PX - 6, (y1 - y0) * PX - 6)
  ctx.fillStyle = YELLOW
  ctx.font = `bold ${Math.round((y1 - y0) * PX * 0.62)}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, px((x0 + x1) / 2), py((y0 + y1) / 2) + 2)
}

export function drawFace(ctx: CanvasRenderingContext2D) {
  // Blue flanks with columns of circles.
  ctx.fillStyle = BLUE
  ctx.fillRect(0, 0, CW, CH)
  for (const cx of [-(GLASS_X + (BODY_W / 2 - GLASS_X) / 2), GLASS_X + (BODY_W / 2 - GLASS_X) / 2]) {
    for (let y = GRID_Y + 0.1; y < GRID_TOP; y += CELL) {
      ctx.beginPath()
      ctx.arc(px(cx), py(y), 0.085 * PX, 0, Math.PI * 2)
      ctx.fillStyle = Math.round((y - GRID_Y) / CELL) % 2 === 0 ? '#8ec0ff' : '#f4f7ff'
      ctx.fill()
    }
  }

  // Glass: dark red with every square faintly there.
  ctx.fillStyle = GLASS
  ctx.fillRect(px(-GLASS_X), py(GRID_TOP), 2 * GLASS_X * PX, (GRID_TOP - FACE_Y0) * PX)
  ctx.fillStyle = DIM_CELL
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const x = (c - (W - 1) / 2) * CELL
      ctx.fillRect(px(x - BOX / 2), py(rowY(r) + BOX / 2), BOX * PX, BOX * PX)
    }
  }

  // Banners and marquee.
  banner(ctx, 'MINOR PRIZE', -GLASS_X, GLASS_X, MINOR_LINE_Y - BAND / 2, MINOR_LINE_Y + BAND / 2)
  banner(ctx, 'MAJOR PRIZE', -GLASS_X, GLASS_X, MAJOR_Y[0], MAJOR_Y[1])

  ctx.fillStyle = YELLOW
  ctx.fillRect(0, py(MARQUEE_Y[1]), CW, (MARQUEE_Y[1] - MARQUEE_Y[0]) * PX)
  const bulbR = 0.035 * PX
  for (let x = -BODY_W / 2 + 0.07; x < BODY_W / 2; x += 0.14) {
    for (const y of [MARQUEE_Y[1] - 0.05, MARQUEE_Y[0] + 0.05]) {
      ctx.beginPath()
      ctx.arc(px(x), py(y), bulbR, 0, Math.PI * 2)
      ctx.fillStyle = '#fff6d0'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#e07a10'
      ctx.stroke()
    }
  }
  ctx.fillStyle = MAROON
  ctx.font = `bold ${Math.round(0.19 * PX)}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('STACK TO THE TOP', CW / 2, py((MARQUEE_Y[0] + MARQUEE_Y[1]) / 2) + 2)
}

export function createFaceTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = CW
  canvas.height = CH
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  drawFace(ctx)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.magFilter = NearestFilter
  tex.minFilter = LinearFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}
