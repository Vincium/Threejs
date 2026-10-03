import * as THREE from 'three';
import { rand } from './utils.js';

export class Mountains {
  constructor(scene, { count = 14, ringDist = 150, colors = null } = {}) {
    const ROCK = new THREE.Color(0x7d7468);
    const SNOW = new THREE.Color(0xf4f6f8);
    const FOREST_EDGE = new THREE.Color(0x3f5a2e);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 1,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rand(-0.15, 0.15);
      const dist = ringDist + rand(-15, 15);
      const height = rand(35, 65);
      const geo = this.makeGeometry(rand(30, 50), height, { ROCK, SNOW, FOREST_EDGE });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(Math.cos(angle) * dist, -4, Math.sin(angle) * dist);
      m.rotation.y = rand(0, Math.PI * 2);
      scene.add(m);
    }
  }

  makeGeometry(radius, height, { ROCK, SNOW, FOREST_EDGE }) {
    const geo = new THREE.ConeGeometry(radius, height, 48, 8, true);
    geo.translate(0, height / 2, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const t = y / height;
      const noise =
        Math.sin(x * 0.35 + z * 0.2) * 0.5 +
        Math.sin(z * 0.42 + x * 0.13) * 0.5 +
        Math.sin((x + z) * 0.21) * 0.8;
      const scale = 1 + noise * 0.15 * (1 - t);
      pos.setXYZ(i, x * scale, y, z * scale);
    }
    geo.computeVertexNormals();
    const count = pos.count;
    const colors = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const t = pos.getY(i) / height;
      if (t < 0.25) c.copy(FOREST_EDGE).lerp(ROCK, t / 0.25);
      else if (t < 0.55) c.copy(ROCK);
      else c.copy(ROCK).lerp(SNOW, (t - 0.55) / 0.45);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }
}

export class Clouds {
  constructor(scene, { count = 16 } = {}) {
    this.clouds = [];
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      transparent: true,
      opacity: 0.92,
      flatShading: true,
    });
    const puffGeos = [];
    for (let i = 0; i < 4; i++) {
      const g = new THREE.IcosahedronGeometry(rand(4, 9), 1);
      const p = g.attributes.position;
      for (let j = 0; j < p.count; j++) {
        const n = Math.sin(p.getX(j) * 1.7) + Math.cos(p.getZ(j) * 1.3) + Math.sin(p.getY(j) * 2.1);
        p.setXYZ(j, p.getX(j), p.getY(j) * 0.55 + n * 0.5, p.getZ(j));
      }
      g.computeVertexNormals();
      puffGeos.push(g);
    }
    for (let i = 0; i < count; i++) {
      const cloud = new THREE.Group();
      const puffs = 4 + Math.floor(Math.random() * 4);
      for (let j = 0; j < puffs; j++) {
        const mesh = new THREE.Mesh(
          puffGeos[Math.floor(Math.random() * puffGeos.length)],
          mat
        );
        mesh.position.set(rand(-14, 14), rand(-2, 2), rand(-8, 8));
        mesh.scale.setScalar(rand(0.7, 1.4));
        cloud.add(mesh);
      }
      const angle = rand(0, Math.PI * 2);
      const dist = rand(60, 220);
      cloud.position.set(Math.cos(angle) * dist, rand(55, 85), Math.sin(angle) * dist);
      cloud.userData.speed = rand(0.8, 2.0);
      scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  update(dt) {
    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > 260) cloud.position.x = -260;
    }
  }
}
