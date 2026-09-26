'use client'

// Store counter inside the dev HarnessCanvas, plus the CRT glass, Store HUD and a dev bar.
// Client-only (loaded by StoreHarness with ssr: false), so the persisted Ticket balance
// and claimed list never cause a hydration mismatch.
import { HarnessCanvas, HarnessCrt } from '@/arcade/dev/HarnessCanvas'
import { useArcade } from '@/arcade/state'
import { StoreCounter } from './StoreCounter'
import { StoreHud } from './StoreHud'

export function StoreHarnessScene() {
  const awardTickets = useArcade((s) => s.awardTickets)
  const resetTickets = useArcade((s) => s.resetTickets)
  return (
    <>
      <HarnessCanvas camera={{ position: [0, 2.6, 6], target: [0, 1.2, 0] }}>
        <StoreCounter position={[0, 0, 0]} />
      </HarnessCanvas>
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
