# Night Mode (GH #15) — Code Review

**Reviewer:** flash-khalas-reviewer
**Date:** 2026-06-20 12:44:00+05:30
**Verdict:** APPROVED

---

## Acceptance Criteria

All four acceptance criteria from requirements.md are met:

- **Night mode activates after 2000m** — PASS. `NIGHT_DISTANCE = 20000` and the game displays `distance / 10` as meters (line 1710), so night triggers at exactly 2000m displayed. The flag flips once in `update()` (line 737) and resets cleanly in `startGame()` (line 502).

- **Headlight cone illuminates road ahead** — PASS. `drawNightOverlay()` renders a dark overlay on the road area then composites a triangular headlight cone using `globalCompositeOperation = 'lighter'` with a radial gradient. The cone originates at the player car's front center and extends 280px ahead with a 200px spread. Clipping the gradient to the triangle is a solid approach — visually convincing and not overly complex.

- **NPC cars have visible headlights** — PASS. `drawNPCHeadlights()` draws two-layer headlight dots (outer glow at radius 8 + inner bright core at radius 3) at positions `x+13` and `x+31` on each NPC, roughly symmetric around the 48px car width. Uses additive blending so lights pop against the dark overlay.

- **Flash is brighter/more dramatic at night** — PASS. `drawFlashEffect()` applies a `nightBoost = 1.8` multiplier to both the screen flash alpha and beam width (20→30px) during night mode. Alpha is clamped to 1 via `Math.min()` to avoid invalid canvas alpha values. Clean implementation.

---

## Sky Transition and Stars

PASS. The sky interpolates from `rgb(15,52,96)` (matches `COL.sky = '#0f3460'` exactly) to `rgb(1,11,26)` — a deep navy. The linear interpolation in the game loop (lines 1849-1854) is clean. Stars are pre-generated once in an IIFE (70 stars, lines 1892-1902) with a sine-based twinkle keyed to `frameTick` and per-star phase offsets. Stars fade in with `nightTransitionProgress`, appearing naturally as the sky darkens. The star color `#fffff0` (warm white) is a nice touch.

---

## Transition Timing

NOTE. `nightTransitionProgress` increments by 0.003 per frame, reaching 1.0 after ~333 frames (~5.5 seconds at 60fps). This is a smooth, gradual transition — neither jarring nor sluggish. Reasonable default.

---

## Rendering Order

PASS. Drawing order is correct: sky → stars → skyline → road → NPCs → player car → night overlay → NPC headlights → flash effect → HUD. The dark overlay covers all road elements (including the player car) and then additive headlights punch through, which is the right compositing order. NPC headlights draw after the overlay so they glow on top of the darkness. Flash effect draws last so it correctly layers over everything.

---

## State Management

PASS. `nightMode` and `nightTransitionProgress` are reset in `startGame()` (lines 502-503). The `stars` array is generated once at load and reused across games — correct, since star positions are cosmetic and don't depend on game state. The transition progress only increments forward (never decreases), which matches the one-way day→night design.

---

## Performance

PASS. Canvas operations are lightweight:
- 70 `arc()` calls for stars — negligible.
- One `createRadialGradient()` + `clip()` per frame for the headlight cone — the gradient must be recreated since it tracks `playerX`, but radial gradients are GPU-accelerated on modern browsers. Acceptable.
- NPC headlight dots scale with NPC count (typically <10), with simple `arc()` fills.
- All night-mode draw functions early-return when `nightTransitionProgress <= 0`, so there's zero overhead during daytime play.

---

## File Hygiene

PASS. Only `public/game/game.js` was modified for the feature (116 lines added, 5 modified). `requirements.md` and `.gitignore` were added in a separate chore commit. No unrelated changes, no stray files.

---

## Code Quality

PASS. The implementation is well-structured:
- Each visual element (overlay, cone, NPC headlights, stars) gets its own function — easy to tweak independently.
- Canvas state is properly saved/restored in every draw function.
- The constant `NIGHT_DISTANCE = 20000` has a clear comment explaining the 10x unit relationship.
- Magic numbers (cone length 280, cone width 100, star count 70, overlay opacity 0.78) are reasonable defaults for a pixel-art game and not excessive — they'd only warrant constants if reused or externally configured.
- Ticket references (`#15`) in comments aid traceability.

---

## Summary

The night mode implementation is clean, complete, and meets all acceptance criteria. The headlight cone compositing approach (dark overlay + additive radial gradient clipped to a triangle) is visually effective without being over-engineered. Sky transition, NPC headlights, and enhanced flash are all correctly integrated into the existing rendering pipeline. State resets properly on game restart. No performance concerns, no regressions to existing gameplay. Build passes, all 33 tests pass.

Approved as-is.
