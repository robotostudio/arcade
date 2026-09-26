// The Room cat, as numbers. Tune these, not JSX. Times in seconds, distances in metres.
export const CAT = {
  scale: 1, // the whole cat; 1 is about 0.75 m to the ear tips
  walkSpeed: 1.1, // m/s
  turnRate: 8, // heading damp; higher turns snappier
  strideRate: 11, // leg-swing radians per metre walked
  firstStrike: 6, // after the Room loads, before the first pee
  strikeEvery: 10, // wandering between putting one fire out and lighting the next
  strikeJitter: 2, // +- on strikeEvery so it does not feel like a metronome
  returnAfter: 5, // after a fire starts, the cat heads back to put it out
  settleTime: .35, // turning to side-on at the cabinet
  liftTime: .35, // hind leg up
  peeTime: 1.8, // stream running
  hitAt: .5, // fraction of peeTime when the stream does its thing (sparks + fire, or douse)
  lowerTime: .3, // hind leg down
  pause: [.4, 1.6] as [number, number], // idle between wander legs
  wander: { radius: [1.6, 2.7] as [number, number], arc: 70 }, // round the hub spot, degrees either side of ahead
  approach: 1.1, // walks in alongside the cabinet from this far in front of its stand spot
  gap: .4, // cat's centre to the cabinet flank
  hitY: .35, // where the stream lands on the flank
  arc: .14, // stream arc height
}

// Where the cat stands on each cabinet: flank half-width and how far forward along it (the
// cabinet's own frame, +z toward the player, world metres with the hub scale applied). The cat
// picks whichever flank is nearer the middle of the Room so the camera sees it.
export const FLANKS: Record<string, { halfWidth: number; standZ: number }> = {
  whackamole: { halfWidth: 1.1, standZ: .4 },
  claw: { halfWidth: 1.56, standZ: .5 },
  skeeball: { halfWidth: .9, standZ: .9 },
  stacktop: { halfWidth: .9, standZ: .05 },
}

export const HUB_CENTRE = [0, 1.5] as const // [x, z]: the hub spot in Room.tsx; the cat wanders round it

export const FX = {
  fireRise: .75, // flame column height
  fireUp: 3, // fire level damp while burning
  fireDown: 7, // fire level damp once doused
  smokeDown: .7, // smoke lingers after the fire
  sparkEvery: [.25, .9] as [number, number], // gap between spark bursts
  zapEvery: [.15, .7] as [number, number], // gap between electric arcs
  zapTime: .07, // one arc's life
  steamTime: 1.8,
  puddleEvaporate: 6, // a full puddle dries in about this long
  light: 6, // flickering fire light intensity at full blaze
}
