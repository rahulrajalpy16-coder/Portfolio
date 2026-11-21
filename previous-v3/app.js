/* =========================================================
   Momentum · scroll engine
   No libraries. Each [data-scene] is a tall section with a
   sticky stage; its scroll progress (0 to 1) is smoothed and
   handed to a scene function. [data-view] elements get a
   view progress as they cross the screen.
   ========================================================= */

/* Fill these in before publishing. Empty fields show a "To supply" tag. */
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
  let vw = innerWidth, vh = innerHeight;

  /* ---------- contact ---------- */
  (function contact() {
    const list = $('#clist'), msg = $('#cmsg');
    const rows = [
      ['Email', CONTACT.email && `<a href="mailto:${CONTACT.email}">${CONTACT.email}</a>`],
      ['Based in', CONTACT.place],
      ['LinkedIn', CONTACT.linkedin && `<a href="${CONTACT.linkedin}" target="_blank" rel="noopener">${CONTACT.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</a>`],
      ['GitHub', CONTACT.github && `<a href="${CONTACT.github}" target="_blank" rel="noopener">${CONTACT.github.replace(/^https?:\/\/(www\.)?/, '')}</a>`],
    ];
    list.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v || '<span class="supply">To supply</span>'}</dd></div>`).join('');
    const talk = $('#talk'), copy = $('#copy');
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
  /* the hero turns dark once the ink circle covers the top of the screen */
  function themeAt(sec, y) {
    if (sec.id === 'top' && ANIM && heroIris > (y < 100 ? .62 : .5)) return 'dark';
    return sec.dataset.theme;
  }

  /* =========================================================
     Scenes (animated mode only)
     ========================================================= */
  let heroIris = 0;
  const scenes = [];
  function scene(el, fn) { if (el) scenes.push({ el, fn, cur: -1, target: 0 }); }

  if (ANIM) {
    /* ---- 01 hero ---- */
    const hero = $('.hero'), heroPin = $('.pin', hero);
    const r1 = $('.r1', hero), r2 = $('.r2', hero), fig = $('.hero-fig', hero), iris = $('.iris', hero);
    // split the name into letters for the opening
    $$('.clip', hero).forEach(c => {
      const t = c.textContent; c.textContent = '';
      [...t].forEach((ch, i) => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; s.style.transitionDelay = (80 + i * 70 + (c.closest('.r2') ? 260 : 0)) + 'ms'; c.appendChild(s); });
    });
    requestAnimationFrame(() => requestAnimationFrame(() => html.classList.add('ready')));
    // the reveal: Rahul's own clip, 96 frames scrubbed by scroll inside the ink circle
    const cv = $('.rv-cv', hero), cx = cv.getContext('2d');
    const NF = 96, frames = new Array(NF);
    let lastDrawn = -1, wantFrame = 0;
    function loadFrames() {
      const order = [];                       // coarse pass first, then fill in
      for (let st = 16; st >= 1; st = st / 2 | 0) { for (let i = 0; i < NF; i += st) if (!order.includes(i)) order.push(i); if (st === 1) break; }
      order.forEach((i, n) => setTimeout(() => {
        const im = new Image(); im.decoding = 'async';
        im.onload = () => { frames[i] = im; if (Math.abs(i - wantFrame) < 8) { lastDrawn = -1; drawFrame(wantFrame); } };
        im.src = `assets/reveal/f${String(i + 1).padStart(3, '0')}.webp`;
      }, n * 12));
    }
    function sizeCv() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr);
      lastDrawn = -1; drawFrame(wantFrame);
    }
    function drawFrame(i) {
      wantFrame = i;
      let k = i; while (k > 0 && !frames[k]) k--;
      if (!frames[k]) { let j = i; while (j < NF - 1 && !frames[j]) j++; k = j; }
      const im = frames[k];
      if (!im || k === lastDrawn || !cv.width) return;
      lastDrawn = k;
      const s = Math.max(cv.width / im.naturalWidth, cv.height / im.naturalHeight);
      const w = im.naturalWidth * s, h = im.naturalHeight * s;
      cx.fillStyle = '#060707'; cx.fillRect(0, 0, cv.width, cv.height);
      cx.drawImage(im, (cv.width - w) / 2, (cv.height - h) * .35, w, h);
    }
    if (document.readyState === 'complete') loadFrames(); else addEventListener('load', loadFrames);
    addEventListener('resize', sizeCv);
    requestAnimationFrame(sizeCv);
    scene(hero, p => {
      const a = easeInOut(range(p, 0, .42));
      const spread = vw < 720 ? 60 : 34;
      // RAHUL drifts right, RAJ drifts left
      r1.style.transform = `translate3d(${(a * spread).toFixed(2)}vw,0,0)`;
      r2.style.transform = `translate3d(${(-a * spread).toFixed(2)}vw,0,0)`;
      if (p > .001 || html.classList.contains('scrolled')) {
        html.classList.add('scrolled');
        fig.style.transform = `translate(-50%,${(-a * 3).toFixed(2)}%) scale(${(1 - a * .1).toFixed(4)})`;
      }
      heroPin.style.setProperty('--meta-o', (1 - range(p, 0, .1)).toFixed(3));
      const t = easeInOut(range(p, .12, .45));
      heroIris = t;
      iris.style.setProperty('--r', (t * 122).toFixed(2) + '%');
      iris.style.setProperty('--io1', range(p, .4, .52).toFixed(3));
      iris.style.setProperty('--io2', range(p, .8, .9).toFixed(3));
      iris.style.setProperty('--is', (1.1 - .1 * easeOut(range(p, .35, .95))).toFixed(4));
      if (!cv.width && cv.clientWidth) sizeCv();
      drawFrame(Math.round(range(p, .2, .95) * (NF - 1)));
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

    /* ---- 04 capabilities: vertical scroll moves the track sideways ---- */
    const caps = $('.caps'), track = $('.track', caps), cube = $('.cube', caps), capsFoot = $('.caps-foot', caps);
    let travel = 0;
    function sizeCaps() {
      travel = Math.max(0, track.scrollWidth - vw);
      caps.style.height = (travel + vh * 1.35) + 'px';
    }
    sizeCaps();
    addEventListener('load', sizeCaps);
    if (document.fonts) document.fonts.ready.then(() => { sizeCaps(); markDirty(); });
    scene(caps, p => {
      const t = range(p, .08, .94);
      track.style.transform = `translate3d(${(-t * travel).toFixed(1)}px,0,0)`;
      capsFoot.style.setProperty('--cp', t.toFixed(3));
      cube.style.setProperty('--rot', (30 + p * 540).toFixed(1) + 'deg');
    });
    window.__sizeCaps = sizeCaps;

    /* ---- 05 work: the tesseract ----
       Scroll time T runs from -0.3 to N. Each project k is "held" while
       T is between k+0.25 and k+0.75; between holds the camera flies one
       room further down the lattice. c is the camera's position in rooms. */
    const tess = $('.tess'), tPin = $('.pin', tess), tCards = $$('.wcard', tess);
    const tIntro = $('.tess-intro', tess), tRooms = $$('.tess-rooms button', tess), tCount = $('.tess-count b', tess);
    const tCss = $$('.tess-css i', tess);
    const N = tCards.length, D = 28, NEAR = 9;   // room spacing and the distance a held room sits from the camera
    const PRE = .3;
    let camC = -1, roomNow = -1;
    const cOf = T => {
      const x = T + .5, n = Math.floor(x), f = x - n;
      return n - 1 + easeInOut(range(f, .25, .75));
    };
    tRooms.forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.room, r = tess.getBoundingClientRect();
      const top = r.top + scrollY, span = r.height - vh;
      const pT = (k + .5 + PRE) / (N + PRE);
      window.scrollTo({ top: top + pT * span, behavior: 'smooth' });
    }));
    scene(tess, p => {
      const T = p * (N + PRE) - PRE;
      const c = cOf(T);
      camC = c;
      // intro title shrinks into the lattice
      const io = 1 - range(c, -.62, -.32);
      tIntro.style.setProperty('--io', io.toFixed(3));
      tIntro.style.setProperty('--is', (1 - range(c, -.8, -.3) * .25).toFixed(4));
      tPin.style.setProperty('--ro', range(c, -.45, -.25).toFixed(3));
      // each room: real perspective, so the card grows as the camera closes in and passes through it on the way out
      tCards.forEach((card, k) => {
        const d = c - k;                     // <0 approaching, 0 held, >0 leaving
        let sc, op;
        if (d <= 0) { sc = NEAR / (NEAR - d * D); op = range(d, -.36, -.1); }
        else { sc = NEAR / Math.max(.6, NEAR - d * D); op = 1 - range(d, .04, .22); }
        if (op <= .001) { if (card.style.visibility !== 'hidden') { card.style.visibility = 'hidden'; card.classList.remove('live'); } return; }
        card.style.visibility = 'visible';
        card.style.opacity = op.toFixed(3);
        card.style.transform = `translate(-50%,-50%) scale(${sc.toFixed(4)})`;
        card.style.filter = d > .02 ? `blur(${(range(d, .02, .2) * 6).toFixed(1)}px)` : '';
        card.classList.toggle('live', Math.abs(d) < .06);
        card.style.setProperty('--wp', (1 - Math.min(1, Math.abs(d) * 3)).toFixed(3));
      });
      const k = clamp(Math.round(c), 0, N - 1);
      if (k !== roomNow) {
        roomNow = k;
        tRooms.forEach((b, i) => b.setAttribute('aria-current', String(i === k)));
        tCount.textContent = String(k + 1).padStart(2, '0');
      }
      // CSS fallback tunnel when WebGL is missing
      if (!tess.classList.contains('gl-on')) tCss.forEach((el, i) => {
        const z = ((i - (c * 2)) % tCss.length + tCss.length) % tCss.length;  // 0 = nearest
        el.style.setProperty('--s', (1.6 / (1 + z * .55)).toFixed(3));
        el.style.setProperty('--o', (z < .4 ? z / .4 : 1 - z / tCss.length).toFixed(3));
      });
      glKick();
    });

    /* the lattice itself: three.js r128 from cdnjs, loaded after the page */
    let gl = null, glRunning = false;
    function glKick() { if (gl && !glRunning) { glRunning = true; requestAnimationFrame(glFrame); } }
    function glFrame(now) {
      const r = tess.getBoundingClientRect();
      if (r.bottom < -40 || r.top > vh + 40) { glRunning = false; return; }
      gl.draw(camC, now);
      requestAnimationFrame(glFrame);
    }
    function buildGL() {
      const THREE = window.THREE, canvas = $('.tess-gl', tess);
      let renderer;
      try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
      catch (e) { return null; }
      const INK = 0x0F0F0D;
      renderer.setClearColor(INK, 1);
      const scene3 = new THREE.Scene();
      scene3.fog = new THREE.Fog(INK, 8, 74);
      const cam = new THREE.PerspectiveCamera(66, 1, .1, 140);
      const S = 4, G = 4, Z0 = 30, Z1 = -(N * D) - 90;
      const lo = -(G - .5) * S, hi = (G - .5) * S;
      const mob = vw < 700;
      // lattice: beams along all three axes, brighter near the corridor
      const pos = [], col = [];
      const push = (a, b, k) => { pos.push(...a, ...b); const r = 1 * k, g = .5 * k, bl = .22 * k; col.push(r, g, bl, r, g, bl); };
      for (let i = -G; i < G; i++) for (let j = -G; j < G; j++) {
        const x = (i + .5) * S, y = (j + .5) * S, near = Math.max(Math.abs(x), Math.abs(y));
        push([x, y, Z0], [x, y, Z1], near < S ? .62 : .32);
      }
      for (let z = Z0; z > Z1; z -= S) for (let i = -G; i < G; i++) {
        const v = (i + .5) * S, k = Math.abs(v) < S ? .5 : .24;
        push([lo, v, z], [hi, v, z], k); push([v, lo, z], [v, hi, z], k);
      }
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      lg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      scene3.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true })));
      // strands: thousands of thin threads, the "time" lines of the tesseract
      const sp = [], sc = [], NS = mob ? 1400 : 2800;
      for (let n = 0; n < NS; n++) {
        const axis = Math.random(), z = Z0 + Math.random() * (Z1 - Z0);
        const side = Math.random() < .5 ? -1 : 1;
        const off = (S * .6 + Math.random() * (hi - S * .6)) * side;
        const k = .12 + Math.pow(Math.random(), 3) * .75;
        const cr = 1, cg = .55 + Math.random() * .25, cb = .25 + Math.random() * .15;
        if (axis < .55) { const x = off, y0 = lo + Math.random() * 6, y1 = hi - Math.random() * 6; sp.push(x, y0, z, x, y1, z); }
        else if (axis < .85) { const y = off, x0 = lo + Math.random() * 6, x1 = hi - Math.random() * 6; sp.push(x0, y, z, x1, y, z); }
        else { const x = off, y = (Math.random() * 2 - 1) * hi, l = 4 + Math.random() * 18; sp.push(x, y, z, x, y, z - l); }
        sc.push(cr * k, cg * k, cb * k, cr * k, cg * k, cb * k);
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
      const strands = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      scene3.add(strands);
      // dust drifting in the light
      const dp = [], ND = mob ? 700 : 1500;
      for (let n = 0; n < ND; n++) dp.push((Math.random() * 2 - 1) * hi, (Math.random() * 2 - 1) * hi, Z0 + Math.random() * (Z1 - Z0));
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
      const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xFFB070, size: .07, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));
      scene3.add(dust);
      // one glowing room frame per project, sized to the card it holds
      const box = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
      const rooms = tCards.map((_, k) => {
        const m = new THREE.LineSegments(box, new THREE.LineBasicMaterial({ color: 0xFF6A2E, transparent: true, opacity: .95 }));
        scene3.add(m); return m;
      });
      const RD = 7;  // room depth
      function size() {
        const w = tPin.clientWidth, h = tPin.clientHeight;
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mob ? 1.5 : 1.75));
        renderer.setSize(w, h, false);
        cam.aspect = w / h; cam.updateProjectionMatrix();
        const card = tCards[0], cw = card.offsetWidth, ch = card.offsetHeight;
        const visH = 2 * NEAR * Math.tan(cam.fov * Math.PI / 360), visW = visH * cam.aspect;
        const bw = cw / w * visW * 1.035, bh = ch / h * visH * 1.05;
        const yOff = -((card.offsetTop) - h / 2) / h * visH;  // card centre sits a little below the middle
        rooms.forEach((m, k) => { m.scale.set(bw, bh, RD); m.position.set(0, yOff, -k * D - NEAR - RD / 2); });
      }
      size();
      addEventListener('resize', size);
      let mx = 0, my = 0;
      addEventListener('pointermove', e => { mx = e.clientX / vw - .5; my = e.clientY / vh - .5; }, { passive: true });
      return {
        draw(c, now) {
          const t = now * .001;
          const f = c - Math.floor(c);           // 0 at a room, rising while travelling
          const warp = Math.sin(Math.PI * f) * (c > -.5 ? 1 : 0);
          cam.fov = 66 + warp * 16; cam.updateProjectionMatrix();
          const z = -c * D;
          cam.position.set(Math.sin(t * .4) * .12 + mx * .25, Math.cos(t * .33) * .1 - my * .2, z);
          cam.lookAt(mx * .6, -my * .4, z - 20);
          cam.rotation.z += warp * .22 * (Math.floor(c) % 2 ? -1 : 1);
          strands.material.opacity = .85 + Math.sin(t * 1.3) * .15;
          dust.position.y = Math.sin(t * .2) * .6;
          rooms.forEach((m, k) => { const d = Math.abs(c - k); m.material.opacity = d < .5 ? 1 : Math.max(.25, 1 - d * .4); });
          renderer.render(scene3, cam);
        }
      };
    }
    function loadThree() {
      if (window.THREE) return start();
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      sc.onload = start; sc.onerror = () => {};   // CSS tunnel stays
      document.head.appendChild(sc);
      function start() {
        try { gl = buildGL(); } catch (e) { gl = null; }
        if (gl) { tess.classList.add('gl-on'); markDirty(); glKick(); }
      }
    }
    if (document.readyState === 'complete') setTimeout(loadThree, 200);
    else addEventListener('load', () => setTimeout(loadThree, 200));
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
    // phones fire resize when the address bar hides; only re-size the track on real width changes
    if (w !== vw && window.__sizeCaps) { vw = w; vh = innerHeight; window.__sizeCaps(); }
    vw = w; vh = innerHeight; markDirty();
  });
  addEventListener('load', markDirty);
  markDirty();
})();
