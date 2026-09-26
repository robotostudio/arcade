'use client'

import { Harness } from '@/world/Harness'
import { SkeeballMachine, DOCK } from '@/machines/skeeball'

export function SkeeballHarness() {
  return (
    <Harness
      title="SKEEBALL"
      help="space: lock aim, lock power"
      camera={DOCK}
      machine={(props) => <SkeeballMachine position={[0, 0, 0]} {...props} />}
    />
  )
}
