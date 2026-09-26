// Read the catalogue back the way the app does (Storefront API, image #1 = render, image #2 = game)
// and print what each Item resolves to.
//   node --env-file=.env.local scripts/shopify-check.mts
import { ITEMS } from '../src/store/items.ts'

const domain = process.env.SHOPIFY_STORE_DOMAIN
const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
if (!domain || !token) {
  console.error('Set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN')
  process.exit(1)
}
const query = `{\n${ITEMS.map((item, i) => `  p${i}: product(handle: ${JSON.stringify(item.id)}) { title images(first: 2) { nodes { url } } }`).join('\n')}\n}`
const res = await fetch(`https://${domain}/api/2025-07/graphql.json`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
  body: JSON.stringify({ query }),
})
const json = (await res.json()) as { data?: Record<string, { title: string; images: { nodes: { url: string }[] } } | null>; errors?: unknown }
if (json.errors) throw new Error(JSON.stringify(json.errors))
ITEMS.forEach((item, i) => {
  const p = json.data?.[`p${i}`]
  const urls = p?.images.nodes.map((n) => n.url) ?? []
  console.log(item.id, urls.length >= 2 ? `\n  render ${urls[0]}\n  game   ${urls[1]}` : '  (missing on Shopify, app falls back to local files)')
})
