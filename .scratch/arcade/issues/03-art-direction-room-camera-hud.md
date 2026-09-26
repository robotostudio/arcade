# 03 World build: art direction, Room, camera fly-to, HUD, integration

Type: prototype
Status: open
Role: everyone (Phase 2)
Slot: T+1:45 to 2:35
Blocked by: 04, 05, 06, 07 (playable on harness pages, not polished)

## Question

What does the arcade look like, and how does moving between Room mode and Play mode feel? Built by all three at once, in slices so nobody collides:

**Art direction is decided** (Jono, T+0:15): a PS1-era demake in the Bloodborne PSX register. Black void, gaslamp gloom, wobbling vertices, crunchy 15-bit dither, scanlines. Four reference frames in [docs/research/refs/](../../../docs/research/refs/), the verified R3F recipe in [docs/research/psx-look.md](../../../docs/research/psx-look.md). Issue 09 (Jono, T+0:25) puts the wrapper on `main`; this issue fills it in. The crunch is load-bearing: it hides rough procedural geometry, so spend the time on mood, not on edges.

- **Sne**: palette (Bloodborne-flavoured, Roboto-tinted: near-black, muddy brown, stone grey, blood red, sickly lamp green, bone white, gaslamp blue, gold; the recipe has starting hexes), lighting (dim cold hemisphere, one green lamp per prop, faint blue moonlight), floor/walls/signage, props (lamps, a chapel-window silhouette, railings), procedural crunchy textures, dither level and snap tuning.
- **Daniel**: camera fly-to per station with Escape to return, Room/Play/Store mode switching, HUD shell (station name, "press to play" prompt, Ticket balance, Round-end feedback). HUD in the register of reference frame 3: pixel font, small, boxed bars, sits above the CRT overlay so it stays crisp. The fly-to is where the vertex wobble shows; keep `smoothTime` long enough to enjoy it.
- **Jono**: place the three Machines and the Store counter in the Room, wire `onRoundEnd` to `awardTickets`, keep `main` deploying.

Machines never touch the camera. Commit small, pull before every commit; `src/world/` is shared.

Answer records: the palette, the tuned look constants (dpr, snap grid, dither levels, fog range, scanline pitch), camera dock positions per station, the interaction rules, and the deployed URL at checkpoint 2.

## Comments
