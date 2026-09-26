import { createContext, useContext } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'

export type PrizeHandle = { id: number; body: RapierRigidBody }

export type PrizeRegistry = {
  register(id: number, body: RapierRigidBody): void
  unregister(id: number, body: RapierRigidBody): void
  get(id: number): RapierRigidBody | undefined
}

// One registry per ClawMachine, so two mounted claws (Room + harness, StrictMode, Fast Refresh)
// never reach into each other's physics world.
export function createPrizeRegistry(): PrizeRegistry {
  const bodies = new Map<number, RapierRigidBody>()
  return {
    register(id, body) {
      bodies.set(id, body)
    },
    unregister(id, body) {
      if (bodies.get(id) === body) bodies.delete(id)
    },
    get(id) {
      return bodies.get(id)
    },
  }
}

export const PrizeRegistryContext = createContext<PrizeRegistry | null>(null)

export function usePrizeRegistry(): PrizeRegistry {
  const r = useContext(PrizeRegistryContext)
  if (!r) throw new Error('usePrizeRegistry must be used inside a ClawMachine')
  return r
}
