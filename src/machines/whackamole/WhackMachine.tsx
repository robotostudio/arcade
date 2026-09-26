'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { CanvasTexture, Group, NearestFilter, Vector3 } from 'three'
import type { MachineProps } from '../types'
import { WHACK, holePosition } from './constants'
import { initialState, step } from './whackLogic'
import { useWhackInput } from './useWhackInput'

function Box({ at, size, color }: { at: [number, number, number]; size: [number, number, number]; color: string }) {
  return <mesh position={at}><boxGeometry args={size} /><meshLambertMaterial color={color} /></mesh>
}

export function WhackMachine({ position, rotation, active, onRoundEnd }: MachineProps) {
  const state = useRef(initialState())
  const board = useRef<Group>(null)
  const moles = useRef<(Group | null)[]>([])
  const rings = useRef<(Group | null)[]>([])
  const mallet = useRef<Group>(null)
  const swing = useRef(0)
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
    <Box at={[0, .55, 0]} size={[1.76, 1.1, 1.55]} color="#d66b27" />
    <Box at={[0, .12, 0]} size={[1.85, .2, 1.63]} color="#362940" />
    <Box at={[0, .68, .789]} size={[1.4, .5, .04]} color="#f4aa3f" />
    <Box at={[0, .7, .82]} size={[.4, .08, .05]} color="#312634" />
    <Box at={[0, 1.83, -.87]} size={[1.92, .82, .15]} color="#f4aa3f" />
    <mesh position={[0, 1.83, -.785]}><planeGeometry args={[1.8, .675]} /><meshBasicMaterial map={display.texture} /></mesh>
    <group ref={board} position={[0, 1.17, 0]} rotation={[Math.PI / 12, 0, 0]}>
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
        <mesh position={[0, .15, 0]}><cylinderGeometry args={[.027, .035, .4, 8]} /><meshLambertMaterial color="#6b3940" /></mesh>
        <mesh position={[0, .37, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.11, .11, .36, 10]} /><meshLambertMaterial color="#ec627b" flatShading /></mesh>
      </group>
      {/* A single board-plane raycast keeps rising meshes out of hit resolution. */}
      <mesh position={[0, .025, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerMove={e => { const h = pointToHole(e); if (h >= 0) input.hovered.current = h }} onPointerDown={e => { const h = pointToHole(e); if (h >= 0) input.hit(h) }}>
        <planeGeometry args={[1.86, 1.65]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  </group>
}
