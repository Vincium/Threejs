import * as THREE from 'three';
import { rand, createWindSwayMaterial } from './utils.js?v=20261004172649';

export class GrassField {
  constructor(scene, { count = 60000, spread = 90, heightScale = 0.55, excludeArea = null } = {}) {
    const bladeGeo = this.makeBladeGeometry(heightScale);
    const bladeMat = createWindSwayMaterial(
      { color: 0xffffff, roughness: 1, side: THREE.DoubleSide, vertexColors: true },
      `
      float bladeH = transformed.y;
      float phase = instanceMatrix[3].x * 0.8 + instanceMatrix[3].z * 0.8;
      transformed.x += sin(uTime * 2.0 + phase) * 0.18 * bladeH * bladeH;
      transformed.z += cos(uTime * 1.6 + phase * 1.3) * 0.1 * bladeH * bladeH;`
    );

    this.applyBladeGradient(bladeGeo);

    const grass = new THREE.InstancedMesh(bladeGeo, bladeMat, count);
    const dummy = new THREE.Object3D();
    let placed = 0;
    for (let i = 0; i < count; i++) {
      const x = rand(-spread, spread);
      const z = rand(-spread, spread);
      if (excludeArea && excludeArea.contains(x, z)) continue;
      dummy.position.set(x, 0, z);
      dummy.rotation.set(rand(-0.15, 0.15), rand(0, Math.PI), rand(-0.15, 0.15));
      dummy.scale.set(rand(0.6, 1.4), rand(0.5, 1.1), rand(0.6, 1.4));
      dummy.updateMatrix();
      grass.setMatrixAt(placed++, dummy.matrix);
    }
    grass.count = placed;
    grass.instanceMatrix.needsUpdate = true;
    scene.add(grass);
  }

  makeBladeGeometry(heightScale) {
    const segs = 4;
    const positions = [];
    const indices = [];
    const bottomW = 0.09;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const y0 = t0;
      const y1 = t1;
      const w0 = bottomW * (1 - t0 * 0.9);
      const w1 = bottomW * (1 - t1 * 0.9);
      const bend1 = t1 * t1 * 0.25;
      const base = positions.length / 3;
      positions.push(
        -w0, y0, 0,  w0, y0, 0,
        -w1, y1, bend1, w1, y1, bend1
      );
      if (i < segs - 1) {
        indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      } else {
        positions.push(0, y1 + 0.08, bend1);
        indices.push(base, positions.length / 3 - 1, base + 1, base + 1, positions.length / 3 - 1, base + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geo.scale(1, heightScale, 1);
    return geo;
  }

  applyBladeGradient(geo) {
    const count = geo.attributes.position.count;
    const bladeColors = new Float32Array(count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const t = geo.attributes.position.getY(i);
      color.setHSL(0.27, 0.55, 0.22 + t * 0.25);
      bladeColors[i * 3] = color.r;
      bladeColors[i * 3 + 1] = color.g;
      bladeColors[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(bladeColors, 3));
  }
}
