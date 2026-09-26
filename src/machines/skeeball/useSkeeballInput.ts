'use client'

import { useCallback, useEffect, useRef } from 'react'

const LOCK = new Set(['Space', 'Enter', 'NumpadEnter'])

// Edge-triggered lock for the two-press throw. Space / click. Ignores buttons
// so the harness Reset does not also throw. Never binds Escape (the World does).
export function useSkeeballPress(enabled: boolean) {
  const press = useRef(false)
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    if (!enabled) {
      press.current = false
      return
    }
    const fromUi = (target: EventTarget | null) =>
      target instanceof HTMLElement && !!target.closest('button, a, input, textarea')

    const down = (e: KeyboardEvent) => {
      if (!LOCK.has(e.code) || e.repeat) return
      if (fromUi(e.target)) return
      e.preventDefault()
      press.current = true
    }
    const pointer = (e: PointerEvent) => {
      if (e.button !== 0 || fromUi(e.target)) return
      press.current = true
    }
    window.addEventListener('keydown', down)
    window.addEventListener('pointerdown', pointer)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('pointerdown', pointer)
      press.current = false
    }
  }, [enabled])

  return useCallback(() => {
    if (!enabledRef.current || !press.current) {
      press.current = false
      return false
    }
    press.current = false
    return true
  }, [])
}
