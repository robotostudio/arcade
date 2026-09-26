# 03 World build: art direction, Room, camera fly-to, HUD, integration

Type: prototype
Status: open
Role: everyone (Phase 2)
Slot: T+1:45 to 2:35
Blocked by: 04, 05, 06, 07 (playable on harness pages, not polished)

## Question

What does the arcade look like, and how does moving between Room mode and Play mode feel? Built by all three at once, in slices so nobody collides:

- **Sne**: palette (Roboto-flavoured, 5 to 7 flat colours), lighting, floor/walls/signage, props.
- **Daniel**: camera fly-to per station with Escape to return, Room/Play/Store mode switching, HUD shell (station name, "press to play" prompt, Ticket balance, Round-end feedback).
- **Jono**: place the three Machines and the Store counter in the Room, wire `onRoundEnd` to `awardTickets`, keep `main` deploying.

Machines never touch the camera. Commit small, pull before every commit; `src/world/` is shared.

Answer records: the palette, camera dock positions per station, the interaction rules, and the deployed URL at checkpoint 2.

## Comments
