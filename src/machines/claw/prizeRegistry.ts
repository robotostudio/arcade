import { createContext, useContext } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'

export type PrizeHandle = { id: number; body: RapierRigidBody; heavy: boolean }

export type PrizeRegistry = {
  register(id: number, body: RapierRigidBody, heavy: boolean): void
  unregister(id: number, body: RapierRigidBody): void
  get(id: number): RapierRigidBody | undefined
  isHeavy(id: number): boolean
}

// One registry per ClawMachine, so two mounted claws (Room + harness, StrictMode, Fast Refresh)
// never reach into each other's physics world.
export function createPrizeRegistry(): PrizeRegistry {
  const handles = new Map<number, PrizeHandle>()
  return {
    register(id, body, heavy) {
      handles.set(id, { id, body, heavy })
    },
    unregister(id, body) {
      if (handles.get(id)?.body === body) handles.delete(id)
    },
    get(id) {
      return handles.get(id)?.body
    },
    isHeavy(id) {
      return handles.get(id)?.heavy ?? false
    },
  }
}

export const PrizeRegistryContext = createContext<PrizeRegistry | null>(null)

export function usePrizeRegistry(): PrizeRegistry {
  const r = useContext(PrizeRegistryContext)
  if (!r) throw new Error('usePrizeRegistry must be used inside a ClawMachine')
  return r
}
