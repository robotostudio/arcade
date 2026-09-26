'use client'

// Stack to the Top: the Stacker rules plus Minor and Major prize lines, in a cabinet
// modelled on the real machine. Rules live in ../stacker/logic (pure); this file drives
// them from useFrame and input, paints the grid (one instancedMesh), shows the face
// (one CanvasTexture drawn on mount) and reports to its HUD store and onRoundEnd.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { MeshBasicMaterial, type InstancedMesh } from 'three'
import type { MachineProps } from '@/machines/types'
import { PAYOUT } from '@/arcade/economy'
import {
  H,
  W,
  choose,
  createState,
  currentRow,
  forfeit,
  press,
  step,
  toAttract,
  type Choice,
  type Prizes,
  type StackerState,
} from '@/machines/stacker/logic'
import { paintGrid, type GridLayout } from '@/machines/stacker/grid'
import { useStackTopHud } from './hud'
import { cellColors, materials } from './materials'
import { BODY_D, BODY_H, BODY_W, BOX, CELL, FACE_Y0, FACE_Z, MINOR_ROW, createFaceTexture, rowY } from './face'

export const DECIDE_MS = 8000
export const PRIZES: Prizes = { minorRow: MINOR_ROW, payout: PAYOUT.stacktop, decideMs: DECIDE_MS }

// Camera dock for the Room and the harness, relative to the cabinet origin (player at +z).
export const DOCK = { position: [0, 2.9, 6.6], target: [0, 2.45, 0] } as const

const CELL_Z = FACE_Z + 0.01 + BOX / 2
const COUNT = W * H
const LAYOUT: GridLayout = { cell: CELL, z: CELL_Z, rowY }
const DECK_Y = 0.5
const DECK_D = 0.5
const BUTTON_Z = FACE_Z + DECK_D * 0.6
const TENTH = 100 // the HUD countdown updates at this granularity, never per frame

function publish(s: StackerState) {
  useStackTopHud.setState({
    phase: s.phase,
    row: s.phase === 'over' ? s.placed.length : currentRow(s),
    decideLeftMs: s.phase === 'decide' ? Math.max(0, PRIZES.decideMs - s.decideMs) : 0,
    ...(s.result ? { lastResult: s.result } : {}),
  })
}

