// The PSX look, as numbers. Tune these, not JSX (issue 09, docs/research/psx-look.md).
export const LOOK = {
  void: '#131322', // background + fog colour; must match or the horizon shows
  dpr: 0.7, // plain number: fiber passes it straight to setPixelRatio (no clamp)
  cleanDpr: [1, 1.5] as [number, number], // ?clean=1
  snap: [160, 120] as [number, number], // vertex-snap NDC grid; lower = more wobble
  ditherLevels: 32, // per channel; 32 = 15-bit like the PS1 framebuffer
  fog: [13, 36] as [number, number], // near, far
  // Soft fluorescent fill keeps the carpet readable; cabinet light supplies the colour.
  hemi: { sky: '#9ca8df', ground: '#494064', intensity: 0.52 },
  moon: { color: '#a3b2ed', intensity: 0.28, position: [6, 10, 6] as [number, number, number] },
} as const
