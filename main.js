import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 40, 260);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 6, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

// Block mobile browser gestures (pinch zoom, double-tap zoom, pull-to-refresh)
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const BUILD_TIME = '2026-10-03 19:18 UTC';
const FLOOR_Y = 0.32;
const HW = 8, HD = 6, WALL_H = 2.4, HT = 0.24;
const info = document.getElementById('info');
if (info) {
  info.textContent += ' • v: ' + BUILD_TIME;
}

// ---------- Lights ----------
const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a5f2b, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2d9, 1.6);
sun.position.set(40, 60, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -80;
sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;
sun.shadow.camera.bottom = -80;
sun.shadow.camera.far = 200;
scene.add(sun);

// ---------- Ground ----------
const groundGeo = new THREE.PlaneGeometry(300, 300, 64, 64);
const pos = groundGeo.attributes.position;
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), y = pos.getY(i);
  pos.setZ(i, Math.sin(x * 0.08) * 0.6 + Math.cos(y * 0.1) * 0.5);
}
groundGeo.computeVertexNormals();
const ground = new THREE.Mesh(
  groundGeo,
  new THREE.MeshStandardMaterial({ color: 0x3f7a2f, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ---------- Trees (procedural branching, Level 3) ----------
const rand = (a, b) => a + Math.random() * (b - a);
const windUniform = { value: 0 };

const leafMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.9,
  vertexColors: true,
  flatShading: true,
  onBeforeCompile: (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float heightFactor = smoothstep(1.5, 6.0, transformed.y);
        float phase = instanceMatrix[3].x * 0.5 + instanceMatrix[3].z * 0.5;
        transformed.x += sin(uTime * 1.5 + phase) * 0.1 * heightFactor;
        transformed.z += cos(uTime * 1.2 + phase) * 0.08 * heightFactor;`
      );
  },
});

function makeBranchParts(parts, origin, direction, length, radius, depth) {
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
    makeBranchParts(
      parts,
      end.clone().addScaledVector(dir, -0.1),
      newDir,
      length * rand(0.6, 0.75),
      radius * 0.65,
      depth + 1
    );
  }
}

function addVertexColors(geo, colorFn) {
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

function makeTreeGeometry() {
  const parts = [];
  makeBranchParts(parts, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 2.4, 0.28, 0);

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

const treeCount = 320;
const variantCount = 6;
const treesPerVariant = Math.ceil(treeCount / variantCount);
for (let v = 0; v < variantCount; v++) {
  const mesh = new THREE.InstancedMesh(makeTreeGeometry(), leafMat, treesPerVariant);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  let placed = 0;
  let guard = 0;
  while (placed < treesPerVariant && guard < 1000) {
    guard++;
    const x = rand(-120, 120);
    const z = rand(-120, 120);
    if (Math.hypot(x, z) < 8) continue;
    dummy.position.set(x, 0, z);
    dummy.rotation.y = rand(0, Math.PI * 2);
    dummy.scale.setScalar(rand(0.8, 1.8));
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
}

// ---------- Grass (instanced tapered blades with wind) ----------
function makeBladeGeometry() {
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
    const bend0 = t0 * t0 * 0.25;
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
  geo.scale(1, 0.55, 1);
  return geo;
}

const bladeGeo = makeBladeGeometry();
const bladeMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 1,
  side: THREE.DoubleSide,
  vertexColors: true,
  onBeforeCompile: (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float bladeH = transformed.y;
        float phase = instanceMatrix[3].x * 0.8 + instanceMatrix[3].z * 0.8;
        transformed.x += sin(uTime * 2.0 + phase) * 0.18 * bladeH * bladeH;
        transformed.z += cos(uTime * 1.6 + phase * 1.3) * 0.1 * bladeH * bladeH;`
      );
  },
});

