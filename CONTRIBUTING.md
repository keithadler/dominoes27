# Contributing to All Fives Dominoes

Thanks for your interest in contributing! This is a zero-dependency vanilla JS game and we'd like to keep it that way.

## Ground Rules

- No frameworks, no build tools, no npm. The game runs by opening `index.html` in a browser.
- Keep it simple. If a feature can be done in 20 lines of vanilla JS, don't add a library for it.
- Test on mobile. A large portion of players are on phones and tablets.

## How to Contribute

1. Fork the repo
2. Create a branch (`git checkout -b my-feature`)
3. Make your changes
4. Test by opening `index.html` in a browser (and on mobile if possible)
5. Run `node -c game.js` and `node -c locales.js` to check for syntax errors
6. Commit and push
7. Open a Pull Request

## What We'd Love Help With

- New languages in `locales.js` (phrases should be culturally authentic, not machine translated)
- Accessibility improvements
- Mobile/touch UX refinements
- Bug fixes
- AI strategy improvements
- New tile skins or table themes

## What We Probably Won't Merge

- Adding npm/webpack/React/etc.
- Multiplayer or server-side features (this is a client-only game)
- Changes that break mobile layout
- Machine-translated locale content

## Adding a New Language

1. Add a new entry in `locales.js` following the existing pattern (see `LOCALES.en` for the full structure)
2. Include culturally appropriate names, cities, UI strings, and generation-specific phrases
3. Add rules content to the `RULES` object
4. Test RTL if applicable (set `dir: 'rtl'` in your locale)

## Code Style

- 2-space indentation
- Single quotes for strings
- No semicolons are fine, but be consistent within a block
- Keep methods short and focused
- Comment non-obvious logic

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
