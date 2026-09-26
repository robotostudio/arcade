'use client'

import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Group, Material, MathUtils, Vector3 } from 'three'
import { sfx } from '@/arcade/sfx'
import { Display, useDisplay } from '@/world/Display'
import { bodyMaterial, litMaterial, unlitMaterial } from '@/world/livery'
import type { MachineProps } from '../types'
import { usePrompt } from '../prompt'
import { WHACK, holePosition } from './constants'
import { stillMole, stepMole, type MoleMotion } from './moleMotion'
import { initialState, step, type State } from './whackLogic'
import { useWhackInput } from './useWhackInput'

// The deck tips toward the player. The near row used to sink into the cabinet, so the
// body stops short of that row and the deck overhangs it.
const DECK_TILT = 0.2

// The reference cabinet for the Livery (issue 12): Plinth, trim and Display frame from the shared
// table, cream panels, the body in the Whack-a-Mole Accent. Colours the Machine owns (the Moles, the
// mallet, the hole rims, the hit ring) go through litMaterial / unlitMaterial so they take the snap.
const MOLE = {
  // Biased toward the camera: 8 mm over the deck, the PSX vertex snap let the cream deck flicker through.
  hole: litMaterial('#291f32', { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
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

// The mallet swings from the player's hand like a real one: the grip sits above and in front of
// the hovered hole, and at rotation 0 the head's flat face lands on the hole centre. It rests
// cocked back by MALLET_REST, a hit kicks it down, and it bounces off the strike pose.
const GRIP: [number, number] = [.72, .45] // [y, z] of the pivot above the hovered hole
const REACH: [number, number] = [-.42, -.45] // [y, z] from the grip to the head centre on a strike
const REACH_LEN = Math.hypot(REACH[0], REACH[1])
const HANDLE_TILT = Math.atan2(REACH[1], REACH[0]) // turns the handle's +Y along the reach
const HANDLE_LEN = .7
const HANDLE_MID = 1 - HANDLE_LEN / 2 / REACH_LEN // from the head back past the grip
const MALLET_REST = .32

const FOOTER = '9 HOLES / 30 SECONDS / 5 TICKETS A HIT'

// One prompt string per phase for the Shell: the real key and the verb. Space only starts a Round
// from idle; the result phase ignores input and returns to idle by itself.
function promptFor(active: boolean, phase: State['phase']): string {
  if (!active) return ''
  if (phase === 'idle') return 'Space: start'
  if (phase === 'result') return '' // the Shell already offers Back
  return 'Click or 1-9: whack'
}

function Box({ at, size, material }: { at: [number, number, number]; size: [number, number, number]; material: Material }) {
  return <mesh position={at} material={material}><boxGeometry args={size} /></mesh>
}

// Sounds come from diffing one step: countdown beeps, GO, Pops, Whacks and escaped Moles.
const count = (s: State) => Math.ceil(WHACK.countdown - s.elapsed)
function playCues(prev: State, next: State) {
  if (next.phase === 'countdown' && (prev.phase !== 'countdown' || count(prev) !== count(next))) sfx.count()
  if (prev.phase === 'countdown' && next.phase === 'playing') sfx.go()
  if (next.phase !== 'playing') return
  if (next.whacks > prev.whacks) sfx.hit(((next.whacks - 1) % 8) + 1)
  for (let i = 0; i < 9; i++) {
    if (!prev.moles[i] && next.moles[i]) sfx.pop()
    else if (prev.moles[i] && !next.moles[i] && next.flashes[i] < .3) sfx.miss()
  }
}

export function WhackMachine({ position, rotation, active, onRoundEnd, onPrompt }: MachineProps) {
  const state = useRef(initialState())
  const board = useRef<Group>(null)
  const moles = useRef<(Group | null)[]>([])
  const rings = useRef<(Group | null)[]>([])
  const mallet = useRef<Group>(null)
  const malletBody = useRef({ x: 0, z: 0, vx: 0, vz: 0, ang: MALLET_REST, av: 0 })
  const motions = useRef<MoleMotion[]>(Array.from({ length: 9 }, stillMole))
  const wasUp = useRef(Array<boolean>(9).fill(false))
  const shake = useRef(0)
  const shakeV = useRef(0)
  const wasActive = useRef(active)
  const attract = useRef({ next: 1, hole: -1, age: 0 })
  const input = useWhackInput(active)
  const localPoint = useMemo(() => new Vector3(), [])
  const display = useDisplay({ accent: 'whackamole', title: 'MOLE PATROL' })
  const sendPrompt = usePrompt(onPrompt)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, .1)
    if (wasActive.current !== active) {
      const previous = state.current
      state.current = initialState()
      wasActive.current = active
      attract.current = { next: 2, hole: -1, age: 0 }
      malletBody.current.av = 0
      motions.current.forEach((m, i) => { motions.current[i] = stillMole(); wasUp.current[i] = false })
      if (!active && (previous.phase === 'playing' || previous.phase === 'countdown')) onRoundEnd(previous.whacks * WHACK.perWhack)
    }
    if (active) {
      const controls = input.read()
      if (controls.hits.length) malletBody.current.av -= 14
      const prev = state.current
      state.current = step(prev, controls, rawDt, Math.random)
      playCues(prev, state.current)
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
    let struck = false
    for (let i = 0; i < 9; i++) {
      const mole = active ? s.moles[i] : attract.current.hole === i && attract.current.age < 1 ? { age: attract.current.age, window: 1 } : null
      const up = !!mole
      const whacked = wasUp.current[i] && !up && s.flashes[i] > 0.15
      if (whacked) struck = true
      wasUp.current[i] = up
      const motion = motions.current[i]
      stepMole(motion, up, whacked, dt)
      const mesh = moles.current[i]
      if (mesh) {
        const stretch = 1 + MathUtils.clamp(motion.v * 0.035, -0.18, 0.22)
        mesh.visible = motion.y > 0.16
        mesh.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch))
        mesh.position.set(motion.x, -0.38 + motion.y * 0.4, 0)
        mesh.rotation.set(motion.falling ? motion.roll * 0.4 : 0, motion.x * 0.6, motion.falling ? motion.roll : motion.roll * 0.35)
      }
      const ring = rings.current[i]
      if (ring) { ring.visible = s.flashes[i] > 0; ring.scale.setScalar(1 + (.3 - s.flashes[i]) * 2); ring.position.y = .15 + (.3 - s.flashes[i]) }
    }
    if (struck) shakeV.current -= 1.6
    shakeV.current += (-shake.current * 90 - shakeV.current * 11) * dt
    shake.current += shakeV.current * dt
    if (board.current) board.current.rotation.x = DECK_TILT + shake.current
    const hammer = malletBody.current
    const [hx, , hz] = holePosition(input.hovered.current)
    hammer.vx += ((hx - hammer.x) * 68 - hammer.vx * 12) * dt
    hammer.vz += ((hz - hammer.z) * 68 - hammer.vz * 12) * dt
    hammer.x += hammer.vx * dt
    hammer.z += hammer.vz * dt
    hammer.av += ((MALLET_REST - hammer.ang) * 62 - hammer.av * 8) * dt
    hammer.ang += hammer.av * dt
    // The head stops on the hole and bounces back rather than swinging through the deck.
    if (hammer.ang < 0) { hammer.ang = 0; if (hammer.av < 0) hammer.av *= -.3 }
    if (mallet.current) {
      mallet.current.position.set(hammer.x, GRIP[0], hammer.z + GRIP[1])
      mallet.current.rotation.x = hammer.ang
    }
    const headline = !active ? 'STEP RIGHT UP!' : s.phase === 'idle' ? 'SPACE / CLICK TO START' : s.phase === 'countdown' ? `READY... ${Math.ceil(WHACK.countdown - s.elapsed)}` : s.phase === 'result' ? `+${s.whacks * WHACK.perWhack} TICKETS!` : `${Math.ceil(WHACK.duration - s.elapsed).toString().padStart(2, '0')} SEC     ${s.whacks.toString().padStart(2, '0')} WHACKS`
    display.show({ headline, footer: FOOTER })
    sendPrompt(promptFor(active, s.phase))
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
    <Box at={[0, .12, .05]} size={[1.9, .24, 1.75]} material={bodyMaterial('plinth')} />
    {/* Tall rear column meets the lifted back of the deck; the front box stays under the near row. */}
    <Box at={[0, .7, -.32]} size={[1.74, 1.04, .86]} material={bodyMaterial('whackamole')} />
    <Box at={[0, .48, .36]} size={[1.74, .72, .7]} material={bodyMaterial('whackamole')} />
    <Box at={[0, .5, .73]} size={[1.36, .42, .05]} material={bodyMaterial('panel')} />
    <Box at={[0, .42, .77]} size={[.38, .08, .04]} material={bodyMaterial('trim')} />
    <Display handle={display} position={[0, 2.32, -.82]} width={1.8} />
    <group ref={board} position={[0, 1.36, .08]} rotation={[DECK_TILT, 0, 0]}>
      <Box at={[0, -.065, 0]} size={[1.86, .13, 1.65]} material={bodyMaterial('panel')} />
      {Array.from({ length: 9 }, (_, i) => <group key={i} position={holePosition(i)}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .02, 0]} material={MOLE.hole}><circleGeometry args={[.215, 16]} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, .026, 0]} material={MOLE.rim}><torusGeometry args={[.217, .028, 5, 16]} /></mesh>
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
        <mesh position={[0, REACH[0], REACH[1]]} rotation={[HANDLE_TILT + Math.PI / 2, 0, 0]} material={MOLE.head}><cylinderGeometry args={[.11, .11, .3, 8]} /></mesh>
        <mesh position={[0, REACH[0] * HANDLE_MID, REACH[1] * HANDLE_MID]} rotation={[HANDLE_TILT, 0, 0]} material={MOLE.handle}><cylinderGeometry args={[.03, .04, HANDLE_LEN, 8]} /></mesh>
      </group>
      {/* A single board-plane raycast keeps rising meshes out of hit resolution. */}
      <mesh position={[0, .025, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerMove={e => { const h = pointToHole(e); if (h >= 0) input.hovered.current = h }} onPointerDown={e => { const h = pointToHole(e); if (h >= 0) input.hit(h) }}>
        <planeGeometry args={[1.86, 1.65]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  </group>
}
