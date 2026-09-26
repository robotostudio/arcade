'use client'

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import { LOOK } from './look/constants'
import { Dither } from './look/Dither'
import './look/crt.css'

type ArcadeCanvasProps = {
  children: React.ReactNode
  camera?: { position: [number, number, number]; fov?: number }
}

// The one Canvas every page and dev harness mounts (issue 09): low-res dpr, no AA, no tone mapping,
// no shadows, lavender fog, soft fluorescent fill, dither pass, restrained CRT overlay.
// ?clean=1 skips the crunch (dpr [1, 1.5], no dither, no overlay) so a bug can be ruled in or out.
export function ArcadeCanvas({ children, camera }: ArcadeCanvasProps) {
  const [clean, setClean] = useState(false)
  useEffect(() => {
    setClean(new URLSearchParams(window.location.search).get('clean') === '1')
  }, [])

  return (
    <>
      <Canvas
        dpr={clean ? LOOK.cleanDpr : LOOK.dpr}
        flat
        gl={{ antialias: false }}
        camera={{ position: camera?.position ?? [0, 7, 12], fov: camera?.fov ?? 45 }}
        style={{ position: 'absolute', inset: 0, imageRendering: clean ? 'auto' : 'pixelated' }}
      >
        <color attach="background" args={[LOOK.void]} />
        <fog attach="fog" args={[LOOK.void, LOOK.fog[0], LOOK.fog[1]]} />
        <hemisphereLight args={[LOOK.hemi.sky, LOOK.hemi.ground, LOOK.hemi.intensity]} />
        <directionalLight position={LOOK.moon.position} color={LOOK.moon.color} intensity={LOOK.moon.intensity} />
        {children}
        {!clean && (
          <EffectComposer multisampling={0}>
            <Dither levels={LOOK.ditherLevels} />
          </EffectComposer>
        )}
      </Canvas>
      <div className="crt" hidden={clean} />
    </>
  )
}
