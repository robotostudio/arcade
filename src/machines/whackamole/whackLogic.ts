import { WHACK } from './constants'

export type Input = { start: boolean; hits: number[] }
export type Mole = { age: number; window: number }
export type State = {
  phase: 'idle' | 'countdown' | 'playing' | 'result'
  elapsed: number; whacks: number; nextPop: number; lastHole: number
  moles: (Mole | null)[]; flashes: number[]; payout: number | null
}
export const initialState = (): State => ({ phase: 'idle', elapsed: 0, whacks: 0, nextPop: 0, lastHole: -1, moles: Array(9).fill(null), flashes: Array(9).fill(0), payout: null })

// Pure transition: a payout is a one-step event, consumed by the controller.
export function step(state: State, input: Input, dt: number, rng: () => number): State {
  const s: State = { ...state, moles: state.moles.map(m => m && { ...m }), flashes: state.flashes.map(f => Math.max(0, f - dt)), payout: null }
  if (s.phase === 'idle') return input.start ? { ...initialState(), phase: 'countdown' } : s
  s.elapsed += Math.max(0, dt)
  if (s.phase === 'countdown') return s.elapsed >= WHACK.countdown ? { ...s, phase: 'playing', elapsed: 0 } : s
  if (s.phase === 'result') return s.elapsed >= WHACK.resultHold ? initialState() : s
  if (s.elapsed >= WHACK.duration) return { ...s, phase: 'result', elapsed: 0, moles: Array(9).fill(null), payout: s.whacks * WHACK.perWhack }
  for (const hole of input.hits) {
    if (Number.isInteger(hole) && hole >= 0 && hole < 9 && s.moles[hole]) {
      s.moles[hole] = null
      s.flashes[hole] = .3
      s.whacks++
    }
  }
  s.moles = s.moles.map(m => m && m.age + dt < m.window ? { ...m, age: m.age + dt } : null)
  s.nextPop -= dt
  if (s.nextPop <= 0) {
    const progress = s.elapsed / WHACK.duration
    const limit = s.elapsed < WHACK.doubleAt ? 1 : 2
    const available = s.moles.map((m, i) => !m && i !== s.lastHole ? i : -1).filter(i => i >= 0)
    if (s.moles.filter(Boolean).length < limit && available.length) {
      const hole = available[Math.min(available.length - 1, Math.floor(Math.max(0, rng()) * available.length))]
      s.moles[hole] = { age: 0, window: WHACK.windowStart + (WHACK.windowEnd - WHACK.windowStart) * progress }
      s.lastHole = hole
    }
    s.nextPop = WHACK.intervalStart + (WHACK.intervalEnd - WHACK.intervalStart) * progress
  }
  return s
}
