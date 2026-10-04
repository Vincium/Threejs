import * as THREE from 'three';

export class Player {
  constructor(camera, controls, { eyeHeight = 1.7, speed = 10, bounds = 130, forestRadius = 118 } = {}) {
    this.camera = camera;
    this.controls = controls;
    this.eyeHeight = eyeHeight;
    this.speed = speed;
    this.bounds = bounds;
    this.forestRadius = forestRadius;
    this.meditating = false;
  }

  update(dt, { teaHouse, court, windTime }) {
    const cam = this.camera.position;
    const insideHouse = teaHouse.contains(cam.x, cam.z);
    const move = this.controls.getMoveVector();

    if (this.meditating) {
      const targetY = (insideHouse ? teaHouse.FLOOR_Y : 0) + 1.0;
      cam.y += (targetY - cam.y) * Math.min(1, dt * 2.5);
      this.controls.pitch += (-0.35 - this.controls.pitch) * Math.min(1, dt * 2);
      return;
    }

    if (move.lengthSq() > 0) {
      const inputMagnitude = Math.min(1, move.length()) ** 2;
      const step = move.normalize().multiplyScalar(this.speed * inputMagnitude * dt);
      const nx = cam.x + step.x;
      const nz = cam.z + step.z;
      const blocked = (x, z) => teaHouse.inCollider(x, z) || (court && court.inCollider(x, z, 0.35, cam.y));
      if (!blocked(nx, cam.z)) cam.x = nx;
      if (!blocked(cam.x, nz)) cam.z = nz;
    }
    if (this.controls.keys['KeyQ']) cam.y -= this.speed * dt;
    if (this.controls.keys['KeyE']) cam.y += this.speed * dt;

    const insideHouseFootprint = teaHouse.contains(cam.x, cam.z);
    const standEyeTarget = this.eyeHeight + (insideHouseFootprint ? teaHouse.FLOOR_Y : 0);
    if (Math.abs(cam.y - standEyeTarget) > 0.01) {
      cam.y += (standEyeTarget - cam.y) * Math.min(1, dt * 8);
    }

    cam.x = Math.max(-this.bounds, Math.min(this.bounds, cam.x));
    cam.z = Math.max(-this.bounds, Math.min(this.bounds, cam.z));
    cam.y = Math.max(cam.y, this.eyeHeight * 0.9);
    const groundDist = Math.hypot(cam.x, cam.z);
    if (groundDist > this.forestRadius) {
      const k = this.forestRadius / groundDist;
      cam.x *= k;
      cam.z *= k;
    }
  }

  look() {
    const look = this.controls.getLookDirection();
    this.camera.lookAt(this.camera.position.clone().sub(look));
  }
}