const grassCount = 60000;
const grass = new THREE.InstancedMesh(bladeGeo, bladeMat, grassCount);
const dummy = new THREE.Object3D();
const color = new THREE.Color();
const bladeColors = new Float32Array(bladeGeo.attributes.position.count * 3);
for (let i = 0; i < bladeGeo.attributes.position.count; i++) {
  const t = bladeGeo.attributes.position.getY(i);
  color.setHSL(0.27, 0.55, 0.22 + t * 0.25);
  bladeColors[i * 3] = color.r;
  bladeColors[i * 3 + 1] = color.g;
  bladeColors[i * 3 + 2] = color.b;
}
bladeGeo.setAttribute('color', new THREE.BufferAttribute(bladeColors, 3));
for (let i = 0; i < grassCount; i++) {
  const x = rand(-90, 90);
  const z = rand(-90, 90);
  if (Math.abs(x) < HW / 2 + 0.5 && Math.abs(z) < HD / 2 + 0.9) continue;
  dummy.position.set(x, 0, z);
  dummy.rotation.set(rand(-0.15, 0.15), rand(0, Math.PI), rand(-0.15, 0.15));
  dummy.scale.set(rand(0.6, 1.4), rand(0.5, 1.1), rand(0.6, 1.4));
  dummy.updateMatrix();
  grass.setMatrixAt(i, dummy.matrix);
}
grass.instanceMatrix.needsUpdate = true;
scene.add(grass);

// ---------- Clouds (Level 3) ----------
const cloudMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 1,
  transparent: true,
  opacity: 0.92,
  flatShading: true,
});

const cloudPuffGeos = [];
for (let i = 0; i < 4; i++) {
  const g = new THREE.IcosahedronGeometry(rand(4, 9), 1);
  const p = g.attributes.position;
  for (let j = 0; j < p.count; j++) {
    const n = Math.sin(p.getX(j) * 1.7) + Math.cos(p.getZ(j) * 1.3) + Math.sin(p.getY(j) * 2.1);
    p.setXYZ(j, p.getX(j), p.getY(j) * 0.55 + n * 0.5, p.getZ(j));
  }
  g.computeVertexNormals();
  cloudPuffGeos.push(g);
}

const clouds = [];
const cloudCount = 16;
for (let i = 0; i < cloudCount; i++) {
  const cloud = new THREE.Group();
  const puffs = 4 + Math.floor(Math.random() * 4);
  for (let j = 0; j < puffs; j++) {
    const mesh = new THREE.Mesh(cloudPuffGeos[Math.floor(Math.random() * cloudPuffGeos.length)], cloudMat);
    mesh.position.set(rand(-14, 14), rand(-2, 2), rand(-8, 8));
    mesh.scale.setScalar(rand(0.7, 1.4));
    cloud.add(mesh);
  }
  const angle = rand(0, Math.PI * 2);
  const dist = rand(60, 220);
  cloud.position.set(Math.cos(angle) * dist, rand(55, 85), Math.sin(angle) * dist);
  cloud.userData.speed = rand(0.8, 2.0);
  scene.add(cloud);
  clouds.push(cloud);
}

// ---------- Mountains (Level 3 ring) ----------
const FOREST_RADIUS = 118;
const MOUNTAIN_RING = 150;
const ROCK = new THREE.Color(0x7d7468);
const SNOW = new THREE.Color(0xf4f6f8);
const FOREST_EDGE = new THREE.Color(0x3f5a2e);

function makeMountainGeometry(radius, height) {
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

const mountainMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 1,
  flatShading: true,
  side: THREE.DoubleSide,
});
const mountainCount = 14;
for (let i = 0; i < mountainCount; i++) {
  const angle = (i / mountainCount) * Math.PI * 2 + rand(-0.15, 0.15);
  const dist = MOUNTAIN_RING + rand(-15, 15);
  const height = rand(35, 65);
  const geo = makeMountainGeometry(rand(30, 50), height);
  const m = new THREE.Mesh(geo, mountainMat);
  m.position.set(Math.cos(angle) * dist, -4, Math.sin(angle) * dist);
  m.rotation.y = rand(0, Math.PI * 2);
  scene.add(m);
}

// ---------- Rocks ----------
const rockGeo = new THREE.DodecahedronGeometry(0.6, 0);
const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 1, flatShading: true });
for (let i = 0; i < 25; i++) {
  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.position.set(rand(-120, 120), 0.2, rand(-120, 120));
  rock.scale.set(rand(0.4, 1.5), rand(0.3, 1), rand(0.4, 1.5));
  rock.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
  rock.castShadow = true;
  scene.add(rock);
}

// ---------- Japanese tea house ----------
let meditating = false;

const postMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.9 });
const wallMat = new THREE.MeshStandardMaterial({ color: 0x9a7b52, roughness: 1 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x35393f, roughness: 1, flatShading: true });
const shojiMat = new THREE.MeshStandardMaterial({
  color: 0xf7efdc, roughness: 0.8, emissive: 0x554c33, emissiveIntensity: 0.25, side: THREE.DoubleSide,
});

function makeTatamiTexture() {
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

const house = new THREE.Group();

const platform = new THREE.Mesh(new THREE.BoxGeometry(HW, FLOOR_Y, HD), postMat);
platform.position.y = FLOOR_Y / 2;
platform.castShadow = true;
platform.receiveShadow = true;
house.add(platform);

const tatami = new THREE.Mesh(
  new THREE.PlaneGeometry(HW - 0.5, HD - 0.5),
  new THREE.MeshStandardMaterial({ map: makeTatamiTexture(), roughness: 0.95 })
);
tatami.rotation.x = -Math.PI / 2;
tatami.position.y = FLOOR_Y + 0.012;
tatami.receiveShadow = true;
house.add(tatami);

const step = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 1.0), postMat);
step.position.set(0, 0.09, HD / 2 + 0.5);
step.castShadow = true;
house.add(step);

const postGeo = new THREE.BoxGeometry(0.28, WALL_H, 0.28);
for (const [px, pz] of [[-HW/2+0.14, HD/2-0.14], [HW/2-0.14, HD/2-0.14], [-HW/2+0.14, -HD/2+0.14], [HW/2-0.14, -HD/2+0.14], [0, HD/2-0.14], [0, -HD/2+0.14]]) {
  const post = new THREE.Mesh(postGeo, postMat);
  post.position.set(px, FLOOR_Y + WALL_H / 2, pz);
  post.castShadow = true;
  house.add(post);
}

const doorW = 1.8, doorH = 2.0;
const frontSegW = (HW - doorW) / 2;
for (const sx of [-(doorW / 2 + frontSegW / 2), doorW / 2 + frontSegW / 2]) {
  const seg = new THREE.Mesh(new THREE.BoxGeometry(frontSegW, WALL_H, HT), wallMat);
  seg.position.set(sx, FLOOR_Y + WALL_H / 2, HD / 2);
  seg.castShadow = true;
  seg.receiveShadow = true;
  house.add(seg);
}
const header = new THREE.Mesh(new THREE.BoxGeometry(doorW, WALL_H - doorH, HT), postMat);
header.position.set(0, FLOOR_Y + doorH + (WALL_H - doorH) / 2, HD / 2);
header.castShadow = true;
house.add(header);

const backWall = new THREE.Mesh(new THREE.BoxGeometry(HW, WALL_H, HT), wallMat);
backWall.position.set(0, FLOOR_Y + WALL_H / 2, -HD / 2);
backWall.castShadow = true;
backWall.receiveShadow = true;
house.add(backWall);

for (const wx of [-HW/2, HW/2]) {
  const lower = new THREE.Mesh(new THREE.BoxGeometry(HT, 0.9, HD), wallMat);
  lower.position.set(wx, FLOOR_Y + 0.45, 0);
  lower.castShadow = true;
  house.add(lower);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(HT, WALL_H - 1.9, HD), postMat);
  upper.position.set(wx, FLOOR_Y + 1.9 + (WALL_H - 1.9) / 2, 0);
  upper.castShadow = true;
  house.add(upper);
  const shoji = new THREE.Mesh(new THREE.BoxGeometry(HT - 0.08, 1.0, HD - 0.6), shojiMat);
  shoji.position.set(wx, FLOOR_Y + 1.4, 0);
  house.add(shoji);
}

const ceiling = new THREE.Mesh(new THREE.BoxGeometry(HW, 0.15, HD), postMat);
ceiling.position.y = FLOOR_Y + WALL_H + 0.07;
ceiling.castShadow = true;
ceiling.receiveShadow = true;
house.add(ceiling);

for (const sz of [0, -HD/2, HD/2]) {
  const beam = new THREE.Mesh(new THREE.BoxGeometry(HW + 0.3, 0.2, 0.3), postMat);
  beam.position.set(0, FLOOR_Y + WALL_H + 0.1, sz);
  beam.castShadow = true;
  house.add(beam);
}

