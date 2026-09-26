// The Ticket economy in one place: what a Round pays and what Tickets buy in the Store.
// Owned by Sne (issue 07, issue 11). Tune numbers here, nowhere else.

export type Tier = 'white' | 'blue' | 'gold'

// Tickets a Round pays, per Machine.
export const PAYOUT = {
  whackamole: { perWhack: 5 },
  // Stack to the Top: 1 per row placed on a miss, 50 for taking Minor, 250 for topping out.
  stacktop: { perRow: 1, minor: 50, major: 250 },
  // Claw: 100 when a prize lands in the chute.
  claw: { grab: 100 },
  // Skeeball: Round score divided by this, rounded.
  skeeball: { scoreDivisor: 5 },
} as const

// Credit bought by applying Tickets to an Item: money off the bundle's total price.
// 1 Ticket = £0.10 off, capped at 50% of the total. Same for every Tier and Machine.
export const CREDIT = { gbpPerTicket: 0.1, capPct: 50 } as const

type Priced = { priceGbp: number }

// Most credit an Item can take, in GBP (the cap), rounded to pence.
export function capGbp(item: Priced): number {
  return Math.round(item.priceGbp * CREDIT.capPct) / 100
}

// Credit in GBP for `ticketsApplied` Tickets on `item`, capped, rounded to pence.
export function creditGbp(item: Priced, ticketsApplied: number): number {
  const raw = Math.max(0, ticketsApplied) * CREDIT.gbpPerTicket
  return Math.min(capGbp(item), Math.round(raw * 100) / 100)
}

// Tickets that reach the credit cap for `item`. Applying more buys nothing.
export function maxTicketsFor(item: Priced): number {
  return Math.floor(capGbp(item) / CREDIT.gbpPerTicket + 1e-9)
}
