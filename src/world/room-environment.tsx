'use client'

import { useEffect, useMemo } from 'react'
import { CanvasTexture, type Material, RepeatWrapping, SRGBColorSpace } from 'three'
import { displayFont, liveryCanvas } from './Display'
import { type AccentKey, accentMaterial, bodyMaterial, livery, mutedMaterial, unlitMaterial } from './livery'
import { Atmosphere, Glow } from './look/Atmosphere'

function carpetTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#252154'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  let seed = 24
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  for (let i = 0; i < 14000; i++) {
    ctx.fillStyle = ['#514572', '#393366', '#625681'][i % 3]
    ctx.globalAlpha = .3
    ctx.fillRect(random() * 1024, random() * 1024, 2, 3)
  }
  ctx.globalAlpha = .65
  for (let y = 80; y < 1024; y += 160) for (let x = 70; x < 1024; x += 170) {
    const px = x + random() * 45, py = y + random() * 45
    ctx.strokeStyle = ['#f885b5', '#55cad4', '#9d81ed'][Math.floor(random() * 3)]
    ctx.lineWidth = 5
    ctx.beginPath(); ctx.ellipse(px, py, 34, 21, -.5, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.ellipse(px, py, 47, 31, -.5, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = '#efb968'
    ctx.beginPath(); ctx.moveTo(px + 60, py + 37); ctx.lineTo(px + 77, py + 52); ctx.lineTo(px + 62, py + 66); ctx.stroke()
    ctx.fillStyle = '#9b8fe5'; ctx.fillRect(px - 42, py + 67, 6, 6)
  }
  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  map.wrapS = map.wrapT = RepeatWrapping; map.repeat.set(4, 5.3)
  return map
}

// A sign's canvas: the room marquee keeps its neon colours; a cabinet sign (with an Accent) takes the
// Livery's screen, Accent title and cream subtitle. Both set in VT323 at integer px, redrawn once it loads.
function signTexture(title: string, subtitle: string, accent?: AccentKey) {
  return liveryCanvas(1024, 256, (ctx, w, h) => {
    const t = livery()
    ctx.fillStyle = accent ? t.screen : '#242044'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = accent ? t[accent] : '#6ee9db'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, w - 20, h - 20)
    ctx.textAlign = 'center'; ctx.fillStyle = accent ? t[accent] : '#fff0c9'; ctx.font = displayFont(100); ctx.fillText(title, w / 2, 133)
    ctx.fillStyle = accent ? t.text : '#ff8dbd'; ctx.font = displayFont(28); ctx.fillText(subtitle, w / 2, 201)
  }, !!accent)
}

export function Block({ at, size, color = '#ffffff', glow = false, material }: {
  at: [number, number, number]; size: [number, number, number]; color?: string; glow?: boolean; material?: Material
}) {
  if (material) return <mesh position={at} material={material}><boxGeometry args={size} /></mesh>
  return <mesh position={at}><boxGeometry args={size} />{glow ? <meshBasicMaterial color={color} /> : <meshLambertMaterial color={color} />}</mesh>
}

export function Sign({ at, title, subtitle, width = 5, accent }: { at: [number, number, number]; title: string; subtitle: string; width?: number; accent?: AccentKey }) {
  const sign = useMemo(() => signTexture(title, subtitle, accent), [title, subtitle, accent])
  useEffect(() => () => sign.dispose(), [sign])
  return <mesh position={at}><boxGeometry args={[width, width / 4, .12]} /><meshBasicMaterial map={sign.texture} /></mesh>
}

// A decorative cabinet in the Livery: body in a muted Accent on a Plinth, dark trim and frame, a cream
// control deck; the screen and its lamp are unlit so the bloom lifts them. Not a Machine: nothing to play.
export function Cabinet({ at, accent, title = 'PIXEL', rotation = 0 }: { at: [number, number, number]; accent: AccentKey; title?: string; rotation?: number }) {
  return <group position={at} rotation={[0, rotation, 0]}>
    <Block at={[0, 1.1, 0]} size={[1.1, 2.2, .85]} material={mutedMaterial(accent)} />
    <Block at={[0, .16, 0]} size={[1.16, .32, .91]} material={bodyMaterial('plinth')} />
    <Block at={[0, 1.75, .44]} size={[.92, .95, .08]} material={bodyMaterial('frame')} />
    <Block at={[0, 1.78, .49]} size={[.73, .59, .02]} material={unlitMaterial('#7ce5df')} />
    <Block at={[0, 1.78, .51]} size={[.5, .07, .02]} material={unlitMaterial('#faf1b7')} />
    <Block at={[0, 1.02, .51]} size={[1.12, .14, .4]} material={bodyMaterial('panel')} />
    <Block at={[-.25, 1.17, .55]} size={[.05, .22, .05]} material={bodyMaterial('trim')} />
    <Block at={[.22, 1.12, .59]} size={[.12, .06, .12]} material={accentMaterial(accent)} />
    <Glow kind="spot" at={[0, 1.78, .58]} size={[1.5, 1.15]} color="#7ce5df" intensity={.5} pulse={.06} />
    <pointLight position={[0, 1.6, .85]} color="#77b5ff" intensity={2.8} distance={3.4} decay={2} />
    <Block at={[0, .48, .44]} size={[.22, .31, .03]} material={bodyMaterial('trim')} />
    <Sign at={[0, 2.36, .04]} title={title} subtitle="INSERT COIN" width={1.18} accent={accent} />
  </group>
}

