/**
 * @file ai.js — AI opponent logic for All Fives Dominoes.
 *
 * Three difficulty levels:
 *  - **easy** — picks a random legal play.
 *  - **medium** — scores each play with strategy heuristics + some randomness.
 *  - **hard** — always picks the highest-scoring play using full context.
 *
 * Smart features (medium/hard):
 *  1. Tile counting — tracks played tiles to infer what's still out
 *  2. Blocking awareness — avoids opening values opponents need
 *  3. Team awareness — teammates set up scoring opportunities
 *  4. Draw tracking — notes which values opponents couldn't match
 *  5. Endgame pip management — dumps heavy tiles when round is late
 *  6. Score-aware play — aggressive near target, conservative when ahead
 *  7. Opponent hand size — blocks opponents with few tiles left
 *  8. Smarter draw decisions — considers boneyard size
 *  9. Opening strategy — keeps options open early
 * 10. Pruned phantom tiles in minimax — excludes known tiles
 *
 * @dependency tile.js  ({@link Tile})
 * @dependency board.js ({@link Board})
 */

class AI {
  /** @param {'easy'|'medium'|'hard'} difficulty */
  constructor(difficulty) {
    this.difficulty = difficulty;
  }

  /**
   * Choose the best play for the given hand and board state.
   *
   * @param {Tile[]}  hand         - Tiles in the AI's hand.
   * @param {Board}   board        - Current board state.
   * @param {object}  [personality] - Personality tweaks (see AI_PERSONALITIES).
   * @param {object}  [ctx]        - Game context for smart decisions.
   * @param {object[]} [ctx.players]     - All players (for hand sizes, teams).
   * @param {number}   [ctx.playerIndex] - This AI's index.
   * @param {number}   [ctx.targetScore] - Game target score.
   * @param {boolean}  [ctx.teamMode]    - Whether 2v2 teams are active.
   * @param {object[]} [ctx.teams]       - Team objects with scores.
   * @param {object[]} [ctx.gameLog]     - Full game log (for draw tracking).
   * @returns {{tile: Tile, placement: object}|null}
   */
  choosePlay(hand, board, personality, ctx) {
    const playable = [];
    for (const tile of hand) {
      const placements = board.getValidPlacements(tile);
      for (const p of placements) playable.push({ tile, placement: p });
    }
    if (playable.length === 0) return null;
    if (this.difficulty === 'easy') {
      return playable[Math.floor(Math.random() * playable.length)];
    }

    // Build game intelligence from context
    const intel = this._buildIntel(hand, board, ctx);

    // Score each possible play
    const scored = playable.map(play => {
      const immediate = this._simulateScore(play, board);
      const strategy = this._strategyScore(play, hand, board, personality, intel);
      return { ...play, score: immediate, strategyScore: strategy, total: immediate + strategy };
    });

    if (this.difficulty === 'medium') {
      scored.sort((a, b) => b.total - a.total);
      const top = scored.slice(0, Math.min(3, scored.length));
      const weights = top.map((_, i) => Math.max(3 - i, 1));
      const totalW = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * totalW;
      for (let i = 0; i < top.length; i++) { r -= weights[i]; if (r <= 0) return top[i]; }
      return top[0];
    }

    // Hard: always pick the best
    scored.sort((a, b) => b.total - a.total);
    return scored[0];
  }

  // ---------------------------------------------------------------------------
  // Game Intelligence
  // ---------------------------------------------------------------------------

