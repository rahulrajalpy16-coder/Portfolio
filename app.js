/* =========================================================
   Momentum · scroll engine
   No libraries. Each [data-scene] is a tall section with a
   sticky stage; its scroll progress (0 to 1) is smoothed and
   handed to a scene function. [data-view] elements get a
   view progress as they cross the screen.
   ========================================================= */

/* Fill these in before publishing. Empty fields are left out of the contact list. */
const CONTACT = { email: '', place: 'UAE', linkedin: '', github: '' };

(() => {
  const html = document.documentElement;
  const ANIM = html.classList.contains('anim');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (v, a, b) => clamp((v - a) / (b - a));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // the pinned scenes are 100svh tall. On phones innerHeight grows and shrinks as the address bar hides and shows,
  // which used to nudge every scene's progress (a visible jump). Measure the stable small-viewport height instead.
  const vhProbe = document.createElement('div');
  vhProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(vhProbe);
  const TOUCH = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const stableVh = () => vhProbe.offsetHeight || innerHeight;
  let vw = innerWidth, vh = stableVh();

  /* ---------- contact ---------- */
  (function contact() {
    const list = $('#clist'), msg = $('#cmsg');
    const rows = [
      ['Email', CONTACT.email && `<a href="mailto:${CONTACT.email}">${CONTACT.email}</a>`],
      ['Based in', CONTACT.place],
      ['LinkedIn', CONTACT.linkedin && `<a href="${CONTACT.linkedin}" target="_blank" rel="noopener">${CONTACT.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</a>`],
      ['GitHub', CONTACT.github && `<a href="${CONTACT.github}" target="_blank" rel="noopener">${CONTACT.github.replace(/^https?:\/\/(www\.)?/, '')}</a>`],
    ];
    // only list the ways that are filled in, so the public page never shows placeholders
    list.innerHTML = rows.filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    const talk = $('#talk'), copy = $('#copy');
    if (!CONTACT.email) copy.hidden = true;
    if (CONTACT.email) talk.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent('Let’s build something')}`;
    talk.addEventListener('click', e => {
      if (!CONTACT.email) { e.preventDefault(); msg.textContent = 'No email address has been added yet, so nothing was sent.'; }
    });
    copy.addEventListener('click', async () => {
      if (!CONTACT.email) { msg.textContent = 'No email address has been added yet.'; return; }
      try { await navigator.clipboard.writeText(CONTACT.email); msg.textContent = 'Copied: ' + CONTACT.email; }
      catch { msg.textContent = CONTACT.email; }
    });
  })();

  /* ---------- the 3D monogram at the end of the page ----------
     Rahul's RR emblem (assets/3d/rr-emblem.glb: piano black lacquer with a vermilion enamel accent), lit by a soft
     studio environment so the black gloss catches light. It sways gently, turns as you scroll past, and can be
     dragged round. It only loads when you get close, only draws while on screen, and the flat logo stays if WebGL is missing. */
  (function emblem() {
    const fig = $('#emblem'); if (!fig) return;
    const cv = $('.em-cv', fig);
    const STILL = document.documentElement.classList.contains('rm');
    const CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
    function need(src, ok) {
      return new Promise((res, rej) => {
        if (ok()) return res();
        let sc = document.querySelector(`script[src="${src}"]`);
        if (!sc) { sc = document.createElement('script'); sc.src = src; document.head.appendChild(sc); }
        sc.addEventListener('load', () => res()); sc.addEventListener('error', rej);
        const t = setInterval(() => { if (ok()) { clearInterval(t); res(); } }, 150);
      });
    }
    let started = false;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && !started) { started = true; io.disconnect(); boot(); } }, { rootMargin: '150% 0px' });
    io.observe(fig);
    async function boot() {
      try {
        await need('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', () => !!window.THREE);
        await need(CDN + 'loaders/GLTFLoader.js', () => !!THREE.GLTFLoader);
        await need(CDN + 'environments/RoomEnvironment.js', () => !!THREE.RoomEnvironment);
        build();
      } catch (e) { /* the flat logo stays */ }
    }
    function build() {
      let renderer;
      try { renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: 'low-power' }); } catch (e) { return; }
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
      renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 2, .1, 100);
      const pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(new THREE.RoomEnvironment(), .04).texture;
      const key = new THREE.DirectionalLight(0xfff1e0, 1.4); key.position.set(-3, 4, 5); scene.add(key);
      const rim = new THREE.PointLight(0xff5a1f, 6, 12, 2); rim.position.set(3.2, .6, -2.4); scene.add(rim);
      const rim2 = new THREE.PointLight(0x7f9cff, 3, 12, 2); rim2.position.set(-3.4, -.8, -2); scene.add(rim2);
      const pivot = new THREE.Group(); scene.add(pivot);
      let W = 0, H = 0, vis = false, raf = 0, dragging = false, px = 0, spin = 0, vel = 0, t0 = performance.now();
      function size() {
        const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h || (w === W && h === H)) return;
        W = w; H = h;
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
        cam.aspect = w / h;
        // fit the 3.93 unit wide emblem to about 70% of the canvas width
        const d = (3.93 / .7) / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
        cam.position.set(0, 0, Math.max(d, 4.6)); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
        draw();
      }
      function draw() {
        const t = (performance.now() - t0) / 1000;
        const r = fig.getBoundingClientRect(), sp = (r.top + r.height / 2) / innerHeight - .5;   // -0.5 .. 0.5 across the screen
        if (!dragging) { spin += vel; vel *= .94; }
        const sway = STILL ? -.38 : Math.sin(t * .45) * .32 - sp * .9;
        pivot.rotation.y = sway + spin;
        pivot.rotation.x = STILL ? .06 : Math.sin(t * .38) * .07 + sp * .12;
        pivot.position.y = STILL ? 0 : Math.sin(t * .7) * .04;
        renderer.render(scene, cam);
      }
      function loop() { draw(); raf = (vis && (!STILL || Math.abs(vel) > .0005 || dragging)) ? requestAnimationFrame(loop) : 0; }
      const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
      new IntersectionObserver(es => { vis = es.some(e => e.isIntersecting); if (vis) kick(); }).observe(fig);
      if (window.ResizeObserver) new ResizeObserver(size).observe(cv); else addEventListener('resize', size);
      fig.addEventListener('pointerdown', e => { dragging = true; px = e.clientX; vel = 0; fig.setPointerCapture && fig.setPointerCapture(e.pointerId); kick(); });
      fig.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - px; px = e.clientX; spin += dx * .012; vel = dx * .012; kick(); });
      const up = () => { dragging = false; kick(); };
      fig.addEventListener('pointerup', up); fig.addEventListener('pointercancel', up);
      new THREE.GLTFLoader().load('assets/3d/rr-emblem.glb', g => {
        const m = g.scene;
        const box = new THREE.Box3().setFromObject(m), c = box.getCenter(new THREE.Vector3());
        m.position.sub(c);
        m.traverse(o => { if (o.isMesh && o.material) { o.material.envMapIntensity = 1.2; o.material.needsUpdate = true; } });
        pivot.add(m);
        size(); draw(); fig.classList.add('on'); kick();
      }, undefined, () => { /* the flat logo stays */ });
    }
  })();

  /* ---------- demo dialog ---------- */
  (function demo() {
    const dlg = $('#demo'), frame = $('iframe', dlg);
    $$('[data-demo]').forEach(b => b.addEventListener('click', () => {
      if (!dlg.showModal) { window.open('demo/pump-skid.html', '_blank', 'noopener'); return; }
      if (!frame.src) frame.src = frame.dataset.src;
      dlg.showModal();
    }));
    $('[data-close]', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  })();

  /* ---------- reveal on view (works in every mode) ---------- */
  const rvs = $$('.rv');
  if (ANIM && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -12% 0px' });
    rvs.forEach((el, i) => { el.style.transitionDelay = (i % 3) * 80 + 'ms'; io.observe(el); });
  } else rvs.forEach(el => el.classList.add('in'));

  /* ---------- chrome: nav colour, chapter HUD, progress ---------- */
  const body = document.body, bar = $('.bar'), hud = $('.hud'), hudN = $('.hud .n'), hudT = $('.hud .t');
  const chapters = $$('[data-ch]');
  const navLinks = $$('.nav nav a');
  let lastCh = null;
  function chrome() {
    const max = document.documentElement.scrollHeight - vh;
    bar.style.setProperty('--sp', max > 0 ? (scrollY / max).toFixed(4) : 0);
    let navSec = null, hudSec = null;
    for (const s of chapters) {
      const r = s.getBoundingClientRect();
      if (r.top <= 32 && r.bottom > 32) navSec = s;
      if (r.top <= vh - 30 && r.bottom > vh - 30) hudSec = s;
    }
    body.dataset.nav = (navSec && themeAt(navSec, 32)) || 'light';
    if (hudSec) {
      body.dataset.hud = themeAt(hudSec, vh - 30);
      if (hudSec !== lastCh) {
        lastCh = hudSec;
        const [n, t] = hudSec.dataset.ch.split('|');
        hudN.textContent = n; hudT.textContent = t; body.dataset.hudch = n;
        navLinks.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + hudSec.id)));
      }
      const r = hudSec.getBoundingClientRect();
      const span = Math.max(1, r.height - vh);
      hud.style.setProperty('--cp', clamp(-r.top / span).toFixed(3));
    }
  }
  let heroIris = 0;
  function themeAt(sec, y) {
    if (sec.id === 'top' && ANIM && heroIris > (y < 100 ? .62 : .5)) return 'dark';
    return sec.dataset.theme;
  }

  /* image sequences: coarse frames first so scrubbing works early, then the rest */
  function loadSeq(dir, n, onNear, want, delay = 0) {
    const frames = new Array(n), seq = { dir, n, frames,
      pick(i) {
        let k = i; while (k > 0 && !frames[k]) k--;
        if (!frames[k]) { let j = i; while (j < n - 1 && !frames[j]) j++; k = j; }
        return frames[k];
      } };
    const order = [];
    for (let st = 16; ; st = st / 2 | 0) { for (let i = 0; i < n; i += st) if (!order.includes(i)) order.push(i); if (st === 1) break; }
    order.forEach((i, m) => setTimeout(() => {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { frames[i] = im; if (Math.abs(i - want()) < 8) onNear(); };
      im.src = `assets/${dir}/f${String(i + 1).padStart(3, '0')}.webp`;
    }, delay + m * 12));
    return seq;
  }
  function coverDraw(cx, cv, im, ay, bg) {
    const s = Math.max(cv.width / im.naturalWidth, cv.height / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    cx.fillStyle = bg; cx.fillRect(0, 0, cv.width, cv.height);
    cx.drawImage(im, (cv.width - w) / 2, (cv.height - h) * ay, w, h);
  }

  /* =========================================================
     Scenes (animated mode only)
     ========================================================= */
  const scenes = [];
  function scene(el, fn) { if (el) scenes.push({ el, fn, cur: -1, target: 0 }); }

  if (ANIM) {
    /* ---- 01 hero: the name splits, then a circle of ink opens from Rahul's chest into a new world ---- */
    const hero = $('.hero'), heroPin = $('.pin', hero);
    const r1 = $('.r1', hero), r2 = $('.r2', hero), fig = $('.hero-fig', hero), iris = $('.iris', hero);
    $$('.clip', hero).forEach(c => {
      const t = c.textContent; c.textContent = '';
      [...t].forEach((ch, i) => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; s.style.transitionDelay = (80 + i * 70 + (c.closest('.r2') ? 260 : 0)) + 'ms'; c.appendChild(s); });
    });
    html.classList.add('split');
    requestAnimationFrame(() => requestAnimationFrame(() => html.classList.add('ready')));
    // inside the circle: stars rushing past, as if you just fell through into another space
    const icv = $('.iris-cv', hero), icx = icv.getContext('2d');
    const istars = Array.from({ length: 700 }, (_, i) => ({ x: Math.sin(i * 12.9898) * .5 + (Math.sin(i * 78.233) * 43758.5453 % 1), y: Math.cos(i * 4.1414) * .5 + (Math.sin(i * 39.346) * 12543.12 % 1), z: (i * .618034) % 1, b: .4 + ((i * .7548) % 1) * .6, blue: i % 5 === 0 }));
    let iLast = -1;
    function drawIris(p) {
      if (!icv.width || Math.abs(p - iLast) < .0005) return;
      iLast = p;
      const W = icv.width, H = icv.height, cx = W / 2, cy = H * .46, F = Math.max(W, H) * .35;
      icx.fillStyle = '#04050b'; icx.fillRect(0, 0, W, H);
      const neb = icx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * .6);
      neb.addColorStop(0, 'rgba(60,80,200,.22)'); neb.addColorStop(.5, 'rgba(110,40,200,.08)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
      icx.fillStyle = neb; icx.fillRect(0, 0, W, H);
      const travel = easeOut(range(p, .2, 1)) * 1.6, speed = 1 - range(p, .55, .9);
      for (const s of istars) {
        let z = ((s.z - travel) % 1 + 1) % 1 + .04;
        const x = cx + s.x * F / z, y = cy + s.y * F / z;
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
        const z2 = z + .05 * speed, x2 = cx + s.x * F / z2, y2 = cy + s.y * F / z2;
        const a = s.b * Math.min(1, (1.04 - z) * 2.5);
        icx.strokeStyle = s.blue ? `rgba(160,190,255,${a.toFixed(2)})` : `rgba(255,255,255,${a.toFixed(2)})`;
        icx.lineWidth = Math.max(1, (1.1 - z) * 2.2);
        icx.beginPath(); icx.moveTo(x, y); icx.lineTo(x2 + .5, y2 + .5); icx.stroke();
      }
    }
    function sizeIris() {
      // setting a canvas size clears it, even to the same value; phones fire resize every time the address bar moves,
      // so only touch the canvas when its size really changed (otherwise it blinks black for a frame)
      const dpr = Math.min(devicePixelRatio || 1, 1.75), W = Math.round(icv.clientWidth * dpr), H = Math.round(icv.clientHeight * dpr);
      if (W === icv.width && H === icv.height) return;
      icv.width = W; icv.height = H; iLast = -1;
    }
    addEventListener('resize', sizeIris);
    requestAnimationFrame(sizeIris);
    scene(hero, p => {
      const a = easeInOut(range(p, 0, .5));
      const spread = vw < 720 ? 60 : 34;
      // RAHUL drifts left, RAJ drifts right
      r1.style.transform = `translate3d(${(-a * spread).toFixed(2)}vw,0,0)`;
      r2.style.transform = `translate3d(${(a * spread).toFixed(2)}vw,0,0)`;
      if (p > .001 || html.classList.contains('scrolled')) {
        html.classList.add('scrolled');
        fig.style.transform = `translate(-50%,${(-a * 3).toFixed(2)}%) scale(${(1 - a * .1).toFixed(4)})`;
      }
      heroPin.style.setProperty('--meta-o', (1 - range(p, 0, .12)).toFixed(3));
      const t = easeInOut(range(p, .2, .55));
      heroIris = t;
      iris.style.setProperty('--r', (t * 122).toFixed(2) + '%');
      iris.style.setProperty('--io0', range(p, .5, .6).toFixed(3));
      iris.style.setProperty('--io1', range(p, .58, .7).toFixed(3));
      iris.style.setProperty('--io2', range(p, .7, .82).toFixed(3));
      iris.style.setProperty('--is', (1.2 - .2 * easeOut(range(p, .45, .95))).toFixed(4));
      if (t > 0) { if (!icv.width && icv.clientWidth) sizeIris(); drawIris(p); }
    });

    /* ---- 02 manifesto: split words, light them in order ---- */
    const mf = $('.mf');
    const words = [];
    (function split(node) {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); words.push(s); }
          });
          n.replaceWith(frag);
        } else split(n);
      });
    })(mf);
    scene($('.manifesto'), p => {
      const k = range(p, .06, .8) * words.length;
      words.forEach((w, i) => w.classList.toggle('on', i < k));
    });

    /* ---- 03 process: the drawing builds in four stages ---- */
    const proc = $('.process'), svg = $('.sk', proc);
    const steps = $$('.step', proc), barsI = $$('.steps-bar i', proc);
    const groups = { a: [.03, .2], b: [.27, .47], c: [.52, .72] };
    const strokes = [];
    for (const g of ['a', 'b', 'c']) {
      const els = $$(`.g-${g} .d`, svg);
      els.forEach((el, i) => {
        let len = 100;
        try { len = el.getTotalLength(); } catch (e) {}
        if (!len) len = 100;
        el.style.strokeDasharray = `${len} ${len}`;
        el.style.strokeDashoffset = len;
        strokes.push({ el, len, g, a: i / els.length * .6, b: i / els.length * .6 + .4 });
      });
    }
    const texts = $$('.g-a .t', svg), callouts = $$('.co', svg), tints = $$('.tint', svg), gridBg = $('.grid-bg', proc);
    let stepNow = -1;
    scene(proc, p => {
      for (const s of strokes) {
        const [g0, g1] = groups[s.g];
        const t = range(range(p, g0, g1), s.a, s.b);
        s.el.style.strokeDashoffset = (s.len * (1 - easeOut(t))).toFixed(2);
        s.el.style.opacity = t > 0 ? 1 : 0;
      }
      const ta = range(p, .12, .22);
      texts.forEach(t => t.style.opacity = ta);
      svg.style.setProperty('--fo', range(p, .74, .84).toFixed(3));
      callouts.forEach((c, i) => c.style.setProperty('--o', range(p, .8 + i * .04, .86 + i * .04).toFixed(3)));
      gridBg.style.setProperty('--go', (1 - range(p, .74, .9) * .6).toFixed(3));
      const st = p < .25 ? 0 : p < .5 ? 1 : p < .74 ? 2 : 3;
      if (st !== stepNow) { stepNow = st; steps.forEach((s, i) => s.classList.toggle('on', i === st)); }
      barsI.forEach((b, i) => b.style.setProperty('--f', range(p, i * .25, i * .25 + .22).toFixed(3)));
    });
    // tints start invisible
    svg.style.setProperty('--fo', 0);

    /* ---- 06 the tesseract ----
       One long scroll with four phases:
         intro    T from -PRE to 0      the corridor opens
         rooms    T from 0 to TC        11 stations: a title, 4 tools, a title, 5 projects.
                                        Station k is held while T is between k+.25 and k+.75,
                                        and the camera flies one room further between holds.
                                        Each item starts as a frozen frame on a side wall
                                        (left, right, left...) and swings out to face you.
         collapse T from TC to TC+PC    the corridor stretches into a black hole, down to full black
         lens     T from TC+PC to end   another universe, seen from inside his sunglasses lens;
                                        the camera pulls back until the whole figure is in view
       c is the camera's position in rooms. */
    const tess = $('.tess'), tPin = $('.pin', tess), sts = $$('.st', tess);
    const tIntro = $('.tess-intro', tess), tRooms = $$('.tess-rooms button', tess);
    const tCount = $('.tess-count b', tess), tCountG = $('.tess-count .g', tess), tCountOf = $('.tess-count span', tess);
    const tCss = $$('.tess-css i', tess), bhCss = $('.bh-css', tess), cube = $('.cube', tess);
    const fin = $('.beyond', tess), finCv = $('.fin-cv', tess), finTxt = $('.fin-txt', tess);
    const anchor = $('#work'), anchorC = $('#contact');
    const WT = sts.indexOf(anchor.nextElementSibling);          // the "Selected work" title station
    const NTOOL = WT - 1, NWORK = sts.length - WT - 1;
    tess.appendChild(anchor); tess.appendChild(anchorC);         // in scroll mode the anchors sit where their moment is
    const NST = sts.length, D = 28, NEAR = 9, PRE = .3, PC = 2.2, PL = 4.4;
    const TC = NST - .25, U = PRE + TC + PC + PL;
    const S = { c: -1, q: 0, s: 0 };
    let roomNow = null;
    // one unbroken fall: you never stop, you only ease off a little as each page reaches your face (c = k at T = k + .5)
    const FA = .6, cOf = T => { const u = T - .5; return u - FA * Math.sin(2 * Math.PI * u) / (2 * Math.PI); };
    const pOf = T => (T + PRE) / U;
    const pad = n => String(n).padStart(2, '0');
    // which wall each station comes out of: the two titles rise in the middle, the items alternate left, right, left...
    let nItem = 0;
    const side = sts.map(st => st.classList.contains('tcard') ? 0 : (nItem++ % 2 ? 1 : -1));
    // which frozen frame on the wall belongs to each item (tiles of the wall atlas, see drawAtlas)
    const WORK_TILES = [0, 1, 3, 4, 5];
    const tileOf = k => side[k] === 0 ? -1 : k < WT ? 5 + k : WORK_TILES[k - WT - 1];
    const endT = TC + PC + PL * .97;
    function placeAnchors() {
      const span = Math.max(0, tess.offsetHeight - innerHeight);
      anchor.style.top = Math.round(pOf(WT + .5) * span) + 'px';
      anchorC.style.top = Math.round(pOf(endT) * span) + 'px';
    }
    placeAnchors();
    tRooms.forEach(b => b.addEventListener('click', () => {
      const T = b.dataset.room === 'end' ? endT : +b.dataset.room + .5;
      const r = tess.getBoundingClientRect();
      window.scrollTo({ top: r.top + scrollY + pOf(T) * (r.height - vh), behavior: 'smooth' });
    }));

    /* ---- pages hold: you scroll and swipe freely through the tesseract, the movement follows your finger or wheel,
       but every page is a wall for the gesture that reaches it. When a page fills the screen (T = k + .5) the scroll
       stops right there, even mid-fling, and only a new swipe or scroll carries you on to the next page. */
    (function holds() {
      const root = document.documentElement;
      const yOf = T => { const r = tess.getBoundingClientRect(); return r.top + scrollY + pOf(T) * (r.height - vh); };
      const pages = () => sts.map((_, k) => yOf(k + .5));
      let lo = -Infinity, hi = Infinity, lastWheel = 0, touchMode = false, freezing = false;
      // the walls for the gesture that starts now: the nearest page ahead in each direction
      function arm() {
        const y = scrollY, ps = pages();
        hi = Infinity; lo = -Infinity;
        for (const v of ps) { if (v > y + 2) { hi = v; break; } }
        for (let i = ps.length - 1; i >= 0; i--) if (ps[i] < y - 2) { lo = ps[i]; break; }
      }
      const free = () => { lo = -Infinity; hi = Infinity; };
      // hold exactly on a page; on iPhone, briefly switching scrolling off also kills the fling's coast
      function hold(v) {
        if (touchMode) {
          freezing = true;
          root.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
          window.scrollTo(0, v);
          requestAnimationFrame(() => requestAnimationFrame(() => { root.style.overflow = ''; document.body.style.overflow = ''; window.scrollTo(0, v); freezing = false; }));
        } else window.scrollTo(0, v);
      }
      addEventListener('scroll', () => {
        if (freezing) return;
        const y = scrollY;
        if (y > hi + 1) hold(hi); else if (y < lo - 1) hold(lo);
      }, { passive: true });
      addEventListener('wheel', e => {
        if (e.ctrlKey) return;
        const now = performance.now();
        if (now - lastWheel > 220) arm();                                // a fresh flick is a new gesture
        lastWheel = now;
        const y = scrollY, d = e.deltaY;
        // pushing against the wall of this gesture: stay on the page
        if ((d > 0 && y >= hi - 1) || (d < 0 && y <= lo + 1)) { e.preventDefault(); return; }
        if (d > 0 && y + d > hi) { e.preventDefault(); hold(hi); }
        else if (d < 0 && y + d < lo) { e.preventDefault(); hold(lo); }
      }, { passive: false });
      let tY = null;
      addEventListener('touchstart', e => { touchMode = true; tY = e.touches[0].clientY; arm(); }, { passive: true });
      addEventListener('touchmove', e => {
        if (tY == null) return;
        const dy = tY - e.touches[0].clientY, y = scrollY;
        // finger still pushing into the page that just filled the screen: the page does not move
        if ((dy > 0 && y >= hi - 1) || (dy < 0 && y <= lo + 1)) { if (e.cancelable) e.preventDefault(); }
      }, { passive: false });
      addEventListener('touchend', () => { tY = null; }, { passive: true });
      addEventListener('keydown', e => { if (/^(Arrow(Up|Down)|Page(Up|Down)| |Home|End)$/.test(e.key)) arm(); });
      addEventListener('click', free, true);                            // links and room buttons jump freely
    })();

    scene(tess, p => {
      const T = p * U - PRE;
      const q = range(T, TC, TC + PC), s = range(T, TC + PC, TC + PC + PL);
      let c = cOf(Math.min(T, TC));
      if (q > 0) c = cOf(TC) + PC * q + 4.8 * q * q * q;      // keep the same speed into the collapse, then accelerate
      S.c = c; S.q = q; S.s = s;
      if (T > NST - 4) ensureFilm();
      // intro cue shrinks into the corridor
      tIntro.style.setProperty('--io', (1 - range(c, -.62, -.32)).toFixed(3));
      tIntro.style.setProperty('--is', (1 - range(c, -.8, -.3) * .25).toFixed(4));
      tPin.style.setProperty('--ro', (range(c, -.45, -.25) * (1 - range(q, 0, .12))).toFixed(3));
      tPin.style.setProperty('--vo', (1 - range(q, .4, .8)).toFixed(3));
      // each station: it starts tiny, deep down the corridor on its side wall (titles in the middle),
      // rushes up to your face while you fall towards it, holds, then flies past you
      sts.forEach((card, k) => {
        const d = c - k, sd = side[k];
        let op, tf, fz = 0, blur = 0;
        if (d <= 0) {
          const u = range(d, -.36, 0);                           // 0 far away, 1 in your face (it only sets off once the last page has gone)
          const z = -6200 * Math.pow(1 - u, 1.7);
          const swing = 1 - easeInOut(range(u, .45, 1));         // it leaves the wall in the last half of the approach
          const x = sd * vw * .62 * swing, ry = -sd * 78 * swing;
          op = range(u, 0, .12);
          tf = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px,0,${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`;
          fz = sd ? 1 - range(u, .7, 1) : 0;
          card.style.zIndex = String(Math.round(800 + z / 10));          // far ones stay behind near ones
        } else {
          const w0 = range(d, 0, .34), w = w0 * w0 * (1.6 - .6 * w0);   // it picks up speed as it goes past you
          const z = w * 1150, x = -(sd || (k % 2 ? 1 : -1)) * w * vw * .18;
          op = 1 - range(d, .12, .32);
          tf = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px,0,${z.toFixed(1)}px)`;
          card.style.zIndex = String(Math.round(800 + z / 10));
          blur = d > .06 && !TOUCH ? range(d, .06, .3) * 8 : 0;   // phones skip the blur: on iPhone a blurred 3D layer can flash while it redraws
        }
        if (op <= .001) { if (card.style.visibility !== 'hidden') { card.style.visibility = 'hidden'; card.classList.remove('live'); } return; }
        card.style.visibility = 'visible';
        card.style.opacity = op.toFixed(3);
        card.style.transform = tf;
        card.style.filter = blur ? `blur(${blur.toFixed(1)}px)` : '';
        card.style.setProperty('--fz', fz.toFixed(3));
        card.classList.toggle('live', Math.abs(d) < .12);
        card.style.setProperty('--wp', (1 - Math.min(1, Math.abs(d) * 3)).toFixed(3));
      });
      if (cube) cube.style.setProperty('--rot', (30 + c * 90).toFixed(1) + 'deg');
      // room pills and counter
      const k = q > .1 ? 'end' : clamp(Math.round(c), 0, NST - 1);
      if (k !== roomNow) {
        roomNow = k;
        tRooms.forEach(b => b.setAttribute('aria-current', String(b.dataset.room === String(k))));
        // on narrow screens the strip scrolls sideways: keep the active pill in view
        const on = tRooms.find(b => b.dataset.room === String(k)), strip = on && on.parentElement;
        if (strip && strip.scrollWidth > strip.clientWidth + 2) {
          const want = on.offsetLeft - (strip.clientWidth - on.offsetWidth) / 2;
          strip.scrollTo({ left: Math.max(0, want), behavior: 'smooth' });
        }
        if (k === 'end') { tCountG.textContent = 'Beyond'; tCount.textContent = '∞'; tCountOf.textContent = ''; }
        else if (k < WT) { tCountG.textContent = 'Tools'; tCount.textContent = pad(Math.max(1, k)); tCountOf.textContent = '/ ' + pad(NTOOL); }
        else { tCountG.textContent = 'Work'; tCount.textContent = pad(Math.max(1, k - WT)); tCountOf.textContent = '/ ' + pad(NWORK); }
      }
      // the other side
      fin.classList.toggle('on', s > 0);
      fin.classList.toggle('live', s > .9);
      fin.style.setProperty('--ft', range(s, .78, .9).toFixed(3));
      finTxt.style.setProperty('--f1', range(s, .84, .9).toFixed(3));
      finTxt.style.setProperty('--f2', range(s, .86, .92).toFixed(3));
      finTxt.style.setProperty('--f3', range(s, .88, .94).toFixed(3));
      finTxt.style.setProperty('--f4', range(s, .9, .95).toFixed(3));
      finTxt.style.setProperty('--f5', range(s, .91, .96).toFixed(3));
      fin.style.setProperty('--f1', range(s, .84, .9).toFixed(3));
      if (s > 0) finKick();
      // without WebGL: a CSS tunnel and a CSS black hole
      if (!tess.classList.contains('gl-on')) {
        tCss.forEach((el, i) => {
          const z = ((i - (c * 2)) % tCss.length + tCss.length) % tCss.length;
          el.style.setProperty('--o', ((z < .4 ? z / .4 : 1 - z / tCss.length) * (1 - q)).toFixed(3));
          el.style.setProperty('--s', (1.6 / (1 + z * .55)).toFixed(3));
        });
        bhCss.style.setProperty('--bh', (range(q, .05, .3) * (1 - range(s, 0, .1))).toFixed(3));
        bhCss.style.setProperty('--bs', (.1 + 3 * q * q).toFixed(3));
        bhCss.style.setProperty('--bf', (range(q, .8, 1) * 3000).toFixed(0) + 'px');
      }
      glKick();
    });

    /* ---------- the other side: a universe inside the sunglasses lens, then the film plays out ----------
       The film is the sunglasses and smoke clip (webp frames, scrubbed by scroll). We start deep inside
       one lens of its close-up frame, pull back out of the glass, then the clip runs: light streak,
       smoke, and Rahul in the black suit. Wide screens use the 16:9 cut, tall screens the vertical cut. */
    const fx = finCv.getContext('2d');
    const FILMS = {
      'hero-film': { n: 84, z: 12, c: [320, 470], half: [190, 200],
        lens: [[40, 270], [100, 245], [200, 222], [300, 218], [400, 228], [510, 250], [545, 285], [555, 350], [552, 450], [545, 550], [530, 640], [505, 690], [400, 712], [250, 712], [160, 670], [110, 600], [80, 480], [45, 400], [35, 330]] },
      reveal: { n: 96, z: 0, c: [412, 392], half: [70, 55],
        lens: [[325, 330], [360, 318], [420, 312], [470, 318], [492, 335], [500, 380], [502, 430], [495, 455], [460, 467], [410, 467], [380, 458], [335, 440], [322, 390]],
        lens2: [[120, 350], [150, 338], [200, 334], [240, 342], [262, 360], [265, 410], [258, 460], [240, 478], [195, 480], [160, 465], [132, 430], [120, 390]], c2: [192, 408] }
    };
    let film = null, filmKey = null, uniImg = null, starCv = null, finRunning = false, finWant = 0;
    function rng(seed) { let t = seed; return () => { t = (t * 16807) % 2147483647; return (t - 1) / 2147483646; }; }
    function makeUniverse(N) {
      const cv = document.createElement('canvas'); cv.width = cv.height = N;
      const g = cv.getContext('2d'), R = rng(11);
      g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
      g.globalCompositeOperation = 'lighter';
      [[.3, .35, .55, '42,76,255', .32], [.72, .62, .5, '122,44,255', .24], [.55, .45, .3, '255,122,46', .16], [.2, .78, .4, '30,140,255', .18]].forEach(([x, y, r, c, a]) => {
        const gr = g.createRadialGradient(x * N, y * N, 0, x * N, y * N, r * N);
        gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = gr; g.fillRect(0, 0, N, N);
      });
      for (let i = 0; i < N * 1.6; i++) {
        const r = Math.pow(R(), 2.2) * 1.6 + .3, b = R();
        g.fillStyle = `rgba(${b > .8 ? '255,214,170' : b > .6 ? '170,200,255' : '255,255,255'},${(.25 + R() * .75).toFixed(2)})`;
        g.fillRect(R() * N, R() * N, r, r);
      }
      const cx = N * .5, cy = N * .5;
      for (let i = 0; i < N * 3.4; i++) {
        const rr = Math.pow(R(), .7) * N * .3, arm = (i % 3) * Math.PI * 2 / 3;
        const a = arm + rr / N * 9 + (R() - .5) * (.5 + 40 / (rr + 20));
        const w = rr / (N * .3);
        g.fillStyle = `rgba(${Math.round(255 - w * 120)},${Math.round(200 - w * 40)},${Math.round(150 + w * 105)},${(.5 - w * .3).toFixed(2)})`;
        g.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .55, 1.4, 1.4);
      }
      const core = g.createRadialGradient(cx, cy, 0, cx, cy, N * .09);
      core.addColorStop(0, 'rgba(255,236,210,.95)'); core.addColorStop(.3, 'rgba(255,170,90,.45)'); core.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = core; g.fillRect(0, 0, N, N);
      for (let i = 0; i < 9; i++) {
        const x = R() * N, y = R() * N, l = 8 + R() * 22;
        g.strokeStyle = 'rgba(255,240,220,.55)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x - l, y); g.lineTo(x + l, y); g.moveTo(x, y - l); g.lineTo(x, y + l); g.stroke();
        g.fillStyle = '#fff'; g.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
      return cv;
    }
    // stars that stay around him once the film plays: screen sized, kept clear of the middle where he stands
    function makeStars(W, H) {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const g = cv.getContext('2d'), R = rng(29);
      for (let i = 0; i < W * H / 1400; i++) {
        const r = R() < .05 ? 2 : R() < .3 ? 1.3 : .8;
        g.fillStyle = `rgba(${R() > .7 ? '190,210,255' : '255,255,255'},${(.3 + R() * .7).toFixed(2)})`;
        g.fillRect(R() * W, R() * H, r, r);
      }
      const port = W < H, mx = port ? W * .5 : W * .6, my = port ? H * .42 : H * .62, rad = Math.max(W, H) * (port ? .38 : .34);
      const hole = g.createRadialGradient(mx, my, 0, mx, my, rad);
      hole.addColorStop(0, '#000'); hole.addColorStop(.55, 'rgba(0,0,0,.85)'); hole.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = hole; g.fillRect(0, 0, W, H);
      return cv;
    }
    function ensureFilm() {
      if (!uniImg) {
        // painted deep space (assets/deepspace.webp); a quick drawn galaxy stands in until it arrives
        uniImg = makeUniverse(vw < 700 ? 700 : 1000);
        const dsp = new Image(); dsp.decoding = 'async';
        dsp.onload = () => { uniImg = dsp; if (S.s > 0) drawFin(performance.now()); };
        dsp.src = 'assets/deepspace.webp';
      }
      const key = innerWidth / innerHeight < .9 ? 'reveal' : 'hero-film';
      if (film && filmKey === key) return;
      filmKey = key;
      film = loadSeq(key, FILMS[key].n, () => { if (S.s > 0) drawFin(performance.now()); }, () => finWant);
    }
    addEventListener('load', () => setTimeout(ensureFilm, 4000));
    function sizeFin() {
      const dpr = Math.min(devicePixelRatio || 1, 1.75), W = Math.round(finCv.clientWidth * dpr), H = Math.round(finCv.clientHeight * dpr);
      if (W === finCv.width && H === finCv.height) return;
      finCv.width = W; finCv.height = H;
      starCv = null;
      if (film) ensureFilm();
      if (S.s > 0) drawFin(performance.now());
    }
    function finKick() { if (!finRunning) { finRunning = true; requestAnimationFrame(finFrame); } }
    function finFrame(now) {
      const r = tess.getBoundingClientRect();
      if (S.s <= 0 || r.bottom < -40 || r.top > vh + 40) { finRunning = false; return; }
      drawFin(now);
      requestAnimationFrame(finFrame);
    }
    function lensPath(poly, ox, oy, k) {
      fx.beginPath();
      poly.forEach(([x, y], i) => i ? fx.lineTo(ox + x * k, oy + y * k) : fx.moveTo(ox + x * k, oy + y * k));
      fx.closePath();
    }
    function drawFin(now) {
      const s = S.s;
      if (s <= 0) return;
      if (!finCv.width && finCv.clientWidth) sizeFin();
      const W = finCv.width, H = finCv.height;
      if (!W) return;
      fx.globalCompositeOperation = 'source-over'; fx.globalAlpha = 1;
      fx.fillStyle = '#000'; fx.fillRect(0, 0, W, H);
      if (!film || !uniImg) return;
      const F = FILMS[filmKey];
      const e = easeInOut(range(s, .1, .42));                               // pulling back out of the lens
      const fi = Math.round(F.z + range(s, .44, .86) * (F.n - 1 - F.z));     // then the film plays
      finWant = fi;
      const im = film.pick(fi);
      if (!im) return;
      const iw = im.naturalWidth, ih = im.naturalHeight;
      const fs = Math.max(W / iw, H / ih);
      const Px = W > H ? W / (2 * fs) : clamp(iw / 2, W / (2 * fs), iw - W / (2 * fs));
      const Py = H / (2 * fs);
      const Z0 = Math.max(W / (2 * F.half[0] * fs), H / (2 * F.half[1] * fs)) * 1.3;
      const k = fs * Math.pow(Z0, 1 - e);
      const lsx = W / 2 + (F.c[0] - Px) * fs * e, lsy = H / 2 + (F.c[1] - Py) * fs * e;
      const ox = lsx - F.c[0] * k, oy = lsy - F.c[1] * k;                   // screen = o + frame * k
      fx.fillStyle = '#050607'; fx.fillRect(0, 0, W, H);
      fx.drawImage(im, ox, oy, iw * k, ih * k);
      fx.globalCompositeOperation = 'screen';
      // stars around him once the film is under way
      const sa = range(s, .5, .8) * .7;
      if (sa > 0) {
        if (!starCv || starCv.width !== W || starCv.height !== H) starCv = makeStars(W, H);
        fx.globalAlpha = sa; fx.drawImage(starCv, 0, 0);
      }
      // the universe in the lens: it fills the screen at first, shrinks back into the glass, and fades as the light streak arrives
      const uIn = range(s, .03, .12) * (1 - range(s, .4, .5)), t = now * .001;
      if (uIn > .002) {
        const full = Math.hypot(W, H) * 1.08, sz = full * Math.pow(k / (fs * Z0), .7);
        [[F.lens, F.c, 1 - .35 * e], [F.lens2, F.c2, .6 * e]].forEach(([poly, c0, a], j) => {
          if (!poly || a * uIn <= .002) return;
          fx.save(); lensPath(poly, ox, oy, k); fx.clip();
          fx.globalAlpha = uIn * a;
          // a slow turn and a gentle breath, so the nebula feels alive rather than spinning
          const br = sz * (1 + .04 * Math.sin(t * .35 + j));
          fx.translate(ox + c0[0] * k, oy + c0[1] * k); fx.rotate(s * .35 + t * .006 + j * 2.1);
          fx.drawImage(uniImg, -br / 2, -br / 2, br, br);
          fx.restore();
        });
      }
      fx.globalAlpha = 1; fx.globalCompositeOperation = 'source-over';
    }

    /* ---------- WebGL: three.js r128 from cdnjs, loaded after the page ---------- */
    let gl = null, glRunning = false;
    function glKick() { if (gl && !glRunning) { glRunning = true; requestAnimationFrame(glFrame); } }
    function glFrame(now) {
      const r = tess.getBoundingClientRect();
      if (r.bottom < -40 || r.top > vh + 40) { glRunning = false; return; }
      gl.draw(now);
      requestAnimationFrame(glFrame);
    }
    function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

    /* the frozen frames on the walls: 12 tiles of 512 x 320, painted from the work itself */
    const TW = 512, TH = 320;
    function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function drawAtlas(cv, done) {
      const g = cv.getContext('2d');
      const PA = '#f2eee5', OR = '#ff7a2e', MU = 'rgba(242,238,229,.45)', LN = 'rgba(242,238,229,.22)';
      const at = (i, fn) => { g.save(); g.translate((i % 4) * TW, Math.floor(i / 4) * TH); g.beginPath(); g.rect(0, 0, TW, TH); g.clip(); g.fillStyle = '#100b08'; g.fillRect(0, 0, TW, TH); fn(); g.restore(); };
      const label = (txt, x = 22, y = 34) => { g.font = '600 15px ui-monospace,Menlo,monospace'; g.fillStyle = MU; g.fillText(txt, x, y); };
      const bars = (x, y, ws, h = 9, gap = 18, c = LN) => ws.forEach((w, i) => { g.fillStyle = c; rr(g, x, y + i * gap, w, h, 4); g.fill(); });
      const img = (src, fn) => { const im = new Image(); im.onload = () => { fn(im); done(); }; im.src = src; };
      // 3 · enquiry to quote
      at(3, () => {
        label('ENQUIRY IN · SAMPLE');
        bars(22, 54, [420, 380, 300]);
        g.fillStyle = 'rgba(255,122,46,.55)'; [[60, 52, 120], [250, 70, 110], [120, 88, 140]].forEach(([x, y, w]) => { rr(g, x, y, w, 13, 4); g.fill(); });
        g.fillStyle = OR; g.font = '600 22px sans-serif'; g.fillText('↓ read, matched, drafted', 22, 150);
        g.strokeStyle = LN; g.lineWidth = 2; rr(g, 22, 170, 468, 128, 14); g.stroke();
        g.font = '500 19px sans-serif'; g.fillStyle = PA;
        [['Pump set 22 kW', '× 2'], ['Seal kit, spare', '× 1'], ['Need by', '14 Dec']].forEach(([a, b], i) => { g.fillText(a, 40, 202 + i * 30); g.fillText(b, 420, 202 + i * 30); });
        g.fillStyle = OR; g.fillText('● Waiting for approval', 40, 290);
      });
      // 4 · operations board
      at(4, () => {
        label('OPERATIONS BOARD · SAMPLE');
        [['12', 'Enquiries'], ['5', 'Quotes'], ['8', 'Jobs'], ['3', 'Reports']].forEach(([n, l], i) => {
          g.strokeStyle = LN; g.lineWidth = 2; rr(g, 22 + i * 120, 52, 108, 84, 12); g.stroke();
          g.fillStyle = PA; g.font = '800 38px sans-serif'; g.fillText(n, 36 + i * 120, 102);
          g.fillStyle = MU; g.font = '500 13px sans-serif'; g.fillText(l, 36 + i * 120, 124);
        });
        [40, 55, 35, 70, 60, 82, 66, 90].forEach((v, i) => { g.fillStyle = i === 7 ? OR : 'rgba(242,238,229,.6)'; rr(g, 30 + i * 58, 290 - v * 1.4, 38, v * 1.4, 6); g.fill(); });
      });
      // 5 · product website
      at(5, () => {
        g.fillStyle = MU; g.font = '600 14px ui-monospace,monospace'; g.fillText('PS-SERIES', 22, 34); g.fillText('MODELS · SPECS · ENQUIRE', 280, 34);
        g.fillStyle = PA; g.font = '800 34px sans-serif'; g.fillText('Pump skids that', 22, 88); g.fillText('arrive ready to run.', 22, 126);
        ['PS-90', 'PS-120', 'PS-150'].forEach((m, i) => { g.fillStyle = i === 1 ? OR : 'rgba(242,238,229,.14)'; rr(g, 22 + i * 110, 150, 98, 34, 17); g.fill(); g.fillStyle = i === 1 ? '#100b08' : PA; g.font = '600 15px sans-serif'; g.fillText(m, 40 + i * 110, 173); });
        [['Motor', '22 kW'], ['Flow', '120 m³/h'], ['Head', '45 m']].forEach(([a, b], i) => { g.strokeStyle = LN; rr(g, 22 + i * 156, 204, 144, 80, 12); g.stroke(); g.fillStyle = MU; g.font = '500 13px sans-serif'; g.fillText(a, 36 + i * 156, 230); g.fillStyle = PA; g.font = '700 24px sans-serif'; g.fillText(b, 36 + i * 156, 266); });
      });
      // 6 · web
      at(6, () => {
        g.strokeStyle = LN; g.lineWidth = 2; rr(g, 20, 20, 472, 280, 14); g.stroke();
        ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(42 + i * 18, 42, 5, 0, 7); g.fill(); });
        g.fillStyle = 'rgba(242,238,229,.1)'; rr(g, 110, 33, 300, 18, 9); g.fill();
        g.fillStyle = PA; g.font = '800 36px sans-serif'; g.fillText('Websites that', 44, 112); g.fillStyle = OR; g.fillText('make an impression', 44, 152);
        g.fillStyle = OR; rr(g, 44, 172, 120, 32, 16); g.fill();
        [0, 1, 2].forEach(i => { g.fillStyle = 'rgba(242,238,229,.1)'; rr(g, 44 + i * 146, 222, 132, 60, 10); g.fill(); });
      });
      // 7 · automation
      at(7, () => {
        label('AUTOMATION · MAIL → SORT → FILE');
        g.strokeStyle = 'rgba(255,122,46,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(90, 170); g.lineTo(420, 170); g.stroke();
        ['MAIL', 'SORT', 'FILE'].forEach((t, i) => { g.fillStyle = '#1d140e'; rr(g, 30 + i * 165, 135, 125, 70, 16); g.fill(); g.strokeStyle = i === 1 ? OR : LN; g.lineWidth = 2; g.stroke(); g.fillStyle = PA; g.font = '700 20px ui-monospace,monospace'; g.fillText(t, 66 + i * 165, 177); });
        [150, 300].forEach(x => { g.fillStyle = OR; g.beginPath(); g.arc(x + 18, 170, 7, 0, 7); g.fill(); });
        bars(30, 240, [200, 300, 150], 8, 16);
      });
      // 8 · 3D
      at(8, () => {
        label('3D · INTERACTIVE');
        const P = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([x, y, z]) => {
          const a = .7, b = .45, X = x * Math.cos(a) - z * Math.sin(a), Z = x * Math.sin(a) + z * Math.cos(a), Y = y * Math.cos(b) - Z * Math.sin(b);
          return [256 + X * 70, 170 + Y * 70];
        });
        g.strokeStyle = OR; g.lineWidth = 3;
        [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => { g.beginPath(); g.moveTo(...P[a]); g.lineTo(...P[b]); g.stroke(); });
        g.strokeStyle = LN; g.beginPath(); g.ellipse(256, 282, 130, 18, 0, 0, 7); g.stroke();
      });
      // 9 · apps
      at(9, () => {
        g.strokeStyle = PA; g.lineWidth = 3; rr(g, 186, 14, 140, 292, 22); g.stroke();
        g.fillStyle = PA; g.font = '700 18px sans-serif'; g.fillText('Today', 204, 56);
        [0, 1, 2, 3].forEach(i => { g.fillStyle = i === 1 ? OR : 'rgba(242,238,229,.5)'; g.beginPath(); g.arc(214, 92 + i * 52, 9, 0, 7); g.fill(); g.fillStyle = 'rgba(242,238,229,.2)'; rr(g, 232, 86 + i * 52, 76, 12, 6); g.fill(); });
        label('APPS', 22, 34); bars(22, 120, [120, 90, 140], 8, 18);
      });
      // 11 · the PS-120 sketch
      at(11, () => {
        label('FIG. 02 · PS-120');
        g.strokeStyle = PA; g.lineWidth = 2.5;
        rr(g, 40, 250, 430, 20, 3); g.stroke();
        rr(g, 60, 160, 150, 90, 10); g.stroke();
        for (let x = 74; x < 200; x += 12) { g.beginPath(); g.moveTo(x, 168); g.lineTo(x, 242); g.stroke(); }
        rr(g, 210, 186, 40, 36, 5); g.stroke();
        g.strokeStyle = OR; g.beginPath(); g.arc(310, 200, 50, 0, 7); g.stroke(); g.beginPath(); g.arc(310, 200, 22, 0, 7); g.stroke();
        g.strokeStyle = PA; rr(g, 360, 180, 100, 34, 3); g.stroke(); rr(g, 294, 90, 32, 60, 3); g.stroke();
        g.beginPath(); g.arc(310, 70, 14, 0, 7); g.stroke();
      });
      done();
      img('assets/pump-blueprint.webp', im => at(0, () => {
        const s = Math.max(TW / im.naturalWidth, TH / im.naturalHeight);
        g.drawImage(im, (TW - im.naturalWidth * s) / 2, (TH - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
      }));
      img('assets/chain-reaction.webp', im => at(1, () => {
        const h = TH - 24, w = im.naturalWidth * h / im.naturalHeight;
        g.drawImage(im, 120, 12, w, h);
        g.fillStyle = PA; g.font = '800 26px sans-serif'; g.fillText('Chain', 280, 120); g.fillText('Reaction', 280, 152);
        g.fillStyle = OR; g.font = '600 15px ui-monospace,monospace'; g.fillText('● LIVE APP', 280, 186);
      }));
      img('assets/chain-reaction-board.webp', im => at(2, () => {
        const h = TH - 24, w = im.naturalWidth * h / im.naturalHeight;
        g.drawImage(im, 40, 12, w, h);
        g.fillStyle = MU; g.font = '600 14px ui-monospace,monospace'; g.fillText('2 TO 8 PLAYERS', 230, 150); g.fillText('WORKS OFFLINE', 230, 176);
      }));
      img('assets/rahul-anime.webp', im => at(10, () => {
        g.fillStyle = 'rgba(255,122,46,.22)'; g.font = '800 120px sans-serif'; g.fillText('RAHUL', 20, 150); g.fillText('RAJ', 20, 270);
        const h = TH * 1.4, w = im.naturalWidth * h / im.naturalHeight;
        g.drawImage(im, 300, 4, w, h);
      }));
    }

    function buildGL() {
      const THREE = window.THREE, canvas = $('.tess-gl', tess);
      let renderer;
      try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
      catch (e) { return null; }
      const BG = 0x0b0806, mob = vw < 700;
      renderer.setClearColor(BG, 1);
      renderer.autoClear = false;
      const scene3 = new THREE.Scene();
      scene3.fog = new THREE.Fog(BG, 10, 95);
      const cam = new THREE.PerspectiveCamera(66, 1, .1, 900);
      // `world` is built in corridor units (the corridor runs from -1 to 1 across) and scaled to fit the cards.
      // `walls` is built in world units and rebuilt on resize, so the frames keep their shape.
      const world = new THREE.Group(), walls = new THREE.Group();
      scene3.add(world, walls);
      const Z0 = 40, Z1 = -(NST + 9) * D;

      /* 1 · the lattice: thin glowing beams on all three axes, brighter near the corridor */
      const XS = [1, 2.2, 3.4, 4.6], pos = [], col = [];
      const push = (a, b, k) => { pos.push(...a, ...b); col.push(k, .5 * k, .22 * k, k, .5 * k, .22 * k); };
      for (const x of XS) for (const y of XS) for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const near = Math.max(x, y);
        push([sx * x, sy * y, Z0], [sx * x, sy * y, Z1], near < 1.5 ? .72 : near < 3 ? .42 : .26);
      }
      for (let z = Z0; z > Z1; z -= (mob ? 8 : 4)) for (const v of XS) for (const sv of [-1, 1]) {
        const k = v < 1.5 ? .5 : .24;
        push([-4.6, sv * v, z], [4.6, sv * v, z], k); push([sv * v, -4.6, z], [sv * v, 4.6, z], k);
      }
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      lg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      world.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true })));

      /* 2 · strands: thousands of thin threads, the time lines */
      const sp = [], sc = [], NS = mob ? 1400 : 2800;
      for (let n = 0; n < NS; n++) {
        const z = Z0 + Math.random() * (Z1 - Z0), a = Math.random();
        const out = 1.05 + Math.random() * 3.4, sd = Math.random() < .5 ? -1 : 1;
        const k = .1 + Math.pow(Math.random(), 3) * .8, cg = .55 + Math.random() * .25, cb = .22 + Math.random() * .15;
        if (a < .45) { const x = sd * out; sp.push(x, -4.6, z, x, 4.6, z); }
        else if (a < .75) { const y = sd * out; sp.push(-4.6, y, z, 4.6, y, z); }
        else { const x = sd * out, y = (Math.random() * 2 - 1) * 4.4, l = 3 + Math.random() * 22; sp.push(x, y, z, x, y, z - l); }
        sc.push(k, cg * k, cb * k, k, cg * k, cb * k);
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
      const strands = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      world.add(strands);
      const dp = [], ND = mob ? 700 : 1500;
      for (let n = 0; n < ND; n++) dp.push((Math.random() * 2 - 1) * 1.6, (Math.random() * 2 - 1) * 1.6, Z0 + Math.random() * (Z1 - Z0));
      const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
      const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xFFB070, size: .07, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));
      scene3.add(dust);

      /* 3 · rooms: one glowing frame around every station */
      const box = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
      const RD = 7;
      const rooms = sts.map(() => { const m = new THREE.LineSegments(box, new THREE.LineBasicMaterial({ color: 0xFF6A2E, transparent: true, opacity: .95 })); world.add(m); return m; });

      /* 4 · the walls: frozen frames of the work, repeated down the corridor and echoed behind each other in time */
      const atlasCv = document.createElement('canvas'); atlasCv.width = TW * 4; atlasCv.height = TH * 3;
      const atlas = new THREE.CanvasTexture(atlasCv);
      atlas.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      drawAtlas(atlasCv, () => { atlas.needsUpdate = true; markDirty(); glKick(); });
      const mkMat = () => new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { uAtlas: { value: atlas }, uTime: { value: 0 }, uFogN: { value: 10 }, uFogF: { value: 95 }, uWall: { value: 1 }, uImg: { value: 1 }, uEdge: { value: .8 } },
        vertexShader: `
          attribute vec2 aLocal; attribute float aTile; attribute float aAlpha; attribute float aSeed;
          varying vec2 vLocal; varying float vTile; varying float vAlpha; varying float vSeed; varying float vDepth;
          void main(){
            vLocal=aLocal; vTile=aTile; vAlpha=aAlpha; vSeed=aSeed;
            vec4 mv=modelViewMatrix*vec4(position,1.);
            vDepth=-mv.z; gl_Position=projectionMatrix*mv;
          }`,
        fragmentShader: `
          uniform sampler2D uAtlas; uniform float uTime, uFogN, uFogF, uWall, uImg, uEdge;
          varying vec2 vLocal; varying float vTile; varying float vAlpha; varying float vSeed; varying float vDepth;
          void main(){
            float cx=mod(vTile+.01,4.), cy=floor((vTile+.01)/4.);
            vec2 uv=vec2((floor(cx)+vLocal.x)/4., 1.-(cy+1.-vLocal.y)/3.);
            vec3 c=texture2D(uAtlas,uv).rgb;
            float l=dot(c,vec3(.3,.59,.11));
            vec3 warm=mix(vec3(1.,.56,.26)*l*1.6,c,.38);                      // frozen in amber
            float scan=.78+.22*sin(vLocal.y*240.+uTime*2.6+vSeed*30.);
            vec2 e=min(vLocal,1.-vLocal);
            float edge=1.-smoothstep(0.,.022,min(e.x,e.y*1.6));
            float fog=1.-smoothstep(uFogN,uFogF,vDepth);
            vec3 o=warm*scan*uImg+vec3(1.,.6,.3)*edge*uEdge;
            gl_FragColor=vec4(o,vAlpha*uWall*fog);
          }`
      });
      const frameMat = mkMat();
      function quads() {
        const P = [], L = [], Tl = [], Al = [], Sd = [], I = [];
        return {
          add(c0, c1, c2, c3, tile, alpha, seed) {
            const v = P.length / 3;
            P.push(...c0, ...c1, ...c2, ...c3); L.push(0, 0, 1, 0, 1, 1, 0, 1);
            for (let i = 0; i < 4; i++) { Tl.push(tile); Al.push(alpha); Sd.push(seed); }
            I.push(v, v + 1, v + 2, v, v + 2, v + 3);
          },
          geo() {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
            g.setAttribute('aLocal', new THREE.Float32BufferAttribute(L, 2));
            g.setAttribute('aTile', new THREE.Float32BufferAttribute(Tl, 1));
            g.setAttribute('aAlpha', new THREE.Float32BufferAttribute(Al, 1));
            g.setAttribute('aSeed', new THREE.Float32BufferAttribute(Sd, 1));
            g.setIndex(I); return g;
          }
        };
      }
      // a frame on a side wall (sx = -1 left, 1 right), centred at z, reading the right way from inside
      const sideQuad = (Q, sx, X, y0, y1, z, l, tile, a, seed) => {
        const zn = z + l / 2, zf = z - l / 2;
        if (sx < 0) Q.add([X, y0, zn], [X, y0, zf], [X, y1, zf], [X, y1, zn], tile, a, seed);
        else Q.add([X, y0, zf], [X, y0, zn], [X, y1, zn], [X, y1, zf], tile, a, seed);
      };
      const flatQuad = (Q, sy, Y, x0, x1, z, l, tile, a, seed) => {
        const zn = z + l / 2, zf = z - l / 2;
        if (sy < 0) Q.add([x0, Y, zn], [x1, Y, zn], [x1, Y, zf], [x0, Y, zf], tile, a, seed);
        else Q.add([x0, Y, zf], [x1, Y, zf], [x1, Y, zn], [x0, Y, zn], tile, a, seed);
      };
      const slots = sts.map((st, k) => {
        if (!side[k]) return null;
        const mat = mkMat(); mat.uniforms.uEdge.value = 1;
        const m = new THREE.Mesh(new THREE.BufferGeometry(), mat); walls.add(m);
        return { m, mat, k };
      });
      let wallMesh = null;
      const LAYERS = [[1, .8], [1.5, .34], [2.05, .15]];        // the same moment echoed further out, fainter
      function buildWalls(hx, hy, dims) {
        if (wallMesh) { walls.remove(wallMesh); wallMesh.geometry.dispose(); }
        const Q = quads();
        const rowsS = hy > hx ? 5 : 3, colsF = hx > hy * 1.3 ? 3 : 2;
        const fh = 2 * hy / rowsS * .84, fl = fh * TW / TH, pitchS = fl * 1.16;
        const fw = 2 * hx / colsF * .86, flF = fw * TH / TW, pitchF = flF * 1.2;
        // where the items wait on their walls, so ordinary frames keep clear of them
        const slotAt = sts.map((st, k) => side[k] ? { z: -k * D + 6, l: Math.min(D * .62, 2 * hy * .8 * dims[k].bw / dims[k].bh), sd: side[k] } : null);
        let n = 0;
        for (const sx of [-1, 1]) for (let r = 0; r < rowsS; r++) for (let z = Z0 - pitchS * (r % 2 ? .5 : 0); z > Z1; z -= pitchS) {
          n++;
          const busy = slotAt.some(s => s && s.sd === sx && Math.abs(z - s.z) < (s.l + fl) / 2 + .6);
          const tile = Math.floor(hash(n * 1.7) * 12), y0 = -hy + (r + .08) * 2 * hy / rowsS;
          LAYERS.forEach(([m, a], j) => {
            if (j === 0 && busy) return;
            sideQuad(Q, sx, sx * hx * m, y0, y0 + fh, z + j * fl * .32 * (sx < 0 ? 1 : -1), fl, tile, a * (.7 + hash(n) * .3), hash(n + j));
          });
        }
        for (const sy of [-1, 1]) for (let ci = 0; ci < colsF; ci++) for (let z = Z0 - pitchF * (ci % 2 ? .5 : 0); z > Z1; z -= pitchF) {
          n++;
          const tile = Math.floor(hash(n * 2.3) * 12), x0 = -hx + (ci + .07) * 2 * hx / colsF;
          LAYERS.forEach(([m, a], j) => flatQuad(Q, sy, sy * hy * m, x0, x0 + fw, z - j * flF * .3, flF, tile, a * .75 * (.7 + hash(n) * .3), hash(n + j)));
        }
        wallMesh = new THREE.Mesh(Q.geo(), frameMat); walls.add(wallMesh);
        slots.forEach(sl => {
          if (!sl) return;
          const at = slotAt[sl.k], h = 2 * hy * .8, Qs = quads();
          sideQuad(Qs, at.sd, at.sd * hx * .995, -h / 2, h / 2, at.z, at.l, tileOf(sl.k), 1, sl.k);
          sl.m.geometry.dispose(); sl.m.geometry = Qs.geo();
        });
      }

      let hx = 10, hy = 6;
      let sizedW = 0, sizedH = 0;
      function size() {
        const w = tPin.clientWidth, h = tPin.clientHeight;
        if (w === sizedW && h === sizedH) return;                       // unchanged: never clear the picture
        sizedW = w; sizedH = h;
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mob ? 1.5 : 1.75));
        renderer.setSize(w, h, false);
        cam.fov = 66; cam.aspect = w / h; cam.updateProjectionMatrix();
        const visH = 2 * NEAR * Math.tan(cam.fov * Math.PI / 360), visW = visH * cam.aspect;
        const dims = sts.map(card => ({ bw: card.offsetWidth / w * visW, bh: card.offsetHeight / h * visH, y: -(card.offsetTop - h / 2) / h * visH }));
        hx = Math.max(...dims.map(d => d.bw)) / 2 * 1.22 + .5;
        hy = Math.max(...dims.map(d => d.bh / 2 + Math.abs(d.y))) * 1.22 + .5;
        rooms.forEach((m, k) => {
          const d = dims[k];
          m.scale.set(d.bw * 1.03 / hx, d.bh * 1.05 / hy, RD);
          m.position.set(0, d.y / hy, -k * D - NEAR - RD / 2);
        });
        buildWalls(hx, hy, dims);
      }

      /* 5 · the black hole: one full-screen shader drawn over the corridor */
      const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), bhScene = new THREE.Scene();
      const bhMat = new THREE.ShaderMaterial({
        transparent: true, depthTest: false, depthWrite: false,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
        uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uSize: { value: .05 }, uAlpha: { value: 0 }, uFill: { value: 0 } },
        vertexShader: 'void main(){gl_Position=vec4(position.xy,0.,1.);}',
        fragmentShader: `
          uniform vec2 uRes; uniform float uTime, uSize, uAlpha, uFill;
          float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
          float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
          float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
          void main(){
            vec2 p=(gl_FragCoord.xy-.5*uRes)/min(uRes.x,uRes.y);
            float R=uSize, r=length(p);
            vec2 sp=p-normalize(p+1e-5)*(R*R*1.6/max(r,R*.5));
            vec2 g=floor(sp*140.); float st=step(.985,hash(g))*hash(g+3.)*(1.-smoothstep(R*2.5,R*8.,r));
            vec3 col=vec3(st)*vec3(1.,.9,.8);
            float ang=atan(p.y,p.x);
            float tb=fbm(vec2(ang*3.+uTime*.35, r/R*5.-uTime*.6));
            float dop=clamp(1.-p.x/(R*3.2),.35,1.7);
            float halo=exp(-pow((r-R*1.32)/(R*.2),2.))*(.55+.7*tb);
            float ring=exp(-pow((r-R*1.05)/(R*.035),2.))*1.4;
            float dr=length(vec2(p.x,p.y/.12));
            float disc=smoothstep(R*1.25,R*1.6,dr)*(1.-smoothstep(R*2.6,R*4.4,dr))*(.5+.9*tb);
            float band=exp(-pow(p.y/(R*.11),2.));
            vec3 warm=vec3(1.,.72,.42), hot=vec3(1.,.93,.8);
            col+=warm*halo*dop+hot*ring*dop;
            float shadow=1.-smoothstep(R*.97,R*1.01,r);
            col*=1.-shadow;
            col+=mix(warm,hot,band)*disc*band*1.6*dop;
            float a=max(shadow*(1.-band*disc), 0.);
            col*=uAlpha; a*=uAlpha;
            col*=1.-uFill; a=max(a,uFill);
            gl_FragColor=vec4(col,a);
          }`
      });
      bhScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bhMat));

      size();
      addEventListener('resize', size);
      let mx = 0, my = 0;
      addEventListener('pointermove', e => { mx = e.clientX / vw - .5; my = e.clientY / vh - .5; }, { passive: true });
      return {
        draw(now) {
          const t = now * .001, { c, q, s } = S;
          if (s > .02) return;                                   // the lens scene covers everything from here
          renderer.clear();
          const f = c - Math.floor(c), warp = q > 0 ? 0 : Math.sin(Math.PI * f) * (c > -.5 ? 1 : 0);
          const eq = q * q;
          cam.fov = 66 + warp * 16 + eq * 50; cam.updateProjectionMatrix();
          const z = -c * D, sz = 1 + eq * 6;
          world.scale.set(hx, hy, sz); world.position.z = z * (1 - sz);
          walls.scale.set(1, 1, sz); walls.position.z = z * (1 - sz);
          cam.position.set((Math.sin(t * .4) * .12 + mx * .25) * (1 - q), (Math.cos(t * .33) * .1 - my * .2) * (1 - q), z);
          cam.lookAt(mx * .6 * (1 - q), -my * .4 * (1 - q), z - 20);
          cam.rotation.z += warp * .22 * (Math.floor(c) % 2 ? -1 : 1) + eq * 1.4;
          scene3.fog.near = 10 + q * 40; scene3.fog.far = 95 + q * 520;
          const wf = 1 - range(q, .45, .9);
          [frameMat, ...slots.filter(Boolean).map(sl => sl.mat)].forEach(m => {
            m.uniforms.uTime.value = t; m.uniforms.uFogN.value = scene3.fog.near; m.uniforms.uFogF.value = scene3.fog.far; m.uniforms.uWall.value = wf;
          });
          // an item's frame on the wall glows as you approach, then empties as the item swings out of it
          slots.forEach(sl => {
            if (!sl) return;
            const d = c - sl.k, e = easeInOut(range(d, -.92, -.06));
            sl.mat.uniforms.uImg.value = (.55 + .9 * range(d, -1.6, -.95)) * (1 - e);
            sl.mat.uniforms.uEdge.value = .5 + 1.2 * range(d, -1.6, -.95) * (1 - range(d, .2, 1.2) * .7);
          });
          strands.material.opacity = .85 + Math.sin(t * 1.3) * .15;
          dust.scale.set(hx, hy, 1); dust.position.y = Math.sin(t * .2) * .6;
          rooms.forEach((m, k) => { const d = Math.abs(c - k); m.material.opacity = d < .5 ? 1 : Math.max(.25, 1 - d * .4); });
          renderer.render(scene3, cam);
          bhMat.uniforms.uRes.value.set(renderer.domElement.width, renderer.domElement.height);
          bhMat.uniforms.uTime.value = t;
          if (q > 0) {
            bhMat.uniforms.uAlpha.value = range(q, .04, .3);
            bhMat.uniforms.uSize.value = .03 + Math.pow(range(q, .1, 1), 2.4) * 1.7;
            bhMat.uniforms.uFill.value = range(q, .88, 1);
            renderer.render(bhScene, ortho);
          }
        },
        size
      };
    }
    function loadThree() {
      if (window.THREE) return start();
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      sc.onload = start; sc.onerror = () => {};   // the CSS tunnel stays
      document.head.appendChild(sc);
      function start() {
        try { gl = buildGL(); } catch (e) { console.warn(e); gl = null; }
        if (gl) { tess.classList.add('gl-on'); markDirty(); glKick(); }
      }
    }
    if (document.readyState === 'complete') setTimeout(loadThree, 200);
    else addEventListener('load', () => setTimeout(loadThree, 200));
    addEventListener('resize', () => { placeAnchors(); sizeFin(); });
    requestAnimationFrame(sizeFin);
  }

  /* =========================================================
     Per-frame, unsmoothed: stacked cards and view elements
     ========================================================= */
  const views = $$('[data-view]').map(el => ({ el, k: el.dataset.view }));
  const inter = $('.inter'), m1 = $('.m1'), m2 = $('.m2'), m3 = $('.m3');
  function viewsTick() {
    for (const { el, k } of views) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) continue;
      const v = clamp((vh - r.top) / (vh + r.height));
      el.style.setProperty('--v', v.toFixed(4));
      if (k === 'inter') {
        m1.style.transform = `translate3d(${(-8 - v * 34).toFixed(2)}vw,0,0)`;
        m2.style.transform = `translate3d(${(-50 + v * 34).toFixed(2)}vw,0,0)`;
        m3.style.transform = `translate3d(${(-v * 30).toFixed(2)}vw,0,0)`;
        m1.style.fontVariationSettings = `"wght" ${Math.round(250 + easeInOut(range(v, .1, .6)) * 550)},"wdth" 100`;
        m2.style.fontVariationSettings = `"wght" 800,"wdth" ${Math.round(100 - easeInOut(range(v, .3, .8)) * 25)}`;
      } else if (k === 'portrait') el.style.setProperty('--pv', easeOut(range(v, .05, .45)).toFixed(4));
      else if (k === 'path') el.style.setProperty('--lv', easeInOut(range(v, .2, .5)).toFixed(4));
      else if (k === 'cta') el.style.setProperty('--fx', (range(v, .12, .5) * 100).toFixed(1) + '%');
      else if (k === 'giant') el.style.setProperty('--gv', easeOut(range(v, .05, .5)).toFixed(4));
    }
  }

  /* ---------- the loop: runs while scrolling or settling ---------- */
  let running = false, last = performance.now();
  function frame(now) {
    const dt = Math.min(64, now - last); last = now;
    const k = 1 - Math.pow(1 - .18, dt / 16.7);
    let busy = false;
    for (const s of scenes) {
      const r = s.el.getBoundingClientRect();
      const span = r.height - vh;
      s.target = span > 0 ? clamp(-r.top / span) : 0;
      if (s.cur < 0) s.cur = s.target;
      else s.cur += (s.target - s.cur) * k;
      if (Math.abs(s.target - s.cur) < .0004) s.cur = s.target; else busy = true;
      // only draw scenes that are near the screen
      if (r.bottom > -vh * .2 && r.top < vh * 1.2) s.fn(s.cur);
    }
    if (ANIM) viewsTick();
    chrome();
    if (busy) requestAnimationFrame(frame); else running = false;
  }
  function markDirty() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  addEventListener('scroll', markDirty, { passive: true });
  addEventListener('resize', () => {
    const w = innerWidth;
      vw = w; vh = stableVh(); markDirty();
  });
  addEventListener('load', markDirty);
  markDirty();
})();
