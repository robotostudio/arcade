// Skeeball collider geometry as pure data. No react/three imports: the node calibration script
// imports this too. Every number derives from SKEE (constants.ts); nothing is hardcoded here
// except slab thicknesses, which are collider detail rather than tuning.
//
// Machine-local metres, y up, origin = floor centre, player at +z looking toward -z.
//
// Sanity (checked against SKEE):
//   lane top     y = laneY = 0.75, z from 2.0 (player end) to -0.4 (ramp foot)
//   ramp top     runs (z -0.4, y 0.75) -> (z -1.0, y 1.45); crest = laneY + ramp.rise = 1.45, with
//                a backing plate from the well floor to the crest on its back face (z -1.0..-1.05)
//   row 10       shelf floor 0.95, z -1.04..-1.26, lip top 1.01      (0.5 below the crest)
//   row 20       shelf floor 1.15, z -1.26..-1.48, lip top 1.21
//   row 30       shelf floor 1.35, z -1.48..-1.70, lip top 1.41
//   row 40       shelf floor 1.55, z -1.70..-1.92, lip top 1.61
//   top row      shelf floor 1.75, z -1.92..-2.14, lip top 1.81; 50 |x|<0.26, 100s 0.30<|x|<0.58
//   back wall    z -2.16 (0.04 thick, inner face -2.14 = top row back edge), y 0.70..2.15
//   each row is troughDepth (0.22) deep in z and rises 0.2 on the previous, so a shelf's back edge
//   is exactly the next shelf's front edge; risers sit on those boundaries.
import { SKEE } from './constants'

export type Box = {
  center: [number, number, number]
  half: [number, number, number]
  rotX?: number // radians about x
  /** visual hint only; colliders ignore it */
  kind?: SolidKind
}
export type SensorBox = Box & { value: number } // value 0 = gutter

export type SolidKind =
  | 'lane'
  | 'ramp'
  | 'wall'
  | 'shelf'
  | 'lip'
  | 'riser'
  | 'divider'
  | 'backWall'
  | 'floor'
  | 'endStop'

const SLAB_T = 0.1 // lane, ramp, shelf, floor thickness
// Lip/riser and back-wall thickness in z. A row is troughDepth (0.22) deep and its own lip sits
// inside that span, so the clear floor is troughDepth - LIP_T; the back wall's inner face must not
// intrude on the top row either. Both were thicker (0.06 / 0.08): the top row then had 0.14 of
// floor for a 0.16 ball, which wedged on the lip edge above its sensor and never scored.
export const LIP_T = 0.05 // exported so Lane.tsx can tell which riser faces the crest backing buries
const BACK_T = 0.04 // inner face exactly on the top row's back boundary (backWall.z + BACK_T/2 = -2.14)
const DIVIDER_T = 0.04 // top-row pocket divider thickness in x
const DIVIDER_H = 0.3 // divider height above the top shelf
const LANE_OVERLAP = 0.02 // flat lane runs this far under the ramp foot so the join has no step
// Hood interior from SKEE.hood (the Cabinet draws the same panels); the colliders sit just inside
// those panels so nothing z-fights.
const HOOD_SETBACK = SKEE.hood.setback
const HOOD_ROOF_T = SKEE.hood.roofT
const HOOD_LINTEL_T = SKEE.hood.lintelT

const halfLaneW = SKEE.lane.w / 2
const laneBottom = SKEE.laneY - SLAB_T // 0.70: underside of every slab, top of the cabinet plinth
const wellWallTop = SKEE.laneY + SKEE.backWall.h // 2.15: side walls and back wall around the well

/** Angle of the ramp about x (positive tilts the box's +z end up toward -z, y up). */
export function rampAngle(): number {
  return Math.atan2(SKEE.ramp.rise, SKEE.ramp.zStart - SKEE.ramp.zEnd)
}

/** World y of the lip the ball hops off. */
export function lipY(): number {
  return SKEE.laneY + SKEE.ramp.rise
}

function box(
  kind: SolidKind,
  cx: number,
  cy: number,
  cz: number,
  hx: number,
  hy: number,
  hz: number,
  rotX?: number,
): Box {
  const b: Box = { center: [cx, cy, cz], half: [hx, hy, hz], kind }
  if (rotX !== undefined) b.rotX = rotX
  return b
}

