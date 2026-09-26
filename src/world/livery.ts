// The Livery: every shared colour and the two material kinds each cabinet is built from (issue 12).
// Body parts are lit (Lambert, Gouraud); Accent-lit parts are unlit (Basic) so the bloom lifts them.
// Everything goes through the vertex snap. Colours are keyed, not passed as hex, so the ?livery=1
// panel can repaint every material live; the panel's "Copy as code" pastes the LIVERY block below.
import { Color, MeshBasicMaterial, MeshLambertMaterial } from 'three'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { psxify } from './look/psx-material'

export const LIVERY = {
  plinth: '#362940',
  trim: '#312634',
  panel: '#f6e3b4',
  frame: '#2a2136',
  screen: '#221c2d',
  text: '#fff4d7',
  whackamole: '#d66b27',
  skeeball: '#2d6ce6',
  stacktop: '#ee5fa0',
  claw: '#2ec4b0',
  glow: 1,
}

export type LiveryTable = typeof LIVERY
export type LiveryColorKey = Exclude<keyof LiveryTable, 'glow'>
export type AccentKey = 'whackamole' | 'skeeball' | 'stacktop' | 'claw'
export const ACCENT_KEYS: AccentKey[] = ['whackamole', 'skeeball', 'stacktop', 'claw']
export const LIVERY_COLOR_KEYS = (Object.keys(LIVERY) as (keyof LiveryTable)[]).filter((k): k is LiveryColorKey => k !== 'glow')

type LiveryStore = {
  table: LiveryTable
  set: <K extends keyof LiveryTable>(key: K, value: LiveryTable[K]) => void
  reset: () => void
}

// Overrides from the panel live here and persist to localStorage; the defaults above are the code.
export const useLivery = create<LiveryStore>()(
  persist(
    (set) => ({
      table: { ...LIVERY },
      set: (key, value) => set((s) => ({ table: { ...s.table, [key]: value } })),
      reset: () => set({ table: { ...LIVERY } }),
    }),
    {
      name: 'arcade:livery',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ table: s.table }),
      merge: (persisted, current) => ({ ...current, table: { ...LIVERY, ...((persisted as Partial<LiveryStore>)?.table ?? {}) } }),
    },
  ),
)

export const livery = () => useLivery.getState().table

// Muted Accents for set dressing: the Accent pulled most of the way toward the Plinth.
const MUTE = 0.55
const scratch = new Color()
export function mutedHex(key: AccentKey, table: LiveryTable = livery()): string {
  return `#${scratch.set(table[key]).lerp(new Color(table.plinth), MUTE).getHexString()}`
}

type Kind = 'body' | 'accent' | 'flat' | 'muted'
type Entry = { material: MeshLambertMaterial | MeshBasicMaterial; key: LiveryColorKey; kind: Kind }
const registry: Entry[] = []
const cache = new Map<string, MeshLambertMaterial | MeshBasicMaterial>()

function paint({ material, key, kind }: Entry, table: LiveryTable) {
  if (kind === 'muted') material.color.set(mutedHex(key as AccentKey, table))
  else material.color.set(table[key])
  if (kind === 'accent') material.color.multiplyScalar(table.glow)
}

useLivery.subscribe((s) => registry.forEach((entry) => paint(entry, s.table)))

function register(kind: Kind, key: LiveryColorKey) {
  const id = `${kind}:${key}`
  const hit = cache.get(id)
  if (hit) return hit
  const material = psxify(kind === 'accent' || kind === 'flat' ? new MeshBasicMaterial() : new MeshLambertMaterial())
  const entry = { material, key, kind }
  paint(entry, livery())
  registry.push(entry)
  cache.set(id, material)
  return material
}

// Lit body part in a Livery colour: the Plinth, trim, panels, or a Machine's Accent as its body.
export function bodyMaterial(key: LiveryColorKey): MeshLambertMaterial {
  return register('body', key) as MeshLambertMaterial
}

// Unlit part in a Livery colour, brightened by `glow` so the bloom lifts it: marquees, lamps, edge strips.
export function accentMaterial(key: LiveryColorKey): MeshBasicMaterial {
  return register('accent', key) as MeshBasicMaterial
}

// Unlit part in a Livery colour without the glow: dark screens, shadow slots. Repaints live like the others.
export function flatMaterial(key: LiveryColorKey): MeshBasicMaterial {
  return register('flat', key) as MeshBasicMaterial
}

// Lit body in a muted Accent, for the decorative cabinets.
export function mutedMaterial(key: AccentKey): MeshLambertMaterial {
  return register('muted', key) as MeshLambertMaterial
}

// Off-Livery colours a Machine owns (a Mole's fur, the Skeeball ball): still snapped, one instance per hex.
export function litMaterial(hex: string, params: ConstructorParameters<typeof MeshLambertMaterial>[0] = {}): MeshLambertMaterial {
  const id = `lit:${hex}:${JSON.stringify(params)}`
  let m = cache.get(id) as MeshLambertMaterial | undefined
  if (!m) { m = psxify(new MeshLambertMaterial({ color: hex, ...params })); cache.set(id, m) }
  return m
}

export function unlitMaterial(hex: string, params: ConstructorParameters<typeof MeshBasicMaterial>[0] = {}): MeshBasicMaterial {
  const id = `unlit:${hex}:${JSON.stringify(params)}`
  let m = cache.get(id) as MeshBasicMaterial | undefined
  if (!m) { m = psxify(new MeshBasicMaterial({ color: hex, ...params })); cache.set(id, m) }
  return m
}

// The LIVERY block as source, for the panel's "Copy as code".
export function liveryAsCode(table: LiveryTable): string {
  const lines = (Object.keys(LIVERY) as (keyof LiveryTable)[]).map((k) => `  ${k}: ${typeof table[k] === 'number' ? table[k] : `'${table[k]}'`},`)
  return `export const LIVERY = {\n${lines.join('\n')}\n}\n`
}
