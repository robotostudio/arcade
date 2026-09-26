'use client'

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { LOOK } from './look/constants'
import { Dither } from './look/Dither'
import './look/crt.css'

type ArcadeCanvasProps = {
  children: React.ReactNode
  camera?: { position: [number, number, number]; fov?: number }
}

// The low-res canvas must upscale by a whole number of device pixels, or the 4x4 dither and the
// scanlines beat against uneven pixel blocks and the whole picture shimmers as the camera pans
// (LOOK.dpr 0.7 on a 2x display was 2.86 device pixels per canvas pixel). Pick the nearest block
// size at or above the target crunch, and hand it to the CRT overlay so a scanline falls once per
// canvas row.
function crunch(devicePixelRatio: number) {
  const block = Math.max(1, Math.ceil(devicePixelRatio / LOOK.dpr))
  return { dpr: devicePixelRatio / block, block, devicePixelRatio }
}

// The one Canvas every page and dev harness mounts (issue 09): low-res dpr, no AA, no tone mapping,
// no shadows, smoky fog, soft fluorescent fill, bloom on the glow blocks, dither pass, restrained CRT overlay.
// ?clean=1 skips the crunch (dpr [1, 1.5], no dither, no overlay) so a bug can be ruled in or out.
export function ArcadeCanvas({ children, camera }: ArcadeCanvasProps) {
  const [clean, setClean] = useState(false)
  const [pixel, setPixel] = useState(() => crunch(2))
  useEffect(() => {
    setClean(new URLSearchParams(window.location.search).get('clean') === '1')
    const fit = () => setPixel(crunch(window.devicePixelRatio || 1))
    fit()
    window.addEventListener('resize', fit) // a drag to a screen with another pixel ratio fires resize
    return () => window.removeEventListener('resize', fit)
  }, [])
  const crt = { '--px': `${pixel.block / pixel.devicePixelRatio}px`, '--dev': `${1 / pixel.devicePixelRatio}px` } as React.CSSProperties

  return (
    <>
      <Canvas
        dpr={clean ? LOOK.cleanDpr : pixel.dpr}
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
            <Bloom mipmapBlur luminanceThreshold={LOOK.bloom.threshold} luminanceSmoothing={LOOK.bloom.smoothing} intensity={LOOK.bloom.intensity} radius={LOOK.bloom.radius} />
            <Dither levels={LOOK.ditherLevels} />
          </EffectComposer>
        )}
      </Canvas>
      <div className="crt" style={crt} hidden={clean} />
    </>
  )
}
