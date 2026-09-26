'use client'

// Audition board for the chiptune sound effects in src/arcade/sfx.ts. Click a cue to hear it.
import { sfx } from '@/arcade/sfx'

const CUES: [string, () => void][] = [
  ['hover', sfx.hover], ['click', sfx.click], ['back', sfx.back], ['enter', sfx.enter],
  ['openStore', sfx.openStore], ['nav', sfx.nav], ['toggle on', () => sfx.toggle(true)], ['toggle off', () => sfx.toggle(false)],
  ['start', sfx.start], ['count', sfx.count], ['go', sfx.go], ['launch', sfx.launch],
  ['hit 1', () => sfx.hit(1)], ['hit 5', () => sfx.hit(5)], ['hit 10', () => sfx.hit(10)], ['pop', sfx.pop],
  ['grab', sfx.grab], ['slip', sfx.slip], ['miss', sfx.miss], ['win 3', () => sfx.win(3)],
  ['win 12', () => sfx.win(12)], ['lose', sfx.lose], ['claim', sfx.claim], ['denied', sfx.denied],
]

export default function SfxDevPage() {
  return (
    <main style={{ position: 'fixed', inset: 0, background: '#050406', color: '#ffe099', fontFamily: 'monospace', padding: 24, overflow: 'auto' }}>
      <h1 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Sound effects</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
        {CUES.map(([name, play]) => (
          <button key={name} type="button" onClick={() => play()} style={{ border: '1px solid #ffe09999', background: '#242044', color: 'inherit', padding: '12px 8px', textTransform: 'uppercase', fontSize: 12 }}>
            {name}
          </button>
        ))}
      </div>
    </main>
  )
}
