# 🁣 All Fives Dominoes

A feature-rich, zero-dependency browser game. Pure HTML/CSS/JS — no build step, no server, no frameworks.

![MIT License](https://img.shields.io/badge/License-MIT-green)
![Pure JS](https://img.shields.io/badge/Stack-HTML%2FCSS%2FJS-blue)
![No Dependencies](https://img.shields.io/badge/Dependencies-None-orange)
![Languages](https://img.shields.io/badge/Languages-EN%20ES%20AR%20ZH-purple)

## Play

Open `index.html` in any browser. Or:

```bash
python3 -m http.server 8080
# visit http://localhost:8080
```

## What's In the Box

**Gameplay** — Full All Fives rules with spinner mechanics, 1-3 AI opponents or 2v2 teams, 3 difficulty levels, 5 AI personality types, minimax hint system, drag-and-drop tile placement, board zoom/pan, and auto-play detection with visual indicators.

**AI** — Each opponent gets a random generation (Gen Z, Millennial, Gen X, Boomer) that determines how they talk. 300+ culturally authentic phrases across 4 languages. Personalities affect play style: Aggressive, Defensive, Chaotic, Calculated, Bully.

**Visuals** — 3D tiles with 6 skins, animated dealing with cinematic player intros, tile fly-in animations, particle effects, pulsing spinner highlight, bone counting ceremony, victory celebrations that vary by margin.

**i18n** — English, Spanish, Arabic (RTL), Chinese. Language selector on the main menu. Culturally appropriate AI names, cities, and dialogue per language. Rules fully written in each language.

**Progression** — XP leveling, 17 achievements, lifetime stats, head-to-head records vs each AI, daily first-game bonus.

**QoL** — Save/resume games, export game log to clipboard, colorblind mode, haptic feedback on mobile, keyboard shortcuts for everything, dark/light theme, game speed control (fast/normal/slow), AI trash talk frequency slider.

**Mobile** — Responsive across phones, tablets, and desktop. Safe area support for notched iPhones, `100dvh` for mobile Safari, PWA meta tags, touch drag-and-drop.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1`-`9` | Select tile | `L` `R` `N` `S` | Place on end |
| `D` Draw | `H` Hint | `P` Pass | `M` Menu |
| `G` Game log | `T` Tile tracker | `A` Stats | `E` Preferences |
| `?` Shortcuts | `Esc` Close overlay |

## Project Structure

```
index.html    — Single-page app with all screens
styles.css    — Styles, animations, responsive breakpoints
game.js       — Game engine, AI, renderer, UI (~5000 lines)
locales.js    — i18n: phrases, names, cities, UI strings, rules
LICENSE       — MIT
CONTRIBUTING.md
```

## Tech

- Canvas API for board rendering with auto-fit zoom
- Web Audio API for synthesized jazz music and SFX
- localStorage for all persistence
- [DiceBear](https://www.dicebear.com/) for procedural avatars (CC BY 4.0)
- [Inter](https://rsms.me/inter/) font (SIL Open Font License)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). We especially welcome new languages, accessibility improvements, and AI strategy enhancements.

## License

MIT — see [LICENSE](LICENSE).

## Attribution

- Avatars by [DiceBear](https://www.dicebear.com/) — CC BY 4.0
- Inter typeface by [Rasmus Andersson](https://rsms.me/inter/) — SIL OFL 1.1

---

Made by Keith Adler
