'use client'

import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Group, Material, Vector3 } from 'three'
import { Display, useDisplay } from '@/world/Display'
import { bodyMaterial, litMaterial, unlitMaterial } from '@/world/livery'
import type { MachineProps } from '../types'
import { WHACK, holePosition } from './constants'
import { initialState, step, type State } from './whackLogic'
import { useWhackInput } from './useWhackInput'

// The reference cabinet for the Livery (issue 12): Plinth, trim and Display frame from the shared
// table, cream panels, the body in the Whack-a-Mole Accent. Colours the Machine owns (the Moles, the
// mallet, the hole rims, the hit ring) go through litMaterial / unlitMaterial so they take the snap.
const MOLE = {
  hole: litMaterial('#291f32'),
  rim: litMaterial('#bd6b31'),
  fur: litMaterial('#a97658', { flatShading: true }),
  ear: litMaterial('#d5a17a', { flatShading: true }),
  eye: litMaterial('#201b2b'),
  nose: litMaterial('#ffc0a0', { flatShading: true }),
  tooth: litMaterial('#fff4d7'),
  ring: unlitMaterial('#fff0a3'),
  handle: litMaterial('#6b3940'),
  head: litMaterial('#ec627b', { flatShading: true }),
}

const FOOTER = '9 HOLES / 30 SECONDS / 5 TICKETS A HIT'

// One prompt string per phase for the Shell: the real key and the verb. Space only starts a Round
// from idle; the result phase ignores input and returns to idle by itself, so there Back is the
// only thing the player can do.
function promptFor(active: boolean, phase: State['phase']): string {
  if (!active) return ''
  if (phase === 'idle') return 'Space: start'
  if (phase === 'result') return 'Esc: back'
  return 'Click or 1-9: whack'
}

function Box({ at, size, material }: { at: [number, number, number]; size: [number, number, number]; material: Material }) {
  return <mesh position={at} material={material}><boxGeometry args={size} /></mesh>
}

// `onPrompt` is the Shell's prompt-per-phase contract (issue 12, step 3); typed here until MachineProps carries it.
type WhackProps = MachineProps & { onPrompt?: (prompt: string) => void }

