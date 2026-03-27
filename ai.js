// ============================================================
// ALL FIVES DOMINOES — AI
// ============================================================

class AI {
  constructor(difficulty) {
    this.difficulty = difficulty; // 'easy', 'medium', 'hard'
  }

  choosePlay(hand, board, personality) {
    const playable = [];
    for (const tile of hand) {
      const placements = board.getValidPlacements(tile);
      for (const p of placements) {
        playable.push({ tile, placement: p });
      }
    }
    if (playable.length === 0) return null;

    if (this.difficulty === 'easy') {
      return playable[Math.floor(Math.random() * playable.length)];
    }

    // Score each possible play
    const scored = playable.map(play => {
      const score = this._simulateScore(play, board);
      const strategyScore = this._strategyScore(play, hand, board, personality);
      return { ...play, score, strategyScore, total: score + strategyScore };
    });

    if (this.difficulty === 'medium') {
      // Prefer scoring plays, with some randomness
      scored.sort((a, b) => b.total - a.total);
      // Pick from top 3 with weighted random
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

    // Hard: always pick the best
    scored.sort((a, b) => b.total - a.total);
    return scored[0];
  }

  _simulateScore(play, board) {
    // Simulate placing the tile and check score
    const sim = this._cloneBoard(board);
    sim.placeTile(play.tile, play.placement);
    return sim.getScore();
  }

  _strategyScore(play, hand, board, personality) {
    let score = 0;
    const tile = play.tile;
    const tw = personality ? personality.tweaks : {};

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

    return score;
  }

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

  // Minimax with alpha-beta pruning for hint system
  // Since we can't see opponent hands, we do a self-play lookahead:
  // - Maximizing: pick our best scoring move from our hand
  // - Minimizing: assume opponent plays a tile that leaves the worst board for us
  //   (simulated by trying all possible tiles that could match open ends)
  bestMove(hand, board, depth = 4) {
    const playable = [];
    for (const tile of hand) {
      const placements = board.getValidPlacements(tile);
      for (const p of placements) playable.push({ tile, placement: p });
    }
    if (playable.length === 0) return null;
    if (playable.length === 1) return playable[0];

    let bestPlay = null;
    let bestVal = -Infinity;
    for (const play of playable) {
      const sim = this._cloneBoard(board);
      sim.placeTile(play.tile, play.placement);
      const immediate = sim.getScore();
      const remaining = hand.filter(t => !t.equals(play.tile));
      // Bonus for emptying hand (domino)
      const dominoBonus = remaining.length === 0 ? 25 : 0;
      const val = immediate + dominoBonus + this._abSearch(sim, remaining, depth - 1, -Infinity, Infinity, false);
      if (val > bestVal) { bestVal = val; bestPlay = play; }
    }
    return bestPlay;
  }

  _abSearch(board, hand, depth, alpha, beta, maximizing) {
    if (depth === 0 || hand.length === 0) return this._evalBoard(board, hand);

    if (maximizing) {
      // Our turn: try each tile in our hand
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
        val = Math.max(val, score + dominoBonus + this._abSearch(sim, remaining, depth - 1, alpha, beta, false));
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return val;
    } else {
      // Opponent's turn: we don't know their hand, so simulate
      // worst-case by trying all possible tiles that fit the open ends.
      // Generate phantom opponent tiles for each open end value.
      const openEnds = board.getOpenEnds();
      const phantomPlays = [];
      for (const e of openEnds) {
        // Opponent could play any tile matching this end (0-6 on other side)
        for (let other = 0; other <= 6; other++) {
          const phantom = new Tile(e.value, other);
          phantomPlays.push({ tile: phantom, placement: { end: e.end, matchValue: e.value } });
        }
      }
      if (phantomPlays.length === 0) {
        // Opponent can't play, skip to our turn
        return this._abSearch(board, hand, depth - 1, alpha, beta, true);
      }

      // Opponent tries to minimize our advantage
      let val = Infinity;
      for (const play of phantomPlays) {
        const sim = this._cloneBoard(board);
        sim.placeTile(play.tile, play.placement);
        const oppScore = sim.getScore(); // opponent scores this
        val = Math.min(val, -oppScore + this._abSearch(sim, hand, depth - 1, alpha, beta, true));
        beta = Math.min(beta, val);
        if (beta <= alpha) break;
      }
      return val;
    }
  }

  _evalBoard(board, hand) {
    let score = 0;
    // How many of our tiles can we play right now?
    const openVals = board.getOpenValues();
    const playable = hand.filter(t => openVals.some(v => t.has(v)));
    score += playable.length * 4;

    // Prefer having fewer pips left (less risk if blocked)
    score -= hand.reduce((s, t) => s + t.pips, 0) * 0.3;

    // Bonus for tiles that could score on current board
    for (const t of playable) {
      const placements = board.getValidPlacements(t);
      for (const p of placements) {
        const sim = this._cloneBoard(board);
        sim.placeTile(t, p);
        const s = sim.getScore();
        if (s > 0) score += s * 0.5; // potential future score
      }
    }

    // Diversity bonus: having tiles that match many different values
    const vals = new Set();
    for (const t of hand) { vals.add(t.a); vals.add(t.b); }
    score += vals.size * 1.5;

    // Penalty for being stuck with no plays
    if (playable.length === 0 && hand.length > 0) score -= 10;

    return score;
  }
}
