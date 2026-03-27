// ============================================================
// ALL FIVES DOMINOES — Stats, Achievements & XP
// ============================================================

// --- Win/Loss tracking ---
function getStats() {
  try { return JSON.parse(localStorage.getItem('domino_stats') || '{}'); } catch(e) { return {}; }
}
function saveStats(stats) {
  localStorage.setItem('domino_stats', JSON.stringify(stats));
}
function recordWin(name) {
  const s = getStats();
  if (!s[name]) s[name] = { wins: 0, losses: 0 };
  s[name].wins++;
  saveStats(s);
}
function recordLoss(name) {
  const s = getStats();
  if (!s[name]) s[name] = { wins: 0, losses: 0 };
  s[name].losses++;
  saveStats(s);
}
function getRecord(name) {
  const s = getStats();
  return s[name] || { wins: 0, losses: 0 };
}
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

// --- Custom Player Name ---
function getPlayerName() {
  return localStorage.getItem('domino_player_name') || _tUI('playerName');
}
function setPlayerName(name) {
  localStorage.setItem('domino_player_name', name || _tUI('playerName'));
}

// --- Game Stats ---
function getGameStats() {
  try { return JSON.parse(localStorage.getItem('domino_game_stats') || '{}'); } catch(e) { return {}; }
}
function saveGameStats(s) { localStorage.setItem('domino_game_stats', JSON.stringify(s)); }
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

// --- Achievements ---
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
function getUnlockedAchievements() {
  try { return JSON.parse(localStorage.getItem('domino_achievements') || '[]'); } catch(e) { return []; }
}
function unlockAchievement(id) {
  const unlocked = getUnlockedAchievements();
  if (unlocked.includes(id)) return false;
  unlocked.push(id);
  localStorage.setItem('domino_achievements', JSON.stringify(unlocked));
  addXP(25); // XP reward for achievements
  return true;
}
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
function showAchievementPopup(id) {
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (!ach) return;
  const el = document.createElement('div');
  el.className = 'achievement-popup';
  el.innerHTML = `<span class="ach-icon">${ach.icon}</span><div><div class="ach-label">${_tUI('achievementUnlocked')}</div><div class="ach-text">${_tUI(ach.name)}</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// --- XP / Leveling ---
function getXP() {
  try { return JSON.parse(localStorage.getItem('domino_xp') || '{"xp":0,"level":1}'); } catch(e) { return {xp:0,level:1}; }
}
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
function getXPProgress() {
  const data = getXP();
  const needed = data.level * 100;
  return { level: data.level, xp: data.xp, needed, pct: Math.round(data.xp / needed * 100) };
}
