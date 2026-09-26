# Arcade glossary

Use these words in code, commits and Linear. Nothing else here: no implementation.

- **Room**: the single diorama scene that holds everything. The Store counter and the three Machines live in it.
- **Machine**: a playable cabinet: **Claw**, **Stacker**, **Skeeball**, **Stack to the Top**, or the planned **Whack-a-Mole**.
- **Stack to the Top**: the second stacking Machine. Stacker rules plus two prize lines: the **Minor Prize** line (10 rows stacked pauses the game: Take Minor or Go for Major) and the **Major Prize** line (the top row).
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
- **Item**: a product on the Store counter. Every Item is a **Bundle**.
- **Bundle**: a vintage clothing lot sold as one Item: a reseller-style title, a piece count, a total price and a Grade. Card format borrowed from Fleek for fun; no affiliation, no name, no logo.
- **Grade**: a Bundle's reseller condition grade, worst to best: C, B/C, B, A/B, A, NWT (new with tags). Grades map to Tiers: White = C / B/C, Blue = B / A/B, Gold = A / NWT.
- **Tier**: an Item's value band, shown as a ring under it: **White** (low), **Blue** (mid), **Gold** (top, shining).
- **Credit**: money off a Bundle's total bought by applying Tickets: 1 Ticket = £0.10, capped at 50% of the total. Replaces the old percentage Discount for every Machine.
- **HUD**: the 2D overlay on top of the canvas (prompts, Ticket balance, Store panel, Round results).
- **Look**: the PS1-demake render treatment over the whole canvas (low-res, vertex snap, dither, fog) plus the **CRT** overlay (CSS scanlines and vignette at native resolution). Lives in `src/world/look/`; `?clean=1` disables it.
