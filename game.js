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
    this.userZoom = 1;
    this.userPanX = 0;
    this.userPanY = 0;
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
    const baseScale = Math.min(1.2, cw / bw, ch / bh);
    const scale = baseScale * this.userZoom;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    this._viewScale = scale;
    this._viewOffsetX = cw / 2 - centerX * scale + this.userPanX;
    this._viewOffsetY = ch / 2 - centerY * scale + this.userPanY;

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
    const spinnerScale = p.isSpinner ? 1.4 : 1;
    const w = (horizontal ? this.tileH : this.tileW) * spinnerScale;
    const h = (horizontal ? this.tileW : this.tileH) * spinnerScale;
    const r = 7 * spinnerScale;
    const depth = 4 * spinnerScale;

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
    const pipSize = 18 * spinnerScale;
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

  drawHandTile(container, tile, playable, onClick, onHover, onLeave, matchCount, onDragStart) {
    const el = document.createElement('div');
    el.className = 'hand-tile' + (playable ? ' playable' : ' not-playable');

    const skin = getSkinColors();
    el.style.background = `linear-gradient(160deg, ${skin.face} 0%, ${skin.faceDark} 100%)`;

    el.innerHTML = `
      <div class="half">${this._pipHTML(tile.a, skin.pip)}</div>
      <div class="divider"></div>
      <div class="half">${this._pipHTML(tile.b, skin.pip)}</div>
      ${playable && matchCount > 0 ? `<div class="match-badge">${matchCount}</div>` : ''}
    `;
    if (playable) {
      el.addEventListener('click', () => onClick(tile, el));
      if (onHover) el.addEventListener('mouseenter', () => onHover(tile));
      if (onLeave) el.addEventListener('mouseleave', () => onLeave());
      // Drag support
      if (onDragStart) {
        el.style.touchAction = 'none';
        const startDrag = (startX, startY) => {
          onDragStart(tile, el, startX, startY);
        };
        el.addEventListener('mousedown', (e) => {
          if (e.button === 0) startDrag(e.clientX, e.clientY);
        });
        el.addEventListener('touchstart', (e) => {
          if (e.touches.length === 1) {
            const t = e.touches[0];
            startDrag(t.clientX, t.clientY);
          }
        }, { passive: true });
      }
    }
    container.appendChild(el);
    return el;
  }

  _pipHTML(n, pipColor) {
    const size = 50;
    const s = size * 0.24;
    const pipR = 5;
    const color = pipColor || '#222';
    const positions = this._pipPositions(n, s);
    let dots = positions.map(([x, y]) => {
      const cx = size/2 + x;
      const cy = size/2 + y;
      return `
        <circle cx="${cx}" cy="${cy}" r="${pipR + 1}" fill="rgba(0,0,0,0.08)"/>
        <circle cx="${cx}" cy="${cy}" r="${pipR}" fill="${color}"/>
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
      'Not bad for me!', 'Beginner\'s luck 😅', 'Whoa, that worked?',
      'Even a blind squirrel...', 'I meant to do that!', 'Happy accident! 🎨',
      'Don\'t mind if I do!', 'Is this right?', 'Haha, yes!',
      'My first good play!', 'Mom would be proud 🥲', 'I\'m learning!'
    ],
    mid: [
      'Read it and weep!', 'That\'s how it\'s done 💪', 'Calculated.',
      'You saw that coming, right?', 'Boom! 🎯', 'Easy money.',
      'Taking notes?', 'Textbook play.', 'Cha-ching! 💰', 'Smooth operator.',
      'Like clockwork ⚙️', 'That\'s what I do.', 'Pay attention.',
      'Clean. 🧹', 'Money in the bank.', 'You\'re welcome.',
      'Not my first rodeo 🤠', 'Saw it a mile away.', 'Standard procedure.',
      'All skill, no luck.', 'Write that down. 📝'
    ],
    high: [
      'Too easy. 🥱', 'Is that all you got?', 'Bow down. 👑',
      'I do this in my sleep.', 'You\'re welcome for the lesson.',
      'Masterclass in session.', 'GG already? 😏', 'Levels to this game.',
      'Call me the GOAT. 🐐', 'Domino KING. 👑', 'Fear the bones.',
      'That\'s called TALENT.', 'I don\'t miss. 🎯', 'Child\'s play. 🧸',
      'Are you even trying?', 'I could do this blindfolded.',
      'Another day, another victim.', 'Kneel. 🧎', 'Pathetic resistance.',
      'I\'m built different. 💅', 'Stay in your lane.', 'Witness greatness.',
      'You should screenshot this.', 'Hall of fame play. 🏛️',
      'They\'ll write about this one.', 'Legendary. 🔥'
    ]
  },
  teammate: {
    low: [
      'Nice one, partner!', 'We got this!', 'Teamwork! 🤝',
      'Go us!', 'Great play!', 'Yay team! 🎉',
      'That helps!', 'Good thinking!', 'Way to go!',
      'I believe in us!', 'Together we\'re strong! 💪', 'Keep it up!'
    ],
    mid: [
      'That\'s my partner! 💪', 'We\'re cooking now! 🔥', 'Unstoppable duo!',
      'Keep it rolling!', 'They can\'t handle us!', 'Dream team! ⭐',
      'Synergy! 🔗', 'We read each other\'s minds!', 'Perfect setup!',
      'That\'s the play I wanted!', 'We\'re in the zone! 🎯', 'Chemistry! ⚗️',
      'Like we practiced!', 'Tag team champions! 🏅'
    ],
    high: [
      'WE\'RE INEVITABLE. 🔥', 'They never had a chance!', 'Dynamic duo strikes again!',
      'Partner in CRIME! 💎', 'We run this table. 👑', 'Legends only. 🏆',
      'Bow before the TEAM.', 'Unbeatable. Unstoppable. Us. 💪',
      'This is what domination looks like.', 'They should just forfeit.',
      'Two heads, one crown. 👑👑', 'We don\'t lose. Period.',
      'History in the making!', 'The dream team delivers AGAIN.'
    ]
  },
  draw: {
    low: [
      'I got nothing... 😬', 'Ugh, drawing again.', 'This is rough.',
      'Help me out here!', 'Not my day... 😅', 'Boneyard, my old friend.',
      'Come on, give me something!', 'Please be good... 🤞',
      'I\'m in trouble.', 'This is embarrassing.', 'Why me? 😩',
      'The bones have forsaken me.', 'One more try...',
      'I swear I had a plan.', 'Well, this is awkward.'
    ],
    mid: [
      'Hmm, nothing fits.', 'Drawing... not ideal.', 'Boneyard time. 🦴',
      'Regrouping...', 'Just a minor setback.', 'I\'ll bounce back.',
      'Temporary inconvenience.', 'Building my arsenal... 🔧',
      'Not worried. Yet.', 'Slight detour.', 'The comeback starts now.',
      'Loading... ⏳', 'Patience pays off.', 'Gathering intel. 🕵️'
    ],
    high: [
      'Strategic draw. 🧠', 'All part of the plan.', 'Loading up ammo...',
      'You think this helps you? 😏', 'I\'ll be back stronger.', 'Patience is a virtue.',
      'Lulling you into false security.', 'I WANTED to draw. 🧐',
      'More tiles, more power.', 'You should be worried.',
      'This changes nothing.', 'Calculated risk. 📊',
      'I see three moves ahead.', 'The boneyard fears ME.',
      'Every draw makes me stronger. 💪'
    ]
  },
  domino: {
    low: [
      'I did it! 😲', 'Wait... I won?!', 'Woohoo! 🎉',
      'Can\'t believe it!', 'Finally! 😭', 'That was close!',
      'OMG it happened!', 'Pinch me! 🤯', 'Is this real life?',
      'I\'m shaking!', 'Best day ever!', 'Against all odds! 🌟',
      'Never give up!', 'Dreams DO come true!'
    ],
    mid: [
      'DOMINO! 🎯', 'Clean sweep!', 'That\'s game! 💪',
      'Read \'em and weep!', 'Nothing left! ✨', 'Bone dry over here! 🦴',
      'Empty handed and proud!', 'Cleared the rack! 🧹',
      'That\'s how you finish.', 'No tiles, no problem.',
      'Mic drop. 🎤', 'And THAT\'S a wrap!', 'Goodnight! 🌙',
      'Table cleared. Next? 😎'
    ],
    high: [
      'DOMINO, BABY! 👑', 'Flawless victory. 🏆', 'Was there ever any doubt? 😏',
      'Sit DOWN. 🪑', 'Another one bites the dust.', 'I AM the table. 🐐',
      'GG EZ. 💀', 'Perfection. 💎', 'You never had a chance.',
      'Absolute DESTRUCTION. 🔥', 'Bow. Now. 🧎',
      'That wasn\'t even my final form.', 'Speed run complete. ⚡',
      'Delete the app. You\'re done.', 'I don\'t play games. I END them.',
      'Another trophy for the case. 🏆🏆🏆',
      'They should name a move after me.', 'GOAT things. 🐐'
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

const US_CITIES = [
  'Miami, FL', 'Brooklyn, NY', 'Houston, TX', 'Chicago, IL', 'Atlanta, GA',
  'Phoenix, AZ', 'Denver, CO', 'Seattle, WA', 'Boston, MA', 'Nashville, TN',
  'Portland, OR', 'Austin, TX', 'Detroit, MI', 'Memphis, TN', 'Oakland, CA',
  'Philly, PA', 'New Orleans, LA', 'San Diego, CA', 'Dallas, TX', 'Baltimore, MD',
  'St. Louis, MO', 'Charlotte, NC', 'Tampa, FL', 'Las Vegas, NV', 'Honolulu, HI',
  'Savannah, GA', 'Raleigh, NC', 'Tucson, AZ', 'Boise, ID', 'Richmond, VA'
];

function pickRandomNames(count) {
  const shuffled = [...REAL_NAMES].sort(() => Math.random() - 0.5);
  const cities = [...US_CITIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((name, i) => ({
    name,
    city: cities[i % cities.length]
  }));
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

    // Speed multiplier: 'fast' = 0.4, 'normal' = 1, 'slow' = 1.6
    this._gameSpeed = localStorage.getItem('domino_speed') || 'normal';

    // Theme
    this._theme = localStorage.getItem('domino_theme') || 'dark';
    document.body.setAttribute('data-theme', this._theme);

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

    this._initUI();
  }

  _speedMs(ms) {
    const mult = { fast: 0.4, normal: 1, slow: 1.6 };
    return Math.round(ms * (mult[this._gameSpeed] || 1));
  }

  _haptic(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 15); } catch(e) {}
  }

  _getHeadToHead(name) {
    const s = getGameStats();
    const h2h = s.headToHead || {};
    const rec = h2h[name];
    if (!rec) return '';
    return `${rec.w || 0}W-${rec.l || 0}L`;
  }

  _trackHeadToHead(name, won) {
    const s = getGameStats();
    if (!s.headToHead) s.headToHead = {};
    if (!s.headToHead[name]) s.headToHead[name] = { w: 0, l: 0 };
    if (won) s.headToHead[name].w++;
    else s.headToHead[name].l++;
    saveGameStats(s);
  }

  _saveGameState() {
    if (!this.players || this.players.length === 0 || this.gameOver) return;
    const state = {
      players: this.players.map(p => ({
        name: p.name, isHuman: p.isHuman, index: p.index, score: p.score,
        team: p.team, avatar: p.avatar, city: p.city,
        hand: p.hand.map(t => [t.a, t.b]),
        aiDiff: p.ai ? p.ai.difficulty : null,
        personality: p.personality,
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
      logTurn: this._logTurn
    };
    localStorage.setItem('domino_saved_game', JSON.stringify(state));
  }

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
        if (p.aiDiff) { pl.ai = new AI(p.aiDiff); pl.personality = p.personality; }
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
      this.roundOver = false;
      this.gameOver = false;
      this._playLock = false;
      localStorage.removeItem('domino_saved_game');
      return true;
    } catch(e) { localStorage.removeItem('domino_saved_game'); return false; }
  }

  _clearSavedGame() {
    localStorage.removeItem('domino_saved_game');
  }

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
      if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => btn.textContent = '📋 Copy Game Log', 2000); }
    }).catch(() => {});
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
      const taunts = [
        'Really? You\'re just gonna walk away? 🏃‍♂️\nThe bones aren\'t THAT scary...',
        'Quitting already? The AI opponents are literally laughing at you right now. 😂',
        'Winners never quit.\nQuitters never win.\nWhich one are you? 🤔',
        'You sure? Your opponents will tell EVERYONE about this. 📢',
        'The boneyard called. It said even IT has more backbone than you. 🦴',
        'Rage quitting is just losing with extra steps. 💀',
        'Your avatar is literally crying right now. Don\'t do this to them. 😢',
        'Fun fact: 100% of rage quitters regret it.\nOkay I made that up. But still. 📊',
        'The dominoes believe in you even if you don\'t believe in yourself. 🁣',
        'Plot twist: you were about to win. Probably. Maybe. 🎬',
        'Quitting now? But you were SO close to... well, something. 🤷',
        'Your opponents are already practicing their victory dances. Don\'t let them. 💃',
      ];
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
    const speedGroup = document.getElementById('game-speed');
    if (speedGroup) {
      speedGroup.querySelectorAll('.btn-option').forEach(b => {
        b.classList.toggle('active', b.dataset.value === savedSpeed);
      });
    }

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

  _updateRoster() {
    const roster = document.getElementById('player-roster');
    if (!roster) return;

    const mode = this._getOption('game-mode');
    const humanSeed = getHumanAvatarSeed();
    const humanRec = getRecord('Human');
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

    roster.innerHTML = '<div class="roster-title">Players</div>';
    for (let pi = 0; pi < players.length; pi++) {
      const p = players[pi];
      const card = document.createElement('div');
      card.className = 'roster-card' + (p.isHuman ? ' human' : '');
      const teamBadge = p.team === 'teammate' ? ' 🤝' : p.team === 'opponent' ? ' ⚔️' : '';
      card.innerHTML = `
        <img class="roster-avatar" src="${p.avatar}" alt="${p.name}">
        <div class="roster-info">
          <div class="roster-name">${p.name}${teamBadge}</div>
          <div class="roster-rank">${p.rank}${p.city ? ' · ' + p.city : ''}${p.personality ? ' ' + p.personality.icon : ''}</div>
          <div class="roster-record">${p.record.wins}W - ${p.record.losses}L${p.headToHead ? ' · vs you: ' + p.headToHead : ''}</div>
        </div>
      `;
      if (!p.isHuman) {
        const rerollBtn = document.createElement('button');
        rerollBtn.className = 'roster-reroll';
        rerollBtn.textContent = '🎲';
        rerollBtn.title = 'Re-roll opponent';
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


  _getOption(groupId) {
    const el = document.getElementById(groupId);
    if (!el) return null;
    const active = el.querySelector('.active');
    return active ? active.dataset.value : null;
  }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

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
    const names = this._previewNames || pickRandomNames(4);
    const seeds = this._previewSeeds || names.map((n, i) => n + '-' + i);
    const diffs = this._previewDiffs || names.map(() => difficulties[Math.floor(Math.random() * 3)]);

    // Override diffs based on AI difficulty setting
    const resolvedDiffs = diffs.map(() => {
      if (diffSetting === 'easy') return 'easy';
      if (diffSetting === 'hard') return 'hard';
      return difficulties[Math.floor(Math.random() * 3)]; // mixed
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
      opp1.avatar = avatarURL(seeds[0]);
      this.players.push(opp1);

      const partner = new Player(names[1], false, 2);
      partner.team = 0;
      partner.ai = new AI(resolvedDiffs[1]);
      partner.personality = AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];
      partner.avatar = avatarURL(seeds[1]);
      this.players.push(partner);

      const opp2 = new Player(names[2], false, 3);
      opp2.team = 1;
      opp2.ai = new AI(resolvedDiffs[2]);
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
        p.ai = new AI(resolvedDiffs[i] || 'medium');
        p.personality = AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];
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

    // Daily first game XP bonus
    const today = new Date().toDateString();
    const lastPlayed = localStorage.getItem('domino_last_played');
    if (lastPlayed !== today) {
      localStorage.setItem('domino_last_played', today);
      addXP(20);
    }

    this.startRound();
  }

  startRound() {
      this.board = new Board();
      this.placements = [];
      this.roundOver = false;
      this.selectedTile = null;
      this.selectedEl = null;
      this._playLock = false;
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
      introEl.style.cssText = 'position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;gap:40px;pointer-events:none;';
      for (const p of this.players) {
        const av = document.createElement('div');
        av.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;opacity:0;transform:scale(0.5) translateY(30px);transition:all 0.6s cubic-bezier(0.34,1.56,0.64,1);';
        av.innerHTML = `<img src="${p.avatar}" style="width:120px;height:120px;border-radius:50%;border:4px solid rgba(232,167,53,0.6);box-shadow:0 8px 40px rgba(0,0,0,0.6),0 0 30px rgba(232,167,53,0.2);">
          <span style="font-weight:900;font-size:1.2rem;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,0.7);letter-spacing:1px;">${p.name}</span>`;
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
        }); // end _animateDeal callback
      }, dealDelay); // end setTimeout for dealDelay
    }

    _animateDeal(callback) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const tileCount = 28;
        const tileW = 130;
        const tileH = 65;
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
          const ox = (Math.random() - 0.5) * 140;
          const oy = (Math.random() - 0.5) * 90;
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
        return pipPos(val, 14).map(([x,y]) =>
          `<circle cx="${50+x}" cy="${cy+y}" r="6.5" fill="#333"/>`
        ).join('');
      };
      tileHTML = `
        <svg width="100" height="180" viewBox="0 0 100 180" style="display:inline-block;vertical-align:middle;filter:drop-shadow(0 6px 20px rgba(0,0,0,0.6)) drop-shadow(0 0 15px rgba(232,167,53,0.3));">
          <rect x="2" y="2" width="96" height="176" rx="12" fill="url(#tg)" stroke="#e8a735" stroke-width="2.5"/>
          <defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffef8"/><stop offset="0.3" stop-color="#f5f0dc"/><stop offset="1" stop-color="#e8e0c4"/></linearGradient></defs>
          <line x1="20" y1="90" x2="80" y2="90" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>
          <line x1="20" y1="91" x2="80" y2="91" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
          ${halfSVG(spinnerTile.a, 45)}
          ${halfSVG(spinnerTile.b, 135)}
        </svg>
      `;
    }

    overlay.innerHTML = `
      <div style="text-align:center;animation:announceIn 0.5s ease-out forwards;">
        <div style="font-size:6rem;font-weight:900;letter-spacing:8px;margin-bottom:20px;background:linear-gradient(180deg,#fff 20%,#f0b840 60%,#c07800);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-shadow:none;line-height:1;">ROUND ${this._roundNum}</div>
        <div style="margin-bottom:20px;">${tileHTML}</div>
        <div style="font-size:1.4rem;font-weight:700;color:rgba(255,255,255,0.9);">${whoLabel} the highest double</div>
      </div>
    `;
    if (this.sfx) this.sfx._play(660, 0.2, 'sine', 0.1);
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
      callback();
    }, this._speedMs(3000));
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
      setTimeout(next, i === steps.length ? this._speedMs(500) : this._speedMs(800));
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
          warn.textContent = '⚠️ Game may block soon!';
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
            const sim = new AI('easy')._cloneBoard(this.board);
            sim.placeTile(t, p);
            if (sim.getScore() > 0) { canScore = true; break; }
          }
          if (canScore) break;
        }
        if (canScore) {
          const flash = document.createElement('div');
          flash.className = 'score-opp-flash';
          flash.textContent = '💰 You can score!';
          document.body.appendChild(flash);
          setTimeout(() => flash.remove(), 1800);
        }
      }

      // Check if human has exactly 1 playable tile with 1 placement — auto-play it
      const playableTiles = player.hand.filter(t => this.board.canPlay(t));
      if (playableTiles.length === 1) {
        const placements = this.board.getValidPlacements(playableTiles[0]);
        if (placements.length === 1) {
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
        setTimeout(() => {
          if (this.currentPlayer === player.index && !this.roundOver) {
            this.pass();
          }
        }, this._speedMs(1500));
      }
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
          ${player.city ? '<div style="font-size:0.7rem;opacity:0.4;">' + player.city + '</div>' : ''}
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
        this._showSpeechBubble(player, 'I pass. 😤');
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
      // Count playable tiles (not total moves)
      const playableTiles = player.hand.filter(t => this.board.canPlay(t));
      hintBtn.disabled = pts < 5 || playableTiles.length <= 1;
    }
  }

  useHint() {
    const player = this.players[0];
    if (!player.isHuman || this.currentPlayer !== 0) return;

    const pts = this.teamMode && this.teams ? this.teams[player.team].score : player.score;
    if (pts < 5) return;

    this._usedHint = true;

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
    if (!player.isHuman || this.boneyard.length === 0 || this._playLock) return;
    this._playLock = true;

    const drawn = this.boneyard.pop();
    player.hand.push(drawn);
    this.gameLog.push({
      turn: this._logTurn++,
      player: player.name,
      avatar: player.avatar,
      action: 'draw'
    });
    if (this.sfx) this.sfx.draw();
    this._haptic(10);
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
        this._playLock = false;
        this._executePlay(player, playable[0].tile, playable[0].placement);
      }, this._speedMs(600));
      return;
    }

    this._playLock = false;
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
    // Guard: only the current player can execute, and prevent concurrent plays
    if (player.index !== this.currentPlayer) return;
    if (this._playLock) return;
    this._playLock = true;

    // Save undo state for human — removed

    player.hand = player.hand.filter(t => !t.equals(tile));
    this.board.placeTile(tile, placement);
    this._lastPlayedBy = player.index;
    this._addVisualPlacement(tile, placement);

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
      moveTime
    });
    if (scored) {
      player.score += score;
      if (this.teamMode && this.teams) {
        this.teams[player.team].score += score;
      }
      this._showScorePopup(score, player);
      if (this.sfx) this.sfx.score();
      this._haptic(30);
    } else {
      if (this.sfx) this.sfx.place();
      this._haptic(15);
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
      detail: `${winner.name} dominoes! +${bonusCalc.bonus} for ${bonusCalc.recipient}`,
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
          this.showMessage(`${winnerLabel} dominoes! No bones left to count.`, () => this.startRound());
        }
      }
    };

    // Delay so the board state is visible before counting
    setTimeout(showCounting, this._speedMs(2500));
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
          : ' <span style="color:#e04a3a;font-size:0.75rem;font-weight:700;">⚔️ Opps</span>';
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
      }, this._speedMs(600));
    }, tileDelay + this._speedMs(400));
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
      timelineHTML = '<div style="font-size:0.7rem;opacity:0.35;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Round Recap</div>';
      for (const rh of this._roundHistory) {
        const bestStr = rh.bestPlay ? `Best: ${rh.bestPlay.player} +${rh.bestPlay.score}` : '';
        const blockedTag = rh.blocked ? '<span style="color:#e04a3a;font-size:0.7rem;font-weight:700;">BLOCKED</span> ' : '';
        timelineHTML += `<div class="timeline-row">
          <span class="timeline-round">R${rh.round}</span>
          <div class="timeline-scores">
            <span class="timeline-score">${blockedTag}Won by <span style="color:#f0b840;">${rh.winner}</span></span>
            ${rh.bonus > 0 ? `<span class="timeline-score">+${rh.bonus} bonus</span>` : ''}
            ${bestStr ? `<span class="timeline-score" style="opacity:0.6;">${bestStr}</span>` : ''}
          </div>
        </div>`;
      }
    } else if (this._roundScores && this._roundScores.length > 1) {
      timelineHTML = '<div style="font-size:0.7rem;opacity:0.35;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Round Timeline</div>';
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
      <div style="font-size:0.7rem;opacity:0.35;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;margin-top:12px;">Your Performance</div>
      <div class="analysis-row"><span>Tiles Played</span><span class="analysis-value">${analysis.plays}</span></div>
      <div class="analysis-row"><span>Tiles Drawn</span><span class="analysis-value">${analysis.draws}</span></div>
      <div class="analysis-row"><span>Scoring Plays</span><span class="analysis-value">${analysis.scoringPlays}</span></div>
      <div class="analysis-row"><span>Total Points Scored</span><span class="analysis-value">${analysis.totalScored}</span></div>
      <div class="analysis-row"><span>Best Single Play</span><span class="analysis-value">+${analysis.bestPlay}</span></div>
      <div class="analysis-row"><span>Avg Points/Play</span><span class="analysis-value">${analysis.avgScore}</span></div>
    `;
    container.appendChild(analysisDiv);

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
      }, this._speedMs(3000));
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
      const roundLabel = this._roundNum ? `<span style="font-weight:900;font-size:1.3rem;background:linear-gradient(180deg,#ffe080,#f0b840);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:1px;">Round ${this._roundNum}</span>` : '';
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
          <span class="sb-target">Playing to ${this.targetScore}</span>
        `;
      } else {
        let html = roundLabel;
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
            <div style="font-size:0.55rem;opacity:0.4;margin-bottom:3px;text-transform:uppercase;letter-spacing:1px;">Last Played</div>
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
      const intensity = Math.min(1, maxScore / this.targetScore);
      this.music.setIntensity(intensity);
    }

    // Last played info in the end-sum panel
    const turnLeft = document.getElementById('end-sum-left');
    if (turnLeft && this.players && this.placements && this.placements.length > 0) {
      const lastPlayerIdx = this._lastPlayedBy;
      const lp = lastPlayerIdx !== undefined ? this.players[lastPlayerIdx] : null;
      if (lp) {
        const label = lp.isHuman ? 'You played' : `${lp.name} played`;
        turnLeft.innerHTML = `
          <img class="turn-avatar" src="${lp.avatar}" alt="${lp.name}">
          <div class="turn-name">${label}</div>
        `;
      }
    } else if (turnLeft) {
      turnLeft.innerHTML = '';
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

  _renderHand() {
      const container = document.getElementById('player-hand');
      container.innerHTML = '';

      const human = this.players[0];
      human.hand.sort((a, b) => a.pips - b.pips);

      const isMyTurn = this.currentPlayer === 0 && human.isHuman;
      for (const tile of human.hand) {
        const playable = isMyTurn && !this._suppressToast && this.board.canPlay(tile) && !this.board.isEmpty;
        const matchCount = playable ? this.board.getValidPlacements(tile).length : 0;
        this.renderer.drawHandTile(
          container, tile, playable,
          (t, el) => this._onTileClick(t, el),
          isMyTurn ? (t) => this._onTileHover(t) : null,
          isMyTurn ? () => this._onTileLeave() : null,
          matchCount,
          isMyTurn ? (t, el, x, y) => this._onDragStart(t, el, x, y) : null
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
            <span class="human-name" id="human-name-label" style="cursor:pointer;" title="Double-click to edit">${human.name} ${turnLabel}</span>
            <span class="human-record">${rec.wins}W ${rec.losses}L</span>
            <span class="pip-count">${human.hand.reduce((s,t) => s + t.pips, 0)} pips in hand</span>
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
              const newName = input.value.trim() || 'Human';
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
        ? '<span style="font-size:0.6rem;color:#4aaf6c;font-weight:700;">TEAMMATE</span>'
        : '<span style="font-size:0.6rem;color:#e04a3a;font-weight:700;">Opps</span>') : '';

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

      // Low tile warning — domino call-out
      if (player.hand.length <= 2 && player.hand.length > 0 && !this.board.isEmpty) {
        const warn = document.createElement('div');
        warn.className = 'low-tiles-warn' + (player.hand.length === 1 ? ' last-tile-alert' : '');
        warn.textContent = player.hand.length === 1 ? '🔔 LAST TILE!' : '⚠️ 2 tiles left!';
        el.appendChild(warn);
      }
    }
  }

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
        <div class="stat-section-title">Lifetime</div>
        <div class="stat-row"><span class="stat-label">Total Tiles Played</span><span class="stat-value">${s.totalTilesPlayed || 0}</span></div>
        <div class="stat-row"><span class="stat-label">Total Draws</span><span class="stat-value">${s.totalDraws || 0}</span></div>
        <div class="stat-row"><span class="stat-label">Total Passes</span><span class="stat-value">${s.totalPasses || 0}</span></div>
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
      const currentName = getPlayerName();
      const musicOn = this.music && this.music.enabled;
      const sfxOn = !this._soundMuted;

      const currentTheme = this._theme || 'dark';

      container.innerHTML = `
        <div class="pref-group">
          <div class="pref-label">Player Name</div>
          <input type="text" id="pref-name-input" class="name-edit" maxlength="12" value="${currentName}" style="width:100%;">
        </div>
        <div class="pref-group">
          <div class="pref-label">Theme</div>
          <div class="skin-options" style="grid-template-columns: repeat(2, 1fr);">
            <div class="skin-option ${currentTheme === 'dark' ? 'active' : ''}" data-theme-val="dark">
              <div class="skin-preview" style="background:linear-gradient(135deg,#1e7a35,#0d3a18);"></div>
              <span>🌙 Dark</span>
            </div>
            <div class="skin-option ${currentTheme === 'light' ? 'active' : ''}" data-theme-val="light">
              <div class="skin-preview" style="background:linear-gradient(135deg,#e8f5e9,#a5d6a7);"></div>
              <span>☀️ Light</span>
            </div>
          </div>
        </div>
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
        <div class="pref-group">
          <div class="pref-label">Table Theme</div>
          <div class="skin-options" id="table-theme-options"></div>
        </div>
          <div class="pref-label">Audio</div>
          <div class="toggle-row">
            <span>🎵 Background Music</span>
            <label class="toggle-switch">
              <input type="checkbox" id="music-toggle-cb" ${musicOn ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="toggle-row">
            <span>🔊 Sound Effects</span>
            <label class="toggle-switch">
              <input type="checkbox" id="sfx-toggle-cb" ${sfxOn ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div class="pref-group">
          <div class="pref-label">Game Speed</div>
          <div class="skin-options" style="grid-template-columns: repeat(3, 1fr);" id="pref-speed-options">
            <div class="skin-option ${this._gameSpeed === 'fast' ? 'active' : ''}" data-speed="fast">
              <span>🐇</span><span>Fast</span>
            </div>
            <div class="skin-option ${this._gameSpeed === 'normal' ? 'active' : ''}" data-speed="normal">
              <span>🎯</span><span>Normal</span>
            </div>
            <div class="skin-option ${this._gameSpeed === 'slow' ? 'active' : ''}" data-speed="slow">
              <span>🐢</span><span>Slow</span>
            </div>
          </div>
        </div>
        <div class="pref-group">
          <div class="pref-label">AI Trash Talk</div>
          <div class="skin-options" style="grid-template-columns: repeat(4, 1fr);" id="pref-trash-talk">
            <div class="skin-option ${this._trashTalkFreq === 0 ? 'active' : ''}" data-trash="0"><span>🔇</span><span>Off</span></div>
            <div class="skin-option ${this._trashTalkFreq === 1 ? 'active' : ''}" data-trash="1"><span>🤫</span><span>Low</span></div>
            <div class="skin-option ${this._trashTalkFreq === 2 ? 'active' : ''}" data-trash="2"><span>💬</span><span>Normal</span></div>
            <div class="skin-option ${this._trashTalkFreq === 3 ? 'active' : ''}" data-trash="3"><span>🗣️</span><span>Max</span></div>
          </div>
        </div>
        <div class="pref-group">
          <div class="pref-label">Accessibility</div>
          <div class="toggle-row">
            <span>♿ Colorblind Mode</span>
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
          const name = nameInput.value.trim() || 'Human';
          setPlayerName(name);
          if (this.players && this.players[0]) this.players[0].name = name;
          this._updateUI();
        });
      }

      // Populate table themes
    const tableOpts = document.getElementById('table-theme-options');
    if (tableOpts) {
      tableOpts.innerHTML = TABLE_THEMES.map(t => `
        <div class="skin-option ${t.id === getTableTheme() ? 'active' : ''}" data-table="${t.id}">
          <div class="skin-preview" style="background:linear-gradient(135deg,${t.felt},${t.dark});"></div>
          <span>${t.name}</span>
        </div>
      `).join('');
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


  // --- Tile Tracker ---
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
        const el = document.createElement('div');
        el.className = 'tracker-tile ' + (isPlayed ? 'played' : 'unplayed');
        const tw = 40, th = 72;
        el.style.background = isPlayed ? 'rgba(232,167,53,0.15)' : `linear-gradient(160deg, ${skin.face}, ${skin.faceDark})`;
        el.style.border = isPlayed ? '1.5px solid rgba(232,167,53,0.3)' : `1.5px solid ${skin.border}`;
        el.innerHTML = `<svg width="${tw}" height="${th}" viewBox="0 0 ${tw} ${th}" style="opacity:${isPlayed ? '0.3' : '1'}">
          <line x1="${tw*0.2}" y1="${th/2}" x2="${tw*0.8}" y2="${th/2}" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>
          ${halfSVG(a, th*0.25, tw)}
          ${halfSVG(b, th*0.75, tw)}
        </svg>`;
        grid.appendChild(el);
      }
    }
  }

  // --- Post-Game Analysis ---
  _getAnalysis() {
    if (!this.gameLog) return {};
    const pName = this.players[0] ? this.players[0].name : 'Human';
    const myPlays = this.gameLog.filter(e => e.player === pName && e.action === 'play');
    const myDraws = this.gameLog.filter(e => e.player === pName && e.action === 'draw');
    const myScores = myPlays.filter(e => e.score > 0);
    const totalScored = myScores.reduce((s, e) => s + e.score, 0);
    const bestPlay = myScores.length > 0 ? Math.max(...myScores.map(e => e.score)) : 0;
    const avgScore = myPlays.length > 0 ? Math.round(totalScored / myPlays.length * 10) / 10 : 0;
    return { plays: myPlays.length, draws: myDraws.length, totalScored, bestPlay, avgScore, scoringPlays: myScores.length };
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
            <div style="font-weight:700;color:#f0b840;margin-bottom:4px;">🏁 Round ${entry.round || '?'} — ${entry.detail}</div>
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
        if (entry.moveTime) detail += ` <span class="move-timer">${entry.moveTime}s</span>`;
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
            // Predict score for this placement
            let predLabel = p.end.toUpperCase();
            const activeTile = this._hoverTile || this.selectedTile;
            if (activeTile) {
              const sim = new AI('easy')._cloneBoard(this.board);
              sim.placeTile(activeTile, p);
              const predScore = sim.getScore();
              predLabel = predScore > 0 ? `+${predScore}` : p.end.toUpperCase();
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
            ctx.fillText(predLabel, pos.x, pos.y);
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

// --- Table Themes ---
const TABLE_THEMES = [
  { id: 'random', name: 'Random', felt: '', dark: '' },
  { id: 'green', name: 'Classic Green', felt: '#1e7a35', dark: '#0d3a18' },
  { id: 'blue', name: 'Ocean Blue', felt: '#1a4a7a', dark: '#0a2a4a' },
  { id: 'red', name: 'Casino Red', felt: '#7a1a2a', dark: '#3a0a14' },
  { id: 'purple', name: 'Royal Purple', felt: '#4a1a6a', dark: '#2a0a3a' },
  { id: 'wood', name: 'Wooden', felt: '#6a4a2a', dark: '#3a2a14' },
];
function getTableTheme() { return localStorage.getItem('domino_table_theme') || 'random'; }
function setTableTheme(id) {
  localStorage.setItem('domino_table_theme', id);
  applyTableTheme();
}
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

// --- Season Themes ---
function getSeasonTheme() {
  const month = new Date().getMonth();
  if (month === 9) return 'halloween';
  if (month === 11) return 'christmas';
  if (month >= 5 && month <= 7) return 'summer';
  return null;
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
    this.playing = false;
    this.enabled = localStorage.getItem('domino_music') === '1';
    this.intensity = 0;
    this.ctx = null;
    this._nodes = [];
  }
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  start() {
    if (!this.enabled || this.playing) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.playing = true;
    this._loop();
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
  _loop() {
      if (!this.playing || !this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Extended jazz progression with more variety
      const progressions = [
        // Cmaj7 → Dm7 → Em7 → Fmaj7 (classic)
        [[130.81,164.81,196.00,246.94],[146.83,185.00,220.00,277.18],[164.81,207.65,246.94,311.13],[174.61,220.00,261.63,329.63]],
        // Am7 → D7 → Gmaj7 → Cmaj7 (jazz ii-V-I)
        [[110.00,130.81,164.81,196.00],[146.83,185.00,220.00,261.63],[98.00,123.47,146.83,185.00],[130.81,164.81,196.00,246.94]],
        // Fm7 → Bb7 → Ebmaj7 → Abmaj7 (smooth)
        [[174.61,207.65,261.63,311.13],[116.54,146.83,174.61,220.00],[155.56,196.00,233.08,293.66],[103.83,130.81,155.56,196.00]],
        // Dm7 → G7 → Cmaj7 → Am7 (standard)
        [[146.83,174.61,220.00,261.63],[98.00,123.47,146.83,185.00],[130.81,164.81,196.00,246.94],[110.00,130.81,164.81,196.00]],
      ];

      // Pick progression based on time, change every ~24 seconds
      const progIdx = Math.floor(now / 24) % progressions.length;
      const chords = progressions[progIdx];
      const chordIdx = Math.floor((now / 3) % chords.length);
      const chord = chords[chordIdx];

      const vol = 0.012 + this.intensity * 0.01;
      const types = ['sine', 'triangle', 'sine'];
      const oscType = this.intensity > 0.6 ? 'triangle' : 'sine';

      // Main chord
      for (let i = 0; i < chord.length; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = oscType;
        osc.frequency.value = chord[i] * (1 + this.intensity * 0.2);
        // Stagger note attacks slightly for a more natural feel
        const attackTime = now + i * 0.05;
        gain.gain.setValueAtTime(0, attackTime);
        gain.gain.linearRampToValueAtTime(vol, attackTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, attackTime + 2.8);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(attackTime); osc.stop(attackTime + 3);
        this._nodes.push(osc);
      }

      // Bass note
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.value = chord[0] / 2;
      bassGain.gain.setValueAtTime(0, now);
      bassGain.gain.linearRampToValueAtTime(vol * 1.5, now + 0.08);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      bassOsc.connect(bassGain); bassGain.connect(ctx.destination);
      bassOsc.start(now); bassOsc.stop(now + 2.8);
      this._nodes.push(bassOsc);

      // Occasional high melodic note (every other chord)
      if (chordIdx % 2 === 0 && Math.random() > 0.3) {
        const melOsc = ctx.createOscillator();
        const melGain = ctx.createGain();
        melOsc.type = 'sine';
        melOsc.frequency.value = chord[Math.floor(Math.random() * chord.length)] * 2;
        const melVol = vol * 0.4;
        melGain.gain.setValueAtTime(0, now + 0.5);
        melGain.gain.linearRampToValueAtTime(melVol, now + 0.6);
        melGain.gain.exponentialRampToValueAtTime(0.001, now + 2);
        melOsc.connect(melGain); melGain.connect(ctx.destination);
        melOsc.start(now + 0.5); melOsc.stop(now + 2.2);
        this._nodes.push(melOsc);
      }

      this._nodes = this._nodes.slice(-30);
      const tempo = 2800 - this.intensity * 600;
      setTimeout(() => this._loop(), tempo);
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
  else if (key === 'totalTilesPlayed') s.totalTilesPlayed = (s.totalTilesPlayed || 0) + value;
  else if (key === 'totalDraws') s.totalDraws = (s.totalDraws || 0) + value;
  else if (key === 'totalPasses') s.totalPasses = (s.totalPasses || 0) + value;
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
  { id: 'no_hint_win', icon: '🧠', name: 'No Help Needed', desc: 'Win without using a hint' },
  { id: 'score_3_row', icon: '🔥', name: 'Hat Trick', desc: 'Score 3 times in a row' },
  { id: 'comeback_win', icon: '🔄', name: 'Comeback Kid', desc: 'Win after trailing by 50+' },
  { id: 'blocked_win', icon: '🧱', name: 'Roadblock', desc: 'Win a blocked round' },
  { id: 'speed_demon', icon: '⚡', name: 'Speed Demon', desc: 'Win a game on Fast speed' },
  { id: 'tiles_500', icon: '🎲', name: 'Tile Veteran', desc: 'Play 500 tiles total' },
  { id: 'streak_10', icon: '🌟', name: 'Legendary', desc: 'Win 10 games in a row' },
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
