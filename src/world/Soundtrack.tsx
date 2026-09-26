'use client'

import { useEffect, useRef, useState } from 'react'
import { useIntro } from '@/intro/store'

// Looping cabinet music for the main Room. Web Audio only: no asset file.
// It stays quiet through the intro, then starts once the hub is up. Browsers
// block sound until a gesture, so if that start is refused the next click or
// keypress begins playback. The control shows on either way.

const BPM = 118
const STEPS = 64
const STEP = 60 / BPM / 4
const LEVEL = 0.62

type Hit = { step: number; midi: number; length: number }

const LEAD: Hit[] = [
  { step: 0, midi: 69, length: 2 },
  { step: 2, midi: 72, length: 2 },
  { step: 4, midi: 76, length: 2 },
  { step: 6, midi: 79, length: 2 },
  { step: 8, midi: 81, length: 2 },
  { step: 10, midi: 79, length: 2 },
  { step: 12, midi: 76, length: 2 },
  { step: 14, midi: 74, length: 2 },
  { step: 16, midi: 72, length: 2 },
  { step: 18, midi: 76, length: 2 },
  { step: 20, midi: 79, length: 2 },
  { step: 22, midi: 84, length: 2 },
  { step: 24, midi: 81, length: 4 },
  { step: 28, midi: 79, length: 2 },
  { step: 30, midi: 76, length: 2 },
  { step: 32, midi: 69, length: 2 },
  { step: 34, midi: 74, length: 2 },
  { step: 36, midi: 76, length: 2 },
  { step: 38, midi: 81, length: 2 },
  { step: 40, midi: 79, length: 2 },
  { step: 42, midi: 76, length: 2 },
  { step: 44, midi: 74, length: 2 },
  { step: 46, midi: 72, length: 2 },
  { step: 48, midi: 71, length: 2 },
  { step: 50, midi: 72, length: 2 },
  { step: 52, midi: 68, length: 2 },
  { step: 54, midi: 69, length: 2 },
  { step: 56, midi: 64, length: 4 },
  { step: 60, midi: 67, length: 2 },
  { step: 62, midi: 69, length: 2 },
]

const BASS: Hit[] = [
  { step: 0, midi: 45, length: 8 },
  { step: 8, midi: 40, length: 8 },
  { step: 16, midi: 45, length: 8 },
  { step: 24, midi: 43, length: 8 },
  { step: 32, midi: 41, length: 8 },
  { step: 40, midi: 40, length: 8 },
  { step: 48, midi: 38, length: 8 },
  { step: 56, midi: 40, length: 4 },
  { step: 60, midi: 43, length: 4 },
]

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

function noiseBuffer(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

function envGain(ctx: AudioContext, dest: AudioNode, time: number, dur: number, peak: number) {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(peak, time + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur)
  gain.connect(dest)
  return gain
}

function chip(ctx: AudioContext, dest: AudioNode, freq: number, time: number, dur: number, peak: number) {
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = 0.8
  filter.frequency.setValueAtTime(700, time)
  filter.frequency.exponentialRampToValueAtTime(2800, time + Math.min(0.05, dur * 0.35))
  filter.frequency.exponentialRampToValueAtTime(600, time + dur)
  filter.connect(dest)

  const gain = envGain(ctx, filter, time, dur, peak)
  const osc = ctx.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(freq, time)
  osc.connect(gain)

  const twin = ctx.createOscillator()
  const twinGain = ctx.createGain()
  twin.type = 'square'
  twin.frequency.setValueAtTime(freq * 1.007, time)
  twinGain.gain.value = 0.4
  twin.connect(twinGain)
  twinGain.connect(gain)

  osc.start(time)
  twin.start(time)
  osc.stop(time + dur + 0.03)
  twin.stop(time + dur + 0.03)
}

function bass(ctx: AudioContext, dest: AudioNode, freq: number, time: number, dur: number) {
  const gain = envGain(ctx, dest, time, dur, 0.22)
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(freq * 1.5, time)
  osc.frequency.exponentialRampToValueAtTime(freq, time + 0.06)
  osc.connect(gain)

  const sub = ctx.createOscillator()
  const subGain = ctx.createGain()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(freq / 2, time)
  subGain.gain.value = 0.7
  sub.connect(subGain)
  subGain.connect(gain)

  osc.start(time)
  sub.start(time)
  osc.stop(time + dur + 0.03)
  sub.stop(time + dur + 0.03)
}

function kick(ctx: AudioContext, dest: AudioNode, time: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(170, time)
  osc.frequency.exponentialRampToValueAtTime(46, time + 0.09)
  gain.gain.setValueAtTime(0.5, time)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2)
  osc.connect(gain)
  gain.connect(dest)
  osc.start(time)
  osc.stop(time + 0.22)
}

function snare(ctx: AudioContext, dest: AudioNode, noise: AudioBuffer, time: number) {
  const src = ctx.createBufferSource()
  src.buffer = noise
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 1400
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.18, time)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  src.start(time)
  src.stop(time + 0.14)

  const osc = ctx.createOscillator()
  const body = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(190, time)
  body.gain.setValueAtTime(0.12, time)
  body.gain.exponentialRampToValueAtTime(0.0001, time + 0.08)
  osc.connect(body)
  body.connect(dest)
  osc.start(time)
  osc.stop(time + 0.1)
}