  /**
   * Build a context object with tile counting, draw tracking, and game state.
   * @private
   */
  _buildIntel(hand, board, ctx) {
    const intel = {
      playedTiles: new Set(),       // #1: tiles on the board
      knownTiles: new Set(),        // tiles we can see (board + our hand)
      opponentCantPlay: new Map(),  // #4: value → Set of player indices who drew on it
      opponentHandSizes: [],        // #7: hand sizes per player
      roundProgress: 0,             // #5: 0=early, 1=late
      scorePressure: 0,             // #6: how urgently we need to score (-1 to 1)
      isTeammate: () => false,      // #3: check if a player is our teammate
      myTeamScore: 0,
      oppTeamScore: 0,
      targetScore: 200,
      totalTilesPlayed: board.tiles.length,
    };

    // Track played tiles (#1)
    for (const t of board.tiles) {
      intel.playedTiles.add(`${Math.min(t.a,t.b)}-${Math.max(t.a,t.b)}`);
    }
    // Our hand is also known
    for (const t of hand) {
      intel.knownTiles.add(`${Math.min(t.a,t.b)}-${Math.max(t.a,t.b)}`);
    }
    for (const key of intel.playedTiles) intel.knownTiles.add(key);

    if (!ctx) return intel;

    // Round progress (#5): 28 tiles total, more played = later
    const totalDealt = ctx.players ? ctx.players.reduce((s, p) => s + p.hand.length, 0) + board.tiles.length : 28;
    intel.roundProgress = Math.min(1, board.tiles.length / Math.max(1, totalDealt));

    // Opponent hand sizes (#7)
    if (ctx.players) {
      intel.opponentHandSizes = ctx.players.map(p => p.hand.length);
    }

    // Team awareness (#3)
    if (ctx.teamMode && ctx.playerIndex !== undefined && ctx.players) {
      const myTeam = ctx.players[ctx.playerIndex].team;
      intel.isTeammate = (idx) => ctx.players[idx] && ctx.players[idx].team === myTeam;
    }

    // Score pressure (#6)
    intel.targetScore = ctx.targetScore || 200;
    if (ctx.teamMode && ctx.teams && ctx.playerIndex !== undefined) {
      const myTeam = ctx.players[ctx.playerIndex].team;
      intel.myTeamScore = ctx.teams[myTeam] ? ctx.teams[myTeam].score : 0;
      intel.oppTeamScore = ctx.teams[myTeam === 0 ? 1 : 0] ? ctx.teams[myTeam === 0 ? 1 : 0].score : 0;
    } else if (ctx.players && ctx.playerIndex !== undefined) {
      intel.myTeamScore = ctx.players[ctx.playerIndex].score;
      intel.oppTeamScore = Math.max(...ctx.players.filter((_, i) => i !== ctx.playerIndex).map(p => p.score));
    }
    // Positive = need to score aggressively, negative = play safe
    const myDist = intel.targetScore - intel.myTeamScore;
    const oppDist = intel.targetScore - intel.oppTeamScore;
    intel.scorePressure = (oppDist < myDist) ? Math.min(1, (myDist - oppDist) / 50) : -Math.min(1, (oppDist - myDist) / 100);

    // Draw tracking (#4): scan game log for draw events
    if (ctx.gameLog) {
      for (const entry of ctx.gameLog) {
        if (entry.action === 'draw' && entry._openValues) {
          const playerIdx = ctx.players ? ctx.players.findIndex(p => p.name === entry.player) : -1;
          if (playerIdx >= 0) {
            for (const val of entry._openValues) {
              if (!intel.opponentCantPlay.has(val)) intel.opponentCantPlay.set(val, new Set());
              intel.opponentCantPlay.get(val).add(playerIdx);
            }
          }
        }
      }
    }

    return intel;
  }

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------

  /** @private */
  _simulateScore(play, board) {
    const sim = this._cloneBoard(board);
    sim.placeTile(play.tile, play.placement);
    return sim.getScore();
  }

