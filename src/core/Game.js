import { SceneManager } from '../rendering/SceneManager.js';
import { Renderer }     from '../rendering/Renderer.js';
import { Loop }         from './Loop.js';
import { TypingSystem } from '../systems/TypingSystem.js';
import { SpawnSystem }  from '../systems/SpawnSystem.js';
import { Player }       from '../entities/Player.js';
import { HUD }          from '../ui/HUD.js';

// ── States ──────────────────────────────────────────────────────────────────
export const STATE = {
  MENU:       'menu',
  COUNTDOWN:  'countdown',
  RACE:       'race',
  BATTLE:     'battle',
  END:        'end',
};

export class Game {
  constructor() {
    this.state    = STATE.MENU;
    this.mode     = null;   // 'race' | 'battle'
    this.score    = 0;
    this.lives    = 3;
    this.wpm      = 0;

    // subsystems (lazy-init)
    this.sceneManager  = null;
    this.renderer      = null;
    this.loop          = null;
    this.typingSystem  = null;
    this.spawnSystem   = null;
    this.player        = null;
    this.hud           = null;
    this.enemies       = [];
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  init() {
    this._buildRenderer();
    this._buildScene();
    this._buildHUD();
    this._buildLoop();
    this._bindMenuButtons();
    this._bindEndButtons();
    this.loop.start();            // idle starfield loop runs always
  }

  // ── Renderer + Scene ──────────────────────────────────────────────────────
  _buildRenderer() {
    const canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(canvas);
  }

  _buildScene() {
    this.sceneManager = new SceneManager(this.renderer.threeRenderer);
  }

  // ── HUD ────────────────────────────────────────────────────────────────────
  _buildHUD() {
    this.hud = new HUD(this);
  }

  // ── Game Loop ──────────────────────────────────────────────────────────────
  _buildLoop() {
    this.loop = new Loop((delta, elapsed) => this._tick(delta, elapsed));
  }

  _tick(delta, elapsed) {
    this.sceneManager.update(delta, elapsed);

    if (this.state === STATE.RACE)   this._tickRace(delta, elapsed);
    if (this.state === STATE.BATTLE) this._tickBattle(delta, elapsed);

    this.renderer.render(
      this.sceneManager.scene,
      this.sceneManager.camera,
    );

    if (this.hud) this.hud.update(delta);
  }

  // ── Race Tick ──────────────────────────────────────────────────────────────
  _tickRace(delta, elapsed) {
    if (!this.player) return;
    this.player.updateRace(delta, this.wpm);

    // enemy ship (CPU racer) at constant WPM = 40
    const cpuWpm = 40;
    this.sceneManager.updateCpuRacer(delta, cpuWpm);

    // update HUD progress bar
    const pct = Math.min(this.player.raceProgress, 1);
    const cpuPct = Math.min(this.sceneManager.cpuProgress, 1);
    this.hud.updateRaceProgress(pct, cpuPct);

    // finish line
    if (pct >= 1) this._endRace(cpuPct);
    if (cpuPct >= 1 && pct < 1) this._endRace(cpuPct);
  }

  _endRace(cpuPct) {
    const won = this.player.raceProgress >= this.sceneManager.cpuProgress;
    this._showEnd(won ? '🏆 YOU WIN!' : '💥 DEFEATED', {
      WPM:   this.wpm.toFixed(0),
      Score: this.score,
    });
  }

  // ── Battle Tick ────────────────────────────────────────────────────────────
  _tickBattle(delta, elapsed) {
    if (!this.player) return;

    this.player.updateBattle(delta);
    this.spawnSystem.update(delta, elapsed, this.enemies, this.sceneManager.scene);

    // move enemies toward player
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(delta);
      this.hud.updateEnemyLabel(e);

      if (e.reachedPlayer()) {
        this._takeDamage(e);
        e.destroy(this.sceneManager.scene);
        this.enemies.splice(i, 1);
        continue;
      }
    }

    if (this.lives <= 0) this._showEnd('💥 GAME OVER', { Score: this.score, Wave: this.spawnSystem.wave });
  }

