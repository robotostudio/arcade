'use client'

// Client wrapper for the dev harness page: R3F never renders on the server,
// so the scene (canvas + HUD) comes in through next/dynamic with ssr: false.
import dynamic from 'next/dynamic'

const StackerHarnessScene = dynamic(
  () => import('./StackerHarnessScene').then((m) => m.StackerHarnessScene),
  { ssr: false },
)

export function StackerHarness() {
  return <StackerHarnessScene />
}
