// The Store's Items: Roboto merch (White, Blue) and services (Gold).
// Prices are fake but plausible, in GBP. Tier drives the ring and the Discount rate.
import type { Tier } from '@/arcade/economy'

export type Item = { id: string; name: string; tier: Tier; priceGbp: number; blurb: string }

export const ITEMS: Item[] = [
  { id: 'sticker-pack', name: 'Sticker pack', tier: 'white', priceGbp: 6, blurb: 'Eight vinyl stickers. Your laptop lid has been asking for a redesign.' },
  { id: 'enamel-pin', name: 'Enamel pin', tier: 'white', priceGbp: 9, blurb: 'A tiny Roboto for your lapel. Pixel-perfect, like our margins.' },
  { id: 'tote-bag', name: 'Tote bag', tier: 'white', priceGbp: 14, blurb: 'Carries groceries, laptops and at least one unshipped side project.' },
  { id: 'hoodie', name: 'Hoodie', tier: 'blue', priceGbp: 48, blurb: 'Heavyweight and deploy-day approved. Hood up means do not disturb.' },
  { id: 'cap', name: 'Cap', tier: 'blue', priceGbp: 24, blurb: 'Keeps the glare off your screen and the sun off your ideas.' },
  { id: 'mug-set', name: 'Mug set', tier: 'blue', priceGbp: 30, blurb: 'Three mugs: one for coffee, one for tea, one for standup.' },
  { id: 'site-audit', name: 'Free site audit', tier: 'gold', priceGbp: 1500, blurb: 'We poke every page, time every load and hand you a list that fixes things.' },
  { id: 'day-of-roboto', name: 'A day of Roboto', tier: 'gold', priceGbp: 2400, blurb: 'One full day of the studio on your problem. Bring snacks, we bring answers.' },
]

export const TIERS: Tier[] = ['white', 'blue', 'gold']

export const TIER_LABEL: Record<Tier, string> = { white: 'White', blue: 'Blue', gold: 'Gold' }

export const TIER_HEX: Record<Tier, string> = { white: '#e8e4d8', blue: '#3d7bff', gold: '#f2c14e' }

export function itemById(id: Item['id'] | null): Item | null {
  if (!id) return null
  return ITEMS.find((i) => i.id === id) ?? null
}
