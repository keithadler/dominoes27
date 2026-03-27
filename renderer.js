/**
 * @file renderer.js — Canvas-based board renderer for All Fives Dominoes.
 * @author Keith Adler
 * @copyright 2026 Keith Adler. MIT License.
 *
 * Draws the domino board on an HTML canvas with 3D tile effects (bevels,
 * drop shadows, depth edges). Supports zoom/pan, fly-in animations for
 * newly placed tiles, configurable tile skins, and a pulsing spinner
 * highlight.
 *
 * Also renders hand tiles as interactive HTML elements with click and
 * drag support.
 *
 * @dependency tile.js       ({@link Tile})
 * @dependency ui-helpers.js ({@link getSkinColors})
 */

/**
 * Canvas renderer for the domino board and hand tiles.
 */
class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas - The canvas element to draw on.
   */
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
    /** @type {number} Timestamp of last tile impact for nudge effect. */
    this._impactTime = 0;
    /** @type {{x: number, y: number}} Position of last impact. */
    this._impactPos = { x: 0, y: 0 };
  }

  /** Trigger a tile impact nudge effect at the given board position. */
  triggerImpact(x, y) {
    this._impactTime = performance.now();
    this._impactPos = { x, y };
  }

  /** Resize the canvas to fill its parent container. */
  resize() {
    const area = this.canvas.parentElement;
    this.canvas.width = area.clientWidth;
    this.canvas.height = area.clientHeight;
  }

  /** Clear the entire canvas. */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw the board from a Board model (simple mode, no animation).
   * @param {Board} board
   */
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

  /**
   * Render the board from pre-computed placement data with fly-in animation.
   *
   * Auto-scales and centers the board to fit the canvas, applies user
   * zoom/pan, and animates the last-placed tile from a given direction.
   *
   * @param {object[]} placements  - Array of placement objects ({x, y, horizontal, tile, ...}).
   * @param {number}   lastIndex   - Index of the tile currently animating in.
   * @param {number}   animProgress - Animation progress 0→1 (eased cubic).
   * @param {string}   [flyFrom]   - Direction the tile flies from ('top'|'bottom'|'left'|'right').
   */
  renderFromPlacements(placements, lastIndex, animProgress, flyFrom) {
    this.resize();
    this.clear();
    if (placements.length === 0) return;
    this.placedPositions = [];

    const pad = 80;
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

    // Scale to fit board — adaptive cap based on tile count
    const tileCount = placements.length;
    const maxScale = tileCount <= 2 ? 1.8 : tileCount <= 6 ? 1.3 : 1.0;
    const baseScale = Math.min(maxScale, cw / bw, ch / bh);
    const scale = baseScale * this.userZoom;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    this._viewScale = scale;
    this._viewOffsetX = cw / 2 - centerX * scale + this.userPanX;
    this._viewOffsetY = ch / 2 - centerY * scale + this.userPanY - 40; // offset up to avoid hand overlap

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

  /**
   * Draw a single placed tile with 3D effects, bevels, and optional highlights.
   * @param {object}  p      - Placement data (tile, x, y, horizontal, isSpinner, etc.).
   * @param {boolean} isLast - Whether this is the most recently placed tile (golden glow).
   * @private
   */
  _drawPlacedTile(p, isLast) {
    const ctx = this.ctx;
    const { tile, x, y, horizontal } = p;
    const spinnerScale = p.isSpinner ? 1.4 : (tile && tile.isDouble ? 1.15 : 1);
    const w = (horizontal ? this.tileH : this.tileW) * spinnerScale;
    const h = (horizontal ? this.tileW : this.tileH) * spinnerScale;
    const r = 7 * spinnerScale;
    const depth = 4 * spinnerScale;

    // Impact nudge — tiles near the impact point shift slightly and settle
    let nudgeX = 0, nudgeY = 0;
    const elapsed = performance.now() - this._impactTime;
    if (elapsed < 400 && !isLast) {
      const dist = Math.hypot(x - this._impactPos.x, y - this._impactPos.y);
      if (dist < 300 && dist > 10) {
        const strength = Math.max(0, 1 - dist / 300) * Math.max(0, 1 - elapsed / 400);
        const angle = Math.atan2(y - this._impactPos.y, x - this._impactPos.x);
        const nudgeMag = strength * 3;
        nudgeX = Math.cos(angle) * nudgeMag;
        nudgeY = Math.sin(angle) * nudgeMag;
      }
    }

    ctx.save();
    ctx.translate(x + nudgeX, y + nudgeY);

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

  /**
   * Draw 3D-styled pips (dots) for one half of a tile.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx    - Center X of the pip area.
   * @param {number} cy    - Center Y of the pip area.
   * @param {number} count - Number of pips (0–6).
   * @param {number} size  - Layout size for pip spacing.
   * @private
   */
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

  /**
   * Standard pip layout positions for 0–6 pips.
   * @param {number} n - Pip count.
   * @param {number} s - Spacing factor.
   * @returns {number[][]} Array of [x, y] offsets from center.
   * @private
   */
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

  /**
   * Trace a rounded rectangle path (does not fill or stroke).
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - Top-left X.
   * @param {number} y - Top-left Y.
   * @param {number} w - Width.
   * @param {number} h - Height.
   * @param {number} r - Corner radius.
   * @private
   */
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

  /**
   * Create an interactive hand-tile DOM element with click/drag support.
   *
   * @param {HTMLElement} container   - Parent element to append the tile to.
   * @param {Tile}        tile        - The tile to render.
   * @param {boolean}     playable    - Whether the tile can be played this turn.
   * @param {Function}    onClick     - Click handler `(tile, element)`.
   * @param {Function}    [onHover]   - Mouseenter handler `(tile)`.
   * @param {Function}    [onLeave]   - Mouseleave handler.
   * @param {number}      matchCount  - Number of valid placements for this tile.
   * @param {Function}    [onDragStart] - Drag start handler `(tile, element, x, y)`.
   * @returns {HTMLElement} The created tile element.
   */
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

  /**
   * Generate SVG markup for pips on a hand tile.
   * @param {number} n        - Pip count (0–6).
   * @param {string} pipColor - CSS color for the pips.
   * @returns {string} SVG markup string.
   * @private
   */
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
