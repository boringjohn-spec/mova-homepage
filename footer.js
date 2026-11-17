/* =========================================================
   Mova footer — closing effect
   A field of flowing vertical lines with a blue glow at the top.
   Wherever a line passes through the giant "mova" wordmark it
   turns into a column of falling currency glyphs, so the logo is
   written by the lines themselves. The cursor parts the lines and
   lights the glyphs up.
   ========================================================= */
(() => {
  const box = document.querySelector('.ftr__fx');
  const cv = box && box.querySelector('.fx');
  if (!cv || !cv.getContext) return;

  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GL = '£€$¥₹₩₺₽¢%+=×→↗0123456789';
  const NG = GL.length;
  const WORD = 'mova';
  const FONT = (px, w = 600) => `${w} ${px}px Geist, "Helvetica Neue", Arial, sans-serif`;

  let W = 0, H = 0;
  let gap = 9, step = 4, every = 4, gfont = 11, R = 120;
  let mask = null, wordFs = 0, cols = [], seeds = null, rows = 0;
  let lineGrad = null, glowGrad = null;
  let running = false, raf = 0, introStart = 0, intro = reduce ? 1 : 0;
  const t0 = performance.now();
  const mouse = { x: -1e4, y: -1e4, on: 0, k: 0 };

  function size() {
    const r = box.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    if (!W || !H) return false;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const small = W < 700;
    gap = small ? 6 : 9;          // distance between lines
    step = small ? 5 : 4;         // vertical sampling of each line
    every = small ? 2 : 4;        // a glyph every N samples (10px / 16px)
    gfont = small ? 8.5 : 12;
    R = small ? 70 : 130;         // cursor radius

    // wordmark mask: spans the width, cropped by the bottom edge
    const m = document.createElement('canvas');
    m.width = W; m.height = H;
    const mc = m.getContext('2d');
    mc.font = FONT(100);
    const w100 = mc.measureText(WORD).width || 235;
    wordFs = Math.floor(100 * (W * 0.92) / w100);
    mc.font = FONT(wordFs);
    mc.textAlign = 'center'; mc.textBaseline = 'alphabetic'; mc.fillStyle = '#fff';
    mc.fillText(WORD, W / 2, H + wordFs * 0.08);
    const d = mc.getImageData(0, 0, W, H).data;
    mask = new Uint8Array(W * H);
    for (let i = 0, j = 3; i < mask.length; i++, j += 4) mask[i] = d[j] > 110 ? 1 : 0;

    cols = [];
    for (let x = gap / 2; x < W; x += gap) cols.push(x);
    rows = Math.ceil(H / step) + 1;
    seeds = new Uint16Array(cols.length * rows);
    for (let i = 0; i < seeds.length; i++) seeds[i] = (Math.random() * 997) | 0;

    lineGrad = ctx.createLinearGradient(0, 0, 0, H);
    lineGrad.addColorStop(0, 'rgba(206, 222, 255, 0.62)');
    lineGrad.addColorStop(0.42, 'rgba(255, 255, 255, 0.34)');
    lineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
    glowGrad = ctx.createLinearGradient(0, 0, 0, H);
    glowGrad.addColorStop(0, 'rgba(60, 106, 184, 0.9)');
    glowGrad.addColorStop(0.16, 'rgba(42, 76, 138, 0.5)');
    glowGrad.addColorStop(0.46, 'rgba(25, 28, 31, 0)');
    return true;
  }

  // x position of line `x0` at height `y`
  function xAt(x0, y, t) {
    const amp = 7 + 6 * Math.sin(x0 * 0.0045 + 0.8);
    let x = x0
      + Math.sin(y * 0.011 + x0 * 0.018 + t * 0.8) * amp * 0.55
      + Math.sin(y * 0.0042 - t * 0.45 + x0 * 0.0065) * amp
      + Math.sin(x0 * 0.009 + y * 0.005 - t * 0.35) * 9;
    if (mouse.k > 0.01) {
      const dx = x - mouse.x, dy = y - mouse.y;
      const f = Math.exp(-(dx * dx + dy * dy) / (2 * R * R));
      x += (dx / R) * f * 58 * mouse.k;   // part the lines around the cursor
    }
    return x;
  }

  const ease = p => 1 - Math.pow(1 - p, 3);

  function draw(t) {
    if (!mask) return;
    ctx.clearRect(0, 0, W, H);
    mouse.k += (mouse.on - mouse.k) * 0.09;

    // top glow
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, W, H);

    // the wordmark's body, barely there
    ctx.font = FONT(wordFs);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = `rgba(255, 255, 255, ${0.04 * intro})`;
    ctx.fillText(WORD, W / 2, H + wordFs * 0.08);

    // lines (one path), collecting glyph slots where they cross the wordmark
    const reach = intro * (H + 40);
    const glyphs = [];
    ctx.beginPath();
    for (let c = 0; c < cols.length; c++) {
      const x0 = cols[c];
      let pen = false;
      for (let k = 0; k < rows; k++) {
        const y = k * step;
        if (y > reach || y > H) break;
        const x = xAt(x0, y, t);
        const xi = x | 0, yi = y | 0;
        const inside = xi >= 0 && xi < W && yi < H && mask[yi * W + xi] === 1;
        if (inside) {
          pen = false;
          if (k % every === 0) glyphs.push(c * rows + k, x, y);
        } else if (!pen) { ctx.moveTo(x, y); pen = true; }
        else ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1;
    ctx.stroke();

    // glyphs: the lines become falling currency characters inside the letters
    const gIntro = Math.max(0, Math.min(1, (intro - 0.3) / 0.7));
    if (!gIntro) return;
    ctx.font = `500 ${gfont}px "Geist Mono", ui-monospace, Menlo, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const hot = [];
    ctx.fillStyle = '#f1f4fa';
    for (let i = 0; i < glyphs.length; i += 3) {
      const id = glyphs[i], x = glyphs[i + 1], y = glyphs[i + 2];
      const s = seeds[id];
      let m = 0;
      if (mouse.k > 0.01) {
        const dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < R * R) m = (1 - Math.sqrt(d2) / R) * mouse.k;
      }
      if (m > 0.15) { hot.push(x, y, s, m); continue; }
      // characters drift downwards along each line, like a slow stream
      const fall = Math.floor(t * (0.6 + (s % 7) * 0.22) + s);
      const sheen = Math.max(0, Math.sin((x * 0.7 + y) * 0.005 - t * 0.8));
      ctx.globalAlpha = (0.42 + 0.12 * Math.sin(t * 1.4 + s) + sheen * sheen * 0.4) * gIntro;
      ctx.fillText(GL[(s + fall) % NG], x, y);
    }
    ctx.fillStyle = '#9fc0ff';
    for (let i = 0; i < hot.length; i += 4) {
      const x = hot[i], y = hot[i + 1], s = hot[i + 2], m = hot[i + 3];
      ctx.globalAlpha = Math.min(1, 0.5 + m) * gIntro;
      ctx.fillText(GL[(s + Math.floor(t * 9 + m * 20)) % NG], x, y);
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    if (!running) return;
    if (introStart && intro < 1) intro = ease(Math.min(1, (now - introStart) / 1700));
    draw((now - t0) / 1000);
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (running || reduce) return;
    if (!introStart) introStart = performance.now();
    running = true;
    raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  const paint = () => draw(reduce ? 2 : (performance.now() - t0) / 1000);

  new IntersectionObserver(([en]) => (en.isIntersecting ? start() : stop()), { rootMargin: '60px' }).observe(box);

  box.addEventListener('pointermove', e => {
    const r = box.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = 1;
    if (reduce) { mouse.k = 1; paint(); }
  });
  box.addEventListener('pointerleave', () => { mouse.on = 0; if (reduce) { mouse.k = 0; paint(); } });

  let rz;
  new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => { if (size()) paint(); }, 120); }).observe(box);
  if (size()) paint();
  // the mask is drawn in Geist, so redo it once the font has loaded
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (size()) paint(); });
})();
