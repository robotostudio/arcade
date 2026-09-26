'use client'
import { useEffect, useRef, useState } from 'react'
import { claimJukeboxAudio } from './musicFocus'
import { createDroidSynth } from './synth'

export const TRACKS = [
  { name: 'Astromech Afterhours', mood: 'French-house chords. Neon arcade nights.', bpm: 124, notes: [0, 1, 2, -1, 1, 2, 3, 2, 0, -1, 2, 1, 3, 2, 1, -1], bass: [33, 41, 36, 43], thirds: [3, 4, 4, 4] },
  { name: 'Binary Sunset FM', mood: 'Dreamy melodic house from the outer rim.', bpm: 120, notes: [0, -1, 2, 3, -1, 2, 1, -1, 2, -1, 3, 2, 1, -1, 0, -1], bass: [38, 34, 41, 36], thirds: [3, 4, 4, 4] },
  { name: 'Hyperdrive Disco', mood: 'Punchy arcade EDM. Engage the hyperdrive.', bpm: 128, notes: [0, 2, 1, 2, 3, 2, 1, -1, 0, 2, 3, 2, 1, 2, 3, 2], bass: [40, 36, 43, 38], thirds: [3, 4, 4, 4] },
] as const

// Original synthesized loops; audio starts only after a user gesture.
export function useDroidAudio() {
  const [playing, setPlaying] = useState(false)
  const [track, setTrack] = useState(0)
  const [volume, setVolume] = useState(.35)
  const [error, setError] = useState('')
  const [signal, setSignal] = useState(false)
  const spectrum = useRef(new Uint8Array(256))
  const audio = useRef<AudioContext | null>(null)
  const master = useRef<GainNode | null>(null)
  const volumeRef = useRef(volume)
  volumeRef.current = volume
  useEffect(() => {
    if (playing) return claimJukeboxAudio()
  }, [playing])
  const play = async () => {
    try {
      audio.current ??= new AudioContext()
      await audio.current.resume()
      if (audio.current.state !== 'running') throw new Error('Unavailable')
      setError(''); setPlaying(true)
    } catch { setError('Audio could not start. Try pressing Play again.') }
  }
  useEffect(() => {
    if (master.current && audio.current) master.current.gain.setTargetAtTime(volume * .3, audio.current.currentTime, .025)
  }, [volume])
  useEffect(() => {
    const context = audio.current
    if (!playing || !context) return
    const engine = createDroidSynth(context, TRACKS[track], track, volumeRef.current)
    master.current = engine.master
    const meter = window.setInterval(() => {
      engine.analyser.getByteFrequencyData(spectrum.current)
      setSignal(spectrum.current.some(value => value > 15))
    }, 80)
    return () => {
      window.clearInterval(meter)
      engine.dispose(); master.current = null
      spectrum.current.fill(0); setSignal(false)
    }
  }, [playing, track])
  useEffect(() => () => { void audio.current?.close() }, [])
  return { playing, track, volume, error, signal, spectrum, setVolume, setTrack, toggle: () => { if (playing) setPlaying(false); else void play() }, next: () => setTrack(i => (i + 1) % TRACKS.length) }
}
export type DroidPlayer = ReturnType<typeof useDroidAudio>
