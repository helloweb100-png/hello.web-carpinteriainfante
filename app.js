/* ==========================================================================
   CARPINTERÍA INFANTE · app.js
   Dependencias (CDN, ver index.html): GSAP 3.12.5 + ScrollTrigger · Lenis 1.1.13
   Principio: mejora progresiva. Si GSAP/Lenis no cargan o el usuario pide
   "reducir movimiento", la página sigue completa y funcional (sin animaciones).
   Estructura:
     1. Utilidades            6. Funciones de interfaz (sin GSAP)
     2. Modo de animación     7. Escenas de scroll (GSAP)
     3. Loader                8. Partículas (brasas)
     4. Scroll suave          9. Arranque
     5. Intro del hero
   ========================================================================== */
(() => {
  'use strict';

  /* ───────── 1 · UTILIDADES ───────── */
  const CFG = { phone: '528124373047', brand: 'Carpintería Infante' };
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const html = document.documentElement;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const waUrl = (text) => `https://wa.me/${CFG.phone}?text=${encodeURIComponent(text)}`;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const canAnimate = hasGSAP && !reduceMotion;

  let lenis = null;
  const loader = $('#loader');

  /** Envuelve cada palabra en .w > .wi (máscara) conservando <em>, <span>, etc. */
  function splitWords(el) {
    if (el.dataset.split === 'done') return $$('.wi', el);
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(' '));
            const w = document.createElement('span');
            const i = document.createElement('span');
            w.className = 'w'; i.className = 'wi'; i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && !child.classList.contains('w')) walk(child);
      });
    };
    walk(el);
    el.dataset.split = 'done';
    return $$('.wi', el);
  }

  /** Palabras sueltas (sin máscara) para el texto que se enciende con el scroll */
  function splitScrub(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w) => `<span class="sw" aria-hidden="true">${w}</span>`).join(' ');
    return $$('.sw', el);
  }

  /* ───────── 2 · MODO DE ANIMACIÓN ───────── */
  if (canAnimate) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    html.classList.add('anim');
    document.body.classList.add('is-locked');
  }

  /* ───────── 3 · LOADER (puertas de closet) ───────── */
  function runLoader() {
    if (!loader) return Promise.resolve();
    if (!canAnimate) {
      return new Promise((resolve) => {
        const done = () => { loader.remove(); resolve(); };
        if (reduceMotion) return done();
        fadeOutLoader(loader, done);
      });
    }

    const state = { p: 0 };
    const pct = $('[data-loader-pct]', loader);
    const msg = $('[data-loader-msg]', loader);
    const MSGS = ['Midiendo el espacio…', 'Afilando la sierra…', 'Lijando los acabados…', 'Ajustando detalles…', 'Todo listo'];
    let lastMsg = -1;
    const render = () => {
      loader.style.setProperty('--p', state.p.toFixed(4));
      pct.textContent = String(Math.round(state.p * 100)).padStart(3, '0');
      const idx = state.p >= 0.995 ? MSGS.length - 1 : Math.min(MSGS.length - 2, Math.floor(state.p * (MSGS.length - 1)));
      if (idx !== lastMsg) { lastMsg = idx; msg.textContent = MSGS[idx]; }
    };

    gsap.to(state, { p: 0.86, duration: 2.1, ease: 'power2.out', onUpdate: render });

    const heroImg = $('.arch__img img');
    const assetsReady = Promise.all([
      document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve(),
      document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => addEventListener('load', r, { once: true })),
      heroImg && heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve(),
    ]);
    const minWait = new Promise((r) => setTimeout(r, 2300));
    const hardStop = new Promise((r) => setTimeout(r, 7000));

    return Promise.race([Promise.all([assetsReady, minWait]), hardStop]).then(() => new Promise((resolve) => {
      gsap.to(state, {
        p: 1, duration: 0.7, ease: 'power2.inOut', onUpdate: render,
        onComplete: () => {
          const tl = gsap.timeline({ onComplete: () => { loader.remove(); resolve(); } });
          tl.to('.loader__core', { opacity: 0, scale: 0.88, y: -24, duration: 0.7, ease: 'power3.in' }, 0.25)
            .to('.loader__door--l', { rotateY: -104, duration: 1.7, ease: 'expo.inOut' }, 0.7)
            .to('.loader__door--r', { rotateY: 104, duration: 1.7, ease: 'expo.inOut' }, 0.7)
            .to('.loader__door', { opacity: 0, duration: 0.5, ease: 'none' }, 1.9);
          setTimeout(resolve, 1500); // arranca el hero mientras las puertas terminan de abrir
        },
      });
    }));
  }

  /** Fundido mínimo sin GSAP (modo de respaldo) */
  function fadeOutLoader(el, cb) {
    const go = () => {
      el.style.transition = 'opacity .6s ease';
      el.style.opacity = '0';
      setTimeout(cb, 650);
    };
    document.readyState === 'complete' ? setTimeout(go, 300) : addEventListener('load', () => setTimeout(go, 300), { once: true });
    setTimeout(go, 5000);
  }

  /* ───────── 4 · SCROLL SUAVE (Lenis) ───────── */
  function initSmoothScroll() {
    if (!canAnimate || typeof Lenis === 'undefined') return;
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // se libera cuando termina el loader
  }

  function scrollToTarget(hash) {
    const target = hash === '#inicio' ? 0 : $(hash);
    if (target === null || target === undefined) return;
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -72, duration: 1.8 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function initAnchors() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const h = a.getAttribute('href');
        if (!h || h === '#') return;
        e.preventDefault();
        closeMenu();
        scrollToTarget(h);
        history.replaceState(null, '', h);
      });
    });
  }

  /* ───────── 5 · INTRO DEL HERO ───────── */
  function heroIntro() {
    const words = $$('.hero__title .wi');
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(words, { yPercent: 0, duration: 1.5, stagger: 0.09 }, 0.05)
      .fromTo('[data-hero-in]', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.12 }, 0.35)
      .fromTo('[data-hero-visual]', { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'none' }, 0.1)
      .fromTo('.hero__visual', { scale: 0.92 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0.1)
      .fromTo('.arch', { clipPath: 'inset(100% 0 0 0 round 999px 999px 26px 26px)' }, { clipPath: 'inset(0% 0 0 0 round 999px 999px 26px 26px)', duration: 1.7, ease: 'expo.inOut', clearProps: 'clipPath' }, 0.1)
      .fromTo('.arch__img img', { scale: 1.35 }, { scale: 1, duration: 2.2, ease: 'expo.out' }, 0.1)
      .fromTo('.hero__visual .chip', { opacity: 0, scale: 0.7, y: 20, z: 60 }, { opacity: 1, scale: 1, y: 0, z: 60, duration: 1, stagger: 0.18, ease: 'back.out(1.6)' }, 1.0)
      .fromTo('.hero__visual .dim', { opacity: 0 }, { opacity: 1, duration: 1.2, stagger: 0.2, ease: 'power2.out' }, 1.2)
      .fromTo('.seal', { opacity: 0 }, { opacity: 1, duration: 1.4 }, 0.9)
      .fromTo('.hero__scroll', { opacity: 0 }, { opacity: 1, duration: 1 }, 1.6);
    return tl;
  }

  /* ───────── 6 · FUNCIONES DE INTERFAZ (funcionan sin GSAP) ───────── */
  function wireWhatsApp() {
    $$('[data-wa]').forEach((a) => { a.href = waUrl(a.dataset.wa); });
  }

  /* Header: se oculta al bajar, reaparece al subir · progreso · regla · scrollspy */
  let menuOpen = false;
  function initScrollUI() {
    const header = $('#header');
    const prog = $('.progress');
    const rulerTape = $('.ruler__tape');
    const rulerVal = $('[data-ruler]');
    let lastY = scrollY, ticking = false;

    const update = () => {
      const y = scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const p = clamp(y / max, 0, 1);
      prog.style.setProperty('--p', p.toFixed(4));
      if (rulerTape) rulerTape.style.setProperty('--rp', `${(-(y * 0.45) % 50).toFixed(1)}px`);
      if (rulerVal) rulerVal.textContent = Math.round(p * 240);
      if (!menuOpen) {
        if (y > lastY + 6 && y > 140) header.classList.add('is-hidden');
        else if (y < lastY - 6 || y < 80) header.classList.remove('is-hidden');
      }
      lastY = y; ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();

    // Scrollspy del menú
    const links = $$('.nav a');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-active'));
        const a = map.get(en.target.id);
        if (a) a.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* Menú móvil */
  const burger = $('.burger');
  const menu = $('#menu');
  function openMenu() {
    menuOpen = true; menu.classList.add('is-open'); menu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Cerrar menú');
    $('#header').classList.remove('is-hidden');
    if (lenis) lenis.stop(); document.body.classList.add('is-locked');
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false; menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Abrir menú');
    if (lenis) lenis.start(); document.body.classList.remove('is-locked');
  }
  function initMenu() {
    burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    addEventListener('resize', () => { if (innerWidth >= 900) closeMenu(); });
  }

  /* Cursor personalizado (solo puntero fino) */
  function initCursor() {
    if (!finePointer || reduceMotion) return;
    const cur = $('.cursor');
    const dot = $('.cursor__dot', cur);
    const ring = $('.cursor__ring', cur);
    const label = $('.cursor__label', cur);
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, started = false;
    html.classList.add('has-cursor');
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      if (!started) { started = true; rx = mx; ry = my; }
    }, { passive: true });
    const loop = () => {
      rx = lerp(rx, mx, 0.17); ry = lerp(ry, my, 0.17);
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      const view = t.closest && t.closest('.tile__btn');
      const link = t.closest && t.closest('a, button, [data-cursor], summary');
      cur.classList.toggle('is-view', !!view);
      cur.classList.toggle('is-link', !!link && !view);
      if (view) label.textContent = 'Ver';
    });
    html.addEventListener('mouseleave', () => { cur.style.opacity = 0; });
    html.addEventListener('mouseenter', () => { cur.style.opacity = 1; });
  }

  /* Inclinación 3D */
  function initTilt() {
    if (!finePointer || reduceMotion) return;
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* Botones magnéticos (requiere GSAP) */
  function initMagnetic() {
    if (!canAnimate || !finePointer) return;
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.34);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* Configurador de acabados */
  const FINISHES = {
    nogal:   { name: 'Nogal', desc: 'Calidez clásica. La profundidad de la madera oscura da presencia a cualquier espacio.', a: '#6a4430', b: '#4a2d1d', grain: 0.55, gloss: 0.06, handle: '#d9a066', top: '#e9e2d6', wall: '#d9cfc2' },
    roble:   { name: 'Roble natural', desc: 'Luminoso y cálido. Hace que cocinas y closets se sientan amplios y acogedores.', a: '#d2a574', b: '#b88553', grain: 0.5, gloss: 0.08, handle: '#2f241c', top: '#3d3b39', wall: '#e6ddd0' },
    grafito: { name: 'Grafito mate', desc: 'Sobrio y moderno. Un acabado profundo y elegante, ideal con detalles en madera.', a: '#4b4c51', b: '#2f3033', grain: 0.08, gloss: 0.05, handle: '#d9a066', top: '#ece7df', wall: '#cfc7bb' },
    blanco:  { name: 'Blanco brillante', desc: 'Limpio y luminoso. El alto brillo refleja la luz y agranda visualmente el espacio.', a: '#fbf8f2', b: '#e4ded2', grain: 0, gloss: 0.55, handle: '#8a4a1f', top: '#c9b9a5', wall: '#e9e2d7' },
    taupe:   { name: 'Taupe', desc: 'Neutro y sofisticado. El tono preferido para closets de líneas limpias y vestidores.', a: '#b5a392', b: '#968372', grain: 0.12, gloss: 0.1, handle: '#2f2924', top: '#f0ebe3', wall: '#ddd3c5' },
  };
  function initFinishes() {
    const cab = $('[data-cab]');
    if (!cab) return;
    const swatches = $$('.swatch');
    const name = $('[data-fin-name]');
    const desc = $('[data-fin-desc]');
    const sw = $('[data-led]');
    const cta = $('[data-finish-cta]');
    let current = 'nogal';
    const message = () => {
      const f = FINISHES[current];
      const led = cab.classList.contains('is-led') ? ' con iluminación LED' : '';
      return `Hola ${CFG.brand}, me gustó el acabado ${f.name}${led} y quiero cotizar mi proyecto a medida.`;
    };
    const apply = (key, animate = true) => {
      const f = FINISHES[key]; if (!f) return;
      current = key;
      const s = cab.style;
      s.setProperty('--door-a', f.a); s.setProperty('--door-b', f.b); s.setProperty('--grain-op', f.grain);
      s.setProperty('--gloss', f.gloss); s.setProperty('--handle', f.handle); s.setProperty('--cab-top', f.top); s.setProperty('--cab-wall', f.wall);
      swatches.forEach((b) => {
        const on = b.dataset.finish === key;
        b.classList.toggle('is-on', on); b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
      });
      name.textContent = f.name; desc.textContent = f.desc;
      if (animate && !reduceMotion && name.animate) {
        [name, desc].forEach((el) => el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.22,1,.36,1)' }));
      }
      cta.dataset.wa = message(); cta.href = waUrl(cta.dataset.wa);
    };
    swatches.forEach((b, i) => {
      b.addEventListener('click', () => apply(b.dataset.finish));
      b.addEventListener('keydown', (e) => {
        if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
        e.preventDefault();
        const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
        const next = swatches[(i + dir + swatches.length) % swatches.length];
        next.focus(); apply(next.dataset.finish);
      });
    });
    sw.addEventListener('click', () => {
      const on = !cab.classList.contains('is-led');
      cab.classList.toggle('is-led', on); sw.classList.toggle('is-on', on); sw.setAttribute('aria-checked', String(on));
      cta.dataset.wa = message(); cta.href = waUrl(cta.dataset.wa);
    });
    apply('nogal', false);
  }

  /* FAQ (acordeón accesible) */
  function initFAQ() {
    $$('.qa').forEach((qa, i) => {
      const btn = $('button', qa), panel = $('.qa__a', qa);
      btn.id = `qa-btn-${i}`; panel.id = `qa-panel-${i}`;
      btn.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'region'); panel.setAttribute('aria-labelledby', btn.id);
      btn.addEventListener('click', () => {
        const open = !qa.classList.contains('is-open');
        $$('.qa.is-open').forEach((o) => { if (o !== qa) { o.classList.remove('is-open'); $('button', o).setAttribute('aria-expanded', 'false'); } });
        qa.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 700);
      });
    });
  }

  /* Formulario → WhatsApp */
  function initForm() {
    const form = $('#quote-form');
    if (!form) return;
    const name = $('#f-name'), type = $('#f-type'), idea = $('#f-msg'), note = $('#form-note');
    const setErr = (input, text) => {
      const f = input.closest('.field'); f.classList.toggle('has-error', !!text);
      $('.field__err', f).textContent = text || '';
      input.setAttribute('aria-invalid', text ? 'true' : 'false');
    };
    [name, type].forEach((el) => el.addEventListener('input', () => setErr(el, '')));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      if (name.value.trim().length < 2) { setErr(name, 'Dinos tu nombre para saber con quién hablamos.'); ok = false; }
      if (!type.value) { setErr(type, 'Elige qué quieres hacer.'); ok = false; }
      if (!ok) { note.textContent = ''; (name.value.trim().length < 2 ? name : type).focus(); return; }
      let msg = `Hola ${CFG.brand}, soy ${name.value.trim()}. Me interesa: ${type.value}.`;
      if (idea.value.trim()) msg += `\n\nMi idea / medidas: ${idea.value.trim()}`;
      msg += '\n\n¿Podemos platicar mi proyecto?';
      const w = window.open(waUrl(msg), '_blank', 'noopener');
      if (!w) location.href = waUrl(msg);
      note.textContent = '¡Listo! Abrimos WhatsApp con tu mensaje. Si no se abrió, toca el botón de nuevo.';
      note.classList.add('is-ok');
    });
  }

  /* Galería: filtros + lightbox */
  function initGallery() {
    const grid = $('#grid');
    if (!grid) return;
    const tiles = $$('.tile', grid);
    const chips = $$('.chipbtn');

    chips.forEach((c) => c.addEventListener('click', () => {
      chips.forEach((x) => { x.classList.toggle('is-on', x === c); x.setAttribute('aria-pressed', String(x === c)); });
      const f = c.dataset.filter;
      tiles.forEach((t) => t.classList.toggle('is-hidden', !(f === 'all' || t.dataset.cat.split(' ').includes(f))));
      const visible = tiles.filter((t) => !t.classList.contains('is-hidden'));
      if (canAnimate) {
        gsap.killTweensOf(visible);
        gsap.fromTo(visible, { opacity: 0, y: 30, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.045, ease: 'expo.out', clearProps: 'transform,clipPath' });
        setTimeout(() => ScrollTrigger.refresh(), 60);
      }
    }));

    // Lightbox
    const lb = $('#lightbox'), img = $('img', lb), kind = $('[data-lb-kind]', lb), title = $('[data-lb-title]', lb), cta = $('[data-lb-cta]', lb);
    const closeBtn = $('.lightbox__close', lb), prev = $('.lightbox__nav--prev', lb), next = $('.lightbox__nav--next', lb);
    let list = [], idx = 0, lastFocus = null;

    const show = async (i, fromEl) => {
      idx = (i + list.length) % list.length;
      const b = list[idx];
      kind.textContent = b.dataset.kind;
      kind.className = `badge ${b.dataset.kind === 'Obra real' ? 'badge--r' : 'badge--d'}`;
      title.textContent = b.dataset.title;
      const thumb = $('img', b);
      img.alt = thumb ? thumb.alt : b.dataset.title;
      img.src = b.dataset.full;
      cta.href = waUrl(`Hola ${CFG.brand}, me gustó "${b.dataset.title}" (${b.dataset.kind}) y quiero algo así.`);
      try { await img.decode(); } catch (_) { /* continúa igual */ }
      if (canAnimate) {
        const f = img.getBoundingClientRect();
        if (fromEl) {
          const r = fromEl.getBoundingClientRect();
          gsap.fromTo(img, { x: r.left + r.width / 2 - (f.left + f.width / 2), y: r.top + r.height / 2 - (f.top + f.height / 2), scale: Math.min(r.width / f.width, r.height / f.height), opacity: 0.4 },
            { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.9, ease: 'expo.out', clearProps: 'transform' });
        } else {
          gsap.fromTo(img, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.6, ease: 'expo.out', clearProps: 'transform' });
        }
      }
    };
    const open = (btn) => {
      list = $$('.tile:not(.is-hidden) .tile__btn', grid);
      lastFocus = document.activeElement;
      lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
      if (lenis) lenis.stop(); document.body.classList.add('is-locked');
      show(list.indexOf(btn), $('img', btn));
      closeBtn.focus({ preventScroll: true });
    };
    const close = () => {
      lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true');
      if (lenis && !menuOpen) lenis.start(); document.body.classList.remove('is-locked');
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };
    $$('.tile__btn', grid).forEach((b) => b.addEventListener('click', () => open(b)));
    closeBtn.addEventListener('click', close);
    prev.addEventListener('click', () => show(idx - 1));
    next.addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'Tab') { // focus trap
        const f = $$('button, a[href]', lb).filter((el) => el.offsetParent !== null);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    let sx = 0;
    lb.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    lb.addEventListener('pointerup', (e) => { const dx = e.clientX - sx; if (Math.abs(dx) > 60 && e.pointerType !== 'mouse') show(idx + (dx < 0 ? 1 : -1)); });
  }

  /* Videos: carga diferida + play/pausa por visibilidad */
  function initVideos() {
    const vids = $$('video[data-src]');
    if (!vids.length) return;
    const phone = $('.phone');
    const toggle = $('[data-reel-toggle]');
    const main = $('.phone__video');
    const userPaused = new WeakSet();

    if (reduceMotion) {
      vids.forEach((v) => { v.controls = true; v.src = v.dataset.src; });
      phone && phone.classList.add('is-paused');
      toggle && (toggle.hidden = true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const v = en.target;
        if (en.isIntersecting) {
          if (!v.src) { v.src = v.dataset.src; v.load(); }
          if (!userPaused.has(v)) v.play().catch(() => {});
        } else v.pause();
      });
    }, { threshold: 0.35 });
    vids.forEach((v) => io.observe(v));

    if (toggle && main) {
      main.addEventListener('pause', () => phone.classList.add('is-paused'));
      main.addEventListener('play', () => phone.classList.remove('is-paused'));
      toggle.addEventListener('click', () => {
        if (main.paused) { userPaused.delete(main); main.play().catch(() => {}); toggle.setAttribute('aria-label', 'Pausar video'); }
        else { userPaused.add(main); main.pause(); toggle.setAttribute('aria-label', 'Reproducir video'); }
      });
    }
  }

  /* Botón flotante de WhatsApp */
  function showFloat() {
    const wa = $('.wa-float');
    if (!wa) return;
    wa.classList.add('is-in');
    setTimeout(() => wa.classList.add('show-tip'), 6500);
    setTimeout(() => wa.classList.remove('show-tip'), 12500);
  }

  /* ───────── 7 · ESCENAS DE SCROLL (GSAP) ───────── */
  function initScenes() {
    if (!canAnimate) return;

    /* Escena de puertas 3D: se abren, se enciende el vestidor y la imagen se expande */
    const doors = $('.doors');
    if (doors) {
      const stage = $('.doors__stage'), box = $('.doors__box');
      const scaleFull = () => Math.max(innerWidth / box.offsetWidth, innerHeight / box.offsetHeight) * 1.06;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: doors, start: 'top top', end: '+=270%', pin: stage, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true },
      });
      gsap.set('.doors__room img', { filter: 'brightness(0.32)', scale: 1.14 });
      tl.to('.doors__hint', { opacity: 0, duration: 0.05 }, 0)
        .to('.leaf--l', { rotateY: -108, ease: 'power2.inOut', duration: 0.36 }, 0.02)
        .to('.leaf--r', { rotateY: 108, ease: 'power2.inOut', duration: 0.36 }, 0.02)
        .to('.leaf__shade', { opacity: 1, duration: 0.3 }, 0.04)
        .to('.doors__title', { opacity: 0, y: -50, scale: 1.06, duration: 0.2 }, 0.1)
        .to('.doors__room img', { filter: 'brightness(1)', scale: 1, duration: 0.42 }, 0.06)
        .to('.doors__light', { opacity: 0.9, duration: 0.3 }, 0.1)
        .to('.leaf', { autoAlpha: 0, duration: 0.04 }, 0.42)
        .to(box, { scale: scaleFull, ease: 'power2.inOut', duration: 0.38 }, 0.42)
        .to('.doors__light', { opacity: 0.25, duration: 0.3 }, 0.55)
        .fromTo('.doors__reveal', { opacity: 0, y: 50 }, { opacity: 1, y: 0, ease: 'power2.out', duration: 0.22 }, 0.74);
    }

    /* Servicios: scroll horizontal fijo en escritorio · carrusel nativo en móvil */
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const pin = $('.services__pin'), rail = $('.services__rail');
      if (!pin || !rail) return;
      const dist = () => Math.max(0, rail.scrollWidth - innerWidth);
      const move = gsap.to(rail, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true },
      });
      $$('.scard').forEach((card) => {
        const media = $('.scard__media', card), img = $('img', card);
        const st = { trigger: card, containerAnimation: move, start: 'left 94%', toggleActions: 'play none none reverse' };
        gsap.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out', scrollTrigger: st });
        if (media) gsap.fromTo(media, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.3, ease: 'expo.out', scrollTrigger: st });
        if (img) gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: move, start: 'left right', end: 'right left', scrub: true } });
      });
    });
    mm.add('(max-width: 899px)', () => {
      gsap.fromTo('.scard', { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 1.1, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.services__track', start: 'top 88%', once: true } });
    });

    /* Hero: parallax y salida */
    gsap.to('.arch__img img', { yPercent: -11, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__copy', { yPercent: -10, opacity: 0.1, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__visual', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    /* Marquee: acelera con la velocidad del scroll y cambia de sentido */
    const track = $('.marquee__track');
    if (track) {
      const loop = gsap.to(track, { xPercent: -50, duration: 46, ease: 'none', repeat: -1 });
      let dir = 1;
      ScrollTrigger.create({
        onUpdate: (self) => {
          dir = self.direction;
          gsap.to(loop, { timeScale: dir * (1 + Math.min(Math.abs(self.getVelocity()) / 260, 7)), duration: 0.25, overwrite: true });
          gsap.to(loop, { timeScale: dir, duration: 1.1, delay: 0.25, overwrite: 'auto' });
        },
      });
    }

    /* Texto del oficio que se enciende palabra por palabra */
    const title = $('[data-scrub-words]');
    if (title) {
      const words = splitScrub(title);
      gsap.fromTo(words, { opacity: 0.13 }, { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: title, start: 'top 82%', end: 'bottom 48%', scrub: true } });
    }

    /* Sello de la casa */
    gsap.fromTo('.plate img', { yPercent: -4, scale: 1.04 }, { yPercent: 4, scale: 1, ease: 'none', scrollTrigger: { trigger: '.plate', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* La regla lateral se atenúa mientras el scroll horizontal ocupa la pantalla */
    ScrollTrigger.create({ trigger: '.services', start: 'top 60%', end: 'bottom 40%', toggleClass: { targets: '.ruler', className: 'is-muted' } });

    /* Proceso: cinta métrica que se llena + pasos activos */
    const wrap = $('.steps-wrap'), tape = $('.tape');
    if (wrap && tape) {
      ScrollTrigger.create({ trigger: wrap, start: 'top 62%', end: 'bottom 70%', scrub: true, onUpdate: (s) => tape.style.setProperty('--p', s.progress.toFixed(4)) });
      $$('.step').forEach((step) => ScrollTrigger.create({
        trigger: step, start: 'top 64%',
        onEnter: () => step.classList.add('is-active'),
        onLeaveBack: () => step.classList.remove('is-active'),
      }));
    }

    /* Titulares: palabras que suben desde una máscara */
    $$('[data-split]').forEach((el) => {
      if (el.matches('.hero__title')) return;
      const words = splitWords(el);
      gsap.set(words, { yPercent: 112 });
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.25, stagger: 0.055, ease: 'expo.out' }) });
    });

    /* Revelado general */
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 92%', once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.2, stagger: 0.1, ease: 'expo.out', overwrite: 'auto' }),
    });

    /* Galería: azulejos que se abren con clip-path */
    ScrollTrigger.batch('.tile', {
      start: 'top 94%', once: true,
      onEnter: (batch) => gsap.fromTo(batch,
        { opacity: 0, y: 60, clipPath: 'inset(14% 10% 14% 10% round 18px)' },
        { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.3, stagger: 0.08, ease: 'expo.out', clearProps: 'clipPath,transform' }),
    });

    /* Parallax suave del celular del reel y del sello final */
    gsap.fromTo('.phone', { yPercent: 5 }, { yPercent: -5, ease: 'none', scrollTrigger: { trigger: '.reel', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.finale__ring', { rotate: -25 }, { rotate: 25, ease: 'none', scrollTrigger: { trigger: '.finale', start: 'top bottom', end: 'bottom top', scrub: true } });

    addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* ───────── 8 · PARTÍCULAS (brasas de aserrín) ───────── */
  function initEmbers() {
    const cv = $('.hero__embers');
    if (!cv || reduceMotion) return;
    const ctx = cv.getContext('2d');
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const sctx = sprite.getContext('2d');
    const g = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,240,210,1)'); g.addColorStop(0.16, 'rgba(255,196,118,.95)');
    g.addColorStop(0.5, 'rgba(224,126,52,.28)'); g.addColorStop(1, 'rgba(180,80,20,0)');
    sctx.fillStyle = g; sctx.fillRect(0, 0, 64, 64);

    let W = 0, H = 0, parts = [], raf = 0, visible = true;
    const mouse = { x: -999, y: -999 };
    const make = (anywhere) => ({
      x: Math.random() * W, y: anywhere ? Math.random() * H : H + 30,
      z: Math.random(), s: 5 + Math.random() * 15, vy: -(0.14 + Math.random() * 0.6), vx: (Math.random() - 0.5) * 0.3,
      ph: Math.random() * 6.28, tw: 0.6 + Math.random() * 1.6,
    });
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = W < 700 ? 34 : 78;
      parts = Array.from({ length: n }, () => make(true));
    };
    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        p.y += p.vy * (0.55 + p.z);
        p.x += p.vx + Math.sin(t * 0.0006 * p.tw + p.ph) * 0.28;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 19600) { const d = Math.sqrt(d2) || 1, f = (140 - d) / 140; p.x += (dx / d) * f * 3.2; p.y += (dy / d) * f * 3.2; }
        if (p.y < -40 || p.x < -40 || p.x > W + 40) Object.assign(p, make(false));
        const flick = 0.62 + 0.38 * Math.sin(t * 0.002 * p.tw + p.ph);
        const size = p.s * (0.5 + p.z);
        ctx.globalAlpha = (0.2 + 0.75 * p.z) * flick;
        ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    };
    const hero = $('.hero');
    hero.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
      if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(hero);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
    resize();
    raf = requestAnimationFrame(frame);
  }

  /* ───────── 9 · ARRANQUE ───────── */
  function boot() {
    wireWhatsApp();
    initAnchors();
    initMenu();
    initScrollUI();
    initFinishes();
    initFAQ();
    initForm();
    initGallery();
    initVideos();
    initTilt();
    initCursor();
    const y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();

    initSmoothScroll();
    initScenes();      // se crea en orden de aparición: pines primero
    initMagnetic();
    initEmbers();

    if (canAnimate) {
      gsap.set(splitWords($('.hero__title')), { yPercent: 112 }); // se divide y oculta antes del loader
      if (!location.hash) { history.scrollRestoration = 'manual'; scrollTo(0, 0); }
    }

    runLoader().then(() => {
      html.classList.add('ready');
      document.body.classList.remove('is-locked');
      if (lenis) lenis.start();
      if (canAnimate) { heroIntro(); ScrollTrigger.refresh(); }
      if (location.hash && $(location.hash)) setTimeout(() => scrollToTarget(location.hash), 200);
      showFloat();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
