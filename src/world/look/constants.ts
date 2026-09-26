// The PSX look, as numbers. Tune these, not JSX (issue 09, docs/research/psx-look.md).
export const LOOK = {
  void: '#050406', // background + fog colour; must match or the horizon shows
  dpr: 0.35, // plain number: fiber passes it straight to setPixelRatio (no clamp)
  cleanDpr: [1, 1.5] as [number, number], // ?clean=1
  snap: [160, 120] as [number, number], // vertex-snap NDC grid; lower = more wobble
  ditherLevels: 32, // per channel; 32 = 15-bit like the PS1 framebuffer
  fog: [6, 18] as [number, number], // near, far
  hemi: { sky: '#3a4560', ground: '#1a1410', intensity: 0.6 },
  moon: { color: '#9aa8c0', intensity: 0.8, position: [6, 10, 6] as [number, number, number] },
} as const
