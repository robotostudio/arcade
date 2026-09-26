import { create } from 'zustand'

// Temporary audio ownership, separate from the user's persistent mute choice.
export const useMusicFocus = create<{ jukeboxUsers: number }>(() => ({ jukeboxUsers: 0 }))

export function claimJukeboxAudio() {
  useMusicFocus.setState(s => ({ jukeboxUsers: s.jukeboxUsers + 1 }))
  let released = false
  return () => {
    if (released) return
    released = true
    useMusicFocus.setState(s => ({ jukeboxUsers: Math.max(0, s.jukeboxUsers - 1) }))
  }
}
