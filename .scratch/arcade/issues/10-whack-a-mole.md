# 10 Whack-a-Mole playable round, fourth Machine

Type: prototype
Status: open
Role: Divya
Slot: 12:30 to 13:35 BST (T+1:50 to 2:55)
Blocked by: none

## Question

Is Whack-a-Mole fun as a 30-second timed Round with a ramping tempo? Nine Holes in a 3x3 grid on a tilted table board. Moles Pop at random; the player Whacks them with the pointer or the numpad keys before they duck. Every Whack pays 5 Tickets.

Planned by Jono with a full grilling at 12:30 BST. Everything below is decided; Divya builds it. Vocabulary in [CONTEXT.md](../../../CONTEXT.md): Hole, Mole, Pop, Whack, Miss.

## Decided at planning

**Round.** Waits for the first click or Space, then a three-beat countdown on the backboard, then 30 seconds. Timer and Whack count on a 3D backboard behind the board (not the HUD). When time is up the backboard holds the result for 2 s, then returns to the start prompt so the player can go again without leaving Play mode. `onRoundEnd(whacks * 5)` fires exactly once per Round. If `active` goes false mid-Round (Escape), pay the Whacks so far, once, like Stacker's forfeit.

**Tempo.** Starting constants, all in one object so the fun pass is number edits:
- Pop interval 1.1 s at t=0 falling to 0.45 s at t=30.
- Up window 0.9 s falling to 0.5 s.
- Simultaneous Moles: 1 until t=15, then up to 2.
- Rough yield for a good player: about 25 Whacks, so about 125 Tickets.

**Which Hole pops.** Random via an `rng` passed into the step (like Claw), never the same Hole twice in a row, never a Hole whose Mole is already up.

**Input.** Pointer: raycast against the board plane, resolve to the Hole cell under the pointer. Keys 1 to 9 in numpad layout (7 8 9 top row, 1 2 3 bottom). Both produce the same control, "hit Hole n", so the logic never knows which device fired. A Whack counts anywhere in the Pop (rise, hold, duck). A hit on an empty Hole does nothing.

**Mallet.** Basic mallet, head about one Hole wide. It hovers above the hovered Hole, tilted back away from the camera so the head sits behind the Hole from the viewer's side and never blocks the Moles. On a Whack it swings down for about 120 ms and returns. Keyboard hits teleport it to the pressed Hole and swing. It has no part in scoring.

**Attract mode (Divya's Phase 2 slice).** While `active` is false, a Pop every 2 to 3 s, no scoring, no mallet. Stops the instant the Machine goes active. Never runs on the harness page, where `active` is always true; check it in the Room.

**Cabinet.** Waist-high table board tilted about 15 degrees toward the player, backboard behind it, warm colour (orange or yellow) distinct from the teal, pink and purple cabinets. `DOCK` starts at position about [0, 2.2, 2.6], target the board centre; tune on the harness.

**No physics.** Moles and mallet are animated meshes (lerp up, hold, lerp down). No rapier.

## Files

Copy Skeeball's skeleton in `src/machines/skeeball/`:

- `src/machines/whackamole/whackLogic.ts`: pure `step(state, input, dt, rng)`, no three or rapier imports.
- `src/machines/whackamole/constants.ts`: the `WHACK` tuning object (tempo, windows, payout read from `PAYOUT.whackamole`).
- `src/machines/whackamole/useWhackInput.ts`: read-and-clear controls hook, pointer plus keys, ignores input while disabled, clears on blur.
- `src/machines/whackamole/WhackMachine.tsx`: controller, runs the step in `useFrame`, writes a pose ref for the meshes, calls `onRoundEnd` once.
- `src/machines/whackamole/index.ts`: exports the component and `DOCK`.
- `src/app/dev/whackamole/page.tsx`: harness via `dynamic(..., { ssr: false })`, same as `/dev/claw`.

## Shared edits Divya makes directly (exception to the ownership rule, agreed 12:30)

- `src/arcade/state.ts`: add `'whackamole'` to `MachineId`.
- `src/arcade/economy.ts`: `whackamole: { perWhack: 5 }`.
- `src/world/Room.tsx`: re-space the four Machines evenly across the arc, Whack-a-Mole on the left end next to Claw (x about -3.3, -1.1, 1.1, 3.3; outer pair pulled forward and yawed more), push ORBIT and NOVA outward to about x = ±4.9.

Note each edit here under Comments.

## Timeline and cut order

- 13:00: harness page playable (board, Pops, Whacks, timer, payout).
- 13:15: integrated (`MachineId`, `economy.ts`, arc re-spacing, placement).
- Then mallet, then attract mode. Stop at 13:35.
- Cut order if behind: attract mode, then the mallet swing (mallet becomes a static marker), then the countdown. Anything not on the harness by 13:00 is cut, not finished.

## Comments
