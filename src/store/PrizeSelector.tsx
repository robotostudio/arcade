'use client'

// The Store's select screen, built into the counter (Tony Hawk's "select player", in the
// Room): a framed prize screen above the counter shows the picked bundle's 32-bit sprite
// through the PS1 crunch, cream arrows either side browse, three arcade buttons on the
// counter top take a Ticket off, Accept (claim) and put a Ticket on. Stats and details
// hang beside the screen and the button legend sits on the counter front, both as DOM
// panels placed in world space (drei Html transform) so they stay crisp on the low-res
// canvas. Everything wears the Livery (issue 12): frame, trim and screen from the material
// factory, the panels in the Shell's surface and cream text, VT323 at 20 and 40 px, the
// Item's Tier colour on its own parts and Gold on Accept. Look rules: Lambert (Gouraud),
// no shadows, low-segment primitives, module-level materials, useFrame only mutates refs.
import { useEffect, useRef, useState } from 'react'
import { Html, useCursor, useTexture } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useArcade } from '@/arcade/state'
import { sfx } from '@/arcade/sfx'
import { CREDIT, creditGbp } from '@/arcade/economy'
import { accentMaterial, bodyMaterial, flatMaterial, litMaterial, unlitMaterial } from '@/world/livery'
import { SHELL } from '@/world/Shell'
import { GRADE_LABEL, ITEMS, STAT_KEYS, STAT_LABEL, TIER_HEX, itemAfter, itemById, pricePerPiece } from './items'
import { usePrizeUrls } from './catalogue'
import { configurePrizeTextures } from './prizeTextures'
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

// Livery materials (shared, snapped, repainted live by ?livery=1). The Store has no Accent, so the
// arrows and Ticket buttons are cream that blooms on hover; Accept is Gold, the Store's own colour.
const MAT = {
  frame: bodyMaterial('frame'),
  trim: bodyMaterial('trim'),
  screen: flatMaterial('screen'),
  panel: bodyMaterial('panel'),
  panelHot: accentMaterial('panel'),
  accept: litMaterial(TIER_HEX.gold),
  acceptHot: unlitMaterial(TIER_HEX.gold),
} as const

// A chunky right-pointing triangle; the left arrow mirrors it.
const ARROW_GEO = (() => {
  const shape = new THREE.Shape().moveTo(0, 0.32).lineTo(0.5, 0).lineTo(0, -0.32).closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false })
  geo.translate(0, 0, -0.06)
  return geo
})()

const SEGMENTS = 10

