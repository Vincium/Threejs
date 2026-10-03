import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 40, 140);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 6, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

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

// ---------- Trees ----------
const rand = (a, b) => a + Math.random() * (b - a);

const trunkGeo = new THREE.CylinderGeometry(0.18, 0.35, 2.2, 7);
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d6a1f, roughness: 0.9, flatShading: true });
const coneGeoLow = new THREE.ConeGeometry(1.6, 2.4, 8);
const coneGeoMid = new THREE.ConeGeometry(1.2, 2.0, 8);
const coneGeoTop = new THREE.ConeGeometry(0.8, 1.6, 8);

const treeCount = 120;
const treePositions = [];
for (let i = 0; i < treeCount; i++) {
  let x, z, ok = false;
  while (!ok) {
    x = rand(-120, 120);
    z = rand(-120, 120);
    ok = Math.hypot(x, z) > 8; // keep clearing around spawn
  }
  treePositions.push([x, z]);

  const tree = new THREE.Group();
  const s = rand(0.8, 1.8);
  tree.scale.setScalar(s);
  tree.rotation.y = rand(0, Math.PI * 2);
  tree.position.set(x, 0, z);

  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  tree.add(trunk);

  const tiers = [
    { geo: coneGeoLow, y: 2.6 },
    { geo: coneGeoMid, y: 4.0 },
    { geo: coneGeoTop, y: 5.2 },
  ];
  for (const t of tiers) {
    const cone = new THREE.Mesh(t.geo, leafMat);
    cone.position.y = t.y;
    cone.castShadow = true;
    tree.add(cone);
  }
  scene.add(tree);
}

// ---------- Grass (instanced blades) ----------
const bladeGeo = new THREE.PlaneGeometry(0.14, 0.9);
bladeGeo.translate(0, 0.45, 0);
const bladeMat = new THREE.MeshStandardMaterial({
  color: 0x4c9a3a,
  roughness: 1,
  side: THREE.DoubleSide,
});

const grassCount = 12000;
const grass = new THREE.InstancedMesh(bladeGeo, bladeMat, grassCount);
const dummy = new THREE.Object3D();
const color = new THREE.Color();
for (let i = 0; i < grassCount; i++) {
  const x = rand(-90, 90);
  const z = rand(-90, 90);
  dummy.position.set(x, 0, z);
  dummy.rotation.set(rand(-0.15, 0.15), rand(0, Math.PI), rand(-0.15, 0.15));
  dummy.scale.setScalar(rand(0.6, 1.4));
  dummy.updateMatrix();
  grass.setMatrixAt(i, dummy.matrix);
  color.setHSL(0.28 + rand(-0.03, 0.03), 0.5, rand(0.3, 0.45));
  grass.setColorAt(i, color);
}
grass.instanceMatrix.needsUpdate = true;
scene.add(grass);

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

// ---------- Controls (pointer-look + WASD) ----------
const keys = {};
addEventListener('keydown', (e) => (keys[e.code] = true));
addEventListener('keyup', (e) => (keys[e.code] = false));

let yaw = 0, pitch = -0.1;
let dragging = false, lastX = 0, lastY = 0;
renderer.domElement.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});
addEventListener('pointerup', () => (dragging = false));
addEventListener('pointermove', (e) => {
  if (!dragging) return;
  yaw -= (e.clientX - lastX) * 0.004;
  pitch = Math.max(-1.2, Math.min(1.2, pitch - (e.clientY - lastY) * 0.004));
  lastX = e.clientX;
  lastY = e.clientY;
});

const velocity = new THREE.Vector3();
const forward = new THREE.Vector3();
const eyeHeight = 4;

// ---------- Animate ----------
const clock = new THREE.Clock();
const wind = { time: 0 };

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  wind.time += dt;

  forward.set(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(-1);
  velocity.set(0, 0, 0);
  const speed = 20;
  if (keys['KeyW'] || keys['ArrowUp']) velocity.add(forward);
  if (keys['KeyS'] || keys['ArrowDown']) velocity.sub(forward);
  if (keys['KeyA'] || keys['ArrowLeft']) velocity.add(new THREE.Vector3(-forward.z, 0, forward.x));
  if (keys['KeyD'] || keys['ArrowRight']) velocity.add(new THREE.Vector3(forward.z, 0, -forward.x));
  if (keys['KeyQ']) camera.position.y -= speed * dt;
  if (keys['KeyE']) camera.position.y += speed * dt;
  if (velocity.lengthSq() > 0) {
    velocity.normalize().multiplyScalar(speed * dt);
    camera.position.add(velocity);
  }
  if (camera.position.y < eyeHeight * 0.5) camera.position.y = eyeHeight * 0.5;
  camera.position.x = Math.max(-130, Math.min(130, camera.position.x));
  camera.position.z = Math.max(-130, Math.min(130, camera.position.z));
  camera.position.y = Math.max(camera.position.y, 1.5);

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
