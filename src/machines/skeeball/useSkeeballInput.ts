'use client'
import { useCallback, useEffect, useRef } from 'react'
import type { SkeeControls } from './skeeballLogic'

const PRESS = new Set(['Space', 'Enter', 'NumpadEnter'])

/** True when the pointer went down on a button (or inside one), so the harness Reset still works. */
function onButton(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('button') !== null
}

/**
 * Edge-triggered press for the two-stage aim/power input. Space, Enter, NumpadEnter or a primary
 * pointerdown anywhere on the window counts once; the flag clears on read and whenever disabled.
 */
export function useSkeeballInput(enabled: boolean): () => SkeeControls {
  const press = useRef(false)
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    if (!enabled) {
      press.current = false
      return
    }
    const down = (e: KeyboardEvent) => {
      if (!PRESS.has(e.code)) return
      // Enter is prevented too so it never activates a focused button while locking aim or power.
      e.preventDefault()
      if (e.repeat) return
      press.current = true
    }
    const pointer = (e: PointerEvent) => {
      if (e.button !== 0) return
      if (onButton(e.target)) return
      press.current = true
    }
    const blur = () => {
      press.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('pointerdown', pointer)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('pointerdown', pointer)
      window.removeEventListener('blur', blur)
      press.current = false
    }
  }, [enabled])

  return useCallback(() => {
    if (!enabledRef.current) {
      press.current = false
      return { press: false }
    }
    const out = { press: press.current }
    press.current = false
    return out
  }, [])
}
