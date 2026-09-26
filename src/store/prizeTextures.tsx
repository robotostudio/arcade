'use client'

// The prize sprites are eight 1024² PNGs. Decoding and uploading one is ~10 ms of main-thread
// work (a lot more on a slow machine), and drei's useTexture uploads the whole set the moment the
// select screen mounts, so opening the Store used to drop frames for a second. Instead the Room
// mounts PrizeTextureWarmup: it fetches the set through the same loader cache the select screen
// reads and uploads one texture per frame while the hub idles. Once resident they stay resident:
// configurePrizeTextures runs before the first upload and never bumps needsUpdate, so the select
// screen's own initTexture pass finds every texture already at its current version.
import { useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { NearestFilter, SRGBColorSpace, TextureLoader, type Texture } from 'three'
import { ITEMS } from './items'

export const PRIZE_URLS = ITEMS.map((i) => `/store/items/${i.image}`)

// Nearest both ways: the sprite is a pixel-art still behind the PS1 crunch, so no mipmaps.
export function configurePrizeTextures(textures: Texture[]) {
  for (const t of textures) {
    if (t.magFilter === NearestFilter) continue
    t.magFilter = NearestFilter
    t.minFilter = NearestFilter
    t.generateMipmaps = false
    t.colorSpace = SRGBColorSpace
  }
}

export function PrizeTextureWarmup() {
  const textures = useLoader(TextureLoader, PRIZE_URLS)
  const next = useRef(0)
  useFrame(({ gl }) => {
    if (next.current >= textures.length) return
    configurePrizeTextures(textures)
    gl.initTexture(textures[next.current++])
  })
  return null
}
