'use client'
import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import type { DroidPlayer } from './useDroidAudio'
import { DroidConsole } from './DroidConsole'

function Panel({ at, size, color = '#254c91' }: { at: [number, number, number]; size: [number, number, number]; color?: string }) {
  return <mesh position={at}><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={.65} metalness={.25} /></mesh>
}
function Marquee() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#08131f'; ctx.fillRect(0, 0, 1024, 256)
    ctx.strokeStyle = '#729ab7'; ctx.lineWidth = 8; ctx.strokeRect(8, 8, 1008, 240)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#f0f7ff'; ctx.font = '900 146px Arial, sans-serif'
    ctx.fillText('ASTROMECH', 512, 136, 940)
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return <group>
    <Panel at={[0, 2.64, -.14]} size={[1.9, .5, .15]} color="#384653" />
    <mesh position={[0, 2.64, -.059]}><planeGeometry args={[1.78, .445]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
    {[-1, 1].map(side => <Panel key={side} at={[side * .48, 2.31, -.25]} size={[.06, .65, .06]} color="#687784" />)}
    {[-1, 1].map(side => <mesh key={side} position={[0, 2.64 + side * .222, -.045]}><boxGeometry args={[1.5, .014, .015]} /><meshBasicMaterial color="#70bfff" /></mesh>)}
  </group>
}
export function DroidJukebox({ player, onSelect, position = [0, 0, 0], rotation = 0 }: { player: DroidPlayer; onSelect: () => void; position?: [number, number, number]; rotation?: number }) {
  const { playing } = player
  const dome = useRef<Group>(null), bars = useRef<(Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (dome.current) dome.current.rotation.y = Math.sin(t * (playing ? 1.4 : .35)) * (playing ? .24 : .08)
    bars.current.forEach((bar, i) => { if (bar) bar.scale.y = playing ? Math.max(.08, player.spectrum.current[[2, 3, 4, 5, 6, 8, 10, 14, 20][i]] / 180) : .08 })
  })
  return <group position={position} rotation={[0, rotation, 0]} onClick={e => { e.stopPropagation(); onSelect() }}>
    <Marquee />
    <mesh position={[0, .06, 0]}><cylinderGeometry args={[1.05, 1.12, .12, 32]} /><meshStandardMaterial color="#222c35" metalness={.65} roughness={.62} /></mesh>
    <mesh position={[0, .13, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[.96, .025, 6, 40]} /><meshBasicMaterial color={playing ? '#8bd8ff' : '#345c7b'} /></mesh>
    <mesh position={[0, 1.15, 0]}><cylinderGeometry args={[.58, .58, 1.35, 24]} /><meshStandardMaterial color="#8f9ba6" roughness={.68} metalness={.3} /></mesh>
    <mesh position={[0, 1.83, 0]}><cylinderGeometry args={[.6, .6, .12, 24]} /><meshStandardMaterial color="#254c91" metalness={.6} roughness={.58} /></mesh>
    <group ref={dome} position={[0, 1.88, 0]}>
      <mesh><sphereGeometry args={[.59, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#9ca9b5" metalness={.75} roughness={.62} /></mesh>
      <Panel at={[0, .22, .51]} size={[.3, .24, .1]} />
      <mesh position={[.025, .24, .59]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.093, .11, .09, 16]} /><meshStandardMaterial color="#0c1723" metalness={.8} roughness={.15} /></mesh>
      <mesh position={[.025, .25, .646]}><sphereGeometry args={[.025, 8, 8]} /><meshBasicMaterial color="#8cddff" /></mesh>
      <Panel at={[-.27, .08, .51]} size={[.13, .065, .04]} color={playing ? '#76c5f2' : '#a45336'} />
      <Panel at={[.28, .1, .51]} size={[.1, .1, .06]} color="#c1cad0" />
      {[0, 1, 2, 3].map(i => <group key={i} rotation={[0, i * Math.PI / 2, 0]}><Panel at={[0, .41, .32]} size={[.2, .16, .13]} /></group>)}
    </group>
    {[-1, 1].map(side => <group key={side} position={[side * .76, 0, 0]}>
      <Panel at={[0, 1.18, 0]} size={[.27, 1.3, .32]} color="#788793" />
      <Panel at={[0, 1.18, .18]} size={[.23, .98, .04]} />
      <Panel at={[0, 1.18, .205]} size={[.15, .76, .02]} color="#101b27" />
      {Array.from({ length: 8 }, (_, i) => <Panel key={i} at={[0, .87 + i * .088, .222]} size={[.125, .025, .022]} color="#5a7189" />)}
      <mesh position={[0, 1.67, .19]}><boxGeometry args={[.12, .018, .015]} /><meshBasicMaterial color="#8ed3ff" /></mesh>
      <Panel at={[0, .27, .14]} size={[.43, .24, .72]} color="#929ea8" />
      <Panel at={[0, .19, .5]} size={[.3, .08, .04]} color="#254b7c" />
      <mesh position={[0, 1.58, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.21, .21, .32, 12]} /><meshStandardMaterial color="#515f6a" metalness={.65} roughness={.62} /></mesh>
    </group>)}
    {[1.62, 1.43].map(y => <Panel key={y} at={[0, y, .57]} size={[.7, .105, .055]} />)}
    <Panel at={[0, 1.1, .589]} size={[.69, .42, .06]} color="#536a7e" />
    <DroidConsole player={player} />
    {/* Scuffed metal, inset service vents and exposed hardware age the salvaged cabinet. */}
    {[.51, 1.78].map(y => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[.59, .59, .038, 24]} /><meshStandardMaterial color="#586b7c" metalness={.7} roughness={.65} /></mesh>)}
    {[-.31, .31].flatMap(x => [.915, 1.285].map(y => <mesh key={`${x}-${y}`} position={[x, y, .632]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.016, .016, .009, 8]} /><meshStandardMaterial color="#c1c9ce" roughness={.65} metalness={.65} /></mesh>))}
    {Array.from({ length: 11 }, (_, i) => <Panel key={i} at={[(i - 5) * .022, .72, .64]} size={[.009, .19, .012]} color={i % 2 ? '#283743' : '#8093a4'} />)}
    {[-1, 1].map(side => <group key={side}>
      <Panel at={[side * .76, .43, .512]} size={[.26, .04, .01]} color="#455867" />
      {[.86, 1.19, 1.43].map((y, i) => <Panel key={y} at={[side * .51, y, .29]} size={[.025 + i * .012, .007, .015]} color="#c0c9cc" />)}
    </group>)}
    <Panel at={[0, 1.43, .6]} size={[.55, .105, .01]} color="#101e2d" />
    {Array.from({ length: 9 }, (_, i) => <mesh key={i} ref={node => { bars.current[i] = node }} position={[(i - 4) * .056, 1.43, .613]}><boxGeometry args={[.038, .09, .01]} /><meshBasicMaterial color={i < 6 ? '#79c5ff' : '#8cc9ed'} /></mesh>)}
    {[-.3, .3].map(x => <Panel key={x} at={[x, .73, .54]} size={[.14, .28, .08]} color="#234778" />)}
    <mesh position={[0, .72, .57]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.14, .14, .09, 16]} /><meshStandardMaterial color="#131e29" /></mesh>
    {[-.07, 0, .07].map(y => <Panel key={y} at={[0, .72 + y, .63]} size={[.2, .016, .025]} color="#8297a8" />)}
    <pointLight position={[0, 1.5, 1]} color="#70bfff" intensity={playing ? 2 : .6} distance={3} />
  </group>
}
