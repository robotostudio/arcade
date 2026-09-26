# 11 Stack to the Top: a second stacking Machine with Minor and Major prize lines, and a vintage-bundle Store

Type: prototype
Status: resolved
Role: Sne (Room slot: Jono)
Slot: Phase 1 spare time, before Phase 2
Blocked by: none

## Question

A second stacking Machine, **Stack to the Top**, modelled on the real arcade cabinet: yellow bulb marquee, maroon MAJOR PRIZE and MINOR PRIZE banners, blue side columns of circles, a dark red glass face with glowing red squares. Same rules as the Stacker (7 x 15, caps 3/2/1, same speed curve, 1-cell mercy on rows 0-3) plus two prize lines: stacking 10 rows pauses the game with **Take Minor** (Left) or **Go for Major** (Right); no choice after 8 seconds takes Minor. Its Tickets buy vintage clothing bundles in the Store, whose cards copy the Fleek product-card format for fun (no affiliation, not a client; no Fleek name or logo anywhere).

Full plan, decisions and build order: https://claude.ai/code/artifact/eb692fb9-db92-4418-a28f-eb11cae32832

Payouts: 1 Ticket per row placed on a miss (before the Minor line or after risking), 50 for Take Minor, 250 for topping out. Ticket value in the Store changes for every Machine: 1 Ticket = £0.10 off a bundle's total, capped at 50% of the total. The Store sells vintage bundles only; Roboto merch leaves it.

## For Jono: Room slot

`MachineId` now includes `'stacktop'` (`src/arcade/state.ts`, Sne's one line). The Machine is `StackTop` from `src/machines/stacktop/StackTop.tsx` with the shared `MachineProps`; footprint about 2.2 wide x 1.1 deep x 4.6 tall, player at +z, dock `[0, 2.9, 6.6]` looking at `[0, 2.45, 0]`. It needs a fourth station in the Room and `onRoundEnd` wired to `awardTickets('stacktop', n)`. Its HUD is `StackTopHud` in the same folder (client-only; reads `useStackTopHud`).

## Answer

Built on branch `sne-stack-top` (cut from `sne`), harness at `/dev/stack-top`. Played in Chrome on 2026-09-26 with a scripted auto-player driving the real keyboard events; every check in the plan's Verification list passed:

- `pnpm typecheck` and `pnpm build` pass on Node 25.
- `/dev/stacker` is unchanged: 15 rows in a row won 150, no pause at row 10, 8 draw calls.
- `/dev/stack-top`: 10 rows stacked pauses with the 8-second countdown. Left took 50. Right resumed and topping out paid 250 inside the glitter frame; a miss after risking paid 1 per row (10 rows, +10). No choice for 8 seconds took Minor. 15 Space and Enter presses during the pause did nothing. 13 draw calls.
- The `arcade:tickets` balance in localStorage rose by exactly the payout each Round.
- `/dev/store`: nine bundles in three Tier rows of Fleek-format cards. 637 Tickets on Coach bags (£640.25) showed -£63.70 and £576.55 after. On Nike diesel sweatshirts (£44.94) the slider stopped at 224 Tickets (-£22.40, the 50% cap); claiming spent 224 and persisted the tag.

Rules and numbers as shipped:

- Same Stacker rules (7 x 15, caps 3/2/1, `tickMs = max(60, 260 - 14*row)`, 1-cell mercy on rows 0-3) through the shared pure `logic.ts`. `createState(PRIZES)` turns on the prize lines; without it the Stacker is byte-for-byte the same game.
- Minor line: stacking 10 rows enters the `decide` phase. `choose(s, 'take')` pays `PAYOUT.stacktop.minor` (50); `choose(s, 'risk')` resumes; `step()` auto-takes after `decideMs` (8000). `press()` is ignored during the pause. `forfeit()` in the pause takes Minor. `onRoundEnd` still fires exactly once per Round.
- Payouts in `PAYOUT.stacktop`: 1 per row on a miss, 50 Minor, 250 Major.
- Credit in `CREDIT`: 1 Ticket = £0.10 off a bundle's total, capped at 50%. `creditGbp(item, tickets)` and `maxTicketsFor(item)` replace the percentage helpers for every Machine (Claw's 100-Ticket grab is £10 off).
- Cabinet: the whole face (marquee with bulbs and title, MAJOR PRIZE banner, blue circle columns, dark red glass with dim squares, MINOR PRIZE band in the gap under row 10) is one CanvasTexture drawn once on mount; the grid is one instancedMesh painted only when `version` changes; face and cells are unlit so the cabinet reads as the bright island. Deck buttons: white TAKE, red STOP, gold GO.
- HUD (`StackTopHud`): Tumbleword pills and Ticket tiles, the Nico Nico corner countdown over a CSS collage during the pause, the Afterlife MISSED flame banner, the Blingee glitter frame on Major. CSS inline in the component.
- Store shelves show garment piles (3-5 flats in the Tier colour, more for bigger bundles) instead of merch.

Deviations from the plan: `paint()` moved to `src/machines/stacker/grid.ts` as `paintGrid(mesh, state, layout, colors)` instead of being exported from `Stacker.tsx`, because the two cabinets lay rows out differently (the MINOR PRIZE band needs a gap). The HUD store is a factory (`createStackerHud()`), one instance per Machine, so both can live in the Room. `Result.kind` gained `'minor'`.

Not done: the Room slot (Jono, see above), and a preview URL (branch pushed; Vercel builds it).

## Comments
