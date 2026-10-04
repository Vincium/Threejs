import * as THREE from 'three';

export const rand = (a, b) => a + Math.random() * (b - a);
export const windUniform = { value: 0 };

export function createWindSwayMaterial(baseProps, swayCode) {
  return new THREE.MeshStandardMaterial({
    ...baseProps,
    onBeforeCompile: (shader) => {
      shader.uniforms.uTime = windUniform;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          ${swayCode}`
        );
    },
  });
}

export function addVertexColors(geo, colorFn) {
  const g = geo.toNonIndexed();
  const count = g.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const c = colorFn();
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}
