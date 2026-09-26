'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, Color, Group, MeshBasicMaterial, PointLight, SRGBColorSpace } from 'three'
import { signClock, useIntro } from '@/intro/store'
import { Glow } from './look/Atmosphere'

// Hanging FLEEKADE tubes. A short pendulum plus a light breeze; each letter
// hums and occasionally dips the way a tired neon transformer does.
const WORD = 'FLEEKADE'
const LETTER_W = 0.58
const LETTER_H = 0.96
const GAP = 0.15
const THICK = 0.1
type Seg = [number, number, number, number]
const GLYPHS: Record<string, Seg[]> = {
  F: [[0, 0, 0, 1], [0, 1, 0.86, 1], [0, 0.5, 0.66, 0.5]],
  L: [[0.08, 1, 0.08, 0], [0.08, 0, 0.9, 0]],
  E: [[0.88, 1, 0.06, 1], [0.06, 1, 0.06, 0], [0.06, 0, 0.88, 0], [0.06, 0.5, 0.68, 0.5]],
  K: [[0.06, 0, 0.06, 1], [0.92, 1, 0.1, 0.48], [0.1, 0.48, 0.92, 0]],
  A: [[0.04, 0, 0.5, 1], [0.5, 1, 0.96, 0], [0.24, 0.38, 0.76, 0.38]],
  D: [[0.06, 0, 0.06, 1], [0.06, 1, 0.52, 1], [0.52, 1, 0.96, 0.7], [0.96, 0.7, 0.96, 0.3], [0.96, 0.3, 0.52, 0], [0.52, 0, 0.06, 0]],
}
const WORD_W = WORD.length * LETTER_W + (WORD.length - 1) * GAP
const ON = new Color('#e7fff8')
const OFF = new Color('#163430')

function flickerAt(index: number, time: number) {
  const hum = 0.9 + 0.1 * Math.sin(time * 53 + index * 1.7)
  const stutter = Math.sin(time * 1.7 + index * 4.3) > 0.992
  const dip = stutter ? 0.15 + 0.55 * (Math.sin(time * 80 + index) * 0.5 + 0.5) : 1
  return hum * dip
}

function Tube({ a, b, material }: { a: [number, number]; b: [number, number]; material: MeshBasicMaterial }) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 0.001
  return (
    <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0]} rotation={[0, 0, Math.atan2(dy, dx)]} material={material}>
      <boxGeometry args={[len + THICK * 0.8, THICK, THICK]} />
    </mesh>
  )
}

export function NeonSign() {
  const pivot = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  const swing = useRef({ ang: 0.1, vel: 0, nod: 0.02, nodV: 0 })
  const kicked = useRef(false)
  const reduced = useRef(false)
  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])
  const signIntro = useIntro((s) => s.signIntro)
  const mats = useMemo(() => WORD.split('').map(() => new MeshBasicMaterial({ color: OFF.clone(), toneMapped: false })), [])
  const subtitle = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1400
    canvas.height = 160
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ff8dbd'
    ctx.font = 'bold 78px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('EST. 2021   ·   OPEN LATE', 700, 80)
    const map = new CanvasTexture(canvas)
    map.colorSpace = SRGBColorSpace
    return map
  }, [])
  useEffect(() => () => {
    mats.forEach((m) => m.dispose())
    subtitle.dispose()
  }, [mats, subtitle])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const reducedMotion = reduced.current
    const body = swing.current
    const time = state.clock.elapsedTime
    if (signIntro && signClock.t > 0.15 && !kicked.current) {
      kicked.current = true
      body.vel += 1.35
    }
    if (!reducedMotion) {
      const length = 0.48
      body.vel += (-(9.8 / length) * Math.sin(body.ang) - 0.42 * body.vel) * dt
      body.vel += Math.sin(time * 0.55) * 0.7 * dt
      body.ang += body.vel * dt
      body.nodV += (-(9.8 / 0.85) * Math.sin(body.nod) - 0.5 * body.nodV) * dt
      body.nodV += Math.cos(time * 0.37) * 0.55 * dt
      body.nod += body.nodV * dt
    } else {
      body.ang = 0
      body.nod = 0
    }
    if (pivot.current) {
      pivot.current.rotation.z = body.ang
      pivot.current.rotation.x = body.nod
    }

    let glow = 0
    WORD.split('').forEach((_, i) => {
      const start = 0.2 + i * 0.16
      const ignite = signIntro ? Math.min(1, Math.max(0, (signClock.t - start) / 0.22)) : 1
      const eased = ignite * ignite * (3 - 2 * ignite)
      const level = eased * (reducedMotion ? 1 : flickerAt(i, time))
      mats[i].color.copy(OFF).lerp(ON, level)
      glow += level
    })
    glow /= WORD.length
    if (light.current) light.current.intensity = 4 + glow * 18
  })

  return (
    <group position={[0, 4.48, -6.58]}>
      {[-2.55, 2.55].map((x) => (
        <mesh key={x} position={[x, 0.04, 0]}>
          <boxGeometry args={[0.12, 0.08, 0.1]} />
          <meshLambertMaterial color="#8d88a4" />
        </mesh>
      ))}
      <group ref={pivot}>
        {[-2.55, 2.55].map((x) => (
          <mesh key={x} position={[x, -0.28, 0]}>
            <boxGeometry args={[0.028, 0.56, 0.028]} />
            <meshLambertMaterial color="#b7b2c8" />
          </mesh>
        ))}
        <group position={[0, -0.62, 0.04]}>
          <mesh>
            <boxGeometry args={[7.15, 1.72, 0.08]} />
            <meshLambertMaterial color="#141226" />
          </mesh>
          <mesh position={[0, 0, 0.045]}>
            <boxGeometry args={[6.85, 1.42, 0.02]} />
            <meshBasicMaterial color="#241c3d" />
          </mesh>
          {WORD.split('').map((char, i) => {
            const origin = -WORD_W / 2 + i * (LETTER_W + GAP)
            return (
              <group key={char + i} position={[origin, 0.12, 0.08]}>
                {GLYPHS[char].map((seg, s) => {
                  const a: [number, number] = [seg[0] * LETTER_W, (seg[1] - 0.5) * LETTER_H]
                  const b: [number, number] = [seg[2] * LETTER_W, (seg[3] - 0.5) * LETTER_H]
                  return <Tube key={s} a={a} b={b} material={mats[i]} />
                })}
              </group>
            )
          })}
          <mesh position={[0, -0.68, 0.08]}>
            <planeGeometry args={[5.4, 0.32]} />
            <meshBasicMaterial map={subtitle} transparent toneMapped={false} />
          </mesh>
          <pointLight ref={light} position={[0, 0, 0.9]} color="#bffff4" intensity={12} distance={9} decay={2} />
          <Glow kind="spot" at={[0, 0.05, 0.2]} size={[8.2, 2.6]} color="#7dfff0" intensity={0.42} pulse={0.06} />
        </group>
      </group>
    </group>
  )
}
