// The Ticket economy in one place: what a Round pays and what Tickets buy in the Store.
// Owned by Sne (issue 07). Tune numbers here, nowhere else.

export type Tier = 'white' | 'blue' | 'gold'

// Tickets a Round pays, per Machine.
export const PAYOUT = {
  // Stacker: 10 per row reached, 150 for topping out.
  stacker: { perRow: 10, win: 150 },
  // Claw: 100 when a prize lands in the chute.
  claw: { grab: 100 },
  // Skeeball: Round score divided by this, rounded.
  skeeball: { scoreDivisor: 5 },
} as const

// Discount bought by applying Tickets to an Item, by Tier.
// White and Blue: 1 Ticket = 1%, capped at 50%. Gold is steeper: two Tickets per percent.
export const DISCOUNT = {
  perTicketPct: 1,
  capPct: 50,
  gold: { perTicketPct: 0.5, capPct: 50 },
} as const

function rateFor(tier: Tier) {
  return tier === 'gold' ? DISCOUNT.gold : DISCOUNT
}

// Discount percent for `ticketsApplied` Tickets on an Item of `tier`, capped.
export function discountPct(tier: Tier, ticketsApplied: number): number {
  const { perTicketPct, capPct } = rateFor(tier)
  return Math.min(capPct, Math.max(0, ticketsApplied) * perTicketPct)
}

// Tickets needed to reach the Discount cap for `tier`.
export function maxTicketsFor(tier: Tier): number {
  const { perTicketPct, capPct } = rateFor(tier)
  return Math.ceil(capPct / perTicketPct)
}
