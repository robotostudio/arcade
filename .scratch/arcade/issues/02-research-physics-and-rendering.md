# 02 Research: physics and low-poly rendering recipe for three R3F mini-games

Type: research
Status: resolved
Role: agent (everyone reads the Answer)
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

## Answer

Full findings, verified against npm and package source on 2026-09-26: [docs/research/r3f-physics-recipe.md](../../../docs/research/r3f-physics-recipe.md).

**Version pins** (installed together with pnpm, no peer warnings, cross-package smoke file passes `tsc --strict`): `next 16.3.6`, `react`/`react-dom 19.3.0`, `three 0.186.1`, `@react-three/fiber 9.8.1` (the React 19 line), `@react-three/drei 10.7.9`, `@react-three/rapier 2.2.0` (peers fiber `^9.0.4`, pins rapier3d-compat 0.19.2), `maath 0.10.8`, `@types/three 0.186.0`, `typescript ^5.9` (latest is 7.0.2; don't). Under pnpm import `CameraControlsImpl` from drei, never `camera-controls` directly.

**Claw: fake the grip.** Kinematic claw (`type="kinematicPosition"`, driven by `setNextKinematicTranslation`), dynamic primitive prizes, a `sensor` `BallCollider` in the claw mouth picks the prize on close, `prize.setBodyType(KinematicPositionBased)` parents it, carry it with `setNextKinematicTranslation`, roll a slip chance per frame during the carry, `setBodyType(Dynamic)` to drop; a `sensor` cuboid in the chute scores. Joint-driven fingers are not worth it: Rapier has no grasping guidance, and the one open-source claw that does it needed friction 2.0, 8 substeps, heavy damping and hand-tuned motors. Gotcha: sensors only fire when one side is dynamic (`ActiveCollisionTypes.DEFAULT`), so never rely on kinematic-vs-fixed sensor hits.

**Skeeball: real rapier ball.** `dynamic` ball, `colliders="ball"`, `ccd`, `canSleep={false}`; ramp from rotated `CuboidCollider`s (never a trimesh, they have no thickness); each ring a `sensor` `CylinderCollider` with `onIntersectionEnter`, gutter sensor resets via `setTranslation`/`setLinvel`/`setAngvel`. Launch = `applyImpulse(dir(aim) * lerp(MIN, MAX, power) * mass)` after the two-press aim/power input. Keep the numeric `timeStep` (1/60, interpolated) for determinism. Scripted arc stays the cut-order fallback.

**Stacker: no physics.** Rows are `[start, end)` cell intervals, trim = intersection with the row below, empty = game over, width caps 3/2/1 by height, speed linear in row index on accumulated `delta`. One `instancedMesh` for the grid: `setMatrixAt` + `instanceMatrix.needsUpdate`, `setColorAt` + `instanceColor.needsUpdate`, `frustumCulled={false}` (stale bounding sphere since r149).

**Rendering recipe.** `meshStandardMaterial flatShading` (Lambert on mobile) with 5-7 shared hex materials from one palette module (hex is sRGB-managed automatically); `hemisphereLight` ~1.5 + one shadow-casting `directionalLight` ~3 with a Room-sized ortho shadow camera, `shadow-mapSize` 1024 (512 mobile), `bias`/`normalBias` set; **`<Canvas shadows="percentage">`** because three r186 removed `PCFSoftShadowMap` and fiber's `shadows`/`"soft"` still map to it (console warning); `dpr={[1, 1.5]}`, `PerformanceMonitor`/`AdaptiveDpr`, `ContactShadows frames={1}` under cabinets, `Preload all`. Skip `Stage` and `Environment` presets (runtime CDN HDR fetch, drei says not for production). Consider `flat` on the Canvas if ACES muddies the palette.

**Camera fly-to.** drei `CameraControls makeDefault smoothTime={0.6}`; on mode change `ref.current.setLookAt(px, py, pz, tx, ty, tz, true)` (returns a promise that resolves at rest); `enabled={!inPlay}` disables orbit in Play mode (or map `mouseButtons`/`touches` to `ACTION.NONE`); call `normalizeRotations()` first since v3 no longer normalises azimuth. `maath/easing` `damp3` is the fallback if the camera is fully scripted.

## Comments
