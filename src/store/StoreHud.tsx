'use client'

// The Store HUD: right-side panel over the canvas. Lists Items by Tier, and for the
// selected Item lets the player apply Tickets for a Discount and claim it.
// No canvas here; plain DOM + Tailwind in a pixel-ish register.
import { useArcade } from '@/arcade/state'
import { discountPct, maxTicketsFor } from '@/arcade/economy'
import { ITEMS, TIERS, TIER_HEX, TIER_LABEL, itemById } from './items'
import { formatGbp, maxApplicable, priceAfter, useStore } from './state'

const box = 'border border-white/25 bg-black/80'
const label = 'text-[10px] uppercase tracking-[0.2em] text-white/50'

export function StoreHud() {
  const tickets = useArcade((s) => s.tickets)
  const selectedId = useStore((s) => s.selected)
  const applied = useStore((s) => s.applied)
  const claimed = useStore((s) => s.claimed)
  const toast = useStore((s) => s.toast)
  const { select, apply, applyMax, claim, dismissToast } = useStore.getState()

  const item = itemById(selectedId)
  const max = item ? maxApplicable(item, tickets) : 0
  const pct = item ? discountPct(item.tier, applied) : 0
  const canClaim = !!item && applied > 0 && applied <= tickets

  return (
    <aside className="absolute right-3 top-3 bottom-3 z-10 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-2 font-mono text-xs text-white/90">
      <div className={`${box} flex items-center justify-between px-3 py-2`}>
        <span className="uppercase tracking-[0.25em]">Store</span>
        <span className="tabular-nums">
          <span className={label}>Tickets </span>
          {tickets}
        </span>
      </div>

      <div className={`${box} min-h-0 flex-1 overflow-y-auto`}>
        {TIERS.map((tier) => (
          <section key={tier} className="border-b border-white/10 last:border-b-0">
            <h3 className={`${label} flex items-center gap-2 px-3 pt-2 pb-1`}>
              <span className="inline-block h-2 w-2" style={{ background: TIER_HEX[tier] }} />
              {TIER_LABEL[tier]}
              <span className="ml-auto normal-case tracking-normal">
                up to {maxTicketsFor(tier)} Tickets
              </span>
            </h3>
            <ul>
              {ITEMS.filter((i) => i.tier === tier).map((i) => {
                const active = i.id === selectedId
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => select(active ? null : i.id)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left uppercase tracking-wider hover:bg-white/10 ${active ? 'bg-white/15' : ''}`}
                    >
                      <span className="inline-block h-1.5 w-1.5 shrink-0" style={{ background: TIER_HEX[tier] }} />
                      <span className="truncate">{i.name}</span>
                      {claimed.includes(i.id) && (
                        <span className="border border-emerald-400/60 px-1 text-[9px] text-emerald-300">claimed</span>
                      )}
                      <span className="ml-auto tabular-nums text-white/70">{formatGbp(i.priceGbp)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      {item && (
        <div className={`${box} flex flex-col gap-2 px-3 py-3`}>
          <div className="flex items-baseline gap-2">
            <span className="inline-block h-2 w-2" style={{ background: TIER_HEX[item.tier] }} />
            <span className="uppercase tracking-wider">{item.name}</span>
            <span className="ml-auto tabular-nums">{formatGbp(item.priceGbp)}</span>
          </div>
          <p className="text-[11px] leading-snug text-white/60">{item.blurb}</p>

          <label className="flex flex-col gap-1">
            <span className={`${label} flex justify-between`}>
              <span>Tickets applied</span>
              <span className="tabular-nums text-white/80">
                {applied} / {max}
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={max}
              step={1}
              value={Math.min(applied, max)}
              disabled={max === 0}
              onChange={(e) => apply(Number(e.target.value))}
              className="w-full accent-[#3d7bff]"
            />
          </label>

          <div className="grid grid-cols-2 gap-px border border-white/15 bg-white/15 tabular-nums">
            <div className="bg-black px-2 py-1">
              <div className={label}>Discount</div>
              <div>{pct}%</div>
            </div>
            <div className="bg-black px-2 py-1">
              <div className={label}>Price after</div>
              <div>{formatGbp(priceAfter(item, applied))}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyMax}
              disabled={max === 0}
              className="border border-white/40 px-3 py-1 uppercase tracking-widest hover:bg-white/10 disabled:opacity-30"
            >
              Max
            </button>
            <button
              type="button"
              onClick={claim}
              disabled={!canClaim}
              className="flex-1 border border-[#f2c14e] bg-[#f2c14e]/10 px-3 py-1 uppercase tracking-widest text-[#f2c14e] hover:bg-[#f2c14e]/25 disabled:opacity-30"
            >
              Claim
            </button>
          </div>
          {tickets === 0 && <p className={label}>No Tickets yet. Play a Machine.</p>}
        </div>
      )}

      {toast && (
        <button
          type="button"
          onClick={dismissToast}
          className="border border-emerald-400/60 bg-black/90 px-3 py-2 text-left text-emerald-200"
        >
          {toast}
          <span className={`${label} ml-2`}>[x]</span>
        </button>
      )}
    </aside>
  )
}
