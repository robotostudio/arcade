'use client'

// Client wrapper for the Store harness page: R3F never renders on the server, and
// the HUD reads the persisted Ticket balance, so the whole scene (canvas, CRT,
// HUD, dev bar) comes in through next/dynamic with ssr: false (same shape as StackerHarness).
import dynamic from 'next/dynamic'

const StoreHarnessScene = dynamic(() => import('./StoreHarnessScene').then((m) => m.StoreHarnessScene), {
  ssr: false,
})

export function StoreHarness() {
  return <StoreHarnessScene />
}
