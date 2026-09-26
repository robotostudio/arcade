# Physics and low-poly rendering recipe for the three R3F mini-games

Resolves issue [02](../../.scratch/arcade/issues/02-research-physics-and-rendering.md). Researched 2026-09-26 against npm, the installed packages' shipped `.d.ts`, pmndrs source on GitHub, rapier.rs and three.js source. Every version and API name below was checked, not remembered; the full pin set was installed with pnpm and a smoke file importing across fiber, drei, rapier and maath typechecks clean (see "Version pins").

## TL;DR

| Machine | Recommendation |
|---|---|
| **Claw** | Kinematic claw, dynamic prizes, **fake the grip**: sensor on the closed claw picks a prize, `setBodyType(KinematicPositionBased)` parents it, carry it with `setNextKinematicTranslation`, roll a slip chance during the carry, `setBodyType(Dynamic)` to drop. Do not build joint-driven fingers. |
| **Skeeball** | **Real rapier ball** (`dynamic`, `colliders="ball"`, `ccd`), ramp built from rotated `CuboidCollider`s (never a trimesh), each ring a `sensor` `CylinderCollider` with `onIntersectionEnter`. Launch = `applyImpulse` from aim angle × charge. Scripted arc stays the cut-order fallback. |
| **Stacker** | **No physics.** Rows are `[start, end]` cell intervals; trim = intersection with the row below; empty intersection = game over. One `instancedMesh` for the grid with `setMatrixAt` / `setColorAt` + `needsUpdate`, `frustumCulled={false}`. |
| **Rendering** | `meshStandardMaterial flatShading` (or `meshLambertMaterial flatShading` on mobile), 5–7 hex colours in one palette module, `hemisphereLight` + one shadow-casting `directionalLight` with a tight ortho shadow camera at 1024, `<Canvas shadows="percentage" dpr={[1, 1.5]}>`, drei `ContactShadows frames={1}` under cabinets. Skip `Stage` and `Environment` presets (CDN HDR fetch). |
| **Camera** | drei `CameraControls` (`makeDefault`), `setLookAt(px,py,pz, tx,ty,tz, true)` for the fly-to, `smoothTime` ≈ 0.6; in Play mode set `enabled={false}` or map every `mouseButtons`/`touches` action to `ACTION.NONE`. |

## Version pins (verified 2026-09-26)

```json
{
  "dependencies": {
    "next": "16.3.6",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "three": "0.186.1",
    "@react-three/fiber": "9.8.1",
    "@react-three/drei": "10.7.9",
    "@react-three/rapier": "2.2.0",
    "maath": "0.10.8",
    "zustand": "^5"
  },
  "devDependencies": {
    "@types/three": "0.186.0",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "typescript": "^5.9"
  }
}
```