export function StackTop({ position, rotation, active, onRoundEnd }: MachineProps) {
  const grid = useRef<InstancedMesh>(null)
  const state = useRef<StackerState>(null)
  if (!state.current) state.current = createState(PRIZES)
  const painted = useRef(-1)
  const lastTenth = useRef(-1)
  const onRoundEndRef = useRef(onRoundEnd)
  onRoundEndRef.current = onRoundEnd

  const faceMaterial = useMemo(() => new MeshBasicMaterial({ map: createFaceTexture() }), [])
  useEffect(
    () => () => {
      faceMaterial.map?.dispose()
      faceMaterial.dispose()
    },
    [faceMaterial],
  )

  // Every way a Round ends goes through here, so onRoundEnd fires exactly once per Round.
  const report = useRef((s: StackerState) => {
    publish(s)
    useStackTopHud.setState((h) => ({ rounds: h.rounds + 1 }))
    if (s.result) onRoundEndRef.current(s.result.tickets)
  }).current

  const doPress = useRef(() => {
    const s = state.current!
    const ev = press(s)
    if (ev === 'ignored') return
    if (ev === 'won' || ev === 'lost') report(s)
    else publish(s)
  }).current

  const doChoose = useRef((c: Choice) => {
    const s = state.current!
    const ev = choose(s, c)
    if (ev === 'ignored') return
    if (ev === 'took') report(s)
    else publish(s)
  }).current

  // Let the HUD's buttons pick too.
  useEffect(() => {
    useStackTopHud.setState({ choose: doChoose })
    return () => useStackTopHud.setState({ choose: () => {} })
  }, [doChoose])

  // Leaving the Machine mid-Round forfeits (pays rows placed; in the pause, takes Minor).
  useEffect(() => {
    const s = state.current!
    if (active) return
    if (forfeit(s)) report(s)
    toAttract(s)
    publish(s)
  }, [active, report])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault()
        if (e.repeat) return
        doChoose(e.code === 'ArrowLeft' ? 'take' : 'risk')
        return
      }
      if (e.code !== 'Space' && e.code !== 'Enter' && e.code !== 'NumpadEnter') return
      e.preventDefault()
      if (e.repeat) return
      doPress()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, doPress, doChoose])

  useFrame((_, delta) => {
    const s = state.current!
    const ev = step(s, delta * 1000)
    if (ev === 'attract') publish(s)
    else if (ev === 'autotook') report(s)
    else if (ev === 'deciding') {
      const tenth = Math.floor(s.decideMs / TENTH)
      if (tenth !== lastTenth.current) {
        lastTenth.current = tenth
        publish(s)
      }
    }
    const mesh = grid.current
    if (mesh && painted.current !== s.version) {
      paintGrid(mesh, s, LAYOUT, cellColors)
      painted.current = s.version
    }
  })

  const stop = (fn: () => void) => (e: ThreeEvent<PointerEvent>) => {
    if (!active) return
    e.stopPropagation()
    fn()
  }

  return (
    <group position={position} rotation={rotation} onPointerDown={stop(doPress)}>
      {/* Plinth, body, yellow edge strips. */}
      <mesh position={[0, 0.1, 0.05]} material={materials.plinth}>
        <boxGeometry args={[BODY_W + 0.2, 0.2, BODY_D + 0.1]} />
      </mesh>
      <mesh position={[0, BODY_H / 2, 0]} material={materials.body}>
        <boxGeometry args={[BODY_W, BODY_H, BODY_D]} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (BODY_W / 2 + 0.02), BODY_H / 2 + 0.2, 0]} material={materials.side}>
          <boxGeometry args={[0.04, BODY_H - 0.4, BODY_D - 0.1]} />
        </mesh>
      ))}
      <mesh position={[0, BODY_H + 0.03, 0]} material={materials.trim}>
        <boxGeometry args={[BODY_W + 0.1, 0.06, BODY_D + 0.05]} />
      </mesh>

      {/* The face: marquee, banners, side columns and glass in one texture. */}
      <mesh position={[0, (FACE_Y0 + BODY_H) / 2, FACE_Z + 0.005]} material={faceMaterial}>
        <planeGeometry args={[BODY_W, BODY_H - FACE_Y0]} />
      </mesh>

      {/* Control deck: the big red stop button between the white TAKE and gold GO buttons. */}
      <mesh position={[0, DECK_Y, FACE_Z + DECK_D / 2]} material={materials.deck}>
        <boxGeometry args={[BODY_W, 0.14, DECK_D]} />
      </mesh>
      <mesh position={[0, DECK_Y + 0.07, FACE_Z + 0.02]} material={materials.trim}>
        <boxGeometry args={[BODY_W, 0.03, 0.04]} />
      </mesh>
      <mesh position={[0, DECK_Y + 0.1, BUTTON_Z]} material={materials.stop} onPointerDown={stop(doPress)}>
        <cylinderGeometry args={[0.14, 0.14, 0.08, 10]} />
      </mesh>
      <mesh position={[-0.55, DECK_Y + 0.09, BUTTON_Z]} material={materials.take} onPointerDown={stop(() => doChoose('take'))}>
        <cylinderGeometry args={[0.1, 0.1, 0.06, 8]} />
      </mesh>
      <mesh position={[0.55, DECK_Y + 0.09, BUTTON_Z]} material={materials.risk} onPointerDown={stop(() => doChoose('risk'))}>
        <cylinderGeometry args={[0.1, 0.1, 0.06, 8]} />
      </mesh>

      {/* The grid: 7x15 cells, hidden cells scaled to 0. */}
      <instancedMesh ref={grid} args={[undefined, undefined, COUNT]} material={materials.cell} frustumCulled={false}>
        <boxGeometry args={[BOX, BOX, BOX]} />
      </instancedMesh>

      {/* The bright island: warm spill onto the deck and floor, red glow off the glass. */}
      <pointLight position={[0, 4.4, 1.2]} color="#ffd98a" intensity={6} distance={5} decay={2} />
      <pointLight position={[0, 2.2, 1.4]} color="#ff5a3a" intensity={4} distance={4} decay={2} />

      {/* Invisible click target over the glass (the deck buttons sit below it). */}
      <mesh position={[0, (FACE_Y0 + BODY_H) / 2 + 0.2, FACE_Z + 0.3]} material={materials.hit}>
        <planeGeometry args={[BODY_W + 0.4, BODY_H - FACE_Y0]} />
      </mesh>
    </group>
  )
}
