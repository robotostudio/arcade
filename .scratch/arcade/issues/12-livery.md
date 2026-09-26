# 12 Livery: one design language across every Machine, the Store and the HUD

Type: build
Status: open
Role: Jono
Slot: after the deadline (planned 14:00 BST, 2026-09-26)
Blocked by: none

## Question

Make the four Machines, the Store and the HUD read as one arcade. Today there are three cabinet palettes (Claw gaslamp oxblood; Skeeball and Stack to the Top carnival maroon/blue/yellow; Whack-a-Mole orange/yellow/purple), four HUD dialects (Impact pills, Bungee tiles, an in-world screen, and nothing), two typefaces plus monospace, and vertex snap on the Claw only.

Planned by Jono with a full grilling at 13:40 BST. Everything below is decided. Vocabulary in [CONTEXT.md](../../../CONTEXT.md): Livery, Accent, Plinth, Display, Shell, Subject. Decision record: [ADR 0001](../../../docs/adr/0001-play-information-lives-in-world.md).

## Decided at planning

**Reference.** Whack-a-Mole (cabinet name "Mole Patrol") is the spec. Its structure becomes the Livery: dark Plinth, trim and Display frame; cream panels; body in one saturated Accent; a bordered Display carrying the title and the numbers. Its parts are adopted by the others, not redesigned.

**Look stays.** dpr 0.7, scanlines 0.055, indigo void `#171535`, bloom then dither, as live. The Void is indigo; `src/world/palette.ts` says black and is wrong. The recipe doc gets the live values recorded. No dpr change: in-world Display text has to stay readable.

**Accents (body colour, one per Machine).** Whack-a-Mole orange (as is). Skeeball blue. Stack to the Top pink. Claw teal. The Store has no Accent; it keeps the Tier colours (White, Blue, Gold) as its own and adopts the Plinth, cream panels and the typeface. Final hex values are tuned in the debug panel and recorded here when done.

**One material factory.** `src/world/livery.ts` (or similar) exports every colour and two material kinds: lit body (Lambert) and unlit Accent (Basic, so bloom lifts it). All go through the vertex snap. Per-Machine `materials.ts` files go away.

**Display.** Every cabinet gets an in-world Display in Whack-a-Mole's style: canvas texture, NearestFilter, dark screen, Accent border, title in Accent. It carries the Machine's numbers: Skeeball balls left and score; Stack to the Top row, Minor, Major, and its Take/Risk decision; Whack-a-Mole time left and Whacks; Claw phase (Move, Drop, Rising, Carrying) and prizes won this Round. Subject rule: the Subject and the Display numbers must read through the Look from the Play-mode camera.

**Shell.** One 2D frame drawn by the Room in Play mode: Ticket balance (top right), one prompt line (bottom) naming the real key and verb for the current phase ("Space: drop", "Arrows: aim"), Back. A Machine supplies one prompt string per phase and nothing else. No Machine name in the Shell; the Display has it. Surfaces are the Room's dark indigo at high opacity with cream text; the active Machine's Accent colours the prompt keyword. Skeeball's fullscreen Html HUD, StackTopHud and the Room play bar are replaced by the Shell plus Displays.

**Type.** VT323 everywhere, loaded once via next/font, drawn at integer sizes (20 and 40 px in the Shell; integer px on Display canvases, drawn after the font has loaded). Bungee and Impact go, including in the Store prize selector.

**Claw.** Full treatment, not a repaint: chunky body in teal, cream panels, Display; the gaslamp glass box and gloom go. The claw mechanism, prizes and chute stay as they are.

**Store.** Counter adopts Plinth, cream panels and VT323; the prize selector's cyan panels and Bungee go, replaced by Shell colours. Tier rings and piles keep White, Blue, Gold.

**Set dressing.** The five decorative cabinets (ORBIT, NOVA, RUSH, PLAY) take the Livery in muted Accents. The VHS intro stays as it is: a framing device, not part of the Room.

**Debug panel.** `?livery=1` opens a DOM panel outside the Look listing every Livery colour (Plinth, trim, panel, Display frame, Display text, one Accent per Machine, emissive strength for Accent-lit parts) as colour pickers. Changes apply live; overrides persist in localStorage; "Copy as code" puts the current table on the clipboard in the exact shape of the constants file. Hand-built, no library (none is installed).

**Harnesses.** Every `/dev/*` page renders through `ArcadeCanvas`. `HarnessCanvas.tsx` (dpr 0.35, black fog, no composer) is deleted.

**Stacker.** Retired. Delete `src/machines/stacker/` cabinet and harness, the `'stacker'` MachineId and its payout line, keeping only the logic Stack to the Top imports. Drop it from the glossary once gone.

## Work list

1. `livery.ts`: colour table, two material kinds, snap applied. Palette file corrected (Void = indigo).
2. VT323 via next/font; Display canvas helper that draws with it.
3. Shell component in the Room; prompt-per-phase contract on `MachineProps` (propose to Sne: `prompt?: string` supplied via a callback or store slice).
4. Debug panel behind `?livery=1`.
5. Whack-a-Mole: swap to livery materials and the shared Display helper; numbers stay on its Display.
6. Skeeball: livery materials, Display, delete the Html HUD.
7. Stack to the Top: livery materials, Display with the Take/Risk decision, delete StackTopHud.
8. Claw: rebuild the cabinet shell in teal with a Display; keep mechanism.
9. Store counter and prize selector.
10. Decorative cabinets, muted Accents.
11. Route all harnesses through ArcadeCanvas; delete HarnessCanvas and Stacker.
12. Tune Accents in the panel; paste values here and into `livery.ts`; record live Look values in `docs/research/psx-look.md`.

## Answer

(pending)
