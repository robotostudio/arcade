'use client'

// A cabinet's Display (issue 12, ADR 0001): a canvas texture in Whack-a-Mole's style, drawn in VT323 at
// integer sizes, NearestFilter, dark screen, Accent border, title in the Accent. It carries the Machine's
// numbers; a Machine never draws play information anywhere else.
//
//   const display = useDisplay({ accent: 'skeeball', title: 'SKEEBALL' })
//   useFrame(() => display.show({ headline: `BALL ${n} / 9`, footer: `SCORE ${score}` }))
//   <Display handle={display} position={[0, 1.8, -.8]} width={1.8} />
import { useEffect, useMemo } from 'react'
import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three'
import { type AccentKey, bodyMaterial, livery, useLivery } from './livery'

const W = 1024
const H = 384
const FALLBACK = 'monospace'
let family = FALLBACK
let loading: Promise<string> | null = null

// The VT323 family name next/font generated, once its glyphs are in the document (layout.tsx sets the variable).
export function loadDisplayFont(): Promise<string> {
  if (loading) return loading
  loading = (async () => {
    const declared = getComputedStyle(document.body).getPropertyValue('--font-vt323').trim()
    if (!declared) return family
    try {
      await document.fonts.load(`40px ${declared}`)
      family = declared
    } catch {}
    return family
  })()
  return loading
}

export const displayFont = (px: number) => `${px}px ${family}`

export type DisplayContent = {
  headline?: string
  sub?: string
  footer?: string
  lines?: string[] // instead of headline/sub/footer: rows spaced evenly under the title
}

export type DisplayHandle = {
  texture: CanvasTexture
  show: (content: DisplayContent) => void
  redraw: () => void
  dispose: () => void
}

function draw(ctx: CanvasRenderingContext2D, accent: AccentKey, title: string, content: DisplayContent) {
  const t = livery()
  ctx.fillStyle = t.screen
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = t[accent]
  ctx.lineWidth = 12
  ctx.strokeRect(12, 12, W - 24, H - 24)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = t[accent]
  ctx.font = displayFont(96)
  ctx.fillText(title, W / 2, 112)
  ctx.fillStyle = t.text
  if (content.lines) {
    const step = Math.floor((H - 150) / (content.lines.length + 1))
    ctx.font = displayFont(52)
    content.lines.forEach((line, i) => ctx.fillText(line, W / 2, 150 + step * (i + 1) + 18))
    return
  }
  ctx.font = displayFont(64)
  if (content.headline) ctx.fillText(content.headline, W / 2, content.sub ? 208 : 228)
  ctx.font = displayFont(40)
  if (content.sub) ctx.fillText(content.sub, W / 2, 268)
  ctx.globalAlpha = 0.75
  ctx.font = displayFont(36)
  if (content.footer) ctx.fillText(content.footer, W / 2, 330)
  ctx.globalAlpha = 1
}

export function createDisplay(accent: AccentKey, title: string): DisplayHandle {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const texture = new CanvasTexture(canvas)
  texture.minFilter = NearestFilter
  texture.magFilter = NearestFilter
  texture.generateMipmaps = false
  texture.colorSpace = SRGBColorSpace
  let content: DisplayContent = {}
  let key = ''
  const redraw = () => { draw(ctx, accent, title, content); texture.needsUpdate = true }
  redraw()
  loadDisplayFont().then(redraw)
  const unsubscribe = useLivery.subscribe(redraw)
  return {
    texture,
    redraw,
    show: (next) => {
      const nextKey = JSON.stringify(next)
      if (nextKey === key) return
      key = nextKey
      content = next
      redraw()
    },
    dispose: () => { unsubscribe(); texture.dispose() },
  }
}

export function useDisplay({ accent, title }: { accent: AccentKey; title: string }): DisplayHandle {
  const handle = useMemo(() => createDisplay(accent, title), [accent, title])
  useEffect(() => () => handle.dispose(), [handle])
  return handle
}

type DisplayProps = {
  handle: DisplayHandle
  width?: number // the screen; the frame adds a border on every side
  position?: [number, number, number]
  rotation?: [number, number, number]
  frame?: boolean
}

// The screen plane, 8:3, with a dark frame box behind it. Faces +z; rotate the group to aim it.
export function Display({ handle, width = 1.8, position, rotation, frame = true }: DisplayProps) {
  const height = width * (H / W)
  const border = width * 0.06
  return (
    <group position={position} rotation={rotation}>
      {frame && <mesh position={[0, 0, -0.07]} material={bodyMaterial('frame')}><boxGeometry args={[width + border * 2, height + border * 2, 0.14]} /></mesh>}
      {/* 2 cm proud of the frame: the frame's vertex snap jitters its depth, and from a close, steep camera 1 mm loses. */}
      <mesh position={[0, 0, 0.02]}><planeGeometry args={[width, height]} /><meshBasicMaterial map={handle.texture} /></mesh>
    </group>
  )
}
