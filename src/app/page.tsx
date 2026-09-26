import { RoomCanvas } from '@/world/RoomCanvas'

export default function Page() {
  return (
    <main className="fixed inset-0">
      <RoomCanvas />
      <div className="pointer-events-none absolute left-4 top-4 text-sm font-medium tracking-wide opacity-80">
        Roboto Arcade
      </div>
    </main>
  )
}
