# Arcade

A low-poly 3D arcade in the browser. One diorama Room, three playable Machines (Claw, Stacker, Skeeball), a 3D prize counter (the Store) where Tickets you win buy discounts on Roboto merch.

Hackathon build, 2026-09-26, three devs, three hours. **Quick beats reliable.**

- Plan, roles and timeline: [PLAN.md](./PLAN.md)
- Glossary: [CONTEXT.md](./CONTEXT.md)
- Issues and map: [.scratch/arcade/](./.scratch/arcade/)

**Live: https://arcade-beta-eight.vercel.app**

Stack: Next.js App Router, TypeScript, pnpm, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, zustand, Tailwind. Deployed to Vercel (`arcade`, roboto team); every push to `main` goes to production.

```sh
pnpm install
pnpm dev
```

## Dev harness pages and `?clean=1`

Each Machine has a harness page at `/dev/<machine>` (`/dev/claw`, `/dev/stacker`, `/dev/skeeball`, and `/dev/store` for the counter) that mounts it alone through the PSX look, camera framed on its `DOCK`, with a tickets / rounds / last readout. Template: `src/world/Harness.tsx`.

Add `?clean=1` to any URL to turn the look off (normal resolution, no dither pass, no CRT overlay) so a bug can be ruled in or out of the crunch.
