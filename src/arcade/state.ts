// Shared contract. Owned by Sne; stubbed by Jono in the scaffold (issue 01).
// Change only by PR with the other two tagged. See PLAN.md.
import { create } from 'zustand'

export type MachineId = 'claw' | 'stacker' | 'skeeball'
export type Mode = { kind: 'room' } | { kind: 'play'; machine: MachineId } | { kind: 'store' }

export type ArcadeState = {
  mode: Mode
  tickets: number
  enter: (machine: MachineId) => void   // camera flies in, controls go live
  openStore: () => void
  exit: () => void                      // back to room mode
  awardTickets: (machine: MachineId, amount: number) => void
  spendTickets: (amount: number) => boolean // false if balance too low
}

export const useArcade = create<ArcadeState>((set, get) => ({
  mode: { kind: 'room' },
  tickets: 0,
  enter: (machine) => set({ mode: { kind: 'play', machine } }),
  openStore: () => set({ mode: { kind: 'store' } }),
  exit: () => set({ mode: { kind: 'room' } }),
  awardTickets: (_machine, amount) => set((s) => ({ tickets: s.tickets + amount })),
  spendTickets: (amount) => {
    if (get().tickets < amount) return false
    set((s) => ({ tickets: s.tickets - amount }))
    return true
  },
}))
