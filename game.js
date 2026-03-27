/**
 * @file game.js — Main game controller for All Fives Dominoes.
 *
 * This is the central orchestrator (~3 800 lines). It wires together every
 * other module and owns the full game lifecycle:
 *
 *  - UI initialization (menus, modals, settings, lobby)
 *  - Game flow (new game, round start/end, win detection)
 *  - Turn management (human input, AI turns, draw/pass logic)
 *  - Board rendering and animation (delegates to {@link Renderer})
 *  - Save / load game state (localStorage)
 *  - Team mode, speed settings, theme/skin switching
 *  - Hint system (delegates to {@link AI#bestMove})
 *  - Achievement and stat tracking (delegates to stats.js)
 *
 * @dependency tile.js       ({@link Tile}, createSet, shuffle)
 * @dependency board.js      ({@link Board})
 * @dependency player.js     ({@link Player})
 * @dependency ai.js         ({@link AI})
 * @dependency renderer.js   ({@link Renderer})
 * @dependency audio.js      ({@link SFX}, {@link MusicEngine})
 * @dependency stats.js      (records, achievements, XP)
 * @dependency ui-helpers.js (themes, skins, tutorial, phrases, particles)
 * @dependency locales.js    (i18n: _t, _tUI, getLocale, detectBrowserLang)
 */

