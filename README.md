git push# 🁣 All Fives Dominoes

A feature-rich, zero-dependency browser domino game. Pure HTML/CSS/JS — no build step, no server, no frameworks.

**[▶ Play Now](https://keithadler.github.io/dominoes27/)**

![MIT License](https://img.shields.io/badge/License-MIT-green)
![Pure JS](https://img.shields.io/badge/Stack-HTML%2FCSS%2FJS-blue)
![No Dependencies](https://img.shields.io/badge/Dependencies-None-orange)
![Languages](https://img.shields.io/badge/Languages-EN%20ES%20AR%20ZH-purple)

---

## Features

**Gameplay** — Full All Fives rules with spinner mechanics, 1–3 AI opponents or 2v2 teams, 3 difficulty levels, 5 AI personality types, minimax hint system, drag-and-drop tile placement, board pinch-zoom/pan, and auto-play detection.

**AI** — Each opponent gets a random generation (Gen Z, Millennial, Gen X, Boomer) that determines how they trash-talk. 300+ culturally authentic phrases across 4 languages. Personalities affect play style: Aggressive, Defensive, Chaotic, Calculated, Bully.

**Visuals** — 3D tiles with 6 skins (Classic, Marble, Wood, Neon, Gold, Midnight), animated dealing with cinematic player intros, tile fly-in animations, particle effects, score combo counter, screen shake on big plays, pulsing spinner highlight, bone counting ceremony, and victory celebrations that scale with margin.

**i18n** — English, Spanish, Arabic (full RTL), Chinese. Auto-detects browser language. Language picker on first visit. Culturally appropriate AI names, cities, and dialogue per language. Rules and tutorial fully translated.

**Progression** — XP leveling, 17 achievements, lifetime stats, head-to-head records vs each AI, daily first-game bonus.

**Quality of Life** — Save/resume games, export game log, colorblind mode, haptic feedback, keyboard shortcuts for everything, dark/light theme, 6 table themes, game speed control, AI trash talk frequency slider, `prefers-reduced-motion` support.

**Mobile** — Responsive across phones, tablets, and desktop. PWA installable. Touch drag-and-drop, pinch-zoom on board, safe area support for notched devices.

## Quick Start

No install needed. Just open `index.html` in any browser.

```bash
# Or serve locally:
python3 -m http.server 8080
# → http://localhost:8080
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1`–`9` | Select tile by position |
| `L` `R` `N` `S` | Place on Left/Right/North/South end |
| `D` | Draw from boneyard |
| `H` | Use hint (−5 pts) |
| `P` | Pass turn |
| `M` | Open menu |
| `G` | Game log |
| `T` | Tile tracker |
| `A` | Stats & Achievements |
| `E` | Preferences |
| `?` | Toggle shortcuts panel |
| `Esc` | Close any overlay |

## Project Structure

```
├── index.html       — Single-page app shell (all screens/overlays)
├── styles.css       — Styles, animations, responsive breakpoints
├── locales.js       — i18n: 4 languages, phrases, names, UI strings, rules
├── tile.js          — Tile class, set creation, shuffle
├── board.js         — Board state, open ends, scoring logic
├── player.js        — Player model (human + AI)
├── ai.js            — AI engine: 3 difficulties, minimax with alpha-beta
├── renderer.js      — Canvas board renderer with 3D tile effects
├── audio.js         — Synthesized SFX + dynamic jazz music engine
├── stats.js         — Win/loss records, achievements, XP, player name
├── ui-helpers.js    — Avatars, themes, skins, tutorial, personalities, particles
├── game.js          — Main game controller (~3800 lines)
├── manifest.json    — PWA manifest
├── CONTRIBUTING.md  — Contribution guidelines
└── LICENSE          — MIT
```

## Tech Stack

- **Rendering** — Canvas API with auto-fit zoom, 3D bevels, fly-in animations
- **Audio** — Web Audio API oscillator synthesis (no audio files)
- **Persistence** — localStorage for stats, achievements, settings, save games
- **Avatars** — [DiceBear Adventurer](https://www.dicebear.com/) (CC BY 4.0)
- **Font** — [Inter](https://rsms.me/inter/) (SIL Open Font License 1.1)

## Adding a New Language

1. Add a `LOCALES.xx` entry in `locales.js` following the `LOCALES.en` structure
2. Include: `name`, `flag`, `dir` (ltr/rtl), `names[]`, `cities[]`, `ui{}`, `p{}` (phrases)
3. Add rules HTML to the `RULES` object at the bottom of `locales.js`
4. All UI keys are listed in the English `ui` object — translate every key
5. Phrases should be culturally authentic, not machine-translated
6. Test RTL layout if applicable

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. We especially welcome:

- New languages (with authentic cultural phrases)
- Accessibility improvements
- AI strategy enhancements
- Mobile/touch UX refinements
- New tile skins or table themes

## License

MIT — see [LICENSE](LICENSE).

## Attribution

- Avatars by [DiceBear](https://www.dicebear.com/) — CC BY 4.0
- Inter typeface by [Rasmus Andersson](https://rsms.me/inter/) — SIL OFL 1.1

---

Made by [Keith Adler](https://github.com/keithadler)
