// What the Stacker tells the HUD. The Stacker component writes here on phase
// changes and placements; the harness page (and later the real HUD) reads it.
import { create } from 'zustand'
import type { Phase, Result } from './logic'

export type StackerHud = {
  phase: Phase
  row: number // row the next press places (0-based); rows placed so far in 'over'
  lastResult: Result | null
}

export const useStackerHud = create<StackerHud>(() => ({
  phase: 'idle',
  row: 0,
  lastResult: null,
}))
