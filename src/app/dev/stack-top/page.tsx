import { StackTopHarness } from '@/machines/stacktop/StackTopHarness'

// Dev harness for Stack to the Top (issue 11): Space stops, Left takes Minor, Right goes for Major.
export default function StackTopDevPage() {
  return (
    <main className="fixed inset-0 bg-black">
      <StackTopHarness />
    </main>
  )
}
