'use client'

// Atmosphere for the Room (the "charisma" pass): fake volumetrics the PS1 way. Additive cones
// under the ceiling tubes, soft glow planes on the neon and screens, drifting dust motes, and one
// tube that stutters once in a while. Everything is additive + depthWrite off, so draw order never matters
// and the dither pass bands the gradients into PS1 steps. Snap patch is inlined in the cone shader.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending, BufferGeometry, CanvasTexture, Color, DoubleSide, Float32BufferAttribute,
  type Group, type Mesh, type MeshBasicMaterial, type PointLight, type Points, ShaderMaterial, SRGBColorSpace, Uniform,
} from 'three'
import { SNAP } from './psx-material'

type Vec3 = [number, number, number]

const coneVert = /* glsl */ `
uniform vec2 uSnap;
varying vec2 vUv;
varying float vRim;
varying float vNear;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vRim = abs(dot(n, normalize(-mv.xyz)));
  vNear = smoothstep(1.5, 5.5, length(mv.xyz)); // the camera walks through these: fade out up close, never wash the frame
  gl_Position = projectionMatrix * mv;
  gl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap) / uSnap * gl_Position.w;
}`

const coneFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;
varying float vRim;
varying float vNear;
void main() {
  float fall = pow(vUv.y, 1.7);                       // bright at the tube, gone by the floor
  float rim = pow(vRim, 1.3);                         // soft edges: tangential faces fade out
  float hum = 0.94 + 0.06 * sin(uTime * 41.0 + vUv.y * 7.0); // 50 Hz flutter, barely there
  gl_FragColor = vec4(uColor * uIntensity * fall * rim * hum * vNear, 1.0);
}`

function coneMaterial(color: string, intensity: number) {
  return new ShaderMaterial({
    vertexShader: coneVert,
    fragmentShader: coneFrag,
    uniforms: { uSnap: new Uniform(SNAP), uColor: new Uniform(new Color(color)), uIntensity: new Uniform(intensity), uTime: new Uniform(0) },
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: false,
  })
}

// A shaft of light hanging from a fixture: open frustum, top at `at`, `height` down toward the floor.
export function LightCone({ at, color, intensity = .3, height = 5, top = 1.2, bottom = 2.6, scale = [1, 1, 1], flicker }: {
  at: Vec3; color: string; intensity?: number; height?: number; top?: number; bottom?: number; scale?: Vec3
  flicker?: React.RefObject<number>
}) {
  const material = useMemo(() => coneMaterial(color, intensity), [color, intensity])
  useEffect(() => () => material.dispose(), [material])
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
    if (flicker) material.uniforms.uIntensity.value = intensity * flicker.current
  })
  return <mesh position={[at[0], at[1] - height / 2, at[2]]} scale={scale} material={material} frustumCulled={false}>
    <cylinderGeometry args={[top, bottom, height, 12, 1, true]} />
  </mesh>
}

function glowTexture(kind: 'spot' | 'band') {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const gradient = kind === 'spot'
    ? ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    : ctx.createLinearGradient(0, 0, 0, 64)
  if (kind === 'spot') {
    gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(.35, 'rgba(255,255,255,.45)'); gradient.addColorStop(1, 'rgba(255,255,255,0)')
  } else {
    gradient.addColorStop(0, 'rgba(255,255,255,0)'); gradient.addColorStop(.5, 'rgba(255,255,255,1)'); gradient.addColorStop(1, 'rgba(255,255,255,0)')
  }
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  return map
}

let spotMap: CanvasTexture | null = null
let bandMap: CanvasTexture | null = null
function useGlowMap(kind: 'spot' | 'band') {
  return useMemo(() => {
    if (kind === 'spot') return (spotMap ??= glowTexture('spot'))
    return (bandMap ??= glowTexture('band'))
  }, [kind])
}

// A soft glow plane: `band` for neon tubes (fades across its height), `spot` for screens and signs.
export function Glow({ at, size, color, intensity = .5, rotation = [0, 0, 0], kind = 'spot', pulse = 0 }: {
  at: Vec3; size: [number, number]; color: string; intensity?: number; rotation?: Vec3; kind?: 'spot' | 'band'; pulse?: number
}) {
  const map = useGlowMap(kind)
  const mesh = useRef<Mesh>(null)
  const phase = useMemo(() => Math.random() * 7, [])
  useFrame((state) => {
    if (!pulse || !mesh.current) return
    const t = state.clock.elapsedTime
    const s = 1 - pulse * (.5 + .5 * Math.sin(t * 2.3 + phase)) * (.6 + .4 * Math.sin(t * 17 + phase * 3))
    mesh.current.scale.set(s, s, 1)
  })
  return <mesh ref={mesh} position={at} rotation={rotation} frustumCulled={false}>
    <planeGeometry args={size} />
    <meshBasicMaterial map={map} color={color} transparent opacity={intensity} depthWrite={false} blending={AdditiveBlending} side={DoubleSide} fog={false} />
  </mesh>
}

// Dust motes drifting through the light. Positions mutate in place; no allocation per frame.
export function Dust({ count = 320, box = [[-9, 9], [.1, 5.1], [-6.5, 15.5]], color = '#ffe3bf', size = .075, opacity = .55 }: {
  count?: number; box?: [[number, number], [number, number], [number, number]]; color?: string; size?: number; opacity?: number
}) {
  const points = useRef<Points>(null)
  const map = useGlowMap('spot')
  const { geometry, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = box[0][0] + Math.random() * (box[0][1] - box[0][0])
      positions[i * 3 + 1] = box[1][0] + Math.random() * (box[1][1] - box[1][0])
      positions[i * 3 + 2] = box[2][0] + Math.random() * (box[2][1] - box[2][0])
      seeds[i] = Math.random() * Math.PI * 2
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    return { geometry, seeds }
  }, [count, box])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame((state, delta) => {
    const dt = Math.min(delta, .1)
    const t = state.clock.elapsedTime
    const attribute = geometry.getAttribute('position')
    const array = attribute.array as Float32Array
    for (let i = 0; i < count; i++) {
      const seed = seeds[i]
      array[i * 3] += Math.sin(t * .35 + seed) * .06 * dt
      array[i * 3 + 1] += (.04 + .04 * Math.sin(t * .2 + seed * 2)) * dt
      array[i * 3 + 2] += Math.cos(t * .27 + seed) * .05 * dt
      if (array[i * 3 + 1] > box[1][1]) array[i * 3 + 1] = box[1][0]
    }
    attribute.needsUpdate = true
  })
  return <points ref={points} geometry={geometry} frustumCulled={false}>
    <pointsMaterial map={map} color={color} size={size} sizeAttenuation transparent opacity={opacity} depthWrite={false} blending={AdditiveBlending} fog={false} />
  </points>
}

// A tube that is on its way out: steady like the others, then every 45 s to two minutes it
// stutters for a second or two and settles again. One ref drives the point light, the cone and
// the ceiling panel so they agree. The first episode comes early so a fresh visit still sees one.
const PANEL_ON = new Color('#8d96ac')
const PANEL_OFF = new Color('#303444')
export function BrokenTube({ at, color = '#9fb0e6', intensity = 3, cone }: { at: Vec3; color?: string; intensity?: number; cone: Omit<Parameters<typeof LightCone>[0], 'at' | 'color' | 'flicker'> }) {
  const light = useRef<PointLight>(null)
  const panel = useRef<MeshBasicMaterial>(null)
  const level = useRef(1)
  const episode = useRef({ next: 15 + Math.random() * 20, until: 0 })
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const e = episode.current
    if (t >= e.next) { e.until = t + 1.2 + Math.random() * 1.3; e.next = e.until + 45 + Math.random() * 75 }
    let target = 1
    if (t < e.until) {
      const k = Math.floor(t * 16)
      const r = Math.abs(Math.sin(k * 78.233) * 43758.5453) % 1
      target = r > .55 ? 1 : r > .3 ? .35 : .08
    }
    const rate = target > level.current ? 60 : 18
    level.current += (target - level.current) * Math.min(1, rate * delta)
    if (light.current) light.current.intensity = intensity * level.current
    if (panel.current) panel.current.color.copy(PANEL_OFF).lerp(PANEL_ON, level.current)
  })
  return <group>
    <mesh position={[at[0], at[1] - .04, at[2]]}><boxGeometry args={[2.7, .04, .85]} /><meshBasicMaterial ref={panel} color={PANEL_ON} /></mesh>
    <pointLight ref={light} position={[at[0], at[1] - .6, at[2] + 1]} color={color} intensity={intensity} distance={10} decay={2} />
    <LightCone at={at} color={color} flicker={level} {...cone} />
  </group>
}

// Everything above, arranged for the Room. Fixtures: three tubes over the cabinets, one over the store.
export function Atmosphere() {
  const group = useRef<Group>(null)
  return <group ref={group}>
    <Dust />
    {[-5, 5].map(x => <LightCone key={x} at={[x, 5.02, -3]} color="#afbde8" intensity={.32} height={5} top={1.15} bottom={2.4} scale={[1.55, 1, .85]} />)}
    <BrokenTube at={[0, 5.02, -3]} color="#a4b3e4" intensity={3} cone={{ intensity: .32, height: 5, top: 1.15, bottom: 2.4, scale: [1.55, 1, .85] }} />
    {/* The store tube hangs right over the hub camera, so it gets a ceiling halo, not a cone: a cone here washes the frame. */}
    <Glow kind="spot" at={[0, 4.9, 10]} size={[5.5, 3]} color="#ffd9ad" intensity={.35} rotation={[Math.PI / 2, 0, 0]} />
    {/* Neon tubes along the walls, plus their spill on the wall behind. */}
    <Glow kind="band" at={[0, 4.8, -6.66]} size={[18.8, 1.5]} color="#5faaaa" intensity={.7} />
    <Glow kind="band" at={[0, 4.8, 16.05]} size={[18.8, 1.4]} color="#5faaaa" intensity={.5} rotation={[0, Math.PI, 0]} />
    <Glow kind="band" at={[-9.1, 4.8, 4.5]} size={[23, 1.5]} color="#ad638f" intensity={.7} rotation={[0, Math.PI / 2, 0]} />
    <Glow kind="band" at={[-9.1, 1.25, 4.5]} size={[23, 1.6]} color="#f896b8" intensity={.8} rotation={[0, Math.PI / 2, 0]} />
    {/* The marquee: a haze halo that breathes like a neon transformer. */}
    <Glow kind="spot" at={[0, 3.85, -6.82]} size={[12.5, 4.2]} color="#6ee9db" intensity={.4} pulse={.08} />
    <Glow kind="spot" at={[0, 3.85, -6.78]} size={[9, 2.6]} color="#fff0c9" intensity={.22} pulse={.1} />
  </group>
}
