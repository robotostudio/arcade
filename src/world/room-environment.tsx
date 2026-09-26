'use client'

import { useEffect, useMemo } from 'react'
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

function texture(kind: 'carpet' | 'sign', title = '', subtitle = '') {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = kind === 'carpet' ? 1024 : 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = kind === 'carpet' ? '#252154' : '#242044'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  if (kind === 'carpet') {
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
  } else {
    ctx.strokeStyle = '#6ee9db'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, 1004, 236)
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff0c9'; ctx.font = '900 100px monospace'; ctx.fillText(title, 512, 133)
    ctx.fillStyle = '#ff8dbd'; ctx.font = 'bold 28px monospace'; ctx.fillText(subtitle, 512, 201)
  }
  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  if (kind === 'carpet') { map.wrapS = map.wrapT = RepeatWrapping; map.repeat.set(4, 3.6) }
  return map
}

export function Block({ at, size, color, glow = false }: { at: [number, number, number]; size: [number, number, number]; color: string; glow?: boolean }) {
  return <mesh position={at}><boxGeometry args={size} />{glow ? <meshBasicMaterial color={color} /> : <meshLambertMaterial color={color} />}</mesh>
}

export function Sign({ at, title, subtitle, width = 5 }: { at: [number, number, number]; title: string; subtitle: string; width?: number }) {
  const map = useMemo(() => texture('sign', title, subtitle), [title, subtitle])
  useEffect(() => () => map.dispose(), [map])
  return <mesh position={at}><boxGeometry args={[width, width / 4, .12]} /><meshBasicMaterial map={map} /></mesh>
}

export function Cabinet({ at, color, title = 'PIXEL', rotation = 0 }: { at: [number, number, number]; color: string; title?: string; rotation?: number }) {
  return <group position={at} rotation={[0, rotation, 0]}>
    <Block at={[0, 1.1, 0]} size={[1.1, 2.2, .85]} color={color} />
    <Block at={[0, 1.75, .44]} size={[.92, .95, .08]} color="#211e3c" />
    <Block at={[0, 1.78, .49]} size={[.73, .59, .02]} color="#7ce5df" glow />
    <Block at={[0, 1.78, .51]} size={[.5, .07, .02]} color="#faf1b7" glow />
    <Block at={[0, 1.02, .51]} size={[1.12, .14, .4]} color="#514677" />
    <Block at={[-.25, 1.17, .55]} size={[.05, .22, .05]} color="#f691bb" />
    <Block at={[.22, 1.12, .59]} size={[.12, .06, .12]} color="#ffe29b" />
    <pointLight position={[0, 1.6, .85]} color="#77b5ff" intensity={2.8} distance={3.4} decay={2} />
    <Block at={[0, .48, .44]} size={[.22, .31, .03]} color="#211e3c" />
    <Sign at={[0, 2.36, .04]} title={title} subtitle="INSERT COIN" width={1.18} />
  </group>
}

