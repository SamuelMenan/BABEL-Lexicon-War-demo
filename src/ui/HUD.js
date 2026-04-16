export class HUD {
  constructor(game) {
    this.game       = game;
    this._enemyLabels = new Map();   // enemy.id → DOM element
    this._hudEl     = document.getElementById('hud');
    this._scoreEl   = document.getElementById('score-val');
    this._wpmEl     = document.getElementById('wpm-val');
    this._livesEl   = document.getElementById('lives-val');
    this._progressEl = document.getElementById('hud-progress-bar-wrap');
    this._playerMkr  = document.getElementById('hud-player-marker');
    this._enemyMkr   = document.getElementById('hud-enemy-marker');
    this._damageFlash = false;
    this._damageT     = 0;
  }

  setMode(mode) {
    this._hudEl.classList.remove('hidden');

    if (mode === 'race') {
      this._progressEl.classList.remove('hidden');
      document.getElementById('hud-word-display').classList.remove('hidden');
    } else {
      this._progressEl.classList.add('hidden');
      document.getElementById('hud-word-display').classList.add('hidden');
    }
  }

  hide() {
    this._hudEl.classList.add('hidden');
    document.getElementById('typing-area').classList.add('hidden');
    this.clearEnemyLabels();
  }

  update(delta) {
    // Live stats
    this._scoreEl.textContent = this.game.score;
    this._wpmEl.textContent   = this.game.wpm;
    this._livesEl.textContent = this.game.lives;

    // lives color
    const lc = this.game.lives <= 1 ? '#ff2d6b' : this.game.lives === 2 ? '#ffcc00' : '#39ff14';
    this._livesEl.style.color = lc;

    // damage flash
    if (this._damageFlash) {
      this._damageT -= delta;
      if (this._damageT <= 0) {
        this._damageFlash = false;
        document.getElementById('game-canvas').style.outline = '';
      }
    }
  }

  updateRaceProgress(playerPct, cpuPct) {
    this._playerMkr.style.left = (playerPct * 100).toFixed(1) + '%';
    this._enemyMkr.style.right = ((1 - cpuPct) * 100).toFixed(1) + '%';
  }

  // ── Enemy word labels (Battle mode) ───────────────────────────────────────
  updateEnemyLabel(enemy) {
    let el = this._enemyLabels.get(enemy.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'enemy-label';
      document.getElementById('app').appendChild(el);
      this._enemyLabels.set(enemy.id, el);
      enemy.setLabel(el);
    }

    // position
    const pos = enemy.getScreenPos(
      this.game.sceneManager.camera,
      window.innerWidth,
      window.innerHeight,
    );
    if (!pos || pos.y < -20 || pos.y > window.innerHeight + 20) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    el.style.left    = pos.x + 'px';
    el.style.top     = pos.y + 'px';

    // targeted?
    const targeted = this.game.typingSystem?.getTarget() === enemy;
    el.classList.toggle('targeted', targeted);

    // show typed/remaining
    const typedSpan     = `<span class="typed">${enemy.typed}</span>`;
    const remainingSpan = `<span class="remaining">${enemy.remaining}</span>`;
    el.innerHTML        = typedSpan + remainingSpan;
  }

  removeEnemyLabel(enemy) {
    const el = this._enemyLabels.get(enemy.id);
    if (el) { el.remove(); this._enemyLabels.delete(enemy.id); }
  }

  clearEnemyLabels() {
    this._enemyLabels.forEach(el => el.remove());
    this._enemyLabels.clear();
  }

  // ── Feedback ───────────────────────────────────────────────────────────────
  flashDamage() {
    this._damageFlash = true;
    this._damageT     = .5;
    const canvas = document.getElementById('game-canvas');
    canvas.style.outline = '3px solid #ff2d6b';
    setTimeout(() => { canvas.style.outline = ''; this._damageFlash = false; }, 400);
  }

  showKillText(text) {
    const el = document.createElement('div');
    el.className   = 'kill-text';
    el.textContent = text;
    el.style.left  = (30 + Math.random() * 40) + '%';
    el.style.top   = (30 + Math.random() * 30) + '%';
    document.getElementById('app').appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }
}
