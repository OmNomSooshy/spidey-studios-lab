# Sunburn VII — pocket money, physical memories

Candidate branch: `experiment/sunburn-vii-2026-10-07`. Parent: Sunburn VI `cc46742bcdda538bee4733ec061cf1a666769c4a`. This is an experimental candidate; Human Fingers retains acceptance authority.

## The slice

The loft's existing spring begins a new expedition when Byte actually lands on it. Every launch chooses a fresh seed. Crystal ledge positions and gaps use that run's generator, within the already-playable width, horizontal-reach and vertical-spacing ranges. The first catch ledge remains reliable. Higher routes and pickup positions vary; playthrough evidence contains different complete platform arrangements, not just refreshed pickup flags. The existing launch impulse, open-sky interval, bounces, narrow landing footprint, tilt control, camera, pull-only web and missed-route return remain authoritative.

Each new crystalline ledge supplies one fresh floating crystal just above its landing area. Byte collects through actual flight/contact, with swept contact detection for fast movement. Touching the screen is still web placement, never a remote pickup. Home, clear sky and grabbed-body paths cannot award currency. Continued climbing keeps generating earning opportunities. Pickups behind the active camera are discarded, and particles are bounded to thirty.

One pickup earns one crystal, banked immediately. The small wallet at the upper left shows spendable balance; during an expedition it also shows progress toward the next fragment. At home, tapping the wallet opens the wardrobe. The wardrobe has only two original, lightweight accessories:

| Cosmetic | Price | Meaning |
| --- | --- | --- |
| Cloud cap | 5 crystals | Icy teal cap with a tiny amber crystal pin |
| Plum beanie | 8 crystals | Ribbed plum knit hat with a pompom |

Both are expressive overlays within the stable HQ body frame. They mirror, rotate, scale and squish with Byte, including the existing sleep/wake/refusal/scuttle/scheming vocabulary. Pose-specific head anchors account for folding without entering body dimensions, contact, support or the spool reference. Every original HQ image remains unchanged. Purchase grants ownership; the separate **Wear it** action equips. **Take off** removes the hat without repurchasing or charging. Ownership, chosen hat and balance survive reload. The body remains active behind the deliberately modal shop; opening it does not pause or reset the creature.

Every five crystals collected **within one expedition** earns one physical trophy fragment on returning to the loft. Ten in one run earns two. Spending cannot change this collection. Fragments use the established home belonging physics: grab, throw, carry through passages/hatch, Earth gravity, inertia and saved room/position. A small wooden fragment shelf occupies spare playroom wall space to the left of the ladder. Fresh returns leave the fragment in the loft; Human Fingers can arrange it downstairs. Reloading an interrupted expedition keeps banked money and materializes any already-earned fragments exactly once. The original one-time expedition stone and its ownership/history remain separate and intact.

Biscuits now obey one rule: actual kitchen re-entry replenishes the four normal portions **only if every biscuit everywhere has zero bites remaining**. Loose, carried, dropped and partial portions therefore prevent replenishment and retain their state. Reloading the kitchen alone does not refill it. Replenishment does not reset meals, broccoli preference, care/history or food-theft timing.

## Decisions and iteration

I chose a reliable initial catch and varied higher ledges rather than a new level/difficulty framework. Prices are deliberately small: the proving fragment threshold also buys the first hat. Missing a route still banks what was collected. There is no earning multiplier or capability dependency on cosmetics. The existing wide crystalline surface remains the home for unrestricted web anchors.

The first visual review found a floating cap over the low scheming pose, small-screen card overflow, and a pickup receipt sitting over the run dots. The anchors, narrow layout and receipt placement were corrected. Initial direct SVG/vector drawing also produced measurable rendering cost; both hats and the crystal glyph are now rasterized once and reused. The added cached pixel memory is 344,704 bytes (about 337 KiB), without expanding the Crystal material cache.

The first constrained touch controller missed a route and then tried to grab Byte during his legitimate return rebound; it could hit the spool instead of the body. The harness now waits for real settling, aims away from the physical spool and records/retries genuine misses. It never writes body velocity/position, pickup flags, balance, life phase or route phase. This is a test correction, not a product cooldown or physics change.

## Evidence against the contract

| Requirement | Runtime evidence |
| --- | --- |
| Fresh repeated expeditions | Ordinary product RAF, Android Chrome touch and trusted browser virtual motion completed two different routes. Final constrained proof includes a missed run followed by two successful fresh runs. |
| Gameplay-only earning | Physical flight/contact awarded pickups. Focused checks reject home/sky/grab paths and duplicate contact. |
| Persistent wallet | Final constrained route banks 3 on a miss, then 6, spends 5 on the cap, then earns 5: final balance 9. Reload retains it. |
| Cumulative physical trophies | Two successful runs produce `trophy-1` and `trophy-2`; both remain after buying/removing the cap and reloading. Focused touch grabs/moves a fragment and verifies its saved position. |
| Buy / own / equip / remove | Actual wardrobe clicks prove purchase does not equip, wearing/removing costs nothing, ownership survives both reloads and removal. The hat is visible on Byte in the loft and next expedition. |
| Renewable food | Normal touch physically feeds all four biscuits; actual kitchen leave/return restores four, retaining four meals and uneaten broccoli. Partial-biscuit and no-entry/reload cases are separately checked. |
| Protected physical creature | Existing touch/flick/squish, Earth support/corners/locomotion, sensing, home/sleep/history, loft/Crystal, care and acting suites pass. Six of seven inherited kitchen checks pass; the landscape limitation below is explicitly retained. |
| Mobile budget | Matched software/DPR2/6× CPU benchmark with ten active crystals and an equipped cap: VI 32.84 FPS, final VII 31.77 FPS; p95 frame 50 ms for both. Median completed raster: 5.9/6.3 ms. Crystal remains eight tiles / 9,960,040 bytes. |

`qa/sunburn-vii-evidence.json` summarizes the actual results, routes and source preservation. `qa/economy-playthrough.cjs` uses normal RAF plus actual touch and trusted browser sensor overrides; only competing idle opportunities are suppressed for reproducibility. Its direct-state counterpart, `qa/economy-probe.cjs`, proves ledger, contact, geometry, interruption, persisted trophy and replenishment edge cases. `qa/pantry-playthrough.cjs` is the ordinary-touch depletion/refill route. `qa/economy-performance.cjs` compares completed raster and frame pacing in controlled scenes rather than treating queued canvas calls as FPS.

The retained regression run contains 106 passing checks and one inherited landscape food-theft failure. The ten new focused economy checks pass. During investigation, the same tiny landscape geometry stalled autonomous food retrieval in untouched Sunburn VI; an isolated VII comparison completed it. The existing rope/mouth/table physics was left intact instead of broadening this mission into a food-physics repair. Portrait physical feeding, scheming/rope checks, broccoli refusal and the normal depletion/refill route pass. This intermittent landscape theft stall remains a known limitation.

Browser route validation is not a physical Samsung Galaxy A06 5G. Hat appearance/readability, sustained handset responsiveness, earning/price feel and the overall replay/personalization payoff remain Human Eyes/Fingers' acceptance. Local history is browser/origin storage, with the same limitations as the existing home; it is not cross-device sync. Higher ledges vary within the existing rules, not a sophisticated procedural campaign. The small shelf is a first collection area; many eventual physical fragments can crowd the home. No promise is made about an enormous long-term catalogue or collection scale.

The native publication result and exact pushed commit are reported at handoff. Stop there.
