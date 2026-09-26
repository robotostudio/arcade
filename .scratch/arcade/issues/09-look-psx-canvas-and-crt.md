# 09 Look: PSX canvas wrapper and CRT overlay

Type: task
Status: resolved
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

- Jono (2026-09-26, T+1:15): harness template landed as `src/world/Harness.tsx` (team handoff gap 1). `<Harness title help camera={DOCK} machine={(props) => <Machine position={[0,0,0]} {...props} />} />`: ArcadeCanvas, CameraControls framed once on the Machine's `DOCK` (`{ position, target }`, the same shape the Room's fly-to composes), the Machine at the origin with `active` true, a tickets / rounds / last readout and a Reset that remounts the Machine. No `<Physics>` in it; each physics Machine mounts its own. Sne's `src/arcade/dev/HarnessCanvas.tsx` on `sne` is the same idea with the same camera prop; swap the import when rebasing, or keep both, it does not matter today.

## Answer

Both steps landed (commit 0216676 on `jono`).

**Step 1**
- `src/world/ArcadeCanvas.tsx` (client): `ArcadeCanvas({ children, camera? })`, default camera `[0, 7, 12]` fov 45. Canvas with `dpr={LOOK.dpr}`, `flat`, `gl={{ antialias: false }}`, `style={{ position: 'absolute', inset: 0, imageRendering: 'pixelated' }}`, no `shadows`. Inside: void background, fog, dim cold `hemisphereLight`, blue-grey `directionalLight` (no castShadow), then children.
- The `.crt` overlay is rendered by `ArcadeCanvas` itself as a sibling after the Canvas (not in `page.tsx`), so every dev harness gets it without extra wiring. CSS lives in `src/world/look/crt.css` (imported by ArcadeCanvas), `pointer-events: none`, 4px scanline pitch on 2dppx screens. HUD text rendered after the canvas in a page sits above it.
- `?clean=1`: read from `window.location.search` in a `useEffect` (no `useSearchParams`, so no Suspense boundary). Sets `dpr [1, 1.5]`, `imageRendering: auto`, skips the dither composer, hides the overlay.
- `Room.tsx` is scene-only inside `ArcadeCanvas`; `CameraControls` stays there. Placeholder boxes and floor use shared Lambert palette materials, no flatShading, no shadows. `RoomCanvas.tsx` and `page.tsx` unchanged.
- `body` background `#050406`, text bone `#d8cfc0`; `antialiased` dropped from `layout.tsx`.

**Step 2**
- `postprocessing@6.39.5` + `@react-three/postprocessing@3.1.2` added.
- `src/world/look/Dither.tsx` (recipe section 4) mounted as `<EffectComposer multisampling={0}><Dither levels={LOOK.ditherLevels} /></EffectComposer>`, last child of the Canvas, skipped under `?clean=1`.
- `src/world/look/psx-material.ts`: `psxify(material, affine?)` with `SNAP` built from `LOOK.snap`.
- `src/world/palette.ts`: `COLORS` (void, floor, stone, slate, steel, bone, amber, oxblood) and `MATERIALS`, one shared `psxify(new MeshLambertMaterial({ color }))` per colour.

**LOOK as shipped** (`src/world/look/constants.ts`)
```ts
void: '#050406', dpr: 0.35, cleanDpr: [1, 1.5], snap: [160, 120], ditherLevels: 32, fog: [6, 18],
hemi: { sky: '#3a4560', ground: '#1a1410', intensity: 0.6 },
moon: { color: '#9aa8c0', intensity: 0.8, position: [6, 10, 6] },
```

**Surprises from dpr < 1**: none seen at build time (`pnpm typecheck` and `pnpm build` clean). Not yet eyeballed in a browser: pointer picking and CameraControls use CSS pixels so should be unaffected; drei `Html` is banned by the look rules anyway.

Preview URL: pending merge to main.

- Jono (2026-09-26, T+1:00, production eyeball in Chrome): **Keep** the crunch on the Claw harness: cabinet, prizes, lamp and chute all read at dpr 0.35 and `?clean=1` switches cleanly. **Change** the Room at `/`: with the default camera 14 m out and fog 6-18 the boxes were dot patterns; moved the Room camera to [0, 3.6, 8.5] (c3058ef). Sne, in Phase 2 pick either a closer Room framing or a longer fog for the whole-Room shot. **Cut** nothing.
