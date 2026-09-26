'use client'

import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import { Group, MathUtils, Quaternion, Vector3 } from 'three'
import type { MachineProps } from '@/machines/types'
import { SKEE } from './constants'
import {
  aimAngle,
  initialSkeeState,
  powerLevel,
  startRound,
  stepSkee,
  ticketsFor,
  type SkeeSense,
  type SkeeState,
} from './skeeballLogic'
import { useSkeeballInput } from './useSkeeballInput'
import { Cabinet } from './Cabinet'
import { Lane } from './Lane'
import { Ball, BALL_NAME } from './Ball'
import { Indicators, type SkeePose } from './Indicators'

// Skeeball Machine (issue 05). Structure mirrors ClawMachine: a root group at `position`, its own
// <Physics> paused when inactive, static parts memoised, and a controller that steps the pure
// state machine in useFrame, drives the one ball body, and writes a pose ref for the Indicators.
//
// Sense plumbing: the Lane's sensors call onTrough/onGutter (physics callbacks, any time), which
// only book-keep in `senseRef`: how many trough sensors of each value the ball overlaps right now
// (a bounce can clip two rows; the two 100 pockets share a value) and a gutter flag. The controller
// reads that once per frame into a SkeeSense for stepSkee, which ignores it outside 'rolling', so a
// resting or parked ball can never rescore.

const ZERO = { x: 0, y: 0, z: 0 }
const NO_SENSE: SkeeSense = { inside: null, gutter: false }

type SkeeSensors = { overlaps: Map<number, number>; gutter: boolean }

/** Lowest trough value the ball currently overlaps: a ball bouncing on a shelf may also clip the
 *  next row's sensor, and the lower one is the shelf it is over. */
function insideValue(overlaps: Map<number, number>): number | null {
  let best: number | null = null
  for (const [value, n] of overlaps) if (n > 0 && (best === null || value < best)) best = value
  return best
}

const StaticParts = memo(function StaticParts({
  onTrough,
  onGutter,
}: {
  onTrough: (value: number, inside: boolean) => void
  onGutter: () => void
}) {
  return (
    <>
      <Cabinet />
      <Lane onTrough={onTrough} onGutter={onGutter} />
    </>
  )
})

