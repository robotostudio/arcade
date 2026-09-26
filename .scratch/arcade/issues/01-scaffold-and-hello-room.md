# 01 Scaffold robotostudio/arcade and deploy a hello-room to Vercel

Type: task
Status: resolved
Role: Jono
Slot: T+0:00 to 0:25
Blocked by: none

## Question

Nothing to decide; this unblocks everyone's rebase. Jono, on `main`: Next.js App Router + TypeScript + pnpm + Tailwind, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, zustand. Include the `src/arcade/state.ts` stub exactly as PLAN.md's shared contract, and `src/machines/types.ts`. Render a placeholder Room: floor, three coloured boxes where the Machines go (Claw left, Stacker centre, Skeeball right), a fourth box for the Store counter, Lambert-lit. Create Vercel project `arcade` on the roboto team and get a public URL up. Push to `main` and tell the others to rebase.

The art direction (Bloodborne PSX demake, [docs/research/psx-look.md](../../../docs/research/psx-look.md)) was set at T+0:15, after this scaffold shipped; the look wrapper is [issue 09](./09-look-psx-canvas-and-crt.md), the next thing on Jono's list.

Answer records: the live URL, the Vercel project id, any R3F-on-Next gotchas.

## Comments

## Answer

Resolved 2026-09-26 ~10:58 UTC by Jono, commit `b054358` on `main`.

- **Live URL (public, no login): https://arcade-beta-eight.vercel.app**
- Vercel project `arcade` on team `roboto`: id `prj_0c3y5Z3dsJdpPhIFWose9I6uZ3oJ`, org `team_CNp3ksTz17Atl0OQQS9jBgAj`, GitHub `robotostudio/arcade` connected, so every push builds; `main` promotes to production.
- Team-scoped URLs (`arcade-roboto.vercel.app`, `arcade-git-main-roboto.vercel.app`, every preview `arcade-<hash>-roboto.vercel.app`) sit behind Vercel deployment protection and 302 to a Vercel login. Team members can log in; the public share link is the one above. Turn protection off in project settings if previews need to be open for the feedback rounds.
- Scaffold: Next 16.3.6 App Router + TS + pnpm + Tailwind 4, pins from issue 02 (react 19.3.0, three 0.186.1, fiber 9.8.1, drei 10.7.9, rapier 2.2.0, maath 0.10.8, zustand 5). `src/arcade/state.ts` is the PLAN.md contract with a working zustand stub (Sne owns it from here). `src/machines/types.ts` as in PLAN.md. `src/world/Room.tsx` exports `STATIONS` (claw x=-4, stacker 0, skeeball 4, store z=-5) so Machines can be dropped in at those slots.

R3F-on-Next gotchas hit:
- `next dev` in 16.3 appends a "nextjs-agent-rules" block to `AGENTS.md` on every start; set `agentRules: false` in `next.config.ts` (done). If it reappears in your diff, don't commit it.
- Canvas must sit behind `'use client'` plus `next/dynamic(..., { ssr: false })` (`src/world/RoomCanvas.tsx`); putting `dynamic` with `ssr:false` directly in a server page is rejected.
- `next build` rewrites `tsconfig.json` (`jsx: react-jsx`, extra `include`); committed as rewritten so it stops churning.
- `shadows="percentage"` works as issue 02 said; only console noise is three's `THREE.Clock` deprecation warning from fiber, ignore it.
- Registry timeouts under fnm/pnpm: `NODE_OPTIONS=--dns-result-order=ipv4first --no-network-family-autoselection`.
