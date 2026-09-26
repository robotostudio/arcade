import * as THREE from 'three'
import { LOOK } from './constants'

export const SNAP = new THREE.Vector2(LOOK.snap[0], LOOK.snap[1]) // NDC grid; lower = more wobble

// Vertex snap (and optional affine texture swim) via onBeforeCompile (psx-look.md section 2).
export function psxify<M extends THREE.Material>(material: M, affine = false): M {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnap = { value: SNAP }
    shader.vertexShader =
      `uniform vec2 uSnap;\nvarying float vAffine;\n` +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
       gl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap) / uSnap * gl_Position.w;
       vAffine = 1.0 + length(mvPosition.xyz) * 0.05;
       #ifdef USE_MAP
       vMapUv *= vAffine;
       #endif`,
      )
    if (affine) {
      shader.fragmentShader =
        `varying float vAffine;\n` +
        shader.fragmentShader.replace(
          'vec4 sampledDiffuseColor = texture2D( map, vMapUv );',
          'vec4 sampledDiffuseColor = texture2D( map, vMapUv / vAffine );',
        )
    }
  }
  // Required: a distinct key so patched programs don't share with unpatched ones.
  material.customProgramCacheKey = () => `psx${affine ? '-affine' : ''}`
  return material
}
