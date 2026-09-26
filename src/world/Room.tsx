'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { useArcade, type MachineId } from '@/arcade/state'
import { sfx } from '@/arcade/sfx'
import { signClock, useIntro } from '@/intro/store'
import { StoreCounter } from '@/store/StoreCounter'
import { StoreHud } from '@/store/StoreHud'
import { ArcadeCanvas } from './ArcadeCanvas'
import { RoomEnvironment } from './room-environment'
import { SoundtrackToggle } from './Soundtrack'

import { WhackMachine, DOCK as WHACK_DOCK } from '@/machines/whackamole'
import { ClawMachine, DOCK as CLAW_DOCK } from '@/machines/claw'
import { SkeeballMachine, DOCK as SKEE_DOCK } from '@/machines/skeeball'
import { StackTop, DOCK as TOP_DOCK } from '@/machines/stacktop/StackTop'
import { StackTopHud } from '@/machines/stacktop/StackTopHud'

// Stack to the Top replaced the old Stacker in the hub; the harness at /dev/stacker still runs it.
const MACHINES = { whackamole: WhackMachine, claw: ClawMachine, skeeball: SkeeballMachine, stacktop: StackTop }
type HubId = keyof typeof MACHINES
const LABELS = { whackamole: 'Mole Patrol', claw: 'Claw', stacker: 'Stacker', skeeball: 'Skeeball', stacktop: 'Stack to the Top' }
const HELP = { whackamole: 'Space starts · Click moles or keys 7 8 9 / 4 5 6 / 1 2 3', claw: 'Arrow keys move · Space drops', stacker: 'Space or click to start / stop', skeeball: 'Space or click: lock aim, then lock power to swing and roll', stacktop: 'Space or click to start / stop' }
const DOCKS = { whackamole: WHACK_DOCK, claw: CLAW_DOCK, skeeball: SKEE_DOCK, stacktop: TOP_DOCK }
const IDS = Object.keys(MACHINES) as HubId[]
const Y_AXIS = new Vector3(0, 1, 0)
function dockPoint(id: HubId, point: readonly number[]) {
  return new Vector3(point[0], point[1], point[2]).multiplyScalar(STATION_SCALE[id]).applyAxisAngle(Y_AXIS, STATION_ROTATIONS[id]).add(new Vector3(...STATIONS[id]))
}

// Each cabinet faces the shared viewing point on the open side of the hub.
export const STATIONS = {
  whackamole: [-6.3, 0, .2] as const,
  claw: [-4.35, 0, -1.7] as const,
  skeeball: [2.3, 0, -1.9] as const,
  stacktop: [6.3, 0, .2] as const,
  store: [0, 0, 13.6] as const, // behind the hub camera; the Store button spins round to face it
}
export const STATION_ROTATIONS = { whackamole: .55, claw: .2, skeeball: -.42, stacktop: -.55 } as const
// One hero scale for the hub: each cabinet's marquee tops out in the Claw's 3.6-4 m band and
// play surfaces sit near one waist height. Physics machines (Claw, Skeeball) are built to size
// in their own constants; only the physics-free cabinets are scaled here.
export const STATION_SCALE = { whackamole: 1.15, claw: 1, skeeball: 1, stacktop: .8 } as const
// Invisible click volume per cabinet in its own frame: [w, h, d, z offset].
const HIT_BOX = { whackamole: [2, 2.4, 1.9, 0], claw: [3, 4, 2.8, 0], skeeball: [1.9, 3.8, 4.6, -.57], stacktop: [2.2, 5, 1.6, 0] } as const

// Every Round end in the hub lands here: Tickets awarded, with a fanfare or a sad trombone.
function endRound(id: MachineId, amount: number) {
  useArcade.getState().awardTickets(id, amount)
  const won = useArcade.getState().lastRound?.tickets ?? 0
  if (won > 0) sfx.win(won)
  else sfx.lose()
}

