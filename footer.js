/* =========================================================
   Mova footer — currency-glyph field, live clocks, newsletter,
   scramble nav, and the G (grid) / C (colour) shortcuts
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const footer = $('#footer');
  if (!footer) return;

  /* ---------- accent colour (C) ---------- */
  const ACCENTS = ['#4f7cff', '#ff5a1f', '#2bd17e', '#f5c542', '#c46bff'];
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ');
  let accentIx = 0;
  try { accentIx = Math.max(0, ACCENTS.indexOf(localStorage.getItem('mova-accent'))); } catch (e) { /* storage blocked */ }
  function setAccent(i) {
    accentIx = (i + ACCENTS.length) % ACCENTS.length;
    const c = ACCENTS[accentIx];
    root.style.setProperty('--accent', c);
    root.style.setProperty('--accent-rgb', hexRgb(c));
    try { localStorage.setItem('mova-accent', c); } catch (e) { /* ignore */ }
    if (field) field.paintOnce();
  }

  /* ---------- grid overlay (G) ---------- */
  const gridlay = $('.gridlay');
  const gridKey = $('.key[data-key="g"]');
  function toggleGrid(force) {
    const on = typeof force === 'boolean' ? force : !gridlay.classList.contains('is-on');
    gridlay.classList.toggle('is-on', on);
    gridKey.setAttribute('aria-pressed', on);
  }

  const flash = key => { const k = $(`.key[data-key="${key}"]`); if (!k) return; k.classList.add('flash'); setTimeout(() => k.classList.remove('flash'), 220); };
  $$('.key').forEach(k => k.addEventListener('click', () => {
    if (k.dataset.key === 'g') toggleGrid();
    else { setAccent(accentIx + 1); flash('c'); }
  }));
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    const k = e.key.toLowerCase();
    if (k === 'g') { toggleGrid(); flash('g'); }
    else if (k === 'c') { setAccent(accentIx + 1); flash('c'); }
    else if (k === 'escape' && gridlay.classList.contains('is-on')) toggleGrid(false);
  });

  /* ---------- live clocks ---------- */
  const clocks = $$('.clocks [data-tz]');
  function tickClocks() {
    const now = new Date();
    clocks.forEach(el => {
      let hm = '--:--';
      try { hm = new Intl.DateTimeFormat('en-GB', { timeZone: el.dataset.tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now); } catch (e) { /* old engine */ }
      el.innerHTML = `${el.dataset.city} <b>${hm}</b>`;
    });
  }
  tickClocks();
  setInterval(tickClocks, 15000);

  /* ---------- newsletter (local only, nothing is sent) ---------- */
  const form = $('.news');
  const email = $('#news-email');
  const note = $('.news__note');
  const plus = $('.news__plus');
  const topics = $('.news__topics');
  plus.addEventListener('click', () => {
    const open = topics.hidden;
    topics.hidden = !open;
    plus.setAttribute('aria-expanded', open);
    plus.textContent = open ? '−' : '+';
  });
  email.addEventListener('input', () => email.classList.remove('is-bad'));
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!email.value || !email.checkValidity()) {
      email.classList.add('is-bad');
      note.classList.remove('is-ok');
      note.textContent = 'That email doesn’t look quite right.';
      email.focus();
      return;
    }
    note.classList.add('is-ok');
    note.textContent = '✓ You’re on the list. (Demo only: nothing was sent.)';
    form.reset();
  });

  /* ---------- scramble nav ---------- */
  const SCR = '£€$¥%+=#*0123456789';
  $$('[data-scramble]').forEach(a => {
    const final = a.textContent.trim();
    a.setAttribute('aria-label', final);
    const run = () => {
      if (reduce) return;
      cancelAnimationFrame(a._raf);
      let f = 0;
      const step = () => {
        f++;
        const shown = Math.floor(f / 2.2);
        a.textContent = [...final].map((ch, i) => (i < shown ? ch : SCR[(Math.random() * SCR.length) | 0])).join('');
        if (shown < final.length) a._raf = requestAnimationFrame(step);
        else a.textContent = final;
      };
      step();
    };
    a.addEventListener('mouseenter', run);
    a.addEventListener('focus', run);
  });

  /* ---------- currency-glyph field ---------- */
  const fieldEl = $('.ft__field');
  const cv = $('.glyphs');
  let field = null;
  if (fieldEl && cv && cv.getContext) field = makeField(fieldEl, cv);

  function makeField(box, canvas) {
    const ctx = canvas.getContext('2d');
    const GL = '£€$¥₹₩₺₽¢%+×=→↗0123456789';
    const n = GL.length;
    let W = 0, H = 0, cw = 14, ch = 18, cols = 0, rows = 0;
    let mask = null, seed = null, rate = null;
    let running = false, inView = false, raf = 0;
    const t0 = performance.now();
    const mouse = { x: -1e4, y: -1e4, on: 0, k: 0 };

    function size() {
      const r = box.getBoundingClientRect();
      W = Math.round(r.width); H = Math.round(r.height);
      if (!W || !H) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cw = W < 700 ? 10 : 14; ch = W < 700 ? 13 : 18;
      cols = Math.ceil(W / cw); rows = Math.ceil(H / ch);

      // wordmark mask, sized to span the frame and cropped by the bottom edge
      const m = document.createElement('canvas');
      m.width = W; m.height = H;
      const mc = m.getContext('2d');
      mc.font = '600 100px Geist, "Helvetica Neue", Arial, sans-serif';
      const w100 = mc.measureText('mova').width || 230;
      const fs = Math.floor(100 * (W * 0.94) / w100);
      mc.font = `600 ${fs}px Geist, "Helvetica Neue", Arial, sans-serif`;
      mc.textAlign = 'center'; mc.textBaseline = 'alphabetic';
      mc.fillStyle = '#000';
      mc.fillText('mova', W / 2, H + fs * 0.04);
      const data = mc.getImageData(0, 0, W, H).data;
      mask = new Uint8Array(cols * rows);
      seed = new Uint16Array(cols * rows);
      rate = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = Math.min(W - 1, Math.floor(i * cw + cw / 2));
        const y = Math.min(H - 1, Math.floor(j * ch + ch / 2));
        const ix = j * cols + i;
        mask[ix] = data[(y * W + x) * 4 + 3] > 120 ? 1 : 0;
        seed[ix] = (Math.random() * n) | 0;
        rate[ix] = 0.15 + Math.random() * 1.1;
      }
    }

    function draw(t) {
      if (!mask) return;
      ctx.clearRect(0, 0, W, H);
      ctx.font = `500 ${Math.round(ch * 0.74)}px "Geist Mono", ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      mouse.k += (mouse.on - mouse.k) * 0.08;
      const R = W < 700 ? 90 : 150, R2 = R * R;
      const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#4f7cff';
      const hot = [];

      // 1) flowing ribbons of glyphs (accent)
      ctx.fillStyle = accent;
      for (let j = 0; j < rows; j++) {
        const y = j * ch + ch / 2;
        // ribbons thin out towards the bottom so the wordmark reads clearly
        const fade = Math.max(0, 1 - (y / H) * 0.9);
        for (let i = 0; i < cols; i++) {
          const ix = j * cols + i;
          if (mask[ix]) continue;
          const x = i * cw + cw / 2;
          const v = Math.sin(x * 0.0052 + t * 0.42 + Math.sin(y * 0.011 - t * 0.28) * 1.7);
          const band = Math.sin(y * 0.021 + v * 2.7 - t * 0.55);
          let a = band > 0.5 ? ((band - 0.5) / 0.5) * 0.55 * fade : 0;
          let m = 0;
          if (mouse.k > 0.01) {
            const dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy;
            if (d2 < R2) m = (1 - Math.sqrt(d2) / R) * mouse.k;
          }
          a = Math.max(a, m * 0.95);
          if (a < 0.035) continue;
          ctx.globalAlpha = a;
          ctx.fillText(GL[(seed[ix] + ((t * rate[ix] + m * 24) | 0)) % n], x, y);
        }
      }

      // 2) the wordmark, written in glyphs (ink, shimmering)
      ctx.fillStyle = '#e8e8ec';
      for (let j = 0; j < rows; j++) {
        const y = j * ch + ch / 2;
        for (let i = 0; i < cols; i++) {
          const ix = j * cols + i;
          if (!mask[ix]) continue;
          const x = i * cw + cw / 2;
          let m = 0;
          if (mouse.k > 0.01) {
            const dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy;
            if (d2 < R2) m = (1 - Math.sqrt(d2) / R) * mouse.k;
          }
          if (m > 0.18) { hot.push(ix, m); continue; }
          // a slow diagonal sheen travels across the letters
          const sheen = Math.max(0, Math.sin((x + y) * 0.006 - t * 0.9));
          ctx.globalAlpha = 0.5 + 0.1 * Math.sin(t * 1.3 + seed[ix]) + sheen * sheen * 0.4;
          ctx.fillText(GL[(seed[ix] + ((t * rate[ix] * 0.35) | 0)) % n], x, y);
        }
      }

      // 3) wordmark cells under the cursor light up in the accent
      ctx.fillStyle = accent;
      for (let h = 0; h < hot.length; h += 2) {
        const ix = hot[h], m = hot[h + 1];
        const i = ix % cols, j = (ix / cols) | 0;
        ctx.globalAlpha = Math.min(1, 0.45 + m);
        ctx.fillText(GL[(seed[ix] + ((t * 6 + m * 30) | 0)) % n], i * cw + cw / 2, j * ch + ch / 2);
      }
      ctx.globalAlpha = 1;
    }

    function loop(now) {
      if (!running) return;
      draw((now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    }
    function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    const paintOnce = () => draw(reduce ? 0 : (performance.now() - t0) / 1000);

    new IntersectionObserver(([en]) => {
      inView = en.isIntersecting;
      inView ? start() : stop();
    }, { rootMargin: '100px' }).observe(box);

    box.addEventListener('pointermove', e => {
      const r = box.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = 1;
      if (reduce) paintOnce();
    });
    box.addEventListener('pointerleave', () => { mouse.on = 0; });

    let rz;
    const resize = () => { clearTimeout(rz); rz = setTimeout(() => { size(); paintOnce(); }, 120); };
    new ResizeObserver(resize).observe(box);
    size(); paintOnce();
    // the wordmark mask needs Geist to have loaded
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { size(); paintOnce(); });

    return { paintOnce };
  }

  setAccent(accentIx);
})();
