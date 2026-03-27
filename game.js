/**
 * @file game.js — Main game controller for All Fives Dominoes.
 * @author Keith Adler
 * @copyright 2026 Keith Adler. MIT License.
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

      // Build contextual speech bubbles based on game state
      const roundNum = (this._roundNum || 0) + 1;
      const introPhrases = this._buildIntroComments(roundNum);

      // Show avatar intro overlay — 2x2 grid layout
      const introEl = document.createElement('div');
      introEl.id = 'round-intro';
      introEl.style.cssText = 'position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;pointer-events:none;padding:20px;';

      const isSmall = window.innerWidth < 500;
      const avatarSize = isSmall ? 56 : 90;
      const grid = document.createElement('div');
      grid.style.cssText = `display:grid;grid-template-columns:1fr 1fr;gap:${isSmall ? '12px' : '24px'};max-width:${isSmall ? '340px' : '560px'};width:100%;`;

      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        const c = p.color || { h: 0, s: 50, l: 50 };
        const isHuman = p.isHuman;
        const phrase = introPhrases[i] || '';
        const rec = getRecord(p.name);
        const rankText = getRank(p.name);
        const teamBadge = this.teamMode ? (p.team === 0 ? '🤝' : '⚔️') : '';
        const score = this.teamMode && this.teams ? this.teams[p.team].score : p.score;

        const card = document.createElement('div');
        card.style.cssText = `
          display:flex;flex-direction:column;align-items:center;gap:${isSmall ? '4px' : '8px'};
          padding:${isSmall ? '10px 8px' : '16px 14px'};border-radius:16px;
          background:linear-gradient(145deg,hsla(${c.h},${c.s}%,${c.l}%,0.15),hsla(${c.h},${c.s}%,${Math.max(c.l-20,5)}%,0.25));
          border:2px solid hsla(${c.h},${c.s}%,${c.l+15}%,${isHuman ? '0.5' : '0.25'});
          opacity:0;transform:scale(0.7) translateY(20px);
          transition:all 0.5s cubic-bezier(0.34,1.56,0.64,1);
          position:relative;overflow:visible;
        `;

        card.innerHTML = `
          <img src="${p.avatar}" style="width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;border:3px solid hsla(${c.h},${c.s}%,${c.l+20}%,0.6);box-shadow:0 4px 16px rgba(0,0,0,0.5);">
          <div style="text-align:center;">
            <div style="font-weight:900;font-size:${isSmall ? '0.85rem' : '1.1rem'};color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.6);">${teamBadge} ${escHTML(p.name)}</div>
            <div style="font-size:${isSmall ? '0.55rem' : '0.7rem'};opacity:0.5;margin-top:2px;">${escHTML(rankText)} · ${rec.wins}W ${rec.losses}L${score > 0 ? ' · ' + score + ' pts' : ''}</div>
          </div>
          ${phrase ? `<div class="intro-bubble" style="
            font-size:${isSmall ? '0.65rem' : '0.8rem'};font-weight:600;color:#fff;
            background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);
            padding:${isSmall ? '4px 8px' : '6px 12px'};border-radius:10px;
            max-width:${isSmall ? '140px' : '200px'};text-align:center;line-height:1.3;
            opacity:0;transform:translateY(8px);
            transition:all 0.4s ease-out 0.3s;
          ">${phrase}</div>` : ''}
        `;

        grid.appendChild(card);
      }

      introEl.appendChild(grid);
      document.body.appendChild(introEl);

      // Stagger card fade-ins
      const cards = grid.children;
      for (let i = 0; i < cards.length; i++) {
        setTimeout(() => {
          cards[i].style.opacity = '1';
          cards[i].style.transform = 'scale(1) translateY(0)';
          // Fade in speech bubble after card appears
          const bubble = cards[i].querySelector('.intro-bubble');
          if (bubble) {
            setTimeout(() => {
              bubble.style.opacity = '1';
              bubble.style.transform = 'translateY(0)';
            }, 200);
          }
        }, introDelay + i * 200);
      }

      // After avatars shown, start deal BEHIND the player cards
      // (cards stay visible while bones fly to each player's card)
      const dealDelay = introDelay + cards.length * 200 + 800;
      setTimeout(() => {
        // Make boneyard visible for deal target
        if (boneyardArea) { boneyardArea.style.visibility = ''; boneyardArea.style.opacity = '1'; }

        // Deal tiles — they fly to each player's card position
        this._animateDealToCards(grid, () => {
          // NOW fade out the intro cards
          introEl.style.transition = 'opacity 0.5s ease';
          introEl.style.opacity = '0';
          setTimeout(() => introEl.remove(), 500);

          // Fade in all UI
          allUI.forEach(el => { if (el) { el.style.visibility = ''; el.style.transition = 'opacity 0.4s ease'; el.style.opacity = '1'; } });
          oppPanels.forEach(id => { const el = document.getElementById(id); if (el) { el.style.visibility = ''; el.style.transition = 'opacity 0.4s ease'; el.style.opacity = '1'; } });
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
        }); // end _animateDealToCards callback
      }, dealDelay); // end setTimeout for dealDelay
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
      bonusCalc = { bonus, recipient: this.teams[winTeamIdx].name, oppPips: teamPips[loseTeamIdx], partnerPips: teamPips[winTeamIdx] };
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
      let margin;
      if (this.teamMode && this.teams) {
        const sorted = [...this.teams].map(t => t.score).sort((a, b) => b - a);
        margin = sorted[0] - (sorted[1] || 0);
      } else {
        const scores = this.players.map(p => p.score).sort((a, b) => b - a);
        margin = scores[0] - (scores[1] || 0);
      }
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

}

// --- Start ---
const game = new Game();
window.game = game;
