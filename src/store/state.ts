// Store state: which bundle is selected and how many Tickets are applied to it. Nothing here
// persists; Tickets live in useArcade.
//
// Claiming (Enter in the Store HUD) leaves the arcade: POST /api/checkout mints the credit as a
// single-use Shopify discount code and returns the checkout URL (src/store/checkout.ts); only
// once that URL is in hand are the Tickets spent and the page sent to Shopify. A failed request
// costs nothing and shows a toast. Edited by Jono on 2026-09-26 with Sne's file ownership noted
// in issue 07's Comments.
import { create } from 'zustand'
import { useArcade } from '@/arcade/state'
import { sfx } from '@/arcade/sfx'
import { creditGbp, maxTicketsFor } from '@/arcade/economy'
import { itemById, type Item } from './items'

export type StoreState = {
  selected: Item['id'] | null
  applied: number
  toast: string | null
  checkingOut: boolean // a checkout request is in flight; Enter is ignored until it answers
  select: (id: Item['id'] | null) => void
  apply: (n: number) => void
  applyMax: () => void
  claim: () => Promise<void>
  dismissToast: () => void
}

type CheckoutReply = { url: string; code: string; offGbp: number } | { error: string }

// Ask the server for a Shopify checkout URL carrying the credit for `applied` Tickets on `id`.
// Null on any failure; the caller toasts and keeps the Tickets.
async function requestCheckout(id: Item['id'], applied: number): Promise<string | null> {
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: id, applied }),
    })
    const reply = (await res.json()) as CheckoutReply
    if (!res.ok || !('url' in reply)) {
      console.warn('[store] checkout refused:', 'error' in reply ? reply.error : res.status)
      return null
    }
    return reply.url
  } catch (err) {
    console.warn('[store] checkout request failed:', err)
    return null
  }
}

// Most Tickets that can go on `item` now: the credit cap or the balance, whichever is lower.
export function maxApplicable(item: Item, balance = useArcade.getState().tickets): number {
  return Math.max(0, Math.min(Number.isFinite(balance) ? Math.floor(balance) : 0, maxTicketsFor(item)))
}

// Price in GBP after the credit bought by `applied` Tickets, rounded to pence.
export function priceAfter(item: Item, applied: number): number {
  return Math.round((item.priceGbp - creditGbp(item, applied)) * 100) / 100
}

// Prices always show pence, the way reseller cards do.
export function formatGbp(n: number): string {
  return `£${n.toFixed(2)}`
}

export const useStore = create<StoreState>()((set, get) => ({
  selected: null,
  applied: 0,
  toast: null,
  checkingOut: false,
  select: (id) => {
    if (id !== get().selected) sfx.nav()
    set({ selected: id, applied: 0 })
  },
  apply: (n) => {
    const item = itemById(get().selected)
    if (!item) return
    const whole = Math.round(Number.isFinite(n) ? n : 0)
    const next = Math.max(0, Math.min(whole, maxApplicable(item)))
    if (next !== get().applied) sfx.toggle(next > get().applied)
    else sfx.denied()
    set({ applied: next })
  },
  applyMax: () => {
    const item = itemById(get().selected)
    if (!item) return
    if (maxApplicable(item) !== get().applied) sfx.toggle(true)
    set({ applied: maxApplicable(item) })
  },
  claim: async () => {
    const { selected, applied, checkingOut } = get()
    const item = itemById(selected)
    if (checkingOut || !item) { sfx.denied(); return }
    if (!Number.isInteger(applied) || applied <= 0 || applied > maxApplicable(item)) {
      sfx.denied()
      set({ applied: 0, toast: 'Choose Tickets to apply from your current balance.' })
      return
    }
    if (useArcade.getState().tickets < applied) {
      sfx.denied()
      set({ toast: 'Not enough Tickets. Go win a Round.' })
      return
    }
    const off = creditGbp(item, applied)
    sfx.claim()
    set({ checkingOut: true, toast: `Ringing up ${item.title} with ${formatGbp(off)} off...` })
    const url = await requestCheckout(item.id, applied)
    if (!url) {
      sfx.denied()
      set({ checkingOut: false, toast: 'The till is down. Your Tickets are safe; try again in a moment.' })
      return
    }
    // Spend only now: the code exists and the checkout is ready, so nothing can strand the Tickets.
    if (!useArcade.getState().spendTickets(applied)) {
      sfx.denied()
      set({ checkingOut: false, toast: 'Not enough Tickets. Go win a Round.' })
      return
    }
    set({
      toast: `${formatGbp(off)} off ${item.title}, now ${formatGbp(priceAfter(item, applied))}. Heading to checkout...`,
      applied: 0,
      checkingOut: false,
    })
    window.location.assign(url)
  },
  dismissToast: () => { if (get().toast) sfx.click(); set({ toast: null }) },
}))
