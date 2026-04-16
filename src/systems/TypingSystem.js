import { WORDS, RACE_WORDS } from './words.js';

const RACE_WORD_COUNT = 30;   // words in a race
const WPM_WINDOW     = 5000;  // ms rolling window for WPM

export class TypingSystem {
  constructor(game, mode) {
    this.game        = game;
    this.mode        = mode;
    this._input      = document.getElementById('typing-input');
    this._active     = false;

    // Race state
    this._raceWords      = [];
    this._raceWordIndex  = 0;
    this._raceStartTime  = 0;
    this._keyTimestamps  = [];  // rolling window

    // Battle state
    this._target         = null;  // current targeted enemy

    this._onKeydown = this._handleKeydown.bind(this);
    this._onInput   = this._handleInput.bind(this);
  }

  activate() {
    if (this._active) return;
    this._active = true;

    if (this.mode === 'race') {
      this._raceWords     = this._buildRaceWords();
      this._raceWordIndex = 0;
      this._raceStartTime = Date.now();
      this._keyTimestamps = [];
      this._showRaceWord();
    }

    this._input.value = '';
    document.getElementById('typing-area').classList.remove('hidden');
    this._input.addEventListener('keydown', this._onKeydown);
    this._input.addEventListener('input',   this._onInput);
    setTimeout(() => this._input.focus(), 50);
  }

  deactivate() {
    this._active = false;
    document.getElementById('typing-area').classList.add('hidden');
    this._input.removeEventListener('keydown', this._onKeydown);
    this._input.removeEventListener('input',   this._onInput);
    this._input.blur();
  }

  // ── Race mode ──────────────────────────────────────────────────────────────
  _buildRaceWords() {
    const bank = [...RACE_WORDS].sort(() => Math.random() - .5);
    return bank.slice(0, RACE_WORD_COUNT);
  }

  _showRaceWord() {
    const el = document.getElementById('current-word-prompt');
    if (this._raceWordIndex < this._raceWords.length) {
      el.textContent = this._raceWords[this._raceWordIndex];
    } else {
      el.textContent = '✓ FINISH!';
    }
    document.getElementById('hud-word-display').classList.remove('hidden');
  }

  _handleInput(e) {
    if (!this._active) return;
    if (this.mode === 'race') this._processRaceInput();
    if (this.mode === 'battle') this._processBattleChar(e);
  }

  _handleKeydown(e) {
    if (!this._active) return;
    if (e.key === 'Escape') {
      this._input.value = '';
      this._target = null;
      return;
    }
    // Prevent default space scroll
    if (e.key === ' ') e.preventDefault();
  }

  _processRaceInput() {
    const val        = this._input.value.trim();
    const targetWord = this._raceWords[this._raceWordIndex];

    // color feedback: match prefix
    const el = document.getElementById('current-word-prompt');
    if (targetWord && targetWord.startsWith(val)) {
      el.style.color = '#fff';
    } else {
      el.style.color = '#ff2d6b';
    }

    // on space or full match → check word
    const raw = this._input.value;
    if (raw.endsWith(' ') || raw === targetWord) {
      const typed = raw.trim();
      if (typed === targetWord) {
        this._registerRaceKey();
        this._raceWordIndex++;
        this.game.score += typed.length * 5;
        if (this._raceWordIndex >= this._raceWords.length) {
          this.game.player.raceProgress = 1;
        }
      } else {
        this._flashError();
      }
      this._input.value = '';
      this._showRaceWord();
    }
  }

  _registerRaceKey() {
    const now = Date.now();
    this._keyTimestamps.push(now);
    // prune old
    const cutoff = now - WPM_WINDOW;
    this._keyTimestamps = this._keyTimestamps.filter(t => t >= cutoff);
    // wpm = words in window / (window_sec)
    const windowSec = (now - (this._keyTimestamps[0] || now)) / 1000 || 1;
    const rawWpm = (this._keyTimestamps.length / windowSec) * 60;
    this.game.wpm = Math.round(Math.min(rawWpm, 300));
  }

  // ── Battle mode ─────────────────────────────────────────────────────────────
  _processBattleChar(e) {
    // We intercept the raw input value change
    const val = this._input.value;
    if (!val) { this._target = null; return; }

    const enemies = this.game.enemies;
    if (!enemies.length) { this._input.value = ''; return; }

    // If we have a target, keep typing it
    if (this._target) {
      // ensure still alive
      if (!enemies.includes(this._target)) {
        this._target = null;
        this._input.value = '';
        return;
      }
      const expected = this._target.word.slice(this._target.typed.length);
      const ch       = val.slice(-1); // last typed character

      if (expected.length > 0 && ch === expected[0]) {
        this._target.typed += ch;
        this._input.value  = this._target.typed;
        this._updateWpmBattle();

        if (this._target.isComplete) {
          const t = this._target;
          this._target = null;
          this._input.value = '';
          this.game.killEnemy(t);
        }
      } else {
        // wrong key
        this._input.value = this._target.typed;
        this._flashError();
      }
      return;
    }

    // No target: find enemy whose word starts with typed
    const ch = val[0];
    const match = enemies.find(e => e.word[0] === ch && e.typed === '');
    if (match) {
      this._target = match;
      match.typed  = ch;
      this._input.value = ch;
      this._updateWpmBattle();
      if (match.isComplete) {
        this._target = null;
        this._input.value = '';
        this.game.killEnemy(match);
      }
    } else {
      // No match: flash error
      this._input.value = '';
      this._flashError();
    }
  }

  _updateWpmBattle() {
    const now = Date.now();
    this._keyTimestamps = this._keyTimestamps || [];
    this._keyTimestamps.push(now);
    const cutoff = now - WPM_WINDOW;
    this._keyTimestamps = this._keyTimestamps.filter(t => t >= cutoff);
    const windowSec = (now - (this._keyTimestamps[0] || now)) / 1000 || 1;
    const rawWpm = (this._keyTimestamps.length / windowSec) * 60;
    this.game.wpm = Math.round(Math.min(rawWpm, 300));
  }

  _flashError() {
    this._input.classList.add('error');
    setTimeout(() => this._input.classList.remove('error'), 200);
  }

  getTarget() { return this._target; }
}
