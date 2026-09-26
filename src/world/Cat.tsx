'use client'

// The arcade cat: a blocky low-poly stray that roams the hub floor. Every ~10 s it picks a
// cabinet, raises a hind leg and pees on it, which shorts it out: smoke, sparks and fire. Five
// seconds later it comes back and pees on it again, which puts the fire out. Pure useFrame, no
// React state; the phases are a tiny state machine in a ref.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type Group, MathUtils, MeshBasicMaterial, MeshLambertMaterial, type Mesh, type PointLight, Vector3 } from 'three'
import { psxify } from './look/psx-material'

export type CatTarget = { at: readonly [number, number, number]; facing: number; halfDepth: number; zOffset: number }

const lambert = (color: string) => psxify(new MeshLambertMaterial({ color }))
const MAT = {
  fur: lambert('#f0902a'),
  stripe: lambert('#a8521a'),
  belly: lambert('#fbe3b8'),
  nose: lambert('#ff9fb3'),
  eye: new MeshBasicMaterial({ color: '#9dff6a' }),
  pupil: new MeshBasicMaterial({ color: '#171535' }),
  pee: new MeshBasicMaterial({ color: '#f7e35a' }),
  flame: [new MeshBasicMaterial({ color: '#ffe36a' }), new MeshBasicMaterial({ color: '#ff8b2a' }), new MeshBasicMaterial({ color: '#e8341c' })],
  smoke: new MeshBasicMaterial({ color: '#6f6f7c', transparent: true, opacity: .55 }),
  spark: [new MeshBasicMaterial({ color: '#b8f6ff' }), new MeshBasicMaterial({ color: '#ffffff' }), new MeshBasicMaterial({ color: '#68d9ff' })],
}

const ROAM = { x: [-3.2, 3.2], z: [-1, 3] } as const
const SPEED = 1.7
const PEE_TIME = 1.8
const IDLE_GAP = 10
const BURN_GAP = 5
const FLAMES = 9
const SMOKE = 7
const SPARKS = 16
const LEGS = [[.24, -.1], [.24, .1], [-.24, -.1], [-.24, .1]] as const // index 3 is the +z hind leg, the one that lifts

