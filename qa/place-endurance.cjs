const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = process.env.BYTE_QA_OUTPUT || '/tmp/byte-sunburn-qa';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BYTE_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto((process.env.BYTE_QA_URL || 'http://127.0.0.1:4191/') + '?probe');
  await page.waitForSelector('#arrival.ready');
  const result = await page.evaluate(() => {
    const q = __byteProbe; q.paused = true; q.life.welcomed = true;
    let seconds = 0, trips = 0, maxPlatforms = 0;
    const phases = new Set(), rooms = new Set(), seen = new Set();
    function step(duration) {
      const dt = 1 / 120;
      for (let i = 0; i < duration / dt; i++) {
        const before = q.home.room;
        q.home.update(dt); q.update(dt, performance.now()); q.updateLife(dt);
        q.updateAutonomy(dt); q.updateButtonWeb(dt); q.updateObby(dt); q.updateButtonPhysics(dt);q.containRoomBody();
        seconds += dt; if (q.home.room !== before) trips++;
        rooms.add(q.home.room); phases.add(q.life.phase); seen.add(q.autonomy.choice);
        maxPlatforms = Math.max(maxPlatforms, q.obby.platforms.length);
        for (const k of ['x', 'y', 'vx', 'vy', 'angle', 'spin']) if (!Number.isFinite(q.byte[k])) throw Error('body ' + k);
        for (const item of q.home.things) for (const k of ['x', 'y', 'vx', 'vy']) if (!Number.isFinite(item[k])) throw Error(item.id + ' ' + k);
        if (!q.home.travel && !q.obby.hasLaunched) {
          const e = q.bodyHalfExtents(), cy = q.byte.y + q.bodyGeometry().bob;
          // Sleep animation and frame breathing may expand by a fraction between solver and presentation.
          if (q.byte.x - e.x < -1 || q.byte.x + e.x > q.world.w + 1 || cy - e.y < -1 || cy + e.y > q.world.h + 1) throw Error('room containment '+JSON.stringify({e,body:q.byte,scale:q.life.scale,phase:q.life.phase,room:q.home.room,trip:q.home.journey,travel:q.home.travel,obby:q.obby.hasLaunched}));
        }
      }
    }
    // Repeated complete house visits with belongings, naps and upstairs; retained history is never reset.
    for (let round = 0; round < 8; round++) {
      q.home.cancel(); q.wakeByte(); q.finishObby(); q.stopEarthGravity(); q.web.active = false;
      q.autonomy.choice = 'qa'; q.byte.mode = 'idle'; q.byte.y = q.floorY(); q.byte.vx = q.byte.vy = q.byte.spin = q.byte.angle = 0;
      q.home.request(2, 'visit'); step(5);
      q.autonomy.choice = 'play'; step(10);
      q.autonomy.choice = 'qa'; q.home.request(0, 'visit', q.home.things[0]); step(7);
      if (q.life.phase === 'awake') q.beginRest();
      for (let i = 0; i < 14 && q.life.phase !== 'sleep'; i++) step(1);
      if (q.life.phase !== 'sleep') throw Error('missed rest ' + JSON.stringify({round,phase:q.life.phase,room:q.home.room,trip:q.home.journey,travel:q.home.travel,activity:q.home.activity,obby:q.obby,nest:q.life.nest,things:q.home.things,body:q.byte})); q.wakeByte();
      q.autonomy.choice = 'qa'; q.home.request(2, 'obby'); step(6);
      q.obby.hasLaunched = true; q.obby.phase = 'fall'; q.obby.platforms = []; q.byte.mode = 'air'; q.byte.y = -q.world.h * 1.4; q.byte.vy = 550;
      step(12);
      q.finishObby(); q.wakeByte(); q.home.cancel(); q.home.travel = null;
    }
    // Quiet autonomous opportunities are allowed to choose freely; sleep is interrupted by a world nudge.
    q.autonomy.choice = null;
    for (let cycle = 0; cycle < 10; cycle++) {
      step(18);
      q.wakeByte(); if (q.obby.active && !q.obby.hasLaunched) q.home.request(1);
      q.byte.vx += cycle % 2 ? 100 : -100;
    }
    q.home.save(); const saved = JSON.parse(localStorage.getItem('byte-sunburn-home-v1'));
    q.draw(performance.now());
    const start = performance.now(); for (let i = 0; i < 180; i++) q.draw(start + i * 16.7);
    return { seconds, trips, rooms: [...rooms], phases: [...phases], choices: [...seen], maxPlatforms,
      renderMs: (performance.now() - start) / 180, saved, found: q.home.found, stoneHome: q.home.stoneHome };
  });
  assert(result.trips >= 24); assert.equal(result.rooms.length, 3); assert(result.found && result.stoneHome); assert(result.maxPlatforms < 40); assert(!errors.length);
  await page.screenshot({ path: path.join(out, 'place-endurance-final.png'), scale: 'css' });
  fs.writeFileSync(path.join(out, 'place-endurance-results.json'), JSON.stringify({ result, errors }, null, 2));
  console.log('PASS repeated house routines, carried belongings, upstairs returns and unscripted opportunities remain finite.', result);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
