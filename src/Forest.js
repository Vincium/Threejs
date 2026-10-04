import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rand, addVertexColors, createWindSwayMaterial } from './utils.js?v=20261004154346';

export class Forest {
  constructor(scene, { treeCount = 320, variantCount = 6, spread = 120, clearing = 8, excludeArea = null } = {}) {
    this.scene = scene;
    this.material = createWindSwayMaterial(
      { color: 0xffffff, roughness: 0.9, vertexColors: true, flatShading: true },
      `
      float heightFactor = smoothstep(1.5, 6.0, transformed.y);
      float phase = instanceMatrix[3].x * 0.5 + instanceMatrix[3].z * 0.5;
      transformed.x += sin(uTime * 1.5 + phase) * 0.1 * heightFactor;
      transformed.z += cos(uTime * 1.2 + phase) * 0.08 * heightFactor;`
    );
    const treesPerVariant = Math.ceil(treeCount / variantCount);
    for (let v = 0; v < variantCount; v++) {
      scene.add(this.makeInstancedVariant(treesPerVariant, spread, clearing, excludeArea));
    }
  }

  makeInstancedVariant(count, spread, clearing, excludeArea) {
    const mesh = new THREE.InstancedMesh(this.makeTreeGeometry(), this.material, count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const dummy = new THREE.Object3D();
    let placed = 0;
    let guard = 0;
    while (placed < count && guard < 1000) {
      guard++;
      const x = rand(-spread, spread);
      const z = rand(-spread, spread);
      if (Math.hypot(x, z) < clearing) continue;      if (excludeArea && excludeArea.contains(x, z)) continue;
      dummy.position.set(x, 0, z);
      dummy.rotation.y = rand(0, Math.PI * 2);
      dummy.scale.setScalar(rand(0.8, 1.8));
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  makeTreeGeometry() {
    const parts = [];
    this.makeBranchParts(parts, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 2.4, 0.28, 0);

    const barkColor = new THREE.Color().setHSL(0.07, 0.35, rand(0.2, 0.3));
    const leafColor = new THREE.Color().setHSL(0.3 + rand(-0.04, 0.03), 0.5, rand(0.25, 0.38));
    const jitter = () => rand(-0.04, 0.04);

    const trunkGeos = parts
      .filter((p) => !p.isLeaf)
      .map((p) => addVertexColors(p.geo, () => barkColor.clone().offsetHSL(0, 0, jitter())));
    const leafGeos = parts
      .filter((p) => p.isLeaf)
      .map((p) => addVertexColors(p.geo, () => leafColor.clone().offsetHSL(jitter(), 0, jitter())));

    const treeGeo = mergeGeometries([...trunkGeos, ...leafGeos]);
    treeGeo.computeVertexNormals();
    return treeGeo;
  }

  makeBranchParts(parts, origin, direction, length, radius, depth) {
    const segments = Math.max(3, 6 - depth);
    const dir = direction.clone().normalize();
    const end = origin.clone().addScaledVector(dir, length);

    const branch = new THREE.CylinderGeometry(radius * 0.6, radius, length, segments, 1);
    branch.translate(0, length / 2, 0);
    branch.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    );
    branch.translate(origin.x, origin.y, origin.z);
    parts.push({ geo: branch, isLeaf: false });

    if (depth >= 3) {
      const clumps = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < clumps; i++) {
        const icos = new THREE.IcosahedronGeometry(rand(0.5, 0.9), 0);
        icos.scale(1, 0.7, 1);
        const p = end.clone().addScaledVector(dir, rand(0, 0.3));
        icos.translate(p.x, p.y, p.z);
        parts.push({ geo: icos, isLeaf: true });
      }
      return;
    }

    const branches = depth === 0 ? 3 : 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < branches; i++) {
      const newDir = dir.clone().applyEuler(
        new THREE.Euler(rand(-0.6, 0.6), rand(0, Math.PI * 2), rand(-0.6, 0.6))
      );
      newDir.y = Math.max(newDir.y, 0.15);
      this.makeBranchParts(
        parts,
        end.clone().addScaledVector(dir, -0.1),
        newDir,
        length * rand(0.6, 0.75),
        radius * 0.65,
        depth + 1
      );
    }
  }
}