export function RoomEnvironment() {
  const carpet = useMemo(() => texture('carpet'), [])
  useEffect(() => () => carpet.dispose(), [carpet])
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.015, 0]}><planeGeometry args={[19, 17]} /><meshLambertMaterial map={carpet} /></mesh>
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
    <Block at={[0, -.23, 0]} size={[19.3, .4, 17.3]} color="#544377" />
    <Block at={[0, 5.4, .5]} size={[19, .18, 15]} color="#777589" />
    {[-7.1, -4.7, -2.3, .1, 2.5, 4.9, 7.3].map(x => <Block key={x} at={[x, 5.298, .5]} size={[.025, .012, 15]} color="#565567" />)}
    {[-4.6, -2.2, .2, 2.6, 5].map(z => <Block key={z} at={[0, 5.297, z]} size={[19, .012, .025]} color="#565567" />)}
    <Block at={[-4.25, 2.65, -7]} size={[10.5, 5.3, .22]} color="#8884a8" />
    <Block at={[6.35, 2.65, -7]} size={[6.3, 5.3, .22]} color="#8884a8" />
    <Block at={[2.1, 4.25, -7]} size={[2.2, 2.1, .22]} color="#8884a8" />
    <Block at={[.94, 1.6, -6.87]} size={[.12, 3.2, .16]} color="#bbb2bd" />
    <Block at={[3.26, 1.6, -6.87]} size={[.12, 3.2, .16]} color="#bbb2bd" />
    <Block at={[2.1, 3.18, -6.87]} size={[2.44, .12, .16]} color="#bbb2bd" />
    <Block at={[.98, 1.6, -9]} size={[.12, 3.2, 4]} color="#55576e" />
    <Block at={[3.22, 1.6, -9]} size={[.12, 3.2, 4]} color="#626079" />
    <Block at={[2.1, 1.6, -11]} size={[2.3, 3.2, .16]} color="#373b53" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.1, -.014, -9]}><planeGeometry args={[2.3, 4]} /><meshLambertMaterial map={carpet} /></mesh>
    <Block at={[2.1, 3.15, -9.6]} size={[1.2, .06, .45]} color="#bddac9" glow />
    <pointLight position={[2.1, 2.7, -9.5]} color="#b2d2c8" intensity={3} distance={4} />
    <Block at={[-9.4, 2.65, 0]} size={[.22, 5.3, 14]} color="#718f9c" />
    <Block at={[9.4, 2.65, -3]} size={[.22, 5.3, 8]} color="#827f9f" />
    {[[-4.25, 10.4], [6.35, 6.1]].map(([x, width]) => <group key={x}>
      {[.3, 1.25].map(y => <Block key={y} at={[x, y, -6.85]} size={[width, .09, .08]} color="#bd829e" />)}
      <Block at={[x, .7, -6.82]} size={[width, .85, .08]} color="#48445f" />
    </group>)}
    <Block at={[0, 4.8, -6.8]} size={[18.8, .06, .1]} color="#5faaaa" glow />
    <Block at={[-9.22, 4.8, 0]} size={[.08, .06, 14]} color="#ad638f" glow />
    <Block at={[-9.22, 1.25, 0]} size={[.08, .12, 14]} color="#f896b8" />
    <Sign at={[-3.7, 3.85, -6.7]} title="ROBOTO ARCADE" subtitle="EST. 1996 • OPEN LATE" width={6.4} />
    {[-7.7, -6.3, -4.9].map((x, i) => <Cabinet key={x} at={[x, 0, -5.65]} color={['#dc719e', '#5da6b4', '#9e82cd'][i]} title={['ORBIT', 'NOVA', 'RUSH'][i]} />)}
    {[-.5, 1].map((z, i) => <Cabinet key={z} at={[-8.5, 0, z]} rotation={Math.PI / 2} color={['#a786d1', '#da8599', '#68b8b7'][i]} title="PLAY" />)}
    {[-5, 0, 5].map((x, i) => <group key={x}>
      <Block at={[x, 5.06, -3]} size={[2.95, .13, 1.05]} color="#646475" />
      <Block at={[x, 4.98, -3]} size={[2.7, .04, .85]} color={i === 1 ? '#303444' : '#8d96ac'} glow />
      <pointLight position={[x, 4.4, -2]} color={i === 1 ? '#788ec7' : '#afbde8'} intensity={i === 1 ? .4 : 3} distance={10} decay={2} />
    </group>)}
    <pointLight position={[-7, 3, 3]} color="#76eeef" intensity={8} distance={10} />
    <pointLight position={[5, 3, 1]} color="#ffa6d7" intensity={6} distance={10} />
    {[[7.2, 3.8]].map(([x, z]) => <group key={x} position={[x, 0, z]}><Block at={[0, .65, 0]} size={[1.7, .16, .7]} color="#f5abac" /><Block at={[-.6, .3, 0]} size={[.12, .6, .55]} color="#74b4ba" /><Block at={[.6, .3, 0]} size={[.12, .6, .55]} color="#74b4ba" /></group>)}
  </group>
}
