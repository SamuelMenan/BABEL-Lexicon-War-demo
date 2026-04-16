import * as THREE from 'three';

export class Renderer {
  constructor(canvas) {
    this.threeRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias:  true,
      alpha:      false,
    });
    this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.threeRenderer.setSize(window.innerWidth, window.innerHeight);
    this.threeRenderer.shadowMap.enabled = false;

    window.addEventListener('resize', () => this._onResize());
  }

  render(scene, camera) {
    this.threeRenderer.render(scene, camera);
  }

  _onResize() {
    this.threeRenderer.setSize(window.innerWidth, window.innerHeight);
  }
}
