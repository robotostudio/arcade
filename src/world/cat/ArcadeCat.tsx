'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { CatModel, type CatRig } from './CatModel'
import { Blaze, PeeStream, Puddle } from './fx'
import { between, createMischief } from './mischief'
import { CAT, FLANKS, HUB_CENTRE } from './tuning'

export type CatCabinet = { id: string; position: readonly [number, number, number]; rotation: number }

// One cabinet as the cat sees it: where to walk in from, where to stand, where the stream lands.
type Spot = {
  id: string
  approach: Vector3
  stand: Vector3
  heading: number // side-on to the flank, facing into the cabinet's depth
  legSide: 1 | -1 // which hind leg (cat's +x or -x) faces the flank
  hit: Vector3
  blaze: Vector3
  normal: Vector3
}

type Phase = 'wander' | 'pause' | 'approach' | 'stand' | 'settle' | 'lift' | 'pee' | 'lower' | 'leave'

function spotFor({ id, position: [px, , pz], rotation: r }: CatCabinet): Spot | null {
  const flank = FLANKS[id]
  if (!flank) return null
  const cos = Math.cos(r), sin = Math.sin(r)
  const toWorld = (lx: number, y: number, lz: number) => new Vector3(px + lx * cos + lz * sin, y, pz - lx * sin + lz * cos)
  const { halfWidth: hw, standZ } = flank
  // The flank nearer the middle of the Room, so the camera sees the deed.
  const s: 1 | -1 = Math.abs(toWorld(hw, 0, standZ).x) <= Math.abs(toWorld(-hw, 0, standZ).x) ? 1 : -1
  return {
    id,
    approach: toWorld(s * (hw + CAT.gap + .1), 0, standZ + CAT.approach),
    stand: toWorld(s * (hw + CAT.gap), 0, standZ),
    heading: r + Math.PI,
    legSide: s, // facing the cabinet's -z from the +s flank, the cabinet lies on the cat's +s side
    hit: toWorld(s * (hw - .05), CAT.hitY, standZ),
    blaze: toWorld(s * (hw + .12), 0, standZ),
    normal: new Vector3(s * cos, 0, -s * sin),
  }
}

function angleTo(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}

type Brain = {
  pos: Vector3
  heading: number
  goal: Vector3
  phase: Phase
  phaseT: number
  pauseFor: number
  target: number // spot index for the current trip
  douse: boolean // this trip puts a fire out
  hitDone: boolean
  burning: number // spot index on fire
  douseDue: number
  nextStrike: number
  stride: number
  speed: number
  moving: number
  lift: number
}

function go(b: Brain, phase: Phase) { b.phase = phase; b.phaseT = 0 }

// Walk toward b.goal; true on arrival. Speed eases off while the heading is still swinging round.
function walk(b: Brain, dt: number) {
  const dx = b.goal.x - b.pos.x, dz = b.goal.z - b.pos.z
  const dist = Math.hypot(dx, dz)
  if (dist < .04) return true
  const want = Math.atan2(dx, dz)
  b.heading += angleTo(b.heading, want) * (1 - Math.exp(-CAT.turnRate * dt))
  const align = MathUtils.clamp(Math.cos(angleTo(b.heading, want)), .15, 1)
  const step = Math.min(dist, CAT.walkSpeed * align * dt)
  b.pos.x += dx / dist * step
  b.pos.z += dz / dist * step
  b.speed = step / dt
  return false
}

function pickWander(b: Brain) {
  const a = MathUtils.degToRad((Math.random() * 2 - 1) * CAT.wander.arc)
  const r = between(CAT.wander.radius)
  b.goal.set(HUB_CENTRE[0] + Math.sin(a) * r, 0, HUB_CENTRE[1] - Math.cos(a) * r)
}

function startTrip(b: Brain, spots: Spot[], index: number, douse: boolean) {
  b.target = index
  b.douse = douse
  b.hitDone = false
  b.goal.copy(spots[index].approach)
  go(b, 'approach')
}

// A due douse trip beats a new strike; a strike never picks the cabinet being played.
function wantsTrip(b: Brain, spots: Spot[], t: number, busy: string | null) {
  if (b.burning >= 0 && t >= b.douseDue) { startTrip(b, spots, b.burning, true); return true }
  if (b.burning >= 0 || t < b.nextStrike) return false
  let free = 0
  for (const spot of spots) if (spot.id !== busy) free++
  if (!free) return false
  let pick = Math.floor(Math.random() * free)
  for (let i = 0; i < spots.length; i++) {
    if (spots[i].id === busy) continue
    if (pick-- === 0) { startTrip(b, spots, i, false); return true }
  }
  return false
}

