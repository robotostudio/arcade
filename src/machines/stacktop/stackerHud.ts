// What a stacking Machine tells the HUD. The Machine component writes here on phase
// changes and placements (and the decide countdown at 100 ms steps); the harness page
// (and later the real HUD) reads it. One store per Machine: the Stacker has
// useStackerHud, Stack to the Top has its own from createStackerHud().
import { create } from 'zustand'
import type { Choice, Phase, Result } from './logic'

export type StackerHud = {
  phase: Phase
  row: number // row the next press places (0-based); rows placed so far in 'over'
  lastResult: Result | null
  decideLeftMs: number // time left in the take-or-risk pause; 0 outside 'decide'
  rounds: number // Rounds ended since mount
  choose: (choice: Choice) => void // set by the Machine on mount so HUD buttons can pick
}

export function createStackerHud() {
  return create<StackerHud>(() => ({
    phase: 'idle',
    row: 0,
    lastResult: null,
    decideLeftMs: 0,
    rounds: 0,
    choose: () => {},
  }))
}

export const useStackerHud = createStackerHud()
