import * as THREE from 'three';

export class Controls {
  constructor(renderer, { onAnyInput } = {}) {
    this.keys = {};
    this.touchMove = { x: 0, y: 0, active: false };
    this.yaw = 0;
    this.pitch = -0.1;
    this.onAnyInput = onAnyInput;

    addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (this.onAnyInput) this.onAnyInput();
    });
    addEventListener('keyup', (e) => (this.keys[e.code] = false));

    this.setupJoystick(renderer);
    this.setupMouseLook(renderer);
    this.setupTouchLook(renderer);
  }

  setupJoystick(renderer) {
    this.isTouch = matchMedia('(pointer: coarse)').matches;
    if (!this.isTouch) return;

    this.stickBase = document.createElement('div');
    this.stickKnob = document.createElement('div');
    Object.assign(this.stickBase.style, {
      position: 'fixed',
      left: 'max(24px, env(safe-area-inset-left))',
      bottom: 'max(24px, env(safe-area-inset-bottom))',
      width: 'min(30vw, 130px)', height: 'min(15vw, 65px)',
      borderRadius: 'min(15vw, 65px) min(15vw, 65px) 0 0',
      background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)',
      borderBottom: 'none',
      touchAction: 'none', pointerEvents: 'auto', zIndex: 10,
    });
    Object.assign(this.stickKnob.style, {
      position: 'absolute', left: '50%', top: '50%',
      width: '48px', height: '48px', borderRadius: '50%',
      background: 'rgba(255,255,255,0.6)',
      transform: 'translate(-50%, -50%)',
    });
    this.stickBase.appendChild(this.stickKnob);
    document.body.appendChild(this.stickBase);

    document.addEventListener('touchmove', (e) => {
      if (e.target === renderer.domElement || e.target === this.stickBase || e.target === this.stickKnob) {
        e.preventDefault();
      }
    }, { passive: false });

    let stickId = null;
    let stickCenter = { x: 0, y: 0 };
    const getRadius = () => (this.stickBase.getBoundingClientRect().width / 2) * 0.72;
    const setKnob = (dx, dy) => {
      this.stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    const clampToHalf = (dx, dy) => {
      if (dy > 0) dy = 0;
      return [dx, dy];
    };

    this.stickBase.addEventListener('pointerdown', (e) => {
      stickId = e.pointerId;
      const r = this.stickBase.getBoundingClientRect();
      stickCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      this.stickBase.setPointerCapture(e.pointerId);
      this.stickBase.dataset.radius = getRadius();
      this.touchMove.active = true;
      e.preventDefault();
    });
    this.stickBase.addEventListener('pointermove', (e) => {
      if (e.pointerId !== stickId) return;
      let dx = e.clientX - stickCenter.x;
      let dy = e.clientY - stickCenter.y;
      const R = Number(this.stickBase.dataset.radius) || 40;
      [dx, dy] = clampToHalf(dx, dy);
      const len = Math.hypot(dx, dy);
      if (len > R) {
        dx = (dx / len) * R;
        dy = (dy / len) * R;
      }
      this.touchMove.x = dx / R;
      this.touchMove.y = dy / R;
      setKnob(dx, dy);
      e.preventDefault();
    });
    const endStick = (e) => {
      if (e.pointerId !== stickId) return;
      stickId = null;
      this.touchMove.x = 0;
      this.touchMove.y = 0;
      this.touchMove.active = false;
      setKnob(0, 0);
    };
    this.stickBase.addEventListener('pointerup', endStick);
    this.stickBase.addEventListener('pointercancel', endStick);
  }

  setupMouseLook(renderer) {
    let dragging = false;
    let lastX = 0, lastY = 0;

    renderer.domElement.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });
    addEventListener('pointerup', () => (dragging = false));
    addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.yaw += (e.clientX - lastX) * 0.004;
      this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch - (e.clientY - lastY) * 0.004));
      lastX = e.clientX;
      lastY = e.clientY;
    });
  }

  setupTouchLook(renderer) {
    let lookId = null;
    let lastX = 0, lastY = 0;

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
        const dx = t.clientX - lastX;
        const dy = t.clientY - lastY;
        const speedScale = Math.min(1, Math.hypot(dx, dy) / 30);
        const k = 0.005 * (0.3 + 0.7 * speedScale);
        this.yaw += dx * k;
        this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch - dy * k));
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
  }

  update(dt) {
    const turnSpeed = 1.8;
    if (this.keys['ArrowLeft']) this.yaw += turnSpeed * dt;
    if (this.keys['ArrowRight']) this.yaw -= turnSpeed * dt;

    const v = this.getMoveVector();
    if (v.lengthSq() > 0) {
      const targetYaw = Math.atan2(-v.x, -v.z);
      let diff = targetYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 2);
    }
  }

  getLookDirection() {
    return new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    );
  }

  getMoveVector() {
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(-1);
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const v = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) v.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) v.sub(forward);
    if (this.keys['KeyA']) v.add(right);
    if (this.keys['KeyD']) v.sub(right);
    if (this.touchMove.active) {
      v.addScaledVector(forward, -this.touchMove.y);
      v.addScaledVector(right, this.touchMove.x);
    }
    return v;
  }

  hasVerticalInput() {
    return this.keys['KeyQ'] || this.keys['KeyE'];
  }
}
