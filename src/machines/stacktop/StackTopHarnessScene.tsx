'use client'

// Dev harness for Stack to the Top: the Machine through the PSX look, the CRT glass,
// and its HUD. Client-only (loaded by StackTopHarness with ssr: false), so the
// persisted Ticket balance never causes a hydration mismatch.
import { HarnessCanvas, HarnessCrt } from '@/arcade/dev/HarnessCanvas'
import { useArcade } from '@/arcade/state'
import { DOCK, StackTop } from './StackTop'
import { StackTopHud } from './StackTopHud'

const awardStackTop = (tickets: number) => useArcade.getState().awardTickets('stacktop', tickets)

export function StackTopHarnessScene() {
  return (
    <>
      <HarnessCanvas camera={{ position: [...DOCK.position], target: [...DOCK.target] }}>
        <StackTop position={[0, 0, 0]} active onRoundEnd={awardStackTop} />
      </HarnessCanvas>
      <HarnessCrt />
      <StackTopHud />
    </>
  )
}
