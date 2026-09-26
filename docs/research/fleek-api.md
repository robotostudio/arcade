# Fleek has no public API and no MCP

Captured 2026-09-26 for the arcade Store (Sne owns the counter). This is a static snapshot of pages Fleek already publishes. It is not a live integration and not a scrape of a private app API.

## What does not exist

[Fleek](https://www.joinfleek.com/home) (joinfleek.com, vintage wholesale) does not publish a developer API, SDK, OpenAPI spec, or MCP server.

- [apis.io/providers/fleek](https://apis.io/providers/fleek/) profiles **0 APIs**, agent readiness **0.0**, MCP **no** (scored 2026-09-24).
- Support is a help center: [support.joinfleek.com](https://support.joinfleek.com/hc/en-us).
- [dev-shop.joinfleek.com](https://www.dev-shop.joinfleek.com/) is an under-construction page.
- Do not confuse this company with fleek.xyz (unrelated hosting).

Do not call undocumented app endpoints. If the team wants a live catalog, ask Alex Nikityuk (Fleek, in the building) for a CSV.

## What we snapshotted

Public product pages: `https://www.joinfleek.com/products/<slug>`.

Each page shows title, per-piece price, bundle total, grade (A / B / C and mixes AB, BC, ABC), department, category, brands, sizes when present, and whether the photos are exact or representative. Fleek's own condition copy: mixed grades are AB 70/30, BC 60/40, ABC 30/40/30, with up to a 10% grading margin.

Twelve listings are in [fleek-catalog.json](./fleek-catalog.json). Prices there are the USD-formatted numbers returned by a fetch of the public HTML on 2026-09-26. The storefront localizes: the same Coach LX337 URL, opened in a London browser the same day, showed **£58.37/pc (£350.22)** and **Sold Out**, not the fetched $82.79. Screenshots in [fleek-refs/](./fleek-refs/) are that London view of Premium Coach Bags LX337: the hero, the £58.37 / 6 pcs price block, and the Grade AB row. Use the JSON for the demo; do not treat either number as a quote.

Homepage sale cards on [joinfleek.com/home](https://www.joinfleek.com/home) (fetched the same day) show the bulk vs per-piece hook without stable product URLs in the HTML, so they are not rows in the JSON. Examples from that fetch: Coach bags $932 / $37.28 per piece, True Religion mixed jeans $216 / $24.04, Y2K tops $155 / $4.99.

## How the Store should use it

One Round unlocks **one unit** at `pricePerPieceUsd`, not the bundle. Claim links to `url`. White / Blue / Gold can follow grade: C or BC low, ABC mid, A or AB high. Sne decides the bands.
