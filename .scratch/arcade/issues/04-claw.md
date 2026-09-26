# 04 Claw machine playable round

Type: prototype
Status: resolved
Role: Jono
Slot: T+0:25 to 1:45
Blocked by: none

## Question

Is the Claw fun, and does the grab feel honest? Build: move the claw on the X/Z plane (arrow keys or drag), one press to drop; claw descends, closes, rises, travels to the chute, releases. Decide, informed by the research in 02: real rapier grip vs kinematic snap-and-drop with a fail roll; prize shapes as primitive clusters; what counts as a win; how many prizes in the pit. Calls `onRoundEnd(tickets)` once per Round.

Jono starts after the scaffold lands, on branch `jono`, harness page `src/app/dev/claw/page.tsx`. Cut to snap-on-contact with a 60% fail roll if rapier fights you.

Feedback from the others at checkpoint 1 (T+1:00). Answer records: the grab approach, tuned odds and timings. Merged to `main`.

## Comments

## Answer

**Grab approach: kinematic snap plus a scripted slip roll, no real grip.** The head is a `kinematicPosition` body with a mouth sensor. When the claw finishes closing, the machine picks the nearest dynamic prize whose centre is within `grabRadius + 0.04` of the mouth. It switches that prize to kinematic and eases it up under the mouth. The prize is never pulled down faster than the head rises, so it does not ram the pile. While the claw rises and carries, it rolls `rng() < slipChancePerSecond * dt` every frame. On a slip, or on release over the chute, the prize goes back to dynamic and falls. A win is paid only when the chute sensor catches a prize during that round. Holding the prize at release is not enough.

**Tuning** (`src/machines/claw/constants.ts`):
- grabRadius 0.22 m. floorY 1.3, which puts the mouth at 1.05, level with resting prize centres. A drop aimed at a prize wins and a sloppy drop between prizes misses.
- slipChancePerSecond 0.15, rolled during both rise and carry. That is roughly 33% slip from the centre, 22% next to the chute and 45% from the far corner.
- speed 1.0 m/s, dropSpeed 2.0, riseSpeed 1.3, closeTime 0.45 s, releaseTime 0.35 s.
- Round length is about 5.5 s: descend 0.9 s, close 0.45 s, rise 1.4 s, carry up to 1.4 s, release 0.35 s, then return.
- Payout 100 tickets per win. 14 prizes, laid out from a seed as blobs, cans and crates. The Chute keeps a 0.45 m clear zone.

**Feel cues:** an amber drop marker on the pit floor while aiming (a fake marker, not a shadow). The fingers spring back to about 55% grip around a held prize and snap fully shut on air when it slips. The chute has a lit amber rim. The phase lamp on the marquee topper changes colour by phase and blinks for 1.2 s when a prize goes down the chute.

**Robustness:** each ClawMachine has its own prize registry (React context). Physics runs 1.5 s after mount so the prizes settle, then pauses whenever the machine is inactive. Leaving mid-round settles the round at once. Any prize that escapes the pit respawns while the claw is idle. The head pose is passed by ref, so nothing re-renders in React at 60 Hz. All materials are the shared psxified ones.

**Cut:** real rapier finger grip, pointer and touch controls, sound, prize restock during a session (Reset remounts the machine), and a per-prize-type slip chance.

Harness: `/dev/claw` (arrows or WASD move, Space or Enter drops, Reset button). Commits 5e4f554 (first cut) and 708ca6c (review fixes) on `jono`. Merged to main by Jono at checkpoint 1.
