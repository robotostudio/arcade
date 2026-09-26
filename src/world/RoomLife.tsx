'use client'

import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils, Mesh, PointLight, Vector3 } from 'three'
import { Dust, Glow } from './look/Atmosphere'

type Station = { position: readonly [number, number, number]; rotation: number; group: RefObject<Group | null> }
const UP = new Vector3(0, 1, 0)
const PLANTS = [[-3.1, 0, 3.1], [5.2, 0, 4.1]] as const
const DUST_BOX: [[number, number], [number, number], [number, number]] = [[-7, 7], [.2, 2.8], [-2, 8]]
const smooth = (t: number) => { const s = MathUtils.clamp(t, 0, 1); return s * s * (3 - 2 * s) }

function Cat({ root, legs, tail }: { root: RefObject<Group | null>; legs: RefObject<Group | null>; tail: RefObject<Group | null> }) {
  return <group ref={root} position={[0, 0, 4]}>
    <mesh position={[0, .42, 0]} scale={[.32, .3, .65]}><icosahedronGeometry args={[1, 0]} /><meshLambertMaterial color="#d99d61" flatShading /></mesh>
    <mesh position={[0, .59, .48]} scale={[.3, .28, .27]}><icosahedronGeometry args={[1, 0]} /><meshLambertMaterial color="#efc68c" flatShading /></mesh>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * .19, .86, .46]} rotation={[0, 0, side * -.23]}><coneGeometry args={[.13, .27, 3]} /><meshLambertMaterial color="#d99d61" /></mesh>
      <mesh position={[side * .12, .65, .707]}><boxGeometry args={[.065, .08, .025]} /><meshBasicMaterial color="#b9efb2" /></mesh>
      <mesh position={[side * .12, .65, .724]}><boxGeometry args={[.022, .075, .015]} /><meshBasicMaterial color="#242044" /></mesh>
      {[0, 1].map(i => <mesh key={i} position={[side * .23, .53 + i * .045, .71]} rotation={[0, 0, side * (.1 + i * .15)]}><boxGeometry args={[.23, .014, .015]} /><meshLambertMaterial color="#fff0c9" /></mesh>)}
    </group>)}
    <mesh position={[0, .54, .745]}><boxGeometry args={[.07, .045, .03]} /><meshLambertMaterial color="#b86a85" /></mesh>
    <mesh position={[0, .37, .37]}><boxGeometry args={[.5, .06, .09]} /><meshLambertMaterial color="#6ee9db" /></mesh>
    <mesh position={[0, .31, .43]}><octahedronGeometry args={[.065]} /><meshBasicMaterial color="#ffe099" /></mesh>
    <group ref={legs}>
      {[-1, 1].flatMap(side => [-1, 1].map(end => <group key={`${side}-${end}`} position={[side * .2, .34, end * .32]}>
        <mesh position={[0, -.16, 0]}><boxGeometry args={[.13, .32, .15]} /><meshLambertMaterial color={end === 1 ? '#efc68c' : '#c48751'} /></mesh>
        <mesh position={[0, -.29, .045]}><boxGeometry args={[.17, .1, .23]} /><meshLambertMaterial color="#fff0c9" /></mesh>
      </group>))}
    </group>
    <group ref={tail} position={[0, .5, -.5]} rotation={[-.4, 0, 0]}>
      <mesh position={[0, .25, -.12]} rotation={[-.4, 0, 0]}><cylinderGeometry args={[.055, .09, .6, 5]} /><meshLambertMaterial color="#c48751" /></mesh>
      <mesh position={[0, .55, -.24]}><icosahedronGeometry args={[.08, 0]} /><meshLambertMaterial color="#fff0c9" /></mesh>
    </group>
    {[0, 1, 2].map(i => <mesh key={i} position={[0, .64, -.25 + i * .18]} rotation={[0, 0, .1]}><boxGeometry args={[.36, .045, .06]} /><meshLambertMaterial color="#926343" /></mesh>)}
    <mesh position={[0, .01, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[.5, .8, 1]}><circleGeometry args={[1, 12]} /><meshBasicMaterial color="#16142b" transparent opacity={.4} depthWrite={false} /></mesh>
  </group>
}

