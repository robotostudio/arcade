'use client'

import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { SKEE } from './constants'
import { SKEE_MATS } from './materials'

// The one ball. Dynamic, CCD on so a max-power launch cannot tunnel through the lip, never sleeps
// so a reset + impulse in the same frame always takes. `userData.ball` is what the Lane sensors
// check. The controller owns its motion through `bodyRef` (reset to spawn, applyImpulse).
type Props = { bodyRef: React.RefObject<RapierRigidBody | null> }

export function Ball({ bodyRef }: Props) {
  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      colliders="ball"
      ccd
      restitution={0.3}
      friction={0.6}
      linearDamping={0.1}
      angularDamping={0.2}
      canSleep={false}
      userData={{ ball: true }}
      position={[SKEE.ball.spawn[0], SKEE.ball.spawn[1], SKEE.ball.spawn[2]]}
    >
      <mesh material={SKEE_MATS.ball}>
        <icosahedronGeometry args={[SKEE.ball.r, 1]} />
      </mesh>
    </RigidBody>
  )
}
