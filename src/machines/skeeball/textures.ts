'use client'

import { useEffect, useMemo } from 'react'
import { MeshBasicMaterial } from 'three'
import { type CanvasDraw, displayFont, useLiveryCanvas } from '@/world/Display'
import { livery } from '@/world/livery'
import { DECAL } from '@/world/look/psx-material'

// Canvas textures drawn in the Livery (issue 12): VT323 at integer px, colours from the table.
// Each redraws once the font resolves and whenever the ?livery=1 panel repaints.
type Draw = CanvasDraw

function useLiveryCanvasMat(draw: Draw, w: number, h: number, transparent = false) {
  const sign = useLiveryCanvas(w, h, draw)
  // Every one of these lies on a snapped box face, so it takes the decal offset (see DECAL).
  const mat = useMemo(() => new MeshBasicMaterial({ map: sign.texture, transparent, ...DECAL }), [sign, transparent])
  useEffect(() => () => mat.dispose(), [mat])
  return mat
}

function bulbs(ctx: CanvasRenderingContext2D, w: number, h: number, fill: string, stroke: string) {
  const r = 13
  for (let x = 30; x < w - 12; x += 36) {
    for (const y of [24, h - 24]) {
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = fill
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = stroke
      ctx.stroke()
    }
  }
}

// The bulb marquee above the Display: dark screen, Accent border and title, cream bulbs and sub-line.
function drawSign(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const t = livery()
  ctx.fillStyle = t.screen
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = t.skeeball
  ctx.lineWidth = 10
  ctx.strokeRect(10, 10, w - 20, h - 20)
  bulbs(ctx, w, h, t.text, t.skeeball)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = t.skeeball
  ctx.font = displayFont(104)
  ctx.fillText('SKEEBALL', w / 2, 116)
  ctx.fillStyle = t.text
  ctx.font = displayFont(40)
  ctx.fillText('9 BALLS', w / 2, 188)
}

export function useSignMat() {
  return useLiveryCanvasMat(drawSign, 1024, 256)
}

// A cup's point value, cream on the dark board.
export function useLabelMat(value: number) {
  const draw = useMemo<Draw>(
    () => (ctx, w, h) => {
      const t = livery()
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = t.text
      ctx.font = displayFont(52)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(value), w / 2, h / 2 + 2)
    },
    [value],
  )
  return useLiveryCanvasMat(draw, 128, 64, true)
}
