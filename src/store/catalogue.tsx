'use client'

// Which picture URLs the Store draws with. Defaults to the bundled files in public/store/items;
// when a page has fetched the Shopify catalogue (src/store/shopify.ts) it mounts <Catalogue>
// around the scene and the Shopify CDN URLs take over before anything below subscribes, so the
// texture warmup and the select screen never load the sprite twice.
import { useState } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { ITEMS, localImages, type Item, type ItemImages } from './items'

export type ImageMap = Record<Item['id'], ItemImages>

type CatalogueState = {
  images: ImageMap
  source: 'local' | 'shopify'
}

const LOCAL: ImageMap = Object.fromEntries(ITEMS.map((i) => [i.id, localImages(i.id)]))

export const useCatalogue = create<CatalogueState>()(() => ({ images: LOCAL, source: 'local' }))

export function imagesFor(id: Item['id']): ItemImages {
  return useCatalogue.getState().images[id] ?? localImages(id)
}

// The sprite (`game`) URL of every Item in ITEMS order: the texture set the select screen shows.
export function usePrizeUrls(): string[] {
  return useCatalogue(useShallow((s) => ITEMS.map((i) => (s.images[i.id] ?? localImages(i.id)).game)))
}

export function Catalogue({ images, children }: { images: ImageMap | null; children: React.ReactNode }) {
  // Set once, before the children's first render, so their initial subscriptions see the final URLs.
  useState(() => {
    if (images) useCatalogue.setState({ images: { ...LOCAL, ...images }, source: 'shopify' })
  })
  return <>{children}</>
}