- `npm view` on 2026-09-26: `three@0.186.1` (published 2026-09-24), `@react-three/fiber@9.8.1` (2026-09-24), `@react-three/drei@10.7.9` (2026-09-25), `@react-three/rapier@2.2.0` (2025-11-03), `next@16.3.6` (2026-09-22), `react@19.3.0`, `@types/three@0.186.0`.
- Peer ranges line up: fiber 9.8.1 peers `react >=19 <19.4`, `three >=0.156`; drei 10.7.9 peers `@react-three/fiber ^9.0.0`, `react ^19`, `three >=0.159`; rapier 2.2.0 peers `@react-three/fiber ^9.0.4`, `react ^19`, `three >=0.159.0` and pins `@dimforge/rapier3d-compat` **0.19.2 exactly** ([package.json](https://raw.githubusercontent.com/pmndrs/react-three-rapier/main/packages/react-three-rapier/package.json)). Next 16.3.6 peers `react ^19.0.0`. Fiber v9 is the React 19 line: "@react-three/fiber@8 pairs with react@18, @react-three/fiber@9 pairs with react@19" ([installation](https://r3f.docs.pmnd.rs/getting-started/installation)); 9.8.0 added React 19.3 support ([CHANGELOG](https://github.com/pmndrs/react-three-fiber/blob/master/packages/fiber/CHANGELOG.md)).
- `pnpm install` of exactly this set printed no peer warnings, and a smoke `.tsx` importing `Canvas`, `useFrame`, `CameraControls`, `ContactShadows`, `Environment`, `Instances`, `PerformanceMonitor`, `Physics`, `RigidBody`, `CuboidCollider`, `useRevoluteJoint`, `InstancedRigidBodies` and `maath/easing` passed `tsc --strict`.
- `typescript@latest` resolves to **7.0.2** today; it typechecked the smoke file, but pin `^5.9` unless someone wants to be the TS 7 guinea pig during a three-hour build.
- Under pnpm, `camera-controls` and `@dimforge/rapier3d-compat` are not hoisted. Do not import them directly; drei re-exports the class as `CameraControlsImpl` (`import { CameraControls, CameraControlsImpl } from '@react-three/drei'`, [CameraControls.d.ts](https://github.com/pmndrs/drei/blob/master/src/core/CameraControls.tsx)) and rapier exposes the WASM module via `useRapier().rapier`. Two copies of rapier3d-compat appear in `pnpm ls` (three's own devDependency drags 0.12.0); harmless.
- `transpilePackages: ['three']` in `next.config`: the fiber docs still say to add it ([installation](https://r3f.docs.pmnd.rs/getting-started/installation)); Next 16 only needs it for packages shipping raw TS/JSX ([transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages)) and three r186 ships compiled ESM + CJS. Harmless; add it only if `three/addons` imports misbehave.
- Next App Router: the `Canvas` file is `'use client'`; if it's dynamically imported with `ssr: false`, that `next/dynamic` call must itself live in a client component ("`ssr: false` is not allowed with `next/dynamic` in Server Components", [lazy loading](https://nextjs.org/docs/app/guides/lazy-loading)). The pmndrs `react-three-next` starter shows the Layout → `dynamic(() => import('./Scene'), { ssr: false })` shape but is stuck on fiber 8 / Next 14, so copy the structure, not the versions ([Layout.jsx](https://raw.githubusercontent.com/pmndrs/react-three-next/main/src/components/dom/Layout.jsx)).

## 1. Claw: fake the grip

**Recommendation: kinematic claw + dynamic prizes + snap-on-contact + scripted slip.** Joint-driven fingers are not worth it in three hours.

Why not real fingers:

- Rapier has no grasping guidance anywhere. GitHub issue search for gripper/grasp/claw across `dimforge/rapier`, `dimforge/rapier.js` and `pmndrs/react-three-rapier` returns nothing (2026-09-26). Impulse joints are constraint-based and "can be violated if the solver does not converge... Large assemblies easily break without a large number of solver iterations" ([joints guide](https://rapier.rs/docs/user_guides/javascript/joints)).
- The one open-source R3F/three claw that does real motorised fingers ([RiwRiwara/claw-machine](https://github.com/RiwRiwara/claw-machine), rapier3d-compat 0.19) needed friction 2.0 on toys **and** fingers ("a load-bearing part of the pure-physics grab"), 8 substeps, toy damping 0.9/1.6, a force-based motor with a torque cap, and `setContactsEnabled(false)` on hub↔finger joints because contacts on jointed bodies "self-excite the arm". Its config comments call the tuned point "the verified-passing point", i.e. found by trial.
- The other two web claws fake it: [LiamDaPanda/claw-web](https://github.com/LiamDaPanda/claw-web) (kinematic hub/prongs, geometric "held" test, force-limited spring impulse, drop if drift > 0.42 m, random grip per play) and [neciszhang/claw3d](https://github.com/neciszhang/claw3d) (rapier 2.2: sensor per prong, `setBodyType(2)` to parent the toy, `setNextKinematicTranslation` each frame, slip by probability, `setBodyType(0)` + `setLinvel` to drop).
- Kinematic prongs are infinite-mass and one-way: "if you tell the kinematic to go somewhere, it will go there, no questions asked" ([rigid body types](https://rapier.rs/docs/user_guides/javascript/rigid_bodies#rigid-body-type)), so closing kinematic prongs on a dynamic prize squeezes it out unless you stop them yourself. Another reason to not even try to hold by contact.

### Implementation sketch

```tsx
'use client'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider, BallCollider, useRapier,
         type RapierRigidBody, type IntersectionEnterPayload } from '@react-three/rapier'

// Physics wrapper for the whole Room: one <Physics>, fixed 1/60 step, interpolated.
<Physics gravity={[0, -9.81, 0]} timeStep={1 / 60} interpolate>

// Prize: dynamic, primitive cluster, one auto collider. userData identifies it in events.
<RigidBody ref={prizeRef} type="dynamic" colliders="hull" restitution={0.1} friction={0.8}
           linearDamping={0.3} angularDamping={0.5} userData={{ prizeId: 'duck-1' }}>
  <mesh castShadow><icosahedronGeometry args={[0.25, 0]} /><meshStandardMaterial color={palette.yellow} flatShading /></mesh>
</RigidBody>

// Claw head: kinematicPosition. Moves on X/Z from input, descends on drop, in useFrame.
// The "mouth" is a sensor BallCollider; it fires against dynamic prizes by default.
<RigidBody ref={clawRef} type="kinematicPosition" colliders={false}>
  <ClawMesh />                           {/* three prong meshes, animated open/closed, no colliders */}
  <BallCollider args={[0.35]} sensor position={[0, -0.4, 0]}
    onIntersectionEnter={(e: IntersectionEnterPayload) => {
      const id = (e.other.rigidBody?.userData as { prizeId?: string } | undefined)?.prizeId
      if (id && phase.current === 'closing') candidate.current = e.other.rigidBody ?? null
    }} />
</RigidBody>
```

Phase machine inside one `useFrame` (or `useBeforePhysicsStep`) on the claw:

1. **aim**: `clawRef.current.setNextKinematicTranslation({ x, y: top, z })` from arrows/drag.
2. **drop**: lerp `y` down to the pit floor; **close**: animate prong meshes shut over ~300 ms; the sensor's `onIntersectionEnter` during `closing` sets `candidate`.
3. **grab** (if a candidate exists): `candidate.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true)` (enum: `Dynamic = 0, Fixed = 1, KinematicPositionBased = 2, KinematicVelocityBased = 3`, rapier3d-compat 0.19.2 `dynamics/rigid_body.d.ts`), then every frame `candidate.setNextKinematicTranslation(clawPos + offset)`. Optionally add a small pendulum offset for feel (claw3d does this).
4. **carry** to the chute; per frame roll `Math.random() < slipPerSecond * dt` (start 0.25/s over a ~2 s carry ≈ 40 % loss; tune) → **slip**: `setBodyType(rapier.RigidBodyType.Dynamic, true)`, `setLinvel(clawVelocity, true)`.
5. **release** over the chute: same as slip. A `sensor` `CuboidCollider` inside the chute on a `type="fixed"` body fires `onIntersectionEnter` with the now-dynamic prize → `onRoundEnd(100)`.

API references (all from the installed 2.2.0 `.d.ts` and the [README](https://github.com/pmndrs/react-three-rapier/blob/main/packages/react-three-rapier/readme.md)):

- `RigidBody` `type` is `"fixed" | "dynamic" | "kinematicPosition" | "kinematicVelocity"`; `colliders` is `"ball" | "cuboid" | "hull" | "trimesh" | false` (default from `<Physics colliders>` is `"cuboid"`). `type`, `ccd`, `linearDamping`, `angularDamping`, `lockRotations`, `enabledRotations`, `gravityScale`, `userData` are reactive props; `colliders`, `canSleep`, `args` recreate the body; `friction`/`restitution`/`sensor` on a `RigidBody` are only read at mount for auto-colliders (put them on an explicit collider component if they need to change). `mass` on `RigidBody` is silently dropped (source: `cleanRigidBodyPropsForCollider`); use `density` or `mass` on a collider.
- Ref methods: `setNextKinematicTranslation(v)`, `setNextKinematicRotation(q)`, `setTranslation(v, wakeUp)`, `setLinvel(v, wakeUp)`, `setAngvel`, `applyImpulse(v, wakeUp)`, `setBodyType(type, wakeUp)`, `translation()`, `linvel()`, `sleep()`, `wakeUp()`, `setEnabled(bool)`. rapier.rs: "For position-based kinematic bodies, it is recommended to use the special methods `setNextKinematicTranslation`/`setNextKinematicRotation`" and "always set the `wakeUp` argument to `true`" ([rigid bodies](https://rapier.rs/docs/user_guides/javascript/rigid_bodies)).
- Events: `onCollisionEnter/Exit`, `onIntersectionEnter/Exit`, `onContactForce` on `RigidBody` and on every collider component; payload `{ target, other }` where each side is `{ rigidBody?, collider, rigidBodyObject?, colliderObject? }`. Read the other body via `e.other.rigidBody?.userData` or `e.other.rigidBodyObject?.name`.
- **Gotcha, sensors and kinematics**: Rapier's default `ActiveCollisionTypes.DEFAULT = 15` = `DYNAMIC_DYNAMIC | DYNAMIC_FIXED | DYNAMIC_KINEMATIC`, so a sensor only fires when at least one side is dynamic. A kinematic claw entering a sensor on a **fixed** body (e.g. a "claw over chute" trigger) fires nothing unless you pass `activeCollisionTypes={rapier.ActiveCollisionTypes.DEFAULT | rapier.ActiveCollisionTypes.KINEMATIC_FIXED}` on that collider ([active collision types](https://rapier.rs/docs/user_guides/javascript/colliders#active-collision-types), maintainer confirmation in [rapier#594](https://github.com/dimforge/rapier/issues/594)). The sketch above avoids it: the mouth sensor rides on the kinematic claw and meets dynamic prizes; the chute sensor meets a dynamic (released) prize. Just don't rely on kinematic-vs-fixed sensor hits by accident.
- If you would rather attach with a joint than swap body type: the joint hooks (`useFixedJoint(a, b, [anchorA, frameA, anchorB, frameB])`) create the joint **once at mount** and remove it on unmount, so mount a tiny `<Grab a={claw} b={prize} />` child conditionally; or call `world.createImpulseJoint(rapier.JointData.fixed(...), bodyA, bodyB, true)` / `world.removeImpulseJoint(joint, true)` from `useRapier()`. Hook refs must be `RefObject<RapierRigidBody>` (non-null), so declare them `useRef<RapierRigidBody>(null!)` under React 19's `useRef` typing, otherwise `tsc` rejects them. The `setBodyType` route is simpler and is what claw3d ships.
- Rapier's kinematic bodies ignore `sleep`, and since rapier3d-compat 0.19 kinematic bodies "no longer fall asleep when slow" ([rapier.js CHANGELOG](https://github.com/dimforge/rapier.js/blob/master/CHANGELOG.md)). Prizes in the pit will sleep; the sensor still wakes them on contact.

Physics settings for the pit: default `numSolverIterations` 4 is fine for a dozen prizes. If prizes jitter in a pile, `additionalSolverIterations={2}` on the prize bodies (per-island, cheaper than raising the global count, [solver settings](https://rapier.rs/docs/user_guides/javascript/rigid_body_solver_settings)) or raise damping.

## 2. Skeeball: real ball, sensors for rings

**Recommendation: dynamic rapier ball.** A rolled ball with a fixed 1/60 step is deterministic enough to feel fair, the ramp is three cuboids, and scoring is one sensor per ring. Scripted arc remains the cut-order fallback (it's ~30 lines: pick a ring from aim+power, tween a parabola with `maath`).

### Colliders

- Lane and ramp: `type="fixed"` body with rotated **`CuboidCollider`s** (args are **half-extents**: `[hx, hy, hz]`). Do not use `colliders="trimesh"` for the ramp: trimeshes "have no thickness" and "no interior", so a fast ball can tunnel through; rapier.rs discourages them and CCD reports against thin meshes are still open ([colliders](https://rapier.rs/docs/user_guides/javascript/colliders#triangle-meshes), [rapier.js#286](https://github.com/dimforge/rapier.js/issues/286)). Also beware the default `colliders="cuboid"` auto-collider: it boxes the mesh's **axis-aligned** bounds, so a sloped ramp mesh gets a wrong collider unless the mesh is an unrotated box with the rotation applied on the `RigidBody`/collider.
- Ramp friction: put `friction={0.3} frictionCombineRule={CoefficientCombineRule.Min}` on the lane so the lane wins over a grippy ball (`CoefficientCombineRule` is re-exported by `@react-three/rapier`; default combine is `Average`).
- Ball: `<RigidBody type="dynamic" colliders="ball" ccd restitution={0.3} friction={0.6} linearDamping={0.1} angularDamping={0.2} canSleep={false} userData={{ ball: true }}>`. `ccd` enables motion-clamping continuous collision detection on this body only ("useless to enable CCD on fixed rigid-bodies", [CCD](https://rapier.rs/docs/user_guides/javascript/rigid_bodies#continuous-collision-detection)); `<Physics maxCcdSubsteps>` defaults to 1, fine for one ball.
- Rings: each is a `type="fixed"` `RigidBody` with a `CylinderCollider args={[halfHeight, radius]} sensor onIntersectionEnter={...}` sitting just below the hole. Nested rings: place the smaller/higher-value sensors and check `other.rigidBody?.userData.ball`, then take the **highest** value hit within the same ~100 ms (the ball may clip an outer ring's sensor edge on the way into the inner one), or simply size the sensors as non-overlapping annuli. The ring geometry itself gets a real (non-sensor) collider or a raised lip so the ball settles visibly. A catch-all `sensor` cuboid under the board ("gutter") scores 0 and triggers the reset.
- Reset (after score or gutter, and on a timeout of ~6 s): `ball.setTranslation(start, true); ball.setLinvel({x:0,y:0,z:0}, true); ball.setAngvel({x:0,y:0,z:0}, true)` (pattern from pmndrs [rapier-ping-pong](https://github.com/pmndrs/examples/blob/main/examples/rapier-ping-pong/src/App.tsx), which also notes to pass the `wakeUp` boolean explicitly).

### Launch mapping (two-stage input per issue 05)

Stage one, aim: an arrow sweeps `angle = A * sin(t * ω)` with `A ≈ 20°`, `ω ≈ 3 rad/s`; a press locks `aim`. Stage two, power: a meter oscillates `p = 0.5 + 0.5 * sin(t * ω2)`, `ω2 ≈ 4 rad/s`, or fills on hold; a press locks `power`. Then:

```ts
const dir = new THREE.Vector3(Math.sin(aim), 0, -Math.cos(aim))   // down the lane
const speed = THREE.MathUtils.lerp(MIN, MAX, power)                // tune MIN/MAX so p=0.5 lands the 30 ring
ball.applyImpulse(dir.multiplyScalar(speed * ball.mass()), true)
```

Hold-to-charge alternative for pointer: `pointerdown` stores `t0`, `pointerup` gives `power = clamp((now - t0) / 900, 0, 1)`. An oscillating meter is the accessible default (no held button, [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/avoid-provide-alternatives-to-requiring-buttons-to-be-held-down/)); the plan already chose the two-press form, so keep it and drop hold-to-charge.

Determinism: R3F's `<Physics>` accumulates a fixed 1/60 step and interpolates meshes by `accumulator / timeStep` (`interpolate` defaults true; `timeStep="vary"` disables both and "prevents the physics simulation from being fully deterministic", [README](https://github.com/pmndrs/react-three-rapier/blob/main/packages/react-three-rapier/readme.md#configuring-time-step-size)). Keep the numeric step. `useBeforePhysicsStep` / `useAfterPhysicsStep` run once per sub-step, so 0..n times per rendered frame.

## 3. Stacker: no physics, one instanced mesh

Confirmed: pure timing logic; nothing in the loop needs rapier. Keep the Stacker outside `<Physics>` entirely.

### Row model and overhang trim

Represent each row as a cell interval `[start, end)` on a `W`-wide grid (arcade Stacker is 7 wide, 15 high, row width 3 → 2 → 1 as you climb). The cleanest trim is interval intersection (form used by [jtmingus/blockstack-game](https://github.com/jtmingus/blockstack-game)):

```ts
type Row = { start: number; end: number }           // end exclusive
function trim(moving: Row, below: Row): Row | null {
  const start = Math.max(moving.start, below.start)
  const end = Math.min(moving.end, below.end)
  return start < end ? { start, end } : null        // null = game over
}
```

- Moving row: `x` advances by `dir` every `tickMs`; bounce at the walls (`start === 0 || end === W`). Width is `min(prevWidth, capForRow(row))` with caps `3` below row 5, `2` up to row 10, `1` above (JS-Stacker form).
- Speed curve: linear in row index works (`tickMs = 260 - 14 * row`, floor 60), or a per-row table. Advance on accumulated `delta` from `useFrame`, not per frame, so 120 Hz screens aren't harder.
- Forgiveness: none in the arcade original; if it plays too cruel, allow a 1-cell overhang on rows ≤ 3.
- Win: row index reaches `H`. Payout per plan: 10 per row, 150 on a win, `onRoundEnd` once.

### Instanced boxes: the gotchas

Use one `<instancedMesh args={[undefined, undefined, W * H]}>` with a `boxGeometry` and a `meshStandardMaterial flatShading` and write all cells each tick:

- After `setMatrixAt` set `mesh.instanceMatrix.needsUpdate = true`; after `setColorAt` set `mesh.instanceColor.needsUpdate = true` (`instanceColor` is `null` until the first `setColorAt`) ([InstancedMesh source](https://github.com/mrdoob/three.js/blob/dev/src/objects/InstancedMesh.js)).
- Since r149 `InstancedMesh` has its own `boundingSphere`; it is computed once and goes stale when instances move, so either call `mesh.computeBoundingSphere()` after updates or set `frustumCulled={false}` ([PR #25591](https://github.com/mrdoob/three.js/pull/25591), [Frustum.js](https://github.com/mrdoob/three.js/blob/dev/src/math/Frustum.js)). For a 7×15 grid `frustumCulled={false}` is the one-liner.
- Hide empty cells by scaling their matrix to 0 (or moving them below the floor) rather than mounting/unmounting meshes.
- drei `<Instances limit={W*H}>` + `<Instance color position />` does the `needsUpdate` bookkeeping for you and takes per-instance `color`, but it doesn't touch `frustumCulled` either, and each `<Instance>` is a React component, so for a grid that changes every tick the raw `instancedMesh` is both smaller and cheaper ([Instances docs](https://drei.docs.pmnd.rs/performances/instances)).
- Lit red boxes on a red-ish palette read badly at low poly; give the moving row a brighter tint via `setColorAt` and use `Edges` or a 1 px darker outline only if it's free.

## 4. Rendering recipe

> **Partly superseded (T+0:15) by [psx-look.md](./psx-look.md)**, the Bloodborne-PSX art direction: Lambert (Gouraud) instead of `flatShading`, no shadow maps, `dpr 0.35` instead of `[1, 1.5]`, `flat` mandatory, plus a vertex-snap patch, fog, a dither effect and a CSS CRT overlay. The palette-module, shared-material, primitive-segment and drei-verdict advice below still applies.

### Materials and palette

- `flatShading: true` on `MeshStandardMaterial` / `MeshLambertMaterial` / `MeshPhongMaterial` is implemented with screen-space derivatives (`dFdx`/`dFdy` in `normal_fragment_begin`), so it works on any geometry, including smooth-normal spheres; no `toNonIndexed()` needed ([shader chunk](https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderChunk/normal_fragment_begin.glsl.js)). Low-segment primitives (`icosahedronGeometry args={[r, 0]}`, `sphereGeometry args={[r, 8, 6]}`, `cylinderGeometry args={[r, r, h, 8]}`) give the facets.
- `MeshLambertMaterial` is the cheap option ("performance will be greater... at the cost of some graphical accuracy") and supports `flatShading`; `MeshToonMaterial` with a 3-step `gradientMap` (`NearestFilter`) is the stylised option. Standard is fine on desktop; switch the whole scene to Lambert if mobile drops frames.
- Palette: one `src/world/palette.ts` exporting 5–7 hex strings (floor, wall, accent, cabinet, red boxes, ticket yellow, Roboto blue). Hex/CSS colours are treated as sRGB and converted to the linear working space automatically (`ColorManagement.enabled = true` by default since r152, [Color.js](https://github.com/mrdoob/three.js/blob/dev/src/math/Color.js)); fiber leaves that on unless you pass `legacy`. Share material instances (`useMemo` or module-level) per palette colour; each unique material is extra GPU state ([scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)).
- Tone mapping: fiber defaults to `ACESFilmicToneMapping`, which desaturates flat colours. Pass `flat` on `Canvas` (`NoToneMapping`) or set `gl.toneMapping = THREE.NeutralToneMapping` in `onCreated` if the palette looks muddy.

### Lighting and shadows

```tsx
<Canvas shadows="percentage" dpr={[1, 1.5]} camera={{ fov: 40, position: [0, 6, 14] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}>
  <hemisphereLight args={[palette.sky, palette.ground, 1.5]} />
  <directionalLight castShadow position={[6, 10, 4]} intensity={3}
    shadow-mapSize={[1024, 1024]} shadow-bias={-0.0002} shadow-normalBias={0.02}
    shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10}
    shadow-camera-near={1} shadow-camera-far={30} />
  <ContactShadows position={[0, 0.01, 0]} scale={24} opacity={0.4} blur={2} far={3} resolution={256} frames={1} />
```

- **Use `shadows="percentage"`, not `shadows` / `shadows="soft"`.** fiber 9.8.1 maps `true` and `"soft"` to `THREE.PCFSoftShadowMap`, and three r186 removed it: `WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.` (verified in `three/build/three.module.js` r186 and fiber's `configuration`). `"percentage"` = `PCFShadowMap`, which is the soft one now ([migration guide 181→182](https://github.com/mrdoob/three.js/wiki/Migration-Guide)).
- Intensities are physical since r155 (no hidden ×π), so hemisphere ≈ 1–2 and directional ≈ 2–4 rather than 0.5/1 ([r155 lighting post](https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733)). `HemisphereLight` cannot cast shadows; only the directional does.
- Directional shadow camera defaults to a 10×10 ortho box (`OrthographicCamera(-5, 5, 5, -5, 0.5, 500)`); size it to the Room, not larger, or the 1024 map smears. `bias`/`normalBias` kill the acne stripes that flat-shaded low poly shows badly ([forum: low poly ugly shadows](https://discourse.threejs.org/t/low-poly-model-ugly-shadows/16858)). `castShadow` on cabinets/prizes/ball, `receiveShadow` on floor and cabinet tops only.
- `ContactShadows frames={1}` renders the blob once; cheap and grounds the cabinets. Skip it under moving things.
- If the frame budget is tight, `<BakeShadows />` freezes the shadow map (`shadowMap.autoUpdate = false`), then the ball/claw lose their moving shadows; acceptable in Room mode.

### drei helpers: worth it or not

| Helper | Verdict |
|---|---|
| `PerspectiveCamera makeDefault` | Yes if the camera lives in a component; otherwise `Canvas camera={{...}}` is enough. |
| `CameraControls` | Yes, the fly-to (section 6). |
| `ContactShadows` | Yes, `frames={1}`, res 256. |
| `Stage` | No. Defaults to `environment="city"` + `adjustCamera`, fights the diorama camera, and its default environment fetches an HDR from a CDN. |
| `Environment preset` | No. Presets are loaded from `raw.githack.com` at runtime and drei's docs say `preset` is "not meant to be used in production environments and may fail as it relies on CDNs" ([environment docs](https://drei.docs.pmnd.rs/staging/environment)). Flat palette + hemisphere light doesn't need IBL. If a Gold shine needs reflections, self-host a tiny HDR via `files`, or use `<Environment resolution={32}>` with two `Lightformer`s (the pattern in pmndrs' [20k challenge](https://github.com/pmndrs/examples/blob/main/examples/bruno-simons-20k-challenge/src/App.tsx)). |
| `Html` | Yes for in-scene prompts ("press to play"); the HUD proper is DOM/Tailwind over the canvas. |
| `Text` | Yes for signage (troika SDF, one draw per text). |
| `Edges` / `Outlines` | Optional polish on cabinets; each is an extra draw per mesh. |
| `PerformanceMonitor` + `AdaptiveDpr` | Yes, cheap insurance (below). |
| `Preload all` | Yes, once, to compile shaders before the first fly-to. |
| `Stats` / `StatsGl` | Dev only. |
| `Bvh` | No, nothing is raycast-heavy. |
| `SoftShadows`, `AccumulativeShadows` | No, shader patching / many passes for a look this palette doesn't need. |

### Mobile limits

- `dpr={[1, 1.5]}` (fiber's default is `[1, 2]`; the clamp is `min(max(dpr[0], devicePixelRatio), dpr[1])`, [utils](https://github.com/pmndrs/react-three-fiber/blob/master/packages/fiber/src/core/utils.tsx)). The docs don't prescribe a number; 1.5 is the project choice.
- `<PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)}>` or `<AdaptiveDpr pixelated />`, which multiplies dpr by `performance.current` while `regress()` is active (drei's controls call `regress` during interaction when passed `regress`).
- Shadow map 1024 on desktop, 512 on mobile (`shadow-mapSize` must be a power of two); one shadow-casting light only.
- Draw calls: fiber's guidance is "no more than 1000 as the very maximum, and optimally a few hundred or less" ([scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)); this scene should sit well under 100 with instanced stacker cells and shared materials.
- `frameloop`: keep `"always"` while any Machine is playing (rapier steps in fiber's frame loop by default). `frameloop="demand"` + `<Physics updateLoop="independent">` (rapier runs its own rAF and calls `invalidate()` only while bodies move, [README](https://github.com/pmndrs/react-three-rapier/blob/main/packages/react-three-rapier/readme.md#on-demand-rendering)) is the battery-friendly Room-mode option, but the camera fly-to and Stacker ticks then need `invalidate()` calls; `CameraControls` does that for you. Not worth wiring in the first two hours.
- Never create `Vector3`/`Color` objects inside `useFrame`; reuse module-level scratch objects ([pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)).

## 5. Camera fly-to and disabling orbit in Play mode

**Recommendation: drei `CameraControls` with `setLookAt(..., true)`.** It ships the transition, the damping, the `invalidate()` plumbing and the input toggles; `maath` damping is the fallback if you want the camera fully scripted.

```tsx
'use client'
import { useEffect, useRef } from 'react'
import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useArcade } from '@/arcade/state'

const DOCKS = {
  room:     { pos: [0, 6, 14],     look: [0, 1.5, 0] },
  claw:     { pos: [-4, 2.2, 4.5], look: [-4, 1.4, 0] },
  stacker:  { pos: [0, 2.4, 4.5],  look: [0, 1.6, 0] },
  skeeball: { pos: [4, 2.2, 5],    look: [4, 1.2, -1] },
} as const

export function ArcadeCamera() {
  const ref = useRef<CameraControlsImpl>(null)
  const mode = useArcade((s) => s.mode)
  const inPlay = mode.kind === 'play'

  useEffect(() => {
    const dock = DOCKS[mode.kind === 'play' ? mode.machine : 'room']
    ref.current?.setLookAt(...dock.pos, ...dock.look, true)   // enableTransition = true
  }, [mode])

  return (
    <CameraControls ref={ref} makeDefault smoothTime={0.6}
      enabled={!inPlay}                       // no orbit/zoom/truck while a Machine has the input
      minDistance={3} maxDistance={20} maxPolarAngle={Math.PI / 2.1}
      mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, middle: CameraControlsImpl.ACTION.NONE,
                      right: CameraControlsImpl.ACTION.NONE, wheel: CameraControlsImpl.ACTION.DOLLY }}
      touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_DOLLY,
                 three: CameraControlsImpl.ACTION.NONE }} />
  )
}
```

- `setLookAt(positionX, positionY, positionZ, targetX, targetY, targetZ, enableTransition = false): Promise<void>` (camera-controls 3.1.2 `dist/index.d.ts`; drei 10.7.9 bundles camera-controls v3). The promise resolves when the transition rests, so `await` it before flipping the Machine's `active` prop if you want input to unlock only after the camera lands. `smoothTime` is "approximate time in seconds to reach the target" (default 0.25), `draggingSmoothTime` 0.125; `fitToBox(object, true, { paddingTop: 0.5 })` is a handy alternative that frames a cabinet without hand-placed dock positions ([camera-controls README](https://github.com/yomotsu/camera-controls)).
- Disabling orbit in Play mode: `enabled={false}` is the whole answer; `setLookAt` still works while disabled because transitions run in `update()`, which drei drives from `useFrame`. If you want partial input (e.g. keep wheel zoom), map individual `mouseButtons` / `touches` actions to `ACTION.NONE` instead. There is no `lock()`; the pointer-lock methods are `lockPointer()`/`unlockPointer()`, not relevant here.
- camera-controls v3 no longer normalises azimuth, so after a lot of orbiting a fly-to can spin the long way round; call `ref.current.normalizeRotations()` before `setLookAt` ([V3 migration guide](https://github.com/yomotsu/camera-controls#v3-migration-guide)).
- Escape → `exit()` → `mode = { kind: 'room' }` → same effect flies back to the Room dock. World owns this component; Machines never touch the camera (plan contract).

`maath` fallback (no controls at all, camera fully scripted): in `useFrame((state, dt) => { easing.damp3(state.camera.position, dock.pos, 0.5, dt); easing.damp3(lookTarget, dock.look, 0.5, dt); state.camera.lookAt(lookTarget) })`. `damp3(current, target, smoothTime = 0.25, delta, maxSpeed?, easing?, eps?)` returns `true` while still moving (`maath/easing`, "Unity-smooth-damping... refresh-rate independent, interruptible", [README @0.10.8](https://github.com/pmndrs/maath/blob/maath@0.10.8/README.md)). `smoothTime` is a time constant, not a lerp factor; always pass `dt`.

## Open questions / things to watch

- Nested ring sensors on Skeeball: the double-hit ordering above is untested; if it misfires, switch to non-overlapping annular sensors (rings as `CylinderCollider` tubes are not available, so use a ring of 6 small cuboid sensors or size annuli by height).
- `@react-three/rapier` 2.2.0 is from 2025-11; it has not been rebuilt against three 0.186 / fiber 9.8, but peers allow it and the smoke typecheck passes. If the debug renderer or `InstancedRigidBodies` misbehave on r186, check the [issue tracker](https://github.com/pmndrs/react-three-rapier/issues) before spending time.
- `typescript` 7 is `latest`; pin 5.9 unless Next 16.3 tooling is confirmed happy with 7.

## Sources

- npm registry (`npm view`, 2026-09-26) for every version and peer range; local `pnpm install` + `tsc` smoke test of the pin set.
- Installed `.d.ts`: `@react-three/rapier@2.2.0` (`types.d.ts`, `components/Physics.d.ts`, `hooks/joints.d.ts`, `hooks/hooks.d.ts`), `@dimforge/rapier3d-compat@0.19.2` (`dynamics/rigid_body.d.ts`, `dynamics/impulse_joint.d.ts`, `geometry/collider.d.ts`, `pipeline/world.d.ts`), `@react-three/drei@10.7.9` (`core/*.d.ts`), `camera-controls@3.1.2` (`dist/index.d.ts`), `@react-three/fiber@9.8.1` (`core/configuration.d.ts`, `core/store.d.ts`), `maath@0.10.8` (`easing.d.ts`), `three@0.186.1` (`build/three.module.js`).
- react-three-rapier: [README](https://github.com/pmndrs/react-three-rapier/blob/main/packages/react-three-rapier/readme.md), [CHANGELOG](https://github.com/pmndrs/react-three-rapier/blob/main/packages/react-three-rapier/CHANGELOG.md), source under [`packages/react-three-rapier/src`](https://github.com/pmndrs/react-three-rapier/tree/main/packages/react-three-rapier/src), [typedoc](https://pmndrs.github.io/react-three-rapier/).
- rapier.rs JS guides: [rigid bodies](https://rapier.rs/docs/user_guides/javascript/rigid_bodies), [colliders](https://rapier.rs/docs/user_guides/javascript/colliders), [joints](https://rapier.rs/docs/user_guides/javascript/joints), [solver settings](https://rapier.rs/docs/user_guides/javascript/rigid_body_solver_settings), [determinism](https://rapier.rs/docs/user_guides/javascript/determinism); [rapier#594](https://github.com/dimforge/rapier/issues/594); [rapier.js CHANGELOG](https://github.com/dimforge/rapier.js/blob/master/CHANGELOG.md).
- fiber docs: [installation](https://r3f.docs.pmnd.rs/getting-started/installation), [v9 migration](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide), [canvas](https://r3f.docs.pmnd.rs/api/canvas), [scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance), [pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls); source [`configuration.ts`](https://github.com/pmndrs/react-three-fiber/blob/master/packages/fiber/src/core/configuration.ts).
- drei: [CameraControls](https://drei.docs.pmnd.rs/controls/camera-controls), [Environment](https://drei.docs.pmnd.rs/staging/environment), [ContactShadows](https://drei.docs.pmnd.rs/staging/contact-shadows), [Instances](https://drei.docs.pmnd.rs/performances/instances), [PerformanceMonitor](https://drei.docs.pmnd.rs/performances/performance-monitor); source under [`src/core`](https://github.com/pmndrs/drei/tree/master/src/core).
- camera-controls: [README + V3 migration](https://github.com/yomotsu/camera-controls). maath: [README @0.10.8](https://github.com/pmndrs/maath/blob/maath@0.10.8/README.md).
- three.js: [Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide), [r155 lighting](https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733), [InstancedMesh.js](https://github.com/mrdoob/three.js/blob/dev/src/objects/InstancedMesh.js), [PR #25591](https://github.com/mrdoob/three.js/pull/25591), [normal_fragment_begin](https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderChunk/normal_fragment_begin.glsl.js).
- Next.js: [lazy loading](https://nextjs.org/docs/app/guides/lazy-loading), [transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages); [react-three-next](https://github.com/pmndrs/react-three-next).
- Prior art: [LiamDaPanda/claw-web](https://github.com/LiamDaPanda/claw-web), [neciszhang/claw3d](https://github.com/neciszhang/claw3d), [RiwRiwara/claw-machine](https://github.com/RiwRiwara/claw-machine), [pmndrs rapier-ping-pong](https://github.com/pmndrs/examples/blob/main/examples/rapier-ping-pong/src/App.tsx), [jtmingus/blockstack-game](https://github.com/jtmingus/blockstack-game), [neilwoodroffe/stacker](https://github.com/neilwoodroffe/stacker), [sean-obeirne/JS-Stacker](https://github.com/sean-obeirne/JS-Stacker).
