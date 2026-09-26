# Play information lives on the cabinet's Display, not in a DOM overlay

Status: accepted (2026-09-26)

Every Machine's HUD is an in-world Display drawn on the cabinet (title, Round state, the numbers the player needs). The 2D Shell over the canvas holds only Room-level things: Ticket balance, one prompt line, Back. We chose this over a crisp DOM overlay per Machine because four DOM HUDs built by four people had become four visual dialects, and the one cabinet with an in-world display (Whack-a-Mole) was the only one that felt finished and cohesive with the Room. The trade is readability: Display text goes through the Look (low-res, dither, scanlines), so the Look is held at its current values and the rule is that Display numbers must read from the Play-mode camera. Reversing this means rebuilding four Displays, so do not "fix" a Machine by moving its numbers back into the DOM.
