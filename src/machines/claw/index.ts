export { ClawMachine } from './ClawMachine'

// Camera dock for Play mode, relative to the machine origin (floor centre, player at +z).
// The World composes STATIONS[id] + DOCK for the fly-to (Daniel, issue 03).
// The eye stays under the 5.3 m ceiling grid; at 5.4 it sat inside it and a grid bar could fill the view.
export const DOCK = {
  position: [0, 5, 6.1] as const,
  target: [0, 1.6, 0] as const,
}
