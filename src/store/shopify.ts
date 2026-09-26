// Server side: the Shopify Storefront read of the Store's pictures. Each Item is a Shopify
// product whose handle is the Item id and whose images are, in order, the render and the game
// sprite (see items.ts). Missing env, a network error or a product without both images falls
// back to the bundled files for that Item, so the arcade always has something to show.
//
// Env (set by the Vercel Shopify integration, pulled with `vercel env pull`):
//   SHOPIFY_STORE_DOMAIN             e.g. fleekade.myshopify.com
//   SHOPIFY_STOREFRONT_ACCESS_TOKEN  public Storefront API token
// scripts/shopify-sync.mts pushes the catalogue up; this file only reads it.
import { ITEMS, type Item, type ItemImages } from './items'
import type { ImageMap } from './catalogue'

export const SHOPIFY_API_VERSION = '2025-07'

export function shopifyConfigured(): boolean {
  return Boolean(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN)
}

type ProductNode = { handle: string; images: { nodes: { url: string }[] } } | null

const alias = (i: number) => `p${i}`

const QUERY = `query ArcadeCatalogue {
${ITEMS.map((item, i) => `  ${alias(i)}: product(handle: ${JSON.stringify(item.id)}) { handle images(first: 2) { nodes { url } } }`).join('\n')}
}`

export async function fetchShopifyImages(): Promise<ImageMap | null> {
  if (!shopifyConfigured()) return null
  const domain = process.env.SHOPIFY_STORE_DOMAIN!
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!
  try {
    const res = await fetch(`https://${domain}/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
      body: JSON.stringify({ query: QUERY }),
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error(`Storefront API ${res.status}`)
    const json = (await res.json()) as { data?: Record<string, ProductNode>; errors?: { message: string }[] }
    if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '))
    const images: Partial<Record<Item['id'], ItemImages>> = {}
    ITEMS.forEach((item, i) => {
      const nodes = json.data?.[alias(i)]?.images.nodes ?? []
      if (nodes.length >= 2) images[item.id] = { render: nodes[0].url, game: nodes[1].url }
    })
    return images as ImageMap
  } catch (err) {
    console.warn('[store] Shopify catalogue unavailable, using bundled images:', err)
    return null
  }
}
