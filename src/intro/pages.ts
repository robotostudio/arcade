'use client'

import { H, W } from './vhs'
import type { IntroSound } from './sound'

// The six intro pages, each drawn clean at 320x240 and then run through the VHS pass.
// Everything here is original Fleekade material; only the late-90s console-capture look is borrowed.

export type PageEnv = {
  t: number // seconds into this page
  dur: number
  time: number // seconds since the tape started
  sound: IntroSound
  roomReady: boolean
  cue: (key: string, at: number, fn: () => void) => void // fire fn once when t passes `at`
  typed: (count: number) => void // typewriter tick when the count grows
}

export type Page = {
  id: string
  dur: number
  chroma: number
  holdUntilReady?: boolean
  draw: (ctx: CanvasRenderingContext2D, env: PageEnv) => void
}

export const PAGE_SECONDS = 6.5
const MONO = "'VT323', 'Courier New', monospace"
const TITLE = "'Bungee', 'Arial Black', Impact, sans-serif"
const SERIF = "Georgia, 'Times New Roman', serif"
const JP = "'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Noto Sans JP', 'MS Gothic', sans-serif"

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (a: number, b: number, v: number) => { const x = clamp01((v - a) / (b - a)); return x * x * (3 - 2 * x) }
const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3)

function fadeBlack(ctx: CanvasRenderingContext2D, alpha: number) {
  if (alpha <= 0) return
  ctx.globalAlpha = Math.min(1, alpha)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = 1
}

function spaced(ctx: CanvasRenderingContext2D, spacing: string) {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
  if ('letterSpacing' in c) c.letterSpacing = spacing
}

// ---------------------------------------------------------------------------------------------
// 0. Power gate (not a timed page): VCR on-screen display over tape black.
export function drawGate(ctx: CanvasRenderingContext2D, time: number) {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'alphabetic'
  ctx.font = `16px ${MONO}`
  ctx.fillStyle = '#e8e8e8'
  ctx.textAlign = 'left'
  ctx.fillText('PLAY ▶', 16, 24)
  ctx.textAlign = 'right'
  ctx.fillText('SP  0:00:00', W - 16, 24)
  ctx.textAlign = 'center'
  if (Math.floor(time * 1.6) % 2 === 0) {
    ctx.font = `22px ${MONO}`
    ctx.fillStyle = '#ffffff'
    ctx.fillText('PRESS START', W / 2, H / 2 + 4)
  }
  ctx.font = `12px ${MONO}`
  ctx.fillStyle = '#8f8f9a'
  ctx.fillText('CLICK OR PRESS ANY KEY · SOUND ON', W / 2, H / 2 + 24)
}

// ---------------------------------------------------------------------------------------------
// 1. Console boot: a flat-shaded low-poly ticket gem spins down to rest, then the system name.
type V3 = [number, number, number]
const GEM: V3[] = [[0, 1.25, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0, -1.25, 0]]
const GEM_FACES: [number, number, number, string][] = [
  [0, 2, 1, '#e7a64a'], [0, 3, 2, '#fff1c8'], [0, 4, 3, '#b8283a'], [0, 1, 4, '#2c5fd6'],
  [5, 1, 2, '#2c5fd6'], [5, 2, 3, '#b8283a'], [5, 3, 4, '#fff1c8'], [5, 4, 1, '#e7a64a'],
]
const LIGHT: V3 = norm([-0.5, 0.8, 0.9])

