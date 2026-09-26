'use client'

// Stack to the Top's 2D HUD. Four Are.na references, one surface each:
// Tumbleword pills for row / prize lines, a round-counter badge and chunky Ticket tiles;
// the Nico Nico corner countdown over a maximalist collage during the take-or-risk pause;
// the Afterlife flame banner (MISSED) on a loss; the Blingee jewel-glitter frame on Major.
// Plain DOM; CSS lives in the <style> below so nothing touches globals.css. Bungee is the
// typeface of the approved mock-up; it loads from Google Fonts at runtime with Impact as fallback.
import { useArcade } from '@/arcade/state'
import { H } from '@/machines/stacker/logic'
import { MINOR_ROW } from './face'
import { useStackTopHud } from './hud'
import { DECIDE_MS, PRIZES } from './StackTop'

const CSS = `
.stt { position:absolute; inset:0; pointer-events:none; font-family: Bungee, Impact, "Arial Black", "Helvetica Neue", Arial, sans-serif; color:#fff6d0; text-transform:uppercase; letter-spacing:0.04em; }
.stt-pills { position:absolute; left:16px; top:16px; display:flex; flex-wrap:wrap; gap:6px; align-items:center; max-width:60vw; }
.stt-pill { border-radius:999px; padding:4px 12px; font-size:13px; line-height:1; background:#111; border:2px solid #f2c230; color:#f2c230; box-shadow: 3px 3px 0 #7a1020; }
.stt-pill.on { background:#f2c230; color:#3a0a10; }
.stt-badge { width:34px; height:34px; border-radius:50%; background:#7a1020; border:2px solid #fff6d0; display:grid; place-items:center; font-size:14px; box-shadow: 3px 3px 0 #1b3f9c; }
.stt-tiles { position:absolute; right:16px; top:16px; display:flex; gap:4px; align-items:flex-end; }
.stt-tile { min-width:30px; height:40px; display:grid; place-items:center; font-size:26px; background:#f2c230; color:#3a0a10; border:3px solid #7a1020; box-shadow: 0 4px 0 #3a0a10; }
.stt-tiles small { font-size:11px; color:#f2c230; margin-right:6px; align-self:center; }
.stt-prompt { position:absolute; left:50%; bottom:40px; transform:translateX(-50%); font-size:22px; white-space:nowrap; text-shadow: 2px 2px 0 #7a1020; }
.stt-decide { position:absolute; inset:0; pointer-events:auto; display:grid; place-items:center;
  background:
    repeating-linear-gradient(135deg, rgba(255,61,242,.18) 0 14px, rgba(0,0,0,0) 14px 28px),
    repeating-linear-gradient(45deg, rgba(242,194,48,.14) 0 10px, rgba(0,0,0,0) 10px 26px),
    radial-gradient(circle at 20% 30%, rgba(27,63,156,.6), transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(122,16,32,.7), transparent 45%),
    rgba(0,0,0,.55); }
.stt-count { position:absolute; right:24px; top:72px; font-size:min(28vw, 220px); line-height:.9; color:#fff; -webkit-text-stroke: 4px #7a1020; text-shadow: 8px 8px 0 #1b3f9c, 0 0 30px #ff3df2; animation: stt-tick .5s steps(2) infinite; }
@keyframes stt-tick { 50% { transform: scale(1.04) rotate(-2deg); } }
.stt-card { display:flex; flex-direction:column; gap:10px; align-items:center; background:#111; border:4px solid #f2c230; padding:22px 28px; box-shadow: 8px 8px 0 #7a1020; }
.stt-card h2 { margin:0; font-size:30px; }
.stt-card p { margin:0; font-size:13px; color:#f2c230; font-family: ui-monospace, monospace; text-transform:none; letter-spacing:0; }
.stt-row { display:flex; gap:14px; }
.stt-btn { cursor:pointer; font:inherit; font-size:18px; padding:12px 18px; border:3px solid; text-transform:uppercase; letter-spacing:.05em; }
.stt-btn.take { background:#e8f0ff; color:#1b3f9c; border-color:#1b3f9c; box-shadow: 4px 4px 0 #1b3f9c; }
.stt-btn.risk { background:#f2c230; color:#3a0a10; border-color:#7a1020; box-shadow: 4px 4px 0 #7a1020; }
.stt-btn:hover { transform: translate(-1px,-1px); }
.stt-over { position:absolute; inset:0; display:grid; place-items:center; }
.stt-missed { font-size:min(18vw, 150px); line-height:1; font-weight:900; background: linear-gradient(0deg, #7a1020 0%, #ff2a2a 35%, #ff9a1a 65%, #fff6a0 100%); -webkit-background-clip:text; background-clip:text; color:transparent; filter: drop-shadow(0 0 12px #ff6a1a) drop-shadow(4px 6px 0 #3a0a10); animation: stt-flame .18s steps(2) infinite alternate; }
@keyframes stt-flame { to { background-position: 0 8px; filter: drop-shadow(0 0 22px #ffb01a) drop-shadow(4px 6px 0 #3a0a10); transform: skewX(-2deg) scaleY(1.03); } }
.stt-sub { font-size:20px; margin-top:10px; text-shadow: 2px 2px 0 #7a1020; }
.stt-bling { position:relative; padding:14px; background:
    radial-gradient(circle, #fff 0 2px, transparent 3px) 0 0/18px 18px,
    radial-gradient(circle, #ff3df2 0 2px, transparent 3px) 9px 9px/18px 18px,
    conic-gradient(from 0deg, #f2c230, #ff3df2, #8ec0ff, #f2c230); animation: stt-glitter .35s steps(3) infinite; }
@keyframes stt-glitter { to { background-position: 18px 0, 27px 9px, 0 0; } }
.stt-bling .stt-card { border-color:#fff; }
.stt-minor .stt-card { border-color:#8ec0ff; box-shadow: 8px 8px 0 #1b3f9c; }
`

