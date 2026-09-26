'use client'

// Client wrapper for the dev harness page: R3F never renders on the server,
// so the scene (canvas + HUD) comes in through next/dynamic with ssr: false.
import dynamic from 'next/dynamic'

const StackTopHarnessScene = dynamic(
  () => import('./StackTopHarnessScene').then((m) => m.StackTopHarnessScene),
  { ssr: false },
)

export function StackTopHarness() {
  return <StackTopHarnessScene />
}
