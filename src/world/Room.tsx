'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { useArcade } from '@/arcade/state'
import { StoreCounter } from '@/store/StoreCounter'
import { StoreHud } from '@/store/StoreHud'
import { ArcadeCanvas } from './ArcadeCanvas'
import { RoomEnvironment } from './room-environment'

import { ClawMachine, DOCK as CLAW_DOCK } from '@/machines/claw'
import { SkeeballMachine, DOCK as SKEE_DOCK } from '@/machines/skeeball'
import { StackTop, DOCK as TOP_DOCK } from '@/machines/stacktop/StackTop'
import { StackTopHud } from '@/machines/stacktop/StackTopHud'

// Stack to the Top replaced the old Stacker in the hub; the harness at /dev/stacker still runs it.
const MACHINES = { claw: ClawMachine, skeeball: SkeeballMachine, stacktop: StackTop }
type HubId = keyof typeof MACHINES
const LABELS = { claw: 'Claw', stacker: 'Stacker', skeeball: 'Skeeball', stacktop: 'Stack to the Top' }
const HELP = { claw: 'Arrow keys move · Space drops', stacker: 'Space or click to start / stop', skeeball: 'Space or click: start, lock aim, lock power', stacktop: 'Space or click to start / stop' }
const DOCKS = { claw: CLAW_DOCK, skeeball: SKEE_DOCK, stacktop: TOP_DOCK }
const IDS = Object.keys(MACHINES) as HubId[]
const Y_AXIS = new Vector3(0, 1, 0)
function dockPoint(id: HubId, point: readonly number[]) {
  return new Vector3(point[0], point[1], point[2]).applyAxisAngle(Y_AXIS, STATION_ROTATIONS[id]).add(new Vector3(...STATIONS[id]))
}

// Each cabinet faces the shared viewing point on the open side of the hub.
export const STATIONS = {
  claw: [-4.2, 0, -1] as const,
  skeeball: [0, 0, -2.2] as const,
  stacktop: [4.2, 0, -1] as const,
  store: [0, 0, 13.6] as const, // behind the hub camera; the Store button spins round to face it
}
export const STATION_ROTATIONS = { claw: .38, skeeball: 0, stacktop: -.38 } as const

function HubView() {
  const { camera, gl, size } = useThree()
  const mode = useArcade((s) => s.mode)
  const inStore = mode.kind === 'store'
  const target = useRef(new Vector3(0, 1.5, 0))
  const pointer = useRef(0)
  const pan = useRef(0)
  const yaw = useRef(0) // 0 faces the cabinets (-z), PI faces the store (+z)

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
    const play = mode.kind === 'play' && mode.machine in MACHINES ? mode.machine as HubId : null
    const eye = play ? dockPoint(play, DOCKS[play].position) : null
    const look = play ? dockPoint(play, DOCKS[play].target) : null
    // Hub: the camera stays on its spot and yaws; the store sits behind it, so opening the store
    // is a half turn rather than a walk across the room.
    yaw.current = MathUtils.damp(yaw.current, inStore ? Math.PI : 0, 3, dt)
    const spin = yaw.current / Math.PI
    const x = eye?.x ?? (inStore ? 0 : pan.current * .65)
    const y = eye?.y ?? (inStore ? 2.4 : 3.4)
    const z = eye?.z ?? (inStore ? 7.2 : 10 - Math.abs(pan.current) * .08)
    camera.position.set(MathUtils.damp(camera.position.x, x, 4, dt), MathUtils.damp(camera.position.y, y, 4, dt), MathUtils.damp(camera.position.z, z, 4, dt))
    // Facing the store, aim a touch right so the counter sits clear of the Store panel.
    const lookX = look?.x ?? camera.position.x + Math.sin(yaw.current) * 11 + pan.current * .4 * (1 - spin) - 1.4 * spin
    const lookY = look?.y ?? (inStore ? 1.4 : 1.5)
    const lookZ = look?.z ?? camera.position.z - Math.cos(yaw.current) * 11
    const lambda = play ? 4 : 8
    target.current.x = MathUtils.damp(target.current.x, lookX, lambda, dt)
    target.current.y = MathUtils.damp(target.current.y, lookY, lambda, dt)
    target.current.z = MathUtils.damp(target.current.z, lookZ, lambda, dt)
    camera.lookAt(target.current)
  })
  return null
}