export function RoomEnvironment() {
  const carpet = useMemo(() => carpetTexture(), [])
  useEffect(() => () => carpet.dispose(), [carpet])
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.015, 4]}><planeGeometry args={[19, 25]} /><meshLambertMaterial map={carpet} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.01, 0]}>
      <ringGeometry args={[3.22, 3.7, 64]} />
      <meshLambertMaterial color="#393453" />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.005, 0]}>
      <ringGeometry args={[3.26, 3.3, 64]} />
      <meshLambertMaterial color="#95879f" />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.005, 0]}>
      <ringGeometry args={[3.59, 3.65, 64]} />
      <meshLambertMaterial color="#7d9caa" />
    </mesh>
    <Block at={[0, -.23, 4]} size={[19.3, .4, 25.3]} color="#544377" />
    <Block at={[0, 5.4, 4.5]} size={[19, .18, 23]} color="#777589" />
    {[-7.1, -4.7, -2.3, .1, 2.5, 4.9, 7.3].map(x => <Block key={x} at={[x, 5.298, 4.5]} size={[.025, .012, 23]} color="#565567" />)}
    {[-4.6, -2.2, .2, 2.6, 5, 7.4, 9.8, 12.2, 14.6].map(z => <Block key={z} at={[0, 5.297, z]} size={[19, .012, .025]} color="#565567" />)}
    <Block at={[0, 2.65, -7]} size={[19, 5.3, .22]} color="#8884a8" />
    <Block at={[-9.4, 2.65, 4.5]} size={[.22, 5.3, 23]} color="#718f9c" />
    <Block at={[9.4, 2.65, 11]} size={[.22, 5.3, 10]} color="#827f9f" />
    <Block at={[0, 2.65, 16.4]} size={[19, 5.3, .22]} color="#8884a8" />
    <Block at={[0, 4.8, 16.2]} size={[18.8, .06, .1]} color="#5faaaa" glow />
    <Block at={[0, 5.06, 10]} size={[2.95, .13, 1.05]} color="#646475" />
    <Block at={[0, 4.98, 10]} size={[2.7, .04, .85]} color="#8d96ac" glow />
    <pointLight position={[0, 4.4, 10]} color="#afbde8" intensity={3} distance={10} decay={2} />
    <Block at={[9.4, 2.65, -3]} size={[.22, 5.3, 8]} color="#827f9f" />
    {[[0, 18.8]].map(([x, width]) => <group key={x}>
      {[.3, 1.25].map(y => <Block key={y} at={[x, y, -6.85]} size={[width, .09, .08]} color="#bd829e" />)}
      <Block at={[x, .7, -6.82]} size={[width, .85, .08]} color="#48445f" />
    </group>)}
    <Block at={[0, 4.8, -6.8]} size={[18.8, .06, .1]} color="#5faaaa" glow />
    <Block at={[-9.22, 4.8, 4.5]} size={[.08, .06, 23]} color="#ad638f" glow />
    <Block at={[-9.22, 1.25, 4.5]} size={[.08, .12, 23]} color="#f896b8" />
    <Sign at={[0, 3.9, -6.7]} title="FLEEKADE" subtitle="EST. 1996 • OPEN LATE" width={8.8} />
    {[-7.7, -6.3, -4.9].map((x, i) => <Cabinet key={x} at={[x, 0, -5.65]} accent={(['whackamole', 'skeeball', 'stacktop'] as const)[i]} title={['ORBIT', 'NOVA', 'RUSH'][i]} />)}
    {[-.5, 1].map((z, i) => <Cabinet key={z} at={[-8.5, 0, z]} rotation={Math.PI / 2} accent={(['claw', 'whackamole'] as const)[i]} title="PLAY" />)}
    {[-5, 0, 5].map((x, i) => <group key={x}>
      <Block at={[x, 5.06, -3]} size={[2.95, .13, 1.05]} color="#646475" />
      {i !== 1 && <Block at={[x, 4.98, -3]} size={[2.7, .04, .85]} color="#8d96ac" glow />}
      {i !== 1 && <pointLight position={[x, 4.4, -2]} color="#afbde8" intensity={3} distance={10} decay={2} />}
    </group>)}
    <pointLight position={[-7, 3, 3]} color="#76eeef" intensity={8} distance={10} />
    <pointLight position={[5, 3, 1]} color="#ffa6d7" intensity={6} distance={10} />
    {[[7.2, 3.8]].map(([x, z]) => <group key={x} position={[x, 0, z]}><Block at={[0, .65, 0]} size={[1.7, .16, .7]} color="#f5abac" /><Block at={[-.6, .3, 0]} size={[.12, .6, .55]} color="#74b4ba" /><Block at={[.6, .3, 0]} size={[.12, .6, .55]} color="#74b4ba" /></group>)}
    <Atmosphere />
  </group>
}
