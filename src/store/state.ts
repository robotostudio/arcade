// Store state: which Item is selected, how many Tickets are applied to it, what was claimed.
// Only `claimed` persists (localStorage `arcade:claimed`). Tickets live in useArcade.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useArcade } from '@/arcade/state'
import { discountPct, maxTicketsFor } from '@/arcade/economy'
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

// Most Tickets that can go on `item` now: the Tier cap or the balance, whichever is lower.
export function maxApplicable(item: Item, balance = useArcade.getState().tickets): number {
  return Math.max(0, Math.min(Number.isFinite(balance) ? Math.floor(balance) : 0, maxTicketsFor(item.tier)))
}

// Price in GBP after the Discount bought by `applied` Tickets, rounded to pence.
export function priceAfter(item: Item, applied: number): number {
  const pct = discountPct(item.tier, applied)
  return Math.round(item.priceGbp * (100 - pct)) / 100
}

export function formatGbp(n: number): string {
  return `£${Number.isInteger(n) ? n : n.toFixed(2)}`
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
        if (!item || claimed.includes(item.id)) return
        if (!Number.isInteger(applied) || applied <= 0 || applied > maxApplicable(item)) {
          set({ applied: 0, toast: 'Choose Tickets to apply from your current balance.' })
          return
        }
        if (!useArcade.getState().spendTickets(applied)) {
          set({ toast: 'Not enough Tickets. Go win a Round.' })
          return
        }
        const pct = discountPct(item.tier, applied)
        set({
          claimed: [...claimed, item.id],
          toast: `Claimed: ${item.name} at ${pct}% off, now ${formatGbp(priceAfter(item, applied))}. Demo claim saved locally; no order or payment is placed.`,
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
