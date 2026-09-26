// POST { itemId, applied } from the Store's claim: mints the Ticket credit as a Shopify discount
// code and answers { url, code, offGbp }, where url is the Shopify checkout to send the player to.
// All the work and validation is in src/store/checkout.ts; this only speaks HTTP.
import { NextResponse } from 'next/server'
import { CheckoutError, createCheckout, parseCheckoutRequest } from '@/store/checkout'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const claim = parseCheckoutRequest(body)
  if (!claim) return NextResponse.json({ error: 'Expected { itemId: string, applied: integer }' }, { status: 400 })
  try {
    return NextResponse.json(await createCheckout(claim))
  } catch (err) {
    const status = err instanceof CheckoutError ? err.status : 500
    console.error('[store] checkout failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Checkout failed' }, { status })
  }
}
