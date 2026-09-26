'use client'

// The Store's select screen, built into the counter (Tony Hawk's "select player", in the
// Room): a framed prize screen above the counter shows the picked bundle's 32-bit sprite
// through the PS1 crunch, red arrows either side browse, three arcade buttons on the
// counter top take a Ticket off, Accept (claim) and put a Ticket on. Stats and details
// hang beside the screen and the button legend sits on the counter front, both as DOM
// panels placed in world space (drei Html transform) so they stay crisp on the low-res
// canvas. Look rules: Lambert (Gouraud), no shadows, low-segment primitives, module-level
// materials, useFrame only mutates refs.
import { useEffect, useRef, useState } from 'react'
import { Html, useCursor, useTexture } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useArcade } from '@/arcade/state'
import { sfx } from '@/arcade/sfx'
import { CREDIT, creditGbp } from '@/arcade/economy'
import { GRADE_LABEL, ITEMS, STAT_KEYS, STAT_LABEL, itemAfter, itemById, pricePerPiece, type StatKey } from './items'
import { formatGbp, maxApplicable, priceAfter, useStore } from './state'

type Vec3 = [number, number, number]

// Layout in counter-local units (the counter body is 6 wide, 1.2 high, 1.5 deep).
const SCREEN = { x: 1.2, y: 3.15, z: -0.55, size: 2.8, depth: 0.16 }
const ARROW_GAP = 0.45
const PANEL: Vec3 = [-2.95, 2.95, -0.5]
const LEGEND: Vec3 = [0.3, 0.62, 0.77]
const BUTTON_Y = 1.2 + 0.12 // top of the slab
const BUTTON_Z = 0.4
const BUTTON_X = [-0.95, 0, 0.95]
const BUTTON_GROUP_X = 1.2 // under the screen
const PX_PER_UNIT = 2.5 // drei Html distanceFactor: 400 / 2.5 = 160 css px per world unit

const lambert = (color: string, emissive?: string) =>
  new THREE.MeshLambertMaterial({ color, ...(emissive ? { emissive: new THREE.Color(emissive) } : {}) })

const MAT = {
  frame: lambert('#0e3546', '#0b4b66'),
  bezel: lambert('#1a1614'),
  black: new THREE.MeshBasicMaterial({ color: '#000000' }),
  arrow: lambert('#ff2a1a', '#7a0c04'),
  arrowHot: lambert('#ff6a4a', '#b0301a'),
  red: lambert('#d92a1c', '#5a0c06'),
  yellow: lambert('#f2c14e', '#6a4a00'),
  yellowHot: lambert('#ffe08a', '#9a6e00'),
  redHot: lambert('#ff6a5a', '#8a2010'),
  label: lambert('#f2ecd8', '#3a362e'),
} as const

// A chunky right-pointing triangle; the left arrow mirrors it.
const ARROW_GEO = (() => {
  const shape = new THREE.Shape().moveTo(0, 0.32).lineTo(0.5, 0).lineTo(0, -0.32).closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false })
  geo.translate(0, 0, -0.06)
  return geo
})()

const STAT_COLOR: Record<StatKey, string> = { drip: '#4be3ff', cond: '#4a86ff', warm: '#ffb13c' }
const SEGMENTS = 10

