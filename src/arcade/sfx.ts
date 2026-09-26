'use client'

// Chiptune sound effects for the whole arcade: UI, Machines, Round ends, the Store.
// Web Audio only, no samples: square/triangle voices on bright pentatonic notes, short and bouncy.
// One shared AudioContext, created lazily and unlocked by the first pointer or key press.
// The mute flag is shared with the room Soundtrack and persists to localStorage (`arcade:sound`).
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const useSound = create<{ muted: boolean; toggle: () => void }>()(
  persist(
    (set) => ({ muted: false, toggle: () => set((s) => ({ muted: !s.muted })) }),
    { name: 'arcade:sound', storage: createJSONStorage(() => localStorage) },
  ),
)

const LEVEL = 0.32
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

let ctx: AudioContext | null = null
let out: GainNode | null = null
let noiseBuf: AudioBuffer | null = null

function audio() {
  if (ctx) return ctx
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  try { ctx = new Ctx() } catch { return null }
  out = ctx.createGain()
  out.gain.value = LEVEL
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -10
  comp.ratio.value = 4
  out.connect(comp).connect(ctx.destination)
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = noiseBuf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return ctx
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    const c = audio()
    if (c && c.state !== 'running') void c.resume().catch(() => {})
  }
  window.addEventListener('pointerdown', unlock, { capture: true })
  window.addEventListener('keydown', unlock, { capture: true })
}

// Runs a cue only when sound is live; hands it the context and a start time.
function cue(fn: (c: AudioContext, t: number) => void) {
  if (useSound.getState().muted) return
  const c = audio()
  if (!c || c.state !== 'running' || !out) return
  fn(c, c.currentTime + 0.005)
}

const last: Record<string, number> = {}
function throttled(key: string, gap: number) {
  const now = performance.now()
  if (now - (last[key] ?? -1e9) < gap * 1000) return true
  last[key] = now
  return false
}

type Voice = { type?: OscillatorType; peak?: number; slideTo?: number; vibrato?: number }

// One chip note: instant attack, exponential decay, optional pitch slide and vibrato.
function note(c: AudioContext, freq: number, at: number, dur: number, { type = 'square', peak = 0.12, slideTo, vibrato }: Voice = {}) {
  const osc = c.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur)
  if (vibrato) {
    const lfo = c.createOscillator()
    const depth = c.createGain()
    lfo.frequency.value = 7
    depth.gain.value = freq * vibrato
    lfo.connect(depth).connect(osc.frequency)
    lfo.start(at)
    lfo.stop(at + dur + 0.05)
  }
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.004)
  gain.gain.setValueAtTime(peak, at + dur * 0.35)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(gain).connect(out!)
  osc.start(at)
  osc.stop(at + dur + 0.05)
}

function noise(c: AudioContext, at: number, dur: number, freq: number, peak: number, sweepTo?: number) {
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 1.2
  filter.frequency.setValueAtTime(freq, at)
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, at + dur)
  const gain = c.createGain()
  gain.gain.setValueAtTime(peak, at)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  src.connect(filter).connect(gain).connect(out!)
  src.start(at, Math.random() * 0.5)
  src.stop(at + dur + 0.05)
}

// Notes play one after another, `step` seconds apart.
function run(c: AudioContext, t: number, midis: number[], step: number, dur: number, voice?: Voice) {
  midis.forEach((m, i) => note(c, hz(m), t + i * step, dur, voice))
}

// C major pentatonic, climbing: used to pitch hits by level.
const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96]

let navFlip = false

