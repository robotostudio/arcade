# 12 Roaming arcade cat, growing plants and stale-air effects

Type: prototype
Status: resolved
Role: daniel (user-requested shared World addition)

## Question

Add a low-poly roaming cat to the main Room. It lifts a hind leg and pees yellow on a Machine, causing sparks, shaking and a one-second blackout. A small fire follows, then the cat returns and extinguishes it with another stream. Add at most two animated plants which grow when watered, plus drifting dust and stale-air effects.

## Answer

Added `src/world/RoomLife.tsx` and a small integration in `Room.tsx`. Procedural ginger cat with mint collar, striped back, swinging tail and walking legs. A repeating 28-second route visits all four Machines and alternates two plants: 8–10 s cabinet watering; 10–11 s blackout and cabinet shake; 12 s fire begins; 18–20 s return watering shrinks the fire away; 26–28 s plant watering. A carpet waypoint keeps travel in the open Room. Sparks, puddle, smoke and warm fire light complete the fault. Plants sway and bounce at rest and smoothly grow after watering, capped at twice their starting size. Extra fine dust and faint breathing haze reuse the existing Atmosphere primitives.

The sequence pauses in Play/Store mode and waits for the intro to finish. Fault effects disappear while playing. Reduced-motion preference suppresses blackout, cabinet shake and walking bounce and softens ambient movement. Shared state and Machine implementation files unchanged.

Pulled main before implementation and again during verification. Preserved the team's concurrent sound-effect integration in the Room merge. TypeScript passes. Production build passes with `next build --webpack` (all nine routes). Default Turbopack build cannot open its CSS worker port in this environment. Browser preview verifies the cat, plants, drifting dust and a lit cabinet fire in the rendered Room.
