import { Intro } from '@/intro/Intro'
import { Catalogue } from '@/store/catalogue'
import { fetchShopifyImages } from '@/store/shopify'
import { RoomCanvas } from '@/world/RoomCanvas'

export default async function Page() {
  const images = await fetchShopifyImages()
  return (
    <main className="fixed inset-0">
      <Catalogue images={images}>
        <RoomCanvas />
        <Intro />
      </Catalogue>
    </main>
  )
}
