/* Crystal Sky: cached world-fixed ice, with a distant sky and bounded optical refresh. */
window.createCrystalSky = function createCrystalSky({ ctx, world, obby }) {
  const backdrop = document.createElement('div'); backdrop.id = 'crystal-scenery'; backdrop.setAttribute('aria-hidden', 'true');
  ctx.canvas.before(backdrop);
  const sky = document.createElement('canvas'), paint = sky.getContext('2d');
  const optical = document.createElement('canvas'), optics = optical.getContext('2d');
  const material = document.createElement('div'); material.className = 'crystal-material';
  sky.className = 'crystal-sky'; optical.className = 'crystal-optical'; optical.style.opacity = '.7';
  backdrop.append(sky, material); material.append(optical);
  const tiles = new Map();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  const hash = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7 + 19.4) * 43758.5453; return n - Math.floor(n); };
  // Scenery is rasterized independently of phone DPR. Creature, ropes and ledges stay sharp.
  const skyScale = .45, tileScale = .6, opticalScale = .35;
  let width = 0, height = 0, pad = 0, margin = 0;
  let skyTime = -Infinity, skyCamera = 0, skyDarkness = -1, opticalTime = -Infinity, opticalCamera = 0, opticalBase = NaN;
  let lastTime = 0, skyBuilds = 0, tileBuilds = 0, opticalBuilds = 0;
  function view() {
    const height = -obby.cameraY / Math.max(1, world.h);
    const scale = obby.hasLaunched ? 1 - .14 * smooth(height / .55) * (1 - smooth((height - 1.25) / .6)) : 1;
    return { scale, x: world.w * .5, y: world.h * .38 };
  }
  function project(x, y) {
    const v = view(); return { x: v.x + (x - v.x) * v.scale, y: v.y + (y - obby.cameraY - v.y) * v.scale };
  }
  function unproject(x, y) {
    const v = view(); return { x: v.x + (x - v.x) / v.scale, y: v.y + (y - v.y) / v.scale + obby.cameraY };
  }
  function applyView() {
    const v = view(); ctx.translate(v.x, v.y); ctx.scale(v.scale, v.scale); ctx.translate(-v.x, -v.y);
  }
  function resize() {
    if (width === world.w && height === world.h) return;
    width = world.w; height = world.h; pad = height * .35; margin = height * .28;
    sky.width = Math.ceil(width * skyScale); sky.height = Math.ceil((height + pad * 2) * skyScale);
    optical.width = Math.ceil(width * opticalScale); optical.height = Math.ceil((height + margin * 2) * opticalScale);
    sky.style.width = optical.style.width = `${width}px`;
    sky.style.height = `${sky.height / skyScale}px`; optical.style.height = `${optical.height / opticalScale}px`;
    for (const v of tiles.values()) { v.image.remove(); v.image.width = v.mask.width = 0; }
    tiles.clear(); skyTime = opticalTime = -Infinity; opticalBase = NaN;
  }
  function rebuildSky(t, darkness) {
    skyTime = t; skyCamera = obby.cameraY; skyDarkness = darkness; skyBuilds++;
    const w = world.w, h = world.h;
    paint.setTransform(skyScale, 0, 0, skyScale, 0, pad * skyScale);
    const altitude = clamp(-obby.cameraY / (h * 10), 0, 1);
    const mix = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
    const tone = (day, night) => `rgb(${mix(mix(day, day.map(v => v * (.83 + altitude * .08)), altitude), night, darkness).map(Math.round).join(',')})`;
    const g = paint.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, tone([119,169,191], [32,50,65])); g.addColorStop(.62, tone([171,206,214], [51,72,84])); g.addColorStop(1, tone([219,231,218], [78,92,97]));
    paint.fillStyle = g; paint.fillRect(0, -pad, w, h + pad * 2);
    const distantCamera = skyCamera * .12, period = h * 1.55;
    const first = Math.floor((distantCamera - pad - h) / period), last = Math.ceil((distantCamera + h + pad) / period);
    for (let row = first; row <= last; row++) for (let i = 0; i < 3; i++) {
      const x = (hash(row, i) * 1.5 - .25) * w + Math.sin(t * .000025 + i + row) * 10;
      const y = row * period + i * h * .44 - distantCamera;
      const size = w * (.22 + hash(row + 4, i) * .19);
      paint.fillStyle = `rgba(253,249,229,${(.28 + hash(row, i + 8) * .2) * (1 - darkness) + .035})`;
      paint.beginPath(); paint.ellipse(x, y, size, 13, 0, 0, Math.PI * 2); paint.ellipse(x - size * .23, y - 9, size * .52, 24, 0, 0, Math.PI * 2); paint.ellipse(x + size * .28, y - 5, size * .4, 18, 0, 0, Math.PI * 2); paint.fill();
    }
  }
  function presentSky(target, camera, top = 0, shiftX = 0, shiftY = 0) {
    const y = -pad - (camera - skyCamera) * .12 + top + shiftY;
    target.drawImage(sky, shiftX, y, width, sky.height / skyScale);
  }
  function drawSky(t, darkness) {
    resize(); lastTime = t;
    // Between refreshes the cached sky still translates continuously at its distant depth.
    if (!Number.isFinite(skyTime) || Math.abs(obby.cameraY - skyCamera) * .12 > pad * .65 || Math.abs(darkness - skyDarkness) > .025 ||
        t - skyTime > 500 && (Math.abs(obby.cameraY - skyCamera) > 3 || t - skyTime > 2000)) rebuildSky(t, darkness);
    // Compositor translation reuses the bitmap; the high-DPR creature canvas never
    // receives full-screen ice/sky copies. Camera movement remains continuous each animation frame.
    sky.style.transform = `translateY(${-pad - (obby.cameraY - skyCamera) * .12}px)`;
  }
  function opening(x, y, w, h) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.setTransform(world.dpr, 0, 0, world.dpr, 0, 0); presentSky(ctx, obby.cameraY); ctx.restore();
  }
  function point(row, col) {
    const xs = [-.22, .16, .5, .84, 1.22], edge = [-.08, .045, -.065, .04, -.08];
    return { x: (xs[col] + (row ? (hash(row, col) - .5) * .14 : 0)) * world.w,
      y: -row * world.h * .53 + (row ? (hash(row + 31, col) - .5) * world.h * .2 : edge[col] * world.h) };
  }
  function edgeAt(x) {
    for (let col = 0; col < 4; col++) {
      const a = point(0, col), b = point(0, col + 1);
      if (x <= b.x) return obby.crystalBase + a.y + (b.y - a.y) * clamp((x - a.x) / (b.x - a.x), 0, 1);
    }
    return obby.crystalBase + point(0, 4).y;
  }
  function contains(x, y) { return obby.hasLaunched && x >= 0 && x <= world.w && y <= edgeAt(x); }
  function visible() { return obby.hasLaunched && project(world.w * .16, edgeAt(world.w * .16)).y > 0; }
  function triangle(target, mask, pts, row, col, half) {
    const light = hash(row * 2 + half, col + 67);
    for (const p of [target, mask]) { p.beginPath(); pts.forEach((v, i) => i ? p.lineTo(v.x, v.y) : p.moveTo(v.x, v.y)); p.closePath(); }
    if (light > .78) { mask.fillStyle = '#fff'; mask.fill(); }
    const tint = target.createLinearGradient(pts[0].x, pts[0].y, pts[2].x, pts[2].y + 1);
    tint.addColorStop(0, `rgba(176,231,232,${.19 + light * .19})`); tint.addColorStop(1, `rgba(67,149,175,${.13 + (1 - light) * .13})`);
    target.fillStyle = tint; target.fill();
    target.strokeStyle = `rgba(230,255,250,${.16 + light * .18})`; target.lineWidth = light > .8 ? 1.6 : .8; target.stroke();
    if (light > .68) {
      const [a, b, c] = pts, mx = (a.x + b.x + c.x) / 3, my = (a.y + b.y + c.y) / 3;
      target.strokeStyle = '#e8fff069'; target.lineWidth = 1; target.beginPath(); target.moveTo(a.x, a.y); target.lineTo(mx, my); target.lineTo(mx + (c.x - mx) * .47, my + (c.y - my) * .47);
      target.moveTo(mx, my); target.lineTo(mx + (b.x - mx) * .25, my + (b.y - my) * .25); target.stroke();
    }
  }
  function tile(row) {
    if (tiles.has(row)) { const value = tiles.get(row); tiles.delete(row); tiles.set(row, value); return value; }
    const image = document.createElement('canvas'), mask = document.createElement('canvas');
    const x = -world.w * .3, y = -(row + 1) * world.h * .53 - world.h * .105, w = world.w * 1.6, h = world.h * .74;
    image.width = mask.width = Math.ceil(w * tileScale); image.height = mask.height = Math.ceil(h * tileScale);
    const target = image.getContext('2d'), stencil = mask.getContext('2d');
    for (const p of [target, stencil]) p.setTransform(tileScale, 0, 0, tileScale, -x * tileScale, -y * tileScale);
    for (let col = 0; col < 4; col++) {
      const a = point(row, col), b = point(row, col + 1), c = point(row + 1, col), d = point(row + 1, col + 1);
      if (hash(row, col + 4) > .5) { triangle(target, stencil, [a, b, c], row, col, 0); triangle(target, stencil, [b, d, c], row, col, 1); }
      else { triangle(target, stencil, [a, b, d], row, col, 0); triangle(target, stencil, [a, d, c], row, col, 1); }
    }
    if (!row) {
      target.beginPath(); for (let col = 0; col < 5; col++) { const p = point(0, col); col ? target.lineTo(p.x, p.y) : target.moveTo(p.x, p.y); }
      target.strokeStyle = '#c9f7eb'; target.lineWidth = 3; target.stroke();
    }
    const value = { image, mask, x, y, w: image.width / tileScale, h: image.height / tileScale };
    image.className = 'crystal-band'; image.style.left = `${x}px`; image.style.width = `${value.w}px`; image.style.height = `${value.h}px`;
    image.style.top = `${obby.crystalBase + y}px`; value.base = obby.crystalBase;
    tiles.set(row, value); tileBuilds++;
    // Fixed memory ceiling, even on long expeditions. Recently visible rows retain their raster.
    while (tiles.size > 8) { const key = tiles.keys().next().value, old = tiles.get(key); old.image.remove(); old.image.width = old.mask.width = 0; tiles.delete(key); }
    return value;
  }
  function rows(extra = 0) {
    const band = world.h * .53;
    return { first: Math.max(0, Math.floor((obby.crystalBase - obby.cameraY - world.h - extra) / band) - 1),
      last: Math.max(0, Math.ceil((obby.crystalBase - obby.cameraY + extra) / band) + 1) };
  }
  function rebuildOptics() {
    opticalTime = lastTime; opticalCamera = obby.cameraY; opticalBase = obby.crystalBase; opticalBuilds++;
    optical.style.top = `${opticalCamera - margin}px`;
    optics.setTransform(1, 0, 0, 1, 0, 0); optics.clearRect(0, 0, optical.width, optical.height);
    optics.setTransform(opticalScale, 0, 0, opticalScale, 0, margin * opticalScale);
    // Reuse a sky bitmap, displaced inside cached facet masks. No CanvasPattern, per-face
    // transformed sampling, geometry or gradient work enters the ordinary frame loop.
    presentSky(optics, opticalCamera, 0, 7, -4);
    // One complete mask is necessary: multiple destination-in operations would intersect bands.
    const r = rows(margin), stencils = [];
    for (let row = r.first; row < r.last; row++) stencils.push(tile(row));
    // Reuse an optical-size mask scratch, allocated only at resize.
    if (!optical.stencil) optical.stencil = document.createElement('canvas');
    const mask = optical.stencil;
    if (mask.width !== optical.width || mask.height !== optical.height) { mask.width = optical.width; mask.height = optical.height; }
    const p = mask.getContext('2d'); p.setTransform(1, 0, 0, 1, 0, 0); p.clearRect(0, 0, mask.width, mask.height);
    p.setTransform(opticalScale, 0, 0, opticalScale, 0, margin * opticalScale);
    for (const v of stencils) p.drawImage(v.mask, v.x, obby.crystalBase + v.y - opticalCamera, v.w, v.h);
    optics.setTransform(1, 0, 0, 1, 0, 0); optics.globalCompositeOperation = 'destination-in'; optics.drawImage(mask, 0, 0); optics.globalCompositeOperation = 'source-over';
  }
  function draw() {
    if (!obby.hasLaunched) return;
    resize();
    const v = view();
    material.style.transform = `matrix(${v.scale},0,0,${v.scale},${v.x * (1 - v.scale)},${v.y * (1 - v.scale) - obby.cameraY * v.scale})`;
    for (const tile of tiles.values()) if (tile.base !== obby.crystalBase) { tile.base = obby.crystalBase; tile.image.style.top = `${obby.crystalBase + tile.y}px`; }
    const r = rows(), visibleTiles = [];
    // Spend the clear-sky interval preparing one band per frame, instead of building
    // the arriving structure in one long task. Nothing is drawn into empty sky.
    if (r.last === 0) { for (let row = 0; row < 4; row++) if (!tiles.has(row)) { tile(row); break; } }
    for (let row = r.first; row < r.last; row++) visibleTiles.push(tile(row));
    // Cached offscreen bands stay out of the composited tree. The visible structure
    // does not grow one enormous browser layer as an expedition gets higher.
    for (const tile of tiles.values()) {
      if (visibleTiles.includes(tile)) { if (tile.image.parentNode !== material) material.append(tile.image); }
      else tile.image.remove();
    }
    material.style.visibility = visibleTiles.length ? 'visible' : 'hidden';
    if (!visibleTiles.length) return;
    if (opticalBase !== obby.crystalBase || Math.abs(obby.cameraY - opticalCamera) > margin * .65 ||
        lastTime - opticalTime > 250 && (Math.abs(obby.cameraY - opticalCamera) > 4 || skyTime > opticalTime)) rebuildOptics();
  }
  const stats = () => ({ skyBuilds, tileBuilds, opticalBuilds, cachedTiles: tiles.size,
    bitmapBytes: (sky.width * sky.height + optical.width * optical.height * 2 + [...tiles.values()].reduce((n, v) => n + v.image.width * v.image.height * 2, 0)) * 4 });
  return { drawSky, draw, opening, view, project, unproject, applyView, contains, visible, edgeAt, stats };
};