// The intro holds the camera high and far back in the fog; on landing it is released onto the
// neon sign, which then swings the view back to the hub.
const INTRO_EYE = new Vector3(0, 7.5, 21)
const SIGN_EYE = new Vector3(0.35, 4.35, 0.15)
const SIGN_LOOK = new Vector3(0, 3.7, -6.6)
const HUB_EYE = new Vector3(0, 3.4, 10)
const HUB_LOOK = new Vector3(0, 1.5, -1)
const SIGN_HOLD = 2.2
const SIGN_TRAVEL = 2.7

function smoothstep(v: number) {
  const x = MathUtils.clamp(v, 0, 1)
  return x * x * (3 - 2 * x)
}

function springToward(pos: Vector3, vel: Vector3, goal: Vector3, dt: number) {
  const k = 11
  const damp = 5.2
  vel.x += ((goal.x - pos.x) * k - vel.x * damp) * dt
  vel.y += ((goal.y - pos.y) * k - vel.y * damp) * dt
  vel.z += ((goal.z - pos.z) * k - vel.z * damp) * dt
  pos.addScaledVector(vel, dt)
}

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
  const { camera, gl, size } = useThree()
  const mode = useArcade((s) => s.mode)
  const introPhase = useIntro((s) => s.phase)
  const inStore = mode.kind === 'store'
  const target = useRef(new Vector3(0, 1.5, 0))
  const pointer = useRef(0)
  const pan = useRef(0)
  const yaw = useRef(0) // 0 faces the cabinets (-z), PI faces the store (+z)
  const signLive = useRef(false)
  const eyeVel = useRef(new Vector3())
  const lookVel = useRef(new Vector3())
  const signGoal = useRef(new Vector3())
  const lookGoal = useRef(new Vector3())
  const signIntro = useIntro((s) => s.signIntro)

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
    const dt = Math.min(delta, .1)
    if (introPhase === 'boot' || introPhase === 'running') {
      camera.position.copy(INTRO_EYE)
      target.current.set(0, 1.5, 0)
      camera.lookAt(target.current)
      signLive.current = false
      return
    }
    if (signIntro && mode.kind !== 'room') useIntro.getState().finishSignIntro()
    if (signIntro && mode.kind === 'room') {
      if (!signLive.current) {
        signLive.current = true
        signClock.t = 0
        camera.position.copy(SIGN_EYE)
        target.current.copy(SIGN_LOOK)
        eyeVel.current.set(0, 0, 0)
        lookVel.current.set(0, 0, 0)
      }
      signClock.t += dt
      const glide = smoothstep(signClock.t <= SIGN_HOLD ? 0 : (signClock.t - SIGN_HOLD) / SIGN_TRAVEL)
      const bob = Math.sin(signClock.t * 1.4) * (1 - glide) * 0.05
      signGoal.current.set(
        MathUtils.lerp(SIGN_EYE.x, HUB_EYE.x, glide) + bob,
        MathUtils.lerp(SIGN_EYE.y, HUB_EYE.y, glide),
        MathUtils.lerp(SIGN_EYE.z, HUB_EYE.z, glide),
      )
      lookGoal.current.set(
        MathUtils.lerp(SIGN_LOOK.x, HUB_LOOK.x, glide),
        MathUtils.lerp(SIGN_LOOK.y, HUB_LOOK.y, glide),
        MathUtils.lerp(SIGN_LOOK.z, HUB_LOOK.z, glide),
      )
      springToward(camera.position, eyeVel.current, signGoal.current, dt)
      springToward(target.current, lookVel.current, lookGoal.current, dt)
      camera.lookAt(target.current)
      if (signClock.t >= SIGN_HOLD + SIGN_TRAVEL) useIntro.getState().finishSignIntro()
      return
    }
    signLive.current = false
    const landing = introPhase === 'landing'
    pan.current = MathUtils.damp(pan.current, pointer.current, 3.5, dt)
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
  const lastRound = useArcade((s) => s.lastRound)
  const select = (id: HubId) => { useIntro.getState().finishSignIntro(); useArcade.getState().clearLastRound(); enter(id); if (document.activeElement instanceof HTMLElement) document.activeElement.blur() }
  const tickets = useArcade((s) => s.tickets)
  const openStore = useArcade((s) => s.openStore)
  const exit = useArcade((s) => s.exit)
  const storeButton = useRef<HTMLButtonElement>(null)
  const introDone = useIntro((s) => s.phase === 'done' && !s.signIntro)
  const hud = `transition-opacity duration-700 ${introDone ? 'opacity-100' : 'pointer-events-none opacity-0'}`
  const closeStore = () => { exit() }
  useEffect(() => {
    if (!inStore && introDone) storeButton.current?.focus({ preventScroll: true })
  }, [inStore, introDone])

  // One place for navigation sounds, whatever moved us: buttons, Esc, or a click in the 3D Room.
  useEffect(() => useArcade.subscribe((s, prev) => {
    if (s.mode.kind === prev.mode.kind) return
    if (s.mode.kind === 'play') sfx.enter()
    else if (s.mode.kind === 'store') sfx.openStore()
    else sfx.back()
  }), [])

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
          <group position={[...STATIONS[id]]} rotation={[0, STATION_ROTATIONS[id], 0]} scale={STATION_SCALE[id]}>
            <Machine position={[0, 0, 0]} rotation={[0, 0, 0]} active={mode.kind === 'play' && mode.machine === id} onRoundEnd={(amount) => endRound(id, amount)} />
            {mode.kind === 'room' && <mesh position={[0, HIT_BOX[id][1] / 2, HIT_BOX[id][3]]} onClick={(event) => { event.stopPropagation(); select(id) }} onPointerOver={(event) => { event.stopPropagation(); sfx.hover() }}>
              <boxGeometry args={[HIT_BOX[id][0], HIT_BOX[id][1], HIT_BOX[id][2]]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>}
          </group>
        </group>
      })}
      <group scale={.85} position={[...STATIONS.store]} rotation={[0, Math.PI, 0]}>
        <StoreCounter position={[0, 0, 0]} onOpen={openStore} open={inStore} onClose={closeStore} />
      </group>
      <pointLight position={[0, 3.6, 11.6]} color="#ffe1b4" intensity={14} distance={8} />
      <HubView />
      <ReadySignal />
    </ArcadeCanvas>
    {mode.kind === 'play' && mode.machine === 'stacktop' && <StackTopHud />}
    {mode.kind === 'play' && <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 bg-[#242044]/95 p-3 font-mono text-xs text-white"><span>{LABELS[mode.machine]} · {HELP[mode.machine]}{lastRound?.machine === mode.machine && ` · Round complete: +${lastRound.tickets} Tickets`}</span><button onClick={exit} className="border border-white/40 px-4 py-2">Back to hub · Esc</button></div>}
    {!inStore && mode.kind === 'room' && <button ref={storeButton} type="button" inert={!introDone} onClick={openStore} className={`${hud} absolute bottom-6 left-1/2 z-10 -translate-x-1/2 border border-[#ffe099]/60 bg-[#242044]/95 px-4 py-3 font-mono text-xs uppercase tracking-widest text-[#ffe099] hover:bg-[#393366] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffe099]`}>
      Store · {tickets} Tickets
    </button>}
    <div className={`${hud} absolute right-4 top-4 z-40 flex items-center gap-2`}>
      {inStore && (
        <button type="button" onClick={closeStore} className="border border-[#ffe099]/60 bg-[#242044]/95 px-4 py-3 font-mono text-xs uppercase tracking-widest text-[#ffe099] hover:bg-[#393366] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffe099]">
          Back · Esc
        </button>
      )}
      <SoundtrackToggle />
    </div>
    {inStore && <StoreHud />}
    </>
  )
}
