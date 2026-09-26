'use client'

import { forwardRef, useMemo } from 'react'
import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

// Ordered 4x4 Bayer dither then quantise per channel (psx-look.md section 4).
const frag = /* glsl */ `
uniform float levels;
const mat4 bayer = mat4(
   0.0,  8.0,  2.0, 10.0,
  12.0,  4.0, 14.0,  6.0,
   3.0, 11.0,  1.0,  9.0,
  15.0,  7.0, 13.0,  5.0) / 16.0;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  ivec2 p = ivec2(mod(uv * resolution, 4.0));
  float t = bayer[p.x][p.y] - 0.5;
  vec3 c = inputColor.rgb + t / levels;
  outputColor = vec4(floor(c * levels + 0.5) / levels, inputColor.a);
}`

class DitherEffect extends Effect {
  constructor(levels = 32) {
    super('Dither', frag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([['levels', new Uniform(levels)]]),
    })
  }
}

export const Dither = forwardRef<DitherEffect, { levels?: number }>(function Dither({ levels = 32 }, ref) {
  const effect = useMemo(() => new DitherEffect(levels), [levels])
  return <primitive ref={ref} object={effect} dispose={null} />
})
