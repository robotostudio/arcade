# 06 Stacker (centre) playable round

Type: prototype
Status: resolved
Role: Sne
Slot: T+0:00 to 1:00
Blocked by: none

## Question

Is the Stacker fun with one input? A row of red boxes slides left-right, one press stops it, overhang is trimmed, each row narrows and speeds up, reach the top to win. Decide: starting width (3 boxes?), speed curve, how forgiving the trim is, win/lose feedback, what Round over looks like in the HUD. Payout start: 10 Tickets per row reached, 150 on a win. No physics.

Feedback from the others at checkpoint 2 (T+2:35). Answer records: the tuned numbers and any rule changes. Merged to `main`.

## Answer

Playable on branch `sne` at `/dev/stacker` (`src/machines/stacker/`, rules in `logic.ts` with no three imports, one instancedMesh for the grid). Played in Chrome on 2026-09-26: rows trim, the counter climbs, a loss pays and the balance persists across pages.

Tuned numbers and rules as shipped:

- Grid 7 wide x 15 high. Row width = min(previous width, cap): cap 3 on rows 0-4, 2 on rows 5-9, 1 on rows 10-14. Row 0 starts 3 wide at [2,5) and always lands on the full-width floor.
- Speed: `tickMs = max(60, 260 - 14 * row)`. Row 0 260 ms, row 5 190 ms, row 10 120 ms, row 14 64 ms. Advances on accumulated frame delta (clamped to 250 ms so a backgrounded tab cannot skip cells). Rows alternate the wall they start from.
- Forgiveness: on rows 0-3 a 1-cell overhang snaps back onto the row below and keeps its width. Above row 3 the overhang is trimmed. No overlap at all is a loss on any row.
- Payout from `PAYOUT.stacker` in `src/arcade/economy.ts`: 10 per row placed on a loss (max 140), 150 on a win. `onRoundEnd` fires exactly once per Round; if `active` drops mid-Round the Round is forfeited and pays the rows placed.
- Round flow: attract (row 0 bouncing, "Space to start") -> playing -> over. Result stays up 2.5 s with input ignored, then back to attract. Win turns the top row gold; on a loss the missed row stays visible dimmed.
- Input: Space, Enter, or pointer down on the cabinet, only while `active`. Round-over text lives in the HUD, not the scene: `useStackerHud` in `hud.ts` exposes `{ phase, row, lastResult }` for Daniel's HUD shell.
- Feel note from the first play: readable at dpr 0.35 but very dark under the harness lights; brightness is a Phase 2 palette/lighting job, not a Stacker change.

## Comments
