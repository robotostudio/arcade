// The Store's Items: vintage clothing bundles, one sprite each in public/store/items
// (32-bit PS1-style renders of real garments, made 2026-09-26 with ai-cli). Titles,
// piece counts and prices follow the reseller card format borrowed from Fleek for fun:
// no affiliation, no name, no logo. Stats and details feed the select-screen HUD.
import type { Tier } from '@/arcade/economy'

// Reseller grades, worst to best. NWT = new with tags.
export type Grade = 'C' | 'BC' | 'B' | 'AB' | 'A' | 'NWT'

// The three select-screen bars, each 1..10.
export type StatKey = 'drip' | 'cond' | 'warm'
export type Stats = Record<StatKey, number>

export type Item = {
  id: string
  title: string
  pieces: number
  priceGbp: number // the bundle's total
  grade: Grade
  tier: Tier
  image: string // file under /store/items
  era: string
  origin: string
  fabric: string
  stats: Stats
}

export const ITEMS: Item[] = [
  {
    id: 'graphic-longsleeve',
    title: 'Y2K graphic long sleeve tees',
    pieces: 12, priceGbp: 62.4, grade: 'C', tier: 'white',
    image: 'graphic-longsleeve.png', era: '2000s', origin: 'Italy', fabric: 'Cotton jersey',
    stats: { drip: 6, cond: 3, warm: 2 },
  },
  {
    id: 'spiral-patchwork-top',
    title: 'Boho patchwork mesh tops',
    pieces: 12, priceGbp: 69.0, grade: 'BC', tier: 'white',
    image: 'spiral-patchwork-top.png', era: '1990s', origin: 'France', fabric: 'Mesh, viscose',
    stats: { drip: 5, cond: 4, warm: 2 },
  },
  {
    id: 'patch-jeans',
    title: 'Reworked band patch baggy jeans',
    pieces: 10, priceGbp: 79.9, grade: 'BC', tier: 'white',
    image: 'patch-jeans.png', era: 'Y2K', origin: 'USA', fabric: 'Denim, cotton',
    stats: { drip: 8, cond: 4, warm: 5 },
  },
  {
    id: 'crochet-denim-jacket',
    title: 'Granny square crochet denim jackets',
    pieces: 8, priceGbp: 95.2, grade: 'B', tier: 'blue',
    image: 'crochet-denim-jacket.png', era: '1970s', origin: 'UK', fabric: 'Acrylic, denim',
    stats: { drip: 7, cond: 6, warm: 7 },
  },
  {
    id: 'tapestry-jacket-red',
    title: 'Commemorative tapestry zip jackets',
    pieces: 6, priceGbp: 108.0, grade: 'AB', tier: 'blue',
    image: 'tapestry-jacket-red.png', era: '1990s', origin: 'USA', fabric: 'Woven tapestry',
    stats: { drip: 7, cond: 7, warm: 8 },
  },
  {
    id: 'mickey-tapestry-vest',
    title: 'Cartoon tapestry gilets',
    pieces: 8, priceGbp: 119.2, grade: 'AB', tier: 'blue',
    image: 'mickey-tapestry-vest.png', era: '1990s', origin: 'USA', fabric: 'Woven tapestry',
    stats: { drip: 8, cond: 7, warm: 6 },
  },
  {
    id: 'carhartt-detroit-white',
    title: 'Upcycled Carhartt Detroit jackets',
    pieces: 10, priceGbp: 139.0, grade: 'A', tier: 'gold',
    image: 'carhartt-detroit-white.png', era: '1990s', origin: 'USA', fabric: 'Duck canvas, cord',
    stats: { drip: 9, cond: 9, warm: 9 },
  },
  {
    id: 'patch-jacket',
    title: 'One-off 200 patch bomber',
    pieces: 1, priceGbp: 150.0, grade: 'NWT', tier: 'gold',
    image: 'patch-jacket.png', era: 'Rework', origin: 'USA', fabric: 'Nylon, embroidery',
    stats: { drip: 10, cond: 10, warm: 7 },
  },
]

export const STAT_KEYS: StatKey[] = ['drip', 'cond', 'warm']
export const STAT_LABEL: Record<StatKey, string> = { drip: 'Drip', cond: 'Condition', warm: 'Warmth' }

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

// The Item `steps` places after `id` in the selector's ring, wrapping at both ends.
export function itemAfter(id: Item['id'] | null, steps: number): Item {
  const n = ITEMS.length
  const at = Math.max(0, ITEMS.findIndex((i) => i.id === id))
  return ITEMS[(((at + steps) % n) + n) % n]
}