const rise = 1.8, halfSpan = HD / 2 + 0.8;
const slopeLen = Math.hypot(halfSpan, rise);
const roofAngle = Math.atan2(rise, halfSpan);
for (const side of [1, -1]) {
  const slope = new THREE.Mesh(new THREE.BoxGeometry(HW + 1.6, 0.16, slopeLen), roofMat);
  slope.rotation.x = side * roofAngle;
  slope.position.set(0, FLOOR_Y + WALL_H + rise / 2 - 0.1, (side * halfSpan) / 2);
  slope.castShadow = true;
  house.add(slope);
}
const ridge = new THREE.Mesh(new THREE.BoxGeometry(HW + 1.8, 0.22, 0.4), roofMat);
ridge.position.set(0, FLOOR_Y + WALL_H + rise - 0.1, 0);
ridge.castShadow = true;
house.add(ridge);

const gableShape = new THREE.Shape();
gableShape.moveTo(-HW / 2, 0);
gableShape.lineTo(HW / 2, 0);
gableShape.lineTo(0, rise);
gableShape.closePath();
for (const gz of [HD / 2, -HD / 2]) {
  const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(gableShape, { depth: 0.12, bevelEnabled: false }), wallMat);
  gable.position.set(0, FLOOR_Y + WALL_H, gz - 0.06);
  gable.castShadow = true;
  house.add(gable);
}

const cushion = new THREE.Mesh(
  new THREE.CylinderGeometry(0.36, 0.4, 0.14, 16),
  new THREE.MeshStandardMaterial({ color: 0x5a2b2b, roughness: 1 })
);
cushion.position.set(0, FLOOR_Y + 0.08, -0.7);
cushion.castShadow = true;
house.add(cushion);

const lantern = new THREE.Mesh(
  new THREE.SphereGeometry(0.13, 10, 10),
  new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb870, emissiveIntensity: 1.5 })
);
lantern.position.set(0, FLOOR_Y + WALL_H - 0.4, -0.7);
house.add(lantern);
const lanternLight = new THREE.PointLight(0xffc98a, 8, 12, 2);
lanternLight.position.copy(lantern.position);
house.add(lanternLight);

scene.add(house);

// ---------- House collision ----------
const colliders = [
  { x1: -HW/2 - 0.3, x2: -doorW/2 + 0.05, z1: HD/2 - 0.3, z2: HD/2 + 0.3 },
  { x1: doorW/2 - 0.05, x2: HW/2 + 0.3, z1: HD/2 - 0.3, z2: HD/2 + 0.3 },
  { x1: -HW/2 - 0.3, x2: HW/2 + 0.3, z1: -HD/2 - 0.3, z2: -HD/2 + 0.3 },
  { x1: -HW/2 - 0.3, x2: -HW/2 + 0.3, z1: -HD/2 - 0.3, z2: HD/2 + 0.3 },
  { x1: HW/2 - 0.3, x2: HW/2 + 0.3, z1: -HD/2 - 0.3, z2: HD/2 + 0.3 },
];

function inCollider(x, z, r = 0.35) {
  for (const c of colliders) {
    if (x > c.x1 - r && x < c.x2 + r && z > c.z1 - r && z < c.z2 + r) return true;
  }
  return false;
}

// ---------- Meditation UI ----------
const styleEl = document.createElement('style');
styleEl.textContent = `
  #medBtn {
    position: fixed; right: max(24px, env(safe-area-inset-right));
    bottom: max(24px, env(safe-area-inset-bottom));
    padding: 16px 26px; border: none; border-radius: 28px;
    background: rgba(30,30,30,0.7); color: #fff;
    font-size: 17px; font-family: sans-serif;
    display: block; z-index: 20; backdrop-filter: blur(4px);
    touch-action: manipulation; min-height: 52px;
  }
  #medOverlay {
    position: fixed; inset: 0; display: none; z-index: 15;
    background: radial-gradient(circle at center, transparent 30%, rgba(10,12,18,0.55) 100%);
    pointer-events: none;
  }
  #medRing {
    position: absolute; left: 50%; top: 40%;
    width: min(38vw, 160px); height: min(38vw, 160px);
    transform: translate(-50%, -50%);
    border-radius: 50%; border: 2px solid rgba(255,255,255,0.5);
    animation: breathe 8s ease-in-out infinite;
  }
  #medText {
    position: absolute; left: 50%; top: 40%; transform: translate(-50%, min(19vw, 80px));
    color: rgba(255,255,255,0.9); font-family: sans-serif; font-size: clamp(16px, 4.5vw, 22px);
    letter-spacing: 3px;
  }
  @keyframes breathe {
    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
    50% { transform: translate(-50%, -50%) scale(1.35); opacity: 0.9; }
  }
`;
document.head.appendChild(styleEl);

