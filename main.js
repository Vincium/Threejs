import * as THREE from 'three';
import { windUniform } from './src/utils.js';
import { Terrain, Rocks } from './src/Terrain.js';
import { Forest } from './src/Forest.js';
import { GrassField } from './src/GrassField.js';
import { Mountains, Clouds } from './src/Sky.js';
import { TeaHouse } from './src/TeaHouse.js';
import { MeditationUI } from './src/UI.js';
import { Controls } from './src/Controls.js';
import { Player } from './src/Player.js';

const BUILD_TIME = '2026-10-04 07:05 UTC';
const info = document.getElementById('info');
if (info) {
  info.textContent += ' • v: ' + BUILD_TIME;
}

// ---------- Core ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 40, 260);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 6, 30);

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
new Terrain(scene);
new Rocks(scene);
new Mountains(scene);
const clouds = new Clouds(scene);
const teaHouse = new TeaHouse(scene);
new Forest(scene);
new GrassField(scene, { excludeArea: { contains: (x, z) => teaHouse.footprintContains(x, z) } });

// ---------- Input & UI ----------
const meditationUI = new MeditationUI();
const controls = new Controls(renderer, {
  onAnyInput: () => { if (meditationUI.meditating) meditationUI.stop(); },
});
addEventListener('keydown', () => { if (meditationUI.meditating) meditationUI.stop(); });

const player = new Player(camera, controls);
meditationUI.onToggle = () => {
  player.meditating = meditationUI.meditating;
};

// ---------- Animate ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  windUniform.value += dt;

  clouds.update(dt);
  player.update(dt, { teaHouse, windTime: windUniform.value });
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