  /**
   * Full strategy scoring with all 10 intelligence factors.
   * @private
   */
  _strategyScore(play, hand, board, personality, intel) {
    let score = 0;
    const tile = play.tile;
    const tw = personality ? personality.tweaks : {};

    // --- Base heuristics ---
    if (tile.isDouble) score += 2 + (tw.preferBlock || 0);
    score += tile.pips * (0.3 + (tw.preferHeavy || 0) * 0.15);

    const remaining = hand.filter(t => !t.equals(tile));
    const sim = this._cloneBoard(board);
    sim.placeTile(tile, play.placement);
    const openVals = sim.getOpenValues();
    const futurePlayable = remaining.filter(t => openVals.some(v => t.has(v)));
    score += futurePlayable.length * (1.5 + (tw.futureWeight || 0) * 0.5);
    if (remaining.length > 0 && futurePlayable.length === 0) score -= 5;

    // Chaos factor
    if (tw.chaos) score += (Math.random() - 0.5) * tw.chaos * 2;

    if (!intel) return score;

    // --- #2: Blocking awareness ---
    // Prefer opening values that opponents can't play
    for (const val of openVals) {
      const cantPlay = intel.opponentCantPlay.get(val);
      if (cantPlay && cantPlay.size > 0) {
        // Each opponent who can't play this value = bonus
        const oppCount = [...cantPlay].filter(idx => !intel.isTeammate(idx)).length;
        score += oppCount * 3;
      }
    }

    // --- #3: Team awareness ---
    // In team mode, prefer keeping ends open that our teammate likely has
    // (values that haven't been played much = more likely in teammate's hand)
    if (intel.isTeammate) {
      for (const val of openVals) {
        // Count how many tiles with this value are still unaccounted for
        let unseen = 0;
        for (let other = 0; other <= 6; other++) {
          const key = `${Math.min(val, other)}-${Math.max(val, other)}`;
          if (!intel.knownTiles.has(key)) unseen++;
        }
        // More unseen tiles with this value = more likely teammate has one
        score += unseen * 0.5;
      }
    }

    // --- #5: Endgame pip management ---
    // Late in the round, prioritize dumping heavy tiles
    if (intel.roundProgress > 0.5) {
      const pipWeight = 0.3 + intel.roundProgress * 0.7; // ramps from 0.3 to 1.0
      score += tile.pips * pipWeight * 0.4;
    }

    // --- #6: Score-aware play ---
    // When behind, weight immediate scoring higher
    if (intel.scorePressure > 0) {
      const immediate = this._simulateScore(play, board);
      score += immediate * intel.scorePressure * 2;
    }
    // When far ahead, prefer safe plays that keep options open
    if (intel.scorePressure < 0) {
      score += futurePlayable.length * Math.abs(intel.scorePressure) * 2;
    }

    // --- #7: Opponent hand size awareness ---
    // If any opponent has 1-2 tiles, try to change end values to block them
    if (intel.opponentHandSizes.length > 0) {
      for (let i = 0; i < intel.opponentHandSizes.length; i++) {
        if (intel.isTeammate(i)) continue;
        if (intel.opponentHandSizes[i] <= 2 && intel.opponentHandSizes[i] > 0) {
          // Bonus for changing end values (makes it harder for them to go out)
          const oldVals = new Set(board.getOpenValues());
          const newVals = new Set(openVals);
          let changed = 0;
          for (const v of newVals) { if (!oldVals.has(v)) changed++; }
          score += changed * 4;
        }
      }
    }

    // --- #9: Opening strategy ---
    // Early in the round, prefer tiles that keep many values open
    if (intel.roundProgress < 0.3) {
      const valDiversity = new Set();
      for (const t of remaining) { valDiversity.add(t.a); valDiversity.add(t.b); }
      // Bonus for maintaining diversity in remaining hand
      score += valDiversity.size * 0.8;
      // Prefer non-doubles early (doubles are harder to play later)
      if (!tile.isDouble) score += 1.5;
    }

    return score;
  }

  // ---------------------------------------------------------------------------
  // Board Cloning
  // ---------------------------------------------------------------------------

  /** @private */
  _cloneBoard(board) {
    const b = new Board();
    b.tiles = [...board.tiles];
    b.spinner = board.spinner;
    b.spinnerIndex = board.spinnerIndex;
    b.leftEnd = board.leftEnd;
    b.leftIsDouble = board.leftIsDouble;
    b.rightEnd = board.rightEnd;
    b.rightIsDouble = board.rightIsDouble;
    b.spinnerNorth = board.spinnerNorth;
    b.spinnerNorthIsDouble = board.spinnerNorthIsDouble;
    b.spinnerSouth = board.spinnerSouth;
    b.spinnerSouthIsDouble = board.spinnerSouthIsDouble;
    b.spinnerNorthOpen = board.spinnerNorthOpen;
    b.spinnerSouthOpen = board.spinnerSouthOpen;
    b.hasLeftOfSpinner = board.hasLeftOfSpinner;
    b.hasRightOfSpinner = board.hasRightOfSpinner;
    return b;
  }

  // ---------------------------------------------------------------------------
  // Minimax with Alpha-Beta Pruning (hint system)
  // ---------------------------------------------------------------------------

