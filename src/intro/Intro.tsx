'use client'

import { useEffect, useRef, useState } from 'react'
import '@/world/look/crt.css'
import { drawGate, PAGES, type PageEnv } from './pages'
import { createSound, type IntroSound } from './sound'
import { INTRO_SEEN_KEY, SIGN_INTRO_KEY, useIntro } from './store'
import { H, vhs, W } from './vhs'

// The Fleekade intro: a late-90s console boot as captured off a worn VHS tape. It plays once per
// browser session (?intro=1 forces it, ?intro=0 skips it), opens on a PRESS START gate so sound can play,
// runs six 6.5 s pages, then tears away while the hub camera glides in from the fog.
const LANDING_SECONDS = 1.8
const FONTS = 'https://fonts.googleapis.com/css2?family=Bungee&family=VT323&display=swap'

type Stage = 'gate' | 'play' | 'landing'

export function Intro() {
  const phase = useIntro((s) => s.phase)
  const [stage, setStage] = useState<Stage>('gate')
  const stageRef = useRef<Stage>('gate')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const soundRef = useRef<IntroSound | null>(null)

  // Session check: decide once, on the client, whether the tape plays.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('intro')
    let seen = false
    let signSeen = false
    try {
      seen = sessionStorage.getItem(INTRO_SEEN_KEY) === '1'
      signSeen = sessionStorage.getItem(SIGN_INTRO_KEY) === '1'
    } catch {}
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const playSign = !reduced && (param === '1' || (param !== '0' && !signSeen))
    useIntro.getState().armSignIntro(playSign)
    if (param === '0' || (seen && param !== '1')) useIntro.getState().finish()
    else useIntro.getState().start()
  }, [])

  const go = (next: Stage) => {
    if (stageRef.current === next) return
    stageRef.current = next
    setStage(next)
  }

  const land = () => {
    if (stageRef.current === 'landing') return
    soundRef.current?.whoosh()
    go('landing')
    useIntro.getState().land()
  }

  const startTape = () => {
    if (stageRef.current !== 'gate') return
    soundRef.current = createSound()
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    go('play')
  }

  // Input: while the intro owns the screen, no key reaches the hub underneath.
  useEffect(() => {
    if (phase !== 'running' && phase !== 'landing') return
    const swallow = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.dataset.introSkip) return
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.dataset.introSkip) return
      swallow(event)
      if (event.repeat || ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(event.key)) return
      if (stageRef.current === 'gate') startTape()
      else if (stageRef.current === 'play') land()
    }
    window.addEventListener('keydown', keydown, true)
    window.addEventListener('keyup', swallow, true)
    return () => {
      window.removeEventListener('keydown', keydown, true)
      window.removeEventListener('keyup', swallow, true)
    }
  }, [phase])

  // The tape: one rAF loop drives the page timeline, the VHS pass and the landing fade.
  useEffect(() => {
    if (phase !== 'running' && phase !== 'landing') return
    const canvas = canvasRef.current
    if (!canvas) return
    const out = canvas.getContext('2d')
    const buffer = document.createElement('canvas')
    buffer.width = W
    buffer.height = H
    const src = buffer.getContext('2d', { willReadFrequently: true })
    if (!out || !src) return
    const image = out.createImageData(W, H)
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let last = performance.now()
    let time = 0
    let page = 0
    let pageT = 0
    let landT = 0
    let typedCount = 0
    const fired = new Set<string>()
    const silent: IntroSound = { boot() {}, tick() {}, blip() {}, whoosh() {}, sting() {}, select() {}, stop() {} }
    let logged = -1

    const env = (live: boolean): PageEnv => ({
      t: pageT,
      dur: PAGES[page].dur,
      time,
      sound: live ? soundRef.current ?? silent : silent,
      roomReady: useIntro.getState().roomReady,
      cue: (key, at, fn) => {
        const id = `${page}:${key}`
        if (!live || fired.has(id) || pageT < at) return
        fired.add(id)
        fn()
      },
      typed: (count) => {
        if (live && count > typedCount) soundRef.current?.tick()
        typedCount = Math.max(typedCount, count)
      },
    })

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      time += dt
      const stage = stageRef.current
      let tear = 0

      if (stage === 'gate') {
        drawGate(src, time)
      } else if (stage === 'play') {
        pageT += dt
        const current = PAGES[page]
        if (logged !== page) { logged = page; console.info('[intro]', current.id, 'start', Math.round(now)) }
        if (pageT >= current.dur && (!current.holdUntilReady || useIntro.getState().roomReady)) {
          if (page === PAGES.length - 1) {
            land()
          } else {
            page += 1
            pageT = 0
            typedCount = 0
          }
        }
        PAGES[page].draw(src, env(true))
      } else {
        landT += dt
        tear = still ? 0 : Math.min(1, landT / LANDING_SECONDS)
        PAGES[page].draw(src, env(false))
        const fade = Math.min(1, Math.max(0, (landT - 0.15) / (LANDING_SECONDS - 0.15)))
        if (rootRef.current) rootRef.current.style.opacity = String(1 - fade * fade * (3 - 2 * fade))
        if (landT >= LANDING_SECONDS) {
          console.info('[intro]', 'landed', Math.round(now))
          soundRef.current?.stop()
          soundRef.current = null
          useIntro.getState().finish()
          return
        }
      }

      vhs(src, out, image, { time, chroma: stage === 'gate' ? 1 : PAGES[page].chroma, tear, still })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  // Stop audio if the page goes away mid-tape.
  useEffect(() => () => { soundRef.current?.stop() }, [])

  if (phase === 'done') return null

  const onPointerDown = () => {
    if (stageRef.current === 'gate') startTape()
    else if (stageRef.current === 'play') land()
  }

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label="Fleekade intro"
      onPointerDown={onPointerDown}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black"
      style={{ pointerEvents: stage === 'landing' ? 'none' : 'auto' }}
    >
      <link rel="stylesheet" href={FONTS} />
      <div className="relative" style={{ width: 'min(100vw, 133.333dvh)', aspectRatio: '4 / 3' }}>
        {phase !== 'boot' && <canvas ref={canvasRef} width={W} height={H} className="absolute inset-0 h-full w-full" style={{ imageRendering: 'auto', filter: 'blur(0.35px) saturate(1.12) contrast(1.04)' }} />}
        <div className="crt" />
        <div className="intro-scan pointer-events-none absolute inset-0" />
      </div>
      <p className="sr-only">
        Fleekade, a low-poly browser arcade built in three hours by Sne (Stack to the Top and the Store), Daniel (Skeeball),
        Jono (Claw, the look and the hub) and Divya (Whack-a-Mole, in development). Play Claw, Skeeball and Stack to the Top,
        win Tickets every Round, and spend them as credit on vintage bundles in the Store.
      </p>
      {phase !== 'boot' && stage !== 'landing' && (
        <button
          type="button"
          data-intro-skip="1"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => { event.stopPropagation(); if (stageRef.current === 'gate') { go('play'); land() } else land() }}
          className="absolute bottom-4 right-4 border border-white/30 bg-black/60 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-white/70 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          Skip intro &#9656;&#9656;
        </button>
      )}
      <style>{`
        .intro-scan { background: repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 2px, rgba(0,0,0,.16) 2px 3px); mix-blend-mode: multiply; }
        @media (min-resolution: 2dppx) { .intro-scan { background: repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 3px, rgba(0,0,0,.16) 3px 4px); } }
      `}</style>
    </div>
  )
}
