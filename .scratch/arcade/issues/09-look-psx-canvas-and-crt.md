# 09 Look: PSX canvas wrapper and CRT overlay

Type: task
Status: open
Role: Jono
Slot: T+0:25 to 0:40 (before the Claw; time-box 15 minutes)
Blocked by: 01

## Question

Nothing to decide; the direction is set (Bloodborne PSX demake, [docs/research/psx-look.md](../../../docs/research/psx-look.md), reference frames in [docs/research/refs/](../../../docs/research/refs/)). This issue gets the crunch onto `main` before anyone builds a harness page, so every Machine is seen through it from the start.

Against the scaffold as it is (`src/world/Room.tsx` holds the `Canvas` inline, Standard `flatShading` materials, `shadows="percentage"`, one shadow directional, `dpr [1, 1.5]`):

**Step 1, must land (10 minutes):**

- New `src/world/ArcadeCanvas.tsx`: the `Canvas` plus everything scene-independent, taking `children`. `dpr={0.35}` (a constant `LOOK.dpr`), `flat`, `gl={{ antialias: false }}`, `style={{ imageRendering: 'pixelated' }}`, no `shadows` prop. Inside: `<color attach="background" args={[LOOK.void]} />`, `<fog attach="fog" args={[LOOK.void, 6, 18]} />`, a dim cold `hemisphereLight`, a faint blue-grey `directionalLight` without `castShadow`. `LOOK` lives in `src/world/look/constants.ts` (`void: '#050406'`, `dpr`, `snap`, `ditherLevels`, `fog: [6, 18]`) so Sne tunes numbers, not JSX, in Phase 2.
- `Room.tsx` becomes scene-only and renders inside `ArcadeCanvas`. `CameraControls` stays in the Room (Daniel replaces it in Phase 2). Placeholder boxes and floor switch to `meshLambertMaterial` (no `flatShading`), no `castShadow`/`receiveShadow`.
- `.crt` overlay from the recipe (section 5) in `globals.css`; `page.tsx` renders `<div className="crt" />` between the canvas and the HUD text. `body` background becomes `#050406` to match the void, and drop the `antialiased` class from `layout.tsx` (HUD text should not be smoothed).
- `?clean=1`: `ArcadeCanvas` reads `useSearchParams` once (or `window.location` in an effect); when set, `dpr={[1, 1.5]}`, no pixelated style, and the overlay gets `hidden`. Keep it dumb.
- Push. Tell Sne and Daniel: harness pages wrap their scene in `ArcadeCanvas`, nothing else.

**Step 2, only inside the time-box:**

- `pnpm add postprocessing@6.39.5 @react-three/postprocessing@3.1.2` (peers verified against three 0.186.1 and fiber 9.8.1 on 2026-09-26).
- `src/world/look/Dither.tsx` (recipe section 4) and `<EffectComposer multisampling={0}><Dither levels={LOOK.ditherLevels} /></EffectComposer>` as the last child of the Canvas in `ArcadeCanvas`, skipped under `?clean=1`.
- `src/world/look/psx-material.ts` with `psxify` (recipe section 2) and a first `src/world/palette.ts` exporting shared `psxify(new MeshLambertMaterial({ color }))` instances for the placeholder colours. Sne takes the palette over in Phase 2.

If step 2 does not fit, it moves to the 1:00 checkpoint (Jono, 10 minutes, after the Claw is playable) and the Claw starts on time. No shadow maps come back at any point.

Answer records: what landed in step 1 and step 2, the `LOOK` constants as shipped, the preview URL, and any surprise from `dpr` below 1 (pointer picking, `CameraControls`, drei `Html` scaling).

## Comments