const medBtn = document.createElement('button');
medBtn.id = 'medBtn';
medBtn.textContent = '🧘 Meditate';
medBtn.onclick = () => (meditating ? stopMeditate() : startMeditate());
document.body.appendChild(medBtn);

const medOverlay = document.createElement('div');
medOverlay.id = 'medOverlay';
medOverlay.innerHTML = '<div id="medRing"></div><div id="medText">breathe</div>';
document.body.appendChild(medOverlay);
const medText = medOverlay.querySelector('#medText');

function startMeditate() {
  meditating = true;
  medBtn.textContent = '🧍 Stand up';
  medOverlay.style.display = 'block';
}

function stopMeditate() {
  meditating = false;
  medBtn.textContent = '🧘 Meditate';
  medOverlay.style.display = 'none';
}

addEventListener('keydown', () => { if (meditating) stopMeditate(); });

// ---------- Controls (pointer-look + WASD) ----------
const keys = {};
addEventListener('keydown', (e) => (keys[e.code] = true));
addEventListener('keyup', (e) => (keys[e.code] = false));

let yaw = 0, pitch = -0.1;
let dragging = false, lastX = 0, lastY = 0, lookId = null;

// ---------- Virtual joystick (mobile) ----------
const isTouch = matchMedia('(pointer: coarse)').matches;
const touchMove = { x: 0, y: 0, active: false };

const stickBase = document.createElement('div');
const stickKnob = document.createElement('div');
if (isTouch) {
  const baseStyle = {
    position: 'fixed',
    left: 'max(24px, env(safe-area-inset-left))',
    bottom: 'max(24px, env(safe-area-inset-bottom))',
    width: 'min(30vw, 130px)', height: 'min(30vw, 130px)', borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)',
    touchAction: 'none', pointerEvents: 'auto', zIndex: 10,
  };
  Object.assign(stickBase.style, baseStyle);
  Object.assign(stickKnob.style, {
    position: 'absolute', left: '50%', top: '50%',
    width: '48px', height: '48px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.6)',
    transform: 'translate(-50%, -50%)',
  });
  stickBase.appendChild(stickKnob);
  document.body.appendChild(stickBase);
  document.addEventListener('touchmove', (e) => {
    if (e.target === renderer.domElement || e.target === stickBase || e.target === stickKnob) {
      e.preventDefault();
    }
  }, { passive: false });
}

let stickId = null, stickCenter = { x: 0, y: 0 };
const getStickRadius = () => (stickBase.getBoundingClientRect().width / 2) * 0.72;

function setKnob(dx, dy) {
  stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

if (isTouch) {
  stickBase.addEventListener('pointerdown', (e) => {
    stickId = e.pointerId;
    const r = stickBase.getBoundingClientRect();
    stickCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    stickBase.setPointerCapture(e.pointerId);
    stickBase.dataset.radius = getStickRadius();
    touchMove.active = true;
    e.preventDefault();
  });
  stickBase.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickId) return;
    let dx = e.clientX - stickCenter.x;
    let dy = e.clientY - stickCenter.y;
    const len = Math.hypot(dx, dy);
    const R = Number(stickBase.dataset.radius) || 40;
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    touchMove.x = dx / R;
    touchMove.y = dy / R;
    setKnob(dx, dy);
    e.preventDefault();
  });
  const endStick = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    touchMove.x = 0;
    touchMove.y = 0;
    touchMove.active = false;
    setKnob(0, 0);
  };
  stickBase.addEventListener('pointerup', endStick);
  stickBase.addEventListener('pointercancel', endStick);
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse') return; // touch look handled separately
  dragging = true;
  lookId = e.pointerId;
  lastX = e.clientX;
  lastY = e.clientY;
});
addEventListener('pointerup', (e) => {
  if (e.pointerId === lookId) dragging = false;
});
addEventListener('pointermove', (e) => {
  if (!dragging) return;
  yaw += (e.clientX - lastX) * 0.004;
  pitch = Math.max(-1.2, Math.min(1.2, pitch + (e.clientY - lastY) * 0.004));
  lastX = e.clientX;
  lastY = e.clientY;
});