export function WhackMachine({ position, rotation, active, onRoundEnd, onPrompt }: WhackProps) {
  const state = useRef(initialState())
  const board = useRef<Group>(null)
  const moles = useRef<(Group | null)[]>([])
  const rings = useRef<(Group | null)[]>([])
  const mallet = useRef<Group>(null)
  const swing = useRef(0)
  const wasActive = useRef(active)
  const attract = useRef({ next: 1, hole: -1, age: 0 })
  const lastPrompt = useRef<string | null>(null)
  const input = useWhackInput(active)
  const localPoint = useMemo(() => new Vector3(), [])
  const display = useDisplay({ accent: 'whackamole', title: 'MOLE PATROL' })

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, .1)
    if (wasActive.current !== active) {
      const previous = state.current
      state.current = initialState()
      wasActive.current = active
      attract.current = { next: 2, hole: -1, age: 0 }
      swing.current = 0
      if (!active && (previous.phase === 'playing' || previous.phase === 'countdown')) onRoundEnd(previous.whacks * WHACK.perWhack)
    }
    if (active) {
      const controls = input.read()
      if (controls.hits.length) swing.current = WHACK.swing
      state.current = step(state.current, controls, rawDt, Math.random)
      if (state.current.payout !== null) onRoundEnd(state.current.payout)
    } else {
      const a = attract.current
      a.next -= dt; a.age += dt
      if (a.next <= 0) {
        a.hole = (a.hole + 1 + Math.floor(Math.random() * 8)) % 9
        a.age = 0; a.next = WHACK.attractMin + Math.random() * (WHACK.attractMax - WHACK.attractMin)
      }
    }
    const s = state.current
    for (let i = 0; i < 9; i++) {
      const mole = active ? s.moles[i] : attract.current.hole === i && attract.current.age < 1 ? { age: attract.current.age, window: 1 } : null
      const mesh = moles.current[i]
      if (mesh) {
        mesh.visible = !!mole
        if (mole) {
          const height = Math.max(.02, Math.min(1, mole.age / .1, (mole.window - mole.age) / .12))
          mesh.scale.y = height
          mesh.position.y = .02
          mesh.rotation.z = Math.sin(mole.age * 10) * .07
        }
      }
      const ring = rings.current[i]
      if (ring) { ring.visible = s.flashes[i] > 0; ring.scale.setScalar(1 + (.3 - s.flashes[i]) * 2); ring.position.y = .15 + (.3 - s.flashes[i]) }
    }
    swing.current = Math.max(0, swing.current - dt)
    if (mallet.current) {
      const [x, , z] = holePosition(input.hovered.current)
      mallet.current.position.set(x, .52, z - .18)
      mallet.current.rotation.x = -.65 + Math.sin(swing.current / WHACK.swing * Math.PI) * 1.7
    }
    const headline = !active ? 'STEP RIGHT UP!' : s.phase === 'idle' ? 'SPACE / CLICK TO START' : s.phase === 'countdown' ? `READY... ${Math.ceil(WHACK.countdown - s.elapsed)}` : s.phase === 'result' ? `+${s.whacks * WHACK.perWhack} TICKETS!` : `${Math.ceil(WHACK.duration - s.elapsed).toString().padStart(2, '0')} SEC     ${s.whacks.toString().padStart(2, '0')} WHACKS`
    display.show({ headline, footer: FOOTER })
    const prompt = promptFor(active, s.phase)
    if (prompt !== lastPrompt.current) { lastPrompt.current = prompt; onPrompt?.(prompt) }
  })

  const pointToHole = (event: ThreeEvent<PointerEvent>) => {
    if (!active || !board.current) return -1
    event.stopPropagation()
    localPoint.copy(event.point)
    board.current.worldToLocal(localPoint)
    const column = Math.floor((localPoint.x + .78) / .52)
    const row = Math.floor((localPoint.z + .72) / .48)
    return column >= 0 && column < 3 && row >= 0 && row < 3 ? (2 - row) * 3 + column : -1
  }
  return <group position={position} rotation={rotation}>
    <Box at={[0, .55, 0]} size={[1.76, 1.1, 1.55]} material={bodyMaterial('whackamole')} />
    <Box at={[0, .12, 0]} size={[1.85, .2, 1.63]} material={bodyMaterial('plinth')} />
    <Box at={[0, .68, .789]} size={[1.4, .5, .04]} material={bodyMaterial('panel')} />
    <Box at={[0, .7, .82]} size={[.4, .08, .05]} material={bodyMaterial('trim')} />
    <Display handle={display} position={[0, 1.83, -.785]} width={1.8} />
    <group ref={board} position={[0, 1.17, 0]} rotation={[Math.PI / 12, 0, 0]}>
      <Box at={[0, -.065, 0]} size={[1.86, .13, 1.65]} material={bodyMaterial('panel')} />
      {Array.from({ length: 9 }, (_, i) => <group key={i} position={holePosition(i)}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .008, 0]} material={MOLE.hole}><circleGeometry args={[.215, 16]} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, .018, 0]} material={MOLE.rim}><torusGeometry args={[.217, .028, 5, 16]} /></mesh>
        <group ref={node => { moles.current[i] = node }} visible={false}>
          <mesh position={[0, .18, 0]} material={MOLE.fur}><sphereGeometry args={[.175, 10, 8]} /></mesh>
          {[-1, 1].map(side => <group key={side}>
            <mesh position={[side * .13, .31, -.005]} material={MOLE.ear}><sphereGeometry args={[.065, 6, 6]} /></mesh>
            <mesh position={[side * .062, .24, .143]} material={MOLE.eye}><sphereGeometry args={[.03, 6, 6]} /></mesh>
          </group>)}
          <mesh position={[0, .16, .162]} material={MOLE.nose}><sphereGeometry args={[.066, 8, 6]} /></mesh>
          <Box at={[0, .102, .158]} size={[.055, .05, .04]} material={MOLE.tooth} />
        </group>
        <group ref={node => { rings.current[i] = node }} visible={false}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={MOLE.ring}><torusGeometry args={[.2, .022, 4, 8]} /></mesh>
        </group>
      </group>)}
      <group ref={mallet} visible={active}>
        <mesh position={[0, .15, 0]} material={MOLE.handle}><cylinderGeometry args={[.027, .035, .4, 8]} /></mesh>
        <mesh position={[0, .37, 0]} rotation={[0, 0, Math.PI / 2]} material={MOLE.head}><cylinderGeometry args={[.11, .11, .36, 10]} /></mesh>
      </group>
      {/* A single board-plane raycast keeps rising meshes out of hit resolution. */}
      <mesh position={[0, .025, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerMove={e => { const h = pointToHole(e); if (h >= 0) input.hovered.current = h }} onPointerDown={e => { const h = pointToHole(e); if (h >= 0) input.hit(h) }}>
        <planeGeometry args={[1.86, 1.65]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  </group>
}
