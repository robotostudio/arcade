# Map: Arcade — low-poly playable web arcade (hackathon)

Tracker: local markdown. Tickets are the files in [`issues/`](./issues/). Issues are pre-assigned by `Role:`; resolve by appending `## Answer`, setting `Status: resolved`, and adding a line under Decisions so far here. Runbook, roles and timeline: [PLAN.md](../../PLAN.md).

## Destination

A low-poly 3D arcade running in the browser at a public Vercel URL: one diorama Room with three playable Machines (Claw left, Stacker centre with the red boxes, Skeeball right). Click a Machine to fly the camera in and play, Escape to fly out. Every Round pays out Tickets; a 3D Store counter in the Room shows Roboto merch in three ring Tiers (White low, Blue mid, shining Gold top) and lets the player spend Tickets as a Discount on any Item. Front-end only. Live and shareable by the deadline; the map is done when it's live.

## Notes

- **Hackathon: quick beats reliable.** Deadline 2026-09-26, three hours from kickoff (about 13:40 BST / 12:40 UTC). No tests, no CI beyond the Vercel build, no backend, no Blender. Cut scope before cutting pace; the cut order is in PLAN.md.
- **Execution override**: sessions build as tickets resolve, not plan-only.
- Three devs async, one branch each, machines assigned by complexity. Each issue file carries a `Role:` line naming the dev. Folder ownership, timeline and the shared state contract are in PLAN.md.

| Dev | Phase 1 machine | Phase 1 also | Phase 2 World slice | Branch |
|---|---|---|---|---|
| Sne | Stacker (simplest) | Store: state, counter, Tiers, Store HUD, economy | Palette, lighting, props | `sne` |
| Daniel | Skeeball (mid) | | Camera fly-to, modes, HUD shell | `daniel` |
| Jono | Claw (high) | Scaffold | Integration, deploys, launch | `jono` |

  Phase 2 (the World build, issue 03) starts at T+1:45 with all three on it.
- Decided by Jono at charting (2026-09-26): browser 3D web app (React Three Fiber on Next.js, Vercel); Roboto Studio brand and R&D piece; Machines are playable; diorama navigation; Skeeball is a two-stage input (sweeping aim arrow, then power); the Store is a 3D counter in the Room, not a 2D route; Items are Roboto merch and services; no external asset files.
- **Look, decided by Jono at T+0:15 (2026-09-26)**: a PS1-era demake in the Bloodborne PSX register (black void, gaslamp gloom, vertex wobble, 15-bit dither, scanlines). Reference frames in `docs/research/refs/`, recipe in [docs/research/psx-look.md](../../docs/research/psx-look.md). This revises the charting-time "no external reference art" line: four screenshots are the look target; still no asset files. The crunch is load-bearing: it hides procedural geometry, so nobody polishes edges.
- Standing stack (revocable if a ticket proves it wrong): Next.js App Router, TypeScript, pnpm, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, zustand, Tailwind for the HUD; Vercel project `arcade` on the roboto team; from T+0:25 also `postprocessing` + `@react-three/postprocessing` for the look. Procedural primitive geometry, Lambert (Gouraud) lit, under the PSX look. Tickets in `localStorage`.
- Glossary lives in [CONTEXT.md](../../CONTEXT.md). Open gaps in the plan, with proposed resolutions and owners: [handoff.md](./handoff.md).
- Feedback: at each PLAN.md checkpoint, play the other roles' previews and append a three-line **Keep / Change / Cut** comment under `## Comments` in their issue file. Owner decides.

## Decisions so far

- [03 World visual revision](issues/03-art-direction-room-camera-hud.md): user requested nostalgic stylized arcade with liminal empty space, superseding the Bloodborne gloom. Jono built the surrounding world; playable machine/store integration remains open.

<!-- one line per resolved ticket: [title](issues/NN-slug.md): gist -->
- [01 Scaffold and hello-room](issues/01-scaffold-and-hello-room.md): live at https://arcade-beta-eight.vercel.app (Vercel `arcade` on roboto, `prj_0c3y5Z3dsJdpPhIFWose9I6uZ3oJ`, GitHub connected, `main` = production; team-scoped and preview URLs need a Vercel login). Next 16.3.6 + pins from 02, state stub + `MachineProps` in place, placeholder Room with `STATIONS` slots. Gotcha: `agentRules: false` in next.config or `next dev` edits AGENTS.md.
- [02 Research: physics and rendering recipe](issues/02-research-physics-and-rendering.md): pins next 16.3.6 / react 19.3 / three 0.186.1 / fiber 9.8.1 / drei 10.7.9 / rapier 2.2.0; Claw fakes the grip (kinematic claw, sensor snap, setBodyType, scripted slip), Skeeball is a real rapier ball with cuboid ramp + sensor rings, Stacker has no physics (interval trim, one instancedMesh); flat-shaded palette with hemisphere + one shadow directional, `shadows="percentage"`, dpr [1, 1.5], drei CameraControls `setLookAt(..., true)` for the fly-to, `enabled={false}` in Play mode. Details: docs/research/r3f-physics-recipe.md.
- [03 World build](issues/03-art-direction-room-camera-hud.md) (art direction part, set early; the wrapper is [issue 09](issues/09-look-psx-canvas-and-crt.md)): Bloodborne PSX demake look. Low-res canvas (`dpr 0.35`, `image-rendering: pixelated`, no AA, no tone mapping, no shadow maps), Lambert Gouraud materials with a vertex-snap `onBeforeCompile` patch, black background + fog, one custom dither+posterise effect via `@react-three/postprocessing` 3.1.2 / `postprocessing` 6.39.5, CSS scanline/vignette overlay at native res, `?clean=1` off switch. Overrides the flat-shaded/shadowed rendering bits of 02. Recipe: docs/research/psx-look.md.
- [04 Claw machine playable round](issues/04-claw.md): kinematic snap plus a scripted slip roll. The nearest prize centre within grabRadius 0.22 + 0.04 of the mouth is grabbed. Slip is rolled at 0.15/s during rise and carry. Win = the chute sensor catches a prize; payout 100. speed 1.0, floorY 1.3, a round is about 5.5 s. Each machine has its own prize registry, and physics settles for 1.5 s, then pauses while inactive. Harness /dev/claw.
- [06 Stacker](issues/06-stacker.md): playable at `/dev/stacker`, no physics; 7x15 grid, width caps 3/2/1, `tickMs = max(60, 260 - 14*row)`, 1-cell mercy on rows 0-3, 10 per row / 150 win, `onRoundEnd` once (forfeit pays on deactivate).
- [07 Store](issues/07-store-counter-tiers-tickets.md): state.ts real with localStorage Tickets; economy in `src/arcade/economy.ts` (Stacker 10/row 150 win, Claw 100, Skeeball score/5; 1 Ticket = 1% cap 50%, Gold 0.5%/Ticket); 3D counter with White/Blue/Gold rings and Store HUD at `/dev/store`; claim = spend + toast + persisted tag.

## Not yet specified

- Sound and juice (screen shake, particles, win fanfare): which moments earn it, once each Machine's loop exists.
- Touch controls per Machine: only once each Machine's input is settled.
- Attract mode: Machines animating while unselected.
- Share card for a Round result.

## Out of scope

- Backend, auth, leaderboards, multiplayer, ecommerce backend, checkout, payments, real inventory. The Store is a front-end showpiece.
- Linking the arcade from the Roboto website (separate effort once it's live).
- Hand-modelled assets (Blender/GLTF pipeline) and asset store purchases.
- Automated tests and CI pipelines.
