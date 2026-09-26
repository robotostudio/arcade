'use client'

import { forwardRef, useImperativeHandle, useRef } from 'react'
import type { Group } from 'three'
import { litMaterial, unlitMaterial } from '../livery'
import { noRaycast } from './mischief'

// A chunky ginger arcade cat, boxes only, facing +z with its feet on y = 0. Parallel faces that
// overlap are kept at least 3 cm apart so the PSX vertex snap cannot make them fight.
const FUR = litMaterial('#ff9a36', { emissive: '#4a1e04' }) // a touch of emissive so it reads in the Room's gloom
const STRIPE = litMaterial('#a44a14', { emissive: '#240c02' })
const SOCK = litMaterial('#fff0d2', { emissive: '#3a3228' })
const EYE = unlitMaterial('#b6ff4d') // unlit so the bloom catches them in the gloom
const PUPIL = unlitMaterial('#140f1c')
const NOSE = unlitMaterial('#ff78a8')

export type CatRig = {
  root: Group
  body: Group
  head: Group
  tail: Group
  tailTip: Group
  legs: Group[] // front-left, front-right, back-left, back-right
}

// Hips: x (inboard enough that the leg sides sit 3 cm inside the torso sides), z.
const LEGS: [number, number][] = [[-.065, .17], [.065, .17], [-.065, -.17], [.065, -.17]]

export const CatModel = forwardRef<CatRig>(function CatModel(_, ref) {
  const root = useRef<Group>(null!)
  const body = useRef<Group>(null!)
  const head = useRef<Group>(null!)
  const tail = useRef<Group>(null!)
  const tailTip = useRef<Group>(null!)
  const legs = useRef<Group[]>([])
  useImperativeHandle(ref, () => ({ root: root.current, body: body.current, head: head.current, tail: tail.current, tailTip: tailTip.current, legs: legs.current }), [])

  return (
    <group ref={root}>
      <group ref={body}>
        {/* torso and two stripe rings round it */}
        <mesh raycast={noRaycast} position={[0, .38, 0]} material={FUR}><boxGeometry args={[.26, .24, .5]} /></mesh>
        <mesh raycast={noRaycast} position={[0, .38, -.03]} material={STRIPE}><boxGeometry args={[.33, .31, .05]} /></mesh>
        <mesh raycast={noRaycast} position={[0, .38, -.15]} material={STRIPE}><boxGeometry args={[.33, .31, .05]} /></mesh>

        <group ref={head} position={[0, .5, .26]}>
          <mesh raycast={noRaycast} position={[0, .06, .04]} material={FUR}><boxGeometry args={[.32, .24, .24]} /></mesh>
          <mesh raycast={noRaycast} position={[0, 0, .18]} material={SOCK}><boxGeometry args={[.16, .09, .08]} /></mesh>
          <mesh raycast={noRaycast} position={[0, .02, .235]} material={NOSE}><boxGeometry args={[.05, .035, .04]} /></mesh>
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh raycast={noRaycast} position={[s * .08, .09, .16]} material={EYE}><boxGeometry args={[.07, .06, .06]} /></mesh>
              <mesh raycast={noRaycast} position={[s * .08, .09, .2]} material={PUPIL}><boxGeometry args={[.02, .04, .04]} /></mesh>
              <mesh raycast={noRaycast} position={[s * .1, .22, .02]} rotation={[0, Math.PI / 4, 0]} material={s < 0 ? FUR : STRIPE}><coneGeometry args={[.075, .13, 4]} /></mesh>
            </group>
          ))}
        </group>

        {/* tail: two segments pivoting at the rump, the tip in stripe colour */}
        <group ref={tail} position={[0, .45, -.24]} rotation={[.9, 0, 0]}>
          <mesh raycast={noRaycast} position={[0, 0, -.12]} material={FUR}><boxGeometry args={[.06, .06, .24]} /></mesh>
          <group ref={tailTip} position={[0, 0, -.23]} rotation={[.6, 0, 0]}>
            <mesh raycast={noRaycast} position={[0, 0, -.1]} material={STRIPE}><boxGeometry args={[.055, .055, .2]} /></mesh>
          </group>
        </group>

        {LEGS.map(([x, z], i) => (
          <group key={i} ref={(g) => { if (g) legs.current[i] = g }} position={[x, .32, z]}>
            <mesh raycast={noRaycast} position={[0, -.12, 0]} material={FUR}><boxGeometry args={[.07, .24, .07]} /></mesh>
            <mesh raycast={noRaycast} position={[0, -.28, 0]} material={SOCK}><boxGeometry args={[.07, .08, .07]} /></mesh>
          </group>
        ))}
      </group>
    </group>
  )
})
