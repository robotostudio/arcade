'use client'

import dynamic from 'next/dynamic'

const SkeeballHarness = dynamic(() => import('./SkeeballHarness').then((m) => m.SkeeballHarness), {
  ssr: false,
})

export default function SkeeballDevPage() {
  return (
    <main style={{ position: 'fixed', inset: 0, background: '#050406' }}>
      <SkeeballHarness />
    </main>
  )
}