function SkeeController({
  active,
  onRoundEnd,
  originRef,
  bodyRef,
  senseRef,
}: {
  active: boolean
  onRoundEnd: (t: number) => void
  originRef: React.RefObject<Group | null>
  bodyRef: React.RefObject<RapierRigidBody | null>
  senseRef: React.RefObject<SkeeSensors>
}) {
  const readInput = useSkeeballInput(active)
  const state = useRef<SkeeState>(initialSkeeState())
  const pose = useRef<SkeePose>({ phase: 'idle', aim: 0, power: 0, lastHit: null, score: 0, ballsLeft: 0, hitT: -1e9 })
  const lastRound = useRef(0)
  const onRoundEndRef = useRef(onRoundEnd)
  onRoundEndRef.current = onRoundEnd
  const v = useMemo(() => new Vector3(), [])
  const lv = useMemo(() => new Vector3(), [])
  const dir = useMemo(() => new Vector3(), [])
  const q = useMemo(() => new Quaternion(), [])

  // Teleport the ball to the spawn (world space) and stop it dead. The body's Object3D is snapped
  // too: rapier writes body -> mesh inside step(), which a paused <Physics> never runs, so without
  // this a ball parked as the player leaves stays drawn wherever it was (mid-air over the well).
  const park = () => {
    const b = bodyRef.current
    const origin = originRef.current
    if (!b || !origin) return
    v.set(SKEE.ball.spawn[0], SKEE.ball.spawn[1], SKEE.ball.spawn[2])
    origin.localToWorld(v)
    b.setTranslation(v, true)
    b.setLinvel(ZERO, true)
    b.setAngvel(ZERO, true)
    senseRef.current.overlaps.clear()
    const o = origin.getObjectByName(BALL_NAME)
    if (o) {
      o.position.set(SKEE.ball.spawn[0], SKEE.ball.spawn[1], SKEE.ball.spawn[2])
      o.quaternion.identity()
    }
  }

  // Launch: park first so every throw starts from the same spot, then one impulse down the lane.
  // dir is machine-local (sin aim, 0, -cos aim) rotated into world by the origin group.
  const launch = (aim: number, power: number) => {
    const b = bodyRef.current
    const origin = originRef.current
    if (!b || !origin) return
    park()
    b.wakeUp()
    dir.set(Math.sin(aim), 0, -Math.cos(aim))
    origin.getWorldQuaternion(q)
    dir.applyQuaternion(q)
    const speed = MathUtils.lerp(SKEE.launch.min, SKEE.launch.max, power)
    b.applyImpulse(dir.multiplyScalar(speed * b.mass()), true)
  }

  // active true: a Round starts straight into 'aiming'. active false mid-Round: settle it now with
  // the current score so it is never lost, and bump lastRound so it cannot be paid twice.
  useEffect(() => {
    if (active) {
      state.current = startRound(state.current)
      park()
      return
    }
    const s = state.current
    if (s.round > lastRound.current) {
      lastRound.current = s.round
      onRoundEndRef.current(ticketsFor(s.score))
    }
    state.current = { ...initialSkeeState(), round: lastRound.current, result: s.result }
    senseRef.current.gutter = false
    park()
    Object.assign(pose.current, { phase: 'idle', aim: 0, power: 0, ballsLeft: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useFrame((three, dt) => {
    if (!active) return
    const now = three.clock.elapsedTime
    const prev = state.current
    const input = readInput()

    // read this frame's sense; only meaningful while rolling. Out of play = below the gutter, or
    // back on the flat lane moving toward the player (failed to crest the hump and rolled back).
    const stash = senseRef.current
    let sense: SkeeSense = NO_SENSE
    if (prev.phase === 'rolling') {
      let gutter = stash.gutter
      const b = bodyRef.current
      const origin = originRef.current
      if (b && origin) {
        const p = b.translation()
        origin.worldToLocal(v.set(p.x, p.y, p.z))
        if (v.y < SKEE.gutterY) gutter = true
        const w = b.linvel()
        origin.getWorldQuaternion(q)
        lv.set(w.x, w.y, w.z).applyQuaternion(q.invert())
        if (v.z > SKEE.ramp.zStart && lv.z > 0) gutter = true
      }
      sense = { inside: insideValue(stash.overlaps), gutter }
    }
    stash.gutter = false

    const next = stepSkee(prev, { ...input, ...sense }, dt)
    state.current = next

    if (next.launch) launch(next.aim, next.power)
    // ball settled: a miss parks it at once (it may be falling through the gutter); a score leaves
    // it sitting in its trough for the hit display, then it reloads when the next phase begins
    if (next.phase === 'hit' && prev.phase !== 'hit') {
      pose.current.hitT = now
      if (next.lastHit === 0) park()
    }
    if (prev.phase === 'hit' && next.phase !== 'hit') park()

    // Round end, exactly once per Round, when the result display has finished.
    if (next.result && next.phase === 'idle' && next.result.round !== lastRound.current) {
      lastRound.current = next.result.round
      onRoundEndRef.current(next.result.tickets)
    }

    const p = pose.current
    p.phase = next.phase
    p.aim = aimAngle(next)
    p.power = powerLevel(next)
    p.lastHit = next.lastHit
    p.score = next.score
    p.ballsLeft = next.ballsLeft
  })

  return <Indicators pose={pose} lampRoot={originRef} />
}

export function SkeeballMachine({ position, rotation, active, onRoundEnd }: MachineProps) {
  const originRef = useRef<Group>(null)
  const bodyRef = useRef<RapierRigidBody>(null)
  const senseRef = useRef<SkeeSensors>({ overlaps: new Map(), gutter: false })
  // Count overlapping sensors per value; a stray exit after a park must not go negative.
  const onTrough = useCallback((value: number, inside: boolean) => {
    const m = senseRef.current.overlaps
    m.set(value, Math.max(0, (m.get(value) ?? 0) + (inside ? 1 : -1)))
  }, [])
  const onGutter = useCallback(() => {
    senseRef.current.gutter = true
  }, [])

  return (
    <group ref={originRef} position={position} rotation={rotation}>
      <Physics timeStep={1 / 60} paused={!active}>
        <StaticParts onTrough={onTrough} onGutter={onGutter} />
        <Ball bodyRef={bodyRef} />
        <SkeeController active={active} onRoundEnd={onRoundEnd} originRef={originRef} bodyRef={bodyRef} senseRef={senseRef} />
      </Physics>
    </group>
  )
}
