'use client'

// Store counter inside the dev HarnessCanvas. Loaded only through StoreHarness (ssr: false).
import { HarnessCanvas } from '@/arcade/dev/HarnessCanvas'
import { StoreCounter } from './StoreCounter'

export function StoreHarnessScene() {
  return (
    <HarnessCanvas camera={{ position: [0, 2.6, 6], target: [0, 1.2, 0] }}>
      <StoreCounter position={[0, 0, 0]} />
    </HarnessCanvas>
  )
}
