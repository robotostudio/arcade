# 07 3D Store counter, Roboto merch in White / Blue / Gold tiers, Tickets spent as discounts

Type: prototype
Status: open
Role: Sne
Slot: T+1:00 to 1:45
Blocked by: none

## Question

What does the Store look like and how do the Machines feed it? Every Round pays Tickets into a local balance. The Store is a 3D counter inside the Room: shelves of low-poly Roboto merch with fake but plausible prices, each Item on a ring for its Tier: White = low, Blue = mid, Gold = top and shining (emissive + metallic + a sparkle if cheap, flat yellow if not). Selecting the counter opens a Store HUD panel: pick an Item, apply Tickets, see the Discount, "claim" it.

Sne also owns the real `src/arcade/state.ts` (the contract in PLAN.md) and the Ticket economy: payout per Machine so all three feel worth playing; Tickets-to-discount rate (start: 1 Ticket = 1%, cap 50%) and whether Gold is steeper; what claiming does (fake confirmation, a shelf in the Room, or a toast).

Placeholder Items. White: sticker pack, enamel pin, tote. Blue: hoodie, cap, mug set. Gold: "Free site audit", "A day of Roboto".

Sne starts once the Stacker is playable (about T+1:00), on branch `sne`, harness page `src/app/dev/store/page.tsx`.

Feedback from the other roles at each checkpoint. Answer records: payout table, discount rate and caps, Tier prices, ring recipe. Merged to `main`.

## Comments
