# Arcade: the three-hour plan

**Deadline: 2026-09-26, three hours from kickoff (about 13:40 BST / 12:40 UTC).** Three devs, async. Quick beats reliable: no tests, no CI, no backend, no Blender. Cut scope before cutting pace.

Canonical tracker: Linear map [ROB-3985](https://linear.app/roboto/issue/ROB-3985). This file is the runbook; decisions live on the Linear issues.

## Destination

A public Vercel URL. One low-poly Room. Click a Machine to fly the camera in and play; Escape to fly out. Every Round pays Tickets. A 3D Store counter in the Room shows Roboto merch in three ring Tiers (White low, Blue mid, shining Gold top); apply Tickets to any Item for a Discount. Front-end only.

## Roles

Three roles, one dev each, one long-lived branch each. Pick a role, assign yourself to its Linear issues (assignee = claim), and stay in your folders.

| Role | Owns | Folders | Linear issues |
|---|---|---|---|
| **World** | Scaffold, Room, lighting, palette, camera fly-to, HUD shell, deploy, final polish. Picks up **Stacker** once the Room is up. | `src/world/`, `src/app/`, `src/hud/` | [ROB-3986](https://linear.app/roboto/issue/ROB-3986), [ROB-3988](https://linear.app/roboto/issue/ROB-3988), [ROB-3989](https://linear.app/roboto/issue/ROB-3989), [ROB-3992](https://linear.app/roboto/issue/ROB-3992) |
| **Machines** | Claw and Skeeball game loops, physics, Round results. | `src/machines/` | [ROB-3987](https://linear.app/roboto/issue/ROB-3987) (research, already running), [ROB-3990](https://linear.app/roboto/issue/ROB-3990), [ROB-3991](https://linear.app/roboto/issue/ROB-3991) |
| **Store** | Shared state (Tickets, mode), 3D Store counter, Items + ring Tiers, Store HUD, Ticket economy. | `src/arcade/`, `src/store/` | [ROB-3993](https://linear.app/roboto/issue/ROB-3993) |

Each role also gives **feedback** on the other two (see below). R&D happens inside your role; you don't need permission to try something in your folders.

## Shared contract (code against this from minute zero)

Owned by **Store**, stubbed by **World** in the scaffold so nobody waits. Change it only by PR with the other two tagged.

```ts
// src/arcade/state.ts  (zustand)
export type MachineId = 'claw' | 'stacker' | 'skeeball'
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
- A Machine renders its own cabinet and game; it never touches the camera. World owns the camera and reads `mode`.
- A Machine calls `onRoundEnd` exactly once per Round. World wires it to `awardTickets`.
- Input: keyboard (Space / arrows) and pointer. Touch is nice-to-have.
- Payouts (first guess, Store tunes): Stacker 10 per row reached (win 150), Claw 100 on a grab, Skeeball score / 5.

## Timeline

| T+ | World | Machines | Store |
|---|---|---|---|
| 0:00 | Scaffold on `main`: Next + R3F + rapier + zustand + Tailwind, state stub, placeholder Room with three boxes + counter, Vercel deploy. **Target: 0:25.** | Read the research findings (ROB-3987 comment). Start Claw on `machines` off an empty `src/machines/`; use a local `Canvas` harness page `src/app/dev/claw/page.tsx` until the Room exists. | Start `src/arcade/state.ts` for real, Store counter geometry + ring materials on `store`. Local harness `src/app/dev/store/page.tsx`. |
| 0:25 | Rebase onto `main`, everyone. | | |
| 0:25 to 1:15 | Room: palette, lighting, floor/walls/sign, camera fly-to per station, HUD shell (prompt, Ticket balance, Escape). | Claw playable. | Store HUD: pick Item, apply Tickets, show Discount. Items = Roboto merch (see below). |
| 1:15 | **Checkpoint 1: merge everything to `main`, deploy, 5-minute feedback round.** | | |
| 1:15 to 2:15 | Stacker. Wire all Machines + Store into the Room. | Skeeball (two-stage input: sweeping arrow, then power). | Tune payouts against real Rounds. Gold shine. |
| 2:15 | **Checkpoint 2: merge, deploy, feedback round. Cut anything not fun.** | | |
| 2:15 to 2:50 | Polish: OG image, title, loading state, Round-end feedback. | Bugfix only. | Bugfix only. |
| 2:50 | **Final merge + production deploy. Stop coding at 2:55.** | | |

Cut order if behind: Skeeball physics becomes a scripted arc; Claw becomes snap-on-contact with a 60% fail roll; Gold shine becomes a flat yellow; touch input; sound.

## Roboto merch Items (placeholder list, Store adjusts)

- White: sticker pack, enamel pin, tote bag.
- Blue: hoodie, cap, mug set.
- Gold: "Free site audit" and "A day of Roboto" (the jackpot shelf, shining).

Prices are fake but plausible. Discount = Tickets applied × a rate the Store role picks (start: 1 Ticket = 1%, cap 50%).

## Working agreement (async)

- Branches: `main` plus one branch per role (`world`, `machines`, `store`). Rebase onto `main` at every checkpoint. Merge your own branch; no review gate.
- Vercel builds every push; put your preview URL on your Linear issue when it's worth looking at.
- **Feedback**: play the other two roles' previews at each checkpoint and leave one comment on their Linear issue, three lines max: **Keep / Change / Cut**. Owner decides; no debate threads.
- Stuck for more than 15 minutes: post on the Linear issue and move to the next thing.
- Conflicts: only edit outside your folders by PR. `src/arcade/state.ts` changes tag all three.
- Commits: small, on your branch, message says what changed. No force-push to `main`.

## After the deadline

Out of scope until then and probably after: backend, auth, leaderboards, real checkout, hand-modelled assets, tests, linking from the Roboto site.
