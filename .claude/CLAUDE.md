# Flash Khalas

Dubai highway driving game + apra-fleet demo wrapper.

## Stack

- **Wrapper**: React 18 + Vite (src/)
- **Game**: Vanilla HTML5 Canvas (public/game/)
- **Tests**: Vitest + Testing Library (tests/)
- **CI**: GitHub Actions (.github/workflows/ci.yml)

## Rules

- Game runs as an iframe inside the wrapper — keep game code self-contained in public/game/
- Game uses no build step — plain JS only, no imports, no bundler
- Wrapper components are in src/components/
- Tests go in tests/ — run with `npm test`
- Run `npm run test:coverage` before pushing
- Match existing pixel-art aesthetic and retro UI style
- Keep the game simple and fun — this is a demo, not a AAA title
