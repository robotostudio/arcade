'use client'

import { Harness } from '@/world/Harness'
import { ClawMachine, DOCK } from '@/machines/claw'

export function ClawHarness() {
  return (
    <Harness
      title="CLAW"
      help="arrows move  space drop"
      camera={DOCK}
      machine={(props) => <ClawMachine position={[0, 0, 0]} {...props} />}
    />
  )
}
