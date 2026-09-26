'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { CanvasTexture, Group, MathUtils, NearestFilter, Vector3 } from 'three'
import type { MachineProps } from '../types'
import { WHACK, holePosition } from './constants'
import { stillMole, stepMole, type MoleMotion } from './moleMotion'
import { initialState, step } from './whackLogic'
import { useWhackInput } from './useWhackInput'

// The deck tips toward the player. The near row used to sink into the cabinet, so the
// body stops short of that row and the deck overhangs it.
const DECK_TILT = 0.2

function Box({ at, size, color }: { at: [number, number, number]; size: [number, number, number]; color: string }) {
  return <mesh position={at}><boxGeometry args={size} /><meshLambertMaterial color={color} /></mesh>
}

export function WhackMachine({ position, rotation, active, onRoundEnd }: MachineProps) {
  const state = useRef(initialState())
  const board = useRef<Group>(null)
  const moles = useRef<(Group | null)[]>([])
  const rings = useRef<(Group | null)[]>([])
  const mallet = useRef<Group>(null)
  const malletBody = useRef({ x: 0, z: 0, vx: 0, vz: 0, ang: 0.15, av: 0 })
  const motions = useRef<MoleMotion[]>(Array.from({ length: 9 }, stillMole))
  const wasUp = useRef(Array<boolean>(9).fill(false))
  const shake = useRef(0)
  const shakeV = useRef(0)
  const wasActive = useRef(active)
  const attract = useRef({ next: 1, hole: -1, age: 0 })
  const input = useWhackInput(active)
  const localPoint = useMemo(() => new Vector3(), [])
  const display = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024; canvas.height = 384
    const texture = new CanvasTexture(canvas)
    texture.minFilter = NearestFilter; texture.magFilter = NearestFilter
    return { canvas, texture, last: '' }
  }, [])
  useEffect(() => () => display.texture.dispose(), [display])

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
    hammer.av += ((0.15 - hammer.ang) * 62 - hammer.av * 8) * dt
    hammer.ang += hammer.av * dt
    if (mallet.current) {
      mallet.current.position.set(hammer.x, 0.22, hammer.z)
      mallet.current.rotation.x = hammer.ang
    }
    const headline = !active ? 'STEP RIGHT UP!' : s.phase === 'idle' ? 'SPACE / CLICK TO START' : s.phase === 'countdown' ? `READY... ${Math.ceil(WHACK.countdown - s.elapsed)}` : s.phase === 'result' ? `+${s.whacks * WHACK.perWhack} TICKETS!` : `${Math.ceil(WHACK.duration - s.elapsed).toString().padStart(2, '0')} SEC     ${s.whacks.toString().padStart(2, '0')} WHACKS`
    if (display.last !== headline) {
      display.last = headline
      const ctx = display.canvas.getContext('2d')!
      ctx.fillStyle = '#221c2d'; ctx.fillRect(0, 0, 1024, 384)
      ctx.strokeStyle = '#ffb941'; ctx.lineWidth = 12; ctx.strokeRect(12, 12, 1000, 360)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffbd50'; ctx.font = 'bold 78px monospace'; ctx.fillText('MOLE PATROL', 512, 108)
      ctx.fillStyle = '#fff4d7'; ctx.font = 'bold 48px monospace'; ctx.fillText(headline, 512, 212)
      ctx.fillStyle = '#eaba80'; ctx.font = '28px monospace'; ctx.fillText('9 HOLES  /  30 SECONDS  /  5 TICKETS A HIT', 512, 300)
      display.texture.needsUpdate = true
    }
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
    <Box at={[0, .12, .05]} size={[1.9, .24, 1.75]} color="#362940" />
    {/* Tall rear column meets the lifted back of the deck; the front box stays under the near row. */}
    <Box at={[0, .7, -.32]} size={[1.74, 1.04, .86]} color="#d66b27" />
    <Box at={[0, .48, .36]} size={[1.74, .72, .7]} color="#d66b27" />
    <Box at={[0, .5, .73]} size={[1.36, .42, .05]} color="#f4aa3f" />
    <Box at={[0, .42, .77]} size={[.38, .08, .04]} color="#312634" />
    <Box at={[0, 2.32, -.9]} size={[1.92, .78, .14]} color="#f4aa3f" />
    <mesh position={[0, 2.32, -.82]}><planeGeometry args={[1.8, .675]} /><meshBasicMaterial map={display.texture} /></mesh>
    <group ref={board} position={[0, 1.36, .08]} rotation={[DECK_TILT, 0, 0]}>
      <Box at={[0, -.065, 0]} size={[1.86, .13, 1.65]} color="#ffbb49" />
      {Array.from({ length: 9 }, (_, i) => <group key={i} position={holePosition(i)}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .008, 0]}><circleGeometry args={[.215, 16]} /><meshLambertMaterial color="#291f32" /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, .018, 0]}><torusGeometry args={[.217, .028, 5, 16]} /><meshLambertMaterial color="#bd6b31" /></mesh>
        <group ref={node => { moles.current[i] = node }} visible={false}>
          <mesh position={[0, .18, 0]}><sphereGeometry args={[.175, 10, 8]} /><meshLambertMaterial color="#a97658" flatShading /></mesh>
          {[-1, 1].map(side => <group key={side}>
            <mesh position={[side * .13, .31, -.005]}><sphereGeometry args={[.065, 6, 6]} /><meshLambertMaterial color="#d5a17a" flatShading /></mesh>
            <mesh position={[side * .062, .24, .143]}><sphereGeometry args={[.03, 6, 6]} /><meshLambertMaterial color="#201b2b" /></mesh>
          </group>)}
          <mesh position={[0, .16, .162]}><sphereGeometry args={[.066, 8, 6]} /><meshLambertMaterial color="#ffc0a0" flatShading /></mesh>
          <Box at={[0, .102, .158]} size={[.055, .05, .04]} color="#fff4d7" />
        </group>
        <group ref={node => { rings.current[i] = node }} visible={false}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.2, .022, 4, 8]} /><meshBasicMaterial color="#fff0a3" /></mesh>
        </group>
      </group>)}
      <group ref={mallet} visible={active}>
        <mesh position={[0, .2, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.1, .11, .34, 8]} /><meshLambertMaterial color="#ec627b" flatShading /></mesh>
        <mesh position={[0, .34, .3]} rotation={[1.15, 0, 0]}><cylinderGeometry args={[.03, .04, .46, 8]} /><meshLambertMaterial color="#6b3940" /></mesh>
      </group>
      {/* A single board-plane raycast keeps rising meshes out of hit resolution. */}
      <mesh position={[0, .025, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerMove={e => { const h = pointToHole(e); if (h >= 0) input.hovered.current = h }} onPointerDown={e => { const h = pointToHole(e); if (h >= 0) input.hit(h) }}>
        <planeGeometry args={[1.86, 1.65]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  </group>
}
