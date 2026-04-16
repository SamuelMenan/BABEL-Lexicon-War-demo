import * as THREE from 'three';

export class SceneManager {
  constructor(renderer) {
    this.renderer    = renderer;
    this.scene       = new THREE.Scene();
    this.camera      = null;
    this.starField   = null;
    this.cpuShip     = null;
    this.cpuProgress = 0;
    this.particles   = [];  // explosion particles
    this.bullets     = [];  // laser bullets
    this._mode       = null;

    this._buildCamera();
    this._buildStarfield();
    this._buildLighting();
    this._buildNebula();
  }

  // ── Camera ──────────────────────────────────────────────────────────────
  _buildCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 2000,
    );
    this.camera.position.set(0, 4, 14);
    this.camera.lookAt(0, 0, 0);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  // ── Starfield ────────────────────────────────────────────────────────────
  _buildStarfield() {
    const count = 1800;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);
    const col   = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - .5) * 400;
      pos[i * 3 + 1] = (Math.random() - .5) * 300;
      pos[i * 3 + 2] = (Math.random() - .5) * 600 - 50;

      const r = Math.random();
      if (r < .2) { col[i*3]=0.4; col[i*3+1]=0.8; col[i*3+2]=1.0; }      // blue
      else if (r < .35) { col[i*3]=1.0; col[i*3+1]=0.6; col[i*3+2]=0.2; } // orange
      else { col[i*3]=1.0; col[i*3+1]=1.0; col[i*3+2]=1.0; }              // white
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
      size: .5, vertexColors: true,
      transparent: true, opacity: .85,
    });
    this.starField = new THREE.Points(geo, mat);
    this.scene.add(this.starField);
  }

  // ── Nebula bg plane ──────────────────────────────────────────────────────
  _buildNebula() {
    const geo = new THREE.PlaneGeometry(500, 300);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x06040f, transparent: true, opacity: .95,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = -80;
    this.scene.add(mesh);
  }

  // ── Lighting ─────────────────────────────────────────────────────────────
  _buildLighting() {
    const amb = new THREE.AmbientLight(0x334466, 2);
    this.scene.add(amb);

    const dir = new THREE.DirectionalLight(0x88ccff, 3);
    dir.position.set(5, 8, 5);
    this.scene.add(dir);

    const pt = new THREE.PointLight(0x00f0ff, 2, 50);
    pt.position.set(0, 3, 5);
    this.scene.add(pt);
  }

  // ── Mode-specific setup ──────────────────────────────────────────────────
  setMode(mode) {
    this._mode = mode;
    if (mode === 'race') {
      this._buildCpuRacer();
    }
  }

  clearEntities() {
    // remove old cpu racer
    if (this.cpuShip) {
      this.scene.remove(this.cpuShip);
      this.cpuShip = null;
    }
    this.cpuProgress = 0;

    // remove lingering particles / bullets
    this.particles.forEach(p => this.scene.remove(p.mesh));
    this.particles = [];
    this.bullets.forEach(b => this.scene.remove(b.mesh));
    this.bullets = [];
  }

  // ── CPU Racer (Race mode) ────────────────────────────────────────────────
  _buildCpuRacer() {
    this.cpuProgress = 0;
    this.cpuShip = this._makeShipMesh(0xff2d6b);
    this.cpuShip.position.set(3, 0, 0);
    this.scene.add(this.cpuShip);
  }

  updateCpuRacer(delta, cpuWpm) {
    if (!this.cpuShip) return;
    const speed = cpuWpm / 60 * 0.08;
    this.cpuProgress = Math.min(this.cpuProgress + speed * delta, 1);
    // side-by-side x offset: player at x=-3, cpu at x=3
    const z = this._progressToZ(this.cpuProgress);
    this.cpuShip.position.z = z;
    this.cpuShip.rotation.y = Math.PI;
    this.cpuShip.position.x = 3;
  }

  _progressToZ(p) { return 8 - p * 40; }

  // ── Ship geometry helper ─────────────────────────────────────────────────
  _makeShipMesh(color) {
    const group = new THREE.Group();
    // fuselage
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(.4, 2, 6),
      new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: .3 }),
    );
    body.rotation.x = Math.PI / 2;
    group.add(body);
    // wings
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, .08, .6),
      new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: .2 }),
    );
    wing.position.z = .3;
    group.add(wing);
    // engine glow
    const glow = new THREE.PointLight(color, 1.5, 4);
    glow.position.z = 1;
    group.add(glow);
    return group;
  }

  // ── Explosions ────────────────────────────────────────────────────────────
  spawnExplosion(position, color) {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const geo  = new THREE.SphereGeometry(.12, 4, 4);
      const mat  = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - .5) * 8,
        (Math.random() - .5) * 8,
        (Math.random() - .5) * 8,
      );
      this.particles.push({ mesh, vel, life: .6 + Math.random() * .4 });
    }
  }

  // ── Bullets ───────────────────────────────────────────────────────────────
  addBullet(startPos, targetPos) {
    const geo  = new THREE.SphereGeometry(.1, 4, 4);
    const mat  = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const mesh = new THREE.Mesh(geo, mat);

    // add a line (laser trail)
    const linePts = [startPos.clone(), startPos.clone()];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: .6 });
    const line = new THREE.Line(lineGeo, lineMat);
    this.scene.add(line);

    mesh.position.copy(startPos);
    this.scene.add(mesh);

    const dir  = targetPos.clone().sub(startPos).normalize();
    const dist = startPos.distanceTo(targetPos);
    this.bullets.push({ mesh, line, dir, speed: 25, dist, travelled: 0 });
  }

  // ── Update ────────────────────────────────────────────────────────────────
  update(delta, elapsed) {
    // scroll stars gently
    if (this.starField) {
      this.starField.position.z += delta * 4;
      if (this.starField.position.z > 50) this.starField.position.z -= 50;
    }

    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.addScaledVector(p.vel, delta);
      p.vel.multiplyScalar(.85);
      p.life -= delta;
      p.mesh.material.opacity = Math.max(0, p.life / .8);
      p.mesh.material.transparent = true;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    // bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const step = b.speed * delta;
      b.mesh.position.addScaledVector(b.dir, step);
      b.travelled += step;

      // update line end point
      const pts = [
        b.mesh.position.clone().addScaledVector(b.dir, -Math.min(b.travelled, 3)),
        b.mesh.position.clone(),
      ];
      b.line.geometry.setFromPoints(pts);

      if (b.travelled >= b.dist + 1) {
        this.scene.remove(b.mesh);
        this.scene.remove(b.line);
        this.bullets.splice(i, 1);
      }
    }

    // gentle camera sway
    this.camera.position.x = Math.sin(elapsed * .3) * .4;
    this.camera.position.y = 4 + Math.cos(elapsed * .2) * .2;
    this.camera.lookAt(0, 0, -2);
  }
}
