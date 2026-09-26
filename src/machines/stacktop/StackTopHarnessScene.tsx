'use client'

// Dev harness for Stack to the Top: the Machine through the PSX look and the CRT glass.
// Its numbers live on its Display (ADR 0001), so there is no 2D HUD here. Client-only
// (loaded by StackTopHarness with ssr: false), so the persisted Ticket balance never
// causes a hydration mismatch.
import { HarnessCanvas, HarnessCrt } from '@/arcade/dev/HarnessCanvas'
import { useArcade } from '@/arcade/state'
import { DOCK, StackTop } from './StackTop'

const awardStackTop = (tickets: number) => useArcade.getState().awardTickets('stacktop', tickets)

export function StackTopHarnessScene() {
  return (
    <>
      <HarnessCanvas camera={{ position: [...DOCK.position], target: [...DOCK.target] }}>
        <StackTop position={[0, 0, 0]} active onRoundEnd={awardStackTop} />
      </HarnessCanvas>
      <HarnessCrt />
    </>
  )
}
