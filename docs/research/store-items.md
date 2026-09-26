# Store Item art (digital garments)

Twelve images in `public/items/`, two per garment Jono photographed: `<slug>-psx.jpg` is a 32-bit PS1-style game sprite on black, and `<slug>-render.jpg` is a clean product render on charcoal. Generated from Jono's photos on 2026-09-26. The Items are digital, so no real stock is implied.

| Slug | What it is |
|---|---|
| `tribal-longsleeve` | Brown long-sleeve with an embroidered spiral and tie-dye panel |
| `y2k-graphic-longsleeve` | Acid yellow Y2K graphic top with pink flower sleeves |
| `tapestry-vest` | Rust tapestry zip vest with castle, dome and stars |
| `cream-work-jacket` | Cream canvas chore jacket with a teal cord collar |
| `patchwork-jeans` | Wide-leg denim with X strips and rock-style patches |
| `granny-square-jacket` | Sage crochet granny-square jacket with denim trim |

IP note: the real vest has Mickey Mouse on it and the real jeans have 2Pac, AC/DC and Harley-Davidson patches. The art swaps those for a generic moon and generic patches, so nothing trademarked ships in a public demo.

## Use in the Store

Card image (HUD, plain HTML): `<img src={`/items/${slug}-render.jpg`} />`.

In 3D on a shelf, the sprite as a billboard keeps the PSX crunch:

```tsx
const tex = useTexture(`/items/${slug}-psx.jpg`)
tex.magFilter = tex.minFilter = THREE.NearestFilter
tex.colorSpace = THREE.SRGBColorSpace
<Billboard><mesh><planeGeometry args={[0.6, 0.6]} /><meshBasicMaterial map={tex} /></mesh></Billboard>
```

Black backgrounds disappear against the dark Store counter, so no alpha is needed. Add an optional `image?: string` (the slug) to `Item` in `src/store/items.ts`.
