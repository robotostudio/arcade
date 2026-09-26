export { ClawMachine } from './ClawMachine'

// Camera dock for Play mode, relative to the machine origin (floor centre, player at +z).
// The World composes STATIONS[id] + DOCK for the fly-to (Daniel, issue 03).
export const DOCK = {
  position: [0, 5.4, 6.4] as const,
  target: [0, 1.6, 0] as const,
}
