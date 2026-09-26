import { Vector3 } from 'three'

// What the cat is up to, shared by mutation between the cat's brain and the effects so nothing
// goes through React state per frame. The brain writes, the effects read.
export type Mischief = {
  peeing: boolean
  peeFrom: Vector3
  peeTo: Vector3
  puddleAt: Vector3
  puddleGrow: boolean
  burning: boolean
  blazeAt: Vector3 // floor point against the flank
  blazeNormal: Vector3 // out of the flank
  ignitedAt: number // cat clock
  dousedAt: number
  clock: number
}

export function createMischief(): Mischief {
  return {
    peeing: false,
    peeFrom: new Vector3(),
    peeTo: new Vector3(),
    puddleAt: new Vector3(),
    puddleGrow: false,
    burning: false,
    blazeAt: new Vector3(),
    blazeNormal: new Vector3(1, 0, 0),
    ignitedAt: -Infinity,
    dousedAt: -Infinity,
    clock: 0,
  }
}

export const noRaycast = () => null
export const between = ([lo, hi]: readonly [number, number]) => lo + Math.random() * (hi - lo)
export const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo)
