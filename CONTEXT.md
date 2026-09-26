# Arcade glossary

Use these words in code, commits and Linear. Nothing else here: no implementation.

- **Room**: the single diorama scene that holds everything. The Store counter and the Machines live in it.
- **Machine**: a playable cabinet: **Claw**, **Skeeball**, **Stack to the Top** or **Whack-a-Mole**. A Machine's signage may carry a cabinet name (Whack-a-Mole's cabinet reads "Mole Patrol"); the glossary name is the one used in code and issues.
- **Stack to the Top**: the stacking Machine. A moving row stops on Space and trims to what overlaps the row below; plus two prize lines: the **Minor Prize** line (10 rows stacked pauses the game: Take Minor or Go for Major) and the **Major Prize** line (the top row).
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
- **Livery**: the shared visual language every Machine and the Store wear: the dark **Plinth**, trim and Display frame, cream panels, a body painted in the Machine's **Accent**, the **Display**, and one typeface shared with the **Shell**. The Look is what the camera sees the Livery through.
- **Accent**: the one colour a Machine owns within the Livery. It is the cabinet's body colour, so a Machine reads apart from the others at Room distance. Whack-a-Mole orange, Skeeball blue, Stack to the Top pink, Claw teal.
- **Plinth**: the shared dark base every cabinet stands on.
- **Display**: the in-world screen on a cabinet carrying its title, Round state and the numbers the player needs (balls, rows, time, Whacks). The Display is a Machine's HUD; a Machine never draws play information outside it.
- **Shell**: the one 2D frame the Room draws over every Machine in Play mode. It holds only Room-level things: the Ticket balance, one prompt line naming the real key and verb for the current phase, and Back. A Machine supplies the prompt string per phase and nothing else.
- **Subject**: the thing the player acts on in a Machine: the Claw over a prize, the Skeeball ball, the moving row in Stack to the Top, a popped Mole. The Subject, and the numbers on the Display, must read through the Look from the Play-mode camera; everything else may dissolve into it.
- **Look**: the PS1-demake render treatment over the whole canvas (low-res, vertex snap, dither, fog) plus the **CRT** overlay (CSS scanlines and vignette at native resolution). Lives in `src/world/look/`; `?clean=1` disables it.
