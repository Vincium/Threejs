import * as THREE from 'three';
import { rand, createWindSwayMaterial } from './utils.js?v=20261004181811';

export class GrassField {
  constructor(scene, { count = 240000, spread = 90, heightScale = 0.275, excludeArea = null, terrain = null, lodRadius = 45 } = {}) {
    this.spread = spread;
    this.terrain = terrain;
    this.lodRadius = lodRadius;
    const swayCode = `
      float bladeH = transformed.y;
      float phase = instanceMatrix[3].x * 0.8 + instanceMatrix[3].z * 0.8;
      transformed.x += sin(uTime * 2.0 + phase) * 0.18 * bladeH * bladeH;
      transformed.z += cos(uTime * 1.6 + phase * 1.3) * 0.1 * bladeH * bladeH;`;
    const nearGeo = this.makeBladeGeometry(heightScale, 7, 0.05);
    const farGeo = this.makeBladeGeometry(heightScale, 3, 0.05);
    this.applyBladeGradient(nearGeo);
    this.applyBladeGradient(farGeo);
    const makeMat = () => createWindSwayMaterial(
      { color: 0xffffff, roughness: 1, side: THREE.DoubleSide, vertexColors: true },
      swayCode
    );
    this.nearMesh = new THREE.InstancedMesh(nearGeo, makeMat(), count);
    this.farMesh = new THREE.InstancedMesh(farGeo, makeMat(), count);
    for (const m of [this.nearMesh, this.farMesh]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      scene.add(m);
    }
    this.blades = [];
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const x = rand(-spread, spread);
      const z = rand(-spread, spread);
      if (excludeArea && excludeArea.contains(x, z)) continue;
      dummy.position.set(x, terrain ? terrain.getHeight(x, z) : 0, z);
      dummy.rotation.set(rand(-0.15, 0.15), rand(0, Math.PI), rand(-0.15, 0.15));
      dummy.scale.set(rand(0.6, 1.4), rand(0.5, 1.1), rand(0.6, 1.4));
      dummy.updateMatrix();
      tint.setHSL(0.26 + rand(-0.02, 0.02), rand(0.45, 0.65), rand(0.9, 1.1));
      this.blades.push({ matrix: dummy.matrix.clone(), color: tint.clone() });
    }
    this.lastX = null;
    this.lastZ = null;
    this.refresh(0, 30);
  }

  refresh(px, pz) {
    if (this.lastX !== null && Math.hypot(px - this.lastX, pz - this.lastZ) < 4) return;
    this.lastX = px;
    this.lastZ = pz;
    const r2 = this.lodRadius * this.lodRadius;
    let near = 0;
    let far = 0;
    for (const b of this.blades) {
      const e = b.matrix.elements;
      const dx = e[12] - px;
      const dz = e[14] - pz;
      if (dx * dx + dz * dz < r2) {
        this.nearMesh.setMatrixAt(near, b.matrix);
        this.nearMesh.setColorAt(near, b.color);
        near++;
      } else {
        this.farMesh.setMatrixAt(far, b.matrix);
        this.farMesh.setColorAt(far, b.color);
        far++;
      }
    }
    this.nearMesh.count = near;
    this.farMesh.count = far;
    this.nearMesh.instanceMatrix.needsUpdate = true;
    this.farMesh.instanceMatrix.needsUpdate = true;
    if (this.nearMesh.instanceColor) this.nearMesh.instanceColor.needsUpdate = true;
    if (this.farMesh.instanceColor) this.farMesh.instanceColor.needsUpdate = true;
  }

  makeBladeGeometry(heightScale, segs, bottomW) {
    const positions = [];
    const indices = [];
    const bendAmt = 0.35;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const y0 = t0;
      const y1 = t1;
      const w0 = bottomW * (1 - t0) ** 1.4;
      const w1 = bottomW * (1 - t1) ** 1.4;
      const bend0 = t0 * t0 * bendAmt;
      const bend1 = t1 * t1 * bendAmt;
      const base = positions.length / 3;
      positions.push(
        -w0, y0, bend0,  w0, y0, bend0,
        -w1, y1, bend1, w1, y1, bend1
      );
      if (i < segs - 1) {
        indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      } else {
        positions.push(0, y1 + 0.06, bend1);
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
