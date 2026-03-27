/**
 * @file game-animations.js — Animation and visual effect methods for the Game class.
 * Extracted from game.js to keep modules focused and manageable.
 * @author Keith Adler
 * @copyright 2026 Keith Adler. MIT License.
 */

Object.assign(Game.prototype, {

    _animateDeal(callback) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const tileCount = 28;
        const isSmall = window.innerWidth < 500;
        const tileW = isSmall ? 100 : 260;
        const tileH = isSmall ? 50 : 130;
        const scatter = isSmall ? 0.5 : 1;
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
          const ox = (Math.random() - 0.5) * 140 * scatter;
          const oy = (Math.random() - 0.5) * 90 * scatter;
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
            const ox = (Math.random() - 0.5) * 120 * scatter;
            const oy = (Math.random() - 0.5) * 80 * scatter;
            const rot = (Math.random() - 0.5) * 90;
            tile.style.left = (cx - tileW / 2 + ox) + 'px';
            tile.style.top = (cy - tileH / 2 + oy) + 'px';
            tile.style.transform = `rotate(${rot}deg)`;
          }
          if (this.sfx) this.sfx.shuffle();
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
      },

  /**
   * Deal tiles with the intro cards visible — bones fly from center pile
   * to each player's card in the intro grid, then remaining go to boneyard.
   * @param {HTMLElement} grid - The intro grid element with player cards.
   * @param {Function} callback - Called when dealing is complete.
   */
  _animateDealToCards(grid, callback) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const tileCount = 28;
    const isSmall = window.innerWidth < 500;
    const tileW = isSmall ? 60 : 120;
    const tileH = isSmall ? 30 : 60;
    const scatter = isSmall ? 0.4 : 0.8;
    const pileEls = [];

    // Phase 1: Show all tiles in a pile at center (behind the grid, z-index 45)
    const skin = getSkinColors();
    for (let i = 0; i < tileCount; i++) {
      const tile = document.createElement('div');
      tile.className = 'deal-tile';
      tile.style.width = tileW + 'px';
      tile.style.height = tileH + 'px';
      tile.style.borderRadius = '6px';
      tile.style.position = 'fixed';
      tile.style.zIndex = 45; // behind the intro cards (z-index 50)
      tile.style.background = `linear-gradient(160deg, ${skin.face}, ${skin.faceDark})`;
      tile.style.border = `1.5px solid ${skin.border}`;
      tile.style.boxShadow = `0 1px 0 ${skin.depth}, 0 2px 6px rgba(0,0,0,0.4)`;
      const ox = (Math.random() - 0.5) * 100 * scatter;
      const oy = (Math.random() - 0.5) * 60 * scatter;
      const rot = (Math.random() - 0.5) * 80;
      tile.style.left = (cx - tileW / 2 + ox) + 'px';
      tile.style.top = (cy - tileH / 2 + oy) + 'px';
      tile.style.transform = `rotate(${rot}deg)`;
      tile.style.opacity = '0.8';
      tile.style.transition = 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
      document.body.appendChild(tile);
      pileEls.push(tile);
    }

    // Phase 2: Quick shuffle
    let shuffleCount = 0;
    const shuffleInterval = setInterval(() => {
      for (const tile of pileEls) {
        const ox = (Math.random() - 0.5) * 80 * scatter;
        const oy = (Math.random() - 0.5) * 50 * scatter;
        const rot = (Math.random() - 0.5) * 70;
        tile.style.left = (cx - tileW / 2 + ox) + 'px';
        tile.style.top = (cy - tileH / 2 + oy) + 'px';
        tile.style.transform = `rotate(${rot}deg)`;
      }
      if (this.sfx) this.sfx.shuffle();
      shuffleCount++;
      if (shuffleCount >= 3) clearInterval(shuffleInterval);
    }, 200);

    // Phase 3: Deal tiles to each player's card position
    const dealStart = 800;
    const cards = grid.children;

    // Get the center position of each player's card
    const cardPositions = [];
    for (let i = 0; i < this.players.length; i++) {
      if (cards[i]) {
        const r = cards[i].getBoundingClientRect();
        cardPositions.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      } else {
        cardPositions.push({ x: cx, y: cy });
      }
    }

    let dealt = 0;
    const handSize = this.players.length === 2 ? 7 : 5;
    for (let round = 0; round < handSize; round++) {
      for (let pi = 0; pi < this.players.length; pi++) {
        const tileIdx = dealt;
        if (tileIdx >= pileEls.length) continue;
        const delay = dealStart + dealt * 70;
        dealt++;
        const targetPos = cardPositions[pi];
        setTimeout(() => {
          const tile = pileEls[tileIdx];
          if (!tile) return;
          tile.style.left = (targetPos.x - tileW / 2 + (Math.random() - 0.5) * 20) + 'px';
          tile.style.top = (targetPos.y + (Math.random() - 0.5) * 10) + 'px';
          tile.style.transform = `rotate(${(Math.random() - 0.5) * 15}deg) scale(0.6)`;
          tile.style.opacity = '0.3';
          if (this.sfx) this.sfx._play(350 + Math.random() * 200, 0.03, 'sine', 0.04);
          // Flash the target card briefly
          if (cards[pi]) {
            cards[pi].style.borderColor = `hsla(45,90%,60%,0.6)`;
            setTimeout(() => {
              if (cards[pi]) {
                const c = this.players[pi].color || { h: 0, s: 50, l: 50 };
                cards[pi].style.borderColor = `hsla(${c.h},${c.s}%,${c.l+15}%,${this.players[pi].isHuman ? '0.5' : '0.25'})`;
              }
            }, 200);
          }
          setTimeout(() => tile.remove(), 350);
        }, delay);
      }
    }

    // Phase 4: Remaining tiles fly to boneyard
    const boneyardStart = dealStart + dealt * 70;
    const boneArea = document.getElementById('boneyard-area');
    const boneRect = boneArea ? boneArea.getBoundingClientRect() : { left: cx - 70, top: window.innerHeight - 140, width: 140, height: 40 };
    const boneTargetX = boneRect.left + boneRect.width / 2;
    const boneTargetY = boneRect.top + boneRect.height / 2;

    for (let i = dealt; i < pileEls.length; i++) {
      const delay = boneyardStart + (i - dealt) * 50;
      setTimeout(() => {
        const tile = pileEls[i];
        if (!tile) return;
        tile.style.left = (boneTargetX - tileW / 2 + (Math.random() - 0.5) * 20) + 'px';
        tile.style.top = (boneTargetY - tileH / 2 + (Math.random() - 0.5) * 8) + 'px';
        tile.style.transform = `rotate(${(Math.random() - 0.5) * 30}deg) scale(0.2)`;
        tile.style.opacity = '0.5';
        if (this.sfx) this.sfx._play(280 + Math.random() * 80, 0.02, 'sine', 0.03);
        setTimeout(() => tile.remove(), 400);
      }, delay);
    }

    const totalTime = boneyardStart + (pileEls.length - dealt) * 50 + 500;
    setTimeout(callback, totalTime);
  },

  /** Animate the last-placed tile flying in from the player's position to the board. */
  _animateFlyIn() {
    this._flyingIn = true;
    const isSpinner = this._spinnerEntrance;
    const duration = isSpinner ? 1200 : 700;
    if (isSpinner) this._spinnerEntrance = false;
    const start = performance.now();
    const flyFrom = this._getPlayerPosition(this._lastPlayedBy || 0);
    const animate = () => {
      const elapsed = performance.now() - start;
      const progress = elapsed < duration ? elapsed / duration : 1;
      this._renderBoard(null, progress, flyFrom, isSpinner);
      if (elapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        this._flyingIn = false;
        // Extra particles for spinner entrance
        if (isSpinner) {
          spawnParticles(window.innerWidth / 2, window.innerHeight * 0.45, 25, 'particle-gold');
        }
      }
    };
    requestAnimationFrame(animate);
  },

  /** Animate a tile flying from the boneyard area to the player's hand. */
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
    const skin = getSkinColors();
    // Show tile face-up briefly for human player (#18)
    const isHuman = player.isHuman;
    let faceUpHTML = '';
    if (isHuman && player.hand.length > 0) {
      const drawnTile = player.hand[player.hand.length - 1];
      faceUpHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;font-size:10px;font-weight:900;color:${skin.pip};gap:1px;"><span>${drawnTile.a}</span><hr style="width:70%;margin:0;border:none;border-top:1px solid rgba(0,0,0,0.2)"><span>${drawnTile.b}</span></div>`;
    }
    flyTile.style.cssText = `
      position: fixed; z-index: 60; pointer-events: none;
      width: 44px; height: ${isHuman ? '66px' : '22px'};
      background: linear-gradient(160deg, ${skin.face}, ${skin.faceDark});
      border: 2px solid ${isHuman ? '#e8a735' : 'rgba(180,170,140,0.5)'}; border-radius: 5px;
      box-shadow: 0 2px 0 ${skin.depth || '#a8a080'}, 0 4px 8px rgba(0,0,0,0.4);
      left: ${startX - 22}px; top: ${startY - (isHuman ? 33 : 11)}px;
      transition: left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
                  top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
                  transform 0.5s ease-out, opacity 0.5s ease-out;
      transform: scale(1.2);
    `;
    if (isHuman) flyTile.innerHTML = faceUpHTML;
    document.body.appendChild(flyTile);

    // For human: show face-up for 400ms, then flip and fly
    const flyDelay = isHuman ? 400 : 0;
    setTimeout(() => {
      if (isHuman) {
        flyTile.innerHTML = '';
        flyTile.style.height = '22px';
        flyTile.style.top = (startY - 11) + 'px';
        flyTile.style.borderColor = 'rgba(180,170,140,0.5)';
      }
      requestAnimationFrame(() => {
        flyTile.style.left = (endX - 22) + 'px';
        flyTile.style.top = (endY - 11) + 'px';
        flyTile.style.transform = 'scale(0.6)';
        flyTile.style.opacity = '0.3';
      });
    }, flyDelay);

    setTimeout(() => flyTile.remove(), 600 + flyDelay);
  },

  /** Compute visual placement data (x, y, orientation) for a tile and add it to the placements array. */
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
      // Dramatic spinner entrance (#16)
      if (tile.isDouble) this._spinnerEntrance = true;
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
  },

  /** Shows a cinematic round announcement with the first player and spinner tile. */
  _showRoundAnnouncement(firstPlayer, spinnerTile, callback) {
    const overlay = document.getElementById('countdown-overlay');
    if (!overlay) { callback(); return; }
    overlay.classList.remove('hidden');

    const whoLabel = firstPlayer.isHuman ? this._t('youHave') : `${escHTML(firstPlayer.name)} ${this._t('has')}`;

    // Build SVG domino tile with glow animation
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
        <div class="ra-tile">
          <svg width="60" height="108" viewBox="0 0 100 180">
            <rect x="2" y="2" width="96" height="176" rx="12" fill="url(#tg)" stroke="#e8a735" stroke-width="2.5"/>
            <defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffef8"/><stop offset="0.3" stop-color="#f5f0dc"/><stop offset="1" stop-color="#e8e0c4"/></linearGradient></defs>
            <line x1="20" y1="90" x2="80" y2="90" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>
            <line x1="20" y1="91" x2="80" y2="91" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
            ${halfSVG(spinnerTile.a, 45)}
            ${halfSVG(spinnerTile.b, 135)}
          </svg>
        </div>
      `;
    }

    overlay.innerHTML = `
      <div class="ra-container">
        <div class="ra-label">${this._t('round').toUpperCase()}</div>
        <div class="ra-number">${this._roundNum}</div>
        <div class="ra-divider"></div>
        <div class="ra-player">
          <img class="ra-avatar" src="${firstPlayer.avatar}" alt="${escHTML(firstPlayer.name)}">
          ${tileHTML}
        </div>
        <div class="ra-who">${whoLabel} ${this._t('highestDouble')}</div>
      </div>
    `;

    // Spawn particles behind the number
    setTimeout(() => {
      spawnParticles(window.innerWidth / 2, window.innerHeight * 0.35, 20, 'particle-gold');
    }, 400);

    if (this.sfx) {
      this.sfx._play(440, 0.15, 'sine', 0.08);
      setTimeout(() => this.sfx._play(660, 0.2, 'sine', 0.1), 200);
      setTimeout(() => this.sfx._play(880, 0.3, 'sine', 0.12), 400);
    }

    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
      callback();
    }, this._speedMs(3000));
  },

  /** Show a "3-2-1" countdown overlay before the first round begins. */
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
  },

  /** Start a requestAnimationFrame loop that re-renders the board for the pulsing spinner highlight. */
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
  },

  /** Show a score popup with the player's name and points earned. */
  _showScorePopup(score, player) {
    // First blood check (#6) — first scoring play of the round
    if (this.gameLog) {
      const lastRoundEndIdx = this.gameLog.reduce((acc, e, i) => e.action === 'round-end' ? i : acc, -1);
      const roundLog = lastRoundEndIdx >= 0 ? this.gameLog.slice(lastRoundEndIdx + 1) : this.gameLog;
      const priorScoring = roundLog.filter(e => e.action === 'play' && e.score > 0);
      if (priorScoring.length === 0) {
        const fb = document.createElement('div');
        fb.className = 'first-blood-banner';
        fb.textContent = 'FIRST BLOOD 🩸';
        document.body.appendChild(fb);
        setTimeout(() => fb.remove(), 1500);
      }
    }

    const popup = document.createElement('div');
    popup.className = 'score-popup';

    let size, duration;
    if (score >= 20) { size = '7rem'; duration = 3200; }
    else if (score >= 15) { size = '6rem'; duration = 3000; }
    else if (score >= 10) { size = '5.2rem'; duration = 2800; }
    else { size = '4rem'; duration = 2500; }

    popup.style.fontSize = size;
    popup.innerHTML = `<span class="score-label">${escHTML(player.name)}</span>+${score}`;
    popup.style.left = '50%';
    popup.style.top = '45%';
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), duration);

    // Golden vignette flash
    const vignette = document.createElement('div');
    vignette.className = 'score-vignette' + (score >= 15 ? ' big' : '');
    document.body.appendChild(vignette);
    setTimeout(() => vignette.remove(), 800);

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
    } else {
      // Particles from opponent's position too
      const pos = this._getPlayerPosition(player.index);
      const panel = document.getElementById('opponent-' + pos);
      if (panel) {
        const r = panel.getBoundingClientRect();
        spawnParticles(r.left + r.width / 2, r.top + r.height / 2, 8 + score, 'particle-gold');
      }
    }
  },

  /** Show a combo counter popup when the human scores multiple turns in a row. */
  _showComboPopup(count) {
    const popup = document.createElement('div');
    popup.className = 'combo-popup';
    popup.textContent = `×${count} COMBO`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 900);
  },

  /** Show a speech bubble near an AI player's avatar with the given text. */
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
  },

  /** Show a brief auto-play banner (e.g. "Auto-playing only move"). */
  _showAutoPlayBanner(text) {
    const existing = document.querySelector('.auto-play-banner');
    if (existing) existing.remove();
    const banner = document.createElement('div');
    banner.className = 'auto-play-banner';
    banner.innerHTML = `⚡ ${text}`;
    document.body.appendChild(banner);
    setTimeout(() => { banner.classList.add('fade-out'); }, 1500);
    setTimeout(() => banner.remove(), 2000);
  },

  _showBoneCounting(title, countPlayers, bonusCalc, callback) {
    // Reveal opponent tiles briefly before counting (#12)
    this._revealOpponentHands(countPlayers, () => {
      this._showBoneCountingInner(title, countPlayers, bonusCalc, callback);
    });
  },

  /** Briefly flash opponent hands face-up in their panels for 1.5s before bone counting. */
  _revealOpponentHands(countPlayers, callback) {
    if (!countPlayers || countPlayers.length === 0) { callback(); return; }
    const skin = getSkinColors();
    const reveals = [];
    for (const p of countPlayers) {
      const pos = this._getPlayerPosition(p.index);
      const panel = document.getElementById('opponent-' + pos);
      if (!panel) continue;
      const tilesWrap = panel.querySelector('div[style*="flex"]');
      if (!tilesWrap) continue;
      const origHTML = tilesWrap.innerHTML;
      // Replace face-down tiles with face-up mini tiles
      tilesWrap.innerHTML = '';
      for (const tile of p.hand) {
        const t = document.createElement('div');
        t.style.cssText = `display:inline-flex;flex-direction:column;align-items:center;width:22px;height:40px;background:linear-gradient(160deg,${skin.face},${skin.faceDark});border:1px solid ${skin.border};border-radius:3px;font-size:7px;justify-content:center;gap:1px;margin:1px;`;
        t.innerHTML = `<span>${tile.a}</span><hr style="width:80%;margin:0;border:none;border-top:1px solid rgba(0,0,0,0.15)"><span>${tile.b}</span>`;
        tilesWrap.appendChild(t);
      }
      reveals.push({ tilesWrap, origHTML });
    }
    setTimeout(() => {
      for (const r of reveals) r.tilesWrap.innerHTML = r.origHTML;
      callback();
    }, 1500);
  },

  _showBoneCountingInner(title, countPlayers, bonusCalc, callback) {
    const overlay = document.getElementById('count-overlay');
    overlay.classList.remove('hidden');
    overlay.innerHTML = '';

    const titleEl = document.createElement('div');
    titleEl.className = 'count-title';
    titleEl.textContent = title + ' — ' + this._t('countingBonesTitle');
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
          ? ` <span style="color:#4aaf6c;font-size:0.75rem;font-weight:700;">🤝 ${this._t('teammate')}</span>`
          : ` <span style="color:#e04a3a;font-size:0.75rem;font-weight:700;">⚔️ ${this._t('opps')}</span>`;
      }

      row.innerHTML = `
        <img class="count-avatar" src="${p.avatar}" alt="${escHTML(p.name)}">
        <div class="count-info">
          <div class="count-name">${escHTML(p.name)}${teamTag}</div>
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
        if (bonusCalc.oppPips !== undefined && bonusCalc.partnerPips !== undefined) {
          // Team mode: show the subtraction breakdown
          const breakdownText = bonusCalc.partnerPips > 0
            ? `${bonusCalc.oppPips} − ${bonusCalc.partnerPips} = ${bonusCalc.oppPips - bonusCalc.partnerPips} ${this._t('pips')}`
            : `${bonusCalc.oppPips} ${this._t('pips')}`;
          totalEl.innerHTML = `${breakdownText} → <span class="ct-bonus">+${bonusCalc.bonus}</span> ${this._t('for_')} ${escHTML(bonusCalc.recipient)}`;
        } else {
          totalEl.innerHTML = `${totalPips} ${this._t('pips')} → <span class="ct-bonus">+${bonusCalc.bonus}</span> ${this._t('for_')} ${escHTML(bonusCalc.recipient)}`;
        }
      } else {
        if (bonusCalc.oppPips !== undefined && bonusCalc.partnerPips !== undefined && bonusCalc.partnerPips >= bonusCalc.oppPips) {
          totalEl.innerHTML = `${bonusCalc.oppPips} − ${bonusCalc.partnerPips} ${this._t('pips')} → <span class="ct-bonus">+0</span> ${this._t('bonus')}`;
        } else {
          totalEl.innerHTML = `${totalPips} ${this._t('pips')} → <span class="ct-bonus">+0</span> ${this._t('bonus')}`;
        }
      }
      overlay.appendChild(totalEl);

      if (this.sfx && bonusCalc.bonus > 0) this.sfx.score();

      // Stars based on bonus amount — only for human/human's team
      const humanTeamWon = bonusCalc.recipient === this._t('yourTeam') ||
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
        btn.textContent = this._t('continue_btn');
        btn.addEventListener('click', () => {
          overlay.classList.add('hidden');
          callback();
        });
        overlay.appendChild(btn);
      }, this._speedMs(600));
    }, tileDelay + this._speedMs(400));
  },

  _countPipSVG(n) {
    const size = 24;
    const s = size * 0.22;
    const positions = {
      0: [],
      1: [[0,0]],
      2: [[-s,-s],[s,s]],
      3: [[-s,-s],[0,0],[s,s]],
      4: [[-s,-s],[s,-s],[-s,s],[s,s]],
      5: [[-s,-s],[s,-s],[0,0],[-s,s],[s,s]],
      6: [[-s,-s],[s,-s],[-s,0],[s,0],[-s,s],[s,s]]
    };
    const dots = (positions[n] || []).map(([x,y]) =>
      `<circle cx="${size/2+x}" cy="${size/2+y}" r="2.5" fill="#333"/>`
    ).join('');
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${dots}</svg>`;
  },

  /**
   * Build contextual speech comments for the round intro overlay.
   * Each player gets a short quip based on scores, round number, and game state.
   * @param {number} roundNum - The upcoming round number.
   * @returns {string[]} One comment per player (may be empty string).
   */
  _buildIntroComments(roundNum) {
    const comments = [];
    const maxScore = Math.max(...this.players.map(p => this.teamMode && this.teams ? this.teams[p.team].score : p.score));
    const target = this.targetScore;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    for (const p of this.players) {
      const score = this.teamMode && this.teams ? this.teams[p.team].score : p.score;
      const isLeading = score === maxScore && score > 0;
      const isTrailing = score < maxScore && maxScore > 0;
      const gap = maxScore - score;
      const closeToWin = score >= target * 0.75 && score > 0;

      let comment = '';

      if (roundNum === 1) {
        // First round — intro comments
        comment = p.isHuman ? pick(this._t('introHumanFirst')) : pick(this._t('introAiFirst'));
      } else if (closeToWin && isLeading) {
        // About to win
        comment = p.isHuman ? pick(this._t('introHumanCloseToWin')) : pick(this._t('introAiCloseToWin'));
      } else if (isTrailing && gap > 50) {
        // Far behind
        comment = p.isHuman ? pick(this._t('introHumanTrailing')) : pick(this._t('introAiTrailing'));
      } else if (isLeading && score > 0) {
        // Leading
        comment = p.isHuman ? pick(this._t('introHumanLeading')) : pick(this._t('introAiLeading'));
      } else if (roundNum > 1) {
        // Mid-game, no strong position
        if (p.isHuman) {
          comment = pick(this._t('introHumanMid'));
        } else {
          // Use the existing phrase system for AI
          const phrase = getPhrase(p, 'opponent');
          comment = phrase || pick(this._t('introAiMid'));
        }
      }

      comments.push(comment);
    }
    return comments;
  },

  /** Show a centered thinking overlay with the AI player's avatar and name. */
  _showThinking(player) {
    const el = document.getElementById('thinking-overlay');
    if (!el) return;
    el.classList.remove('hidden');

    const isTeammate = this.teamMode && player.team === this.players[0].team;
    const label = isTeammate ? `🤝 ${this._t('teammate')}` : '';

    el.innerHTML = `
      <div class="think-card">
        <img class="think-avatar" src="${player.avatar}" alt="${escHTML(player.name)}">
        <div class="think-info">
          <div class="think-name">${escHTML(player.name)} ${label ? '<span style="font-size:0.7rem;opacity:0.6;">' + label + '</span>' : ''}</div>
          ${player.city ? '<div style="font-size:0.7rem;opacity:0.4;">' + escHTML(player.city) + '</div>' : ''}
          <div class="think-label">${this._t('thinking')} <span class="thinking-dots-lg"><span></span><span></span><span></span></span></div>
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
  },

  /** Hide the AI thinking overlay. */
  _hideThinking() {
    const el = document.getElementById('thinking-overlay');
    if (el) el.classList.add('hidden');
  },

  /** Spawn gold particles around the active player's avatar panel. */
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

});

// --- Start ---
// Instantiated here (last loaded script) so all Game.prototype
// extensions from game-input.js, game-ui.js, and this file are applied.
window.game = new Game();
