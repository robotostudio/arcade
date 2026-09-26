'use client'
import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { TRACKS, type DroidPlayer } from './useDroidAudio'

// A real cabinet touchscreen: its UV coordinates select the physical controls.
// The larger companion panel provides the same controls for keyboard users.
export function DroidConsole({ player }: { player: DroidPlayer }) {
  const display = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = 256
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return { canvas, texture }
  }, [])
  useEffect(() => () => display.texture.dispose(), [display])
  useEffect(() => {
    const ctx = display.canvas.getContext('2d')!
    ctx.fillStyle = '#0d1c2b'; ctx.fillRect(0, 0, 512, 256)
    for (let y = 0; y < 256; y += 4) { ctx.fillStyle = y % 8 ? '#00000005' : '#ffffff0a'; ctx.fillRect(0, y, 512, 1) }
    ctx.strokeStyle = '#6386a0'; ctx.lineWidth = 5; ctx.strokeRect(3, 3, 506, 250)
    ctx.fillStyle = '#90c4e8'; ctx.font = '20px monospace'
    ctx.fillText(`${player.playing ? 'ON AIR' : 'STANDBY'} / SELECTION 0${player.track + 1}`, 22, 40)
    ctx.fillStyle = '#b6d8f0'; ctx.font = 'bold 25px monospace'
    ctx.fillText(TRACKS[player.track].name, 22, 93)
    ctx.strokeStyle = '#446781'; ctx.lineWidth = 2
    for (let x = 24; x < 490; x += 15) { ctx.beginPath(); ctx.moveTo(x, 115); ctx.lineTo(x, x % 3 ? 126 : 134); ctx.stroke() }
    ctx.fillStyle = '#8bd4ff'; ctx.fillRect(50 + player.track * 175, 108, 4, 28)
    ctx.fillStyle = '#294d76'; ctx.fillRect(15, 149, 131, 85); ctx.fillRect(160, 149, 139, 85)
    ctx.fillStyle = '#d4e6f2'; ctx.font = 'bold 26px monospace'
    ctx.fillText(player.playing ? 'PAUSE' : 'PLAY', 35, 201); ctx.fillText('NEXT', 190, 201)
    ctx.fillStyle = '#b6d8f0'; ctx.font = '18px monospace'; ctx.fillText('VOLUME', 330, 173)
    ctx.fillStyle = '#344b60'; ctx.fillRect(328, 193, 164, 28)
    ctx.fillStyle = '#7cb3de'; ctx.fillRect(328, 193, 164 * player.volume, 28)
    display.texture.needsUpdate = true
  }, [display, player.playing, player.track, player.volume])
  return <mesh position={[0, 1.1, .632]} onPointerDown={e => e.stopPropagation()} onClick={e => {
    e.stopPropagation()
    if (!e.uv || e.uv.y > .43) return
    if (e.uv.x < .3) player.toggle()
    else if (e.uv.x < .6) player.next()
    else player.setVolume(Math.max(0, Math.min(1, (e.uv.x - .64) / .32)))
  }}><planeGeometry args={[.65, .325]} /><meshBasicMaterial map={display.texture} toneMapped={false} /></mesh>
}
