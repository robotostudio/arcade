'use client'
import { useCallback, useEffect, useRef } from 'react'
import { CLAW } from './constants'
import type { ClawControls } from './clawLogic'

const LEFT = new Set(['ArrowLeft', 'KeyA'])
const RIGHT = new Set(['ArrowRight', 'KeyD'])
const UP = new Set(['ArrowUp', 'KeyW']) // away from player = -z
const DOWN = new Set(['ArrowDown', 'KeyS'])
const DROP = new Set(['Space', 'Enter', 'NumpadEnter'])
// Enter is prevented too so it never activates a focused button while dropping the claw.
const PREVENT = new Set(['Space', 'Enter', 'NumpadEnter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

export function useClawInput(enabled: boolean): () => ClawControls {
  const held = useRef(new Set<string>())
  const drop = useRef(false)
  // Metres of tap travel requested since the last read. A tap is a fixed nudge (CLAW.tapNudge);
  // holding adds continuous travel at CLAW.speed on top.
  const nudge = useRef({ x: 0, z: 0 })
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    if (!enabled) {
      held.current.clear()
      drop.current = false
      nudge.current.x = nudge.current.z = 0
      return
    }
    const down = (e: KeyboardEvent) => {
      if (PREVENT.has(e.code)) e.preventDefault()
      held.current.add(e.code)
      if (e.repeat) return
      if (DROP.has(e.code)) drop.current = true
      if (LEFT.has(e.code)) nudge.current.x -= CLAW.tapNudge
      if (RIGHT.has(e.code)) nudge.current.x += CLAW.tapNudge
      if (UP.has(e.code)) nudge.current.z -= CLAW.tapNudge
      if (DOWN.has(e.code)) nudge.current.z += CLAW.tapNudge
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
      nudge.current.x = nudge.current.z = 0
    }
  }, [enabled])

  return useCallback(() => {
    const n = nudge.current
    if (!enabledRef.current) {
      drop.current = false
      n.x = n.z = 0
      return { dx: 0, dz: 0, nudgeX: 0, nudgeZ: 0, drop: false }
    }
    const h = held.current
    const any = (keys: Set<string>) => {
      for (const k of keys) if (h.has(k)) return true
      return false
    }
    const dx = ((any(RIGHT) ? 1 : 0) - (any(LEFT) ? 1 : 0)) as -1 | 0 | 1
    const dz = ((any(DOWN) ? 1 : 0) - (any(UP) ? 1 : 0)) as -1 | 0 | 1
    const out = { dx, dz, nudgeX: n.x, nudgeZ: n.z, drop: drop.current }
    n.x = n.z = 0
    drop.current = false
    return out
  }, [])
}
