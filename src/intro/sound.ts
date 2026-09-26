'use client'

// Original lo-fi synth cues for the intro. No samples: everything is oscillators and filtered noise,
// run through one low-pass so it sounds like it came off a worn tape.
export type IntroSound = {
  boot: () => void
  tick: () => void
  blip: (high?: boolean) => void
  whoosh: () => void
  sting: () => void
  select: () => void
  stop: () => void
}

const silent: IntroSound = { boot() {}, tick() {}, blip() {}, whoosh() {}, sting() {}, select() {}, stop() {} }

export function createSound(): IntroSound {
  const Ctx = typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
  if (!Ctx) return silent
  let ctx: AudioContext
  try { ctx = new Ctx() } catch { return silent }
  void ctx.resume()

  const master = ctx.createGain()
  master.gain.value = 0.55
  const tape = ctx.createBiquadFilter()
  tape.type = 'lowpass'
  tape.frequency.value = 5200
  tape.Q.value = 0.4
  tape.connect(master).connect(ctx.destination)

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  // Tape hiss bed with a slow wow on its filter.
  const hiss = ctx.createBufferSource()
  hiss.buffer = noiseBuffer
  hiss.loop = true
  const hissFilter = ctx.createBiquadFilter()
  hissFilter.type = 'bandpass'
  hissFilter.frequency.value = 3800
  hissFilter.Q.value = 0.6
  const hissGain = ctx.createGain()
  hissGain.gain.value = 0.018
  hiss.connect(hissFilter).connect(hissGain).connect(tape)
  hiss.start()

  const hum = ctx.createOscillator()
  hum.frequency.value = 50
  const humGain = ctx.createGain()
  humGain.gain.value = 0.012
  hum.connect(humGain).connect(tape)
  hum.start()

  const env = (gain: GainNode, at: number, attack: number, peak: number, release: number) => {
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(peak, at + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + release)
  }

  const tone = (type: OscillatorType, freq: number, at: number, attack: number, peak: number, release: number, detune = 0) => {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    osc.detune.value = detune
    const gain = ctx.createGain()
    env(gain, at, attack, peak, release)
    osc.connect(gain).connect(tape)
    osc.start(at)
    osc.stop(at + attack + release + 0.05)
  }

  const noise = (at: number, dur: number, freq: number, q: number, peak: number, sweepTo?: number) => {
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(freq, at)
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, at + dur)
    filter.Q.value = q
    const gain = ctx.createGain()
    env(gain, at, Math.min(0.01, dur / 4), peak, dur)
    src.connect(filter).connect(gain).connect(tape)
    src.start(at, Math.random())
    src.stop(at + dur + 0.05)
  }

  let lastTick = 0

  return {
    // A slow, warm console pad: a detuned triangle chord swelling in, then a bell partial on top.
    boot() {
      const t = ctx.currentTime + 0.05
      for (const [f, d] of [[130.81, -7], [196, 5], [261.63, -4], [329.63, 6], [392, 0]] as const) tone('triangle', f, t, 0.9, 0.07, 3.6, d)
      tone('sine', 65.41, t, 0.6, 0.12, 3.2)
      for (const [f, dt] of [[1046.5, 0.7], [1318.5, 0.95], [1567.98, 1.2], [2093, 1.45]] as const) tone('sine', f, t + dt, 0.01, 0.045, 1.8)
      noise(t, 1.6, 900, 0.7, 0.05, 5000)
    },
    tick() {
      const now = ctx.currentTime
      if (now - lastTick < 0.045) return
      lastTick = now
      noise(now, 0.035, 2600 + Math.random() * 1400, 3, 0.09)
    },
    blip(high = false) {
      const t = ctx.currentTime
      tone('square', high ? 1318.5 : 880, t, 0.005, 0.035, 0.09)
    },
    whoosh() {
      const t = ctx.currentTime
      noise(t, 0.9, 300, 0.8, 0.14, 6000)
      tone('sawtooth', 110, t, 0.02, 0.03, 0.6)
    },
    // Title card fanfare: a rising square arpeggio over a low fifth.
    sting() {
      const t = ctx.currentTime + 0.02
      const notes = [392, 523.25, 659.25, 783.99, 1046.5]
      notes.forEach((f, i) => tone('square', f, t + i * 0.075, 0.005, 0.045, 0.28))
      tone('triangle', 130.81, t, 0.02, 0.1, 1.4)
      tone('triangle', 196, t, 0.02, 0.08, 1.4)
    },
    // NEW GAME: a coin drop.
    select() {
      const t = ctx.currentTime
      tone('square', 987.77, t, 0.004, 0.06, 0.08)
      tone('square', 1318.51, t + 0.08, 0.004, 0.06, 0.45)
    },
    stop() {
      const t = ctx.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.linearRampToValueAtTime(0, t + 1.2)
      setTimeout(() => { void ctx.close().catch(() => {}) }, 1400)
    },
  }
}
