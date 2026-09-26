import { PAYOUT } from '@/arcade/economy'

export const WHACK = {
  duration: 30, countdown: 3, resultHold: 2,
  intervalStart: 1.1, intervalEnd: .45,
  windowStart: .9, windowEnd: .5,
  doubleAt: 15, perWhack: PAYOUT.whackamole.perWhack,
  attractMin: 2, attractMax: 3,
} as const

export const DOCK = { position: [0, 3.05, 3.45], target: [0, 1.5, 0] } as const
export const holePosition = (hole: number): [number, number, number] => [((hole % 3) - 1) * .52, 0, (1 - Math.floor(hole / 3)) * .48]
