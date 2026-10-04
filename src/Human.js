import * as THREE from 'three';

export class Human {
  constructor(scene, { distance = 2.6 } = {}) {
    this.scene = scene;
    this.distance = distance;
    this.walkPhase = 0;
    this.group = this.build();
    this.pos = new THREE.Vector3(0, 0, 30);
    this.group.position.copy(this.pos);
    this.facing = 0;
    scene.add(this.group);
  }

  build() {
    const g = new THREE.Group();

    const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    const shirt = new THREE.MeshLambertMaterial({ color: 0x3a6ea5 });
    const pants = new THREE.MeshLambertMaterial({ color: 0x2b2b3a });
    const shoe = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const hair = new THREE.MeshLambertMaterial({ color: 0x3b2a1a });

    const cast = (m) => { m.castShadow = true; return m; };

    // Torso
    const torso = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.42, 6, 12), shirt));
    torso.position.y = 1.15;
    torso.scale.set(1.05, 1, 0.72);
    g.add(torso);

    // Hips
    const hips = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.1, 4, 10), pants));
    hips.position.y = 0.88;
    hips.scale.set(1.05, 1, 0.75);
    g.add(hips);

    // Neck
    const neck = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8), skin));
    neck.position.y = 1.47;
    g.add(neck);

    // Head
    const head = new THREE.Group();
    head.position.y = 1.58;
    const skull = cast(new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 16), skin));
    skull.scale.set(0.88, 1, 0.94);
    head.add(skull);
    const hairCap = cast(new THREE.Mesh(new THREE.SphereGeometry(0.122, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hair));
    hairCap.scale.set(0.9, 1.02, 0.96);
    hairCap.position.y = 0.012;
    head.add(hairCap);
    const eyeGeo = new THREE.SphereGeometry(0.016, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x201510 });
    for (const x of [-0.038, 0.038]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(x, 0.01, -0.105);
      head.add(eye);
    }
    const nose = cast(new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.045, 6), skin));
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, -0.012, -0.118);
    head.add(nose);
    g.add(head);
    this.head = head;

    // Arms
    const armGeo = new THREE.CapsuleGeometry(0.055, 0.5, 4, 8);
    const makeArm = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(0.24 * side, 1.38, 0);
      const upper = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.22, 4, 8), shirt));
      upper.position.y = -0.14;
      pivot.add(upper);
      const elbow = new THREE.Group();
      elbow.position.y = -0.28;
      const forearm = cast(new THREE.Mesh(armGeo, skin));
      forearm.geometry = new THREE.CapsuleGeometry(0.048, 0.2, 4, 8);
      forearm.position.y = -0.13;
      elbow.add(forearm);
      const hand = cast(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), skin));
      hand.scale.set(0.9, 1.1, 0.9);
      hand.position.y = -0.27;
      elbow.add(hand);
      pivot.add(elbow);
      g.add(pivot);
      return { pivot, elbow };
    };
    this.armL = makeArm(-1);
    this.armR = makeArm(1);

    // Legs
    const makeLeg = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(0.1 * side, 0.85, 0);
      const thigh = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.32, 4, 10), pants));
      thigh.position.y = -0.2;
      pivot.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -0.42;
      const shin = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.3, 4, 10), pants));
      shin.position.y = -0.18;
      knee.add(shin);
      const foot = cast(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.24), shoe));
      foot.position.set(0, -0.38, -0.05);
      knee.add(foot);
      pivot.add(knee);
      g.add(pivot);
      return { pivot, knee };
    };
    this.legL = makeLeg(-1);
    this.legR = makeLeg(1);

    return g;
  }

  update(dt, camera, controls, { teaHouse, court, moving }) {
    const ease = (v, t) => v + (t - v) * Math.min(1, dt * 10);

    // Face the movement direction, then walk forward
    if (moving) {
      const move = controls.getMoveVector();
      if (move.lengthSq() > 0) {
        const targetFacing = Math.atan2(move.x, move.z);
        let diff = targetFacing - this.facing;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.facing += diff * Math.min(1, dt * 10);
      }
    }

    // Walk forward in the facing direction
    const movingForward = moving && this.walkAmount > 0.5;
    const forward = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
    if (movingForward) {
      const nx = this.pos.x + forward.x * 9 * dt;
      const nz = this.pos.z + forward.z * 9 * dt;
      const blocked = (x, z) =>
        (teaHouse && teaHouse.inCollider(x, z)) ||
        (court && court.inCollider(x, z, 0.35, this.pos.y));
      if (!blocked(nx, this.pos.z)) this.pos.x = nx;
      if (!blocked(this.pos.x, nz)) this.pos.z = nz;
    }

    const floorY = teaHouse.contains(this.pos.x, this.pos.z) ? teaHouse.FLOOR_Y : 0;
    this.group.position.set(this.pos.x, floorY, this.pos.z);
    this.group.rotation.y = this.facing;

    this.head.rotation.x = THREE.MathUtils.clamp(controls.pitch, -0.6, 0.6);

    this.walkPhase += dt * (moving ? 8 : 0);
    this.walkAmount = ease(this.walkAmount || 0, moving ? 1 : 0);

    const a = Math.sin(this.walkPhase) * this.walkAmount;
    const b = Math.sin(this.walkPhase + Math.PI) * this.walkAmount;

    this.legL.pivot.rotation.x = a * 0.7;
    this.legR.pivot.rotation.x = b * 0.7;
    this.legL.knee.rotation.x = Math.max(0, -a) * 0.9;
    this.legR.knee.rotation.x = Math.max(0, -b) * 0.9;
    this.armL.pivot.rotation.x = b * 0.6;
    this.armR.pivot.rotation.x = a * 0.6;
    this.armL.elbow.rotation.x = -0.25 - Math.max(0, b) * 0.5;
    this.armR.elbow.rotation.x = -0.25 - Math.max(0, a) * 0.5;

    this.group.position.y += Math.abs(Math.sin(this.walkPhase)) * 0.04 * this.walkAmount;
  }
}
