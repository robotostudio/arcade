'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraControls } from '@react-three/drei'

type CameraControlsImpl = React.ComponentRef<typeof CameraControls>
import { ArcadeCanvas } from '@/world/ArcadeCanvas'
import { ClawMachine } from '@/machines/claw'

export function ClawHarness() {
  const [tickets, setTickets] = useState(0)
  const [rounds, setRounds] = useState(0)
  const [last, setLast] = useState<string>('-')
  const [resetKey, setResetKey] = useState(0)
  const controls = useRef<CameraControlsImpl>(null)
  // Harness owns the camera: look down into the tray at about 30 degrees.
  useEffect(() => {
    const id = setInterval(() => {
      if (!controls.current) return
      controls.current.setLookAt(0, 4.6, 7.4, 0, 1.8, 0, false)
      clearInterval(id)
    }, 50)
    return () => clearInterval(id)
  }, [])

  const onRoundEnd = useCallback((earned: number) => {
    setTickets((t) => t + earned)
    setRounds((r) => r + 1)
    setLast(earned > 0 ? `WON +${earned}` : 'missed')
  }, [])

  return (
    <>
      <ArcadeCanvas camera={{ position: [0, 4.6, 7.4], fov: 40 }}>
        <ClawMachine key={resetKey} position={[0, 0, 0]} active onRoundEnd={onRoundEnd} />
        <CameraControls ref={controls} makeDefault />
      </ArcadeCanvas>
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 10,
          fontFamily: 'ui-monospace, monospace',
          color: '#d8cfc0',
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: 'pre',
        }}
      >
        {`CLAW  arrows move  space drop\ntickets ${tickets}   rounds ${rounds}\nlast    ${last}\n`}
        <button
          onClick={(e) => {
            setResetKey((k) => k + 1)
            setTickets(0)
            setRounds(0)
            setLast('-')
            e.currentTarget.blur()
          }}
          style={{ marginTop: 6, font: 'inherit', color: '#d8cfc0', background: '#1a1410', border: '1px solid #6b1f1f', padding: '2px 10px', cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>
    </>
  )
}
