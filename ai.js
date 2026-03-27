/**
 * @file ai.js — AI opponent logic for All Fives Dominoes.
 *
 * HOW THE AI WORKS (plain English)
 * ================================
 *
 * The AI has three difficulty levels:
 *
 *   EASY   — Picks a random legal move. No strategy at all.
 *
 *   MEDIUM — Evaluates every possible move with a scoring formula,
 *            then picks randomly from the top 3 (weighted toward #1).
 *            This makes it good but not perfect — it occasionally
 *            makes suboptimal plays, which feels more human.
 *
 *   HARD   — Same scoring formula as medium, but always picks the
 *            single highest-scoring move. No randomness.
 *
 * The scoring formula combines two parts:
 *   1. IMMEDIATE SCORE — "If I play this tile, do I score points right now?"
 *      (Simulates the play on a copy of the board and checks if the open
 *       ends sum to a multiple of 5.)
 *
 *   2. STRATEGY SCORE — "Even if this play doesn't score now, is it a
 *      smart move for the future?" This considers 10 factors (see below).
 *
 * The HINT SYSTEM uses a separate algorithm: minimax with alpha-beta
 * pruning. This is a tree search that looks 4 moves ahead, simulating
 * both our plays and hypothetical opponent plays, to find the
 * mathematically optimal move.
 *
 * STRATEGY FACTORS (numbered for reference)
 * ==========================================
 *  1. Tile counting    — Track which tiles have been played
 *  2. Blocking         — Leave end values opponents can't match
 *  3. Team awareness   — Help your teammate in 2v2 mode
 *  4. Draw tracking    — Remember what values opponents drew on (they lack those)
 *  5. Endgame pips     — Dump heavy tiles late to minimize pip penalty
 *  6. Score pressure   — Play aggressively when behind, safely when ahead
 *  7. Opponent hands   — Block opponents who are close to going out
 *  8. Boneyard size    — Factor in how many unknown tiles remain
 *  9. Opening strategy — Keep diverse values early for flexibility
 * 10. Phantom pruning  — In minimax, skip tiles we know can't exist
 *
 * @dependency tile.js  ({@link Tile})
 * @dependency board.js ({@link Board})
 */

class AI {
  /**
   * Create an AI player.
   * @param {'easy'|'medium'|'hard'} difficulty
   */
  constructor(difficulty) {
    this.difficulty = difficulty;
  }

  // =========================================================================
  // MAIN ENTRY POINT — Choose which tile to play
  // =========================================================================

  /**
   * Choose the best play for the given hand and board state.
   *
   * Returns an object { tile, placement } describing which tile to play
   * and where to put it, or null if no legal play exists.
   *
   * @param {Tile[]}   hand        - Tiles in the AI's hand.
   * @param {Board}    board       - Current board state.
   * @param {object}   [personality] - Personality tweaks (aggressive, defensive, etc.).
   * @param {object}   [ctx]       - Game context (players, scores, game log).
   * @returns {{tile: Tile, placement: object}|null}
   */
  choosePlay(hand, board, personality, ctx) {
    // Step 1: Find every legal move (tile + end combination)
    const playable = [];
    for (const tile of hand) {
      const placements = board.getValidPlacements(tile);
      for (const p of placements) playable.push({ tile, placement: p });
    }

    // No legal moves — caller will handle drawing or passing
    if (playable.length === 0) return null;

    // EASY: just pick one at random
    if (this.difficulty === 'easy') {
      return playable[Math.floor(Math.random() * playable.length)];
    }

    // Step 2: Gather intelligence about the game state
    const intel = this._buildIntel(hand, board, ctx);

    // Step 3: Score every possible move
    //   total = immediate points scored + strategic value
    const scored = playable.map(play => {
      const immediate = this._simulateScore(play, board);
      const strategy  = this._strategyScore(play, hand, board, personality, intel);
      return { ...play, score: immediate, strategyScore: strategy, total: immediate + strategy };
    });

    // Step 4: Pick the best move (or weighted-random for medium)
    scored.sort((a, b) => b.total - a.total);

    if (this.difficulty === 'medium') {
      // Pick from top 3 with weighted randomness:
      //   #1 gets weight 3, #2 gets weight 2, #3 gets weight 1
      //   So #1 is chosen ~50% of the time, #2 ~33%, #3 ~17%
      const top = scored.slice(0, Math.min(3, scored.length));
      const weights = top.map((_, i) => Math.max(3 - i, 1));
      const totalW = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * totalW;
      for (let i = 0; i < top.length; i++) {
        r -= weights[i];
        if (r <= 0) return top[i];
      }
      return top[0];
    }

    // HARD: always pick the single best move
    return scored[0];
  }

