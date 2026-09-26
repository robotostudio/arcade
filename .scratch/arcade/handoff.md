# Handoff (written T+0:30, 2026-09-26 11:10 BST, by Jono's planning session)

Read after PLAN.md and the map. This is the state of play plus the gaps in the plan, each with a proposed resolution and an owner. Resolve a gap by adding the rule to the issue named, then delete the line here.

## State

- `main` is live at https://arcade-beta-eight.vercel.app (issue 01 resolved: Next 16 + R3F + rapier + zustand + Tailwind, state stub, placeholder Room with `STATIONS`).
- The look is decided (Bloodborne PSX demake): [docs/research/psx-look.md](../../docs/research/psx-look.md), refs in `docs/research/refs/`. Issue 09 (Jono, 15 min) builds the `ArcadeCanvas` wrapper; it is the next thing on `main`.
- Remote has **no `sne` or `daniel` branch** at T+0:27. Phase 1 slots for Stacker and Skeeball are slipping before they start; both should begin by pulling `main` after issue 09 lands so their harness pages use the wrapper.

## Gaps, blocking now (fold into issue 09 as rules)

2. **Who renders `<Physics>`: decided by the Claw (T+0:40).** Each physics Machine wraps its own `<Physics timeStep={1/60} paused={!active}>` inside its root group; **the Room and the Harness mount none.** Separate rapier worlds are fine because Machines never interact, and `paused` makes Room mode cheap. Skeeball copies this. Stacker has no physics at all.
3. **Camera docks per Machine.** Daniel's fly-to needs a dock per station; Machines are built blind to the camera by people who know their cabinet's shape. Rule: each Machine module exports `DOCK: { offset: [x, y, z]; look: [x, y, z] }` relative to its `position`, cabinet facing +z; Daniel's camera composes `STATIONS[id] + DOCK`. Envelope: a cabinet fits the placeholder box (2 wide, 3 tall, 2 deep).
4. **Selecting a Machine and Escape.** Nobody owns the click. Rule: the Room wraps each Machine in `<group onClick={() => enter(id)}>` in Room mode; Machines ignore all pointer and keyboard input while `active` is false and never bind Escape (Daniel's world listener does, calling `exit()`).
5. **Round lifecycle after `onRoundEnd`.** Unspecified whether the Machine resets, exits, or waits. Proposal: `active` flipping true starts a Round; after `onRoundEnd` the Machine shows its own result for ~2 s, then idles until any press starts a new Round (calling `onRoundEnd` again for that Round). Daniel's HUD shows Round-end feedback by watching the `tickets` delta, so no extra state is needed.

## Gaps, decide by checkpoint 1 (T+1:00)

6. **Store HUD mount point** crosses folders: Sne writes `src/store/StoreHud.tsx`, Daniel's HUD shell in `src/hud/` mounts it when `mode.kind === 'store'`, and Daniel's docks include a `store` dock at the counter. Put in issues 03 and 07.
7. **Payout vs discount maths.** 1 Ticket = 1 %, cap 50 %, but a single Claw grab pays 100. One grab maxes any discount; the Store is over after one win. Sne: either rate 0.25 %/Ticket or Claw pays 25 with a 60 % fail roll. Issue 07.
8. **Preview URLs need a Vercel login** (issue 01 answer). Feedback rounds happen on previews. Either turn deployment protection off for previews in project settings now, or do all feedback on `main`'s production URL. Jono.

## Gaps, minor (only if ahead)

9. **Tickets persistence.** CONTEXT.md says `localStorage`; the stub does not persist. Sne: zustand `persist` with `partialize` to `tickets` only.
10. **Fonts.** The look wants a pixel font for the HUD and signage. `next/font/google` (Press Start 2P or VT323) is self-hosted at build, no runtime CDN. drei `Text` fetches its default font from a CDN at runtime; put a `.woff` in `public/fonts/` for signage. Sne, issue 03.
11. **Sound, juice, attract mode** have no owner (map: Not yet specified). If ahead at 2:35, Daniel (HUD) takes a win sting and screen flash on `onRoundEnd`.

## Not gaps, checked

- New files under `src/app/dev/` are tracked normally (`.gitignore` is fine).
- `postprocessing@6.39.5` / `@react-three/postprocessing@3.1.2` peers fit the pins.
- `dpr` below 1 passes through fiber unclamped; pointer picking uses CSS pixels and is unaffected.
