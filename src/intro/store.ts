'use client'

import { create } from 'zustand'

// Intro lifecycle, kept apart from src/arcade/state.ts so the shared contract stays untouched.
// boot: black until the session check runs · running: the tape is playing · landing: the tape tears
// away while the hub camera glides in · done: hub HUD is live.
export type IntroPhase = 'boot' | 'running' | 'landing' | 'done'

type IntroState = {
  phase: IntroPhase
  roomReady: boolean
  setRoomReady: () => void
  start: () => void
  land: () => void
  finish: () => void
}

export const INTRO_SEEN_KEY = 'fleekade:intro-seen'

export const useIntro = create<IntroState>((set, get) => ({
  phase: 'boot',
  roomReady: false,
  setRoomReady: () => { if (!get().roomReady) set({ roomReady: true }) },
  start: () => set({ phase: 'running' }),
  land: () => { if (get().phase === 'running' || get().phase === 'boot') set({ phase: 'landing' }) },
  finish: () => {
    try { sessionStorage.setItem(INTRO_SEEN_KEY, '1') } catch {}
    set({ phase: 'done' })
  },
}))
