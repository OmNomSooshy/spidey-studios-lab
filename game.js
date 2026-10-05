(() => {
  const canvas = document.querySelector('#scene');
  const ctx = canvas.getContext('2d', { alpha: false });
  const assets = { idle: [], walk: [] };
  const gravityButton = document.querySelector('#gravity-toggle');
  const gravityLabel = document.querySelector('#gravity-label');
  const gravityStatus = document.querySelector('#gravity-status');
  const earth = {
    enabled: false, x: 0, y: 0, restX: 0, restY: 0,
    initialized: false, lastSample: 0, noSampleTimer: 0,
  };
  const web = { active: false, pointerId: null, anchorX: 0, anchorY: 0, length: 0 };
  function loadFrames(prefix, count) {
    return Promise.all(Array.from({ length: count }, (_, i) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `assets/${prefix}-${i}.png`;
    })));
  }

  const world = { w: 0, h: 0, dpr: 1 };
  let spriteW = 180, spriteH = 222;
  const byte = {
    x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0,
    squash: 0, stretch: 0, mode: 'idle', facing: 1,
    frame: 0, frameClock: 0, blinkAt: 0, blinking: false,
    targetX: null, targetY: null, grabbed: false,
    grabDX: 0, grabDY: 0, lastSamples: [],
    settle: 0, idlePhase: Math.random() * Math.PI * 2,
  };
  let lastTime = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    world.w = rect.width; world.h = rect.height;
    world.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(world.w * world.dpr);
    canvas.height = Math.round(world.h * world.dpr);
    ctx.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);
    // A deliberate, generous mobile scale. The sprite always keeps its artwork ratio.
    spriteH = Math.max(200, Math.min(292, world.w * 0.62));
    spriteW = spriteH * .81;
    byte.x = clamp(byte.x || world.w * 0.5, spriteW * .43, world.w - spriteW * .43);
    byte.y = byte.y || world.h * .68;
    byte.y = clamp(byte.y, spriteH * .43, world.h - spriteH * .42);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 100));

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ground = () => world.h - spriteH * .48 - 10;
  const floorY = () => ground();
  const halfW = () => spriteW * .5;
  const halfH = () => spriteH * .5;
  const now = () => performance.now();

  function spoolPosition(t = now()) {
    const moving = byte.mode === 'scuttle';
    const list = moving ? assets.walk : assets.idle;
    const frame = list[byte.frame] || list[0];
    const frameW = frame ? spriteH * frame.width / frame.height : spriteW;
    const bob = moving ? Math.sin(t * .018) * 3 : (byte.mode === 'idle' ? Math.sin(byte.idlePhase) * 2 : 0);
    const squeezeX = 1 + byte.squash * .42 - byte.stretch * .28;
    const squeezeY = 1 - byte.squash * .45 + byte.stretch * .35;
    const localX = frameW * .205 * byte.facing * squeezeX;
    const localY = spriteH * .205 * squeezeY;
    const c = Math.cos(byte.angle), s = Math.sin(byte.angle);
    return { x: byte.x + c * localX - s * localY, y: byte.y + bob + s * localX + c * localY };
  }
  function solveWebTether() {
    if (!web.active) return;
    let spool = spoolPosition();
    let dx = web.anchorX - spool.x, dy = web.anchorY - spool.y;
    let distance = Math.hypot(dx, dy);
    if (distance <= web.length || distance < .001) return;

    const nx = dx / distance, ny = dy / distance;
    const excess = distance - web.length;
    // Project only the rope's excess length; a slack web has no physical effect.
    byte.x += nx * excess;
    byte.y += ny * excess;
    byte.x = clamp(byte.x, halfW(), world.w - halfW());
    byte.y = clamp(byte.y, halfH(), floorY());

    spool = spoolPosition();
    dx = web.anchorX - spool.x; dy = web.anchorY - spool.y;
    distance = Math.hypot(dx, dy);
    if (distance < .001) return;
    const tx = dx / distance, ty = dy / distance;
    const rx = spool.x - byte.x, ry = spool.y - byte.y;
    const pointVx = byte.vx - byte.spin * ry;
    const pointVy = byte.vy + byte.spin * rx;
    const towardAnchor = pointVx * tx + pointVy * ty;
    if (towardAnchor >= 0) return;

    // A tension impulse cancels outward velocity at the spool and adds the matching swing torque.
    const lever = rx * ty - ry * tx;
    const inverseInertia = 1 / Math.max(1, (spriteW * spriteW + spriteH * spriteH) / 12);
    const impulse = -towardAnchor / (1 + lever * lever * inverseInertia);
    byte.vx += tx * impulse;
    byte.vy += ty * impulse;
    byte.spin += lever * impulse * inverseInertia;
  }
  function drawWeb() {
    if (!web.active) return;
    const spool = spoolPosition();
    const distance = Math.hypot(web.anchorX - spool.x, web.anchorY - spool.y);
    const slack = Math.max(0, web.length - distance);
    const sag = Math.min(34, slack * .32);
    const midX = (spool.x + web.anchorX) * .5;
    const midY = (spool.y + web.anchorY) * .5 + sag;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(spool.x, spool.y); ctx.quadraticCurveTo(midX, midY, web.anchorX, web.anchorY);
    ctx.strokeStyle = 'rgba(54, 69, 78, .72)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(spool.x, spool.y); ctx.quadraticCurveTo(midX, midY, web.anchorX, web.anchorY);
    ctx.strokeStyle = '#f8fbff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(web.anchorX, web.anchorY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = 'rgba(54,69,78,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  function setGravityButton(label, status, pressed) {
    gravityLabel.textContent = label;
    gravityStatus.textContent = status;
    gravityButton.setAttribute('aria-pressed', String(pressed));
    gravityButton.setAttribute('aria-label', pressed ? 'Return to screen-relative gravity' : 'Enable Earth-relative gravity');
  }
  function stopEarthGravity(message = '') {
    window.removeEventListener('devicemotion', readEarthGravity);
    clearTimeout(earth.noSampleTimer);
    earth.enabled = false;
    earth.initialized = false;
    earth.x = 0; earth.y = 0;
    setGravityButton('SCREEN OWNS DOWN', message, false);
  }
  function readEarthGravity(event) {
    const reading = event.accelerationIncludingGravity;
    if (!reading || !Number.isFinite(reading.x) || !Number.isFinite(reading.y)) return;
    earth.lastSample = now();
    clearTimeout(earth.noSampleTimer);

    // Device axes stay attached to the hardware; rotate the projected vector into the page.
    const angle = ((screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0) * Math.PI / 180;
    const deviceX = -reading.x / 9.81 * 1650;
    const deviceY = reading.y / 9.81 * 1650;
    const targetX = Math.cos(angle) * deviceX - Math.sin(angle) * deviceY;
    const targetY = Math.sin(angle) * deviceX + Math.cos(angle) * deviceY;
    const sampleDt = Number.isFinite(event.interval) && event.interval > 0 ? event.interval / 1000 : 1 / 60;
    const blend = 1 - Math.exp(-sampleDt / .13);

    if (!earth.initialized) {
      earth.x = targetX; earth.y = targetY;
      earth.initialized = true;
    } else {
      earth.x += (targetX - earth.x) * blend;
      earth.y += (targetY - earth.y) * blend;
    }
    if (byte.mode === 'idle' && Math.hypot(earth.x - earth.restX, earth.y - earth.restY) > 95) {
      byte.mode = 'air';
      byte.vx = byte.vy = 0;
    }
  }
  async function toggleGravity() {
    if (earth.enabled) {
      stopEarthGravity();
      return;
    }
    if (!('DeviceMotionEvent' in window)) {
      setGravityButton('SCREEN OWNS DOWN', 'MOTION SENSORS UNAVAILABLE', false);
      return;
    }
    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission !== 'granted') {
          setGravityButton('SCREEN OWNS DOWN', 'MOTION ACCESS DENIED', false);
          return;
        }
      }
      earth.enabled = true;
      earth.initialized = false;
      earth.lastSample = 0;
      setGravityButton('EARTH OWNS DOWN', 'ROTATE YOUR PHONE', true);
      window.addEventListener('devicemotion', readEarthGravity, { passive: true });
      byte.targetX = byte.targetY = null;
      if (!byte.grabbed && byte.mode === 'idle') {
        byte.mode = 'air';
        byte.vx = byte.vy = 0;
      }
      earth.noSampleTimer = setTimeout(() => {
        if (earth.enabled && !earth.lastSample) stopEarthGravity('NO MOTION SENSOR DATA');
      }, 2500);
    } catch (_) {
      setGravityButton('SCREEN OWNS DOWN', 'MOTION ACCESS DENIED', false);
    }
  }
  gravityButton.addEventListener('click', toggleGravity);

  function beginDrag(e) {
    e.preventDefault();
    if (web.active || e.isPrimary === false) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const spool = spoolPosition();
    if (Math.hypot(px - spool.x, py - spool.y) <= Math.max(30, spriteH * .13)) {
      web.active = true;
      web.pointerId = e.pointerId;
      web.anchorX = px; web.anchorY = py;
      web.length = Math.max(Math.hypot(px - spool.x, py - spool.y) + 18, spriteH * .36);
      byte.targetX = byte.targetY = null;
      byte.mode = 'air';
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    const dx = px - byte.x, dy = py - byte.y;
    const inByte = Math.abs(dx) < spriteW * .58 && Math.abs(dy) < spriteH * .59;
    if (inByte) {
      byte.grabbed = true;
      byte.targetX = byte.targetY = null;
      byte.mode = 'grab';
      byte.vx = byte.vy = 0;
      byte.grabDX = dx; byte.grabDY = dy;
      byte.lastSamples = [{ x: px, y: py, t: now() }];
      canvas.setPointerCapture(e.pointerId);
    } else {
      byte.targetX = clamp(px, halfW(), world.w - halfW());
      byte.targetY = clamp(py, floorY() - spriteH * .2, floorY());
      byte.mode = 'scuttle';
    }
  }
  function moveDrag(e) {
    if (web.active && e.pointerId === web.pointerId) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      web.anchorX = e.clientX - rect.left; web.anchorY = e.clientY - rect.top;
      return;
    }
    if (!byte.grabbed) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const t = now(), px = e.clientX - rect.left, py = e.clientY - rect.top;
    byte.x = px - byte.grabDX; byte.y = py - byte.grabDY;
    if (byte.lastSamples.length) {
      const prev = byte.lastSamples[byte.lastSamples.length - 1];
      const elapsed = Math.max(1, t - prev.t) / 1000;
      byte.vx = (px - prev.x) / elapsed;
      byte.facing = byte.vx < -25 ? -1 : byte.vx > 25 ? 1 : byte.facing;
      byte.angle = clamp(byte.vx * .00015, -.24, .24);
    }
    byte.lastSamples.push({ x: px, y: py, t });
    byte.lastSamples = byte.lastSamples.filter(p => t - p.t < 120).slice(-6);
  }
  function endDrag(e) {
    if (web.active && e.pointerId === web.pointerId) {
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      web.active = false;
      web.pointerId = null;
      return;
    }
    if (!byte.grabbed) return;
    byte.grabbed = false;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    const s = byte.lastSamples;
    if (s.length > 1) {
      const a = s[0], b = s[s.length - 1], dt = Math.max(16, b.t - a.t) / 1000;
      byte.vx = clamp((b.x - a.x) / dt * .84, -1150, 1150);
      byte.vy = clamp((b.y - a.y) / dt * .84, -1300, 1300);
    }
    byte.spin = clamp(byte.vx * .0012, -2, 2);
    if (Math.abs(byte.vx) > 30) byte.facing = byte.vx < 0 ? -1 : 1;
    byte.mode = 'air';
    byte.squash = .13;
    byte.lastSamples = [];
  }

  canvas.addEventListener('pointerdown', beginDrag);
  canvas.addEventListener('pointermove', moveDrag);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function update(dt, t) {
    const g = 1650;
    byte.idlePhase += dt * 2.1;
    byte.squash *= Math.exp(-dt * 8);
    byte.stretch *= Math.exp(-dt * 5);

    if (byte.grabbed) {
      return;
    }
    if (web.active && byte.mode === 'idle') byte.mode = 'air';
    if (byte.mode === 'scuttle' && byte.targetX !== null) {
      const dx = byte.targetX - byte.x, dy = byte.targetY - byte.y;
      byte.facing = dx < 0 ? -1 : 1;
      const d = Math.hypot(dx, dy);
      if (d < 15) {
        byte.x = byte.targetX; byte.y = byte.targetY;
        byte.targetX = byte.targetY = null;
        byte.mode = earth.enabled ? 'air' : 'idle'; byte.frame = 0; byte.frameClock = 0;
      } else {
        const speed = Math.min(530, Math.max(230, d * 2.7));
        const step = Math.min(d, speed * dt);
        byte.x += dx / d * step; byte.y += dy / d * step;
        byte.angle = clamp(dx * .00045, -.18, .18);
      }
    } else if (byte.mode === 'air' && earth.enabled) {
      byte.vx += earth.x * dt;
      byte.vy += earth.y * dt;
      byte.x += byte.vx * dt; byte.y += byte.vy * dt;
      byte.angle += byte.spin * dt;
      byte.spin *= Math.exp(-dt * 1.5);
      byte.angle *= Math.exp(-dt * .65);
      const minX = halfW(), maxX = world.w - halfW();
      let restingEdge = '';
      if (byte.x < minX) {
        byte.x = minX; byte.vx = Math.abs(byte.vx) * .48; byte.spin += .65; impact(Math.abs(byte.vx), 'side');
        if (earth.x < -100 && byte.vx < 95 && Math.abs(earth.y) < 200) restingEdge = 'left';
      }
      if (byte.x > maxX) {
        byte.x = maxX; byte.vx = -Math.abs(byte.vx) * .48; byte.spin -= .65; impact(Math.abs(byte.vx), 'side');
        if (earth.x > 100 && byte.vx > -95 && Math.abs(earth.y) < 200) restingEdge = 'right';
      }
      if (byte.y < halfH()) {
        byte.y = halfH(); byte.vy = Math.abs(byte.vy) * .42; impact(Math.abs(byte.vy), 'top');
        if (earth.y < -100 && byte.vy < 95 && Math.abs(earth.x) < 200) restingEdge = 'top';
      }
      if (byte.y >= floorY()) {
        byte.y = floorY(); byte.vy = -Math.abs(byte.vy) * .31; byte.vx *= .83; impact(Math.abs(byte.vy), 'floor');
        if (earth.y > 100 && byte.vy > -95 && Math.abs(earth.x) < 200) restingEdge = 'floor';
      }
      const atLeft = byte.x <= minX, atRight = byte.x >= maxX;
      const atTop = byte.y <= halfH(), atFloor = byte.y >= floorY();
      const pushedIntoCorner = (atLeft && earth.x < -100 || atRight && earth.x > 100)
        && (atTop && earth.y < -100 || atFloor && earth.y > 100)
        && Math.hypot(byte.vx, byte.vy) < 140;
      if (pushedIntoCorner) restingEdge = 'corner';
      if (restingEdge) {
        byte.mode = 'idle'; byte.vx = byte.vy = 0; byte.angle *= .3;
        earth.restX = earth.x; earth.restY = earth.y;
      }
    } else if (byte.mode === 'air') {
      byte.vy += g * dt;
      byte.x += byte.vx * dt; byte.y += byte.vy * dt;
      byte.angle += byte.spin * dt;
      byte.spin *= Math.exp(-dt * 1.5);
      byte.angle *= Math.exp(-dt * .65);
      const minX = halfW(), maxX = world.w - halfW();
      if (byte.x < minX) { byte.x = minX; byte.vx = Math.abs(byte.vx) * .48; byte.spin += .65; impact(Math.abs(byte.vx), 'side'); }
      if (byte.x > maxX) { byte.x = maxX; byte.vx = -Math.abs(byte.vx) * .48; byte.spin -= .65; impact(Math.abs(byte.vx), 'side'); }
      if (byte.y < halfH()) { byte.y = halfH(); byte.vy = Math.abs(byte.vy) * .42; impact(Math.abs(byte.vy), 'top'); }
      if (byte.y >= floorY()) {
        byte.y = floorY();
        if (byte.vy > 135) { byte.vy = -byte.vy * .31; byte.vx *= .83; impact(Math.abs(byte.vy), 'floor'); }
        else { byte.vy = 0; byte.mode = 'idle'; byte.angle *= .3; byte.vx *= .82; }
      }
      if (byte.mode === 'air' && byte.y >= floorY() && Math.abs(byte.vy) < 95) byte.mode = 'idle';
    } else {
      if (!earth.enabled) byte.y += (floorY() - byte.y) * (1 - Math.exp(-dt * 8));
      byte.x += byte.vx * dt;
      byte.vx *= Math.exp(-dt * 4.2);
      byte.vy *= Math.exp(-dt * 4.2);
      byte.angle *= Math.exp(-dt * 5);
      if (Math.abs(byte.vx) < 5) byte.vx = 0;
      byte.x = clamp(byte.x, halfW(), world.w - halfW());
    }

    solveWebTether();

    if (byte.mode === 'scuttle') {
      byte.frameClock += dt;
      if (byte.frameClock > .095) { byte.frameClock = 0; byte.frame = (byte.frame + 1) % assets.walk.length; }
    } else if (byte.mode === 'idle') {
      byte.frameClock += dt;
      if (!byte.blinking && t > byte.blinkAt) {
        byte.blinking = true; byte.frame = 2; byte.frameClock = 0;
      } else if (byte.blinking && byte.frameClock > .16) {
        byte.blinking = false; byte.frame = Math.random() < .35 ? 4 : 0;
        byte.blinkAt = t + 2300 + Math.random() * 2600; byte.frameClock = 0;
      } else if (!byte.blinking && byte.frameClock > 1.1) {
        byte.frame = byte.frame === 0 ? 1 : 0; byte.frameClock = 0;
      }
    } else if (byte.mode === 'air' || byte.mode === 'grab') {
      byte.frame = 0;
    }
  }
  function impact(speed, where) {
    if (speed < 140) return;
    const kick = Math.min(.25, speed / 1800);
    byte.squash = where === 'floor' ? kick : kick * .62;
    byte.stretch = Math.min(.16, speed / 2400);
  }

  function draw(t) {
    const w = world.w, h = world.h;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#e9f2f4'); sky.addColorStop(.66, '#f5f2e9'); sky.addColorStop(1, '#d8e6e3');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // Barely-there play-space cues keep the creature as the only thing to play with.
    ctx.fillStyle = 'rgba(255,255,255,.37)';
    ctx.beginPath(); ctx.ellipse(w * .5, h * .88, w * .46, h * .08, 0, 0, Math.PI * 2); ctx.fill();
    drawWeb();
    const shadowY = Math.min(floorY() + spriteH * .36, h - 12);
    const lift = Math.max(0, floorY() - byte.y);
    ctx.save();
    ctx.globalAlpha = clamp(.16 - lift / 1600, .045, .16);
    ctx.fillStyle = '#31413d';
    ctx.beginPath(); ctx.ellipse(byte.x, shadowY, spriteW * (.37 - Math.min(lift / 1000, .1)), spriteH * .065, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const moving = byte.mode === 'scuttle';
    const list = moving ? assets.walk : assets.idle;
    const frame = list[byte.frame] || list[0];
    if (frame) {
      const bob = moving ? Math.sin(t * .018) * 3 : (byte.mode === 'idle' ? Math.sin(byte.idlePhase) * 2 : 0);
      const squeezeX = 1 + byte.squash * .42 - byte.stretch * .28;
      const squeezeY = 1 - byte.squash * .45 + byte.stretch * .35;
      ctx.save();
      ctx.translate(byte.x, byte.y + bob);
      ctx.rotate(byte.angle);
      ctx.scale(byte.facing, 1);
      ctx.scale(squeezeX, squeezeY);
      const frameW = spriteH * frame.width / frame.height;
      ctx.drawImage(frame, -frameW / 2, -spriteH / 2, frameW, spriteH);
      ctx.restore();
    }
  }

  function loop(t) {
    const dt = Math.min(.032, (t - (lastTime || t)) / 1000);
    lastTime = t;
    update(dt, t); draw(t);
    requestAnimationFrame(loop);
  }
  Promise.all([loadFrames('front', 6), loadFrames('diagonal', 8)]).then(([idle, walk]) => {
    assets.idle = idle; assets.walk = walk;
    resize();
    byte.x = world.w * .5; byte.y = floorY(); byte.blinkAt = now() + 1400;
    requestAnimationFrame(loop);
  });
})();
