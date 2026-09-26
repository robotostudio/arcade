import type { RapierRigidBody } from '@react-three/rapier'

export type PrizeHandle = { id: number; body: RapierRigidBody }

const bodies = new Map<number, RapierRigidBody>()

export const prizeRegistry = {
  register(id: number, body: RapierRigidBody) {
    bodies.set(id, body)
  },
  unregister(id: number) {
    bodies.delete(id)
  },
  get(id: number): RapierRigidBody | undefined {
    return bodies.get(id)
  },
}
