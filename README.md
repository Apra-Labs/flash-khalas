# Flash Khalas

A quirky Dubai highway driving game — powered by [apra-fleet](https://github.com/Apra-Labs/apra-fleet).

Race down Sheikh Zayed Highway, flash your headlights at slowpokes to make them move, but watch out for cops and juiced-up Nissan Patrols.

## Quick Start

```bash
npm install
npm run dev        # starts dev server on :3000
npm test           # run tests
npm run test:coverage  # with coverage report
```

## How It Works

The app has two parts:

- **Wrapper** (React + Vite) — sidebar with a chat panel and fleet status display
- **Game** (HTML5 Canvas) — runs in an iframe, pure vanilla JS

Type a feature request or bug report in the chat panel to trigger an apra-fleet doer-reviewer pair. Watch the fleet status as it plans, implements, reviews, and ships your request.

## Game Controls

| Key | Action |
|-----|--------|
| Arrow Left/Right | Switch lanes |
| Space / F | Flash headlights |

**Mobile:** Swipe to switch lanes, tap to flash.

## Car Types

| Car | What happens when you flash |
|-----|----------------------------|
| Regular (grey) | Moves aside — you score! |
| Cop (dark blue, flashing lights) | You get busted — KHALAS! |
| Nissan Patrol (gold) | Just goes faster |

## Architecture

```
flash-khalas/
├── src/                  # React wrapper app
│   ├── components/
│   │   ├── ChatPanel     # Fleet command input
│   │   ├── GameFrame     # iframe host
│   │   └── FleetStatus   # Doer-reviewer progress
│   └── App.jsx
├── public/game/          # Standalone canvas game
│   ├── index.html
│   └── game.js
├── tests/                # Vitest unit tests
└── .github/workflows/    # CI with coverage
```

## Contributing via Fleet

This project is designed as an apra-fleet demo. Features are tracked as GitHub Issues and implemented by fleet doer-reviewer pairs.

```
Chat input → apra-fleet dispatch → doer plans + implements →
reviewer reviews → commit + push → CI runs → PR raised → auto-reload
```
