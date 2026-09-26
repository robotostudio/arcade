'use client'

// The Store counter: a low-poly prize counter with a back shelf unit, one shelf per Tier
// (bottom White, middle Blue, top Gold), each Bundle a garment pile standing on its Tier ring.
// Look rules: Lambert (Gouraud), no shadows, low-segment primitives, shared materials,
// and useFrame only mutates refs (no allocation, no React state).
import { Suspense, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import type * as THREE from 'three'
import type { Tier } from '@/arcade/economy'
import { ITEMS, type Item } from './items'
import { MAT, PILE, RING } from './materials'
import { PrizeSelector } from './PrizeSelector'
import { useStore } from './state'

type Vec3 = [number, number, number]

export type StoreCounterProps = {
  position: Vec3
  rotation?: Vec3
  onSelect?: (id: Item['id']) => void
  onOpen?: () => void
  open?: boolean // Store mode: the select screen is built onto the counter
  onClose?: () => void
}

// Counter and shelf layout, in counter-local units.
const BODY = { w: 6, h: 1.2, d: 1.5 }
const SHELF_Z = -1.1
const SHELF_Y: Record<Tier, number> = { white: 1.45, blue: 2.2, gold: 2.95 }
const SHELF_W = 5.8
const SIGN_Y = 3.75

const RING_RADIUS = 0.26
const RING_TUBE = 0.035
const SELECTED_SCALE = 1.15
const RING_SPIN = 0.7 // rad/s around the vertical
const RING_TILT = 0.18 // rad off flat so the spin reads
const BOB_AMP = 0.05
const BOB_SPEED = 1.6

// Where each Item sits along its shelf.
const SLOT_X: Record<Tier, number[]> = { white: [-1.7, 0, 1.7], blue: [-1.7, 0, 1.7], gold: [-1.7, 0, 1.7] }

const PLACED = (['white', 'blue', 'gold'] as Tier[]).flatMap((tier) =>
  ITEMS.filter((i) => i.tier === tier).map((item, n) => ({
    item,
    position: [SLOT_X[tier][n] ?? 0, SHELF_Y[tier] + 0.04, SHELF_Z] as Vec3,
    phase: n * 1.9,
  })),
)

export function StoreCounter({ position, rotation, onSelect, onOpen, open, onClose }: StoreCounterProps) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && !!onOpen)
  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(event) => {
        event.stopPropagation()
        onOpen?.()
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Counter body and top slab */}
      <mesh position={[0, BODY.h / 2, 0]} material={MAT.body}>
        <boxGeometry args={[BODY.w, BODY.h, BODY.d]} />
      </mesh>
      <mesh position={[0, BODY.h + 0.06, 0.05]} material={MAT.slab}>
        <boxGeometry args={[BODY.w + 0.3, 0.12, BODY.d + 0.2]} />
      </mesh>
      {/* Kick plate so the body does not float in the fog */}
      <mesh position={[0, 0.06, 0.02]} material={MAT.shelf}>
        <boxGeometry args={[BODY.w - 0.1, 0.12, BODY.d]} />
      </mesh>

      <ShelfUnit />
      <Sign />
      {open && (
        <Suspense fallback={null}>
          <PrizeSelector onClose={onClose} />
        </Suspense>
      )}

      {PLACED.map(({ item, position: p, phase }) => (
        <ItemSlot key={item.id} item={item} position={p} phase={phase} onSelect={(id) => {
          onSelect?.(id)
          onOpen?.()
        }} />
      ))}
    </group>
  )
}

function ShelfUnit() {
  const top = SHELF_Y.gold + 0.6
  return (
    <group>
      {/* Back panel */}
      <mesh position={[0, top / 2, SHELF_Z - 0.34]} material={MAT.shelf}>
        <boxGeometry args={[SHELF_W + 0.2, top, 0.08]} />
      </mesh>
      {/* Uprights */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (SHELF_W / 2 + 0.05), top / 2, SHELF_Z]} material={MAT.shelf}>
          <boxGeometry args={[0.1, top, 0.7]} />
        </mesh>
      ))}
      {/* One board per Tier */}
      {(Object.keys(SHELF_Y) as Tier[]).map((tier) => (
        <mesh key={tier} position={[0, SHELF_Y[tier] - 0.04, SHELF_Z]} material={MAT.shelf}>
          <boxGeometry args={[SHELF_W, 0.08, 0.66]} />
        </mesh>
      ))}
    </group>
  )
}

