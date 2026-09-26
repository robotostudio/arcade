# 02 Research: physics and low-poly rendering recipe for three R3F mini-games

Type: research
Status: claimed
Role: Machines
Slot: T+0 (running as an agent at charting)
Blocked by: none

## Question

For each Machine, the cheapest physics approach that still feels good in React Three Fiber, and the flat-shaded low-poly rendering recipe.

- **Claw**: does a rapier rigid-body claw with joint-driven fingers actually grip primitive prizes, or is a kinematic "snap prize to claw on contact, release at chute with a fail chance" the safer hackathon approach?
- **Skeeball**: rapier dynamic ball up a ramp into scored holes vs a scripted arc. Sensor/collider approach for scoring rings.
- **Stacker**: confirm no physics needed; gotchas with many boxes; cleanest way to trim overhang.
- Rendering: `flatShading` materials, palette approach, lighting (hemisphere + directional, shadows), which drei helpers earn their place, camera fly-to approach, mobile limits (dpr clamp, shadow map size).
- Version pins that work together today: three, fiber, drei, rapier, next, react.

Findings go to `docs/research/r3f-physics-recipe.md`; the summary goes under `## Answer` here.

## Comments
