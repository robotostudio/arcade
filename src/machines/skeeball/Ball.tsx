'use client'

import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { SKEE } from './constants'
import { SKEE_MATS } from './materials'

// The one ball. Dynamic, CCD on so a max-power launch cannot tunnel through the lip, never sleeps
// so a reset + impulse in the same frame always takes. `userData.ball` is what the Lane sensors
// check. The controller owns its motion through `bodyRef` (reset to spawn, applyImpulse) and finds
// the body's Object3D by BALL_NAME to snap the mesh while the world is paused.
type Props = { bodyRef: React.RefObject<RapierRigidBody | null> }

export const BALL_NAME = 'skee-ball'

export function Ball({ bodyRef }: Props) {
  const { restitution, friction, linearDamping, angularDamping } = SKEE.ballPhys
  return (
    <RigidBody
      ref={bodyRef}
      name={BALL_NAME}
      type="dynamic"
      colliders="ball"
      ccd
      restitution={restitution}
      friction={friction}
      linearDamping={linearDamping}
      angularDamping={angularDamping}
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
