# Agent instructions

Low-poly 3D arcade, hackathon build, three devs, three hours. Read [PLAN.md](./PLAN.md) first, [CONTEXT.md](./CONTEXT.md) for vocabulary. Quick beats reliable.

## First session in this clone: who are you?

If `.whoami` does not exist at the repo root, before anything else ask: **"Who are you: sne, daniel or jono?"** Accept only those three. Write the name to `.whoami` (gitignored), then tell them their assignment from the table in PLAN.md and start on their first issue:

- **sne**: Stacker, then Store. Branch `sne`. Issues 06, 07.
- **daniel**: Skeeball. Branch `daniel`. Issue 05.
- **jono**: scaffold, then the look wrapper, then Claw, then launch. Branch `jono`. Issues 01, 09, 04, 08.

From T+1:45 everyone works issue 03 (the World build) together; PLAN.md says who takes which slice.

Every later session: read `.whoami`, work only your folders and issues, rebase onto `main` at each PLAN.md checkpoint. In Phase 2 `src/world/` is shared: pull before every commit.

## Rules

- Tracker is markdown: `.scratch/arcade/map.md` and `issues/NN-*.md`. Issues are pre-assigned by `Role:`. Resolve = `## Answer` + `Status: resolved` + a line in the map's Decisions so far.
- Only Sne edits `src/arcade/state.ts`; anyone else proposes the change in their issue comment.
- No tests, no CI, no backend. Commit small, push often, never force-push `main`.
- Feedback on others' work: three lines, Keep / Change / Cut, under `## Comments` in their issue file.
