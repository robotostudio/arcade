'use client'
import { ArcadeCanvas } from '@/world/ArcadeCanvas'
import { OrbitControls } from '@react-three/drei'
import { DroidJukebox } from '@/jukebox/DroidJukebox'
import { JukeboxPanel } from '@/jukebox/JukeboxPanel'
import { useDroidAudio } from '@/jukebox/useDroidAudio'
import { SoundtrackToggle } from '@/world/Soundtrack'

export default function JukeboxPreview() {
  const player = useDroidAudio()
  return <main className="droid-preview">
    <div className="droid-preview__scene"><ArcadeCanvas camera={{ position: [2.7, 2.8, 6.4], fov: 38 }}>
      <color attach="background" args={['#0b111a']} />
      <ambientLight intensity={.5} /><directionalLight position={[3, 5, 4]} intensity={1.8} color="#d6e4ef" /><directionalLight position={[-4, 2, -1]} intensity={1.4} color="#4d89d9" />
      <DroidJukebox player={player} onSelect={player.toggle} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.01, 0]}><circleGeometry args={[8, 32]} /><meshStandardMaterial color="#171021" metalness={.05} roughness={.85} /></mesh>
      <OrbitControls target={[0, 1.4, 0]} enablePan={false} minDistance={4} maxDistance={8} maxPolarAngle={Math.PI / 2} />
    </ArcadeCanvas></div>
    <div className="droid-preview__title">ROBOTO ARCADE / LISTENING STATION<a href="/">← Back to the arcade</a><div className="droid-default-audio"><SoundtrackToggle /><span>{player.playing ? 'ROOM MUSIC PAUSED · DROID ON AIR' : 'ROOM SOUNDTRACK'}</span></div></div>
    <div className="droid-preview__panel"><JukeboxPanel player={player} /></div>
  </main>
}
