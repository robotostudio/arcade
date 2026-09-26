# 05 Skeeball playable round, two-stage input

Type: prototype
Status: resolved
Role: Daniel
Slot: T+0:00 to 1:45
Blocked by: none

## Question

Is Skeeball fun with a two-stage input? Stage one: an aim arrow sweeps left-right across the lane, a press locks it. Stage two: a power meter oscillates or fills, a second press locks it. The ball rolls up the ramp on that aim and power, hops the lip into scored rings (10/20/30/40/50, plus 100 corner pockets if cheap). Nine balls per Round; running score in the HUD. Decide, informed by 02: rapier dynamic ball vs scripted arc; sweep speeds for arrow and power; ring geometry that reads at low poly; the score-to-Tickets conversion (start: score / 5).

Phase 1, on a harness page. Cut to a scripted arc if physics eats time.

Feedback from the others at checkpoint 2 (T+2:35). Answer records: physics approach, sweep speeds, scoring and payout. Merged to `main`.

## Answer

Playable at `/dev/skeeball`. Real rapier ball (`dynamic`, `ccd`, ball collider) on cuboid ramp and board colliders. Not a scripted arc. Each hole is a sensor `CylinderCollider`. The throw scores the hole the ball settles in. A miss that never reaches one scores 0.

Two-stage input, Space or click. Aim sweeps `11° * sin(t * 1.35)`. Power starts empty when aim locks and climbs at `2.15` rad/s. Launch speed lerps `6.6` to `8.5` along the ramp. Every throw hops, from `0.85` m/s up to about `1.75` m/s at full power, under normal gravity. The score is the highest ring the ball reaches after the lip. A throw that never reaches a ring scores 0. The score locks after `0.22` s. Nine balls. Stacked holes 10 / 20 / 30 / 40 / 50 plus two 100s at the top corners. Tickets = `round(score / PAYOUT.skeeball.scoreDivisor)` (5). `onRoundEnd` fires once, after the result. Cabinet is maroon, blue, and yellow so it matches Stack to the Top. Exports `DOCK` for the hub camera. The Room already mounts this machine.

## Comments

- Jono (T+1:50, on Daniel's build): **Keep** the tilted board with cylinder-sensor holes and the Stack to the Top colours; it reads from the hub dock. **Change** scoring to where the ball rests plus a short grace and calibrate the speed range headlessly: branch `jono-skeeball` has a rapier-in-node calibration script pattern (`geometry.ts` data shared by colliders and sim), settle-based scoring with a 0.4 s grace, and a 5x visual gain on a narrow aim sweep; worth lifting once the hub is stable. **Cut** nothing.

- Sne (on Daniel's roll build, after the Mole Patrol merge): **Keep** the settle-and-grace catch, cylinder-sensor cups and the cabinet colours. **Change** the throw to an underhand swing: power winds a pendulum backswing, the ball is released on the lane at the foul line rolling (spin = v/r, no hop), and a ball-jump hump lifts it onto the rings. Calibrated headless (rapier in node, same constants): centre aim walks 10→20→30→40→50 with power, 100s need ~3° aim at high power. Machine rebuilt to hero scale (1.7 m wide, 4.4 m deep, marquee at 3.7 m) to sit level with the Claw; hub scales Stack to the Top 0.8 and Mole Patrol 1.15. Also fixed ball set/read in machine-local space (rapier is world space), which broke once the station rotated. **Cut** the lift hop.
