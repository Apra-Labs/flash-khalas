# Night Mode with Headlight Cone Effect (GH #15)

## Summary
After reaching a distance milestone, the game transitions to night mode. The road darkens and only the area lit by your headlights is fully visible.

## Requirements
- Transition to night after 2000m distance
- Dark overlay on the entire canvas
- Headlight cone: triangular bright area in front of the player car
- NPC headlights visible (small dots)
- Flash effect is more dramatic at night (full bright flash)
- Sky changes from blue to dark navy with stars

## Files to Change
- `public/game/game.js` — night mode state, dark overlay, headlight cone, sky transition

## Acceptance Criteria
- [ ] Night mode activates after 2000m
- [ ] Headlight cone illuminates road ahead
- [ ] NPC cars have visible headlights
- [ ] Flash is brighter/more dramatic at night
