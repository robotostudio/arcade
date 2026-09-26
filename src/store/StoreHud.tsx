'use client'

// The Store's thin DOM layer. The select screen itself is built into the counter
// (PrizeSelector, in the scene); this only carries what has to live outside the canvas:
// the keyboard (left/right browse, up/down Tickets, shift = 10, Enter claims; Escape is
// the Room's), the claim toast and a Back button. Plain DOM + Tailwind.
import { useEffect } from 'react'
import { ITEMS, itemAfter, itemById } from './items'
import { useStore } from './state'

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
          className="absolute right-4 top-4 z-10 border border-[#ffe099]/60 bg-[#242044]/95 px-4 py-3 font-mono text-xs uppercase tracking-widest text-[#ffe099] hover:bg-[#393366]"
        >
          Back · Esc
        </button>
      )}
      {toast && (
        <button
          type="button"
          onClick={dismissToast}
          className="absolute bottom-4 left-1/2 z-10 max-w-[min(90vw,44rem)] -translate-x-1/2 border border-emerald-400/60 bg-black/90 px-3 py-2 text-left font-mono text-xs text-emerald-200"
        >
          {toast} <span className="text-white/50">[x]</span>
        </button>
      )}
    </>
  )
}
