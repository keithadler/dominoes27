/**
 * @file ui-helpers.js — UI utilities, theming, and content systems for All Fives Dominoes.
 *
 * A grab-bag of presentation-layer helpers:
 *  - Avatar URLs (DiceBear API)
 *  - AI trash talk phrase system (generation-based: gen_z, millennial, gen_x, boomer)
 *  - Random name picker from locale
 *  - Table themes (green, blue, red, purple, wood) with felt-style CSS vars
 *  - Tile skins (classic, marble, wood, neon, gold, midnight)
 *  - Interactive tutorial system (9 steps, fully localized)
 *  - AI personality definitions (aggressive, defensive, chaotic, calculated, bully)
 *  - Particle and confetti effects
 *
 * @dependency locales.js  (_tUI, getLocale, detectBrowserLang, getLocalePhrase, LOCALES)
 * @dependency stats.js    (getRecord)
 */

// ---------------------------------------------------------------------------
// Avatars
// ---------------------------------------------------------------------------

/**
 * Generate a DiceBear Personas avatar URL for a given seed.
 * @param {string} seed - Unique seed (e.g. player name).
 * @returns {string} SVG avatar URL.
 */
function avatarURL(seed) {
  return `https://api.dicebear.com/9.x/open-peeps/svg?seed=${encodeURIComponent(seed)}&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
// ---------------------------------------------------------------------------
// Trash Talk / Celebration Phrases
// ---------------------------------------------------------------------------

/** Available AI generation archetypes for phrase selection. */
const PHRASE_GENS = ['gen_z', 'millennial', 'gen_x', 'boomer'];

/**
 * Build a phrase lookup table from locale data.
 * Organizes phrases by category (opponent, teammate, draw, domino)
 * and tier (low, mid, high) based on win ratio.
 *
 * @param {string} [lang] - Locale code (defaults to 'en').
 * @returns {Object<string, {low: string[], mid: string[], high: string[]}>}
 * @private
 */
function _buildPhrases(lang) {
  const loc = getLocale(lang || 'en');
  const catMap = { o: 'opponent', t: 'teammate', d: 'draw', w: 'domino' };
  const tierMap = ['low', 'mid', 'high'];
  const phrases = {};
  for (const [ck, cv] of Object.entries(catMap)) {
    phrases[cv] = { low: [], mid: [], high: [] };
    for (const gen of ['z', 'm', 'x', 'b']) {
      if (loc.p && loc.p[gen] && loc.p[gen][ck]) {
        for (let ti = 0; ti < 3; ti++) {
          phrases[cv][tierMap[ti]].push(...(loc.p[gen][ck][ti] || []));
        }
      }
    }
  }
  return phrases;
}
let PHRASES = _buildPhrases(localStorage.getItem('domino_lang') || detectBrowserLang());

/**
 * Pick a contextual trash-talk or celebration phrase for an AI player.
 *
 * Tier is derived from the player's win ratio; generation-specific
 * phrases are preferred when available.
 *
 * @param {Player} player   - The AI player speaking.
 * @param {string} category - 'opponent'|'teammate'|'draw'|'domino'.
 * @returns {string} A phrase, or empty string if none available.
 */
function getPhrase(player, category) {
  const rec = getRecord(player.name);
  const total = rec.wins + rec.losses;
  const ratio = total > 0 ? rec.wins / total : 0.5;
  let tier;
  if (ratio >= 0.6) tier = 'high';
  else if (ratio >= 0.35) tier = 'mid';
  else tier = 'low';

  const lang = localStorage.getItem('domino_lang') || detectBrowserLang();
  const gen = player.generation;
  if (gen) {
    const phrase = getLocalePhrase(lang, gen, category, tier);
    if (phrase) return phrase;
  }

  const pool = PHRASES[category] && PHRASES[category][tier];
  if (!pool || pool.length === 0) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}


/**
 * Get or create a persistent avatar seed for the human player.
 * @returns {string}
 */
function getHumanAvatarSeed() {
  let seed = localStorage.getItem('domino_human_avatar');
  if (!seed) {
    seed = 'human-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('domino_human_avatar', seed);
  }
  return seed;
}

// ---------------------------------------------------------------------------
// Random Names (from locale)
// ---------------------------------------------------------------------------

/** @type {string[]} Locale-specific name pool. */
const REAL_NAMES = (getLocale(localStorage.getItem('domino_lang') || detectBrowserLang())).names;
/** @type {string[]} Locale-specific city pool. */
const US_CITIES = (getLocale(localStorage.getItem('domino_lang') || detectBrowserLang())).cities;

/**
 * Pick random name/city pairs from the current locale.
 * @param {number} count - How many names to pick.
 * @returns {{name: string, city: string}[]}
 */
function pickRandomNames(count) {
  const lang = localStorage.getItem('domino_lang') || detectBrowserLang();
  const loc = getLocale(lang);
  const names = [...(loc.names || LOCALES.en.names)].sort(() => Math.random() - 0.5);
  const cities = [...(loc.cities || LOCALES.en.cities)].sort(() => Math.random() - 0.5);
  return names.slice(0, count).map((name, i) => ({
    name,
    city: cities[i % cities.length]
  }));
}

// ---------------------------------------------------------------------------
// Table Themes
// ---------------------------------------------------------------------------

/**
 * Available table felt themes. 'random' picks one at random each game.
 * @type {{id: string, name: string, felt: string, dark: string}[]}
 */
const TABLE_THEMES = [
  { id: 'random', name: 'Random', felt: '', dark: '' },
  { id: 'green', name: 'Classic Green', felt: '#1e7a35', dark: '#0d3a18' },
  { id: 'blue', name: 'Ocean Blue', felt: '#1a4a7a', dark: '#0a2a4a' },
  { id: 'red', name: 'Casino Red', felt: '#7a1a2a', dark: '#3a0a14' },
  { id: 'purple', name: 'Royal Purple', felt: '#4a1a6a', dark: '#2a0a3a' },
  { id: 'wood', name: 'Wooden', felt: '#6a4a2a', dark: '#3a2a14' },
];
/** @returns {string} Current table theme ID from localStorage. */
function getTableTheme() { return localStorage.getItem('domino_table_theme') || 'random'; }

/**
 * Set and apply a table theme.
 * @param {string} id - Theme ID.
 */
function setTableTheme(id) {
  localStorage.setItem('domino_table_theme', id);
  applyTableTheme();
}
/**
 * Apply the current table theme by setting CSS custom properties
 * and injecting a body::before gradient override.
 */
function applyTableTheme() {
  const id = getTableTheme();
  let t;
  if (id === 'random') {
    const real = TABLE_THEMES.filter(t => t.id !== 'random');
    t = real[Math.floor(Math.random() * real.length)];
  } else {
    t = TABLE_THEMES.find(t => t.id === id) || TABLE_THEMES[1];
  }
  document.body.style.setProperty('--felt', t.felt);
  document.body.style.setProperty('--dark', t.dark);
  const before = document.querySelector('body');
  // Update the body::before gradient via a style override
  let style = document.getElementById('theme-style');
  if (!style) { style = document.createElement('style'); style.id = 'theme-style'; document.head.appendChild(style); }
  style.textContent = `body::before { background: radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%), radial-gradient(ellipse at 50% 50%, ${t.felt} 0%, ${t.dark} 80%) !important; }`;
}
applyTableTheme();

// ---------------------------------------------------------------------------
// Season Themes
// ---------------------------------------------------------------------------

/**
 * Detect a seasonal theme based on the current month.
 * @returns {'halloween'|'christmas'|'summer'|null}
 */
function getSeasonTheme() {
  const month = new Date().getMonth();
  if (month === 9) return 'halloween';
  if (month === 11) return 'christmas';
  if (month >= 5 && month <= 7) return 'summer';
  return null;
}

// ---------------------------------------------------------------------------
// Tutorial System
// ---------------------------------------------------------------------------

/**
 * Generate an inline SVG of a domino tile for tutorial visuals.
 *
 * @param {number}  a         - Top half pip count.
 * @param {number}  b         - Bottom half pip count.
 * @param {number}  [w=50]    - Width in px.
 * @param {number}  [h=90]    - Height in px.
 * @param {boolean} [highlight] - If true, draw a golden highlight border.
 * @returns {string} SVG markup.
 */
function tutTileSVG(a, b, w, h, highlight) {
  const pw = w || 50, ph = h || 90;
  const pipPos = (n, s) => ({0:[],1:[[0,0]],2:[[-s,-s],[s,s]],3:[[-s,-s],[0,0],[s,s]],4:[[-s,-s],[s,-s],[-s,s],[s,s]],5:[[-s,-s],[s,-s],[0,0],[-s,s],[s,s]],6:[[-s,-s],[s,-s],[-s,0],[s,0],[-s,s],[s,s]]}[n]||[]);
  const dots = (val, cy) => pipPos(val, pw*0.14).map(([x,y]) => `<circle cx="${pw/2+x}" cy="${cy+y}" r="${pw*0.07}" fill="#333"/>`).join('');
  const stroke = highlight ? '#f0b840' : 'rgba(160,150,120,0.5)';
  const sw = highlight ? 2.5 : 1.5;
  const glow = highlight ? `filter="drop-shadow(0 0 6px rgba(232,167,53,0.5))"` : '';
  return `<svg class="tut-tile-svg" width="${pw}" height="${ph}" viewBox="0 0 ${pw} ${ph}" ${glow}>
    <defs><linearGradient id="tf${a}${b}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffef8"/><stop offset=".3" stop-color="#f5f0dc"/><stop offset="1" stop-color="#e8e0c4"/></linearGradient></defs>
    <rect x="1" y="1" width="${pw-2}" height="${ph-2}" rx="${pw*0.12}" fill="url(#tf${a}${b})" stroke="${stroke}" stroke-width="${sw}"/>
    <line x1="${pw*0.2}" y1="${ph/2}" x2="${pw*0.8}" y2="${ph/2}" stroke="rgba(0,0,0,0.12)" stroke-width="1.5"/>
    ${dots(a, ph*0.25)} ${dots(b, ph*0.75)}
  </svg>`;
}


/**
 * The 9 interactive tutorial steps. Each step has a localized title,
 * body text, and a visual callback that returns HTML.
 * @type {{title: string, body: string, visual: function(): string}[]}
 */
const TUTORIAL_STEPS = [
  {
    get title() { return _tUI('tutWelcomeTitle'); },
    get body() { return _tUI('tutWelcomeBody'); },
    visual: () => `<div class="tut-visual">${tutTileSVG(5,5,60,108,true)} ${tutTileSVG(6,4,60,108)} ${tutTileSVG(3,2,60,108)} ${tutTileSVG(1,0,60,108)}</div>`
  },
  {
    get title() { return _tUI('tut28Title'); },
    get body() { return _tUI('tut28Body'); },
    visual: () => `<div class="tut-visual">${tutTileSVG(0,0,44,80)} ${tutTileSVG(1,2,44,80)} ${tutTileSVG(3,5,44,80)} ${tutTileSVG(6,6,44,80)} <span style="opacity:0.4;font-size:0.9rem;">${_tUI('tut28Visual')}</span></div>`
  },
  {
    get title() { return _tUI('tutFirstTitle'); },
    get body() { return _tUI('tutFirstBody'); },
    visual: () => `<div class="tut-visual">${tutTileSVG(6,6,70,126,true)}</div><div style="text-align:center;opacity:0.5;font-size:0.85rem;">${_tUI('tutFirstVisual')}</div>`
  },
  {
    get title() { return _tUI('tutTurnTitle'); },
    get body() { return _tUI('tutTurnBody'); },
    visual: () => `<div class="tut-visual">
      ${tutTileSVG(6,3,50,90)} <span class="tut-plus">→</span> ${tutTileSVG(6,6,50,90,true)} <span class="tut-plus">←</span> ${tutTileSVG(6,1,50,90)}
    </div><div style="text-align:center;opacity:0.5;font-size:0.85rem;">${_tUI('tutTurnVisual')}</div>`
  },
  {
    get title() { return _tUI('tutScoreTitle'); },
    get body() { return _tUI('tutScoreBody'); },
    visual: () => `<div class="tut-highlight">
      <div style="text-align:center;opacity:0.6;font-size:0.85rem;">${_tUI('tutScoreVisual')}</div>
      <div class="tut-score-example">${_tUI('tutScoreExample')}</div>
    </div>`
  },
  {
    get title() { return _tUI('tutDoubleTitle'); },
    get body() { return _tUI('tutDoubleBody'); },
    visual: () => `<div class="tut-visual">${tutTileSVG(4,4,50,90,true)}</div>
    <div class="tut-highlight"><div style="text-align:center;">${_tUI('tutDoubleVisual')}</div></div>`
  },
  {
    get title() { return _tUI('tutSpinnerTitle'); },
    get body() { return _tUI('tutSpinnerBody'); },
    visual: () => `<div class="tut-visual" style="flex-direction:column;gap:4px;">
      <div>${tutTileSVG(5,5,40,72)}</div>
      <div style="display:flex;align-items:center;gap:4px;">${tutTileSVG(3,5,40,72)} ${tutTileSVG(5,5,40,72,true)} ${tutTileSVG(5,2,40,72)}</div>
      <div>${tutTileSVG(5,1,40,72)}</div>
    </div><div style="text-align:center;opacity:0.5;font-size:0.8rem;">${_tUI('tutSpinnerVisual')}</div>`
  },
  {
    get title() { return _tUI('tutRoundTitle'); },
    get body() { return _tUI('tutRoundBody'); },
    visual: () => `<div class="tut-highlight"><div style="text-align:center;">Opponent has ${tutTileSVG(3,6,36,64)} ${tutTileSVG(2,2,36,64)} ${_tUI('tutRoundVisual')}<br><span style="opacity:0.6;font-size:0.85rem;">${_tUI('tutRoundBonus')}</span></div></div>`
  },
  {
    get title() { return _tUI('tutReadyTitle'); },
    get body() { return _tUI('tutReadyBody'); },
    visual: () => `<div style="text-align:center;font-size:3.5rem;margin:16px 0;">🏆🦴🔥</div>`
  }
];

/**
 * Show the interactive tutorial overlay. Steps can be navigated
 * forward/back or skipped entirely.
 *
 * @param {Function} [onClose] - Callback when tutorial is dismissed.
 */
function showTutorial(onClose) {
  let step = 0;
  const overlay = document.getElementById('tutorial-overlay');
  const content = document.getElementById('tutorial-step-content');
  const dots = document.getElementById('tut-dots');
  const prevBtn = document.getElementById('tut-prev');
  const nextBtn = document.getElementById('tut-next');

  function render() {
    const s = TUTORIAL_STEPS[step];
    content.innerHTML = `
      <div class="tut-title">${s.title}</div>
      <div class="tut-subtitle">${_tUI('step')} ${step + 1} ${_tUI('stepOf')} ${TUTORIAL_STEPS.length}</div>
      ${s.visual ? s.visual() : ''}
      <div class="tut-body">${s.body}</div>
    `;
    dots.innerHTML = TUTORIAL_STEPS.map((_, i) =>
      `<div class="tut-dot ${i === step ? 'active' : ''}"></div>`
    ).join('');
    prevBtn.disabled = step === 0;
    nextBtn.textContent = step === TUTORIAL_STEPS.length - 1 ? _tUI('startPlaying') : _tUI('next');
  }

  prevBtn.onclick = () => { if (step > 0) { step--; render(); } };
  nextBtn.onclick = () => {
    if (step < TUTORIAL_STEPS.length - 1) { step++; render(); }
    else { overlay.classList.add('hidden'); localStorage.setItem('domino_tutorial_done', '1'); if (onClose) onClose(); }
  };
  document.getElementById('tut-skip').onclick = () => {
    overlay.classList.add('hidden');
    localStorage.setItem('domino_tutorial_done', '1');
    if (onClose) onClose();
  };

  overlay.classList.remove('hidden');
  render();
}

// ---------------------------------------------------------------------------
// AI Personalities
// ---------------------------------------------------------------------------

/**
 * AI personality definitions. Each personality has strategy tweaks
 * that modify the AI's scoring heuristics.
 *
 * @type {{id: string, name: string, desc: string, icon: string, tweaks: object}[]}
 */
const AI_PERSONALITIES = [
  { id: 'aggressive', name: 'aggressive', desc: 'Plays heavy tiles first, targets scoring', icon: '🔥',
    tweaks: { preferHeavy: 3, preferScore: 2, preferBlock: 0 } },
  { id: 'defensive', name: 'defensive', desc: 'Keeps options open, avoids risk', icon: '🛡️',
    tweaks: { preferHeavy: -1, preferScore: 1, preferBlock: 2 } },
  { id: 'chaotic', name: 'chaotic', desc: 'Unpredictable, random choices', icon: '🎲',
    tweaks: { preferHeavy: 0, preferScore: 0, preferBlock: 0, chaos: 5 } },
  { id: 'calculated', name: 'calculated', desc: 'Maximizes future options', icon: '🧠',
    tweaks: { preferHeavy: 0, preferScore: 1.5, preferBlock: 1, futureWeight: 3 } },
  { id: 'bully', name: 'bully', desc: 'Targets the leader, plays to block', icon: '😈',
    tweaks: { preferHeavy: 1, preferScore: 1, preferBlock: 4 } },
];

// ---------------------------------------------------------------------------
// Tile Skins
// ---------------------------------------------------------------------------

/**
 * Visual skin definitions for domino tiles.
 * Each skin defines face gradient colors, pip color, border, and 3D depth color.
 *
 * @type {{id: string, name: string, face: string, faceDark: string, pip: string, border: string, depth: string}[]}
 */
const TILE_SKINS = [
  { id: 'classic', name: 'Classic', face: '#fffef8', faceDark: '#e8e0c4', pip: '#333', border: 'rgba(160,150,120,0.6)', depth: '#b0a888' },
  { id: 'marble', name: 'Marble', face: '#f0f0f0', faceDark: '#d0d0d0', pip: '#444', border: 'rgba(180,180,180,0.5)', depth: '#a0a0a0' },
  { id: 'wood', name: 'Wood', face: '#d4a574', faceDark: '#a0703c', pip: '#2a1a0a', border: 'rgba(120,80,40,0.5)', depth: '#8a5a2a' },
  { id: 'neon', name: 'Neon', face: '#1a1a2e', faceDark: '#0a0a1e', pip: '#0ff', border: 'rgba(0,255,255,0.4)', depth: '#0a0a18' },
  { id: 'gold', name: 'Gold', face: '#fff8e0', faceDark: '#e8c860', pip: '#6a4a00', border: 'rgba(200,160,40,0.5)', depth: '#c09830' },
  { id: 'midnight', name: 'Midnight', face: '#2a2a3e', faceDark: '#1a1a2e', pip: '#f0b840', border: 'rgba(100,100,140,0.4)', depth: '#18182a' },
];

/** @returns {string} Current tile skin ID. */
function getTileSkin() {
  return localStorage.getItem('domino_tile_skin') || 'classic';
}
/**
 * Set the active tile skin.
 * @param {string} id - Skin ID.
 */
function setTileSkin(id) {
  localStorage.setItem('domino_tile_skin', id);
}
/**
 * Get the color palette for the currently selected tile skin.
 * @returns {{face: string, faceDark: string, pip: string, border: string, depth: string}}
 */
function getSkinColors() {
  const id = getTileSkin();
  return TILE_SKINS.find(s => s.id === id) || TILE_SKINS[0];
}

// ---------------------------------------------------------------------------
// Particle / Confetti Effects
// ---------------------------------------------------------------------------

/**
 * Spawn decorative particles that fly outward and fade.
 *
 * @param {number} x     - Origin X (px).
 * @param {number} y     - Origin Y (px).
 * @param {number} count - Number of particles.
 * @param {string} [type='particle-gold'] - CSS class ('particle-gold' or 'particle-confetti').
 */
function spawnParticles(x, y, count, type) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle ' + (type || 'particle-gold');
    const size = 4 + Math.random() * 6;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 80;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    p.style.transition = `all ${0.6 + Math.random() * 0.6}s ease-out`;
    if (type === 'particle-confetti') {
      p.style.background = ['#f0b840','#e04a3a','#4aaf6c','#5a8af0','#a855f7','#ff6b9d'][Math.floor(Math.random()*6)];
      p.style.width = (6 + Math.random() * 8) + 'px';
      p.style.height = (6 + Math.random() * 8) + 'px';
      p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    }
    document.body.appendChild(p);
    requestAnimationFrame(() => {
      p.style.left = (x + dx) + 'px';
      p.style.top = (y + dy) + 'px';
      p.style.opacity = '0';
    });
    setTimeout(() => p.remove(), 1500);
  }
}
/**
 * Spawn a full-screen confetti burst (60 particles staggered over ~3 s).
 */
function spawnConfetti() {
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const x = Math.random() * window.innerWidth;
      spawnParticles(x, -10, 1, 'particle-confetti');
    }, i * 50);
  }
}
