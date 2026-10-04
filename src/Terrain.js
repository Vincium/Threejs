import * as THREE from 'three';

export class Terrain {
  constructor(scene, { size = 300, segments = 64, color = 0x3f7a2f } = {}) {
    this.scene = scene;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const flat = Math.min(1, Math.max(0, (Math.hypot(x, y) - 8) / 12));      pos.setZ(i, (Math.sin(x * 0.08) * 0.6 + Math.cos(y * 0.1) * 0.5) * flat);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);
    this.mesh = mesh;
  }
}

export class Rocks {
  constructor(scene, { count = 25, spread = 120, excludeArea = null } = {}) {
    const geo = new THREE.DodecahedronGeometry(0.6, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 1, flatShading: true });
    for (let i = 0; i < count; i++) {
      const rock = new THREE.Mesh(geo, mat);
      rock.position.set(
        (Math.random() - 0.5) * 2 * spread,
        0.2,
        (Math.random() - 0.5) * 2 * spread
      );
      if (excludeArea && excludeArea.contains(rock.position.x, rock.position.z)) continue;      rock.scale.set(
        0.4 + Math.random() * 1.1,
        0.3 + Math.random() * 0.7,
        0.4 + Math.random() * 1.1
      );
      rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      rock.castShadow = true;
      scene.add(rock);
    }
  }
}
