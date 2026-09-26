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
import { Ball } from './Ball'
import { Indicators, type SkeePose } from './Indicators'

// Skeeball Machine (issue 05). Structure mirrors ClawMachine: a root group at `position`, its own
// <Physics> paused when inactive, static parts memoised, and a controller that steps the pure
// state machine in useFrame, drives the one ball body, and writes a pose ref for the Indicators.
//
// Sense plumbing: the Lane's sensors call onLand/onGutter (physics callbacks, any time), which only
// stash into `senseRef`. The controller consumes and clears the stash once per frame and feeds it
// to stepSkee, which ignores it outside 'rolling', so a resting or parked ball can never rescore.

const ZERO = { x: 0, y: 0, z: 0 }
const NO_SENSE: SkeeSense = { landed: null, gutter: false }

const StaticParts = memo(function StaticParts({
  onLand,
  onGutter,
}: {
  onLand: (value: number) => void
  onGutter: () => void
}) {
  return (
    <>
      <Cabinet />
      <Lane onLand={onLand} onGutter={onGutter} />
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
  senseRef: React.RefObject<SkeeSense>
}) {
  const readInput = useSkeeballInput(active)
  const state = useRef<SkeeState>(initialSkeeState())
  const pose = useRef<SkeePose>({ phase: 'idle', aim: 0, power: 0, lastHit: null, score: 0, ballsLeft: 0, hitT: -1e9 })
  const lastRound = useRef(0)
  const onRoundEndRef = useRef(onRoundEnd)
  onRoundEndRef.current = onRoundEnd
  const v = useMemo(() => new Vector3(), [])
  const dir = useMemo(() => new Vector3(), [])
  const q = useMemo(() => new Quaternion(), [])

  // Teleport the ball to the spawn (world space) and stop it dead.
  const park = () => {
    const b = bodyRef.current
    const origin = originRef.current
    if (!b || !origin) return
    v.set(SKEE.ball.spawn[0], SKEE.ball.spawn[1], SKEE.ball.spawn[2])
    origin.localToWorld(v)
    b.setTranslation(v, true)
    b.setLinvel(ZERO, true)
    b.setAngvel(ZERO, true)
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
    senseRef.current.landed = null
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

    // consume this frame's sense once; only meaningful while rolling
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
      }
      sense = { landed: stash.landed, gutter }
    }
    stash.landed = null
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
  const senseRef = useRef<SkeeSense>({ landed: null, gutter: false })
  // Sensors may fire more than once in a frame (a bounce clips two troughs); keep the best value.
  const onLand = useCallback((value: number) => {
    const s = senseRef.current
    s.landed = s.landed === null ? value : Math.max(s.landed, value)
  }, [])
  const onGutter = useCallback(() => {
    senseRef.current.gutter = true
  }, [])

  return (
    <group ref={originRef} position={position} rotation={rotation}>
      <Physics timeStep={1 / 60} paused={!active}>
        <StaticParts onLand={onLand} onGutter={onGutter} />
        <Ball bodyRef={bodyRef} />
        <SkeeController active={active} onRoundEnd={onRoundEnd} originRef={originRef} bodyRef={bodyRef} senseRef={senseRef} />
      </Physics>
    </group>
  )
}
