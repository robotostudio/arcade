// The PSX look, as numbers. Tune these, not JSX (issue 09, docs/research/psx-look.md).
export const LOOK = {
  void: '#171535', // background + fog colour; must match or the horizon shows. Smoky, not black: the room is hazy.
  dpr: 0.7, // target crunch; ArcadeCanvas rounds it so a canvas pixel is a whole block of device pixels (2/3 on a 2x screen, 1/2 on 1x)
  cleanDpr: [1, 1.5] as [number, number], // ?clean=1
  snap: [160, 120] as [number, number], // vertex-snap NDC grid; lower = more wobble
  ditherLevels: 32, // per channel; 32 = 15-bit like the PS1 framebuffer
  fog: [8, 33] as [number, number], // near, far: the far wall sits ~17 from the hub camera and reads through ~35% haze
  // Bloom before the dither: only the glow blocks and screens cross the threshold; the dither then bands the halo.
  bloom: { threshold: 0.62, smoothing: 0.3, intensity: 0.75, radius: 0.6 },
  // Soft fluorescent fill keeps the carpet readable; cabinet light supplies the colour.
  hemi: { sky: '#9ca8df', ground: '#494064', intensity: 0.46 },
  moon: { color: '#a3b2ed', intensity: 0.28, position: [6, 10, 6] as [number, number, number] },
} as const
