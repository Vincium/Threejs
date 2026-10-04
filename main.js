import * as THREE from 'three';
import { windUniform } from './src/utils.js?v=20261004181811';
import { Terrain, Rocks } from './src/Terrain.js?v=20261004181811';
import { Forest } from './src/Forest.js?v=20261004181811';
import { GrassField } from './src/GrassField.js?v=20261004181811';
import { Mountains, Clouds } from './src/Sky.js?v=20261004181811';
import { TeaHouse } from './src/TeaHouse.js?v=20261004181811';
import { TennisCourt } from './src/TennisCourt.js?v=20261004181811';
import { MeditationUI } from './src/UI.js?v=20261004181811';
import { Controls } from './src/Controls.js?v=20261004181811';
import { Player } from './src/Player.js?v=20261004181811';
import { Human } from './src/Human.js?v=20261004181811';

const BUILD_TIME = '2026-10-04 18:18 UTC';
const info = document.getElementById('info');
if (info) {
  info.textContent += ' • v: ' + BUILD_TIME;
}

// ---------- Core ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 40, 260);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 6, 33.2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Block mobile browser gestures (pinch zoom, double-tap zoom, pull-to-refresh)
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

// ---------- Lights ----------
scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x3a5f2b, 0.9));
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

// ---------- World ----------
const terrain = new Terrain(scene, { flatZones: [{ x: 0, z: -45, halfX: 10, halfZ: 22 }] });
const teaHouse = new TeaHouse(scene);
const court = new TennisCourt(scene, { x: 0, z: -45 });
const courtExcl = { contains: (x, z) => court.footprintContains(x, z) };
new Rocks(scene, { excludeArea: { contains: (x, z) => teaHouse.footprintContains(x, z) || courtExcl.contains(x, z) } });
new Mountains(scene);
const clouds = new Clouds(scene);
const forest = new Forest(scene, { excludeArea: { contains: (x, z) => teaHouse.footprintContains(x, z) || courtExcl.contains(x, z) || Math.hypot(x, z - 30) < 3 } });
const grass = new GrassField(scene, { excludeArea: { contains: (x, z) => teaHouse.footprintContains(x, z) || courtExcl.contains(x, z) }, terrain });

// ---------- Input & UI ----------
const meditationUI = new MeditationUI();
const controls = new Controls(renderer, {
  onAnyInput: () => { if (meditationUI.meditating) meditationUI.stop(); },
});
addEventListener('keydown', () => { if (meditationUI.meditating) meditationUI.stop(); });

const human = new Human(scene);
const humanCamDist = 3.2;
const player = new Player(camera, controls, { body: human.pos, bodyHeight: 1.0 });
meditationUI.onToggle = () => {
  player.meditating = meditationUI.meditating;
  human.meditating = meditationUI.meditating;
};
meditationUI.setVisible(false);

// ---------- Animate ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  windUniform.value += dt;

  clouds.update(dt);
  controls.update(dt);
  player.update(dt, { teaHouse, court, windTime: windUniform.value });
  const moving = !player.meditating && controls.getMoveVector().lengthSq() > 0;
  human.update(dt, camera, controls, { teaHouse, court, terrain, forest, moving });
  forest.refresh(human.pos.x, human.pos.z);
  grass.refresh(human.pos.x, human.pos.z);
  meditationUI.setVisible(teaHouse.contains(human.pos.x, human.pos.z));

  // Third-person camera: lag behind the human
  {
    const flat = new THREE.Vector3(Math.sin(human.facing), 0, Math.cos(human.facing));
    const camX = human.pos.x - flat.x * humanCamDist;
    const camZ = human.pos.z - flat.z * humanCamDist;
    const camGroundY = terrain.getHeight(camX, camZ) + 2.2;
    const camTargetPos = new THREE.Vector3(camX, Math.max(camGroundY, human.pos.y + 1.6), camZ);
    camera.position.lerp(camTargetPos, Math.min(1, dt * 2.5));
    const lookTarget = human.pos.clone().add(new THREE.Vector3(0, 1.4, 0));
    const smoothLook = camera.userData.smoothLook || (camera.userData.smoothLook = lookTarget.clone());
    smoothLook.lerp(lookTarget, Math.min(1, dt * 3));
    camera.lookAt(smoothLook);
  }
  if (meditationUI.meditating) {
    meditationUI.updateBreathText(windUniform.value);
  }
  player.look();

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
