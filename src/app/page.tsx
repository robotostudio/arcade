import { Intro } from '@/intro/Intro'
import { RoomCanvas } from '@/world/RoomCanvas'

export default function Page() {
  return (
    <main className="fixed inset-0">
      <RoomCanvas />
      <Intro />
    </main>
  )
}
