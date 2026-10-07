(() => {
  const canvas = document.querySelector('#scene');
  const ctx = canvas.getContext('2d', { alpha: false });
  const assets = { idle: null, blink: null, curious: null, walk: [], scheming: null };
  const gravityButton = document.querySelector('#gravity-toggle');
  const gravityLabel = document.querySelector('#gravity-label');
  const gravityStatus = document.querySelector('#gravity-status');
  const earth = {
    enabled: false, x: 0, y: 0, restX: 0, restY: 0,
    initialized: false, lastSample: 0, noSampleTimer: 0,
    permissionRequested: false, permissionGranted: false, listening: false,
    support: { active: false, edge: null, contacts: [], tangentX: 1, tangentY: 0 },
  };
  const web = { active: false, planted: false, pointerId: null, anchorX: 0, anchorY: 0, deployedLength: 0, maxLength: 0 };
  const buttonWeb = { phase: 'waiting', idleTime: 0, elapsed: 0, progress: 0 };
  const buttonBody = { loose: false, stationary: false, x: 0, y: 0, width: 0, height: 0, vx: 0, vy: 0 };
  const autonomy = { choice: null, idleTime: 0 };
  const obby = {
    active: false, phase: 'room', idleTime: 0, cameraY: 0,
    platforms: [], fallingPlatform: null, highestPlatformY: 0,
    fallingTime: 0, hasLaunched: false, scale: .7, launchAge: 0, seeded: false, returning: false, crystalBase: 0, launchX: 0,
    web: { active: false, pending: false, pointerId: null, anchorX: 0, anchorY: 0, screenX: 0, screenY: 0, length: 0 },
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
  const crystal = window.createCrystalSky({ ctx, world, obby });
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

  const life = {
    phase: 'awake', elapsed: 0, lastTouch: 0, interactions: 0, scale: 1,
    welcomed: false, curious: 1.4, pet: 0, roughness: 0, pendingFollow: false, afterToss: false, reactionBlink: 0,
    gazeX: null, gazeY: null, noticeAt: 0, returnAt: 0,
    pointer: { active: false, id: null, kind: '', x: 0, y: 0, startX: 0, startY: 0, movedAt: 0, speed: 0 },
    nest: { active: false, x: 0, y: 0, length: 0, progress: 0, fade: 0 },
    motes: Array.from({ length: 18 }, (_, i) => ({ x: ((i * .6180339) % 1), y: ((i * .371) % 1), phase: i * 2.39 })),
  };
  const audio = { ctx: null, enabled: true, last: {}, buzzAt: 0 };
  try { audio.enabled = localStorage.getItem('byte-little-sun-sound') !== 'off'; } catch (_) {}
  const soundButton = document.querySelector('#sound-toggle');
  function syncSoundButton() {
    soundButton.setAttribute('aria-pressed', String(audio.enabled));
    soundButton.setAttribute('aria-label', audio.enabled ? "Mute Byte's sounds" : "Hear Byte's sounds");
  }
  function unlockAudio() {
    if (!audio.enabled) return;
    try {
      audio.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.ctx.state === 'suspended') void audio.ctx.resume();
    } catch (_) {}
  }
  function voice(kind, strength = 1) {
    const profiles = {
      notice: [580, 770, .12], pet: [420, 490, .24], toss: [830, 480, .17],
      boing: [145, 430, .2], web: [1200, 280, .07], sleep: [200, 165, .34],
      crime: [510, 670, .15], land: [120, 65, .09], wake: [440, 680, .16],
    };
    const p = profiles[kind];
    const stamp = performance.now();
    if (!p || !audio.enabled || !audio.ctx || audio.ctx.state !== 'running' || stamp - (audio.last[kind] || -10000) < (kind === 'land' ? 180 : kind === 'pet' ? 3000 : 850)) return;
    audio.last[kind] = stamp;
    window.ByteRoom?.ignoreSound(p[2] * 1000 + 180);
    const start = audio.ctx.currentTime, duration = p[2];
    const osc = audio.ctx.createOscillator(), gain = audio.ctx.createGain();
    osc.type = kind === 'land' || kind === 'boing' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(p[0], start);
    osc.frequency.exponentialRampToValueAtTime(p[1], start + duration * .8);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(.024 * Math.min(1, strength), start + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    osc.connect(gain); gain.connect(audio.ctx.destination);
    osc.start(start); osc.stop(start + duration + .025);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  function tactile(strength = 1) {
    const stamp = performance.now();
    if (stamp - audio.buzzAt < 180 || !navigator.vibrate) return;
    audio.buzzAt = stamp;
    navigator.vibrate(Math.round(5 + 7 * Math.min(1, strength)));
  }
  soundButton.addEventListener('click', () => {
    audio.enabled = !audio.enabled;
    try { localStorage.setItem('byte-little-sun-sound', audio.enabled ? 'on' : 'off'); } catch (_) {}
    syncSoundButton();
    if (audio.enabled) { unlockAudio(); voice('notice', .65); }
  });
  syncSoundButton();
  function wakeByte() {
    const sleeping = life.phase !== 'awake';
    if (sleeping) {
      life.nest.fade = life.nest.active ? 1 : 0;
      life.nest.active = false;
      life.phase = 'awake'; life.elapsed = 0;
      life.curious = 1.3;
      if (autonomy.choice === 'rest') autonomy.choice = null;
      if (byte.mode !== 'grab') byte.mode = 'air';
      voice('wake', .65);
    }
  }
  function noticeTouch(x, y, id) {
    outside.dozing = false; outside.dream = false; outside.powerInvite = false; outside.bask = 0;
    home.cancel();
    unlockAudio();
    wakeByte();
    life.lastTouch = now();
    life.interactions++;
    life.welcomed = true;
    life.curious = .8;
    life.gazeX = x; life.gazeY = y;
    Object.assign(life.pointer, { active: true, id, kind: '', x, y, startX: x, startY: y, movedAt: now(), speed: 0 });
    if (now() - life.noticeAt > 4500 && Math.hypot(x - byte.x, y - byte.y) > spriteH * .8) {
      voice('notice', .7); life.noticeAt = now();
    }
  }
  function followTouch(x, y) {
    const passage = home.portal(x, y);
    if (passage !== null && !web.active && home.request(passage)) return;
    byte.targetX = clamp(x, halfW(), world.w - halfW());
    byte.targetY = earth.enabled ? clamp(y, halfH(), world.h - halfH()) : floorY();
    life.pendingFollow = true;
    if (!web.active && (earth.enabled ? earth.support.active : byte.mode === 'idle' && byte.y >= floorY() - 8)) byte.mode = 'scuttle';
  }
  function beginRest() { home.rest(); }
  function beginRestHere() {
    life.phase = 'nest-walk'; life.elapsed = 0;
    byte.targetX = clamp(world.w * .34, halfW() + 12, world.w - halfW() - 12);
    byte.targetY = floorY(); byte.mode = 'scuttle';
    life.curious = 1;
  }
  function solveNestTether() {
    const nest = life.nest;
    if (!nest.active || byte.grabbed) return;
    let spool = spoolPosition();
    let dx = nest.x - spool.x, dy = nest.y - spool.y;
    let distance = Math.hypot(dx, dy);
    if (distance <= nest.length || distance < .001) return;
    const nx = dx / distance, ny = dy / distance;
    byte.x += nx * (distance - nest.length); byte.y += ny * (distance - nest.length);
    byte.x = clamp(byte.x, halfW(), world.w - halfW());
    byte.y = clamp(byte.y, halfH(), floorY());
    spool = spoolPosition(); dx = nest.x - spool.x; dy = nest.y - spool.y;
    distance = Math.hypot(dx, dy);
    if (distance < .001) return;
    const tx = dx / distance, ty = dy / distance;
    const rx = spool.x - byte.x, ry = spool.y - byte.y;
    const outward = (byte.vx - byte.spin * ry) * tx + (byte.vy + byte.spin * rx) * ty;
    if (outward >= 0) return;
    const lever = rx * ty - ry * tx;
    const inverseInertia = 12 / Math.max(1, bodyW() ** 2 + bodyH() ** 2);
    const impulse = -outward / (1 + lever * lever * inverseInertia);
    byte.vx += tx * impulse; byte.vy += ty * impulse;
    byte.spin += lever * impulse * inverseInertia;
  }
  function updateLife(dt) {
    const upstairsHere = obby.hasLaunched;
    if (obby.returning && !upstairsHere && byte.mode === 'idle' && Math.hypot(byte.vx, byte.vy) < 50 &&
        (earth.enabled ? earth.support.active : Math.abs(byte.y - floorY()) < 8)) obby.returning = false;
    life.scale += ((obby.hasLaunched ? obby.scale : 1) - life.scale) * (1 - Math.exp(-dt * 7));
    life.elapsed += dt;
    if (life.pendingFollow && byte.targetX !== null && !web.active && !upstairsHere && !byte.grabbed && (earth.enabled ? earth.support.active : byte.mode === 'idle' && byte.y >= floorY() - 8)) byte.mode = 'scuttle';
    if (byte.targetX === null) life.pendingFollow = false;
    if (life.pointer.active && life.pointer.kind === 'follow') life.curious = Math.max(life.curious, .3);
    life.curious = Math.max(0, life.curious - dt);
    life.reactionBlink = Math.max(0, life.reactionBlink - dt);
    if (life.afterToss && byte.mode === 'idle' && !life.pointer.active && !web.active && !upstairsHere) {
      life.afterToss = false; life.reactionBlink = .22; life.curious = 2.1; voice('notice', .45);
    }
    life.roughness *= Math.exp(-dt * .035);
    life.nest.fade = Math.max(0, life.nest.fade - dt * 2.6);
    const pointer = life.pointer;
    const calmHold = byte.grabbed && pointer.active && pointer.kind === 'byte' && (now() - pointer.movedAt > 160 || pointer.speed < 65) && Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY) < 30;
    life.pet = clamp(life.pet + dt * (calmHold ? 1.5 : -2), 0, 1);
    if (calmHold && life.pet > .65) { voice('pet', .55); life.roughness *= Math.exp(-dt * 1.5); }
    if (!life.welcomed && now() > 2800 && !pointer.active && byte.mode === 'idle' && !upstairsHere) {
      life.welcomed = true;
      byte.targetX = clamp(byte.x + spriteW * .42, halfW() + 10, world.w - halfW() - 10);
      byte.targetY = floorY(); byte.mode = 'scuttle'; life.curious = 2;
    }
    if (life.phase === 'nest-walk' && byte.mode === 'idle') {
      life.phase = 'nest-cast'; life.elapsed = 0; life.curious = .7;
      life.nest.x = byte.x + bodyW() * .205;
      life.nest.y = Math.max(bodyH() * .7, floorY() - bodyH() * 1.25);
      life.nest.progress = 0;
    } else if (life.phase === 'nest-cast') {
      if (life.elapsed > .7) {
        byte.mode = 'air'; byte.vx = 10; byte.vy = -660;
        byte.squash = .1; byte.stretch = .12;
        life.phase = 'nest-hop'; life.elapsed = 0;
        voice('web', .7);
      }
    } else if (life.phase === 'nest-hop') {
      life.nest.progress = clamp(life.elapsed / .3, 0, 1);
      if (life.elapsed >= .35) {
        const spool = spoolPosition();
        life.nest.length = Math.hypot(life.nest.x - spool.x, life.nest.y - spool.y);
        life.nest.active = true;
        life.phase = 'settling'; life.elapsed = 0;
      }
    } else if (life.phase === 'settling' && life.elapsed > 2.2 && Math.hypot(byte.vx, byte.vy) < 110) {
      life.phase = 'sleep'; life.elapsed = 0; voice('sleep', .5);
    } else if (life.phase === 'sleep' && life.elapsed > 12) {
      voice('sleep', .3); life.elapsed = 0;
    }
    if (life.phase !== 'awake' && (earth.enabled || obby.hasLaunched || web.active)) wakeByte();
    if (earth.enabled) gravityButton.style.setProperty('--down-angle', `${earthBodyAngle() * 180 / Math.PI}deg`);
    else gravityButton.style.setProperty('--down-angle', '0deg');
  }
  function drawNest() {
    const nest = life.nest;
    if (!nest.active && life.phase !== 'nest-hop' && !nest.fade) return;
    const spool = spoolPosition();
    const progress = nest.active || nest.fade ? 1 : nest.progress;
    const endX = spool.x + (nest.x - spool.x) * progress;
    const endY = spool.y + (nest.y - spool.y) * progress;
    const slack = nest.active ? Math.max(0, nest.length - Math.hypot(nest.x - spool.x, nest.y - spool.y)) : 0;
    ctx.save(); ctx.globalAlpha = nest.fade || .9;
    ctx.strokeStyle = '#b4a68b'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(spool.x, spool.y); ctx.quadraticCurveTo((spool.x + endX) / 2 + Math.min(15, slack * .2), (spool.y + endY) / 2, endX, endY); ctx.stroke();
    ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 1.8; ctx.stroke();
    if (progress === 1) {
      ctx.fillStyle = '#d8b568'; ctx.strokeStyle = '#927447'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(nest.x, nest.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fffcf3'; ctx.beginPath(); ctx.arc(nest.x, nest.y, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function drawHabitat(t) {
    const w = world.w, h = world.h;
    const camera = obby.hasLaunched ? obby.cameraY : 0;
    const darkness = room.state.open && room.state.camera && room.state.lastFrame > 0 ? clamp((.2 - room.state.brightness) / .2, 0, 1) : 0;
    crystal.drawSky(t, darkness);
    // A shadow follows the physically supporting edge instead of asserting a second floor.
    if (!obby.hasLaunched) {
      let x = byte.x, y = floorY() + bodyH() * .47, angle = 0;
      let lift = Math.max(0, floorY() - byte.y);
      if (earth.enabled) {
        const down = earthDown();
        const times = [];
        if (down.x > .001) times.push((w - byte.x) / down.x);
        if (down.x < -.001) times.push(-byte.x / down.x);
        if (down.y > .001) times.push((h - byte.y) / down.y);
        if (down.y < -.001) times.push(-byte.y / down.y);
        const distance = Math.min(...times);
        x = byte.x + down.x * distance; y = byte.y + down.y * distance;
        angle = earthBodyAngle(); lift = Math.max(0, distance - bodyH() * .5);
      }
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      ctx.globalAlpha = clamp(.13 - lift / 1300, .025, .13);
      ctx.fillStyle = '#425143'; ctx.beginPath(); ctx.ellipse(0, 0, bodyW() * .36, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (life.pointer.active && life.pointer.kind === 'follow' && !obby.hasLaunched) {
      ctx.save(); ctx.globalAlpha = .32; ctx.strokeStyle = '#9e895c'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(life.pointer.x, life.pointer.y, 12 + Math.sin(t * .005) * 2, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }


  const room = window.ByteRoom;
  const outside = { soundId: 0, shadowId: 0, joltId: 0, chargeId: 0, bask: 0, powerInvite: false, stimulusAt: 0, duck: 0, wind: 0, dream: false, dozing: false, seekTime: 0, lastMove: 0, reaction: '', reactionTime: 0 };
  const home = window.createByteHome({ ctx, world, byte, life, earth, web, obby, autonomy,
    senses: room, bodyW: () => bodyW(), bodyH: () => bodyH(), roomW: () => spriteW, roomH: () => spriteH, extents: bodyHalfExtents, floorY: () => floorY(), wakeByte, voice,
    pranking: () => !['waiting', 'released'].includes(buttonWeb.phase), down: earthDown,
    restHere: beginRestHere, obbyHere: beginObbyHere, skyOpening: crystal.opening });
  function openRoom(kind = 'both') {
    if (room.state.open || room.state.pending) {
      room.close(); stopMotionIfUnused();
      if (outside.dream || outside.dozing) { outside.dream = false; outside.dozing = false; wakeByte(); }
      return;
    }
    unlockAudio();
    void room.open(kind, requestEarthPermission).then(result => { if (result?.motion) startMotionListener(); });
  }
  window.addEventListener('byte-room-closed', () => { stopMotionIfUnused(); outside.powerInvite = false; outside.bask = 0; outside.dozing = false; outside.wind = 0; });
  document.querySelector('#room-window').addEventListener('click', () => openRoom());
  document.querySelectorAll('[data-sense]').forEach(button => button.addEventListener('click', () => {
    room.close(); openRoom(button.dataset.sense);
  }));
  function reactToRoom(source, power = 1) {
    outside.reaction = source; outside.reactionTime = 1.5;
    outside.dream = false; outside.dozing = false; outside.bask = 0; outside.powerInvite = false; outside.stimulusAt = now(); wakeByte();
    life.curious = 2.4; life.gazeX = world.w * .5; life.gazeY = 63;
    life.reactionBlink = .2;
    if (byte.grabbed) { outside.duck = Math.max(outside.duck, .6); return; }
    byte.targetX = byte.targetY = null; life.pendingFollow = false;
    const down = earth.enabled && !obby.hasLaunched ? earthDown() : { x: 0, y: 1 };
    byte.mode = 'air';
    byte.vx += -down.x * 300 * power + (byte.x < world.w * .5 ? -1 : 1) * 65 * power;
    byte.vy += -down.y * 300 * power;
    byte.spin += (byte.x < world.w * .5 ? -.4 : .4) * power;
    byte.squash = Math.max(byte.squash, .22);
    tactile(.3);
  }
  function roomGroundPoint(x, y) {
    const extent = bodyHalfExtents();
    return { x: clamp(x, extent.x + 4, world.w - extent.x - 4),
      y: earth.enabled ? clamp(y, extent.y + 4, world.h - extent.y - 4) : floorY() };
  }
  function groundDistance(point) {
    const dx = point.x - byte.x, dy = point.y - byte.y;
    return earth.enabled ? dx * earth.support.tangentX + dy * earth.support.tangentY : dx;
  }
  function seekRoomPoint(point) {
    if (earth.enabled && !earth.support.active) return false;
    if (Math.abs(groundDistance(point)) <= 15) return false;
    byte.targetX = point.x; byte.targetY = point.y; byte.mode = 'scuttle';
    autonomy.choice = null; autonomy.idleTime = 0;
    return true;
  }
  function roomLightPoint() {
    const sensed = room.state;
    const point = roomGroundPoint(sensed.lightX * world.w, sensed.lightY * world.h);
    // Project the patch onto an actual contact surface; this does not select or alter gravity.
    switch (earth.enabled ? earth.support.edge : 'bottom') {
      case 'left': return { x: 12, y: point.y };
      case 'right': return { x: world.w - 12, y: point.y };
      case 'top': return { x: point.x, y: 12 };
      case 'bottom': return { x: point.x, y: world.h - 26 };
      default: return point;
    }
  }
  function roomPowerPoint() {
    const sensed = room.state, dx = -(sensed.breathX || 0), dy = -(sensed.breathY ?? -1);
    const reach = Math.min(Math.abs(dx) > .01 ? world.w * .5 / Math.abs(dx) : Infinity,
      Math.abs(dy) > .01 ? world.h * .5 / Math.abs(dy) : Infinity);
    return { x: world.w * .5 + dx * reach, y: world.h * .5 + dy * reach };
  }
  function updateOutside(dt, t = now()) {
    const sensed = room.state;
    outside.duck *= Math.exp(-dt * 3.6);
    outside.reactionTime = Math.max(0, outside.reactionTime - dt);
    outside.wind += ((sensed.open && sensed.mic ? sensed.breath : 0) - outside.wind) * (1 - Math.exp(-dt * 8));
    if (!sensed.open || sensed.suspended) return;
    if (sensed.listeningFor > .1 || sensed.breath > .04) outside.stimulusAt = t;
    if (sensed.chargeId !== outside.chargeId) {
      outside.chargeId = sensed.chargeId; outside.powerInvite = sensed.charging; outside.bask = 0;
      outside.dream = false; outside.dozing = false; wakeByte();
      outside.stimulusAt = t; life.curious = 2; outside.reaction = sensed.charging ? 'power' : 'unplug'; outside.reactionTime = 2;
    }
    if (sensed.soundId !== outside.soundId) { outside.soundId = sensed.soundId; reactToRoom('sound', clamp((sensed.level - .03) * 5 + .7, .6, 1.3)); }
    if (sensed.joltId !== outside.joltId) { outside.joltId = sensed.joltId; reactToRoom('phone', .75); }
    if (sensed.shadowId !== outside.shadowId) {
      outside.shadowId = sensed.shadowId;
      outside.duck = 1; life.reactionBlink = .25; life.curious = 2;
      outside.reaction = 'shadow'; outside.reactionTime = 1.1;
    }
    if (outside.dream && ((sensed.camera && sensed.brightness > .19) || sensed.level > .018 || outside.wind > .08)) {
      outside.dream = false; outside.dozing = false; wakeByte(); life.curious = 2;
      outside.reaction = 'wake'; outside.reactionTime = 1.5;
    }
    if (outside.dozing) {
      if (life.pointer.active || Math.hypot(byte.vx, byte.vy) > 180 || sensed.brightness > .19 || sensed.level > .018 || outside.wind > .04) outside.dozing = false;
      else outside.duck = Math.max(outside.duck, .55);
    }
    const unoccupied = !byte.grabbed && !life.pointer.active && !web.active && !obby.hasLaunched && !home.travel && !home.journey && !home.activity && (buttonWeb.phase === 'waiting' || buttonWeb.phase === 'released');
    if (sensed.camera && sensed.darkFor > 3 && unoccupied && life.phase === 'awake' && !outside.dozing && byte.mode === 'idle' && t - Math.max(outside.stimulusAt, life.lastTouch) > 2200) {
      autonomy.choice = null; autonomy.idleTime = 0;
      outside.dream = true;
      if (earth.enabled) { outside.dozing = true; outside.duck = .6; } else beginRest();
      outside.reaction = 'dark'; outside.reactionTime = 2;
    }
    if (unoccupied && !home.journey && !home.travel && outside.powerInvite && sensed.charging && life.phase === 'awake' && byte.mode === 'idle' && (!earth.enabled || earth.support.active)) {
      if (home.room !== 1) { if (!home.request(1, 'warmth')) outside.powerInvite = false; }
      else {
        const power = roomPowerPoint(), target = roomGroundPoint(power.x, power.y);
        if (!seekRoomPoint(target)) { outside.powerInvite = false; outside.bask = 5; voice('pet', .4); }
      }
    }
    outside.bask = Math.max(0, outside.bask - dt);
    if (outside.bask > 0 && (life.pointer.active || !sensed.charging || outside.wind > .04 || sensed.level > .025)) outside.bask = 0;
    if (sensed.mic && sensed.listeningFor > .2 && life.phase === 'awake') {
      life.curious = Math.max(life.curious, .6); life.gazeX = world.w * .5; life.gazeY = 63;
    }
    outside.seekTime += dt;
    if (unoccupied && !home.journey && !home.travel && life.phase === 'awake' && byte.mode === 'idle' && outside.seekTime > 1.7 && outside.bask <= 0 && !outside.powerInvite && (!earth.enabled || earth.support.active) && outside.wind < .04) {
      const hearing = sensed.mic && sensed.listeningFor > .6;
      const lit = home.room === 1 && sensed.camera && sensed.lastFrame > 0 && sensed.contrast > .06 && sensed.brightness > .16;
      if (hearing && home.room !== 1) { home.request(1, 'listen'); outside.seekTime = 0; }
      else if (hearing || lit) {
        const target = hearing ? roomGroundPoint(world.w * .5, 63) : roomGroundPoint(sensed.lightX * world.w, sensed.lightY * world.h);
        if (Math.abs(groundDistance(target)) > bodyW() * .3 && seekRoomPoint(target)) {
          life.curious = 1.5;
          outside.reaction = hearing ? 'listen' : 'light'; outside.reactionTime = 2;
        }
        outside.seekTime = 0;
      }
    }
    if (sensed.camera && sensed.movement > .065 && t - outside.lastMove > 3000 && unoccupied && !home.journey && !home.travel && life.phase === 'awake' && byte.mode === 'idle') {
      outside.lastMove = t; outside.duck = .6; life.curious = 2.5;
      life.gazeX = sensed.movementX * world.w; life.gazeY = sensed.movementY * world.h;
      outside.reaction = 'movement'; outside.reactionTime = 2;
      const threat = roomGroundPoint(life.gazeX, life.gazeY), away = groundDistance(threat) > 0 ? -1 : 1;
      const tx = earth.enabled ? earth.support.tangentX : 1, ty = earth.enabled ? earth.support.tangentY : 0;
      seekRoomPoint(roomGroundPoint(byte.x + tx * away * bodyW() * .7, byte.y + ty * away * bodyW() * .7));
    }
    if (byte.grabbed) return;
    const wind = outside.wind;
    const freshMotion = sensed.motion && t - sensed.lastMotion < 180;
    const rx = byte.x - world.w * .5, ry = (byte.y - (obby.hasLaunched ? obby.cameraY : 0)) - world.h * .5;
    const turn = freshMotion ? sensed.turnA : 0;
    const windX = sensed.breathX || 0, windY = sensed.breathY ?? -1;
    // Device Y points up; canvas Y points down. The glass turns CCW for positive local-Z rate.
    const fx = wind * (windX * 3600 + clamp(rx * .006, -.55, .55) * 900) + (freshMotion ? sensed.inertiaX - turn * ry * .15 : 0);
    const fy = wind * windY * 3600 + (freshMotion ? sensed.inertiaY + turn * rx * .15 : 0);
    if (wind > .04 || (freshMotion && Math.hypot(fx, fy) > 100)) {
      if (life.phase !== 'awake') { outside.dream = false; wakeByte(); }
      if (byte.mode === 'idle' || byte.mode === 'scuttle' || byte.mode === 'scheming') {
        byte.mode = 'air'; byte.targetX = byte.targetY = null; life.pendingFollow = false;
      }
      byte.vx += clamp(fx, -5000, 5000) * dt;
      byte.vy += clamp(fy, -5000, 5000) * dt;
      byte.spin = clamp(byte.spin + turn * .22 * dt, -7, 7);
    }
  }
  function drawOutside(t) {
    const sensed = room.state;
    if (!sensed.open) return;
    if (sensed.battery && sensed.charging && !obby.hasLaunched) {
      const power = roomPowerPoint(), dx = room.state.breathX || 0, dy = room.state.breathY ?? -1;
      const heat = ctx.createRadialGradient(power.x, power.y, 0, power.x, power.y, world.w * .4);
      heat.addColorStop(0, '#ffc76b55'); heat.addColorStop(1, '#ffc76b00');
      ctx.fillStyle = heat; ctx.fillRect(0, 0, world.w, world.h);
      ctx.strokeStyle = '#cb914b88'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(power.x + dx * 5 - dy * 13, power.y + dy * 5 + dx * 13);
      ctx.lineTo(power.x + dx * 5 + dy * 13, power.y + dy * 5 - dx * 13); ctx.stroke();
    }
    if (sensed.camera && sensed.lastFrame > 0 && !obby.hasLaunched) {
      const pool = roomLightPoint();
      const light = Math.max(.02, sensed.brightness);
      const gradient = ctx.createRadialGradient(pool.x, pool.y, 0, pool.x, pool.y, world.w * .62);
      const color = sensed.color.map(v => Math.round(Math.min(255, v + 45)));
      gradient.addColorStop(0, `rgba(${color.join(',')},${light * .55})`); gradient.addColorStop(1, `rgba(${color.join(',')},0)`);
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, world.w, world.h);
      ctx.save(); ctx.globalAlpha = sensed.brightness * .11; ctx.fillStyle = `rgb(${color.join(',')})`;
      ctx.beginPath(); ctx.moveTo(world.w * .5 - 30, 89); ctx.lineTo(pool.x - bodyW() * .65, pool.y); ctx.lineTo(pool.x + bodyW() * .65, pool.y); ctx.lineTo(world.w * .5 + 30, 89); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    if (outside.wind > .04) {
      ctx.save(); ctx.strokeStyle = '#fffcde'; ctx.globalAlpha = outside.wind * .5; ctx.lineWidth = 1.1;
      const dx = sensed.breathX || 0, dy = sensed.breathY ?? -1;
      for (let i = 0; i < 11; i++) {
        const phase = ((t * .00065 + i * .163) % 1), sideways = ((i * .618) % 1 - .5) * world.w;
        const x = world.w * .5 - dx * world.w * .48 + sideways * -dy + dx * phase * world.w;
        const y = world.h * .5 - dy * world.h * .48 + sideways * dx + dy * phase * world.h;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + dx * 20 - dy * 6, y + dy * 20 + dx * 6, x + dx * 50, y + dy * 50); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function resize() {
    const oldW = world.w, oldH = world.h, oldSpriteH = spriteH;
    const rect = canvas.getBoundingClientRect();
    world.w = rect.width; world.h = rect.height;
    world.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(world.w * world.dpr);
    canvas.height = Math.round(world.h * world.dpr);
    ctx.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);
    spriteH = Math.max(112, Math.min(218, world.w * .46, world.h * .27));
    spriteW = spriteH * .81;
    if (oldW && oldH) {
      const sx = world.w / oldW, sy = world.h / oldH, bodyRatio = spriteH / oldSpriteH;
      byte.x *= sx; byte.y *= sy;
      if (byte.targetX !== null) byte.targetX *= sx;
      if (byte.targetY !== null) byte.targetY *= sy;
      web.anchorX *= sx; web.anchorY *= sy;
      web.deployedLength *= bodyRatio; web.maxLength *= bodyRatio;
      life.nest.x *= sx; life.nest.y *= sy; life.nest.length *= bodyRatio;
      if (life.phase !== 'awake') wakeByte();
      obby.crystalBase *= sy; obby.launchX *= sx;
      obby.cameraY *= sy; obby.highestPlatformY *= sy;
      for (const platform of obby.platforms) { platform.x *= sx; platform.w *= sx; platform.y *= sy; }
      if (obby.fallingPlatform) {
        obby.fallingPlatform.x *= sx; obby.fallingPlatform.w *= sx;
        obby.fallingPlatform.y *= sy; obby.fallingPlatform.targetY *= sy;
      }
      if (obby.web.active || obby.web.pending) { obby.web.active = false; obby.web.pending = false; obby.web.pointerId = null; }
      if (byte.grabbed) { byte.grabbed = false; byte.mode = 'air'; }
      life.pointer.active = false;
      if (web.active && !web.planted) { web.planted = true; web.pointerId = null; }
      if (buttonBody.loose) {
        buttonBody.x = clamp(buttonBody.x * sx, 0, world.w - buttonBody.width);
        buttonBody.y = clamp(buttonBody.y * sy, 0, world.h - buttonBody.height);
        gravityButton.style.left = `${buttonBody.x}px`; gravityButton.style.top = `${buttonBody.y}px`;
      }
      resetEarthSupport();
    }
    home.resize(oldW, oldH);
    const extent = bodyHalfExtents();
    byte.x = clamp(byte.x || world.w * .4, extent.x, world.w - extent.x);
    if (!obby.hasLaunched) byte.y = clamp(byte.y || floorY(), extent.y, Math.min(floorY(), world.h - extent.y));
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 100));

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ground = () => world.h - spriteH * .48 - 10;
  const floorY = () => ground();
  const bodyScale = () => life.scale;
  const bodyW = () => spriteW * bodyScale();
  const bodyH = () => spriteH * bodyScale();
  const halfW = () => bodyW() * .5;
  const halfH = () => bodyH() * .5;
  const now = () => performance.now();

  function bodyGeometry(t = now()) {
    const moving = byte.mode === 'scuttle';
    let frame = moving
      ? assets.walk[byte.frame] || assets.walk[0]
      : byte.mode === 'scheming' ? assets.scheming
        : byte.frame === 2 ? assets.blink
          : byte.frame === 4 ? assets.curious : assets.idle;
    if (!moving && byte.mode !== 'scheming') {
      if (life.phase === 'sleep' || outside.dozing || outside.bask > 0 || life.pet > .45 || life.reactionBlink > 0) frame = assets.blink;
      else if (life.curious > 0 && !byte.blinking && (byte.mode === 'idle' || life.phase === 'nest-cast')) frame = assets.curious;
    }
    const frameW = bodyW();
    const bob = moving ? Math.sin(t * .018) * 3 : (byte.mode === 'idle' ? Math.sin(byte.idlePhase) * 2 : 0);
    const horizontalSquish = Math.max(byte.wallSquish, byte.grabSquishX);
    let squeezeX = (1 + byte.squash * .42 - byte.stretch * .28) * (1 - horizontalSquish * .9 + byte.grabSquishY * .45);
    let squeezeY = (1 - byte.squash * .45 + byte.stretch * .35) * (1 + horizontalSquish * .55 - byte.grabSquishY * .9);
    const breath = Math.sin(t * (life.phase === 'sleep' || outside.dozing ? .0016 : .003)) * .007;
    squeezeX *= 1 + breath + life.pet * .025;
    squeezeY *= 1 - breath - life.pet * .035;
    const lean = !earth.enabled && byte.mode === 'idle' && life.gazeX !== null && life.curious > 0 ? clamp((life.gazeX - byte.x) * .00028, -.07, .07) : 0;
    squeezeX *= 1 + outside.duck * .22;
    squeezeY *= 1 - outside.duck * .32;
    const angle = byte.angle + lean;
    return { frame, frameW, bob, squeezeX, squeezeY, angle };
  }
  function bodyHalfExtents() {
    const { frameW, squeezeX, squeezeY, angle } = bodyGeometry();
    const rotatedW = Math.abs(frameW * squeezeX), rotatedH = Math.abs(bodyH() * squeezeY);
    const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
    return {
      x: (rotatedW * c + rotatedH * s) * .5,
      y: (rotatedW * s + rotatedH * c) * .5,
    };
  }
  function containRoomBody() {
    if (home.travel || obby.hasLaunched) return;
    if (byte.grabbed) { constrainGrabbedByte(byte.grabDesiredX, byte.grabDesiredY); return; }
    const extent = bodyHalfExtents(), bob = bodyGeometry().bob;
    byte.x = clamp(byte.x, extent.x, world.w - extent.x);
    const bottom = earth.enabled ? world.h - extent.y - bob : Math.min(floorY(), world.h - extent.y - bob);
    byte.y = clamp(byte.y, extent.y - bob, bottom);
    if (earth.enabled) updateEarthBoundaryContacts();
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
      const minY = extent.y, maxY = earth.enabled ? world.h - extent.y : Math.min(floorY(), world.h - extent.y);
      const pushX = Math.max(minX - desiredX, desiredX - maxX, 0);
      const pushY = Math.max(minY - desiredY, desiredY - maxY, 0);
      pressureX = clamp(pushX / halfW(), 0, .55);
      pressureY = clamp(pushY / halfH(), 0, .55);
    }
    byte.grabSquishX = pressureX;
    byte.grabSquishY = pressureY;
    const extent = bodyHalfExtents();
    byte.x = clamp(desiredX, extent.x, world.w - extent.x);
    byte.y = clamp(desiredY, extent.y, earth.enabled ? world.h - extent.y : Math.min(floorY(), world.h - extent.y));
  }

  function earthDown() {
    const magnitude = Math.hypot(earth.x, earth.y);
    return magnitude > 1 ? { x: earth.x / magnitude, y: earth.y / magnitude } : { x: 0, y: 1 };
  }
  function resetEarthSupport() {
    earth.support.active = false;
    earth.support.edge = null;
    earth.support.contacts = [];
    earth.support.tangentX = 1;
    earth.support.tangentY = 0;
  }
  function updateEarthBoundaryContacts() {
    const extent = bodyHalfExtents();
    const minX = extent.x, maxX = world.w - extent.x;
    const minY = extent.y, maxY = world.h - extent.y;
    const down = earthDown();
    const candidates = [];
    const margin = 3;
    if (byte.x <= minX + margin) candidates.push({ edge: 'left', load: -down.x, nx: 1, ny: 0, tx: 0, ty: Math.sign(-down.x || 1) });
    if (byte.x >= maxX - margin) candidates.push({ edge: 'right', load: down.x, nx: -1, ny: 0, tx: 0, ty: Math.sign(-down.x || 1) });
    if (byte.y <= minY + margin) candidates.push({ edge: 'top', load: -down.y, nx: 0, ny: 1, tx: Math.sign(down.y || 1), ty: 0 });
    if (byte.y >= maxY - margin) candidates.push({ edge: 'bottom', load: down.y, nx: 0, ny: -1, tx: Math.sign(down.y || 1), ty: 0 });
    const contacts = candidates.filter(contact => contact.load > .08);
    let selected = contacts.sort((a, b) => b.load - a.load)[0] || null;
    const current = contacts.find(contact => contact.edge === earth.support.edge);
    if (current && selected && selected.edge !== current.edge && selected.load < current.load + .14) selected = current;
    earth.support.contacts = contacts;
    earth.support.edge = selected?.edge || null;
    earth.support.active = !!selected;
    if (contacts.length > 1) {
      let tx = 0, ty = 0;
      for (const contact of contacts) { tx += contact.tx * contact.load; ty += contact.ty * contact.load; }
      const length = Math.hypot(tx, ty) || 1;
      earth.support.tangentX = tx / length;
      earth.support.tangentY = ty / length;
    } else if (selected) {
      earth.support.tangentX = selected.tx;
      earth.support.tangentY = selected.ty;
    }
  }
  function resolveEarthBoundaries() {
    const extent = bodyHalfExtents();
    const minX = extent.x, maxX = world.w - extent.x;
    const minY = extent.y, maxY = world.h - extent.y;
    const contacts = [];
    if (byte.x < minX) { byte.x = minX; contacts.push({ edge: 'left', nx: 1, ny: 0, where: 'side' }); }
    if (byte.x > maxX) { byte.x = maxX; contacts.push({ edge: 'right', nx: -1, ny: 0, where: 'side' }); }
    if (byte.y < minY) { byte.y = minY; contacts.push({ edge: 'top', nx: 0, ny: 1, where: 'top' }); }
    if (byte.y > maxY) { byte.y = maxY; contacts.push({ edge: 'bottom', nx: 0, ny: -1, where: 'floor' }); }
    for (const contact of contacts) {
      const intoScreen = byte.vx * contact.nx + byte.vy * contact.ny;
      if (intoScreen < 0) {
        const speed = -intoScreen;
        const restitution = speed > 135 ? .34 : 0;
        byte.vx -= (1 + restitution) * intoScreen * contact.nx;
        byte.vy -= (1 + restitution) * intoScreen * contact.ny;
        if (speed > 135) {
          byte.spin += contact.edge === 'left' || contact.edge === 'right' ? (contact.edge === 'left' ? .35 : -.35) : 0;
          impact(speed, contact.where);
        }
      }
    }
    // The collision itself can change the rotated footprint through visible squish.
    const afterImpact = bodyHalfExtents();
    byte.x = clamp(byte.x, afterImpact.x, world.w - afterImpact.x);
    byte.y = clamp(byte.y, afterImpact.y, world.h - afterImpact.y);
    updateEarthBoundaryContacts();
  }
  function earthBodyAngle() {
    const down = earthDown();
    // Canvas' local +Y axis is Byte's feet direction.
    return Math.atan2(-down.x, down.y);
  }
  function moveEarthScuttle(dt) {
    const dx = byte.targetX - byte.x, dy = byte.targetY - byte.y;
    if (earth.support.active) {
      const tangent = earth.support;
      const along = dx * tangent.tangentX + dy * tangent.tangentY;
      if (Math.abs(along) < 15) {
        byte.targetX = byte.targetY = null;
        byte.mode = 'idle'; byte.frame = 0; byte.frameClock = 0;
        return;
      }
      const direction = Math.sign(along);
      byte.facing = direction;
      const speed = Math.min(530, Math.max(230, Math.abs(along) * 2.7));
      const step = Math.min(Math.abs(along), speed * dt) * direction;
      byte.x += tangent.tangentX * step;
      byte.y += tangent.tangentY * step;
      resolveEarthBoundaries();
      return;
    }
    const distance = Math.hypot(dx, dy);
    if (distance < 15) {
      byte.x = byte.targetX; byte.y = byte.targetY;
      byte.targetX = byte.targetY = null;
      byte.mode = 'air'; byte.frame = 0; byte.frameClock = 0;
      return;
    }
    byte.facing = dx < 0 ? -1 : 1;
    const speed = Math.min(530, Math.max(230, distance * 2.7));
    const step = Math.min(distance, speed * dt);
    byte.x += dx / distance * step; byte.y += dy / distance * step;
    resolveEarthBoundaries();
  }
  function updateEarthMotion(dt) {
    const groundedBefore = earth.support.active;
    const acting = byte.mode === 'scheming';
    if (byte.mode === 'scuttle' && byte.targetX !== null) {
      moveEarthScuttle(dt);
    } else {
      if (byte.mode === 'idle' && !groundedBefore) byte.mode = 'air';
      const grounded = (byte.mode === 'idle' || acting) && groundedBefore;
      byte.vx += earth.x * dt;
      byte.vy += earth.y * dt;
      if (grounded && earth.support.contacts.length) {
        const tangent = earth.support;
        const tangentSpeed = byte.vx * tangent.tangentX + byte.vy * tangent.tangentY;
        const normalX = byte.vx - tangent.tangentX * tangentSpeed;
        const normalY = byte.vy - tangent.tangentY * tangentSpeed;
        byte.vx = normalX + tangent.tangentX * tangentSpeed * Math.exp(-dt * 2.2);
        byte.vy = normalY + tangent.tangentY * tangentSpeed * Math.exp(-dt * 2.2);
      }
      byte.x += byte.vx * dt;
      byte.y += byte.vy * dt;
      resolveEarthBoundaries();
      if (earth.support.active) {
        const contact = earth.support.contacts.find(item => item.edge === earth.support.edge);
        const separating = contact ? byte.vx * contact.nx + byte.vy * contact.ny : 0;
        if (separating < 100 && Math.hypot(byte.vx, byte.vy) < 42) {
          if (!acting) byte.mode = 'idle';
          earth.restX = earth.x; earth.restY = earth.y;
        }
      }
    }
    if (earth.support.active) {
      const target = earthBodyAngle();
      let delta = target - byte.angle;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      byte.angle += delta * (1 - Math.exp(-dt * 12));
    } else {
      byte.angle += byte.spin * dt;
      byte.spin *= Math.exp(-dt * 1.5);
      if (!web.active && !life.nest.active && !obby.web.active) byte.angle *= Math.exp(-dt * .65);
    }
  }

  function spoolPosition(t = now()) {
    const { frameW, bob, squeezeX, squeezeY, angle } = bodyGeometry(t);
    const localX = frameW * .205 * byte.facing * squeezeX;
    const localY = bodyH() * .205 * squeezeY;
    const c = Math.cos(angle), s = Math.sin(angle);
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
    byte.y = clamp(byte.y, halfH(), earth.enabled ? world.h - halfH() : floorY());

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
    if (!obby.active || !tether.active || now() - (tether.born || 0) < 90) return;
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
      const pulse = platform.pulse || 0;
      ctx.save(); ctx.translate(platform.x + platform.w / 2, y);
      if (platform.crystal) {
        // Embedded roots and fracture shadows attach the unchanged collision ledge to the plane.
        ctx.fillStyle = '#3d748b3d'; ctx.beginPath(); ctx.moveTo(-platform.w * .58, 8); ctx.lineTo(-platform.w * .43, -8); ctx.lineTo(platform.w * .4, -6); ctx.lineTo(platform.w * .58, 9); ctx.lineTo(platform.w * .45, 24); ctx.lineTo(-platform.w * .4, 24); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#e3fff0aa'; ctx.lineWidth = 1.3;
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * platform.w * .45, 4); ctx.lineTo(side * platform.w * .6, -7); ctx.lineTo(side * platform.w * .66, -20); ctx.moveTo(side * platform.w * .6, -7); ctx.lineTo(side * platform.w * .7, -4); ctx.stroke(); }
        const bottom = platform.h * (1 - pulse * .2);
        const g = ctx.createLinearGradient(0, 0, 0, bottom);
        g.addColorStop(0, '#c9efdf'); g.addColorStop(.3, '#9fcfca'); g.addColorStop(1, '#5d9aab');
        ctx.fillStyle = g; ctx.strokeStyle = '#518495'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-platform.w / 2, 0); ctx.lineTo(platform.w / 2, 0); ctx.lineTo(platform.w / 2 - 6, bottom); ctx.lineTo(-platform.w * .24, bottom + 3); ctx.lineTo(-platform.w / 2 + 4, bottom); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#eefff2'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-platform.w / 2 + 1, 0); ctx.lineTo(platform.w / 2 - 1, 0); ctx.stroke();
        ctx.strokeStyle = '#d7f7e7aa'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-platform.w * .12, 1); ctx.lineTo(platform.w * .04, bottom); ctx.lineTo(platform.w * .22, bottom * .43); ctx.stroke();
        ctx.restore(); continue;
      }
      ctx.fillStyle = '#798c6628'; ctx.beginPath(); ctx.roundRect(-platform.w / 2 + 3, 5, platform.w, platform.h + 3, 7); ctx.fill();
      ctx.fillStyle = '#9b7043'; ctx.beginPath(); ctx.roundRect(-platform.w / 2, pulse * 3, platform.w, platform.h * (1 - pulse * .2), 6); ctx.fill();
      ctx.fillStyle = '#dfbb7b'; ctx.beginPath(); ctx.roundRect(-platform.w / 2, pulse * 3, platform.w, 6, 4); ctx.fill();
      ctx.strokeStyle = '#fff5dc'; ctx.lineWidth = 2;
      for (const x of [-platform.w / 2 + 10, platform.w / 2 - 10]) { ctx.beginPath(); ctx.moveTo(x - 4, 0); ctx.lineTo(x + 4, 11); ctx.moveTo(x + 4, 0); ctx.lineTo(x - 4, 11); ctx.stroke(); }
      ctx.restore();
    }
  }
  function drawObbyWeb() {
    const tether = obby.web;
    if (!obby.active || !tether.active) return;
    const spool = spoolPosition();
    const x1 = spool.x, y1 = spool.y - obby.cameraY;
    const shot = clamp((now() - (tether.born || 0)) / 90, 0, 1);
    const x2 = x1 + (tether.anchorX - x1) * shot, y2 = y1 + (tether.anchorY - obby.cameraY - y1) * shot;
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
    if (shot >= 1) {
      ctx.save(); ctx.translate(x2, y2); ctx.strokeStyle = '#dffff2'; ctx.lineWidth = 1.2;
      const age = now() - tether.born, spread = 7 + Math.max(0, 1 - age / 300) * 8;
      ctx.fillStyle = '#326f8455'; ctx.beginPath(); ctx.ellipse(0, 2, 8, 4, -.2, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 5; i++) { const a = i * 2.39; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 2, Math.sin(a) * 2); ctx.lineTo(Math.cos(a) * spread, Math.sin(a) * spread * .7); ctx.stroke(); }
      ctx.strokeStyle = '#f2fff0'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 4, -.2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(x2, y2, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
  }
  function buttonTargetInCanvas() {
    const button = gravityButton.getBoundingClientRect();
    const scene = canvas.getBoundingClientRect();
    return { x: button.left + button.width * .5 - scene.left, y: button.top + button.height * .5 - scene.top };
  }
  function drawButtonWeb() {
    if (buttonWeb.phase !== 'firing' && buttonWeb.phase !== 'attached') return;
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
    gravityStatus.textContent = /DENIED|UNAVAILABLE|NO MOTION/.test(status) ? (/DENIED/.test(status) ? 'Motion stays off. Byte is still playable.' : 'Phone motion is unavailable here.') : '';
    gravityButton.setAttribute('aria-pressed', String(pressed));
    gravityButton.setAttribute('aria-label', pressed ? 'Return to screen-relative gravity' : 'Enable Earth-relative gravity');
  }
  function stopEarthGravity(message = '') {
    clearTimeout(earth.noSampleTimer);
    earth.enabled = false;
    earth.initialized = false;
    earth.x = 0; earth.y = 0;
    resetEarthSupport();
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
    const room = canvas.getBoundingClientRect();
    buttonBody.x = rect.left - room.left; buttonBody.y = rect.top - room.top;
    buttonBody.width = rect.width; buttonBody.height = rect.height;
    gravityButton.style.right = 'auto';
    gravityButton.style.bottom = 'auto';
    gravityButton.style.left = `${buttonBody.x}px`;
    gravityButton.style.top = `${buttonBody.y}px`;
    gravityButton.classList.add('gravity-loose');

    const dx = byte.x - (buttonBody.x + buttonBody.width * .5);
    const dy = byte.y - (buttonBody.y + buttonBody.height * .5);
    const distance = Math.max(1, Math.hypot(dx, dy));
    buttonBody.vx = dx / distance * 330;
    buttonBody.vy = dy / distance * 330;
    // The theft's established consequence is Earth gravity; it is an authored prank,
    // not a Human Fingers request to grant sensor permission.
    enableEarthGravity(true);
    voice('crime', .8); tactile(.4);
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
    const maxX = Math.max(0, world.w - buttonBody.width);
    const maxY = Math.max(0, world.h - buttonBody.height);
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
      if (home.room !== 1 || home.travel || autonomy.choice !== 'button' || byte.mode !== 'idle' || byte.grabbed || web.active || buttonBody.loose || obby.hasLaunched) {
        buttonWeb.idleTime = 0;
        return;
      }
      buttonWeb.idleTime += dt;
      if (buttonWeb.idleTime >= 4.8) {
        buttonWeb.phase = 'scheming'; buttonWeb.elapsed = 0;
        byte.mode = 'scheming';
        voice('crime', .4);
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
      const spool = spoolPosition();
      if (earth.enabled && earth.support.active) {
        const downAngle = earthBodyAngle(), dx = target.x - spool.x, dy = target.y - spool.y;
        const localX = Math.cos(downAngle) * dx + Math.sin(downAngle) * dy;
        const localY = -Math.sin(downAngle) * dx + Math.cos(downAngle) * dy;
        byte.facing = localX < 0 ? -1 : 1;
        byte.angle = downAngle + clamp(Math.atan2(localY, Math.abs(localX)) * .12, -.16, .16);
      } else {
        byte.facing = target.x < byte.x ? -1 : 1;
        byte.angle = clamp(Math.atan2(target.y - spool.y, target.x - spool.x) * .35, -.28, .28);
      }
    }
    buttonWeb.elapsed += dt;
    if (buttonWeb.phase === 'aim' && buttonWeb.elapsed >= .42) {
      buttonWeb.phase = 'firing'; buttonWeb.elapsed = 0; voice('web', .8);
    } else if (buttonWeb.phase === 'firing') {
      buttonWeb.progress = clamp(buttonWeb.elapsed / .26, 0, 1);
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
    obby.launchAge = 0; obby.seeded = false;
    obby.returning = false;
    obby.web.active = false; obby.web.pending = false;
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
    obby.platforms.push({ x: center - width * .5, y, w: width, h: 18, crystal: true });
    obby.highestPlatformY = y;
  }
  function fillPlatformsAhead() {
    const targetY = obby.cameraY - world.h * 1.35;
    let guard = 0;
    while (obby.highestPlatformY > targetY && guard++ < 24) spawnPlatformAbove();
  }
  function beginObby() { home.obby(); }
  function beginObbyHere() {
    if (home.room !== 3 || obby.active) return;
    obby.active = true;
    obby.phase = 'dropping';
    obby.idleTime = 0;
    obby.cameraY = 0;
    obby.platforms = [];
    obby.fallingTime = 0;
    obby.hasLaunched = false;
    obby.launchAge = 0; obby.seeded = false;
    obby.web.active = false; obby.web.pending = false;
    startMotionListener();
    const width = Math.min(Math.max(spriteW * .94, 116), Math.max(80, world.w - 24));
    const x = clamp(world.w * .3 - width * .5, 8, Math.max(8, world.w - width - 8));
    obby.fallingPlatform = {
      x, y: -24, targetY: world.h * .62,
      w: width, h: 18, vy: 0, launch: true,
    };
  }
  function launchFromFirstPlatform(platform) {
    wakeByte(); voice('boing'); tactile(.8); platform.pulse = 1;
    const targetX = platform.x + platform.w * .5;
    obby.hasLaunched = true;
    obby.phase = 'launch';
    obby.launchAge = 0; obby.seeded = false;
    byte.y = platform.y - halfH();
    byte.facing = targetX < byte.x ? -1 : 1;
    byte.mode = 'air';
    byte.targetX = byte.targetY = null;
    byte.vx = clamp(byte.vx + (targetX - byte.x) * .45, -330, 330);
    // One actual spring impulse clears the entire house. Ordinary -930 bounces remain unchanged.
    const launchSpeed = Math.max(Math.sqrt(2 * 1650 * world.h * 4.7), 1650 * 2.05);
    byte.vy = -launchSpeed;
    obby.launchX = targetX;
    const clearTime = (launchSpeed - Math.sqrt(Math.max(0, launchSpeed ** 2 - 2 * 1650 * (byte.y + world.h * .88)))) / 1650;
    const arriveTime = clearTime + .75;
    obby.crystalBase = byte.y - launchSpeed * arriveTime + .5 * 1650 * arriveTime ** 2 - world.h * .38;
    byte.squash = .12;
    byte.stretch = .15;
    autonomy.choice = null;
    autonomy.idleTime = 0;
    document.body.classList.add('obby-away');
    obby.fallingTime = 0;
    // The crystal and its first ledge are genuinely above the open-sky interval.
  }
  function updateAutonomy(dt) {
    if (obby.hasLaunched || home.travel || home.journey || home.activity || life.phase !== 'awake') return;
    const idle = byte.mode === 'idle' && !byte.grabbed && !web.active && !life.pointer.active;
    if (!idle) {
      if (autonomy.choice === 'obby' || (autonomy.choice === 'button' && buttonWeb.phase === 'waiting')) autonomy.choice = null;
      autonomy.idleTime = 0;
      return;
    }
    if (autonomy.choice === 'button' && buttonWeb.phase === 'released') autonomy.choice = null;
    if (autonomy.choice) return;
    autonomy.idleTime += dt;
    if (autonomy.idleTime < 7.2) return;
    autonomy.idleTime = 0;
    const opportunities = [];
    if (buttonWeb.phase === 'waiting' && !buttonBody.loose) opportunities.push('button');
    if (!obby.active) opportunities.push('obby');
    if (home.playCooldown <= 0 && !earth.enabled) opportunities.push('play');
    opportunities.push('wander');
    if (life.roughness > .25 && !obby.active) opportunities.push('obby');
    if (!earth.enabled) { opportunities.push('rest'); if (life.roughness < .15) opportunities.push('rest'); }
    autonomy.choice = opportunities[Math.floor(Math.random() * opportunities.length)];
    if (autonomy.choice === 'rest') beginRest();
    obby.idleTime = 0;
    buttonWeb.idleTime = 0;
  }
  function updateObby(dt) {
    for (const platform of obby.platforms) platform.pulse = (platform.pulse || 0) * Math.exp(-dt * 8);
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
        const landed = { x: platform.x, y: platform.y, w: platform.w, h: platform.h, launch: true };
        obby.fallingPlatform = null;
        obby.platforms.push(landed);
        obby.highestPlatformY = landed.y;
        obby.phase = 'waiting'; life.curious = 2.5; voice('land', .6);
      }
    }

    if (!obby.hasLaunched) { obby.cameraY = 0; return; }

    obby.launchAge += dt;
    if (byte.vy > 80) {
      obby.fallingTime += dt;
      if (obby.fallingTime > .82) obby.phase = 'fall';
    } else obby.fallingTime = 0;

    const screenY = byte.y - obby.cameraY;
    if (screenY < world.h * .38) obby.cameraY = byte.y - world.h * .38;
    else if (screenY > world.h * .72 && obby.cameraY < 0) obby.cameraY = Math.min(0, byte.y - world.h * .72);

    if (!obby.seeded && crystal.visible()) {
      obby.seeded = true;
      const width = Math.min(Math.max(spriteW * .68, 82), Math.max(72, world.w - 24));
      const center = clamp(obby.launchX, width * .5 + 10, world.w - width * .5 - 10);
      const y = obby.crystalBase - spriteH * 1.08;
      obby.platforms.push({ x: center - width * .5, y, w: width, h: 18, crystal: true });
      obby.highestPlatformY = y;
      fillPlatformsAhead();
    }
    if (obby.seeded && (obby.phase === 'climb' || obby.phase === 'launch')) {
      fillPlatformsAhead();
      obby.platforms = obby.platforms.filter(platform => platform.y < obby.cameraY + world.h * 1.8);
    }
    if (obby.phase === 'fall') obby.platforms = obby.platforms.filter(platform => platform.y - obby.cameraY > -world.h * .7);
    // Holding through the launch can meet the surface as it arrives; empty sky never gets a fake anchor.
    if (obby.web.pending) attachObbyWeb(obby.web.screenX, obby.web.screenY);
  }

  function landOnObbyPlatform(previousY) {
    if (!obby.active || home.room !== 3 || byte.vy <= 0) return;
    if (!obby.hasLaunched && obby.returning) return;
    const previousBottom = previousY + halfH();
    const currentBottom = byte.y + halfH();
    const supportHalf = bodyW() * .18;
    const platform = obby.platforms.find(item =>
      (!obby.hasLaunched || !item.launch) && previousBottom <= item.y && currentBottom >= item.y
      && Math.min(byte.x + supportHalf, item.x + item.w) - Math.max(byte.x - supportHalf, item.x) >= supportHalf * .9);
    if (!platform) return;
    if (!obby.hasLaunched) {
      launchFromFirstPlatform(platform);
      return;
    }
    byte.y = platform.y - halfH();
    voice('boing', .85); tactile(.65); platform.pulse = 1;
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
    // Keep the existing big landing rebound, without turning its recovery into an unasked relaunch.
    // Settling or a deliberate grab rearms the loft spring; there is no cooldown timer.
    obby.returning = true;
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

  function attachObbyWeb(screenX, screenY) {
    const point = crystal.unproject(screenX, screenY), tether = obby.web;
    if (!crystal.contains(point.x, point.y)) return false;
    const spool = spoolPosition();
    tether.pending = false; tether.active = true; tether.born = now();
    tether.anchorX = point.x; tether.anchorY = point.y;
    tether.length = Math.hypot(point.x - spool.x, point.y - spool.y);
    voice('web', .75);
    return true;
  }
  function beginDrag(e) {
    e.preventDefault();
    if (e.isPrimary === false) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    if (home.travel) return;
    noticeTouch(px, py, e.pointerId);
    const point = obby.hasLaunched ? crystal.unproject(px, py) : { x: px, y: py };
    if (web.active && web.planted && Math.hypot(point.x - web.anchorX, point.y - web.anchorY) <= 42) {
      // Releasing the web leaves Byte's current linear and angular momentum untouched.
      web.active = false;
      web.planted = false;
      web.pointerId = null;
      return;
    }
    if (home.beginHand(point.x, point.y - (obby.hasLaunched ? obby.cameraY : 0), e.pointerId)) { canvas.setPointerCapture(e.pointerId); return; }
    if (obby.hasLaunched) {
      if (obby.web.active || obby.web.pending) return;
      life.pointer.kind = 'obbyweb';
      Object.assign(obby.web, { pending: true, pointerId: e.pointerId, screenX: px, screenY: py });
      attachObbyWeb(px, py);
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (web.active && !web.planted) return;
    const spool = spoolPosition();
    if (!web.active && Math.hypot(px - spool.x, py - spool.y) <= Math.max(24, bodyH() * .13)) {
      obby.returning = false;
      life.pointer.kind = 'web'; voice('web', .7);
      web.active = true;
      web.planted = false;
      web.pointerId = e.pointerId;
      web.anchorX = px; web.anchorY = py;
      web.maxLength = bodyH() * 1.2;
      web.deployedLength = Math.min(web.maxLength, Math.max(Math.hypot(px - spool.x, py - spool.y) + 18, spriteH * .12));
      byte.targetX = byte.targetY = null;
      byte.mode = 'air';
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    const dx = px - byte.x, dy = py - byte.y;
    const inByte = Math.abs(dx) < bodyW() * .58 && Math.abs(dy) < bodyH() * .59;
    if (inByte) {
      obby.returning = false;
      life.pointer.kind = 'byte'; life.pendingFollow = false;
      byte.grabbed = true;
      byte.targetX = byte.targetY = null;
      byte.mode = 'grab';
      byte.vx = byte.vy = 0;
      byte.grabDX = dx; byte.grabDY = dy;
      constrainGrabbedByte(px - byte.grabDX, py - byte.grabDY);
      byte.lastSamples = [{ x: px, y: py, t: now() }];
      canvas.setPointerCapture(e.pointerId);
    } else {
      life.pointer.kind = 'follow';
      followTouch(px, py);
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
    if (home.travel) return;
    const handRect = canvas.getBoundingClientRect();
    const handPoint = obby.hasLaunched ? crystal.unproject(e.clientX - handRect.left, e.clientY - handRect.top) : { x: e.clientX - handRect.left, y: e.clientY - handRect.top };
    if (home.moveHand(handPoint.x, handPoint.y - (obby.hasLaunched ? obby.cameraY : 0), e.pointerId)) { e.preventDefault(); return; }
    if (byte.grabbed && e.pointerId !== life.pointer.id) return;
    if (life.pointer.active && e.pointerId === life.pointer.id) {
      const room = canvas.getBoundingClientRect();
      const x = e.clientX - room.left, y = e.clientY - room.top;
      const elapsed = Math.max(1, now() - life.pointer.movedAt) / 1000;
      life.pointer.speed = Math.hypot(x - life.pointer.x, y - life.pointer.y) / elapsed;
      if (Math.hypot(x - life.pointer.x, y - life.pointer.y) > 1) life.pointer.movedAt = now();
      life.pointer.x = x; life.pointer.y = y; life.gazeX = x; life.gazeY = y; life.lastTouch = now();
      if (life.pointer.kind === 'follow' && !obby.hasLaunched) { e.preventDefault(); followTouch(x, y); life.curious = .7; return; }
    }
    if ((obby.web.active || obby.web.pending) && e.pointerId === obby.web.pointerId) {
      if (obby.web.pending) { obby.web.screenX = e.clientX - handRect.left; obby.web.screenY = e.clientY - handRect.top; }
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
    if (home.endHand(e.pointerId, e.type !== 'pointerup')) {
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      return;
    }
    if (byte.grabbed && e.pointerId !== life.pointer.id) return;
    if (e.pointerId === life.pointer.id) { life.pointer.active = false; life.lastTouch = now(); life.curious = 1.7; }
    if ((obby.web.active || obby.web.pending) && e.pointerId === obby.web.pointerId) {
      obby.web.active = false; obby.web.pending = false;
      obby.web.pointerId = null;
      return;
    }
    if (web.active && !web.planted && e.pointerId === web.pointerId) {
      // pointerup may be the only event with the finger's final mobile position.
      // Cancellation coordinates may be zeroed by the browser; retain the last actual endpoint.
      if (e.type === 'pointerup' && Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) moveWebAnchor(e);
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
    if (!s.length || now() - s[s.length - 1].t > 120) byte.vx = byte.vy = 0;
    const releaseSpeed = Math.hypot(byte.vx, byte.vy);
    if (releaseSpeed > 450) { life.roughness = Math.min(1, life.roughness + releaseSpeed / 2400); life.afterToss = true; voice('toss', .75); tactile(.3); }
    else if (life.pet > .45) voice('pet', .5);
    byte.spin = clamp(byte.vx * .0012, -2, 2);
    if (Math.abs(byte.vx) > 30) byte.facing = byte.vx < 0 ? -1 : 1;
    byte.mode = 'air';
    byte.squash = .13;
    byte.lastSamples = [];
    if (e.type === 'pointerup') { const r = canvas.getBoundingClientRect(); home.afterByteRelease(e.clientX - r.left, e.clientY - r.top); }
  }

  canvas.addEventListener('pointerdown', beginDrag);
  // Captured events bubble here; these listeners also survive canvas capture loss on touch browsers.
  window.addEventListener('pointermove', moveDrag, { passive: false });
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  function update(dt, t) {
    if (home.travel) return;
    const g = 1650;
    const previousY = byte.y;
    byte.idlePhase += dt * 2.1;
    byte.squash *= Math.exp(-dt * 6);
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
    if ((web.active || life.nest.active) && byte.mode === 'idle') byte.mode = 'air';
    if (life.nest.active) { byte.vx *= Math.exp(-dt * 1.25); byte.vy *= Math.exp(-dt * 1.25); }
    if (earth.enabled && !obby.hasLaunched && ['air', 'idle', 'scuttle', 'scheming'].includes(byte.mode)) {
      updateEarthMotion(dt);
    } else if (byte.mode === 'scuttle' && byte.targetX !== null) {
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
    } else if (byte.mode === 'air') {
      if (obby.hasLaunched) byte.vx = clamp(byte.vx + earth.x * .72 * dt, -760, 760);
      byte.vy += g * dt;
      byte.x += byte.vx * dt; byte.y += byte.vy * dt;
      byte.angle += byte.spin * dt;
      byte.spin *= Math.exp(-dt * 1.5);
      if (!web.active && !life.nest.active && !obby.web.active) byte.angle *= Math.exp(-dt * .65);
      const extent = bodyHalfExtents();
      const minX = extent.x, maxX = world.w - extent.x;
      const floor = Math.min(floorY(), world.h - extent.y);
      if (byte.x < minX) {
        const incoming = Math.abs(byte.vx); byte.x = minX; byte.vx = incoming * .48;
        byte.spin += .65; impact(incoming, 'side');
      }
      if (byte.x > maxX) {
        const incoming = Math.abs(byte.vx); byte.x = maxX; byte.vx = -incoming * .48;
        byte.spin -= .65; impact(incoming, 'side');
      }
      if (!obby.hasLaunched && byte.y < extent.y) {
        const incoming = Math.abs(byte.vy); byte.y = extent.y; byte.vy = incoming * .42; impact(incoming, 'top');
      }
      if (!obby.hasLaunched && byte.y >= floor) {
        byte.y = floor;
        if (byte.vy > 135) { const incoming = byte.vy; byte.vy = -incoming * .31; byte.vx *= .83; impact(incoming, 'floor'); }
        else { byte.vy = 0; byte.mode = 'idle'; byte.angle *= .3; byte.vx *= .82; }
      }
      if (byte.mode === 'air' && byte.y >= floor && Math.abs(byte.vy) < 95) byte.mode = 'idle';
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
    if (earth.enabled && !obby.hasLaunched) resolveEarthBoundaries();
    solveObbyWeb();
    solveNestTether();
    if (!earth.enabled || obby.hasLaunched) {
      const extent = bodyHalfExtents();
      byte.x = clamp(byte.x, extent.x, world.w - extent.x);
      if (!obby.hasLaunched) byte.y = clamp(byte.y, extent.y, Math.min(floorY(), world.h - extent.y));
    }
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
    voice('land', clamp(speed / 600, .25, 1));
    if (speed > 330) tactile(speed / 1100);
    if (speed > 550) life.roughness = Math.min(1, life.roughness + .08);
    if (where === 'side') {
      // Horizontal impacts compress Byte across his width, then recover smoothly.
      byte.wallSquish = Math.max(byte.wallSquish, clamp(speed / 1800, .1, .55));
      return;
    }
    const kick = Math.min(.65, speed / 1400);
    byte.squash = Math.max(byte.squash, where === 'floor' ? kick : kick * .7);
    byte.stretch = 0;
  }

  function draw(t) {
    const cameraY = obby.hasLaunched ? obby.cameraY : 0;
    home.syncUI();
    if (obby.hasLaunched) {
      drawHabitat(t);
      crystal.draw();
      ctx.save(); crystal.applyView(); ctx.translate(0, -cameraY); home.draw(t); ctx.restore();
    } else home.draw(t);
    ctx.save();
    if (obby.hasLaunched) crystal.applyView();
    ctx.translate(obby.hasLaunched ? 0 : home.offset(1), obby.hasLaunched ? 0 : home.offsetY(1));
    drawOutside(t);
    ctx.restore();
    ctx.save(); if (obby.hasLaunched) crystal.applyView(); ctx.translate(obby.hasLaunched ? 0 : home.offset(3), obby.hasLaunched ? 0 : home.offsetY(3));
    drawPlatforms(); ctx.restore();
    ctx.save(); if (obby.hasLaunched) crystal.applyView(); ctx.translate(obby.hasLaunched ? 0 : home.offset(), obby.hasLaunched ? 0 : home.offsetY());
    drawNest();

    const { frame, frameW, bob, squeezeX, squeezeY, angle } = bodyGeometry(t);
    if (frame) {
      ctx.save();
      ctx.translate(byte.x, byte.y - cameraY + bob);
      ctx.rotate(angle);
      ctx.scale(byte.facing, 1);
      ctx.scale(squeezeX, squeezeY);
      ctx.drawImage(frame, -frameW / 2, -bodyH() / 2, frameW, bodyH());
      ctx.restore();
    }
    // Keep a planted endpoint above Byte's opaque artwork so its hit target stays visible.
    ctx.save(); ctx.translate(0, -cameraY); drawWeb(); ctx.restore();
    drawObbyWeb();
    drawButtonWeb();
    ctx.restore();
    ctx.save(); if (obby.hasLaunched) crystal.applyView(); home.drawThings(); ctx.restore();
  }

  document.addEventListener('visibilitychange', () => {
    lastTime = 0;
    if (document.hidden) {
      life.returnAt = now(); life.pointer.active = false;
      if (byte.grabbed) { byte.grabbed = false; byte.mode = 'air'; }
      if (web.active && !web.planted) { web.planted = true; web.pointerId = null; }
      obby.web.active = false; obby.web.pending = false; obby.web.pointerId = null;
      if (audio.ctx?.state === 'running') void audio.ctx.suspend();
    } else {
      if (life.phase === 'awake') { life.curious = 2; life.lastTouch = now(); }
      unlockAudio();
    }
  });
  // Runtime handles are available only to an explicitly enabled local QA harness.
  if (['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).has('probe')) {
    window.__byteProbe = { byte, earth, web, obby, autonomy, buttonWeb, buttonBody, life, world, audio, update, updateLife, updateAutonomy, updateButtonWeb, updateObby, updateButtonPhysics, beginRest, wakeByte, beginObby, enableEarthGravity, stopEarthGravity, spoolPosition, bodyHalfExtents, bodyGeometry, draw, readEarthGravity, floorY, bodyW, bodyH, halfW, halfH, finishObby, solveWebTether, solveObbyWeb, solveNestTether, constrainGrabbedByte, containRoomBody, room, outside, updateOutside, reactToRoom, roomPowerPoint, home, crystal };
  }

  function loop(t) {
    const dt = Math.min(.032, (t - (lastTime || t)) / 1000);
    lastTime = t;
    if (document.hidden) { requestAnimationFrame(loop); return; }
    if (window.__byteProbe?.paused) { draw(t); requestAnimationFrame(loop); return; }
    room.sample(t);
    updateOutside(dt, t);
    home.update(dt);
    update(dt, t);
    updateLife(dt);
    updateAutonomy(dt);
    updateButtonWeb(dt);
    updateObby(dt);
    updateButtonPhysics(dt);
    containRoomBody();
    draw(t);
    requestAnimationFrame(loop);
  }
  Promise.all([
    loadImage('assets/hq/idle.png'),
    loadImage('assets/hq/blink.png'),
    loadImage('assets/hq/curious.png'),
    loadFrames('hq/scuttle', 4),
    loadImage('assets/hq/scheming.png'),
  ]).then(([idle, blink, curious, walk, scheming]) => {
    assets.idle = idle; assets.blink = blink; assets.curious = curious; assets.walk = walk;
    assets.scheming = scheming;
    resize();
    byte.x = world.w * .4; byte.y = floorY(); byte.blinkAt = now() + 1400;
    if (!idle || !walk.every(Boolean)) { document.querySelector('#arrival').textContent = 'Byte could not arrive. Reload to try again.'; return; }
    document.querySelector('#arrival').classList.add('ready');
    requestAnimationFrame(loop);
  });
})();
