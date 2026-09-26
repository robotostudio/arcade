// Stacker game logic: a pure timing game, no three, no React, no physics.
// The component owns one StackerState in a ref and drives it with step() on
// every frame and press() on input. Both mutate the state in place (no
// allocation per frame) and return what happened so the caller can react.
import { PAYOUT } from '@/arcade/economy'

export const W = 7 // grid width in cells
export const H = 15 // grid height in rows; placing row H-1 wins the Round
export const OVER_MS = 2500 // how long the Round result stays up before attract
export const FORGIVE_ROWS = 4 // rows 0..3 snap a 1-cell overhang back instead of trimming
const START_WIDTH = 3
const START_AT = 2 // row 0 (and attract) starts centred: [2, 5)
const MAX_DT_MS = 250 // a backgrounded tab must not skip the row across the grid

// A row is a cell interval [start, end), end exclusive.
export type Row = { start: number; end: number }
export type Phase = 'idle' | 'playing' | 'over'
export type Result = { kind: 'win' | 'lose'; rowsPlaced: number; tickets: number }

export type StackerState = {
  phase: Phase
  placed: Row[] // placed rows, index = row number
  moving: Row // the sliding row (in attract: the row bouncing on row 0)
  dir: 1 | -1
  accMs: number // time accumulated toward the next cell step
  overMs: number // time since the Round ended
  result: Result | null
  version: number // bumps on any visible change so the renderer can skip idle frames
}

export type StepEvent = 'none' | 'moved' | 'attract'
export type PressEvent = 'ignored' | 'started' | 'placed' | 'won' | 'lost'

// Width cap by row: 3 for rows 0-4, 2 for rows 5-9, 1 for rows 10-14.
export function capForRow(row: number): number {
  return row < 5 ? 3 : row < 10 ? 2 : 1
}

// One cell every tickMs: 260 ms at row 0, 190 at row 5, 120 at row 10, 64 at row 14.
export function tickMs(row: number): number {
  return Math.max(60, 260 - 14 * row)
}

export function width(r: Row): number {
  return r.end - r.start
}

export function trim(moving: Row, below: Row): Row | null {
  const start = Math.max(moving.start, below.start)
  const end = Math.min(moving.end, below.end)
  return start < end ? { start, end } : null
}

export function createState(): StackerState {
  return {
    phase: 'idle',
    placed: [],
    moving: { start: START_AT, end: START_AT + START_WIDTH },
    dir: 1,
    accMs: 0,
    overMs: 0,
    result: null,
    version: 0,
  }
}

// Back to attract: empty tower, the row bouncing on row 0.
export function toAttract(s: StackerState): void {
  s.phase = 'idle'
  s.placed.length = 0
  s.moving.start = START_AT
  s.moving.end = START_AT + START_WIDTH
  s.dir = 1
  s.accMs = 0
  s.overMs = 0
  s.result = null
  s.version++
}

export function newRound(s: StackerState): void {
  toAttract(s)
  s.phase = 'playing'
}

// The row currently sliding (the row index the next press places).
export function currentRow(s: StackerState): number {
  return s.phase === 'idle' ? 0 : s.placed.length
}

function advance(s: StackerState): void {
  if (s.dir > 0 && s.moving.end >= W) s.dir = -1
  else if (s.dir < 0 && s.moving.start <= 0) s.dir = 1
  s.moving.start += s.dir
  s.moving.end += s.dir
}

export function step(s: StackerState, dtMs: number): StepEvent {
  const dt = Math.min(Math.max(dtMs, 0), MAX_DT_MS)
  if (s.phase === 'over') {
    s.overMs += dt
    if (s.overMs >= OVER_MS) {
      toAttract(s)
      return 'attract'
    }
    return 'none'
  }
  const tick = tickMs(currentRow(s))
  s.accMs += dt
  let moved = false
  while (s.accMs >= tick) {
    s.accMs -= tick
    advance(s)
    moved = true
  }
  if (!moved) return 'none'
  s.version++
  return 'moved'
}

function endRound(s: StackerState, kind: Result['kind']): void {
  const rowsPlaced = s.placed.length
  const tickets = kind === 'win' ? PAYOUT.stacker.win : PAYOUT.stacker.perRow * rowsPlaced
  s.phase = 'over'
  s.overMs = 0
  s.result = { kind, rowsPlaced, tickets }
  s.version++
}

// The Machine was left mid-Round (active went false): the Round ends as a loss
// that still pays the rows placed, so onRoundEnd fires exactly once per Round.
export function forfeit(s: StackerState): boolean {
  if (s.phase !== 'playing') return false
  endRound(s, 'lose')
  return true
}

export function press(s: StackerState): PressEvent {
  if (s.phase === 'over') return 'ignored' // result stays up for OVER_MS, then attract
  if (s.phase === 'idle') {
    newRound(s)
    return 'started'
  }

  const row = s.placed.length
  const below: Row = row === 0 ? { start: 0, end: W } : s.placed[row - 1]
  let landed = trim(s.moving, below)
  if (!landed) {
    endRound(s, 'lose') // the missed row stays in s.moving for the renderer
    return 'lost'
  }

  // Forgiveness: on the first rows a single overhanging cell snaps back onto
  // the row below instead of being trimmed. Width never exceeds the row below,
  // so a one-cell shift always lands fully on it.
  const overhang = width(s.moving) - width(landed)
  if (row < FORGIVE_ROWS && overhang === 1) {
    const shift = s.moving.start < below.start ? 1 : -1
    landed = { start: s.moving.start + shift, end: s.moving.end + shift }
  }

  s.placed.push(landed)
  if (s.placed.length >= H) {
    endRound(s, 'win')
    return 'won'
  }

  // Next row: narrower if trimmed or capped; starts at the wall, alternating sides.
  const next = s.placed.length
  const w = Math.min(width(landed), capForRow(next))
  if (next % 2 === 1) {
    s.moving.start = W - w
    s.dir = -1
  } else {
    s.moving.start = 0
    s.dir = 1
  }
  s.moving.end = s.moving.start + w
  s.accMs = 0
  s.version++
  return 'placed'
}