const CSS = `
.pz { font-family: var(--font-vt323), monospace; font-size:20px; line-height:1; color:${SHELL.text}; user-select:none; }
.pz * { box-sizing:border-box; }
.pz b { font-weight:normal; }
.pz-panel { width:430px; background:${SHELL.surface}; border:1px solid ${SHELL.edge}; padding:14px 16px 16px; }
.pz-title { font-size:40px; line-height:.9; color:var(--tier); border-bottom:1px solid ${SHELL.edge}; padding-bottom:8px; margin:0 0 10px; }
.pz-stats { display:grid; grid-template-columns:auto 1fr; gap:6px 14px; align-items:center; text-transform:uppercase; }
.pz-bar { display:flex; gap:3px; height:12px; }
.pz-bar i { flex:0 0 15px; background:rgba(255,244,215,.1); }
.pz-bar i.on { background:var(--c); }
.pz-facts { margin:12px 0 0; display:grid; grid-template-columns:auto 1fr; gap:4px 16px; }
.pz-facts dt { text-transform:uppercase; opacity:.7; }
.pz-facts dd { margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pz-facts dd s { opacity:.5; margin-right:.5em; }
.pz-deal { margin-top:12px; border-top:1px solid ${SHELL.edge}; padding-top:10px; display:grid; grid-template-columns:1fr auto; gap:5px 12px; align-items:baseline; }
.pz-deal .k { text-transform:uppercase; opacity:.7; }
.pz-deal .v { text-align:right; font-variant-numeric:tabular-nums; }
.pz-deal .v.now { font-size:40px; }
.pz-deal .pz-bar { grid-column:1 / -1; }
.pz-deal .pz-bar i { flex:1 1 0; }
.pz-note { grid-column:1 / -1; line-height:1.1; opacity:.6; }
.pz-legend { display:flex; gap:26px; white-space:nowrap; text-transform:uppercase; background:${SHELL.surface}; border:1px solid ${SHELL.edge}; padding:8px 18px; }
.pz-legend b { margin-right:.35em; }
.pz-legend button { font:inherit; text-transform:inherit; color:inherit; background:none; border:0; padding:0; cursor:pointer; }
.pz-legend button:hover { filter:brightness(1.25); }
.pz-tickets { white-space:nowrap; text-transform:uppercase; background:${SHELL.surface}; border:1px solid ${SHELL.edge}; padding:6px 14px; }
.pz-tickets b { font-size:40px; margin-right:.3em; }
.pz-claimed { font-size:40px; text-transform:uppercase; color:var(--tier); transform:rotate(-8deg); background:${SHELL.surface}; border:2px solid var(--tier); padding:4px 12px; }
.pz-btnlabels { display:flex; gap:0; text-transform:uppercase; }
.pz-btnlabels span { width:152px; text-align:center; }
.pz-btnlabels span.go { color:${TIER_HEX.gold}; }
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

  // Usually already fetched and resident: the Room warms these up while the hub idles (prizeTextures.tsx).
  const textures = useTexture(usePrizeUrls(), configurePrizeTextures)

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
      <mesh position={[0, 0, depth / 2 + 0.005]} material={MAT.screen}>
        <planeGeometry args={[size, size]} />
      </mesh>
      <mesh ref={sprite} position={[0, 0, depth / 2 + 0.015]}>
        <planeGeometry args={[size - 0.1, size - 0.1]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* Legs down to the shelf so the screen does not float */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (size / 2 - 0.2), -size / 2 - 0.45, -0.1]} material={MAT.trim}>
          <boxGeometry args={[0.08, 0.8, 0.08]} />
        </mesh>
      ))}
      {claimed && (
        <Html transform distanceFactor={PX_PER_UNIT} position={[size / 2 - 0.55, size / 2 - 0.35, depth / 2 + 0.03]} style={{ pointerEvents: 'none' }}>
          <div className="pz" style={{ ['--tier' as string]: TIER_HEX[ITEMS[index].tier] }}><div className="pz-claimed">Claimed</div></div>
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
      material={hovered ? MAT.panelHot : MAT.panel}
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
      <ArcadeButton x={BUTTON_X[0]} radius={0.2} idle={MAT.panel} hot={MAT.panelHot} enabled={applied > 0 && !isClaimed} onPress={() => apply(applied - 1)} label="Ticket off" />
      <ArcadeButton x={BUTTON_X[1]} radius={0.3} idle={MAT.accept} hot={MAT.acceptHot} enabled={canClaim} onPress={claim} label="Accept" />
      <ArcadeButton x={BUTTON_X[2]} radius={0.2} idle={MAT.panel} hot={MAT.panelHot} enabled={applied < max && !isClaimed} onPress={() => apply(applied + 1)} label="Ticket on" />
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
      <mesh position={[0, 0.02, 0]} material={MAT.trim}>
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
      <style>{CSS}</style>
      <div className="pz pz-panel" role="region" aria-label="Bundle details" style={{ ['--tier' as string]: TIER_HEX[item.tier] }}>
        <h2 className="pz-title">{item.title}</h2>
        <div className="pz-stats">
          {STAT_KEYS.map((k) => (
            <span key={k} style={{ display: 'contents' }}>
              <span>{STAT_LABEL[k]}</span>
              <Bar value={item.stats[k]} color={TIER_HEX[item.tier]} />
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
          <Bar value={meterFill} color={SHELL.text} />
          <span className="k">Credit (max {CREDIT.capPct}%)</span>
          <span className="v off">−{formatGbp(off)}</span>
          <span className="k">You pay</span>
          <span className="v now">{isClaimed ? 'Claimed' : formatGbp(priceAfter(item, visibleApplied))}</span>
          <span className="pz-note">
            {tickets === 0 ? 'No Tickets yet. Play a Machine.' : 'Apply Tickets for money off, then Accept to check out on Shopify with the credit applied. One claim per bundle.'}
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
