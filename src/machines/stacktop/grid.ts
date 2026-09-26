// Paints a StackerState into one instancedMesh: hidden cells scaled to 0, lit cells
// tinted through instanceColor. Shared by the Stacker and Stack to the Top; each
// passes its own layout (cell pitch, row heights, depth) and colours.
import { Object3D, type Color, type InstancedMesh } from 'three'
import { H, W, currentRow, type Row, type StackerState } from './logic'

export type GridLayout = {
  cell: number // pitch between cell centres along x
  z: number // cell centre depth
  rowY: (row: number) => number // centre height of a row (lets a Machine leave a gap for a banner)
}

export type GridColors = { placed: Color; moving: Color; gold: Color; miss: Color }

const HIDDEN_DEPTH = .4 // behind the face plane, inside the cabinet body
const dummy = new Object3D() // reused for every setMatrixAt, never allocated per frame

function inRow(r: Row, c: number) {
  return c >= r.start && c < r.end
}

export function paintGrid(mesh: InstancedMesh, s: StackerState, layout: GridLayout, colors: GridColors) {
  const row = currentRow(s)
  const won = s.result?.kind === 'win'
  const lost = s.result?.kind === 'lose'
  const minor = s.result?.kind === 'minor'
  const top = s.placed.length - 1
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const i = r * W + c
      let color = null
      if (r < s.placed.length && inRow(s.placed[r], c)) {
        color = (won && r === H - 1) || (minor && r === top) ? colors.gold : colors.placed
      } else if (r === row && inRow(s.moving, c)) {
        if (s.phase !== 'over') color = colors.moving
        else if (lost) color = colors.miss
      }
      // Hidden cells keep full size and tuck behind the face into the body. Scaled to 0 they
      // went degenerate under the PSX vertex snap and smeared one huge red wedge over the glass.
      dummy.position.set((c - (W - 1) / 2) * layout.cell, layout.rowY(r), color ? layout.z : layout.z - HIDDEN_DEPTH)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, color ?? colors.placed)
    }
  }
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}
