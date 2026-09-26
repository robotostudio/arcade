'use client'
import { Harness } from '@/world/Harness'
import { WhackMachine, DOCK } from '@/machines/whackamole'
export function WhackHarness() {
  return <Harness title="MOLE PATROL" help="click moles · keys: 7 8 9 / 4 5 6 / 1 2 3 · Space starts" camera={DOCK} machine={props => <WhackMachine position={[0, 0, 0]} {...props} />} />
}