export const sfx = {
  hover() {
    if (throttled('hover', 0.06)) return
    cue((c, t) => note(c, hz(96), t, 0.03, { peak: 0.035 }))
  },
  click() {
    cue((c, t) => run(c, t, [91, 96], 0.035, 0.06, { peak: 0.09 }))
  },
  back() {
    cue((c, t) => run(c, t, [96, 91], 0.035, 0.07, { peak: 0.08 }))
  },
  // Coin in the slot, then the cabinet powers up.
  enter() {
    cue((c, t) => {
      note(c, hz(83), t, 0.07, { peak: 0.1 })
      note(c, hz(88), t + 0.07, 0.22, { peak: 0.1 })
      run(c, t + 0.2, [72, 76, 79, 84], 0.04, 0.08, { peak: 0.06, type: 'triangle' })
    })
  },
  // Little shop bell.
  openStore() {
    cue((c, t) => {
      run(c, t, [84, 88, 91, 96], 0.06, 0.18, { peak: 0.07 })
      run(c, t, [72, 76, 79, 84], 0.06, 0.2, { peak: 0.1, type: 'triangle' })
    })
  },
  nav() {
    if (throttled('nav', 0.04)) return
    navFlip = !navFlip
    cue((c, t) => note(c, hz(navFlip ? 86 : 84), t, 0.05, { peak: 0.07, type: 'square' }))
  },
  toggle(on: boolean) {
    cue((c, t) => run(c, t, on ? [79, 86] : [86, 79], 0.04, 0.07, { peak: 0.08 }))
  },
  // "Ready!": three rising notes.
  start() {
    cue((c, t) => {
      run(c, t, [79, 84, 88], 0.08, 0.1, { peak: 0.09 })
      note(c, hz(91), t + 0.24, 0.25, { peak: 0.1, vibrato: 0.01 })
    })
  },
  count() {
    cue((c, t) => note(c, hz(81), t, 0.12, { peak: 0.1 }))
  },
  go() {
    cue((c, t) => {
      note(c, hz(93), t, 0.4, { peak: 0.11, vibrato: 0.012 })
      note(c, hz(81), t, 0.4, { peak: 0.08, type: 'triangle' })
    })
  },
  launch() {
    cue((c, t) => {
      noise(c, t, 0.35, 600, 0.18, 3500)
      note(c, hz(67), t, 0.25, { peak: 0.06, slideTo: hz(84) })
    })
  },
  // Bright "boing" that climbs with level (hole value, row, combo).
  hit(level = 1) {
    if (throttled('hit', 0.03)) return
    const m = PENTA[Math.max(0, Math.min(PENTA.length - 1, Math.round(level) - 1))]
    cue((c, t) => {
      note(c, hz(m + 12), t, 0.12, { peak: 0.1, slideTo: hz(m) })
      note(c, hz(m + 7), t + 0.05, 0.12, { peak: 0.07 })
      noise(c, t, 0.03, 4000, 0.12)
    })
  },
  pop() {
    if (throttled('pop', 0.04)) return
    cue((c, t) => note(c, hz(76), t, 0.07, { peak: 0.08, type: 'triangle', slideTo: hz(88) }))
  },
  grab() {
    cue((c, t) => {
      noise(c, t, 0.05, 1800, 0.15)
      run(c, t + 0.02, [79, 84], 0.05, 0.08, { peak: 0.08 })
    })
  },
  slip() {
    cue((c, t) => note(c, hz(84), t, 0.35, { peak: 0.08, slideTo: hz(67), vibrato: 0.03 }))
  },
  // Descending "bwoop".
  miss() {
    if (throttled('miss', 0.05)) return
    cue((c, t) => {
      note(c, hz(72), t, 0.1, { peak: 0.1, type: 'triangle' })
      note(c, hz(65), t + 0.1, 0.18, { peak: 0.1, type: 'triangle', slideTo: hz(60) })
    })
  },
  // Fanfare, then a coin ping per Ticket (capped, accelerating).
  win(tickets = 1) {
    cue((c, t) => {
      run(c, t, [72, 76, 79, 84], 0.08, 0.1, { peak: 0.1 })
      note(c, hz(88), t + 0.32, 0.4, { peak: 0.11, vibrato: 0.012 })
      run(c, t, [48, 55, 60], 0.12, 0.2, { peak: 0.12, type: 'triangle' })
      const pings = Math.min(12, Math.max(1, Math.round(tickets)))
      let at = t + 0.75
      for (let i = 0; i < pings; i++) {
        note(c, hz(95), at, 0.05, { peak: 0.06 })
        note(c, hz(100), at + 0.045, 0.1, { peak: 0.06 })
        at += Math.max(0.06, 0.12 - i * 0.006)
      }
    })
  },
  // Cute "wah-wah-wah-waaah".
  lose() {
    cue((c, t) => {
      const notes = [67, 66, 65]
      notes.forEach((m, i) => note(c, hz(m), t + i * 0.24, 0.2, { peak: 0.09, slideTo: hz(m - 0.5) }))
      note(c, hz(64), t + 0.72, 0.7, { peak: 0.09, vibrato: 0.025, slideTo: hz(62) })
    })
  },
  // Purchase jingle and a cascade of coins.
  claim() {
    cue((c, t) => {
      run(c, t, [84, 88, 91, 96, 91, 96], 0.06, 0.1, { peak: 0.09 })
      run(c, t, [60, 64, 67, 72], 0.09, 0.15, { peak: 0.1, type: 'triangle' })
      for (let i = 0; i < 6; i++) note(c, hz(100 - (i % 2) * 5), t + 0.4 + i * 0.05, 0.06, { peak: 0.04 })
    })
  },
  denied() {
    cue((c, t) => {
      note(c, 140, t, 0.1, { peak: 0.08 })
      note(c, 140, t + 0.13, 0.14, { peak: 0.08 })
    })
  },
}
