'use client'

import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Group, Vector3 } from 'three'
import type { MachineProps } from '@/machines/types'
import { CLAW } from './constants'
import { initialClawState, stepClaw, type ClawState } from './clawLogic'
import { useClawInput } from './useClawInput'
import { prizeRegistry } from './prizeRegistry'
import { Cabinet } from './Cabinet'
import { PrizePit } from './Prizes'
import { Chute } from './Chute'
import { ClawRig } from './ClawRig'

// Rapier RigidBodyType numeric enum (compat 0.12; not re-exported by @react-three/rapier):
// 0 Dynamic, 1 Fixed, 2 KinematicPositionBased.
const DYNAMIC = 0
const KINEMATIC = 2

const MOUTH_OFFSET = -0.25 // sensor centre below the head (matches ClawRig)
const HOLD_OFFSET = -0.4 // where a grabbed prize's centre hangs below the head
const MARQUEE: Record<ClawState['phase'], string> = {
  idle: '#c98a3a',
  moving: '#c98a3a',
  descending: '#6b1f1f',
  closing: '#6b1f1f',
  rising: '#9aa8c0',
  carrying: '#9aa8c0',
  releasing: '#d8cfc0',
  returning: '#c98a3a',
}

const StaticParts = memo(function StaticParts({ onScore }: { onScore: (id: number) => void }) {
  return (
    <>
      <Cabinet />
      <PrizePit seed={7} count={CLAW.prizeCount} />
      <Chute onScore={onScore} />
    </>
  )
})

function ClawController({
  active,
  onRoundEnd,
  originRef,
  scoredRef,
}: {
  active: boolean
  onRoundEnd: (t: number) => void
  originRef: React.RefObject<Group>
  scoredRef: React.RefObject<number>
}) {
  const readInput = useClawInput(active)
  const state = useRef<ClawState>(initialClawState())
  const [snap, setSnap] = useState<ClawState>(state.current)
  const sensedId = useRef<number | null>(null)
  const heldId = useRef<number | null>(null)
  const lastRound = useRef(0)
  const scoredAtDrop = useRef(0)
  const onRoundEndRef = useRef(onRoundEnd)
  onRoundEndRef.current = onRoundEnd
  const v = useMemo(() => new Vector3(), [])
  const holdOffset = useMemo(() => new Vector3(), []) // machine-local prize offset from the head, eased to HOLD_OFFSET

  const onReach = useCallback((inReach: boolean, id: number | null) => {
    sensedId.current = inReach ? id : null
  }, [])

  // Nearest registered prize to the mouth (world space), within grab radius. Backs up the sensor.
  const nearestPrize = (s: ClawState): number | null => {
    const origin = originRef.current
    if (!origin) return sensedId.current
    v.set(s.x, s.y + MOUTH_OFFSET, s.z)
    origin.localToWorld(v)
    let best: number | null = null
    let bestD = CLAW.grabRadius + 0.12
    for (let id = 0; id < CLAW.prizeCount; id++) {
      const b = prizeRegistry.get(id)
      if (!b || b.bodyType() !== DYNAMIC) continue
      const p = b.translation()
      const d = Math.hypot(p.x - v.x, p.y - v.y, p.z - v.z)
      if (d < bestD) {
        bestD = d
        best = id
      }
    }
    return best ?? sensedId.current
  }

  const letGo = () => {
    const id = heldId.current
    heldId.current = null
    if (id === null) return
    const b = prizeRegistry.get(id)
    if (!b || b.bodyType() !== KINEMATIC) return
    b.setBodyType(DYNAMIC, true)
    b.setLinvel({ x: 0, y: 0, z: 0 }, true)
    b.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }

  useFrame((_, dt) => {
    if (!active) return
    const prev = state.current
    const input = readInput()
    const candidate = prev.phase === 'closing' ? nearestPrize(prev) : null
    const next = stepClaw(prev, { ...input, prizeInReach: candidate !== null }, dt, Math.random)
    state.current = next

    // grab: closing -> rising while holding
    if (prev.phase === 'closing' && next.phase === 'rising' && next.holding && candidate !== null) {
      const b = prizeRegistry.get(candidate)
      if (b && originRef.current) {
        const p = b.translation()
        originRef.current.worldToLocal(holdOffset.set(p.x, p.y, p.z))
        holdOffset.x -= next.x
        holdOffset.y -= next.y
        holdOffset.z -= next.z
        b.setBodyType(KINEMATIC, true)
        heldId.current = candidate
      }
    }
    // slip or release: back to dynamic
    if ((!prev.slipped && next.slipped) || (next.phase === 'releasing' && prev.phase !== 'releasing')) letGo()
    // carry the held prize under the mouth
    if (heldId.current !== null && originRef.current) {
      const b = prizeRegistry.get(heldId.current)
      if (b) {
        const k = 1 - Math.exp(-6 * dt)
        holdOffset.x += (0 - holdOffset.x) * k
        holdOffset.y += (HOLD_OFFSET - holdOffset.y) * k
        holdOffset.z += (0 - holdOffset.z) * k
        v.set(next.x + holdOffset.x, next.y + holdOffset.y, next.z + holdOffset.z)
        originRef.current.localToWorld(v)
        b.setNextKinematicTranslation(v)
      }
    }
    if (next.phase === 'descending' && prev.phase !== 'descending') scoredAtDrop.current = scoredRef.current
    if (next.result && heldId.current !== null) letGo()
    // Round end, exactly once per round. Deferred until the head is home so a prize dropped at the
    // chute has had time to fall in. Won if the claw held on to release OR any prize hit the chute
    // this round (a late slip over the chute still pays, which is what the player sees).
    if (next.result && next.phase === 'idle' && next.result.round !== lastRound.current) {
      lastRound.current = next.result.round
      const chuted = scoredRef.current > scoredAtDrop.current
      onRoundEndRef.current(next.result.won || chuted ? CLAW.payout : 0)
    }

    if (next.x !== snap.x || next.y !== snap.y || next.z !== snap.z || next.grip !== snap.grip || next.phase !== snap.phase) {
      setSnap(next)
    }
  })

  const { w, h, d } = CLAW.cabinet
  return (
    <>
      <ClawRig x={snap.x} y={snap.y} z={snap.z} grip={snap.grip} onReach={onReach} />
      {/* phase cue: a thin lamp strip under the roof, front */}
      <mesh position={[0, h - 0.07, d / 2 + 0.05]}>
        <boxGeometry args={[w - 0.2, 0.05, 0.03]} />
        <meshLambertMaterial color={MARQUEE[snap.phase]} emissive={MARQUEE[snap.phase]} emissiveIntensity={0.8} />
      </mesh>
    </>
  )
}

export function ClawMachine({ position, rotation, active, onRoundEnd }: MachineProps) {
  const originRef = useRef<Group>(null!)
  const scoredRef = useRef(0)
  const onScore = useCallback(() => {
    scoredRef.current += 1
  }, [])

  return (
    <group ref={originRef} position={position} rotation={rotation}>
      <Physics timeStep={1 / 60} paused={!active}>
        <StaticParts onScore={onScore} />
        <ClawController active={active} onRoundEnd={onRoundEnd} originRef={originRef} scoredRef={scoredRef} />
      </Physics>
    </group>
  )
}
