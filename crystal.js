/* Crystal Sky: one world-fixed icy plane, with a distant sky seen through its facets. */
window.createCrystalSky = function createCrystalSky({ ctx, world, obby }) {
  const sky = document.createElement('canvas'), paint = sky.getContext('2d');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  const hash = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7 + 19.4) * 43758.5453; return n - Math.floor(n); };
  const pad = 18;
  let width = 0, height = 0, pixels = 1, skyPattern;
  function view() {
    const height = -obby.cameraY / Math.max(1, world.h);
    // Pull back enough to see the roof as a building, then restore ordinary traversal framing.
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
  function drawSky(t, darkness) {
    const w = world.w, h = world.h;
    // Background material is prepared at CSS-pixel resolution; Byte and rope stay at native DPR.
    const dpr = 1;
    if (width !== w || height !== h || pixels !== dpr) {
      width = w; height = h; pixels = dpr; sky.width = Math.ceil((w + pad * 2) * dpr); sky.height = Math.ceil((h + pad * 2) * dpr);
    }
    paint.setTransform(dpr, 0, 0, dpr, pad * dpr, pad * dpr);
    const altitude = clamp(-obby.cameraY / (h * 10), 0, 1);
    const mix = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
    const tone = (day, night) => `rgb(${mix(mix(day, day.map(v => v * (.83 + altitude * .08)), altitude), night, darkness).map(Math.round).join(',')})`;
    const g = paint.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, tone([119,169,191], [32,50,65])); g.addColorStop(.62, tone([171,206,214], [51,72,84])); g.addColorStop(1, tone([219,231,218], [78,92,97]));
    paint.fillStyle = g; paint.fillRect(-pad, -pad, w + pad * 2, h + pad * 2);
    // World-space clouds at a much greater depth: camera travel moves them only 12% as far.
    const distantCamera = obby.cameraY * .12, period = h * 1.55;
    const first = Math.floor((distantCamera - h) / period), last = Math.ceil((distantCamera + h * 2) / period);
    for (let row = first; row <= last; row++) for (let i = 0; i < 3; i++) {
      const x = (hash(row, i) * 1.5 - .25) * w + Math.sin(t * .000025 + i + row) * 10;
      const y = row * period + i * h * .44 - distantCamera;
      const size = w * (.22 + hash(row + 4, i) * .19);
      paint.fillStyle = `rgba(253,249,229,${(.28 + hash(row, i + 8) * .2) * (1 - darkness) + .035})`;
      paint.beginPath(); paint.ellipse(x, y, size, 13, 0, 0, Math.PI * 2); paint.ellipse(x - size * .23, y - 9, size * .52, 24, 0, 0, Math.PI * 2); paint.ellipse(x + size * .28, y - 5, size * .4, 18, 0, 0, Math.PI * 2); paint.fill();
    }
    ctx.drawImage(sky, -pad, -pad, w + pad * 2, h + pad * 2);
  }
  function opening(x, y, w, h) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);
    ctx.drawImage(sky, -pad, -pad, world.w + pad * 2, world.h + pad * 2); ctx.restore();
  }
  function point(row, col) {
    const xs = [-.22, .16, .5, .84, 1.22];
    const edge = [-.08, .045, -.065, .04, -.08];
    return { x: (xs[col] + (row ? (hash(row, col) - .5) * .14 : 0)) * world.w,
      y: obby.crystalBase - row * world.h * .53 + (row ? (hash(row + 31, col) - .5) * world.h * .2 : edge[col] * world.h) };
  }
  function edgeAt(x) {
    for (let col = 0; col < 4; col++) {
      const a = point(0, col), b = point(0, col + 1);
      if (x <= b.x) return a.y + (b.y - a.y) * clamp((x - a.x) / (b.x - a.x), 0, 1);
    }
    return point(0, 4).y;
  }
  function contains(x, y) { return obby.hasLaunched && x >= 0 && x <= world.w && y <= edgeAt(x); }
  function visible() { return obby.hasLaunched && project(world.w * .16, point(0, 1).y).y > 0; }
  function triangle(vertices, row, col, half) {
    const pts = vertices.map(v => project(v.x, v.y));
    if (Math.max(...pts.map(p => p.y)) < -8 || Math.min(...pts.map(p => p.y)) > world.h + 8) return;
    const light = hash(row * 2 + half, col + 67);
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    // Each fixed facet samples a slightly displaced part of the actual moving sky buffer.
    // Refraction therefore travels with the crystal instead of tinting the camera.
    const dx = (hash(row * 3 + half, col) - .5) * 13, dy = (hash(row + 57, col + half) - .5) * 10;
    // A few large optical faces bend the sky. The remaining facets are inexpensive translucent fills.
    if (light > .78) {
      skyPattern.setTransform(new DOMMatrix().translate(-pad + dx, -pad + dy));
      ctx.fillStyle = skyPattern; ctx.fill();
    }
    const tint = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[2].x, pts[2].y + 1);
    tint.addColorStop(0, `rgba(176,231,232,${.19 + light * .19})`); tint.addColorStop(1, `rgba(67,149,175,${.13 + (1 - light) * .13})`);
    ctx.fillStyle = tint; ctx.fill();
    ctx.strokeStyle = `rgba(230,255,250,${.16 + light * .18})`; ctx.lineWidth = light > .8 ? 1.6 : .8; ctx.stroke();
    if (light > .68) {
      const a = pts[0], b = pts[1], c = pts[2], mx = (a.x + b.x + c.x) / 3, my = (a.y + b.y + c.y) / 3;
      ctx.strokeStyle = '#e8fff069'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mx, my); ctx.lineTo(mx + (c.x - mx) * .47, my + (c.y - my) * .47);
      ctx.moveTo(mx, my); ctx.lineTo(mx + (b.x - mx) * .25, my + (b.y - my) * .25); ctx.stroke();
    }
  }
  function draw() {
    if (!obby.hasLaunched) return;
    skyPattern = ctx.createPattern(sky, 'no-repeat');
    const band = world.h * .53;
    const first = Math.max(0, Math.floor((obby.crystalBase - obby.cameraY - world.h * 1.3) / band) - 1);
    const last = Math.max(0, Math.ceil((obby.crystalBase - obby.cameraY + world.h * .3) / band) + 1);
    for (let row = first; row < last; row++) for (let col = 0; col < 4; col++) {
      const a = point(row, col), b = point(row, col + 1), c = point(row + 1, col), d = point(row + 1, col + 1);
      if (hash(row, col + 4) > .5) { triangle([a, b, c], row, col, 0); triangle([b, d, c], row, col, 1); }
      else { triangle([a, b, d], row, col, 0); triangle([a, d, c], row, col, 1); }
    }
    // The bottom is a fractured edge, not a rectangle or a fade glued to the viewport.
    ctx.beginPath(); for (let col = 0; col < 5; col++) { const p = point(0, col), s = project(p.x, p.y); col ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); }
    ctx.strokeStyle = '#c9f7eb'; ctx.lineWidth = 3; ctx.stroke();
  }
  return { drawSky, draw, opening, view, project, unproject, applyView, contains, visible, edgeAt };
};
