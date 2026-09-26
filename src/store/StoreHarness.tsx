'use client'

// Client wrapper for the Store harness page: R3F never renders on the server,
// so the scene comes in through next/dynamic with ssr: false (same shape as RoomCanvas).
import dynamic from 'next/dynamic'
import { HarnessCrt } from '@/arcade/dev/HarnessCanvas'
import { useArcade } from '@/arcade/state'
import { StoreHud } from './StoreHud'

const StoreHarnessScene = dynamic(() => import('./StoreHarnessScene').then((m) => m.StoreHarnessScene), {
  ssr: false,
})

export function StoreHarness() {
  const awardTickets = useArcade((s) => s.awardTickets)
  const resetTickets = useArcade((s) => s.resetTickets)
  return (
    <>
      <StoreHarnessScene />
      <HarnessCrt />
      <StoreHud />
      <div className="absolute left-3 top-3 z-10 flex gap-1 font-mono text-[10px] uppercase tracking-widest text-white/80">
        <span className="border border-white/25 bg-black/80 px-2 py-1 text-white/50">dev</span>
        <button
          type="button"
          onClick={() => awardTickets('stacker', 50)}
          className="border border-white/25 bg-black/80 px-2 py-1 hover:bg-white/10"
        >
          +50 Tickets
        </button>
        <button
          type="button"
          onClick={resetTickets}
          className="border border-white/25 bg-black/80 px-2 py-1 hover:bg-white/10"
        >
          Reset
        </button>
      </div>
    </>
  )
}
