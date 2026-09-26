'use client'
import dynamic from 'next/dynamic'
const WhackHarness = dynamic(() => import('./WhackHarness').then(m => m.WhackHarness), { ssr: false })
export default function WhackDevPage() {
  return <main style={{ position: 'fixed', inset: 0, background: '#050406' }}><WhackHarness /></main>
}
