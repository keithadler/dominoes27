/**
 * @file stats.js — Statistics, achievements, and XP system for All Fives Dominoes.
 *
 * Persists all data to localStorage. Provides:
 *  - Win/loss records per player name
 *  - Rank system (Newcomer → Rookie → ... → Domino Master) based on win ratio
 *  - Game stats tracking (games played, win streaks, high scores, etc.)
 *  - Achievement system (17 achievements with locale-aware names via `_tUI` keys)
 *  - XP / leveling system with per-achievement XP rewards
 *  - Player name management
 *
 * @dependency locales.js (_tUI, getLocale, detectBrowserLang)
 */

// ---------------------------------------------------------------------------
// Win / Loss Tracking
// ---------------------------------------------------------------------------

/**
 * Load all player win/loss records from localStorage.
 * @returns {Object<string, {wins: number, losses: number}>}
 */
function getStats() {
  try { return JSON.parse(localStorage.getItem('domino_stats') || '{}'); } catch(e) { return {}; }
}
/**
 * Persist stats object to localStorage.
 * @param {Object<string, {wins: number, losses: number}>} stats
 */
function saveStats(stats) {
  localStorage.setItem('domino_stats', JSON.stringify(stats));
}
/**
 * Increment win count for a player.
 * @param {string} name
 */
function recordWin(name) {
  const s = getStats();
  if (!s[name]) s[name] = { wins: 0, losses: 0 };
  s[name].wins++;
  saveStats(s);
}
/**
 * Increment loss count for a player.
 * @param {string} name
 */
function recordLoss(name) {
  const s = getStats();
  if (!s[name]) s[name] = { wins: 0, losses: 0 };
  s[name].losses++;
  saveStats(s);
}
/**
 * Get a player's win/loss record.
 * @param {string} name
 * @returns {{wins: number, losses: number}}
 */
function getRecord(name) {
  const s = getStats();
  return s[name] || { wins: 0, losses: 0 };
}
/**
 * Derive a rank title from a player's win/loss ratio.
 * Ranks: Newcomer → Rookie → Beginner → Apprentice → Regular → Veteran → Domino Master.
 * @param {string} name
 * @returns {string} Localized rank title.
 */
function getRank(name) {
  const r = getRecord(name);
  const total = r.wins + r.losses;
  if (total === 0) return _tUI('newcomer');
  const ratio = r.wins / total;
  if (total < 3) return _tUI('rookie');
  if (ratio >= 0.75) return _tUI('dominoMaster');
  if (ratio >= 0.6) return _tUI('veteran');
  if (ratio >= 0.45) return _tUI('regular');
  if (ratio >= 0.3) return _tUI('apprentice');
  return _tUI('beginner');
}

/**
 * Seed a plausible win/loss record for a new AI player.
 * Win rate is based on difficulty so AI players have realistic-looking stats.
 * @param {string} name
 * @param {'easy'|'medium'|'hard'} difficulty
 */
function seedAIRecord(name, difficulty) {
  const s = getStats();
  if (s[name]) return; // already has a record
  const total = 10 + Math.floor(Math.random() * 40);
  let winRate;
  if (difficulty === 'easy') winRate = 0.2 + Math.random() * 0.2;
  else if (difficulty === 'medium') winRate = 0.4 + Math.random() * 0.2;
  else winRate = 0.6 + Math.random() * 0.25;
  const wins = Math.round(total * winRate);
  s[name] = { wins, losses: total - wins };
  saveStats(s);
}

// ---------------------------------------------------------------------------
// Custom Player Name
// ---------------------------------------------------------------------------

/**
 * Get the human player's display name (falls back to locale default).
 * @returns {string}
 */
function getPlayerName() {
  return localStorage.getItem('domino_player_name') || _tUI('playerName');
}
/**
 * Save the human player's display name.
 * @param {string} name
 */
function setPlayerName(name) {
  localStorage.setItem('domino_player_name', name || _tUI('playerName'));
}

// ---------------------------------------------------------------------------
// Game Stats (aggregate play statistics)
// ---------------------------------------------------------------------------

/**
 * Load aggregate game stats from localStorage.
 * @returns {object}
 */
function getGameStats() {
  try { return JSON.parse(localStorage.getItem('domino_game_stats') || '{}'); } catch(e) { return {}; }
}
/** @param {object} s */
function saveGameStats(s) { localStorage.setItem('domino_game_stats', JSON.stringify(s)); }