const CSS = `
.pz { font-family: Bungee, Impact, "Arial Black", "Helvetica Neue", Arial, sans-serif; text-transform:uppercase; color:#fff3d6; letter-spacing:.06em; user-select:none; }
.pz * { box-sizing:border-box; }
.pz-panel { width:430px; background:rgba(4,10,18,.86); border:3px solid rgba(58,200,255,.6); box-shadow:0 0 0 2px #06202e, 0 0 18px rgba(58,200,255,.35); padding:14px 16px 16px; }
.pz-title { font-size:22px; letter-spacing:.14em; color:#fff; text-shadow:0 0 10px rgba(80,200,255,.6), 3px 3px 0 #08131f; line-height:1.05; border-bottom:3px solid rgba(90,210,255,.55); padding-bottom:6px; margin:0 0 10px; }
.pz-stats { display:grid; grid-template-columns:auto 1fr; gap:6px 14px; align-items:center; font-size:13px; letter-spacing:.22em; }
.pz-bar { display:flex; gap:3px; height:12px; }
.pz-bar i { flex:0 0 15px; transform:skewX(-24deg); background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.08); }
.pz-bar i.on { background:var(--c); box-shadow:0 0 6px var(--c), inset 0 -3px 0 rgba(0,0,0,.35); border-color:transparent; }
.pz-facts { margin:12px 0 0; display:grid; grid-template-columns:auto 1fr; gap:4px 16px; font-size:12px; letter-spacing:.2em; }
.pz-facts dt { color:#ffd36b; text-shadow:2px 2px 0 #3a1a00; }
.pz-facts dd { margin:0; color:#fff; text-shadow:2px 2px 0 #08131f; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pz-facts dd s { color:rgba(255,255,255,.4); margin-right:.5em; }
.pz-deal { margin-top:12px; border-top:2px solid rgba(255,211,107,.4); padding-top:10px; display:grid; grid-template-columns:1fr auto; gap:5px 12px; font-size:12px; letter-spacing:.18em; align-items:baseline; }
.pz-deal .k { color:#ffd36b; text-shadow:2px 2px 0 #3a1a00; }
.pz-deal .v { text-align:right; color:#fff; text-shadow:2px 2px 0 #08131f; font-variant-numeric:tabular-nums; }
.pz-deal .v.off { color:#ff7a6a; }
.pz-deal .v.now { color:#7dffb0; font-size:20px; }
.pz-deal .pz-bar { grid-column:1 / -1; }
.pz-deal .pz-bar i { flex:1 1 0; }
.pz-note { grid-column:1 / -1; font-family:ui-monospace, Menlo, monospace; text-transform:none; letter-spacing:0; font-size:11px; color:rgba(255,255,255,.5); }
.pz-legend { display:flex; gap:26px; white-space:nowrap; font-size:16px; letter-spacing:.14em; color:#ffd36b; text-shadow:2px 2px 0 #3a1a00; background:rgba(4,10,18,.8); border:2px solid rgba(255,211,107,.4); padding:8px 18px; }
.pz-legend b { color:#fff; margin-right:.35em; }
.pz-legend button { font:inherit; letter-spacing:inherit; text-transform:inherit; color:inherit; text-shadow:inherit; background:none; border:0; padding:0; cursor:pointer; }
.pz-legend button:hover { color:#fff; }
.pz-tickets { font-size:14px; color:#ffd36b; text-shadow:2px 2px 0 #3a1a00; white-space:nowrap; background:rgba(4,10,18,.8); border:2px solid rgba(255,211,107,.4); padding:6px 14px; }
.pz-tickets b { font-size:24px; color:#fff; margin-right:.3em; }
.pz-claimed { font-size:18px; letter-spacing:.2em; color:#7dffb0; text-shadow:2px 2px 0 #000; transform:rotate(-8deg); background:rgba(0,0,0,.7); border:2px solid #7dffb0; padding:4px 12px; }
.pz-btnlabels { display:flex; gap:0; font-size:13px; letter-spacing:.2em; color:#fff3d6; text-shadow:1px 1px 0 #000; }
.pz-btnlabels span { width:152px; text-align:center; }
.pz-btnlabels span.go { color:#ffd36b; }
`

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <span className="pz-bar" style={{ ['--c' as string]: color }} aria-hidden>
      {Array.from({ length: SEGMENTS }, (_, n) => <i key={n} className={n < value ? 'on' : ''} />)}
    </span>
  )
}

export type PrizeSelectorProps = { onClose?: () => void }

export function PrizeSelector({ onClose }: PrizeSelectorProps) {
  const selectedId = useStore((s) => s.selected)
  const select = useStore((s) => s.select)
  useEffect(() => {
    if (!itemById(selectedId)) select(ITEMS[0].id)
  }, [selectedId, select])
  const item = itemById(selectedId) ?? ITEMS[0]
  const index = ITEMS.findIndex((i) => i.id === item.id)

  const textures = useTexture(ITEMS.map((i) => `/store/items/${i.image}`))
  useEffect(() => {
    for (const t of textures) {
      t.magFilter = THREE.NearestFilter
      t.minFilter = THREE.NearestFilter
      t.colorSpace = THREE.SRGBColorSpace
      t.needsUpdate = true
    }
  }, [textures])

  return (
    <group>
      <PrizeScreen texture={textures[index]} index={index} />
      <Arrow side={-1} onClick={() => select(itemAfter(item.id, -1).id)} />
      <Arrow side={1} onClick={() => select(itemAfter(item.id, 1).id)} />
      <CounterButtons />
      <DetailsPanel />
      <Legend onClose={onClose} />
    </group>
  )
}

