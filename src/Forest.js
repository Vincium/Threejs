import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rand, addVertexColors, createWindSwayMaterial } from './utils.js?v=20261004183919';

export class Forest {
  constructor(scene, { treeCount = 320, variantCount = 6, spread = 120, clearing = 8, excludeArea = null, lodRadius = 60 } = {}) {
    this.scene = scene;
    this.lodRadius = lodRadius;
    this.variantCount = variantCount;
    this.material = createWindSwayMaterial(
      { color: 0xffffff, roughness: 0.9, vertexColors: true, flatShading: true },
      `
      float heightFactor = smoothstep(1.5, 6.0, transformed.y);
      float phase = instanceMatrix[3].x * 0.5 + instanceMatrix[3].z * 0.5;
      transformed.x += sin(uTime * 1.5 + phase) * 0.1 * heightFactor;
      transformed.z += cos(uTime * 1.2 + phase) * 0.08 * heightFactor;`
    );
    this.nearMeshes = [];
    this.farMeshes = [];
    this.trees = [];
    const treesPerVariant = Math.ceil(treeCount / variantCount);
    const perVariant = Array.from({ length: variantCount }, () => []);
    const dummy = new THREE.Object3D();
    let guard = 0;
    let placed = 0;
    while (placed < treeCount && guard < 10000) {
      guard++;
      const x = rand(-spread, spread);
      const z = rand(-spread, spread);
      if (Math.hypot(x, z) < clearing) continue;
      if (excludeArea && excludeArea.contains(x, z)) continue;
      const v = Math.floor(placed / treesPerVariant) % variantCount;
      dummy.position.set(x, 0, z);
      dummy.rotation.y = rand(0, Math.PI * 2);
      dummy.scale.setScalar(rand(0.8, 1.8));
      dummy.updateMatrix();
      perVariant[v].push({ matrix: dummy.matrix.clone(), x, z, r: 0.3 * dummy.scale.x });
      placed++;
    }
    for (let v = 0; v < variantCount; v++) {
      const skeleton = [];
      this.makeBranchSkeleton(skeleton, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 2.4, 0.28, 0);
      const barkColor = new THREE.Color().setHSL(0.07, 0.35, rand(0.2, 0.3));
      const leafColor = new THREE.Color().setHSL(0.3 + rand(-0.04, 0.03), 0.5, rand(0.25, 0.38));
      const nearGeo = this.makeTreeGeometry(skeleton, false, barkColor, leafColor);
      const farGeo = this.makeTreeGeometry(skeleton, true, barkColor, leafColor);
      const nearMesh = new THREE.InstancedMesh(nearGeo, this.material, perVariant[v].length);
      const farMesh = new THREE.InstancedMesh(farGeo, this.material, perVariant[v].length);
      for (const m of [nearMesh, farMesh]) {
        m.castShadow = true;
        m.receiveShadow = true;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        m.frustumCulled = false;
        this.scene.add(m);
      }
      this.nearMeshes.push(nearMesh);
      this.farMeshes.push(farMesh);
      for (const t of perVariant[v]) this.trees.push({ ...t, variant: v });
    }
    this.lastX = null;
    this.lastZ = null;
    this.refresh(0, 30);
  }

  refresh(px, pz) {
    if (this.lastX !== null && Math.hypot(px - this.lastX, pz - this.lastZ) < 5) return;
    this.lastX = px;
    this.lastZ = pz;
    const r2 = this.lodRadius * this.lodRadius;
    const nearIdx = new Array(this.variantCount).fill(0);
    const farIdx = new Array(this.variantCount).fill(0);
    for (const t of this.trees) {
      const dx = t.x - px;
      const dz = t.z - pz;
      if (dx * dx + dz * dz < r2) {
        this.nearMeshes[t.variant].setMatrixAt(nearIdx[t.variant]++, t.matrix);
      } else {
        this.farMeshes[t.variant].setMatrixAt(farIdx[t.variant]++, t.matrix);
      }
    }
    for (let v = 0; v < this.variantCount; v++) {
      this.nearMeshes[v].count = nearIdx[v];
      this.farMeshes[v].count = farIdx[v];
      this.nearMeshes[v].instanceMatrix.needsUpdate = true;
      this.farMeshes[v].instanceMatrix.needsUpdate = true;
    }
  }

  inCollider(x, z, r = 0.35) {
    for (const p of this.trees) {
      if (Math.hypot(x - p.x, z - p.z) < p.r + r) return true;
    }
    return false;
  }

  makeTreeGeometry(skeleton, low, barkColor, leafColor) {
    const jitter = () => rand(-0.04, 0.04);

    const trunkGeos = skeleton
      .filter((p) => !p.isLeaf)
      .map((p) => addVertexColors(this.makeBranchGeometry(p, low), () => barkColor.clone().offsetHSL(0, 0, jitter())));
    const leafGeos = skeleton
      .filter((p) => p.isLeaf)
      .map((p) => addVertexColors(p.geo.clone(), () => leafColor.clone().offsetHSL(jitter(), 0, jitter())));

    const treeGeo = mergeGeometries([...trunkGeos, ...leafGeos]);
    treeGeo.computeVertexNormals();
    return treeGeo;
  }

  makeBranchGeometry(p, low) {
    const segments = low ? 3 : Math.max(3, 6 - p.depth);
    const branch = new THREE.CylinderGeometry(p.radius * 0.6, p.radius, p.length, segments, 1);
    branch.translate(0, p.length / 2, 0);
    branch.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.dir)
    );
    branch.translate(p.origin.x, p.origin.y, p.origin.z);
    return branch;
  }

  makeBranchSkeleton(parts, origin, direction, length, radius, depth) {
    const dir = direction.clone().normalize();
    const end = origin.clone().addScaledVector(dir, length);
    parts.push({ origin, dir, length, radius, depth, isLeaf: false });

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
      this.makeBranchSkeleton(
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
