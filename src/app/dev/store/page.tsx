import { StoreHarness } from '@/store/StoreHarness'

// Dev harness for the Store (issue 07): counter, CRT glass, Store HUD, and a dev bar
// to add or reset Tickets without playing a Machine.
export default function StoreDevPage() {
  return (
    <main className="fixed inset-0 bg-black">
      <StoreHarness />
    </main>
  )
}
