'use client'

import { useEffect, useMemo } from 'react'
import { CanvasTexture, LinearFilter, MeshBasicMaterial, NearestFilter, SRGBColorSpace } from 'three'

const FONT = 'Impact, "Arial Black", "Helvetica Neue", Arial, sans-serif'
const YELLOW = '#f2c230'
const MAROON = '#7a1020'

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  draw(canvas.getContext('2d')!, w, h)
  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  map.magFilter = NearestFilter
  map.minFilter = LinearFilter
  map.generateMipmaps = false
  return map
}

function bulbs(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = 14
  for (let x = 28; x < w - 10; x += 36) {
    for (const y of [22, h - 22]) {
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = '#fff6d0'
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = '#e07a10'
      ctx.stroke()
    }
  }
}

export function useSignMat() {
  const map = useMemo(
    () =>
      canvasTexture((ctx, w, h) => {
        ctx.fillStyle = YELLOW
        ctx.fillRect(0, 0, w, h)
        bulbs(ctx, w, h)
        ctx.fillStyle = MAROON
        ctx.fillRect(0, h * 0.72, w, h * 0.28)
        ctx.font = `bold 78px ${FONT}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('SKEE-BALL', w / 2, h * 0.4)
        ctx.fillStyle = YELLOW
        ctx.font = `bold 36px ${FONT}`
        ctx.fillText('9 BALLS', w / 2, h * 0.86)
      }, 1024, 256),
    [],
  )
  const mat = useMemo(() => new MeshBasicMaterial({ map }), [map])
  useEffect(
    () => () => {
      map.dispose()
      mat.dispose()
    },
    [map, mat],
  )
  return mat
}

export function useLabelMat(value: number) {
  const map = useMemo(
    () =>
      canvasTexture((ctx, w, h) => {
        ctx.clearRect(0, 0, w, h)
        ctx.fillStyle = YELLOW
        ctx.font = `bold 52px ${FONT}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(value), w / 2, h / 2 + 2)
      }, 128, 64),
    [value],
  )
  const mat = useMemo(() => new MeshBasicMaterial({ map, transparent: true }), [map])
  useEffect(
    () => () => {
      map.dispose()
      mat.dispose()
    },
    [map, mat],
  )
  return mat
}
