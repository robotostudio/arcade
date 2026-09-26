// The Store's Items: vintage clothing bundles, three per Tier. Titles, piece counts and
// prices follow real reseller cards seen on 2026-09-26; grades are assigned to fit the
// Tiers. Card format is borrowed from Fleek for fun: no affiliation, no name, no logo.
import type { Tier } from '@/arcade/economy'

// Reseller grades, worst to best. NWT = new with tags.
export type Grade = 'C' | 'BC' | 'B' | 'AB' | 'A' | 'NWT'

export type Item = {
  id: string
  title: string
  pieces: number
  priceGbp: number // the bundle's total
  grade: Grade
  tier: Tier
}

export const ITEMS: Item[] = [
  { id: 'christmas-knit', title: 'CHRISTMAS KNIT WEAR', pieces: 10, priceGbp: 66.4, grade: 'BC', tier: 'white' },
  { id: 'nike-diesel-sweats', title: 'Nike diesel sweatshirts', pieces: 6, priceGbp: 44.94, grade: 'C', tier: 'white' },
  { id: 'baby-tees-15', title: '030926-1 baby tees T-Shirt 15 pcs', pieces: 15, priceGbp: 65.85, grade: 'BC', tier: 'white' },
  { id: 'y2k-tops-002', title: "Y2K Curated Women's Tops Collection (002)", pieces: 31, priceGbp: 87.11, grade: 'AB', tier: 'blue' },
  { id: 'levis-501-mix', title: 'LEVI, S 501 AND OTHER MIX BRANDS JEANS', pieces: 12, priceGbp: 91.68, grade: 'B', tier: 'blue' },
  { id: 'abercrombie-hollister-425', title: 'Abercrombie & Hollister B# 425', pieces: 12, priceGbp: 122.52, grade: 'AB', tier: 'blue' },
  { id: 'carhartt-detroit-jackets', title: 'Upcycled Carhartt & Denim Detroit Jackets', pieces: 25, priceGbp: 349.5, grade: 'A', tier: 'gold' },
  { id: 'carhartt-sweats-33', title: 'Premium carhartt Sweatshirts 33 pieces', pieces: 33, priceGbp: 390, grade: 'A', tier: 'gold' },
  { id: 'coach-bags', title: 'Coach bags', pieces: 25, priceGbp: 640.25, grade: 'NWT', tier: 'gold' },
]

export const TIERS: Tier[] = ['white', 'blue', 'gold']

export const TIER_LABEL: Record<Tier, string> = { white: 'White', blue: 'Blue', gold: 'Gold' }

export const TIER_HEX: Record<Tier, string> = { white: '#e8e4d8', blue: '#3d7bff', gold: '#f2c14e' }

// Grades to Tiers: White = C / BC, Blue = B / AB, Gold = A / NWT.
export const GRADE_LABEL: Record<Grade, string> = {
  C: 'Grade C',
  BC: 'Grade B/C',
  B: 'Grade B',
  AB: 'Grade A/B',
  A: 'Grade A',
  NWT: 'NWT',
}

// Computed, not stored: the card's grey per-piece price.
export function pricePerPiece(item: Item): number {
  return Math.round((item.priceGbp / item.pieces) * 100) / 100
}

export function itemById(id: Item['id'] | null): Item | null {
  if (!id) return null
  return ITEMS.find((i) => i.id === id) ?? null
}