export function Room() {
  const mode = useArcade((s) => s.mode)
  const inStore = mode.kind === 'store'
  const enter = useArcade((s) => s.enter)
  const lastRound = useArcade((s) => s.lastRound)
  const select = (id: HubId) => { useArcade.getState().clearLastRound(); enter(id) }
  const tickets = useArcade((s) => s.tickets)
  const openStore = useArcade((s) => s.openStore)
  const exit = useArcade((s) => s.exit)
  const storeButton = useRef<HTMLButtonElement>(null)
  const closeStore = () => { exit() }
  useEffect(() => {
    if (!inStore) storeButton.current?.focus({ preventScroll: true })
  }, [inStore])

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && useArcade.getState().mode.kind !== 'room') {
        exit()
        storeButton.current?.focus()
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [exit])

  return (
    <>
    <ArcadeCanvas camera={{ position: [0, 3.4, 10], fov: 55 }}>
      <RoomEnvironment />
      {IDS.map((id) => {
        const Machine = MACHINES[id]
        return <group key={id}>
          <Machine position={[...STATIONS[id]]} rotation={[0, STATION_ROTATIONS[id], 0]} active={mode.kind === 'play' && mode.machine === id} onRoundEnd={(amount) => useArcade.getState().awardTickets(id, amount)} />
          {mode.kind === 'room' && <mesh position={[STATIONS[id][0], 2, STATIONS[id][2]]} rotation={[0, STATION_ROTATIONS[id], 0]} onClick={(event) => { event.stopPropagation(); select(id) }}>
            <boxGeometry args={[id === 'claw' ? 3 : 2.3, 4.5, id === 'skeeball' ? 4.5 : 2.8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>}
        </group>
      })}
      <group scale={[.66, .85, .85]} position={[...STATIONS.store]} rotation={[0, Math.PI, 0]}>
        <StoreCounter position={[0, 0, 0]} onOpen={openStore} />
      </group>
      <pointLight position={[0, 3.6, 11.6]} color="#ffe1b4" intensity={14} distance={8} />
      <HubView />
    </ArcadeCanvas>
    {mode.kind === 'play' && mode.machine === 'stacktop' && <StackTopHud />}
    {mode.kind === 'room' && <nav aria-label="Arcade machines" className="absolute bottom-6 left-0 right-0 z-20 flex flex-wrap justify-center gap-2 px-4">{IDS.map((id) => <button key={id} onClick={() => select(id)} className="border border-white/40 bg-[#242044]/95 px-4 py-3 font-mono text-xs text-white">{LABELS[id]}</button>)}</nav>}
    {mode.kind === 'play' && <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 bg-[#242044]/95 p-3 font-mono text-xs text-white"><span>{LABELS[mode.machine]} · {HELP[mode.machine]}{lastRound?.machine === mode.machine && ` · Round complete: +${lastRound.tickets} Tickets`}</span><button onClick={exit} className="border border-white/40 px-4 py-2">Back to hub · Esc</button></div>}
    {!inStore && <button ref={storeButton} type="button" onClick={openStore} className="absolute right-4 top-4 z-10 border border-[#ffe099]/60 bg-[#242044]/95 px-4 py-3 font-mono text-xs uppercase tracking-widest text-[#ffe099] hover:bg-[#393366] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffe099]">
      Store · {tickets} Tickets
    </button>}
    {inStore && <StoreHud onClose={closeStore} />}
    </>
  )
}
