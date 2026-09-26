# 04 Claw machine playable round

Type: prototype
Status: open
Role: Machines
Slot: T+0:00 to 1:15
Blocked by: none

## Question

Is the Claw fun, and does the grab feel honest? Build: move the claw on the X/Z plane (arrow keys or drag), one press to drop; claw descends, closes, rises, travels to the chute, releases. Decide, informed by the research in 02: real rapier grip vs kinematic snap-and-drop with a fail roll; prize shapes as primitive clusters; what counts as a win; how many prizes in the pit. Calls `onRoundEnd(tickets)` once per Round.

Start at T+0 on branch `machines` with a harness page at `src/app/dev/claw/page.tsx`; rebase onto `main` at T+0:25. Cut to snap-on-contact with a 60% fail roll if rapier fights you.

Feedback from the other roles at checkpoint 1. Answer records: the grab approach, tuned odds and timings. Merged to `main`.

## Comments
