'use client'

// The Stacker Machine: cabinet + a 7x15 grid drawn as ONE instancedMesh.
// Game rules live in ./logic (pure); this file only drives them from useFrame
// and input, paints the grid, and reports to the HUD store and onRoundEnd.
import { useEffect, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Object3D, type InstancedMesh } from 'three'
import type { MachineProps } from '@/machines/types'
import {
  H,
  W,
  createState,
  currentRow,
  forfeit,
  press,
  step,
  toAttract,
  type StackerState,
} from './logic'
import { useStackerHud } from './hud'
import { cellColors, materials } from './materials'

// Layout (metres). The grid sits inside the bezel on the cabinet face.
const CELL = 0.2
const BOX = 0.17
const GRID_Y = 0.45 // bottom edge of row 0
const FACE_Z = 0.45 // front of the cabinet body
const BEZEL_D = 0.04
const CELL_Z = FACE_Z + BEZEL_D + BOX / 2
const COUNT = W * H

const dummy = new Object3D() // reused for every setMatrixAt, never allocated per frame

function inRow(r: { start: number; end: number }, c: number) {
  return c >= r.start && c < r.end
}

function paint(mesh: InstancedMesh, s: StackerState) {
  const row = currentRow(s)
  const won = s.result?.kind === 'win'
  const lost = s.result?.kind === 'lose'
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const i = r * W + c
      let color = null
      if (r < s.placed.length && inRow(s.placed[r], c)) {
        color = won && r === H - 1 ? cellColors.gold : cellColors.placed
      } else if (r === row && inRow(s.moving, c)) {
        if (s.phase !== 'over') color = cellColors.moving
        else if (lost) color = cellColors.miss
      }
      dummy.position.set((c - (W - 1) / 2) * CELL, GRID_Y + r * CELL + CELL / 2, CELL_Z)
      dummy.scale.setScalar(color ? 1 : 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, color ?? cellColors.placed)
    }
  }
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

function publish(s: StackerState) {
  useStackerHud.setState({
    phase: s.phase,
    row: s.phase === 'over' ? s.placed.length : currentRow(s),
    ...(s.result ? { lastResult: s.result } : {}),
  })
}

export function Stacker({ position, rotation, active, onRoundEnd }: MachineProps) {
  const grid = useRef<InstancedMesh>(null)
  const state = useRef<StackerState>(null)
  if (!state.current) state.current = createState()
  const painted = useRef(-1)
  const onRoundEndRef = useRef(onRoundEnd)
  onRoundEndRef.current = onRoundEnd

  const doPress = useRef(() => {
    const s = state.current!
    const ev = press(s)
    if (ev === 'ignored') return
    publish(s)
    if ((ev === 'won' || ev === 'lost') && s.result) onRoundEndRef.current(s.result.tickets)
  }).current

  // Leaving the Machine mid-Round forfeits it (still pays rows placed), then attract.
  useEffect(() => {
    const s = state.current!
    if (active) return
    if (forfeit(s) && s.result) onRoundEndRef.current(s.result.tickets)
    toAttract(s)
    publish(s)
  }, [active])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'Enter' && e.code !== 'NumpadEnter') return
      e.preventDefault()
      if (e.repeat) return
      doPress()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, doPress])

  useFrame((_, delta) => {
    const s = state.current!
    if (step(s, delta * 1000) === 'attract') publish(s)
    const mesh = grid.current
    if (mesh && painted.current !== s.version) {
      paint(mesh, s)
      painted.current = s.version
    }
  })

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!active) return
    e.stopPropagation()
    doPress()
  }

  return (
    <group position={position} rotation={rotation} onPointerDown={onPointerDown}>
      {/* Cabinet: plinth, body, bezel, control deck with the stop button, marquee. */}
      <mesh position={[0, 0.1, 0]} material={materials.plinth}>
        <boxGeometry args={[2.1, 0.2, 1.0]} />
      </mesh>
      <mesh position={[0, 1.95, 0]} material={materials.body}>
        <boxGeometry args={[1.9, 3.5, 0.9]} />
      </mesh>
      <mesh position={[0, 1.95, FACE_Z + BEZEL_D / 2]} material={materials.bezel}>
        <boxGeometry args={[1.7, 3.3, BEZEL_D]} />
      </mesh>
      <mesh position={[0, 0.26, FACE_Z + 0.17]} material={materials.trim}>
        <boxGeometry args={[1.9, 0.12, 0.34]} />
      </mesh>
      <mesh position={[0, 0.35, FACE_Z + 0.2]} material={materials.marquee}>
        <cylinderGeometry args={[0.1, 0.1, 0.06, 8]} />
      </mesh>
      <mesh position={[0, 3.93, 0.05]} material={materials.marquee}>
        <boxGeometry args={[2.0, 0.45, 1.0]} />
      </mesh>

      {/* The grid: 7x15 cells, hidden cells scaled to 0. */}
      <instancedMesh
        ref={grid}
        args={[undefined, undefined, COUNT]}
        material={materials.cell}
        frustumCulled={false}
      >
        <boxGeometry args={[BOX, BOX, BOX]} />
      </instancedMesh>

      {/* Screen glow so the red reads in the gloom. */}
      <pointLight position={[0, 2, 1.3]} color="#ff9a7a" intensity={4} distance={4.5} decay={2} />

      {/* Big invisible click target in front of the cabinet. */}
      <mesh position={[0, 2, FACE_Z + 0.45]} material={materials.hit}>
        <planeGeometry args={[2.6, 4.6]} />
      </mesh>
    </group>
  )
}
