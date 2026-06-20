# Flash Khallas — Code Review

**Reviewer:** flash-khalas-reviewer
**Date:** 2026-06-20
**Verdict:** CHANGES NEEDED

---

## Rename Check (#36)

**Result: Nearly complete — one miss in package-lock.json.**

All source files correctly renamed `khalas` → `khallas`:
- `package.json` name: `flash-khallas` ✓
- `index.html` title: `Flash Khallas` ✓
- `public/game/index.html` title: `Flash Khallas` ✓
- `public/game/game.js`: milestone text, title screen, game over — all `KHALLAS` ✓
- `src/App.jsx` header: `Flash Khallas` ✓
- `src/components/GameFrame.jsx` iframe title: `Flash Khallas Game` ✓
- `src/components/FleetStatus.jsx` member name prefix: `flash-khallas-` ✓
- `src/hooks/useFleetStatus.js` filter: `flash-khallas` ✓
- `lib/pipeline.js` filter: `flash-khallas` ✓
- `scripts/backfill-dispatches.js` filter + comment: `flash-khallas` ✓
- `server.js` file paths: `flash-khallas-request.json`, `flash-khallas-dispatches.jsonl` ✓
- `README.md`: all references updated ✓
- All test files: member names updated ✓

Grep for old spelling `khalas` (case-insensitive, excluding `khallas`) across source files: **zero hits**.

**Minor issue:** `package-lock.json` still contains `"name": "flash-khalas"` (2 occurrences). This is auto-generated — running `npm install` would fix it — but it's technically inconsistent. Low severity; not blocking.

---

## Demo Page Check (#37)

**Result: Bug — missing logo asset.**

`AboutOverlay.jsx` structure:
- Name: "Kashyap Jois" ✓
- LinkedIn URL: `https://ae.linkedin.com/in/kashyap-jois-16a418103` ✓
- Opens in new tab: `target="_blank"` with `rel="noopener noreferrer"` ✓
- Dismissible: backdrop click calls `onClose`, close button (✕) present ✓
- `e.stopPropagation()` on card prevents accidental dismiss when clicking inside ✓

**Bug:** Logo `src="/apra_logo.jpg"` references a file that **does not exist** in `public/`. The `public/` directory contains only the `game/` subdirectory. The image will render as a broken icon. The logo file needs to be added to `public/apra_logo.jpg` before merge.

CSS (`App.css`):
- About overlay styles (`.about-backdrop`, `.about-card`, `.about-close`, `.about-logo`, `.about-name`, `.about-linkedin`) are well-structured ✓
- Backdrop uses `rgba(0,0,0,0.85)` with blur — good for readability ✓
- Close button hover turns red (`--color-error`) — clear affordance ✓
- All class names are namespaced under `about-` — no collisions ✓

---

## QR Removal Check (#38)

**Result: Clean removal.**

`BrandingInfo.jsx` now contains only:
1. Tagline: `"We are not a gaming company"` — italic monospace with green glow animation ✓
2. Open-source CTA: "Apra Fleet is Open Source" heading + "★ Star the repo" link ✓
   - Link target: `https://github.com/ApraPipes/apra-fleet` with `target="_blank"` and `rel="noopener noreferrer"` ✓

All QR code canvas logic (encoder, renderer, `generateQR`, `qrEncode`, `addSep`, Reed-Solomon) confirmed **removed**. No QR-related code remains anywhere in `src/`.

CSS references to QR (`image-rendering: pixelated`) in `App.css` are also gone from the current `BrandingInfo` styles, though the old review text mentioned them — the diff confirms the QR-related CSS was part of the old component, not the new one.

---

## Build & Tests

- `npm run build`: **passes** — no warnings, output: `index.html`, `index-*.css` (17.39 KB), `index-*.js` (152.54 KB).
- `npm test`: **33/33 tests pass** across 5 suites (App, FleetStatus, GameFrame, pipeline, useFleetStatus).

---

## File Hygiene

| File | Change | Expected? |
|---|---|---|
| `README.md` | Rename | Yes |
| `index.html` | Rename | Yes |
| `package.json` | Rename | Yes |
| `public/game/game.js` | Rename | Yes |
| `public/game/index.html` | Rename | Yes |
| `src/App.jsx` | Rename + about overlay integration | Yes |
| `src/App.css` | Branding + about overlay styles | Yes |
| `src/components/AboutOverlay.jsx` (new) | Demo end page | Yes |
| `src/components/BrandingInfo.jsx` (new) | QR removed, tagline + CTA retained | Yes |
| `src/components/FleetStatus.jsx` | Rename | Yes |
| `src/components/GameFrame.jsx` | Rename | Yes |
| `src/hooks/useFleetStatus.js` | Rename | Yes |
| `lib/pipeline.js` | Rename + prompt_full handling | Yes |
| `scripts/backfill-dispatches.js` | Rename + two-pass refactor | Yes |
| `server.js` | Rename + dedup fix | Yes |
| `tests/*.jsx`, `tests/*.js` (5 files) | Rename in test data | Yes |
| `feedback.md` | Updated from prior review | Yes |

21 files changed total. No unexpected files. `CLAUDE.md` not committed (in `.gitignore`).

---

## Summary

**Rename (#36)** is thorough — zero old-spelling hits in source code. `package-lock.json` has a stale name but is auto-generated and non-blocking.

**Demo page (#37)** is well-implemented (correct name, LinkedIn URL, new-tab, dismissible overlay with good UX) but **has a missing asset bug**: `public/apra_logo.jpg` does not exist, so the logo will render as a broken image. This must be fixed before merge.

**QR removal (#38)** is clean — all encoder/canvas logic removed, tagline and open-source CTA preserved.

Build passes, all 33 tests pass, file hygiene is clean.

**Verdict: CHANGES NEEDED** — add the `apra_logo.jpg` file to `public/`.