  // =========================================================================
  // GAME INTELLIGENCE — What do we know about the game state?
  // =========================================================================

  /**
   * Gather all available information about the current game state.
   *
   * This is like a player looking around the table and noting:
   * - Which tiles have been played (visible on the board)
   * - Which tiles are in our hand (we can see them)
   * - Which values opponents drew on (they couldn't match those)
   * - How many tiles each opponent has left
   * - How close each side is to winning
   * - How far along the round is (early vs late)
   *
   * @param {Tile[]} hand  - Our hand.
   * @param {Board}  board - Current board.
   * @param {object} [ctx] - Game context from the controller.
   * @returns {object} Intelligence object used by _strategyScore.
   * @private
   */
  _buildIntel(hand, board, ctx) {
    const intel = {
      playedTiles:       new Set(),   // Factor #1: tiles on the board (as "a-b" strings)
      knownTiles:        new Set(),   // All tiles we can see (board + our hand)
      opponentCantPlay:  new Map(),   // Factor #4: value → Set of player indices who drew on it
      opponentHandSizes: [],          // Factor #7: how many tiles each player holds
      roundProgress:     0,           // Factor #5: 0 = start of round, 1 = end of round
      scorePressure:     0,           // Factor #6: -1 (far ahead) to +1 (far behind)
      isTeammate:        () => false, // Factor #3: function to check if a player is on our team
      teamMode:          false,       // Factor #3: whether 2v2 teams are active
      myTeamScore:       0,
      oppTeamScore:      0,
      targetScore:       200,
      totalTilesPlayed:  board.tiles.length,
    };

    // --- Factor #1: Tile counting ---
    // Record every tile on the board. We use a normalized string key
    // like "2-5" (always smaller number first) so [2|5] and [5|2] match.
    for (const t of board.tiles) {
      intel.playedTiles.add(`${Math.min(t.a, t.b)}-${Math.max(t.a, t.b)}`);
    }
    // Our hand tiles are also "known" (we can see them)
    for (const t of hand) {
      intel.knownTiles.add(`${Math.min(t.a, t.b)}-${Math.max(t.a, t.b)}`);
    }
    // Board tiles are known too
    for (const key of intel.playedTiles) intel.knownTiles.add(key);

    if (!ctx) return intel;

    // --- Factor #5: Round progress ---
    // How far through the round are we? 0 = just started, 1 = almost done.
    // Formula: tiles on board / total tiles dealt to all players
    const totalDealt = ctx.players
      ? ctx.players.reduce((s, p) => s + p.hand.length, 0) + board.tiles.length
      : 28;
    intel.roundProgress = Math.min(1, board.tiles.length / Math.max(1, totalDealt));

    // --- Factor #7: Opponent hand sizes ---
    if (ctx.players) {
      intel.opponentHandSizes = ctx.players.map(p => p.hand.length);
    }

    // --- Factor #3: Team awareness ---
    if (ctx.teamMode && ctx.playerIndex !== undefined && ctx.players) {
      intel.teamMode = true;
      const myTeam = ctx.players[ctx.playerIndex].team;
      intel.isTeammate = (idx) => ctx.players[idx] && ctx.players[idx].team === myTeam;
    }

    // --- Factor #6: Score pressure ---
    // How urgently do we need to score?
    //   scorePressure > 0  → we're BEHIND, need to score aggressively
    //   scorePressure < 0  → we're AHEAD, can play safe
    //   scorePressure ≈ 0  → scores are close, balanced play
    //
    // Formula: clamp((myDistance - oppDistance) / 50, -1, 1)
    //   where distance = targetScore - currentScore
    intel.targetScore = ctx.targetScore || 200;
    if (ctx.teamMode && ctx.teams && ctx.playerIndex !== undefined) {
      const myTeam = ctx.players[ctx.playerIndex].team;
      intel.myTeamScore  = ctx.teams[myTeam] ? ctx.teams[myTeam].score : 0;
      intel.oppTeamScore = ctx.teams[myTeam === 0 ? 1 : 0] ? ctx.teams[myTeam === 0 ? 1 : 0].score : 0;
    } else if (ctx.players && ctx.playerIndex !== undefined) {
      intel.myTeamScore  = ctx.players[ctx.playerIndex].score;
      intel.oppTeamScore = Math.max(...ctx.players.filter((_, i) => i !== ctx.playerIndex).map(p => p.score));
    }
    const myDist  = intel.targetScore - intel.myTeamScore;
    const oppDist = intel.targetScore - intel.oppTeamScore;
    if (oppDist < myDist) {
      intel.scorePressure = Math.min(1, (myDist - oppDist) / 50);
    } else {
      intel.scorePressure = -Math.min(1, (oppDist - myDist) / 50);
    }

    // --- Factor #4: Draw tracking ---
    // When a player draws from the boneyard, it means they couldn't match
    // any of the open end values at that moment. We record this so we can
    // later leave those values open to block them.
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

  // =========================================================================
  // SCORING — How good is each possible move?
  // =========================================================================

  /**
   * Simulate a play and return the immediate score (0, 5, 10, 15, ...).
   *
   * Makes a copy of the board, places the tile, and checks if the
   * open ends sum to a multiple of 5.
   *
   * @param {{tile: Tile, placement: object}} play - The move to simulate.
   * @param {Board} board - Current board state (not modified).
   * @returns {number} Points scored (0 if not a multiple of 5).
   * @private
   */
  _simulateScore(play, board) {
    const sim = this._cloneBoard(board);
    sim.placeTile(play.tile, play.placement);
    return sim.getScore();
  }

  /**
   * Calculate the strategic value of a move (beyond immediate scoring).
   *
   * This is the "brain" of the AI. It considers 10 factors and returns
   * a numeric score. Higher = better move. The factors are weighted
   * so that critical decisions (like blocking an opponent about to win)
   * outweigh minor preferences (like keeping value diversity).
   *
   * SCORING BREAKDOWN (approximate weights):
   *   - Immediate scoring opportunity:  up to ~30 points (via scorePressure)
   *   - Blocking opponents:             up to ~12 points (3 per blocked opponent)
   *   - Future playability:             up to ~10 points (1.5 per future play)
   *   - Opponent hand blocking:         up to ~8 points  (4 per changed end value)
   *   - Pip dumping (late game):        up to ~5 points
   *   - Value diversity (early game):   up to ~5 points
   *   - Double preference:              ~2 points
   *   - Personality chaos:              ±5 points (random, chaotic AI only)
   *
   * @param {{tile: Tile, placement: object}} play - The move to evaluate.
   * @param {Tile[]}  hand        - Full hand (before this play).
   * @param {Board}   board       - Current board state.
   * @param {object}  personality - AI personality tweaks.
   * @param {object}  intel       - Game intelligence from _buildIntel.
   * @returns {number} Strategy score (higher = better).
   * @private
   */
  _strategyScore(play, hand, board, personality, intel) {
    let score = 0;
    const tile = play.tile;
    const tw = personality ? personality.tweaks : {};

    // ----- BASE HEURISTICS -----

    // Prefer playing doubles early — they're harder to play later because
    // they only match one value (e.g., [4|4] can only match 4s).
    if (tile.isDouble) score += 2 + (tw.preferBlock || 0);

    // Slight preference for playing heavier tiles (more pips) to reduce
    // our pip count in case the round ends in a block.
    score += tile.pips * (0.3 + (tw.preferHeavy || 0) * 0.15);

    // ----- FUTURE PLAYABILITY -----
    // After this play, how many of our remaining tiles can we still play?
    // Simulate the board after our play and check each remaining tile.
    const remaining = hand.filter(t => !t.equals(tile));
    const sim = this._cloneBoard(board);
    sim.placeTile(tile, play.placement);
    const openVals = sim.getOpenValues();
    const futurePlayable = remaining.filter(t => openVals.some(v => t.has(v)));

    // Each future playable tile is worth 1.5 points
    score += futurePlayable.length * (1.5 + (tw.futureWeight || 0) * 0.5);

    // PENALTY: if this play leaves us with NO future plays, that's very bad
    // (we'd have to draw from the boneyard next turn)
    if (remaining.length > 0 && futurePlayable.length === 0) score -= 5;

    // Personality chaos factor — random noise for unpredictable AI
    if (tw.chaos) score += (Math.random() - 0.5) * tw.chaos * 2;

    // If no game context available, return base score only
    if (!intel) return score;

    // ----- FACTOR #2: BLOCKING AWARENESS -----
    // If we know an opponent drew when a certain value was open, they
    // probably don't have tiles matching that value. Leaving that value
    // open makes it harder for them to play.
    for (const val of openVals) {
      const cantPlay = intel.opponentCantPlay.get(val);
      if (cantPlay && cantPlay.size > 0) {
        // Count only opponents (not teammates) who can't play this value
        const oppCount = [...cantPlay].filter(idx => !intel.isTeammate(idx)).length;
        score += oppCount * 3;  // 3 points per blocked opponent
      }
    }

    // ----- FACTOR #3: TEAM AWARENESS -----
    // In 2v2 mode, prefer leaving end values that our teammate might have.
    // We estimate this by counting how many UNSEEN tiles contain each
    // open value. More unseen = higher chance our teammate has one.
    if (intel.teamMode) {
      for (const val of openVals) {
        let unseen = 0;
        for (let other = 0; other <= 6; other++) {
          const key = `${Math.min(val, other)}-${Math.max(val, other)}`;
          if (!intel.knownTiles.has(key)) unseen++;
        }
        score += unseen * 0.5;  // 0.5 points per unseen matching tile
      }
    }

    // ----- FACTOR #5: ENDGAME PIP MANAGEMENT -----
    // Late in the round (>50% of tiles played), prioritize getting rid
    // of heavy tiles. If the round ends in a block, we lose points equal
    // to our remaining pips. So dump the big ones first.
    // Exception: don't penalize scoring plays (they're always good).
    if (intel.roundProgress > 0.5) {
      const immediate = this._simulateScore(play, board);
      if (immediate === 0) {
        // Weight increases as round progresses: 0.3 at 50% → 1.0 at 100%
        const pipWeight = 0.3 + intel.roundProgress * 0.7;
        score += tile.pips * pipWeight * 0.4;
      }
    }

    // ----- FACTOR #6: SCORE-AWARE PLAY -----
    // When we're BEHIND (scorePressure > 0), weight immediate scoring higher.
    // When we're AHEAD (scorePressure < 0), prefer safe plays with options.
    if (intel.scorePressure > 0) {
      const immediate = this._simulateScore(play, board);
      score += immediate * intel.scorePressure * 2;
    }
    if (intel.scorePressure < 0) {
      score += futurePlayable.length * Math.abs(intel.scorePressure) * 2;
    }

    // ----- FACTOR #7: OPPONENT HAND SIZE AWARENESS -----
    // If an opponent has only 1-2 tiles left, they're close to going out.
    // Try to CHANGE the end values so they can't match their last tile(s).
    if (intel.opponentHandSizes.length > 0) {
      for (let i = 0; i < intel.opponentHandSizes.length; i++) {
        if (intel.isTeammate(i)) continue;  // don't block teammates
        if (intel.opponentHandSizes[i] <= 2 && intel.opponentHandSizes[i] > 0) {
          // Count how many end values changed after this play
          const oldVals = new Set(board.getOpenValues());
          const newVals = new Set(openVals);
          let changed = 0;
          for (const v of newVals) { if (!oldVals.has(v)) changed++; }
          score += changed * 4;  // 4 points per new end value
        }
      }
    }

    // ----- FACTOR #9: OPENING STRATEGY -----
    // Early in the round (<30% played), keep a diverse set of values
    // in our hand so we're less likely to get stuck later.
    if (intel.roundProgress < 0.3 && intel.totalTilesPlayed > 1) {
      const valDiversity = new Set();
      for (const t of remaining) { valDiversity.add(t.a); valDiversity.add(t.b); }
      score += valDiversity.size * 0.8;  // 0.8 points per unique value kept

      // Prefer playing non-doubles early — doubles are inflexible
      // (they only match one value) so save them for when we need them
      if (!tile.isDouble && remaining.some(t => t.isDouble)) score += 1.5;
    }

    return score;
  }

  // =========================================================================
  // BOARD CLONING — Make a copy of the board for simulation
  // =========================================================================

  /**
   * Create a copy of the board so we can simulate plays without
   * modifying the real game state.
   * @param {Board} board
   * @returns {Board}
   * @private
   */
  _cloneBoard(board) {
    return Board.clone(board);
  }

  // =========================================================================
  // MINIMAX WITH ALPHA-BETA PRUNING — Used by the Hint system
  // =========================================================================
  //
  // This is a classic game tree search algorithm. It works like this:
  //
  //   1. Look at every move we could make (our turn = "maximizing")
  //   2. For each move, imagine what the opponent might do ("minimizing")
  //   3. For each opponent response, imagine our next move, and so on
  //   4. After looking N moves ahead (depth), evaluate the board position
  //   5. Pick the move that leads to the best outcome assuming the
  //      opponent also plays optimally
  //
  // ALPHA-BETA PRUNING is an optimization: if we find a move so good
  // that the opponent would never let us reach it, we skip evaluating
  // the rest of that branch. This dramatically reduces computation.
  //
  // PHANTOM TILES: We don't know what the opponent holds, so we
  // generate "phantom" tiles — every tile that COULD exist (hasn't
  // been played and isn't in our hand). This gives a worst-case
  // estimate of what the opponent might do.

  /**
   * Find the best move by searching the game tree N moves ahead.
   *
   * Used by the hint system to suggest the mathematically optimal play.
   *
   * @param {Tile[]} hand   - Current hand.
   * @param {Board}  board  - Current board state.
   * @param {number} [depth=4] - How many moves ahead to search.
   * @param {Set}    [knownTiles] - Tiles we know about (for phantom pruning).
   * @returns {{tile: Tile, placement: object}|null} Best move found.
   */
  bestMove(hand, board, depth = 4, knownTiles) {
    // Find all legal moves
    const playable = [];
    for (const tile of hand) {
      const placements = board.getValidPlacements(tile);
      for (const p of placements) playable.push({ tile, placement: p });
    }
    if (playable.length === 0) return null;
    if (playable.length === 1) return playable[0]; // only one option, skip search

    // Build the set of tiles we know about (played + in our hand)
    // so we can exclude them from phantom opponent tiles
    const known = knownTiles || new Set();
    if (!knownTiles) {
      for (const t of board.tiles) known.add(`${Math.min(t.a, t.b)}-${Math.max(t.a, t.b)}`);
      for (const t of hand) known.add(`${Math.min(t.a, t.b)}-${Math.max(t.a, t.b)}`);
    }

    // Try each move and pick the one with the highest value
    let bestPlay = null;
    let bestVal = -Infinity;
    for (const play of playable) {
      const sim = this._cloneBoard(board);
      sim.placeTile(play.tile, play.placement);
      const immediate = sim.getScore();
      const remaining = hand.filter(t => !t.equals(play.tile));
      // Bonus for going out (playing last tile) — worth ~25 points
      const dominoBonus = remaining.length === 0 ? 25 : 0;
      const val = immediate + dominoBonus +
        this._abSearch(sim, remaining, depth - 1, -Infinity, Infinity, false, known);
      if (val > bestVal) { bestVal = val; bestPlay = play; }
    }
    return bestPlay;
  }

  /**
   * Recursive alpha-beta search.
   *
   * Alternates between:
   *   - MAXIMIZING (our turn): try each of our tiles, pick the best outcome
   *   - MINIMIZING (opponent's turn): generate phantom tiles, pick the worst
   *     outcome for us (best for opponent)
   *
   * @param {Board}   board      - Board state at this node.
   * @param {Tile[]}  hand       - Our remaining tiles.
   * @param {number}  depth      - Remaining search depth.
   * @param {number}  alpha      - Best value the maximizer can guarantee.
   * @param {number}  beta       - Best value the minimizer can guarantee.
   * @param {boolean} maximizing - True if it's our turn.
   * @param {Set}     known      - Known tile keys (for phantom pruning).
   * @returns {number} Evaluated score for this position.
   * @private
   */
  _abSearch(board, hand, depth, alpha, beta, maximizing, known) {
    // Base case: reached max depth or we have no tiles left
    if (depth === 0 || hand.length === 0) return this._evalBoard(board, hand);

    if (maximizing) {
      // === OUR TURN: try every legal play ===
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
        val = Math.max(val, score + dominoBonus +
          this._abSearch(sim, remaining, depth - 1, alpha, beta, false, known));
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break; // Prune: opponent would never allow this
      }
      return val;

    } else {
      // === OPPONENT'S TURN: generate phantom tiles ===
      // We don't know what the opponent has, so we generate every tile
      // that COULD match an open end and hasn't been accounted for.
      const openEnds = board.getOpenEnds();
      const phantomPlays = [];
      for (const e of openEnds) {
        for (let other = 0; other <= 6; other++) {
          const key = `${Math.min(e.value, other)}-${Math.max(e.value, other)}`;
          if (known && known.has(key)) continue; // skip tiles we know about
          const phantom = new Tile(e.value, other);
          phantomPlays.push({ tile: phantom, placement: { end: e.end, matchValue: e.value } });
        }
      }

      // If no phantom plays possible, skip opponent's turn
      if (phantomPlays.length === 0) {
        return this._abSearch(board, hand, depth - 1, alpha, beta, true, known);
      }

      let val = Infinity;
      for (const play of phantomPlays) {
        const sim = this._cloneBoard(board);
        sim.placeTile(play.tile, play.placement);
        const oppScore = sim.getScore();
        // Opponent's score hurts us (negative), then it's our turn again
        val = Math.min(val, -oppScore +
          this._abSearch(sim, hand, depth - 1, alpha, beta, true, known));
        beta = Math.min(beta, val);
        if (beta <= alpha) break; // Prune: we would never choose this path
      }
      return val;
    }
  }

