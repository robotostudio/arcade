'use client'

// The Store's thin DOM layer. The select screen itself is built into the counter
// (PrizeSelector, in the scene); this only carries what has to live outside the canvas:
// the keyboard (left/right browse, up/down Tickets, shift = 10, Enter claims and leaves for
// Shopify checkout with the credit applied; Escape is the Room's), the claim toast and a Back button. Plain DOM + Tailwind, in the Shell's
// surface and text colours and its typeface (VT323 through the `vt` class, 20 px).
import { useEffect } from 'react'
import { SHELL } from '@/world/Shell'
import { ITEMS, itemAfter, itemById } from './items'
import { useStore } from './state'

const shell = { background: SHELL.surface, color: SHELL.text, borderColor: SHELL.edge } as const

export function StoreHud({ onClose }: { onClose?: () => void }) {
  const toast = useStore((s) => s.toast)
  const dismissToast = useStore((s) => s.dismissToast)

  useEffect(() => {
    if (!itemById(useStore.getState().selected)) useStore.getState().select(ITEMS[0].id)
    const keydown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const { select, apply, claim, applied, selected } = useStore.getState()
      const jump = event.shiftKey ? 10 : 1
      switch (event.key) {
        case 'ArrowLeft': select(itemAfter(selected, -1).id); break
        case 'ArrowRight': select(itemAfter(selected, 1).id); break
        case 'ArrowUp': apply(applied + jump); break
        case 'ArrowDown': apply(applied - jump); break
        case 'Enter': claim(); break
        default: return
      }
      event.preventDefault()
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [])

  return (
    <>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={shell}
          className="vt absolute right-4 top-4 z-10 border px-4 py-2 text-[20px] leading-none hover:brightness-125"
        >
          Esc: back
        </button>
      )}
      {toast && (
        <button
          type="button"
          onClick={dismissToast}
          style={shell}
          className="vt absolute bottom-4 left-1/2 z-10 max-w-[min(90vw,44rem)] -translate-x-1/2 border px-4 py-2 text-left text-[20px] leading-none hover:brightness-125"
        >
          {toast} <span className="opacity-50">[x]</span>
        </button>
      )}
    </>
  )
}
