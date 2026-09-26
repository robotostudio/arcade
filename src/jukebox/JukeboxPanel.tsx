'use client'
import { TRACKS, type DroidPlayer } from './useDroidAudio'
import './jukebox.css'

export function JukeboxPanel({ player, onClose }: { player: DroidPlayer; onClose?: () => void }) {
  const song = TRACKS[player.track]
  return <section className="droid-player" aria-label="R2-D2 jukebox">
    <div className="droid-player__top"><span><i className={player.playing ? 'droid-live is-playing' : 'droid-live'} /> ASTROMECH SOUND CO.</span>{onClose && <button aria-label="Close jukebox controls" onClick={onClose}>×</button>}</div>
    <div className="droid-player__heading"><h2>R2-D2<span>ANALOG AUDIO</span></h2><span className="droid-player__serial">ASTROMECH SERIES<br />UNIT 02 / EST. 1977</span></div>
    <div className="droid-player__display" aria-live="polite"><span>{player.playing ? 'NOW TRANSMITTING' : 'STANDING BY'} · {song.bpm} BPM</span><strong>{song.name}</strong><p>{song.mood}</p></div>
    <div className="droid-player__dial"><span>STEREO / 3 ORIGINALS</span><span>RECORD 0{player.track + 1}</span></div>
    <div className="droid-player__tracks">{TRACKS.map((track, i) => <button key={track.name} aria-pressed={i === player.track} onClick={() => player.setTrack(i)}><span>A{i + 1}</span>{track.name}<span>{i === player.track ? '●' : '○'}</span></button>)}</div>
    <div className="droid-player__transport"><button className="droid-player__play" onClick={player.toggle}>{player.playing ? 'Ⅱ Pause' : '▶ Play'}</button><button onClick={player.next} aria-label="Next track">Next ↗</button><label>VOL<input aria-label="Jukebox volume" type="range" min="0" max="1" step="0.01" value={player.volume} onChange={e => player.setVolume(Number(e.target.value))} /></label></div>
    {player.error && <p role="alert">{player.error}</p>}
    <footer>ORIGINAL DROID GROOVES <span>{player.playing && player.signal ? '● AUDIO SIGNAL ACTIVE' : player.playing && player.volume === 0 ? '○ VOLUME ZERO' : '○ STANDBY'}</span></footer>
  </section>
}