/** Every fixed, non-sensor collider. */
export function laneSolids(): Box[] {
  const out: Box[] = []
  const { lane, ramp, wallT, wallH, troughDepth, troughLip, backWall, laneY, troughs } = SKEE

  // Flat lane slab, top at laneY, overlapping the ramp foot.
  {
    const z0 = lane.zStart
    const z1 = lane.zEnd - LANE_OVERLAP
    out.push(box('lane', 0, laneY - SLAB_T / 2, (z0 + z1) / 2, halfLaneW, SLAB_T / 2, (z0 - z1) / 2))
  }

  // Ramp slab: top surface from (ramp.zStart, laneY) to (ramp.zEnd, laneY + rise).
  {
    const dz = ramp.zStart - ramp.zEnd
    const len = Math.hypot(dz, ramp.rise)
    const a = rampAngle()
    // Up normal of the sloped surface in the (y, z) plane.
    const ny = Math.cos(a)
    const nz = Math.sin(a)
    const midY = laneY + ramp.rise / 2
    const midZ = (ramp.zStart + ramp.zEnd) / 2
    out.push(
      box('ramp', 0, midY - ny * (SLAB_T / 2), midZ - nz * (SLAB_T / 2), halfLaneW, SLAB_T / 2, len / 2, a),
    )
  }

  // Side walls: a low rail the whole length (lane.zStart -> backWall.z) at wallH above the lane,
  // plus a tall section over the ramp and well so a ball at the top row cannot spill sideways.
  {
    const z0 = lane.zStart
    const z1 = backWall.z
    const wx = halfLaneW + wallT / 2
    const railTop = laneY + wallH
    for (const s of [-1, 1]) {
      out.push(box('wall', s * wx, (laneBottom + railTop) / 2, (z0 + z1) / 2, wallT / 2, (railTop - laneBottom) / 2, (z0 - z1) / 2))
      const wz0 = ramp.zStart
      out.push(box('wall', s * wx, (railTop + wellWallTop) / 2, (wz0 + z1) / 2, wallT / 2, (wellWallTop - railTop) / 2, (wz0 - z1) / 2))
    }
  }

  // Crest backing: a plate from the well floor up to the lip, flush with the ramp's back edge. The
  // ramp slab is only SLAB_T thick, so behind the crest there is open air down to the 10 row's
  // riser and, under the ramp, no floor at all: a ball dropping back behind the crest slid under
  // the ramp and out through the gutter. Also gives the 10 row a proper back-of-hump face.
  out.push(box('riser', 0, (laneBottom + lipY()) / 2, ramp.zEnd - LIP_T / 2, halfLaneW, (lipY() - laneBottom) / 2, LIP_T / 2))

  // Player-end stop so a ball that rolls all the way back stays on the lane (times out to 0).
  out.push(box('endStop', 0, (laneBottom + laneY + wallH) / 2, lane.zStart + LIP_T / 2, halfLaneW + wallT, (laneY + wallH - laneBottom) / 2, LIP_T / 2))

  // Trough rows. Group troughs by z (the top row shares one shelf/lip/riser across three pockets).
  const rowZs = [...new Set(troughs.map((t) => t.z))].sort((a, b) => b - a) // front (nearest 0) first
  const rows = rowZs.map((z) => {
    const inRow = troughs.filter((t) => t.z === z)
    return { z, y: inRow[0]!.y, troughs: inRow }
  })

  rows.forEach((row, i) => {
    const frontZ = row.z + troughDepth / 2
    const prevY = i === 0 ? laneY : rows[i - 1]!.y
    // Shelf slab, top at row.y, full lane width.
    out.push(box('shelf', 0, row.y - SLAB_T / 2, row.z, halfLaneW, SLAB_T / 2, troughDepth / 2))
    // Riser on the front boundary: from below the previous floor up to this floor.
    const riserBottom = prevY - SLAB_T
    out.push(box('riser', 0, (riserBottom + row.y) / 2, frontZ - LIP_T / 2, halfLaneW, (row.y - riserBottom) / 2, LIP_T / 2))
    // Front lip on top of the riser so the ball settles behind it.
    out.push(box('lip', 0, row.y + troughLip / 2, frontZ - LIP_T / 2, halfLaneW, troughLip / 2, LIP_T / 2))
  })

  // Dividers between neighbouring pockets on any row with more than one trough (the top row).
  for (const row of rows) {
    if (row.troughs.length < 2) continue
    const sorted = [...row.troughs].sort((a, b) => a.x - b.x)
    const frontZ = row.z + troughDepth / 2
    const backZ = backWall.z + BACK_T / 2
    for (let k = 0; k < sorted.length - 1; k++) {
      const a = sorted[k]!
      const b = sorted[k + 1]!
      const x = (a.x + a.halfW + (b.x - b.halfW)) / 2
      out.push(box('divider', x, row.y + DIVIDER_H / 2, (frontZ + backZ) / 2, DIVIDER_T / 2, DIVIDER_H / 2, (frontZ - backZ) / 2))
    }
  }

  // Back wall behind the top row.
  out.push(box('backWall', 0, (laneBottom + wellWallTop) / 2, backWall.z, halfLaneW + wallT, (wellWallTop - laneBottom) / 2, BACK_T / 2))

  // Floor under the whole well (ramp lip to back wall) so nothing falls through the machine.
  {
    const z0 = ramp.zEnd
    const z1 = backWall.z
    out.push(box('floor', 0, laneY - SLAB_T / 2, (z0 + z1) / 2, halfLaneW + wallT, SLAB_T / 2, (z0 - z1) / 2))
  }

  // Hood: a ceiling under the Cabinet roof and a lintel plate just inside the hood front, so a hard
  // throw that ricochets off the top riser stays in the well instead of flying out through the
  // visual roof or back over the player's head. Sized to sit inside the Cabinet's own panels.
  {
    const hoodFront = ramp.zStart - HOOD_SETBACK
    const roofUnder = SKEE.cabinet.h - HOOD_ROOF_T
    const z0 = hoodFront - HOOD_LINTEL_T
    const z1 = backWall.z
    out.push(box('wall', 0, roofUnder - SLAB_T / 2, (z0 + z1) / 2, halfLaneW + wallT, SLAB_T / 2, (z0 - z1) / 2))
    // lintel plate from the well walls' top to the ceiling (no gap a ball could thread)
    out.push(box('wall', 0, (wellWallTop + roofUnder) / 2, hoodFront - HOOD_LINTEL_T / 2, halfLaneW + wallT, (roofUnder - wellWallTop) / 2, HOOD_LINTEL_T / 2))
    // band between the well walls' top and the ceiling on both sides and the back (the Cabinet's
    // cheeks and backboard there are visual only; a ricochet was leaving the world behind them)
    const bandY = (wellWallTop + roofUnder) / 2
    const bandH = (roofUnder - wellWallTop) / 2
    for (const s of [-1, 1]) {
      out.push(box('wall', s * (halfLaneW + wallT / 2), bandY, (z0 + z1) / 2, wallT / 2, bandH, (z0 - z1) / 2))
    }
    out.push(box('backWall', 0, bandY, backWall.z, halfLaneW + wallT, bandH, BACK_T / 2))
  }

  return out
}

const SENSOR_HALF_H = 0.03 // landing slab: a ball fires it only within 0.06 of touching the shelf

/**
 * One sensor per trough plus the gutter (value 0). Each trough sensor is a thin slab on its shelf,
 * not a tall volume: rapier fires the intersection as soon as the ball's collider overlaps the box,
 * so a tall sensor fired on fly-over and the first row the ball passed over scored instead of the
 * one it landed in. Pocket widths are shrunk by the ball radius so a ball fires a pocket only when
 * its centre is inside that pocket (the top row's 50 and 100s share one shelf).
 */
export function laneSensors(): SensorBox[] {
  const { troughs, troughDepth, gutterY, cabinet, ball } = SKEE
  const hy = SENSOR_HALF_H
  const out: SensorBox[] = troughs.map((t) => ({
    center: [t.x, t.y + hy, t.z],
    half: [Math.max(0.02, t.halfW - ball.r), hy, troughDepth / 2 - 0.01],
    value: t.value,
  }))
  out.push({
    center: [0, gutterY, 0],
    half: [cabinet.w / 2, 0.05, cabinet.d / 2],
    value: 0,
  })
  return out
}
