'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { useArcade } from '@/arcade/state'
import { DOCK as STACKTOP_DOCK, StackTop } from '@/machines/stacktop/StackTop'
import { StackTopHud } from '@/machines/stacktop/StackTopHud'
import { StoreCounter } from '@/store/StoreCounter'
import { StoreHud } from '@/store/StoreHud'
import { ArcadeCanvas } from './ArcadeCanvas'
import { Cabinet, RoomEnvironment } from './room-environment'

// Each cabinet faces the shared viewing point on the open side of the hub.
export const STATIONS = {
  claw: [-2.5, 0, 1] as const,
  stacktop: [0, 0, 0] as const, // the centre slot: Stack to the Top is Sne's one stacking Machine in the Room
  skeeball: [2.5, 0, 1] as const,
  store: [6.4, 0, -5.55] as const,
}
export const STATION_ROTATIONS = { claw: .38, stacktop: 0, skeeball: -.38 } as const

// Stack to the Top is built at real size (4.6 m tall); Jono's cabinets are 2.2 m, so it shrinks to fit the Room.
const STACKTOP_SCALE = .55

// A Machine's DOCK is relative to its origin (player at +z); place it in the Room.
function dockInRoom(station: readonly [number, number, number], rotation: number, scale: number, dock: { position: readonly [number, number, number]; target: readonly [number, number, number] }) {
  const place = ([x, y, z]: readonly [number, number, number]) =>
    new Vector3(station[0] + (x * Math.cos(rotation) + z * Math.sin(rotation)) * scale, station[1] + y * scale, station[2] + (-x * Math.sin(rotation) + z * Math.cos(rotation)) * scale)
  return { position: place(dock.position), target: place(dock.target) }
}
const STACKTOP_VIEW = dockInRoom(STATIONS.stacktop, STATION_ROTATIONS.stacktop, STACKTOP_SCALE, STACKTOP_DOCK)

function HubView() {
  const { camera, gl, size } = useThree()
  const inStore = useArcade((s) => s.mode.kind === 'store')
  const playing = useArcade((s) => (s.mode.kind === 'play' ? s.mode.machine : null))
  const target = useRef(new Vector3(0, 1.5, 0))
  const pointer = useRef(0)
  const pan = useRef(0)

  useEffect(() => {
    const canvas = gl.domElement
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || reducedMotion.matches) return
      const rect = canvas.getBoundingClientRect()
      pointer.current = MathUtils.clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1)
    }
    const reset = () => { pointer.current = 0 }
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerleave', reset)
    window.addEventListener('blur', reset)
    reducedMotion.addEventListener('change', reset)
    return () => {
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerleave', reset)
      window.removeEventListener('blur', reset)
      reducedMotion.removeEventListener('change', reset)
    }
  }, [gl])

  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      // Keep the three main stations visible on portrait screens; outer cabinets frame the foreground.
      const aspect = size.width / size.height
      camera.fov = MathUtils.clamp(MathUtils.radToDeg(2 * Math.atan(7.5 / (10 * aspect))), 48, 106)
      camera.updateProjectionMatrix()
    }
  }, [camera, size.width, size.height])

  useFrame((_, delta) => {
    pan.current = MathUtils.damp(pan.current, pointer.current, 3.5, Math.min(delta, .1))
    const dt = Math.min(delta, .1)
    const portrait = size.width < 700
    // Play mode docks on the Machine (Stack to the Top for now; other Machines' DOCKs slot in here).
    const dock = playing === 'stacktop' ? STACKTOP_VIEW : null
    const x = dock ? dock.position.x : inStore ? 6.4 : pan.current * .65
    const y = dock ? dock.position.y : inStore ? 2.7 : 2.35
    const z = dock ? dock.position.z : inStore ? .5 : 5.8 - Math.abs(pan.current) * .08
    camera.position.set(MathUtils.damp(camera.position.x, x, 4, dt), MathUtils.damp(camera.position.y, y, 4, dt), MathUtils.damp(camera.position.z, z, 4, dt))
    target.current.x = MathUtils.damp(target.current.x, dock ? dock.target.x : inStore ? (portrait ? 6.4 : 8) : pan.current * 1.05, 4, dt)
    target.current.y = MathUtils.damp(target.current.y, dock ? dock.target.y : inStore ? 2 : 1.5, 4, dt)
    target.current.z = MathUtils.damp(target.current.z, dock ? dock.target.z : inStore ? -5.55 : 0, 4, dt)
    camera.lookAt(target.current)
  })
  return null
}

export function Room() {
  const inStore = useArcade((s) => s.mode.kind === 'store')
  const playingStackTop = useArcade((s) => s.mode.kind === 'play' && s.mode.machine === 'stacktop')
  const tickets = useArcade((s) => s.tickets)
  const openStore = useArcade((s) => s.openStore)
  const enter = useArcade((s) => s.enter)
  const exit = useArcade((s) => s.exit)
  const awardTickets = useArcade((s) => s.awardTickets)
  const awardStackTop = useCallback((n: number) => awardTickets('stacktop', n), [awardTickets])
  const storeButton = useRef<HTMLButtonElement>(null)
  const closeStore = () => { exit() }
  useEffect(() => {
    if (!inStore) storeButton.current?.focus({ preventScroll: true })
  }, [inStore])

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const kind = useArcade.getState().mode.kind
      if (event.key === 'Escape' && (kind === 'store' || kind === 'play')) {
        exit()
        storeButton.current?.focus()
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [exit])

  return (
    <>
    <ArcadeCanvas camera={{ position: [0, 2.35, 5.8], fov: 55 }}>
      <RoomEnvironment />
      <Cabinet at={[...STATIONS.claw]} rotation={STATION_ROTATIONS.claw} color="#69c3c5" title="CLAW" />
      <Cabinet at={[...STATIONS.skeeball]} rotation={STATION_ROTATIONS.skeeball} color="#a68cdb" title="SKEE" />
      <Cabinet at={[-3.8, 0, 2.5]} rotation={.66} color="#8a87b3" title="ORBIT" />
      <Cabinet at={[3.8, 0, 2.5]} rotation={-.66} color="#7ca2ab" title="NOVA" />
      {/* Stack to the Top (issue 11) takes the centre slot. Click it to play, Escape to leave. */}
      <group position={[...STATIONS.stacktop]} rotation={[0, STATION_ROTATIONS.stacktop, 0]} scale={STACKTOP_SCALE} onClick={(e) => { if (!playingStackTop) { e.stopPropagation(); enter('stacktop') } }}>
        <StackTop position={[0, 0, 0]} active={playingStackTop} onRoundEnd={awardStackTop} />
      </group>
      <group scale={[.66, .85, .85]} position={[...STATIONS.store]}>
        <StoreCounter position={[0, 0, 0]} onOpen={openStore} />
      </group>
      <pointLight position={[6.4, 3.5, -4]} color="#ffe1b4" intensity={5} distance={6} />
      <HubView />
    </ArcadeCanvas>
    {playingStackTop && <StackTopHud />}
    {playingStackTop && <div className="pointer-events-none absolute bottom-4 right-4 z-10 font-mono text-[11px] uppercase tracking-widest text-white/60">Esc to step back</div>}
    {!inStore && !playingStackTop && <button ref={storeButton} type="button" onClick={openStore} className="absolute right-4 top-4 z-10 border border-[#ffe099]/60 bg-[#242044]/95 px-4 py-3 font-mono text-xs uppercase tracking-widest text-[#ffe099] hover:bg-[#393366] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffe099]">
      Store · {tickets} Tickets
    </button>}
    {inStore && <StoreHud onClose={closeStore} />}
    </>
  )
}
