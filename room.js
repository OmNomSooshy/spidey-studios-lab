/* Through the Glass: local camera, microphone and phone sensing. No recordings or uploads. */
(() => {
  const button = document.querySelector('#room-window');
  const video = document.querySelector('#room-view');
  const caption = document.querySelector('#room-caption');
  const fallback = document.querySelector('#room-fallback');
  const state = {
    open: false, pending: false, camera: false, mic: false, motion: false, motionListening: false, suspended: false,
    brightness: .5, lightX: .5, lightY: .5, contrast: 0, color: [230, 211, 164], movement: 0, movementX: .5, movementY: .5,
    level: 0, breath: 0, soundId: 0, shadowId: 0, joltId: 0,
    darkFor: 0, listeningFor: 0, turnA: 0, turnRate: 0, inertiaX: 0, inertiaY: 0, breathX: 0, breathY: -1,
    battery: false, charging: false, powerLevel: 1, chargeId: 0, lastMotion: 0, lastFrame: 0, lastSound: -10000, lastShadow: -10000, lastJolt: -10000, ignoreUntil: 0,
  };
  let generation = 0, streams = [], context, analyser, source, silent, battery, motionTimer;
  let wave, spectrum, previousPixels, priorBrightness, priorLevel = 0, noise = .003;
  let windTime = 0, priorTurn = null, motionTime = 0, sampleTime = 0, cameraTime = 0;
  const sampleCanvas = document.createElement('canvas'); sampleCanvas.width = 32; sampleCanvas.height = 24;
  const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function sync(message = '') {
    button.classList.toggle('open', state.open);
    button.classList.toggle('pending', state.pending);
    button.setAttribute('aria-pressed', String(state.open));
    button.setAttribute('aria-label', state.open ? 'Close Bob’s camera and microphone window' : 'Let Bob see light, hear this room and feel the phone');
    caption.innerHTML = message || (state.open
      ? `<span>${state.camera && state.mic ? 'His window is open' : state.camera ? 'He can see the light' : state.mic ? 'He can hear you' : state.motion ? 'He can feel the phone' : 'Waiting for phone motion'}</span><small>On this phone only · tap the window to close</small>`
      : '<span>Open his window</span><small>Camera + mic + motion · on this phone only</small>');
    document.body.classList.toggle('room-open', state.open);
    document.body.classList.toggle('room-camera', state.camera);
    document.body.classList.toggle('room-partial', !fallback.hidden);
  }
  function close(message = '') {
    generation++; clearTimeout(motionTimer);
    streams.forEach(stream => stream.getTracks().forEach(track => track.stop())); streams = [];
    video.pause(); video.srcObject = null;
    source?.disconnect(); analyser?.disconnect(); silent?.disconnect();
    source = analyser = silent = null; wave = spectrum = null;
    if (context) { void context.close().catch(() => {}); context = null; }
    window.removeEventListener('devicemotion', processMotion);
    battery?.removeEventListener('chargingchange', batteryChanged); battery?.removeEventListener('levelchange', batteryChanged); battery = null; state.battery = false;
    Object.assign(state, { open: false, pending: false, camera: false, mic: false, motion: false, motionListening: false, suspended: false, level: 0, breath: 0, darkFor: 0, listeningFor: 0, turnA: 0, inertiaX: 0, inertiaY: 0, movement: 0, lastFrame: 0 });
    previousPixels = null; priorBrightness = undefined; priorTurn = null; motionTime = 0;
    fallback.hidden = true; sync(message);
    window.dispatchEvent(new Event('byte-room-closed'));
  }
  async function open(kind = 'both', motionPermission) {
    if (state.pending) return;
    if (state.open) { close(); return; }
    const ticket = ++generation;
    if (navigator.getBattery) void navigator.getBattery().then(value => {
      if (ticket !== generation) return;
      battery = value; processBattery(value, true);
      battery.addEventListener('chargingchange', batteryChanged); battery.addEventListener('levelchange', batteryChanged);
    }).catch(() => {});
    state.pending = true; fallback.hidden = true; sync('<span>Opening…</span><small>Your browser will ask for access</small>');
    // Both calls originate inside the same explicit user gesture (required by mobile Safari).
    const motionPromise = motionPermission ? motionPermission().catch(() => false) : Promise.resolve(false);
    if (kind !== 'camera') {
      try { context = new (window.AudioContext || window.webkitAudioContext)(); void context.resume().catch(() => {}); } catch (_) {}
    }
    let stream, mediaError;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Media capture unavailable');
      stream = await navigator.mediaDevices.getUserMedia({
        video: kind !== 'audio' ? { facingMode: 'user', width: { ideal: 160 }, height: { ideal: 120 }, frameRate: { ideal: 10 } } : false,
        audio: kind !== 'camera' ? { echoCancellation: true, noiseSuppression: false, autoGainControl: false } : false,
      });
    } catch (error) { mediaError = error; }
    const motionAllowed = await motionPromise;
    if (ticket !== generation) { stream?.getTracks().forEach(track => track.stop()); return; }
    if (motionAllowed) { window.addEventListener('devicemotion', processMotion, { passive: true }); state.motionListening = true; }
    if (stream) {
      streams.push(stream);
      state.camera = stream.getVideoTracks().length > 0;
      if (state.camera) {
        video.srcObject = new MediaStream(stream.getVideoTracks());
        try { await video.play(); } catch (_) { if (ticket === generation) state.camera = false; stream.getVideoTracks().forEach(track => track.stop()); }
        if (ticket !== generation) { stream.getTracks().forEach(track => track.stop()); return; }
      }
      if (stream.getAudioTracks().length && context) {
        try {
          analyser = context.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = .15;
          source = context.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
          silent = context.createGain(); silent.gain.value = 0;
          source.connect(analyser); analyser.connect(silent); silent.connect(context.destination);
          wave = new Float32Array(analyser.fftSize); spectrum = new Float32Array(analyser.frequencyBinCount);
          try { await context.resume(); } catch (_) {}
          if (ticket !== generation) { stream.getTracks().forEach(track => track.stop()); return; }
          state.mic = true;
        } catch (_) { state.mic = false; stream.getAudioTracks().forEach(track => track.stop()); }
      }
      if (stream.getAudioTracks().length && !state.mic) stream.getAudioTracks().forEach(track => track.stop());
      stream.getTracks().forEach(track => track.addEventListener('ended', () => {
        if (track.kind === 'video') state.camera = false; else state.mic = false;
        state.open = state.camera || state.mic || state.motionListening;
        sync('<span>A sense went quiet</span><small>Tap to close, then reopen the window</small>');
      }));
    }
    state.pending = false;
    state.open = state.camera || state.mic || state.motionListening;
    if (!state.mic && context) { void context.close().catch(() => {}); context = null; }
    if (!state.open) {
      battery?.removeEventListener('chargingchange', batteryChanged); battery?.removeEventListener('levelchange', batteryChanged); battery = null; state.battery = false;
    }
    sampleTime = performance.now(); priorLevel = 0; noise = .003; windTime = 0;
    if (mediaError) fallback.hidden = false;
    sync(mediaError ? '<span>Camera or mic stayed closed</span><small>You can try just one below</small>' : '');
    if (motionAllowed) motionTimer = setTimeout(() => {
      if (ticket !== generation || state.motion) return;
      state.motionListening = false; window.removeEventListener('devicemotion', processMotion);
      if (!state.camera && !state.mic) { close('<span>The window stayed closed</span><small>Try this link in Safari or Chrome</small>'); fallback.hidden = false; }
    }, 3000);
    return { camera: state.camera, mic: state.mic, motion: motionAllowed, error: mediaError?.name || null };
  }
  function processPixels(pixels, t, dt = .1) {
    const count = pixels.length / 4, values = new Float32Array(count);
    let sum = 0, square = 0, lightWeight = 0, lightPosition = 0, lightHeight = 0, red = 0, green = 0, blue = 0, meanDelta = 0;
    for (let i = 0; i < count; i++) {
      const n = i * 4, l = (.2126 * pixels[n] + .7152 * pixels[n + 1] + .0722 * pixels[n + 2]) / 255;
      values[i] = l; sum += l; square += l * l;
      const weight = l * l * l;
      lightWeight += weight; lightPosition += weight * (i % 32) / 31; lightHeight += weight * Math.floor(i / 32) / 23;
      red += pixels[n]; green += pixels[n + 1]; blue += pixels[n + 2];
      if (previousPixels) meanDelta += l - previousPixels[i];
    }
    const brightness = sum / count, contrast = Math.sqrt(Math.max(0, square / count - brightness * brightness));
    meanDelta /= count;
    let change = 0, changeX = 0, changeY = 0;
    if (previousPixels) for (let i = 0; i < count; i++) {
      const d = Math.abs(values[i] - previousPixels[i] - meanDelta);
      change += d; changeX += d * (i % 32) / 31; changeY += d * Math.floor(i / 32) / 23;
    }
    const blend = 1 - Math.exp(-dt / .3);
    state.brightness += (brightness - state.brightness) * blend;
    state.contrast = contrast;
    state.lightX += ((contrast > .045 && lightWeight ? 1 - lightPosition / lightWeight : .5) - state.lightX) * blend;
    state.lightY += ((contrast > .045 && lightWeight ? lightHeight / lightWeight : .5) - state.lightY) * blend;
    state.color = state.color.map((v, i) => v + ([red, green, blue][i] / count - v) * blend);
    state.movement = change / count;
    state.movementX = change > .01 ? 1 - changeX / change : .5;
    state.movementY = change > .01 ? changeY / change : .5;
    if (priorBrightness !== undefined && priorBrightness - brightness > .15 && t - state.lastShadow > 2200) { state.shadowId++; state.lastShadow = t; }
    state.darkFor = brightness < .075 ? state.darkFor + dt : brightness > .13 ? 0 : state.darkFor;
    priorBrightness = brightness; previousPixels = values; state.lastFrame = t;
  }
  function processAudio(waveform, frequencies, sampleRate, t, dt = 1 / 60) {
    let energy = 0, mean = 0; for (const value of waveform) { energy += value * value; mean += value; }
    mean /= waveform.length;
    const rms = Math.sqrt(Math.max(0, energy / waveform.length - mean * mean));
    if (rms < noise * 3 + .02) noise += (rms - noise) * .006;
    let low = 0, total = 0, sumLog = 0, count = 0;
    for (let i = 1; i < frequencies.length; i++) {
      const hz = i * sampleRate / (frequencies.length * 2);
      if (hz < 60 || hz > 5000) continue;
      const power = Math.max(1e-12, 10 ** (frequencies[i] / 10));
      total += power; if (hz < 800) low += power;
      if (hz < 2800) { sumLog += Math.log(power); count++; }
    }
    // A harmonic voice and broad turbulent breath are different pressures, not recognized words.
    let flatSum = 0;
    for (let i = 1; i < frequencies.length; i++) { const hz = i * sampleRate / (frequencies.length * 2); if (hz >= 60 && hz < 2800) flatSum += Math.max(1e-12, 10 ** (frequencies[i] / 10)); }
    const flatness = count && flatSum ? Math.exp(sumLog / count) / (flatSum / count) : 0;
    // Suppress our own narrow tones, while leaving loud external claps and turbulent breath audible.
    const broadInput = flatness > .12 && rms > Math.max(.025, noise * 2.5);
    const audible = t > state.ignoreUntil || broadInput;
    const wind = audible && rms > Math.max(.025, noise * 2.5) && ((low / Math.max(total, 1e-12) > .56 && flatness > .12) || (flatness > .4 && rms > .055));
    windTime = wind ? windTime + dt : Math.max(0, windTime - dt * 3);
    const strength = windTime > .12 ? clamp((rms - .02) / .085, 0, 1) : 0;
    state.breath += (strength - state.breath) * (1 - Math.exp(-dt / (strength > state.breath ? .12 : .25)));
    state.level = audible ? rms : 0;
    state.listeningFor = audible && rms > Math.max(.009, noise * 1.7) && !wind ? state.listeningFor + dt : Math.max(0, state.listeningFor - dt * 2);
    if (audible && rms > Math.max(.045, noise * 4) && rms - priorLevel > .025 && t - state.lastSound > 1800) { state.soundId++; state.lastSound = t; }
    priorLevel = rms;
  }
  function processBattery(value, initial = false) {
    if (!initial && value.charging !== state.charging) state.chargeId++;
    state.battery = true; state.charging = value.charging;
    state.powerLevel = Number.isFinite(value.level) ? value.level : 1;
  }
  function batteryChanged() { if (battery) processBattery(battery); }
  function processMotion(event) {
    const t = performance.now(), interval = Math.max(.01, Math.min(.1, (t - motionTime) / 1000 || .016));
    const angle = ((screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI / 180);
    const reading = event.acceleration;
    const rotation = event.rotationRate;
    const linearValid = reading && Number.isFinite(reading.x) && Number.isFinite(reading.y);
    const rotationValid = rotation && Number.isFinite(rotation.gamma);
    if (!linearValid && !rotationValid) return;
    const firstMotion = !state.motion; state.motion = true; clearTimeout(motionTimer);
    if (firstMotion && !state.camera && !state.mic) sync();
    if (reading && Number.isFinite(reading.x) && Number.isFinite(reading.y)) {
      const x = -reading.x, y = reading.y;
      state.inertiaX = Math.hypot(x, y) < .25 ? 0 : clamp((Math.cos(angle) * x - Math.sin(angle) * y) * 85, -1800, 1800);
      state.inertiaY = Math.hypot(x, y) < .25 ? 0 : clamp((Math.sin(angle) * x + Math.cos(angle) * y) * 85, -1800, 1800);
      if (Math.hypot(reading.x, reading.y, reading.z || 0) > 3.8 && t - state.lastJolt > 1800) { state.joltId++; state.lastJolt = t; }
    }
    // DeviceMotion's gamma is local Z (perpendicular to the screen); its names differ from DeviceOrientation.
    if (rotation && Number.isFinite(rotation.gamma)) {
      const turn = clamp(rotation.gamma * Math.PI / 180, -12, 12);
      const filtered = priorTurn === null ? turn : priorTurn + (turn - priorTurn) * (1 - Math.exp(-interval / .06));
      const acceleration = priorTurn === null ? 0 : clamp((filtered - priorTurn) / interval, -25, 25);
      state.turnA = Math.abs(acceleration) < .7 ? 0 : acceleration;
      state.turnRate = filtered; priorTurn = filtered;
    }
    motionTime = t; state.lastMotion = t;
  }
  function sample(t) {
    if (!state.open || state.suspended) return;
    const dt = Math.min(.1, Math.max(.001, (t - sampleTime) / 1000)); sampleTime = t;
    const angle = (screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI / 180;
    state.breathX = Math.sin(angle); state.breathY = -Math.cos(angle);
    if (state.camera && video.readyState >= 2 && t - cameraTime >= 100) {
      try { sampleContext.drawImage(video, 0, 0, 32, 24); processPixels(sampleContext.getImageData(0, 0, 32, 24).data, t, Math.min(.2, (t - cameraTime) / 1000 || .1)); cameraTime = t; } catch (_) {}
    }
    if (state.mic && analyser && context?.state === 'running') {
      analyser.getFloatTimeDomainData(wave); analyser.getFloatFrequencyData(spectrum); processAudio(wave, spectrum, context.sampleRate, t, dt);
    }
    if (t - state.lastMotion > 180) { state.turnA *= Math.exp(-dt * 16); state.inertiaX *= Math.exp(-dt * 16); state.inertiaY *= Math.exp(-dt * 16); }
    button.style.setProperty('--listen', Math.min(1, state.level * 8));
    button.style.setProperty('--window-color', `rgb(${state.color.map(Math.round).join(',')})`);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (state.open || state.pending)) { close('<span>His window rested too</span><small>Tap to reopen camera and microphone</small>'); }
  });
  window.addEventListener('pagehide', () => close());
  document.addEventListener('pointerdown', () => { if (state.open && context?.state === 'suspended') void context.resume().catch(() => {}); }, { passive: true });
  window.ByteRoom = { state, open, close, sample, processPixels, processAudio, processMotion, processBattery,
    ignoreSound(duration) { state.ignoreUntil = performance.now() + duration; },
    available: { media: !!navigator.mediaDevices?.getUserMedia, motion: 'DeviceMotionEvent' in window },
  };
  sync();
})();
