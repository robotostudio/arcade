'use client'

import { useEffect, useMemo, useRef } from 'react'
import {
  BallCollider,
  CuboidCollider,
  CylinderCollider,
  RigidBody,
  type RapierRigidBody,
} from '@react-three/rapier'
import { CLAW } from './constants'
import { usePrizeRegistry } from './prizeRegistry'
import { MATERIALS } from '@/world/palette'
import { CLAW_MATS, PRIZE_MATS } from './materials'

type Kind = 'blob' | 'can' | 'crate'
type PrizeSpec = { id: number; kind: Kind; pos: [number, number, number]; rotY: number; mat: number; heavy: boolean }

const KINDS: Kind[] = ['blob', 'can', 'crate']

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function layout(seed: number, count: number): PrizeSpec[] {
  const rng = mulberry32(seed)
  const [x0, x1] = [CLAW.bounds.x[0] + 0.2, CLAW.bounds.x[1] - 0.2]
  const [z0, z1] = [CLAW.bounds.z[0] + 0.2, CLAW.bounds.z[1] - 0.2]
  const [cx, cz] = CLAW.chuteXZ
  const cols = 4
  const rows = 3
  const cells: [number, number][] = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = x0 + ((c + 0.5) / cols) * (x1 - x0)
      const z = z0 + ((r + 0.5) / rows) * (z1 - z0)
      if (Math.hypot(x - cx, z - cz) >= 0.45 + 0.1) cells.push([x, z])
    }
  const out: PrizeSpec[] = []
  // Heavy prizes: dark crates the claw can lift but never keep. Spread through the pile.
  const heavyIds = new Set<number>()
  while (heavyIds.size < Math.min(CLAW.heavyCount, count)) heavyIds.add(Math.floor(rng() * count))
  const jx = ((x1 - x0) / cols) * 0.2
  const jz = ((z1 - z0) / rows) * 0.2
  for (let i = 0; i < count; i++) {
    const layer = Math.floor(i / cells.length)
    const [bx, bz] = cells[i % cells.length]
    let x = bx + (rng() * 2 - 1) * jx
    let z = bz + (rng() * 2 - 1) * jz
    // keep clear of chute footprint
    const d = Math.hypot(x - cx, z - cz)
    if (d < 0.45) {
      const k = 0.45 / Math.max(d, 1e-3)
      x = cx + (x - cx) * k
      z = cz + (z - cz) * k
    }
    const y = CLAW.baseH + 0.3 + layer * 0.5 + rng() * 0.08
    const heavy = heavyIds.has(i)
    const kind = KINDS[Math.floor(rng() * KINDS.length)]
    const mat = Math.floor(rng() * PRIZE_MATS.length)
    out.push({ id: i, kind: heavy ? 'crate' : kind, pos: [x, y, z], rotY: rng() * Math.PI * 2, mat, heavy })
  }
  return out
}

function Prize({ spec }: { spec: PrizeSpec }) {
  const ref = useRef<RapierRigidBody>(null!)
  const registry = usePrizeRegistry()
  const mat = spec.heavy ? CLAW_MATS.heavy : PRIZE_MATS[spec.mat]
  useEffect(() => {
    const body = ref.current
    if (!body) return
    registry.register(spec.id, body, spec.heavy)
    return () => registry.unregister(spec.id, body)
  }, [spec.id, spec.heavy, registry])

  return (
    <RigidBody
      ref={ref}
      position={spec.pos}
      rotation={[0, spec.rotY, 0]}
      colliders={false}
      friction={0.8}
      linearDamping={0.5}
      angularDamping={0.5}
      ccd
      userData={{ prize: true, id: spec.id }}
    >
      {spec.kind === 'blob' && (
        <>
          <BallCollider args={[0.24]} mass={0.3} friction={0.8} />
          <mesh material={mat}>
            <icosahedronGeometry args={[0.22, 0]} />
          </mesh>
          <mesh position={[-0.13, 0.17, 0]} material={mat}>
            <icosahedronGeometry args={[0.08, 0]} />
          </mesh>
          <mesh position={[0.13, 0.17, 0]} material={mat}>
            <icosahedronGeometry args={[0.08, 0]} />
          </mesh>
        </>
      )}
      {spec.kind === 'can' && (
        <>
          <CylinderCollider args={[0.2, 0.16]} mass={0.3} friction={0.8} />
          <mesh material={mat}>
            <cylinderGeometry args={[0.16, 0.16, 0.4, 8]} />
          </mesh>
          <mesh position={[0, 0.201, 0]} material={MATERIALS.bone}>
            <cylinderGeometry args={[0.12, 0.12, 0.01, 8]} />
          </mesh>
        </>
      )}
      {spec.kind === 'crate' && (
        <>
          <CuboidCollider args={[0.17, 0.17, 0.17]} mass={spec.heavy ? 0.9 : 0.3} friction={0.8} />
          <mesh material={mat}>
            <boxGeometry args={[0.34, 0.34, 0.34]} />
          </mesh>
          {spec.heavy && (
            /* riveted band so the heavy crates read as iron, not just dark */
            <mesh material={MATERIALS.steel}>
              <boxGeometry args={[0.36, 0.06, 0.36]} />
            </mesh>
          )}
        </>
      )}
    </RigidBody>
  )
}

function PitColliders() {
  const { w, h, d } = CLAW.cabinet
  const t = 0.3 // half-thickness (thick floor so squashed prizes cannot tunnel out)
  const innerW = w - 0.2
  const innerD = d - 0.2
  const wallH = h - CLAW.baseH
  const wallY = CLAW.baseH + wallH / 2
  return (
    <RigidBody type="fixed" colliders={false} friction={0.8}>
      {/* floor, top surface at baseH */}
      <CuboidCollider args={[innerW / 2, t, innerD / 2]} position={[0, CLAW.baseH - t, 0]} />
      {/* walls at inner faces */}
      <CuboidCollider args={[t, wallH / 2, innerD / 2]} position={[-innerW / 2 - t, wallY, 0]} />
      <CuboidCollider args={[t, wallH / 2, innerD / 2]} position={[innerW / 2 + t, wallY, 0]} />
      <CuboidCollider args={[innerW / 2, wallH / 2, t]} position={[0, wallY, -innerD / 2 - t]} />
      <CuboidCollider args={[innerW / 2, wallH / 2, t]} position={[0, wallY, innerD / 2 + t]} />
    </RigidBody>
  )
}

function PrizeSet({ seed, count }: { seed: number; count: number }) {
  const specs = useMemo(() => layout(seed, count), [seed, count])
  return (
    <>
      {specs.map((s) => (
        <Prize key={s.id} spec={s} />
      ))}
    </>
  )
}

export function PrizePit({ seed, count, reset = 0 }: { seed: number; count: number; reset?: number }) {
  return (
    <group>
      <PitColliders />
      {/* visible pit floor */}
      <mesh position={[0, CLAW.baseH + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={CLAW_MATS.pitFloor}>
        <planeGeometry args={[CLAW.cabinet.w - 0.2, CLAW.cabinet.d - 0.2]} />
      </mesh>
      <PrizeSet key={reset} seed={seed} count={count} />
    </group>
  )
}
