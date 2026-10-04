import * as THREE from 'three';

// Exact ITF dimensions (meters)
const COURT_LENGTH = 23.77;
const COURT_WIDTH = 10.97;
const NET_HEIGHT_CENTER = 0.914;
const NET_HEIGHT_POST = 1.07;
const LINE_WIDTH = 0.05;
const FENCE_HEIGHT = 3;
const SIDE_FENCE_HEIGHT = 1.2;
const RUNOFF_END = 6.4; // ITF run-off behind baselines
const RUNOFF_SIDE = 3.66; // ITF run-off beyond sidelines

export class TennisCourt {
  constructor(scene, { x = 0, z = 0, rotationY = 0 } = {}) {
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.group.rotation.y = rotationY;
    this.originX = x;
    this.originZ = z;
    this.COURT_LENGTH = COURT_LENGTH;
    this.COURT_WIDTH = COURT_WIDTH;
    
    this.mats = {
      clay: new THREE.MeshStandardMaterial({ color: 0xd0592a, roughness: 1 }),
      line: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
      net: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1, side: THREE.DoubleSide }),
      band: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
      post: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6, metalness: 0.3 }),
      fence: new THREE.MeshStandardMaterial({
        color: 0x9aa3ab, roughness: 0.45, metalness: 0.8, side: THREE.DoubleSide,
        map: null,
        alphaMap: this.makeChainLinkTexture(),
        transparent: true,
        alphaTest: 0.4,
      }),
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

makeChainLinkTexture() {
    const c = document.createElement('canvas');
    const cell = 16;
    c.width = c.height = cell * 8;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    for (let i = -c.height; i < c.width + c.height; i += cell) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + c.height, c.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + c.height, 0);
      ctx.lineTo(i, c.height);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    return tex;
  }

  buildSurface() {
    const totalL = COURT_LENGTH + RUNOFF_END * 2;
    const totalW = COURT_WIDTH + RUNOFF_SIDE * 2;
    const slab = this.box(totalW, 0.1, totalL, this.mats.clay, 0, 0.05, 0);
    slab.receiveShadow = true;
    const apron = this.box(totalW + 0.6, 0.08, totalL + 0.6, this.mats.frame, 0, 0.04, 0);
    apron.receiveShadow = true;
  }

  buildLines() {
    const lineY = 0.106;
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
    // center marks on baselines (10cm, inside the court)
    add(LINE_WIDTH, 0.1, 0, -halfL + 0.05);
    add(LINE_WIDTH, 0.1, 0, halfL - 0.05);
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
    net.position.y = 0.1;
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
    band.position.y = 0.1;
    this.group.add(band);
    for (const px of [-postX, postX]) {
      this.box(0.12, NET_HEIGHT_POST, 0.12, this.mats.post, px, 0.1 + NET_HEIGHT_POST / 2, 0);
    }
  }

  buildFence() {
    const halfL = COURT_LENGTH / 2 + RUNOFF_END;
    const halfW = COURT_WIDTH / 2 + RUNOFF_SIDE;
    const gateHalf = 0.6;
    const postSpacing = 2.5;
    const addPosts = (alongZ, fixed, from, to, h = FENCE_HEIGHT) => {
      const n = Math.max(1, Math.ceil((to - from) / postSpacing));
      for (let i = 0; i <= n; i++) {
        const t = from + ((to - from) * i) / n;
        const px = alongZ ? fixed : t;
        const pz = alongZ ? t : fixed;
        this.box(0.08, h, 0.08, this.mats.frame, px, h / 2, pz, this.group, false);
      }
    };
    const addFence = (alongZ, fixed, from, to, h = FENCE_HEIGHT) => {
      const len = to - from;
      const fence = new THREE.Mesh(
        new THREE.PlaneGeometry(len, h),
        this.mats.fence
      );
      fence.castShadow = false;
      const mat = fence.material.clone();
      mat.alphaMap = mat.alphaMap.clone();
      mat.alphaMap.needsUpdate = true;
      mat.alphaMap.wrapS = mat.alphaMap.wrapT = THREE.RepeatWrapping;
      mat.alphaMap.repeat.set(len / 0.35, h / 0.35);
      fence.material = mat;
      const mid = (from + to) / 2;
      fence.position.set(alongZ ? fixed : mid, h / 2, alongZ ? mid : fixed);
      if (alongZ) fence.rotation.y = Math.PI / 2;
      this.group.add(fence);
      this.box(alongZ ? 0.06 : len, 0.06, alongZ ? len : 0.06, this.mats.frame,
        alongZ ? fixed : mid, h, alongZ ? mid : fixed, this.group, false);
    };
    // long sides at x = ±halfW
    for (const sx of [-halfW, halfW]) {
      addPosts(true, sx, -halfL, halfL, SIDE_FENCE_HEIGHT);
      addFence(true, sx, -halfL, halfL, SIDE_FENCE_HEIGHT);
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
      gateHalf, FENCE_HEIGHT * 0.475, halfL, this.group, false);
    gate.rotation.y = 0.5;
  }

  buildColliders() {
    const halfL = COURT_LENGTH / 2 + RUNOFF_END;
    const halfW = COURT_WIDTH / 2 + RUNOFF_SIDE;
    const gateHalf = 0.6;
    this.colliders = [
      { x1: -halfW - 0.2, x2: -halfW + 0.2, z1: -halfL - 0.2, z2: halfL + 0.2 },
      { x1: halfW - 0.2, x2: halfW + 0.2, z1: -halfL - 0.2, z2: halfL + 0.2 },
      { x1: -halfW - 0.2, x2: halfW + 0.2, z1: -halfL - 0.2, z2: -halfL + 0.2 },
      { x1: -halfW - 0.2, x2: halfW + 0.2, z1: halfL - 0.2, z2: halfL + 0.2, gate: true },
    ];
    this.gateHalf = gateHalf;
  }

  inCollider(wx, wz, r = 0.35) {
    const x = wx - this.originX;
    const z = wz - this.originZ;
    for (const c of this.colliders) {
      if (c.gate && Math.abs(x) < this.gateHalf - r * 0.5) continue;
      if (x > c.x1 - r && x < c.x2 + r && z > c.z1 - r && z < c.z2 + r) return true;
    }
    return false;
  }

  contains(wx, wz, margin = 1) {
    const halfL = COURT_LENGTH / 2 + RUNOFF_END;
    const halfW = COURT_WIDTH / 2 + RUNOFF_SIDE;
    return Math.abs(wx - this.originX) < halfW + margin && Math.abs(wz - this.originZ) < halfL + margin;
  }

  footprintContains(x, z) {
    return this.contains(x, z, 1.5);
  }
}