function Plant({ index, foliage }: { index: number; foliage: RefObject<Group | null> }) {
  return <group position={[...PLANTS[index]]}>
    <mesh position={[0, .24, 0]}><cylinderGeometry args={[.4, .29, .48, 6]} /><meshLambertMaterial color={index ? '#c178a0' : '#6c9ba8'} /></mesh>
    <mesh position={[0, .48, 0]}><cylinderGeometry args={[.42, .42, .1, 6]} /><meshLambertMaterial color="#ffe099" /></mesh>
    <mesh position={[0, .53, 0]}><cylinderGeometry args={[.35, .35, .025, 6]} /><meshLambertMaterial color="#393044" /></mesh>
    <group ref={foliage} position={[0, .54, 0]}>
      <mesh position={[0, .34, 0]}><cylinderGeometry args={[.035, .05, .7, 5]} /><meshLambertMaterial color="#668757" /></mesh>
      {Array.from({ length: 7 }, (_, i) => <group key={i} rotation={[0, i * 2.4, 0]} position={[0, .15 + i * .075, 0]}>
        <mesh position={[.2, .12, 0]} rotation={[0, 0, -.75]} scale={[.14, .4, .07]}><octahedronGeometry args={[1]} /><meshLambertMaterial color={i % 2 ? '#a5c887' : '#6fa992'} flatShading /></mesh>
      </group>)}
    </group>
  </group>
}

