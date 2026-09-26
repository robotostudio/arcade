'use client'

// ?livery=1: a DOM panel outside the Look listing every Livery colour as a picker (issue 12).
// Changes repaint every registered material and Display live; overrides persist in localStorage;
// "Copy as code" puts the LIVERY block on the clipboard in the shape of src/world/livery.ts.
import { useEffect, useState } from 'react'
import { LIVERY, LIVERY_COLOR_KEYS, liveryAsCode, useLivery } from './livery'

const LABELS: Record<string, string> = {
  plinth: 'Plinth', trim: 'Trim', panel: 'Panel', frame: 'Display frame', screen: 'Display screen', text: 'Display text',
  whackamole: 'Accent: Whack-a-Mole', skeeball: 'Accent: Skeeball', stacktop: 'Accent: Stack to the Top', claw: 'Accent: Claw',
}

export function LiveryPanel() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const table = useLivery((s) => s.table)
  const set = useLivery((s) => s.set)
  const reset = useLivery((s) => s.reset)
  useEffect(() => { setOpen(new URLSearchParams(window.location.search).get('livery') === '1') }, [])
  if (!open) return null

  const copy = async () => {
    await navigator.clipboard.writeText(liveryAsCode(table))
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }
  return (
    <div style={{ position: 'fixed', top: 12, left: 12, zIndex: 100, width: 260, padding: 12, background: '#111', color: '#eee', font: '13px/1.6 ui-monospace, monospace', border: '1px solid #444' }}>
      <div style={{ ...row, marginBottom: 6 }}><b>Livery</b><span style={{ opacity: 0.6 }}>?livery=1</span></div>
      {LIVERY_COLOR_KEYS.map((key) => (
        <label key={key} style={row}>
          <span>{LABELS[key] ?? key}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <code style={{ opacity: table[key] === LIVERY[key] ? 0.5 : 1 }}>{table[key]}</code>
            <input type="color" value={table[key]} onChange={(e) => set(key, e.target.value)} />
          </span>
        </label>
      ))}
      <label style={row}>
        <span>Glow (Accent-lit)</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <code>{table.glow.toFixed(2)}</code>
          <input type="range" min={0.5} max={2} step={0.05} value={table.glow} onChange={(e) => set('glow', Number(e.target.value))} style={{ width: 70 }} />
        </span>
      </label>
      <div style={{ ...row, marginTop: 8 }}>
        <button type="button" onClick={reset} style={btn}>Reset</button>
        <button type="button" onClick={copy} style={btn}>{copied ? 'Copied' : 'Copy as code'}</button>
      </div>
    </div>
  )
}

const btn: React.CSSProperties = { font: 'inherit', color: '#eee', background: '#222', border: '1px solid #555', padding: '2px 10px', cursor: 'pointer' }
