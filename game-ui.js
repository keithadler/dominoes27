/**
 * @file game-ui.js — UI rendering and overlay methods for the Game class.
 * Extracted from game.js to keep modules focused and manageable.
 * @author Keith Adler
 * @copyright 2026 Keith Adler. MIT License.
 */

Object.assign(Game.prototype, {

  /** Refreshes scoreboard, end-sum display, boneyard count, turn indicator, and player hand rendering. */
  _updateUI() {
    // Score bar at top
    const scoreBar = document.getElementById('score-bar-content');
    if (scoreBar) {
      const roundLabel = this._roundNum ? `<span style="font-weight:900;font-size:1.3rem;background:linear-gradient(180deg,#ffe080,#f0b840);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:1px;">${this._t('round')} ${this._roundNum}</span>` : '';
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
          <span class="sb-target">${this._t('playingTo')} ${this.targetScore}</span>
        `;
        // Animate score changes (team mode)
        if (!this._prevDisplayScores) this._prevDisplayScores = {};
        requestAnimationFrame(() => {
          scoreBar.querySelectorAll('.sb-ps-score, .sb-team-score').forEach(el => {
            const target = parseInt(el.textContent) || 0;
            const key = el.previousElementSibling ? el.previousElementSibling.textContent : el.parentElement.textContent;
            const prev = this._prevDisplayScores[key] || 0;
            if (prev !== target) {
              this._prevDisplayScores[key] = target;
              let current = prev;
              const step = () => {
                current += Math.ceil((target - current) / 6);
                if (current >= target) { el.textContent = target; return; }
                el.textContent = current;
                requestAnimationFrame(step);
              };
              requestAnimationFrame(step);
            }
            el.classList.remove('score-bump');
            void el.offsetWidth;
            el.classList.add('score-bump');
          });
        });
      } else {
        let html = roundLabel;
        for (const p of this.players) {
          const isCurrent = p.index === this.currentPlayer;
          html += `<div class="sb-player-score" style="${isCurrent ? 'border-color:rgba(232,167,53,0.4);background:rgba(232,167,53,0.1);' : ''}">
            <span class="sb-ps-name">${escHTML(p.name)}</span>
            <span class="sb-ps-score">${p.score}</span>
          </div>`;
        }
        html += `<span class="sb-target">${this._t('playingTo')} ${this.targetScore}</span>`;
        scoreBar.innerHTML = html;
        // Animate score changes
        if (!this._prevDisplayScores) this._prevDisplayScores = {};
        requestAnimationFrame(() => {
          scoreBar.querySelectorAll('.sb-ps-score, .sb-team-score').forEach(el => {
            const target = parseInt(el.textContent) || 0;
            const key = el.previousElementSibling ? el.previousElementSibling.textContent : el.parentElement.textContent;
            const prev = this._prevDisplayScores[key] || 0;
            if (prev !== target) {
              this._prevDisplayScores[key] = target;
              let current = prev;
              const step = () => {
                current += Math.ceil((target - current) / 6);
                if (current >= target) { el.textContent = target; return; }
                el.textContent = current;
                requestAnimationFrame(step);
              };
              requestAnimationFrame(step);
            }
            el.classList.remove('score-bump');
            void el.offsetWidth;
            el.classList.add('score-bump');
          });
        });
      }
    }

    // End sum display — hide until after first play of the round
    const endSumPanel = document.getElementById('end-sum-display');
    if (endSumPanel) {
      endSumPanel.style.visibility = this.board.tiles.length <= 1 ? 'hidden' : '';
    }
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
      scoreEl.textContent = endScore > 0 ? `${this._t('scores')} ${endScore}!` : this._t('noScore');
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
            <div style="font-size:0.55rem;opacity:0.4;margin-bottom:3px;text-transform:uppercase;letter-spacing:1px;">${this._t('lastPlayed')}</div>
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
      const rawIntensity = Math.min(1, maxScore / this.targetScore);
      // Cap at 0.4 during gameplay — full intensity only at game end
      this.music.setIntensity(rawIntensity * 0.4);
    }

    // Reactive board theme — felt color shifts as game gets intense
    if (this.players && this.targetScore) {
      const maxScore = Math.max(...this.players.map(p => p.score));
      const progress = Math.min(1, maxScore / this.targetScore);
      const boardArea = document.getElementById('board-area');
      if (boardArea) {
        if (progress > 0.8) {
          // Final stretch — intense red/orange pulsing glow
          const intensity = (progress - 0.8) * 5; // 0→1
          boardArea.style.boxShadow = `inset 0 0 ${80 + intensity * 60}px rgba(232, 60, 30, ${0.15 + intensity * 0.2}), inset 0 0 ${20 + intensity * 40}px rgba(255, 80, 40, ${0.1 + intensity * 0.15})`;
        } else if (progress > 0.5) {
          // Heating up — warm amber glow
          const intensity = (progress - 0.5) * 3.3; // 0→1
          boardArea.style.boxShadow = `inset 0 0 ${40 + intensity * 50}px rgba(232, 167, 53, ${0.05 + intensity * 0.1})`;
        } else if (progress > 0.25) {
          // Early game — subtle green energy
          const intensity = (progress - 0.25) * 4; // 0→1
          boardArea.style.boxShadow = `inset 0 0 ${30 + intensity * 30}px rgba(74, 175, 108, ${0.03 + intensity * 0.05})`;
        } else {
          boardArea.style.boxShadow = '';
        }
      }
    }

    // Last played info in the end-sum panel
    const turnLeft = document.getElementById('end-sum-left');
    if (turnLeft && this.players && this.placements && this.placements.length > 0) {
      const lastPlayerIdx = this._lastPlayedBy;
      const lp = lastPlayerIdx !== undefined ? this.players[lastPlayerIdx] : null;
      if (lp) {
        const label = lp.isHuman ? this._t('youPlayed') : `${escHTML(lp.name)} ${this._t('played')}`;
        turnLeft.innerHTML = `
          <img class="turn-avatar" src="${lp.avatar}" alt="${escHTML(lp.name)}">
          <div class="turn-name">${label}</div>
        `;
      }
    } else if (turnLeft) {
      turnLeft.innerHTML = '';
    }

    // Turn toast notification — suppress during countdown/announcement
    if (this._suppressToast) return this._renderHand();

    // Show turn indicator toast
    const turnIndicator = document.getElementById('turn-indicator');
    if (turnIndicator && this.players && this.players.length > 0) {
      const cp = this.players[this.currentPlayer];
      if (cp) {
        const isHumanTurn = cp.isHuman;
        const label = isHumanTurn ? this._t('yourTurn') : `<span>${escHTML(cp.name)}</span>'s ${this._t('turn')}`;
        turnIndicator.innerHTML = `
          <img class="toast-avatar" src="${cp.avatar}" alt="${escHTML(cp.name)}">
          <div class="toast-text">${label}</div>
        `;
        turnIndicator.classList.remove('fading');
        turnIndicator.classList.add('visible');
        // Auto-hide after a delay
        clearTimeout(this._toastTimeout);
        this._toastTimeout = setTimeout(() => {
          turnIndicator.classList.remove('visible');
          turnIndicator.classList.add('fading');
        }, 2000);
      }
    }

    // Hand (show current human player's hand)
    this._renderHand();

    // Floating arrow
    this._updateFloatingArrow();
  },

  /** Update the floating arrow that points to the current player's position. */
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
  },

  /** Render the human player's hand tiles as interactive DOM elements. */
  _renderHand() {
      const container = document.getElementById('player-hand');
      container.innerHTML = '';

      const human = this.players[0];
      human.hand.sort((a, b) => a.pips - b.pips);

      const isMyTurn = this.currentPlayer === 0 && human.isHuman;
      let tileIdx = 0;
      for (const tile of human.hand) {
        const playable = isMyTurn && !this._suppressToast && this.board.canPlay(tile) && !this.board.isEmpty;
        const matchCount = playable ? this.board.getValidPlacements(tile).length : 0;
        const el = this.renderer.drawHandTile(
          container, tile, playable,
          (t, el) => this._onTileClick(t, el),
          isMyTurn ? (t) => this._onTileHover(t) : null,
          isMyTurn ? () => this._onTileLeave() : null,
          matchCount,
          isMyTurn ? (t, el, x, y) => this._onDragStart(t, el, x, y) : null
        );
        // Stagger entrance animation
        el.style.animationDelay = `${tileIdx * 0.05}s`;
        tileIdx++;
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
        const turnLabel = isTurn ? `<span style="color:#f0b840;font-size:0.8rem;font-weight:700;">${this._t('yourTurn')}</span>` : '';

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
            <span class="pip-count">${human.hand.reduce((s,t) => s + t.pips, 0)} ${this._t('pipsInHand')}</span>
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
              const newName = input.value.trim() || _tUI('playerName');
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
    },

  /** Render all AI opponent panels (avatars, face-down tiles, thinking indicators). */
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
        ? `<span style="font-size:0.6rem;color:#4aaf6c;font-weight:700;">${this._t('teammate')}</span>`
        : `<span style="font-size:0.6rem;color:#e04a3a;font-weight:700;">${this._t('opps')}</span>`) : '';

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
        <img class="opp-avatar" src="${player.avatar}" alt="${escHTML(player.name)}" style="border-color:${avatarBorder};">
        <div class="opp-info">
          <span class="opp-name${isTurn ? ' active-turn' : ''}" style="${!isTurn ? 'color:hsla(' + c.h + ',' + c.s + '%,' + (c.l + 30) + '%,0.9);' : ''}">${teamIcon}${escHTML(player.name)}</span>
          ${teamLabel}
          <span class="opp-record">${rec.wins}W ${rec.losses}L</span>
          <span class="pip-count">${player.handPips} pips</span>
          ${player.personality ? '<span class="personality-badge">' + player.personality.icon + ' ' + _tUI(player.personality.name) + '</span>' : ''}
        </div>
      `;
      el.appendChild(label);

      // Thinking indicator
      if (isTurn) {
        const think = document.createElement('div');
        think.className = 'opp-thinking';
        think.innerHTML = `${this._t('thinking')}<span class="thinking-dots"><span></span><span></span><span></span></span>`;
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
        warn.textContent = player.hand.length === 1 ? this._t('lastTile') : `⚠️ 2 ${this._t('tilesLeft')}!`;
        el.appendChild(warn);
      }
    }
  },

  /** Render the boneyard tile count and visual tile backs. */
  _renderBoneyard() {
    const tilesEl = document.getElementById('boneyard-tiles');
    const labelEl = document.getElementById('boneyard-count');
    if (!tilesEl || !labelEl) return;

    tilesEl.innerHTML = '';
    labelEl.textContent = this.boneyard.length;

    // Pulse red when boneyard is low (#8)
    if (this.boneyard.length <= 4 && this.boneyard.length > 0) {
      labelEl.classList.add('boneyard-low');
    } else {
      labelEl.classList.remove('boneyard-low');
    }

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
  },

  /** Render the stats and achievements overlay content. */
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
        <div class="stat-section-title">${this._t('overall')}</div>
        <div class="stat-row"><span class="stat-label">${this._t('gamesPlayed')}</span><span class="stat-value">${s.gamesPlayed || 0}</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('winsLosses')}</span><span class="stat-value">${rec.wins}W ${rec.losses}L</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('winRate')}</span><span class="stat-value">${winRate}%</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('bestStreak')}</span><span class="stat-value">${s.bestStreak || 0}</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('totalScored')}</span><span class="stat-value">${s.totalScore || 0}</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('highestPlay')}</span><span class="stat-value">${s.highestPlayScore || 0}</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('highestBonus')}</span><span class="stat-value">${s.highestRoundScore || 0}</span></div>
      </div>
      <div class="stat-section">
        <div class="stat-section-title">${this._t('lifetime')}</div>
        <div class="stat-row"><span class="stat-label">${this._t('totalTiles')}</span><span class="stat-value">${s.totalTilesPlayed || 0}</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('totalDraws')}</span><span class="stat-value">${s.totalDraws || 0}</span></div>
        <div class="stat-row"><span class="stat-label">${this._t('totalPasses')}</span><span class="stat-value">${s.totalPasses || 0}</span></div>
        <div class="stat-row"><span class="stat-label">Time Played</span><span class="stat-value">${Math.floor(getPlayTime() / 3600)}h ${Math.floor((getPlayTime() % 3600) / 60)}m</span></div>
      </div>
      <div class="stat-section">
        <div class="stat-section-title">${this._t('achievements')} (${unlocked.length}/${ACHIEVEMENTS.length})</div>
        ${ACHIEVEMENTS.map(a => {
          const isUnlocked = unlocked.includes(a.id);
          return `<div class="achievement-row ${isUnlocked ? 'unlocked' : 'locked'}">
            <span class="achievement-icon">${a.icon}</span>
            <div class="achievement-info">
              <div class="achievement-name">${_tUI(a.name)}</div>
              <div class="achievement-desc">${_tUI(a.desc)}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="stat-section" style="margin-top:24px;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <button id="export-data-btn" class="gm-btn" style="flex:1;background:rgba(90,138,240,0.15);border:1px solid rgba(90,138,240,0.3);color:#5a8af0;">${this._t('exportData')}</button>
          <button id="import-data-btn" class="gm-btn" style="flex:1;background:rgba(74,175,108,0.15);border:1px solid rgba(74,175,108,0.3);color:#4aaf6c;">${this._t('importData')}</button>
        </div>
        <input type="file" id="import-file-input" accept=".json" style="display:none;">
        <button id="reset-stats-btn" class="gm-btn" style="width:100%;background:rgba(224,74,58,0.15);border:1px solid rgba(224,74,58,0.3);color:#e04a3a;">${this._t('resetStats')}</button>
      </div>
    `;

    // Reset stats button handler
    const resetBtn = document.getElementById('reset-stats-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm(this._t('resetConfirm'))) {
          localStorage.removeItem('domino_stats');
          localStorage.removeItem('domino_game_stats');
          localStorage.removeItem('domino_achievements');
          localStorage.removeItem('domino_xp');
          this._renderStats();
        }
      });
    }
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const blob = new Blob([exportGameData()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'dominoes27-save.json'; a.click();
        URL.revokeObjectURL(url);
      });
    }
    const importBtn = document.getElementById('import-data-btn');
    const importFile = document.getElementById('import-file-input');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          if (importGameData(reader.result)) {
            this._renderStats();
            this._updateXPBar();
            this._applyLocale();
          }
        };
        reader.readAsText(file);
        importFile.value = '';
      });
    }
  },

  /** Render the preferences overlay (theme, skin, sound, music, trash talk, colorblind toggles). */
  _renderPrefs() {
      const container = document.getElementById('prefs-content');
      if (!container) return;
      const currentSkin = getTileSkin();
      const currentName = getPlayerName();
      const musicOn = this.music && this.music.enabled;
      const sfxOn = !this._soundMuted;

      const currentTheme = this._theme || 'dark';
      const currentLang = localStorage.getItem('domino_lang') || detectBrowserLang();

      container.innerHTML = `
        <div class="pref-group">
          <div class="pref-label">${getLocale(currentLang).ui.playerName || 'Player Name'}</div>
          <input type="text" id="pref-name-input" class="name-edit" maxlength="12" value="${currentName}" style="width:100%;">
        </div>
        <div class="pref-group">
          <div class="pref-label">${getLocale(currentLang).ui.language || 'Language'}</div>
          <div class="skin-options" style="grid-template-columns: repeat(4, 1fr);" id="pref-lang-options">
            ${Object.entries(LOCALES).map(([code, loc]) => `
              <div class="skin-option ${code === currentLang ? 'active' : ''}" data-lang="${code}">
                <span style="font-size:1.2rem;">${loc.flag}</span><span>${loc.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="pref-group">
          <div class="pref-label">${getLocale(currentLang).ui.theme || 'Theme'}</div>
          <div class="skin-options" style="grid-template-columns: repeat(2, 1fr);">
            <div class="skin-option ${currentTheme === 'dark' ? 'active' : ''}" data-theme-val="dark">
              <div class="skin-preview" style="background:linear-gradient(135deg,#1e7a35,#0d3a18);"></div>
              <span>${this._t('darkTheme')}</span>
            </div>
            <div class="skin-option ${currentTheme === 'light' ? 'active' : ''}" data-theme-val="light">
              <div class="skin-preview" style="background:linear-gradient(135deg,#e8f5e9,#a5d6a7);"></div>
              <span>${this._t('lightTheme')}</span>
            </div>
          </div>
        </div>
        <div class="pref-group">
          <div class="pref-label">${this._t('tileSkin')}</div>
          <div class="skin-options">
            ${TILE_SKINS.map(s => {
              const skinKey = 'skin' + s.id.charAt(0).toUpperCase() + s.id.slice(1);
              return `
              <div class="skin-option ${s.id === currentSkin ? 'active' : ''}" data-skin="${s.id}">
                <div class="skin-preview" style="background:linear-gradient(135deg,${s.face},${s.faceDark});border-color:${s.border};"></div>
                <span>${this._t(skinKey)}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="pref-group">
        <div class="pref-group">
          <div class="pref-label">${this._t('tableTheme')}</div>
          <div class="skin-options" id="table-theme-options"></div>
        </div>
          <div class="pref-label">${this._t('audio')}</div>
          <div class="toggle-row">
            <span>${this._t('music')}</span>
            <label class="toggle-switch">
              <input type="checkbox" id="music-toggle-cb" ${musicOn ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="toggle-row">
            <span>${this._t('sfx')}</span>
            <label class="toggle-switch">
              <input type="checkbox" id="sfx-toggle-cb" ${sfxOn ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div class="pref-group">
          <div class="pref-label">${this._t('gameSpeed')}</div>
          <div class="skin-options" style="grid-template-columns: repeat(3, 1fr);" id="pref-speed-options">
            <div class="skin-option ${this._gameSpeed === 'fast' ? 'active' : ''}" data-speed="fast">
              <span>🐇</span><span>${this._t('fast').replace(/^\S+\s/,'')}</span>
            </div>
            <div class="skin-option ${this._gameSpeed === 'normal' ? 'active' : ''}" data-speed="normal">
              <span>🎯</span><span>${this._t('normal').replace(/^\S+\s/,'')}</span>
            </div>
            <div class="skin-option ${this._gameSpeed === 'slow' ? 'active' : ''}" data-speed="slow">
              <span>🐢</span><span>${this._t('slow').replace(/^\S+\s/,'')}</span>
            </div>
          </div>
        </div>
        <div class="pref-group">
          <div class="pref-label">${this._t('trashTalk')}</div>
          <div class="skin-options" style="grid-template-columns: repeat(4, 1fr);" id="pref-trash-talk">
            <div class="skin-option ${this._trashTalkFreq === 0 ? 'active' : ''}" data-trash="0"><span>🔇</span><span>${this._t('off')}</span></div>
            <div class="skin-option ${this._trashTalkFreq === 1 ? 'active' : ''}" data-trash="1"><span>🤫</span><span>${this._t('low')}</span></div>
            <div class="skin-option ${this._trashTalkFreq === 2 ? 'active' : ''}" data-trash="2"><span>💬</span><span>${this._t('normal').replace(/^\S+\s/,'')}</span></div>
            <div class="skin-option ${this._trashTalkFreq === 3 ? 'active' : ''}" data-trash="3"><span>🗣️</span><span>${this._t('max')}</span></div>
          </div>
        </div>
        <div class="pref-group">
          <div class="pref-label">${this._t('accessibility')}</div>
          <div class="toggle-row">
            <span>${this._t('colorblind')}</span>
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
          const name = nameInput.value.trim() || _tUI('playerName');
          setPlayerName(name);
          if (this.players && this.players[0]) this.players[0].name = name;
          this._updateUI();
        });
      }

      // Populate table themes
    const tableOpts = document.getElementById('table-theme-options');
    if (tableOpts) {
      tableOpts.innerHTML = TABLE_THEMES.map(t => {
        const tableKey = 'table' + t.id.charAt(0).toUpperCase() + t.id.slice(1);
        return `
        <div class="skin-option ${t.id === getTableTheme() ? 'active' : ''}" data-table="${t.id}">
          <div class="skin-preview" style="background:linear-gradient(135deg,${t.felt},${t.dark});"></div>
          <span>${this._t(tableKey)}</span>
        </div>`;
      }).join('');
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

      // Language toggle
      const langOpts = document.getElementById('pref-lang-options');
      if (langOpts) {
        langOpts.querySelectorAll('.skin-option').forEach(el => {
          el.addEventListener('click', () => {
            const lang = el.dataset.lang;
            localStorage.setItem('domino_lang', lang);
            PHRASES = _buildPhrases(lang);
            document.documentElement.dir = getLocale(lang).dir || 'ltr';
            this._previewNames = null;
            this._previewPersonalities = null;
            this._applyLocale();
            this._updateRoster();
            this._renderPrefs();
          });
        });
      }
    },

  /** Update the XP progress bar below the player's hand. */
  _updateXPBar() {
    const wrap = document.getElementById('xp-bar-wrap');
    if (!wrap) return;
    const xp = getXPProgress();
    wrap.innerHTML = `
      <span class="xp-level">Lv.${xp.level}</span>
      <div class="xp-bar"><div class="xp-fill" style="width:${xp.pct}%"></div></div>
    `;
  },

  /** Render the tile tracker grid showing which tiles have been played, are in hand, or are unknown. */
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
        if (isPlayed) continue; // Only show unplayed tiles
        const el = document.createElement('div');
        el.className = 'tracker-tile unplayed';
        const tw = 40, th = 72;
        el.style.background = `linear-gradient(160deg, ${skin.face}, ${skin.faceDark})`;
        el.style.border = `1.5px solid ${skin.border}`;
        el.innerHTML = `<svg width="${tw}" height="${th}" viewBox="0 0 ${tw} ${th}">
          <line x1="${tw*0.2}" y1="${th/2}" x2="${tw*0.8}" y2="${th/2}" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>
          ${halfSVG(a, th*0.25, tw)}
          ${halfSVG(b, th*0.75, tw)}
        </svg>`;
        grid.appendChild(el);
      }
    }
  },

  /**
   * Compute post-game analysis stats for the human player.
   * @returns {{plays: number, draws: number, totalScored: number, bestPlay: number, avgScore: string, scoringPlays: number}}
   */
  _getAnalysis() {
    if (!this.gameLog) return {};
    const pName = this.players[0] ? this.players[0].name : _tUI('playerName');
    const myPlays = this.gameLog.filter(e => e.player === pName && e.action === 'play');
    const myDraws = this.gameLog.filter(e => e.player === pName && e.action === 'draw');
    const myScores = myPlays.filter(e => e.score > 0);
    const totalScored = myScores.reduce((s, e) => s + e.score, 0);
    const bestPlay = myScores.length > 0 ? Math.max(...myScores.map(e => e.score)) : 0;
    const avgScore = myPlays.length > 0 ? Math.round(totalScored / myPlays.length * 10) / 10 : 0;
    return { plays: myPlays.length, draws: myDraws.length, totalScored, bestPlay, avgScore, scoringPlays: myScores.length };
  },

  /** Render the game log overlay with all play, draw, pass, and round-end entries. */
  _renderLog() {
    const container = document.getElementById('log-entries');
    if (!container) return;
    container.innerHTML = '';

    if (!this.gameLog || this.gameLog.length === 0) {
      container.innerHTML = `<div style="opacity:0.4;text-align:center;padding:20px;">${this._t('noMovesYet')}</div>`;
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
      container.innerHTML = `<div style="opacity:0.4;text-align:center;padding:20px;">${this._t('noMovesYet')}</div>`;
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
            `<span style="margin-right:8px;">${escHTML(name)}: <span style="color:#f0b840;font-weight:800;">${s}</span></span>`
          ).join('');
        }
        div.innerHTML = `
          <span class="log-num">—</span>
          <div style="flex:1;">
            <div style="font-weight:700;color:#f0b840;margin-bottom:4px;">🏁 Round ${entry.round || '?'} — ${escHTML(entry.detail)}</div>
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
        detail = `${this._t('played')} ${makeTileHTML(entry.tile)} on ${entry.end}`;
        if (entry.score > 0) detail += ` <span class="log-score">+${entry.score}</span>`;
        if (entry.moveTime) detail += ` <span class="move-timer">${entry.moveTime}s</span>`;
      } else if (entry.action === 'draw') {
        detail = `<span class="log-action">${this._t('draw')}</span>`;
      } else if (entry.action === 'pass') {
        detail = `<span class="log-action">${this._t('pass')}</span>`;
      }

      // Running scores
      let scoresHtml = '';
      if (entry.scores) {
        scoresHtml = '<div style="font-size:0.7rem;opacity:0.4;margin-top:2px;">' +
          Object.entries(entry.scores).map(([name, s]) => `${escHTML(name)}:${s}`).join(' · ') +
          '</div>';
      }

      div.innerHTML = `
        <span class="log-num">${entry.turn}</span>
        <img class="log-avatar" src="${entry.avatar}" alt="${escHTML(entry.player)}">
        <div><span class="log-name">${escHTML(entry.player)}</span> ${detail}${scoresHtml}</div>
      `;
      container.appendChild(div);
    }

    container.scrollTop = 0;
  },

  /** Show a modal message overlay with an OK button. */
  showMessage(text, callback) {
    document.getElementById('message-text').innerHTML = text.replace(/\n/g, '<br>');
    document.getElementById('message-overlay').classList.remove('hidden');
    this._messageCallback = callback;
  },

  /** Hide the message overlay and invoke the stored callback. */
  hideMessage() {
    document.getElementById('message-overlay').classList.add('hidden');
    if (this._messageCallback) {
      const cb = this._messageCallback;
      this._messageCallback = null;
      cb();
    }
  },

  /** Apply all locale translations to the DOM (menu labels, buttons, overlays, etc.). */
  _applyLocale() {
    const lang = this._getLang();
    const u = getLocale(lang).ui || LOCALES.en.ui;
    document.documentElement.dir = getLocale(lang).dir || 'ltr';
    document.documentElement.lang = lang;

    // Menu screen labels
    const setTxt = (sel, txt) => { const el = document.querySelector(sel); if (el) el.textContent = txt; };
    const setHTML = (sel, html) => { const el = document.querySelector(sel); if (el) el.innerHTML = html; };

    // Title and subtitle
    setTxt('#menu-title', u.gameTitle || 'ALL FIVES');
    setTxt('#menu-subtitle', u.gameSubtitle || 'DOMINOES');

    // Menu option labels
    setTxt('#game-mode + label, [for="game-mode"]', u.gameMode);
    const labels = document.querySelectorAll('.option-group label');
    const labelKeys = ['gameMode', 'opponents', 'playTo', 'aiDifficulty', 'gameSpeed'];
    labels.forEach((lbl, i) => { if (labelKeys[i] && u[labelKeys[i]]) lbl.textContent = u[labelKeys[i]]; });

    // Menu buttons
    const modeGroup = document.getElementById('game-mode');
    if (modeGroup) {
      const btns = modeGroup.querySelectorAll('.btn-option');
      if (btns[0]) btns[0].textContent = u.ffa || 'Free For All';
      if (btns[1]) btns[1].textContent = u.teams || '2v2 Teams';
    }
    const diffGroup = document.getElementById('ai-difficulty');
    if (diffGroup) {
      const btns = diffGroup.querySelectorAll('.btn-option');
      if (btns[0]) btns[0].textContent = u.easy || '😊 Easy';
      if (btns[1]) btns[1].textContent = u.mixed || '🎲 Mixed';
      if (btns[2]) btns[2].textContent = u.hard || '🧠 Hard';
    }
    const speedGroup = document.getElementById('game-speed');
    if (speedGroup) {
      const btns = speedGroup.querySelectorAll('.btn-option');
      if (btns[0]) btns[0].textContent = u.fast || '🐇 Fast';
      if (btns[1]) btns[1].textContent = u.normal || '🎯 Normal';
      if (btns[2]) btns[2].textContent = u.slow || '🐢 Slow';
    }
    const scoreGroup = document.getElementById('target-score');
    if (scoreGroup) {
      const customBtn = scoreGroup.querySelector('[data-value="custom"]');
      if (customBtn) customBtn.textContent = u.custom || 'Custom';
    }

    // Start/resume buttons
    setTxt('#start-game', u.startGame || 'Start Game');
    setTxt('#resume-game', u.resumeGame || '▶ Resume Saved Game');

    // Player name placeholder
    const nameInput = document.getElementById('player-name-input');
    if (nameInput) nameInput.placeholder = u.playerName || 'Your Name';

    // Game screen buttons
    setTxt('#draw-btn', u.draw || 'Draw');
    setTxt('#pass-btn', u.pass || 'Pass');
    setTxt('#hint-btn', u.hint || '💡 Hint (-5 pts)');
    setTxt('#tracker-quick-btn', u.tiles || '🔍 Tiles');

    // Dropdown menu
    setHTML('#rules-btn', (u.rules || '📖 Rules') + ' <kbd class="dd-key">R</kbd>');
    setTxt('#tutorial-btn', u.tutorial || '🎓 Tutorial');
    setHTML('#log-btn', (u.gameLog || '📋 Game Log') + ' <kbd class="dd-key">G</kbd>');
    setHTML('#tracker-btn', (u.tileTracker || '🔍 Tile Tracker') + ' <kbd class="dd-key">T</kbd>');
    setHTML('#stats-btn', (u.stats || '📊 Stats & Achievements') + ' <kbd class="dd-key">A</kbd>');
    setHTML('#prefs-btn', (u.prefs || '🎨 Preferences') + ' <kbd class="dd-key">E</kbd>');
    setHTML('#shortcuts-btn', (u.shortcuts || '❓ Shortcuts') + ' <kbd class="dd-key">?</kbd>');
    setTxt('#ragequit-btn', u.rageQuit || '💀 Rage Quit (counts as loss)');
    setTxt('#ragequit-loss-note', u.rageQuitLossNote || 'This counts as a loss on your record.');

    // Overlay titles and close buttons
    setTxt('#stats-overlay .stats-panel > h2', u.stats || 'Stats & Achievements');
    setTxt('#stats-close-btn', u.close || 'Close');
    setTxt('#prefs-overlay .stats-panel > h2', u.prefs || 'Preferences');
    setTxt('#prefs-close-btn', u.close || 'Close');
    setTxt('#log-overlay .log-panel > h2', u.gameLog || 'Game Log');
    setTxt('#log-close-btn', u.close || 'Close');
    setTxt('#shortcuts-close-btn', u.close || 'Close');
    setTxt('#tracker-close-btn', u.close || 'Close');

    // Keyboard shortcuts panel
    setTxt('#sc-title', u.keyboardShortcuts || 'Keyboard Shortcuts');
    setTxt('#sc-select', u.scSelectTile || 'Select playable tile by position');
    setTxt('#sc-left', u.scPlaceLeft || 'Place on Left end');
    setTxt('#sc-right', u.scPlaceRight || 'Place on Right end / Rules');
    setTxt('#sc-north', u.scPlaceNorth || 'Place on North end');
    setTxt('#sc-south', u.scPlaceSouth || 'Place on South end');
    setTxt('#sc-draw', u.scDraw || 'Draw from boneyard');
    setTxt('#sc-hint', u.scHint || 'Use Hint (−5 pts)');
    setTxt('#sc-pass', u.scPass || 'Pass turn');
    setTxt('#sc-menu', u.scMenu || 'Open menu');
    setTxt('#sc-log', u.scGameLog || 'Game log');
    setTxt('#sc-tracker', u.scTracker || 'Tile tracker');
    setTxt('#sc-stats', u.scStats || 'Stats & Achievements');
    setTxt('#sc-prefs', u.scPrefs || 'Preferences');
    setTxt('#sc-toggle', u.scToggle || 'Toggle this panel');
    setTxt('#sc-close', u.scClose || 'Close any overlay');
    setTxt('#rules-close-btn', '← ' + (u.close || 'Back'));

    // Rules content
    const rulesContent = document.querySelector('.rules-content');
    if (rulesContent && RULES[lang]) rulesContent.innerHTML = RULES[lang];
    const rulesTitle = document.querySelector('#rules-overlay .rules-panel > h2');
    if (rulesTitle) rulesTitle.textContent = u.rules ? u.rules.replace(/📖\s*/, '') : 'How to Play';

    // End sum label
    setTxt('.sum-label', u.openEnds || 'Open Ends');

    // Boneyard label
    const boneLabel = document.getElementById('boneyard-label');
    if (boneLabel) {
      const countEl = document.getElementById('boneyard-count');
      const count = countEl ? countEl.textContent : '0';
      boneLabel.innerHTML = `🦴 <span id="boneyard-count">${count}</span> ${u.bones || 'bones'}`;
    }

    // Game over screen
    setTxt('#gameover-screen .game-title', u.gameOver || 'Game Over');
    setTxt('#rematch-btn', u.rematch || 'Rematch');
    setTxt('#play-again', u.newGame || 'New Game');
    setTxt('#share-log-btn', u.copyLog || '📋 Copy Game Log');

    // Tutorial nav
    setTxt('#tut-prev', '← ' + (u.close || 'Back'));

    // Menu language selector
    const langSel = document.getElementById('menu-lang-selector');
    if (langSel) {
      langSel.innerHTML = Object.entries(LOCALES).map(([code, loc]) =>
        `<button class="btn-option${code === lang ? ' active' : ''}" data-lang="${code}" style="flex:0;padding:8px 12px;min-width:auto;">${loc.flag}</button>`
      ).join('');
      langSel.querySelectorAll('.btn-option').forEach(btn => {
        btn.addEventListener('click', () => {
          localStorage.setItem('domino_lang', btn.dataset.lang);
          PHRASES = _buildPhrases(btn.dataset.lang);
          this._previewNames = null;
          this._previewPersonalities = null;
          this._applyLocale();
          this._updateRoster();
        });
      });
    }
  },

  /** Shows a first-visit language picker overlay; calls onDone when user selects. */
  _showLangPicker(onDone) {
    const overlay = document.getElementById('countdown-overlay');
    if (!overlay) { onDone(); return; }
    overlay.classList.remove('hidden');

    const detected = detectBrowserLang();
    const langs = Object.entries(LOCALES);

    overlay.innerHTML = `
      <div style="text-align:center;animation:announceIn 0.4s ease-out forwards;max-width:360px;margin:0 auto;">
        <div style="font-size:2.5rem;margin-bottom:12px;">🌍</div>
        <div style="font-size:1.4rem;font-weight:800;color:#fff;margin-bottom:6px;">Choose Your Language</div>
        <div style="font-size:0.85rem;opacity:0.5;margin-bottom:20px;">Elige tu idioma · اختر لغتك · 选择语言</div>
        <div id="lang-picker-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
          ${langs.map(([code, loc]) => `
            <button class="lang-pick-btn${code === detected ? ' detected' : ''}" data-lang="${code}" style="
              display:flex;align-items:center;gap:10px;padding:14px 16px;
              background:${code === detected ? 'rgba(232,167,53,0.15)' : 'rgba(255,255,255,0.05)'};
              border:2px solid ${code === detected ? 'rgba(232,167,53,0.5)' : 'rgba(255,255,255,0.1)'};
              border-radius:12px;cursor:pointer;transition:all 0.2s;color:#fff;font-size:1rem;font-weight:600;
            ">
              <span style="font-size:1.6rem;">${loc.flag}</span>
              <span>${loc.name}</span>
              ${code === detected ? '<span style="margin-left:auto;font-size:0.7rem;opacity:0.6;background:rgba(232,167,53,0.2);padding:2px 6px;border-radius:4px;">auto</span>' : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    overlay.querySelectorAll('.lang-pick-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(232,167,53,0.2)';
        btn.style.borderColor = 'rgba(232,167,53,0.6)';
      });
      btn.addEventListener('mouseleave', () => {
        const isDetected = btn.dataset.lang === detected;
        btn.style.background = isDetected ? 'rgba(232,167,53,0.15)' : 'rgba(255,255,255,0.05)';
        btn.style.borderColor = isDetected ? 'rgba(232,167,53,0.5)' : 'rgba(255,255,255,0.1)';
      });
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        localStorage.setItem('domino_lang', lang);
        localStorage.setItem('domino_lang_chosen', '1');
        PHRASES = _buildPhrases(lang);
        this._previewNames = null;
        this._previewPersonalities = null;
        this._applyLocale();
        this._updateRoster();
        overlay.classList.add('hidden');
        overlay.innerHTML = '';
        onDone();
      });
    });
  },

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
  },

  /** Render the player roster preview on the menu screen with avatars, records, and re-roll buttons. */
  _updateRoster() {
    const roster = document.getElementById('player-roster');
    if (!roster) return;

    const mode = this._getOption('game-mode');
    const humanSeed = getHumanAvatarSeed();
    const humanRec = getRecord(getPlayerName());
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

    roster.innerHTML = `<div class="roster-title">${this._t('players')}</div>`;
    for (let pi = 0; pi < players.length; pi++) {
      const p = players[pi];
      const card = document.createElement('div');
      card.className = 'roster-card' + (p.isHuman ? ' human' : '');
      const teamBadge = p.team === 'teammate' ? ' 🤝' : p.team === 'opponent' ? ' ⚔️' : '';
      card.innerHTML = `
        <img class="roster-avatar" src="${p.avatar}" alt="${escHTML(p.name)}">
        <div class="roster-info">
          <div class="roster-name">${escHTML(p.name)}${teamBadge}</div>
          <div class="roster-rank">${escHTML(p.rank)}${p.city ? ' · ' + escHTML(p.city) : ''}${p.personality ? ' ' + p.personality.icon : ''}</div>
          <div class="roster-record">${p.record.wins}W - ${p.record.losses}L${p.headToHead ? ` · ${this._t('vsYou')}: ` + escHTML(p.headToHead) : ''}</div>
        </div>
      `;
      if (!p.isHuman) {
        const rerollBtn = document.createElement('button');
        rerollBtn.className = 'roster-reroll';
        rerollBtn.textContent = '🎲';
        rerollBtn.title = this._t('rerollOpponent');
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
  },

  /** Enables/disables draw, pass, and hint buttons based on the human player's hand and boneyard state. */
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
      // Count total possible plays (tile + placement combos)
      let totalPlays = 0;
      for (const t of player.hand) {
        totalPlays += this.board.getValidPlacements(t).length;
      }
      hintBtn.disabled = pts < 5 || totalPlays <= 1;
    }
  },

  /** Render the board on canvas, optionally highlighting valid placement ends. */
  _renderBoard(highlightEnds, animProgress, flyFrom, spinnerEntrance) {
    if (!this.renderer) return;
    this.renderer.renderFromPlacements(this.placements, this.placements.length - 1, animProgress, flyFrom, spinnerEntrance);

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
              const sim = Board.clone(this.board);
              sim.placeTile(activeTile, p);
              const predScore = sim.getScore();
              predLabel = predScore > 0 ? `${p.end.toUpperCase()}\n+${predScore}` : p.end.toUpperCase();
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
            const lines = predLabel.split('\n');
            if (lines.length > 1) {
              ctx.font = 'bold 11px sans-serif';
              ctx.fillText(lines[0], pos.x, pos.y - 8);
              ctx.font = 'bold 16px sans-serif';
              ctx.fillText(lines[1], pos.x, pos.y + 8);
            } else {
              ctx.fillText(predLabel, pos.x, pos.y);
            }
            ctx.restore();
          }
        }

        ctx.restore();
      }
    }

});