// One clock for the gag: walk, water cabinet, short circuit, fire, return to put it out,
// then water a plant. Pauses outside the hub, so a round is never obscured or interrupted.
export function RoomLife({ enabled, stations, onBlackout }: { enabled: boolean; stations: Station[]; onBlackout: (value: boolean) => void }) {
  const cat = useRef<Group>(null)
  const legs = useRef<Group>(null)
  const tail = useRef<Group>(null)
  const jet = useRef<Group>(null)
  const puddle = useRef<Mesh>(null)
  const fire = useRef<Group>(null)
  const smoke = useRef<Group>(null)
  const sparks = useRef<Group>(null)
  const lamp = useRef<PointLight>(null)
  const plantA = useRef<Group>(null)
  const plantB = useRef<Group>(null)
  const clock = useRef(0)
  const blackout = useRef(false)
  const reduced = useRef(false)
  const growth = useRef([1, 1])
  const lastWater = useRef(-1)
  const previous = useRef(new Vector3(0, 0, 4))
  const vectors = useMemo(() => ({ approach: new Vector3(), hit: new Vector3(), plant: new Vector3(), start: new Vector3(), wander: new Vector3(), goal: new Vector3(), source: new Vector3(), direction: new Vector3(), step: new Vector3(), base: new Vector3(), plantApproach: new Vector3() }), [])
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reduced.current = query.matches }
    update(); query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => () => { onBlackout(false); stations.forEach(s => s.group.current?.position.set(0, 0, 0)) }, [onBlackout, stations])

  useFrame((state, delta) => {
    const dt = Math.min(delta, .05)
    if (enabled) clock.current += dt
    const t = clock.current % 28
    const cycle = Math.floor(clock.current / 28)
    const station = stations[(cycle * 3) % stations.length]
    const plantIndex = cycle % 2
    const { approach, hit, plant, start, wander, goal, source, direction, step, base, plantApproach } = vectors
    // Approach along the open carpet, beside the cabinet rather than through its collider.
    const front = (cycle * 3) % stations.length === 2 ? 2.5 : 1.15
    base.fromArray(station.position)
    approach.set(1.65, 0, front).applyAxisAngle(UP, station.rotation).add(base)
    hit.set(.86, .3, front - .32).applyAxisAngle(UP, station.rotation).add(base)
    plant.fromArray(PLANTS[plantIndex])
    plantApproach.copy(plant); plantApproach.x += 1; plantApproach.z += .32
    if (!cycle) start.set(0, 0, 4)
    else { start.fromArray(PLANTS[(cycle - 1) % 2]); start.x += 1; start.z += .32 }
    wander.set(approach.x * .55, 0, 3.4)
    if (t < 8) {
      // A carpet waypoint gives the cat a gentle detour around the other machines.
      if (t < 4) goal.copy(start).lerp(wander, smooth(t / 4))
      else goal.copy(wander).lerp(approach, smooth((t - 4) / 4))
    } else if (t < 10) goal.copy(approach)
    else if (t < 14) goal.copy(approach).lerp(wander, smooth((t - 10) / 4))
    else if (t < 18) goal.copy(wander).lerp(approach, smooth((t - 14) / 4))
    else if (t < 20) goal.copy(approach)
    else if (t < 26) {
      if (t < 23) goal.copy(approach).lerp(wander, smooth((t - 20) / 3))
      else goal.copy(wander).lerp(plantApproach, smooth((t - 23) / 3))
    } else goal.copy(plantApproach)
    const watering = enabled && ((t >= 8 && t < 10) || (t >= 18 && t < 20) || t >= 26)
    const walking = enabled && !watering && step.copy(goal).sub(previous.current).lengthSq() > .000001
    if (cat.current) {
      if (walking) cat.current.rotation.y = MathUtils.damp(cat.current.rotation.y, Math.atan2(step.x, step.z), 10, dt)
      if (watering) cat.current.rotation.y = t >= 26 ? 0 : station.rotation
      cat.current.position.copy(goal)
      cat.current.position.y = walking && !reduced.current ? Math.abs(Math.sin(clock.current * 12)) * .04 : 0
      cat.current.updateMatrixWorld(true)
    }
    previous.current.copy(goal)
    legs.current?.children.forEach((leg, i) => {
      leg.rotation.x = walking && !reduced.current ? Math.sin(clock.current * 12 + (i === 0 || i === 3 ? 0 : Math.PI)) * .4 : 0
      leg.rotation.z = watering && i === 0 ? -1.25 : 0
    })
    if (tail.current) tail.current.rotation.z = Math.sin(clock.current * 2.5) * (reduced.current ? .04 : .25)
    if (jet.current && cat.current) {
      jet.current.visible = watering
      source.set(-.27, .37, -.32).applyMatrix4(cat.current.matrixWorld)
      direction.copy(t >= 26 ? plant : hit).sub(source)
      jet.current.position.copy(source).addScaledVector(direction, .5)
      jet.current.quaternion.setFromUnitVectors(UP, direction.normalize())
      jet.current.scale.set(1 + Math.sin(clock.current * 29) * .15, source.distanceTo(t >= 26 ? plant : hit), 1)
    }
    if (puddle.current) {
      puddle.current.visible = enabled && t >= 8 && t < 26
      puddle.current.position.set(hit.x, .014, hit.z)
      puddle.current.scale.setScalar(Math.min(.5, .16 + Math.max(0, t - 8) * .035))
    }
    const fault = enabled && t >= 10 && t < 11
    const dark = fault && !reduced.current
    if (dark !== blackout.current) { blackout.current = dark; onBlackout(dark) }
    stations.forEach(s => s.group.current?.position.set(0, 0, 0))
    if (fault && !reduced.current && station.group.current) station.group.current.position.set(Math.sin(t * 90) * .045, 0, Math.cos(t * 73) * .035)
    const flame = enabled && t >= 12 && t < 20 ? (t < 18 ? 1 : 1 - smooth((t - 18) / 2)) : 0
    if (fire.current) {
      fire.current.visible = flame > 0
      fire.current.position.copy(hit).setY(.08)
      fire.current.scale.setScalar(flame)
      fire.current.children.forEach((child, i) => { if (child instanceof Mesh) child.scale.y = 1 + Math.sin(clock.current * 9 + i * 2) * .24 })
    }
    if (lamp.current) { lamp.current.position.copy(hit).setY(.65); lamp.current.intensity = flame * (3 + Math.sin(clock.current * 11)) + (fault ? 5 : 0); lamp.current.color.set(fault ? '#a1eaff' : '#ffad45') }
    if (sparks.current) {
      sparks.current.visible = enabled && t >= 9.7 && t < 11.6
      sparks.current.position.copy(hit)
      sparks.current.children.forEach((child, i) => {
        const age = (clock.current * 2 + i / 12) % 1
        child.position.set(Math.sin(i * 4.7) * age * .8, age * .8 - age * age * .45, Math.cos(i * 4.7) * age * .8)
        child.scale.setScalar((1 - age) * (reduced.current ? .4 : 1))
      })
    }
    if (smoke.current) {
      smoke.current.visible = enabled && t >= 11 && t < 21
      smoke.current.position.copy(hit)
      smoke.current.children.forEach((child, i) => {
        const rise = (clock.current * .5 + i * .25) % 1
        child.position.set(Math.sin(clock.current + i) * rise * .25, rise * 1.6, 0)
        child.scale.setScalar(.15 + rise * .4)
      })
    }
    if (enabled && t >= 26 && lastWater.current !== cycle) { lastWater.current = cycle; growth.current[plantIndex] = Math.min(2, growth.current[plantIndex] + .25) }
    ;[plantA, plantB].forEach((ref, i) => {
      if (!ref.current) return
      const g = MathUtils.damp(ref.current.scale.x, growth.current[i], 2, dt)
      const bounce = reduced.current ? 1 : 1 + Math.sin(state.clock.elapsedTime * 2 + i) * .035
      ref.current.scale.set(g, g * bounce, g)
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.3 + i * 2) * (reduced.current ? .015 : .075)
    })
  })

  return <group>
    <Cat root={cat} legs={legs} tail={tail} />
    <Plant index={0} foliage={plantA} /><Plant index={1} foliage={plantB} />
    <group ref={jet} visible={false}>
      <mesh><cylinderGeometry args={[.022, .035, 1, 5]} /><meshBasicMaterial color="#ffe34f" transparent opacity={.85} /></mesh>
      {[-.32, 0, .32].map(y => <mesh key={y} position={[0, y, 0]}><icosahedronGeometry args={[.045, 0]} /><meshBasicMaterial color="#fff299" /></mesh>)}
    </group>
    <mesh ref={puddle} visible={false} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1, 12]} /><meshBasicMaterial color="#d9b735" transparent opacity={.38} depthWrite={false} /></mesh>
    <group ref={fire} visible={false}>
      {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[Math.sin(i * 2.4) * .14, .22 + (i % 2) * .08, Math.cos(i * 2.4) * .14]}><coneGeometry args={[.13, .5 + (i % 3) * .1, 5]} /><meshBasicMaterial color={i % 2 ? '#ffe099' : '#ff803d'} /></mesh>)}
    </group>
    <pointLight ref={lamp} intensity={0} distance={3} />
    <group ref={sparks} visible={false}>
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} rotation={[i, i * 2, i * .4]}><boxGeometry args={[.025, .14, .025]} /><meshBasicMaterial color={i % 2 ? '#c9f8ff' : '#ffe099'} /></mesh>)}
    </group>
    <group ref={smoke} visible={false}>
      {[0, 1, 2, 3].map(i => <mesh key={i}><icosahedronGeometry args={[1, 0]} /><meshLambertMaterial color="#9993ad" transparent opacity={.18} depthWrite={false} /></mesh>)}
    </group>
    <Dust count={100} box={DUST_BOX} size={.045} opacity={.3} color="#b5a6bc" />
    <Glow kind="spot" at={[-3, 1.4, -2]} size={[4, 1.1]} color="#9687a6" intensity={.045} pulse={.3} />
    <Glow kind="spot" at={[4, 1.1, -1]} size={[3.5, .9]} color="#9687a6" intensity={.04} pulse={.25} />
  </group>
}