function PrizeScreen({ texture, index }: { texture: THREE.Texture; index: number }) {
  const sprite = useRef<THREE.Mesh>(null)
  const pop = useRef(0)
  const claimed = useStore((s) => s.claimed.includes(ITEMS[index].id))
  // A three-step pop when the picture changes, the way a PS1 menu snaps between skaters.
  useEffect(() => {
    pop.current = 1
  }, [texture])
  useFrame((_, delta) => {
    if (!sprite.current) return
    pop.current = Math.max(0, pop.current - delta * 6)
    const s = 1 - Math.floor(pop.current * 3) * 0.04
    sprite.current.scale.set(s, s, 1)
  })
  const { size, depth } = SCREEN
  return (
    <group position={[SCREEN.x, SCREEN.y, SCREEN.z]}>
      <mesh material={MAT.frame}>
        <boxGeometry args={[size + 0.3, size + 0.3, depth]} />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.005]} material={MAT.black}>
        <planeGeometry args={[size, size]} />
      </mesh>
      <mesh ref={sprite} position={[0, 0, depth / 2 + 0.015]}>
        <planeGeometry args={[size - 0.1, size - 0.1]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* Legs down to the shelf so the screen does not float */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (size / 2 - 0.2), -size / 2 - 0.45, -0.1]} material={MAT.bezel}>
          <boxGeometry args={[0.08, 0.8, 0.08]} />
        </mesh>
      ))}
      {claimed && (
        <Html transform distanceFactor={PX_PER_UNIT} position={[size / 2 - 0.55, size / 2 - 0.35, depth / 2 + 0.03]} style={{ pointerEvents: 'none' }}>
          <div className="pz"><div className="pz-claimed">Claimed</div></div>
        </Html>
      )}
    </group>
  )
}

function Arrow({ side, onClick }: { side: -1 | 1; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (ref.current) ref.current.position.x = side * (SCREEN.size / 2 + ARROW_GAP + 0.12 + Math.abs(Math.sin(state.clock.elapsedTime * 3)) * 0.06) + SCREEN.x
  })
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onClick()
  }
  return (
    <mesh
      ref={ref}
      geometry={ARROW_GEO}
      material={hovered ? MAT.arrowHot : MAT.arrow}
      position={[SCREEN.x + side * (SCREEN.size / 2 + ARROW_GAP + 0.12), SCREEN.y, SCREEN.z + 0.1]}
      scale={[side, 1, 1]}
      onClick={click}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        sfx.hover()
      }}
      onPointerOut={() => setHovered(false)}
    />
  )
}

// Three arcade buttons on the slab: Ticket off, Accept, Ticket on.
function CounterButtons() {
  const tickets = useArcade((s) => s.tickets)
  const selectedId = useStore((s) => s.selected)
  const applied = useStore((s) => s.applied)
  const claimed = useStore((s) => s.claimed)
  const { apply, claim } = useStore.getState()
  const item = itemById(selectedId) ?? ITEMS[0]
  const max = maxApplicable(item, tickets)
  const isClaimed = claimed.includes(item.id)
  const canClaim = !isClaimed && applied > 0 && applied <= max
  return (
    <group position={[BUTTON_GROUP_X, BUTTON_Y, BUTTON_Z]}>
      <ArcadeButton x={BUTTON_X[0]} radius={0.2} idle={MAT.red} hot={MAT.redHot} enabled={applied > 0 && !isClaimed} onPress={() => apply(applied - 1)} label="Ticket off" />
      <ArcadeButton x={BUTTON_X[1]} radius={0.3} idle={MAT.yellow} hot={MAT.yellowHot} enabled={canClaim} onPress={claim} label="Accept" />
      <ArcadeButton x={BUTTON_X[2]} radius={0.2} idle={MAT.red} hot={MAT.redHot} enabled={applied < max && !isClaimed} onPress={() => apply(applied + 1)} label="Ticket on" />
      <Html transform distanceFactor={PX_PER_UNIT} position={[0, 0.015, 0.42]} rotation={[-Math.PI / 2, 0, 0]} style={{ pointerEvents: 'none' }}>
        <div className="pz pz-btnlabels">
          <span>− Ticket</span>
          <span className="go">● Accept</span>
          <span>+ Ticket</span>
        </div>
      </Html>
    </group>
  )
}

type ArcadeButtonProps = { x: number; radius: number; idle: THREE.Material; hot: THREE.Material; enabled: boolean; onPress: () => void; label: string }

