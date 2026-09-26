import { Catalogue } from '@/store/catalogue'
import { StoreHarness } from '@/store/StoreHarness'
import { fetchShopifyImages } from '@/store/shopify'

// Dev harness for the Store (issue 07): counter, CRT glass, Store HUD, and a dev bar
// to add or reset Tickets without playing a Machine.
export default async function StoreDevPage() {
  const images = await fetchShopifyImages()
  return (
    <main className="fixed inset-0 bg-black">
      <Catalogue images={images}>
        <StoreHarness />
      </Catalogue>
    </main>
  )
}
