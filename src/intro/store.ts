'use client'

import { create } from 'zustand'

// Intro lifecycle, kept apart from src/arcade/state.ts so the shared contract stays untouched.
// boot: black until the session check runs · running: the tape is playing · landing: the tape tears
// away while the hub camera glides in · done: hub HUD is live.
// signIntro: the neon sign fly-in is still running (it can outlast the tape).
export type IntroPhase = 'boot' | 'running' | 'landing' | 'done'

type IntroState = {
  phase: IntroPhase
  roomReady: boolean
  signIntro: boolean
  setRoomReady: () => void
  start: () => void
  land: () => void
  finish: () => void
  armSignIntro: (on: boolean) => void
  finishSignIntro: () => void
}

export const INTRO_SEEN_KEY = 'fleekade:intro-seen'
export const SIGN_INTRO_KEY = 'fleekade:sign-intro'

// Seconds into the neon fly-in. Advanced from the hub camera so the sign and the
// dolly stay on one clock without re-rendering every frame.
export const signClock = { t: 0 }

export const useIntro = create<IntroState>((set, get) => ({
  phase: 'boot',
  roomReady: false,
  signIntro: false,
  setRoomReady: () => { if (!get().roomReady) set({ roomReady: true }) },
  start: () => set({ phase: 'running' }),
  land: () => { if (get().phase === 'running' || get().phase === 'boot') set({ phase: 'landing' }) },
  finish: () => {
    try { sessionStorage.setItem(INTRO_SEEN_KEY, '1') } catch {}
    set({ phase: 'done' })
  },
  armSignIntro: (on) => {
    signClock.t = 0
    set({ signIntro: on })
  },
  finishSignIntro: () => {
    if (!get().signIntro) return
    try { sessionStorage.setItem(SIGN_INTRO_KEY, '1') } catch {}
    set({ signIntro: false })
  },
}))
