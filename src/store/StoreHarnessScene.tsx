'use client'

// Store counter through ArcadeCanvas (the Look, ?clean=1 to turn it off), plus the Store HUD and a dev bar.
// Client-only (loaded by StoreHarness with ssr: false), so the persisted Ticket balance
// never causes a hydration mismatch.
import { CameraControls } from '@react-three/drei'
import { useArcade } from '@/arcade/state'
import { ArcadeCanvas } from '@/world/ArcadeCanvas'
import { FrameCamera } from '@/world/Harness'
import { StoreCounter } from './StoreCounter'
import { StoreHud } from './StoreHud'

export function StoreHarnessScene() {
  const awardTickets = useArcade((s) => s.awardTickets)
  const resetTickets = useArcade((s) => s.resetTickets)
  return (
    <>
      <ArcadeCanvas camera={{ position: [0.6, 2.9, 8] }}>
        <StoreCounter position={[0, 0, 0]} open />
        <CameraControls makeDefault smoothTime={0.6} />
        <FrameCamera position={[0.6, 2.9, 8]} target={[-0.4, 1.9, 0]} />
      </ArcadeCanvas>
      <StoreHud />
      <div className="vt absolute left-3 top-3 z-10 flex gap-1 text-[16px] uppercase tracking-widest text-white/80">
        <span className="border border-white/25 bg-black/80 px-2 py-1 text-white/50">dev</span>
        <button
          type="button"
          onClick={() => awardTickets('whackamole', 50)}
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
