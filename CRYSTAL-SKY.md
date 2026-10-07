# Crystal Sky / loft exit pass

This pass extends the noncanonical Sunburn III candidate from `218978e75ba8171d3c738c05e84a90be1d51f2ba`. It does not update canonical Spider Byte or the validated Through the Glass branch.

## Playable route

The loft remains a separately visitable, ordinary room. Actual contact with its waiting spring supplies one strong physical launch. No normal obby platforms are generated inside it. The camera briefly pulls back so Byte and the pitched, open-skylight roof are visible together, then follows his flight while the whole house leaves below. The skylight samples the same sky behind the house rather than swapping backgrounds at the old room boundary.

Crystal and ordinary ledges begin only after the launch has cleared the house and travelled through open sky. In the 390×844 controlled capture, the completely clear interval is 0.708 seconds; tested sizes all retain at least 0.4 seconds. The first outdoor ledge catches the descending launch. Ordinary bounces remain -930, gravity remains 1650, and subsequent platform dimensions, support footprint, spacing and tilt steering retain their existing mechanics.

The crystal is an overscanning, world-fixed mesh of irregular translucent blue/teal facets with a fractured lower edge. It fills the usable climbing area rather than making a narrow corridor. Distant clouds move at 12% of camera travel; facets, seams, fractures and platforms move with the foreground world. A subset of large faces samples a slightly displaced copy of the actual sky to suggest refraction. Platforms have embedded roots, pale top edges and local fractures. The unchanged expedition stone belongs to the same icy material family.

Player webs retain arbitrary placement across the crystal playfield and the exact existing pull-only tether solver. The held endpoint is fixed in world space, not dragged by the finger. A small silk/fracture contact and attachment shadow place its end against the surface. During the clear-sky launch, a held point waits for real material to arrive; releasing before it arrives leaves no anchor. There are no grapple nodes, cooldowns or rope resources.

Missing the climb returns Byte, belongings and the camera to the normal loft. His existing big floor rebound remains. The spring rearms after landing recovery settles or a deliberate grab/spool interaction, avoiding an accidental new expedition triggered by that rebound. Deliberate placement can launch again. Stone discovery is measured above the crystal's world base; its existing falling body, local storage, return and one-time autonomous claim remain unchanged.

## Evidence and regression checks

- All 68 existing focused mobile/device/sensing/home/upstairs checks pass. These cover grab/flick, visible squish, planted/slack room rope, Earth support/orientation/corners, scuttle, scheming/prank activation and displaced control, sensing shutdown/permission behavior, sleep, ladder/hatch, belongings/history and stone return/claim.
- The existing device probe still demonstrates a held-rope rescue of a missed platform and momentum-preserving release. Its outdoor fixture was moved to the crystal altitude without changing the relative rescue geometry or assertions.
- Sensor stress, creature endurance, place endurance and the normal-frame house playthrough pass. Sensor acquisition/filtering and the physical obby rope solver are unchanged.
- `qa/crystal-probe.cjs` passes 13 focused route/physics checks: normal loft before contact; decisive launch; measurable clear sky; ordinary first landing; broad fixed anchor; preserved linear/angular release momentum; no slack push; independent foreground/sky travel; clean return and relaunch; pending hold/release; crystal-relative fragment discovery. Controlled horizontal layout makes this test reproducible.
- `qa/crystal-playthrough.cjs` records the full route through the normal animation loop, with actual CDP touches and trusted browser virtual-device motion. It does not write creature position/velocity/phase or call simulation steps. It visits the loft, launches, clears the roof, reaches the crystal, holds/releases a web, tilts into a miss, returns to the loft and descends the hatch. The capture contains 301 airborne frames and 622 trusted motion events, with no browser errors.
- `qa/crystal-layout.cjs` passes 320×568, 390×844, 430×932 and 844×390, including camera/material coverage, clear-sky interval and midflight resize/input cleanup.

QA artifacts for this run are outside the deployment in `/workspace/spider-byte-crystal-qa`: `crystal-route.mp4`, `crystal-route-sheet.jpg`, individual launch/clear-sky/crystal/web/return captures, route traces and suite results. The video records the natural loop; the separate `web-contact.png` and existing rescue probe show taut rope behavior. Screenshots have been visually inspected, including the roof exit and the crystal's incoming edge.

## Revisions, compromises and Human Eyes authority

A first roof cutout used even-odd clipping without first constraining the roof polygon and painted extraneous wood. The actual roof polygon now bounds the cutout. All-facet refraction and a separate full-size material buffer were rejected for render cost; only selected optical faces refract. The sky buffer uses CSS-pixel resolution while Byte, rope, ledges and fracture strokes retain native device resolution. These are stylized displaced samples, not a physically accurate optical simulation.

The software Chromium renderer measured approximately 14.2 ms per frame in the isolated crystal draw probe. The recorded normal-frame capture has a 16.7 ms median and 50 ms 95th-percentile interval, including capture stalls. These are browser/software measurements, not phone performance guarantees. Real Safari/Android sensor signs, sustained mobile rendering cost, launch feel, the apparent size/depth/material of the crystal and attachment readability still require Human Eyes/Fingers. Automated checks and local visual inspection do not constitute their acceptance.

The full route is implemented and locally runtime-reachable. Deployment status and exact shipped commit are reported separately at handoff. No new art, sensors, care mechanics, UI, generalized levels or restrictions on ordinary crystal web placement were added.
