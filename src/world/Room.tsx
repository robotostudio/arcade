'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { useArcade } from '@/arcade/state'
import { StoreCounter } from '@/store/StoreCounter'
import { StoreHud } from '@/store/StoreHud'
import { ArcadeCanvas } from './ArcadeCanvas'
import { Cabinet, RoomEnvironment } from './room-environment'

// Each cabinet faces the shared viewing point on the open side of the hub.
export const STATIONS = {
  claw: [-2.5, 0, 1] as const,
  stacker: [0, 0, 0] as const,
  skeeball: [2.5, 0, 1] as const,
  store: [6.4, 0, -5.55] as const,
}
export const STATION_ROTATIONS = { claw: .38, stacker: 0, skeeball: -.38 } as const

function HubView() {
  const { camera, gl, size } = useThree()
  const inStore = useArcade((s) => s.mode.kind === 'store')
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
    const x = inStore ? 6.4 : pan.current * .65
    const y = inStore ? 2.7 : 2.35
    const z = inStore ? .5 : 5.8 - Math.abs(pan.current) * .08
    camera.position.set(MathUtils.damp(camera.position.x, x, 4, dt), MathUtils.damp(camera.position.y, y, 4, dt), MathUtils.damp(camera.position.z, z, 4, dt))
    target.current.x = MathUtils.damp(target.current.x, inStore ? (portrait ? 6.4 : 8) : pan.current * 1.05, 4, dt)
    target.current.y = MathUtils.damp(target.current.y, inStore ? 2 : 1.5, 4, dt)
    target.current.z = MathUtils.damp(target.current.z, inStore ? -5.55 : 0, 4, dt)
    camera.lookAt(target.current)
  })
  return null
}

export function Room() {
  const inStore = useArcade((s) => s.mode.kind === 'store')
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
      if (event.key === 'Escape' && useArcade.getState().mode.kind === 'store') {
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
      <Cabinet at={[...STATIONS.stacker]} rotation={STATION_ROTATIONS.stacker} color="#e886aa" title="STACK" />
      <Cabinet at={[...STATIONS.skeeball]} rotation={STATION_ROTATIONS.skeeball} color="#a68cdb" title="SKEE" />
      <Cabinet at={[-3.8, 0, 2.5]} rotation={.66} color="#8a87b3" title="ORBIT" />
      <Cabinet at={[3.8, 0, 2.5]} rotation={-.66} color="#7ca2ab" title="NOVA" />
      <group scale={[.66, .85, .85]} position={[...STATIONS.store]}>
        <StoreCounter position={[0, 0, 0]} onOpen={openStore} />
      </group>
      <pointLight position={[6.4, 3.5, -4]} color="#ffe1b4" intensity={5} distance={6} />
      <HubView />
    </ArcadeCanvas>
    {!inStore && <button ref={storeButton} type="button" onClick={openStore} className="absolute right-4 top-4 z-10 border border-[#ffe099]/60 bg-[#242044]/95 px-4 py-3 font-mono text-xs uppercase tracking-widest text-[#ffe099] hover:bg-[#393366] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffe099]">
      Store · {tickets} Tickets
    </button>}
    {inStore && <StoreHud onClose={closeStore} />}
    </>
  )
}
