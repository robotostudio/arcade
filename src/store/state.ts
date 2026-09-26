// Store state: which bundle is selected, how many Tickets are applied to it, what was claimed.
// Only `claimed` persists (localStorage `arcade:claimed`). Tickets live in useArcade.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useArcade } from '@/arcade/state'
import { creditGbp, maxTicketsFor } from '@/arcade/economy'
import { itemById, type Item } from './items'

export type StoreState = {
  selected: Item['id'] | null
  applied: number
  claimed: Item['id'][]
  toast: string | null
  select: (id: Item['id'] | null) => void
  apply: (n: number) => void
  applyMax: () => void
  claim: () => void
  dismissToast: () => void
}

// Most Tickets that can go on `item` now: the credit cap or the balance, whichever is lower.
export function maxApplicable(item: Item, balance = useArcade.getState().tickets): number {
  return Math.max(0, Math.min(balance, maxTicketsFor(item)))
}

// Price in GBP after the credit bought by `applied` Tickets, rounded to pence.
export function priceAfter(item: Item, applied: number): number {
  return Math.round((item.priceGbp - creditGbp(item, applied)) * 100) / 100
}

// Prices always show pence, the way reseller cards do.
export function formatGbp(n: number): string {
  return `£${n.toFixed(2)}`
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      selected: null,
      applied: 0,
      claimed: [],
      toast: null,
      select: (id) => set({ selected: id, applied: 0 }),
      apply: (n) => {
        const item = itemById(get().selected)
        if (!item) return
        const whole = Math.round(Number.isFinite(n) ? n : 0)
        set({ applied: Math.max(0, Math.min(whole, maxApplicable(item))) })
      },
      applyMax: () => {
        const item = itemById(get().selected)
        if (!item) return
        set({ applied: maxApplicable(item) })
      },
      claim: () => {
        const { selected, applied, claimed } = get()
        const item = itemById(selected)
        if (!item || applied <= 0) return
        if (!useArcade.getState().spendTickets(applied)) {
          set({ toast: 'Not enough Tickets. Go win a Round.' })
          return
        }
        const off = creditGbp(item, applied)
        set({
          claimed: claimed.includes(item.id) ? claimed : [...claimed, item.id],
          toast: `Claimed: ${item.title} with ${formatGbp(off)} off, now ${formatGbp(priceAfter(item, applied))}. This is a demo: nothing ships.`,
          applied: 0,
        })
      },
      dismissToast: () => set({ toast: null }),
    }),
    {
      name: 'arcade:claimed',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ claimed: s.claimed }),
    },
  ),
)
