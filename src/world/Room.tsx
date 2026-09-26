'use client'

import { Canvas } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'

// Placeholder Room (issue 01): floor, three Machine boxes, a Store counter box.
// Real cabinets replace these boxes in Phase 2. Positions are the station slots.
export const STATIONS = {
  claw: [-4, 0, 0] as const,
  stacker: [0, 0, 0] as const,
  skeeball: [4, 0, 0] as const,
  store: [0, 0, -5] as const,
}

function Box({
  position,
  size,
  color,
}: {
  position: readonly [number, number, number]
  size: [number, number, number]
  color: string
}) {
  const [w, h, d] = size
  return (
    <mesh position={[position[0], position[1] + h / 2, position[2]]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  )
}

export function Room() {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.5]}
      camera={{ position: [0, 7, 12], fov: 45 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#14141c']} />
      <hemisphereLight args={['#dfe8ff', '#3a2e2a', 1.5]} />
      <directionalLight
        position={[6, 10, 6]}
        intensity={3}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 20]} />
        <meshStandardMaterial color="#2b2b3a" flatShading />
      </mesh>

      <Box position={STATIONS.claw} size={[2, 3, 2]} color="#4f8bff" />
      <Box position={STATIONS.stacker} size={[2, 3, 2]} color="#e6473a" />
      <Box position={STATIONS.skeeball} size={[2, 3, 2]} color="#3fc47a" />
      <Box position={STATIONS.store} size={[6, 1.2, 1.5]} color="#f2c14e" />

      <CameraControls makeDefault smoothTime={0.6} />
    </Canvas>
  )
}