type Phase = 'roam' | 'approach' | 'pee'
type Sim = {
  phase: Phase; t: number; clock: number; nextPee: number
  target: number; goal: Vector3; pause: number; burning: boolean; smokeLeft: number
  rest: number // seconds of standing still, to swish the tail
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const UP = new Vector3(0, 1, 0)
const FRONT = new Vector3()
const RIGHT = new Vector3()
function spots(target: CatTarget) {
  FRONT.set(Math.sin(target.facing), 0, Math.cos(target.facing))
  RIGHT.copy(FRONT).applyAxisAngle(UP, -Math.PI / 2)
  const center = new Vector3(...target.at).addScaledVector(FRONT, target.zOffset)
  const stand = center.clone().addScaledVector(FRONT, target.halfDepth + .55).addScaledVector(RIGHT, .55)
  const fire = center.clone().addScaledVector(FRONT, target.halfDepth + .05).addScaledVector(RIGHT, .55)
  return { stand, fire }
}

export function Cat({ targets }: { targets: CatTarget[] }) {
  const root = useRef<Group>(null)
  const bob = useRef<Group>(null)
  const tail = useRef<Group>(null)
  const legs = useRef<(Group | null)[]>([])
  const stream = useRef<Group>(null)
  const drops = useRef<(Mesh | null)[]>([])
  const fire = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  const flames = useRef<(Mesh | null)[]>([])
  const smoke = useRef<Group>(null)
  const puffs = useRef<(Mesh | null)[]>([])
  const sparks = useRef<(Mesh | null)[]>([])
  const sparkVel = useMemo(() => Array.from({ length: SPARKS }, () => ({ v: new Vector3(), born: rand(-.6, 0) })), [])
  const sim = useRef<Sim>({ phase: 'roam', t: 0, clock: 0, nextPee: IDLE_GAP, target: 0, goal: new Vector3(rand(...ROAM.x), 0, rand(...ROAM.z)), pause: 0, burning: false, smokeLeft: 0, rest: 0 })
  const site = useRef(spots(targets[0]))
  const tmp = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, .1)
    const s = sim.current
    const cat = root.current
    if (!cat || !targets.length) return
    s.clock += dt
    s.t += dt

    // Where to and whether we're there.
    const goal = s.phase === 'roam' ? s.goal : site.current.stand
    tmp.copy(goal).sub(cat.position)
    tmp.y = 0
    const dist = tmp.length()
    let walking = false
    if (s.phase === 'pee') {
      cat.rotation.y = MathUtils.damp(cat.rotation.y, Math.atan2(site.current.fire.x - cat.position.x, site.current.fire.z - cat.position.z), 8, dt)
      if (s.t >= PEE_TIME) {
        s.burning = !s.burning
        if (s.burning) { s.nextPee = s.clock + BURN_GAP; s.smokeLeft = 0 }
        else { s.nextPee = s.clock + IDLE_GAP; s.smokeLeft = 1.6 }
        for (const sp of sparkVel) sp.born = s.clock + rand(0, .6)
        s.phase = 'roam'; s.t = 0; s.pause = .6
        s.goal.set(rand(...ROAM.x), 0, rand(...ROAM.z))
      }
    } else if (s.phase === 'roam' && s.clock >= s.nextPee) {
      if (!s.burning) s.target = Math.floor(Math.random() * targets.length)
      site.current = spots(targets[s.target])
      s.phase = 'approach'; s.t = 0
    } else if (dist < .08) {
      if (s.phase === 'approach') { s.phase = 'pee'; s.t = 0 }
      else if (s.pause > 0) s.pause -= dt
      else { s.goal.set(rand(...ROAM.x), 0, rand(...ROAM.z)); s.pause = rand(.4, 1.6) }
    } else {
      walking = true
      const step = Math.min(dist, SPEED * dt)
      tmp.normalize()
      cat.position.addScaledVector(tmp, step)
      const heading = Math.atan2(-tmp.z, tmp.x)
      let d = heading - cat.rotation.y
      d = Math.atan2(Math.sin(d), Math.cos(d))
      cat.rotation.y += d * Math.min(1, 10 * dt)
    }

    // Rig: legs trot, body bobs, tail swishes; the +z hind leg lifts to pee.
    s.rest = walking ? 0 : s.rest + dt
    const gait = s.clock * 11
    legs.current.forEach((leg, i) => {
      if (!leg) return
      const peeing = s.phase === 'pee' && i === 3
      const swing = walking ? Math.sin(gait + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * .55 : 0
      leg.rotation.z = MathUtils.damp(leg.rotation.z, swing, 20, dt)
      leg.rotation.x = MathUtils.damp(leg.rotation.x, peeing ? -1.25 : 0, 9, dt)
    })
    if (bob.current) bob.current.position.y = walking ? Math.abs(Math.sin(gait)) * .035 : 0
    if (tail.current) tail.current.rotation.y = Math.sin(s.clock * (walking ? 6 : 2.2)) * (walking ? .3 : .7)
    if (stream.current) {
      const on = s.phase === 'pee' && s.t > .35
      stream.current.visible = on
      if (on) {
        stream.current.position.copy(cat.position)
        drops.current.forEach((drop, i) => {
          if (!drop) return
          const f = ((s.t * 1.6 + i / drops.current.length) % 1)
          tmp.set(-.15, .3, .12).applyAxisAngle(UP, cat.rotation.y).add(cat.position)
          drop.position.lerpVectors(tmp, site.current.fire, f).sub(cat.position)
          drop.position.y += Math.sin(f * Math.PI) * .25
        })
      }
    }

    // The shorted cabinet: flames flicker and climb, sparks fly, smoke drifts up and lingers.
    const burn = s.burning
    if (fire.current) {
      fire.current.visible = burn
      fire.current.position.copy(site.current.fire)
      if (burn) {
        flames.current.forEach((flame, i) => {
          if (!flame) return
          const f = (s.clock * (1.4 + i * .13) + i * .37) % 1
          flame.position.set(Math.sin(s.clock * 9 + i * 2) * .12 + (i % 3 - 1) * .12, .15 + f * 1.1, Math.cos(s.clock * 7 + i) * .1)
          const sz = (1 - f) * (.28 + (i % 2) * .12)
          flame.scale.set(sz, sz * (1.4 + Math.sin(s.clock * 23 + i) * .4), sz)
        })
        if (light.current) light.current.intensity = 6 + Math.sin(s.clock * 31) * 2 + Math.sin(s.clock * 17.3) * 1.5
      }
    }
    sparks.current.forEach((spark, i) => {
      if (!spark) return
      const sp = sparkVel[i]
      const age = s.clock - sp.born
      const alive = age >= 0 && age < .55
      spark.visible = alive
      if (!alive) {
        if (age >= .55 && (burn || s.smokeLeft > 1.2)) {
          sp.born = s.clock + rand(0, burn ? .5 : .1)
          sp.v.set(rand(-1, 1), rand(1.5, 4), rand(-1, 1)).normalize().multiplyScalar(rand(2, 5))
        }
        return
      }
      spark.position.copy(site.current.fire).addScaledVector(sp.v, age)
      spark.position.y += .5 - 4.5 * age * age
      spark.rotation.set(age * 9, age * 7, 0)
    })
    if (smoke.current) {
      if (!burn && s.smokeLeft > 0) s.smokeLeft -= dt
      const on = burn || s.smokeLeft > 0
      smoke.current.visible = on
      smoke.current.position.copy(site.current.fire)
      if (on) puffs.current.forEach((puff, i) => {
        if (!puff) return
        const f = (s.clock * .45 + i / SMOKE) % 1
        puff.position.set(Math.sin(s.clock * .8 + i * 2.1) * .25 + (i % 3 - 1) * .15, .9 + f * 2.2, Math.cos(s.clock * .7 + i) * .2)
        const sz = .12 + f * .45
        puff.scale.setScalar(sz)
      })
    }
  })

  return (
    <>
      <group ref={root} position={[1.5, 0, 1.5]} scale={.75}>
        <group ref={bob}>
          <mesh position={[0, .42, 0]} material={MAT.fur}><boxGeometry args={[.7, .32, .3]} /></mesh>
          <mesh position={[0, .32, 0]} material={MAT.belly}><boxGeometry args={[.5, .14, .32]} /></mesh>
          {[-.2, 0, .2].map((x) => <mesh key={x} position={[x, .5, 0]} material={MAT.stripe}><boxGeometry args={[.07, .18, .32]} /></mesh>)}
          <group position={[.42, .6, 0]}>
            <mesh material={MAT.fur}><boxGeometry args={[.3, .28, .3]} /></mesh>
            <mesh position={[.16, -.05, 0]} material={MAT.belly}><boxGeometry args={[.04, .1, .14]} /></mesh>
            <mesh position={[.17, 0, 0]} material={MAT.nose}><boxGeometry args={[.03, .04, .05]} /></mesh>
            {[-.09, .09].map((z) => <group key={z}>
              <mesh position={[.15, .05, z]} material={MAT.eye}><boxGeometry args={[.02, .07, .07]} /></mesh>
              <mesh position={[.16, .05, z]} material={MAT.pupil}><boxGeometry args={[.02, .07, .025]} /></mesh>
              <mesh position={[.02, .19, z]} rotation={[0, 0, .2]} material={MAT.stripe}><coneGeometry args={[.06, .14, 4]} /></mesh>
            </group>)}
          </group>
          <group ref={tail} position={[-.35, .5, 0]}>
            <mesh position={[-.16, .06, 0]} rotation={[0, 0, .5]} material={MAT.stripe}><boxGeometry args={[.36, .07, .07]} /></mesh>
          </group>
          {LEGS.map(([x, z], i) => <group key={i} ref={(el) => { legs.current[i] = el }} position={[x, .3, z]}>
            <mesh position={[0, -.15, 0]} material={i % 2 ? MAT.fur : MAT.stripe}><boxGeometry args={[.11, .3, .11]} /></mesh>
            <mesh position={[.02, -.3, 0]} material={MAT.belly}><boxGeometry args={[.14, .05, .12]} /></mesh>
          </group>)}
        </group>
      </group>
      <group ref={stream} visible={false}>
        {Array.from({ length: 10 }, (_, i) => <mesh key={i} ref={(el) => { drops.current[i] = el }} material={MAT.pee}><boxGeometry args={[.04, .04, .04]} /></mesh>)}
      </group>
      <group ref={fire} visible={false}>
        <pointLight ref={light} position={[0, .7, .3]} color="#ff8a2a" intensity={6} distance={5} />
        {Array.from({ length: FLAMES }, (_, i) => <mesh key={i} ref={(el) => { flames.current[i] = el }} material={MAT.flame[i % 3]}><boxGeometry args={[1, 1, 1]} /></mesh>)}
      </group>
      <group ref={smoke} visible={false}>
        {Array.from({ length: SMOKE }, (_, i) => <mesh key={i} ref={(el) => { puffs.current[i] = el }} material={MAT.smoke}><sphereGeometry args={[1, 5, 4]} /></mesh>)}
      </group>
      {Array.from({ length: SPARKS }, (_, i) => <mesh key={i} ref={(el) => { sparks.current[i] = el }} visible={false} material={MAT.spark[i % 3]}><boxGeometry args={[.03, .03, .16]} /></mesh>)}
    </>
  )
}