/**
 * Escape HTML special characters to prevent XSS when interpolating
 * user-controlled strings into innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escHTML(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

class Game {
  constructor() {
    this.players = [];
    this.board = null;
    this.boneyard = [];
    this.currentPlayer = 0;
    this.targetScore = 200;
    this.aiDifficulty = 'medium';
    this.renderer = null;
    this.placements = []; // visual placement data for rendering
    this.selectedTile = null;
    this.selectedEl = null;
    this.roundOver = false;
    this.gameOver = false;

    // Speed multiplier: 'fast' = 0.4, 'normal' = 1, 'slow' = 1.6
    this._gameSpeed = localStorage.getItem('domino_speed') || 'normal';

    // Theme
    this._theme = localStorage.getItem('domino_theme') || 'dark';
    document.body.setAttribute('data-theme', this._theme);

    // Language direction
    const savedLang = localStorage.getItem('domino_lang') || detectBrowserLang();
    document.documentElement.dir = getLocale(savedLang).dir || 'ltr';

    // Drag state
    this._dragTile = null;
    this._dragEl = null;
    this._dragOffsetX = 0;
    this._dragOffsetY = 0;

    // Round history for recap
    this._roundHistory = [];

    // Move timer
    this._moveStartTime = 0;

    // Trash talk frequency: 0=off, 1=low, 2=normal, 3=high
    this._trashTalkFreq = parseInt(localStorage.getItem('domino_trash_talk') || '2');

    // Zoom level for board
    this._boardZoom = 1;
    this._boardPanX = 0;
    this._boardPanY = 0;

    // Colorblind mode
    this._colorblindMode = localStorage.getItem('domino_colorblind') === '1';
    if (this._colorblindMode) document.body.classList.add('colorblind');

    // Score combo counter for human player
    this._humanCombo = 0;

    this._initUI();
  }

  /**
   * Scale a millisecond duration by the current game speed setting.
   * @param {number} ms - Base duration in milliseconds.
   * @returns {number} Scaled duration.
   */
  _speedMs(ms) {
    const mult = { fast: 0.4, normal: 1, slow: 1.6 };
    return Math.round(ms * (mult[this._gameSpeed] || 1));
  }

  /**
   * Trigger haptic feedback with pattern support.
   * @param {number|number[]} pattern - Duration in ms, or array for vibration pattern.
   */
  _haptic(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern || 15); } catch(e) {}
  }

  /**
   * Get the current locale code from localStorage or browser detection.
   * @returns {string} Locale code (e.g. 'en', 'es', 'ar', 'zh').
   */
  _getLang() {
    return localStorage.getItem('domino_lang') || detectBrowserLang();
  }

  /**
   * Translate a UI key using the current locale, falling back to English.
   * @param {string} key - Locale key from the `ui` object.
   * @returns {string} Translated string.
   */
  _t(key) {
    const loc = getLocale(this._getLang());
    return (loc.ui && loc.ui[key]) || (LOCALES.en.ui && LOCALES.en.ui[key]) || key;
  }

  /** Apply all locale translations to the DOM (menu labels, buttons, overlays, etc.). */
  _applyLocale() {
    const lang = this._getLang();
    const u = getLocale(lang).ui || LOCALES.en.ui;
    document.documentElement.dir = getLocale(lang).dir || 'ltr';
    document.documentElement.lang = lang;

    // Menu screen labels
    const setTxt = (sel, txt) => { const el = document.querySelector(sel); if (el) el.textContent = txt; };
    const setHTML = (sel, html) => { const el = document.querySelector(sel); if (el) el.innerHTML = html; };

    // Title and subtitle
    setTxt('#menu-title', u.gameTitle || 'ALL FIVES');
    setTxt('#menu-subtitle', u.gameSubtitle || 'DOMINOES');

    // Menu option labels
    setTxt('#game-mode + label, [for="game-mode"]', u.gameMode);
    const labels = document.querySelectorAll('.option-group label');
    const labelKeys = ['gameMode', 'opponents', 'playTo', 'aiDifficulty', 'gameSpeed'];
    labels.forEach((lbl, i) => { if (labelKeys[i] && u[labelKeys[i]]) lbl.textContent = u[labelKeys[i]]; });

    // Menu buttons
    const modeGroup = document.getElementById('game-mode');
    if (modeGroup) {
      const btns = modeGroup.querySelectorAll('.btn-option');
      if (btns[0]) btns[0].textContent = u.ffa || 'Free For All';
      if (btns[1]) btns[1].textContent = u.teams || '2v2 Teams';
    }
    const diffGroup = document.getElementById('ai-difficulty');
    if (diffGroup) {
      const btns = diffGroup.querySelectorAll('.btn-option');
      if (btns[0]) btns[0].textContent = u.easy || '😊 Easy';
      if (btns[1]) btns[1].textContent = u.mixed || '🎲 Mixed';
      if (btns[2]) btns[2].textContent = u.hard || '🧠 Hard';
    }
    const speedGroup = document.getElementById('game-speed');
    if (speedGroup) {
      const btns = speedGroup.querySelectorAll('.btn-option');
      if (btns[0]) btns[0].textContent = u.fast || '🐇 Fast';
      if (btns[1]) btns[1].textContent = u.normal || '🎯 Normal';
      if (btns[2]) btns[2].textContent = u.slow || '🐢 Slow';
    }
    const scoreGroup = document.getElementById('target-score');
    if (scoreGroup) {
      const customBtn = scoreGroup.querySelector('[data-value="custom"]');
      if (customBtn) customBtn.textContent = u.custom || 'Custom';
    }

    // Start/resume buttons
    setTxt('#start-game', u.startGame || 'Start Game');
    setTxt('#resume-game', u.resumeGame || '▶ Resume Saved Game');

    // Player name placeholder
    const nameInput = document.getElementById('player-name-input');
    if (nameInput) nameInput.placeholder = u.playerName || 'Your Name';

    // Game screen buttons
    setTxt('#draw-btn', u.draw || 'Draw');
    setTxt('#pass-btn', u.pass || 'Pass');
    setTxt('#hint-btn', u.hint || '💡 Hint (-5 pts)');
    setTxt('#tracker-quick-btn', u.tiles || '🔍 Tiles');

    // Dropdown menu
    setHTML('#rules-btn', (u.rules || '📖 Rules') + ' <kbd class="dd-key">R</kbd>');
    setTxt('#tutorial-btn', u.tutorial || '🎓 Tutorial');
    setHTML('#log-btn', (u.gameLog || '📋 Game Log') + ' <kbd class="dd-key">G</kbd>');
    setHTML('#tracker-btn', (u.tileTracker || '🔍 Tile Tracker') + ' <kbd class="dd-key">T</kbd>');
    setHTML('#stats-btn', (u.stats || '📊 Stats & Achievements') + ' <kbd class="dd-key">A</kbd>');
    setHTML('#prefs-btn', (u.prefs || '🎨 Preferences') + ' <kbd class="dd-key">E</kbd>');
    setHTML('#shortcuts-btn', (u.shortcuts || '❓ Shortcuts') + ' <kbd class="dd-key">?</kbd>');
    setTxt('#ragequit-btn', u.rageQuit || '💀 Rage Quit (counts as loss)');
    setTxt('#ragequit-loss-note', u.rageQuitLossNote || 'This counts as a loss on your record.');

    // Overlay titles and close buttons
    setTxt('#stats-overlay .stats-panel > h2', u.stats || 'Stats & Achievements');
    setTxt('#stats-close-btn', u.close || 'Close');
    setTxt('#prefs-overlay .stats-panel > h2', u.prefs || 'Preferences');
    setTxt('#prefs-close-btn', u.close || 'Close');
    setTxt('#log-overlay .log-panel > h2', u.gameLog || 'Game Log');
    setTxt('#log-close-btn', u.close || 'Close');
    setTxt('#shortcuts-close-btn', u.close || 'Close');
    setTxt('#tracker-close-btn', u.close || 'Close');

    // Keyboard shortcuts panel
    setTxt('#sc-title', u.keyboardShortcuts || 'Keyboard Shortcuts');
    setTxt('#sc-select', u.scSelectTile || 'Select playable tile by position');
    setTxt('#sc-left', u.scPlaceLeft || 'Place on Left end');
    setTxt('#sc-right', u.scPlaceRight || 'Place on Right end / Rules');
    setTxt('#sc-north', u.scPlaceNorth || 'Place on North end');
    setTxt('#sc-south', u.scPlaceSouth || 'Place on South end');
    setTxt('#sc-draw', u.scDraw || 'Draw from boneyard');
    setTxt('#sc-hint', u.scHint || 'Use Hint (−5 pts)');
    setTxt('#sc-pass', u.scPass || 'Pass turn');
    setTxt('#sc-menu', u.scMenu || 'Open menu');
    setTxt('#sc-log', u.scGameLog || 'Game log');
    setTxt('#sc-tracker', u.scTracker || 'Tile tracker');
    setTxt('#sc-stats', u.scStats || 'Stats & Achievements');
    setTxt('#sc-prefs', u.scPrefs || 'Preferences');
    setTxt('#sc-toggle', u.scToggle || 'Toggle this panel');
    setTxt('#sc-close', u.scClose || 'Close any overlay');
    setTxt('#rules-close-btn', '← ' + (u.close || 'Back'));

    // Rules content
    const rulesContent = document.querySelector('.rules-content');
    if (rulesContent && RULES[lang]) rulesContent.innerHTML = RULES[lang];
    const rulesTitle = document.querySelector('#rules-overlay .rules-panel > h2');
    if (rulesTitle) rulesTitle.textContent = u.rules ? u.rules.replace(/📖\s*/, '') : 'How to Play';

    // End sum label
    setTxt('.sum-label', u.openEnds || 'Open Ends');

    // Boneyard label
    const boneLabel = document.getElementById('boneyard-label');
    if (boneLabel) {
      const countEl = document.getElementById('boneyard-count');
      const count = countEl ? countEl.textContent : '0';
      boneLabel.innerHTML = `🦴 <span id="boneyard-count">${count}</span> ${u.bones || 'bones'}`;
    }

    // Game over screen
    setTxt('#gameover-screen .game-title', u.gameOver || 'Game Over');
    setTxt('#rematch-btn', u.rematch || 'Rematch');
    setTxt('#play-again', u.newGame || 'New Game');
    setTxt('#share-log-btn', u.copyLog || '📋 Copy Game Log');

    // Tutorial nav
    setTxt('#tut-prev', '← ' + (u.close || 'Back'));

    // Menu language selector
    const langSel = document.getElementById('menu-lang-selector');
    if (langSel) {
      langSel.innerHTML = Object.entries(LOCALES).map(([code, loc]) =>
        `<button class="btn-option${code === lang ? ' active' : ''}" data-lang="${code}" style="flex:0;padding:8px 12px;min-width:auto;">${loc.flag}</button>`
      ).join('');
      langSel.querySelectorAll('.btn-option').forEach(btn => {
        btn.addEventListener('click', () => {
          localStorage.setItem('domino_lang', btn.dataset.lang);
          PHRASES = _buildPhrases(btn.dataset.lang);
          this._previewNames = null;
          this._previewPersonalities = null;
          this._applyLocale();
          this._updateRoster();
        });
      });
    }
  }

  /** Shows a first-visit language picker overlay; calls onDone when user selects. */
  _showLangPicker(onDone) {
    const overlay = document.getElementById('countdown-overlay');
    if (!overlay) { onDone(); return; }
    overlay.classList.remove('hidden');

    const detected = detectBrowserLang();
    const langs = Object.entries(LOCALES);

    overlay.innerHTML = `
      <div style="text-align:center;animation:announceIn 0.4s ease-out forwards;max-width:360px;margin:0 auto;">
        <div style="font-size:2.5rem;margin-bottom:12px;">🌍</div>
        <div style="font-size:1.4rem;font-weight:800;color:#fff;margin-bottom:6px;">Choose Your Language</div>
        <div style="font-size:0.85rem;opacity:0.5;margin-bottom:20px;">Elige tu idioma · اختر لغتك · 选择语言</div>
        <div id="lang-picker-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
          ${langs.map(([code, loc]) => `
            <button class="lang-pick-btn${code === detected ? ' detected' : ''}" data-lang="${code}" style="
              display:flex;align-items:center;gap:10px;padding:14px 16px;
              background:${code === detected ? 'rgba(232,167,53,0.15)' : 'rgba(255,255,255,0.05)'};
              border:2px solid ${code === detected ? 'rgba(232,167,53,0.5)' : 'rgba(255,255,255,0.1)'};
              border-radius:12px;cursor:pointer;transition:all 0.2s;color:#fff;font-size:1rem;font-weight:600;
            ">
              <span style="font-size:1.6rem;">${loc.flag}</span>
              <span>${loc.name}</span>
              ${code === detected ? '<span style="margin-left:auto;font-size:0.7rem;opacity:0.6;background:rgba(232,167,53,0.2);padding:2px 6px;border-radius:4px;">auto</span>' : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    overlay.querySelectorAll('.lang-pick-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(232,167,53,0.2)';
        btn.style.borderColor = 'rgba(232,167,53,0.6)';
      });
      btn.addEventListener('mouseleave', () => {
        const isDetected = btn.dataset.lang === detected;
        btn.style.background = isDetected ? 'rgba(232,167,53,0.15)' : 'rgba(255,255,255,0.05)';
        btn.style.borderColor = isDetected ? 'rgba(232,167,53,0.5)' : 'rgba(255,255,255,0.1)';
      });
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        localStorage.setItem('domino_lang', lang);
        localStorage.setItem('domino_lang_chosen', '1');
        PHRASES = _buildPhrases(lang);
        this._previewNames = null;
        this._previewPersonalities = null;
        this._applyLocale();
        this._updateRoster();
        overlay.classList.add('hidden');
        overlay.innerHTML = '';
        onDone();
      });
    });
  }

  /**
   * Get a formatted head-to-head record string against a named opponent.
   * @param {string} name - Opponent name.
   * @returns {string} e.g. '3W-1L' or '' if no record.
   */
  _getHeadToHead(name) {
    const s = getGameStats();
    const h2h = s.headToHead || {};
    const rec = h2h[name];
    if (!rec) return '';
    return `${rec.w || 0}W-${rec.l || 0}L`;
  }

  /**
   * Record a head-to-head result against a named opponent.
   * @param {string}  name - Opponent name.
   * @param {boolean} won  - Whether the human player won.
   */
  _trackHeadToHead(name, won) {
    const s = getGameStats();
    if (!s.headToHead) s.headToHead = {};
    if (!s.headToHead[name]) s.headToHead[name] = { w: 0, l: 0 };
    if (won) s.headToHead[name].w++;
    else s.headToHead[name].l++;
    saveGameStats(s);
  }

  /** Serializes full game state (players, board, scores, round) to localStorage. */
  _saveGameState() {
    if (!this.players || this.players.length === 0 || this.gameOver) return;
    const state = {
      players: this.players.map(p => ({
        name: p.name, isHuman: p.isHuman, index: p.index, score: p.score,
        team: p.team, avatar: p.avatar, city: p.city,
        hand: p.hand.map(t => [t.a, t.b]),
        aiDiff: p.ai ? p.ai.difficulty : null,
        personality: p.personality,
        generation: p.generation,
        color: p.color
      })),
      board: {
        tiles: this.board.tiles.map(t => [t.a, t.b]),
        spinner: this.board.spinner ? [this.board.spinner.a, this.board.spinner.b] : null,
        spinnerIndex: this.board.spinnerIndex,
        leftEnd: this.board.leftEnd, leftIsDouble: this.board.leftIsDouble,
        rightEnd: this.board.rightEnd, rightIsDouble: this.board.rightIsDouble,
        spinnerNorth: this.board.spinnerNorth, spinnerNorthIsDouble: this.board.spinnerNorthIsDouble,
        spinnerSouth: this.board.spinnerSouth, spinnerSouthIsDouble: this.board.spinnerSouthIsDouble,
        spinnerNorthOpen: this.board.spinnerNorthOpen, spinnerSouthOpen: this.board.spinnerSouthOpen,
        hasLeftOfSpinner: this.board.hasLeftOfSpinner, hasRightOfSpinner: this.board.hasRightOfSpinner
      },
      boneyard: this.boneyard.map(t => [t.a, t.b]),
      currentPlayer: this.currentPlayer,
      targetScore: this.targetScore,
      teamMode: this.teamMode,
      teams: this.teams,
      placements: this.placements.map(p => ({
        tile: [p.tile.a, p.tile.b], x: p.x, y: p.y, horizontal: p.horizontal,
        topVal: p.topVal, bottomVal: p.bottomVal, leftVal: p.leftVal, rightVal: p.rightVal,
        branch: p.branch, isSpinner: p.isSpinner
      })),
      roundNum: this._roundNum,
      roundScores: this._roundScores,
      roundHistory: this._roundHistory,
      gameLog: this.gameLog,
      logTurn: this._logTurn,
      lastPlayedBy: this._lastPlayedBy
    };
    localStorage.setItem('domino_saved_game', JSON.stringify(state));
  }

  /** Restores game state from localStorage. Returns false if no saved game exists. */
  _loadGameState() {
    const raw = localStorage.getItem('domino_saved_game');
    if (!raw) return false;
    try {
      const s = JSON.parse(raw);
      this.players = s.players.map(p => {
        const pl = new Player(p.name, p.isHuman, p.index);
        pl.score = p.score; pl.team = p.team; pl.avatar = p.avatar; pl.city = p.city;
        pl.hand = p.hand.map(t => new Tile(t[0], t[1]));
        pl.color = p.color;
        if (p.aiDiff) { pl.ai = new AI(p.aiDiff); pl.personality = p.personality; pl.generation = p.generation; }
        return pl;
      });
      this.board = new Board();
      Object.assign(this.board, s.board);
      this.board.tiles = s.board.tiles.map(t => new Tile(t[0], t[1]));
      if (s.board.spinner) this.board.spinner = new Tile(s.board.spinner[0], s.board.spinner[1]);
      this.boneyard = s.boneyard.map(t => new Tile(t[0], t[1]));
      this.currentPlayer = s.currentPlayer;
      this.targetScore = s.targetScore;
      this.teamMode = s.teamMode;
      this.teams = s.teams;
      this.placements = s.placements.map(p => ({
        ...p, tile: new Tile(p.tile[0], p.tile[1])
      }));
      this._roundNum = s.roundNum;
      this._roundScores = s.roundScores || [];
      this._roundHistory = s.roundHistory || [];
      this.gameLog = s.gameLog || [];
      this._logTurn = s.logTurn || 1;
      this._lastPlayedBy = s.lastPlayedBy;
      this.roundOver = false;
      this.gameOver = false;
      this._playLock = false;
      localStorage.removeItem('domino_saved_game');
      return true;
    } catch(e) { localStorage.removeItem('domino_saved_game'); return false; }
  }

  /** Remove the saved game from localStorage. */
  _clearSavedGame() {
    localStorage.removeItem('domino_saved_game');
  }

  /** Loads saved state from localStorage and resumes play (re-inits renderer, UI, and turn loop). */
  _resumeGame() {
    if (!this._loadGameState()) return;
    this.renderer = new Renderer(document.getElementById('board-canvas'));
    this.sfx = new SFX();
    if (this.music) { this.music.init(); this.music.start(); }
    this.showScreen('game-screen');
    this._updateXPBar();
    this._startSpinnerLoop();
    this._updateUI();
    this._renderBoard();
    this._updateFloatingArrow();
    this._doTurn();
  }

  /** Copy the full game log as formatted text to the clipboard. */
  _exportGameLog() {
    if (!this.gameLog || this.gameLog.length === 0) return;
    let text = '🁣 ALL FIVES DOMINOES — Game Log\n';
    text += `Target: ${this.targetScore} | Players: ${this.players.map(p => p.name).join(', ')}\n`;
    text += '─'.repeat(40) + '\n';
    for (const e of this.gameLog) {
      if (e.action === 'play') {
        text += `#${e.turn} ${e.player} played [${e.tile}] on ${e.end}`;
        if (e.score > 0) text += ` → +${e.score}`;
        if (e.moveTime) text += ` (${e.moveTime}s)`;
        text += '\n';
      } else if (e.action === 'draw') {
        text += `#${e.turn} ${e.player} drew from boneyard\n`;
      } else if (e.action === 'pass') {
        text += `#${e.turn} ${e.player} passed\n`;
      } else if (e.action === 'round-end') {
        text += `── ${e.detail} ──\n`;
      }
    }
    text += '─'.repeat(40) + '\n';
    text += 'Final: ' + this.players.map(p => `${p.name}: ${p.score}`).join(' | ') + '\n';
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('share-log-btn');
      if (btn) { btn.textContent = this._t('copied'); setTimeout(() => btn.textContent = this._t('copyLog'), 2000); }
    }).catch(() => {});
  }

  /** Wires up all DOM event listeners (menu buttons, game controls, drag/drop, keyboard, resize). */
  _initUI() {
    // Menu button groups
    document.querySelectorAll('.btn-group').forEach(group => {
      group.querySelectorAll('.btn-option').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.btn-option').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this._onMenuChange();
        });
      });
    });

    document.getElementById('start-game').addEventListener('click', () => this.startGame(false));
    document.getElementById('resume-game').addEventListener('click', () => this._resumeGame());
    // Show resume button if saved game exists
    const resumeBtn = document.getElementById('resume-game');
    if (resumeBtn && localStorage.getItem('domino_saved_game')) resumeBtn.style.display = '';
    document.getElementById('draw-btn').addEventListener('click', () => this.drawFromBoneyard());
    document.getElementById('pass-btn').addEventListener('click', () => this.pass());
    document.getElementById('hint-btn').addEventListener('click', () => this.useHint());
    document.getElementById('message-ok').addEventListener('click', () => this.hideMessage());
    document.getElementById('play-again').addEventListener('click', () => this.showScreen('menu-screen'));
    document.getElementById('rematch-btn').addEventListener('click', () => this.startGame(true));
    document.getElementById('share-log-btn').addEventListener('click', () => this._exportGameLog());

    document.getElementById('menu-btn').addEventListener('click', () => {
      document.getElementById('game-dropdown').classList.toggle('hidden');
    });
    document.getElementById('rules-btn').addEventListener('click', () => {
      document.getElementById('game-dropdown').classList.add('hidden');
      document.getElementById('rules-overlay').classList.remove('hidden');
    });
    document.getElementById('ragequit-btn').addEventListener('click', () => {
      document.getElementById('game-dropdown').classList.add('hidden');
      // Show confirmation with random taunt
      const taunts = getLocale(this._getLang()).ui.rageQuitTaunts || LOCALES.en.ui.rageQuitTaunts;
      const phrase = taunts[Math.floor(Math.random() * taunts.length)];
      document.getElementById('ragequit-phrase').innerHTML = phrase.replace(/\n/g, '<br>');
      document.getElementById('ragequit-overlay').classList.remove('hidden');
    });

    document.getElementById('ragequit-yes').addEventListener('click', () => {
      document.getElementById('ragequit-overlay').classList.add('hidden');
      recordLoss(getPlayerName());
      this.gameOver = true;
      this.roundOver = true;
      this._playLock = false;
      this._suppressToast = false;
      if (this._spinnerRAF) { cancelAnimationFrame(this._spinnerRAF); this._spinnerRAF = null; }
      if (this.music) this.music.stop();
      // Clear all overlays
      ['countdown-overlay', 'count-overlay', 'message-overlay', 'thinking-overlay', 'ragequit-overlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add('hidden'); el.innerHTML = ''; }
      });
      this.players = [];
      this.board = null;
      this.placements = [];
      this.boneyard = [];
      this.showScreen('menu-screen');
      this._updateRoster();
    });

    document.getElementById('ragequit-no').addEventListener('click', () => {
      document.getElementById('ragequit-overlay').classList.add('hidden');
    });
    document.getElementById('rules-close-btn').addEventListener('click', () => {
      document.getElementById('rules-overlay').classList.add('hidden');
    });
    document.getElementById('log-btn').addEventListener('click', () => {
      document.getElementById('game-dropdown').classList.add('hidden');
      this._renderLog();
      document.getElementById('log-overlay').classList.remove('hidden');
    });
    document.getElementById('log-close-btn').addEventListener('click', () => {
      document.getElementById('log-overlay').classList.add('hidden');
    });
    document.getElementById('shortcuts-btn').addEventListener('click', () => {
      document.getElementById('game-dropdown').classList.add('hidden');
      document.getElementById('shortcuts-overlay').classList.toggle('hidden');
    });
    document.getElementById('shortcuts-close-btn').addEventListener('click', () => {
      document.getElementById('shortcuts-overlay').classList.add('hidden');
    });
    document.getElementById('stats-btn').addEventListener('click', () => {
      document.getElementById('game-dropdown').classList.add('hidden');
      this._renderStats();
      document.getElementById('stats-overlay').classList.remove('hidden');
    });
    document.getElementById('stats-close-btn').addEventListener('click', () => {
      document.getElementById('stats-overlay').classList.add('hidden');
    });
    // Sound mute state from localStorage
    this._soundMuted = localStorage.getItem('domino_muted') === '1';

    // Tile tracker
    document.getElementById('tracker-btn').addEventListener('click', () => {
      document.getElementById('game-dropdown').classList.add('hidden');
      this._renderTracker();
      document.getElementById('tracker-overlay').classList.remove('hidden');
    });
    document.getElementById('tracker-quick-btn').addEventListener('click', () => {
      this._renderTracker();
      document.getElementById('tracker-overlay').classList.remove('hidden');
    });
    document.getElementById('tracker-close-btn').addEventListener('click', () => {
      document.getElementById('tracker-overlay').classList.add('hidden');
    });


    // Player name input
    const nameInput = document.getElementById('player-name-input');
    if (nameInput) {
      nameInput.value = getPlayerName();
      nameInput.addEventListener('change', () => {
        const raw = nameInput.value.trim() || _tUI('playerName');
        // Strip any HTML tags from the name
        const temp = document.createElement('div');
        temp.textContent = raw;
        const name = temp.textContent.slice(0, 12);
        setPlayerName(name);
        nameInput.value = name;
        this._updateRoster();
      });
    }

    // Preferences
    document.getElementById('prefs-btn').addEventListener('click', () => {
      document.getElementById('game-dropdown').classList.add('hidden');
      this._renderPrefs();
      document.getElementById('prefs-overlay').classList.remove('hidden');
    });
    document.getElementById('prefs-close-btn').addEventListener('click', () => {
      document.getElementById('prefs-overlay').classList.add('hidden');
    });

    document.getElementById('tutorial-btn').addEventListener('click', () => {
      document.getElementById('game-dropdown').classList.add('hidden');
      showTutorial();
    });

    // Show language picker on first visit (skip if resuming a saved game), then tutorial
    if (!localStorage.getItem('domino_lang_chosen') && !localStorage.getItem('domino_saved_game')) {
      this._showLangPicker(() => {
        if (!localStorage.getItem('domino_tutorial_done')) {
          showTutorial();
        }
      });
    } else if (!localStorage.getItem('domino_tutorial_done')) {
      showTutorial();
    }

    // Music engine — init immediately but don't start until game begins
    this.music = new MusicEngine();
    this.music.init();

    // Canvas click for choosing end
    const canvas = document.getElementById('board-canvas');
    canvas.addEventListener('click', (e) => this._onBoardClick(e));

    // Board zoom with scroll wheel
    canvas.addEventListener('wheel', (e) => {
      if (!this.renderer) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.renderer.userZoom = Math.max(0.3, Math.min(3, this.renderer.userZoom * delta));
      this._renderBoard();
    }, { passive: false });

    // Board pan with middle-click or two-finger drag
    let isPanning = false, panStartX = 0, panStartY = 0, panOrigX = 0, panOrigY = 0;
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        isPanning = true; panStartX = e.clientX; panStartY = e.clientY;
        panOrigX = this.renderer ? this.renderer.userPanX : 0;
        panOrigY = this.renderer ? this.renderer.userPanY : 0;
        e.preventDefault();
      }
    });
    document.addEventListener('mousemove', (e) => {
      if (isPanning && this.renderer) {
        this.renderer.userPanX = panOrigX + (e.clientX - panStartX);
        this.renderer.userPanY = panOrigY + (e.clientY - panStartY);
        this._renderBoard();
      }
    });
    document.addEventListener('mouseup', () => { isPanning = false; });

    // Double-click to reset zoom/pan
    canvas.addEventListener('dblclick', () => {
      if (this.renderer) {
        this.renderer.userZoom = 1;
        this.renderer.userPanX = 0;
        this.renderer.userPanY = 0;
        this._renderBoard();
      }
    });

    // Touch pinch-zoom and two-finger pan on board
    let touchState = { active: false, startDist: 0, startZoom: 1, startPanX: 0, startPanY: 0, startMidX: 0, startMidY: 0 };
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t0 = e.touches[0], t1 = e.touches[1];
        touchState.active = true;
        touchState.startDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        touchState.startZoom = this.renderer ? this.renderer.userZoom : 1;
        touchState.startPanX = this.renderer ? this.renderer.userPanX : 0;
        touchState.startPanY = this.renderer ? this.renderer.userPanY : 0;
        touchState.startMidX = (t0.clientX + t1.clientX) / 2;
        touchState.startMidY = (t0.clientY + t1.clientY) / 2;
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      if (touchState.active && e.touches.length === 2 && this.renderer) {
        e.preventDefault();
        const t0 = e.touches[0], t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;
        // Pinch zoom
        const scale = dist / touchState.startDist;
        this.renderer.userZoom = Math.max(0.3, Math.min(3, touchState.startZoom * scale));
        // Pan
        this.renderer.userPanX = touchState.startPanX + (midX - touchState.startMidX);
        this.renderer.userPanY = touchState.startPanY + (midY - touchState.startMidY);
        this._renderBoard();
      }
    }, { passive: false });
    canvas.addEventListener('touchend', () => { touchState.active = false; });
    canvas.addEventListener('touchcancel', () => { touchState.active = false; });

    // Disable pinch zoom globally (except on board canvas handled above)
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1 && !e.target.closest('#board-canvas')) {
        e.preventDefault();
      }
    }, { passive: false });
    // Disable Safari gesture zoom
    document.addEventListener('gesturestart', (e) => {
      if (!e.target.closest('#board-canvas')) e.preventDefault();
    });
    document.addEventListener('gesturechange', (e) => {
      if (!e.target.closest('#board-canvas')) e.preventDefault();
    });

    // Zoom control buttons
    document.getElementById('zoom-in-btn').addEventListener('click', () => {
      if (!this.renderer) return;
      this.renderer.userZoom = Math.min(3, this.renderer.userZoom * 1.25);
      this._renderBoard();
    });
    document.getElementById('zoom-out-btn').addEventListener('click', () => {
      if (!this.renderer) return;
      this.renderer.userZoom = Math.max(0.3, this.renderer.userZoom * 0.8);
      this._renderBoard();
    });
    document.getElementById('zoom-reset-btn').addEventListener('click', () => {
      if (!this.renderer) return;
      this.renderer.userZoom = 1;
      this.renderer.userPanX = 0;
      this.renderer.userPanY = 0;
      this._renderBoard();
    });

    window.addEventListener('resize', () => {
      if (this.renderer) {
        this.renderer.resize();
        this._renderBoard();
      }
      this._updateFloatingArrow();
    });

    // Initial roster preview
    this._updateRoster();

    // Restore saved speed selection
    const savedSpeed = localStorage.getItem('domino_speed') || 'normal';
    const speedGroup2 = document.getElementById('game-speed');
    if (speedGroup2) {
      speedGroup2.querySelectorAll('.btn-option').forEach(b => {
        b.classList.toggle('active', b.dataset.value === savedSpeed);
      });
    }

    // Apply locale to all UI text
    this._applyLocale();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      // Prevent default for game keys when in placement mode
      if ((this.selectedTile || this._hoverTile) && 'lrns'.includes(key)) {
        e.preventDefault();
      }
      const gameScreen = document.getElementById('game-screen');
      if (!gameScreen.classList.contains('active')) return;

      // Close any open overlay/dropdown with Escape
      if (key === 'escape') {
        const dd = document.getElementById('game-dropdown');
        if (dd && !dd.classList.contains('hidden')) { dd.classList.add('hidden'); return; }
        const overlays = ['rules-overlay', 'log-overlay', 'shortcuts-overlay', 'stats-overlay', 'tracker-overlay', 'prefs-overlay', 'ragequit-overlay'];
        for (const id of overlays) {
          const el = document.getElementById(id);
          if (el && !el.classList.contains('hidden')) { el.classList.add('hidden'); return; }
        }
        return;
      }

      // Don't process shortcuts if an overlay is open
      // But always allow ? to toggle shortcuts
      if (key === '?' || key === '/') {
        const el = document.getElementById('shortcuts-overlay');
        if (el) el.classList.toggle('hidden');
        return;
      }
      const anyOverlay = ['rules-overlay', 'log-overlay', 'count-overlay', 'message-overlay', 'shortcuts-overlay', 'tracker-overlay', 'stats-overlay', 'prefs-overlay']
        .some(id => { const el = document.getElementById(id); return el && !el.classList.contains('hidden'); });
      if (anyOverlay) return;

      // Close dropdown if open
      const dd2 = document.getElementById('game-dropdown');
      if (dd2 && !dd2.classList.contains('hidden')) {
        dd2.classList.add('hidden');
        if (!'lrns'.includes(key)) return; // let L/R/N/S fall through for placement
      }

      // Placement shortcuts L/R/N/S when choosing an end
      // Check both click-selected placements and hover placements
      const activePlacements = this._pendingPlacements || this._hoverPlacements;
      const activeTile = this.selectedTile || this._hoverTile;
      if (activePlacements && activePlacements.length > 0 && activeTile && 'lrns'.includes(key) && this.players[this.currentPlayer] && this.players[this.currentPlayer].isHuman) {
        if (this._playLock) return;
        const dirMap = { l: 'left', r: 'right', n: 'north', s: 'south' };
        const dir = dirMap[key];
        if (dir) {
          let match = activePlacements.find(p => p.end === dir);
          if (!match && activePlacements.length === 1) {
            match = activePlacements[0];
          }
          if (match) {
            const player = this.players[this.currentPlayer];
            this._executePlay(player, activeTile, match);
            this.selectedTile = null;
            this.selectedEl = null;
            this._pendingPlacements = null; this._hoverPlacements = null;
            this._hoverTile = null; this._hoverPlacements = null;
          }
          return;
        }
      }

      // D = Draw from boneyard
      if (key === 'd') {
        const btn = document.getElementById('draw-btn');
        if (btn && !btn.disabled) this.drawFromBoneyard();
      }
      // H = Hint
      if (key === 'h') {
        const btn = document.getElementById('hint-btn');
        if (btn && !btn.disabled) this.useHint();
      }
      // P = Pass
      if (key === 'p') {
        const btn = document.getElementById('pass-btn');
        if (btn && btn.style.display !== 'none') this.pass();
      }
      // M = Menu dropdown
      if (key === 'm') {
        document.getElementById('game-dropdown').classList.toggle('hidden');
      }
      // G = Game log
      if (key === 'g') {
        this._renderLog();
        document.getElementById('log-overlay').classList.remove('hidden');
      }
      // R = Rules (when not placing a tile)
      if (key === 'r' && !activeTile) {
        document.getElementById('game-dropdown').classList.add('hidden');
        document.getElementById('rules-overlay').classList.remove('hidden');
      }
      // T = Tile tracker
      if (key === 't') {
        this._renderTracker();
        document.getElementById('tracker-overlay').classList.remove('hidden');
      }
      // A = Stats & Achievements
      if (key === 'a') {
        this._renderStats();
        document.getElementById('stats-overlay').classList.remove('hidden');
      }
      // E = Preferences (sEttings)
      if (key === 'e') {
        this._renderPrefs();
        document.getElementById('prefs-overlay').classList.remove('hidden');
      }
      if (key >= '1' && key <= '9') {
        const idx = parseInt(key) - 1;
        const tiles = document.querySelectorAll('.hand-tile.playable');
        if (tiles[idx]) tiles[idx].click();
      }
    });
  }

  /** Handle menu option changes: toggle opponent count visibility, update speed, show/hide custom score input. */
  _onMenuChange() {
    const mode = this._getOption('game-mode');
    const oppGroup = document.getElementById('opponents-group');
    if (mode === 'teams') {
      oppGroup.style.display = 'none';
    } else {
      oppGroup.style.display = '';
    }
    // Speed
    const speed = this._getOption('game-speed');
    if (speed) {
      this._gameSpeed = speed;
      localStorage.setItem('domino_speed', speed);
    }
    // Custom score input toggle
    const scoreVal = this._getOption('target-score');
    const customInput = document.getElementById('custom-score-input');
    if (customInput) {
      customInput.style.display = scoreVal === 'custom' ? '' : 'none';
    }
    this._updateRoster();
  }

  /** Render the player roster preview on the menu screen with avatars, records, and re-roll buttons. */
  _updateRoster() {
    const roster = document.getElementById('player-roster');
    if (!roster) return;

    const mode = this._getOption('game-mode');
    const humanSeed = getHumanAvatarSeed();
    const humanRec = getRecord(getPlayerName());
    const difficulties = ['easy', 'medium', 'hard'];

    // Generate preview players with assigned difficulties
    if (!this._previewNames) {
      const _picked = pickRandomNames(4); this._previewNames = _picked.map(p => p.name); this._previewCities = _picked.map(p => p.city);
      this._previewSeeds = this._previewNames.map((n, i) => n + '-preview-' + i);
      this._previewDiffs = this._previewNames.map(() => difficulties[Math.floor(Math.random() * 3)]);
      this._previewPersonalities = this._previewNames.map(() => AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)]);
      // Seed fake records
      this._previewNames.forEach((n, i) => seedAIRecord(n, this._previewDiffs[i]));
    }

    let players = [];
    const pName = getPlayerName();
    players.push({
      name: pName, avatar: avatarURL(humanSeed), isHuman: true,
      record: getRecord(pName), rank: getRank(pName)
    });

    if (mode === 'teams') {
      for (let i = 0; i < 3; i++) {
        const name = this._previewNames[i];
        const rec = getRecord(name);
        const headToHead = this._getHeadToHead(name);
        players.push({
          name, avatar: avatarURL(this._previewSeeds[i]),
          isHuman: false, record: rec, rank: getRank(name), city: this._previewCities && this._previewCities[i],
          team: i === 0 ? 'teammate' : 'opponent',
          personality: this._previewPersonalities && this._previewPersonalities[i],
          headToHead
        });
      }
    } else {
      const count = parseInt(this._getOption('opponent-count'));
      for (let i = 0; i < count; i++) {
        const name = this._previewNames[i];
        const rec = getRecord(name);
        const headToHead = this._getHeadToHead(name);
        players.push({
          name, avatar: avatarURL(this._previewSeeds[i]),
          isHuman: false, record: rec, rank: getRank(name), city: this._previewCities && this._previewCities[i],
          personality: this._previewPersonalities && this._previewPersonalities[i],
          headToHead
        });
      }
    }

    roster.innerHTML = `<div class="roster-title">${this._t('players')}</div>`;
    for (let pi = 0; pi < players.length; pi++) {
      const p = players[pi];
      const card = document.createElement('div');
      card.className = 'roster-card' + (p.isHuman ? ' human' : '');
      const teamBadge = p.team === 'teammate' ? ' 🤝' : p.team === 'opponent' ? ' ⚔️' : '';
      card.innerHTML = `
        <img class="roster-avatar" src="${p.avatar}" alt="${escHTML(p.name)}">
        <div class="roster-info">
          <div class="roster-name">${escHTML(p.name)}${teamBadge}</div>
          <div class="roster-rank">${escHTML(p.rank)}${p.city ? ' · ' + escHTML(p.city) : ''}${p.personality ? ' ' + p.personality.icon : ''}</div>
          <div class="roster-record">${p.record.wins}W - ${p.record.losses}L${p.headToHead ? ` · ${this._t('vsYou')}: ` + escHTML(p.headToHead) : ''}</div>
        </div>
      `;
      if (!p.isHuman) {
        const rerollBtn = document.createElement('button');
        rerollBtn.className = 'roster-reroll';
        rerollBtn.textContent = '🎲';
        rerollBtn.title = this._t('rerollOpponent');
        const oppIdx = pi - 1; // index into preview arrays (0-based for opponents)
        rerollBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const newPick = pickRandomNames(1)[0];
          this._previewNames[oppIdx] = newPick.name;
          this._previewCities[oppIdx] = newPick.city;
          this._previewSeeds[oppIdx] = newPick.name + '-preview-' + oppIdx + '-' + Date.now();
          this._previewPersonalities[oppIdx] = AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];
          seedAIRecord(newPick.name, this._previewDiffs[oppIdx]);
          this._updateRoster();
        });
        card.appendChild(rerollBtn);
      }
      roster.appendChild(card);
    }
  }


  /**
   * Get the currently selected value from a button group.
   * @param {string} groupId - DOM id of the button group container.
   * @returns {string|null} The `data-value` of the active button, or null.
   */
  _getOption(groupId) {
    const el = document.getElementById(groupId);
    if (!el) return null;
    const active = el.querySelector('.active');
    return active ? active.dataset.value : null;
  }

  /** Switches visible screen (menu, game, or gameover) by toggling the 'active' class. */
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  /** Sets up players, teams, AI personalities, and starts a new game. Pass truthy rematch to reuse current opponents. */
  startGame(rematch) {
    const mode = this._getOption('game-mode') || 'ffa';
    const scoreOpt = this._getOption('target-score') || '200';
    if (scoreOpt === 'custom') {
      const customInput = document.getElementById('custom-score-input');
      this.targetScore = Math.max(50, Math.min(1000, parseInt(customInput && customInput.value) || 200));
    } else {
      this.targetScore = parseInt(scoreOpt);
    }
    this.teamMode = mode === 'teams';

    const diffSetting = this._getOption('ai-difficulty') || 'mixed';
    const difficulties = ['easy', 'medium', 'hard'];

    const humanSeed = getHumanAvatarSeed();

    if (rematch && this.players && this.players.length > 0) {
      for (const p of this.players) p.score = 0;
      if (this.teams) for (const t of this.teams) t.score = 0;
      this.renderer = new Renderer(document.getElementById('board-canvas'));
      this.gameOver = false;
      this.gameLog = []; this._roundScores = [];
      this._roundHistory = [];
      this._roundNum = 0;
      this.showScreen('game-screen');
      this.startRound();
      return;
    }

    // Use the preview names/seeds from the roster
    const _fallbackPicked = !this._previewNames ? pickRandomNames(4) : null;
    const names = this._previewNames || _fallbackPicked.map(p => p.name);
    const seeds = this._previewSeeds || names.map((n, i) => n + '-' + i);
    const diffs = this._previewDiffs || names.map(() => difficulties[Math.floor(Math.random() * 3)]);

    // Override diffs based on AI difficulty setting
    const resolvedDiffs = diffs.map((_, i) => {
      if (diffSetting === 'easy') return 'easy';
      if (diffSetting === 'hard') return 'hard';
      // mixed: distribute evenly across difficulties
      return difficulties[i % difficulties.length];
    });

    this.players = [];
    this.teams = null;

    if (this.teamMode) {
      const you = new Player(getPlayerName(), true, 0);
      you.team = 0;
      you.avatar = avatarURL(humanSeed);
      this.players.push(you);

      const opp1 = new Player(names[0], false, 1);
      opp1.team = 1;
      opp1.ai = new AI(resolvedDiffs[0]);
      opp1.personality = AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];
      opp1.generation = PHRASE_GENS[Math.floor(Math.random() * PHRASE_GENS.length)];
      opp1.avatar = avatarURL(seeds[0]);
      this.players.push(opp1);

      const partner = new Player(names[1], false, 2);
      partner.team = 0;
      partner.ai = new AI(resolvedDiffs[1]);
      partner.personality = AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];
      partner.generation = PHRASE_GENS[Math.floor(Math.random() * PHRASE_GENS.length)];
      partner.avatar = avatarURL(seeds[1]);
      this.players.push(partner);

      const opp2 = new Player(names[2], false, 3);
      opp2.team = 1;
      opp2.ai = new AI(resolvedDiffs[2]);
      opp2.personality = AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];
      opp2.generation = PHRASE_GENS[Math.floor(Math.random() * PHRASE_GENS.length)];
      opp2.avatar = avatarURL(seeds[2]);
      this.players.push(opp2);

      this.teams = [
        { name: this._t('yourTeam'), players: [0, 2], score: 0 },
        { name: this._t('opponentsTeam'), players: [1, 3], score: 0 }
      ];
    } else {
      const numOpponents = parseInt(this._getOption('opponent-count'));
      const you = new Player(getPlayerName(), true, 0);
      you.avatar = avatarURL(humanSeed);
      this.players.push(you);

      for (let i = 0; i < numOpponents; i++) {
        const name = names[i];
        const p = new Player(name, false, i + 1);
        p.ai = new AI(resolvedDiffs[i] || 'medium');
        p.personality = AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];
        p.generation = PHRASE_GENS[Math.floor(Math.random() * PHRASE_GENS.length)];
        p.avatar = avatarURL(seeds[i]);
        p.city = (this._previewCities && this._previewCities[i]) || '';
        this.players.push(p);
      }
    }

    // Regenerate preview names for next game
    const _rePicked = pickRandomNames(4); this._previewNames = _rePicked.map(p => p.name); this._previewCities = _rePicked.map(p => p.city);
    this._previewSeeds = this._previewNames.map((n, i) => n + '-preview-' + i + '-' + Date.now());
    this._previewDiffs = this._previewNames.map(() => difficulties[Math.floor(Math.random() * 3)]);
    this._previewNames.forEach((n, i) => seedAIRecord(n, this._previewDiffs[i]));

    this.renderer = new Renderer(document.getElementById('board-canvas'));
    this.sfx = new SFX();
    this.gameOver = false;
    this.gameLog = []; this._roundScores = [];
    this._roundHistory = [];
    this._roundNum = 0;
    this._usedHint = false;

    // Assign player colors
    const oppColors = [
      { h: 0, name: 'red' },      // red
      { h: 210, name: 'blue' },    // blue
      { h: 280, name: 'purple' },  // purple
      { h: 30, name: 'orange' },   // orange
    ];
    const shuffledColors = shuffle([...oppColors]);
    let colorIdx = 0;
    for (const p of this.players) {
      if (p.isHuman) {
        p.color = { h: 140, s: 60, l: 40 }; // green — same as teammate
      } else if (this.teamMode && p.team === 0) {
        p.color = { h: 140, s: 60, l: 40 }; // green — same for all teammates
      } else if (this.teamMode && p.team === 1) {
        p.color = { h: 0, s: 65, l: 45 }; // red — same for all opponents
      } else {
        // FFA: each opponent gets a unique random color
        const c = shuffledColors[colorIdx++ % shuffledColors.length];
        p.color = { h: c.h, s: 65, l: 45 };
      }
    }

    this.showScreen('game-screen');
    if (this.music) { this.music.init(); this.music.start(); }
    this._updateXPBar();

    // Daily first game XP bonus
    const today = new Date().toDateString();
    const lastPlayed = localStorage.getItem('domino_last_played');
    if (lastPlayed !== today) {
      localStorage.setItem('domino_last_played', today);
      addXP(20);
    }

    this.startRound();
  }

  /** Shuffles tiles, deals hands, runs deal animation with countdown, then starts play. */
  startRound() {
      this.board = new Board();
      this.placements = [];
      this.roundOver = false;
      this.selectedTile = null;
      this.selectedEl = null;
      this._playLock = false;
      if (this._spinnerRAF) { cancelAnimationFrame(this._spinnerRAF); this._spinnerRAF = null; }
      this.gameLog = this.gameLog || [];
      // Cap game log to prevent unbounded memory growth in long games
      const MAX_LOG_ENTRIES = 500;
      if (this.gameLog.length > MAX_LOG_ENTRIES) {
        this.gameLog = this.gameLog.slice(-MAX_LOG_ENTRIES);
      }
      this._logTurn = (this.gameLog.length > 0 ? this.gameLog[this.gameLog.length - 1].turn + 1 : 1);

      const tiles = shuffle(createSet());

      const handSize = this.players.length === 2 ? 7 : 5;
      for (const p of this.players) {
        p.hand = tiles.splice(0, handSize);
      }
      this.boneyard = tiles;

      this.currentPlayer = this._findFirstPlayer();
      if (this.currentPlayer === -1) {
        this._updateUI();
        this._renderBoard();
        this.showMessage(this._t('noDouble'), () => {
          this.startRound();
        });
        return;
      }

      this._suppressToast = true;
      const staleToast = document.getElementById('turn-indicator');
      if (staleToast) { staleToast.classList.remove('visible'); staleToast.classList.add('fading'); }

      // Clear the board and hide arrow immediately
      if (this.renderer) {
        this.renderer.resize();
        this.renderer.clear();
      }
      const arrow = document.getElementById('floating-arrow');
      if (arrow) arrow.style.display = 'none';

      // Hide bottom bar, opponent panels, score bar, end-sum, and boneyard during deal
      const bottomBar = document.getElementById('bottom-bar');
      const scoreBar = document.getElementById('score-bar');
      const endSum = document.getElementById('end-sum-display');
      const boneyardArea = document.getElementById('boneyard-area');
      const menuBtn = document.getElementById('menu-btn');
      const zoomControls = document.getElementById('zoom-controls');
      const oppPanels = ['opponent-top', 'opponent-left', 'opponent-right'];
      const allUI = [bottomBar, scoreBar, endSum, boneyardArea, menuBtn, zoomControls];
      allUI.forEach(el => { if (el) { el.style.visibility = 'hidden'; el.style.opacity = '0'; } });
      oppPanels.forEach(id => { const el = document.getElementById(id); if (el) { el.style.visibility = 'hidden'; el.style.opacity = '0'; } });

      // Clear any stale overlays
      ['countdown-overlay', 'count-overlay', 'message-overlay', 'thinking-overlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add('hidden'); el.innerHTML = ''; }
      });

      // Cinematic intro: brief pause on empty table, then fade in avatars
      const introDelay = 400;

      // Show avatar intro overlay
      const introEl = document.createElement('div');
      introEl.id = 'round-intro';
      introEl.style.cssText = 'position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;gap:20px;pointer-events:none;flex-wrap:wrap;padding:20px;';
      const isSmallScreen = window.innerWidth < 500;
      const avatarSize = isSmallScreen ? 64 : 120;
      const nameSize = isSmallScreen ? '0.8rem' : '1.2rem';
      for (const p of this.players) {
        const av = document.createElement('div');
        av.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;opacity:0;transform:scale(0.5) translateY(30px);transition:all 0.6s cubic-bezier(0.34,1.56,0.64,1);';
        av.innerHTML = `<img src="${p.avatar}" style="width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;border:3px solid rgba(232,167,53,0.6);box-shadow:0 6px 24px rgba(0,0,0,0.6),0 0 20px rgba(232,167,53,0.2);">
          <span style="font-weight:900;font-size:${nameSize};color:#fff;text-shadow:0 2px 12px rgba(0,0,0,0.7);letter-spacing:1px;">${escHTML(p.name)}</span>`;
        introEl.appendChild(av);
      }
      document.body.appendChild(introEl);

      // Stagger avatar fade-ins
      const avatarEls = introEl.children;
      for (let i = 0; i < avatarEls.length; i++) {
        setTimeout(() => {
          avatarEls[i].style.opacity = '1';
          avatarEls[i].style.transform = 'scale(1) translateY(0)';
        }, introDelay + i * 150);
      }

      // After avatars shown, start deal and fade out intro
      const dealDelay = introDelay + avatarEls.length * 150 + 600;
      setTimeout(() => {
        // Fade out avatar intro
        introEl.style.transition = 'opacity 0.4s ease';
        introEl.style.opacity = '0';
        setTimeout(() => introEl.remove(), 400);

        // Make boneyard visible for deal target
        if (boneyardArea) { boneyardArea.style.visibility = ''; boneyardArea.style.opacity = '1'; }

        // Animate dealing then proceed
        this._animateDeal(() => {
          // Fade in all UI
          allUI.forEach(el => { if (el) { el.style.visibility = ''; el.style.transition = 'opacity 0.4s ease'; el.style.opacity = '1'; } });
          oppPanels.forEach(id => { const el = document.getElementById(id); if (el) { el.style.visibility = ''; el.style.transition = 'opacity 0.4s ease'; el.style.opacity = '1'; } });
          // Clean up inline transitions after fade
          setTimeout(() => {
            allUI.forEach(el => { if (el) el.style.transition = ''; });
            oppPanels.forEach(id => { const el = document.getElementById(id); if (el) el.style.transition = ''; });
          }, 500);

          this._updateUI();
          this._renderBoard();
          this._startSpinnerLoop();

        if (this._roundNum === undefined) this._roundNum = 0;
        this._roundNum++;

        const firstPlayer = this.players[this.currentPlayer];
        const spinnerTile = this.forcedFirstTile;

        if (this._roundNum === 1) {
          this._updateFloatingArrow();
          this._showCountdown(() => {
            this._showRoundAnnouncement(firstPlayer, spinnerTile, () => {
              this._doTurn();
            });
          });
        } else {
          this._updateFloatingArrow();
          this._showRoundAnnouncement(firstPlayer, spinnerTile, () => {
            this._doTurn();
          });
        }
        }); // end _animateDeal callback
      }, dealDelay); // end setTimeout for dealDelay
    }

    _animateDeal(callback) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const tileCount = 28;
        const isSmall = window.innerWidth < 500;
        const tileW = isSmall ? 100 : 260;
        const tileH = isSmall ? 50 : 130;
        const scatter = isSmall ? 0.5 : 1;
        const pileEls = [];

        // Phase 1: Show all tiles in a pile at center
        const skin = getSkinColors();
        for (let i = 0; i < tileCount; i++) {
          const tile = document.createElement('div');
          tile.className = 'deal-tile';
          tile.style.width = tileW + 'px';
          tile.style.height = tileH + 'px';
          tile.style.borderRadius = '8px';
          tile.style.position = 'fixed';
          tile.style.zIndex = 55 + i;
          tile.style.background = `linear-gradient(160deg, ${skin.face}, ${skin.faceDark})`;
          tile.style.border = `2px solid ${skin.border}`;
          tile.style.boxShadow = `0 2px 0 ${skin.depth}, 0 4px 8px rgba(0,0,0,0.4)`;
          const ox = (Math.random() - 0.5) * 140 * scatter;
          const oy = (Math.random() - 0.5) * 90 * scatter;
          const rot = (Math.random() - 0.5) * 100;
          tile.style.left = (cx - tileW / 2 + ox) + 'px';
          tile.style.top = (cy - tileH / 2 + oy) + 'px';
          tile.style.transform = `rotate(${rot}deg)`;
          tile.style.opacity = '1';
          tile.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
          document.body.appendChild(tile);
          pileEls.push(tile);
        }

        // Phase 2: Shuffle — scramble positions a few times
        let shuffleCount = 0;
        const shuffleInterval = setInterval(() => {
          for (const tile of pileEls) {
            const ox = (Math.random() - 0.5) * 120 * scatter;
            const oy = (Math.random() - 0.5) * 80 * scatter;
            const rot = (Math.random() - 0.5) * 90;
            tile.style.left = (cx - tileW / 2 + ox) + 'px';
            tile.style.top = (cy - tileH / 2 + oy) + 'px';
            tile.style.transform = `rotate(${rot}deg)`;
          }
          if (this.sfx) this.sfx.shuffle();
          shuffleCount++;
          if (shuffleCount >= 4) clearInterval(shuffleInterval);
        }, 250);

        // Phase 3: Deal out after shuffle
        const dealStart = 1200;
        const positions = {
          bottom: { x: cx, y: window.innerHeight - 80 },
          top: { x: cx, y: 60 },
          left: { x: 50, y: cy },
          right: { x: window.innerWidth - 50, y: cy }
        };

        let dealt = 0;
        const handSize = this.players.length === 2 ? 7 : 5;
        for (let round = 0; round < handSize; round++) {
          for (let pi = 0; pi < this.players.length; pi++) {
            const tileIdx = dealt;
            if (tileIdx >= pileEls.length) continue;
            const delay = dealStart + dealt * 80;
            dealt++;
            setTimeout(() => {
              const pos = this._getPlayerPosition(pi);
              const target = positions[pos] || positions.bottom;
              const tile = pileEls[tileIdx];
              if (!tile) return;
              tile.style.left = (target.x - tileW / 2) + 'px';
              tile.style.top = (target.y - tileH / 2) + 'px';
              tile.style.transform = `rotate(${(Math.random() - 0.5) * 20}deg) scale(0.7)`;
              tile.style.opacity = '0.4';
              if (this.sfx) this.sfx._play(400 + Math.random() * 200, 0.03, 'sine', 0.04);
              setTimeout(() => tile.remove(), 400);
            }, delay);
          }
        }

        // Phase 4: Remaining tiles fly to boneyard area
        const boneyardStart = dealStart + dealt * 80;
        const boneArea = document.getElementById('boneyard-area');
        const boneRect = boneArea ? boneArea.getBoundingClientRect() : { left: cx - 70, top: window.innerHeight - 140, width: 140, height: 40 };
        const boneTargetX = boneRect.left + boneRect.width / 2;
        const boneTargetY = boneRect.top + boneRect.height / 2;

        for (let i = dealt; i < pileEls.length; i++) {
          const delay = boneyardStart + (i - dealt) * 60;
          setTimeout(() => {
            const tile = pileEls[i];
            if (!tile) return;
            tile.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            tile.style.left = (boneTargetX - tileW / 2 + (Math.random() - 0.5) * 30) + 'px';
            tile.style.top = (boneTargetY - tileH / 2 + (Math.random() - 0.5) * 10) + 'px';
            tile.style.transform = `rotate(${(Math.random() - 0.5) * 40}deg) scale(0.25)`;
            tile.style.opacity = '0.6';
            if (this.sfx) this.sfx._play(300 + Math.random() * 100, 0.02, 'sine', 0.03);
            setTimeout(() => tile.remove(), 500);
          }, delay);
        }

        const totalTime = boneyardStart + (pileEls.length - dealt) * 60 + 600;
        setTimeout(callback, totalTime);
      }

  /** Shows a cinematic round announcement with the first player and spinner tile. */
  _showRoundAnnouncement(firstPlayer, spinnerTile, callback) {
    const overlay = document.getElementById('countdown-overlay');
    if (!overlay) { callback(); return; }
    overlay.classList.remove('hidden');

    const whoLabel = firstPlayer.isHuman ? this._t('youHave') : `${escHTML(firstPlayer.name)} ${this._t('has')}`;

    // Build SVG domino tile with glow animation
    let tileHTML = '';
    if (spinnerTile) {
      const pipPos = (n, s) => {
        const m = { 0:[], 1:[[0,0]], 2:[[-s,-s],[s,s]], 3:[[-s,-s],[0,0],[s,s]], 4:[[-s,-s],[s,-s],[-s,s],[s,s]], 5:[[-s,-s],[s,-s],[0,0],[-s,s],[s,s]], 6:[[-s,-s],[s,-s],[-s,0],[s,0],[-s,s],[s,s]] };
        return m[n] || [];
      };
      const halfSVG = (val, cy) => {
        return pipPos(val, 14).map(([x,y]) =>
          `<circle cx="${50+x}" cy="${cy+y}" r="6.5" fill="#333"/>`
        ).join('');
      };
      tileHTML = `
        <div class="ra-tile">
          <svg width="60" height="108" viewBox="0 0 100 180">
            <rect x="2" y="2" width="96" height="176" rx="12" fill="url(#tg)" stroke="#e8a735" stroke-width="2.5"/>
            <defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffef8"/><stop offset="0.3" stop-color="#f5f0dc"/><stop offset="1" stop-color="#e8e0c4"/></linearGradient></defs>
            <line x1="20" y1="90" x2="80" y2="90" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>
            <line x1="20" y1="91" x2="80" y2="91" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
            ${halfSVG(spinnerTile.a, 45)}
            ${halfSVG(spinnerTile.b, 135)}
          </svg>
        </div>
      `;
    }

    overlay.innerHTML = `
      <div class="ra-container">
        <div class="ra-label">${this._t('round').toUpperCase()}</div>
        <div class="ra-number">${this._roundNum}</div>
        <div class="ra-divider"></div>
        <div class="ra-player">
          <img class="ra-avatar" src="${firstPlayer.avatar}" alt="${escHTML(firstPlayer.name)}">
          ${tileHTML}
        </div>
        <div class="ra-who">${whoLabel} ${this._t('highestDouble')}</div>
      </div>
    `;

    // Spawn particles behind the number
    setTimeout(() => {
      spawnParticles(window.innerWidth / 2, window.innerHeight * 0.35, 20, 'particle-gold');
    }, 400);

    if (this.sfx) {
      this.sfx._play(440, 0.15, 'sine', 0.08);
      setTimeout(() => this.sfx._play(660, 0.2, 'sine', 0.1), 200);
      setTimeout(() => this.sfx._play(880, 0.3, 'sine', 0.12), 400);
    }

    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
      callback();
    }, this._speedMs(3000));
  }

  /** Show a "3-2-1" countdown overlay before the first round begins. */
  _showCountdown(callback) {
    const overlay = document.getElementById('countdown-overlay');
    if (!overlay) { callback(); return; }
    overlay.classList.remove('hidden');

    const steps = [
      { text: '3', cls: 'countdown-num', freq: 440 },
      { text: '2', cls: 'countdown-num', freq: 520 },
      { text: '1', cls: 'countdown-num', freq: 620 },
      { text: 'GO!', cls: 'countdown-go', freq: 880 }
    ];

    let i = 0;
    const next = () => {
      if (i >= steps.length) {
        overlay.classList.add('hidden');
        overlay.innerHTML = '';
        callback();
        return;
      }
      const step = steps[i];
      overlay.innerHTML = `<div class="${step.cls}">${step.text}</div>`;
      if (this.sfx) this.sfx._play(step.freq, 0.15, 'sine', 0.12);
      i++;
      setTimeout(next, i === steps.length ? this._speedMs(500) : this._speedMs(800));
    };
    next();
  }

  /** Start a requestAnimationFrame loop that re-renders the board for the pulsing spinner highlight. */
  _startSpinnerLoop() {
    if (this._spinnerRAF) cancelAnimationFrame(this._spinnerRAF);
    const loop = () => {
      const hasSpinner = this.placements.some(p => p.isSpinner);
      if (hasSpinner && !this._flyingIn) {
        // Preserve hover/selection highlights
        if (this._hoverTile && this._hoverPlacements) {
          this._renderBoard(this._hoverPlacements);
        } else if (this.selectedTile && this._pendingPlacements) {
          this._renderBoard(this._pendingPlacements);
        } else {
          this._renderBoard();
        }
      }
      this._spinnerRAF = requestAnimationFrame(loop);
    };
    this._spinnerRAF = requestAnimationFrame(loop);
  }

  /**
   * Find the player holding the highest double to go first.
   * Sets `this.forcedFirstTile` to the tile that must be played.
   * @returns {number} Player index, or -1 if no doubles exist (triggers redeal).
   */
  _findFirstPlayer() {
    // Player with highest double goes first and MUST play it
    for (let d = 6; d >= 0; d--) {
      for (let i = 0; i < this.players.length; i++) {
        const tile = this.players[i].hand.find(t => t.a === d && t.b === d);
        if (tile) {
          this.forcedFirstTile = tile;
          return i;
        }
      }
    }
    // No doubles at all — redeal
    this.forcedFirstTile = null;
    return -1;
  }

  /** Main turn dispatcher: checks for round/game end, then routes to AI or human play. */
  _doTurn() {
    if (this.roundOver || this.gameOver) return;

    const player = this.players[this.currentPlayer];
    this._moveStartTime = Date.now();
    this._updateUI();

    // First play of the round: must play the highest double
    if (this.forcedFirstTile && this.board.isEmpty) {
      this._suppressToast = true; // suppress toast during auto-play
      const tile = this.forcedFirstTile;
      this.forcedFirstTile = null;
      setTimeout(() => {
        this._executePlay(player, tile, { end: 'first' });
      }, player.isHuman ? this._speedMs(600) : this._speedMs(1500));
      return;
    }

    if (!player.isHuman) {
      // Show centered thinking overlay
      this._showThinking(player);
      // Particles on active player avatar
      this._spawnAvatarParticles(player);
      const base = 1500;
      const jitter = 500 + Math.random() * 1500;
      setTimeout(() => this._aiTurn(player), this._speedMs(base + jitter));
    } else {
      this._hideThinking();
      // Particles on human avatar
      this._spawnAvatarParticles(player);

      // Blocked game warning
      if (this.boneyard.length === 0) {
        let canPlayCount = 0;
        for (const p of this.players) {
          if (p.hand.some(t => this.board.canPlay(t))) canPlayCount++;
        }
        if (canPlayCount <= 1) {
          const warn = document.createElement('div');
          warn.className = 'block-warning';
          warn.textContent = this._t('mayBlock');
          document.body.appendChild(warn);
          setTimeout(() => warn.remove(), 2500);
        }
      }

      // Scoring opportunity flash — check if human can score
      if (!this.board.isEmpty && player.hand.some(t => this.board.canPlay(t))) {
        let canScore = false;
        for (const t of player.hand) {
          const placements = this.board.getValidPlacements(t);
          for (const p of placements) {
            const sim = Board.clone(this.board);
            sim.placeTile(t, p);
            if (sim.getScore() > 0) { canScore = true; break; }
          }
          if (canScore) break;
        }
        if (canScore) {
          const flash = document.createElement('div');
          flash.className = 'score-opp-flash';
          flash.textContent = this._t('canScore');
          document.body.appendChild(flash);
          setTimeout(() => flash.remove(), 1800);
        }
      }

      // Check if human has exactly 1 playable tile with 1 placement — auto-play it
      const playableTiles = player.hand.filter(t => this.board.canPlay(t));
      if (playableTiles.length === 1) {
        const placements = this.board.getValidPlacements(playableTiles[0]);
        if (placements.length === 1) {
          this._showAutoPlayBanner(this._t('autoPlayOnly'));
          setTimeout(() => {
            if (this.currentPlayer === player.index && !this.roundOver) {
              this._executePlay(player, playableTiles[0], placements[0]);
            }
          }, this._speedMs(600));
          return;
        }
      }

      this._enableHumanPlay(player);
      // If human can't play and boneyard is empty, auto-pass
      if (playableTiles.length === 0 && this.boneyard.length === 0) {
        this._showAutoPlayBanner(this._t('autoPass'));
        setTimeout(() => {
          if (this.currentPlayer === player.index && !this.roundOver) {
            this.pass();
          }
        }, this._speedMs(1500));
      }
    }
  }

  /** Show a centered thinking overlay with the AI player's avatar and name. */
  _showThinking(player) {
    const el = document.getElementById('thinking-overlay');
    if (!el) return;
    el.classList.remove('hidden');

    const isTeammate = this.teamMode && player.team === this.players[0].team;
    const label = isTeammate ? `🤝 ${this._t('teammate')}` : '';

    el.innerHTML = `
      <div class="think-card">
        <img class="think-avatar" src="${player.avatar}" alt="${escHTML(player.name)}">
        <div class="think-info">
          <div class="think-name">${escHTML(player.name)} ${label ? '<span style="font-size:0.7rem;opacity:0.6;">' + label + '</span>' : ''}</div>
          ${player.city ? '<div style="font-size:0.7rem;opacity:0.4;">' + escHTML(player.city) + '</div>' : ''}
          <div class="think-label">${this._t('thinking')} <span class="thinking-dots-lg"><span></span><span></span><span></span></span></div>
        </div>
      </div>
    `;

    // Position near the player's panel
    const pos = this._getPlayerPosition(player.index);
    const panelId = pos === 'top' ? 'opponent-top' : pos === 'left' ? 'opponent-left' : 'opponent-right';
    const panel = document.getElementById(panelId);
    if (panel) {
      const r = panel.getBoundingClientRect();
      const card = el.querySelector('.think-card');
      if (card) {
        if (pos === 'top') {
          el.style.left = (r.left + r.width / 2) + 'px';
          el.style.top = (r.bottom + 4) + 'px';
          el.style.transform = 'translateX(-50%)';
        } else if (pos === 'left') {
          el.style.left = (r.right + 4) + 'px';
          el.style.top = (r.top + r.height / 2) + 'px';
          el.style.transform = 'translateY(-50%)';
        } else {
          el.style.left = (r.left - 4) + 'px';
          el.style.top = (r.top + r.height / 2) + 'px';
          el.style.transform = 'translate(-100%, -50%)';
        }
      }
    }
  }
  /** Spawn gold particles around the active player's avatar panel. */
  _spawnAvatarParticles(player) {
    const pos = this._getPlayerPosition(player.index);
    const panelId = pos === 'bottom' ? null : 'opponent-' + pos;
    const panel = panelId ? document.getElementById(panelId) : document.getElementById('human-info');
    if (!panel) return;
    const avatar = panel.querySelector('.opp-avatar') || panel.querySelector('.human-avatar');
    if (!avatar) return;
    const r = avatar.getBoundingClientRect();
    spawnParticles(r.left + r.width / 2, r.top + r.height / 2, 8, 'particle-gold');
  }

  /** Hide the AI thinking overlay. */
  _hideThinking() {
    const el = document.getElementById('thinking-overlay');
    if (el) el.classList.add('hidden');
  }

  /** Executes an AI player's turn — draws if needed, passes if stuck, otherwise plays best move with thinking delay. */
  _aiTurn(player) {
    if (this.roundOver) return;

    const canPlay = player.hand.some(t => this.board.canPlay(t));

    if (!canPlay) {
      if (this.boneyard.length > 0) {
        const drawn = this.boneyard.pop();
        player.hand.push(drawn);
        this.gameLog.push({
          turn: this._logTurn++,
          player: player.name,
          avatar: player.avatar,
          action: 'draw',
          _openValues: this.board.getOpenValues() // AI draw tracking
        });
        if (this.sfx) this.sfx.draw();
        this._animateBoneyardDraw(player);
        // Show draw phrase — respect trash talk frequency
        const drawPhrase = getPhrase(player, 'draw');
        if (drawPhrase && this._trashTalkFreq > 0) {
          const chance = this._trashTalkFreq === 1 ? 0.2 : this._trashTalkFreq === 2 ? 0.5 : 1;
          if (Math.random() < chance) setTimeout(() => this._showSpeechBubble(player, drawPhrase), 300);
        }
        this._updateUI();
        setTimeout(() => this._aiTurn(player), this._speedMs(1400));
        return;
      } else {
        // AI must pass — show dialogue and pause
        this._hideThinking();
        this._showSpeechBubble(player, this._t('aiPass'));
        if (this.sfx) this.sfx.blocked();
        this.gameLog.push({
          turn: this._logTurn++,
          player: player.name,
          avatar: player.avatar,
          action: 'pass'
        });
        setTimeout(() => this._nextTurn(), this._speedMs(1500));
        return;
      }
    }

    const play = player.ai.choosePlay(player.hand, this.board, player.personality, {
      players: this.players,
      playerIndex: player.index,
      targetScore: this.targetScore,
      teamMode: this.teamMode,
      teams: this.teams,
      gameLog: this.gameLog
    });
    if (!play) {
      this._hideThinking();
      this.gameLog.push({
        turn: this._logTurn++,
        player: player.name,
        avatar: player.avatar,
        action: 'pass'
      });
      this._nextTurn();
      return;
    }

    this._executePlay(player, play.tile, play.placement);
  }

  /** Enables/disables draw, pass, and hint buttons based on the human player's hand and boneyard state. */
  _enableHumanPlay(player) {
    const canPlay = player.hand.some(t => this.board.canPlay(t));
    const drawBtn = document.getElementById('draw-btn');
    const passBtn = document.getElementById('pass-btn');
    const hintBtn = document.getElementById('hint-btn');

    // Reset bounce
    drawBtn.classList.remove('needs-draw');

    if (!canPlay && this.boneyard.length > 0) {
      drawBtn.disabled = false;
      drawBtn.classList.add('needs-draw');
      passBtn.style.display = 'none';
      hintBtn.disabled = true;
    } else if (!canPlay && this.boneyard.length === 0) {
      drawBtn.disabled = true;
      passBtn.style.display = '';
      hintBtn.disabled = true;
    } else {
      drawBtn.disabled = true;
      passBtn.style.display = 'none';
      const pts = this.teamMode && this.teams ? this.teams[player.team].score : player.score;
      // Count total possible plays (tile + placement combos)
      let totalPlays = 0;
      for (const t of player.hand) {
        totalPlays += this.board.getValidPlacements(t).length;
      }
      hintBtn.disabled = pts < 5 || totalPlays <= 1;
    }
  }

  /** Runs minimax to find the best move and highlights it. Costs 5 points from the player/team score. */
  useHint() {
    const player = this.players[0];
    if (!player.isHuman || this.currentPlayer !== 0) return;

    const pts = this.teamMode && this.teams ? this.teams[player.team].score : player.score;
    if (pts < 5) return;

    this._usedHint = true;

    // Deduct 5 points
    if (this.teamMode && this.teams) {
      this.teams[player.team].score -= 5;
      if (this.teams[player.team].score < 0) this.teams[player.team].score = 0;
    }
    player.score -= 5;
    if (player.score < 0) player.score = 0;

    // Run minimax to find best move
    const advisor = new AI('hard');
    const best = advisor.bestMove(player.hand, this.board, 4);

    if (!best) return;

    this._updateUI();

    // Highlight the recommended tile in the hand
    const handTiles = document.querySelectorAll('.hand-tile');
    const sortedHand = [...player.hand].sort((a, b) => a.pips - b.pips);
    for (let i = 0; i < sortedHand.length; i++) {
      if (sortedHand[i].equals(best.tile)) {
        if (handTiles[i]) {
          handTiles[i].classList.add('hint-glow');
          // Store hint data for board highlight
          this._hintPlacement = best.placement;
        }
        break;
      }
    }

    // Highlight the target end on the board
    if (best.placement.end !== 'first') {
      this._renderBoard([best.placement]);
    }

    // Disable hint button after use this turn
    document.getElementById('hint-btn').disabled = true;
  }

  /** Human draws a tile from the boneyard, animates it into hand, and auto-plays if only one valid move exists. */
  drawFromBoneyard() {
    const player = this.players[this.currentPlayer];
    if (!player.isHuman || this.boneyard.length === 0 || this._playLock) return;
    // Guard: don't allow drawing when the player can already play
    if (player.hand.some(t => this.board.canPlay(t))) return;
    this._playLock = true;

    const drawn = this.boneyard.pop();
    player.hand.push(drawn);
    this.gameLog.push({
      turn: this._logTurn++,
      player: player.name,
      avatar: player.avatar,
      action: 'draw',
      _openValues: this.board.getOpenValues() // AI draw tracking
    });
    if (this.sfx) this.sfx.draw();
    this._haptic(10);
    this._animateBoneyardDraw(player);

    // Delay hand re-render until after draw animation settles
    setTimeout(() => {
      this._updateUI();

      // Check if exactly one move exists after drawing — auto-play it
      const playable = [];
      for (const tile of player.hand) {
        const placements = this.board.getValidPlacements(tile);
        for (const p of placements) playable.push({ tile, placement: p });
      }
      if (playable.length === 1) {
        this._showAutoPlayBanner(this._t('autoPlayOnly'));
        setTimeout(() => {
          this._playLock = false;
          this._executePlay(player, playable[0].tile, playable[0].placement);
        }, this._speedMs(400));
        return;
      }

      this._playLock = false;
      this._enableHumanPlay(player);
    }, this._speedMs(400));
  }

  /** Human passes their turn (only when no playable tiles and boneyard is empty). */
  pass() {
    const player = this.players[this.currentPlayer];
    if (!player.isHuman) return;
    // Guard: only allow pass when player truly can't play and boneyard is empty
    if (this.boneyard.length > 0) return;
    if (player.hand.some(t => this.board.canPlay(t))) return;
    this.gameLog.push({
      turn: this._logTurn++,
      player: player.name,
      avatar: player.avatar,
      action: 'pass'
    });
    this._nextTurn();
  }

  /** Handle click on a hand tile: select it and show valid placement ends on the board. */
  _onTileClick(tile, el) {
    const player = this.players[this.currentPlayer];
    if (!player.isHuman || this._playLock) return;
    if (!this.board.canPlay(tile)) return;

    this._hoverTile = null; this._hoverPlacements = null;

    const placements = this.board.getValidPlacements(tile);

    if (placements.length === 1) {
      this._executePlay(player, tile, placements[0]);
    } else {
      // Multiple placements — always require user to pick direction
      if (this.selectedEl) this.selectedEl.classList.remove('selected');
      this.selectedTile = tile;
      this.selectedEl = el;
      el.classList.add('selected');
      this._showEndChoices(tile, placements);
    }
  }

  /** Handle hover on a hand tile: preview valid placement ends on the board. */
  _onTileHover(tile) {
    if (this.currentPlayer !== 0 || this._playLock) return;
    if (!this.board.canPlay(tile)) return;
    this._hoverTile = tile;
    this._hoverPlacements = this.board.getValidPlacements(tile);
    this._renderBoard(this._hoverPlacements);

    // Highlight the hovered tile in the hand
    document.querySelectorAll('.hand-tile').forEach(el => el.classList.remove('hover-active'));
    const human = this.players[0];
    const sorted = [...human.hand].sort((a, b) => a.pips - b.pips);
    const idx = sorted.findIndex(t => t.equals(tile));
    const handTiles = document.querySelectorAll('.hand-tile');
    if (idx >= 0 && handTiles[idx]) handTiles[idx].classList.add('hover-active');
  }

  /** Handle mouse leave on a hand tile (no-op — keeps last hover visible). */
  _onTileLeave() {
    // Don't clear — keep showing the last hovered tile's placements
    // They'll be replaced when hovering another tile or cleared on click/turn change
  }

  /** Store pending placements and trigger a board re-render with highlighted ends. */
  _showEndChoices(tile, placements) {
    // Highlight available ends on the board
    this._pendingPlacements = placements;
    this._renderBoard(placements);
  }

  /** Handle click on the board canvas: resolve which end was clicked and execute the play. */
  _onBoardClick(e) {
    const activeTile = this.selectedTile || this._hoverTile;
    const activePlacements = this._pendingPlacements || this._hoverPlacements;
    if (!activeTile || !activePlacements || activePlacements.length === 0) return;
    if (!this.players[this.currentPlayer] || !this.players[this.currentPlayer].isHuman) return;
    if (this._playLock) return;

    const rect = this.renderer.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const scale = this.renderer._viewScale || 1;
    const offX = this.renderer._viewOffsetX || 0;
    const offY = this.renderer._viewOffsetY || 0;
    const mx = (screenX - offX) / scale;
    const my = (screenY - offY) / scale;

    let bestEnd = null;
    let bestDist = Infinity;

    for (const p of activePlacements) {
      const endPos = this._getEndPosition(p.end);
      if (endPos) {
        const dist = Math.hypot(mx - endPos.x, my - endPos.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestEnd = p;
        }
      }
    }

    // Only place if click is reasonably close to a circle (within 60 world units)
    if (bestEnd && bestDist < 60) {
      const player = this.players[this.currentPlayer];
      this._executePlay(player, activeTile, bestEnd);
      this.selectedTile = null;
      this.selectedEl = null;
      this._pendingPlacements = null;
      this._hoverTile = null; this._hoverPlacements = null;
    }
  }

  /** Begin a drag operation from a hand tile, tracking mouse/touch movement until drop. */
  _onDragStart(tile, el, startX, startY) {
    if (this._playLock || !this.board.canPlay(tile)) return;
    const placements = this.board.getValidPlacements(tile);
    if (placements.length === 0) return;

    this._dragTile = tile;
    this._dragPlacements = placements;
    this._dragStartX = startX;
    this._dragStartY = startY;
    this._dragActive = false;
    this._dragSourceEl = el;
    this._dragGhost = null;

    const createGhost = () => {
      const ghost = el.cloneNode(true);
      ghost.className = 'hand-tile drag-ghost';
      ghost.style.position = 'fixed';
      ghost.style.zIndex = '100';
      ghost.style.pointerEvents = 'none';
      ghost.style.width = el.offsetWidth + 'px';
      ghost.style.height = el.offsetHeight + 'px';
      ghost.style.opacity = '0.85';
      ghost.style.transform = 'scale(1.1) rotate(-3deg)';
      ghost.style.transition = 'none';
      ghost.style.animation = 'none';
      document.body.appendChild(ghost);
      this._dragGhost = ghost;
      return ghost;
    };

    const onMove = (cx, cy) => {
      const dx = cx - this._dragStartX;
      const dy = cy - this._dragStartY;
      if (!this._dragActive && Math.hypot(dx, dy) < 10) return;
      if (!this._dragActive) {
        this._dragActive = true;
        createGhost();
        this._renderBoard(placements);
        el.style.opacity = '0.3';
      }
      if (this._dragGhost) {
        this._dragGhost.style.left = (cx - el.offsetWidth / 2) + 'px';
        this._dragGhost.style.top = (cy - el.offsetHeight / 2) + 'px';
        // Subtle drag trail particles
        if (Math.random() > 0.6) {
          spawnParticles(cx, cy, 1, 'particle-gold');
        }
      }
    };

    const onEnd = (cx, cy) => {
      document.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseup', mouseUp);
      document.removeEventListener('touchmove', touchMove);
      document.removeEventListener('touchend', touchEnd);
      document.removeEventListener('touchcancel', touchEnd);
      if (this._dragGhost) { this._dragGhost.remove(); this._dragGhost = null; }
      el.style.opacity = '';

      if (!this._dragActive) return; // was just a click, let click handler deal with it

      // Find closest end
      const rect = this.renderer.canvas.getBoundingClientRect();
      const scale = this.renderer._viewScale || 1;
      const offX = this.renderer._viewOffsetX || 0;
      const offY = this.renderer._viewOffsetY || 0;
      const mx = (cx - rect.left - offX) / scale;
      const my = (cy - rect.top - offY) / scale;

      let bestEnd = null, bestDist = Infinity;
      for (const p of placements) {
        const endPos = this._getEndPosition(p.end);
        if (endPos) {
          const dist = Math.hypot(mx - endPos.x, my - endPos.y);
          if (dist < bestDist) { bestDist = dist; bestEnd = p; }
        }
      }

      if (bestEnd && bestDist < 100) {
        const player = this.players[this.currentPlayer];
        this._executePlay(player, tile, bestEnd);
        this.selectedTile = null; this.selectedEl = null;
        this._pendingPlacements = null;
        this._hoverTile = null; this._hoverPlacements = null;
      } else {
        this._renderBoard();
      }
      this._dragTile = null; this._dragPlacements = null; this._dragActive = false;
    };

    const mouseMove = (e) => onMove(e.clientX, e.clientY);
    const mouseUp = (e) => onEnd(e.clientX, e.clientY);
    const touchMove = (e) => { if (e.touches.length === 1) { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); } };
    const touchEnd = (e) => {
      const t = e.changedTouches && e.changedTouches[0];
      onEnd(t ? t.clientX : this._dragStartX, t ? t.clientY : this._dragStartY);
    };

    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
    document.addEventListener('touchmove', touchMove, { passive: false });
    document.addEventListener('touchend', touchEnd);
    document.addEventListener('touchcancel', touchEnd);
  }

  /**
   * Get the screen position of a board end for drag-drop hit testing.
   * @param {string} end - 'left'|'right'|'north'|'south'.
   * @returns {{x: number, y: number}|null}
   */
  _getEndPosition(end) {
    if (this.placements.length === 0) return null;
    const cx = this.renderer.canvas.width / 2;
    const cy = this.renderer.canvas.height / 2;

    // Find the outermost tile in each direction
    let leftMost = null, rightMost = null, northMost = null, southMost = null;
    for (const p of this.placements) {
      if (p.branch === 'left' || p.branch === 'first') {
        if (!leftMost || p.x < leftMost.x) leftMost = p;
      }
      if (p.branch === 'right' || p.branch === 'first') {
        if (!rightMost || p.x > rightMost.x) rightMost = p;
      }
      if (p.branch === 'north' || p.branch === 'first') {
        if (!northMost || p.y < northMost.y) northMost = p;
      }
      if (p.branch === 'south' || p.branch === 'first') {
        if (!southMost || p.y > southMost.y) southMost = p;
      }
    }

    switch(end) {
      case 'left': return leftMost ? { x: leftMost.x - 65, y: leftMost.y } : { x: cx - 100, y: cy };
      case 'right': return rightMost ? { x: rightMost.x + 65, y: rightMost.y } : { x: cx + 100, y: cy };
      case 'north': return northMost ? { x: northMost.x, y: northMost.y - 65 } : { x: cx, y: cy - 80 };
      case 'south': return southMost ? { x: southMost.x, y: southMost.y + 65 } : { x: cx, y: cy + 80 };
      default: return { x: cx, y: cy };
    }
  }

  /** Core play execution: places tile on board, updates score, triggers animations, combos, and trash talk. */
  _executePlay(player, tile, placement) {
    this._hideThinking();
    // Guard: only the current player can execute, and prevent concurrent plays
    if (player.index !== this.currentPlayer) return;
    if (this._playLock) return;
    this._playLock = true;

    // Save undo state for human — removed

    // Track best possible score for post-game analysis
    let _bestPossibleScore = 0;
    if (player.isHuman) {
      for (const t of player.hand) {
        const pls = this.board.getValidPlacements(t);
        for (const pl of pls) {
          const sim = Board.clone(this.board);
          sim.placeTile(t, pl);
          _bestPossibleScore = Math.max(_bestPossibleScore, sim.getScore());
        }
      }
    }

    player.hand = player.hand.filter(t => !t.equals(tile));
    this.board.placeTile(tile, placement);
    this._lastPlayedBy = player.index;
    this._addVisualPlacement(tile, placement);

    // Trigger impact nudge on nearby tiles
    if (this.renderer && this.placements.length > 0) {
      const last = this.placements[this.placements.length - 1];
      this.renderer.triggerImpact(last.x, last.y);
    }

    const score = this.board.getScore();
    const scored = score > 0;

    const logScores = {};
    if (this.teamMode && this.teams) {
      this.teams.forEach(t => logScores[t.name] = t.score);
    } else {
      this.players.forEach(p => logScores[p.name] = p.score);
    }
    const moveTime = this._moveStartTime ? Math.round((Date.now() - this._moveStartTime) / 1000 * 10) / 10 : 0;
    this.gameLog.push({
      turn: this._logTurn++,
      player: player.name,
      avatar: player.avatar,
      action: 'play',
      tile: `${tile.a}|${tile.b}`,
      end: placement.end,
      score: scored ? score : 0,
      scores: logScores,
      moveTime,
      _bestPossibleScore
    });
    if (scored) {
      player.score += score;
      if (this.teamMode && this.teams) {
        this.teams[player.team].score += score;
      }
      this._showScorePopup(score, player);
      if (this.sfx) {
        if (score >= 15) this.sfx.scoreBig();
        else this.sfx.score();
      }
      // Haptic pattern scales with score
      if (score >= 20) this._haptic([30, 50, 60]);
      else if (score >= 10) this._haptic([20, 30, 40]);
      else this._haptic(30);
      // Combo tracking for human player
      if (player.isHuman) {
        this._humanCombo++;
        if (this._humanCombo >= 2) {
          this._showComboPopup(this._humanCombo);
        }
      }
      // Screen shake on big scores — intensity scales with points
      if (score >= 15) {
        const boardArea = document.getElementById('board-area');
        if (boardArea) {
          const shakeClass = score >= 25 ? 'board-shake-heavy' : 'board-shake';
          boardArea.classList.remove('board-shake', 'board-shake-heavy');
          void boardArea.offsetWidth;
          boardArea.classList.add(shakeClass);
          setTimeout(() => boardArea.classList.remove(shakeClass), 600);
        }
      }
    } else {
      if (this.sfx) {
        if (tile.isDouble) this.sfx.placeDouble();
        else this.sfx.place();
      }
      this._haptic(tile.isDouble ? [15, 20, 25] : 15);
      if (player.isHuman) {
        this._humanCombo = 0;
      }
    }

    this.selectedTile = null;
    this.selectedEl = null;
    this._pendingPlacements = null;
    this._hoverTile = null; this._hoverPlacements = null;

    // Immediately disable all hand tiles so they don't flash as playable
    document.querySelectorAll('.hand-tile').forEach(el => {
      el.classList.remove('playable', 'hover-active', 'selected');
      el.classList.add('not-playable');
    });

    this._updateUI();

    const delay = scored ? this._speedMs(2000) : this._speedMs(800);
    setTimeout(() => {
      this._playLock = false;
      if (player.hand.length === 0) {
        this._endRound(player);
        return;
      }
      if (this._isGameWon()) {
        this._endGame();
        return;
      }
      this._nextTurn();
    }, delay);
  }

  /** Compute visual placement data (x, y, orientation) for a tile and add it to the placements array. */
  _addVisualPlacement(tile, placement) {
    const tw = this.renderer.tileW;
    const th = this.renderer.tileH;
    const gap = this.renderer.gap;
    const cx = this.renderer.canvas.width / 2;
    const cy = this.renderer.canvas.height / 2;
    const now = performance.now();

    if (placement.end === 'first') {
      const horizontal = !tile.isDouble;
      this.placements.push({
        tile, x: cx, y: cy, horizontal,
        topVal: tile.a, bottomVal: tile.b,
        leftVal: tile.a, rightVal: tile.b,
        branch: 'first', placedAt: now,
        isSpinner: tile.isDouble
      });
      this._animateFlyIn();
      return;
    }

    const branch = placement.end;
    const mv = placement.matchValue;
    const outVal = tile.otherSide(mv);

    let lastInBranch = null;
    if (branch === 'left') {
      const branchTiles = this.placements.filter(p => p.branch === 'left' || p.branch === 'first');
      lastInBranch = branchTiles.reduce((a, b) => a.x < b.x ? a : b);
    } else if (branch === 'right') {
      const branchTiles = this.placements.filter(p => p.branch === 'right' || p.branch === 'first');
      lastInBranch = branchTiles.reduce((a, b) => a.x > b.x ? a : b);
    } else if (branch === 'north') {
      const branchTiles = this.placements.filter(p => p.branch === 'north' || p.branch === 'first');
      lastInBranch = branchTiles.reduce((a, b) => a.y < b.y ? a : b);
    } else if (branch === 'south') {
      const branchTiles = this.placements.filter(p => p.branch === 'south' || p.branch === 'first');
      lastInBranch = branchTiles.reduce((a, b) => a.y > b.y ? a : b);
    }

    if (!lastInBranch) return;

    let x, y, horizontal;
    const isDouble = tile.isDouble;

    if (branch === 'left') {
      horizontal = !isDouble;
      const offset = (horizontal ? th/2 : tw/2) + gap + (lastInBranch.horizontal ? th/2 : tw/2);
      x = lastInBranch.x - offset;
      y = lastInBranch.y;
      this.placements.push({ tile, x, y, horizontal, topVal: mv, bottomVal: outVal, leftVal: outVal, rightVal: mv, branch: 'left', placedAt: now });
    } else if (branch === 'right') {
      horizontal = !isDouble;
      const offset = (horizontal ? th/2 : tw/2) + gap + (lastInBranch.horizontal ? th/2 : tw/2);
      x = lastInBranch.x + offset;
      y = lastInBranch.y;
      this.placements.push({ tile, x, y, horizontal, topVal: outVal, bottomVal: mv, leftVal: mv, rightVal: outVal, branch: 'right', placedAt: now });
    } else if (branch === 'north') {
      horizontal = isDouble;
      const offset = (horizontal ? tw/2 : th/2) + gap + (lastInBranch.horizontal ? tw/2 : th/2);
      x = lastInBranch.x;
      y = lastInBranch.y - offset;
      this.placements.push({ tile, x, y, horizontal, topVal: outVal, bottomVal: mv, leftVal: tile.a, rightVal: tile.b, branch: 'north', placedAt: now });
    } else if (branch === 'south') {
      horizontal = isDouble;
      const offset = (horizontal ? tw/2 : th/2) + gap + (lastInBranch.horizontal ? tw/2 : th/2);
      x = lastInBranch.x;
      y = lastInBranch.y + offset;
      this.placements.push({ tile, x, y, horizontal, topVal: mv, bottomVal: outVal, leftVal: tile.a, rightVal: tile.b, branch: 'south', placedAt: now });
    }

    this._animateFlyIn();

    // Mark the spinner placement
    if (this.board.spinner) {
      for (const p of this.placements) {
        p.isSpinner = p.tile && p.tile.equals(this.board.spinner);
      }
    }
  }

  /** Animate the last-placed tile flying in from the player's position to the board. */
  _animateFlyIn() {
    this._flyingIn = true;
    const duration = 700;
    const start = performance.now();
    const flyFrom = this._getPlayerPosition(this._lastPlayedBy || 0);
    const animate = () => {
      const elapsed = performance.now() - start;
      const progress = elapsed < duration ? elapsed / duration : 1;
      this._renderBoard(null, progress, flyFrom);
      if (elapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        this._flyingIn = false;
      }
    };
    requestAnimationFrame(animate);
  }

  /**
   * Map a player index to their screen position.
   * @param {number} playerIndex
   * @returns {'bottom'|'top'|'left'|'right'}
   */
  _getPlayerPosition(playerIndex) {
      if (playerIndex === 0) return 'bottom';
      const opponents = this.players.filter(p => p.index !== 0);
      if (this.teamMode && opponents.length === 3) {
        const partner = opponents.find(p => p.team === 0);
        const opps = opponents.filter(p => p.team !== 0);
        const map = [
          { player: opps[0], pos: 'left' },
          { player: partner, pos: 'top' },
          { player: opps[1], pos: 'right' }
        ];
        const found = map.find(m => m.player && m.player.index === playerIndex);
        return found ? found.pos : 'top';
      }
      // 1 opp: across (top). 2 opps: left, right. 3 opps: left, top, right.
      let posMap;
      if (opponents.length === 1) posMap = ['top'];
      else if (opponents.length === 2) posMap = ['left', 'right'];
      else posMap = ['left', 'top', 'right'];
      const oppIdx = opponents.findIndex(p => p.index === playerIndex);
      return oppIdx >= 0 ? posMap[oppIdx % posMap.length] : 'top';
    }

  /** Animate a tile flying from the boneyard area to the player's hand. */
  _animateBoneyardDraw(player) {
    const boneArea = document.getElementById('boneyard-area');
    if (!boneArea) return;
    const boneRect = boneArea.getBoundingClientRect();
    const startX = boneRect.left + boneRect.width / 2;
    const startY = boneRect.top + boneRect.height / 2;

    // Determine target position
    const pos = this._getPlayerPosition(player.index);
    let endX, endY;
    if (pos === 'bottom') {
      endX = window.innerWidth / 2;
      endY = window.innerHeight - 60;
    } else if (pos === 'top') {
      const el = document.getElementById('opponent-top');
      const r = el ? el.getBoundingClientRect() : { left: window.innerWidth / 2, top: 40 };
      endX = r.left + (el ? el.offsetWidth / 2 : 0);
      endY = r.top + 30;
    } else if (pos === 'left') {
      const el = document.getElementById('opponent-left');
      const r = el ? el.getBoundingClientRect() : { left: 30, top: window.innerHeight / 2 };
      endX = r.left + 30;
      endY = r.top + (el ? el.offsetHeight / 2 : 0);
    } else {
      const el = document.getElementById('opponent-right');
      const r = el ? el.getBoundingClientRect() : { right: window.innerWidth - 30, top: window.innerHeight / 2 };
      endX = r.left + (el ? el.offsetWidth / 2 : 0);
      endY = r.top + (el ? el.offsetHeight / 2 : 0);
    }

    // Create flying tile element
    const flyTile = document.createElement('div');
    flyTile.style.cssText = `
      position: fixed; z-index: 60; pointer-events: none;
      width: 44px; height: 22px;
      background: linear-gradient(160deg, #f5f0dc, #c8c0a0);
      border: 2px solid rgba(180,170,140,0.5); border-radius: 5px;
      box-shadow: 0 2px 0 #a8a080, 0 4px 8px rgba(0,0,0,0.4);
      left: ${startX - 22}px; top: ${startY - 11}px;
      transition: left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
                  top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
                  transform 0.5s ease-out, opacity 0.5s ease-out;
      transform: scale(1.2);
    `;
    document.body.appendChild(flyTile);

    requestAnimationFrame(() => {
      flyTile.style.left = (endX - 22) + 'px';
      flyTile.style.top = (endY - 11) + 'px';
      flyTile.style.transform = 'scale(0.6)';
      flyTile.style.opacity = '0.3';
    });

    setTimeout(() => flyTile.remove(), 600);
  }

  /** Advance to the next player's turn, auto-passing stuck players and detecting blocked games. */
  _nextTurn() {
    // Clear any lingering highlights and suppress flag
    this.selectedTile = null;
    this.selectedEl = null;
    this._pendingPlacements = null;
    this._hoverTile = null; this._hoverPlacements = null;
    this._suppressToast = false;
    const _endSumEl = document.getElementById("end-sum-display"); if (_endSumEl) _endSumEl.style.visibility = "";

    this.currentPlayer = (this.currentPlayer + 1) % this.players.length;

    // Auto-save game state
    this._saveGameState();

    // Check if all players are stuck (blocked game)
    let allStuck = true;
    for (let i = 0; i < this.players.length; i++) {
      const idx = (this.currentPlayer + i) % this.players.length;
      const p = this.players[idx];
      const canPlay = p.hand.some(t => this.board.canPlay(t));
      if (canPlay || this.boneyard.length > 0) {
        allStuck = false;
        // Log passes for any skipped players
        for (let j = 0; j < i; j++) {
          const skippedIdx = (this.currentPlayer + j) % this.players.length;
          const skipped = this.players[skippedIdx];
          this.gameLog.push({
            turn: this._logTurn++,
            player: skipped.name,
            avatar: skipped.avatar,
            action: 'pass'
          });
        }
        // Advance to this player
        this.currentPlayer = idx;
        break;
      }
    }

    if (allStuck) {
      this._endRoundBlocked();
      return;
    }

    this._doTurn();
  }

  /** Handles round end: counts remaining pips, calculates bonus, records round history, checks for game end. */
  _endRound(winner) {
    this.roundOver = true;

    let countPlayers, winnerLabel, bonusCalc;
    const humanWon = winner.index === 0 || (this.teamMode && winner.team === 0);

    if (this.teamMode && this.teams) {
      const winTeam = this.teams[winner.team];
      const loseTeam = this.teams[winner.team === 0 ? 1 : 0];
      let oppPips = 0;
      for (const idx of loseTeam.players) oppPips += this.players[idx].handPips;
      let partnerPips = 0;
      for (const idx of winTeam.players) {
        if (idx !== winner.index) partnerPips += this.players[idx].handPips;
      }
      const bonus = Math.round((oppPips - partnerPips) / 5) * 5;
      // Show ALL players with remaining tiles so the subtraction is visible
      countPlayers = this.players.filter(p => p.index !== winner.index && p.hand.length > 0);
      winnerLabel = winner.name;
      bonusCalc = { bonus: Math.max(0, bonus), recipient: winTeam.name, oppPips, partnerPips };
      if (bonus > 0) winTeam.score += bonus;
    } else {
      let bonusPips = 0;
      for (const p of this.players) {
        if (p !== winner) bonusPips += p.handPips;
      }
      const bonus = Math.round(bonusPips / 5) * 5;
      // Only show losers' bones
      countPlayers = this.players.filter(p => p !== winner && p.hand.length > 0);
      winnerLabel = winner.name;
      bonusCalc = { bonus, recipient: winner.name };
      if (bonus > 0) winner.score += bonus;
    }

    // Track round scores
    if (!this._roundScores) this._roundScores = [];
    const roundData = { round: this._roundNum };
    if (this.teamMode && this.teams) {
      this.teams.forEach(t => roundData[t.name] = t.score);
    } else {
      this.players.forEach(p => roundData[p.name] = p.score);
    }
    this._roundScores.push(roundData);

    // Track round history for recap
    if (!this._roundHistory) this._roundHistory = [];
    // Find plays from this round only (after the last round-end entry)
    const lastRoundEndIdx = this.gameLog.reduce((acc, e, i) => e.action === 'round-end' ? i : acc, -1);
    const roundLog = lastRoundEndIdx >= 0 ? this.gameLog.slice(lastRoundEndIdx + 1) : this.gameLog;
    const roundPlays = roundLog.filter(e => e.action === 'play');
    const roundScoring = roundPlays.filter(e => e.score > 0);
    const bestPlay = roundScoring.length > 0 ? roundScoring.reduce((a, b) => a.score > b.score ? a : b) : null;
    this._roundHistory.push({
      round: this._roundNum,
      winner: winner.name,
      winnerAvatar: winner.avatar,
      bonus: bonusCalc.bonus,
      bestPlay: bestPlay ? { player: bestPlay.player, score: bestPlay.score, tile: bestPlay.tile } : null,
      totalPlays: roundPlays.length,
      blocked: false
    });

    // Celebration if human/human's team won
    if (humanWon && this.sfx) this.sfx.win();

    // Log round end
    const logScores = {};
    if (this.teamMode && this.teams) {
      this.teams.forEach(t => logScores[t.name] = t.score);
    } else {
      this.players.forEach(p => logScores[p.name] = p.score);
    }
    this.gameLog.push({
      turn: this._logTurn++,
      action: 'round-end', round: this._roundNum,
      player: winner.name,
      avatar: winner.avatar,
      detail: `${winner.name} ${this._t('dominoesDetail')} +${bonusCalc.bonus} ${this._t('for_')} ${bonusCalc.recipient}`,
      scores: logScores
    });

    this._updateUI();

    // Show "Dominoes!" speech bubble for AI winner, then delay before bone counting
    if (!winner.isHuman) {
      const phrase = getPhrase(winner, 'domino');
      this._showSpeechBubble(winner, phrase);
    }

    const showCounting = () => {
      if (countPlayers.length > 0) {
        this._showBoneCounting(winnerLabel, countPlayers, bonusCalc, () => {
          if (this._isGameWon()) this._endGame();
          else this.startRound();
        });
      } else {
        if (this._isGameWon()) this._endGame();
        else {
          this.showMessage(`${winnerLabel} ${this._t('noBonesToCount')}`, () => this.startRound());
        }
      }
    };

    // Delay so the board state is visible before counting
    setTimeout(showCounting, this._speedMs(2500));
  }

  /** Handle a blocked round (no player can move): find lowest-pip player and award bonus. */
  _endRoundBlocked() {
    this.roundOver = true;

    let countPlayers, winnerLabel, bonusCalc;

    if (this.teamMode && this.teams) {
      const teamPips = this.teams.map(t =>
        t.players.reduce((s, idx) => s + this.players[idx].handPips, 0)
      );
      const winTeamIdx = teamPips[0] <= teamPips[1] ? 0 : 1;
      const loseTeamIdx = winTeamIdx === 0 ? 1 : 0;
      const bonus = Math.round((teamPips[loseTeamIdx] - teamPips[winTeamIdx]) / 5) * 5;
      if (bonus > 0) this.teams[winTeamIdx].score += bonus;
      countPlayers = this.players.filter(p => p.hand.length > 0);
      winnerLabel = this.teams[winTeamIdx].name;
      bonusCalc = { bonus, recipient: this.teams[winTeamIdx].name };
    } else {
      let minPips = Infinity, winner = null;
      for (const p of this.players) { if (p.handPips < minPips) { minPips = p.handPips; winner = p; } }
      let bonus = 0;
      for (const p of this.players) { if (p !== winner) bonus += p.handPips - winner.handPips; }
      bonus = Math.round(bonus / 5) * 5;
      if (bonus > 0) winner.score += bonus;
      countPlayers = this.players.filter(p => p.hand.length > 0);
      winnerLabel = winner.name;
      bonusCalc = { bonus, recipient: winner.name };
    }

    this._updateUI();

    // Track round history for recap (blocked)
    if (!this._roundHistory) this._roundHistory = [];
    this._roundHistory.push({
      round: this._roundNum,
      winner: winnerLabel,
      winnerAvatar: '',
      bonus: bonusCalc.bonus,
      bestPlay: null,
      totalPlays: 0,
      blocked: true
    });

    // Log blocked round end
    const logScores = {};
    if (this.teamMode && this.teams) {
      this.teams.forEach(t => logScores[t.name] = t.score);
    } else {
      this.players.forEach(p => logScores[p.name] = p.score);
    }
    this.gameLog.push({
      turn: this._logTurn++,
      action: 'round-end', round: this._roundNum,
      player: winnerLabel,
      avatar: '',
      detail: `${this._t('blocked')}! ${winnerLabel} ${this._t('blocked_wins')}. +${bonusCalc.bonus} ${this._t('for_')} ${bonusCalc.recipient}`,
      scores: logScores
    });

    this._showBoneCounting(`${this._t('blocked')}! ${winnerLabel} ${this._t('blocked_wins')}`, countPlayers, bonusCalc, () => {
      if (this._isGameWon()) this._endGame();
      else this.startRound();
    });
  }

  /** Show the bone-counting ceremony overlay: animate each loser's tiles flipping, then show bonus. */
  _showBoneCounting(title, countPlayers, bonusCalc, callback) {
    const overlay = document.getElementById('count-overlay');
    overlay.classList.remove('hidden');
    overlay.innerHTML = '';

    const titleEl = document.createElement('div');
    titleEl.className = 'count-title';
    titleEl.textContent = title + ' — ' + this._t('countingBonesTitle');
    overlay.appendChild(titleEl);

    let totalPips = 0;
    let tileDelay = 0;

    for (const p of countPlayers) {
      const row = document.createElement('div');
      row.className = 'count-player';

      const pips = p.handPips;
      totalPips += pips;

      // Determine team label
      let teamTag = '';
      if (this.teamMode && this.teams) {
        const isTeammate = p.team === this.players[0].team;
        teamTag = isTeammate
          ? ` <span style="color:#4aaf6c;font-size:0.75rem;font-weight:700;">🤝 ${this._t('teammate')}</span>`
          : ` <span style="color:#e04a3a;font-size:0.75rem;font-weight:700;">⚔️ ${this._t('opps')}</span>`;
      }

      row.innerHTML = `
        <img class="count-avatar" src="${p.avatar}" alt="${escHTML(p.name)}">
        <div class="count-info">
          <div class="count-name">${escHTML(p.name)}${teamTag}</div>
          <div class="count-tiles" id="count-tiles-${p.index}"></div>
        </div>
        <div class="count-pips" id="count-pips-${p.index}">0</div>
      `;
      overlay.appendChild(row);

      // Animate tiles flipping in one by one
      const playerTiles = [...p.hand];
      let runningPips = 0;
      const tileInterval = this._speedMs(300);
      playerTiles.forEach((tile, i) => {
        const delay = tileDelay + i * tileInterval;
        setTimeout(() => {
          const container = document.getElementById(`count-tiles-${p.index}`);
          if (!container) return;
          const tileEl = document.createElement('div');
          tileEl.className = 'count-tile';
          tileEl.style.animationDelay = '0s';
          tileEl.innerHTML = `<div class="ct-half">${this._countPipSVG(tile.a)}</div><div class="ct-div"></div><div class="ct-half">${this._countPipSVG(tile.b)}</div>`;
          container.appendChild(tileEl);

          runningPips += tile.pips;
          const pipsEl = document.getElementById(`count-pips-${p.index}`);
          if (pipsEl) pipsEl.textContent = runningPips;

          if (this.sfx) this.sfx.place();
        }, delay);
      });

      tileDelay += playerTiles.length * tileInterval + this._speedMs(200);
    }

    // Show total and bonus after all tiles counted
    setTimeout(() => {
      const totalEl = document.createElement('div');
      totalEl.className = 'count-total';
      if (bonusCalc.bonus > 0) {
        if (bonusCalc.oppPips !== undefined && bonusCalc.partnerPips !== undefined) {
          // Team mode: show the subtraction breakdown
          const breakdownText = bonusCalc.partnerPips > 0
            ? `${bonusCalc.oppPips} − ${bonusCalc.partnerPips} = ${bonusCalc.oppPips - bonusCalc.partnerPips} ${this._t('pips')}`
            : `${bonusCalc.oppPips} ${this._t('pips')}`;
          totalEl.innerHTML = `${breakdownText} → <span class="ct-bonus">+${bonusCalc.bonus}</span> ${this._t('for_')} ${escHTML(bonusCalc.recipient)}`;
        } else {
          totalEl.innerHTML = `${totalPips} ${this._t('pips')} → <span class="ct-bonus">+${bonusCalc.bonus}</span> ${this._t('for_')} ${escHTML(bonusCalc.recipient)}`;
        }
      } else {
        if (bonusCalc.oppPips !== undefined && bonusCalc.partnerPips !== undefined && bonusCalc.partnerPips >= bonusCalc.oppPips) {
          totalEl.innerHTML = `${bonusCalc.oppPips} − ${bonusCalc.partnerPips} ${this._t('pips')} → <span class="ct-bonus">+0</span> ${this._t('bonus')}`;
        } else {
          totalEl.innerHTML = `${totalPips} ${this._t('pips')} → <span class="ct-bonus">+0</span> ${this._t('bonus')}`;
        }
      }
      overlay.appendChild(totalEl);

      if (this.sfx && bonusCalc.bonus > 0) this.sfx.score();

      // Stars based on bonus amount — only for human/human's team
      const humanTeamWon = bonusCalc.recipient === this._t('yourTeam') ||
        (this.players[0] && bonusCalc.recipient === this.players[0].name);
      if (humanTeamWon && bonusCalc.bonus > 0) {
        trackStat('roundScore', bonusCalc.bonus);
        if (bonusCalc.bonus >= 25) { if (unlockAchievement('five_star')) showAchievementPopup('five_star'); }
        let starCount;
        if (bonusCalc.bonus >= 25) starCount = 5;
        else if (bonusCalc.bonus >= 20) starCount = 4;
        else if (bonusCalc.bonus >= 15) starCount = 3;
        else if (bonusCalc.bonus >= 10) starCount = 2;
        else starCount = 1;

        const starsEl = document.createElement('div');
        starsEl.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:12px;';
        for (let i = 0; i < starCount; i++) {
          const star = document.createElement('span');
          star.className = 'score-star';
          star.textContent = '⭐';
          star.style.animationDelay = `${i * 0.15}s, ${0.4 + i * 0.15}s, 4s`;
          starsEl.appendChild(star);
        }
        overlay.appendChild(starsEl);
      }

      // Add continue button
      setTimeout(() => {
        const btn = document.createElement('button');
        btn.className = 'btn-start';
        btn.style.marginTop = '16px';
        btn.textContent = this._t('continue_btn');
        btn.addEventListener('click', () => {
          overlay.classList.add('hidden');
          callback();
        });
        overlay.appendChild(btn);
      }, this._speedMs(600));
    }, tileDelay + this._speedMs(400));
  }
  _countPipSVG(n) {
    const size = 24;
    const s = size * 0.22;
    const positions = {
      0: [],
      1: [[0,0]],
      2: [[-s,-s],[s,s]],
      3: [[-s,-s],[0,0],[s,s]],
      4: [[-s,-s],[s,-s],[-s,s],[s,s]],
      5: [[-s,-s],[s,-s],[0,0],[-s,s],[s,s]],
      6: [[-s,-s],[s,-s],[-s,0],[s,0],[-s,s],[s,s]]
    };
    const dots = (positions[n] || []).map(([x,y]) =>
      `<circle cx="${size/2+x}" cy="${size/2+y}" r="2.5" fill="#333"/>`
    ).join('');
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${dots}</svg>`;
  }

  _isGameWon() {
    if (this.teamMode && this.teams) {
      return this.teams.some(t => t.score >= this.targetScore);
    }
    return this.players.some(p => p.score >= this.targetScore);
  }

  /** Game over: records win/loss stats, shows post-game analysis screen, triggers confetti for wins. */
  _endGame() {
    this.gameOver = true;
    if (this.music) this.music.setIntensity(1); // Full intensity for game end

    // Record wins/losses
    if (this.teamMode && this.teams) {
      const winTeamIdx = this.teams[0].score >= this.teams[1].score ? 0 : 1;
      for (const t of this.teams) {
        const isWin = t === this.teams[winTeamIdx];
        for (const idx of t.players) {
          if (isWin) recordWin(this.players[idx].name);
          else recordLoss(this.players[idx].name);
        }
      }
    } else {
      const winner = this.players.reduce((a, b) => a.score > b.score ? a : b);
      for (const p of this.players) {
        if (p === winner) recordWin(p.name);
        else recordLoss(p.name);
      }
    }

    const container = document.getElementById('final-scores');
    container.innerHTML = '';

    if (this.teamMode && this.teams) {
      const winTeam = this.teams[0].score >= this.teams[1].score ? this.teams[0] : this.teams[1];
      for (const team of [...this.teams].sort((a, b) => b.score - a.score)) {
        const isWin = team === winTeam;
        const row = document.createElement('div');
        row.className = 'final-score-row' + (isWin ? ' winner' : '');
        const avatars = team.players.map(i =>
          `<img src="${this.players[i].avatar}" style="width:44px;height:44px;border-radius:50%;vertical-align:middle;margin-right:6px;">`
        ).join('');
        const members = team.players.map(i => escHTML(this.players[i].name)).join(' &amp; ');
        row.innerHTML = `<span>${avatars}${isWin ? '👑 ' : ''}${escHTML(team.name)} (${members})</span><span>${team.score} ${this._t('pts')}</span>`;
        container.appendChild(row);
      }
    } else {
      const winner = this.players.reduce((a, b) => a.score > b.score ? a : b);
      const sorted = [...this.players].sort((a, b) => b.score - a.score);
      for (const p of sorted) {
        const row = document.createElement('div');
        row.className = 'final-score-row' + (p === winner ? ' winner' : '');
        const rec = getRecord(p.name);
        const rank = getRank(p.name);
        row.innerHTML = `<span><img src="${p.avatar}" style="width:44px;height:44px;border-radius:50%;vertical-align:middle;margin-right:10px;">${p === winner ? '👑 ' : ''}${escHTML(p.name)} <span style="opacity:0.5;font-size:0.8rem">${escHTML(rank)}</span></span><span>${p.score} ${this._t('pts')}</span>`;
        container.appendChild(row);
      }
    }

    // Track stats
    trackStat('gamesPlayed', 1);
    const pName = getPlayerName();
    const humanWon = this.teamMode
      ? this.teams[0].score >= this.teams[1].score
      : this.players.reduce((a, b) => a.score > b.score ? a : b).isHuman;
    if (humanWon) {
      trackStat('gamesWon', 1);
      trackStat('winStreak', 1);
      addXP(50);
      // Victory animation variety based on margin
      const scores = this.players.map(p => p.score).sort((a, b) => b - a);
      const margin = scores[0] - (scores[1] || 0);
      if (margin > 100) {
        // Blowout — double confetti + extra particles
        spawnConfetti(); spawnConfetti();
      } else if (margin < 20) {
        // Close game — subtle gold particles
        spawnParticles(window.innerWidth / 2, window.innerHeight / 2, 30, 'particle-gold');
      } else {
        spawnConfetti();
      }
    } else {
      trackStat('loseStreak', 1);
      addXP(10);
    }

    // Track head-to-head vs each AI opponent
    for (const p of this.players) {
      if (!p.isHuman) {
        this._trackHeadToHead(p.name, humanWon);
      }
    }

    // Track lifetime stats
    const preAnalysis = this._getAnalysis();
    trackStat('totalTilesPlayed', preAnalysis.plays);
    trackStat('totalDraws', preAnalysis.draws);

    // Clear saved game
    this._clearSavedGame();
    checkAchievements(this);
    if (humanWon && unlockAchievement('domino_win')) showAchievementPopup('domino_win');

    // Post-game analysis
    const analysis = this._getAnalysis();
    const analysisDiv = document.createElement('div');
    analysisDiv.style.cssText = 'margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);';

    // Round timeline
    let timelineHTML = '';
    if (this._roundHistory && this._roundHistory.length > 0) {
      timelineHTML = `<div style="font-size:0.7rem;opacity:0.35;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">${this._t('roundRecap')}</div>`;
      for (const rh of this._roundHistory) {
        const bestStr = rh.bestPlay ? `${this._t('best')}: ${escHTML(rh.bestPlay.player)} +${rh.bestPlay.score}` : '';
        const blockedTag = rh.blocked ? `<span style="color:#e04a3a;font-size:0.7rem;font-weight:700;">${this._t('blocked').toUpperCase()}</span> ` : '';
        timelineHTML += `<div class="timeline-row">
          <span class="timeline-round">R${rh.round}</span>
          <div class="timeline-scores">
            <span class="timeline-score">${blockedTag}${this._t('wonBy')} <span style="color:#f0b840;">${escHTML(rh.winner)}</span></span>
            ${rh.bonus > 0 ? `<span class="timeline-score">+${rh.bonus} ${this._t('bonus')}</span>` : ''}
            ${bestStr ? `<span class="timeline-score" style="opacity:0.6;">${bestStr}</span>` : ''}
          </div>
        </div>`;
      }
    } else if (this._roundScores && this._roundScores.length > 1) {
      timelineHTML = `<div style="font-size:0.7rem;opacity:0.35;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">${this._t('roundTimeline')}</div>`;
      let prevScores = {};
      for (const rs of this._roundScores) {
        const diffs = {};
        for (const [k, v] of Object.entries(rs)) {
          if (k === 'round') continue;
          diffs[k] = v - (prevScores[k] || 0);
          prevScores[k] = v;
        }
        timelineHTML += `<div class="timeline-row"><span class="timeline-round">R${rs.round}</span><div class="timeline-scores">`;
        for (const [k, v] of Object.entries(diffs)) {
          timelineHTML += `<span class="timeline-score">${k}: <span style="color:#f0b840;">+${v}</span></span>`;
        }
        timelineHTML += '</div></div>';
      }
    }

    analysisDiv.innerHTML = `
      ${timelineHTML}
      <div style="font-size:0.7rem;opacity:0.35;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;margin-top:12px;">${this._t('yourPerformance')}</div>
      <div class="analysis-row"><span>${this._t('tilesPlayed')}</span><span class="analysis-value">${analysis.plays}</span></div>
      <div class="analysis-row"><span>${this._t('tilesDrawn')}</span><span class="analysis-value">${analysis.draws}</span></div>
      <div class="analysis-row"><span>${this._t('scoringPlays')}</span><span class="analysis-value">${analysis.scoringPlays}</span></div>
      <div class="analysis-row"><span>${this._t('totalPointsScored')}</span><span class="analysis-value">${analysis.totalScored}</span></div>
      <div class="analysis-row"><span>${this._t('bestSinglePlay')}</span><span class="analysis-value">+${analysis.bestPlay}</span></div>
      <div class="analysis-row"><span>${this._t('avgPointsPlay')}</span><span class="analysis-value">${analysis.avgScore}</span></div>
    `;

    // Post-game missed play analysis
    let missedHTML = '';
    if (this.gameLog) {
      const pName = this.players[0] ? this.players[0].name : '';
      let missedCount = 0;
      for (const entry of this.gameLog) {
        if (entry.action === 'play' && entry.player === pName && entry.score === 0 && entry._bestPossibleScore > 0) {
          missedCount++;
        }
      }
      if (missedCount > 0) {
        missedHTML = `<div class="analysis-row" style="color:#e04a3a;"><span>${this._t('missedScoringPlays')}</span><span class="analysis-value">${missedCount}</span></div>`;
      }
    }
    analysisDiv.innerHTML += missedHTML;

    container.appendChild(analysisDiv);

    // Show "GAME OVER!" on the board first, then transition
    const overlay = document.getElementById('countdown-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      const winnerName = this.teamMode
        ? (this.teams[0].score >= this.teams[1].score ? this.teams[0].name : this.teams[1].name)
        : this.players.reduce((a, b) => a.score > b.score ? a : b).name;
      const msg = humanWon ? this._t('youWin') : `${escHTML(winnerName)} ${this._t('wins')}!`;
      const bgGrad = humanWon
        ? 'linear-gradient(180deg,#fff 20%,#f0b840)'
        : 'linear-gradient(180deg,#fff 20%,#e04a3a)';
      const msgColor = humanWon ? '#f0b840' : '#e04a3a';
      const emoji = humanWon ? '🏆' : '💀';
      if (this.sfx) { humanWon ? this.sfx.win() : this.sfx.lose(); }
      overlay.innerHTML = `
        <div style="text-align:center;animation:announceIn 0.5s ease-out forwards;">
          <div style="font-size:5rem;margin-bottom:8px;">${emoji}</div>
          <div style="font-size:4rem;font-weight:900;letter-spacing:4px;background:${bgGrad};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px;">${this._t('gameOver')}</div>
          <div style="font-size:1.8rem;font-weight:800;color:${msgColor};margin-bottom:4px;">${msg}</div>
        </div>
      `;
      setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.innerHTML = '';
        this.showScreen('gameover-screen');
      }, this._speedMs(3000));
    } else {
      this.showScreen('gameover-screen');
    }
  }

  /** Show a floating score popup with the player's name and points earned. */
  _showScorePopup(score, player) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';

    let size, duration;
    if (score >= 20) { size = '7rem'; duration = 3200; }
    else if (score >= 15) { size = '6rem'; duration = 3000; }
    else if (score >= 10) { size = '5.2rem'; duration = 2800; }
    else { size = '4rem'; duration = 2500; }

    popup.style.fontSize = size;
    popup.innerHTML = `<span class="score-label">${escHTML(player.name)}</span>+${score}`;
    popup.style.left = '50%';
    popup.style.top = '45%';
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), duration);

    // Golden vignette flash
    const vignette = document.createElement('div');
    vignette.className = 'score-vignette' + (score >= 15 ? ' big' : '');
    document.body.appendChild(vignette);
    setTimeout(() => vignette.remove(), 800);

    // Flash the player's score item
    const scoreItems = document.querySelectorAll('.score-item');
    if (scoreItems[player.index]) {
      scoreItems[player.index].classList.remove('score-flash');
      void scoreItems[player.index].offsetWidth;
      scoreItems[player.index].classList.add('score-flash');
    }

    // Speech bubble for AI players — respect trash talk frequency
    if (!player.isHuman && this._trashTalkFreq > 0) {
      const chance = this._trashTalkFreq === 1 ? 0.3 : this._trashTalkFreq === 2 ? 0.7 : 1;
      if (Math.random() < chance) {
        const isTeammate = this.teamMode && player.team === this.players[0].team;
        const phrase = getPhrase(player, isTeammate ? 'teammate' : 'opponent');
        setTimeout(() => this._showSpeechBubble(player, phrase), 400);
      }
    }

    // Particles on scoring
    if (player.isHuman) {
      spawnParticles(window.innerWidth / 2, window.innerHeight * 0.45, 15 + score, 'particle-gold');
      trackStat('playScore', score);
      trackStat('totalScore', score);
      addXP(score);
      this._updateXPBar();
      if (score >= 20) { if (unlockAchievement('score_20')) showAchievementPopup('score_20'); }
      if (score >= 25) { if (unlockAchievement('score_25')) showAchievementPopup('score_25'); }
    } else {
      // Particles from opponent's position too
      const pos = this._getPlayerPosition(player.index);
      const panel = document.getElementById('opponent-' + pos);
      if (panel) {
        const r = panel.getBoundingClientRect();
        spawnParticles(r.left + r.width / 2, r.top + r.height / 2, 8 + score, 'particle-gold');
      }
    }
  }

  /** Show a combo counter popup when the human scores multiple turns in a row. */
  _showComboPopup(count) {
    const popup = document.createElement('div');
    popup.className = 'combo-popup';
    popup.textContent = `×${count} COMBO`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 900);
  }

  /** Show a speech bubble near an AI player's avatar with the given text. */
  _showSpeechBubble(player, text) {
    const pos = this._getPlayerPosition(player.index);
    let targetEl;
    if (pos === 'top') targetEl = document.getElementById('opponent-top');
    else if (pos === 'left') targetEl = document.getElementById('opponent-left');
    else if (pos === 'right') targetEl = document.getElementById('opponent-right');

    if (!targetEl) return;

    // Find the avatar inside the panel for precise positioning
    const avatar = targetEl.querySelector('.opp-avatar');
    const anchorRect = avatar ? avatar.getBoundingClientRect() : targetEl.getBoundingClientRect();

    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.textContent = text;

    if (pos === 'top') {
      bubble.style.left = (anchorRect.left + anchorRect.width / 2 - 90) + 'px';
      bubble.style.top = (anchorRect.bottom + 8) + 'px';
    } else if (pos === 'left') {
      bubble.style.left = (anchorRect.right + 8) + 'px';
      bubble.style.top = (anchorRect.top + anchorRect.height / 2 - 20) + 'px';
      bubble.style.borderBottomLeftRadius = '16px';
      bubble.style.borderBottomRightRadius = '4px';
    } else if (pos === 'right') {
      bubble.style.left = (anchorRect.left - 228) + 'px';
      bubble.style.top = (anchorRect.top + anchorRect.height / 2 - 20) + 'px';
      bubble.style.borderBottomLeftRadius = '4px';
      bubble.style.borderBottomRightRadius = '16px';
    }

    document.body.appendChild(bubble);
    setTimeout(() => bubble.remove(), 2800);
  }

  /** Show a modal message overlay with an OK button. */
  showMessage(text, callback) {
    document.getElementById('message-text').innerHTML = text.replace(/\n/g, '<br>');
    document.getElementById('message-overlay').classList.remove('hidden');
    this._messageCallback = callback;
  }

  /** Show a brief auto-play banner (e.g. "Auto-playing only move"). */
  _showAutoPlayBanner(text) {
    const existing = document.querySelector('.auto-play-banner');
    if (existing) existing.remove();
    const banner = document.createElement('div');
    banner.className = 'auto-play-banner';
    banner.innerHTML = `⚡ ${text}`;
    document.body.appendChild(banner);
    setTimeout(() => { banner.classList.add('fade-out'); }, 1500);
    setTimeout(() => banner.remove(), 2000);
  }

  /** Hide the message overlay and invoke the stored callback. */
  hideMessage() {
    document.getElementById('message-overlay').classList.add('hidden');
    if (this._messageCallback) {
      const cb = this._messageCallback;
      this._messageCallback = null;
      cb();
    }
  }

  /** Refreshes scoreboard, end-sum display, boneyard count, turn indicator, and player hand rendering. */
  _updateUI() {
    // Score bar at top
    const scoreBar = document.getElementById('score-bar-content');
    if (scoreBar) {
      const roundLabel = this._roundNum ? `<span style="font-weight:900;font-size:1.3rem;background:linear-gradient(180deg,#ffe080,#f0b840);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:1px;">${this._t('round')} ${this._roundNum}</span>` : '';
      if (this.teamMode && this.teams) {
        scoreBar.innerHTML = `
          ${roundLabel}
          <div class="sb-team" style="border-color:rgba(100,200,130,0.3);">
            <span class="sb-team-name">🟢 ${this.teams[0].name}</span>
            <span class="sb-team-score">${this.teams[0].score}</span>
          </div>
          <span class="sb-vs">VS</span>
          <div class="sb-team" style="border-color:rgba(220,100,80,0.3);">
            <span class="sb-team-name">🔴 ${this.teams[1].name}</span>
            <span class="sb-team-score">${this.teams[1].score}</span>
          </div>
          <span class="sb-target">${this._t('playingTo')} ${this.targetScore}</span>
        `;
        // Animate score changes (team mode)
        requestAnimationFrame(() => {
          scoreBar.querySelectorAll('.sb-ps-score, .sb-team-score').forEach(el => {
            el.classList.remove('score-bump');
            void el.offsetWidth;
            el.classList.add('score-bump');
          });
        });
      } else {
        let html = roundLabel;
        for (const p of this.players) {
          const isCurrent = p.index === this.currentPlayer;
          html += `<div class="sb-player-score" style="${isCurrent ? 'border-color:rgba(232,167,53,0.4);background:rgba(232,167,53,0.1);' : ''}">
            <span class="sb-ps-name">${escHTML(p.name)}</span>
            <span class="sb-ps-score">${p.score}</span>
          </div>`;
        }
        html += `<span class="sb-target">${this._t('playingTo')} ${this.targetScore}</span>`;
        scoreBar.innerHTML = html;
        // Animate score changes
        requestAnimationFrame(() => {
          scoreBar.querySelectorAll('.sb-ps-score, .sb-team-score').forEach(el => {
            el.classList.remove('score-bump');
            void el.offsetWidth;
            el.classList.add('score-bump');
          });
        });
      }
    }

    // End sum display — hide until after first play of the round
    const endSumPanel = document.getElementById('end-sum-display');
    if (endSumPanel) {
      endSumPanel.style.visibility = this.board.tiles.length <= 1 ? 'hidden' : '';
    }
    const endSum = this.board.getEndSum();
    const endScore = this.board.getScore();
    const sumEl = document.getElementById('end-sum-value');
    sumEl.textContent = endSum;
    sumEl.style.color = endScore > 0 ? '#4aaf6c' : '#e8a735';

    const breakdownEl = document.getElementById('end-sum-breakdown');
    const scoreEl = document.getElementById('end-sum-score');
    if (this.board.isEmpty) {
      breakdownEl.textContent = '';
      scoreEl.textContent = '';
    } else {
      breakdownEl.textContent = this.board.getEndSumBreakdown();
      scoreEl.textContent = endScore > 0 ? `${this._t('scores')} ${endScore}!` : this._t('noScore');
      scoreEl.style.color = endScore > 0 ? '#4aaf6c' : 'rgba(255,255,255,0.4)';
    }

    // Last played tile SVG
    const lastTileEl = document.getElementById('last-played-tile');
    if (lastTileEl && this.placements.length > 0) {
      const last = this.placements[this.placements.length - 1];
      const t = last.tile;
      if (t) {
        const lpSkin = getSkinColors();
        const pipPos = (n, s) => {
          const m = {0:[],1:[[0,0]],2:[[-s,-s],[s,s]],3:[[-s,-s],[0,0],[s,s]],4:[[-s,-s],[s,-s],[-s,s],[s,s]],5:[[-s,-s],[s,-s],[0,0],[-s,s],[s,s]],6:[[-s,-s],[s,-s],[-s,0],[s,0],[-s,s],[s,s]]};
          return m[n]||[];
        };
        const dots = (val, cy) => pipPos(val, 7).map(([x,y]) =>
          `<circle cx="${22+x}" cy="${cy+y}" r="3.5" fill="${lpSkin.pip}"/>`
        ).join('');
        lastTileEl.innerHTML = `
          <div style="text-align:center;">
            <div style="font-size:0.55rem;opacity:0.4;margin-bottom:3px;text-transform:uppercase;letter-spacing:1px;">${this._t('lastPlayed')}</div>
            <svg width="44" height="80" viewBox="0 0 44 80" style="filter:drop-shadow(0 0 8px rgba(232,167,53,0.5));">
              <rect x="1" y="1" width="42" height="78" rx="6" fill="url(#ltg)" stroke="#e8a735" stroke-width="2"/>
              <defs><linearGradient id="ltg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lpSkin.face}"/><stop offset="1" stop-color="${lpSkin.faceDark}"/></linearGradient></defs>
              <line x1="8" y1="40" x2="36" y2="40" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>
              ${dots(t.a, 20)}
              ${dots(t.b, 60)}
            </svg>
          </div>
        `;
      }
    } else if (lastTileEl) {
      lastTileEl.innerHTML = '';
    }

    // Update music intensity based on score closeness
    if (this.music && this.players) {
      const maxScore = Math.max(...this.players.map(p => p.score));
      const rawIntensity = Math.min(1, maxScore / this.targetScore);
      // Cap at 0.4 during gameplay — full intensity only at game end
      this.music.setIntensity(rawIntensity * 0.4);
    }

    // Reactive board theme — felt color shifts as game gets intense
    if (this.players && this.targetScore) {
      const maxScore = Math.max(...this.players.map(p => p.score));
      const progress = Math.min(1, maxScore / this.targetScore);
      const boardArea = document.getElementById('board-area');
      if (boardArea) {
        if (progress > 0.8) {
          // Final stretch — intense red/orange pulsing glow
          const intensity = (progress - 0.8) * 5; // 0→1
          boardArea.style.boxShadow = `inset 0 0 ${80 + intensity * 60}px rgba(232, 60, 30, ${0.15 + intensity * 0.2}), inset 0 0 ${20 + intensity * 40}px rgba(255, 80, 40, ${0.1 + intensity * 0.15})`;
        } else if (progress > 0.5) {
          // Heating up — warm amber glow
          const intensity = (progress - 0.5) * 3.3; // 0→1
          boardArea.style.boxShadow = `inset 0 0 ${40 + intensity * 50}px rgba(232, 167, 53, ${0.05 + intensity * 0.1})`;
        } else if (progress > 0.25) {
          // Early game — subtle green energy
          const intensity = (progress - 0.25) * 4; // 0→1
          boardArea.style.boxShadow = `inset 0 0 ${30 + intensity * 30}px rgba(74, 175, 108, ${0.03 + intensity * 0.05})`;
        } else {
          boardArea.style.boxShadow = '';
        }
      }
    }

    // Last played info in the end-sum panel
    const turnLeft = document.getElementById('end-sum-left');
    if (turnLeft && this.players && this.placements && this.placements.length > 0) {
      const lastPlayerIdx = this._lastPlayedBy;
      const lp = lastPlayerIdx !== undefined ? this.players[lastPlayerIdx] : null;
      if (lp) {
        const label = lp.isHuman ? this._t('youPlayed') : `${escHTML(lp.name)} ${this._t('played')}`;
        turnLeft.innerHTML = `
          <img class="turn-avatar" src="${lp.avatar}" alt="${escHTML(lp.name)}">
          <div class="turn-name">${label}</div>
        `;
      }
    } else if (turnLeft) {
      turnLeft.innerHTML = '';
    }

    // Turn toast notification — suppress during countdown/announcement
    if (this._suppressToast) return this._renderHand();

    // Hand (show current human player's hand)
    this._renderHand();

    // Floating arrow
    this._updateFloatingArrow();
  }

  /** Update the floating arrow that points to the current player's position. */
  _updateFloatingArrow() {
    const arrow = document.getElementById('floating-arrow');
    if (!arrow || !this.players || this.players.length === 0) return;

    // Hide arrow during countdown/announcement
    if (this._suppressToast) {
      arrow.style.display = 'none';
      return;
    }
    arrow.style.display = '';

    const idx = this.currentPlayer;
    let pos = 'bottom';
    if (idx !== 0) {
      const opponents = this.players.filter(p => p.index !== 0);
      if (this.teamMode && opponents.length === 3) {
        const partner = opponents.find(p => p.team === 0);
        const opps = opponents.filter(p => p.team !== 0);
        const map = [
          { player: opps[0], pos: 'left' },
          { player: partner, pos: 'top' },
          { player: opps[1], pos: 'right' }
        ];
        const found = map.find(m => m.player && m.player.index === idx);
        if (found) pos = found.pos;
      } else {
        let posMap;
        if (opponents.length === 1) posMap = ['top'];
        else if (opponents.length === 2) posMap = ['left', 'right'];
        else posMap = ['left', 'top', 'right'];
        const oppIdx = opponents.findIndex(p => p.index === idx);
        if (oppIdx >= 0) pos = posMap[oppIdx % posMap.length];
      }
    }

    arrow.classList.remove('point-up', 'point-left', 'point-right');

    // Use actual DOM element positions
    const aw = arrow.offsetWidth || 60;
    const ah = arrow.offsetHeight || 60;

    switch (pos) {
      case 'bottom': {
        const el = document.getElementById('player-hand');
        if (el) {
          const r = el.getBoundingClientRect();
          arrow.style.left = (r.left + r.width / 2 - aw / 2) + 'px';
          arrow.style.top = (r.top - ah - 4) + 'px';
        }
        break;
      }
      case 'top': {
        arrow.classList.add('point-up');
        const el = document.getElementById('opponent-top');
        if (el) {
          const r = el.getBoundingClientRect();
          arrow.style.left = (r.left + r.width / 2 - aw / 2) + 'px';
          arrow.style.top = (r.bottom + 4) + 'px';
        }
        break;
      }
      case 'left': {
        arrow.classList.add('point-left');
        const el = document.getElementById('opponent-left');
        if (el) {
          const r = el.getBoundingClientRect();
          arrow.style.left = (r.right + 4) + 'px';
          arrow.style.top = (r.top + r.height / 2 - ah / 2) + 'px';
        }
        break;
      }
      case 'right': {
        arrow.classList.add('point-right');
        const el = document.getElementById('opponent-right');
        if (el) {
          const r = el.getBoundingClientRect();
          arrow.style.left = (r.left - aw - 4) + 'px';
          arrow.style.top = (r.top + r.height / 2 - ah / 2) + 'px';
        }
        break;
      }
    }
  }

  /** Render the human player's hand tiles as interactive DOM elements. */
  _renderHand() {
      const container = document.getElementById('player-hand');
      container.innerHTML = '';

      const human = this.players[0];
      human.hand.sort((a, b) => a.pips - b.pips);

      const isMyTurn = this.currentPlayer === 0 && human.isHuman;
      let tileIdx = 0;
      for (const tile of human.hand) {
        const playable = isMyTurn && !this._suppressToast && this.board.canPlay(tile) && !this.board.isEmpty;
        const matchCount = playable ? this.board.getValidPlacements(tile).length : 0;
        const el = this.renderer.drawHandTile(
          container, tile, playable,
          (t, el) => this._onTileClick(t, el),
          isMyTurn ? (t) => this._onTileHover(t) : null,
          isMyTurn ? () => this._onTileLeave() : null,
          matchCount,
          isMyTurn ? (t, el, x, y) => this._onDragStart(t, el, x, y) : null
        );
        // Stagger entrance animation
        el.style.animationDelay = `${tileIdx * 0.05}s`;
        tileIdx++;
      }

      if (!isMyTurn) {
        document.getElementById('draw-btn').disabled = true;
        document.getElementById('pass-btn').style.display = 'none';
        document.getElementById('hint-btn').disabled = true;
      }

      // Human info bar — update without destroying the controls
      const humanInfo = document.getElementById('human-info');
      if (humanInfo) {
        // Apply human green gradient — matches teammate/felt
        const hc = human.color || { h: 140, s: 60, l: 40 };
        humanInfo.style.background = `linear-gradient(0deg, hsla(${hc.h},${hc.s}%,${hc.l}%,0.25), hsla(${hc.h},${Math.max(hc.s-20,10)}%,${Math.max(hc.l-30,5)}%,0.5))`;
        humanInfo.style.borderTop = `2px solid hsla(${hc.h},${hc.s}%,${hc.l}%,0.2)`;

        const rec = getRecord(human.name);
        const score = this.teamMode && this.teams ? this.teams[human.team].score : human.score;
        const isTurn = this.currentPlayer === 0;
        const turnLabel = isTurn ? `<span style="color:#f0b840;font-size:0.8rem;font-weight:700;">${this._t('yourTurn')}</span>` : '';

        let infoSection = humanInfo.querySelector('.human-info-section');
        if (!infoSection) {
          infoSection = document.createElement('div');
          infoSection.className = 'human-info-section';
          infoSection.style.display = 'flex';
          infoSection.style.alignItems = 'center';
          infoSection.style.gap = '12px';
          humanInfo.insertBefore(infoSection, humanInfo.firstChild);
        }
        const avatarBorder = isTurn ? `hsla(${hc.h},${hc.s}%,${hc.l+20}%,0.8)` : `hsla(${hc.h},${hc.s}%,${hc.l+10}%,0.4)`;
        infoSection.innerHTML = `
          <img class="human-avatar" src="${human.avatar}" alt="${human.name}" style="border-color:${avatarBorder};${isTurn ? 'box-shadow:0 0 16px hsla('+hc.h+','+hc.s+'%,'+(hc.l+20)+'%,0.4);' : ''}">
          <div class="human-info-text">
            <span class="human-name" id="human-name-label" style="cursor:pointer;" title="Double-click to edit">${human.name} ${turnLabel}</span>
            <span class="human-record">${rec.wins}W ${rec.losses}L</span>
            <span class="pip-count">${human.hand.reduce((s,t) => s + t.pips, 0)} ${this._t('pipsInHand')}</span>
          </div>
        `;

        // Double-click to edit name
        const nameLabel = document.getElementById('human-name-label');
        if (nameLabel && !nameLabel._dblBound) {
          nameLabel._dblBound = true;
          nameLabel.addEventListener('dblclick', () => {
            const current = getPlayerName();
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'name-edit';
            input.value = current;
            input.maxLength = 12;
            input.style.width = '120px';
            input.style.fontSize = '0.9rem';
            nameLabel.replaceWith(input);
            input.focus();
            input.select();
            const finish = () => {
              const newName = input.value.trim() || _tUI('playerName');
              setPlayerName(newName);
              if (this.players && this.players[0]) this.players[0].name = newName;
              this._updateUI();
            };
            input.addEventListener('blur', finish);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); finish(); } });
          });
        }
      }

      this._renderOpponentHands();
      this._renderBoneyard();
    }

  /** Render all AI opponent panels (avatars, face-down tiles, thinking indicators). */
  _renderOpponentHands() {
    const opponents = this.players.filter(p => p.index !== 0);
    const positions = ['top', 'left', 'right'];

    for (const pos of positions) {
      const el = document.getElementById('opponent-' + pos);
      if (el) el.innerHTML = '';
    }

    let assignments;
    if (this.teamMode && opponents.length === 3) {
      const partner = opponents.find(p => p.team === 0);
      const opps = opponents.filter(p => p.team !== 0);
      // Clockwise: left(opp1) → top(partner) → right(opp2)
      assignments = [
        { pos: 'left', player: opps[0] },
        { pos: 'top', player: partner },
        { pos: 'right', player: opps[1] }
      ];
    } else {
      // Position based on opponent count:
      // 1 opponent: top (across)
      // 2 opponents: left, right
      // 3 opponents: left, top, right (clockwise)
      let posMap;
      if (opponents.length === 1) posMap = ['top'];
      else if (opponents.length === 2) posMap = ['left', 'right'];
      else posMap = ['left', 'top', 'right'];
      assignments = opponents.map((p, i) => ({ pos: posMap[i % posMap.length], player: p }));
    }

    for (const { pos, player } of assignments) {
      const el = document.getElementById('opponent-' + pos);
      if (!el || !player) continue;

      const isVertical = pos === 'left' || pos === 'right';
      const isTurn = player.index === this.currentPlayer;
      const isTeammate = this.teamMode && player.team === 0;
      const rec = getRecord(player.name);
      const teamIcon = isTeammate ? '🤝 ' : '';
      const teamLabel = this.teamMode ? (isTeammate
        ? `<span style="font-size:0.6rem;color:#4aaf6c;font-weight:700;">${this._t('teammate')}</span>`
        : `<span style="font-size:0.6rem;color:#e04a3a;font-weight:700;">${this._t('opps')}</span>`) : '';

      // Apply player color gradient — from their color to a darker shade of same hue
      const c = player.color || { h: 0, s: 0, l: 50 };
      const light = `hsla(${c.h},${c.s}%,${c.l}%,0.3)`;
      const dark = `hsla(${c.h},${Math.max(c.s - 20, 10)}%,${Math.max(c.l - 30, 5)}%,0.5)`;
      if (pos === 'top') {
        el.style.background = `linear-gradient(180deg, ${light}, ${dark})`;
        el.style.borderBottom = `2px solid hsla(${c.h},${c.s}%,${c.l}%,0.25)`;
      } else if (pos === 'left') {
        el.style.background = `linear-gradient(90deg, ${light}, ${dark})`;
        el.style.borderRight = `2px solid hsla(${c.h},${c.s}%,${c.l}%,0.25)`;
      } else {
        el.style.background = `linear-gradient(-90deg, ${light}, ${dark})`;
        el.style.borderLeft = `2px solid hsla(${c.h},${c.s}%,${c.l}%,0.25)`;
      }

      // Avatar border color
      const avatarBorder = `hsla(${c.h},${c.s}%,${c.l + 15}%,0.6)`;

      const label = document.createElement('div');
      label.className = 'opp-label' + (isTurn ? ' active-turn' : '');
      const score = this.teamMode && this.teams ? this.teams[player.team].score : player.score;
      label.innerHTML = `
        <img class="opp-avatar" src="${player.avatar}" alt="${escHTML(player.name)}" style="border-color:${avatarBorder};">
        <div class="opp-info">
          <span class="opp-name${isTurn ? ' active-turn' : ''}" style="${!isTurn ? 'color:hsla(' + c.h + ',' + c.s + '%,' + (c.l + 30) + '%,0.9);' : ''}">${teamIcon}${escHTML(player.name)}</span>
          ${teamLabel}
          <span class="opp-record">${rec.wins}W ${rec.losses}L</span>
          ${player.personality ? '<span class="personality-badge">' + player.personality.icon + ' ' + _tUI(player.personality.name) + '</span>' : ''}
        </div>
      `;
      el.appendChild(label);

      // Thinking indicator
      if (isTurn) {
        const think = document.createElement('div');
        think.className = 'opp-thinking';
        think.innerHTML = `${this._t('thinking')}<span class="thinking-dots"><span></span><span></span><span></span></span>`;
        el.appendChild(think);
      }

      // Face-down tiles
      const tilesWrap = document.createElement('div');
      tilesWrap.style.display = 'flex';
      tilesWrap.style.gap = '3px';
      tilesWrap.style.flexWrap = 'wrap';
      tilesWrap.style.justifyContent = 'center';
      tilesWrap.style.marginTop = '6px';
      if (isVertical) tilesWrap.style.flexDirection = 'column';

      for (let i = 0; i < player.hand.length; i++) {
        const t = document.createElement('div');
        t.className = 'face-down' + (isVertical ? ' vertical' : '');
        // Tint face-down tiles with player color
        const tc = player.color || { h: 0, s: 0, l: 50 };
        t.style.background = `linear-gradient(160deg, hsla(${tc.h},${tc.s - 20}%,${tc.l + 40}%,1), hsla(${tc.h},${tc.s - 10}%,${tc.l + 25}%,1))`;
        t.style.borderColor = `hsla(${tc.h},${tc.s}%,${tc.l + 10}%,0.4)`;
        tilesWrap.appendChild(t);
      }
      el.appendChild(tilesWrap);

      // Low tile warning — domino call-out
      if (player.hand.length <= 2 && player.hand.length > 0 && !this.board.isEmpty) {
        const warn = document.createElement('div');
        warn.className = 'low-tiles-warn' + (player.hand.length === 1 ? ' last-tile-alert' : '');
        warn.textContent = player.hand.length === 1 ? this._t('lastTile') : `⚠️ 2 ${this._t('tilesLeft')}!`;
        el.appendChild(warn);
      }
    }
  }

  /** Render the boneyard tile count and visual tile backs. */
  _renderBoneyard() {
    const tilesEl = document.getElementById('boneyard-tiles');
    const labelEl = document.getElementById('boneyard-count');
    if (!tilesEl || !labelEl) return;

    tilesEl.innerHTML = '';
    labelEl.textContent = this.boneyard.length;

    const count = this.boneyard.length;
    if (count === 0) return;

    // Seeded random for stable layout
    let seed = 42;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };

    const skin = getSkinColors();
    // Show a neat stacked pile — max ~12 visible tiles for performance
    const visible = Math.min(count, 12);
    for (let i = 0; i < visible; i++) {
      const t = document.createElement('div');
      t.className = 'bone-tile';
      // Stack with slight offsets for 3D depth effect
      const stackOffset = i * 1.2;
      const jitterX = (rand() - 0.5) * 8;
      const jitterY = (rand() - 0.5) * 4;
      const angle = (rand() - 0.5) * 30;
      t.style.left = (50 + jitterX) + 'px';
      t.style.top = (10 + jitterY - stackOffset) + 'px';
      t.style.transform = `rotate(${angle}deg)`;
      t.style.zIndex = i;
      t.style.background = `linear-gradient(160deg, ${skin.face}, ${skin.faceDark})`;
      t.style.borderColor = skin.border;
      t.style.boxShadow = `0 ${1 + i * 0.3}px ${2 + i * 0.5}px rgba(0,0,0,${0.15 + i * 0.02})`;
      tilesEl.appendChild(t);
    }
  }
  /** Render the stats and achievements overlay content. */
  _renderStats() {
    const container = document.getElementById('stats-content');
    if (!container) return;
    const s = getGameStats();
    const pName = getPlayerName();
    const rec = getRecord(pName);
    const total = rec.wins + rec.losses;
    const winRate = total > 0 ? Math.round(rec.wins / total * 100) : 0;
    const unlocked = getUnlockedAchievements();

    container.innerHTML = `
      <div class="stat-section">
        <div class="stat-section-title">${this._t('overall')}</div>
        <div class="stat-row"><span class="stat-label">${this._t('gamesPlayed')}</span><span class="stat-value">${s.gamesPlayed || 0}</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('winsLosses')}</span><span class="stat-value">${rec.wins}W ${rec.losses}L</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('winRate')}</span><span class="stat-value">${winRate}%</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('bestStreak')}</span><span class="stat-value">${s.bestStreak || 0}</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('totalScored')}</span><span class="stat-value">${s.totalScore || 0}</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('highestPlay')}</span><span class="stat-value">${s.highestPlayScore || 0}</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('highestBonus')}</span><span class="stat-value">${s.highestRoundScore || 0}</span></div>
      </div>
      <div class="stat-section">
        <div class="stat-section-title">${this._t('lifetime')}</div>
        <div class="stat-row"><span class="stat-label">${this._t('totalTiles')}</span><span class="stat-value">${s.totalTilesPlayed || 0}</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('totalDraws')}</span><span class="stat-value">${s.totalDraws || 0}</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('totalPasses')}</span><span class="stat-value">${s.totalPasses || 0}</span></div>
      </div>
      <div class="stat-section">
        <div class="stat-section-title">${this._t('achievements')} (${unlocked.length}/${ACHIEVEMENTS.length})</div>
        ${ACHIEVEMENTS.map(a => {
          const isUnlocked = unlocked.includes(a.id);
          return `<div class="achievement-row ${isUnlocked ? 'unlocked' : 'locked'}">
            <span class="achievement-icon">${a.icon}</span>
            <div class="achievement-info">
              <div class="achievement-name">${_tUI(a.name)}</div>
              <div class="achievement-desc">${_tUI(a.desc)}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="stat-section" style="margin-top:24px;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <button id="export-data-btn" class="gm-btn" style="flex:1;background:rgba(90,138,240,0.15);border:1px solid rgba(90,138,240,0.3);color:#5a8af0;">${this._t('exportData')}</button>
          <button id="import-data-btn" class="gm-btn" style="flex:1;background:rgba(74,175,108,0.15);border:1px solid rgba(74,175,108,0.3);color:#4aaf6c;">${this._t('importData')}</button>
        </div>
        <input type="file" id="import-file-input" accept=".json" style="display:none;">
        <button id="reset-stats-btn" class="gm-btn" style="width:100%;background:rgba(224,74,58,0.15);border:1px solid rgba(224,74,58,0.3);color:#e04a3a;">${this._t('resetStats')}</button>
      </div>
    `;

    // Reset stats button handler
    const resetBtn = document.getElementById('reset-stats-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm(this._t('resetConfirm'))) {
          localStorage.removeItem('domino_stats');
          localStorage.removeItem('domino_game_stats');
          localStorage.removeItem('domino_achievements');
          localStorage.removeItem('domino_xp');
          this._renderStats();
        }
      });
    }
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const blob = new Blob([exportGameData()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'dominoes27-save.json'; a.click();
        URL.revokeObjectURL(url);
      });
    }
    const importBtn = document.getElementById('import-data-btn');
    const importFile = document.getElementById('import-file-input');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          if (importGameData(reader.result)) {
            this._renderStats();
            this._updateXPBar();
            this._applyLocale();
          }
        };
        reader.readAsText(file);
        importFile.value = '';
      });
    }
  }
  /** Render the preferences overlay (theme, skin, sound, music, trash talk, colorblind toggles). */
  _renderPrefs() {
      const container = document.getElementById('prefs-content');
      if (!container) return;
      const currentSkin = getTileSkin();
      const currentName = getPlayerName();
      const musicOn = this.music && this.music.enabled;
      const sfxOn = !this._soundMuted;

      const currentTheme = this._theme || 'dark';
      const currentLang = localStorage.getItem('domino_lang') || detectBrowserLang();

      container.innerHTML = `
        <div class="pref-group">
          <div class="pref-label">${getLocale(currentLang).ui.playerName || 'Player Name'}</div>
          <input type="text" id="pref-name-input" class="name-edit" maxlength="12" value="${currentName}" style="width:100%;">
        </div>
        <div class="pref-group">
          <div class="pref-label">${getLocale(currentLang).ui.language || 'Language'}</div>
          <div class="skin-options" style="grid-template-columns: repeat(4, 1fr);" id="pref-lang-options">
            ${Object.entries(LOCALES).map(([code, loc]) => `
              <div class="skin-option ${code === currentLang ? 'active' : ''}" data-lang="${code}">
                <span style="font-size:1.2rem;">${loc.flag}</span><span>${loc.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="pref-group">
          <div class="pref-label">${getLocale(currentLang).ui.theme || 'Theme'}</div>
          <div class="skin-options" style="grid-template-columns: repeat(2, 1fr);">
            <div class="skin-option ${currentTheme === 'dark' ? 'active' : ''}" data-theme-val="dark">
              <div class="skin-preview" style="background:linear-gradient(135deg,#1e7a35,#0d3a18);"></div>
              <span>${this._t('darkTheme')}</span>
            </div>
            <div class="skin-option ${currentTheme === 'light' ? 'active' : ''}" data-theme-val="light">
              <div class="skin-preview" style="background:linear-gradient(135deg,#e8f5e9,#a5d6a7);"></div>
              <span>${this._t('lightTheme')}</span>
            </div>
          </div>
        </div>
        <div class="pref-group">
          <div class="pref-label">${this._t('tileSkin')}</div>
          <div class="skin-options">
            ${TILE_SKINS.map(s => {
              const skinKey = 'skin' + s.id.charAt(0).toUpperCase() + s.id.slice(1);
              return `
              <div class="skin-option ${s.id === currentSkin ? 'active' : ''}" data-skin="${s.id}">
                <div class="skin-preview" style="background:linear-gradient(135deg,${s.face},${s.faceDark});border-color:${s.border};"></div>
                <span>${this._t(skinKey)}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="pref-group">
        <div class="pref-group">
          <div class="pref-label">${this._t('tableTheme')}</div>
          <div class="skin-options" id="table-theme-options"></div>
        </div>
          <div class="pref-label">${this._t('audio')}</div>
          <div class="toggle-row">
            <span>${this._t('music')}</span>
            <label class="toggle-switch">
              <input type="checkbox" id="music-toggle-cb" ${musicOn ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="toggle-row">
            <span>${this._t('sfx')}</span>
            <label class="toggle-switch">
              <input type="checkbox" id="sfx-toggle-cb" ${sfxOn ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div class="pref-group">
          <div class="pref-label">${this._t('gameSpeed')}</div>
          <div class="skin-options" style="grid-template-columns: repeat(3, 1fr);" id="pref-speed-options">
            <div class="skin-option ${this._gameSpeed === 'fast' ? 'active' : ''}" data-speed="fast">
              <span>🐇</span><span>${this._t('fast').replace(/^\S+\s/,'')}</span>
            </div>
            <div class="skin-option ${this._gameSpeed === 'normal' ? 'active' : ''}" data-speed="normal">
              <span>🎯</span><span>${this._t('normal').replace(/^\S+\s/,'')}</span>
            </div>
            <div class="skin-option ${this._gameSpeed === 'slow' ? 'active' : ''}" data-speed="slow">
              <span>🐢</span><span>${this._t('slow').replace(/^\S+\s/,'')}</span>
            </div>
          </div>
        </div>
        <div class="pref-group">
          <div class="pref-label">${this._t('trashTalk')}</div>
          <div class="skin-options" style="grid-template-columns: repeat(4, 1fr);" id="pref-trash-talk">
            <div class="skin-option ${this._trashTalkFreq === 0 ? 'active' : ''}" data-trash="0"><span>🔇</span><span>${this._t('off')}</span></div>
            <div class="skin-option ${this._trashTalkFreq === 1 ? 'active' : ''}" data-trash="1"><span>🤫</span><span>${this._t('low')}</span></div>
            <div class="skin-option ${this._trashTalkFreq === 2 ? 'active' : ''}" data-trash="2"><span>💬</span><span>${this._t('normal').replace(/^\S+\s/,'')}</span></div>
            <div class="skin-option ${this._trashTalkFreq === 3 ? 'active' : ''}" data-trash="3"><span>🗣️</span><span>${this._t('max')}</span></div>
          </div>
        </div>
        <div class="pref-group">
          <div class="pref-label">${this._t('accessibility')}</div>
          <div class="toggle-row">
            <span>${this._t('colorblind')}</span>
            <label class="toggle-switch">
              <input type="checkbox" id="colorblind-toggle-cb" ${this._colorblindMode ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      `;

      // Name change
      const nameInput = document.getElementById('pref-name-input');
      if (nameInput) {
        nameInput.addEventListener('change', () => {
          const name = nameInput.value.trim() || _tUI('playerName');
          setPlayerName(name);
          if (this.players && this.players[0]) this.players[0].name = name;
          this._updateUI();
        });
      }

      // Populate table themes
    const tableOpts = document.getElementById('table-theme-options');
    if (tableOpts) {
      tableOpts.innerHTML = TABLE_THEMES.map(t => {
        const tableKey = 'table' + t.id.charAt(0).toUpperCase() + t.id.slice(1);
        return `
        <div class="skin-option ${t.id === getTableTheme() ? 'active' : ''}" data-table="${t.id}">
          <div class="skin-preview" style="background:linear-gradient(135deg,${t.felt},${t.dark});"></div>
          <span>${this._t(tableKey)}</span>
        </div>`;
      }).join('');
      tableOpts.querySelectorAll('.skin-option').forEach(el => {
        el.addEventListener('click', () => {
          setTableTheme(el.dataset.table);
          this._renderPrefs();
        });
      });
    }

    // Skin click handlers
      container.querySelectorAll('.skin-option[data-skin]').forEach(el => {
        el.addEventListener('click', () => {
          setTileSkin(el.dataset.skin);
          this._renderPrefs();
          this._renderBoard();
        });
      });

      // Theme click handlers
      container.querySelectorAll('.skin-option[data-theme-val]').forEach(el => {
        el.addEventListener('click', () => {
          this._theme = el.dataset.themeVal;
          localStorage.setItem('domino_theme', this._theme);
          document.body.setAttribute('data-theme', this._theme);
          this._renderPrefs();
          if (this.renderer) this._renderBoard();
        });
      });

      // Music toggle
      const musicCb = document.getElementById('music-toggle-cb');
      if (musicCb) {
        musicCb.addEventListener('change', () => {
          if (this.music) {
            if (!this.music._chillTrack) this.music.init();
            this.music.toggle();
          }
        });
      }

      // SFX toggle
      const sfxCb = document.getElementById('sfx-toggle-cb');
      if (sfxCb) {
        sfxCb.addEventListener('change', () => {
          this._soundMuted = !sfxCb.checked;
          localStorage.setItem('domino_muted', this._soundMuted ? '1' : '0');
        });
      }

      // Speed toggle in prefs
      const speedOpts = document.getElementById('pref-speed-options');
      if (speedOpts) {
        speedOpts.querySelectorAll('.skin-option').forEach(el => {
          el.addEventListener('click', () => {
            this._gameSpeed = el.dataset.speed;
            localStorage.setItem('domino_speed', this._gameSpeed);
            const menuGroup = document.getElementById('game-speed');
            if (menuGroup) {
              menuGroup.querySelectorAll('.btn-option').forEach(b => b.classList.toggle('active', b.dataset.value === this._gameSpeed));
            }
            this._renderPrefs();
          });
        });
      }

      // Trash talk toggle
      const trashOpts = document.getElementById('pref-trash-talk');
      if (trashOpts) {
        trashOpts.querySelectorAll('.skin-option').forEach(el => {
          el.addEventListener('click', () => {
            this._trashTalkFreq = parseInt(el.dataset.trash);
            localStorage.setItem('domino_trash_talk', this._trashTalkFreq);
            this._renderPrefs();
          });
        });
      }

      // Colorblind toggle
      const cbCb = document.getElementById('colorblind-toggle-cb');
      if (cbCb) {
        cbCb.addEventListener('change', () => {
          this._colorblindMode = cbCb.checked;
          localStorage.setItem('domino_colorblind', this._colorblindMode ? '1' : '0');
          document.body.classList.toggle('colorblind', this._colorblindMode);
          if (this.renderer) this._renderBoard();
          this._renderHand();
        });
      }

      // Language toggle
      const langOpts = document.getElementById('pref-lang-options');
      if (langOpts) {
        langOpts.querySelectorAll('.skin-option').forEach(el => {
          el.addEventListener('click', () => {
            const lang = el.dataset.lang;
            localStorage.setItem('domino_lang', lang);
            PHRASES = _buildPhrases(lang);
            document.documentElement.dir = getLocale(lang).dir || 'ltr';
            this._previewNames = null;
            this._previewPersonalities = null;
            this._applyLocale();
            this._updateRoster();
            this._renderPrefs();
          });
        });
      }
    }

  /** Update the XP progress bar below the player's hand. */
  _updateXPBar() {
    const wrap = document.getElementById('xp-bar-wrap');
    if (!wrap) return;
    const xp = getXPProgress();
    wrap.innerHTML = `
      <span class="xp-level">Lv.${xp.level}</span>
      <div class="xp-bar"><div class="xp-fill" style="width:${xp.pct}%"></div></div>
    `;
  }


  /** Render the tile tracker grid showing which tiles have been played, are in hand, or are unknown. */
  _renderTracker() {
    const grid = document.getElementById('tracker-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const skin = getSkinColors();
    const played = new Set();
    for (const p of this.placements) {
      if (p.tile) played.add(`${Math.min(p.tile.a,p.tile.b)}-${Math.max(p.tile.a,p.tile.b)}`);
    }
    const pipPos = (n, s) => ({0:[],1:[[0,0]],2:[[-s,-s],[s,s]],3:[[-s,-s],[0,0],[s,s]],4:[[-s,-s],[s,-s],[-s,s],[s,s]],5:[[-s,-s],[s,-s],[0,0],[-s,s],[s,s]],6:[[-s,-s],[s,-s],[-s,0],[s,0],[-s,s],[s,s]]}[n]||[]);
    const halfSVG = (val, cy, w) => pipPos(val, w*0.18).map(([x,y]) =>
      `<circle cx="${w/2+x}" cy="${cy+y}" r="${w*0.08}" fill="${skin.pip}"/>`
    ).join('');

    for (let a = 0; a <= 6; a++) {
      for (let b = a; b <= 6; b++) {
        const key = `${a}-${b}`;
        const isPlayed = played.has(key);
        if (isPlayed) continue; // Only show unplayed tiles
        const el = document.createElement('div');
        el.className = 'tracker-tile unplayed';
        const tw = 40, th = 72;
        el.style.background = `linear-gradient(160deg, ${skin.face}, ${skin.faceDark})`;
        el.style.border = `1.5px solid ${skin.border}`;
        el.innerHTML = `<svg width="${tw}" height="${th}" viewBox="0 0 ${tw} ${th}">
          <line x1="${tw*0.2}" y1="${th/2}" x2="${tw*0.8}" y2="${th/2}" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>
          ${halfSVG(a, th*0.25, tw)}
          ${halfSVG(b, th*0.75, tw)}
        </svg>`;
        grid.appendChild(el);
      }
    }
  }

  /**
   * Compute post-game analysis stats for the human player.
   * @returns {{plays: number, draws: number, totalScored: number, bestPlay: number, avgScore: string, scoringPlays: number}}
   */
  _getAnalysis() {
    if (!this.gameLog) return {};
    const pName = this.players[0] ? this.players[0].name : _tUI('playerName');
    const myPlays = this.gameLog.filter(e => e.player === pName && e.action === 'play');
    const myDraws = this.gameLog.filter(e => e.player === pName && e.action === 'draw');
    const myScores = myPlays.filter(e => e.score > 0);
    const totalScored = myScores.reduce((s, e) => s + e.score, 0);
    const bestPlay = myScores.length > 0 ? Math.max(...myScores.map(e => e.score)) : 0;
    const avgScore = myPlays.length > 0 ? Math.round(totalScored / myPlays.length * 10) / 10 : 0;
    return { plays: myPlays.length, draws: myDraws.length, totalScored, bestPlay, avgScore, scoringPlays: myScores.length };
  }
  /** Render the game log overlay with all play, draw, pass, and round-end entries. */
  _renderLog() {
    const container = document.getElementById('log-entries');
    if (!container) return;
    container.innerHTML = '';

    if (!this.gameLog || this.gameLog.length === 0) {
      container.innerHTML = `<div style="opacity:0.4;text-align:center;padding:20px;">${this._t('noMovesYet')}</div>`;
      return;
    }

    const pipPos = (n, s) => {
      switch(n) {
        case 0: return [];
        case 1: return [[0,0]];
        case 2: return [[-s,-s],[s,s]];
        case 3: return [[-s,-s],[0,0],[s,s]];
        case 4: return [[-s,-s],[s,-s],[-s,s],[s,s]];
        case 5: return [[-s,-s],[s,-s],[0,0],[-s,s],[s,s]];
        case 6: return [[-s,-s],[s,-s],[-s,0],[s,0],[-s,s],[s,s]];
        default: return [];
      }
    };
    const makeTileHTML = (tileStr) => {
      const parts = tileStr.split('|');
      const a = parseInt(parts[0]), b = parseInt(parts[1]);
      const half = (val) => {
        const dots = pipPos(val, 5).map(([x,y]) =>
          `<span class="log-pip" style="left:${9+x}px;top:${9+y}px;"></span>`
        ).join('');
        return `<span class="log-tile-half">${dots}</span>`;
      };
      return `<span class="log-tile">${half(a)}<span class="log-tile-div"></span>${half(b)}</span>`;
    };

    if (!this.gameLog || this.gameLog.length === 0) {
      container.innerHTML = `<div style="opacity:0.4;text-align:center;padding:20px;">${this._t('noMovesYet')}</div>`;
      return;
    }

    for (let i = this.gameLog.length - 1; i >= 0; i--) {
      const entry = this.gameLog[i];
      const div = document.createElement('div');

      if (entry.action === 'round-end') {
        // Round summary entry
        div.className = 'log-entry log-round-end';
        let scoresHtml = '';
        if (entry.scores) {
          scoresHtml = Object.entries(entry.scores).map(([name, s]) =>
            `<span style="margin-right:8px;">${escHTML(name)}: <span style="color:#f0b840;font-weight:800;">${s}</span></span>`
          ).join('');
        }
        div.innerHTML = `
          <span class="log-num">—</span>
          <div style="flex:1;">
            <div style="font-weight:700;color:#f0b840;margin-bottom:4px;">🏁 Round ${entry.round || '?'} — ${escHTML(entry.detail)}</div>
            <div style="font-size:0.75rem;opacity:0.6;">${scoresHtml}</div>
          </div>
        `;
        container.appendChild(div);
        continue;
      }

      let cls = 'log-entry';
      if (entry.score > 0) cls += ' log-score-entry';
      if (entry.action === 'draw') cls += ' log-draw-entry';
      div.className = cls;

      let detail = '';
      if (entry.action === 'play') {
        detail = `${this._t('played')} ${makeTileHTML(entry.tile)} on ${entry.end}`;
        if (entry.score > 0) detail += ` <span class="log-score">+${entry.score}</span>`;
        if (entry.moveTime) detail += ` <span class="move-timer">${entry.moveTime}s</span>`;
      } else if (entry.action === 'draw') {
        detail = `<span class="log-action">${this._t('draw')}</span>`;
      } else if (entry.action === 'pass') {
        detail = `<span class="log-action">${this._t('pass')}</span>`;
      }

      // Running scores
      let scoresHtml = '';
      if (entry.scores) {
        scoresHtml = '<div style="font-size:0.7rem;opacity:0.4;margin-top:2px;">' +
          Object.entries(entry.scores).map(([name, s]) => `${escHTML(name)}:${s}`).join(' · ') +
          '</div>';
      }

      div.innerHTML = `
        <span class="log-num">${entry.turn}</span>
        <img class="log-avatar" src="${entry.avatar}" alt="${escHTML(entry.player)}">
        <div><span class="log-name">${escHTML(entry.player)}</span> ${detail}${scoresHtml}</div>
      `;
      container.appendChild(div);
    }

    container.scrollTop = 0;
  }

  /** Render the board on canvas, optionally highlighting valid placement ends. */
  _renderBoard(highlightEnds, animProgress, flyFrom) {
    if (!this.renderer) return;
    this.renderer.renderFromPlacements(this.placements, this.placements.length - 1, animProgress, flyFrom);

      // Draw end highlights if choosing (in world-space, inside the view transform)
      if (highlightEnds && highlightEnds.length > 0) {
        const ctx = this.renderer.ctx;
        const scale = this.renderer._viewScale || 1;
        const offX = this.renderer._viewOffsetX || 0;
        const offY = this.renderer._viewOffsetY || 0;

        ctx.save();
        ctx.translate(offX, offY);
        ctx.scale(scale, scale);

        for (const p of highlightEnds) {
          const pos = this._getEndPosition(p.end);
          if (pos) {
            // Predict score for this placement
            let predLabel = p.end.toUpperCase();
            const activeTile = this._hoverTile || this.selectedTile;
            if (activeTile) {
              const sim = Board.clone(this.board);
              sim.placeTile(activeTile, p);
              const predScore = sim.getScore();
              predLabel = predScore > 0 ? `${p.end.toUpperCase()}\n+${predScore}` : p.end.toUpperCase();
              if (predScore > 0) {
                ctx.fillStyle = 'rgba(74, 175, 108, 0.35)';
                ctx.strokeStyle = '#4aaf6c';
              } else {
                ctx.fillStyle = 'rgba(232, 167, 53, 0.25)';
                ctx.strokeStyle = '#e8a735';
              }
            } else {
              ctx.fillStyle = 'rgba(232, 167, 53, 0.25)';
              ctx.strokeStyle = '#e8a735';
            }
            ctx.save();
            ctx.lineWidth = 3;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 35, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Ghost tile preview
            if (activeTile) {
              ctx.globalAlpha = 0.3;
              const isDouble = activeTile.isDouble;
              const gw = (p.end === 'left' || p.end === 'right') ? (isDouble ? this.renderer.tileW : this.renderer.tileH) : (isDouble ? this.renderer.tileH : this.renderer.tileW);
              const gh = (p.end === 'left' || p.end === 'right') ? (isDouble ? this.renderer.tileH : this.renderer.tileW) : (isDouble ? this.renderer.tileW : this.renderer.tileH);
              ctx.fillStyle = 'rgba(232,167,53,0.4)';
              ctx.strokeStyle = 'rgba(232,167,53,0.6)';
              ctx.lineWidth = 2;
              const rx = pos.x - gw/2, ry = pos.y - gh/2;
              ctx.beginPath();
              ctx.roundRect ? ctx.roundRect(rx, ry, gw, gh, 7) : ctx.rect(rx, ry, gw, gh);
              ctx.fill();
              ctx.stroke();
              ctx.globalAlpha = 1;
            }

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const lines = predLabel.split('\n');
            if (lines.length > 1) {
              ctx.font = 'bold 11px sans-serif';
              ctx.fillText(lines[0], pos.x, pos.y - 8);
              ctx.font = 'bold 16px sans-serif';
              ctx.fillText(lines[1], pos.x, pos.y + 8);
            } else {
              ctx.fillText(predLabel, pos.x, pos.y);
            }
            ctx.restore();
          }
        }

        ctx.restore();
      }
    }
}

// --- Start ---
const game = new Game();
window.game = game;
