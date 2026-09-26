'use client'

import { Harness } from '@/world/Harness'
import { DOCK, SkeeballMachine } from '@/machines/skeeball'

export function SkeeballHarness() {
  return (
    <Harness
      title="SKEEBALL"
      help="space / click — aim, then power"
      camera={DOCK}
      fov={42}
      machine={(props) => <SkeeballMachine position={[0, 0, 0]} {...props} />}
    />
  )
}