function norm(v: V3): V3 { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l] }
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * k)))
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`
}

function drawGem(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, yaw: number, pitch: number) {
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
  const pts = GEM.map(([x, y, z]) => {
    const x1 = x * cyw + z * syw
    const z1 = -x * syw + z * cyw
    const y2 = y * cp - z1 * sp
    const z2 = y * sp + z1 * cp
    return [x1, y2, z2] as V3
  })
  const faces = GEM_FACES.map(([a, b, c, col]) => {
    const A = pts[a], B = pts[b], C = pts[c]
    const u: V3 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]]
    const v: V3 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]]
    const n = norm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]])
    return { a: A, b: B, c: C, col, n, z: (A[2] + B[2] + C[2]) / 3 }
  }).filter((f) => f.n[2] > 0).sort((p, q) => p.z - q.z)
  const proj = (p: V3) => { const k = 3.2 / (3.2 - p[2] * 0.5); return [cx + p[0] * size * k, cy - p[1] * size * k] as const }
  for (const f of faces) {
    const lit = 0.38 + 0.8 * Math.max(0, f.n[0] * LIGHT[0] + f.n[1] * LIGHT[1] + f.n[2] * LIGHT[2])
    const [ax, ay] = proj(f.a), [bx, by] = proj(f.b), [qx, qy] = proj(f.c)
    ctx.beginPath()
    ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(qx, qy); ctx.closePath()
    ctx.fillStyle = shade(f.col, lit)
    ctx.fill()
    ctx.strokeStyle = shade(f.col, lit * 0.9)
    ctx.lineWidth = 0.6
    ctx.stroke()
  }
}

const boot: Page = {
  id: 'boot',
  dur: PAGE_SECONDS,
  chroma: 1.2,
  draw(ctx, env) {
    const { t } = env
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    env.cue('chime', 0.6, () => env.sound.boot())
    if (t < 0.6) return
    const k = easeOut((t - 0.6) / 2.6)
    // Spins fast, decelerates and settles three-quarters on, lifting as it grows.
    const yaw = 0.62 + (1 - k) * 9.5
    const pitch = 0.32 * k
    const size = 10 + 30 * easeOut((t - 0.6) / 1.4)
    const glow = ctx.createRadialGradient(W / 2, 98, 2, W / 2, 98, 70)
    glow.addColorStop(0, `rgba(255,214,150,${0.16 * k})`)
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)
    drawGem(ctx, W / 2, 98, size, yaw, pitch)
    const text = smooth(2.7, 3.5, t)
    if (text > 0) {
      ctx.globalAlpha = text
      ctx.textAlign = 'center'
      ctx.fillStyle = '#f2ede2'
      ctx.font = `bold 17px 'Helvetica Neue', Arial, sans-serif`
      spaced(ctx, '5px')
      ctx.fillText('FLEEKADE', W / 2 + 2, 168)
      ctx.font = `9px 'Helvetica Neue', Arial, sans-serif`
      spaced(ctx, '2px')
      ctx.fillStyle = '#a9a39a'
      ctx.fillText('ROBOTO ARCADE SYSTEM', W / 2 + 1, 184)
      spaced(ctx, '0px')
      ctx.globalAlpha = 1
    }
    fadeBlack(ctx, smooth(5.7, 6.4, t))
  },
}

// ---------------------------------------------------------------------------------------------
// 2 + 3. Case-file dossiers, typed out in VCR text.
type Line = { text: string; right?: string; gap?: number }

function dossier(id: string, lines: Line[]): Page {
  const total = lines.reduce((n, l) => n + l.text.length + (l.right?.length ?? 0), 0)
  return {
    id,
    dur: PAGE_SECONDS,
    chroma: 0.55,
    draw(ctx, env) {
      const { t } = env
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, W, H)
      // Types over ~3.4 s after a short beat, then holds so it can be read.
      const shown = Math.floor(clamp01((t - 0.35) / 3.4) * total)
      env.typed(shown)
      ctx.font = `13px ${MONO}`
      ctx.fillStyle = '#ecebe6'
      ctx.textBaseline = 'alphabetic'
      let left = shown
      let y = 26
      let cursor: [number, number] | null = null
      for (const line of lines) {
        y += line.gap ?? 0
        const n = Math.min(left, line.text.length)
        ctx.textAlign = 'left'
        const part = line.text.slice(0, n)
        ctx.fillText(part, 18, y)
        left -= n
        if (n < line.text.length && !cursor) cursor = [18 + ctx.measureText(part).width, y]
        if (line.right) {
          const m = Math.min(left, line.right.length)
          ctx.textAlign = 'right'
          ctx.fillText(line.right.slice(0, m), W - 18, y)
          left -= m
        }
        y += 12
      }
      if (cursor && Math.floor(env.time * 4) % 2 === 0) ctx.fillRect(cursor[0] + 1, cursor[1] - 9, 5, 10)
      fadeBlack(ctx, 1 - smooth(0, 0.25, t) + smooth(6.15, 6.5, t))
    },
  }
}

const dossierCrew = dossier('crew', [
  { text: 'SUBJECT: フリーケード (FLEEKADE)', right: '09/26/2026' },
  { text: 'COUNTRY OF ORIGIN: UNITED KINGDOM', right: '(01/02)' },
  { text: 'CURRENT STATUS: OPEN LATE' },
  { text: 'BUILT IN THREE HOURS', gap: 10 },
  { text: 'UNDER THE SUPERVISION OF:' },
  { text: 'SNE ...... STACK TO THE TOP, THE STORE', gap: 4 },
  { text: 'DANIEL ... SKEEBALL' },
  { text: 'JONO ..... CLAW, THE LOOK, THE HUB' },
  { text: 'DIVYA .... WHACK-A-MOLE (IN DEVELOPMENT)' },
  { text: 'FIELD NOTES:', gap: 10 },
  { text: '·PS1-ERA LOW-POLY DEMAKE' },
  { text: '·NO BACKEND. TICKETS LIVE ON YOUR MACHINE' },
])

const dossierGame = dossier('game', [
  { text: 'SUBJECT: フリーケード (FLEEKADE)', right: '09/26/2026' },
  { text: 'FORMAT: BROWSER ARCADE', right: '(02/02)' },
  { text: 'CURRENT STATUS: INSERT COIN' },
  { text: 'REPORT SUMMARY:', gap: 10 },
  { text: '·THREE CABINETS IN ONE LOW-POLY ROOM' },
  { text: '·CLAW, SKEEBALL, STACK TO THE TOP' },
  { text: '·EVERY ROUND PAYS TICKETS' },
  { text: '·TICKETS BUY CREDIT ON VINTAGE BUNDLES' },
  { text: '·WHITE / BLUE / GOLD PRIZE TIERS' },
  { text: '·1 TICKET = £0.10, UP TO 50% OFF' },
  { text: 'RECOMMENDATION:', gap: 10 },
  { text: '·STAY UNTIL CLOSING' },
])

// ---------------------------------------------------------------------------------------------
// 4. Studio card: grey-white card, monogram, italic serif wordmark, tagline. Heavy colour fringing.
const studio: Page = {
  id: 'studio',
  dur: PAGE_SECONDS,
  chroma: 2.4,
  draw(ctx, env) {
    const { t } = env
    const card = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 220)
    card.addColorStop(0, '#e4e3df')
    card.addColorStop(1, '#bdbcb8')
    ctx.fillStyle = card
    ctx.fillRect(0, 0, W, H)

    const cx = W / 2, cy = 86
    // A red ticket-oval threaded through a blue serif F: it passes in front of the letter on the upper
    // half and behind it on the lower half, like a ring through a link.
    const ring = (front: boolean) => {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, front ? 0 : cy, W, front ? cy : H - cy)
      ctx.clip()
      ctx.beginPath()
      ctx.ellipse(cx, cy, 36, 26, -0.35, 0, Math.PI * 2)
      ctx.strokeStyle = '#b01a22'
      ctx.lineWidth = 6
      ctx.stroke()
      ctx.restore()
    }
    ring(false)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold 96px ${SERIF}`
    ctx.fillStyle = '#2330c4'
    ctx.fillText('F', cx + 4, cy + 4)
    ring(true)

    ctx.textBaseline = 'alphabetic'
    ctx.font = `italic bold 34px ${SERIF}`
    ctx.fillStyle = '#16161a'
    spaced(ctx, '1px')
    ctx.fillText('ROBOTO', cx, 172)
    spaced(ctx, '0px')
    ctx.fillRect(cx - 88, 178, 176, 2)
    ctx.font = `11px ${JP}`
    ctx.fillStyle = '#2a2a2e'
    ctx.fillText('チケットを、あなたの手に', cx, 195)

    fadeBlack(ctx, 1 - smooth(0.05, 0.7, t) + smooth(6.0, 6.45, t))
  },
}

