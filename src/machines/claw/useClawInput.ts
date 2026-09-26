'use client'
import { useCallback, useEffect, useRef } from 'react'
import type { ClawInput } from './clawLogic'

const LEFT = new Set(['ArrowLeft', 'KeyA'])
const RIGHT = new Set(['ArrowRight', 'KeyD'])
const UP = new Set(['ArrowUp', 'KeyW']) // away from player = -z
const DOWN = new Set(['ArrowDown', 'KeyS'])
const DROP = new Set(['Space', 'Enter', 'NumpadEnter'])
const PREVENT = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

export function useClawInput(enabled: boolean): () => Omit<ClawInput, 'prizeInReach'> {
  const held = useRef(new Set<string>())
  const drop = useRef(false)
  // Keys pressed since the last read: a tap shorter than a frame still nudges the head once.
  const tapped = useRef(new Set<string>())
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    if (!enabled) {
      held.current.clear()
      drop.current = false
      return
    }
    const down = (e: KeyboardEvent) => {
      if (PREVENT.has(e.code)) e.preventDefault()
      held.current.add(e.code)
      tapped.current.add(e.code)
      if (DROP.has(e.code) && !e.repeat) drop.current = true
    }
    const up = (e: KeyboardEvent) => {
      held.current.delete(e.code)
    }
    const blur = () => held.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      held.current.clear()
      drop.current = false
    }
  }, [enabled])

  return useCallback(() => {
    if (!enabledRef.current) {
      drop.current = false
      tapped.current.clear()
      return { dx: 0, dz: 0, drop: false }
    }
    const h = held.current
    const tp = tapped.current
    const any = (keys: Set<string>) => {
      for (const k of keys) if (h.has(k) || tp.has(k)) return true
      return false
    }
    const dx = ((any(RIGHT) ? 1 : 0) - (any(LEFT) ? 1 : 0)) as -1 | 0 | 1
    const dz = ((any(DOWN) ? 1 : 0) - (any(UP) ? 1 : 0)) as -1 | 0 | 1
    tp.clear()
    const d = drop.current
    drop.current = false
    return { dx, dz, drop: d }
  }, [])
}