  // =========================================================================
  // BOARD EVALUATION — How good is a board position?
  // =========================================================================

  /**
   * Evaluate a board position when we've reached the search depth limit.
   *
   * This is the "leaf node" evaluator — it estimates how good the current
   * position is without searching further. Think of it as a quick glance
   * at the board and hand to judge "am I in a good spot?"
   *
   * SCORING COMPONENTS:
   *   +4 per tile in hand that can be played     (mobility is good)
   *   -0.3 per pip in hand                       (fewer pips = less risk)
   *   +0.5 per potential scoring play             (future scoring chances)
   *   +1.5 per unique value in hand               (diversity = flexibility)
   *   -10 if we can't play anything               (stuck = very bad)
   *
   * @param {Board}  board - Board state to evaluate.
   * @param {Tile[]} hand  - Our remaining tiles.
   * @returns {number} Position score (higher = better for us).
   * @private
   */
  _evalBoard(board, hand) {
    let score = 0;
    const openVals = board.getOpenValues();

    // How many of our tiles can we play right now?
    const playable = hand.filter(t => openVals.some(v => t.has(v)));
    score += playable.length * 4;

    // Penalize heavy hands (more pips = more risk if round ends)
    score -= hand.reduce((s, t) => s + t.pips, 0) * 0.3;

    // Check if any playable tile would score points
    for (const t of playable) {
      const placements = board.getValidPlacements(t);
      for (const p of placements) {
        const sim = this._cloneBoard(board);
        sim.placeTile(t, p);
        const s = sim.getScore();
        if (s > 0) score += s * 0.5; // half credit for potential future scores
      }
    }

    // Value diversity — how many different pip values do we hold?
    // More variety = less likely to get stuck
    const vals = new Set();
    for (const t of hand) { vals.add(t.a); vals.add(t.b); }
    score += vals.size * 1.5;

    // Big penalty if we're completely stuck (can't play anything)
    if (playable.length === 0 && hand.length > 0) score -= 10;

    return score;
  }
}
