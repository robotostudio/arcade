'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type InstancedMesh, type Material, MathUtils, type Mesh, Object3D, type PointLight, Vector3 } from 'three'
import { unlitMaterial } from '../livery'
import { between, type Mischief, noRaycast, rand } from './mischief'
import { CAT, FX } from './tuning'

// The cat's effects: the stream, the puddle, and the blaze on the cabinet (fire, smoke, sparks,
// electric arcs, a flickering light, steam when it is put out). Every particle is an instanced
// unlit box so the bloom lifts the hot ones; nothing allocates per frame.
const dummy = new Object3D()
const scratch = new Color()
const tmp = new Vector3()
const tangent = new Vector3()

const PEE = unlitMaterial('#ffe23a')
const PUDDLE = unlitMaterial('#e2cc34', { transparent: true, opacity: .7, depthWrite: false })
const HOT = unlitMaterial('#ffffff') // tinted per instance
const SMOKE = unlitMaterial('#3a3444', { transparent: true, opacity: .75, depthWrite: false })
const STEAM = unlitMaterial('#e4ecf4', { transparent: true, opacity: .6, depthWrite: false })
const ZAP = unlitMaterial('#a6ecff')

const FLAME_YELLOW = new Color('#fff27a')
const FLAME_ORANGE = new Color('#ff7a1a')
const FLAME_RED = new Color('#d42a12')
const SPARK_WHITE = new Color('#fff8c4')
const SPARK_BLUE = new Color('#9fefff')

const frac = (v: number) => v - Math.floor(v)

function hideAll(mesh: InstancedMesh) {
  dummy.position.set(0, -10, 0)
  dummy.scale.setScalar(0)
  dummy.updateMatrix()
  for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, dummy.matrix)
  mesh.instanceMatrix.needsUpdate = true
}

function put(mesh: InstancedMesh, i: number, x: number, y: number, z: number, s: number, ry = 0) {
  dummy.position.set(x, y, z)
  dummy.rotation.set(0, ry, 0)
  dummy.scale.setScalar(Math.max(s, 0))
  dummy.updateMatrix()
  mesh.setMatrixAt(i, dummy.matrix)
}

function Particles({ count, material, meshRef, colored = false }: {
  count: number; material: Material; meshRef: React.RefObject<InstancedMesh | null>; colored?: boolean
}) {
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    hideAll(mesh)
    if (colored) {
      for (let i = 0; i < count; i++) mesh.setColorAt(i, FLAME_YELLOW)
      mesh.instanceColor!.needsUpdate = true
    }
  }, [meshRef, count, colored])
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} material={material} frustumCulled={false} raycast={noRaycast}>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  )
}

const DROPS = 18
export function PeeStream({ mischief: m }: { mischief: Mischief }) {
  const mesh = useRef<InstancedMesh>(null)
  useFrame(() => {
    const drops = mesh.current
    if (!drops) return
    drops.visible = m.peeing
    if (!m.peeing) return
    const { peeFrom: a, peeTo: b } = m
    for (let i = 0; i < DROPS; i++) {
      const u = frac(m.clock * 2.4 + i / DROPS)
      const lift = 4 * u * (1 - u) * CAT.arc
      put(drops, i, MathUtils.lerp(a.x, b.x, u), MathUtils.lerp(a.y, b.y, u) + lift, MathUtils.lerp(a.z, b.z, u), .035 * CAT.scale * (1 - u * .3), i)
    }
    drops.instanceMatrix.needsUpdate = true
  })
  return <Particles count={DROPS} material={PEE} meshRef={mesh} />
}

export function Puddle({ mischief: m }: { mischief: Mischief }) {
  const mesh = useRef<Mesh>(null)
  const size = useRef(0)
  useFrame((_, delta) => {
    const puddle = mesh.current
    if (!puddle) return
    const dt = Math.min(delta, .1)
    size.current = MathUtils.clamp(size.current + (m.puddleGrow ? dt / CAT.peeTime : -dt / FX.puddleEvaporate), 0, 1)
    puddle.visible = size.current > .02
    // Bottom sits 4 cm over the carpet layers so the vertex snap cannot make them fight.
    puddle.position.set(m.puddleAt.x, .05, m.puddleAt.z)
    puddle.scale.set(size.current, 1, size.current)
  })
  return (
    <mesh ref={mesh} material={PUDDLE} raycast={noRaycast} visible={false}>
      <cylinderGeometry args={[.3, .3, .012, 7]} />
    </mesh>
  )
}

const FLAMES = 12
const SMOKES = 10
const SPARKS = 20
const ZAPS = 4
const PUFFS = 10

type Sparks = { sparkPos: Float32Array; sparkVel: Float32Array; sparkLife: Float32Array }

