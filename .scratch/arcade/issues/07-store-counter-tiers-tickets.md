# 07 3D Store counter, Roboto merch in White / Blue / Gold tiers, Tickets spent as discounts

Type: prototype
Status: resolved
Role: Sne
Slot: T+1:00 to 1:45
Blocked by: none

## Question

What does the Store look like and how do the Machines feed it? Every Round pays Tickets into a local balance. The Store is a 3D counter inside the Room: shelves of low-poly Roboto merch with fake but plausible prices, each Item on a ring for its Tier: White = low, Blue = mid, Gold = top and shining (emissive + metallic + a sparkle if cheap, flat yellow if not). Selecting the counter opens a Store HUD panel: pick an Item, apply Tickets, see the Discount, "claim" it.

Sne also owns the real `src/arcade/state.ts` (the contract in PLAN.md) and the Ticket economy: payout per Machine so all three feel worth playing; Tickets-to-discount rate (start: 1 Ticket = 1%, cap 50%) and whether Gold is steeper; what claiming does (fake confirmation, a shelf in the Room, or a toast).

Placeholder Items. White: sticker pack, enamel pin, tote. Blue: hoodie, cap, mug set. Gold: "Free site audit", "A day of Roboto".

Sne starts once the Stacker is playable (about T+1:00), on branch `sne`, harness page `src/app/dev/store/page.tsx`.

Feedback from the other roles at each checkpoint. Answer records: payout table, discount rate and caps, Tier prices, ring recipe. Merged to `main`.

## Answer

On branch `sne` at `/dev/store` (`src/store/`). Real `src/arcade/state.ts`: contract unchanged, plus `lastRound`, `clearLastRound()`, `resetTickets()`; Tickets persist to localStorage `arcade:tickets`, claims to `arcade:claimed`. Tested in Chrome on 2026-09-26: +50, select, Max, Claim, toast, balance drop, "claimed" tag.

**Payout table** (`PAYOUT` in `src/arcade/economy.ts`): Stacker 10 per row placed, 150 on a win. Claw 100 per prize in the chute. Skeeball Round score / 5, rounded. Tune in that one file.

**Discount** (`DISCOUNT`, helpers `discountPct` and `maxTicketsFor`): White and Blue 1 Ticket = 1%, cap 50% (50 Tickets). Gold is steeper: 0.5% per Ticket, cap 50% (100 Tickets). Applied Tickets clamp to min(balance, cap); price after = price x (100 - pct) / 100 to the penny.

**Items and Tier prices (GBP)**: White: sticker pack 6, enamel pin 9, tote bag 14. Blue: hoodie 48, cap 24, mug set 30. Gold: Free site audit 1500, A day of Roboto 2400. Blurbs in `items.ts`.

**Claiming**: `spendTickets(applied)`, id added to `claimed` (persisted), toast "Claimed: <name> at N% off, now £X. Roboto will be in touch.", applied resets. Not enough Tickets = toast, no spend. No shelf in the Room; the tag in the HUD is the record.

**Ring recipe**: torus [0.26, 0.035, 8, 16] laid flat 0.03 above the shelf. White Lambert #e8e4d8, Blue Lambert #3d7bff, Gold Standard #f2c14e metalness 0.9 roughness 0.25 emissive #7a5a00 at 0.6, tilted 0.18 rad and spun at 0.7 rad/s; Gold Items bob 0.05 at 1.6 rad/s. Selected ring scales 1.15 with a spinning marker cube above. Counter: body 6 x 1.2 x 1.5, shelves at y 1.45 / 2.2 / 2.95, sign at 3.75. Cut to flat yellow Lambert if the Standard material fights the psxify pass in Phase 2.

**For Jono's integration**: `StoreCounter({ position, rotation?, onSelect? })` and `StoreHud` are the two exports; `StoreHud` must sit inside an ssr:false boundary because it reads the persisted balance. Harness pages use `src/arcade/dev/HarnessCanvas.tsx`, a stand-in for `ArcadeCanvas` (issue 09); swap the import when the wrapper lands and delete the stand-in.

## Comments

- Daniel (2026-09-26): Keep the Ticket economy and the grade bands already on the shelves. Public listings are snapshotted in `docs/research/fleek-catalog.json` (no Fleek API; see `docs/research/fleek-api.md`).
- Change the claim: Tickets from a Round unlock one unit of the chosen listing at the per-piece price, not the whole bundle. Claim stays a fake confirmation plus a link to the listing.
- Cut real checkout.

- Jono (2026-09-26, T+1:00): Claw pays 100 Tickets per successful grab (`CLAW.payout`, issue 04). At 1 Ticket = 1% with a 50% cap, one grab maxes any Discount. Sne owns the rate; either lower the rate (e.g. 1 Ticket = 0.25%) or tell me to drop the Claw payout. Keep / Change / Cut is yours.

- Jono (2026-09-26, after the deadline): Keep the economy; the claim now goes to real checkout at Jono's request. Change: I edited `src/store/state.ts` (`claim()` is async, new `checkingOut` flag) so Enter POSTs `/api/checkout`, which mints a single-use Shopify discount code for the credit (`src/store/checkout.ts`, Admin API, `write_discounts` added to the Arcade sync app) and sends the page to the cart's checkoutUrl; Tickets are spent only after the URL is in hand. Cut: the "nothing ships" toast.
