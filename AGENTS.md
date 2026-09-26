# Agent instructions

Low-poly 3D arcade, hackathon build, three devs, three hours. Read [PLAN.md](./PLAN.md) first, [CONTEXT.md](./CONTEXT.md) for vocabulary. Quick beats reliable.

## First session in this clone: who are you?

If `.whoami` does not exist at the repo root, before anything else ask: **"Who are you: sne, daniel or jono?"** Accept only those three. Then:

1. Write the name to `.whoami` (gitignored).
2. Read the role table in `.scratch/arcade/map.md`. If the person already has a role there, tell them and stop. Otherwise ask which unclaimed role they want, **World**, **Machines** or **Store** (PLAN.md says what each owns), write `name` next to it in the table, set `Status: claimed (name)` on that role's files in `.scratch/arcade/issues/`, commit as `Claim <role>: <name>` and push `main`.
3. Check out or create the role's branch (`world`, `machines`, `store`) and start on its first issue.

Every later session: read `.whoami`, work only your role's folders and issues, rebase onto `main` at each PLAN.md checkpoint.

## Rules

- Tracker is markdown: `.scratch/arcade/map.md` and `issues/NN-*.md`. Claim = `Status: claimed (name)`. Resolve = `## Answer` + `Status: resolved` + a line in the map's Decisions so far.
- Never edit `src/arcade/state.ts` outside the Store role without tagging the other two in your issue comment.
- No tests, no CI, no backend. Commit small, push often, never force-push `main`.
- Feedback on others' work: three lines, Keep / Change / Cut, under `## Comments` in their issue file.
