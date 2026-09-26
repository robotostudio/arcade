'use client'

// Dev harness for the Stacker: the Machine through the PSX look, the CRT glass,
// and a text-only Tailwind HUD reading useStackerHud + the Ticket balance.
// Client-only (loaded by StackerHarness with ssr: false), so the persisted
// Ticket balance never causes a hydration mismatch.
import { HarnessCanvas, HarnessCrt } from '@/arcade/dev/HarnessCanvas'
import { useArcade } from '@/arcade/state'
import { PAYOUT } from '@/arcade/economy'
import { Stacker } from './Stacker'
import { useStackerHud } from './hud'
import { H } from './logic'

const awardStacker = (tickets: number) => useArcade.getState().awardTickets('stacker', tickets)

function Prompt() {
  const phase = useStackerHud((s) => s.phase)
  const result = useStackerHud((s) => s.lastResult)
  if (phase === 'playing') return <>Space to stop</>
  if (phase === 'over' && result) {
    return result.kind === 'win' ? (
      <>You win! +{PAYOUT.stacker.win} Tickets</>
    ) : (
      <>Round over: +{result.tickets} Tickets</>
    )
  }
  return <>Space to start</>
}

function Hud() {
  const tickets = useArcade((s) => s.tickets)
  const phase = useStackerHud((s) => s.phase)
  const row = useStackerHud((s) => s.row)
  return (
    <div className="pointer-events-none absolute inset-0 font-mono uppercase tracking-widest text-[#e8dcc4]">
      <div className="absolute left-4 top-4 space-y-1">
        <div className="text-lg text-[#e0482a]">Stacker</div>
        <div className="text-sm">Tickets {tickets}</div>
        {phase !== 'idle' && (
          <div className="text-xs opacity-70">
            Row {Math.min(row + (phase === 'over' ? 0 : 1), H)} / {H}
          </div>
        )}
      </div>
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-xl">
        <Prompt />
      </div>
    </div>
  )
}

export function StackerHarnessScene() {
  return (
    <>
      <HarnessCanvas camera={{ position: [0, 2.4, 4.5], target: [0, 1.6, 0] }}>
        <Stacker position={[0, 0, 0]} active onRoundEnd={awardStacker} />
      </HarnessCanvas>
      <HarnessCrt />
      <Hud />
    </>
  )
}
