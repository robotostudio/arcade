'use client'

// The Store HUD: right-side panel over the canvas. A level-select grid of bundle cards
// (three per Tier on black, thin magenta frames, name under each tile) in the Fleek
// card format: title, piece count, total in bold, per piece in grey, a Shipping Inc.
// chip and a grade chip. Selecting a card opens the credit panel: apply Tickets for
// money off (1 Ticket = £0.10, capped at 50%) and claim. Plain DOM + Tailwind.
import { useArcade } from '@/arcade/state'
import { CREDIT, creditGbp } from '@/arcade/economy'
import { GRADE_LABEL, ITEMS, TIERS, TIER_HEX, TIER_LABEL, itemById, pricePerPiece, type Item } from './items'
import { formatGbp, maxApplicable, priceAfter, useStore } from './state'

const box = 'border border-white/25 bg-black/80'
const label = 'text-[10px] uppercase tracking-[0.2em] text-white/50'
const FRAME = '#ff3df2' // the thin magenta frame from the level-select reference
const PRICE = '#F8C642' // price chip
const OFF = '#F86868' // discount chip

function Chip({ children, color = 'rgba(255,255,255,0.12)', fg = 'inherit' }: { children: React.ReactNode; color?: string; fg?: string }) {
  return (
    <span
      className="inline-block whitespace-nowrap rounded-sm px-1.5 py-px text-[9px] font-semibold leading-tight"
      style={{ background: color, color: fg }}
    >
      {children}
    </span>
  )
}

type CardProps = { item: Item; active: boolean; applied: number; claimed: boolean; onClick: () => void }

function Card({ item, active, applied, claimed, onClick }: CardProps) {
  const off = active ? creditGbp(item, applied) : 0
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-1 text-left"
      aria-pressed={active}
    >
      <div
        className="relative flex aspect-[4/5] w-full flex-col justify-between bg-black p-1.5"
        style={{ border: `1px solid ${active ? '#ffffff' : FRAME}`, boxShadow: active ? `0 0 0 1px ${FRAME}` : 'none' }}
      >
        <div className="flex items-start justify-between gap-1">
          <Chip color="rgba(255,255,255,0.14)">{GRADE_LABEL[item.grade]}</Chip>
          <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: TIER_HEX[item.tier] }} />
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold leading-none tabular-nums" style={{ color: FRAME }}>
            {item.pieces}
          </div>
          <div className="text-[9px] uppercase tracking-widest text-white/50">pcs</div>
        </div>
        <div className="flex items-end justify-between gap-1">
          <Chip color="rgba(255,255,255,0.14)">Shipping Inc.</Chip>
          {claimed && <Chip color="rgba(52,211,153,0.25)" fg="#86efac">claimed</Chip>}
        </div>
      </div>
      <div className="min-h-[2.4em] text-[10px] leading-snug text-white/90 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
        {item.title}
      </div>
      <div className="flex flex-wrap items-baseline gap-1 tabular-nums">
        {off > 0 ? (
          <>
            <Chip color={PRICE} fg="#000">
              <b>{formatGbp(priceAfter(item, applied))}</b>
            </Chip>
            <Chip color={OFF} fg="#000">-{formatGbp(off)}</Chip>
            <span className="text-[9px] text-white/40 line-through">{formatGbp(item.priceGbp)}</span>
          </>
        ) : (
          <>
            <Chip color={PRICE} fg="#000">
              <b>{formatGbp(item.priceGbp)}</b>
            </Chip>
            <span className="text-[9px] text-white/50">{formatGbp(pricePerPiece(item))} / pc</span>
          </>
        )}
      </div>
    </button>
  )
}

