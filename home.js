/* Sunburn III: three downstairs spaces, one loft, and physical belongings. */
window.createByteHome = function createByteHome(api) {
  const { ctx, world, byte, life, earth, web, obby, autonomy } = api;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const key = 'byte-sunburn-home-v1';
  let remembered;
  try { remembered = JSON.parse(localStorage.getItem(key)); } catch (_) {}
  const home = {
    room: Number.isInteger(remembered?.room) ? clamp(remembered.room, 0, 3) : 1,
    cameraX: 0, cameraY: 0, travel: null, journey: null, activity: null, hand: null, carried: null,
    slept: !!remembered?.slept, found: !!remembered?.found, stoneHome: !!remembered?.stoneHome,
    time: 0, savedAt: 0, playCooldown: 0, restBeat: 0, visits: [false, true, false, false], things: [],
  };
  const initial = [{ id: 'ball', room: 2, nx: .62, ny: .91, r: 20 }];
  if (home.found) initial.push({ id: 'stone', room: 0, nx: .46, ny: .91, r: 15 });
  for (const seed of initial) {
    const saved = remembered?.things?.find(v => v.id === seed.id);
    const safe = saved && Number.isInteger(saved.room) && saved.room >= 0 && saved.room <= 3 && Number.isFinite(saved.nx) && Number.isFinite(saved.ny);
    home.things.push({ ...seed, ...(safe ? { room: saved.room, nx: clamp(saved.nx, .03, .97), ny: clamp(saved.ny, .03, .97) } : {}), x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0, touch: 0 });
  }
  function save() {
    if (!world.w || home.travel) return;
    const data = { room: home.room, slept: home.slept, found: home.found, stoneHome: home.stoneHome,
      things: home.things.map(v => ({ id: v.id, room: v.room, nx: clamp(v.x / world.w, 0, 1), ny: clamp(v.y / world.h, 0, 1) })) };
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
    home.savedAt = home.time;
  }
  function resize(oldW, oldH) {
    if (home.hand) endHand(home.hand.id, true);
    const interrupted = !!home.travel;
    if (interrupted) { home.travel = null; home.journey = null; byte.mode = 'air'; }
    for (const v of home.things) {
      v.x = oldW ? v.x * world.w / oldW : v.nx * world.w;
      v.y = oldH ? v.y * world.h / oldH : Math.min(world.h - v.r - 10, v.ny * world.h);
      v.x = clamp(v.x, v.r, world.w - v.r); v.y = clamp(v.y, v.r, world.h - v.r - 10);
    }
    if (interrupted && home.carried) drop();
    const p = space(home.room); home.cameraX = p.x; home.cameraY = p.y; syncUI();
  }
  function space(room) { return { x: Math.min(room, 2) * world.w, y: room === 3 ? -world.h : 0 }; }
  function nextRoom(target) {
    if (home.room === 3) return 2;
    if (target === 3) return home.room === 2 ? 3 : home.room + 1;
    return home.room + Math.sign(target - home.room);
  }
  const stairsX = () => world.w * .64;
  function offset(room = home.room) { return space(room).x - home.cameraX; }
  function offsetY(room = home.room) { return space(room).y - home.cameraY; }
  function syncUI() {
    const hall = offset(1), hallY = offsetY(1), away = obby.hasLaunched;
    document.querySelector('#gravity-toggle').style.transform = `translate(${hall}px,${hallY}px)`;
    document.querySelector('#gravity-status').style.transform = `translate(${hall}px,${hallY}px)`;
    const port = document.querySelector('#room-port');
    port.style.left = away ? '' : `${world.w * .5 + hall}px`;
    port.style.translate = `0 ${hallY}px`;
    port.style.pointerEvents = home.travel ? 'none' : '';
  }
  function portal(x, y) {
    if (obby.hasLaunched || home.travel || x < 0 || x > world.w || y > world.h) return null;
    if (home.room === 2 && Math.abs(x - stairsX()) < 40 && y > 45 && y < world.h - 12) return 3;
    if (home.room === 3) return Math.abs(x - stairsX()) < 67 && y > world.h - 72 ? 2 : null;
    const top = Math.max(world.h * .39, world.h - 10 - api.bodyH() * 2.2);
    const left = x < 90 && home.room > 0, right = x > world.w - 90 && home.room < 2;
    if (!left && !right) return null;
    const distance = x - (left ? 16 : world.w - 16);
    const archTop = top + 80 - Math.sqrt(Math.max(0, 80 * 80 - distance * distance));
    if (y < archTop + 6) return null;
    if (left) return home.room - 1;
    if (right) return home.room + 1;
    return null;
  }
  function cancel() {
    if (home.travel) return;
    const owned = home.journey || home.activity;
    home.journey = null; home.activity = null;
    if (owned) { byte.targetX = byte.targetY = null; if (byte.mode === 'scuttle') byte.mode = earth.enabled && !earth.support.active ? 'air' : 'idle'; autonomy.choice = null; autonomy.idleTime = 0; }
    if (home.carried) drop();
    if (autonomy.choice === 'play' || autonomy.choice === 'wander') autonomy.choice = null;
  }
  function openingTarget(target) {
    const next = nextRoom(target), e = api.extents();
    if ((home.room === 2 && next === 3) || home.room === 3) {
      if (earth.enabled && (!earth.support.active || earth.support.edge !== 'bottom')) return null;
      return { x: stairsX(), y: earth.enabled ? world.h - e.y : api.floorY() };
    }
    const dir = Math.sign(next - home.room);
    const x = dir < 0 ? e.x + 12 : world.w - e.x - 12;
    if (!earth.enabled) return { x, y: api.floorY() };
    if (!earth.support.active) return null;
    if (earth.support.edge === 'bottom') return { x, y: world.h - e.y };
    if (earth.support.edge !== (dir < 0 ? 'left' : 'right')) return null;
    const top = Math.max(world.h * .39, world.h - 10 - api.bodyH() * 2.2);
    return { x: byte.x, y: clamp((top + world.h - 10) * .5, e.y, world.h - e.y) };
  }
  function request(target, reason = 'visit', item = null) {
    if (home.travel || obby.hasLaunched || web.active || byte.grabbed || home.hand || api.pranking()) return false;
    if (target === home.room) { arrive(reason); return true; }
    if (earth.enabled && !openingTarget(target)) { autonomy.choice = null; autonomy.idleTime = 0; return false; }
    api.wakeByte(); home.journey = { target, reason, item };
    if (item) { home.carried = item; item.vx = item.vy = 0; }
    byte.targetX = byte.targetY = null; life.pendingFollow = false;
    if (byte.mode === 'scuttle') byte.mode = earth.enabled && !earth.support.active ? 'air' : 'idle';
    autonomy.choice = reason === 'button' ? 'button' : reason === 'rest' ? 'rest' : reason === 'obby' ? 'obby' : null;
    return true;
  }
  function startTravel(target) {
    const next = nextRoom(target), from = space(home.room), to = space(next);
    const vertical = from.y !== to.y, dir = vertical ? 1 : Math.sign(next - home.room);
    if (target === home.room || home.travel || web.active || obby.hasLaunched) return;
    const e = api.extents();
    const destination = vertical ? stairsX() : dir > 0 ? e.x + 14 : world.w - e.x - 14;
    home.travel = { from: home.room, to: next, elapsed: 0, duration: vertical ? 1.45 : .88, vertical,
      fromX: from.x + byte.x, toX: to.x + destination, fromY: from.y + byte.y, toY: to.y + (vertical ? api.floorY() : byte.y), dir };
    byte.targetX = byte.targetY = null; byte.facing = dir; byte.mode = 'scuttle';
    life.pointer.active = false; life.pendingFollow = false;
    api.voice('notice', .35);
  }
  function arrive(reason) {
    home.activity = null; home.journey = null;
    autonomy.idleTime = 0;
    if (reason === 'rest') api.restHere();
    else if (reason === 'obby') api.obbyHere();
    else if (reason === 'button') { autonomy.choice = 'button'; autonomy.idleTime = 0; }
    else if (reason === 'play') { home.activity = { kind: 'play', phase: 'approach', elapsed: 0, kicks: 0 }; }
    else if (reason === 'treasure') { home.stoneHome = true; drop(); life.curious = 2; api.voice('pet', .6); }
    else { drop(); life.curious = 2; }
    save();
  }
  function drop() {
    if (!home.carried) return;
    const v = home.carried;
    v.room = home.room; v.x = clamp(byte.x + byte.facing * api.bodyW() * .34, v.r + 8, world.w - v.r - 8);
    v.y = clamp(byte.y - api.bodyH() * .12, v.r, world.h - v.r - 10);
    v.vx = byte.vx + byte.facing * 35; v.vy = byte.vy;
    v.spin = byte.spin; home.carried = null;
  }
  function afterByteRelease(x, y) {
    const next = portal(x, y);
    const e = api.extents(), vertical = next !== null && (next === 3 || home.room === 3);
    const nearOpening = vertical ? Math.abs(byte.x - stairsX()) : next < home.room ? byte.x - e.x : world.w - byte.x - e.x;
    if (next === null || web.active || api.pranking() || nearOpening > 96) return;
    home.journey = { target: next, reason: 'visit', item: null }; startTravel(next);
  }
  function beginHand(x, y, id) {
    const hit = [...home.things].reverse().find(v => v.room === home.room && Math.hypot(x - v.x, y + (obby.hasLaunched ? obby.cameraY : 0) - v.y) < Math.max(28, v.r + 9));
    if (!hit) return false;
    cancel(); if (home.carried === hit) drop();
    home.hand = { item: hit, id, dx: x - hit.x, dy: y + (obby.hasLaunched ? obby.cameraY : 0) - hit.y,
      lastX: x, lastY: y, time: performance.now(), vx: 0, vy: 0, moved: performance.now() };
    hit.vx = hit.vy = 0; hit.touch = 1; life.pointer.kind = 'object';
    return true;
  }
  function moveHand(x, y, id) {
    const hand = home.hand; if (!hand || hand.id !== id) return false;
    const t = performance.now(), dt = Math.max(.016, (t - hand.time) / 1000), v = hand.item;
    hand.vx = clamp((x - hand.lastX) / dt * .85, -1200, 1200); hand.vy = clamp((y - hand.lastY) / dt * .85, -1400, 1400);
    if (Math.hypot(x - hand.lastX, y - hand.lastY) > 1) hand.moved = t;
    hand.lastX = x; hand.lastY = y; hand.time = t;
    v.x = clamp(x - hand.dx, v.r, world.w - v.r);
    v.y = y + (obby.hasLaunched ? obby.cameraY : 0) - hand.dy;
    if (!obby.hasLaunched) v.y = clamp(v.y, v.r, world.h - v.r - 10);
    return true;
  }
  function endHand(id, cancelled = false) {
    const hand = home.hand; if (!hand || hand.id !== id) return false;
    const v = hand.item, fresh = performance.now() - hand.moved < 120;
    v.vx = !cancelled && fresh ? hand.vx : 0; v.vy = !cancelled && fresh ? hand.vy : 0; v.spin = v.vx * .012;
    home.hand = null; life.pointer.active = false;
    const next = cancelled ? null : portal(hand.lastX, hand.lastY);
    if (next !== null) request(next, 'visit', v);
    save(); return true;
  }
  function findStone() {
    if (home.found || !obby.hasLaunched || byte.y > -world.h * 1.25) return;
    home.found = true;
    home.things.push({ id: 'stone', room: 3, x: clamp(byte.x + 45, 25, world.w - 25), y: byte.y - 80,
      vx: 40, vy: -150, angle: .2, spin: .6, r: 15, touch: 1, fromAbove: true });
    life.curious = 2; api.voice('notice', .8); save();
  }
  function updateThings(dt) {
    const gx = earth.enabled && !obby.hasLaunched ? earth.x : 0, gy = earth.enabled && !obby.hasLaunched ? earth.y : 1650;
    for (const v of home.things) {
      v.touch = Math.max(0, v.touch - dt);
      if (home.carried === v || home.hand?.item === v) continue;
      const sensed = api.senses.state, fresh = sensed.open && sensed.motion && performance.now() - sensed.lastMotion < 180;
      const rx = v.x - world.w * .5, ry = v.y - world.h * .5, wind = sensed.open && sensed.mic ? sensed.breath * (v.id === 'ball' ? 2800 : 2100) : 0;
      v.vx += (gx + (fresh ? sensed.inertiaX - sensed.turnA * ry * .15 : 0) + wind * sensed.breathX) * dt;
      v.vy += (gy + (fresh ? sensed.inertiaY + sensed.turnA * rx * .15 : 0) + wind * sensed.breathY) * dt;
      if (fresh) v.spin = clamp(v.spin + sensed.turnA * .22 * dt, -10, 10);
      v.x += v.vx * dt; v.y += v.vy * dt; v.angle += v.spin * dt;
      const bottom = world.h - v.r - 10;
      if (v.x < v.r) { v.x = v.r; v.vx = Math.abs(v.vx) * .55; }
      if (v.x > world.w - v.r) { v.x = world.w - v.r; v.vx = -Math.abs(v.vx) * .55; }
      if ((!obby.hasLaunched || v.room !== home.room) && !v.fromAbove && v.y < v.r) { v.y = v.r; v.vy = Math.abs(v.vy) * .45; }
      if (v.y > bottom) {
        v.fromAbove = false; v.y = bottom; v.vy = Math.abs(v.vy) > 60 ? -Math.abs(v.vy) * (v.id === 'ball' ? .54 : .28) : 0;
        v.vx *= Math.exp(-dt * 2.1); v.spin = v.vx / v.r;
      }
      if (!earth.enabled && v.room === 2 && v.y > world.h - 45 && Math.abs(v.vy) < 160) {
        const lo = world.w * .43 + v.r, hi = world.w * .82 - v.r;
        if (v.x > lo - v.r && v.x < lo && v.vx < 0) { v.x = lo; v.vx = Math.abs(v.vx) * .45; }
        if (v.x < hi + v.r && v.x > hi && v.vx > 0) { v.x = hi; v.vx = -Math.abs(v.vx) * .45; }
      }
      if (earth.enabled && (v.x <= v.r + 1 || v.x >= world.w - v.r - 1 || v.y <= v.r + 1)) {
        v.vx *= Math.exp(-dt * 2); v.vy *= Math.exp(-dt * 2);
      }
      if (v.room === home.room && !home.travel && !byte.grabbed && life.phase === 'awake' && Math.abs(v.y - byte.y) < api.bodyH() * .45) {
        const reach = api.bodyW() * .31 + v.r, dx = v.x - byte.x;
        if (Math.abs(dx) < reach && Math.abs(dx) > .01) {
          const side = Math.sign(dx), speed = Math.max(0, -v.vx * side);
          v.x = clamp(byte.x + side * reach, v.r, world.w - v.r);
          v.vx = side * Math.max(65, speed * .45, byte.mode === 'scuttle' ? 140 : 0);
          if (speed > 160 && byte.mode !== 'scheming') { byte.vx -= side * speed * .18; byte.mode = 'air'; byte.squash = Math.max(byte.squash, .12); }
        }
      }
    }
    if (home.carried) { const v = home.carried; v.room = home.room; v.x = byte.x + byte.facing * api.bodyW() * .34; v.y = byte.y - api.bodyH() * .13; }
  }
  function update(dt) {
    home.time += dt; home.playCooldown = Math.max(0, home.playCooldown - dt); syncUI();
    // The loft can be visited independently; its spring platform is always available there.
    if (home.room === 3 && !home.travel && !obby.active) api.obbyHere();
    if (life.phase === 'sleep' && home.room === 0 && !home.slept) { home.slept = true; save(); }
    findStone(); updateThings(dt);
    if (home.travel) {
      const tr = home.travel; tr.elapsed += dt;
      const p = clamp(tr.elapsed / tr.duration, 0, 1), ease = p * p * (3 - 2 * p);
      const from = space(tr.from), to = space(tr.to);
      home.cameraX = from.x + (to.x - from.x) * ease;
      home.cameraY = from.y + (to.y - from.y) * ease;
      byte.x = tr.fromX + (tr.toX - tr.fromX) * ease - from.x;
      byte.y = tr.fromY + (tr.toY - tr.fromY) * ease - from.y; byte.mode = 'scuttle'; byte.facing = tr.dir;
      byte.frameClock += dt; if (byte.frameClock > .095) { byte.frameClock = 0; byte.frame = (byte.frame + 1) % 4; }
      if (p >= 1) {
        home.room = tr.to; home.cameraX = to.x; home.cameraY = to.y; byte.x = tr.toX - to.x; byte.y = tr.toY - to.y;
        home.travel = null; home.visits[home.room] = true; byte.mode = earth.enabled || Math.hypot(byte.vx, byte.vy) > 80 ? 'air' : 'idle';
        life.curious = 1.5;
        if (home.journey?.target === home.room) arrive(home.journey.reason);
      }
      if (home.carried) { const v = home.carried; v.room = home.room; v.x = byte.x + byte.facing * api.bodyW() * .34; v.y = byte.y - api.bodyH() * .13; }
      syncUI(); return;
    }
    if (home.journey && !byte.grabbed && !home.hand && !web.active && !obby.hasLaunched) {
      const target = openingTarget(home.journey.target);
      // A trip is an intention, not permission to walk across air or through a ceiling.
      if (!target) { cancel(); return; }
      if (Math.abs(byte.x - target.x) < 20 && Math.abs(byte.y - target.y) < api.bodyH() * .3) startTravel(home.journey.target);
      else if (byte.mode === 'idle' || earth.enabled && earth.support.active) { byte.targetX = target.x; byte.targetY = target.y; byte.mode = 'scuttle'; }
      return;
    }
    const free = !byte.grabbed && !home.hand && !life.pointer.active && !web.active && !obby.hasLaunched && life.phase === 'awake' && byte.mode === 'idle';
    const onMat = free && !home.activity && !autonomy.choice && !earth.enabled && home.room === 0 &&
      Math.abs(byte.x - world.w * .34) < api.bodyW() * .3 && Math.abs(byte.y - api.floorY()) < 12 && Math.hypot(byte.vx, byte.vy) < 45;
    home.restBeat = onMat ? home.restBeat + dt : 0;
    if (home.restBeat > 3.2) { home.restBeat = 0; api.restHere(); }
    if (free && !home.activity && autonomy.choice === 'button' && home.room !== 1) request(1, 'button');
    if (free && !home.activity && autonomy.choice === 'play') {
      const ball = home.things.find(v => v.id === 'ball');
      if (ball.room !== home.room) request(ball.room, 'play'); else arrive('play');
    }
    if (free && !home.activity && autonomy.choice === 'wander') request(home.room === 1 ? 2 : 1, 'visit');
    const stone = home.things.find(v => v.id === 'stone');
    if (free && stone && !home.stoneHome && home.room === stone.room && home.time > 4 && !home.activity && !earth.enabled) {
      home.activity = { kind: 'collect', elapsed: 0 };
    }
    if (home.activity && !home.hand && !byte.grabbed && !web.active && !obby.hasLaunched && life.phase === 'awake') {
      const act = home.activity; act.elapsed += dt;
      const item = home.things.find(v => v.id === (act.kind === 'collect' ? 'stone' : 'ball'));
      if (!item || item.room !== home.room || act.elapsed > 12 || earth.enabled) { home.activity = null; autonomy.choice = null; home.playCooldown = 18; }
      else if (byte.mode === 'idle' && Math.abs(byte.x - item.x) > api.bodyW() * .44) {
        byte.targetX = clamp(item.x - Math.sign(item.x - byte.x) * api.bodyW() * .36, api.extents().x + 8, world.w - api.extents().x - 8);
        byte.targetY = api.floorY(); byte.mode = 'scuttle'; life.curious = .7;
      } else if ((byte.mode === 'idle' || byte.mode === 'scuttle') && Math.abs(byte.x - item.x) < api.bodyW() * .47 && Math.abs(item.y - byte.y) < api.bodyH() * .5) {
        if (act.kind === 'collect') { home.carried = item; request(0, 'treasure', item); home.activity = null; }
        else if (act.elapsed > .8) {
          const dir = item.x > world.w * .7 ? -1 : item.x < world.w * .3 ? 1 : byte.facing;
          item.vx = dir * 290; item.vy = -360; item.spin = dir * 7; life.curious = 2; api.voice('pet', .45);
          act.kicks++; act.elapsed = 0;
          if (act.kicks >= 2) { home.activity = null; autonomy.choice = null; home.playCooldown = 20; }
        }
      }
    }
    if (home.time - home.savedAt > 2 && !home.hand && !home.carried) save();
  }
  function itemShape(v) {
    ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.angle);
    ctx.shadowColor = '#2e302933'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
    if (v.id === 'ball') {
      const g = ctx.createRadialGradient(-7, -8, 1, 0, 0, v.r); g.addColorStop(0, '#eac889'); g.addColorStop(1, '#a7793b');
      ctx.fillStyle = g; ctx.strokeStyle = '#876337'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, v.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#f4dfb0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, v.r * .48, v.r - 2, .5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#8b663e77'; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(Math.sin(i * 2.4) * 12, Math.cos(i * 3.7) * 11, 1.2, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.fillStyle = '#7bbab9'; ctx.strokeStyle = '#487c83'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-9, -12); ctx.lineTo(7, -14); ctx.lineTo(16, -2); ctx.lineTo(9, 12); ctx.lineTo(-7, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = '#d1efde'; ctx.beginPath(); ctx.moveTo(-9, -10); ctx.lineTo(5, -12); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#dfefdfbb'; ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(9, 10); ctx.moveTo(-3, 4); ctx.lineTo(14, -2); ctx.stroke();
    }
    ctx.restore();
  }
  function drawThings() {
    for (const v of home.things) {
      const screenX = offset(v.room);
      if (screenX > world.w || screenX < -world.w) continue;
      ctx.save(); ctx.translate(screenX, offsetY(v.room) - (obby.hasLaunched ? obby.cameraY : 0)); itemShape(v); ctx.restore();
    }
  }
  function arch(x, y, w, h, fill, stroke) {
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + w * .5); ctx.arc(x + w * .5, y + w * .5, w * .5, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function drawSpace(index, t) {
    const w = world.w, h = world.h, floor = h - 10;
    const bH = api.roomH(), bW = api.roomW();
    const palette = [['#506671', '#8a9b94', '#a8b09c'], ['#efe0ba', '#f5ecdb', '#dce4cf'], ['#b0c0a8', '#e0dbc0', '#c1bb9b'], ['#cfb58b', '#e6d6b7', '#cdbd98']][index];
    const dark = api.senses.state.open && api.senses.state.camera ? clamp((.2 - api.senses.state.brightness) / .2, 0, 1) : 0;
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    palette.forEach((p, i) => gradient.addColorStop(i * .5, p)); ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = index === 0 ? '#1c2e422c' : '#927c4920';
    for (let x = 15; x < w; x += 52) ctx.fillRect(x, 0, 1, floor);
    ctx.fillStyle = '#674f351f'; ctx.fillRect(0, 14, w, 14); ctx.fillRect(0, h * .24, w, 5);
    ctx.strokeStyle = '#fbefd04a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, h * .24 + 5); ctx.lineTo(w, h * .24 + 5); ctx.stroke();
    ctx.fillStyle = '#958364'; ctx.fillRect(0, floor - 17, w, 27);
    ctx.strokeStyle = '#685d442e'; for (let x = 12; x < w; x += 58) { ctx.beginPath(); ctx.moveTo(x, floor - 16); ctx.lineTo(x - 13, h); ctx.stroke(); }
    ctx.strokeStyle = '#eee0b37a'; ctx.beginPath(); ctx.moveTo(0, floor - 17); ctx.lineTo(w, floor - 17); ctx.stroke();
    const top = Math.max(h * .39, floor - bH * 2.2), dh = floor - top;
    if (index > 0 && index < 3) {
      arch(-64, top, 160, dh, index === 1 ? '#5d7580' : '#e6dcc3', '#947e57');
      ctx.fillStyle = index === 1 ? '#c3b0a2' : '#bdae80'; ctx.fillRect(0, floor - 14, 93, 14);
      if (index === 1) { ctx.strokeStyle = '#dad9c77a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-18, top + 114); ctx.quadraticCurveTo(27, top + 174, 62, top + 115); ctx.stroke(); ctx.fillStyle = '#c7b9a277'; ctx.beginPath(); ctx.ellipse(18, floor - 21, 47, 10, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.strokeStyle = '#c4a65f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(16, top + 62, 17, 0, Math.PI * 2); ctx.stroke(); }
    }
    if (index < 2) {
      arch(w - 96, top, 160, dh, index === 0 ? '#e6dcc3' : '#9aaf9a', '#947e57');
      ctx.fillStyle = '#bdae80'; ctx.fillRect(w - 93, floor - 14, 93, 14);
      if (index === 1) { ctx.strokeStyle = '#e1dcb98a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w - 31, top + 45); ctx.lineTo(w - 31, top + 175); for (let yy = top + 60; yy < top + 175; yy += 25) { ctx.moveTo(w - 40, yy); ctx.lineTo(w - 21, yy); } ctx.stroke(); }
    }
    if (index === 0) {
      const cx = w * .34, cy = api.floorY() - bH * .34;
      arch(cx - w * .25, cy - bH * 1.05, w * .5, bH * 1.4, '#263f5099', '#758a85');
      ctx.strokeStyle = '#dad9c9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 39, cy - 80); ctx.quadraticCurveTo(cx, cy - 26, cx + 42, cy - 80); ctx.stroke();
      ctx.fillStyle = '#c7b9a2'; ctx.beginPath(); ctx.ellipse(cx, floor - 21, w * .21, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ebdac3'; ctx.lineWidth = 2; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 12, floor - 30); ctx.lineTo(cx + i * 12 + 5, floor - 13); ctx.stroke(); }
      ctx.fillStyle = '#d9c27a'; ctx.beginPath(); ctx.arc(cx + bW * .205, Math.max(bH * .7, api.floorY() - bH * 1.25), 5, 0, Math.PI * 2); ctx.fill();
      if (home.slept) { ctx.strokeStyle = '#d8ddd295'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx + 29, cy - 118); ctx.bezierCurveTo(cx + 13, cy - 73, cx + 55, cy - 87, cx + 39, cy - 53); ctx.stroke(); }
      ctx.fillStyle = '#e8d6a340'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(48 + (i * 63) % Math.max(90, w - 150), 80 + (i * 83) % (h * .37), 1.4, 0, Math.PI * 2); ctx.fill(); }
    } else if (index === 1) {
      ctx.strokeStyle = '#b7a27388'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w * .5, 63, 57, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#c3af7b44'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(w * .5, 63, 61, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#a78c5544'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w - 54, 90); ctx.quadraticCurveTo(w - 45, h * .22, w - 70, h * .23); ctx.stroke();
      ctx.fillStyle = '#9eab8938'; ctx.beginPath(); ctx.ellipse(w * .51, floor - 22, w * .23, 9, 0, 0, Math.PI * 2); ctx.fill();
    } else if (index === 2) {
      const hatch = stairsX();
      ctx.fillStyle = '#a18b68'; ctx.fillRect(0, 0, w, 25);
      ctx.fillStyle = '#4e6254'; ctx.fillRect(hatch - 82, 0, 164, 43);
      ctx.strokeStyle = '#8b7853'; ctx.lineWidth = 7; ctx.strokeRect(hatch - 84, -8, 168, 51);
      ctx.strokeStyle = '#897348'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(hatch - 29, 39); ctx.lineTo(hatch - 29, floor - 24); ctx.moveTo(hatch + 29, 39); ctx.lineTo(hatch + 29, floor - 24); ctx.stroke();
      ctx.strokeStyle = '#e0cc96'; ctx.lineWidth = 6; ctx.beginPath(); for (let yy = 64; yy < floor - 25; yy += 38) { ctx.moveTo(hatch - 29, yy); ctx.lineTo(hatch + 29, yy); } ctx.stroke();
      ctx.fillStyle = '#988862'; ctx.fillRect(w * .43, floor - 35, w * .39, 27); ctx.fillStyle = '#6d705355'; ctx.fillRect(w * .45, floor - 30, w * .35, 22);
      ctx.strokeStyle = '#c4b383'; ctx.lineWidth = 3; ctx.strokeRect(w * .43, floor - 35, w * .39, 27);
      ctx.fillStyle = '#5d796555'; ctx.beginPath(); ctx.ellipse(w * .63, floor - 51, 37, 4, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      // A whole loft sits below the roof opening; the bounce route begins inside it.
      ctx.fillStyle = '#9abfc5'; ctx.fillRect(12, 0, w * .56, 48);
      ctx.strokeStyle = '#92774e'; ctx.lineWidth = 9; ctx.strokeRect(10, -8, w * .56 + 4, 60);
      ctx.strokeStyle = '#a88d5c'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(0, 72); ctx.lineTo(w * .73, h * .13); ctx.lineTo(w, 50); ctx.stroke();
      const wx = w * .65, wy = h * .29;
      ctx.save(); ctx.fillStyle = '#9abfc5'; ctx.beginPath(); ctx.roundRect(wx - 42, wy - 52, 84, 104, 42); ctx.fill(); ctx.clip();
      ctx.fillStyle = '#a1b6a0'; ctx.beginPath(); ctx.moveTo(wx - 38, wy + 37); ctx.lineTo(wx - 12, wy - 7); ctx.lineTo(wx + 9, wy + 14); ctx.lineTo(wx + 36, wy - 20); ctx.lineTo(wx + 36, wy + 48); ctx.lineTo(wx - 38, wy + 48); ctx.closePath(); ctx.fill();
      ctx.restore(); ctx.strokeStyle = '#aa8953'; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(wx - 42, wy - 52, 84, 104, 42); ctx.stroke();
      ctx.strokeStyle = '#c3a471'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx, wy - 49); ctx.lineTo(wx, wy + 48); ctx.moveTo(wx - 38, wy); ctx.lineTo(wx + 38, wy); ctx.stroke();
      ctx.fillStyle = '#9e8b68'; ctx.fillRect(w * .13, h * .4, w * .32, 9);
      ctx.fillStyle = '#d4c29a'; ctx.beginPath(); ctx.ellipse(w * .28, h * .4 - 4, 24, 6, 0, 0, Math.PI * 2); ctx.fill();
      const hatch = stairsX();
      ctx.fillStyle = '#4e6254'; ctx.fillRect(hatch - 65, floor - 31, 130, 41);
      ctx.strokeStyle = '#b99c68'; ctx.lineWidth = 5; ctx.strokeRect(hatch - 67, floor - 33, 134, 43);
      ctx.strokeStyle = '#e0cc96'; ctx.lineWidth = 4; ctx.beginPath(); for (let yy = floor - 27; yy < floor + 10; yy += 13) { ctx.moveTo(hatch - 28, yy); ctx.lineTo(hatch + 28, yy); } ctx.stroke();
    }
    if (dark > 0) { ctx.fillStyle = `rgba(16,30,38,${dark * .57})`; ctx.fillRect(0, 0, w, h); }
    if (home.journey && index === home.room) {
      const next = nextRoom(home.journey.target), vertical = index === 3 || next === 3;
      ctx.fillStyle = `rgba(255,239,184,${.06 + Math.sin(t * .005) * .025})`;
      if (vertical) ctx.fillRect(stairsX() - 34, index === 3 ? floor - 36 : 43, 68, index === 3 ? 46 : floor - 67);
      else ctx.fillRect(next < index ? 0 : w - 94, top, 94, dh);
    }
  }
  function draw(t) {
    for (let index = 0; index < 4; index++) {
      const ox = offset(index), oy = offsetY(index); if (ox < -world.w || ox > world.w) continue;
      ctx.save(); ctx.translate(ox, oy); ctx.beginPath(); ctx.rect(0, 0, world.w, world.h); ctx.clip(); drawSpace(index, t); ctx.restore();
    }
    ctx.save(); ctx.translate(offset(), offsetY()); ctx.fillStyle = '#364d3a24';
    if (!earth.enabled && Math.abs(byte.y - api.floorY()) < api.bodyH() * .7) { ctx.beginPath(); ctx.ellipse(byte.x, world.h - 26, api.bodyW() * .43, 6, 0, 0, Math.PI * 2); ctx.fill(); }
    if (earth.enabled && !obby.hasLaunched) {
      const down = api.down(), distances = [];
      if (down.x > .001) distances.push((world.w - byte.x) / down.x);
      if (down.x < -.001) distances.push(-byte.x / down.x);
      if (down.y > .001) distances.push((world.h - byte.y) / down.y);
      if (down.y < -.001) distances.push(-byte.y / down.y);
      const d = Math.min(...distances);
      ctx.save(); ctx.translate(byte.x + down.x * d, byte.y + down.y * d); ctx.rotate(Math.atan2(-down.x, down.y));
      ctx.globalAlpha = clamp(.13 - Math.max(0, d - api.bodyH() * .5) / 1300, .025, .13);
      ctx.fillStyle = '#425143'; ctx.beginPath(); ctx.ellipse(0, 0, api.bodyW() * .36, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (home.hand) endHand(home.hand.id, true); save(); } });
  window.addEventListener('pagehide', save);
  return Object.assign(home, { resize, space, offset, offsetY, stairsX, syncUI, portal, request, cancel, update, draw, drawThings, beginHand, moveHand, endHand, afterByteRelease, save, drop,
    rest() { if (home.room === 0) api.restHere(); else request(0, 'rest'); },
    obby() { if (home.room === 3) api.obbyHere(); else request(3, 'obby'); },
  });
};
