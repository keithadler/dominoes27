# All Fives Dominoes

A feature-rich All Fives dominoes game with AI opponents, team play, and polished visuals.

## Play

Open `index.html` in a browser, or serve locally:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`

## Features

- All Fives rules with correct scoring (multiples of 5, doubles count both sides, spinner mechanics)
- 1-3 AI opponents with randomized skill levels, or 2v2 team mode
- Minimax with alpha-beta pruning hint system (-5 points)
- Persistent player avatar, name, win/loss tracking, and achievements
- AI speech bubbles with skill-based trash talk
- 3D-styled tiles with fly-in animations from each player's direction
- Animated tile dealing with shuffle
- Bone counting ceremony at round end
- Game log with full move history
- Keyboard shortcuts (L/R/N/S for placement, D to draw, H for hint, etc.)
- Responsive design with mobile breakpoints
- Sound effects with mute toggle

## Tech

Pure HTML/CSS/JS — no dependencies, no build step. Uses DiceBear API for avatars and Google Fonts for Inter typeface.
