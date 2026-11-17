/* =========================================================
   Mova — motion + interaction
   Pattern (measured on the reference): sections are NOT pinned.
   Each big moment is a time-based tween that PLAYS when a scroll
   threshold is crossed and REVERSES when you scroll back past it.
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';
  if (!hasGsap) document.documentElement.classList.add('no-gsap');

  /* ---------------- Header ---------------- */
  const hdr = $('#hdr');
  let lastY = scrollY;
  const menuOpen = () => document.body.classList.contains('menu-open');

  function syncHeaderTheme() {
    const p = heroTl ? heroTl.progress() : 0;
    hdr.classList.toggle('is-over', scrollY <= 2 && p < 0.4 && !menuOpen());
  }
  function onHeaderScroll() {
    const y = scrollY;
    if (!menuOpen()) {
      if (y > lastY && y > 8) hdr.classList.add('is-hidden');
      else if (y < lastY - 2 || y <= 8) hdr.classList.remove('is-hidden');
    }
    lastY = y;
    syncHeaderTheme();
  }

  /* Dropdown (hover with intent delay, click, Esc) */
  $$('.nav__dd').forEach(dd => {
    const btn = $('.nav__ddbtn', dd);
    let t;
    const open = v => { dd.classList.toggle('is-open', v); btn.setAttribute('aria-expanded', v); };
    dd.addEventListener('mouseenter', () => { clearTimeout(t); open(true); });
    dd.addEventListener('mouseleave', () => { t = setTimeout(() => open(false), 160); });
    btn.addEventListener('click', () => open(!dd.classList.contains('is-open')));
    dd.addEventListener('keydown', e => { if (e.key === 'Escape') { open(false); btn.focus(); } });
    document.addEventListener('click', e => { if (!dd.contains(e.target)) open(false); });
  });

  /* Mobile menu */
  const burger = $('.burger');
  const mnav = $('#mnav');
  burger.addEventListener('click', () => {
    const v = !menuOpen();
    document.body.classList.toggle('menu-open', v);
    burger.setAttribute('aria-expanded', v);
    burger.setAttribute('aria-label', v ? 'Close menu' : 'Open menu');
    mnav.setAttribute('aria-hidden', !v);
    hdr.classList.remove('is-hidden');
    syncHeaderTheme();
  });
  matchMedia('(min-width: 1024px)').addEventListener('change', e => {
    if (e.matches && menuOpen()) burger.click();
  });

  /* ---------------- Hero → Payday morph ---------------- */
  const hero = $('#hero');
  const media = $('.hero__media');
  const scene = $('.hero__scene');
  const stages = $$('.stage');
  const sides = $$('.pcard--side');
  const outline = $('.pcard__outline');
  const heroCopy = $('.hero__copy');
  const salary = $('.salary__copy');
  let heroTl = null;
  let heroOpen = scrollY > 2;

  function buildHero() {
    if (!hasGsap) return;
    const prog = heroTl ? heroTl.progress() : (heroOpen ? 1 : 0);
    const wasReversed = heroTl ? heroTl.reversed() : false;
    if (heroTl) heroTl.kill();
    gsap.set([scene, media, heroCopy, salary, sides, outline, ...stages], { clearProps: 'transform,opacity,clipPath,transformOrigin' });

    const W = hero.clientWidth, H = hero.clientHeight;
    const cw = 254, ch = 359;
    const cardTop = Math.round(salary.offsetTop + salary.offsetHeight + 25);
    stages.forEach(s => (s.style.top = cardTop + 'px'));

    // hero-state scale of the centre card (1.58 measured at desktop)
    const s = W >= 1024 ? 1.58 : W >= 768 ? 1.4 : 1.12;
    // desktop: frame bottom sits just past the fold (copy is beside it);
    // narrower: copy spans the width, so the frame drops below it
    const copyBottom = heroCopy.offsetTop + heroCopy.offsetHeight;
    const frameTop = W >= 1024 ? H - ch * s + 2 : Math.max(H - ch * s + 2, copyBottom + 28);
    const d = frameTop - cardTop;
    const L = (W - cw) / 2, B = H - cardTop - ch;

    gsap.set(stages, { transformOrigin: '50% 0%', y: d, scale: s });
    gsap.set(scene, { transformOrigin: `${W / 2}px ${cardTop}px` });
    gsap.set(media, { clipPath: 'inset(0px 0px 0px 0px round 0px)' });
    gsap.set(salary, { y: 75, scale: 0.75, opacity: 0, transformOrigin: '50% 0%' });
    gsap.set(sides, { scale: 0.9 });

    heroTl = gsap.timeline({
      paused: true,
      defaults: { ease: 'power3.inOut' },
      onUpdate: () => {
        syncHeaderTheme();
        salary.classList.toggle('is-live', heroTl.progress() > 0.85);
      }
    })
      .to(heroCopy, { y: -345, opacity: 0, duration: 0.7, ease: 'power2.in' }, 0)
      .to(stages, { y: 0, scale: 1, duration: 1.15 }, 0)
      // the scene gets the inverse of the stage transform, so whatever sat
      // inside the big frame ends up inside the small card
      .to(scene, { y: -d / s, scale: 1 / s, duration: 1.15 }, 0)
      .to(media, { clipPath: `inset(${cardTop}px ${L}px ${B}px ${L}px round 22.5px)`, duration: 1.15 }, 0)
      .to(outline, { opacity: 0, duration: 0.45 }, 0.55)
      .to(sides, { scale: 1, duration: 1 }, 0.15)
      .to(salary, { y: 0, scale: 1, opacity: 1, duration: 0.75, ease: 'power3.out' }, 0.6);

    heroTl.progress(prog);
    if (wasReversed && prog > 0 && prog < 1) heroTl.reverse();
    else if (heroOpen && prog < 1) heroTl.play();
  }

  function onHeroScroll() {
    if (!heroTl) return;
    const y = scrollY;
    if (y > 2 && !heroOpen) {
      heroOpen = true;
      reduce ? heroTl.progress(1) : heroTl.timeScale(1).play();
    } else if (y <= 2 && heroOpen) {
      heroOpen = false;
      reduce ? heroTl.progress(0) : heroTl.timeScale(1.15).reverse();
    }
  }

  /* ---------------- Dark sections ---------------- */
  const dsecs = $$('.dsec');
  const dState = new Map();
  const TRIGGER = 0.1; // section top crosses 10% of viewport

  function fitVisuals() {
    $$('.dsec__visual').forEach(v => {
      const bw = +v.dataset.vw || 1000;
      const vs = Math.max(0.68, Math.min(1, v.clientWidth / bw));
      v.style.setProperty('--vs', vs.toFixed(4));
    });
  }

  function buildDsec(sec) {
    if (!hasGsap) return;
    const prev = dState.get(sec);
    const prog = prev ? prev.tl.progress() : 0;
    const active = prev ? prev.active : sec.getBoundingClientRect().top <= innerHeight * TRIGGER;
    if (prev) prev.tl.kill();

    const reveals = $$('[data-reveal]', sec).filter(el => !el.closest('.pane') || el.closest('.pane.is-active'));
    const allReveals = $$('[data-reveal]', sec);
    const tabs = $('.tabs', sec);
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.inOut' } });

    if (sec.dataset.morph === 'clip') {
      const m = $('.dsec__media', sec), sc = $('.dsec__scenes', sec), card = $('.dsec__card', sec), ui = $('.dsec__ui', sec);
      gsap.set([m, sc, ui], { clearProps: 'transform,clipPath,opacity,transformOrigin' });
      const W = sec.clientWidth, H = sec.clientHeight;
      const sr = sec.getBoundingClientRect(), cr = card.getBoundingClientRect();
      const top = cr.top - sr.top, left = cr.left - sr.left;
      const k = Math.max(cr.width / W, cr.height / H);
      gsap.set(sc, { transformOrigin: `${W / 2}px ${H / 2}px` });
      gsap.set(m, { clipPath: 'inset(0px 0px 0px 0px round 0px)' });
      gsap.set(ui, { opacity: 0, y: 12 });
      tl.to(m, { clipPath: `inset(${top}px ${W - left - cr.width}px ${H - top - cr.height}px ${left}px round 22.5px)`, duration: 1.15 }, 0)
        .to(sc, { scale: k, x: left + cr.width / 2 - W / 2, y: top + cr.height / 2 - H / 2, duration: 1.15 }, 0)
        .to(ui, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.75);
    } else {
      const vis = $('.dsec__visual', sec);
      gsap.set(vis, { clearProps: 'transform' });
      const W = sec.clientWidth, H = Math.min(innerHeight, sec.clientHeight);
      const sr = sec.getBoundingClientRect(), vr = vis.getBoundingClientRect();
      const vcx = vr.left - sr.left + vr.width / 2;
      const vcy = vr.top - sr.top + vr.height / 2;
      const z = Math.min(2.1, Math.max(1.3, Math.max(W / vr.width, H / vr.height) * 0.95));
      gsap.set(vis, { scale: z, x: W / 2 - vcx, y: H / 2 - vcy, transformOrigin: '50% 50%' });
      tl.to(vis, { scale: 1, x: 0, y: 0, duration: 1.2 }, 0);
    }

    gsap.set(allReveals, { opacity: 0, y: 40 });
    tl.to(reveals, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.45);
    // inactive pane copy is revealed silently so tab switches show it
    const hidden = allReveals.filter(r => !reveals.includes(r));
    if (hidden.length) tl.set(hidden, { opacity: 1, y: 0 }, 0.45);
    if (tabs) {
      gsap.set(tabs, { opacity: 0, y: 20 });
      tl.to(tabs, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.7);
    }

    // section-specific extras
    if (sec.id === 'invest') {
      const line = $('.inv__line', sec), area = $('.inv__area', sec);
      gsap.set(line, { strokeDashoffset: 400 });
      gsap.set(area, { opacity: 0 });
      tl.to(line, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.out' }, 0.8)
        .to(area, { opacity: 1, duration: 0.8 }, 1.4);
    }

    tl.progress(prog);
    const st = { tl, active };
    dState.set(sec, st);
    if (active && prog < 1) tl.play();
  }

  function onDsecScroll() {
    const vh = innerHeight;
    dsecs.forEach(sec => {
      const st = dState.get(sec);
      if (!st) return;
      const on = sec.getBoundingClientRect().top <= vh * TRIGGER;
      if (on === st.active) return;
      st.active = on;
      sec.classList.toggle('is-active', on);
      if (reduce) st.tl.progress(on ? 1 : 0);
      else on ? st.tl.timeScale(1).play() : st.tl.timeScale(1.2).reverse();
      if (sec.id === 'pilot') on ? playChat() : resetChat();
    });
  }

  /* AI chat sequence */
  const bubbles = $$('#pilot .bub');
  let chatTl = null;
  function resetChat() {
    if (!hasGsap) return;
    if (chatTl) chatTl.kill();
    gsap.set(bubbles, { opacity: 0, y: 12, scale: 0.96, display: 'block' });
    gsap.set($('#pilot .typing'), { display: 'flex' });
  }
  function playChat() {
    if (!hasGsap) return;
    resetChat();
    const [q, typing, a, q2, a2] = bubbles;
    const pop = { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.6)' };
    chatTl = gsap.timeline({ delay: reduce ? 0 : 0.9 })
      .to(q, pop)
      .to(typing, pop, '+=0.25')
      .to(typing, { opacity: 0, duration: 0.15, display: 'none' }, '+=0.9')
      .to(a, pop)
      .to(q2, pop, '+=0.7')
      .to(a2, pop, '+=0.6');
    if (reduce) chatTl.progress(1);
  }

  /* ---------------- Tabs ---------------- */
  $$('[data-tabs]').forEach(group => {
    const sec = group.closest('section');
    const btns = $$('[role="tab"]', group);
    const select = i => {
      btns.forEach((b, j) => {
        b.classList.toggle('is-active', i === j);
        b.setAttribute('aria-selected', i === j);
        b.tabIndex = i === j ? 0 : -1;
      });
      $$('[data-pane]', sec).forEach(p => p.classList.toggle('is-active', +p.dataset.pane === i));
    };
    btns.forEach((b, i) => {
      b.tabIndex = i === 0 ? 0 : -1;
      b.addEventListener('click', () => select(i));
      b.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length;
        btns[n].focus(); select(n);
      });
    });
  });

  /* ---------------- Card tray parallax ---------------- */
  const cardsSec = $('#cards');
  const rig = $('.tray__rig');
  if (rig && hasGsap && !reduce) {
    const rx = gsap.quickTo(rig, '--rx', { duration: 0.8, ease: 'power3.out' });
    const ry = gsap.quickTo(rig, '--ry', { duration: 0.8, ease: 'power3.out' });
    gsap.set(rig, { '--rx': 8, '--ry': -9 });
    rig.style.transform = 'rotateX(calc(var(--rx) * 1deg)) rotateY(calc(var(--ry) * 1deg))';
    cardsSec.addEventListener('pointermove', e => {
      const r = cardsSec.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      ry(-9 + nx * 14); rx(8 - ny * 8);
    });
    cardsSec.addEventListener('pointerleave', () => { rx(8); ry(-9); });
  }

  /* ---------------- Shield: scroll-scrubbed turn ---------------- */
  const shield = $('.shield');
  const shine = $('.shield__shine');
  function onShieldScroll() {
    if (!shield || reduce) return;
    const r = shield.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
    shield.style.transform = `rotateY(${(-24 + 48 * p).toFixed(2)}deg) translateY(${((0.5 - p) * 50).toFixed(1)}px)`;
    if (shine) shine.setAttribute('x', (-200 + 900 * p).toFixed(1));
  }

  /* ---------------- In-view reveals ---------------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  $$('[data-in]').forEach(el => io.observe(el));

  /* ---------------- App modal ---------------- */
  const modal = $('#app-modal');
  const qr = $('.qr', modal);
  // decorative pseudo-QR grid (finder squares + seeded noise)
  (function drawQr() {
    const n = 21; let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const finder = (x, y) => {
      for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
        const dx = x - fx, dy = y - fy;
        if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) {
          const edge = dx === 0 || dy === 0 || dx === 6 || dy === 6;
          const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
          return edge || core ? 1 : 0;
        }
        if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) return 0;
      }
      return -1;
    };
    let html = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const f = finder(x, y);
      const on = f === -1 ? rnd() > 0.52 : f === 1;
      html += `<i${on ? '' : ' class="o"'}></i>`;
    }
    qr.innerHTML = html;
  })();
  let lastFocus = null;
  const openModal = e => {
    e && e.preventDefault();
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => $('.modal__x', modal).focus(), 50);
  };
  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    lastFocus && lastFocus.focus();
  };
  $$('[data-app-modal]').forEach(b => b.addEventListener('click', openModal));
  $$('[data-close]', modal).forEach(b => b.addEventListener('click', closeModal));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal(); });

  /* ---------------- Scroll / resize plumbing ---------------- */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      onHeaderScroll();
      onHeroScroll();
      onDsecScroll();
      onShieldScroll();
    });
  }
  addEventListener('scroll', onScroll, { passive: true });

  function buildAll() {
    fitVisuals();
    buildHero();
    dsecs.forEach(buildDsec);
    dsecs.forEach(sec => sec.classList.toggle('is-active', !!(dState.get(sec) || {}).active));
    syncHeaderTheme();
    onShieldScroll();
  }

  let rz;
  let lastW = innerWidth;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      // ignore mobile URL-bar height jitter
      if (innerWidth === lastW && Math.abs(innerHeight - (buildAll.h || 0)) < 120) return;
      lastW = innerWidth; buildAll.h = innerHeight;
      buildAll();
    }, 150);
  });

  buildAll.h = innerHeight;
  resetChat();
  buildAll();
  if (dState.get($('#pilot'))?.active) playChat();
  // fonts change text heights → rebuild geometry once they land
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildAll);
})();
