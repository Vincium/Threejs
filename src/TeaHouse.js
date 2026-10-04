import * as THREE from 'three';
import { rand } from './utils.js';

export class TeaHouse {
  constructor(scene, options = {}) {
    this.FLOOR_Y = options.floorY ?? 0.32;
    this.HW = options.width ?? 12;
    this.HD = options.depth ?? 9;
    this.WALL_H = options.wallHeight ?? 5;
    this.HT = options.thickness ?? 0.24;
    this.doorW = 3;
    this.doorH = 4.4;

    this.mats = {
      post: new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.9 }),
      wall: new THREE.MeshStandardMaterial({ color: 0x9a7b52, roughness: 1 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x35393f, roughness: 1, flatShading: true }),
      shoji: new THREE.MeshStandardMaterial({
        color: 0xf7efdc, roughness: 0.8, emissive: 0x554c33, emissiveIntensity: 0.25, side: THREE.DoubleSide,
      }),
      darkWood: new THREE.MeshStandardMaterial({ color: 0x241a10, roughness: 0.85 }),
      door: new THREE.MeshStandardMaterial({ color: 0xc9b28a, roughness: 0.7, side: THREE.DoubleSide }),
    };

    this.group = new THREE.Group();
    this.buildPlatform();
    this.buildFront();
    this.buildTokonoma();
    this.buildFurniture();
    this.buildWalls();
    this.buildRoof();
    this.buildLighting();
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

  buildPlatform() {
    const { FLOOR_Y, HW, HD, HT } = this;
    this.box(HW, FLOOR_Y, HD, this.mats.post, 0, FLOOR_Y / 2, 0);

    const tatami = new THREE.Mesh(
      new THREE.PlaneGeometry(HW - 0.5, HD - 0.5),
      new THREE.MeshStandardMaterial({ map: this.makeTatamiTexture(), roughness: 0.95 })
    );
    tatami.rotation.x = -Math.PI / 2;
    tatami.position.y = FLOOR_Y + 0.012;
    tatami.receiveShadow = true;
    this.group.add(tatami);

    this.box(this.doorW, 0.18, 1.0, this.mats.post, 0, 0.09, HD / 2 + 0.5);
    this.box(HW, 0.1, 1.4, this.mats.post, 0, FLOOR_Y + 0.05, HD / 2 + 0.7);
  }

  buildFront() {
    const { FLOOR_Y, HW, HD, WALL_H, HT, doorW, doorH } = this;

    for (const dx of [-doorW / 2 + 0.02, doorW / 2 - 0.02]) {
      this.box(doorW / 2, doorH, 0.06, this.mats.door, dx, FLOOR_Y + doorH / 2, HD / 2 + 0.04);
      for (let g = 1; g <= 3; g++) {
        this.box(doorW / 2 - 0.1, 0.03, 0.08, this.mats.darkWood, dx, FLOOR_Y + (doorH / 4) * g, HD / 2 + 0.04, this.group, false);
      }
    }

    const postGeo = new THREE.BoxGeometry(0.28, WALL_H, 0.28);
    const corners = [
      [-HW/2+0.14, HD/2-0.14], [HW/2-0.14, HD/2-0.14],
      [-HW/2+0.14, -HD/2+0.14], [HW/2-0.14, -HD/2+0.14],
      [0, HD/2-0.14], [0, -HD/2+0.14],
    ];
    for (const [px, pz] of corners) {
      const post = new THREE.Mesh(postGeo, this.mats.post);
      post.position.set(px, FLOOR_Y + WALL_H / 2, pz);
      post.castShadow = true;
      this.group.add(post);
    }

    const frontSegW = (HW - doorW) / 2;
    for (const sx of [-(doorW / 2 + frontSegW / 2), doorW / 2 + frontSegW / 2]) {
      this.box(frontSegW, WALL_H, HT, this.mats.wall, sx, FLOOR_Y + WALL_H / 2, HD / 2);
    }
    this.box(doorW, WALL_H - doorH, HT, this.mats.post, 0, FLOOR_Y + doorH + (WALL_H - doorH) / 2, HD / 2);
  }

  buildTokonoma() {
    const { FLOOR_Y, HW, HD } = this;
    const tokonoma = new THREE.Group();
    tokonoma.position.set(-HW / 2 + 1.1, 0, -HD / 2 + 1.2);

    this.box(2.2, 0.1, 1.0, this.mats.post, 0, FLOOR_Y - 0.02, 0, tokonoma, false);
    this.box(0.12, 1.0, 0.12, this.mats.darkWood, -1.0, FLOOR_Y + 0.5, 0.4, tokonoma, false);
    this.box(0.12, 1.0, 0.12, this.mats.darkWood, 1.0, FLOOR_Y + 0.5, 0.4, tokonoma, false);
    this.box(2.2, 0.12, 0.16, this.mats.darkWood, 0, FLOOR_Y + 1.0, 0.4, tokonoma, false);

    const scroll = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xefe6ce, roughness: 1 })
    );
    scroll.position.set(0, FLOOR_Y + 1.6, 0.2);
    tokonoma.add(scroll);
    for (const y of [FLOOR_Y + 2.2, FLOOR_Y + 1.05]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.56, 8), this.mats.darkWood);
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0, y, 0.2);
      tokonoma.add(rod);
    }

    const vase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.14, 0.42, 12),
      new THREE.MeshStandardMaterial({ color: 0x3d5a80, roughness: 0.35 })
    );
    vase.position.set(0.7, FLOOR_Y + 0.26, -0.1);
    vase.castShadow = true;
    tokonoma.add(vase);
    for (let b = 0; b < 3; b++) {
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.02, rand(0.5, 0.75), 5),
        new THREE.MeshStandardMaterial({ color: 0x4a5d23, roughness: 1 })
      );
      branch.position.set(0.7, FLOOR_Y + 0.55 + b * 0.08, -0.1 + b * 0.04);
      branch.rotation.z = rand(-0.4, 0.4);
      tokonoma.add(branch);
    }
    this.group.add(tokonoma);
  }

  buildFurniture() {
    const { FLOOR_Y } = this;

    this.box(1.1, 0.06, 0.7, this.mats.darkWood, 1.4, FLOOR_Y + 0.32, 0.3);
    for (const [lx, lz] of [[-0.42, -0.24], [0.42, -0.24], [-0.42, 0.24], [0.42, 0.24]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 8), this.mats.darkWood);
      leg.position.set(1.4 + lx, FLOOR_Y + 0.16, 0.3 + lz);
      this.group.add(leg);
    }
    const teapot = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x4a3b2a, roughness: 0.4 })
    );
    teapot.position.set(1.4, FLOOR_Y + 0.44, 0.3);
    teapot.castShadow = true;
    this.group.add(teapot);
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.035, 0.07, 10),
      new THREE.MeshStandardMaterial({ color: 0x8a3324, roughness: 0.3 })
    );
    cup.position.set(1.7, FLOOR_Y + 0.385, 0.45);
    cup.castShadow = true;
    this.group.add(cup);

    const cushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.4, 0.14, 16),
      new THREE.MeshStandardMaterial({ color: 0x5a2b2b, roughness: 1 })
    );
    cushion.position.set(0.2, FLOOR_Y + 0.08, -1.4);
    cushion.castShadow = true;
    this.group.add(cushion);
    for (const zx of [-0.5, 1.4]) {
      this.box(0.5, 0.06, 0.5, new THREE.MeshStandardMaterial({ color: 0x4a2b2b, roughness: 1 }), zx, FLOOR_Y + 0.05, 0.95);
    }
  }

  buildWalls() {
    const { FLOOR_Y, HW, HD, WALL_H, HT } = this;

    this.box(HW, WALL_H, HT, this.mats.wall, 0, FLOOR_Y + WALL_H / 2, -HD / 2);

    const beamBottom = WALL_H - 1.0;
    const shojiBottom = 1.3;
    const shojiH = beamBottom - shojiBottom;
    for (const wx of [-HW/2, HW/2]) {
      this.box(HT, 0.9, HD, this.mats.wall, wx, FLOOR_Y + 0.45, 0);
      this.box(HT, WALL_H - beamBottom, HD, this.mats.post, wx, FLOOR_Y + beamBottom + (WALL_H - beamBottom) / 2, 0);
      this.box(HT - 0.08, shojiH, HD - 0.6, this.mats.shoji, wx, FLOOR_Y + shojiBottom + shojiH / 2, 0, this.group, false);
      for (let fz = -HD / 2 + 0.8; fz <= HD / 2 - 0.8; fz += 0.8) {
        this.box(HT - 0.02, shojiH, 0.05, this.mats.darkWood, wx, FLOOR_Y + shojiBottom + shojiH / 2, fz, this.group, false);
      }
    }

    this.box(HW, 0.15, HD, this.mats.post, 0, FLOOR_Y + WALL_H + 0.07, 0);
    for (const sz of [0, -HD/2, HD/2]) {
      this.box(HW + 0.3, 0.2, 0.3, this.mats.post, 0, FLOOR_Y + WALL_H + 0.1, sz);
    }
  }

  buildRoof() {
    const { FLOOR_Y, HW, HD, WALL_H } = this;
    const rise = 1.8, halfSpan = HD / 2 + 0.8;
    const slopeLen = Math.hypot(halfSpan, rise);
    const roofAngle = Math.atan2(rise, halfSpan);
    for (const side of [1, -1]) {
      const slope = this.box(HW + 1.6, 0.16, slopeLen, this.mats.roof, 0, FLOOR_Y + WALL_H + rise / 2 - 0.1, (side * halfSpan) / 2);
      slope.rotation.x = side * roofAngle;
    }
    this.box(HW + 1.8, 0.22, 0.4, this.mats.roof, 0, FLOOR_Y + WALL_H + rise - 0.1, 0);

    const gableShape = new THREE.Shape();
    gableShape.moveTo(-HW / 2, 0);
    gableShape.lineTo(HW / 2, 0);
    gableShape.lineTo(0, rise);
    gableShape.closePath();
    for (const gz of [HD / 2, -HD / 2]) {
      const gable = new THREE.Mesh(
        new THREE.ExtrudeGeometry(gableShape, { depth: 0.12, bevelEnabled: false }),
        this.mats.wall
      );
      gable.position.set(0, FLOOR_Y + WALL_H, gz - 0.06);
      gable.castShadow = true;
      this.group.add(gable);
    }
  }

  buildLighting() {
    const { FLOOR_Y, WALL_H } = this;
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb870, emissiveIntensity: 1.5 })
    );
    lantern.position.set(0, FLOOR_Y + WALL_H - 0.45, -1.4);
    this.group.add(lantern);
    const light = new THREE.PointLight(0xffc98a, 12, 20, 2);
    light.position.copy(lantern.position);
    this.group.add(light);
  }

  makeTatamiTexture() {
    const c = document.createElement('canvas');
    c.width = 768; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#2c261e';
    ctx.fillRect(0, 0, c.width, c.height);
    const cols = 3, rows = 2;
    const mw = c.width / cols, mh = c.height / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * mw, y = j * mh;
        ctx.fillStyle = '#8e9d63';
        ctx.fillRect(x + 7, y + 7, mw - 14, mh - 14);
        ctx.strokeStyle = 'rgba(60,70,30,0.35)';
        ctx.lineWidth = 1;
        for (let g = 0; g < 30; g++) {
          const gy = y + 10 + Math.random() * (mh - 20);
          ctx.beginPath();
          ctx.moveTo(x + 10, gy);
          ctx.lineTo(x + mw - 10, gy + rand(-2, 2));
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,255,240,0.06)';
        ctx.fillRect(x + 7, y + 7, mw - 14, mh - 14);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  buildColliders() {
    const { HW, HD, doorW } = this;
    this.colliders = [
      { x1: -HW/2 - 0.3, x2: -doorW/2 + 0.05, z1: HD/2 - 0.3, z2: HD/2 + 0.3 },
      { x1: doorW/2 - 0.05, x2: HW/2 + 0.3, z1: HD/2 - 0.3, z2: HD/2 + 0.3 },
      { x1: -HW/2 - 0.3, x2: HW/2 + 0.3, z1: -HD/2 - 0.3, z2: -HD/2 + 0.3 },
      { x1: -HW/2 - 0.3, x2: -HW/2 + 0.3, z1: -HD/2 - 0.3, z2: HD/2 + 0.3 },
      { x1: HW/2 - 0.3, x2: HW/2 + 0.3, z1: -HD/2 - 0.3, z2: HD/2 + 0.3 },
    ];
  }

  inCollider(x, z, r = 0.35) {
    for (const c of this.colliders) {
      if (x > c.x1 - r && x < c.x2 + r && z > c.z1 - r && z < c.z2 + r) return true;
    }
    return false;
  }

  contains(x, z, margin = 0.5) {
    return Math.abs(x) < this.HW / 2 && Math.abs(z) < this.HD / 2 + margin;
  }

  footprintContains(x, z) {
    return Math.abs(x) < this.HW / 2 + 0.5 && Math.abs(z) < this.HD / 2 + 0.9;
  }
}
