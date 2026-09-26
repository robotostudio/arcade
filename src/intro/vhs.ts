'use client'

// A VHS capture of a 240p console: the page is drawn clean into `src`, then this pass copies it to the
// visible canvas through the tape. Everything runs on one 320x240 ImageData, so a per-pixel loop is cheap.
export const W = 320
export const H = 240

export type VhsOptions = {
  time: number // seconds since the tape started
  chroma: number // colour bleed in px (red drifts right, blue left)
  tear: number // 0..1 landing tape-switch tear
  still: boolean // prefers-reduced-motion: no jitter, tear or flicker
}

let seed = 1
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

const rowShift = new Float32Array(H)
const rowGain = new Float32Array(H)

export function vhs(src: CanvasRenderingContext2D, out: CanvasRenderingContext2D, image: ImageData, o: VhsOptions) {
  const input = src.getImageData(0, 0, W, H).data
  const px = image.data
  const t = o.time
  seed = (Math.floor(t * 60) * 7919) % 2147483647 || 1

  // Per-line horizontal displacement: slow wobble, a rolling tracking band, the head-switch band at the
  // bottom, and on landing a tape tear that rips the frame sideways in slabs.
  const bandY = ((t * 23) % (H + 80)) - 40
  const flicker = o.still ? 1 : 1 + Math.sin(t * 50.3) * 0.012 + (rand() - 0.5) * 0.03
  let slab = 0
  for (let y = 0; y < H; y++) {
    let shift = 0
    let gain = flicker
    if (!o.still) {
      shift += Math.sin(y * 0.09 + t * 2.1) * 0.3 + (rand() - 0.5) * 0.3
      const d = Math.abs(y - bandY)
      if (d < 6) { shift += (6 - d) * 0.55 * (rand() - 0.3); gain += (6 - d) * 0.018 }
      if (y > H - 7) shift += (y - (H - 7)) * 2.2 + rand() * 4
      if (o.tear > 0) {
        if (y % 12 === 0) slab = (rand() - 0.5) * 2
        shift += slab * o.tear * o.tear * 90 + Math.sin(y * 0.05 + t * 30) * o.tear * 12
        const roll = ((y / H + t * 1.7) % 1)
        if (roll < 0.08) gain += o.tear * 0.9
      }
    }
    rowShift[y] = shift
    rowGain[y] = gain
  }

  const cr = o.chroma
  for (let y = 0; y < H; y++) {
    const shift = rowShift[y]
    const gain = rowGain[y]
    const row = y * W
    const headSwitch = !o.still && y > H - 7
    for (let x = 0; x < W; x++) {
      const sx = x - shift
      // Luma smear: VHS trails to the right, so blend with the pixel just behind.
      const i0 = (row + clampX(sx)) * 4
      const i1 = (row + clampX(sx - 1)) * 4
      const r = (input[(row + clampX(sx - cr)) * 4] * 0.6 + input[(row + clampX(sx - cr - 1.5)) * 4] * 0.4)
      const g = input[i0 + 1] * 0.72 + input[i1 + 1] * 0.28
      const b = (input[(row + clampX(sx + cr)) * 4 + 2] * 0.6 + input[(row + clampX(sx + cr + 1.5)) * 4 + 2] * 0.4)
      const grain = (rand() - 0.5) * (headSwitch ? 90 : 14)
      const o4 = (row + x) * 4
      // Crushed blacks lifted to tape black; whites washed a touch.
      px[o4] = lift(r * gain + grain)
      px[o4 + 1] = lift(g * gain + grain)
      px[o4 + 2] = lift(b * gain + grain * 1.1)
      px[o4 + 3] = 255
    }
  }
  out.putImageData(image, 0, 0)
}

function clampX(x: number) {
  const i = x | 0
  return i < 0 ? 0 : i >= W ? W - 1 : i
}

function lift(v: number) {
  const c = 7 + v * 0.93
  return c < 0 ? 0 : c > 255 ? 255 : c
}
