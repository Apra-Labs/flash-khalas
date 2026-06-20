# Night Mode (GH #15) — Code Review

**Reviewer:** flash-khalas-reviewer
**Date:** 2026-06-20 10:05:00+04:00
**Verdict:** APPROVED

---

## Night Mode Activation

Night mode activates at `distance >= 20000`, which equals exactly 2000m in displayed units (the game divides distance by 10 for the HUD — line 1644: `Math.floor(distance / 10)` + `m`). The `nightModeAlpha` ramps from 0 to 1 at +0.005 per frame (~3.3 seconds at 60fps), giving a smooth dusk-to-dark transition. Both `nightMode` and `nightModeAlpha` are correctly reset to their initial values in `startGame()`.

**PASS.**

---

## Headlight Cone

The cone uses even-odd fill compositing — a full-canvas rect plus an inset trapezoid that the even-odd rule cuts out, leaving the rest of the canvas darkened at 85% opacity. The cone originates at the player car (`frontY = PLAYER_Y + 8`, 8px wide) and fans out to `spread = 110` (220px total) at `topY = 132`, just past the sky/road boundary. A warm linear gradient (pale yellow fading to transparent) overlays the cone interior for a convincing lit-pavement look.

Render order is correct: the overlay is drawn after NPC sprites but before the player car, so the player is always fully visible on top of the darkness. HUD, game-over screen, and flash effects also draw after the overlay and remain readable.

**PASS.**

**NOTE:** The comment on line 1789 says the cone is "wound opposite to rect" — actually both paths wind clockwise in screen coordinates. Even-odd fill doesn't require opposite winding (that's the nonzero rule), so the code works correctly; the comment is just slightly misleading.

---

## NPC Headlights

`drawNpcHeadlights()` renders two layers per NPC: a soft glow (7px radius, 20% alpha) and a bright core (2.5px, 90% alpha) for both front headlights (warm yellow `#ffffaa`) and rear taillights (red `#ff2222`). Headlight x-positions are 15 and 33 (symmetric within the 48px car width). The `patrol` type gets a slightly different headY offset (`y + 4` vs `y + 6`), which is a nice detail.

Headlights are drawn after the night overlay so they punch through the darkness — correct behavior, since you should see oncoming/ahead NPC lights even in dark areas.

**PASS.**

---

## Flash Effect at Night

`drawFlashEffect()` multiplies opacity by `nightMult = 1 + nightModeAlpha * 1.5`, reaching 2.5x at full night, capped at `globalAlpha = 1.0` via `Math.min`. The beam width also widens from 20px to 30px at night. Both changes make the flash noticeably more dramatic in darkness — a full-screen white flash at night vs the subtler daytime effect.

**PASS.**

---

## Sky Transition & Stars

Sky color interpolates from `#0f3460` (rgb 15,52,96) to `#010818` (rgb 1,8,24) using per-channel lerp. The math is correct: `Math.round(dayVal + (nightVal - dayVal) * nightModeAlpha)`.

Stars: 60 positions generated deterministically (no `Math.random`) with a hash-like formula, confined to y=5–104 (within the 0–130 sky area). Sizes alternate between 1px and 1.5px. A `sin`-based twinkle modulates each star's alpha per frame. Stars fade in with `nightModeAlpha`.

**PASS.**

**NOTE:** Stars are drawn before the night overlay, so they receive the full 85% black layer on top. Effective star visibility at full night is roughly `alpha * 0.15` — faint but present. If this is intentional (subtle atmospheric effect), it works fine. If you want more prominent stars, move `drawStars()` to after `drawNightOverlay()` or exclude the sky region (y < 130) from the dark overlay. Not a blocker.

---

## Performance

All night-mode rendering uses simple canvas operations: `fillRect`, `arc`, `fill('evenodd')`, `createLinearGradient`, `clip`. No per-pixel operations (`getImageData`/`putImageData`), no expensive compositing modes. The stars loop is capped at 60 iterations. NPC headlights loop over active NPCs (typically < 10). The early-return guard `if (nightModeAlpha === 0) return` in `drawNightOverlay()` and `drawNpcHeadlights()` avoids all night-mode work during daytime play.

**PASS — no performance concerns.**

---

## Magic Numbers

Inline constants: `topY = 132`, `spread = 110`, `frontY = PLAYER_Y + 8`, `nightModeAlpha + 0.005`, `nightModeAlpha * 0.85`. All are local to their functions and contextually clear (132 ≈ sky/road boundary at 130, spread is half the cone width, etc.). Extracting them to named constants would add clarity but isn't strictly necessary given the comment density.

**NOTE — acceptable as-is.**

---

## File Hygiene

Night-mode changes are confined to `public/game/game.js` as specified in the requirements. No new asset files needed. The commit (`b924fde`) also includes a Khalas → Khallas rename and branding/pipeline changes from prior PRs already on the branch — these were reviewed separately and are not re-reviewed here.

**PASS.**

---

## Build & Tests

- `npm run build`: passes, no warnings.
- `npm test`: 33/33 tests pass across 5 suites.

**PASS.**

---

## Summary

All four acceptance criteria are met:

| Criterion | Status |
|---|---|
| Night mode activates after 2000m | PASS |
| Headlight cone illuminates road ahead | PASS |
| NPC cars have visible headlights | PASS |
| Flash is brighter/more dramatic at night | PASS |

The implementation is clean and well-structured. The even-odd compositing for the headlight cone is the right technique. Render ordering correctly keeps the player visible above the darkness. State resets properly on new game. No performance concerns.

Two minor notes (not blockers): stars are slightly muted by the overlay (move `drawStars()` after `drawNightOverlay()` if you want brighter stars), and one comment about cone winding is technically inaccurate while the code itself is correct. Neither requires changes before merge.

**Approved as-is.**
