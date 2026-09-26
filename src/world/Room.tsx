'use client'

import { CameraControls } from '@react-three/drei'
import { ArcadeCanvas } from './ArcadeCanvas'
import { MATERIALS, type PaletteColor } from './palette'

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
  color: PaletteColor
}) {
  const [w, h, d] = size
  return (
    <mesh position={[position[0], position[1] + h / 2, position[2]]} material={MATERIALS[color]}>
      <boxGeometry args={[w, h, d]} />
    </mesh>
  )
}

export function Room() {
  return (
    <ArcadeCanvas>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={MATERIALS.floor}>
        <planeGeometry args={[24, 20]} />
      </mesh>

      <Box position={STATIONS.claw} size={[2, 3, 2]} color="oxblood" />
      <Box position={STATIONS.stacker} size={[2, 3, 2]} color="slate" />
      <Box position={STATIONS.skeeball} size={[2, 3, 2]} color="steel" />
      <Box position={STATIONS.store} size={[6, 1.2, 1.5]} color="amber" />

      <CameraControls makeDefault smoothTime={0.6} />
    </ArcadeCanvas>
  )
}
