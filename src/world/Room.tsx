'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, PerspectiveCamera } from 'three'
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
    camera.position.set(pan.current * .65, 2.35, 5.8 - Math.abs(pan.current) * .08)
    camera.lookAt(pan.current * 1.05, 1.5, 0)
  })
  return null
}

export function Room() {
  return (
    <ArcadeCanvas camera={{ position: [0, 2.35, 5.8], fov: 55 }}>
      <RoomEnvironment />
      <Cabinet at={[...STATIONS.claw]} rotation={STATION_ROTATIONS.claw} color="#69c3c5" title="CLAW" />
      <Cabinet at={[...STATIONS.stacker]} rotation={STATION_ROTATIONS.stacker} color="#e886aa" title="STACK" />
      <Cabinet at={[...STATIONS.skeeball]} rotation={STATION_ROTATIONS.skeeball} color="#a68cdb" title="SKEE" />
      <Cabinet at={[-3.8, 0, 2.5]} rotation={.66} color="#8a87b3" title="ORBIT" />
      <Cabinet at={[3.8, 0, 2.5]} rotation={-.66} color="#7ca2ab" title="NOVA" />
      <HubView />
    </ArcadeCanvas>
  )
}
