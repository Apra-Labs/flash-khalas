# Branding Info Section — Code Review

**Reviewer:** flash-khalas-reviewer
**Date:** 2026-06-20
**Verdict:** CHANGES NEEDED → APPROVED (re-review 2026-06-20)

**Fix notes (from doer):**
- Bug 1 fixed: `generateQR` now derives `size` from `modules.length` instead of hardcoding 25.
- Bug 2 fixed: `dataCapacity` changed from 28 → 44 (Version 3-M data codewords).
- Bug 3 fixed: `rsEncode(codewords, 16)` → `rsEncode(codewords, 26)` (Version 3-M EC codewords).
- Dead code removed: `addSep` function removed.
- Think-aloud comments removed (former lines 126-128).
- Stale header comments updated to reflect actual version/mode used.
- Canvas size increased to 174×174 (CSS: 100×100) for ~5px/module rendered.

**Re-review verification:**
All three bugs confirmed fixed. Parameters now consistent: V3 matrix (29×29), 44 data + 26 EC = 70 codewords (V3-M). Renderer derives size from matrix. Dead code and stale comments cleaned up. Build passes, 33/33 tests pass.

---

## #31 — QR Code (Pure JS/Canvas)

**Result: Broken — QR will not scan.**

Three compounding bugs in `BrandingInfo.jsx`:

### Bug 1: Matrix size vs. render size mismatch
`qrEncode()` builds a **29×29** matrix (Version 3, line 49: `size = 17 + 4 * 3`), but `generateQR()` renders only **25×25** modules (line 18: `const size = 25`). The bottom 4 rows and right 4 columns are silently clipped.

### Bug 2: Wrong data/ECC parameters for Version 3
`dataCapacity = 28` and `ecCount = 16` (lines 73, 85) total 44 codewords — correct for **Version 2-M**, not Version 3-M which requires 44 data + 26 EC = 70 codewords. The format info declares ECC Level M, but the RS encoding doesn't match.

### Bug 3: URL doesn't fit V2-M capacity
The URL `https://apralabs.com/apra-fleet` (30 chars) needs 32 data codewords in byte mode (4-bit mode + 8-bit count + 240-bit data + 4-bit terminator = 256 bits). V2-M only supports 28 data codewords. The padding loop at line 80 never triggers because `codewords.length` (32) already exceeds `dataCapacity` (28), so the RS encoding receives mismatched input.

### Minor issues
- Stale comments: file header (line 3) says "Version 2", section comment (line 36) says "ECC L, alphanumeric", actual code uses Version 3, ECC M, byte mode.
- `addSep()` function (line 109) is defined but never called — dead code.
- Think-aloud comments left in source (lines 126-128): `"wait, version 3 has alignment..."` — should be removed.

### Fix recommendation
Either use a hardcoded pre-computed 25×25 module matrix (simplest — the file header comments already allude to this approach), or fix the encoder to use consistent V3-M parameters: `dataCapacity = 44`, `ecCount = 26`, and set `size = 29` in both `qrEncode` and `generateQR`.

---

## #32 — "We are not a gaming company" tagline

**Result: Present and correct.**

- Rendered as italic monospace with a subtle green glow animation (`tagline-glow` keyframes).
- Uses `--accent-highlight` and `rgba(184, 217, 77, ...)` — consistent with Apra Labs green palette.
- Centered, visually cohesive with the rest of the sidebar.

No issues.

---

## #33 — "Apra Fleet is Open Source" + star-the-repo CTA

**Result: Present and correct.**

- Heading uses `--accent-primary` with uppercase tracking.
- Star link opens `https://github.com/ApraPipes/apra-fleet` with `target="_blank"` and `rel="noopener noreferrer"`.
- Hover state uses green background tint. Border uses `rgba(148, 186, 51, 0.4)`.
- Layout is flexbox with `space-between` — heading left, CTA right.

No issues.

---

## Styles (App.css)

- All new classes are namespaced under `.branding-` — clean, no collisions.
- Colors use CSS variables (`--accent-highlight`, `--accent-primary`, `--text-muted`) and Apra green rgba values.
- Background (`rgba(10, 10, 20, 0.5)`) matches the dark theme.
- `image-rendering: pixelated` on the QR canvas is a good touch for crisp module edges.
- `flex-shrink: 0` prevents the branding section from collapsing.

No issues.

---

## Pipeline / Server Bug Fixes

### `lib/pipeline.js`
Adds `prompt_full` message handling to capture untruncated prompts during pipeline parsing. Clean, matches the existing pattern.

### `scripts/backfill-dispatches.js`
Refactored from single-pass (post each entry immediately) to two-pass (collect into a Map by invocation ID, resolve `prompt_full` entries, then POST). Correct — fixes the truncated-prompt bug.

### `server.js`
Adds `Set`-based dedup in `autoRecordDispatches` keyed on `member|ts` to prevent duplicate dispatch records. The `Set` check runs before the more expensive `matchesDispatch` loop — good ordering.

No issues with these fixes.

---

## Build & Tests

- `npm run build`: passes, no warnings.
- `npm test`: all 33 tests pass. Stderr shows jsdom canvas warnings (expected — jsdom doesn't implement Canvas natively, and the component gracefully returns early via `if (!ctx) return`).

---

## File Hygiene

| File | Expected? |
|---|---|
| `src/components/BrandingInfo.jsx` (new) | Yes |
| `src/App.jsx` | Yes |
| `src/App.css` | Yes |
| `lib/pipeline.js` | Yes (bug fix) |
| `scripts/backfill-dispatches.js` | Yes (bug fix) |
| `server.js` | Yes (bug fix) |

No unexpected files. CLAUDE.md not committed.

---

## Summary

Issues #32 (tagline) and #33 (open-source CTA) are implemented correctly. The pipeline/server bug fixes are clean.

~~**Issue #31 (QR code) has a critical encoding bug** — the encoder mixes Version 2 data parameters with a Version 3 matrix, and the renderer clips the matrix to 25×25. The result will render visually as "a QR code" but **will not scan**. This needs to be fixed before merge.~~

**Re-review:** All three QR bugs fixed. Encoder now uses consistent V3-M parameters (44 data + 26 EC = 70 codewords), renderer derives size from the matrix, dead code and stale comments removed. Build passes, all 33 tests pass. **Approved.**
