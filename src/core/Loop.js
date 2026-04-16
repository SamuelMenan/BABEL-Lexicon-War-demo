export class Loop {
  constructor(onTick) {
    this._onTick  = onTick;
    this._rafId   = null;
    this._last    = null;
    this._elapsed = 0;
  }

  start() {
    if (this._rafId !== null) return;
    this._last = performance.now();
    this._step();
  }

  stop() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _step() {
    this._rafId = requestAnimationFrame(now => {
      const delta = Math.min((now - this._last) / 1000, 0.1); // cap at 100 ms
      this._last    = now;
      this._elapsed += delta;
      this._onTick(delta, this._elapsed);
      this._step();
    });
  }
}