  /**
   * Find the best move using minimax with alpha-beta pruning.
   * Uses pruned phantom tiles (#10) — excludes known tiles from opponent simulation.
   *
   * @param {Tile[]} hand   - Current hand.
   * @param {Board}  board  - Current board state.
   * @param {number} [depth=4]
   * @param {Set}    [knownTiles] - Set of "a-b" keys for tiles we know about.
   * @returns {{tile: Tile, placement: object}|null}
   */
  bestMove(hand, board, depth = 4, knownTiles) {
    const playable = [];
    for (const tile of hand) {
      const placements = board.getValidPlacements(tile);
      for (const p of placements) playable.push({ tile, placement: p });
    }
    if (playable.length === 0) return null;
    if (playable.length === 1) return playable[0];

    // Build known tiles set for phantom pruning (#10)
    const known = knownTiles || new Set();
    if (!knownTiles) {
      for (const t of board.tiles) known.add(`${Math.min(t.a,t.b)}-${Math.max(t.a,t.b)}`);
      for (const t of hand) known.add(`${Math.min(t.a,t.b)}-${Math.max(t.a,t.b)}`);
    }

    let bestPlay = null;
    let bestVal = -Infinity;
    for (const play of playable) {
      const sim = this._cloneBoard(board);
      sim.placeTile(play.tile, play.placement);
      const immediate = sim.getScore();
      const remaining = hand.filter(t => !t.equals(play.tile));
      const dominoBonus = remaining.length === 0 ? 25 : 0;
      const val = immediate + dominoBonus + this._abSearch(sim, remaining, depth - 1, -Infinity, Infinity, false, known);
      if (val > bestVal) { bestVal = val; bestPlay = play; }
    }
    return bestPlay;
  }

  /**
   * Alpha-beta search with pruned phantom tiles (#10).
   * @private
   */
  _abSearch(board, hand, depth, alpha, beta, maximizing, known) {
    if (depth === 0 || hand.length === 0) return this._evalBoard(board, hand);

    if (maximizing) {
      const playable = [];
      for (const tile of hand) {
        const placements = board.getValidPlacements(tile);
        for (const p of placements) playable.push({ tile, placement: p });
      }
      if (playable.length === 0) return this._evalBoard(board, hand);

      let val = -Infinity;
      for (const play of playable) {
        const sim = this._cloneBoard(board);
        sim.placeTile(play.tile, play.placement);
        const score = sim.getScore();
        const remaining = hand.filter(t => !t.equals(play.tile));
        const dominoBonus = remaining.length === 0 ? 25 : 0;
        val = Math.max(val, score + dominoBonus + this._abSearch(sim, remaining, depth - 1, alpha, beta, false, known));
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return val;
    } else {
      // #10: Pruned phantom tiles — only generate tiles that could actually exist
      const openEnds = board.getOpenEnds();
      const phantomPlays = [];
      for (const e of openEnds) {
        for (let other = 0; other <= 6; other++) {
          const key = `${Math.min(e.value, other)}-${Math.max(e.value, other)}`;
          // Skip tiles we know are already played or in our hand
          if (known && known.has(key)) continue;
          const phantom = new Tile(e.value, other);
          phantomPlays.push({ tile: phantom, placement: { end: e.end, matchValue: e.value } });
        }
      }
      if (phantomPlays.length === 0) {
        return this._abSearch(board, hand, depth - 1, alpha, beta, true, known);
      }

      let val = Infinity;
      for (const play of phantomPlays) {
        const sim = this._cloneBoard(board);
        sim.placeTile(play.tile, play.placement);
        const oppScore = sim.getScore();
        val = Math.min(val, -oppScore + this._abSearch(sim, hand, depth - 1, alpha, beta, true, known));
        beta = Math.min(beta, val);
        if (beta <= alpha) break;
      }
      return val;
    }
  }

  /**
   * Static board evaluation for leaf nodes.
   * @private
   */
  _evalBoard(board, hand) {
    let score = 0;
    const openVals = board.getOpenValues();
    const playable = hand.filter(t => openVals.some(v => t.has(v)));

    score += playable.length * 4;
    score -= hand.reduce((s, t) => s + t.pips, 0) * 0.3;

    for (const t of playable) {
      const placements = board.getValidPlacements(t);
      for (const p of placements) {
        const sim = this._cloneBoard(board);
        sim.placeTile(t, p);
        const s = sim.getScore();
        if (s > 0) score += s * 0.5;
      }
    }

    const vals = new Set();
    for (const t of hand) { vals.add(t.a); vals.add(t.b); }
    score += vals.size * 1.5;

    if (playable.length === 0 && hand.length > 0) score -= 10;

    return score;
  }
}