function ArcadeButton({ x, radius, idle, hot, enabled, onPress, label }: ArcadeButtonProps) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && enabled)
  const cap = useRef<THREE.Mesh>(null)
  const pressed = useRef(0)
  useFrame((_, delta) => {
    if (!cap.current) return
    pressed.current = Math.max(0, pressed.current - delta * 8)
    cap.current.position.y = 0.09 - pressed.current * 0.05
  })
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.02, 0]} material={MAT.bezel}>
        <cylinderGeometry args={[radius + 0.07, radius + 0.07, 0.04, 8]} />
      </mesh>
      <mesh
        ref={cap}
        position={[0, 0.09, 0]}
        material={hovered && enabled ? hot : idle}
        onClick={(e) => {
          e.stopPropagation()
          if (!enabled) { sfx.denied(); return }
          pressed.current = 1
          onPress()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          if (enabled) sfx.hover()
        }}
        onPointerOut={() => setHovered(false)}
        userData={{ label }}
      >
        <cylinderGeometry args={[radius, radius + 0.02, 0.12, 8]} />
      </mesh>
    </group>
  )
}

function DetailsPanel() {
  const tickets = useArcade((s) => s.tickets)
  const selectedId = useStore((s) => s.selected)
  const applied = useStore((s) => s.applied)
  const claimed = useStore((s) => s.claimed)
  const item = itemById(selectedId) ?? ITEMS[0]
  const max = maxApplicable(item, tickets)
  const visibleApplied = Math.min(applied, max)
  const off = creditGbp(item, visibleApplied)
  const isClaimed = claimed.includes(item.id)
  const meterFill = max > 0 ? Math.round((visibleApplied / max) * SEGMENTS) : 0
  return (
    <Html transform distanceFactor={PX_PER_UNIT} position={PANEL} rotation={[0, 0.22, 0]} zIndexRange={[20, 0]}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bungee&display=swap" />
      <style>{CSS}</style>
      <div className="pz pz-panel" role="region" aria-label="Bundle details">
        <h2 className="pz-title">{item.title}</h2>
        <div className="pz-stats">
          {STAT_KEYS.map((k) => (
            <span key={k} style={{ display: 'contents' }}>
              <span>{STAT_LABEL[k]}</span>
              <Bar value={item.stats[k]} color={STAT_COLOR[k]} />
            </span>
          ))}
        </div>
        <dl className="pz-facts">
          <dt>Pieces</dt><dd>{item.pieces}</dd>
          <dt>Grade</dt><dd>{GRADE_LABEL[item.grade]}</dd>
          <dt>Era</dt><dd>{item.era}</dd>
          <dt>Origin</dt><dd>{item.origin}</dd>
          <dt>Fabric</dt><dd>{item.fabric}</dd>
          <dt>Per piece</dt><dd>{formatGbp(pricePerPiece(item))}</dd>
          <dt>Price</dt>
          <dd>{off > 0 ? <><s>{formatGbp(item.priceGbp)}</s>{formatGbp(priceAfter(item, visibleApplied))}</> : formatGbp(item.priceGbp)} · ship inc.</dd>
        </dl>
        <div className="pz-deal">
          <span className="k">Tickets applied</span>
          <span className="v">{visibleApplied} / {max}</span>
          <Bar value={meterFill} color="#ffd36b" />
          <span className="k">Credit (max {CREDIT.capPct}%)</span>
          <span className="v off">−{formatGbp(off)}</span>
          <span className="k">You pay</span>
          <span className="v now">{isClaimed ? 'Claimed' : formatGbp(priceAfter(item, visibleApplied))}</span>
          <span className="pz-note">
            {tickets === 0 ? 'No Tickets yet. Play a Machine.' : 'Demo prizes: apply Tickets for money off, claim once per bundle. No real orders.'}
          </span>
        </div>
      </div>
    </Html>
  )
}

function Legend({ onClose }: { onClose?: () => void }) {
  const tickets = useArcade((s) => s.tickets)
  return (
    <>
      <Html transform distanceFactor={PX_PER_UNIT} position={LEGEND} zIndexRange={[20, 0]}>
        <div className="pz pz-legend">
          <span><b>◀ ▶</b> Select</span>
          <span><b>▲ ▼</b> Tickets</span>
          <span><b>●</b> Accept</span>
          {onClose ? <button type="button" onClick={onClose}><b>△</b> Back</button> : <span><b>△</b> Back</span>}
        </div>
      </Html>
      <Html transform distanceFactor={PX_PER_UNIT} position={[SCREEN.x, SCREEN.y + SCREEN.size / 2 + 0.55, SCREEN.z]} style={{ pointerEvents: 'none' }}>
        <div className="pz pz-tickets"><b>{tickets}</b> Tickets · {formatGbp(tickets * CREDIT.gbpPerTicket)} off</div>
      </Html>
    </>
  )
}
