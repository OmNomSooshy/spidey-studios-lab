(() => {
  const canvas = document.querySelector('#scene');
  const ctx = canvas.getContext('2d', { alpha: false });
  const assets = { idle: [], walk: [], scheming: null };
  const gravityButton = document.querySelector('#gravity-toggle');
  const gravityLabel = document.querySelector('#gravity-label');
  const gravityStatus = document.querySelector('#gravity-status');
  const earth = {
    enabled: false, x: 0, y: 0, restX: 0, restY: 0,
    initialized: false, lastSample: 0, noSampleTimer: 0,
    permissionRequested: false, permissionGranted: false, listening: false,
  };
  const web = { active: false, planted: false, pointerId: null, anchorX: 0, anchorY: 0, deployedLength: 0, maxLength: 0 };
  const buttonWeb = { phase: 'waiting', idleTime: 0, elapsed: 0, progress: 0 };
  const buttonBody = { loose: false, stationary: false, x: 0, y: 0, width: 0, height: 0, vx: 0, vy: 0 };
  const autonomy = { choice: null, idleTime: 0 };
  const obby = {
    active: false, phase: 'room', idleTime: 0, cameraY: 0,
    platforms: [], fallingPlatform: null, highestPlatformY: 0,
    fallingTime: 0, hasLaunched: false, scale: .6,
    web: { active: false, pointerId: null, anchorX: 0, anchorY: 0, length: 0 },
  };
  function loadFrames(prefix, count) {
    return Promise.all(Array.from({ length: count }, (_, i) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `assets/${prefix}-${i}.png`;
    })));
  }
  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  const world = { w: 0, h: 0, dpr: 1 };
  let spriteW = 180, spriteH = 222;
  const byte = {
    x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0,
    squash: 0, stretch: 0, wallSquish: 0, grabSquishX: 0, grabSquishY: 0, mode: 'idle', facing: 1,
    frame: 0, frameClock: 0, blinkAt: 0, blinking: false,
    targetX: null, targetY: null, grabbed: false,
    grabDesiredX: 0, grabDesiredY: 0,
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
    // Keep the sprite and its proportional interaction geometry modestly smaller.
    spriteH = Math.max(184, Math.min(269, world.w * 0.57));
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
  const bodyScale = () => obby.hasLaunched ? obby.scale : 1;
  const bodyW = () => spriteW * bodyScale();
  const bodyH = () => spriteH * bodyScale();
  const halfW = () => bodyW() * .5;
  const halfH = () => bodyH() * .5;
  const now = () => performance.now();

  function bodyGeometry(t = now()) {
    const moving = byte.mode === 'scuttle';
    const list = moving ? assets.walk : assets.idle;
    const frame = list[byte.frame] || list[0];
    const frameW = frame ? bodyH() * frame.width / frame.height : bodyW();
    const bob = moving ? Math.sin(t * .018) * 3 : (byte.mode === 'idle' ? Math.sin(byte.idlePhase) * 2 : 0);
    const horizontalSquish = Math.max(byte.wallSquish, byte.grabSquishX);
    const squeezeX = (1 + byte.squash * .42 - byte.stretch * .28) * (1 - horizontalSquish * .9 + byte.grabSquishY * .45);
    const squeezeY = (1 - byte.squash * .45 + byte.stretch * .35) * (1 + horizontalSquish * .55 - byte.grabSquishY * .9);
    return { frame, frameW, bob, squeezeX, squeezeY };
  }
  function bodyHalfExtents() {
    const { frameW, squeezeX, squeezeY } = bodyGeometry();
    const rotatedW = Math.abs(frameW * squeezeX), rotatedH = Math.abs(bodyH() * squeezeY);
    const c = Math.abs(Math.cos(byte.angle)), s = Math.abs(Math.sin(byte.angle));
    return {
      x: (rotatedW * c + rotatedH * s) * .5,
      y: (rotatedW * s + rotatedH * c) * .5,
    };
  }
  function constrainGrabbedByte(desiredX, desiredY) {
    byte.grabDesiredX = desiredX;
    byte.grabDesiredY = desiredY;
    let pressureX = byte.grabSquishX, pressureY = byte.grabSquishY;
    for (let i = 0; i < 6; i++) {
      byte.grabSquishX = pressureX;
      byte.grabSquishY = pressureY;
      const extent = bodyHalfExtents();
      const minX = extent.x, maxX = world.w - extent.x;
      const minY = extent.y, maxY = Math.min(floorY(), world.h - extent.y);
      const pushX = Math.max(minX - desiredX, desiredX - maxX, 0);
      const pushY = Math.max(minY - desiredY, desiredY - maxY, 0);
      pressureX = clamp(pushX / halfW(), 0, .55);
      pressureY = clamp(pushY / halfH(), 0, .55);
    }
    byte.grabSquishX = pressureX;
    byte.grabSquishY = pressureY;
    const extent = bodyHalfExtents();
    byte.x = clamp(desiredX, extent.x, world.w - extent.x);
    byte.y = clamp(desiredY, extent.y, Math.min(floorY(), world.h - extent.y));
  }

  function spoolPosition(t = now()) {
    const { frameW, bob, squeezeX, squeezeY } = bodyGeometry(t);
    const localX = frameW * .205 * byte.facing * squeezeX;
    const localY = bodyH() * .205 * squeezeY;
    const c = Math.cos(byte.angle), s = Math.sin(byte.angle);
    return { x: byte.x + c * localX - s * localY, y: byte.y + bob + s * localX + c * localY };
  }
  function solveWebTether() {
    if (!web.active) return;
    let spool = spoolPosition();
    let dx = web.anchorX - spool.x, dy = web.anchorY - spool.y;
    let distance = Math.hypot(dx, dy);
    if (distance <= web.deployedLength || distance < .001) return;

    const nx = dx / distance, ny = dy / distance;
    const excess = distance - web.deployedLength;
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
    const inverseInertia = 1 / Math.max(1, (bodyW() * bodyW() + bodyH() * bodyH()) / 12);
    const impulse = -towardAnchor / (1 + lever * lever * inverseInertia);
    byte.vx += tx * impulse;
    byte.vy += ty * impulse;
    byte.spin += lever * impulse * inverseInertia;
  }
  function solveObbyWeb() {
    const tether = obby.web;
    if (!obby.active || !tether.active) return;
    let spool = spoolPosition();
    let dx = tether.anchorX - spool.x, dy = tether.anchorY - spool.y;
    let distance = Math.hypot(dx, dy);
    if (distance <= tether.length || distance < .001) return;

    const nx = dx / distance, ny = dy / distance;
    byte.x += nx * (distance - tether.length);
    byte.y += ny * (distance - tether.length);
    byte.x = clamp(byte.x, halfW(), world.w - halfW());

    spool = spoolPosition();
    dx = tether.anchorX - spool.x; dy = tether.anchorY - spool.y;
    distance = Math.hypot(dx, dy);
    if (distance < .001) return;
    const tx = dx / distance, ty = dy / distance;
    const rx = spool.x - byte.x, ry = spool.y - byte.y;
    const pointVx = byte.vx - byte.spin * ry;
    const pointVy = byte.vy + byte.spin * rx;
    const towardAnchor = pointVx * tx + pointVy * ty;
    if (towardAnchor >= 0) return;

    const lever = rx * ty - ry * tx;
    const inverseInertia = 1 / Math.max(1, (bodyW() * bodyW() + bodyH() * bodyH()) / 12);
    const impulse = -towardAnchor / (1 + lever * lever * inverseInertia);
    byte.vx += tx * impulse;
    byte.vy += ty * impulse;
    byte.spin += lever * impulse * inverseInertia;
  }
  function drawWeb() {
    if (!web.active) return;
    const spool = spoolPosition();
    const distance = Math.hypot(web.anchorX - spool.x, web.anchorY - spool.y);
    const slack = Math.max(0, web.deployedLength - distance);
    const sag = Math.min(34, slack * .32);
    const midX = (spool.x + web.anchorX) * .5;
    const midY = (spool.y + web.anchorY) * .5 + sag;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(spool.x, spool.y); ctx.quadraticCurveTo(midX, midY, web.anchorX, web.anchorY);
    ctx.strokeStyle = 'rgba(54, 69, 78, .72)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(spool.x, spool.y); ctx.quadraticCurveTo(midX, midY, web.anchorX, web.anchorY);
    ctx.strokeStyle = '#f8fbff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(web.anchorX, web.anchorY, web.planted ? 8 : 4, 0, Math.PI * 2);
    ctx.fillStyle = web.planted ? '#f58220' : '#fff'; ctx.fill();
    ctx.strokeStyle = 'rgba(54,69,78,.9)'; ctx.lineWidth = web.planted ? 2 : 1.5; ctx.stroke();
    if (web.planted) {
      ctx.beginPath(); ctx.arc(web.anchorX, web.anchorY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
    }
    ctx.restore();
  }
  function drawPlatforms() {
    if (!obby.active) return;
    const cameraY = obby.cameraY;
    const platforms = obby.platforms.slice();
    if (obby.fallingPlatform) platforms.push(obby.fallingPlatform);
    for (const platform of platforms) {
      const y = platform.y - cameraY;
      if (y < -platform.h || y > world.h + platform.h) continue;
      ctx.fillStyle = '#43515a';
      ctx.fillRect(platform.x, y, platform.w, platform.h);
      ctx.fillStyle = '#e5ece7';
      ctx.fillRect(platform.x, y, platform.w, 4);
    }
  }
  function drawObbyWeb() {
    const tether = obby.web;
    if (!obby.active || !tether.active) return;
    const spool = spoolPosition();
    const x1 = spool.x, y1 = spool.y - obby.cameraY;
    const x2 = tether.anchorX, y2 = tether.anchorY - obby.cameraY;
    const distance = Math.hypot(x2 - x1, y2 - y1);
    const slack = Math.max(0, tether.length - distance);
    const midX = (x1 + x2) * .5;
    const midY = (y1 + y2) * .5 + Math.min(32, slack * .28);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(midX, midY, x2, y2);
    ctx.strokeStyle = 'rgba(38,49,58,.88)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(midX, midY, x2, y2);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(x2, y2, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
  }
  function buttonTargetInCanvas() {
    const button = gravityButton.getBoundingClientRect();
    const scene = canvas.getBoundingClientRect();
    return { x: button.left + button.width * .5 - scene.left, y: button.top + button.height * .5 - scene.top };
  }
  function drawButtonWeb() {
    if (buttonWeb.phase !== 'aim' && buttonWeb.phase !== 'firing' && buttonWeb.phase !== 'attached') return;
    const spool = spoolPosition();
    const target = buttonTargetInCanvas();
    const endX = buttonWeb.phase === 'firing'
      ? spool.x + (target.x - spool.x) * buttonWeb.progress : target.x;
    const endY = buttonWeb.phase === 'firing'
      ? spool.y + (target.y - spool.y) * buttonWeb.progress : target.y;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(spool.x, spool.y); ctx.lineTo(endX, endY);
    if (buttonWeb.phase === 'aim') {
      ctx.setLineDash([5, 8]);
      ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = 'rgba(54,69,78,.82)'; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(spool.x, spool.y); ctx.lineTo(endX, endY);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    }
    ctx.stroke();
    ctx.restore();
  }

  function setGravityButton(label, status, pressed) {
    gravityLabel.textContent = label;
    gravityStatus.textContent = status;
    gravityButton.setAttribute('aria-pressed', String(pressed));
    gravityButton.setAttribute('aria-label', pressed ? 'Return to screen-relative gravity' : 'Enable Earth-relative gravity');
  }
  function stopEarthGravity(message = '') {
    clearTimeout(earth.noSampleTimer);
    earth.enabled = false;
    earth.initialized = false;
    earth.x = 0; earth.y = 0;
    stopMotionIfUnused();
    setGravityButton('SCREEN OWNS DOWN', message, false);
  }
  function startMotionListener() {
    if (!('DeviceMotionEvent' in window) || earth.listening) return;
    window.addEventListener('devicemotion', readEarthGravity, { passive: true });
    earth.listening = true;
  }
  function stopMotionIfUnused() {
    if (earth.enabled || obby.active || !earth.listening) return;
    window.removeEventListener('devicemotion', readEarthGravity);
    earth.listening = false;
  }
  async function requestEarthPermission() {
    const Motion = window.DeviceMotionEvent;
    if (!Motion || typeof Motion.requestPermission !== 'function') return !!Motion;
    if (earth.permissionRequested) return earth.permissionGranted;
    earth.permissionRequested = true;
    try {
      earth.permissionGranted = (await Motion.requestPermission()) === 'granted';
    } catch (_) {
      earth.permissionGranted = false;
    }
    return earth.permissionGranted;
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
    if (earth.enabled && byte.mode === 'idle' && Math.hypot(earth.x - earth.restX, earth.y - earth.restY) > 95) {
      byte.mode = 'air';
      byte.vx = byte.vy = 0;
    }
  }
  function enableEarthGravity(fromByte = false) {
    const alreadyEnabled = earth.enabled;
    earth.enabled = true;
    if (!alreadyEnabled) {
      earth.initialized = fromByte;
      earth.lastSample = 0;
      earth.x = 0; earth.y = fromByte ? 1650 : 0;
    }
    setGravityButton('EARTH OWNS DOWN', fromByte ? 'BYTE DID THAT' : 'ROTATE YOUR PHONE', true);
    startMotionListener();
    byte.targetX = byte.targetY = null;
    if (!byte.grabbed && byte.mode === 'idle') {
      byte.mode = 'air';
      byte.vx = byte.vy = 0;
    }
    clearTimeout(earth.noSampleTimer);
    if (!fromByte) {
      earth.noSampleTimer = setTimeout(() => {
        if (earth.enabled && !earth.lastSample) stopEarthGravity('NO MOTION SENSOR DATA');
      }, 2500);
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
    if (!await requestEarthPermission()) {
      setGravityButton('SCREEN OWNS DOWN', 'MOTION ACCESS DENIED', false);
      return;
    }
    enableEarthGravity();
  }
  gravityButton.addEventListener('click', toggleGravity);
  gravityButton.addEventListener('pointerdown', () => {
    if (buttonBody.loose) {
      buttonBody.stationary = true;
      buttonBody.vx = buttonBody.vy = 0;
    }
  });

  function dislodgeGravityButton() {
    const rect = gravityButton.getBoundingClientRect();
    buttonBody.loose = true;
    buttonBody.stationary = false;
    buttonBody.x = rect.left; buttonBody.y = rect.top;
    buttonBody.width = rect.width; buttonBody.height = rect.height;
    gravityButton.style.right = 'auto';
    gravityButton.style.bottom = 'auto';
    gravityButton.style.left = `${buttonBody.x}px`;
    gravityButton.style.top = `${buttonBody.y}px`;
    gravityButton.classList.add('gravity-loose');

    const scene = canvas.getBoundingClientRect();
    const dx = byte.x + scene.left - (buttonBody.x + buttonBody.width * .5);
    const dy = byte.y + scene.top - (buttonBody.y + buttonBody.height * .5);
    const distance = Math.max(1, Math.hypot(dx, dy));
    buttonBody.vx = dx / distance * 330;
    buttonBody.vy = dy / distance * 330;
    enableEarthGravity(true);
    buttonWeb.phase = 'attached';
    buttonWeb.elapsed = 0;
  }
  function updateButtonPhysics(dt) {
    if (!buttonBody.loose || buttonBody.stationary) return;
    const gravityX = earth.enabled ? earth.x : 0;
    const gravityY = earth.enabled ? earth.y : 1650;
    buttonBody.vx = clamp(buttonBody.vx + gravityX * dt, -1500, 1500);
    buttonBody.vy = clamp(buttonBody.vy + gravityY * dt, -1500, 1500);
    buttonBody.x += buttonBody.vx * dt;
    buttonBody.y += buttonBody.vy * dt;
    const maxX = Math.max(0, window.innerWidth - buttonBody.width);
    const maxY = Math.max(0, window.innerHeight - buttonBody.height);
    if (buttonBody.x < 0) { buttonBody.x = 0; buttonBody.vx = Math.abs(buttonBody.vx) * .38; }
    if (buttonBody.x > maxX) { buttonBody.x = maxX; buttonBody.vx = -Math.abs(buttonBody.vx) * .38; }
    if (buttonBody.y < 0) { buttonBody.y = 0; buttonBody.vy = Math.abs(buttonBody.vy) * .38; }
    if (buttonBody.y > maxY) {
      buttonBody.y = maxY; buttonBody.vy = -Math.abs(buttonBody.vy) * .32; buttonBody.vx *= .86;
      if (Math.abs(buttonBody.vy) < 42) buttonBody.vy = 0;
    }
    gravityButton.style.left = `${buttonBody.x}px`;
    gravityButton.style.top = `${buttonBody.y}px`;
  }
  function updateButtonWeb(dt) {
    if (buttonWeb.phase === 'waiting') {
      if (autonomy.choice !== 'button' || byte.mode !== 'idle' || byte.grabbed || web.active || buttonBody.loose || obby.active) {
        buttonWeb.idleTime = 0;
        return;
      }
      buttonWeb.idleTime += dt;
      if (buttonWeb.idleTime >= 4.8) {
        buttonWeb.phase = 'scheming'; buttonWeb.elapsed = 0;
        byte.mode = 'scheming';
        byte.targetX = byte.targetY = null;
        byte.blinking = false;
        byte.frame = 0;
      }
      return;
    }
    if (buttonWeb.phase === 'scheming') {
      if (byte.grabbed || byte.mode !== 'scheming') {
        buttonWeb.phase = 'waiting';
        buttonWeb.idleTime = buttonWeb.elapsed = 0;
        autonomy.choice = null;
        autonomy.idleTime = 0;
        if (byte.mode === 'scheming') byte.mode = 'idle';
        return;
      }
      buttonWeb.elapsed += dt;
      if (buttonWeb.elapsed >= 1.15) {
        byte.mode = 'idle';
        buttonWeb.phase = 'aim';
        buttonWeb.elapsed = 0;
      }
      return;
    }
    if (buttonWeb.phase === 'aim' || buttonWeb.phase === 'firing') {
      const target = buttonTargetInCanvas();
      byte.facing = target.x < byte.x ? -1 : 1;
      const spool = spoolPosition();
      byte.angle = clamp(Math.atan2(target.y - spool.y, target.x - spool.x) * .35, -.28, .28);
    }
    buttonWeb.elapsed += dt;
    if (buttonWeb.phase === 'aim' && buttonWeb.elapsed >= .42) {
      buttonWeb.phase = 'firing'; buttonWeb.elapsed = 0;
    } else if (buttonWeb.phase === 'firing') {
      buttonWeb.progress = clamp(buttonWeb.elapsed / .5, 0, 1);
      if (buttonWeb.progress >= 1) dislodgeGravityButton();
    } else if (buttonWeb.phase === 'attached' && buttonWeb.elapsed >= .62) {
      buttonWeb.phase = 'released';
    }
  }

  function finishObby() {
    obby.active = false;
    obby.phase = 'room';
    obby.idleTime = 0;
    obby.cameraY = 0;
    obby.platforms = [];
    obby.fallingPlatform = null;
    obby.fallingTime = 0;
    obby.hasLaunched = false;
    obby.web.active = false;
    obby.web.pointerId = null;
    autonomy.choice = null;
    autonomy.idleTime = 0;
    document.body.classList.remove('obby-away');
    stopMotionIfUnused();
  }
  function spawnPlatformAbove() {
    const previous = obby.platforms[obby.platforms.length - 1];
    if (!previous) return;
    const width = Math.min(Math.max(spriteW * .68, 82), Math.max(72, world.w - 24));
    const previousCenter = previous.x + previous.w * .5;
    const center = clamp(previousCenter + (Math.random() - .5) * world.w * .58,
      width * .5 + 10, world.w - width * .5 - 10);
    const y = previous.y - spriteH * (.88 + Math.random() * .14);
    obby.platforms.push({ x: center - width * .5, y, w: width, h: 18 });
    obby.highestPlatformY = y;
  }
  function fillPlatformsAhead() {
    const targetY = obby.cameraY - world.h * 1.35;
    let guard = 0;
    while (obby.highestPlatformY > targetY && guard++ < 24) spawnPlatformAbove();
  }
  function beginObby() {
    obby.active = true;
    obby.phase = 'dropping';
    obby.idleTime = 0;
    obby.cameraY = 0;
    obby.platforms = [];
    obby.fallingTime = 0;
    obby.hasLaunched = false;
    obby.web.active = false;
    startMotionListener();
    const width = Math.min(Math.max(spriteW * .94, 116), Math.max(80, world.w - 24));
    const x = clamp(byte.x - width * .5 + world.w * .24, 8, Math.max(8, world.w - width - 8));
    obby.fallingPlatform = {
      x, y: -24, targetY: world.h * .62,
      w: width, h: 18, vy: 0,
    };
  }
  function launchFromFirstPlatform(platform) {
    const targetX = platform.x + platform.w * .5;
    obby.hasLaunched = true;
    obby.phase = 'climb';
    byte.y = platform.y - halfH();
    byte.facing = targetX < byte.x ? -1 : 1;
    byte.mode = 'air';
    byte.targetX = byte.targetY = null;
    byte.vx = clamp(byte.vx + (targetX - byte.x) * .45, -330, 330);
    byte.vy = -930;
    byte.squash = .12;
    byte.stretch = .15;
    autonomy.choice = null;
    autonomy.idleTime = 0;
    document.body.classList.add('obby-away');
    obby.fallingTime = 0;
    fillPlatformsAhead();
  }
  function updateAutonomy(dt) {
    if (obby.active) return;
    const idle = byte.mode === 'idle' && !byte.grabbed && !web.active;
    if (!idle) {
      if (autonomy.choice === 'obby' || (autonomy.choice === 'button' && buttonWeb.phase === 'waiting')) autonomy.choice = null;
      autonomy.idleTime = 0;
      return;
    }
    if (autonomy.choice === 'button' && buttonWeb.phase === 'released') autonomy.choice = null;
    if (autonomy.choice) return;
    autonomy.idleTime += dt;
    if (autonomy.idleTime < 1.2) return;
    autonomy.idleTime = 0;
    const opportunities = [];
    if (buttonWeb.phase === 'waiting' && !buttonBody.loose) opportunities.push('button');
    opportunities.push('obby');
    autonomy.choice = opportunities[Math.floor(Math.random() * opportunities.length)];
    obby.idleTime = 0;
    buttonWeb.idleTime = 0;
  }
  function updateObby(dt) {
    if (!obby.active) {
      if (autonomy.choice === 'obby' && byte.mode === 'idle' && !byte.grabbed && !web.active) {
        obby.idleTime += dt;
        if (obby.idleTime >= 2.6) beginObby();
      } else {
        obby.idleTime = 0;
      }
      return;
    }

    if (obby.phase === 'dropping' && obby.fallingPlatform) {
      const platform = obby.fallingPlatform;
      platform.vy += 1750 * dt;
      platform.y += platform.vy * dt;
      if (platform.y >= platform.targetY) {
        platform.y = platform.targetY;
        const landed = { x: platform.x, y: platform.y, w: platform.w, h: platform.h };
        obby.fallingPlatform = null;
        obby.platforms.push(landed);
        obby.highestPlatformY = landed.y;
        obby.phase = 'waiting';
      }
    }

    if (obby.hasLaunched && byte.vy > 80) {
      obby.fallingTime += dt;
      if (obby.fallingTime > .82) obby.phase = 'fall';
    } else {
      obby.fallingTime = 0;
    }
    if (obby.phase === 'climb') fillPlatformsAhead();

    const screenY = byte.y - obby.cameraY;
    if (screenY < world.h * .38) obby.cameraY = byte.y - world.h * .38;
    else if (screenY > world.h * .72 && obby.cameraY < 0) {
      obby.cameraY = Math.min(0, byte.y - world.h * .72);
    }
    if (obby.phase === 'fall') {
      obby.platforms = obby.platforms.filter(platform => platform.y - obby.cameraY > -world.h * .7);
    }
  }
  function landOnObbyPlatform(previousY) {
    if (!obby.active || byte.vy <= 0) return;
    const previousBottom = previousY + halfH();
    const currentBottom = byte.y + halfH();
    const supportHalf = bodyW() * .18;
    const platform = obby.platforms.find(item =>
      previousBottom <= item.y && currentBottom >= item.y
      && Math.min(byte.x + supportHalf, item.x + item.w) - Math.max(byte.x - supportHalf, item.x) >= supportHalf * .9);
    if (!platform) return;
    if (!obby.hasLaunched) {
      launchFromFirstPlatform(platform);
      return;
    }
    byte.y = platform.y - halfH();
    byte.vy = -930;
    byte.mode = 'air';
    byte.squash = .12;
    byte.stretch = .18;
    obby.phase = 'climb';
    obby.fallingTime = 0;
    fillPlatformsAhead();
  }
  function landBackHome() {
    const speed = Math.max(0, byte.vy);
    byte.y = floorY();
    finishObby();
    if (speed > 135) {
      byte.vy = -speed * .31;
      byte.vx *= .83;
      impact(speed, 'floor');
    } else {
      byte.vy = 0;
      byte.mode = 'idle';
      byte.angle *= .3;
      byte.vx *= .82;
    }
  }

  function beginDrag(e) {
    if (!earth.permissionRequested) void requestEarthPermission();
    e.preventDefault();
    if (e.isPrimary === false) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    if (web.active && web.planted && Math.hypot(px - web.anchorX, py - web.anchorY) <= 42) {
      // Releasing the web leaves Byte's current linear and angular momentum untouched.
      web.active = false;
      web.planted = false;
      web.pointerId = null;
      return;
    }
    if (obby.hasLaunched) {
      if (obby.web.active) return;
      const anchorX = px, anchorY = py + obby.cameraY;
      const spool = spoolPosition();
      obby.web.active = true;
      obby.web.pointerId = e.pointerId;
      obby.web.anchorX = anchorX;
      obby.web.anchorY = anchorY;
      obby.web.length = Math.hypot(anchorX - spool.x, anchorY - spool.y);
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (web.active && !web.planted) return;
    const spool = spoolPosition();
    if (!web.active && Math.hypot(px - spool.x, py - spool.y) <= Math.max(24, spriteH * .13)) {
      web.active = true;
      web.planted = false;
      web.pointerId = e.pointerId;
      web.anchorX = px; web.anchorY = py;
      web.maxLength = spriteH * 1.2;
      web.deployedLength = Math.min(web.maxLength, Math.max(Math.hypot(px - spool.x, py - spool.y) + 18, spriteH * .12));
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
      constrainGrabbedByte(px - byte.grabDX, py - byte.grabDY);
      byte.lastSamples = [{ x: px, y: py, t: now() }];
      canvas.setPointerCapture(e.pointerId);
    } else {
      byte.targetX = clamp(px, halfW(), world.w - halfW());
      byte.targetY = clamp(py, floorY() - spriteH * .2, floorY());
      byte.mode = 'scuttle';
    }
  }
  function moveWebAnchor(e) {
    const rect = canvas.getBoundingClientRect();
    const nextX = e.clientX - rect.left, nextY = e.clientY - rect.top;
    const spool = spoolPosition();
    const oldDistance = Math.hypot(web.anchorX - spool.x, web.anchorY - spool.y);
    const nextDistance = Math.hypot(nextX - spool.x, nextY - spool.y);
    // Outward finger travel pays strand off the spool; the same deployed length drives drawing and tension.
    const payout = Math.max(0, nextDistance - oldDistance);
    web.deployedLength = Math.min(web.maxLength, web.deployedLength + payout);
    web.anchorX = nextX; web.anchorY = nextY;
  }
  function moveDrag(e) {
    if (obby.web.active && e.pointerId === obby.web.pointerId) {
      e.preventDefault();
      return;
    }
    if (web.active && !web.planted && e.pointerId === web.pointerId) {
      e.preventDefault();
      moveWebAnchor(e);
      return;
    }
    if (!byte.grabbed) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const t = now(), px = e.clientX - rect.left, py = e.clientY - rect.top;
    constrainGrabbedByte(px - byte.grabDX, py - byte.grabDY);
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
    if (obby.web.active && e.pointerId === obby.web.pointerId) {
      obby.web.active = false;
      obby.web.pointerId = null;
      return;
    }
    if (web.active && !web.planted && e.pointerId === web.pointerId) {
      // pointerup may be the only event with the finger's final mobile position.
      if (Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) moveWebAnchor(e);
      web.planted = true;
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
  // Captured events bubble here; these listeners also survive canvas capture loss on touch browsers.
  window.addEventListener('pointermove', moveDrag, { passive: false });
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  function update(dt, t) {
    const g = 1650;
    const previousY = byte.y;
    byte.idlePhase += dt * 2.1;
    byte.squash *= Math.exp(-dt * 8);
    byte.stretch *= Math.exp(-dt * 5);
    byte.wallSquish *= Math.exp(-dt * 4.5);
    if (!byte.grabbed) {
      byte.grabSquishX *= Math.exp(-dt * 4.5);
      byte.grabSquishY *= Math.exp(-dt * 4.5);
    }

    if (byte.grabbed) {
      constrainGrabbedByte(byte.grabDesiredX, byte.grabDesiredY);
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
      byte.vx += earth.x * (obby.hasLaunched ? .72 : 1) * dt;
      byte.vy += (obby.hasLaunched ? g : earth.y) * dt;
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
      if (!obby.hasLaunched && byte.y < halfH()) {
        byte.y = halfH(); byte.vy = Math.abs(byte.vy) * .42; impact(Math.abs(byte.vy), 'top');
        if (earth.y < -100 && byte.vy < 95 && Math.abs(earth.x) < 200) restingEdge = 'top';
      }
      if (!obby.hasLaunched && byte.y >= floorY()) {
        byte.y = floorY(); byte.vy = -Math.abs(byte.vy) * .31; byte.vx *= .83; impact(Math.abs(byte.vy), 'floor');
        if (earth.y > 100 && byte.vy > -95 && Math.abs(earth.x) < 200) restingEdge = 'floor';
      }
      const atLeft = byte.x <= minX, atRight = byte.x >= maxX;
      const atTop = !obby.hasLaunched && byte.y <= halfH(), atFloor = !obby.hasLaunched && byte.y >= floorY();
      const pushedIntoCorner = (atLeft && earth.x < -100 || atRight && earth.x > 100)
        && (atTop && earth.y < -100 || atFloor && earth.y > 100)
        && Math.hypot(byte.vx, byte.vy) < 140;
      if (pushedIntoCorner) restingEdge = 'corner';
      if (restingEdge) {
        byte.mode = 'idle'; byte.vx = byte.vy = 0; byte.angle *= .3;
        earth.restX = earth.x; earth.restY = earth.y;
      }
    } else if (byte.mode === 'air') {
      if (obby.hasLaunched) byte.vx = clamp(byte.vx + earth.x * .72 * dt, -760, 760);
      byte.vy += g * dt;
      byte.x += byte.vx * dt; byte.y += byte.vy * dt;
      byte.angle += byte.spin * dt;
      byte.spin *= Math.exp(-dt * 1.5);
      byte.angle *= Math.exp(-dt * .65);
      const minX = halfW(), maxX = world.w - halfW();
      if (byte.x < minX) { byte.x = minX; byte.vx = Math.abs(byte.vx) * .48; byte.spin += .65; impact(Math.abs(byte.vx), 'side'); }
      if (byte.x > maxX) { byte.x = maxX; byte.vx = -Math.abs(byte.vx) * .48; byte.spin -= .65; impact(Math.abs(byte.vx), 'side'); }
      if (!obby.hasLaunched && byte.y < halfH()) { byte.y = halfH(); byte.vy = Math.abs(byte.vy) * .42; impact(Math.abs(byte.vy), 'top'); }
      if (!obby.hasLaunched && byte.y >= floorY()) {
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
    solveObbyWeb();
    landOnObbyPlatform(previousY);
    if (obby.hasLaunched && byte.y >= floorY() && byte.vy >= 0) landBackHome();

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
    if (where === 'side') {
      // Horizontal impacts compress Byte across his width, then recover smoothly.
      byte.wallSquish = Math.max(byte.wallSquish, clamp(speed / 1800, .1, .55));
      return;
    }
    const kick = Math.min(.25, speed / 1800);
    byte.squash = where === 'floor' ? kick : kick * .62;
    byte.stretch = Math.min(.16, speed / 2400);
  }

  function draw(t) {
    const w = world.w, h = world.h;
    const cameraY = obby.hasLaunched ? obby.cameraY : 0;
    const floorScreenY = floorY() - cameraY;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#e9f2f4'); sky.addColorStop(.66, '#f5f2e9'); sky.addColorStop(1, '#d8e6e3');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // Barely-there play-space cues keep the creature as the only thing to play with.
    if (floorScreenY > -bodyH() && floorScreenY < h + bodyH()) {
      ctx.fillStyle = 'rgba(255,255,255,.37)';
      ctx.beginPath(); ctx.ellipse(w * .5, floorScreenY + bodyH() * .09, w * .46, h * .08, 0, 0, Math.PI * 2); ctx.fill();
    }
    drawPlatforms();
    const shadowY = Math.min(floorScreenY + bodyH() * .36, h - 12);
    const lift = Math.max(0, floorY() - byte.y);
    if (floorScreenY > -bodyH() && floorScreenY < h + bodyH()) {
      ctx.save();
      ctx.globalAlpha = clamp(.16 - lift / 1600, .045, .16);
      ctx.fillStyle = '#31413d';
      ctx.beginPath(); ctx.ellipse(byte.x, shadowY, bodyW() * (.37 - Math.min(lift / 1000, .1)), bodyH() * .065, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    const { frame: baseFrame, frameW: baseFrameW, bob, squeezeX, squeezeY } = bodyGeometry(t);
    const scheming = byte.mode === 'scheming' && assets.scheming;
    const frame = scheming || baseFrame;
    const schemingScale = scheming ? Math.min(bodyW() / frame.width, bodyH() / frame.height) : 0;
    const frameW = scheming ? frame.width * schemingScale : baseFrameW;
    const frameH = scheming ? frame.height * schemingScale : bodyH();
    if (frame) {
      ctx.save();
      if (scheming) {
        const feetY = byte.y - cameraY + bodyH() * .5 + bob;
        ctx.drawImage(frame, byte.x - frameW / 2, feetY - frameH, frameW, frameH);
      } else {
        ctx.translate(byte.x, byte.y - cameraY + bob);
        ctx.rotate(byte.angle);
        ctx.scale(byte.facing, 1);
        ctx.scale(squeezeX, squeezeY);
        ctx.drawImage(frame, -frameW / 2, -frameH / 2, frameW, frameH);
      }
      ctx.restore();
    }
    // Keep a planted endpoint above Byte's opaque artwork so its hit target stays visible.
    drawWeb();
    drawObbyWeb();
    drawButtonWeb();
  }

  function loop(t) {
    const dt = Math.min(.032, (t - (lastTime || t)) / 1000);
    lastTime = t;
    update(dt, t);
    updateAutonomy(dt);
    updateButtonWeb(dt);
    updateObby(dt);
    updateButtonPhysics(dt);
    draw(t);
    requestAnimationFrame(loop);
  }
  Promise.all([loadFrames('front', 6), loadFrames('diagonal', 8), loadImage('assets/scheming-byte.png')]).then(([idle, walk, scheming]) => {
    assets.idle = idle; assets.walk = walk;
    assets.scheming = scheming;
    resize();
    byte.x = world.w * .5; byte.y = floorY(); byte.blinkAt = now() + 1400;
    requestAnimationFrame(loop);
  });
})();