// Wake up to k dead sparks at the flank, flung outward (tangent must be set for this normal).
function spawnSparks(s: Sparks, sp: InstancedMesh, base: Vector3, n: Vector3, k: number, speed: number) {
  for (let i = 0; i < SPARKS && k > 0; i++) {
    if (s.sparkLife[i] > 0) continue
    k--
    s.sparkLife[i] = rand(.35, .8)
    const side = (Math.random() * 2 - 1) * .2
    s.sparkPos[i * 3] = base.x + n.x * .05 + tangent.x * side
    s.sparkPos[i * 3 + 1] = rand(.2, .7)
    s.sparkPos[i * 3 + 2] = base.z + n.z * .05 + tangent.z * side
    const out = rand(.6, 1.8) * speed, across = (Math.random() * 2 - 1) * 1.2 * speed
    s.sparkVel[i * 3] = n.x * out + tangent.x * across
    s.sparkVel[i * 3 + 1] = rand(.6, 2.6) * speed
    s.sparkVel[i * 3 + 2] = n.z * out + tangent.z * across
    sp.setColorAt(i, Math.random() < .5 ? SPARK_WHITE : SPARK_BLUE)
    sp.instanceColor!.needsUpdate = true
  }
}

export function Blaze({ mischief: m }: { mischief: Mischief }) {
  const fire = useRef<InstancedMesh>(null)
  const smoke = useRef<InstancedMesh>(null)
  const sparks = useRef<InstancedMesh>(null)
  const zaps = useRef<InstancedMesh>(null)
  const steam = useRef<InstancedMesh>(null)
  const light = useRef<PointLight>(null)

  const s = useMemo(() => ({
    fire: 0,
    smoke: 0,
    flame: Array.from({ length: FLAMES }, () => ({ ox: Math.random() * 2 - 1, oz: Math.random(), rate: rand(1.3, 2.3), phase: Math.random() })),
    sparkPos: new Float32Array(SPARKS * 3),
    sparkVel: new Float32Array(SPARKS * 3),
    sparkLife: new Float32Array(SPARKS),
    nextSpark: 0,
    nextZap: 0,
    zapUntil: -1,
    chain: Array.from({ length: ZAPS + 1 }, () => new Vector3()),
    seenIgnite: -Infinity,
    seenDouse: -Infinity,
    steamStart: -Infinity,
    puff: Array.from({ length: PUFFS }, () => ({ ox: Math.random() * 2 - 1, delay: Math.random() * .35 })),
  }), [])

  useFrame((_, delta) => {
    const f = fire.current, sm = smoke.current, sp = sparks.current, zp = zaps.current, st = steam.current, pl = light.current
    if (!f || !sm || !sp || !zp || !st || !pl) return
    const dt = Math.min(delta, .1)
    const t = m.clock
    const base = m.blazeAt
    const n = m.blazeNormal
    tangent.set(-n.z, 0, n.x)

    s.fire = MathUtils.damp(s.fire, m.burning ? 1 : 0, m.burning ? FX.fireUp : FX.fireDown, dt)
    s.smoke = MathUtils.damp(s.smoke, m.burning ? 1 : 0, m.burning ? 1.5 : FX.smokeDown, dt)

    // The short: a big burst of sparks the moment the stream lands.
    if (m.ignitedAt !== s.seenIgnite) {
      s.seenIgnite = m.ignitedAt
      spawnSparks(s, sp, base, n, SPARKS, 1.3)
      s.nextSpark = t + between(FX.sparkEvery)
      s.nextZap = t + .1
    }
    if (m.dousedAt !== s.seenDouse) {
      s.seenDouse = m.dousedAt
      s.steamStart = t
    }

    // Fire: flames rise from the floor against the flank, yellow to red, shrinking as they go.
    f.visible = s.fire > .01
    if (f.visible) {
      for (let i = 0; i < FLAMES; i++) {
        const p = s.flame[i]
        const u = frac(t * p.rate + p.phase)
        const spread = .2 * (1 - u * .6)
        const x = base.x + tangent.x * p.ox * spread + n.x * p.oz * .1
        const z = base.z + tangent.z * p.ox * spread + n.z * p.oz * .1
        const flick = .85 + .15 * Math.sin(t * 31 + i * 1.7)
        put(f, i, x, .05 + u * FX.fireRise * s.fire, z, (.2 * (1 - u) + .04) * s.fire * flick, t * 2 + i)
        if (u < .5) scratch.copy(FLAME_YELLOW).lerp(FLAME_ORANGE, u * 2)
        else scratch.copy(FLAME_ORANGE).lerp(FLAME_RED, (u - .5) * 2)
        f.setColorAt(i, scratch)
      }
      f.instanceMatrix.needsUpdate = true
      f.instanceColor!.needsUpdate = true
    }

    // Smoke: dark cubes rolling up off the top of the fire, lingering after it goes out.
    sm.visible = s.smoke > .01
    if (sm.visible) {
      for (let i = 0; i < SMOKES; i++) {
        const u = frac(t * .42 + i / SMOKES)
        const sway = Math.sin(t * 1.3 + i * 2.1) * .12
        const x = base.x + n.x * (.05 + u * .35) + tangent.x * sway
        const z = base.z + n.z * (.05 + u * .35) + tangent.z * sway
        put(sm, i, x, .45 + u * 1.7, z, (.12 + u * .34) * s.smoke * Math.min(1, (1 - u) * 4, u * 8), t * .6 + i)
      }
      sm.instanceMatrix.needsUpdate = true
    }

    // Sparks: bursts while it burns, falling with gravity and skittering on the carpet.
    if (m.burning && s.fire > .2 && t > s.nextSpark) {
      spawnSparks(s, sp, base, n, Math.floor(rand(4, 8)), 1)
      s.nextSpark = t + between(FX.sparkEvery)
    }
    for (let i = 0; i < SPARKS; i++) {
      if (s.sparkLife[i] <= 0) { put(sp, i, 0, -10, 0, 0); continue }
      s.sparkLife[i] -= dt
      const j = i * 3
      s.sparkVel[j + 1] -= 7 * dt
      s.sparkPos[j] += s.sparkVel[j] * dt
      s.sparkPos[j + 1] += s.sparkVel[j + 1] * dt
      s.sparkPos[j + 2] += s.sparkVel[j + 2] * dt
      if (s.sparkPos[j + 1] < .04) {
        s.sparkPos[j + 1] = .04
        s.sparkVel[j + 1] *= -.35
        s.sparkVel[j] *= .6
        s.sparkVel[j + 2] *= .6
      }
      put(sp, i, s.sparkPos[j], s.sparkPos[j + 1], s.sparkPos[j + 2], s.sparkLife[i] > 0 ? .04 : 0, i)
    }
    sp.instanceMatrix.needsUpdate = true

    // Electric arcs: a jagged chain of thin boxes that flashes up the flank now and then.
    if (m.burning && s.fire > .1 && t > s.nextZap) {
      s.zapUntil = t + FX.zapTime
      s.nextZap = t + between(FX.zapEvery)
      const c = s.chain
      c[0].copy(base).addScaledVector(n, .03).addScaledVector(tangent, (Math.random() * 2 - 1) * .25)
      c[0].y = rand(.2, .8)
      for (let k = 1; k <= ZAPS; k++) {
        c[k].copy(c[k - 1])
          .addScaledVector(tangent, (Math.random() * 2 - 1) * .14)
          .addScaledVector(n, rand(.02, .09))
        c[k].y += (Math.random() * 2 - 1) * .14
      }
      for (let k = 0; k < ZAPS; k++) {
        dummy.position.addVectors(c[k], c[k + 1]).multiplyScalar(.5)
        dummy.scale.set(.02, .02, c[k].distanceTo(c[k + 1]))
        dummy.lookAt(c[k + 1])
        dummy.updateMatrix()
        zp.setMatrixAt(k, dummy.matrix)
      }
      zp.instanceMatrix.needsUpdate = true
      if (Math.random() < .5) spawnSparks(s, sp, base, n, 3, .7)
    }
    const zapping = t < s.zapUntil
    zp.visible = zapping

    // Steam: a white puff when the stream puts the fire out.
    const age0 = t - s.steamStart
    st.visible = age0 >= 0 && age0 < FX.steamTime + .4
    if (st.visible) {
      for (let i = 0; i < PUFFS; i++) {
        const p = s.puff[i]
        const u = (age0 - p.delay) / FX.steamTime
        if (u < 0 || u > 1) { put(st, i, 0, -10, 0, 0); continue }
        tmp.copy(base).addScaledVector(tangent, p.ox * .22).addScaledVector(n, .05 + u * .25)
        put(st, i, tmp.x, .1 + u * 1.4, tmp.z, (.1 + u * .36) * Math.sqrt(1 - u), i + u)
      }
      st.instanceMatrix.needsUpdate = true
    }

    // Light: an orange flicker with the fire, a blue-white kick on each arc.
    pl.position.copy(base).addScaledVector(n, .35)
    pl.position.y = .55
    pl.intensity = s.fire * FX.light * (.75 + .2 * Math.sin(t * 23) + .15 * Math.random()) + (zapping ? 3 : 0)
    pl.color.set(zapping ? SPARK_BLUE : FLAME_ORANGE)
  })

  return (
    <group>
      <Particles count={FLAMES} material={HOT} meshRef={fire} colored />
      <Particles count={SMOKES} material={SMOKE} meshRef={smoke} />
      <Particles count={SPARKS} material={HOT} meshRef={sparks} colored />
      <Particles count={ZAPS} material={ZAP} meshRef={zaps} />
      <Particles count={PUFFS} material={STEAM} meshRef={steam} />
      {/* Always mounted, dark until something burns: adding a light later would relink every program. */}
      <pointLight ref={light} intensity={0} distance={4} decay={2} color="#ff8a3a" />
    </group>
  )
}
