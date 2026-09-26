// Shared contract. Owned by Sne; stubbed by Jono in the scaffold (issue 01).
// Change only by PR with the other two tagged. See PLAN.md.
// Tickets persist to localStorage (`arcade:tickets`); mode and lastRound do not.
// On the server there is no localStorage: persist no-ops and tickets start at 0.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

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
  // Added by Sne (issue 07): Round-end line for the HUD, and a debug reset.
  lastRound: { machine: MachineId; tickets: number } | null
  clearLastRound: () => void
  resetTickets: () => void
}

export const useArcade = create<ArcadeState>()(
  persist(
    (set, get) => ({
      mode: { kind: 'room' },
      tickets: 0,
      lastRound: null,
      enter: (machine) => set({ mode: { kind: 'play', machine } }),
      openStore: () => set({ mode: { kind: 'store' } }),
      exit: () => set({ mode: { kind: 'room' } }),
      awardTickets: (machine, amount) => {
        const won = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0))
        set((s) => ({ tickets: s.tickets + won, lastRound: { machine, tickets: won } }))
      },
      spendTickets: (amount) => {
        if (get().tickets < amount) return false
        set((s) => ({ tickets: s.tickets - amount }))
        return true
      },
      clearLastRound: () => set({ lastRound: null }),
      resetTickets: () => set({ tickets: 0, lastRound: null }),
    }),
    {
      name: 'arcade:tickets',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ tickets: s.tickets }),
    },
  ),
)