const STORE_GLYPHS = [
  ['111', '100', '111', '001', '111'],
  ['111', '010', '010', '010', '010'],
  ['111', '101', '101', '101', '111'],
  ['110', '101', '110', '101', '101'],
  ['111', '100', '110', '100', '111'],
]

function Sign() {
  return (
    <group position={[0, SIGN_Y, SHELF_Z + 0.1]}>
      {/* Chains */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.1, 0.35, 0]} material={MAT.plinth}>
          <boxGeometry args={[0.03, 0.4, 0.03]} />
        </mesh>
      ))}
      <mesh material={MAT.sign}>
        <boxGeometry args={[2.8, 0.42, 0.08]} />
      </mesh>
      {/* Pixel lettering uses geometry so the sign needs no font download. */}
      {STORE_GLYPHS.map((rows, letter) => rows.flatMap((row, y) =>
        [...row].flatMap((pixel, x) => pixel === '1' ? (
          <mesh key={`${letter}-${y}-${x}`} position={[(letter * 4 + x - 9) * 0.095, (2 - y) * 0.06, 0.055]} material={MAT.signText}>
            <boxGeometry args={[0.08, 0.05, 0.02]} />
          </mesh>
        ) : []),
      ))}
    </group>
  )
}

type ItemSlotProps = {
  item: Item
  position: Vec3
  phase: number
  onSelect?: (id: Item['id']) => void
}

function ItemSlot({ item, position, phase, onSelect }: ItemSlotProps) {
  const selected = useStore((s) => s.selected === item.id)
  const select = useStore((s) => s.select)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const ringSpin = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const marker = useRef<THREE.Mesh>(null)

  // Every Item gets the shine: spinning tilted ring and a slow bob.
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    if (ringSpin.current) ringSpin.current.rotation.y += delta * RING_SPIN
    if (body.current) body.current.position.y = Math.sin(t * BOB_SPEED + phase) * BOB_AMP
    if (marker.current) {
      marker.current.rotation.y += delta * 2
      marker.current.position.y = 0.7 + Math.sin(t * 3) * 0.03
    }
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    select(item.id)
    onSelect?.(item.id)
  }

  return (
    <group
      position={position}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <group ref={ringSpin} scale={selected ? SELECTED_SCALE : 1}>
        <mesh
          position={[0, 0.03, 0]}
          rotation={[-Math.PI / 2 + RING_TILT, 0, 0]}
          material={RING[item.tier]}
        >
          <torusGeometry args={[RING_RADIUS, RING_TUBE, 8, 16]} />
        </mesh>
      </group>
      <group ref={body}>
        <GarmentPile item={item} />
      </group>
      {selected && (
        <mesh ref={marker} position={[0, 0.7, 0]} rotation={[0, 0, Math.PI / 4]} material={MAT.marker}>
          <boxGeometry args={[0.08, 0.08, 0.08]} />
        </mesh>
      )}
    </group>
  )
}

// A pile of 3-5 folded flats in the Tier colour; bigger bundles pile higher.
// Deterministic offsets per layer so the pile looks tossed, not stamped.
const FLAT = { w: 0.34, h: 0.05, d: 0.26 }

function GarmentPile({ item }: { item: Item }) {
  const layers = 3 + Math.min(2, Math.floor(item.pieces / 12))
  const shades = PILE[item.tier]
  return (
    <>
      {Array.from({ length: layers }, (_, n) => (
        <mesh
          key={n}
          position={[((n % 2) - 0.5) * 0.03, FLAT.h / 2 + n * FLAT.h, ((n % 3) - 1) * 0.015]}
          rotation={[0, (n % 2 ? -1 : 1) * 0.12 * (1 + (n % 3) * 0.4), 0]}
          material={shades[n % 2]}
        >
          <boxGeometry args={[FLAT.w - n * 0.015, FLAT.h, FLAT.d - n * 0.01]} />
        </mesh>
      ))}
    </>
  )
}
