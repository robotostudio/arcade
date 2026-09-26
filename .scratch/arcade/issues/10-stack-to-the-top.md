# 10 Stack to the Top: a second stacking Machine with Minor and Major prize lines, and a vintage-bundle Store

Type: prototype
Status: open
Role: Sne (Room slot: Jono)
Slot: Phase 1 spare time, before Phase 2
Blocked by: none

## Question

A second stacking Machine, **Stack to the Top**, modelled on the real arcade cabinet: yellow bulb marquee, maroon MAJOR PRIZE and MINOR PRIZE banners, blue side columns of circles, a dark red glass face with glowing red squares. Same rules as the Stacker (7 x 15, caps 3/2/1, same speed curve, 1-cell mercy on rows 0-3) plus two prize lines: stacking 10 rows pauses the game with **Take Minor** (Left) or **Go for Major** (Right); no choice after 8 seconds takes Minor. Its Tickets buy vintage clothing bundles in the Store, whose cards copy the Fleek product-card format for fun (no affiliation, not a client; no Fleek name or logo anywhere).

Full plan, decisions and build order: https://claude.ai/code/artifact/eb692fb9-db92-4418-a28f-eb11cae32832

Payouts: 1 Ticket per row placed on a miss (before the Minor line or after risking), 50 for Take Minor, 250 for topping out. Ticket value in the Store changes for every Machine: 1 Ticket = £0.10 off a bundle's total, capped at 50% of the total. The Store sells vintage bundles only; Roboto merch leaves it.

## For Jono: Room slot

`MachineId` now includes `'stacktop'` (`src/arcade/state.ts`, Sne's one line). The Machine is `StackTop` from `src/machines/stacktop/StackTop.tsx` with the shared `MachineProps`; footprint about 2.2 wide x 1.1 deep x 4.6 tall, player at +z, dock `[0, 2.6, 5]` looking at `[0, 2.2, 0]`. It needs a fourth station in the Room and `onRoundEnd` wired to `awardTickets('stacktop', n)`. Its HUD is `StackTopHud` in the same folder (client-only; reads `useStackTopHud`).

## Answer

## Comments
