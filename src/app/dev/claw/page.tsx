'use client'

import dynamic from 'next/dynamic'

const ClawHarness = dynamic(() => import('./ClawHarness').then((m) => m.ClawHarness), { ssr: false })

export default function ClawDevPage() {
  return (
    <main style={{ position: 'fixed', inset: 0, background: '#050406' }}>
      <ClawHarness />
    </main>
  )
}
