'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Color, Group, Vector3 } from 'three'
import type { MachineProps } from '@/machines/types'
import { CLAW } from './constants'
import { initialClawState, stepClaw, type ClawPhase, type ClawState } from './clawLogic'
import { useClawInput } from './useClawInput'
import { createPrizeRegistry, PrizeRegistryContext, usePrizeRegistry } from './prizeRegistry'
import { makeLampMaterial } from './materials'
import { Cabinet } from './Cabinet'
import { PrizePit } from './Prizes'
import { Chute } from './Chute'
import { ClawRig, type ClawPose } from './ClawRig'

// Rapier RigidBodyType numeric enum (compat 0.12; not re-exported by @react-three/rapier):
// 0 Dynamic, 1 Fixed, 2 KinematicPositionBased.
const DYNAMIC = 0
const KINEMATIC = 2

const MOUTH_OFFSET = -0.25 // sensor centre below the head (matches ClawRig)
const HOLD_OFFSET = -0.34 // where a grabbed prize's centre hangs below the head (fingers wrap it)
const HELD_GRIP = 0.55 // fingers spring back to this around a held prize; empty close goes to 1
const FLASH_TIME = 1.2 // s of lamp blink after a prize drops into the chute
const SETTLE_MS = 1500 // physics runs this long after mount even when inactive, so prizes rest
const RESPAWN_LOCAL = new Vector3(0, 2.4, 0)
const MARQUEE: Record<ClawPhase, Color> = {
  idle: new Color('#c98a3a'),
  moving: new Color('#c98a3a'),
  descending: new Color('#6b1f1f'),
  closing: new Color('#6b1f1f'),
  rising: new Color('#9aa8c0'),
  carrying: new Color('#9aa8c0'),
  releasing: new Color('#d8cfc0'),
  returning: new Color('#c98a3a'),
}
const AIM_PHASES = new Set<ClawPhase>(['idle', 'moving', 'descending'])

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
  const registry = usePrizeRegistry()
  const readInput = useClawInput(active)
  const state = useRef<ClawState>(initialClawState())
  const pose = useRef<ClawPose>({ x: state.current.x, y: state.current.y, z: state.current.z, grip: 0, showAim: true })
  const sensedId = useRef<number | null>(null)
  const heldId = useRef<number | null>(null)
  const lastRound = useRef(0)
  const scoredAtDrop = useRef(0)
  const scoreSeen = useRef(0)
  const flashUntil = useRef(0)
  const onRoundEndRef = useRef(onRoundEnd)
  onRoundEndRef.current = onRoundEnd
  const v = useMemo(() => new Vector3(), [])
  const holdOffset = useMemo(() => new Vector3(), []) // machine-local prize offset from the head, eased to HOLD_OFFSET
  const lamp = useMemo(() => makeLampMaterial(), [])
  useEffect(() => () => lamp.dispose(), [lamp])

  const onReach = useCallback((inReach: boolean, id: number | null) => {
    sensedId.current = inReach ? id : null
  }, [])

  // Nearest registered prize centre to the mouth (world space), within grab radius. A drop aimed
  // at a prize wins; a sloppy drop between prizes misses.
  const nearestPrize = (s: ClawState): number | null => {
    const origin = originRef.current
    if (!origin) return null
    v.set(s.x, s.y + MOUTH_OFFSET, s.z)
    origin.localToWorld(v)
    let best: number | null = null
    let bestD = CLAW.grabRadius + 0.04
    for (let id = 0; id < CLAW.prizeCount; id++) {
      const b = registry.get(id)
      if (!b || b.bodyType() !== DYNAMIC) continue
      const p = b.translation()
      const d = Math.hypot(p.x - v.x, p.y - v.y, p.z - v.z)
      if (d < bestD) {
        bestD = d
        best = id
      }
    }
    return best
  }

  const letGo = () => {
    const id = heldId.current
    heldId.current = null
    if (id === null) return
    const b = registry.get(id)
    if (!b || b.bodyType() !== KINEMATIC) return
    b.setBodyType(DYNAMIC, true)
    b.setLinvel({ x: 0, y: 0, z: 0 }, true)
    b.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }

  // Player left mid-round: settle the pending round now so it is never lost.
  useEffect(() => {
    if (active) return
    if (state.current.round > lastRound.current) {
      lastRound.current = state.current.round
      onRoundEndRef.current(scoredRef.current > scoredAtDrop.current ? CLAW.payout : 0)
    }
    letGo()
    state.current = initialClawState()
    state.current.round = lastRound.current
    const s = state.current
    Object.assign(pose.current, { x: s.x, y: s.y, z: s.z, grip: 0, showAim: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useFrame((three, dt) => {
    if (!active) return
    const now = three.clock.elapsedTime
    const prev = state.current
    const input = readInput()
    const candidate = prev.phase === 'closing' ? nearestPrize(prev) : null
    const next = stepClaw(prev, { ...input, prizeInReach: candidate !== null }, dt, Math.random)
    state.current = next
    const origin = originRef.current

    // grab: closing -> rising while holding
    if (prev.phase === 'closing' && next.phase === 'rising' && next.holding && candidate !== null) {
      const b = registry.get(candidate)
      if (b && origin) {
        const p = b.translation()
        origin.worldToLocal(holdOffset.set(p.x, p.y, p.z))
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
    if (heldId.current !== null && origin) {
      const b = registry.get(heldId.current)
      if (b) {
        const k = 1 - Math.exp(-6 * dt)
        holdOffset.x += (0 - holdOffset.x) * k
        // never pull the prize down faster than the head rises, or it rams the pile and floor
        const dy = (HOLD_OFFSET - holdOffset.y) * k
        holdOffset.y += Math.max(dy, -CLAW.riseSpeed * dt * 0.9)
        holdOffset.z += (0 - holdOffset.z) * k
        v.set(next.x + holdOffset.x, next.y + holdOffset.y, next.z + holdOffset.z)
        origin.localToWorld(v)
        b.setNextKinematicTranslation(v)
      }
    }
    if (next.phase === 'descending' && prev.phase !== 'descending') scoredAtDrop.current = scoredRef.current
    if (next.result && heldId.current !== null) letGo()
    // Round end, exactly once per round, deferred until the head is home so a dropped prize has
    // had time to fall in. Pays only when the chute sensor caught a prize this round.
    if (next.result && next.phase === 'idle' && next.result.round !== lastRound.current) {
      lastRound.current = next.result.round
      const chuted = scoredRef.current > scoredAtDrop.current
      onRoundEndRef.current(chuted ? CLAW.payout : 0)
    }

    // Escaped prizes (pushed through floor/wall) come back into the pit while idle.
    if (next.phase === 'idle' && origin) {
      const floorWorldY = origin.getWorldPosition(v).y + CLAW.baseH - 1
      for (let id = 0; id < CLAW.prizeCount; id++) {
        const b = registry.get(id)
        if (!b || b.bodyType() !== DYNAMIC || b.translation().y >= floorWorldY) continue
        v.copy(RESPAWN_LOCAL)
        origin.localToWorld(v)
        b.setTranslation(v, true)
        b.setLinvel({ x: 0, y: 0, z: 0 }, true)
        b.setAngvel({ x: 0, y: 0, z: 0 }, true)
      }
    }

    // pose for the rig (read in its own useFrame; no React re-render)
    const p = pose.current
    p.x = next.x
    p.y = next.y
    p.z = next.z
    p.grip = heldId.current !== null ? Math.min(next.grip, HELD_GRIP) : next.grip
    p.showAim = AIM_PHASES.has(next.phase)

    // phase lamp; blinks after a chute hit
    if (scoredRef.current > scoreSeen.current) {
      scoreSeen.current = scoredRef.current
      flashUntil.current = now + FLASH_TIME
    }
    const c = MARQUEE[next.phase]
    lamp.color.copy(c)
    lamp.emissive.copy(c)
    lamp.emissiveIntensity = now < flashUntil.current ? (Math.floor(now * 8) % 2 ? 2.0 : 0.3) : 0.8
  })

  const { w, h, d } = CLAW.cabinet
  return (
    <>
      <ClawRig pose={pose} onReach={onReach} />
      {/* phase lamp capping the marquee topper */}
      <mesh position={[0, h + 0.33, d / 2 - 0.15]} material={lamp}>
        <boxGeometry args={[w - 0.2, 0.05, 0.06]} />
      </mesh>
    </>
  )
}

export function ClawMachine({ position, rotation, active, onRoundEnd }: MachineProps) {
  const originRef = useRef<Group>(null!)
  const scoredRef = useRef(0)
  const registry = useMemo(() => createPrizeRegistry(), [])
  const onScore = useCallback(() => {
    scoredRef.current += 1
  }, [])
  // Let the seeded stack settle once even if the machine mounts inactive, then honour the
  // paused-when-inactive rule.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), SETTLE_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <group ref={originRef} position={position} rotation={rotation}>
      <PrizeRegistryContext.Provider value={registry}>
        <Physics timeStep={1 / 60} paused={!active && settled}>
          <StaticParts onScore={onScore} />
          <ClawController active={active} onRoundEnd={onRoundEnd} originRef={originRef} scoredRef={scoredRef} />
        </Physics>
      </PrizeRegistryContext.Provider>
    </group>
  )
}