/**
 * Increment or update a single game stat.
 *
 * Supported keys: gamesPlayed, gamesWon, roundScore, playScore,
 * totalScore, winStreak, loseStreak, totalTilesPlayed, totalDraws, totalPasses.
 *
 * @param {string} key   - Stat key to update.
 * @param {number} [value] - Value (used by score/count keys).
 */
function trackStat(key, value) {
  const s = getGameStats();
  if (key === 'gamesPlayed') s.gamesPlayed = (s.gamesPlayed || 0) + 1;
  else if (key === 'gamesWon') s.gamesWon = (s.gamesWon || 0) + 1;
  else if (key === 'roundScore' && value > (s.highestRoundScore || 0)) s.highestRoundScore = value;
  else if (key === 'playScore' && value > (s.highestPlayScore || 0)) s.highestPlayScore = value;
  else if (key === 'totalScore') s.totalScore = (s.totalScore || 0) + value;
  else if (key === 'winStreak') { s.currentStreak = (s.currentStreak || 0) + 1; s.bestStreak = Math.max(s.bestStreak || 0, s.currentStreak); }
  else if (key === 'loseStreak') s.currentStreak = 0;
  else if (key === 'totalTilesPlayed') s.totalTilesPlayed = (s.totalTilesPlayed || 0) + value;
  else if (key === 'totalDraws') s.totalDraws = (s.totalDraws || 0) + value;
  else if (key === 'totalPasses') s.totalPasses = (s.totalPasses || 0) + value;
  saveGameStats(s);
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

/**
 * All 17 achievements. `name` and `desc` are _tUI locale keys.
 * @type {{id: string, icon: string, name: string, desc: string}[]}
 */
const ACHIEVEMENTS = [
  { id: 'first_win', icon: '🏆', name: 'achFirstVictory', desc: 'achFirstVictoryDesc' },
  { id: 'five_star', icon: '⭐', name: 'achFiveStar', desc: 'achFiveStarDesc' },
  { id: 'shutout', icon: '🚫', name: 'achShutout', desc: 'achShutoutDesc' },
  { id: 'streak_3', icon: '🔥', name: 'achOnFire', desc: 'achOnFireDesc' },
  { id: 'streak_5', icon: '💎', name: 'achUnstoppable', desc: 'achUnstoppableDesc' },
  { id: 'score_20', icon: '💰', name: 'achBigScore', desc: 'achBigScoreDesc' },
  { id: 'score_25', icon: '🎯', name: 'achPerfectPlay', desc: 'achPerfectPlayDesc' },
  { id: 'games_10', icon: '🎮', name: 'achRegular', desc: 'achRegularDesc' },
  { id: 'games_50', icon: '👑', name: 'achDominoMaster', desc: 'achDominoMasterDesc' },
  { id: 'domino_win', icon: '🦴', name: 'achCleanSweep', desc: 'achCleanSweepDesc' },
  { id: 'no_hint_win', icon: '🧠', name: 'achNoHelp', desc: 'achNoHelpDesc' },
  { id: 'score_3_row', icon: '🔥', name: 'achHatTrick', desc: 'achHatTrickDesc' },
  { id: 'comeback_win', icon: '🔄', name: 'achComebackKid', desc: 'achComebackKidDesc' },
  { id: 'blocked_win', icon: '🧱', name: 'achRoadblock', desc: 'achRoadblockDesc' },
  { id: 'speed_demon', icon: '⚡', name: 'achSpeedDemon', desc: 'achSpeedDemonDesc' },
  { id: 'tiles_500', icon: '🎲', name: 'achTileVeteran', desc: 'achTileVeteranDesc' },
  { id: 'streak_10', icon: '🌟', name: 'achLegendary', desc: 'achLegendaryDesc' },
];
/**
 * Get the list of unlocked achievement IDs.
 * @returns {string[]}
 */
function getUnlockedAchievements() {
  try { return JSON.parse(localStorage.getItem('domino_achievements') || '[]'); } catch(e) { return []; }
}
/**
 * Unlock an achievement by ID. Awards 25 XP on first unlock.
 * @param {string} id - Achievement ID.
 * @returns {boolean} True if newly unlocked, false if already had it.
 */
function unlockAchievement(id) {
  const unlocked = getUnlockedAchievements();
  if (unlocked.includes(id)) return false;
  unlocked.push(id);
  localStorage.setItem('domino_achievements', JSON.stringify(unlocked));
  addXP(25); // XP reward for achievements
  return true;
}
/**
 * Evaluate all achievement conditions and unlock any that are newly met.
 * @param {Game} [game] - Current game instance (needed for context-dependent checks).
 */
function checkAchievements(game) {
  const s = getGameStats();
  const checks = [
    ['first_win', (s.gamesWon || 0) >= 1],
    ['streak_3', (s.bestStreak || 0) >= 3],
    ['streak_5', (s.bestStreak || 0) >= 5],
    ['streak_10', (s.bestStreak || 0) >= 10],
    ['games_10', (s.gamesPlayed || 0) >= 10],
    ['games_50', (s.gamesPlayed || 0) >= 50],
    ['tiles_500', (s.totalTilesPlayed || 0) >= 500],
    ['speed_demon', game && game._gameSpeed === 'fast' && (game.teamMode ? game.teams[0].score >= game.teams[1].score : game.players.reduce((a, b) => a.score > b.score ? a : b).isHuman)],
    ['no_hint_win', game && !game._usedHint && (game.teamMode ? game.teams[0].score >= game.teams[1].score : game.players.reduce((a, b) => a.score > b.score ? a : b).isHuman)],
  ];
  for (const [id, cond] of checks) {
    if (cond && unlockAchievement(id)) showAchievementPopup(id);
  }
}
/**
 * Show a toast-style popup when an achievement is unlocked.
 * @param {string} id - Achievement ID.
 */
function showAchievementPopup(id) {
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (!ach) return;
  const el = document.createElement('div');
  el.className = 'achievement-popup';
  el.innerHTML = `<span class="ach-icon">${ach.icon}</span><div><div class="ach-label">${_tUI('achievementUnlocked')}</div><div class="ach-text">${_tUI(ach.name)}</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ---------------------------------------------------------------------------
// XP / Leveling
// ---------------------------------------------------------------------------

/**
 * Load XP data from localStorage.
 * @returns {{xp: number, level: number}}
 */
function getXP() {
  try { return JSON.parse(localStorage.getItem('domino_xp') || '{"xp":0,"level":1}'); } catch(e) { return {xp:0,level:1}; }
}
/**
 * Award XP and handle level-ups (100 × level XP per level).
 * @param {number} amount - XP to add.
 * @returns {{xp: number, level: number}}
 */
function addXP(amount) {
  const data = getXP();
  data.xp += amount;
  const xpPerLevel = 100;
  while (data.xp >= data.level * xpPerLevel) {
    data.xp -= data.level * xpPerLevel;
    data.level++;
  }
  localStorage.setItem('domino_xp', JSON.stringify(data));
  return data;
}
/**
 * Get current XP progress toward the next level.
 * @returns {{level: number, xp: number, needed: number, pct: number}}
 */
function getXPProgress() {
  const data = getXP();
  const needed = data.level * 100;
  return { level: data.level, xp: data.xp, needed, pct: Math.round(data.xp / needed * 100) };
}

/**
 * Export all game data (stats, achievements, XP, settings) as a JSON string.
 * @returns {string} JSON blob of all localStorage domino_ keys.
 */
function exportGameData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('domino_')) data[key] = localStorage.getItem(key);
  }
  return JSON.stringify(data, null, 2);
}

/**
 * Import game data from a JSON string, overwriting existing data.
 * Only allows known domino_ keys to prevent injection.
 * @param {string} json - JSON blob from exportGameData().
 * @returns {boolean} True if import succeeded.
 */
function importGameData(json) {
  const ALLOWED_KEYS = new Set([
    'domino_stats', 'domino_game_stats', 'domino_achievements', 'domino_xp',
    'domino_player_name', 'domino_human_avatar', 'domino_lang', 'domino_lang_chosen',
    'domino_theme', 'domino_speed', 'domino_music', 'domino_muted',
    'domino_table_theme', 'domino_tile_skin', 'domino_tutorial_done',
    'domino_trash_talk', 'domino_colorblind', 'domino_last_played',
    'domino_saved_game'
  ]);
  try {
    const data = JSON.parse(json);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
    for (const [key, value] of Object.entries(data)) {
      if (ALLOWED_KEYS.has(key) && typeof value === 'string') {
        localStorage.setItem(key, value);
      }
    }
    return true;
  } catch(e) { return false; }
}
