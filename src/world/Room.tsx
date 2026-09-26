'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, PerspectiveCamera, Vector3, WebGLRenderTarget } from 'three'
import { useArcade } from '@/arcade/state'
import { useIntro } from '@/intro/store'
import { StoreCounter } from '@/store/StoreCounter'
import { StoreHud } from '@/store/StoreHud'
import { PrizeTextureWarmup } from '@/store/prizeTextures'
import { ArcadeCanvas } from './ArcadeCanvas'
import { LiveryPanel } from './LiveryPanel'
import { RoomEnvironment } from './room-environment'
import { SHELL, Shell } from './Shell'
import { SoundtrackToggle } from './Soundtrack'

import { WhackMachine, DOCK as WHACK_DOCK } from '@/machines/whackamole'
import { ClawMachine, DOCK as CLAW_DOCK } from '@/machines/claw'
import { SkeeballMachine, DOCK as SKEE_DOCK } from '@/machines/skeeball'
import { StackTop, DOCK as TOP_DOCK } from '@/machines/stacktop/StackTop'

const MACHINES = { whackamole: WhackMachine, claw: ClawMachine, skeeball: SkeeballMachine, stacktop: StackTop }
type HubId = keyof typeof MACHINES
const DOCKS = { whackamole: WHACK_DOCK, claw: CLAW_DOCK, skeeball: SKEE_DOCK, stacktop: TOP_DOCK }
const IDS = Object.keys(MACHINES) as HubId[]
const Y_AXIS = new Vector3(0, 1, 0)
function dockPoint(id: HubId, point: readonly number[]) {
  return new Vector3(point[0], point[1], point[2]).applyAxisAngle(Y_AXIS, STATION_ROTATIONS[id]).add(new Vector3(...STATIONS[id]))
}

// Each cabinet faces the shared viewing point on the open side of the hub.
export const STATIONS = {
  whackamole: [-6.3, 0, .2] as const,
  claw: [-2.1, 0, -1.7] as const,
  skeeball: [2.1, 0, -1.7] as const,
  stacktop: [6.3, 0, .2] as const,
  store: [0, 0, 13.6] as const, // behind the hub camera; the Store button spins round to face it
}
export const STATION_ROTATIONS = { whackamole: .55, claw: .2, skeeball: -.2, stacktop: -.55 } as const

// The intro holds the camera high and far back in the fog; on landing it is released and glides in.
const INTRO_EYE = new Vector3(0, 7.5, 21)

// Tells the intro the Room has drawn its first frame, so the Connecting page can let go.
function ReadySignal() {
  const sent = useRef(false)
  useFrame(() => {
    if (sent.current) return
    sent.current = true
    useIntro.getState().setRoomReady()
  })
  return null
}