// ---------------------------------------------------------------------------------------------
// 5. Connecting: a console system dialog. Doubles as the real loading state: holds until the Room is up.
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const connecting: Page = {
  id: 'connecting',
  dur: PAGE_SECONDS,
  chroma: 0.8,
  holdUntilReady: true,
  draw(ctx, env) {
    const { t } = env
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    const x = 38, y = 78, w = W - 76, h = 62
    const panel = ctx.createLinearGradient(0, y, 0, y + h)
    panel.addColorStop(0, '#2f47c8')
    panel.addColorStop(1, '#1d2f9e')
    roundRect(ctx, x, y, w, h, 6)
    ctx.fillStyle = panel
    ctx.fill()
    ctx.strokeStyle = '#7d90f0'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold 11px ${JP}`
    ctx.fillText('コイン投入中', W / 2, y + 15)
    ctx.font = `12px ${MONO}`
    ctx.fillStyle = '#e9ecff'
    ctx.fillText('Warming up three cabinets. Keep the power', W / 2, y + 30)
    ctx.fillText('on and do not press RESET.', W / 2, y + 40)

    const step = Math.floor(t * 2.6) % 4
    env.cue(`dot-${Math.floor(t * 2.6)}`, Math.floor(t * 2.6) / 2.6, () => env.sound.blip(step === 3))
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i === step ? '#ffffff' : '#5d6fd6'
      ctx.fillRect(W / 2 - 15 + i * 9, y + 50, i === step ? 4 : 3, i === step ? 4 : 3)
    }

    // English subtitle line, as if burned in by whoever captured the tape.
    ctx.font = `italic 9px Arial, Helvetica, sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.fillText('Inserting coin – warming up the cabinets, please', W / 2, 192)
    ctx.fillText('keep the power on and do not press reset.', W / 2, 203)
    if (t > PAGE_SECONDS && !env.roomReady) {
      ctx.font = `12px ${MONO}`
      ctx.fillStyle = '#7d90f0'
      ctx.fillText('STILL LOADING THE ROOM…', W / 2, y + h + 18)
    }
    fadeBlack(ctx, 1 - smooth(0, 0.35, t))
  },
}

