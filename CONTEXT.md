# Arcade glossary

Use these words in code, commits and Linear. Nothing else here: no implementation.

- **Room**: the single diorama scene that holds everything. The Store counter and the three Machines live in it.
- **Machine**: one of the three playable cabinets: **Claw** (left), **Stacker** (centre, red boxes), **Skeeball** (right).
- **Room mode**: camera framing the whole Room; Machines and the Store are selectable.
- **Play mode**: camera docked at one Machine; only that Machine's controls are live.
- **Round**: one play of a Machine from start to its end (win, lose, or balls spent).
- **Tickets**: the local-only balance a Round pays out. Never persisted beyond `localStorage`.
- **Store**: the 3D prize counter in the Room. Selecting it opens the Store HUD.
- **Item**: a product on the Store counter. All Items are Roboto merch or services.
- **Tier**: an Item's value band, shown as a ring under it: **White** (low), **Blue** (mid), **Gold** (top, shining).
- **Discount**: the price cut bought by applying Tickets to an Item.
- **HUD**: the 2D overlay on top of the canvas (prompts, Ticket balance, Store panel, Round results).
