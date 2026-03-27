/**
 * @file game-input.js — Input handling methods for the Game class.
 * Extracted from game.js to keep modules focused and manageable.
 * @author Keith Adler
 * @copyright 2026 Keith Adler. MIT License.
 */

Object.assign(Game.prototype, {

  /** Handle click on a hand tile: select it and show valid placement ends on the board. */
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
  },

  /** Handle hover on a hand tile: preview valid placement ends on the board. */
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
  },

  /** Handle mouse leave on a hand tile (no-op — keeps last hover visible). */
  _onTileLeave() {
    // Don't clear — keep showing the last hovered tile's placements
    // They'll be replaced when hovering another tile or cleared on click/turn change
  },

  /** Store pending placements and trigger a board re-render with highlighted ends. */
  _showEndChoices(tile, placements) {
    // Highlight available ends on the board
    this._pendingPlacements = placements;
    this._renderBoard(placements);
  },

  /** Handle click on the board canvas: resolve which end was clicked and execute the play. */
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
  },

  /** Begin a drag operation from a hand tile, tracking mouse/touch movement until drop. */
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
        // Subtle drag trail particles
        if (Math.random() > 0.6) {
          spawnParticles(cx, cy, 1, 'particle-gold');
        }
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
  },

  /**
   * Get the screen position of a board end for drag-drop hit testing.
   * @param {string} end - 'left'|'right'|'north'|'south'.
   * @returns {{x: number, y: number}|null}
   */
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
      if (p.branch === 'north' || p.branch === 'first') {
        if (!northMost || p.y < northMost.y) northMost = p;
      }
      if (p.branch === 'south' || p.branch === 'first') {
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

});
