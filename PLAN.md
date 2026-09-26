# Arcade: the three-hour plan

**Deadline: 2026-09-26, three hours from kickoff (about 13:40 BST / 12:40 UTC).** Four devs, async (Divya joined at T+1:50 for Whack-a-Mole). Quick beats reliable: no tests, no CI, no backend, no Blender. Cut scope before cutting pace.

Canonical tracker: the markdown map at [`.scratch/arcade/map.md`](./.scratch/arcade/map.md) with one file per issue in [`.scratch/arcade/issues/`](./.scratch/arcade/issues/). This file is the runbook; decisions live on the issue files.

## Destination

A public Vercel URL. One low-poly Room. Click a Machine to fly the camera in and play; Escape to fly out. Every Round pays Tickets. A 3D Store counter in the Room shows Roboto merch in three ring Tiers (White low, Blue mid, shining Gold top); apply Tickets to any Item for a Discount. Front-end only.

## The look

**A PS1-era demake, the way Bloodborne PSX reads on a CRT**: black void, gaslamp gloom, wobbling vertices, crunchy dithered colour, scanlines. The crunch hides rough procedural geometry, so nobody polishes edges. Reference frames and the verified recipe: [docs/research/psx-look.md](./docs/research/psx-look.md). Two layers: a low-res canvas with Lambert (Gouraud) materials, a vertex-snap patch, fog and one dither effect; a CSS scanline/vignette overlay at native resolution. Jono builds the wrapper (`src/world/ArcadeCanvas.tsx` + `src/world/look/`, [issue 09](./.scratch/arcade/issues/09-look-psx-canvas-and-crt.md)) straight after the scaffold so every harness page shows its Machine through the crunch from the start; Sne owns palette, lighting and textures inside it in Phase 2. `?clean=1` turns it all off for debugging. The low-res canvas plus black fog is never cut; everything above it is.

## Who does what

Two phases. **Phase 1**: each dev builds their Machine in isolation on a harness page, assigned by complexity. **Phase 2 (from T+1:45)**: everyone on the World build together, in the Room, integrating the Machines and the Store. One branch per dev, named after you.

| Dev | Phase 1: Machine | Phase 1: also | Phase 2: World build slice | Folders | Branch | Issues |
|---|---|---|---|---|---|---|
| **Sne** | **Stacker** (simplest: timing, no physics) | **Store**: shared state, 3D counter, ring Tiers, Store HUD, Ticket economy | Palette, lighting, props, signage | `src/machines/stacker/`, `src/arcade/`, `src/store/` | `sne` | [06](./.scratch/arcade/issues/06-stacker.md), [07](./.scratch/arcade/issues/07-store-counter-tiers-tickets.md) |
| **Daniel** | **Skeeball** (mid: ball physics, two-stage input, scoring rings) | | Camera fly-to, Room/Play mode, HUD shell | `src/machines/skeeball/`, `src/world/camera*`, `src/hud/` | `daniel` | [05](./.scratch/arcade/issues/05-skeeball.md) |
| **Jono** | **Claw** (high: 3-axis movement, grab, chute, prizes) | **Scaffold** (T+0 to 0:25) | Integration of Machines + Store into the Room, deploys | `src/machines/claw/`, `src/app/`, `src/world/room*`, `src/world/look/` | `jono` | [01](./.scratch/arcade/issues/01-scaffold-and-hello-room.md), [09](./.scratch/arcade/issues/09-look-psx-canvas-and-crt.md), [04](./.scratch/arcade/issues/04-claw.md), [08](./.scratch/arcade/issues/08-launch-polish-and-deploy.md) |
| **Divya** | **Whack-a-Mole** (timing, no physics; joined T+1:50) | | Attract mode on her own Machine | `src/machines/whackamole/` | `divya` | [10](./.scratch/arcade/issues/10-whack-a-mole.md) |
| **Everyone** | | | [03 World build](./.scratch/arcade/issues/03-art-direction-room-camera-hud.md) | `src/world/` | | [03](./.scratch/arcade/issues/03-art-direction-room-camera-hud.md) |

Research issue [02](./.scratch/arcade/issues/02-research-physics-and-rendering.md) is being answered by an agent; everyone reads its `## Answer` before touching physics.

Everyone gives **feedback** on the other two (see below). R&D happens inside your folders; no permission needed to try things there.

## Shared contract (code against this from minute zero)

Owned by **Sne**, stubbed by **Jono** in the scaffold so nobody waits. Change it only by PR with the other two tagged.

