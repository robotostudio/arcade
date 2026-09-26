'use client'

// The Store counter: a low-poly prize counter with a back shelf unit, one shelf per Tier
// (bottom White, middle Blue, top Gold), each Item standing on its Tier ring.
// Look rules: Lambert (Gouraud), no shadows, low-segment primitives, shared materials,
// and useFrame only mutates refs (no allocation, no React state).
import { useRef, useState, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import type * as THREE from 'three'
import type { Tier } from '@/arcade/economy'
import { ITEMS, type Item } from './items'
import { MAT, RING } from './materials'
import { useStore } from './state'

type Vec3 = [number, number, number]

export type StoreCounterProps = {
  position: Vec3
  rotation?: Vec3
  onSelect?: (id: Item['id']) => void
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
const GOLD_SPIN = 0.7 // rad/s around the vertical
const GOLD_TILT = 0.18 // rad off flat so the spin reads
const BOB_AMP = 0.05
const BOB_SPEED = 1.6

// Where each Item sits along its shelf.
const SLOT_X: Record<Tier, number[]> = { white: [-1.7, 0, 1.7], blue: [-1.7, 0, 1.7], gold: [-1, 1] }

const PLACED = (['white', 'blue', 'gold'] as Tier[]).flatMap((tier) =>
  ITEMS.filter((i) => i.tier === tier).map((item, n) => ({
    item,
    position: [SLOT_X[tier][n] ?? 0, SHELF_Y[tier] + 0.04, SHELF_Z] as Vec3,
    phase: n * 1.9,
  })),
)

export function StoreCounter({ position, rotation, onSelect }: StoreCounterProps) {
  return (
    <group position={position} rotation={rotation}>
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

      {PLACED.map(({ item, position: p, phase }) => (
        <ItemSlot key={item.id} item={item} position={p} phase={phase} onSelect={onSelect} />
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
      {/* A stripe of Roboto blue standing in for lettering */}
      <mesh position={[0, 0, 0.045]} material={MAT.signText}>
        <boxGeometry args={[2.2, 0.12, 0.02]} />
      </mesh>
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
  const gold = item.tier === 'gold'

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    if (gold) {
      if (ringSpin.current) ringSpin.current.rotation.y += delta * GOLD_SPIN
      if (body.current) body.current.position.y = Math.sin(t * BOB_SPEED + phase) * BOB_AMP
    }
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
          rotation={[-Math.PI / 2 + (gold ? GOLD_TILT : 0), 0, 0]}
          material={RING[item.tier]}
        >
          <torusGeometry args={[RING_RADIUS, RING_TUBE, 8, 16]} />
        </mesh>
      </group>
      <group ref={body}>
        <Silhouette id={item.id} />
      </group>
      {selected && (
        <mesh ref={marker} position={[0, 0.7, 0]} rotation={[0, 0, Math.PI / 4]} material={MAT.marker}>
          <boxGeometry args={[0.08, 0.08, 0.08]} />
        </mesh>
      )}
    </group>
  )
}

// Procedural stand-ins for each Item. Everything sits on y = 0 (the shelf top).
function Silhouette({ id }: { id: Item['id'] }): ReactNode {
  switch (id) {
    case 'sticker-pack':
      return (
        <>
          <mesh position={[0, 0.03, 0]} material={MAT.roboBlue}>
            <boxGeometry args={[0.3, 0.03, 0.22]} />
          </mesh>
          <mesh position={[0.02, 0.06, 0.01]} rotation={[0, 0.3, 0]} material={MAT.bone}>
            <boxGeometry args={[0.26, 0.03, 0.2]} />
          </mesh>
        </>
      )
    case 'enamel-pin':
      return (
        <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.red}>
          <cylinderGeometry args={[0.11, 0.11, 0.035, 8]} />
        </mesh>
      )
    case 'tote-bag':
      return (
        <>
          <mesh position={[0, 0.19, 0]} material={MAT.canvas}>
            <boxGeometry args={[0.3, 0.34, 0.07]} />
          </mesh>
          <mesh position={[0, 0.37, 0]} material={MAT.canvas}>
            <torusGeometry args={[0.09, 0.014, 4, 8]} />
          </mesh>
        </>
      )
    case 'hoodie':
      return (
        <>
          <mesh position={[0, 0.19, 0]} material={MAT.hoodie}>
            <boxGeometry args={[0.42, 0.34, 0.16]} />
          </mesh>
          <mesh position={[0, 0.42, -0.01]} material={MAT.hoodie}>
            <boxGeometry args={[0.2, 0.14, 0.14]} />
          </mesh>
        </>
      )
    case 'cap':
      return (
        <>
          <mesh position={[0, 0.03, 0]} material={MAT.roboBlue}>
            <sphereGeometry args={[0.16, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 0.035, 0.17]} material={MAT.roboBlue}>
            <boxGeometry args={[0.2, 0.015, 0.12]} />
          </mesh>
        </>
      )
    case 'mug-set':
      return (
        <>
          {[-0.15, 0, 0.15].map((x) => (
            <mesh key={x} position={[x, 0.08, 0]} material={MAT.ceramic}>
              <cylinderGeometry args={[0.06, 0.06, 0.13, 8]} />
            </mesh>
          ))}
        </>
      )
    case 'site-audit':
    case 'day-of-roboto': {
      const r = id === 'day-of-roboto' ? 0.19 : 0.15
      return (
        <>
          <mesh position={[0, 0.07, 0]} material={MAT.plinth}>
            <cylinderGeometry args={[0.13, 0.17, 0.14, 8]} />
          </mesh>
          <mesh position={[0, 0.14 + r + 0.06, 0]} material={MAT.glow}>
            <icosahedronGeometry args={[r, 0]} />
          </mesh>
        </>
      )
    }
    default:
      return (
        <mesh position={[0, 0.12, 0]} material={MAT.bone}>
          <boxGeometry args={[0.2, 0.24, 0.2]} />
        </mesh>
      )
  }
}
