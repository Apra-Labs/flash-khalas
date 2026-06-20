# Apra Labs Rebrand — Code Review

**Reviewer:** flash-khalas-reviewer
**Date:** 2026-06-20
**Verdict:** CHANGES NEEDED

---

## CSS Variables & References

All copper/gold CSS values correctly updated to green palette:

| Token | Old Value | New Value | Status |
|---|---|---|---|
| `--accent-copper` | `#d4a574` | `#94BA33` | ✓ |
| `--accent-gold` | `#ffd700` | `#b8d94d` | ✓ |
| `rgba(255, 215, 0, …)` (×6 sites) | gold rgba | `rgba(148, 186, 51, …)` | ✓ |
| `rgba(212, 165, 116, 0.4)` | copper rgba | `rgba(148, 186, 51, 0.4)` | ✓ |
| `#c4956a` text-shadow | copper shadow | `#5a7a1a` | ✓ |
| `#2a2520` pulse-task bg | warm dark | `#1a2210` | ✓ |

Contrast against `#0a0a14` / `#0d0d1a` dark backgrounds looks strong.

**Issue:** Variable names `--accent-copper` and `--accent-gold` still reference the old palette but now hold green values. Rename to `--accent-primary` / `--accent-secondary` (or `--accent-green` / `--accent-green-light`) so future readers aren't misled.

## Game Canvas Colors

Gold-family colors in `game.js` correctly replaced:

| Old Hex | New Hex | Usage | Status |
|---|---|---|---|
| `#ffd700` (×7 inline + COL) | `#94BA33` | COL.gold, COL.hud, Burj needle, helipad, frame accents, museum ring, yacht mast | ✓ |
| `#8B6914` (×4 sites) | `#5a7a1a` | Burj accent bands, Dubai Frame columns, Cayan twist, museum rim | ✓ |
| `#6a4c0a` (×1 site) | `#3a5a0a` | Frame column rivets | ✓ |

Non-gold colors left untouched (verified): `sky`, `sand`, `road`, `lane`, `player`, `playerAcc`, `npc`, `cop`, `patrol`, `flash`. Correct.

**Issue:** Camel body `#c8a450` → `#94BA33` and legs `#b89040` → `#7a9e28` turns the camel green. The camel is a desert environmental sprite, not a branding accent — a green camel reads as a blind find-replace, not an intentional design choice. Revert camel body and leg colors to their originals (`#c8a450`, `#b89040`).

## Completeness Check

- Grep for `#ffd700`, `#8B6914`, `#b89040`, `#6a4c0a`, `rgba(255, 215, 0`: **zero hits** in changed files.
- One remaining `#d4a574`: `COL.sand` in `game.js` line 27. Used for desert terrain fill (line 837) and subtitle text (line 1581) — environmental, correctly left unchanged.
- `requirements.md` referenced in CLAUDE.md but does not exist on either branch. No impact on diff review, but consider adding it for traceability.
- `npm run build`: passed
- `npm test`: 33/33 tests passed across 5 suites

## File Hygiene

Changed files in commit `91ad25a`:
- `src/App.css` — expected ✓
- `public/game/game.js` — expected ✓

No unexpected files modified. `CLAUDE.md` is in `.gitignore` (line 8) and not committed. `.claude/CLAUDE.md` is tracked project documentation, not review context.

---

## Summary

The rebrand correctly replaces the copper/gold palette with Apra Labs green across both the React wrapper CSS and game canvas code. Build and tests pass. No leftover old-palette hex values remain in accent code. Two issues need attention before merge:

1. **Stale CSS variable names** — `--accent-copper` and `--accent-gold` still suggest the old palette. Rename to match the new green identity.
2. **Green camel** — the camel sprite's body/leg colors were swept into the rebrand but are environmental, not branding. Revert to original tan/golden values.

Both are small, low-risk fixes. Once addressed, this is ready to merge.