export function StoreHud({ onClose }: { onClose?: () => void }) {
  const tickets = useArcade((s) => s.tickets)
  const selectedId = useStore((s) => s.selected)
  const applied = useStore((s) => s.applied)
  const claimed = useStore((s) => s.claimed)
  const toast = useStore((s) => s.toast)
  const { select, apply, applyMax, claim, dismissToast } = useStore.getState()

  const item = itemById(selectedId)
  const max = item ? maxApplicable(item, tickets) : 0
  const visibleApplied = Math.min(applied, max)
  const off = item ? creditGbp(item, visibleApplied) : 0
  const isClaimed = !!item && claimed.includes(item.id)
  const canClaim = !!item && !isClaimed && Number.isInteger(applied) && applied > 0 && applied <= max

  return (
    <aside className="absolute right-3 top-3 bottom-3 z-10 flex w-[26rem] max-w-[calc(100vw-1.5rem)] flex-col gap-2 font-mono text-xs text-white/90">
      <div className={`${box} flex items-center justify-between px-3 py-2`}>
        <span className="uppercase tracking-[0.25em]">Store</span>
        <span className="tabular-nums">
          <span className={label}>Tickets </span>
          {tickets}
          <span className={`${label} ml-2`}>= {formatGbp(tickets * CREDIT.gbpPerTicket)} off</span>
        </span>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close store" className="border border-white/30 px-2 py-1 hover:bg-white/10">
            Close
          </button>
        )}
      </div>
      <p className={`${box} px-3 py-2 text-[10px] leading-relaxed text-white/60`}>Demo prizes. Apply Tickets for a discount, then claim once per Item. No real orders.</p>

      <div className={`${box} min-h-0 flex-1 overflow-y-auto`}>
        {TIERS.map((tier) => (
          <section key={tier} className="border-b border-white/10 px-3 pb-3 last:border-b-0">
            <h3 className={`${label} flex items-center gap-2 pt-2 pb-2`}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: TIER_HEX[tier] }} />
              {TIER_LABEL[tier]}
              <span className="ml-auto normal-case tracking-normal">
                {tier === 'white' ? 'Grade C / B/C' : tier === 'blue' ? 'Grade B / A/B' : 'Grade A / NWT'}
              </span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {ITEMS.filter((i) => i.tier === tier).map((i) => {
                const active = i.id === selectedId
                return (
                  <Card
                    key={i.id}
                    item={i}
                    active={active}
                    applied={applied}
                    claimed={claimed.includes(i.id)}
                    onClick={() => select(active ? null : i.id)}
                  />
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {!item && <p className={`${box} px-3 py-3 text-white/70`}>Choose a prize above or click an Item on the counter to spend your Tickets.</p>}
      {item && (
        <div className={`${box} flex flex-col gap-2 px-3 py-3`}>
          <div className="flex items-baseline gap-2">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: TIER_HEX[item.tier] }} />
            <span className="truncate">{item.title}</span>
            <span className="ml-auto shrink-0 tabular-nums">{formatGbp(item.priceGbp)}</span>
          </div>
          <p className="text-[11px] leading-snug text-white/60">
            {item.pieces} pieces, {formatGbp(pricePerPiece(item))} a piece, {GRADE_LABEL[item.grade]}. Shipping included.
          </p>

          <label className="flex flex-col gap-1">
            <span className={`${label} flex justify-between`}>
              <span>Tickets applied</span>
              <span className="tabular-nums text-white/80">
                {visibleApplied} / {max}
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={max}
              step={1}
              value={visibleApplied}
              disabled={max === 0 || isClaimed}
              onChange={(e) => apply(Number(e.target.value))}
              className="w-full accent-[#F8C642]"
            />
          </label>

          <div className="grid grid-cols-2 gap-px border border-white/15 bg-white/15 tabular-nums">
            <div className="bg-black px-2 py-1">
              <div className={label}>Credit (max {CREDIT.capPct}%)</div>
              <div style={{ color: off > 0 ? OFF : 'inherit' }}>-{formatGbp(off)}</div>
            </div>
            <div className="bg-black px-2 py-1">
              <div className={label}>Price after</div>
              <div>{formatGbp(priceAfter(item, visibleApplied))}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyMax}
              disabled={max === 0 || isClaimed}
              className="border border-white/40 px-3 py-1 uppercase tracking-widest hover:bg-white/10 disabled:opacity-30"
            >
              Max
            </button>
            <button
              type="button"
              onClick={claim}
              disabled={!canClaim}
              className="flex-1 border border-[#F8C642] bg-[#F8C642]/10 px-3 py-1 uppercase tracking-widest text-[#F8C642] hover:bg-[#F8C642]/25 disabled:opacity-30"
            >
              {isClaimed ? 'Claimed' : 'Claim discount'}
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
