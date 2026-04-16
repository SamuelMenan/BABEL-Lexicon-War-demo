import * as THREE from 'three';
import { Enemy }   from '../entities/Enemy.js';
import { WORDS }   from './words.js';

export class SpawnSystem {
  constructor() {
    this.wave          = 1;
    this._timer        = 0;
    this._waveTimer    = 0;
    this._spawnInterval = 3.5;   // seconds between spawns
    this._waveInterval  = 25;    // seconds per wave
    this._maxOnScreen   = 8;
  }

  reset() {
    this.wave           = 1;
    this._timer         = 0;
    this._waveTimer     = 0;
    this._spawnInterval = 3.5;
  }

  update(delta, elapsed, enemies, scene) {
    this._timer     += delta;
    this._waveTimer += delta;

    // advance waves
    if (this._waveTimer >= this._waveInterval) {
      this.wave++;
      this._waveTimer     = 0;
      this._spawnInterval = Math.max(.8, 3.5 - this.wave * .3);
    }

    if (this._timer >= this._spawnInterval && enemies.length < this._maxOnScreen) {
      this._timer = 0;
      const count = Math.min(1 + Math.floor(this.wave / 3), 3);
      for (let i = 0; i < count; i++) {
        this._spawnOne(enemies, scene);
      }
    }
  }

  _spawnOne(enemies, scene) {
    const word = this._pickWord();
    const pos  = new THREE.Vector3(
      (Math.random() - .5) * 16,
      (Math.random() - .5) * 4,
      -40 - Math.random() * 20,
    );
    const enemy = new Enemy(word, pos);
    scene.add(enemy.mesh);
    enemies.push(enemy);
  }

  _pickWord() {
    return WORDS[Math.floor(Math.random() * WORDS.length)];
  }
}