function hat(ctx: AudioContext, dest: AudioNode, noise: AudioBuffer, time: number, open: boolean) {
  const src = ctx.createBufferSource()
  src.buffer = noise
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 7000
  const gain = ctx.createGain()
  const dur = open ? 0.14 : 0.035
  gain.gain.setValueAtTime(open ? 0.07 : 0.045, time)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  src.start(time)
  src.stop(time + dur + 0.02)
}

type Engine = {
  start: () => Promise<void>
  setLevel: (level: number) => void
  dispose: () => void
}

function createEngine(isMuted: () => boolean): Engine {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let timer = 0
  let step = 0
  let next = 0
  let dead = false

  const play = (index: number, time: number, noise: AudioBuffer) => {
    if (!ctx || !master) return
    const when = time + (index % 2 === 1 ? 0.012 : 0)
    for (const note of LEAD) {
      if (note.step !== index) continue
      chip(ctx, master, hz(note.midi), when, note.length * STEP * 0.9, 0.07)
    }
    for (const note of BASS) {
      if (note.step !== index) continue
      bass(ctx, master, hz(note.midi), time, note.length * STEP * 0.94)
    }
    if (index % 8 === 0) kick(ctx, master, time)
    if (index % 8 === 4) snare(ctx, master, noise, time)
    if (index % 2 === 1) hat(ctx, master, noise, when, index % 16 === 15)
  }

  return {
    async start() {
      if (dead) return
      if (!ctx) {
        ctx = new AudioContext()
        master = ctx.createGain()
        master.gain.value = isMuted() ? 0 : LEVEL
        const cabinet = ctx.createBiquadFilter()
        cabinet.type = 'lowpass'
        cabinet.frequency.value = 3800
        const comp = ctx.createDynamicsCompressor()
        comp.threshold.value = -14
        comp.knee.value = 10
        comp.ratio.value = 3.5
        comp.attack.value = 0.004
        comp.release.value = 0.18
        master.connect(cabinet)
        cabinet.connect(comp)
        comp.connect(ctx.destination)

        const noise = noiseBuffer(ctx)
        next = ctx.currentTime + 0.06
        timer = window.setInterval(() => {
          if (!ctx || !master) return
          const now = ctx.currentTime
          if (next < now - 0.08) {
            const skipped = Math.ceil((now - next) / STEP)
            step = (step + skipped) % STEPS
            next += skipped * STEP
          }
          while (next < now + 0.15) {
            play(step, next, noise)
            step = (step + 1) % STEPS
            next += STEP
          }
        }, 25)
      }
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume()
        } catch {
          return
        }
      }
      if (dead || !ctx) return
      master?.gain.setTargetAtTime(isMuted() ? 0 : LEVEL, ctx.currentTime, 0.02)
    },
    setLevel(level: number) {
      if (!ctx || !master) return
      master.gain.setTargetAtTime(level, ctx.currentTime, 0.03)
    },
    dispose() {
      dead = true
      window.clearInterval(timer)
      void ctx?.close()
      ctx = null
      master = null
    },
  }
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.5v5h3.2L12 18.2V5.8L7.2 9.5H4z" fill="currentColor" />
      {muted ? (
        <path d="M16 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
      ) : (
        <path d="M15.5 9a4 4 0 010 6M18 7a7.2 7.2 0 010 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
      )}
    </svg>
  )
}

export function SoundtrackToggle() {
  const [muted, setMuted] = useState(false)
  const introDone = useIntro((s) => s.phase === 'done')
  const mutedRef = useRef(false)
  const introDoneRef = useRef(introDone)
  const engineRef = useRef<Engine | null>(null)
  introDoneRef.current = introDone

  useEffect(() => {
    const engine = createEngine(() => mutedRef.current)
    engineRef.current = engine

    const arm = (event: Event) => {
      if (!introDoneRef.current || mutedRef.current) return
      if (event.target instanceof Element && event.target.closest('[data-soundtrack-toggle]')) return
      void engine.start()
    }
    window.addEventListener('pointerdown', arm)
    window.addEventListener('keydown', arm)
    return () => {
      window.removeEventListener('pointerdown', arm)
      window.removeEventListener('keydown', arm)
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!introDone || mutedRef.current) return
    void engineRef.current?.start()
  }, [introDone])

  const toggle = () => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    const engine = engineRef.current
    if (!engine) return
    if (next) engine.setLevel(0)
    else void engine.start()
  }

  return (
    <button
      type="button"
      data-soundtrack-toggle
      aria-pressed={muted}
      aria-label={muted ? 'Unmute soundtrack' : 'Mute soundtrack'}
      onClick={toggle}
      className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#ffe099]/60 bg-[#242044]/95 text-[#ffe099] hover:bg-[#393366] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffe099]"
    >
      <SpeakerIcon muted={muted} />
    </button>
  )
}