// Touch look: any touch outside the joystick rotates the camera
renderer.domElement.addEventListener('touchstart', (e) => {
  if (lookId === null) {
    const t = e.changedTouches[0];
    lookId = t.identifier;
    lastX = t.clientX;
    lastY = t.clientY;
  }
  e.preventDefault();
}, { passive: false });
renderer.domElement.addEventListener('touchmove', (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier !== lookId) continue;
    yaw += (t.clientX - lastX) * 0.005;
    pitch = Math.max(-1.2, Math.min(1.2, pitch + (t.clientY - lastY) * 0.005));
    lastX = t.clientX;
    lastY = t.clientY;
  }
  e.preventDefault();
}, { passive: false });
renderer.domElement.addEventListener('touchend', (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === lookId) lookId = null;
  }
}, { passive: false });

const velocity = new THREE.Vector3();
const forward = new THREE.Vector3();
const eyeHeight = 4;

// ---------- Animate ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  windUniform.value += dt;

  for (const cloud of clouds) {
    cloud.position.x += cloud.userData.speed * dt;
    if (cloud.position.x > 260) cloud.position.x = -260;
  }

  const insideHouse =
    Math.abs(camera.position.x) < HW / 2 &&
    Math.abs(camera.position.z) < HD / 2 + 0.5;

  if (meditating) {
    const targetY = (insideHouse ? FLOOR_Y : 0) + 0.9;
    camera.position.y += (targetY - camera.position.y) * Math.min(1, dt * 2.5);
    pitch += (-0.35 - pitch) * Math.min(1, dt * 2);
    const cycle = (windUniform.value % 8) / 8;
    medText.textContent = cycle < 0.4 ? 'breathe in' : cycle < 0.5 ? 'hold' : cycle < 0.9 ? 'breathe out' : 'hold';
  } else {
  forward.set(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(-1);
  velocity.set(0, 0, 0);
  const speed = 20;
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  if (keys['KeyW'] || keys['ArrowUp']) velocity.add(forward);
  if (keys['KeyS'] || keys['ArrowDown']) velocity.sub(forward);
  if (keys['KeyA'] || keys['ArrowLeft']) velocity.add(right);
  if (keys['KeyD'] || keys['ArrowRight']) velocity.sub(right);
  if (touchMove.active) {
    velocity.addScaledVector(forward, -touchMove.y);
    velocity.addScaledVector(right, touchMove.x);
  }
  if (keys['KeyQ']) camera.position.y -= speed * dt;
  if (keys['KeyE']) camera.position.y += speed * dt;
  if (velocity.lengthSq() > 0) {
    const move = velocity.clone().normalize().multiplyScalar(speed * dt);
    const nx = camera.position.x + move.x;
    const nz = camera.position.z + move.z;
    if (!inCollider(nx, camera.position.z)) camera.position.x = nx;
    if (!inCollider(camera.position.x, nz)) camera.position.z = nz;
  }
  const eyeTarget = insideHouse ? FLOOR_Y + 1.6 : eyeHeight;
  if (Math.abs(camera.position.y - eyeTarget) > 0.01) {
    camera.position.y += (eyeTarget - camera.position.y) * Math.min(1, dt * 8);
  }
  camera.position.x = Math.max(-130, Math.min(130, camera.position.x));
  camera.position.z = Math.max(-130, Math.min(130, camera.position.z));
  camera.position.y = Math.max(camera.position.y, 1.5);
  const groundDist = Math.hypot(camera.position.x, camera.position.z);
  if (groundDist > FOREST_RADIUS) {
    const k = FOREST_RADIUS / groundDist;
    camera.position.x *= k;
    camera.position.z *= k;
  }
  }

  const look = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch)
  );
  camera.lookAt(camera.position.clone().sub(look));

  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
if (visualViewport) {
  visualViewport.addEventListener('resize', () => {
    renderer.setSize(visualViewport.width, visualViewport.height);
  });
}