function Tiles({ n }: { n: number }) {
  const digits = String(n).split('')
  return (
    <div className="stt-tiles" aria-label={`${n} Tickets`}>
      <small>Tickets</small>
      {digits.map((d, i) => (
        <span key={i} className="stt-tile">
          {d}
        </span>
      ))}
    </div>
  )
}

function Decide({ leftMs }: { leftMs: number }) {
  const choose = useStackTopHud((s) => s.choose)
  const secs = Math.ceil(leftMs / 1000)
  return (
    <div className="stt-decide">
      <div className="stt-count">{secs}</div>
      <div className="stt-card">
        <h2>Minor line reached</h2>
        <p>
          Take {PRIZES.payout.minor} Tickets now, or go for the top and {PRIZES.payout.major}. Miss on the way up and
          you keep {PRIZES.payout.perRow} a row. No pick in {DECIDE_MS / 1000} s takes Minor.
        </p>
        <div className="stt-row">
          <button type="button" className="stt-btn take" onClick={() => choose('take')}>
            ← Take Minor +{PRIZES.payout.minor}
          </button>
          <button type="button" className="stt-btn risk" onClick={() => choose('risk')}>
            Go for Major +{PRIZES.payout.major} →
          </button>
        </div>
      </div>
    </div>
  )
}

function Over() {
  const result = useStackTopHud((s) => s.lastResult)
  if (!result) return null
  if (result.kind === 'lose') {
    return (
      <div className="stt-over">
        <div style={{ textAlign: 'center' }}>
          <div className="stt-missed">Missed</div>
          <div className="stt-sub">
            {result.rowsPlaced} rows, +{result.tickets} Tickets
          </div>
        </div>
      </div>
    )
  }
  if (result.kind === 'minor') {
    return (
      <div className="stt-over stt-minor">
        <div className="stt-card">
          <h2>Minor Prize</h2>
          <div className="stt-sub">+{result.tickets} Tickets</div>
        </div>
      </div>
    )
  }
  return (
    <div className="stt-over">
      <div className="stt-bling">
        <div className="stt-card">
          <h2>Major Prize</h2>
          <div className="stt-sub">+{result.tickets} Tickets</div>
        </div>
      </div>
    </div>
  )
}

export function StackTopHud() {
  const tickets = useArcade((s) => s.tickets)
  const phase = useStackTopHud((s) => s.phase)
  const row = useStackTopHud((s) => s.row)
  const rounds = useStackTopHud((s) => s.rounds)
  const leftMs = useStackTopHud((s) => s.decideLeftMs)
  const shownRow = phase === 'idle' ? 0 : Math.min(row + (phase === 'over' ? 0 : 1), H)

  return (
    <div className="stt">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bungee&display=swap" />
      <style>{CSS}</style>
      <div className="stt-pills">
        <span className="stt-badge" title="Rounds">
          {rounds}
        </span>
        <span className="stt-pill on">Stack to the Top</span>
        <span className="stt-pill">
          Row {shownRow} / {H}
        </span>
        <span className={`stt-pill ${row >= MINOR_ROW && phase !== 'idle' ? 'on' : ''}`}>
          Minor {MINOR_ROW} · +{PRIZES.payout.minor}
        </span>
        <span className="stt-pill">
          Major {H} · +{PRIZES.payout.major}
        </span>
      </div>
      <Tiles n={tickets} />
      {phase === 'idle' && <div className="stt-prompt">Space to start</div>}
      {phase === 'playing' && <div className="stt-prompt">Space to stop</div>}
      {phase === 'decide' && <Decide leftMs={leftMs} />}
      {phase === 'over' && <Over />}
    </div>
  )
}
