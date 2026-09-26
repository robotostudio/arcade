// Shared contract for every Machine. See PLAN.md.
export type MachineProps = {
  position: [number, number, number]
  rotation?: [number, number, number]
  active: boolean                        // true only in play mode for this machine
  onRoundEnd: (ticketsEarned: number) => void
  // Issue 12: the one line the Shell shows for the current phase, "Key: verb" ("Space: drop", "Arrows: aim").
  // A Machine calls it whenever its phase changes and supplies nothing else to the Shell.
  onPrompt?: (prompt: string) => void
}
