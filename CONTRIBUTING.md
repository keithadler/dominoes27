# Contributing to All Fives Dominoes

Thanks for your interest! This is a zero-dependency vanilla JS game and we'd like to keep it that way.

## Ground Rules

- **No frameworks, no build tools, no npm.** The game runs by opening `index.html` in a browser.
- **Keep it simple.** If a feature can be done in 20 lines of vanilla JS, don't add a library.
- **Test on mobile.** A large portion of players are on phones and tablets.
- **Respect the file structure.** Each file has a clear responsibility — don't dump unrelated code into the wrong file.

## How to Contribute

1. Fork the repo
2. Create a branch (`git checkout -b my-feature`)
3. Make your changes
4. Test by opening `index.html` in a browser (and on mobile if possible)
5. Check for syntax errors: `node -c game.js && node -c locales.js`
6. Commit and push
7. Open a Pull Request with a clear description of what changed and why

## File Guide

| File | What goes here |
|------|---------------|
| `tile.js` | Tile class, set creation, shuffle |
| `board.js` | Board state, open ends, scoring, tile placement |
| `player.js` | Player model |
| `ai.js` | AI decision engine, minimax search, strategy heuristics |
| `renderer.js` | Canvas rendering, 3D tile drawing, hand tile HTML |
| `audio.js` | Sound effects and background music (Web Audio API) |
| `stats.js` | Win/loss records, achievements, XP, player name |
| `ui-helpers.js` | Avatars, phrases, themes, skins, tutorial, personalities, particles |
| `game.js` | Main game controller — UI init, game flow, turn management |
| `locales.js` | All translations, locale data, helper functions |
| `styles.css` | All styles, animations, responsive breakpoints |
| `index.html` | App shell — screens, overlays, DOM structure |

## What We'd Love Help With

- **New languages** in `locales.js` (phrases should be culturally authentic, not machine translated)
- **Accessibility** improvements (screen readers, keyboard navigation, color contrast)
- **Mobile/touch UX** refinements
- **Bug fixes** (especially edge cases in scoring or board layout)
- **AI strategy** improvements (better heuristics, personality tuning)
- **New tile skins** or **table themes** (add to `ui-helpers.js`)
- **Visual effects** and animations

## What We Probably Won't Merge

- Adding npm, webpack, React, Vue, or any framework
- Multiplayer or server-side features (this is a client-only game)
- Changes that break mobile layout
- Machine-translated locale content without native speaker review
- Large refactors without prior discussion in an issue

## Adding a New Language

1. Add a `LOCALES.xx` entry in `locales.js` following the `LOCALES.en` structure
2. Include: `name`, `flag`, `dir` ('ltr' or 'rtl'), `names[]`, `cities[]`, full `ui{}` object, `p{}` phrases
3. The `ui` object has 100+ keys — translate every one (see English for the complete list)
4. Phrases in `p` are organized by generation (z/m/x/b), category (o/t/d/w), and tier (3 arrays)
5. Add rules HTML to the `RULES` object at the bottom of `locales.js`
6. Test RTL layout thoroughly if applicable

## Adding a Tile Skin

Add an entry to `TILE_SKINS` in `ui-helpers.js`:

```js
{ id: 'myskin', name: 'My Skin', face: '#fff', faceDark: '#ccc', pip: '#333', border: 'rgba(0,0,0,0.3)', depth: '#aaa' }
```

Then add locale keys `skinMyskin` to each language in `locales.js`.

## Adding a Table Theme

Add an entry to `TABLE_THEMES` in `ui-helpers.js`:

```js
{ id: 'mytheme', name: 'My Theme', felt: '#334455', dark: '#112233' }
```

Then add locale keys `tableMytheme` to each language in `locales.js`.

## Code Style

- 2-space indentation
- Single quotes for strings
- Keep methods focused — if it's over 50 lines, consider splitting
- Comment non-obvious logic
- Use JSDoc for public functions and class methods
- All user-facing strings must go through the locale system (`this._t()` or `_tUI()`)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
