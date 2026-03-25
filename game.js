// ============================================================
// ALL FIVES DOMINOES - Complete Game Engine
// ============================================================

// --- Domino Tile ---
class Tile {
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }
  get isDouble() { return this.a === this.b; }
  get pips() { return this.a + this.b; }
  has(n) { return this.a === n || this.b === n; }
  otherSide(n) { return this.a === n ? this.b : this.a; }
  equals(t) { return (this.a === t.a && this.b === t.b) || (this.a === t.b && this.b === t.a); }
  toString() { return `[${this.a}|${this.b}]`; }
}

// --- Create a double-6 set ---
function createSet() {
  const tiles = [];
  for (let a = 0; a <= 6; a++)
    for (let b = a; b <= 6; b++)
      tiles.push(new Tile(a, b));
  return tiles;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- Board: tracks the line of play ---
class Board {
  constructor() {
    this.tiles = [];
    this.spinner = null;
    this.spinnerIndex = -1;
    // Open ends: value is the pip value for matching, isDouble for scoring
    this.leftEnd = -1;
    this.leftIsDouble = false;
    this.rightEnd = -1;
    this.rightIsDouble = false;
    this.spinnerNorth = -1;
    this.spinnerNorthIsDouble = false;
    this.spinnerSouth = -1;
    this.spinnerSouthIsDouble = false;
    this.spinnerNorthOpen = false;
    this.spinnerSouthOpen = false;
    this.hasLeftOfSpinner = false;
    this.hasRightOfSpinner = false;
    this.placed = [];
  }

  get isEmpty() { return this.tiles.length === 0; }

  getOpenEnds() {
    if (this.isEmpty) return [];
    const ends = [];
    ends.push({ end: 'left', value: this.leftEnd, isDouble: this.leftIsDouble });
    ends.push({ end: 'right', value: this.rightEnd, isDouble: this.rightIsDouble });
    if (this.spinner && this.spinnerNorthOpen) {
      ends.push({ end: 'north', value: this.spinnerNorth, isDouble: this.spinnerNorthIsDouble });
    }
    if (this.spinner && this.spinnerSouthOpen) {
      ends.push({ end: 'south', value: this.spinnerSouth, isDouble: this.spinnerSouthIsDouble });
    }
    return ends;
  }

  getOpenValues() {
    return this.getOpenEnds().map(e => e.value);
  }

  // Scoring value for an end: doubles count both sides
  _endScoreValue(value, isDouble) {
    return isDouble ? value * 2 : value;
  }

  getEndSum() {
    if (this.isEmpty) return 0;
    // Special: if only the spinner is on the board, count both sides
    if (this.tiles.length === 1 && this.spinner) {
      return this.spinner.a + this.spinner.b;
    }
    const ends = this.getOpenEnds();
    return ends.reduce((s, e) => s + this._endScoreValue(e.value, e.isDouble), 0);
  }

  // Return breakdown string for display
  getEndSumBreakdown() {
    if (this.isEmpty) return '';
    if (this.tiles.length === 1 && this.spinner) {
      return `${this.spinner.a}+${this.spinner.b}`;
    }
    const ends = this.getOpenEnds();
    return ends.map(e => {
      if (e.isDouble) return `(${e.value}+${e.value})`;
      return `${e.value}`;
    }).join(' + ');
  }

  getScore() {
    const sum = this.getEndSum();
    return sum % 5 === 0 ? sum : 0;
  }

  canPlay(tile) {
    if (this.isEmpty) return true;
    const vals = this.getOpenValues();
    return vals.some(v => tile.has(v));
  }

  getValidPlacements(tile) {
    if (this.isEmpty) return [{ end: 'first' }];
    const ends = this.getOpenEnds();
    const placements = [];
    const seen = new Set();
    for (const e of ends) {
      if (tile.has(e.value)) {
        const key = e.end + ':' + e.value;
        if (!seen.has(key)) {
          seen.add(key);
          placements.push({ end: e.end, matchValue: e.value });
        }
      }
    }
    return placements;
  }

  placeTile(tile, placement) {
    this.tiles.push(tile);

    if (placement.end === 'first') {
      if (tile.isDouble) {
        this.spinner = tile;
        this.spinnerIndex = 0;
        this.leftEnd = tile.a;
        this.leftIsDouble = true;
        this.rightEnd = tile.a;
        this.rightIsDouble = true;
        this.spinnerNorth = tile.a;
        this.spinnerNorthIsDouble = false;
        this.spinnerSouth = tile.a;
        this.spinnerSouthIsDouble = false;
        this.spinnerNorthOpen = false;
        this.spinnerSouthOpen = false;
      } else {
        this.leftEnd = tile.a;
        this.leftIsDouble = false;
        this.rightEnd = tile.b;
        this.rightIsDouble = false;
      }
      return;
    }

    const mv = placement.matchValue;
    const isNewSpinner = !this.spinner && tile.isDouble;

    if (placement.end === 'left') {
      if (isNewSpinner) {
        this.spinner = tile;
        this.spinnerIndex = this.tiles.length - 1;
        this.leftEnd = tile.a;
        this.leftIsDouble = true;
        this.spinnerNorth = tile.a;
        this.spinnerNorthIsDouble = false;
        this.spinnerSouth = tile.a;
        this.spinnerSouthIsDouble = false;
        this.spinnerNorthOpen = false;
        this.spinnerSouthOpen = false;
        this.hasRightOfSpinner = true;
        this.hasLeftOfSpinner = false;
      } else {
        this.leftEnd = tile.otherSide(mv);
        this.leftIsDouble = tile.isDouble;
        if (this.spinner) this.hasLeftOfSpinner = true;
      }
    } else if (placement.end === 'right') {
      if (isNewSpinner) {
        this.spinner = tile;
        this.spinnerIndex = this.tiles.length - 1;
        this.rightEnd = tile.a;
        this.rightIsDouble = true;
        this.spinnerNorth = tile.a;
        this.spinnerNorthIsDouble = false;
        this.spinnerSouth = tile.a;
        this.spinnerSouthIsDouble = false;
        this.spinnerNorthOpen = false;
        this.spinnerSouthOpen = false;
        this.hasLeftOfSpinner = true;
        this.hasRightOfSpinner = false;
      } else {
        this.rightEnd = tile.otherSide(mv);
        this.rightIsDouble = tile.isDouble;
        if (this.spinner) this.hasRightOfSpinner = true;
      }
    } else if (placement.end === 'north') {
      this.spinnerNorth = tile.otherSide(mv);
      this.spinnerNorthIsDouble = tile.isDouble;
    } else if (placement.end === 'south') {
      this.spinnerSouth = tile.otherSide(mv);
      this.spinnerSouthIsDouble = tile.isDouble;
    }

    // Open spinner arms once both left and right of spinner have tiles
    if (this.spinner && this.hasLeftOfSpinner && this.hasRightOfSpinner) {
      this.spinnerNorthOpen = true;
      this.spinnerSouthOpen = true;
    }
  }
}

// --- Player ---
class Player {
  constructor(name, isHuman, index) {
    this.name = name;
    this.isHuman = isHuman;
    this.index = index;
    this.hand = [];
    this.score = 0;
  }
  get handPips() { return this.hand.reduce((s, t) => s + t.pips, 0); }
}

// --- AI ---
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


// ============================================================
// RENDERER - Canvas-based board rendering
// ============================================================
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tileW = 50;
    this.tileH = 100;
    this.gap = 6;
    this.placedPositions = [];
    this.layout = { left: [], right: [], north: [], south: [], spinner: null };
    this.offsetX = 0;
    this.offsetY = 0;
  }

  resize() {
    const area = this.canvas.parentElement;
    this.canvas.width = area.clientWidth;
    this.canvas.height = area.clientHeight;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBoard(board) {
    this.resize();
    this.clear();
    if (board.isEmpty) return;
    this._buildLayout(board);
    this._renderLayout();
  }

  _buildLayout(board) {
    this.layout = { left: [], right: [], north: [], south: [], spinner: null };
    if (board.tiles.length === 0) return;
  }

  renderFromPlacements(placements, lastIndex, animProgress, flyFrom) {
    this.resize();
    this.clear();
    if (placements.length === 0) return;
    this.placedPositions = [];

    const pad = 50;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of placements) {
      const w = p.horizontal ? this.tileH : this.tileW;
      const h = p.horizontal ? this.tileW : this.tileH;
      minX = Math.min(minX, p.x - w / 2);
      maxX = Math.max(maxX, p.x + w / 2);
      minY = Math.min(minY, p.y - h / 2);
      maxY = Math.max(maxY, p.y + h / 2);
    }

    const bw = maxX - minX + pad * 2;
    const bh = maxY - minY + pad * 2;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    // Scale to fill the board — cap at 1.2x so early tiles aren't too huge
    const scale = Math.min(1.2, cw / bw, ch / bh);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    this._viewScale = scale;
    this._viewOffsetX = cw / 2 - centerX * scale;
    this._viewOffsetY = ch / 2 - centerY * scale;

    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this._viewOffsetX, this._viewOffsetY);
    ctx.scale(scale, scale);

    for (let i = 0; i < placements.length; i++) {
      const isLast = i === lastIndex;
      if (isLast && animProgress !== undefined && animProgress < 1) {
        const p = placements[i];
        const ease = 1 - Math.pow(1 - animProgress, 3);

        // Determine start position based on who played
        let startX = p.x, startY = p.y - 400;
        const dir = flyFrom || 'bottom';
        if (dir === 'bottom') { startX = p.x; startY = p.y + 500; }
        else if (dir === 'top') { startX = p.x; startY = p.y - 500; }
        else if (dir === 'left') { startX = p.x - 600; startY = p.y; }
        else if (dir === 'right') { startX = p.x + 600; startY = p.y; }

        const curX = startX + (p.x - startX) * ease;
        const curY = startY + (p.y - startY) * ease;
        const startScale = 0.4;
        const curScale = startScale + (1 - startScale) * ease;
        const alpha = Math.min(1, animProgress * 2.5);
        // Slight rotation that settles
        const rotation = (1 - ease) * (dir === 'left' ? -0.3 : dir === 'right' ? 0.3 : dir === 'top' ? -0.2 : 0.2);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(curX, curY);
        ctx.rotate(rotation);
        ctx.scale(curScale, curScale);
        ctx.translate(-curX, -curY);
        this._drawPlacedTile({ ...p, x: curX, y: curY }, true);
        ctx.restore();
      } else {
        this._drawPlacedTile(placements[i], isLast);
      }
    }

    ctx.restore();
  }

  _drawPlacedTile(p, isLast) {
    const ctx = this.ctx;
    const { tile, x, y, horizontal } = p;
    const w = horizontal ? this.tileH : this.tileW;
    const h = horizontal ? this.tileW : this.tileH;
    const r = 7;
    const depth = 4; // 3D depth

    ctx.save();
    ctx.translate(x, y);

    const skin = getSkinColors();

    // Drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    // Bottom edge (3D depth)
    ctx.fillStyle = skin.depth;
    this._roundRect(ctx, -w/2, -h/2 + depth, w, h, r);
    ctx.fill();

    // Reset shadow for main face
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Main tile face with gradient — uses selected skin
    const grad = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
    grad.addColorStop(0, skin.face);
    grad.addColorStop(0.3, skin.face);
    grad.addColorStop(1, skin.faceDark);
    ctx.fillStyle = grad;
    this._roundRect(ctx, -w/2, -h/2, w, h, r);
    ctx.fill();

    // Top bevel highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w/2 + r + 2, -h/2 + 1.5);
    ctx.lineTo(w/2 - r - 2, -h/2 + 1.5);
    ctx.stroke();

    // Left bevel highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w/2 + 1.5, -h/2 + r + 2);
    ctx.lineTo(-w/2 + 1.5, h/2 - r - 2);
    ctx.stroke();

    // Bottom/right bevel shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w/2 - 1, -h/2 + r + 2);
    ctx.lineTo(w/2 - 1, h/2 - r - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w/2 + r + 2, h/2 - 1);
    ctx.lineTo(w/2 - r - 2, h/2 - 1);
    ctx.stroke();

    // Outer border
    ctx.strokeStyle = isLast ? '#e8a735' : 'rgba(160,150,120,0.6)';
    ctx.lineWidth = isLast ? 2.5 : 1;
    this._roundRect(ctx, -w/2, -h/2, w, h, r);
    ctx.stroke();

    // Glow for last tile
    if (isLast) {
      ctx.shadowColor = '#e8a735';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = 'rgba(232,167,53,0.5)';
      ctx.lineWidth = 3;
      this._roundRect(ctx, -w/2, -h/2, w, h, r);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }

    // Spinner highlight — persistent animated border
    if (p.isSpinner) {
      const t = (performance.now() % 2000) / 2000;
      const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
      ctx.shadowColor = `rgba(0,200,220,${pulse * 0.5})`;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = `rgba(0,220,240,${pulse * 0.8})`;
      ctx.lineWidth = 2.5;
      this._roundRect(ctx, -w/2 - 2, -h/2 - 2, w + 4, h + 4, r + 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }

    // Divider line (engraved look)
    ctx.lineWidth = 2;
    if (horizontal) {
      // Groove shadow
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.moveTo(0, -h/2 + 6);
      ctx.lineTo(0, h/2 - 6);
      ctx.stroke();
      // Groove highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(1, -h/2 + 6);
      ctx.lineTo(1, h/2 - 6);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.moveTo(-w/2 + 6, 0);
      ctx.lineTo(w/2 - 6, 0);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(-w/2 + 6, 1);
      ctx.lineTo(w/2 - 6, 1);
      ctx.stroke();
    }

    // Draw pips
    const pipSize = 18;
    if (horizontal) {
      this._draw3DPips(ctx, -w/4, 0, p.leftVal, pipSize);
      this._draw3DPips(ctx, w/4, 0, p.rightVal, pipSize);
    } else {
      this._draw3DPips(ctx, 0, -h/4, p.topVal, pipSize);
      this._draw3DPips(ctx, 0, h/4, p.bottomVal, pipSize);
    }

    ctx.restore();
    this.placedPositions.push({ ...p, drawW: w, drawH: h });
  }

  _draw3DPips(ctx, cx, cy, count, size) {
    const skin = getSkinColors();
    const pipR = 4;
    const s = size * 0.32;
    const positions = this._pipPositions(count, s);

    for (const [px, py] of positions) {
      const x = cx + px;
      const y = cy + py;

      ctx.beginPath();
      ctx.arc(x, y, pipR + 1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fill();

      const pipGrad = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, pipR);
      pipGrad.addColorStop(0, skin.pip);
      pipGrad.addColorStop(1, skin.pip);
      ctx.beginPath();
      ctx.arc(x, y, pipR, 0, Math.PI * 2);
      ctx.fillStyle = pipGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x - 1.2, y - 1.2, pipR * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fill();
    }
  }

  _pipPositions(n, s) {
    switch(n) {
      case 0: return [];
      case 1: return [[0, 0]];
      case 2: return [[-s, -s], [s, s]];
      case 3: return [[-s, -s], [0, 0], [s, s]];
      case 4: return [[-s, -s], [s, -s], [-s, s], [s, s]];
      case 5: return [[-s, -s], [s, -s], [0, 0], [-s, s], [s, s]];
      case 6: return [[-s, -s], [s, -s], [-s, 0], [s, 0], [-s, s], [s, s]];
      default: return [];
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  drawHandTile(container, tile, playable, onClick, onHover, onLeave) {
    const el = document.createElement('div');
    el.className = 'hand-tile' + (playable ? ' playable' : ' not-playable');
    el.innerHTML = `
      <div class="half">${this._pipHTML(tile.a)}</div>
      <div class="divider"></div>
      <div class="half">${this._pipHTML(tile.b)}</div>
    `;
    if (playable) {
      el.addEventListener('click', () => onClick(tile, el));
      if (onHover) el.addEventListener('mouseenter', () => onHover(tile));
      if (onLeave) el.addEventListener('mouseleave', () => onLeave());
    }
    container.appendChild(el);
    return el;
  }

  _pipHTML(n) {
    const size = 50;
    const s = size * 0.24;
    const pipR = 5;
    const positions = this._pipPositions(n, s);
    let dots = positions.map(([x, y]) => {
      const cx = size/2 + x;
      const cy = size/2 + y;
      return `
        <circle cx="${cx}" cy="${cy}" r="${pipR + 1}" fill="rgba(0,0,0,0.08)"/>
        <circle cx="${cx}" cy="${cy}" r="${pipR}" fill="#222"/>
        <circle cx="${cx - 1.2}" cy="${cy - 1.2}" r="${pipR * 0.4}" fill="rgba(255,255,255,0.25)"/>
      `;
    }).join('');
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${dots}</svg>`;
  }
}


// --- Avatar helper (DiceBear Adventurer style) ---
function avatarURL(seed) {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
// --- Trash talk / celebration phrases ---
const PHRASES = {
  opponent: {
    low: [
      'Lucky!', 'Ooh, nice!', 'Didn\'t expect that!', 'Hey, points!',
      'Wait, I scored?', 'Cool cool cool', 'I\'ll take it!', 'Surprise!',
      'Not bad for me!', 'Beginner\'s luck 😅'
    ],
    mid: [
      'Read it and weep!', 'That\'s how it\'s done 💪', 'Calculated.',
      'You saw that coming, right?', 'Boom! 🎯', 'Easy money.',
      'Taking notes?', 'Textbook play.', 'Cha-ching! 💰', 'Smooth operator.'
    ],
    high: [
      'Too easy. 🥱', 'Is that all you got?', 'Bow down. 👑',
      'I do this in my sleep.', 'You\'re welcome for the lesson.',
      'Masterclass in session.', 'GG already? 😏', 'Levels to this game.',
      'Call me the GOAT. 🐐', 'Domino KING. 👑', 'Fear the bones.',
      'That\'s called TALENT.', 'I don\'t miss. 🎯'
    ]
  },
  teammate: {
    low: [
      'Nice one, partner!', 'We got this!', 'Teamwork! 🤝',
      'Go us!', 'Great play!', 'Yay team! 🎉'
    ],
    mid: [
      'That\'s my partner! 💪', 'We\'re cooking now! 🔥', 'Unstoppable duo!',
      'Keep it rolling!', 'They can\'t handle us!', 'Dream team! ⭐'
    ],
    high: [
      'WE\'RE INEVITABLE. 🔥', 'They never had a chance!', 'Dynamic duo strikes again!',
      'Partner in CRIME! 💎', 'We run this table. 👑', 'Legends only. 🏆'
    ]
  },
  draw: {
    low: [
      'I got nothing... 😬', 'Ugh, drawing again.', 'This is rough.',
      'Help me out here!', 'Not my day... 😅', 'Boneyard, my old friend.'
    ],
    mid: [
      'Hmm, nothing fits.', 'Drawing... not ideal.', 'Boneyard time. 🦴',
      'Regrouping...', 'Just a minor setback.', 'I\'ll bounce back.'
    ],
    high: [
      'Strategic draw. 🧠', 'All part of the plan.', 'Loading up ammo...',
      'You think this helps you? 😏', 'I\'ll be back stronger.', 'Patience is a virtue.'
    ]
  },
  domino: {
    low: [
      'I did it! 😲', 'Wait... I won?!', 'Woohoo! 🎉',
      'Can\'t believe it!', 'Finally! 😭', 'That was close!'
    ],
    mid: [
      'DOMINO! 🎯', 'Clean sweep!', 'That\'s game! 💪',
      'Read \'em and weep!', 'Nothing left! ✨', 'Bone dry over here! 🦴'
    ],
    high: [
      'DOMINO, BABY! 👑', 'Flawless victory. 🏆', 'Was there ever any doubt? 😏',
      'Sit DOWN. 🪑', 'Another one bites the dust.', 'I AM the table. 🐐',
      'GG EZ. 💀', 'Perfection. 💎', 'You never had a chance.'
    ]
  }
};

function getPhrase(player, category) {
  const rec = getRecord(player.name);
  const total = rec.wins + rec.losses;
  const ratio = total > 0 ? rec.wins / total : 0.5;
  let tier;
  if (ratio >= 0.6) tier = 'high';
  else if (ratio >= 0.35) tier = 'mid';
  else tier = 'low';
  const pool = PHRASES[category] && PHRASES[category][tier];
  if (!pool) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}


// Persistent human avatar seed
function getHumanAvatarSeed() {
  let seed = localStorage.getItem('domino_human_avatar');
  if (!seed) {
    seed = 'human-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('domino_human_avatar', seed);
  }
  return seed;
}

// Random real names pool
const REAL_NAMES = [
  'Carlos','Maria','James','Aisha','Yuki','Priya','Liam','Sofia','Omar','Elena',
  'Diego','Fatima','Chen','Amara','Raj','Lucia','Kofi','Ingrid','Mateo','Zara',
  'Dante','Mei','Nico','Isla','Tariq','Rosa','Sven','Leila','Marco','Anya',
  'Felix','Nadia','Hugo','Cleo','Ravi','Mila','Axel','Dina','Leo','Vera'
];

function pickRandomNames(count) {
  const shuffled = [...REAL_NAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

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
  if (total === 0) return 'Newcomer';
  const ratio = r.wins / total;
  if (total < 3) return 'Rookie';
  if (ratio >= 0.75) return 'Domino Master';
  if (ratio >= 0.6) return 'Veteran';
  if (ratio >= 0.45) return 'Regular';
  if (ratio >= 0.3) return 'Apprentice';
  return 'Beginner';
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

// ============================================================
// GAME CONTROLLER
// ============================================================
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

    this._initUI();
  }

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
    document.getElementById('draw-btn').addEventListener('click', () => this.drawFromBoneyard());
    document.getElementById('pass-btn').addEventListener('click', () => this.pass());
    document.getElementById('hint-btn').addEventListener('click', () => this.useHint());
    document.getElementById('message-ok').addEventListener('click', () => this.hideMessage());
    document.getElementById('play-again').addEventListener('click', () => this.showScreen('menu-screen'));
    document.getElementById('rematch-btn').addEventListener('click', () => this.startGame(true));
    document.getElementById('menu-btn').addEventListener('click', () => {
      document.getElementById('game-dropdown').classList.toggle('hidden');
    });
    document.getElementById('rules-btn').addEventListener('click', () => {
      document.getElementById('game-dropdown').classList.add('hidden');
      document.getElementById('rules-overlay').classList.remove('hidden');
    });
    document.getElementById('ragequit-btn').addEventListener('click', () => {
      document.getElementById('game-dropdown').classList.add('hidden');
      recordLoss('Human');
      this.showScreen('menu-screen');
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
    document.getElementById('sound-btn').addEventListener('click', () => {
      this._soundMuted = !this._soundMuted;
      const btn = document.getElementById('sound-btn');
      btn.textContent = this._soundMuted ? '🔇' : '🔊';
      btn.classList.toggle('muted', this._soundMuted);
      localStorage.setItem('domino_muted', this._soundMuted ? '1' : '0');
    });
    // Restore mute state
    this._soundMuted = localStorage.getItem('domino_muted') === '1';
    const soundBtn = document.getElementById('sound-btn');
    if (this._soundMuted && soundBtn) { soundBtn.textContent = '🔇'; soundBtn.classList.add('muted'); }

    // Player name input
    const nameInput = document.getElementById('player-name-input');
    if (nameInput) {
      nameInput.value = getPlayerName();
      nameInput.addEventListener('change', () => {
        const name = nameInput.value.trim() || 'Human';
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

    // Show tutorial on first visit — immediately, no delay
    if (!localStorage.getItem('domino_tutorial_done')) {
      showTutorial();
    }

    // Music engine
    this.music = new MusicEngine();

    // Init music on first interaction
    document.addEventListener('click', () => {
      if (!this.music.ctx) this.music.init();
    }, { once: true });

    // Canvas click for choosing end
    const canvas = document.getElementById('board-canvas');
    canvas.addEventListener('click', (e) => this._onBoardClick(e));

    window.addEventListener('resize', () => {
      if (this.renderer) {
        this.renderer.resize();
        this._renderBoard();
      }
      this._updateFloatingArrow();
    });

    // Initial roster preview
    this._updateRoster();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      // Prevent default for game keys when in placement mode
      if (this.selectedTile && this._pendingPlacements && 'lrns'.includes(key)) {
        e.preventDefault();
      }
      const gameScreen = document.getElementById('game-screen');
      if (!gameScreen.classList.contains('active')) return;

      // Close any open overlay/dropdown with Escape
      if (key === 'escape') {
        const dd = document.getElementById('game-dropdown');
        if (dd && !dd.classList.contains('hidden')) { dd.classList.add('hidden'); return; }
        const overlays = ['rules-overlay', 'log-overlay', 'shortcuts-overlay'];
        for (const id of overlays) {
          const el = document.getElementById(id);
          if (el && !el.classList.contains('hidden')) { el.classList.add('hidden'); return; }
        }
        return;
      }

      // Don't process shortcuts if an overlay is open
      const anyOverlay = ['rules-overlay', 'log-overlay', 'count-overlay', 'message-overlay', 'shortcuts-overlay']
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
      if (activePlacements && activePlacements.length > 0 && activeTile && 'lrns'.includes(key)) {
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
      // ? or / = Shortcuts help
      if (key === '?' || key === '/') {
        const el = document.getElementById('shortcuts-overlay');
        if (el) el.classList.toggle('hidden');
      }
      // 1-7 = Select tile by position in hand
      if (key >= '1' && key <= '9') {
        const idx = parseInt(key) - 1;
        const tiles = document.querySelectorAll('.hand-tile.playable');
        if (tiles[idx]) tiles[idx].click();
      }
    });
  }

  _onMenuChange() {
    const mode = this._getOption('game-mode');
    const oppGroup = document.getElementById('opponents-group');
    if (mode === 'teams') {
      oppGroup.style.display = 'none';
    } else {
      oppGroup.style.display = '';
    }
    this._updateRoster();
  }

  _updateRoster() {
    const roster = document.getElementById('player-roster');
    if (!roster) return;

    const mode = this._getOption('game-mode');
    const humanSeed = getHumanAvatarSeed();
    const humanRec = getRecord('Human');
    const difficulties = ['easy', 'medium', 'hard'];

    // Generate preview players with assigned difficulties
    if (!this._previewNames) {
      this._previewNames = pickRandomNames(4);
      this._previewSeeds = this._previewNames.map((n, i) => n + '-preview-' + i);
      this._previewDiffs = this._previewNames.map(() => difficulties[Math.floor(Math.random() * 3)]);
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
        players.push({
          name, avatar: avatarURL(this._previewSeeds[i]),
          isHuman: false, record: rec, rank: getRank(name),
          team: i === 0 ? 'teammate' : 'opponent'
        });
      }
    } else {
      const count = parseInt(this._getOption('opponent-count'));
      for (let i = 0; i < count; i++) {
        const name = this._previewNames[i];
        const rec = getRecord(name);
        players.push({
          name, avatar: avatarURL(this._previewSeeds[i]),
          isHuman: false, record: rec, rank: getRank(name)
        });
      }
    }

    roster.innerHTML = '<div class="roster-title">Players</div>';
    for (const p of players) {
      const card = document.createElement('div');
      card.className = 'roster-card' + (p.isHuman ? ' human' : '');
      const teamBadge = p.team === 'teammate' ? ' 🤝' : p.team === 'opponent' ? ' ⚔️' : '';
      card.innerHTML = `
        <img class="roster-avatar" src="${p.avatar}" alt="${p.name}">
        <div class="roster-info">
          <div class="roster-name">${p.name}${teamBadge}</div>
          <div class="roster-rank">${p.rank}</div>
          <div class="roster-record">${p.record.wins}W - ${p.record.losses}L</div>
        </div>
      `;
      roster.appendChild(card);
    }
  }


  _getOption(groupId) {
    return document.getElementById(groupId).querySelector('.active').dataset.value;
  }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  startGame(rematch) {
    const mode = this._getOption('game-mode');
    this.targetScore = parseInt(this._getOption('target-score'));
    this.teamMode = mode === 'teams';

    const difficulties = ['easy', 'medium', 'hard'];
    const humanSeed = getHumanAvatarSeed();

    if (rematch && this.players && this.players.length > 0) {
      for (const p of this.players) p.score = 0;
      if (this.teams) for (const t of this.teams) t.score = 0;
      this.renderer = new Renderer(document.getElementById('board-canvas'));
      this.gameOver = false;
      this.gameLog = [];
      this._roundNum = 0;
      this.showScreen('game-screen');
      this.startRound();
      return;
    }

    // Use the preview names/seeds from the roster
    const names = this._previewNames || pickRandomNames(4);
    const seeds = this._previewSeeds || names.map((n, i) => n + '-' + i);
    const diffs = this._previewDiffs || names.map(() => difficulties[Math.floor(Math.random() * 3)]);

    this.players = [];
    this.teams = null;

    if (this.teamMode) {
      const you = new Player(getPlayerName(), true, 0);
      you.team = 0;
      you.avatar = avatarURL(humanSeed);
      this.players.push(you);

      const opp1 = new Player(names[0], false, 1);
      opp1.team = 1;
      opp1.ai = new AI(diffs[0]);
      opp1.personality = AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];
      opp1.avatar = avatarURL(seeds[0]);
      this.players.push(opp1);

      const partner = new Player(names[1], false, 2);
      partner.team = 0;
      partner.ai = new AI(diffs[1]);
      partner.personality = AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];
      partner.avatar = avatarURL(seeds[1]);
      this.players.push(partner);

      const opp2 = new Player(names[2], false, 3);
      opp2.team = 1;
      opp2.ai = new AI(diffs[2]);
      opp2.personality = AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];
      opp2.avatar = avatarURL(seeds[2]);
      this.players.push(opp2);

      this.teams = [
        { name: 'Your Team', players: [0, 2], score: 0 },
        { name: 'Opponents', players: [1, 3], score: 0 }
      ];
    } else {
      const numOpponents = parseInt(this._getOption('opponent-count'));
      const you = new Player(getPlayerName(), true, 0);
      you.avatar = avatarURL(humanSeed);
      this.players.push(you);

      for (let i = 0; i < numOpponents; i++) {
        const name = names[i];
        const p = new Player(name, false, i + 1);
        p.ai = new AI(diffs[i]);
        p.personality = AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];
        p.avatar = avatarURL(seeds[i]);
        this.players.push(p);
      }
    }

    // Regenerate preview names for next game
    this._previewNames = pickRandomNames(4);
    this._previewSeeds = this._previewNames.map((n, i) => n + '-preview-' + i + '-' + Date.now());
    this._previewDiffs = this._previewNames.map(() => difficulties[Math.floor(Math.random() * 3)]);
    this._previewNames.forEach((n, i) => seedAIRecord(n, this._previewDiffs[i]));

    this.renderer = new Renderer(document.getElementById('board-canvas'));
    this.sfx = new SFX();
    this.gameOver = false;
    this.gameLog = [];
    this._roundNum = 0;

    // Assign player colors
    const oppColors = [
      { h: 0, name: 'red' },      // red
      { h: 210, name: 'blue' },    // blue
      { h: 280, name: 'purple' },  // purple
      { h: 30, name: 'orange' },   // orange
    ];
    const shuffledColors = oppColors.sort(() => Math.random() - 0.5);
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
    this.startRound();
  }

  startRound() {
      this.board = new Board();
      this.placements = [];
      this.roundOver = false;
      this.selectedTile = null;
      this.selectedEl = null;
      // Stop previous spinner loop
      if (this._spinnerRAF) { cancelAnimationFrame(this._spinnerRAF); this._spinnerRAF = null; }
      this.gameLog = this.gameLog || [];
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
        this.showMessage('No one has a double!\nReshuffling and redealing...', () => {
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

      // Animate dealing then proceed
      this._animateDeal(() => {
        this._updateUI();
        this._renderBoard();
        this._startSpinnerLoop();

        if (this._roundNum === undefined) this._roundNum = 0;
        this._roundNum++;

        const firstPlayer = this.players[this.currentPlayer];
        const spinnerTile = this.forcedFirstTile;
        const whoLabel = firstPlayer.isHuman ? 'You have' : `${firstPlayer.name} has`;

        if (this._roundNum === 1) {
          this._updateFloatingArrow();
          this._showCountdown(() => {
            this._showRoundAnnouncement(whoLabel, spinnerTile, () => {
              this._doTurn();
            });
          });
        } else {
          this._updateFloatingArrow();
          this._showRoundAnnouncement(whoLabel, spinnerTile, () => {
            this._doTurn();
          });
        }
      });
    }

    _animateDeal(callback) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const tileCount = 28;
        const tileW = 70;
        const tileH = 35;
        const pileEls = [];

        // Phase 1: Show all tiles in a pile at center
        for (let i = 0; i < tileCount; i++) {
          const tile = document.createElement('div');
          tile.className = 'deal-tile';
          tile.style.width = tileW + 'px';
          tile.style.height = tileH + 'px';
          tile.style.borderRadius = '5px';
          tile.style.position = 'fixed';
          tile.style.zIndex = 55 + i;
          const ox = (Math.random() - 0.5) * 100;
          const oy = (Math.random() - 0.5) * 70;
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
            const ox = (Math.random() - 0.5) * 120;
            const oy = (Math.random() - 0.5) * 80;
            const rot = (Math.random() - 0.5) * 90;
            tile.style.left = (cx - tileW / 2 + ox) + 'px';
            tile.style.top = (cy - tileH / 2 + oy) + 'px';
            tile.style.transform = `rotate(${rot}deg)`;
          }
          if (this.sfx) this.sfx._play(200 + Math.random() * 100, 0.06, 'square', 0.04);
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

        // Remove remaining boneyard tiles
        const boneyardStart = dealStart + dealt * 80;
        for (let i = dealt; i < pileEls.length; i++) {
          setTimeout(() => {
            const tile = pileEls[i];
            if (!tile) return;
            tile.style.opacity = '0.2';
            tile.style.transform += ' scale(0.5)';
            setTimeout(() => tile.remove(), 300);
          }, boneyardStart + (i - dealt) * 40);
        }

        const totalTime = boneyardStart + (pileEls.length - dealt) * 40 + 400;
        setTimeout(callback, totalTime);
      }

  _showRoundAnnouncement(whoLabel, spinnerTile, callback) {
    const overlay = document.getElementById('countdown-overlay');
    if (!overlay) { callback(); return; }
    overlay.classList.remove('hidden');

    // Build SVG domino tile
    let tileHTML = '';
    if (spinnerTile) {
      const pipPos = (n, s) => {
        const m = { 0:[], 1:[[0,0]], 2:[[-s,-s],[s,s]], 3:[[-s,-s],[0,0],[s,s]], 4:[[-s,-s],[s,-s],[-s,s],[s,s]], 5:[[-s,-s],[s,-s],[0,0],[-s,s],[s,s]], 6:[[-s,-s],[s,-s],[-s,0],[s,0],[-s,s],[s,s]] };
        return m[n] || [];
      };
      const halfSVG = (val, cy) => {
        return pipPos(val, 10).map(([x,y]) =>
          `<circle cx="${40+x}" cy="${cy+y}" r="5" fill="#333"/>`
        ).join('');
      };
      tileHTML = `
        <svg width="80" height="140" viewBox="0 0 80 140" style="display:inline-block;vertical-align:middle;margin:0 8px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5));">
          <rect x="2" y="2" width="76" height="136" rx="10" fill="url(#tg)" stroke="rgba(180,170,140,0.6)" stroke-width="2"/>
          <defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffef8"/><stop offset="0.3" stop-color="#f5f0dc"/><stop offset="1" stop-color="#e8e0c4"/></linearGradient></defs>
          <line x1="16" y1="70" x2="64" y2="70" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>
          <line x1="16" y1="71" x2="64" y2="71" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
          ${halfSVG(spinnerTile.a, 35)}
          ${halfSVG(spinnerTile.b, 105)}
        </svg>
      `;
    }

    overlay.innerHTML = `
      <div style="text-align:center;animation:announceIn 0.5s ease-out forwards;">
        <div style="font-size:1.1rem;font-weight:600;opacity:0.5;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px;">Round ${this._roundNum}</div>
        <div style="margin-bottom:16px;">${tileHTML}</div>
        <div style="font-size:1.6rem;font-weight:800;color:#f0b840;">${whoLabel} the highest double</div>
      </div>
    `;
    if (this.sfx) this.sfx._play(660, 0.2, 'sine', 0.1);
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
      callback();
    }, 3000);
  }

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
      setTimeout(next, i === steps.length ? 500 : 800);
    };
    next();
  }

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

  _doTurn() {
    if (this.roundOver || this.gameOver) return;

    const player = this.players[this.currentPlayer];
    this._updateUI();

    // First play of the round: must play the highest double
    if (this.forcedFirstTile && this.board.isEmpty) {
      this._suppressToast = true; // suppress toast during auto-play
      const tile = this.forcedFirstTile;
      this.forcedFirstTile = null;
      setTimeout(() => {
        this._executePlay(player, tile, { end: 'first' });
      }, player.isHuman ? 600 : 1500);
      return;
    }

    if (!player.isHuman) {
      // Show centered thinking overlay
      this._showThinking(player);
      const base = 1500;
      const jitter = 500 + Math.random() * 1500;
      setTimeout(() => this._aiTurn(player), base + jitter);
    } else {
      this._hideThinking();
      this._enableHumanPlay(player);
    }
  }

  _showThinking(player) {
    const el = document.getElementById('thinking-overlay');
    if (!el) return;
    el.classList.remove('hidden');

    const isTeammate = this.teamMode && player.team === this.players[0].team;
    const label = isTeammate ? '🤝 Teammate' : '';

    el.innerHTML = `
      <div class="think-card">
        <img class="think-avatar" src="${player.avatar}" alt="${player.name}">
        <div class="think-info">
          <div class="think-name">${player.name} ${label ? '<span style="font-size:0.7rem;opacity:0.6;">' + label + '</span>' : ''}</div>
          <div class="think-label">Thinking <span class="thinking-dots-lg"><span></span><span></span><span></span></span></div>
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

  _hideThinking() {
    const el = document.getElementById('thinking-overlay');
    if (el) el.classList.add('hidden');
  }

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
          action: 'draw'
        });
        if (this.sfx) this.sfx.draw();
        this._animateBoneyardDraw(player);
        // Show draw phrase
        const drawPhrase = getPhrase(player, 'draw');
        if (drawPhrase) setTimeout(() => this._showSpeechBubble(player, drawPhrase), 300);
        this._updateUI();
        setTimeout(() => this._aiTurn(player), 1400);
        return;
      } else {
        this._hideThinking();
        this._nextTurn();
        return;
      }
    }

    const play = player.ai.choosePlay(player.hand, this.board, player.personality);
    if (!play) {
      this._hideThinking();
      this._nextTurn();
      return;
    }

    this._executePlay(player, play.tile, play.placement);
  }

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
      let moveCount = 0;
      for (const t of player.hand) moveCount += this.board.getValidPlacements(t).length;
      hintBtn.disabled = pts < 5 || moveCount <= 1;
    }
  }

  useHint() {
    const player = this.players[0];
    if (!player.isHuman || this.currentPlayer !== 0) return;

    const pts = this.teamMode && this.teams ? this.teams[player.team].score : player.score;
    if (pts < 5) return;

    // Deduct 5 points
    if (this.teamMode && this.teams) {
      this.teams[player.team].score -= 5;
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

  drawFromBoneyard() {
    const player = this.players[this.currentPlayer];
    if (!player.isHuman || this.boneyard.length === 0) return;

    const drawn = this.boneyard.pop();
    player.hand.push(drawn);
    this.gameLog.push({
      turn: this._logTurn++,
      player: player.name,
      avatar: player.avatar,
      action: 'draw'
    });
    if (this.sfx) this.sfx.draw();
    this._animateBoneyardDraw(player);
    this._updateUI();

    // Check if exactly one move exists after drawing — auto-play it
    const playable = [];
    for (const tile of player.hand) {
      const placements = this.board.getValidPlacements(tile);
      for (const p of placements) playable.push({ tile, placement: p });
    }
    if (playable.length === 1) {
      setTimeout(() => {
        this._executePlay(player, playable[0].tile, playable[0].placement);
      }, 600);
      return;
    }

    this._enableHumanPlay(player);
  }

  pass() {
    const player = this.players[this.currentPlayer];
    if (!player.isHuman) return;
    this.gameLog.push({
      turn: this._logTurn++,
      player: player.name,
      avatar: player.avatar,
      action: 'pass'
    });
    this._nextTurn();
  }

  _onTileClick(tile, el) {
    const player = this.players[this.currentPlayer];
    if (!player.isHuman) return;
    if (!this.board.canPlay(tile)) return;

    this._hoverTile = null; this._hoverPlacements = null;

    const placements = this.board.getValidPlacements(tile);

    if (placements.length === 1) {
      this._executePlay(player, tile, placements[0]);
    } else {
      // Check if all placements result in the same score — if so, auto-pick
      const scores = placements.map(p => {
        const sim = new AI('easy')._cloneBoard(this.board);
        sim.placeTile(tile, p);
        return sim.getScore();
      });
      const allSame = scores.every(s => s === scores[0]);
      if (allSame) {
        // Pick the first one automatically
        this._executePlay(player, tile, placements[0]);
      } else {
        if (this.selectedEl) this.selectedEl.classList.remove('selected');
        this.selectedTile = tile;
        this.selectedEl = el;
        el.classList.add('selected');
        this._showEndChoices(tile, placements);
      }
    }
  }

  _onTileHover(tile) {
    if (this.currentPlayer !== 0) return;
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

  _onTileLeave() {
    // Don't clear — keep showing the last hovered tile's placements
    // They'll be replaced when hovering another tile or cleared on click/turn change
  }

  _showEndChoices(tile, placements) {
    // Highlight available ends on the board
    this._pendingPlacements = placements;
    this._renderBoard(placements);
  }

  _onBoardClick(e) {
    if (!this.selectedTile || !this._pendingPlacements) return;

    const rect = this.renderer.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Convert screen coords to world coords using the view transform
    const scale = this.renderer._viewScale || 1;
    const offX = this.renderer._viewOffsetX || 0;
    const offY = this.renderer._viewOffsetY || 0;
    const mx = (screenX - offX) / scale;
    const my = (screenY - offY) / scale;

    let bestEnd = null;
    let bestDist = Infinity;

    for (const p of this._pendingPlacements) {
      const endPos = this._getEndPosition(p.end);
      if (endPos) {
        const dist = Math.hypot(mx - endPos.x, my - endPos.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestEnd = p;
        }
      }
    }

    if (bestEnd) {
      const player = this.players[this.currentPlayer];
      this._executePlay(player, this.selectedTile, bestEnd);
      this.selectedTile = null;
      this.selectedEl = null;
      this._pendingPlacements = null;
    }
  }

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
      if (p.branch === 'north') {
        if (!northMost || p.y < northMost.y) northMost = p;
      }
      if (p.branch === 'south') {
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

  _executePlay(player, tile, placement) {
    this._hideThinking();
    player.hand = player.hand.filter(t => !t.equals(tile));
    this.board.placeTile(tile, placement);
    this._lastPlayedBy = player.index; // track who played for fly-in direction
    this._addVisualPlacement(tile, placement);

    const score = this.board.getScore();
    const scored = score > 0;

    // Log the play
    const logScores = {};
    if (this.teamMode && this.teams) {
      this.teams.forEach(t => logScores[t.name] = t.score);
    } else {
      this.players.forEach(p => logScores[p.name] = p.score);
    }
    this.gameLog.push({
      turn: this._logTurn++,
      player: player.name,
      avatar: player.avatar,
      action: 'play',
      tile: `${tile.a}|${tile.b}`,
      end: placement.end,
      score: scored ? score : 0,
      scores: logScores
    });
    if (scored) {
      player.score += score;
      if (this.teamMode && this.teams) {
        this.teams[player.team].score += score;
      }
      this._showScorePopup(score, player);
      if (this.sfx) this.sfx.score();
    } else {
      if (this.sfx) this.sfx.place();
    }

    this.selectedTile = null;
    this.selectedEl = null;
    this._pendingPlacements = null;
    this._hoverTile = null; this._hoverPlacements = null;

    this._updateUI();
    // Don't call _renderBoard here — _animateFlyIn handles it

    const delay = scored ? 2000 : 800;
    setTimeout(() => {
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

  _getPlayerPosition(playerIndex) {
    if (playerIndex === 0) return 'bottom';
    const opponents = this.players.filter(p => p.index !== 0);
    const positions = ['top', 'left', 'right'];
    if (this.teamMode && opponents.length === 3) {
      const partner = opponents.find(p => p.team === 0);
      const opps = opponents.filter(p => p.team !== 0);
      const map = [
        { player: partner, pos: 'top' },
        { player: opps[0], pos: 'left' },
        { player: opps[1], pos: 'right' }
      ];
      const found = map.find(m => m.player && m.player.index === playerIndex);
      return found ? found.pos : 'top';
    }
    const oppIdx = opponents.findIndex(p => p.index === playerIndex);
    return oppIdx >= 0 ? positions[oppIdx % 3] : 'top';
  }

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

  _nextTurn() {
    // Clear any lingering highlights and suppress flag
    this.selectedTile = null;
    this.selectedEl = null;
    this._pendingPlacements = null;
    this._hoverTile = null; this._hoverPlacements = null;
    this._suppressToast = false;

    this.currentPlayer = (this.currentPlayer + 1) % this.players.length;

    // Check if all players are stuck (blocked game)
    let allStuck = true;
    for (let i = 0; i < this.players.length; i++) {
      const idx = (this.currentPlayer + i) % this.players.length;
      const p = this.players[idx];
      const canPlay = p.hand.some(t => this.board.canPlay(t));
      if (canPlay || this.boneyard.length > 0) {
        allStuck = false;
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
      // Only show the LOSING team's bones
      countPlayers = loseTeam.players.map(i => this.players[i]).filter(p => p.hand.length > 0);
      winnerLabel = winner.name;
      bonusCalc = { bonus: Math.max(0, bonus), recipient: winTeam.name };
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
      action: 'round-end',
      player: winner.name,
      avatar: winner.avatar,
      detail: `${winner.name} dominoes! +${bonusCalc.bonus} for ${bonusCalc.recipient}`,
      scores: logScores
    });

    this._updateUI();

    if (countPlayers.length > 0) {
      this._showBoneCounting(winnerLabel, countPlayers, bonusCalc, () => {
        if (this._isGameWon()) this._endGame();
        else this.startRound();
      });
    } else {
      if (this._isGameWon()) this._endGame();
      else {
        this.showMessage(`${winnerLabel} dominoes! No bones left to count.`, () => this.startRound());
      }
    }
  }

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

    // Log blocked round end
    const logScores = {};
    if (this.teamMode && this.teams) {
      this.teams.forEach(t => logScores[t.name] = t.score);
    } else {
      this.players.forEach(p => logScores[p.name] = p.score);
    }
    this.gameLog.push({
      turn: this._logTurn++,
      action: 'round-end',
      player: winnerLabel,
      avatar: '',
      detail: `Blocked! ${winnerLabel} wins round. +${bonusCalc.bonus} for ${bonusCalc.recipient}`,
      scores: logScores
    });

    this._showBoneCounting(`Blocked! ${winnerLabel} wins`, countPlayers, bonusCalc, () => {
      if (this._isGameWon()) this._endGame();
      else this.startRound();
    });
  }

  _showBoneCounting(title, countPlayers, bonusCalc, callback) {
    const overlay = document.getElementById('count-overlay');
    overlay.classList.remove('hidden');
    overlay.innerHTML = '';

    const titleEl = document.createElement('div');
    titleEl.className = 'count-title';
    titleEl.textContent = title + ' — Counting Bones';
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
          ? ' <span style="color:#4aaf6c;font-size:0.75rem;font-weight:700;">🤝 TEAMMATE</span>'
          : ' <span style="color:#e04a3a;font-size:0.75rem;font-weight:700;">⚔️ OPPONENT</span>';
      }

      row.innerHTML = `
        <img class="count-avatar" src="${p.avatar}" alt="${p.name}">
        <div class="count-info">
          <div class="count-name">${p.name}${teamTag}</div>
          <div class="count-tiles" id="count-tiles-${p.index}"></div>
        </div>
        <div class="count-pips" id="count-pips-${p.index}">0</div>
      `;
      overlay.appendChild(row);

      // Animate tiles flipping in one by one
      const playerTiles = [...p.hand];
      let runningPips = 0;
      playerTiles.forEach((tile, i) => {
        const delay = tileDelay + i * 300;
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

      tileDelay += playerTiles.length * 300 + 200;
    }

    // Show total and bonus after all tiles counted
    setTimeout(() => {
      const totalEl = document.createElement('div');
      totalEl.className = 'count-total';
      if (bonusCalc.bonus > 0) {
        totalEl.innerHTML = `${totalPips} pips → <span class="ct-bonus">+${bonusCalc.bonus}</span> for ${bonusCalc.recipient}`;
      } else {
        totalEl.innerHTML = `${totalPips} pips → <span class="ct-bonus">+0</span> bonus`;
      }
      overlay.appendChild(totalEl);

      if (this.sfx && bonusCalc.bonus > 0) this.sfx.score();

      // Stars based on bonus amount — only for human/human's team
      const humanTeamWon = bonusCalc.recipient === 'Your Team' ||
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
        btn.textContent = 'Continue';
        btn.addEventListener('click', () => {
          overlay.classList.add('hidden');
          callback();
        });
        overlay.appendChild(btn);
      }, 600);
    }, tileDelay + 400);
  }
  _countPipSVG(n) {
    const size = 24;
    const s = size * 0.22;
    const positions = [[0,0],[[- s,-s],[s,s]],[[-s,-s],[0,0],[s,s]],[[-s,-s],[s,-s],[-s,s],[s,s]],[[-s,-s],[s,-s],[0,0],[-s,s],[s,s]],[[-s,-s],[s,-s],[-s,0],[s,0],[-s,s],[s,s]]];
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

  _endGame() {
    this.gameOver = true;
    if (this.sfx) this.sfx.win();

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
        const members = team.players.map(i => this.players[i].name).join(' & ');
        row.innerHTML = `<span>${avatars}${isWin ? '👑 ' : ''}${team.name} (${members})</span><span>${team.score} pts</span>`;
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
        row.innerHTML = `<span><img src="${p.avatar}" style="width:44px;height:44px;border-radius:50%;vertical-align:middle;margin-right:10px;">${p === winner ? '👑 ' : ''}${p.name} <span style="opacity:0.5;font-size:0.8rem">${rank}</span></span><span>${p.score} pts</span>`;
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
      spawnConfetti();
    } else {
      trackStat('loseStreak', 1);
      addXP(10);
    }
    checkAchievements(this);
    if (humanWon && unlockAchievement('domino_win')) showAchievementPopup('domino_win');

    // Show "GAME OVER!" on the board first, then transition
    const overlay = document.getElementById('countdown-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      const winnerName = this.teamMode
        ? (this.teams[0].score >= this.teams[1].score ? this.teams[0].name : this.teams[1].name)
        : this.players.reduce((a, b) => a.score > b.score ? a : b).name;
      const msg = humanWon ? '🏆 You Win!' : `${winnerName} Wins!`;
      overlay.innerHTML = `
        <div style="text-align:center;animation:announceIn 0.5s ease-out forwards;">
          <div style="font-size:4rem;font-weight:900;letter-spacing:4px;background:linear-gradient(180deg,#fff 20%,#f0b840);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px;">GAME OVER</div>
          <div style="font-size:1.8rem;font-weight:800;color:#f0b840;margin-bottom:4px;">${msg}</div>
        </div>
      `;
      setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.innerHTML = '';
        this.showScreen('gameover-screen');
      }, 3000);
    } else {
      this.showScreen('gameover-screen');
    }
  }

  _showScorePopup(score, player) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';

    let size, duration;
    if (score >= 20) { size = '7rem'; duration = 3200; }
    else if (score >= 15) { size = '6rem'; duration = 3000; }
    else if (score >= 10) { size = '5.2rem'; duration = 2800; }
    else { size = '4rem'; duration = 2500; }

    popup.style.fontSize = size;
    popup.innerHTML = `<span class="score-label">${player.name}</span>+${score}`;
    popup.style.left = '50%';
    popup.style.top = '45%';
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), duration);

    // Flash the player's score item
    const scoreItems = document.querySelectorAll('.score-item');
    if (scoreItems[player.index]) {
      scoreItems[player.index].classList.remove('score-flash');
      void scoreItems[player.index].offsetWidth;
      scoreItems[player.index].classList.add('score-flash');
    }

    // Speech bubble for AI players
    if (!player.isHuman) {
      const isTeammate = this.teamMode && player.team === this.players[0].team;
      const phrase = getPhrase(player, isTeammate ? 'teammate' : 'opponent');
      setTimeout(() => this._showSpeechBubble(player, phrase), 400);
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
    }
  }

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

  showMessage(text, callback) {
    document.getElementById('message-text').innerHTML = text.replace(/\n/g, '<br>');
    document.getElementById('message-overlay').classList.remove('hidden');
    this._messageCallback = callback;
  }

  hideMessage() {
    document.getElementById('message-overlay').classList.add('hidden');
    if (this._messageCallback) {
      const cb = this._messageCallback;
      this._messageCallback = null;
      cb();
    }
  }

  _updateUI() {
    // Score bar at top
    const scoreBar = document.getElementById('score-bar-content');
    if (scoreBar) {
      if (this.teamMode && this.teams) {
        scoreBar.innerHTML = `
          <div class="sb-team" style="border-color:rgba(100,200,130,0.3);">
            <span class="sb-team-name">🟢 ${this.teams[0].name}</span>
            <span class="sb-team-score">${this.teams[0].score}</span>
          </div>
          <span class="sb-vs">VS</span>
          <div class="sb-team" style="border-color:rgba(220,100,80,0.3);">
            <span class="sb-team-name">🔴 ${this.teams[1].name}</span>
            <span class="sb-team-score">${this.teams[1].score}</span>
          </div>
          <span class="sb-target">Playing to ${this.targetScore}</span>
        `;
      } else {
        // FFA — show all player scores compactly
        let html = '';
        for (const p of this.players) {
          const isCurrent = p.index === this.currentPlayer;
          html += `<div class="sb-player-score" style="${isCurrent ? 'border-color:rgba(232,167,53,0.4);background:rgba(232,167,53,0.1);' : ''}">
            <span class="sb-ps-name">${p.name}</span>
            <span class="sb-ps-score">${p.score}</span>
          </div>`;
        }
        html += `<span class="sb-target">Playing to ${this.targetScore}</span>`;
        scoreBar.innerHTML = html;
      }
    }

    // End sum display
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
      scoreEl.textContent = endScore > 0 ? `Scores ${endScore}!` : 'No score';
      scoreEl.style.color = endScore > 0 ? '#4aaf6c' : 'rgba(255,255,255,0.4)';
    }

    // Last played tile SVG
    const lastTileEl = document.getElementById('last-played-tile');
    if (lastTileEl && this.placements.length > 0) {
      const last = this.placements[this.placements.length - 1];
      const t = last.tile;
      if (t) {
        const pipPos = (n, s) => {
          const m = {0:[],1:[[0,0]],2:[[-s,-s],[s,s]],3:[[-s,-s],[0,0],[s,s]],4:[[-s,-s],[s,-s],[-s,s],[s,s]],5:[[-s,-s],[s,-s],[0,0],[-s,s],[s,s]],6:[[-s,-s],[s,-s],[-s,0],[s,0],[-s,s],[s,s]]};
          return m[n]||[];
        };
        const dots = (val, cy) => pipPos(val, 7).map(([x,y]) =>
          `<circle cx="${22+x}" cy="${cy+y}" r="3.5" fill="#333"/>`
        ).join('');
        lastTileEl.innerHTML = `
          <div style="text-align:center;">
            <div style="font-size:0.55rem;opacity:0.4;margin-bottom:3px;text-transform:uppercase;letter-spacing:1px;">Last Played</div>
            <svg width="44" height="80" viewBox="0 0 44 80" style="filter:drop-shadow(0 0 8px rgba(232,167,53,0.5));">
              <rect x="1" y="1" width="42" height="78" rx="6" fill="url(#ltg)" stroke="#e8a735" stroke-width="2"/>
              <defs><linearGradient id="ltg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffef8"/><stop offset="0.3" stop-color="#f5f0dc"/><stop offset="1" stop-color="#e8e0c4"/></linearGradient></defs>
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
      const intensity = Math.min(1, maxScore / this.targetScore);
      this.music.setIntensity(intensity);
    }

    // Turn toast notification — suppress during countdown/announcement
    if (this._suppressToast) return this._renderHand();
    const player = this.players[this.currentPlayer];
    const toast = document.getElementById('turn-indicator');
    // Build turn label
    let turnText;
    if (player.isHuman) {
      turnText = '<span>Your</span> turn';
    } else {
      const isTeammate = this.teamMode && player.team === this.players[0].team;
      const tag = isTeammate ? ' <span style="font-size:0.75rem;opacity:0.6;">🤝 Teammate</span>' : '';
      turnText = `<span>${player.name}</span>'s turn${tag}`;
    }
    toast.innerHTML = `
      <img class="toast-avatar" src="${player.avatar}" alt="${player.name}">
      <div class="toast-text">${turnText}</div>
    `;
    // Reset and show
    toast.classList.remove('visible', 'fading');
    void toast.offsetWidth;
    toast.classList.add('visible');
    // Auto-fade after delay
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
      toast.classList.add('fading');
    }, 2000);

    // Hand (show current human player's hand)
    this._renderHand();

    // Floating arrow
    this._updateFloatingArrow();
  }

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
      const positions = ['top', 'left', 'right'];
      if (this.teamMode && opponents.length === 3) {
        const partner = opponents.find(p => p.team === 0);
        const opps = opponents.filter(p => p.team !== 0);
        const map = [
          { player: partner, pos: 'top' },
          { player: opps[0], pos: 'left' },
          { player: opps[1], pos: 'right' }
        ];
        const found = map.find(m => m.player && m.player.index === idx);
        if (found) pos = found.pos;
      } else {
        const oppIdx = opponents.findIndex(p => p.index === idx);
        if (oppIdx >= 0) pos = positions[oppIdx % 3];
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

  _renderHand() {
      const container = document.getElementById('player-hand');
      container.innerHTML = '';

      const human = this.players[0];
      human.hand.sort((a, b) => a.pips - b.pips);

      const isMyTurn = this.currentPlayer === 0 && human.isHuman;
      for (const tile of human.hand) {
        const playable = isMyTurn && this.board.canPlay(tile);
        this.renderer.drawHandTile(
          container, tile, playable,
          (t, el) => this._onTileClick(t, el),
          isMyTurn ? (t) => this._onTileHover(t) : null,
          isMyTurn ? () => this._onTileLeave() : null
        );
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
        const turnLabel = isTurn ? '<span style="color:#f0b840;font-size:0.8rem;font-weight:700;">YOUR TURN</span>' : '';

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
            <span class="human-name">${human.name} ${turnLabel}</span>
            <span class="human-record">${rec.wins}W ${rec.losses}L</span>
          </div>
        `;
      }

      this._renderOpponentHands();
      this._renderBoneyard();
    }

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
      assignments = [
        { pos: 'top', player: partner },
        { pos: 'left', player: opps[0] },
        { pos: 'right', player: opps[1] }
      ];
    } else {
      assignments = opponents.map((p, i) => ({ pos: positions[i % 3], player: p }));
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
        ? '<span style="font-size:0.6rem;color:#4aaf6c;font-weight:700;">TEAMMATE</span>'
        : '<span style="font-size:0.6rem;color:#e04a3a;font-weight:700;">OPPONENT</span>') : '';

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
        <img class="opp-avatar" src="${player.avatar}" alt="${player.name}" style="border-color:${avatarBorder};">
        <div class="opp-info">
          <span class="opp-name${isTurn ? ' active-turn' : ''}" style="${!isTurn ? 'color:hsla(' + c.h + ',' + c.s + '%,' + (c.l + 30) + '%,0.9);' : ''}">${teamIcon}${player.name}</span>
          ${teamLabel}
          <span class="opp-record">${rec.wins}W ${rec.losses}L</span>
          ${player.personality ? '<span class="personality-badge">' + player.personality.icon + ' ' + player.personality.name + '</span>' : ''}
        </div>
      `;
      el.appendChild(label);

      // Thinking indicator
      if (isTurn) {
        const think = document.createElement('div');
        think.className = 'opp-thinking';
        think.innerHTML = 'Thinking<span class="thinking-dots"><span></span><span></span><span></span></span>';
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
    }
  }

  _renderBoneyard() {
    const tilesEl = document.getElementById('boneyard-tiles');
    const labelEl = document.getElementById('boneyard-count');
    if (!tilesEl || !labelEl) return;

    tilesEl.innerHTML = '';
    labelEl.textContent = this.boneyard.length;

    // Use a seeded random so the pile doesn't reshuffle every render
    let seed = 42;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };

    const count = this.boneyard.length;
    const pileW = 130;
    const pileH = 30;

    for (let i = 0; i < count; i++) {
      const t = document.createElement('div');
      t.className = 'bone-tile';
      const x = rand() * (pileW - 34);
      const y = rand() * (pileH - 17);
      const angle = (rand() - 0.5) * 90; // -45 to +45 degrees
      t.style.left = x + 'px';
      t.style.top = y + 'px';
      t.style.transform = `rotate(${angle}deg)`;
      t.style.zIndex = i;
      tilesEl.appendChild(t);
    }
  }
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
        <div class="stat-section-title">Overall</div>
        <div class="stat-row"><span class="stat-label">Games Played</span><span class="stat-value">${s.gamesPlayed || 0}</span></div>
        <div class="stat-row"><span class="stat-label">Wins / Losses</span><span class="stat-value">${rec.wins}W ${rec.losses}L</span></div>
        <div class="stat-row"><span class="stat-label">Win Rate</span><span class="stat-value">${winRate}%</span></div>
        <div class="stat-row"><span class="stat-label">Best Win Streak</span><span class="stat-value">${s.bestStreak || 0}</span></div>
        <div class="stat-row"><span class="stat-label">Total Points Scored</span><span class="stat-value">${s.totalScore || 0}</span></div>
        <div class="stat-row"><span class="stat-label">Highest Single Play</span><span class="stat-value">${s.highestPlayScore || 0}</span></div>
        <div class="stat-row"><span class="stat-label">Highest Round Bonus</span><span class="stat-value">${s.highestRoundScore || 0}</span></div>
      </div>
      <div class="stat-section">
        <div class="stat-section-title">Achievements (${unlocked.length}/${ACHIEVEMENTS.length})</div>
        ${ACHIEVEMENTS.map(a => {
          const isUnlocked = unlocked.includes(a.id);
          return `<div class="achievement-row ${isUnlocked ? 'unlocked' : 'locked'}">
            <span class="achievement-icon">${a.icon}</span>
            <div class="achievement-info">
              <div class="achievement-name">${a.name}</div>
              <div class="achievement-desc">${a.desc}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
  }
  _renderPrefs() {
    const container = document.getElementById('prefs-content');
    if (!container) return;
    const currentSkin = getTileSkin();

    container.innerHTML = `
      <div class="pref-group">
        <div class="pref-label">Tile Skin</div>
        <div class="skin-options">
          ${TILE_SKINS.map(s => `
            <div class="skin-option ${s.id === currentSkin ? 'active' : ''}" data-skin="${s.id}">
              <div class="skin-preview" style="background:linear-gradient(135deg,${s.face},${s.faceDark});border-color:${s.border};"></div>
              <span>${s.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="pref-group">
        <div class="pref-label">Audio</div>
        <label class="music-toggle">
          <input type="checkbox" id="music-toggle-cb" ${this.music && this.music.enabled ? 'checked' : ''}>
          <span>Background Music</span>
        </label>
      </div>
    `;

    // Skin click handlers
    container.querySelectorAll('.skin-option').forEach(el => {
      el.addEventListener('click', () => {
        setTileSkin(el.dataset.skin);
        this._renderPrefs();
        this._renderBoard();
      });
    });

    // Music toggle
    const musicCb = document.getElementById('music-toggle-cb');
    if (musicCb) {
      musicCb.addEventListener('change', () => {
        if (this.music) this.music.toggle();
      });
    }
  }

  _updateXPBar() {
    const wrap = document.getElementById('xp-bar-wrap');
    if (!wrap) return;
    const xp = getXPProgress();
    wrap.innerHTML = `
      <span class="xp-level">Lv.${xp.level}</span>
      <div class="xp-bar"><div class="xp-fill" style="width:${xp.pct}%"></div></div>
    `;
  }
  _renderLog() {
    const container = document.getElementById('log-entries');
    if (!container) return;
    container.innerHTML = '';

    if (!this.gameLog || this.gameLog.length === 0) {
      container.innerHTML = '<div style="opacity:0.4;text-align:center;padding:20px;">No moves yet</div>';
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
      container.innerHTML = '<div style="opacity:0.4;text-align:center;padding:20px;">No moves yet</div>';
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
            `<span style="margin-right:8px;">${name}: <span style="color:#f0b840;font-weight:800;">${s}</span></span>`
          ).join('');
        }
        div.innerHTML = `
          <span class="log-num">—</span>
          <div style="flex:1;">
            <div style="font-weight:700;color:#f0b840;margin-bottom:4px;">🏁 ${entry.detail}</div>
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
        detail = `played ${makeTileHTML(entry.tile)} on ${entry.end}`;
        if (entry.score > 0) detail += ` <span class="log-score">+${entry.score}</span>`;
      } else if (entry.action === 'draw') {
        detail = '<span class="log-action">drew from boneyard</span>';
      } else if (entry.action === 'pass') {
        detail = '<span class="log-action">passed</span>';
      }

      // Running scores
      let scoresHtml = '';
      if (entry.scores) {
        scoresHtml = '<div style="font-size:0.7rem;opacity:0.4;margin-top:2px;">' +
          Object.entries(entry.scores).map(([name, s]) => `${name}:${s}`).join(' · ') +
          '</div>';
      }

      div.innerHTML = `
        <span class="log-num">${entry.turn}</span>
        <img class="log-avatar" src="${entry.avatar}" alt="${entry.player}">
        <div><span class="log-name">${entry.player}</span> ${detail}${scoresHtml}</div>
      `;
      container.appendChild(div);
    }

    container.scrollTop = 0;
  }

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
            ctx.save();
            ctx.fillStyle = 'rgba(232, 167, 53, 0.25)';
            ctx.strokeStyle = '#e8a735';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#e8a735';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 35, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.end.toUpperCase(), pos.x, pos.y);
            ctx.restore();
          }
        }

        ctx.restore();
      }
    }
}

// --- Sound Effects ---
class SFX {
  constructor() {
    this.ctx = null;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  _play(freq, duration, type = 'sine', vol = 0.15) {
    if (!this.ctx || (window.game && window.game._soundMuted)) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }
  place() {
    this._play(400, 0.06, 'square', 0.06);
    setTimeout(() => this._play(600, 0.08, 'sine', 0.08), 30);
  }
  score() {
    this._play(523, 0.2, 'sine', 0.15);
    setTimeout(() => this._play(659, 0.2, 'sine', 0.15), 120);
    setTimeout(() => this._play(784, 0.25, 'sine', 0.15), 240);
    setTimeout(() => this._play(1047, 0.3, 'sine', 0.12), 360);
  }
  draw() {
    // Sad descending tone for boneyard draw
    this._play(400, 0.15, 'sine', 0.1);
    setTimeout(() => this._play(320, 0.15, 'sine', 0.1), 120);
    setTimeout(() => this._play(260, 0.25, 'sine', 0.08), 240);
  }
  win() {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) =>
      setTimeout(() => this._play(f, 0.35, 'sine', 0.12), i * 120)
    );
  }
}

// --- Custom Player Name ---
function getPlayerName() {
  return localStorage.getItem('domino_player_name') || 'Human';
}
// --- Tutorial System ---
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

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to All Fives!',
    body: 'All Fives is a classic domino game where you score points by making the <strong>open ends add up to multiples of 5</strong>. Let\'s learn how to play!',
    visual: () => `<div class="tut-visual">${tutTileSVG(5,5,60,108,true)} ${tutTileSVG(6,4,60,108)} ${tutTileSVG(3,2,60,108)} ${tutTileSVG(1,0,60,108)}</div>`
  },
  {
    title: 'The Tiles',
    body: 'A standard set has <strong>28 tiles</strong> with every combination from 0-0 to 6-6. Each tile has two halves with pip values.',
    visual: () => `<div class="tut-visual">${tutTileSVG(0,0,44,80)} ${tutTileSVG(1,2,44,80)} ${tutTileSVG(3,5,44,80)} ${tutTileSVG(6,6,44,80)} <span style="opacity:0.4;font-size:0.9rem;">...28 total</span></div>`
  },
  {
    title: 'Starting the Game',
    body: 'The player with the <strong>highest double</strong> plays first. That tile becomes the <strong>spinner</strong> — the center of the board that can branch in all 4 directions.',
    visual: () => `<div class="tut-visual">${tutTileSVG(6,6,70,126,true)}</div><div style="text-align:center;opacity:0.5;font-size:0.85rem;">The 6-6 is the highest double — it goes first</div>`
  },
  {
    title: 'Playing Tiles',
    body: 'On your turn, play a tile that <strong>matches</strong> an open end. The matching numbers connect, and the other number becomes the new open end.',
    visual: () => `<div class="tut-visual">
      ${tutTileSVG(6,3,50,90)} <span class="tut-plus">→</span> ${tutTileSVG(6,6,50,90,true)} <span class="tut-plus">←</span> ${tutTileSVG(6,1,50,90)}
    </div><div style="text-align:center;opacity:0.5;font-size:0.85rem;">Both tiles match the 6 on the spinner</div>`
  },
  {
    title: 'Scoring — Multiples of 5',
    body: 'After each play, add up <strong>all open ends</strong>. If the total is a <strong>multiple of 5</strong>, you score that many points!',
    visual: () => `<div class="tut-highlight">
      <div style="text-align:center;opacity:0.6;font-size:0.85rem;">Open ends: 3 + 1 + 6 = 10</div>
      <div class="tut-score-example">+10 points! ⭐⭐</div>
    </div>`
  },
  {
    title: 'Doubles Count Both Sides',
    body: 'When a <strong>double</strong> is at an open end, <strong>both halves count</strong> for scoring. A 4-4 at the end counts as 8, not 4!',
    visual: () => `<div class="tut-visual">${tutTileSVG(4,4,50,90,true)}</div>
    <div class="tut-highlight"><div style="text-align:center;opacity:0.6;font-size:0.85rem;">This counts as <strong>4 + 4 = 8</strong> toward the end sum</div></div>`
  },
  {
    title: 'The Spinner Branches',
    body: 'The spinner can be played on <strong>all 4 sides</strong>. The north and south arms open once both left and right have tiles. This creates more scoring opportunities!',
    visual: () => `<div class="tut-visual" style="flex-direction:column;gap:4px;">
      <div>${tutTileSVG(5,5,40,72)}</div>
      <div style="display:flex;align-items:center;gap:4px;">${tutTileSVG(3,5,40,72)} ${tutTileSVG(5,5,40,72,true)} ${tutTileSVG(5,2,40,72)}</div>
      <div>${tutTileSVG(5,1,40,72)}</div>
    </div><div style="text-align:center;opacity:0.5;font-size:0.8rem;">4 open ends: N, S, L, R</div>`
  },
  {
    title: 'Drawing & Passing',
    body: 'Can\'t play? You must <strong>draw from the boneyard</strong> until you get a playable tile. If the boneyard is empty, you <strong>pass</strong>.',
    visual: () => `<div style="text-align:center;font-size:2.5rem;margin:16px 0;">🦴</div><div style="text-align:center;opacity:0.5;font-size:0.85rem;">The boneyard = leftover tiles face-down</div>`
  },
  {
    title: 'End of Round',
    body: 'A round ends when someone plays their last tile (<strong>dominoes!</strong>) or the game is blocked. The winner gets <strong>bonus points</strong> from opponents\' remaining tiles, rounded to the nearest 5.',
    visual: () => `<div class="tut-highlight"><div style="text-align:center;">Opponent has ${tutTileSVG(3,6,36,64)} ${tutTileSVG(2,2,36,64)} left<br><span style="opacity:0.6;font-size:0.85rem;">= 13 pips → rounded to <strong>15 bonus points!</strong></span></div></div>`
  },
  {
    title: 'Winning the Game',
    body: 'First to reach the <strong>target score</strong> (usually 200) wins! Use the <strong>💡 Hint</strong> button for AI-powered move suggestions (costs 5 points). Press <strong>?</strong> for keyboard shortcuts.',
    visual: () => `<div style="text-align:center;font-size:3rem;margin:16px 0;">🏆</div><div style="text-align:center;opacity:0.6;font-size:0.9rem;">Good luck and have fun!</div>`
  }
];

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
      <div class="tut-subtitle">Step ${step + 1} of ${TUTORIAL_STEPS.length}</div>
      ${s.visual ? s.visual() : ''}
      <div class="tut-body">${s.body}</div>
    `;
    dots.innerHTML = TUTORIAL_STEPS.map((_, i) =>
      `<div class="tut-dot ${i === step ? 'active' : ''}"></div>`
    ).join('');
    prevBtn.disabled = step === 0;
    nextBtn.textContent = step === TUTORIAL_STEPS.length - 1 ? 'Start Playing!' : 'Next →';
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

// --- AI Personalities ---
const AI_PERSONALITIES = [
  { id: 'aggressive', name: 'Aggressive', desc: 'Plays heavy tiles first, targets scoring', icon: '🔥',
    tweaks: { preferHeavy: 3, preferScore: 2, preferBlock: 0 } },
  { id: 'defensive', name: 'Defensive', desc: 'Keeps options open, avoids risk', icon: '🛡️',
    tweaks: { preferHeavy: -1, preferScore: 1, preferBlock: 2 } },
  { id: 'chaotic', name: 'Chaotic', desc: 'Unpredictable, random choices', icon: '🎲',
    tweaks: { preferHeavy: 0, preferScore: 0, preferBlock: 0, chaos: 5 } },
  { id: 'calculated', name: 'Calculated', desc: 'Maximizes future options', icon: '🧠',
    tweaks: { preferHeavy: 0, preferScore: 1.5, preferBlock: 1, futureWeight: 3 } },
  { id: 'bully', name: 'Bully', desc: 'Targets the leader, plays to block', icon: '😈',
    tweaks: { preferHeavy: 1, preferScore: 1, preferBlock: 4 } },
];

// --- Tile Skins ---
const TILE_SKINS = [
  { id: 'classic', name: 'Classic', face: '#fffef8', faceDark: '#e8e0c4', pip: '#333', border: 'rgba(160,150,120,0.6)', depth: '#b0a888' },
  { id: 'marble', name: 'Marble', face: '#f0f0f0', faceDark: '#d0d0d0', pip: '#444', border: 'rgba(180,180,180,0.5)', depth: '#a0a0a0' },
  { id: 'wood', name: 'Wood', face: '#d4a574', faceDark: '#a0703c', pip: '#2a1a0a', border: 'rgba(120,80,40,0.5)', depth: '#8a5a2a' },
  { id: 'neon', name: 'Neon', face: '#1a1a2e', faceDark: '#0a0a1e', pip: '#0ff', border: 'rgba(0,255,255,0.4)', depth: '#0a0a18' },
  { id: 'gold', name: 'Gold', face: '#fff8e0', faceDark: '#e8c860', pip: '#6a4a00', border: 'rgba(200,160,40,0.5)', depth: '#c09830' },
  { id: 'midnight', name: 'Midnight', face: '#2a2a3e', faceDark: '#1a1a2e', pip: '#f0b840', border: 'rgba(100,100,140,0.4)', depth: '#18182a' },
];

function getTileSkin() {
  return localStorage.getItem('domino_tile_skin') || 'classic';
}
function setTileSkin(id) {
  localStorage.setItem('domino_tile_skin', id);
}
function getSkinColors() {
  const id = getTileSkin();
  return TILE_SKINS.find(s => s.id === id) || TILE_SKINS[0];
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

// --- Dynamic Music (Web Audio) ---
class MusicEngine {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.enabled = localStorage.getItem('domino_music') === '1';
    this.intensity = 0;
    this._nodes = [];
  }
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  start() {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.playing) return;
    this.playing = true;
    this._playLoop();
  }
  stop() {
    this.playing = false;
    this._nodes.forEach(n => { try { n.stop(); } catch(e) {} });
    this._nodes = [];
  }
  setIntensity(val) { this.intensity = Math.max(0, Math.min(1, val)); }
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('domino_music', this.enabled ? '1' : '0');
    if (this.enabled) this.start(); else this.stop();
  }
  _playLoop() {
    if (!this.playing || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Ambient chord — changes with intensity
    const baseFreq = 110;
    const chordNotes = [1, 1.5, 2, 2.5];
    const vol = 0.02 + this.intensity * 0.02;
    for (const mult of chordNotes) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = baseFreq * mult * (1 + this.intensity * 0.5);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 3);
      this._nodes.push(osc);
    }
    // Clean up old nodes
    this._nodes = this._nodes.filter(n => { try { return n.context.currentTime < n.stop; } catch(e) { return false; } });
    setTimeout(() => this._playLoop(), 2800 - this.intensity * 800);
  }
}

function setPlayerName(name) {
  localStorage.setItem('domino_player_name', name || 'Human');
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
  saveGameStats(s);
}

// --- Achievements ---
const ACHIEVEMENTS = [
  { id: 'first_win', icon: '🏆', name: 'First Victory', desc: 'Win your first game' },
  { id: 'five_star', icon: '⭐', name: '5-Star Round', desc: 'Get 25+ bonus in a round' },
  { id: 'shutout', icon: '🚫', name: 'Shutout', desc: 'Win with opponent scoring 0' },
  { id: 'streak_3', icon: '🔥', name: 'On Fire', desc: 'Win 3 games in a row' },
  { id: 'streak_5', icon: '💎', name: 'Unstoppable', desc: 'Win 5 games in a row' },
  { id: 'score_20', icon: '💰', name: 'Big Score', desc: 'Score 20+ in a single play' },
  { id: 'score_25', icon: '🎯', name: 'Perfect Play', desc: 'Score 25+ in a single play' },
  { id: 'games_10', icon: '🎮', name: 'Regular', desc: 'Play 10 games' },
  { id: 'games_50', icon: '👑', name: 'Domino Master', desc: 'Play 50 games' },
  { id: 'domino_win', icon: '🦴', name: 'Clean Sweep', desc: 'Go out with 0 tiles left' },
];
function getUnlockedAchievements() {
  try { return JSON.parse(localStorage.getItem('domino_achievements') || '[]'); } catch(e) { return []; }
}
function unlockAchievement(id) {
  const unlocked = getUnlockedAchievements();
  if (unlocked.includes(id)) return false;
  unlocked.push(id);
  localStorage.setItem('domino_achievements', JSON.stringify(unlocked));
  return true;
}
function checkAchievements(game) {
  const s = getGameStats();
  const checks = [
    ['first_win', (s.gamesWon || 0) >= 1],
    ['streak_3', (s.bestStreak || 0) >= 3],
    ['streak_5', (s.bestStreak || 0) >= 5],
    ['games_10', (s.gamesPlayed || 0) >= 10],
    ['games_50', (s.gamesPlayed || 0) >= 50],
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
  el.innerHTML = `<span class="ach-icon">${ach.icon}</span><div><div class="ach-label">Achievement Unlocked</div><div class="ach-text">${ach.name}</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// --- Particles ---
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
function spawnConfetti() {
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const x = Math.random() * window.innerWidth;
      spawnParticles(x, -10, 1, 'particle-confetti');
    }, i * 50);
  }
}

// --- Start ---
const game = new Game();
window.game = game;
