'use client'

// The Shell (issue 12, ADR 0001): the one 2D frame the Room draws over a Machine in Play mode.
// Room-level things only: the Ticket balance, one prompt line naming the real key and verb for the
// current phase ("Space: drop"), and Back. The active Machine's Accent colours the prompt keyword.
import { useArcade } from '@/arcade/state'
import { type AccentKey, LIVERY, useLivery } from './livery'

export const SHELL = { surface: 'rgba(36, 32, 68, 0.95)', text: LIVERY.text, edge: 'rgba(255, 244, 215, 0.35)' }

const panel: React.CSSProperties = {
  position: 'absolute',
  zIndex: 20,
  background: SHELL.surface,
  color: SHELL.text,
  fontFamily: 'var(--font-vt323), monospace',
  lineHeight: 1,
  padding: '10px 16px 8px',
}

export function Shell({ accent, prompt }: { accent: AccentKey; prompt: string }) {
  const tickets = useArcade((s) => s.tickets)
  const exit = useArcade((s) => s.exit)
  const color = useLivery((s) => s.table[accent])
  // "Key: verb · Key: verb": every key before a colon takes the Accent.
  const parts = prompt.split(' · ').map((part) => {
    const colon = part.indexOf(':')
    return colon > 0 ? { key: part.slice(0, colon), verb: part.slice(colon) } : { key: '', verb: part }
  })
  return (
    <>
      <div style={{ ...panel, top: 12, right: 12, textAlign: 'right' }}>
        <div style={{ fontSize: 40 }}>{tickets.toLocaleString()}</div>
        <div style={{ fontSize: 20, opacity: 0.8 }}>TICKETS</div>
      </div>
      {prompt && (
        <div style={{ ...panel, bottom: 12, left: '50%', transform: 'translateX(-50%)', fontSize: 40, whiteSpace: 'nowrap' }}>
          {parts.map(({ key, verb }, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              {key && <span style={{ color }}>{key}</span>}
              {verb}
            </span>
          ))}
        </div>
      )}
      <button type="button" onClick={exit} style={{ ...panel, bottom: 12, left: 12, fontSize: 20, border: `1px solid ${SHELL.edge}`, cursor: 'pointer' }}>
        Esc: back
      </button>
    </>
  )
}
