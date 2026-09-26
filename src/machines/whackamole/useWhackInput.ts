'use client'
import { useEffect, useRef } from 'react'
import type { Input } from './whackLogic'

export function useWhackInput(enabled: boolean) {
  const pending = useRef<Input>({ start: false, hits: [] })
  const hovered = useRef(4)
  const hit = (hole: number) => {
    if (!enabled) return
    hovered.current = hole
    pending.current.start = true
    pending.current.hits.push(hole)
  }
  useEffect(() => {
    const clear = () => { pending.current = { start: false, hits: [] } }
    clear()
    const key = (event: KeyboardEvent) => {
      if (!enabled || event.repeat || event.altKey || event.ctrlKey || event.metaKey || (event.target instanceof HTMLElement && (event.target.isContentEditable || /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)))) return
      const digit = /^(?:Digit|Numpad)([1-9])$/.exec(event.code)
      if (event.code === 'Space' || digit) {
        event.preventDefault()
        pending.current.start = true
        if (digit) {
          const hole = Number(digit[1]) - 1
          hovered.current = hole
          pending.current.hits.push(hole)
        }
      }
    }
    window.addEventListener('keydown', key)
    window.addEventListener('blur', clear)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('blur', clear); clear() }
  }, [enabled])
  return { hovered, hit, read: () => { const input = pending.current; pending.current = { start: false, hits: [] }; return input } }
}
