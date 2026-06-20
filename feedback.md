# Night Mode (GH #15) — Code Review

**Reviewer:** flash-khalas-reviewer
**Date:** 2026-06-20 10:27:00+05:30
**Verdict:** APPROVED

---

## Acceptance Criteria

**Night mode activates after 2000m — PASS.** The check `distance >= 20000` at `game.js:632` correctly maps to the 2000m displayed distance (the internal `distance` unit is 1/10th of a meter, confirmed by the display code at line 1640: `Math.floor(distance / 10)` + "m"). The `nightMode` flag is properly reset to `false` in `startGame()` (line 505), so restarts begin in day mode.

**Headlight cone illuminates road ahead — PASS.** `drawNightOverlay()` (lines 1768–1782) fills the entire canvas with a dark overlay (`rgba(0, 2, 15, 0.88)`) using the `evenodd` fill rule to carve out a trapezoidal headlight cone. The cone fans from 20px at the car to 160px at 260px ahead — visually convincing and a clean compositing approach. No auxiliary canvas or extra blend modes needed.

**NPC cars have visible headlights — PASS.** `drawNPCHeadlights()` (lines 1784–1797) draws two radial gradient glows per NPC at x-offsets 15 and 33 (symmetric on the 48px-wide sprite). Warm yellow color (`rgba(255, 240, 160)`) fading to transparent — reads well as headlights. Drawn after the night overlay so they glow through the darkness.

**Flash is brighter/more dramatic at night — PASS.** In `drawFlashEffect()` (lines 1527–1538), the overlay alpha is boosted from 0.3 to 0.75 and the beam alpha from 0.6 to 1.0 during night mode, with beam width widened from 20px to 28px. Both values are clamped with `Math.min(1, ...)` to avoid invalid alpha. The visual difference should be noticeably more dramatic.

---

## Sky Transition

**PASS.** The sky background switches from `COL.sky` (`#0f3460`) to `#020a1a` (deep dark navy) at line 1829. Stars are drawn via `drawStars()` (lines 1757–1766) using 55 pre-seeded positions deterministically generated (no `Math.random()`). Stars are confined to y: 4–122, safely within the 130px sky region. Twinkle effect via `Math.sin(frameTick * 0.05 + s.phase)` gives alpha range 0.1–0.9. Nice touch.

---

## Drawing Order & HUD Visibility

**PASS.** The rendering sequence (lines 1829–1852) is correct:

1. Sky fill + stars → skyline → road → speed lines → buildings → power-ups → NPCs → player car
2. `drawNightOverlay()` — darkens everything except headlight cone
3. `drawNPCHeadlights()` — glow on top of darkness
4. Flash/turbo/yalla effects — on top of everything
5. `drawHUD()` → `drawYallaPopup()` → `drawTouchButtons()` — UI elements rendered after the night overlay, so they remain fully legible

No existing draw calls were reordered. New functions are inserted at the correct z-position.

---

## File Hygiene & Build

**PASS.** Only `public/game/game.js` was modified (single commit `cf198d5`). No new files, no asset changes, no wrapper/component modifications. Build succeeds (`npm run build`). All 33 tests pass across 5 test files (`npm test`).

---

## Performance

**PASS.** The `evenodd` compositing for the headlight cone is efficient — single fill path, no offscreen canvas. Star rendering is lightweight (55 small arcs). NOTE: `drawNPCHeadlights()` creates two `ctx.createRadialGradient()` calls per NPC per frame. With the typical NPC count on screen (5–8), this is fine, but if NPC density ever increases significantly it could become a hotspot. Not a concern at current scale.

---

## Style Notes (non-blocking)

- **Magic numbers**: The headlight cone dimensions (`coneLen = 260`, `coneHW = 80`, car opening width `10`) and NPC headlight offsets (`15`, `33`, `6`) are inline literals. They're clear in context and documented by the variable names where present, so this is not a blocker — but extracting the cone dimensions to named constants (similar to the existing `CAR_W`, `CAR_H` pattern) would marginally improve readability.
- **`drawStars()` global alpha**: Mutates `ctx.globalAlpha` directly rather than using `save()/restore()`. Works correctly since it resets to 1 at the end, but a `save()/restore()` wrapper would be slightly more defensive. Minor.

---

## Summary

All four acceptance criteria are met. The implementation is clean: the `evenodd` compositing approach for the headlight cone is elegant and performant, the drawing order preserves HUD visibility, star generation is deterministic, and the flash intensity boost at night adds good gameplay feel. Build and tests pass with no regressions. Only `game.js` was touched. The two style notes above are non-blocking polish items. **Approved for merge.**
