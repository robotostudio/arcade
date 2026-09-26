// Server side: turn a Store claim into a Shopify checkout with the Ticket credit already on it.
// Never import this from the client: it uses the Admin token.
//
// One claim = one single-use discount code. The server recomputes the credit from the Item and
// the Ticket count (src/arcade/economy.ts), so the client can only ever choose how many Tickets
// to apply, not how much money comes off. The code is a fixed amount scoped to that one product,
// good for one use inside CODE_TTL, created with the Admin API (`write_discounts` on the Arcade
// sync app). Then a Storefront cart is built for the product's variant with the code attached and
// its checkoutUrl is what the arcade sends the player to.
//
// Env: SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_ACCESS_TOKEN (see shopify.ts) and
// SHOPIFY_ADMIN_ACCESS_TOKEN (server only; .env.local and the Vercel project).
import { creditGbp, maxTicketsFor } from '@/arcade/economy'
import { itemById, type Item } from './items'
import { SHOPIFY_API_VERSION } from './shopify'

export type CheckoutRequest = { itemId: Item['id']; applied: number }
export type CheckoutResult = { url: string; code: string; offGbp: number }

// A code lives this long after it is minted; the player has left for checkout by then or never will.
const CODE_TTL_MS = 24 * 60 * 60 * 1000

export class CheckoutError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export function checkoutConfigured(): boolean {
  return Boolean(
    process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
  )
}

// The request body as the client sends it, or null when it is not a well-formed claim.
export function parseCheckoutRequest(body: unknown): CheckoutRequest | null {
  if (!body || typeof body !== 'object') return null
  const { itemId, applied } = body as Record<string, unknown>
  if (typeof itemId !== 'string' || typeof applied !== 'number' || !Number.isInteger(applied)) return null
  return { itemId, applied }
}

type Json = Record<string, unknown>
type GqlResponse<T> = { data?: T; errors?: { message: string }[] }

async function gql<T>(url: string, headers: Record<string, string>, query: string, variables: Json): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => ({}))) as GqlResponse<T>
  if (!res.ok || json.errors?.length || !json.data) {
    throw new CheckoutError(`Shopify ${res.status}: ${json.errors?.map((e) => e.message).join('; ') ?? 'no data'}`, 502)
  }
  return json.data
}

function storefront<T>(query: string, variables: Json): Promise<T> {
  return gql<T>(
    `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`,
    { 'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN! },
    query,
    variables,
  )
}

function admin<T>(query: string, variables: Json): Promise<T> {
  return gql<T>(
    `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN! },
    query,
    variables,
  )
}

// Codes read like a ticket stub: ARCADE-XXXXXX, unambiguous glyphs only.
function mintCode(): string {
  const glyphs = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return `ARCADE-${Array.from(bytes, (b) => glyphs[b % glyphs.length]).join('')}`
}

type ProductLookup = { product: { id: string; variants: { nodes: { id: string }[] } } | null }
type DiscountCreate = { discountCodeBasicCreate: { codeDiscountNode: { id: string } | null; userErrors: { message: string }[] } }
type CartCreate = {
  cartCreate: { cart: { checkoutUrl: string; discountCodes: { code: string; applicable: boolean }[] } | null; userErrors: { message: string }[] }
}

export async function createCheckout({ itemId, applied }: CheckoutRequest): Promise<CheckoutResult> {
  if (!checkoutConfigured()) throw new CheckoutError('Shopify is not configured', 503)
  const item = itemById(itemId)
  if (!item) throw new CheckoutError(`Unknown Item ${itemId}`, 400)
  if (applied <= 0 || applied > maxTicketsFor(item)) throw new CheckoutError('Tickets out of range for this Item', 400)
  const offGbp = creditGbp(item, applied)

  const lookup = await storefront<ProductLookup>(
    `query ArcadeCheckoutProduct($handle: String!) { product(handle: $handle) { id variants(first: 1) { nodes { id } } } }`,
    { handle: item.id },
  )
  const productId = lookup.product?.id
  const variantId = lookup.product?.variants.nodes[0]?.id
  if (!productId || !variantId) throw new CheckoutError(`Item ${item.id} is not in the Shopify catalogue`, 502)

  const code = mintCode()
  const startsAt = new Date()
  const created = await admin<DiscountCreate>(
    `mutation ArcadeCheckoutDiscount($discount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $discount) {
        codeDiscountNode { id }
        userErrors { field code message }
      }
    }`,
    {
      discount: {
        title: `Arcade: ${applied} Tickets on ${item.title} (${code})`,
        code,
        startsAt: startsAt.toISOString(),
        endsAt: new Date(startsAt.getTime() + CODE_TTL_MS).toISOString(),
        usageLimit: 1,
        appliesOncePerCustomer: true,
        customerSelection: { all: true },
        customerGets: {
          value: { discountAmount: { amount: offGbp.toFixed(2), appliesOnEachItem: false } },
          items: { products: { productsToAdd: [productId] } },
        },
        combinesWith: { orderDiscounts: false, productDiscounts: false, shippingDiscounts: true },
      },
    },
  )
  const discountErrors = created.discountCodeBasicCreate.userErrors
  if (discountErrors.length || !created.discountCodeBasicCreate.codeDiscountNode) {
    throw new CheckoutError(`Discount not created: ${discountErrors.map((e) => e.message).join('; ')}`, 502)
  }

  const cart = await storefront<CartCreate>(
    `mutation ArcadeCheckoutCart($lines: [CartLineInput!]!, $codes: [String!]) {
      cartCreate(input: { lines: $lines, discountCodes: $codes }) {
        cart { checkoutUrl discountCodes { code applicable } }
        userErrors { field message }
      }
    }`,
    { lines: [{ merchandiseId: variantId, quantity: 1 }], codes: [code] },
  )
  const cartErrors = cart.cartCreate.userErrors
  const node = cart.cartCreate.cart
  if (cartErrors.length || !node) throw new CheckoutError(`Cart not created: ${cartErrors.map((e) => e.message).join('; ')}`, 502)
  if (!node.discountCodes.some((d) => d.code === code && d.applicable)) {
    throw new CheckoutError(`Code ${code} did not apply to the cart`, 502)
  }
  return { url: node.checkoutUrl, code, offGbp }
}