// ---------------------------------------------------------------------------------------------
// 6. Title screen: afternoon sky, drifting clouds, a sea band, a carved signboard logo and the menu.
function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const puffs: [number, number, number][] = [[0, 0, 11], [12, -5, 13], [26, -1, 10], [38, 3, 8], [-10, 4, 8], [18, 5, 11]]
  ctx.fillStyle = '#c9dcf2'
  for (const [dx, dy, r] of puffs) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s + 2, r * s, 0, Math.PI * 2); ctx.fill() }
  ctx.fillStyle = '#ffffff'
  for (const [dx, dy, r] of puffs) { ctx.beginPath(); ctx.arc(x + dx * s - 1, y + dy * s - 1, r * s * 0.92, 0, Math.PI * 2); ctx.fill() }
}

function drawTicket(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  const stub = (dx: number, dy: number, color: string) => {
    ctx.beginPath()
    ctx.rect(-16 + dx, -11 + dy, 32, 22)
    ctx.moveTo(-12 + dx, dy); ctx.arc(-16 + dx, dy, 4, 0, Math.PI * 2)
    ctx.moveTo(20 + dx, dy); ctx.arc(16 + dx, dy, 4, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill('evenodd')
  }
  stub(1, 1, '#3a1a0c')
  stub(0, 0, '#c52a2e')
  ctx.strokeStyle = '#ffe9b0'
  ctx.lineWidth = 1
  ctx.setLineDash([2, 2])
  ctx.strokeRect(-11, -7, 22, 14)
  ctx.setLineDash([])
  ctx.fillStyle = '#ffe9b0'
  ctx.font = `bold 11px ${SERIF}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('★', 0, 1)
  ctx.restore()
}

export function drawTitle(ctx: CanvasRenderingContext2D, env: Pick<PageEnv, 't' | 'time'> & Partial<PageEnv>) {
  const { t, time } = env
  const sky = ctx.createLinearGradient(0, 0, 0, 150)
  sky.addColorStop(0, '#2f6fd8')
  sky.addColorStop(0.65, '#8fbef0')
  sky.addColorStop(1, '#f3d9b6')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, 150)
  const drift = time * 4
  cloud(ctx, ((30 + drift) % 400) - 60, 44, 1)
  cloud(ctx, ((210 + drift * 0.7) % 400) - 60, 26, 0.8)
  cloud(ctx, ((300 + drift * 1.2) % 400) - 60, 70, 1.15)
  cloud(ctx, ((120 + drift * 0.5) % 400) - 60, 118, 0.7)

  const sea = ctx.createLinearGradient(0, 146, 0, H)
  sea.addColorStop(0, '#3d86c9')
  sea.addColorStop(1, '#0f3574')
  ctx.fillStyle = sea
  ctx.fillRect(0, 146, W, H - 146)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (let i = 0; i < 26; i++) {
    const row = i % 9
    const yy = 150 + row * 9 + (i % 3)
    const xx = ((i * 53 + Math.sin(time * 1.3 + i) * 6 + time * (8 + row)) % 360) - 20
    ctx.fillRect(xx, yy, 8 + (i % 4) * 4 - row * 0.6, 1)
  }

  // Signboard logo: plank, extrusion, outline, gold face. Drops in and settles.
  const drop = easeOut(t / 0.9)
  const scale = 1.25 - 0.25 * drop
  ctx.save()
  ctx.translate(W / 2, 72 - (1 - drop) * 14)
  ctx.scale(scale, scale)
  ctx.globalAlpha = clamp01(t / 0.35)
  const plank = (y: number, w: number, c: string) => { roundRect(ctx, -w / 2, y, w, 22, 5); ctx.fillStyle = c; ctx.fill() }
  plank(-10, 232, '#3a1c0c')
  plank(-12, 228, '#8a5228')
  ctx.fillStyle = 'rgba(58,28,12,0.45)'
  for (let i = 0; i < 5; i++) ctx.fillRect(-108 + i * 3, -6 + i * 4, 216 - i * 11, 1)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `40px ${TITLE}`
  for (let d = 6; d > 0; d--) { ctx.fillStyle = d > 3 ? '#2a1206' : '#5a2c10'; ctx.fillText('FLEEKADE', d * 0.7, d) }
  ctx.lineWidth = 4
  ctx.strokeStyle = '#2a1206'
  ctx.strokeText('FLEEKADE', 0, 0)
  const face = ctx.createLinearGradient(0, -18, 0, 18)
  face.addColorStop(0, '#fff6c4')
  face.addColorStop(0.5, '#f2c230')
  face.addColorStop(1, '#b86a18')
  ctx.fillStyle = face
  ctx.fillText('FLEEKADE', 0, 0)
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(255,255,230,0.7)'
  ctx.strokeText('FLEEKADE', -0.5, -0.8)
  ctx.restore()
  ctx.globalAlpha = clamp01(t / 0.35)
  drawTicket(ctx, W / 2 + 118 * scale, 44 - (1 - drop) * 14, 0.35 + Math.sin(time * 1.4) * 0.05)
  ctx.globalAlpha = 1

  // Menu, arcade-outlined. NEW GAME is picked at 4.4 s.
  const menuIn = smooth(1.1, 1.6, t)
  if (menuIn > 0) {
    ctx.globalAlpha = menuIn
    const items = ['STORE', 'NEW GAME', 'CONTINUE']
    const picked = t >= 4.4
    ctx.font = `18px ${MONO}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    items.forEach((label, i) => {
      const yy = 170 + i * 16
      const selected = i === 1
      let fill = selected ? '#ffffff' : '#a9bbdd'
      if (selected && picked && t < 5.2) fill = Math.floor((t - 4.4) / 0.08) % 2 === 0 ? '#fff27a' : '#ffffff'
      ctx.lineWidth = 3
      ctx.strokeStyle = '#0b1c4a'
      ctx.strokeText(label, W / 2, yy)
      ctx.fillStyle = fill
      ctx.fillText(label, W / 2, yy)
      if (selected) {
        const bob = picked ? 0 : Math.sin(time * 6) * 1.5
        const cxp = W / 2 - 46 + bob
        ctx.fillStyle = '#0b1c4a'
        ctx.beginPath(); ctx.moveTo(cxp - 1, yy - 11); ctx.lineTo(cxp + 8, yy - 5); ctx.lineTo(cxp - 1, yy + 1); ctx.fill()
        ctx.fillStyle = '#ffd24a'
        ctx.beginPath(); ctx.moveTo(cxp, yy - 9); ctx.lineTo(cxp + 6, yy - 5); ctx.lineTo(cxp, yy - 1); ctx.fill()
      }
    })
    ctx.font = `13px ${MONO}`
    ctx.lineWidth = 3
    ctx.strokeText('©2026 ROBOTO ARCADE CLUB', W / 2, 228)
    ctx.fillStyle = '#e6ecff'
    ctx.fillText('©2026 ROBOTO ARCADE CLUB', W / 2, 228)
    ctx.globalAlpha = 1
  }
}

const title: Page = {
  id: 'title',
  dur: PAGE_SECONDS,
  chroma: 1.6,
  draw(ctx, env) {
    env.cue('sting', 0.15, () => env.sound.sting())
    env.cue('select', 4.4, () => env.sound.select())
    drawTitle(ctx, env)
    fadeBlack(ctx, 1 - smooth(0, 0.3, env.t))
  },
}

export const PAGES: Page[] = [boot, dossierCrew, dossierGame, studio, connecting, title]
