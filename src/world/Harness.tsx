'use client'

// Dev harness template (team handoff gap 1). A harness page is then a few lines:
//
//   <Harness title="SKEEBALL" help="drag aim  space throw" camera={DOCK}
//            machine={(props) => <SkeeballMachine position={[0, 0, 0]} {...props} />} />
//
// It gives every Machine the same thing: ArcadeCanvas (the PSX look, ?clean=1 to turn it off),
// CameraControls framed once on the Machine's DOCK, the Machine at the origin with `active` true,
// and a corner readout of tickets / rounds / last result with a Reset that remounts the Machine.
// The harness owns the camera; Machines never touch it. No <Physics> here: each physics
// Machine mounts its own, paused when inactive (issue 03).
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { ArcadeCanvas } from './ArcadeCanvas'
import { SHELL } from './Shell'

type Vec3 = readonly [number, number, number]

// Same shape every Machine exports as DOCK (relative to its origin, player at +z).
export type Dock = { position: Vec3; target: Vec3 }

export type HarnessMachineProps = {
  active: true
  onRoundEnd: (tickets: number) => void
}

type HarnessProps = {
  title: string
  help: string
  camera: Dock
  fov?: number
  machine: (props: HarnessMachineProps) => ReactNode
}

// Runs inside the Canvas so it sees CameraControls once makeDefault has put it in the store.
// Frames once, then the dev owns the camera (drag to orbit).
export function FrameCamera({ position, target }: Dock) {
  const controls = useThree((s) => s.controls) as CameraControls | null
  const framed = useRef(false)
  useEffect(() => {
    if (!controls || framed.current) return
    framed.current = true
    controls.setLookAt(position[0], position[1], position[2], target[0], target[1], target[2], false)
  }, [controls, position, target])
  return null
}

export function Harness({ title, help, camera, fov = 40, machine }: HarnessProps) {
  const [tickets, setTickets] = useState(0)
  const [rounds, setRounds] = useState(0)
  const [last, setLast] = useState('-')
  const [resetKey, setResetKey] = useState(0)

  const onRoundEnd = useCallback((earned: number) => {
    setTickets((t) => t + earned)
    setRounds((r) => r + 1)
    setLast(earned > 0 ? `WON +${earned}` : 'missed')
  }, [])

  return (
    <>
      <ArcadeCanvas camera={{ position: [...camera.position], fov }}>
        <group key={resetKey}>{machine({ active: true, onRoundEnd })}</group>
        <CameraControls makeDefault smoothTime={0.6} />
        <FrameCamera position={camera.position} target={camera.target} />
      </ArcadeCanvas>
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 10,
          fontFamily: 'var(--font-vt323), monospace',
          color: SHELL.text,
          fontSize: 20,
          lineHeight: 1.3,
          whiteSpace: 'pre',
        }}
      >
        {`${title}  ${help}\ntickets ${tickets}   rounds ${rounds}\nlast    ${last}\n`}
        <button
          onClick={(e) => {
            setResetKey((k) => k + 1)
            setTickets(0)
            setRounds(0)
            setLast('-')
            e.currentTarget.blur()
          }}
          style={{
            marginTop: 6,
            font: 'inherit',
            color: SHELL.text,
            background: SHELL.surface,
            border: `1px solid ${SHELL.edge}`,
            padding: '2px 10px',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
      </div>
    </>
  )
}
