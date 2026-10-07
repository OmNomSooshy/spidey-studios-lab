const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = process.env.BYTE_QA_OUTPUT || '/tmp/byte-sunburn-qa';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BYTE_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, recordVideo: { dir: out, size: { width: 390, height: 844 } } });
  const page = await context.newPage(), errors = [], trace = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto((process.env.BYTE_QA_URL || 'http://127.0.0.1:4191/') + '?probe');
  await page.waitForSelector('#arrival.ready');
  const cdp = await context.newCDPSession(page);
  async function touch(type, x, y) {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ id: 1, x, y, radiusX: 5, radiusY: 5, force: 1 }] });
  }
  async function tap(x, y) { await touch('touchStart', x, y); await touch('touchEnd'); }
  async function snapshot(name) {
    trace.push({ name, ...await page.evaluate(() => { const q = __byteProbe; return { room: q.home.room, phase: q.life.phase, nest: q.life.nest.active, home: q.home.slept,
      body: { x: q.byte.x, y: q.byte.y, mode: q.byte.mode }, things: q.home.things.map(v => ({ id: v.id, room: v.room, x: v.x, y: v.y })) }; }) });
    await page.screenshot({ path: path.join(out, 'playthrough-' + name + '.png'), scale: 'css' });
  }
  // No phase, force, autonomy or simulation calls: the normal animation loop owns this whole visit.
  await snapshot('arrival');
  await tap(73, 620);
  await page.waitForFunction(() => __byteProbe.home.room === 0 && !__byteProbe.home.travel);
  let p = await page.evaluate(() => ({ x: __byteProbe.byte.x, y: __byteProbe.byte.y }));
  await touch('touchStart', p.x, p.y - 25); await touch('touchMove', 133, p.y - 25);
  await page.waitForTimeout(200); await touch('touchEnd');
  await page.waitForFunction(() => __byteProbe.life.phase === 'sleep', { timeout: 14000 });
  await snapshot('sleep');
  p = await page.evaluate(() => ({ x: __byteProbe.byte.x, y: __byteProbe.byte.y }));
  await tap(p.x, p.y - 20);
  await page.waitForFunction(() => __byteProbe.life.phase === 'awake' && !__byteProbe.life.nest.active);
  await tap(322, 620); await page.waitForFunction(() => __byteProbe.home.room === 1 && !__byteProbe.home.travel);
  await snapshot('back-to-window');
  await tap(322, 620); await page.waitForFunction(() => __byteProbe.home.room === 2 && !__byteProbe.home.travel);
  await page.waitForTimeout(600); await snapshot('play-space');
  await tap(250, 400); await page.waitForFunction(() => __byteProbe.home.room === 3 && !__byteProbe.home.travel);
  await page.waitForFunction(() => __byteProbe.obby.phase === 'waiting'); await snapshot('upstairs-loft');
  assert(!await page.evaluate(() => __byteProbe.obby.hasLaunched));
  assert.equal(await page.evaluate(() => __byteProbe.life.scale), 1);
  await tap(250, 810); await page.waitForFunction(() => __byteProbe.home.room === 2 && !__byteProbe.home.travel);
  await snapshot('ladder-back-down');
  p = await page.evaluate(() => { const v = __byteProbe.home.things[0]; return { x: v.x, y: v.y }; });
  await touch('touchStart', p.x, p.y); await touch('touchMove', 65, 620); await page.waitForTimeout(200); await touch('touchEnd');
  await page.waitForFunction(() => __byteProbe.home.room === 1 && !__byteProbe.home.travel);
  await page.waitForTimeout(1200); await snapshot('toy-brought-back');
  const final = trace.at(-1);
  assert.equal(final.things[0].room, 1); assert(trace[1].nest && trace[1].phase === 'sleep'); assert(final.home); assert(!errors.length);
  await page.reload(); await page.waitForSelector('#arrival.ready'); await snapshot('remembered');
  assert.equal(trace.at(-1).things[0].room, 1); assert(trace.at(-1).home);
  fs.writeFileSync(path.join(out, 'place-playthrough-results.json'), JSON.stringify({ trace, errors }, null, 2));
  await context.close(); await browser.close(); console.log('PASS uninterrupted real-touch house visit: nook rest/wake, hall, play space, ladder up to a separate loft and back down, physical toy return, remembered home.');
})().catch(e => { console.error(e); process.exit(1); });