function HubView() {
  const { camera, gl, scene, size } = useThree()
  const mode = useArcade((s) => s.mode)
  const introPhase = useIntro((s) => s.phase)

  // Link every program in the room up front, off the frame (KHR_parallel_shader_compile). The hub
  // camera has its back to the store counter, so without this the half-turn to the Store links the
  // tier rings' Standard program mid-frame and drops the first turn's frames. Three hashes programs
  // by output colour space, which depends on whether a render target is bound (the EffectComposer
  // binds one; ?clean=1 draws straight to the canvas), so compile both variants.
  useEffect(() => {
    const offscreen = new WebGLRenderTarget(1, 1)
    gl.setRenderTarget(offscreen)
    const viaComposer = gl.compileAsync(scene, camera)
    gl.setRenderTarget(null)
    const direct = gl.compileAsync(scene, camera)
    Promise.allSettled([viaComposer, direct]).then(() => offscreen.dispose())
  }, [gl, scene, camera])
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
      // Keep all four stations visible on portrait screens; outer cabinets frame the foreground.
      const aspect = size.width / size.height
      camera.fov = MathUtils.clamp(MathUtils.radToDeg(2 * Math.atan(8.2 / (10 * aspect))), 48, 106)
      camera.updateProjectionMatrix()
    }
  }, [camera, size.width, size.height])

  useFrame((_, delta) => {
    if (introPhase === 'boot' || introPhase === 'running') {
      camera.position.copy(INTRO_EYE)
      target.current.set(0, 1.5, 0)
      camera.lookAt(target.current)
      return
    }
    const landing = introPhase === 'landing'
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
    const y = eye?.y ?? (inStore ? 2.7 : 3.4)
    const z = eye?.z ?? (inStore ? 6.6 : 10 - Math.abs(pan.current) * .08)
    const glide = landing ? 1.8 : 4
    camera.position.set(MathUtils.damp(camera.position.x, x, glide, dt), MathUtils.damp(camera.position.y, y, glide, dt), MathUtils.damp(camera.position.z, z, glide, dt))
    // Facing the store, aim a touch left (world +x) so the details panel beside the prize screen is centred.
    const lookX = look?.x ?? camera.position.x + Math.sin(yaw.current) * 11 + pan.current * .4 * (1 - spin) + .5 * spin
    const lookY = look?.y ?? (inStore ? 1.9 : 1.5)
    const lookZ = look?.z ?? camera.position.z - Math.cos(yaw.current) * 11
    const lambda = landing ? 3 : play ? 4 : 8
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
  const prompts = useArcade((s) => s.prompts)
  const select = (id: HubId) => { useArcade.getState().clearLastRound(); enter(id); if (document.activeElement instanceof HTMLElement) document.activeElement.blur() }
  const tickets = useArcade((s) => s.tickets)
  const openStore = useArcade((s) => s.openStore)
  const exit = useArcade((s) => s.exit)
  const storeButton = useRef<HTMLButtonElement>(null)
  const introDone = useIntro((s) => s.phase === 'done')
  const hud = `transition-opacity duration-700 ${introDone ? 'opacity-100' : 'pointer-events-none opacity-0'}`
  const closeStore = () => { exit() }
  useEffect(() => {
    if (!inStore && introDone) storeButton.current?.focus({ preventScroll: true })
  }, [inStore, introDone])

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
          <Machine position={[...STATIONS[id]]} rotation={[0, STATION_ROTATIONS[id], 0]} active={mode.kind === 'play' && mode.machine === id} onRoundEnd={(amount) => useArcade.getState().awardTickets(id, amount)} onPrompt={(prompt) => useArcade.getState().setPrompt(id, prompt)} />
          {mode.kind === 'room' && <mesh position={[STATIONS[id][0], 2, STATIONS[id][2]]} rotation={[0, STATION_ROTATIONS[id], 0]} onClick={(event) => { event.stopPropagation(); select(id) }}>
            <boxGeometry args={[id === 'claw' ? 3 : 2.3, 4.5, id === 'skeeball' ? 4.5 : 2.8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>}
        </group>
      })}
      <group scale={.85} position={[...STATIONS.store]} rotation={[0, Math.PI, 0]}>
        <StoreCounter position={[0, 0, 0]} onOpen={openStore} open={inStore} onClose={closeStore} />
      </group>
      <pointLight position={[0, 3.6, 11.6]} color="#ffe1b4" intensity={14} distance={8} />
      <Suspense fallback={null}>
        <PrizeTextureWarmup />
      </Suspense>
      <HubView />
      <ReadySignal />
    </ArcadeCanvas>
    {mode.kind === 'play' && mode.machine in MACHINES && <Shell accent={mode.machine as HubId} prompt={prompts[mode.machine] ?? ''} />}
    {!inStore && mode.kind === 'room' && <button ref={storeButton} type="button" inert={!introDone} onClick={openStore} style={{ background: SHELL.surface, color: SHELL.text, borderColor: SHELL.edge }} className={`${hud} vt absolute bottom-6 left-1/2 z-10 -translate-x-1/2 border px-5 py-2 text-[40px] leading-none hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fff4d7]`}>
      Store · {tickets} Tickets
    </button>}
    {/* In Play mode the Shell owns the top-right corner (Tickets), so the toggle drops to the bottom. */}
    <div className={`${hud} absolute right-4 z-40 flex items-center gap-2 ${mode.kind === 'play' ? 'bottom-4' : 'top-4'}`}>
      {inStore && (
        <button type="button" onClick={closeStore} style={{ background: SHELL.surface, color: SHELL.text, borderColor: SHELL.edge }} className="vt border px-4 py-2 text-[20px] leading-none hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fff4d7]">
          Esc: back
        </button>
      )}
      <SoundtrackToggle />
    </div>
    {inStore && <StoreHud />}
    <LiveryPanel />
    </>
  )
}
