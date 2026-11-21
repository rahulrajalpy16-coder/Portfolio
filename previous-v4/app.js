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
  function themeAt(sec) { return sec.dataset.theme; }

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
    /* ---- 01 hero: the reveal film, scrubbed frame by frame ----
       Landscape screens get the 16:9 film (84 frames), portrait screens
       the vertical cut (96 frames). Both are webp stills, so scrubbing
       backwards is as smooth as forwards. */
    const hero = $('.hero'), heroPin = $('.pin', hero);
    const r1 = $('.r1', hero), r2 = $('.r2', hero), lines = $('.hf-lines', hero), recT = $('.rec b', hero);
    $$('.clip', hero).forEach(c => {
      const t = c.textContent; c.textContent = '';
      [...t].forEach((ch, i) => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; s.style.transitionDelay = (80 + i * 70 + (c.closest('.r2') ? 260 : 0)) + 'ms'; c.appendChild(s); });
    });
    requestAnimationFrame(() => requestAnimationFrame(() => html.classList.add('ready')));
    const cv = $('.hf-cv', hero), cx = cv.getContext('2d');
    let set = null, lastDrawn = null, wantFrame = 0;
    function useSet() {
      const dir = innerWidth / innerHeight < .9 ? 'reveal' : 'hero-film';
      if (set && set.dir === dir) return;
      set = loadSeq(dir, dir === 'reveal' ? 96 : 84, () => { lastDrawn = null; drawHero(wantFrame); }, () => wantFrame);
      lastDrawn = null;
    }
    function sizeCv() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr);
      useSet(); lastDrawn = null; drawHero(wantFrame);
    }
    function drawHero(i) {
      wantFrame = i;
      const im = set && set.pick(i);
      if (!im || im === lastDrawn || !cv.width) return;
      lastDrawn = im;
      coverDraw(cx, cv, im, set.dir === 'reveal' ? .35 : .5, '#050607');
    }
    useSet();
    addEventListener('resize', sizeCv);
    requestAnimationFrame(sizeCv);
    scene(hero, p => {
      const a = easeInOut(range(p, 0, .4));
      const spread = vw < 720 ? 64 : 40;
      // RAHUL drifts right, RAJ drifts left, and both fade before the face arrives
      r1.style.transform = `translate3d(${(a * spread).toFixed(2)}vw,0,0)`;
      r2.style.transform = `translate3d(${(-a * spread).toFixed(2)}vw,0,0)`;
      if (p > .001) html.classList.add('scrolled');
      heroPin.style.setProperty('--no', (1 - range(p, .16, .34)).toFixed(3));
      heroPin.style.setProperty('--meta-o', (1 - range(p, 0, .1)).toFixed(3));
      heroPin.style.setProperty('--sh', range(p, .42, .6).toFixed(3));
      lines.style.setProperty('--o1', range(p, .5, .6).toFixed(3));
      lines.style.setProperty('--o2', range(p, .74, .84).toFixed(3));
      const f = range(p, .02, .92);
      recT.textContent = '00:0' + Math.round(f * 8);
      if (!cv.width && cv.clientWidth) sizeCv();
      drawHero(Math.round(f * ((set ? set.n : 84) - 1)));
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

    /* ---- 05 the tesseract ----
       One long scroll with four phases:
         intro    T from -PRE to 0      the corridor opens
         rooms    T from 0 to TC        11 stations: a title, 4 tools, a title, 5 projects.
                                        Station k is held while T is between k+.25 and k+.75,
                                        and the camera flies one room further between holds.
         collapse T from TC to TC+PC    the corridor stretches into a black hole and we fall in
         universe T from TC+PC to end   the other side: stars, a galaxy and the turning figure
       c is the camera's position in rooms. */
    const tess = $('.tess'), tPin = $('.pin', tess), sts = $$('.st', tess);
    const tIntro = $('.tess-intro', tess), tRooms = $$('.tess-rooms button', tess);
    const tCount = $('.tess-count b', tess), tCountG = $('.tess-count .g', tess), tCountOf = $('.tess-count span', tess);
    const tCss = $$('.tess-css i', tess), bhCss = $('.bh-css', tess), cube = $('.cube', tess);
    const uni = $('.uni', tess), uniCv = $('.uni-cv', tess), uniTxt = $('.uni-txt', tess), uniDeg = $('.uni-deg b', tess);
    const anchor = $('#work');
    const WT = sts.indexOf(anchor.nextElementSibling);          // the "Selected work" title station
    const NTOOL = WT - 1, NWORK = sts.length - WT - 1;
    tess.appendChild(anchor);                                    // in scroll mode the anchor sits where that station is held
    const NST = sts.length, D = 28, NEAR = 9, PRE = .3, PC = 2.2, PD = 2.8;
    const TC = NST - .25, U = PRE + TC + PC + PD;
    const S = { c: -1, q: 0, s: 0 };
    let roomNow = null;
    const cOf = T => { const x = T + .5, n = Math.floor(x), f = x - n; return n - 1 + easeInOut(range(f, .25, .75)); };
    const pOf = T => (T + PRE) / U;
    const pad = n => String(n).padStart(2, '0');
    function placeAnchor() { anchor.style.top = Math.round(pOf(WT + .5) * Math.max(0, tess.offsetHeight - innerHeight)) + 'px'; }
    placeAnchor();
    tRooms.forEach(b => b.addEventListener('click', () => {
      const T = b.dataset.room === 'end' ? TC + PC + PD * .6 : +b.dataset.room + .5;
      const r = tess.getBoundingClientRect();
      window.scrollTo({ top: r.top + scrollY + pOf(T) * (r.height - vh), behavior: 'smooth' });
    }));

    // the turning figure on the other side: 114 frames, one full turn
    let orbit = null, uLast = null, uWant = 0;
    const ux = uniCv.getContext('2d');
    function ensureOrbit() { if (!orbit) orbit = loadSeq('orbit', 114, () => { uLast = null; drawUni(uWant); }, () => uWant); }
    function sizeUni() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      uniCv.width = Math.round(uniCv.clientWidth * dpr); uniCv.height = Math.round(uniCv.clientHeight * dpr);
      uLast = null; drawUni(uWant);
    }
    function drawUni(i) {
      uWant = i;
      const im = orbit && orbit.pick(i);
      if (!im || im === uLast || !uniCv.width) return;
      uLast = im; coverDraw(ux, uniCv, im, .5, '#000');
    }
    addEventListener('load', () => setTimeout(ensureOrbit, 5000));

    scene(tess, p => {
      const T = p * U - PRE;
      const q = range(T, TC, TC + PC), s = range(T, TC + PC, TC + PC + PD);
      let c = cOf(Math.min(T, TC));
      if (q > 0) c = NST - 1 + q * q * q * 7;                 // accelerate down the corridor
      S.c = c; S.q = q; S.s = s;
      if (T > 1.5) ensureOrbit();
      // intro cue shrinks into the corridor
      tIntro.style.setProperty('--io', (1 - range(c, -.62, -.32)).toFixed(3));
      tIntro.style.setProperty('--is', (1 - range(c, -.8, -.3) * .25).toFixed(4));
      tPin.style.setProperty('--ro', (range(c, -.45, -.25) * (1 - range(q, 0, .12))).toFixed(3));
      tPin.style.setProperty('--vo', (1 - range(q, .4, .8)).toFixed(3));
      // each station: real perspective, so it grows as the camera closes in and we pass through it on the way out
      sts.forEach((card, k) => {
        const d = c - k;
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
      if (cube) cube.style.setProperty('--rot', (30 + c * 90).toFixed(1) + 'deg');
      // room pills and counter
      const k = q > .1 ? 'end' : clamp(Math.round(c), 0, NST - 1);
      if (k !== roomNow) {
        roomNow = k;
        tRooms.forEach(b => b.setAttribute('aria-current', String(b.dataset.room === String(k))));
        if (k === 'end') { tCountG.textContent = 'Beyond'; tCount.textContent = '∞'; tCountOf.textContent = ''; }
        else if (k < WT) { tCountG.textContent = 'Tools'; tCount.textContent = pad(Math.max(1, k)); tCountOf.textContent = '/ ' + pad(NTOOL); }
        else { tCountG.textContent = 'Work'; tCount.textContent = pad(Math.max(1, k - WT)); tCountOf.textContent = '/ ' + pad(NWORK); }
      }
      // the other side
      const uo = range(s, .04, .14);
      uni.style.setProperty('--uo', uo.toFixed(3));
      uni.classList.toggle('on', uo > 0);
      uni.classList.toggle('live', uo > .6);
      uniTxt.style.setProperty('--u1', range(s, .14, .24).toFixed(3));
      uniTxt.style.setProperty('--u2', range(s, .26, .38).toFixed(3));
      uniTxt.style.setProperty('--u3', range(s, .46, .56).toFixed(3));
      uniTxt.style.setProperty('--u4', range(s, .58, .68).toFixed(3));
      const turn = range(s, .06, .96);
      uniDeg.textContent = String(Math.round(turn * 360)).padStart(3, '0') + '°';
      if (uo > 0) { if (!uniCv.width && uniCv.clientWidth) sizeUni(); drawUni(Math.round(3 + turn * 110)); }   // frames 1 and 2 of the clip are a fade from black
      // without WebGL: a CSS tunnel and a CSS black hole
      if (!tess.classList.contains('gl-on')) {
        tCss.forEach((el, i) => {
          const z = ((i - (c * 2)) % tCss.length + tCss.length) % tCss.length;
          el.style.setProperty('--s', (1.6 / (1 + z * .55)).toFixed(3));
          el.style.setProperty('--o', ((z < .4 ? z / .4 : 1 - z / tCss.length) * (1 - q)).toFixed(3));
        });
        bhCss.style.setProperty('--bh', (range(q, .05, .3) * (1 - range(s, 0, .1))).toFixed(3));
        bhCss.style.setProperty('--bs', (.1 + 3 * q * q).toFixed(3));
        bhCss.style.setProperty('--bf', (range(q, .8, 1) * 3000).toFixed(0) + 'px');
      }
      glKick();
    });

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
    const SPINES = ['#f0a04a', '#e8c48a', '#b5532a', '#8a3a1f', '#6b6440', '#4a5468', '#d9b06a', '#fff0d0', '#c77a3a', '#3b2a1e'];
    /* a bookshelf, drawn on a canvas: planks, rows of spines, a few gaps, an optional window cut through it */
    function drawShelf(ctx, W, H, rows, seed, hole) {
      ctx.clearRect(0, 0, W, H);
      const rh = H / rows;
      let n = seed * 1000;
      for (let r = 0; r < rows; r++) {
        const y0 = r * rh;
        ctx.fillStyle = 'rgba(40,24,14,.55)'; ctx.fillRect(0, y0, W, rh);           // the back of the shelf
        let x = 0;
        while (x < W) {
          const h1 = hash(++n);
          if (h1 < .1) { x += 20 + hash(++n) * 50; continue; }                       // a gap you can see through
          const bw = 5 + hash(++n) * 15, bh = rh * (.58 + hash(++n) * .34);
          const col = SPINES[Math.floor(hash(++n) * SPINES.length)];
          ctx.globalAlpha = .55 + hash(++n) * .45;
          ctx.fillStyle = col; ctx.fillRect(x, y0 + rh - 7 - bh, bw - 1.5, bh);
          ctx.fillStyle = 'rgba(255,240,210,.35)';
          ctx.fillRect(x, y0 + rh - 7 - bh * (.25 + hash(++n) * .5), bw - 1.5, 2);   // a band on the spine
          ctx.globalAlpha = 1;
          x += bw;
        }
        ctx.fillStyle = '#ffb067'; ctx.globalAlpha = .9; ctx.fillRect(0, y0 + rh - 7, W, 3);   // the lit edge of the plank
        ctx.fillStyle = '#2a170c'; ctx.fillRect(0, y0 + rh - 4, W, 4); ctx.globalAlpha = 1;
      }
      if (hole) {
        ctx.clearRect(hole.x, hole.y, hole.w, hole.h);
        ctx.strokeStyle = '#ffb067'; ctx.lineWidth = 3; ctx.shadowColor = '#ff7a2e'; ctx.shadowBlur = 18;
        ctx.strokeRect(hole.x - 2, hole.y - 2, hole.w + 4, hole.h + 4); ctx.shadowBlur = 0;
      }
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
      const world = new THREE.Group(); scene3.add(world);
      // Everything inside `world` is built in corridor units: the main corridor is 2 x 2 across
      // (x and y from -1 to 1) and gets scaled to fit the cards on this screen.
      const Z0 = 40, Z1 = -(NST + 9) * D, LEN = Z0 - Z1;

      /* 1 · beams: the lattice, every beam a row of book spines (one merged mesh, one shader) */
      const XS = [1, 1.62, 2.24, 2.86], YS = [1, 1.62, 2.24, 2.86];
      const P = [], A = [], SD = [], SH = [], IDX = [];
      let vtx = 0;
      function quad(a, b, c2, d, la, lb, seed, shade) {
        P.push(...a, ...b, ...c2, ...d); A.push(la, la, lb, lb); SD.push(seed, seed, seed, seed); SH.push(shade, shade, shade, shade);
        IDX.push(vtx, vtx + 1, vtx + 2, vtx, vtx + 2, vtx + 3); vtx += 4;
      }
      function beam(axis, u, v, l0, l1, w, seed) {   // a square beam along `axis`, centred on (u, v) in the other two axes
        const h = w / 2, at = (l, du, dv) => axis === 'z' ? [u + du, v + dv, l] : axis === 'x' ? [l, u + du, v + dv] : [u + du, l, v + dv];
        quad(at(l0, -h, -h), at(l0, h, -h), at(l1, h, -h), at(l1, -h, -h), l0, l1, seed, .7);
        quad(at(l0, -h, h), at(l0, h, h), at(l1, h, h), at(l1, -h, h), l0, l1, seed + .3, 1);
        quad(at(l0, -h, -h), at(l0, -h, h), at(l1, -h, h), at(l1, -h, -h), l0, l1, seed + .6, .85);
        quad(at(l0, h, -h), at(l0, h, h), at(l1, h, h), at(l1, h, -h), l0, l1, seed + .9, .55);
      }
      let sd = 1;
      for (const x of XS) for (const y of YS) for (const sx of [-1, 1]) for (const sy of [-1, 1]) beam('z', sx * x, sy * y, Z0, Z1, .06, sd++ * .37);
      const step = mob ? 14 : 7;
      for (let z = Z0; z > Z1; z -= step) {
        for (const y of YS) for (const sy of [-1, 1]) beam('x', sy * y, z, -XS[3], XS[3], .04, sd++ * .37);
        for (const x of XS) for (const sx of [-1, 1]) beam('y', sx * x, z, -YS[3], YS[3], .04, sd++ * .37);
      }
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      bg.setAttribute('aAlong', new THREE.Float32BufferAttribute(A, 1));
      bg.setAttribute('aSeed', new THREE.Float32BufferAttribute(SD, 1));
      bg.setAttribute('aShade', new THREE.Float32BufferAttribute(SH, 1));
      bg.setIndex(IDX);
      const beamMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uFogN: { value: 10 }, uFogF: { value: 95 }, uDens: { value: 2.2 }, uFog: { value: new THREE.Color(BG) } },
        vertexShader: `
          attribute float aAlong; attribute float aSeed; attribute float aShade;
          varying float vAlong; varying float vSeed; varying float vShade; varying float vDepth; varying float vWorldZ;
          void main(){
            vAlong=aAlong; vSeed=aSeed; vShade=aShade;
            vec4 mv=modelViewMatrix*vec4(position,1.);
            vDepth=-mv.z; gl_Position=projectionMatrix*mv;
          }`,
        fragmentShader: `
          uniform float uTime, uFogN, uFogF, uDens; uniform vec3 uFog;
          varying float vAlong; varying float vSeed; varying float vShade; varying float vDepth;
          float h1(float n){ return fract(sin(n*127.1+vSeed*91.7)*43758.5453); }
          vec3 pal(float h){
            if(h<.28) return vec3(.95,.58,.25);
            if(h<.46) return vec3(.86,.72,.52);
            if(h<.6)  return vec3(.66,.28,.14);
            if(h<.72) return vec3(.42,.39,.24);
            if(h<.82) return vec3(.30,.34,.44);
            return vec3(1.,.86,.6);
          }
          void main(){
            float x=vAlong*uDens+vSeed*37.;
            float cell=floor(x), f=fract(x);
            float h=h1(cell);
            vec3 col=pal(h)*(.45+.55*h1(cell+7.));
            col*=mix(.25,1.,smoothstep(.0,.1,f)*smoothstep(1.,.88,f));     // dark gaps between spines
            float pulse=exp(-pow(fract(vAlong*.012-uTime*.06+vSeed)*8.-4.,2.));
            col+=vec3(1.,.6,.3)*pulse*.6;                                 // light running along the beams
            col*=vShade;
            float fog=smoothstep(uFogN,uFogF,vDepth);
            gl_FragColor=vec4(mix(col,uFog,fog),1.);
          }`
      });
      world.add(new THREE.Mesh(bg, beamMat));

      /* 2 · corridor walls: shelves of books, with gaps you can see through */
      const tile = document.createElement('canvas'); tile.width = 512; tile.height = 256;
      drawShelf(tile.getContext('2d'), 512, 256, 3, .42, null);
      const tileTex = new THREE.CanvasTexture(tile);
      tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(LEN / 9, 1);
      tileTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const wallMat = new THREE.MeshBasicMaterial({ map: tileTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: true });
      const wallGeo = new THREE.PlaneGeometry(LEN, 2);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([sx, sy]) => {
        const m = new THREE.Mesh(wallGeo, wallMat);
        if (sx) { m.rotation.y = Math.PI / 2; m.position.set(sx * 1.001, 0, (Z0 + Z1) / 2); }
        else { m.rotation.set(Math.PI / 2, 0, Math.PI / 2); m.position.set(0, sy * 1.001, (Z0 + Z1) / 2); }
        world.add(m);
      });
      // a second, dimmer layer of shelves one cell further out, for depth
      const outerMat = wallMat.clone(); outerMat.opacity = .45;
      [[1.62, 0], [-1.62, 0], [0, 1.62], [0, -1.62]].forEach(([sx, sy]) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(LEN, sx ? 3.24 : 3.24), outerMat);
        if (sx) { m.rotation.y = Math.PI / 2; m.position.set(sx, 0, (Z0 + Z1) / 2); }
        else { m.rotation.set(Math.PI / 2, 0, Math.PI / 2); m.position.set(0, sy, (Z0 + Z1) / 2); }
        world.add(m);
      });

      /* 3 · strands: thin threads of light, the time lines */
      const sp = [], sc = [], NS = mob ? 1200 : 2600;
      for (let n = 0; n < NS; n++) {
        const z = Z0 + Math.random() * (Z1 - Z0), a = Math.random();
        const out = 1.05 + Math.random() * 1.8, side = Math.random() < .5 ? -1 : 1;
        const k = .1 + Math.pow(Math.random(), 3) * .8, cg = .55 + Math.random() * .25, cb = .22 + Math.random() * .15;
        if (a < .45) { const x = side * out; sp.push(x, -2.86, z, x, 2.86, z); }
        else if (a < .75) { const y = side * out; sp.push(-2.86, y, z, 2.86, y, z); }
        else { const x = side * out, y = (Math.random() * 2 - 1) * 2.8, l = 3 + Math.random() * 22; sp.push(x, y, z, x, y, z - l); }
        sc.push(k, cg * k, cb * k, k, cg * k, cb * k);
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
      const strands = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      world.add(strands);
      const dp = [], ND = mob ? 600 : 1400;
      for (let n = 0; n < ND; n++) dp.push((Math.random() * 2 - 1) * 1.6, (Math.random() * 2 - 1) * 1.6, Z0 + Math.random() * (Z1 - Z0));
      const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
      const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xFFB070, size: .07, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));
      scene3.add(dust);

      /* 4 · rooms: for every station a bookshelf wall with a window cut where the card sits, and a glowing frame */
      const box = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
      const RD = 6;
      const rooms = sts.map((_, k) => {
        const cvs = document.createElement('canvas');
        const tex = new THREE.CanvasTexture(cvs);
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: true }));
        wall.position.z = -k * D - NEAR - .02;
        const frame = new THREE.LineSegments(box, new THREE.LineBasicMaterial({ color: 0xFF7A2E, transparent: true, opacity: .95 }));
        world.add(wall); world.add(frame);
        return { cvs, tex, wall, frame };
      });
      let hx = 10, hy = 6;
      function size() {
        const w = tPin.clientWidth, h = tPin.clientHeight;
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mob ? 1.5 : 1.75));
        renderer.setSize(w, h, false);
        cam.fov = 66; cam.aspect = w / h; cam.updateProjectionMatrix();
        const visH = 2 * NEAR * Math.tan(cam.fov * Math.PI / 360), visW = visH * cam.aspect;
        const dims = sts.map(card => ({ bw: card.offsetWidth / w * visW, bh: card.offsetHeight / h * visH, y: -(card.offsetTop - h / 2) / h * visH }));
        hx = Math.max(...dims.map(d => d.bw)) / 2 * 1.22 + .5;
        hy = Math.max(...dims.map(d => d.bh / 2 + Math.abs(d.y))) * 1.22 + .5;
        const TW = mob ? 512 : 1024, TH = Math.round(TW * hy / hx);
        rooms.forEach((r, k) => {
          const d = dims[k];
          r.cvs.width = TW; r.cvs.height = TH;
          const hw = d.bw / (2 * hx) * TW / 2, hh = d.bh / (2 * hy) * TH / 2, cy = TH / 2 - d.y / (2 * hy) * TH;
          drawShelf(r.cvs.getContext('2d'), TW, TH, Math.max(3, Math.round(TH / 110)), k * .13 + .2,
            { x: TW / 2 - hw * 1.02, y: cy - hh * 1.03, w: hw * 2.04, h: hh * 2.06 });
          r.tex.needsUpdate = true;
          r.frame.scale.set(d.bw * 1.02 / hx, d.bh * 1.03 / hy, RD);
          r.frame.position.set(0, d.y / hy, -k * D - NEAR - RD / 2);
        });
        placeRings();
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
            // background stars, bent around the hole
            vec2 sp=p-normalize(p+1e-5)*(R*R*1.6/max(r,R*.5));
            vec2 g=floor(sp*140.); float st=step(.985,hash(g))*hash(g+3.)*(1.-smoothstep(R*2.5,R*8.,r));
            vec3 col=vec3(st)*vec3(1.,.9,.8);
            // turbulence for the glowing gas
            float ang=atan(p.y,p.x);
            float tb=fbm(vec2(ang*3.+uTime*.35, r/R*5.-uTime*.6));
            float dop=clamp(1.-p.x/(R*3.2),.35,1.7);                       // the side spinning towards us is brighter
            // lensed light: the far side of the disc, bent over the top and under the bottom
            float halo=exp(-pow((r-R*1.32)/(R*.2),2.))*(.55+.7*tb);
            float ring=exp(-pow((r-R*1.05)/(R*.035),2.))*1.4;                // photon ring
            // the disc seen nearly edge on, crossing in front of the shadow
            float dr=length(vec2(p.x,p.y/.12));
            float disc=smoothstep(R*1.25,R*1.6,dr)*(1.-smoothstep(R*2.6,R*4.4,dr))*(.5+.9*tb);
            float band=exp(-pow(p.y/(R*.11),2.));
            vec3 warm=vec3(1.,.72,.42), hot=vec3(1.,.93,.8);
            col+=warm*halo*dop+hot*ring*dop;
            float shadow=1.-smoothstep(R*.97,R*1.01,r);
            col*=1.-shadow;
            col+=mix(warm,hot,band)*disc*band*1.6*dop;                      // the front of the disc covers the shadow
            float a=max(shadow*(1.-band*disc), 0.);
            col*=uAlpha; a*=uAlpha;
            col*=1.-uFill; a=max(a,uFill);
            gl_FragColor=vec4(col,a);
          }`
      });
      bhScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bhMat));

      /* 6 · the universe on the other side */
      const space = new THREE.Scene(), cam2 = new THREE.PerspectiveCamera(60, 1, .1, 2000);
      space.add(cam2);
      function stars(n, r0, r1, size, op) {
        const a = [];
        for (let i = 0; i < n; i++) {
          const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = r0 + Math.random() * (r1 - r0), s = Math.sqrt(1 - u * u);
          a.push(r * s * Math.cos(t), r * u, r * s * Math.sin(t));
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
        return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size, sizeAttenuation: false, transparent: true, opacity: op, depthWrite: false }));
      }
      const dpr = Math.min(devicePixelRatio || 1, 1.75);
      space.add(stars(mob ? 1500 : 3000, 300, 900, 1.2 * dpr, .8), stars(mob ? 200 : 400, 300, 900, 2.4 * dpr, .9));
      const galaxy = (() => {
        const gp = [], gc = [], NG = mob ? 6000 : 12000, ca = new THREE.Color(1, .82, .58), cb = new THREE.Color(.42, .58, 1), tmp = new THREE.Color();
        for (let i = 0; i < NG; i++) {
          const r = Math.pow(Math.random(), .7) * 90, arm = (i % 3) * Math.PI * 2 / 3;
          const a = arm + r * .07 + (Math.random() - .5) * (.6 + 18 / (r + 6));
          gp.push(Math.cos(a) * r + (Math.random() - .5) * 3, (Math.random() - .5) * (6 - r * .05), Math.sin(a) * r + (Math.random() - .5) * 3);
          tmp.copy(ca).lerp(cb, Math.min(1, r / 70)); gc.push(tmp.r, tmp.g, tmp.b);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3));
        const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .9, vertexColors: true, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
        const grp = new THREE.Group(); grp.add(pts); grp.position.set(40, 95, -380); grp.rotation.set(1.15, .2, .5);
        space.add(grp); return grp;
      })();
      // orbit rings around the figure; they ride with the camera so they stay around it on screen
      const rings = new THREE.Group(); cam2.add(rings);
      const ringMats = [];
      [[1, .95, 0xffb067], [1.32, .55, 0x8fb2ff], [1.7, .35, 0xffffff]].forEach(([rr, op, colr], i) => {
        const pts = []; for (let j = 0; j <= 256; j++) { const a = j / 256 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr)); }
        const m = new THREE.LineBasicMaterial({ color: colr, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
        const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m);
        ring.rotation.set(.18 + i * .1, 0, (i - 1) * .12); rings.add(ring); ringMats.push(m);
        const moon = new THREE.Mesh(new THREE.SphereGeometry(.014 + i * .004, 12, 12), new THREE.MeshBasicMaterial({ color: colr }));
        ring.add(moon); ring.userData.moon = moon; ring.userData.r = rr;
      });
      function placeRings() {
        const w = tPin.clientWidth, h = tPin.clientHeight;
        cam2.aspect = w / h; cam2.updateProjectionMatrix();
        const r = uniCv.getBoundingClientRect(), pr = tPin.getBoundingClientRect();
        const cxp = r.left - pr.left + r.width / 2, cyp = r.top - pr.top + r.height * .58;
        const Dz = 30, halfH = Dz * Math.tan(cam2.fov * Math.PI / 360), halfW = halfH * cam2.aspect;
        rings.position.set((cxp / w * 2 - 1) * halfW, (1 - cyp / h * 2) * halfH, -Dz);
        const s = (r.width / w) * halfW * 1.05;
        rings.scale.set(s, s, s);
      }

      size();
      addEventListener('resize', size);
      let mx = 0, my = 0;
      addEventListener('pointermove', e => { mx = e.clientX / vw - .5; my = e.clientY / vh - .5; }, { passive: true });
      return {
        draw(now) {
          const t = now * .001, { c, q, s } = S;
          renderer.clear();
          bhMat.uniforms.uRes.value.set(renderer.domElement.width, renderer.domElement.height);
          bhMat.uniforms.uTime.value = t;
          if (s <= 0) {
            const f = c - Math.floor(c), warp = q > 0 ? 0 : Math.sin(Math.PI * f) * (c > -.5 ? 1 : 0);
            const eq = q * q;
            cam.fov = 66 + warp * 16 + eq * 50; cam.updateProjectionMatrix();
            const z = -c * D, sz = 1 + eq * 6;
            world.scale.set(hx, hy, sz); world.position.z = z * (1 - sz);
            dust.position.z = 0;
            cam.position.set((Math.sin(t * .4) * .12 + mx * .25) * (1 - q), (Math.cos(t * .33) * .1 - my * .2) * (1 - q), z);
            cam.lookAt(mx * .6 * (1 - q), -my * .4 * (1 - q), z - 20);
            cam.rotation.z += warp * .22 * (Math.floor(c) % 2 ? -1 : 1) + eq * 1.4;
            scene3.fog.near = 10 + q * 40; scene3.fog.far = 95 + q * 520;
            beamMat.uniforms.uFogN.value = scene3.fog.near; beamMat.uniforms.uFogF.value = scene3.fog.far;
            beamMat.uniforms.uTime.value = t;
            strands.material.opacity = .85 + Math.sin(t * 1.3) * .15;
            dust.scale.set(hx, hy, 1);
            rooms.forEach((r, k) => { const d = Math.abs(c - k); r.frame.material.opacity = d < .5 ? 1 : Math.max(.25, 1 - d * .4); });
            renderer.render(scene3, cam);
            if (q > 0) {
              bhMat.uniforms.uAlpha.value = range(q, .04, .3);
              bhMat.uniforms.uSize.value = .03 + Math.pow(range(q, .1, 1), 2.4) * 1.7;
              bhMat.uniforms.uFill.value = range(q, .88, 1);
              renderer.render(bhScene, ortho);
            }
          } else {
            cam2.position.set(Math.sin(s * 2) * 4, 2 - s * 4, 40 - s * 30);
            cam2.lookAt(-6, 4, -200);
            cam2.rotation.z = -.06 + s * .08;
            galaxy.children[0].rotation.y = s * 1.2 + t * .02;
            rings.children.forEach((ring, i) => {
              const a = s * Math.PI * 2 * (i % 2 ? -1 : 1) * (1 + i * .4) + t * .15;
              ring.userData.moon.position.set(Math.cos(a) * ring.userData.r, 0, Math.sin(a) * ring.userData.r);
            });
                        renderer.render(space, cam2);
            bhMat.uniforms.uAlpha.value = 0; bhMat.uniforms.uFill.value = 1 - range(s, 0, .14);
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
    addEventListener('resize', () => { placeAnchor(); sizeUni(); });
    requestAnimationFrame(sizeUni);
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
      vw = w; vh = innerHeight; markDirty();
  });
  addEventListener('load', markDirty);
  markDirty();
})();