  // ── Start ──────────────────────────────────────────────────────────────────
  startMode(mode) {
    this.mode   = mode;
    this.score  = 0;
    this.lives  = 3;
    this.wpm    = 0;
    this.enemies = [];

    // clear old entities
    if (this.player)      { this.player.destroy(this.sceneManager.scene); this.player = null; }
    if (this.spawnSystem) { this.spawnSystem.reset(); }
    this.hud.clearEnemyLabels();
    this.sceneManager.clearEntities();

    // build fresh player + systems
    this.player = new Player(this.sceneManager.scene, mode);

    if (mode === 'battle') {
      this.spawnSystem  = new SpawnSystem();
      this.typingSystem = new TypingSystem(this, 'battle');
    } else {
      this.typingSystem = new TypingSystem(this, 'race');
    }

    this.sceneManager.setMode(mode);
    this.hud.setMode(mode);
    this._showCountdown(() => {
      this._setState(mode === 'race' ? STATE.RACE : STATE.BATTLE);
      this.typingSystem.activate();
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  _setState(state) {
    this.state = state;
  }

  _takeDamage(enemy) {
    this.lives = Math.max(0, this.lives - 1);
    this.hud.flashDamage();
    this.sceneManager.spawnExplosion(enemy.mesh.position.clone(), 0xff2d6b);
  }

  killEnemy(enemy) {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) this.enemies.splice(idx, 1);
    this.sceneManager.spawnExplosion(enemy.mesh.position.clone(), 0x39ff14);
    // fire laser bullet from player to enemy
    if (this.player?.mesh) {
      this.sceneManager.addBullet(
        this.player.mesh.position.clone(),
        enemy.mesh.position.clone(),
      );
    }
    enemy.destroy(this.sceneManager.scene);
    this.hud.removeEnemyLabel(enemy);
    this.score += 100 + enemy.word.length * 10;
    this.hud.showKillText('+' + (100 + enemy.word.length * 10));
  }

  _showCountdown(cb) {
    this._setState(STATE.COUNTDOWN);
    const el = document.getElementById('countdown');
    el.classList.remove('hidden');
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');

    const steps = ['3', '2', '1', 'GO!'];
    let i = 0;
    const tick = () => {
      el.textContent = steps[i];
      // force reflow for re-trigger animation
      el.classList.remove('hidden');
      void el.offsetWidth;
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
      i++;
      if (i < steps.length) setTimeout(tick, 800);
      else {
        setTimeout(() => { el.classList.add('hidden'); cb(); }, 600);
      }
    };
    tick();
  }

  _showEnd(title, stats) {
    if (this.state === STATE.END) return;
    this._setState(STATE.END);
    if (this.typingSystem) this.typingSystem.deactivate();
    this.hud.hide();

    document.getElementById('end-title').textContent = title;
    document.getElementById('end-stats').innerHTML = Object.entries(stats)
      .map(([k, v]) => `${k}: <span>${v}</span>`)
      .join('<br>');

    const endEl = document.getElementById('end-screen');
    endEl.classList.remove('hidden');
    document.getElementById('btn-restart').dataset.mode = this.mode;
  }

  // ── Menu buttons ──────────────────────────────────────────────────────────
  _bindMenuButtons() {
    document.querySelectorAll('.menu-btn[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => this.startMode(btn.dataset.mode));
    });
  }

  _bindEndButtons() {
    document.getElementById('btn-restart').addEventListener('click', e => {
      document.getElementById('end-screen').classList.add('hidden');
      this.startMode(e.currentTarget.dataset.mode || this.mode);
    });
    document.getElementById('btn-menu').addEventListener('click', () => {
      document.getElementById('end-screen').classList.add('hidden');
      if (this.typingSystem) this.typingSystem.deactivate();
      this.hud.hide();
      this._setState(STATE.MENU);
      document.getElementById('menu-screen').classList.remove('hidden');
    });
  }
}
