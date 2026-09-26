'use client'

import dynamic from 'next/dynamic'

// R3F must never render on the server: dynamic import with ssr: false.
const Room = dynamic(() => import('./Room').then((m) => m.Room), { ssr: false })

export function RoomCanvas() {
  return <Room />
}
