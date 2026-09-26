# 05 Skeeball playable round, two-stage input

Type: prototype
Status: resolved
Role: Jono (took it over from Daniel at T+1:30; no daniel branch ever reached the remote)
Slot: T+0:00 to 1:45
Blocked by: none

## Question

Is Skeeball fun with a two-stage input? Stage one: an aim arrow sweeps left-right across the lane, a press locks it. Stage two: a power meter oscillates or fills, a second press locks it. The ball rolls up the ramp on that aim and power, hops the lip into scored rings (10/20/30/40/50, plus 100 corner pockets if cheap). Nine balls per Round; running score in the HUD. Decide, informed by 02: rapier dynamic ball vs scripted arc; sweep speeds for arrow and power; ring geometry that reads at low poly; the score-to-Tickets conversion (start: score / 5).

Phase 1, on a harness page. Cut to a scripted arc if physics eats time.

Feedback from the others at checkpoint 2 (T+2:35). Answer records: physics approach, sweep speeds, scoring and payout. Merged to `main`.

## Comments

- Jono (T+1:30): built on branch `jono-skeeball` with a subagent workflow (two part builders, an assembler, a headless rapier calibration, three review lenses, a fixer, a verifier). Another session swept the mid-build folder into `main` in "Connect all available arcade machines to the hub"; the calibration and fix pass lands as the follow-up commit. Played on the harness: aim, power, throw, 40 scored and shown, next ball loads. Known nits: the value board draws 100 as two digits; a ball can rest on a divider between the 50 and a 100 and score 0 on timeout; the calibrated floor means most throws score at least 20 (payout flagged for Sne on issue 07).

## Answer

**Physics approach: a real rapier ball, not a scripted arc.** The ball is one dynamic body (r 0.08, CCD on, never sleeps) fired once per throw with `applyImpulse(dir * speed * mass)` where dir = (sin aim, 0, -cos aim) and speed = lerp(7.2, 12.0, power) m/s. The lane, a 49 deg hump (rise 0.7 over 0.6 m) and the target well are 32 fixed cuboid colliders generated as pure data in `geometry.ts` from `constants.ts`; the visible meshes are built from the same boxes so visuals and physics cannot drift. The hump is steep on purpose: the ball pops off the foot kink into a lob that comes down onto the shelves, so the shelf it lands on follows launch speed monotonically. At a gentler 34 deg it was still climbing when it reached the rows, clipped lips on the way up and ricocheted off the hood. Ball tuning: restitution 0.3, friction 0.6, lane friction 0.3 (Min combine), linear damping 0.1, angular 0.2.

**Two-stage input** (`skeeballLogic.ts`, pure, no three/rapier imports): idle -> aiming -> powering -> rolling -> hit -> aiming (or result after ball 9) -> idle. Space, Enter or a click is one edge-triggered press; presses in any other phase do nothing.
- Aim: angle = 4 deg * sin(t * 2.6), a full left-right-left sweep every 2.4 s. Four degrees is invisible under the dither (+-4.5 cm at the arrow tip), so the arrow is drawn at 5x (+-20 deg). It matters anyway: sideways speed survives the hump while forward speed collapses at the crest, so a few degrees drifts the ball a full pocket.
- Power: p = 0.5 + 0.5 * sin(t * 3.2), empty to full in about 1 s.

**Scoring geometry** (`SKEE.troughs`): four full-width rows stacked behind the crest, each 0.22 m deep with a 0.06 m front lip and 0.2 m higher than the one before (10 at y 0.95, 20 at 1.15, 30 at 1.35, 40 at 1.55), then a top row at 1.75 split into the 50 (|x| < 0.26) and two 100 pockets (x = +-0.44, half width 0.14) with dividers. A back wall at z -2.16 knocks a hard throw down into the 40/50. Each trough has a thin sensor slab on its shelf (a tall volume fired on fly-over and scored the first row the ball crossed); pocket sensors are shrunk by the ball radius so a 100 only fires with the ball's centre in the pocket. A ball scores the trough it comes to rest in, not the first one it clips: the sensor it is inside (the lowest if a bounce overlaps two) is pending until it has not changed for 0.4 s. Below y 0.3, or back on the flat lane moving toward the player, is a miss at once; 5 s with nothing is a 0. Calibrated with a headless rapier sim (scratch `skee-calib.mjs`, same colliders and ball params) at aim 0: power 0 rolls back off the hump (miss), 0.05 to 0.15 lands 10 or 20, 0.2 to 0.35 -> 20, 0.4 to 0.6 -> 30, 0.65 to 0.8 -> 40, 0.85+ -> 50. A 100 needs full power and |aim| >= 3 deg (the outer quarter of the sweep); at 2 to 2.5 deg it hits the divider and drops to 40. Every calibration throw settles in about 1.3 to 1.9 s.

**Payout:** 9 balls a Round, Tickets = round(score / 5) via `PAYOUT.skeeball.scoreDivisor`. All 30s pays 54, all 50s 90, nine 100s 180. The hit value shows for 0.6 s, the Round result for 2 s, then `onRoundEnd` fires exactly once and the machine idles until the next press. A Round takes roughly 30 to 40 s at a brisk pace.

**Feel cues:** an amber arrow on the lane in front of the ball while aiming (the bone centre stripe stops short so it sits on dark wood); a bone power meter on each cheek rail filling upward; nine ball lamps on the end stop, one going out per throw; three amber 7-segment score digits in the marquee strip that blink the ball's value on a hit; a value board on the lintel with one numeral per trough value that lights on the value hit, because from the dock the 10 and 20 rows hide behind the crest; the trough lamp flashes too. `DOCK` is (0, 3.2, 5.4) toward (0, 1.2, -1.2), high enough that the 30 row's plate clears the crest.

**Robustness:** the controller steps the pure state machine in `useFrame`, reads the sensors once per frame into a `SkeeSense`, and writes a pose ref for the Indicators, so nothing re-renders in React at 60 Hz. Sensor callbacks only book-keep overlap counts per value (a bounce can clip two rows, the two 100s share a value), and the logic ignores them outside 'rolling', so a parked or resting ball can never rescore. Every launch parks the ball at the spawn first and snaps its mesh too, because a paused `<Physics>` never runs the body-to-mesh write. Leaving mid-Round settles the Round at once with the current score. A hood ceiling, lintel plate and side bands keep a ricochet inside the well; a crest backing plate stops a ball dropping back behind the hump and sliding out under the ramp; a player-end stop keeps a roll-back on the lane. All materials are shared psxified Lamberts (`SKEE_MATS`, palette instances reused where the colour exists). Verified by simulation of the pure state machine (scripted round plus 200 random rounds: 9 launches and one result per Round, tickets = round(score / 5), no phase stalls) and the headless calibration sweep; `pnpm typecheck` and `pnpm build` clean.

**Cut:** a scripted arc fallback (not needed), textures and shadows, pointer drag aiming, sound, per-ball spin or english, a physical ball return, and a visible ball rack. The 100 pockets are in (they were cheap: two sensors and two dividers on the top shelf).

Harness: `/dev/skeeball` (Space or Enter locks aim then power, click also counts, Reset button).
