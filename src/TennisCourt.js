import * as THREE from 'three';

// Exact ITF dimensions (meters)
const COURT_LENGTH = 23.77;
const COURT_WIDTH = 10.97;
const NET_HEIGHT_CENTER = 0.914;
const NET_HEIGHT_POST = 1.07;
const LINE_WIDTH = 0.05;
const FENCE_HEIGHT = 3;
const FENCE_OFFSET = 3.05; // run-off distance behind baseline

export class TennisCourt {
  constructor(scene, { x = 0, z = 0, rotationY = 0 } = {}) {
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.group.rotation.y = rotationY;
    this.COURT_LENGTH = COURT_LENGTH;
    this.COURT_WIDTH = COURT_WIDTH;
    this.FENCE_OFFSET = FENCE_OFFSET;
    this.mats = {
      clay: new THREE.MeshStandardMaterial({ color: 0xb5651d, roughness: 1 }),
      line: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
      net: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1, side: THREE.DoubleSide }),
      band: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
      post: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6, metalness: 0.3 }),
      fence: new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.7, metalness: 0.2, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
      frame: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6, metalness: 0.3 }),
      gate: new THREE.MeshStandardMaterial({ color: 0x1e5c2e, roughness: 0.7 }),
    };
    this.buildSurface();
    this.buildLines();
    this.buildNet();
    this.buildFence();
    scene.add(this.group);
    this.buildColliders();
  }

  box(w, h, d, mat, x, y, z, parent = this.group, shadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (shadow) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    parent.add(m);
    return m;
  }

  buildSurface() {
    const totalL = COURT_LENGTH + FENCE_OFFSET * 2;
    const totalW = COURT_WIDTH + FENCE_OFFSET * 2;
    const clay = new THREE.Mesh(
      new THREE.PlaneGeometry(totalW, totalL),
      this.mats.clay
    );
    clay.rotation.x = -Math.PI / 2;
    clay.receiveShadow = true;
    this.group.add(clay);
    const apron = this.box(totalW + 0.6, 0.1, totalL + 0.6, this.mats.frame, 0, 0.05, 0);
    apron.receiveShadow = true;
  }

  buildLines() {
    const lineY = 0.012;
    const halfL = COURT_LENGTH / 2;
    const halfW = COURT_WIDTH / 2;
    const add = (w, d, x, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.005, d), this.mats.line);
      m.position.set(x, lineY, z);
      m.receiveShadow = true;
      this.group.add(m);
    };
    // baselines
    add(COURT_WIDTH + LINE_WIDTH, LINE_WIDTH, 0, -halfL);
    add(COURT_WIDTH + LINE_WIDTH, LINE_WIDTH, 0, halfL);
    // sidelines (doubles)
    add(LINE_WIDTH, COURT_LENGTH, -halfW, 0);
    add(LINE_WIDTH, COURT_LENGTH, halfW, 0);
    // singles sidelines
    const singlesHalfW = halfW - 1.37;
    add(LINE_WIDTH, COURT_LENGTH, -singlesHalfW, 0);
    add(LINE_WIDTH, COURT_LENGTH, singlesHalfW, 0);
    // service lines
    const serviceZ = halfL - 6.4;
    add(singlesHalfW * 2 + LINE_WIDTH, LINE_WIDTH, 0, -serviceZ);
    add(singlesHalfW * 2 + LINE_WIDTH, LINE_WIDTH, 0, serviceZ);
    // center service line
    add(LINE_WIDTH, serviceZ * 2, 0, 0);
    // center marks on baselines
    add(LINE_WIDTH, 0.3, 0, -halfL);
    add(LINE_WIDTH, 0.3, 0, halfL);
  }

  buildNet() {
    const halfW = COURT_WIDTH / 2;
    const postX = halfW + 0.914;
    const segs = 24;
    const netGeo = new THREE.PlaneGeometry(postX * 2, 1, segs, 1);
    const pos = netGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = Math.abs(pos.getX(i)) / postX;
      const h = NET_HEIGHT_CENTER + (NET_HEIGHT_POST - NET_HEIGHT_CENTER) * t;
      pos.setY(i, pos.getY(i) > 0 ? h : 0);
    }
    netGeo.computeVertexNormals();
    const net = new THREE.Mesh(netGeo, this.mats.net);
    net.rotation.y = Math.PI / 2;
    this.group.add(net);
    const bandGeo = new THREE.PlaneGeometry(postX * 2, 0.07, segs, 1);
    const bpos = bandGeo.attributes.position;
    for (let i = 0; i < bpos.count; i++) {
      const t = Math.abs(bpos.getX(i)) / postX;
      const h = NET_HEIGHT_CENTER + (NET_HEIGHT_POST - NET_HEIGHT_CENTER) * t;
      bpos.setY(i, h);
    }
    bandGeo.computeVertexNormals();
    const band = new THREE.Mesh(bandGeo, this.mats.band);
    band.rotation.y = Math.PI / 2;
    this.group.add(band);
    for (const px of [-postX, postX]) {
      this.box(0.12, NET_HEIGHT_POST, 0.12, this.mats.post, px, NET_HEIGHT_POST / 2, 0);
    }
  }

  buildFence() {
    const halfL = COURT_LENGTH / 2 + FENCE_OFFSET;
    const halfW = COURT_WIDTH / 2 + FENCE_OFFSET;
    const gateHalf = 0.6;
    const postSpacing = 2.5;
    const addPosts = (alongZ, fixed, from, to) => {
      const n = Math.max(1, Math.ceil((to - from) / postSpacing));
      for (let i = 0; i <= n; i++) {
        const t = from + ((to - from) * i) / n;
        const px = alongZ ? fixed : t;
        const pz = alongZ ? t : fixed;
        this.box(0.08, FENCE_HEIGHT, 0.08, this.mats.frame, px, FENCE_HEIGHT / 2, pz);
      }
    };
    const addFence = (alongZ, fixed, from, to) => {
      const len = to - from;
      const fence = new THREE.Mesh(
        new THREE.PlaneGeometry(len, FENCE_HEIGHT),
        this.mats.fence
      );
      const mid = (from + to) / 2;
      fence.position.set(alongZ ? fixed : mid, FENCE_HEIGHT / 2, alongZ ? mid : fixed);
      if (alongZ) fence.rotation.y = Math.PI / 2;
      this.group.add(fence);
      this.box(alongZ ? 0.06 : len, 0.06, alongZ ? len : 0.06, this.mats.frame,
        alongZ ? fixed : mid, FENCE_HEIGHT, alongZ ? mid : fixed, this.group, false);
    };
    // long sides at x = ±halfW
    for (const sx of [-halfW, halfW]) {
      addPosts(true, sx, -halfL, halfL);
      addFence(true, sx, -halfL, halfL);
    }
    // end at z = -halfL, full
    addPosts(false, -halfL, -halfW, halfW);
    addFence(false, -halfL, -halfW, halfW);
    // end at z = +halfL with gate opening at x = 0
    addPosts(false, halfL, -halfW, halfW);
    addFence(false, halfL, -halfW, -gateHalf);
    addFence(false, halfL, gateHalf, halfW);
    // gate door, slightly ajar
    const gate = this.box(0.05, FENCE_HEIGHT * 0.95, gateHalf * 2, this.mats.gate,
      gateHalf, FENCE_HEIGHT * 0.475, halfL);
    gate.rotation.y = 0.5;
  }

  buildColliders() {
    const halfL = COURT_LENGTH / 2 + FENCE_OFFSET;
    const halfW = COURT_WIDTH / 2 + FENCE_OFFSET;
    const gateHalf = 0.6;
    this.colliders = [
      { x1: -halfW - 0.3, x2: -halfW + 0.1, z1: -halfL, z2: halfL },
      { x1: halfW - 0.1, x2: halfW + 0.3, z1: -halfL, z2: halfL },
      { x1: -halfW, x2: halfW, z1: -halfL - 0.3, z2: -halfL + 0.1 },
      { x1: -halfW, x2: halfW, z1: halfL - 0.1, z2: halfL + 0.3, gate: true },
    ];
    this.gateHalf = gateHalf;
  }

  inCollider(x, z, r = 0.35) {
    for (const c of this.colliders) {
      if (c.gate && Math.abs(x) < this.gateHalf - r * 0.5) continue;
      if (x > c.x1 - r && x < c.x2 + r && z > c.z1 - r && z < c.z2 + r) return true;
    }
    return false;
  }

  contains(x, z, margin = 1) {
    const halfL = COURT_LENGTH / 2 + FENCE_OFFSET;
    const halfW = COURT_WIDTH / 2 + FENCE_OFFSET;
    return Math.abs(x) < halfW + margin && Math.abs(z) < halfL + margin;
  }

  footprintContains(x, z) {
    return this.contains(x, z, 1.5);
  }
}
