# Arcade glossary

Use these words in code, commits and Linear. Nothing else here: no implementation.

- **Room**: the single diorama scene that holds everything. The Store counter and the three Machines live in it.
- **Machine**: one of the four playable cabinets in the arc: **Claw**, **Stacker** (red boxes), **Skeeball**, **Whack-a-Mole**.
- **Room mode**: camera framing the whole Room; Machines and the Store are selectable.
- **Play mode**: camera docked at one Machine; only that Machine's controls are live.
- **Round**: one play of a Machine from start to its end (win, lose, balls spent, or time up).
- **Hole**: one of the nine slots on the Whack-a-Mole board a Mole can rise from.
- **Mole**: the thing that rises from a Hole. One Mole per Hole.
- **Pop**: a Mole rising and staying up for a window before it ducks.
- **Whack**: a hit on a Mole while it is up. Whacks are what a Whack-a-Mole Round scores.
- **Miss**: a Pop that ends with the Mole ducking unwhacked.
- **Tickets**: the local-only balance a Round pays out. Never persisted beyond `localStorage`.
- **Store**: the 3D prize counter in the Room. Selecting it opens the Store HUD.
- **Item**: a product on the Store counter. All Items are Roboto merch or services.
- **Tier**: an Item's value band, shown as a ring under it: **White** (low), **Blue** (mid), **Gold** (top, shining).
- **Discount**: the price cut bought by applying Tickets to an Item.
- **HUD**: the 2D overlay on top of the canvas (prompts, Ticket balance, Store panel, Round results).
- **Look**: the PS1-demake render treatment over the whole canvas (low-res, vertex snap, dither, fog) plus the **CRT** overlay (CSS scanlines and vignette at native resolution). Lives in `src/world/look/`; `?clean=1` disables it.
