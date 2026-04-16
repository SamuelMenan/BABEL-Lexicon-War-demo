import * as THREE from 'three';

export class Player {
  constructor(scene, mode) {
    this.scene        = scene;
    this.mode         = mode;
    this.raceProgress = 0;  // 0–1
    this.mesh         = null;
    this._thrusterT   = 0;

    this._build();
  }

  _build() {
    const group = new THREE.Group();

    // fuselage
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(.45, 2.2, 6),
      new THREE.MeshPhongMaterial({ color: 0x00f0ff, emissive: 0x003344, emissiveIntensity: .5 }),
    );
    body.rotation.x = -Math.PI / 2;
    group.add(body);

    // wings
    const wingL = this._makeWing();
    const wingR = this._makeWing();
    wingR.scale.x = -1;
    wingL.position.set(-1.1, 0, .5);
    wingR.position.set(1.1, 0, .5);
    group.add(wingL, wingR);

    // cockpit dome
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(.28, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhongMaterial({ color: 0x88eeff, transparent: true, opacity: .7, emissive: 0x0044aa }),
    );
    dome.position.y = .12;
    dome.rotation.x = Math.PI;
    group.add(dome);

    // engine glow light
    this._engineLight = new THREE.PointLight(0x00f0ff, 2, 6);
    this._engineLight.position.set(0, 0, 1.2);
    group.add(this._engineLight);

    // thruster flame
    this._flame = new THREE.Mesh(
      new THREE.ConeGeometry(.18, .8, 6),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: .8 }),
    );
    this._flame.rotation.x = Math.PI / 2;
    this._flame.position.z = 1.3;
    group.add(this._flame);

    if (this.mode === 'race') {
      group.position.set(-3, 0, 8);
      group.rotation.y = 0;
    } else {
      group.position.set(0, 0, 6);
      group.rotation.y = 0;
    }

    this.mesh = group;
    this.scene.add(group);
  }

  _makeWing() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(-1.0, -.2);
    shape.lineTo(-.8, .4);
    shape.lineTo(0, .1);

    const geo = new THREE.ShapeGeometry(shape);
    return new THREE.Mesh(
      geo,
      new THREE.MeshPhongMaterial({ color: 0x0088bb, emissive: 0x001122, side: THREE.DoubleSide }),
    );
  }

  // ── Race update ───────────────────────────────────────────────────────────
  updateRace(delta, wpm) {
    const speed = Math.max(0, wpm) / 60 * 0.08;
    this.raceProgress = Math.min(this.raceProgress + speed * delta, 1);

    const z = 8 - this.raceProgress * 40;
    this.mesh.position.z = z;
    this.mesh.position.x = -3;

    this._animateThruster(delta, wpm > 0);
  }

  // ── Battle update ─────────────────────────────────────────────────────────
  updateBattle(delta) {
    this._animateThruster(delta, true);
    // gentle bobbing
    this.mesh.position.y = Math.sin(Date.now() * .001 * 1.2) * .15;
  }

  _animateThruster(delta, active) {
    this._thrusterT += delta;
    const pulse = .7 + Math.sin(this._thrusterT * 12) * .3;
    this._flame.scale.y   = active ? pulse : 0.1;
    this._flame.material.opacity = active ? pulse * .9 : .1;
    this._engineLight.intensity  = active ? pulse * 2.5 : .3;
  }

  // ── Fire bullet toward enemy ───────────────────────────────────────────────
  fireAt(enemy, scene) {
    // delegated to SceneManager via game ref – we emit event here instead
    // Actually SceneManager.addBullet called from Game.killEnemy
  }

  destroy(scene) {
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh = null;
    }
  }
}