// A ginger cat that wanders the hub and, every so often, pees on a cabinet. The cabinet shorts out
// (sparks, smoke, fire); a few seconds later the cat comes back and pees the fire out.
export function ArcadeCat({ cabinets, busy = null }: { cabinets: CatCabinet[]; busy?: string | null }) {
  const spots = useMemo(() => cabinets.map(spotFor).filter((s): s is Spot => !!s), [cabinets])
  const mischief = useMemo(createMischief, [])
  const rig = useRef<CatRig>(null)
  const busyRef = useRef(busy)
  busyRef.current = busy

  const brain = useRef<Brain>({
    pos: new Vector3(HUB_CENTRE[0], 0, HUB_CENTRE[1] - 1.8),
    heading: Math.PI,
    goal: new Vector3(HUB_CENTRE[0], 0, HUB_CENTRE[1] - 1.8),
    phase: 'pause',
    phaseT: 0,
    pauseFor: 1,
    target: -1, // spot index for the current trip
    douse: false, // this trip puts a fire out
    hitDone: false,
    burning: -1, // spot index on fire
    douseDue: Infinity,
    nextStrike: CAT.firstStrike,
    stride: 0,
    speed: 0,
    moving: 0,
    lift: 0,
  })

  useFrame((_, delta) => {
    const cat = rig.current
    if (!cat || spots.length === 0) return
    const dt = Math.min(delta, .1)
    const b = brain.current
    const m = mischief
    m.clock += dt
    const t = m.clock
    b.phaseT += dt
    b.speed = 0

    const spot = b.target >= 0 ? spots[b.target] : null
    switch (b.phase) {
      case 'pause':
        if (wantsTrip(b, spots, t, busyRef.current)) break
        if (b.phaseT > b.pauseFor) { pickWander(b); go(b, 'wander') }
        break
      case 'wander':
        if (wantsTrip(b, spots, t, busyRef.current)) break
        if (walk(b, dt)) { b.pauseFor = between(CAT.pause); go(b, 'pause') }
        break
      case 'approach':
        if (walk(b, dt)) { b.goal.copy(spot!.stand); go(b, 'stand') }
        break
      case 'stand':
        if (walk(b, dt)) go(b, 'settle')
        break
      case 'settle':
        b.heading += angleTo(b.heading, spot!.heading) * (1 - Math.exp(-10 * dt))
        if (b.phaseT > CAT.settleTime) go(b, 'lift')
        break
      case 'lift':
        if (b.phaseT > CAT.liftTime) {
          go(b, 'pee')
          m.puddleAt.copy(spot!.blaze)
          m.puddleGrow = true
        }
        break
      case 'pee':
        m.peeing = true
        if (!b.hitDone && b.phaseT > CAT.peeTime * CAT.hitAt) {
          b.hitDone = true
          if (b.douse) {
            m.burning = false
            m.dousedAt = t
            b.burning = -1
            b.nextStrike = t + CAT.strikeEvery + (Math.random() * 2 - 1) * CAT.strikeJitter
          } else {
            m.burning = true
            m.ignitedAt = t
            m.blazeAt.copy(spot!.blaze)
            m.blazeNormal.copy(spot!.normal)
            b.burning = b.target
            b.douseDue = t + CAT.returnAfter
          }
        }
        if (b.phaseT > CAT.peeTime) { m.peeing = false; m.puddleGrow = false; go(b, 'lower') }
        break
      case 'lower':
        if (b.phaseT > CAT.lowerTime) { b.goal.copy(spot!.approach); go(b, 'leave') }
        break
      case 'leave':
        if (walk(b, dt)) { b.target = -1; pickWander(b); go(b, 'wander') }
        break
    }

    // Lift eases the hind leg up for the lift/pee phases and back down otherwise.
    const lifting = b.phase === 'lift' || b.phase === 'pee'
    b.lift = MathUtils.damp(b.lift, lifting ? 1 : 0, lifting ? 14 : 10, dt)
    b.moving = MathUtils.damp(b.moving, MathUtils.clamp(b.speed / CAT.walkSpeed, 0, 1), 10, dt)
    b.stride += b.speed * CAT.strideRate * dt

    // Pose.
    const side = spot?.legSide ?? 1
    cat.root.position.copy(b.pos)
    cat.root.rotation.y = b.heading
    cat.root.scale.setScalar(CAT.scale)
    const swing = Math.sin(b.stride) * .6 * b.moving
    cat.legs[0].rotation.x = swing
    cat.legs[3].rotation.x = swing
    cat.legs[1].rotation.x = -swing
    cat.legs[2].rotation.x = -swing
    const lifted = side > 0 ? 3 : 2
    const planted = side > 0 ? 2 : 3
    cat.legs[lifted].rotation.z = side * 1.3 * b.lift
    cat.legs[lifted].rotation.x += -.35 * b.lift
    cat.legs[planted].rotation.z = 0
    cat.body.position.y = Math.abs(Math.sin(b.stride)) * .025 * b.moving
    cat.body.rotation.z = side * .14 * b.lift
    cat.head.rotation.x = Math.sin(b.stride * 2) * .05 * b.moving
    cat.head.rotation.y = -side * .5 * b.lift // looks back over its shoulder, innocent
    cat.tail.rotation.x = .9 + .45 * b.lift
    cat.tail.rotation.y = Math.sin(t * 2.6) * .35 * (1 - b.lift)
    cat.tailTip.rotation.x = .6 - .4 * b.lift + Math.sin(t * 3.1) * .12

    // Stream from under the raised leg to the flank.
    if (m.peeing && spot) {
      const s = CAT.scale
      const sin = Math.sin(b.heading), cos = Math.cos(b.heading)
      const lx = side * .09 * s, lz = -.2 * s
      m.peeFrom.set(b.pos.x + lx * cos + lz * sin, .27 * s, b.pos.z - lx * sin + lz * cos)
      m.peeTo.copy(spot.hit)
    }
  })

  return (
    <group>
      <CatModel ref={rig} />
      <PeeStream mischief={mischief} />
      <Puddle mischief={mischief} />
      <Blaze mischief={mischief} />
    </group>
  )
}
