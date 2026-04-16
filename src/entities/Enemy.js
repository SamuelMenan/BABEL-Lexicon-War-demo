import * as THREE from 'three';

let _eid = 0;

export class Enemy {
  constructor(word, spawnPos) {
    this.id      = _eid++;
    this.word    = word;
    this.typed   = '';     // chars correctly typed so far
    this.mesh    = null;
    this._speed  = 1.8 + Math.random() * 1.2;
    this._label  = null;   // DOM element, set by HUD
    this._wobbleT = Math.random() * Math.PI * 2;

    this._build(spawnPos);
  }

  _build(pos) {
    const group = new THREE.Group();

    const hue   = Math.random();
    const color = new THREE.Color().setHSL(hue, .9, .55);

    // body
    const body = new THREE.Mesh(
      new THREE.OctahedronGeometry(.7, 0),
      new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: .4, wireframe: false }),
    );
    group.add(body);

    // spiky extensions
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(.12, .7, 4),
        new THREE.MeshBasicMaterial({ color }),
      );
      const angle = (i / 4) * Math.PI * 2;
      spike.position.set(Math.cos(angle) * .5, Math.sin(angle) * .5, 0);
      spike.rotation.z = angle + Math.PI / 2;
      group.add(spike);
    }

    // glow
    const light = new THREE.PointLight(color, 1.5, 5);
    group.add(light);

    group.position.copy(pos);
    this.mesh = group;
  }

  update(delta) {
    if (!this.mesh) return;
    this._wobbleT += delta * 1.5;
    this.mesh.position.z += this._speed * delta;
    this.mesh.position.x += Math.sin(this._wobbleT) * delta * .5;
    this.mesh.rotation.y += delta * 1.2;
    this.mesh.rotation.x += delta * .7;
  }

  reachedPlayer() {
    return this.mesh && this.mesh.position.z > 8;
  }

  // called when a correct key is typed
  advanceTyped(char) {
    const next = this.word[this.typed.length];
    if (char === next) {
      this.typed += char;
      return true;
    }
    return false;
  }

  get remaining() { return this.word.slice(this.typed.length); }
  get isComplete() { return this.typed.length >= this.word.length; }

  setLabel(el) { this._label = el; }
  getLabel()   { return this._label; }

  destroy(scene) {
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh = null;
    }
  }

  // World → screen projection (used by HUD for label placement)
  getScreenPos(camera, w, h) {
    if (!this.mesh) return null;
    const v = this.mesh.position.clone().project(camera);
    return {
      x: (v.x * .5 + .5) * w,
      y: (1 - (v.y * .5 + .5)) * h - 30,
    };
  }
}
