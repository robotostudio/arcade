// Push the Store's catalogue (src/store/items.ts) to Shopify. One product per Item, handle = Item
// id, two images in a fixed order: `<id>-render.png` first (the storefront's product photo) and
// `<id>-game.png` second (the sprite the arcade reads back through src/store/shopify.ts). Prices,
// grade, tier, pieces and the HUD details ride along as tags and `arcade.*` metafields. Re-running
// updates in place: productSet syncs by handle.
//
//   node --env-file=.env.local scripts/shopify-sync.mts
//
// Needs SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN (a custom app token with
// write_products, write_files and write_publications).
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { ITEMS, type Item } from '../src/store/items.ts'

const API = '2025-07'
const domain = process.env.SHOPIFY_STORE_DOMAIN
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
if (!domain || !token) {
  console.error('Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN (node --env-file=.env.local ...)')
  process.exit(1)
}
const ITEM_DIR = path.resolve(import.meta.dirname, '../public/store/items')

type Json = Record<string, unknown>

async function admin<T = Json>(query: string, variables: Json = {}): Promise<T> {
  const res = await fetch(`https://${domain}/admin/api/${API}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token! },
    body: JSON.stringify({ query, variables }),
  })
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] }
  if (!res.ok || json.errors?.length) throw new Error(`Admin API ${res.status}: ${JSON.stringify(json.errors ?? json)}`)
  return json.data as T
}

// Upload one PNG through a staged upload; returns the resourceUrl productSet accepts as originalSource.
async function upload(file: string): Promise<string> {
  const filename = path.basename(file)
  const size = (await stat(file)).size
  const staged = await admin<{ stagedUploadsCreate: { stagedTargets: { url: string; resourceUrl: string; parameters: { name: string; value: string }[] }[]; userErrors: { message: string }[] } }>(
    `mutation Stage($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    { input: [{ resource: 'IMAGE', filename, mimeType: 'image/png', httpMethod: 'POST', fileSize: String(size) }] },
  )
  const errs = staged.stagedUploadsCreate.userErrors
  if (errs.length) throw new Error(`stagedUploadsCreate: ${errs.map((e) => e.message).join('; ')}`)
  const target = staged.stagedUploadsCreate.stagedTargets[0]
  const form = new FormData()
  for (const p of target.parameters) form.append(p.name, p.value)
  form.append('file', new Blob([await readFile(file)], { type: 'image/png' }), filename)
  const res = await fetch(target.url, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`upload ${filename}: ${res.status} ${await res.text()}`)
  return target.resourceUrl
}

function productInput(item: Item, render: string, game: string) {
  const text = (value: string) => ({ type: 'single_line_text_field', value })
  const int = (value: number) => ({ type: 'number_integer', value: String(value) })
  return {
    handle: item.id,
    title: item.title,
    status: 'ACTIVE',
    productType: 'Vintage bundle',
    vendor: 'Fleekade',
    tags: ['arcade', `tier:${item.tier}`, `grade:${item.grade}`],
    descriptionHtml: `<p>${item.pieces} piece${item.pieces === 1 ? '' : 's'}, grade ${item.grade}. ${item.era}, ${item.origin}. ${item.fabric}.</p>`,
    files: [
      { originalSource: render, contentType: 'IMAGE', alt: `${item.title} (product photo)`, filename: `${item.id}-render.png` },
      { originalSource: game, contentType: 'IMAGE', alt: `${item.title} (arcade sprite)`, filename: `${item.id}-game.png` },
    ],
    productOptions: [{ name: 'Title', position: 1, values: [{ name: 'Default Title' }] }],
    variants: [{ price: item.priceGbp.toFixed(2), optionValues: [{ optionName: 'Title', name: 'Default Title' }] }],
    metafields: [
      { namespace: 'arcade', key: 'pieces', ...int(item.pieces) },
      { namespace: 'arcade', key: 'grade', ...text(item.grade) },
      { namespace: 'arcade', key: 'tier', ...text(item.tier) },
      { namespace: 'arcade', key: 'era', ...text(item.era) },
      { namespace: 'arcade', key: 'origin', ...text(item.origin) },
      { namespace: 'arcade', key: 'fabric', ...text(item.fabric) },
      { namespace: 'arcade', key: 'stats', type: 'json', value: JSON.stringify(item.stats) },
    ],
  }
}

async function publicationIds(): Promise<string[]> {
  try {
    const data = await admin<{ publications: { nodes: { id: string; name: string }[] } }>(
      `{ publications(first: 20) { nodes { id name } } }`,
    )
    return data.publications.nodes.map((p) => p.id)
  } catch (err) {
    console.warn('  publications unreadable (add read_publications to see them):', (err as Error).message)
    return []
  }
}

async function main() {
  const pubs = await publicationIds()
  for (const item of ITEMS) {
    process.stdout.write(`${item.id}: uploading… `)
    const render = await upload(path.join(ITEM_DIR, `${item.id}-render.png`))
    const game = await upload(path.join(ITEM_DIR, `${item.id}-game.png`))
    const data = await admin<{ productSet: { product: { id: string; handle: string } | null; userErrors: { field: string[]; message: string }[] } }>(
      `mutation Sync($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
        productSet(input: $input, identifier: $identifier, synchronous: true) {
          product { id handle }
          userErrors { field message }
        }
      }`,
      { input: productInput(item, render, game), identifier: { handle: item.id } },
    )
    const errs = data.productSet.userErrors
    if (errs.length || !data.productSet.product) throw new Error(`productSet ${item.id}: ${JSON.stringify(errs)}`)
    const id = data.productSet.product.id
    if (pubs.length) {
      const pub = await admin<{ publishablePublish: { userErrors: { message: string }[] } }>(
        `mutation Publish($id: ID!, $input: [PublicationInput!]!) {
          publishablePublish(id: $id, input: $input) { userErrors { field message } }
        }`,
        { id, input: pubs.map((publicationId) => ({ publicationId })) },
      )
      const perrs = pub.publishablePublish.userErrors
      if (perrs.length) console.warn(`\n  publish ${item.id}:`, perrs.map((e) => e.message).join('; '))
    }
    console.log(`synced ${id}`)
  }
  console.log(`\n${ITEMS.length} products synced to ${domain}. Verify: node --env-file=.env.local scripts/shopify-check.mts`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
