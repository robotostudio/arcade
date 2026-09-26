// Shared contract for every Machine. See PLAN.md.
export type MachineProps = {
  position: [number, number, number]
  rotation?: [number, number, number]
  active: boolean                        // true only in play mode for this machine
  onRoundEnd: (ticketsEarned: number) => void
}
