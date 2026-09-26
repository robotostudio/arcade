'use client'

// Stand-in for Jono's src/world/ArcadeCanvas.tsx (issue 09) so dev harness pages
// show a Machine through the PSX crunch today. Step 1 of docs/research/psx-look.md:
// low-res canvas, no AA, flat (no tone mapping), black background + fog, dim lights.
// `?clean=1` restores a normal dpr for debugging. Import it from a page through a
// next/dynamic ssr:false wrapper; R3F never renders on the server.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'

type Vec3 = [number, number, number]

export type HarnessCanvasProps = {
  children?: ReactNode
  camera?: { position: Vec3; target?: Vec3 }
}

const DEFAULT_POSITION: Vec3 = [0, 2, 6]
const DEFAULT_TARGET: Vec3 = [0, 1, 0]

function readClean() {
  return typeof window !== 'undefined' && window.location.search.includes('clean=1')
}

// Lives inside the Canvas so it runs after CameraControls mounts (makeDefault puts it
// in the R3F store). Frames once; after that the dev owns the camera.
function FrameCamera({ position, target }: { position: Vec3; target: Vec3 }) {
  const controls = useThree((s) => s.controls) as CameraControls | null
  const framed = useRef(false)
  useEffect(() => {
    if (!controls || framed.current) return
    framed.current = true
    controls.setLookAt(...position, ...target, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls])
  return null
}

export function HarnessCanvas({ children, camera }: HarnessCanvasProps) {
  const [clean] = useState(readClean)
  const position = camera?.position ?? DEFAULT_POSITION
  const target = camera?.target ?? DEFAULT_TARGET

  return (
    <Canvas
      dpr={clean ? [1, 1.5] : 0.35}
      flat
      gl={{ antialias: false }}
      style={{ position: 'absolute', inset: 0, ...(clean ? {} : { imageRendering: 'pixelated' }) }}
      camera={{ position, fov: 45 }}
    >
      <color attach="background" args={['#050406']} />
      <fog attach="fog" args={['#050406', 6, 18]} />
      <hemisphereLight args={['#3a4560', '#1a1410', 0.6]} />
      <directionalLight position={[3, 6, 4]} intensity={0.8} color="#9aa6b8" />
      {children}
      <CameraControls makeDefault smoothTime={0.6} />
      <FrameCamera position={position} target={target} />
    </Canvas>
  )
}

// CRT glass (psx-look.md section 5): scanlines + vignette at native resolution.
// Sibling of the canvas, above it and below the HUD. Skipped with ?clean=1.
// Inline styles so the harness stays out of src/app/globals.css (issue 09 owns the real CRT rule).
const CRT_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  background: [
    'repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.35) 2px 3px)', // scanlines
    'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)', // vignette
  ].join(', '),
}
const CRT_GLARE_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'radial-gradient(ellipse at 18% 8%, rgba(255,255,255,0.10), rgba(255,255,255,0) 40%)',
}

export function HarnessCrt() {
  const [clean] = useState(readClean)
  if (clean) return null
  return (
    <div style={CRT_STYLE}>
      <div style={CRT_GLARE_STYLE} />
    </div>
  )
}
