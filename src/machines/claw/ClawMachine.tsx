'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Group, Vector3 } from 'three'
import { Display, useDisplay } from '@/world/Display'
import type { MachineProps } from '@/machines/types'
import { CLAW } from './constants'
import { initialClawState, stepClaw, type ClawGrabSense, type ClawPhase, type ClawState } from './clawLogic'
import { useClawInput } from './useClawInput'
import { createPrizeRegistry, PrizeRegistryContext, usePrizeRegistry } from './prizeRegistry'
import { Cabinet } from './Cabinet'
import { PrizePit } from './Prizes'
import { Chute } from './Chute'
import { ClawRig, type ClawPose } from './ClawRig'

// Rapier RigidBodyType numeric enum (compat 0.19.2; not re-exported by @react-three/rapier):
// 0 Dynamic, 1 Fixed, 2 KinematicPositionBased.
const DYNAMIC = 0
const KINEMATIC = 2

const MOUTH_OFFSET = -0.25 // sensor centre below the head (matches ClawRig)
const HOLD_OFFSET = -0.34 // where a grabbed prize's centre hangs below the head (fingers wrap it)
const HELD_GRIP = 0.55 // fingers spring back to this around a held prize; empty close goes to 1
const DANGLE = 0.7 // an edge grab keeps this much of its off-centre offset, so it visibly hangs crooked
const SLIP_BUMP = 0.7 // m/s sideways kick when a prize slips, so it tumbles off rather than dropping dead
const RESULT_TIME = 2.5 // s the Display holds a result before going back to the phase
const SETTLE_MS = 1500 // physics runs this long after mount even when inactive, so prizes rest
const RESPAWN_LOCAL = new Vector3(0, 2.4, 0)
// The Display (issue 12, ADR 0001): title, the phase, prizes won since docking, the result. It stands
// on the roof at the front, above the rails, so it never covers the play volume from DOCK.
const DISPLAY_W = 2.4
const DISPLAY_AT: [number, number, number] = [0, CLAW.cabinet.h + 0.62, CLAW.cabinet.d / 2 - 0.3]
const FOOTER = 'ONE DROP A ROUND / 100 TICKETS A PRIZE'
const IDLE_CONTENT = { headline: 'GRAB A PRIZE', footer: FOOTER }
const LABEL: Record<ClawPhase, string> = {
  idle: 'IDLE',
  moving: 'MOVE',
  descending: 'DROP',
  closing: 'GRAB',
  rising: 'RISING',
  carrying: 'CARRYING',
  releasing: 'RELEASE',
  returning: 'RETURNING',
}
// One prompt string per phase for the Shell: the real keys (useClawInput) and the verb. A Round
// starts on the drop, not on the first move, so idle and moving offer both; the automatic phases
// take no input, so they show nothing.
const AIM_PROMPT = 'Arrows: move · Space: drop'
const PROMPT: Record<ClawPhase, string> = {
  idle: AIM_PROMPT,
  moving: AIM_PROMPT,
  descending: '',
  closing: '',
  rising: '',
  carrying: '',
  releasing: '',
  returning: '',
}
const AIM_PHASES = new Set<ClawPhase>(['idle', 'moving', 'descending'])
const NO_GRAB: ClawGrabSense = { prizeInReach: false, grabQuality: 0, prizeHeavy: false }

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
  onPrompt,
  originRef,
  scoredRef,
}: {
  active: boolean
  onRoundEnd: (t: number) => void
  onPrompt?: (prompt: string) => void
  originRef: React.RefObject<Group>
  scoredRef: React.RefObject<number>
}) {
  const registry = usePrizeRegistry()
  const readInput = useClawInput(active)
  const state = useRef<ClawState>(initialClawState())
  const pose = useRef<ClawPose>({
    x: state.current.x,
    y: state.current.y,
    z: state.current.z,
    grip: 0,
    showAim: true,
    aimLock: false,
  })
  const heldId = useRef<number | null>(null)
  const lastRound = useRef(0)
  const scoredAtDrop = useRef(0)
  const scoreSeen = useRef(0)
  const scoredAtDock = useRef(0) // prizes won since docking = scoredRef - this
  const result = useRef({ text: '', until: 0 })
  const lastPrompt = useRef<string | null>(null)
  const onRoundEndRef = useRef(onRoundEnd)
  onRoundEndRef.current = onRoundEnd
  const onPromptRef = useRef(onPrompt)
  onPromptRef.current = onPrompt
  const v = useMemo(() => new Vector3(), [])
  const holdOffset = useMemo(() => new Vector3(), []) // machine-local prize offset from the head, eased toward hang
  const hang = useMemo(() => new Vector3(0, HOLD_OFFSET, 0), []) // where the held prize settles under the head
  const display = useDisplay({ accent: 'claw', title: 'CLAW' })

  // Once per phase change (and on leaving), never per frame.
  const prompt = (next: string) => {
    if (next === lastPrompt.current) return
    lastPrompt.current = next
    onPromptRef.current?.(next)
  }

  // Nearest registered prize centre to a mouth at head (x, y, z), within reach. Returns the prize
  // and its distance, or null when a drop here would close on nothing.
  const nearestPrize = (x: number, y: number, z: number): { id: number; d: number } | null => {
    const origin = originRef.current
    if (!origin) return null
    v.set(x, y + MOUTH_OFFSET, z)
    origin.localToWorld(v)
    let best: number | null = null
    let bestD: number = CLAW.reach
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
    return best === null ? null : { id: best, d: bestD }
  }

  const sense = (s: ClawState): ClawGrabSense & { id: number | null } => {
    const hit = nearestPrize(s.x, s.y, s.z)
    if (!hit) return { ...NO_GRAB, id: null }
    return {
      id: hit.id,
      prizeInReach: true,
      grabQuality: 1 - hit.d / CLAW.reach,
      prizeHeavy: registry.isHeavy(hit.id),
    }
  }

  // Back to dynamic. A slip gets a sideways kick and a tumble; a release over the chute drops clean.
  const letGo = (bump: boolean) => {
    const id = heldId.current
    heldId.current = null
    if (id === null) return
    const b = registry.get(id)
    if (!b || b.bodyType() !== KINEMATIC) return
    b.setBodyType(DYNAMIC, true)
    if (bump) {
      const a = Math.random() * Math.PI * 2
      const k = SLIP_BUMP * (0.6 + 0.4 * Math.random())
      b.setLinvel({ x: Math.cos(a) * k, y: 0.2, z: Math.sin(a) * k }, true)
      b.setAngvel({ x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 4, z: (Math.random() - 0.5) * 6 }, true)
    } else {
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      b.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
  }

  // Docking: the Display's prize count starts here, and a prize that fell in while settling
  // must not read as a win. Leaving mid-round: settle the pending round now so it is never lost.
  useEffect(() => {
    if (active) {
      scoredAtDock.current = scoredRef.current
      scoreSeen.current = scoredRef.current
      result.current = { text: '', until: 0 }
      return
    }
    prompt('')
    if (state.current.round > lastRound.current) {
      lastRound.current = state.current.round
      onRoundEndRef.current(scoredRef.current > scoredAtDrop.current ? CLAW.payout : 0)
    }
    letGo(false)
    state.current = initialClawState()
    state.current.round = lastRound.current
    const s = state.current
    Object.assign(pose.current, { x: s.x, y: s.y, z: s.z, grip: 0, showAim: true, aimLock: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useFrame((three, dt) => {
    if (!active) {
      display.show(IDLE_CONTENT)
      return
    }
    const now = three.clock.elapsedTime
    const prev = state.current
    const input = readInput()
    const grab = prev.phase === 'closing' ? sense(prev) : { ...NO_GRAB, id: null }
    const next = stepClaw(prev, { ...input, ...grab }, dt, Math.random)
    state.current = next
    const origin = originRef.current

    // grab: closing -> rising while holding
    if (prev.phase === 'closing' && next.phase === 'rising' && next.holding && grab.id !== null) {
      const b = registry.get(grab.id)
      if (b && origin) {
        const p = b.translation()
        origin.worldToLocal(holdOffset.set(p.x, p.y, p.z))
        holdOffset.x -= next.x
        holdOffset.y -= next.y
        holdOffset.z -= next.z
        // a clean grab centres the prize; an edge grab leaves it dangling off to the side
        const keep = DANGLE * (1 - grab.grabQuality)
        hang.set(holdOffset.x * keep, HOLD_OFFSET, holdOffset.z * keep)
        b.setBodyType(KINEMATIC, true)
        heldId.current = grab.id
      }
    }
    // slip or release: back to dynamic
    if (!prev.slipped && next.slipped) letGo(true)
    else if (next.phase === 'releasing' && prev.phase !== 'releasing') letGo(false)
    // carry the held prize under the mouth
    if (heldId.current !== null && origin) {
      const b = registry.get(heldId.current)
      if (b) {
        const k = 1 - Math.exp(-6 * dt)
        holdOffset.x += (hang.x - holdOffset.x) * k
        // never pull the prize down faster than the head rises, or it rams the pile and floor
        const dy = (hang.y - holdOffset.y) * k
        holdOffset.y += Math.max(dy, -CLAW.riseSpeed * dt * 0.9)
        holdOffset.z += (hang.z - holdOffset.z) * k
        v.set(next.x + holdOffset.x, next.y + holdOffset.y, next.z + holdOffset.z)
        origin.localToWorld(v)
        b.setNextKinematicTranslation(v)
      }
    }
    if (next.phase === 'descending' && prev.phase !== 'descending') scoredAtDrop.current = scoredRef.current
    if (next.result && heldId.current !== null) letGo(false)
    // Round end, exactly once per round, deferred until the head is home so a dropped prize has
    // had time to fall in. Pays only when the chute sensor caught a prize this round.
    if (next.result && next.phase === 'idle' && next.result.round !== lastRound.current) {
      lastRound.current = next.result.round
      const chuted = scoredRef.current > scoredAtDrop.current
      onRoundEndRef.current(chuted ? CLAW.payout : 0)
      if (!chuted) result.current = { text: 'MISSED', until: now + RESULT_TIME }
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
    // the aim ring lights when a drop from here would close on something
    p.aimLock = p.showAim && nearestPrize(next.x, CLAW.floorY, next.z) !== null

    // Display: a chute hit shows the win the moment the prize lands; otherwise the phase.
    if (scoredRef.current > scoreSeen.current) {
      scoreSeen.current = scoredRef.current
      result.current = { text: `+${CLAW.payout} TICKETS`, until: now + RESULT_TIME }
    }
    const headline = now < result.current.until ? result.current.text : LABEL[next.phase]
    display.show({ headline, sub: `PRIZES ${scoredRef.current - scoredAtDock.current}`, footer: FOOTER })
    prompt(PROMPT[next.phase])
  })

  return (
    <>
      <ClawRig pose={pose} />
      <Display handle={display} position={DISPLAY_AT} width={DISPLAY_W} />
    </>
  )
}

export function ClawMachine({ position, rotation, active, onRoundEnd, onPrompt }: MachineProps) {
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
          <ClawController active={active} onRoundEnd={onRoundEnd} onPrompt={onPrompt} originRef={originRef} scoredRef={scoredRef} />
        </Physics>
      </PrizeRegistryContext.Provider>
    </group>
  )
}