```ts
// src/arcade/state.ts  (zustand)
export type MachineId = 'claw' | 'stacker' | 'skeeball' | 'whackamole'
export type Mode = { kind: 'room' } | { kind: 'play'; machine: MachineId } | { kind: 'store' }

export type ArcadeState = {
  mode: Mode
  tickets: number
  enter: (machine: MachineId) => void   // camera flies in, controls go live
  openStore: () => void
  exit: () => void                      // back to room mode
  awardTickets: (machine: MachineId, amount: number) => void
  spendTickets: (amount: number) => boolean // false if balance too low
}
```

```ts
// src/machines/types.ts
export type MachineProps = {
  position: [number, number, number]
  rotation?: [number, number, number]
  active: boolean                        // true only in play mode for this machine
  onRoundEnd: (ticketsEarned: number) => void
}
```

Rules:
- A Machine renders its own cabinet and game; it never touches the camera. The camera lives in the World and reads `mode`.
- A Machine calls `onRoundEnd` exactly once per Round. The Room wires it to `awardTickets`.
- Input: keyboard (Space / arrows) and pointer. Touch is nice-to-have.
- Payouts (first guess, Sne tunes): Stacker 10 per row reached (win 150), Claw 100 on a grab, Skeeball score / 5, Whack-a-Mole 5 per Whack.

## Timeline

| T+ | Sne | Daniel | Jono |
|---|---|---|---|
| 0:00 | `src/arcade/state.ts` for real, then Stacker on `src/app/dev/stacker/page.tsx`. | Skeeball on `src/app/dev/skeeball/page.tsx`: ramp, ball, rings; read issue 02 first. | Scaffold on `main`: Next + R3F + rapier + zustand + Tailwind, state stub, placeholder Room with three boxes + counter, Vercel deploy. **Target 0:25.** |
| 0:25 | Rebase onto `main`, everyone. | | |
| 0:25 to 1:00 | Stacker playable. | Skeeball: sweeping arrow + power meter, scoring, nine balls. | Look wrapper (issue 09, 15 min: low-res canvas, fog, Lambert, CSS scanlines, `?clean=1`), then Claw on `src/app/dev/claw/page.tsx`: movement, drop, grab, chute. |
| 1:00 | **Checkpoint 1: merge to `main`, deploy, 5-minute feedback round on each other's harness pages.** | | |
| 1:00 to 1:45 | Store counter + ring Tiers + Store HUD on `src/app/dev/store/page.tsx`. | Skeeball fun pass: feel, payout. Cut to scripted arc if needed. | Claw fun pass: odds, timings, prizes. Cut to snap-on-contact if needed. |
| 1:45 | **Phase 2: World build, everyone.** Merge to `main`. | | |
| 1:45 to 2:35 | Palette, lighting, floor/walls/sign, props, procedural crunchy textures, dither and snap tuning (psx-look.md sections 2, 3, 6). | Camera fly-to per station, Escape out, HUD shell (station name, prompt, Ticket balance, Round-end). | Place the three Machines and the Store counter in the Room, wire `onRoundEnd` to `awardTickets`, keep `main` deploying. |
| 2:35 | **Checkpoint 2: play the whole thing on the deployed URL. Cut anything not fun.** | | |
| 2:35 to 2:50 | Bugfix only. | Bugfix only. | Polish: OG image, title, loading state. |
| 2:50 | | | **Final merge + production deploy. Stop coding at 2:55.** |

Cut order if behind: Skeeball physics becomes a scripted arc; Claw becomes snap-on-contact with a 60% fail roll; Gold shine becomes a flat yellow; touch input; sound. The look has its own cut order at the end of psx-look.md; the low-res canvas and black fog stay whatever happens.

## Roboto merch Items (placeholder list, Store adjusts)

- White: sticker pack, enamel pin, tote bag.
- Blue: hoodie, cap, mug set.
- Gold: "Free site audit" and "A day of Roboto" (the jackpot shelf, shining).

Prices are fake but plausible. Discount = Tickets applied × a rate Sne picks (start: 1 Ticket = 1%, cap 50%).

## Working agreement (async)

- Branches: `main` plus `sne`, `daniel`, `jono`, `divya`. Rebase onto `main` at every checkpoint. Merge your own branch; no review gate. In Phase 2 commit small and pull often; `src/world/` is shared.
- Vercel builds every push; put your preview URL in your issue file's `## Comments` when it's worth looking at.
- **Feedback**: play the other two roles' previews at each checkpoint and append one comment under `## Comments` in their issue file, three lines max: **Keep / Change / Cut**. Owner decides; no debate threads.
- Stuck for more than 15 minutes: note it in your issue file and move to the next thing.
- Conflicts: only edit outside your folders by PR. `src/arcade/state.ts` changes tag all three.
- Commits: small, on your branch, message says what changed. No force-push to `main`.

## After the deadline

Out of scope until then and probably after: backend, auth, leaderboards, real checkout, hand-modelled assets, tests, linking from the Roboto site.
