# 🁣 All Fives Dominoes

A feature-rich, browser-based All Fives dominoes game with AI opponents, team play, and polished arcade-style visuals. No server required — runs entirely in the browser.

![All Fives Dominoes](https://img.shields.io/badge/Game-All%20Fives%20Dominoes-gold)
![Pure JS](https://img.shields.io/badge/Tech-HTML%2FCSS%2FJS-green)
![No Dependencies](https://img.shields.io/badge/Dependencies-None-blue)

## 🎮 Play

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080)

Or simply open `index.html` in any modern browser.

## 📖 Game Rules (All Fives)

All Fives is a classic domino scoring game using a standard double-6 set (28 tiles):

- **Objective**: First player/team to reach the target score (100-500) wins
- **Scoring**: After each play, if the sum of all open ends equals a **multiple of 5**, you score that many points (5, 10, 15, 20...)
- **Doubles count both sides**: A 4-4 at an open end counts as 8, not 4
- **The Spinner**: The first double played becomes the spinner — it can branch in all 4 directions (N/S/E/W)
- **Drawing**: If you can't play, draw from the boneyard until you can (or pass if empty)
- **Round end**: When someone plays their last tile ("dominoes") or the game is blocked, the winner gets bonus points from opponents' remaining tiles (rounded to nearest 5)

## ✨ Features

### Gameplay
- Full All Fives rules with correct scoring (doubles at ends, spinner mechanics, forced highest-double first play)
- 1-3 AI opponents in Free For All, or 2v2 Team mode
- AI opponents with 3 difficulty levels (easy/medium/hard) assigned randomly
- 5 AI personality types: 🔥 Aggressive, 🛡️ Defensive, 🎲 Chaotic, 🧠 Calculated, 😈 Bully
- Minimax with alpha-beta pruning **Hint system** (-5 points per use)
- Auto-play when only one move exists
- Same-score auto-placement (skips direction chooser when all options score equally)

### Visuals & Animation
- 3D-styled domino tiles with gradients, bevels, depth shadows, and glossy reflections
- 6 tile skins: Classic, Marble, Wood, Neon, Gold, Midnight
- Animated tile fly-in from each player's direction with rotation easing
- Animated tile dealing with shuffle at round start
- Scattered face-down boneyard pile at random angles
- Pulsing cyan spinner highlight
- Floating golden turn arrow
- Particle effects (gold sparkles on scoring, confetti on game win)
- Score popups that scale with point value (bigger = more points)
- Stars at end-of-round based on bonus amount
- 25+ visual polish enhancements (felt texture, wood rails, glass morphism, etc.)

### UI & UX
- Interactive tutorial with SVG domino visuals (auto-shows on first visit)
- DiceBear avatars for all players (human avatar persists across sessions)
- Custom player name (editable in preferences or double-click on board)
- AI opponents with random real names and US city hometowns
- Win/loss records and skill rankings for all players (persisted in localStorage)
- AI speech bubbles with 150+ skill-based phrases (trash talk, draw complaints, domino celebrations)
- "Thinking" indicator with animated dots when AI is deciding
- Turn toast notifications with player avatars
- Hover preview showing valid placements on the board
- Bone counting ceremony at round end with tile-flip animations
- "GAME OVER" announcement overlay before final scores
- 3-2-1 countdown at game start
- Round announcement showing who has the highest double (with SVG tile)
- Responsive design with mobile breakpoints

### Audio
- Background music with MP3 support (chill + intense tracks with crossfade based on game intensity)
- Synthesized jazz chord fallback when no MP3 files present
- Victory track on game win
- Sound effects: tile placement, scoring arpeggio, sad boneyard draw, win fanfare, deal shuffle
- Separate toggles for music and sound effects in preferences

### Game Management
- Full game log with move history, pip-dot tile display, running scores, and round summaries
- Keyboard shortcuts (L/R/N/S placement, D draw, H hint, P pass, G log, M menu, 1-9 tile select)
- In-game dropdown menu with Rules, Tutorial, Game Log, Stats, Preferences, Rage Quit
- Rematch (same players) or New Game options
- Rage Quit counts as a loss

### Progression & Stats
- XP system with leveling (earn XP for scoring, winning, losing)
- 10 achievements: First Victory, Big Score, Perfect Play, 5-Star Round, On Fire, Unstoppable, Clean Sweep, Regular, Domino Master, and more
- Achievement unlock popups
- Stats dashboard: games played, win rate, best streak, highest scores
- All stats persist in localStorage

## 🎵 Music Setup

Place MP3 files in the `music/` folder:

| File | Purpose | Suggested Search |
|------|---------|-----------------|
| `chill.mp3` | Normal gameplay loop | "jazz lounge", "smooth background" |
| `intense.mp3` | Close game loop | "upbeat jazz", "tension building" |
| `victory.mp3` | Win celebration | "victory fanfare short" |

Free sources: [Pixabay Music](https://pixabay.com/music/), [Mixkit](https://mixkit.co/free-stock-music/)

The game works without these files — a synthesized jazz chord progression plays as fallback.

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1`-`9` | Select playable tile by position |
| `L` `R` `N` `S` | Place tile on Left/Right/North/South |
| `D` | Draw from boneyard |
| `H` | Use hint (-5 pts) |
| `P` | Pass turn |
| `G` | Open game log |
| `M` | Open menu |
| `?` | Toggle shortcuts panel |
| `Esc` | Close any overlay |

## 🛠 Tech Stack

- **Pure HTML/CSS/JS** — no frameworks, no build step, no dependencies
- **Canvas API** for board rendering with auto-scaling
- **Web Audio API** for sound effects and synthesized music
- **HTML5 Audio** for MP3 background music with crossfading
- **localStorage** for all persistence (stats, settings, avatar, name, achievements, XP)
- **DiceBear API** for procedurally generated avatars
- **Google Fonts** (Inter) for typography

## 📁 Project Structure

```
├── index.html          # Main HTML with all screens
├── styles.css          # Complete stylesheet with animations
├── game.js             # Game engine, AI, renderer, UI (~3500 lines)
├── music/
│   ├── chill.mp3       # Background music (normal)
│   ├── intense.mp3     # Background music (intense)
│   ├── victory.mp3     # Victory jingle
│   └── README.md       # Music setup guide
└── README.md           # This file
```

## 📜 License

Game code is provided as-is. Music files sourced from Pixabay (royalty-free, no attribution required).
