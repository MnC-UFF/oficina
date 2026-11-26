/* =====================================================================
   Cientista de Papel - doll creator engine
   ---------------------------------------------------------------------
   You normally do NOT need to edit this file. New hairstyles, clothes,
   accessories and colours go in js/catalog.js.

   Pipeline:
     choices + colours  ->  5 texture canvases (layers painted in UV space)
                        ->  three.js doll (textures mapped by the model UVs)
                        ->  printable sheet (each net face drawn from the
                            same textures + cut/fold lines and glue tabs)
   ===================================================================== */
(function () {
  'use strict';
  const MODEL = window.DOLL_MODEL, BUILTIN = window.DOLL_LAYERS, CAT = window.DOLL_CATALOG;
  // short skirt: a copy of the skirt ('saia_curta') whose lower edge is moved up to SHORT_SKIRT of its
  // length, in 3D, on the net and in the texture alike (the skirt row shows one or the other)
  const SHORT_SKIRT = 0.55;
  // the same trick makes 'jaleco_curto' (blazer, jacket, vest): the lab coat with its lower panel cut
  // to SHORT_COAT of its length, so it ends just below the belt
  const SHORT_COAT = 0.25;
  addShortCopy('saia', 'saia_curta', SHORT_SKIRT, null);
  addShortCopy('jaleco', 'jaleco_curto', SHORT_COAT, -1.9);
  function addShortCopy(srcKey, newKey, K, below) {
    const oi = MODEL.objects.findIndex(o => o.key === srcKey), part = MODEL.parts.find(p => p.obj === oi);
    if (oi < 0 || !part || MODEL.objects.some(o => o.key === newKey)) return;
    const o = MODEL.objects[oi], V = o.verts, nv = V.slice();
    const ys = []; for (let i = 1; i < V.length; i += 3) ys.push(V[i]);
    const mid = below ?? (Math.min(...ys) + Math.max(...ys)) / 2, low = vi => V[vi * 3 + 1] < mid;
    const key = (x, y) => x.toFixed(2) + ',' + y.toFixed(2), moved = new Map();
    const lerp = (a, b) => a + (b - a) * K;
    const faces = o.faces.map(f => {
      const n = f.i.length, g = { ...f, uv: f.uv.slice(), xy: f.xy.slice() };
      for (let k = 0; k < n; k++) {
        const vi = f.i[k]; if (!low(vi)) continue;
        const j = [(k + 1) % n, (k + n - 1) % n].find(j => !low(f.i[j])); if (j === undefined) continue;
        const ti = f.i[j];
        for (let c = 0; c < 3; c++) nv[vi * 3 + c] = lerp(V[ti * 3 + c], V[vi * 3 + c]);
        for (const A of ['uv', 'xy']) { g[A][2 * k] = lerp(f[A][2 * j], f[A][2 * k]); g[A][2 * k + 1] = lerp(f[A][2 * j + 1], f[A][2 * k + 1]); }
        moved.set(key(f.xy[2 * k], f.xy[2 * k + 1]), [g.xy[2 * k], g.xy[2 * k + 1]]);
      }
      return g;
    });
    const mv = s => { const a = moved.get(key(s[0], s[1])) || [s[0], s[1]], b = moved.get(key(s[2], s[3])) || [s[2], s[3]]; return [a[0], a[1], b[0], b[1]]; };
    MODEL.objects.push({ ...o, key: newKey, verts: nv, faces });
    MODEL.parts.push({ ...part, key: newKey, obj: MODEL.objects.length - 1,
      lines: part.lines.map(l => ({ ...l, s: mv(l.s) })), flaps: part.flaps.map(fl => ({ ...fl, s: mv(fl.s) })) });
  }
  const TS = MODEL.texSize;               // texture size in pixels (2024)
  const NTEX = 5;
  const PAPER = { A4: [210, 297], A3: [297, 420] };
  // A4 prints the doll at the book's size; A3 prints it twice as big (x1.41 each way = twice the area)
  const SIZES = { A4: { label: 'tamanho normal', scale: 0.92 }, A3: { label: 'tamanho grande', scale: 1.3 } };
  // Two ways to print the net. "completo": every glue tab of the model (sturdier).
  // "simples": the version used in the schools - fewer tabs to glue (quicker to build).
  // Parts are MODEL.parts indexes, faces are the object's face indexes, tabs the part's flap indexes.
  const NET = {
    // both versions: no underside on the arms; no tabs on the inner thighs (they glued to the crotch
    // piece, which is not printed); the tabs on the outer legs start lower down, below the thigh
    all: { faces: { 1: [2], 2: [7] }, tabs: { 1: [5, 6, 7], 2: [5, 6, 7], 6: [0, 11] }, lower: { 6: [1, 7, 12] } },
    // quick version: also no small corner tabs on the head and no corner tabs on the stand
    simples: { tabs: { 0: [1, 2, 3, 4, 6, 7, 8, 9], 3: [2, 5, 7, 8, 10, 11] } },
  };
  const LOWER_TAB = 0.6;   // the outer leg tabs cover this much of the edge, from the foot up
  const MODELS = { completo: 'Completo (mais estável)', simples: 'Simplificado (mais rápido)' };
  const MARGIN = 8, FOOTER = 8, GAP = 2.2;  // mm
  const TAB_MM = 6;                         // glue tab height on paper (mm)
  const CREDIT = 'Meninas nas Ciências · Arte: Ashley Campos e Vladimir Martins · Programação: Vladimir Martins · Modelo: TitanPapercraft · CC BY-NC-SA 4.0 · venda proibida';
  // the Creative Commons badge (page, "sobre" box and the printed footer)
  const BRAND = window.DOLL_BRAND || {};
  const ccImg = BRAND.cc ? (() => { const im = new Image(); im.onload = () => scheduleSheet && scheduleSheet(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(BRAND.cc); return im; })() : null;

  /* ---------------- state ---------------- */
  const defaults = () => ({
    colors: Object.fromEntries(CAT.colors.map(c => [c.id, c.value])),
    choices: Object.fromEntries(CAT.slots.filter(s => s.options).map(s => [s.id, s.options[0].id])),
    sides: {}, toggles: {}, scales: {}, grad: {},
    name: 'Cientista', nameFont: 'baloo', nameSize: 100, paper: 'A4', model: 'completo', colorTarget: 'skin',
    qrOn: false, qr: '',
  });
  let state = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem('cientista-de-papel') || 'null');
    if (saved) state = Object.assign(defaults(), saved, {
      colors: Object.assign(defaults().colors, saved.colors || {}),
      choices: Object.assign(defaults().choices, saved.choices || {}),
      sides: Object.assign({}, saved.sides || {}),
      toggles: Object.assign({}, saved.toggles || {}),
      scales: Object.assign({}, saved.scales || {}),
      grad: Object.assign({}, saved.grad || {}),
    });
  } catch (e) { /* storage unavailable */ }
  // the chosen uniform (state.uniform = { id, fp }): fp is the doll as the uniform left it, so any later change shows a *
  const uniFP = () => { const c = Object.assign({}, state.colors); delete c.fundo; delete c.qr;
    const t = Object.keys(state.toggles || {}).filter(k => state.toggles[k]).sort();
    return JSON.stringify([state.choices, c, t, state.sides, state.scales, state.grad]); };
  let uniMark = null;
  const save = () => { try { localStorage.setItem('cientista-de-papel', JSON.stringify(state)); } catch (e) {} scheduleCode(); if (uniMark) uniMark(); };

  /* ---------------- share code: every choice and colour in one short text ----------------
     Only what differs from the defaults goes in, as JSON, compressed (deflate) when the browser can,
     in base64url. "CP1z..." = compressed, "CP1j..." = plain. Pasting a code rebuilds the same doll. */
  const CODE_KEYS = { name: 'n', nameFont: 'f', nameSize: 'ns', paper: 'p', model: 'm', qrOn: 'qo', qr: 'q' };
  function codeData() {
    const d = defaults(), o = {};
    const c = {}; for (const [k, v] of Object.entries(state.colors)) if (k !== 'fundo' && v !== d.colors[k]) c[k] = String(v).replace('#', ''); if (Object.keys(c).length) o.c = c;
    const ch = {}; for (const [k, v] of Object.entries(state.choices)) if (v !== d.choices[k]) ch[k] = v; if (Object.keys(ch).length) o.o = ch;
    if (Object.keys(state.sides || {}).length) o.s = state.sides;
    const t = Object.keys(state.toggles || {}).filter(k => state.toggles[k]); if (t.length) o.t = t;
    if (Object.keys(state.scales || {}).length) o.z = state.scales;
    const g = Object.fromEntries(Object.entries(state.grad || {}).filter(([, v]) => v)); if (Object.keys(g).length) o.g = g;
    for (const [k, s] of Object.entries(CODE_KEYS)) if (state[k] !== d[k]) o[s] = state[k];
    return o;
  }
  const b64u = bytes => { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = str => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)); return Uint8Array.from(s, ch => ch.charCodeAt(0)); };
  async function pipe(bytes, Stream) { const r = new Blob([bytes]).stream().pipeThrough(new Stream('deflate-raw')); return new Uint8Array(await new Response(r).arrayBuffer()); }
  async function makeCode() {
    const raw = new TextEncoder().encode(JSON.stringify(codeData()));
    if (window.CompressionStream) { try { return 'CP1z' + b64u(await pipe(raw, CompressionStream)); } catch (e) {} }
    return 'CP1j' + b64u(raw);
  }
  async function readCode(code) {
    code = String(code || '').replace(/\s+/g, '');
    const m = /^CP1([zj])([A-Za-z0-9_-]+)$/.exec(code); if (!m) throw new Error('código inválido');
    let bytes = unb64u(m[2]);
    if (m[1] === 'z') { if (!window.DecompressionStream) throw new Error('navegador sem suporte'); bytes = await pipe(bytes, DecompressionStream); }
    const o = JSON.parse(new TextDecoder().decode(bytes)); const d = defaults();
    const known = (list, obj, ok) => Object.fromEntries(Object.entries(obj || {}).filter(([k, v]) => ok(k, v)));
    const next = Object.assign(d, {
      colors: Object.assign(d.colors, known(null, o.c, (k, v) => k in d.colors && /^[0-9a-fA-F]{6}$/.test(v))),
      choices: Object.assign(d.choices, known(null, o.o, (k, v) => { const sl = CAT.slots.find(s => s.id === k); return !!(sl && sl.options && sl.options.some(op => op.id === v)); })),
      sides: known(null, o.s, (k, v) => ['esq', 'dir', 'ambos'].includes(v)),
      toggles: Object.fromEntries((o.t || []).map(k => [k, true])),
      scales: known(null, o.z, (k, v) => typeof v === 'number'),
      grad: known(null, o.g, (k, v) => !!GRAD[k] && GRAD_DIRS.includes(v)),
    });
    for (const k of Object.keys(next.colors)) if (!next.colors[k].startsWith('#')) next.colors[k] = '#' + next.colors[k];
    for (const [k, s] of Object.entries(CODE_KEYS)) if (o[s] !== undefined && typeof o[s] === typeof d[k]) next[k] = o[s];
    next.colors.fundo = state.colors.fundo;   // the screen background is not part of the doll
    return next;
  }
  let codeTimer = null;
  function scheduleCode() { clearTimeout(codeTimer); codeTimer = setTimeout(async () => {
    const box = document.getElementById('dollCode'); if (!box || document.activeElement === box) return;
    box.value = await makeCode(); }, 120); }

  /* ---------------- colour helpers ---------------- */
  const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
  const rgb2hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const shade = (h, f) => rgb2hex(hex2rgb(h).map(v => f < 1 ? v * f : v + (255 - v) * (f - 1)));
  function hsv2rgb(h, s, v) { const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5) * 255, f(3) * 255, f(1) * 255]; }
  function rgb2hsv([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx]; }
  const colorize = (svg, swap) => svg.replace(/\{([a-z]+)(?:-(dark|light))?\}/g, (m, id, mod) => {
    const c = state.colors[swap && swap[0] === id ? swap[1] : id] || '#ff00ff'; return mod === 'dark' ? shade(c, 0.72) : mod === 'light' ? shade(c, 1.35) : c; });

  /* ---------------- two-colour gradient (Degradê) ----------------
     A colour with a partner (hair -> hair2, shirt -> shirt2) can fade into it. state.grad[id] is the
     direction: 'baixo' (colour 1 on top), 'cima', 'direita' (colour 1 on the viewer's left), 'esquerda'.
     Every layer painted in that colour is drawn twice (colour 1 and colour 2) and colour 2 is blended
     in with a ramp across the layer's frame (see gradFrame). */
  const GRAD = Object.fromEntries(CAT.colors.filter(c => c.gradOf).map(c => [c.gradOf, c.id]));
  const GRAD_DIRS = ['baixo', 'cima', 'direita', 'esquerda'];
  const gradOn = id => !!GRAD[id] && GRAD_DIRS.includes((state.grad || {})[id]);
  // which gradient colour a layer uses (null if none is on)
  function gradColorOf(L) {
    for (const id of Object.keys(GRAD)) {
      if (!gradOn(id)) continue;
      if (L.tint === id || (L.builtin && L.builtin.tint === id)) return id;
      if (L.svg && new RegExp('\\{' + id + '(-dark|-light)?\\}').test(L.svg)) return id;
    }
    return null;
  }

  /* ---------------- images ---------------- */
  const imgCache = new Map();
  function loadImage(src) {
    if (!imgCache.has(src)) imgCache.set(src, new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Não foi possível carregar ' + src.slice(0, 80))); im.src = src; }));
    return imgCache.get(src);
  }
  const svgCache = new Map();
  function svgImage(inner, w, h, vb) {
    const svg = inner.trim().startsWith('<svg') ? inner : `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(h)}" viewBox="${vb ? vb.join(' ') : `0 0 ${w} ${h}`}" preserveAspectRatio="none">${inner}</svg>`;
    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    if (svgCache.size > 200) { svgCache.clear(); }
    if (!svgCache.has(src)) svgCache.set(src, new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }));
    return svgCache.get(src);
  }
  const tintCache = new Map();
  function tinted(key, img, color, w, h) {
    const k = key + color; if (tintCache.has(k)) return tintCache.get(k);
    for (const kk of tintCache.keys()) if (kk.startsWith(key + '#')) tintCache.delete(kk);
    const c = document.createElement('canvas'); c.width = w || img.width; c.height = h || img.height;
    const x = c.getContext('2d');
    x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'multiply'; x.drawImage(img, 0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(img, 0, 0, c.width, c.height);
    tintCache.set(k, c); return c;
  }

  /* ---------------- which layers / pieces are active ---------------- */
  function chosenOptions() {
    return CAT.slots.filter(s => s.options).map(s => ({ ...(s.options.find(o => o.id === state.choices[s.id]) || s.options[0]), slot: s }));
  }
  // blocks: { slot: [option ids] | '*' } - a chosen option (a hat) rules out options of another row: they are greyed
  // in the menu and the arrows skip them ('*': the whole row). blocker() gives the option that blocks, if any.
  function blocker(sid, oid) {
    for (const o of chosenOptions()) { const b = o.blocks && o.slot.id !== sid && o.blocks[sid]; if (b && (b === '*' || b.includes(oid))) return o; }
    return null;
  }
  // after a change: a row left on an option that is now blocked moves on to the next one that is allowed
  function fixBlocked() {
    const moved = [];
    for (const s of CAT.slots.filter(s => s.options)) {
      const cur = state.choices[s.id], b = blocker(s.id, cur); if (!b || b.blocks[s.id] === '*') continue;
      const i0 = Math.max(0, s.options.findIndex(o => o.id === cur));
      for (let k = 1; k < s.options.length; k++) { const o = s.options[(i0 + k) % s.options.length];
        if (!blocker(s.id, o.id)) { state.choices[s.id] = o.id; moved.push(`${s.label}: ${o.label}`); break; } }
    }
    return moved;
  }
  const toggleOn = (slot, t) => !!(state.toggles || {})[t.id] && (!t.showOn || t.showOn.includes(state.choices[slot.id])) && (!t.ifGrad || gradOn(t.ifGrad));
  // noBoth: one side only (the watch), never 'Os dois'
  const sideOf = slot => { const v = (state.sides || {})[slot.id] || slot.sideDefault || 'ambos';
    return slot.noBoth && v === 'ambos' ? (slot.sideDefault || 'esq') : v; };
  function visibleKeys() {
    const vis = new Set(MODEL.objects.map(o => o.key));
    for (const o of chosenOptions()) { (o.hide || []).forEach(k => vis.delete(k)); }
    for (const o of chosenOptions()) { (o.show || []).forEach(k => vis.add(k)); }
    return vis;
  }
  /* ---------------- hand-held props (flat pictures glued onto a hand) ---------------- */
  // the rows 'maodir' / 'maoesq' pick a picture from CAT.props; it is printed as its own small
  // piece (cut out along its black outline) and shown in front of that hand in the 3D view
  const PROPS = CAT.props || {};
  const HANDS = { maodir: -1, maoesq: 1 };   // doll's right hand is at -x
  function chosenProps() {
    return Object.entries(HANDS).map(([sl, sx]) => {
      const slot = CAT.slots.find(s => s.id === sl); if (!slot) return null;
      const o = slot.options.find(o => o.id === state.choices[sl]);
      return o && o.prop && PROPS[o.prop] ? { slot: sl, sx, id: o.prop, ...PROPS[o.prop] } : null;
    }).filter(Boolean);
  }
  const propImgs = {};
  function propSvg(p) {
    const [w, h] = p.vb;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 10}" height="${h * 10}">` +
      `<g stroke="#1d1712" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${p.svg}</g></svg>`;
  }
  function propImage(p) {
    if (propImgs[p.id]) return propImgs[p.id];
    const img = new Image();
    img.onload = () => { layoutCache.clear(); scheduleSheet(); updateProps3D(); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(propSvg(p));
    return (propImgs[p.id] = img);
  }
  function updateProps3D() {
    const T = window.THREE; if (!T || !three.doll) return;
    (three.props || []).forEach(m => { three.doll.remove(m); m.geometry.dispose(); m.material.map && m.material.map.dispose(); m.material.dispose(); });
    three.props = [];
    for (const p of chosenProps()) {
      const img = propImage(p); if (!img.complete || !img.naturalWidth) continue;
      const [vw, vh] = p.vb, h = p.h, w = h * vw / vh;
      const cv = document.createElement('canvas'); cv.width = Math.round(512 * vw / Math.max(vw, vh)); cv.height = Math.round(512 * vh / Math.max(vw, vh));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      const t = new T.CanvasTexture(cv); if ('encoding' in t) t.encoding = T.sRGBEncoding;
      const mesh = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshLambertMaterial({ map: t, side: T.DoubleSide, transparent: true, alphaTest: 0.5 }));
      // the grip point of the picture sits on the hand, just in front of it
      const [gx, gy] = p.grip || [vw / 2, vh / 2];
      mesh.position.set(p.sx * 1.27 - (gx / vw - 0.5) * w, -0.56 + (gy / vh - 0.5) * h, 0.27);
      three.doll.add(mesh); three.props.push(mesh);
    }
  }
  function hairToggle(id) {
    const hs = CAT.slots.find(s => s.id === 'hair'), t = hs && (hs.toggles || []).find(t => t.id === id);
    return !!t && toggleOn(hs, t);
  }
  /* QR code on top of the stand, in front of the feet: the link typed in the print section,
     drawn on a white square (so phones can read it) in the 'qr' colour. */
  function qrLayers() {
    const url = (state.qr || '').trim();
    if (!url || typeof window.qrcode !== 'function') return [];
    let q; try { q = window.qrcode(0, 'M'); q.addData(unescape(encodeURIComponent(url)), 'Byte'); q.make(); } catch (e) { console.warn('QR', e); return []; }
    const n = q.getModuleCount(), quiet = 2, size = 340, m = size / (n + 2 * quiet), x0 = 459 - size / 2, y0 = 878 - size;
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${(x0 + (c + quiet) * m).toFixed(2)} ${(y0 + (r + quiet) * m).toFixed(2)}h${m.toFixed(2)}v${m.toFixed(2)}h-${m.toFixed(2)}z`;
    return [{ region: 'base.top', z: 6, svg: `<rect x="${x0}" y="${y0}" width="${size}" height="${size}" fill="#ffffff"/><path d="${d}" fill="{qr}" shape-rendering="crispEdges"/>` }];
  }
  const HAIR_SLOTS = ['hair', 'comprimento'];
  let hairCut = null;
  // the part of a hair plane below height py (plane px), as a rectangle in texture px
  const cutRect = (reg, py) => { const [, x, y, w, h, , vy = 0, , vh = h] = CAT.regions[reg], ty = Math.min(y + h, Math.max(y, y + (py - vy) * h / vh)); return [x, ty, w, y + h - ty]; };
  function activeLayers() {
    const groups = new Set(['base']); const extra = []; const without = new Set();
    const chosen = chosenOptions();
    // drop: an option can remove the other options' layers that carry that tag (e.g. the hairline)
    const drop = new Set(chosen.flatMap(o => o.drop || []));
    // on/off tags under a row (eyelashes, navel piercing) add their layers like an option
    const toggles = CAT.slots.flatMap(sl => (sl.toggles || []).filter(t => toggleOn(sl, t)));
    // cutHair (hats): the hair pieces are only drawn below these heights (plane px), see cutRect()
    const cutter = chosen.find(o => o.cutHair); hairCut = cutter ? cutter.cutHair : null;
    for (const o of [{ layers: (CAT.base || []).concat(qrLayers()) }].concat(chosen, toggles)) {
      (o.without || []).forEach(n => without.add(n));
      const side = o.slot && o.slot.sides ? sideOf(o.slot) : 'ambos';
      [].concat(o.builtin || []).forEach(b => groups.add(b));   // a built-in group ('hair:original') or one layer by name
      for (const L0 of o.layers || []) {
        // one-side items: 'esq' / 'dir' layers follow the side chosen on the row's tag
        if (L0.side && side !== 'ambos' && L0.side !== side) continue;
        if (L0.tag && drop.has(L0.tag)) continue;
        // ifGradDirs: only while that colour's gradient runs one of these ways
        if (L0.ifGradDirs && !L0.ifGradDirs.includes((state.grad || {})[L0.ifGradDirs.of])) continue;
        // if: { slot: [option ids] } - the layer is only used together with those options
        if (L0.if && !Object.entries(L0.if).every(([sl, ids]) => ids.includes(state.choices[sl]))) continue;
        let L = (COPIES.some(c => c[0] === L0.region) && L0.side) ? { ...L0, late: true } : L0;
        if (hairCut && o.slot && HAIR_SLOTS.includes(o.slot.id) && hairCut[L.region] !== undefined) L = { ...L, cutRects: [cutRect(L.region, hairCut[L.region])] };
        // scaleBy: the row's size slider shrinks the drawing around its origin
        if (L.scaleBy && L.svg) { const k = ((state.scales || {})[L.scaleBy] ?? 100) / 100, [ox, oy] = L.origin || [0, 0];
          if (k !== 1) L = { ...L, svg: `<g transform="translate(${ox} ${oy}) scale(${k}) translate(${-ox} ${-oy})">${L.svg}</g>` }; }
        const r = L.rect || CAT.regions[L.region];
        if (!r) { console.warn('Região desconhecida:', L.region); continue; }
        // a region is [texture, x, y, w, h] in texture px, optionally followed by its own coordinate box
        // [vx, vy, vw, vh] (drawings and 'at' placements use those coordinates)
        const [t, x, y, w, h, vx = 0, vy = 0, vw = w, vh = h] = r, kx = w / vw, ky = h / vh;
        // Ashley's hair pieces: 'Espelhar lado' mirrors
        // them about the middle of the plane; both stay inside the plane's own region
        if (L.at && L.hairfx) {
          const k = 1, flip = hairToggle('espelhar');
          const [cx, cy] = L.hairfx === 'front' ? [518, 300] : [447.6, 259];
          let [ax, ay, aw, ah] = L.at; ax = cx + (ax - cx) * k; ay = cy + (ay - cy) * k; aw *= k; ah *= k;
          if (flip) ax = 2 * cx - ax - aw;
          L = { ...L, at: [ax, ay, aw, ah], flip, clipRect: [x, y, w, h] };
        }
        if (L.at) extra.push({ ...L, tex: t, x: x + (L.at[0] - vx) * kx, y: y + (L.at[1] - vy) * ky, w: L.at[2] * kx, h: L.at[3] * ky, z: L.z ?? 20 });
        else extra.push({ ...L, tex: t, x, y, w, h, vb: [vx, vy, vw, vh], z: L.z ?? 20 });
      }
    }
    for (const [from, to] of COPIES) { const sb = CAT.regions[to];
      extra.push({ copySide: from, tex: sb[0], x: sb[1], y: sb[2], w: sb[3], h: sb[4], z: -1 }); }
    const list = BUILTIN.filter(b => (groups.has(b.group) || groups.has(b.name)) && !without.has(b.name)).map(b => ({ builtin: b, tex: b.tex, z: b.z, tint: b.tint,
      // the book's own hair pieces (texture 0) are cut under a hat like the others
      ...(hairCut && b.tex === 0 && /^hair:/.test(b.group || '') ? { cutRects: Object.entries(hairCut).map(([reg, py]) => cutRect(reg, py)) } : {}) }));
    // the name on the stand
    const lab = CAT.regions['base.label'];
    list.push({ text: true, tex: lab[0], x: lab[1], y: lab[2], w: lab[3], h: lab[4], z: 50 });
    return list.concat(extra).sort((a, b) => a.z - b.z);
  }

  /* ---------------- texture compositing ---------------- */
  const tex = Array.from({ length: NTEX }, () => { const c = document.createElement('canvas'); c.width = c.height = TS; return c; });
  const texUses = Array.from({ length: NTEX }, () => new Set());
  let texVersion = 0;

  async function composeTexture(i, layers) {
    const uses = new Set(); const jobs = [];
    for (const L of layers) {
      if (L.tex !== i) continue;
      if (L.builtin) { if (L.tint) uses.add(L.tint); const g = gradColorOf(L); if (g) uses.add(GRAD[g]); jobs.push(loadImage(L.builtin.src).then(img => ({ L, img, grad: g }))); }
      else if (L.text) { uses.add('base'); uses.add('name'); jobs.push((document.fonts ? document.fonts.load(fontCss(40), state.name || 'A').catch(() => {}) : Promise.resolve()).then(() => ({ L }))); }
      else if (L.svg) { (L.svg.match(/\{([a-z]+)/g) || []).forEach(m => uses.add(m.slice(1)));
        const g = gradColorOf(L);
        if (g) { uses.add(GRAD[g]); jobs.push(Promise.all([svgImage(colorize(L.svg), L.w, L.h, L.vb), svgImage(colorize(L.svg, [g, GRAD[g]]), L.w, L.h, L.vb)]).then(([img, img2]) => ({ L, img, img2, grad: g }))); }
        else jobs.push(svgImage(colorize(L.svg), L.w, L.h, L.vb).then(img => ({ L, img }))); }
      else if (L.src) { if (L.tint) uses.add(L.tint); const g = gradColorOf(L); if (g) uses.add(GRAD[g]); jobs.push(loadImage(L.src).then(img => ({ L, img, grad: g }))); }
      else if (L.copySide) jobs.push(Promise.resolve({ L }));
    }
    const ready = await Promise.all(jobs.map(j => j.catch(e => { console.warn(e); return null; })));
    const ctx = tex[i].getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, TS, TS);
    if (i !== 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, TS, TS); }   // texture 0 = hair cut-outs, transparent around them
    const late = [];
    for (const r of ready) {
      if (!r) continue;
      if (r.L.late) { late.push(r); continue; }
      await drawLayer(ctx, r);
    }
    // texture 1: the shared head-side picture is copied for the doll's left side (texture 0)
    // before one-side items (earrings on one ear only) are drawn
    if (i === 1) for (const [from] of COPIES) { const [, x, y, w, h] = CAT.regions[from], snap = sideSnap[from]; const c = snap.getContext('2d'); c.clearRect(0, 0, snap.width, snap.height); c.drawImage(tex[1], x, y, w, h, 0, 0, snap.width, snap.height); }
    for (const r of late) await drawLayer(ctx, r);
    if (i === 0 && hairCut && hairCut['hair.back'] !== undefined) {   // the cut edge of the back hair piece gets an outline (only over the hair)
      const [x, y, w] = cutRect('hair.back', hairCut['hair.back']);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = '#1d1712'; ctx.fillRect(x, y, w, 6); ctx.restore();
    }
    texUses[i] = uses;
  }
  // shared pictures on texture 1 that one side of the doll gets its own copy of (texture 0):
  // the head sides (earrings on one ear) and the arms (a watch on one wrist)
  const COPIES = [['head.side', 'head.side.b'], ['arms', 'arms.b']].filter(c => CAT.regions[c[0]] && CAT.regions[c[1]]);
  const sideSnap = {};
  for (const [from, to] of COPIES) { const r = CAT.regions[to], c = sideSnap[from] = document.createElement('canvas'); c.width = r[3]; c.height = r[4]; }
  // a gradient layer: drawn in colour 1 and in colour 2 on two scratch canvases, colour 2 kept where the ramp says
  // one set of scratch canvases per texture: the textures are drawn at the same time, and a shared set let one
  // texture's gradient leak into another (pieces of the shirt showing up on the face)
  const gradSets = new Map();
  const gradCanvasesFor = canvas => { if (!gradSets.has(canvas)) gradSets.set(canvas, [0, 1, 2].map(() => { const c = document.createElement('canvas'); c.width = c.height = TS; return c; })); return gradSets.get(canvas); };
  async function drawLayer(ctx, r) {
    if (!r.grad) return drawLayer1(ctx, r);
    const gradCanvases = gradCanvasesFor(ctx.canvas), [a, b] = gradCanvases, ca = a.getContext('2d'), cb = b.getContext('2d'), id = r.grad, id2 = GRAD[id];
    ca.setTransform(1, 0, 0, 1, 0, 0); ca.clearRect(0, 0, TS, TS); cb.setTransform(1, 0, 0, 1, 0, 0); cb.clearRect(0, 0, TS, TS);
    await drawLayer1(ca, r);
    const keep = state.colors[id]; state.colors[id] = state.colors[id2];
    try { await drawLayer1(cb, { ...r, img: r.img2 || r.img }); } finally { state.colors[id] = keep; }
    // the ramp (a mask): alpha 0 where colour 1 stays, 1 where colour 2 shows; outside every frame colour 2 goes away
    const cm = gradCanvases[2].getContext('2d'); cm.setTransform(1, 0, 0, 1, 0, 0); cm.clearRect(0, 0, TS, TS);
    for (const f of gradFrames(r.L, state.grad[id])) {
      if (f.solid !== undefined) { cm.fillStyle = `rgba(0,0,0,${f.solid})`; cm.fillRect(f.x, f.y, f.w, f.h); continue; }
      const g = cm.createLinearGradient(...f.line); g.addColorStop(0.12, 'rgba(0,0,0,0)'); g.addColorStop(0.88, 'rgba(0,0,0,1)');
      cm.fillStyle = g; cm.fillRect(f.x, f.y, f.w, f.h);
    }
    cb.globalCompositeOperation = 'destination-in'; cb.drawImage(gradCanvases[2], 0, 0);
    cb.globalCompositeOperation = 'source-over';
    ca.drawImage(b, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(a, 0, 0); ctx.restore();
  }
  // frames (texture px) where the ramp runs, each with its own direction. Faces seen from behind (back of the
  // head, back hair piece, back of the shirt) run left/right the other way, so the doll reads the same all round.
  function gradFrames(L, dir) {
    const R = n => CAT.regions[n], vert = dir === 'baixo' || dir === 'cima', rev = dir === 'cima' || dir === 'esquerda';
    const box = (x, y, w, h, back, flat) => {
      if (flat !== undefined) return { x, y, w, h, solid: flat };
      let line = vert ? [x, y, x, y + h] : [x, y, x + w, y];
      if (rev !== (!vert && !!back)) line = [line[2], line[3], line[0], line[1]];
      return { x, y, w, h, line };
    };
    // the shirt (texture 2): shoulders to hips; front and back columns, the sides half-way
    if (L.tex === 2) {
      if (vert) return [box(0, 300, TS, 760)].concat(rev ? [{ x: 0, y: 0, w: TS, h: 300, solid: 1 }, { x: 0, y: 1060, w: TS, h: TS - 1060, solid: 0 }] : [{ x: 0, y: 0, w: TS, h: 300, solid: 0 }, { x: 0, y: 1060, w: TS, h: TS - 1060, solid: 1 }]);
      return [box(25, 0, 723, TS), box(781, 0, 723, TS), { x: 0, y: 0, w: 25, h: TS, solid: 0.5 }, { x: 748, y: 0, w: 33, h: TS, solid: 0.5 }, { x: 1504, y: 0, w: TS - 1504, h: TS, solid: 0.5 }];
    }
    // hair: the layer's own box; whole-texture pictures (the book's hair) use the region they sit in
    const reg = L.region || (L.tex === 0 ? 'hair.front' : 'head.front');
    let [, x, y, w, h, vx = 0, vy = 0, vw = w, vh = h] = R(reg) || [0, 0, 0, TS, TS];
    if (L.at) { x = L.x; y = L.y; w = L.w; h = L.h; }
    else if (reg === 'hair.front' || reg === 'hair.back') { const ky = h / vh; y = y + (60 - vy) * ky; h = 990 * ky; }
    const back = reg === 'hair.back';   // the back hair piece is drawn mirrored; head.back and the shirt back are not
    // sleeves: top to bottom along the arm; left / right: each arm one colour (the doll's right arm is 'arms')
    if (reg === 'arms' || reg === 'arms.b') return [vert ? box(x, y, w, h) : box(x, y, w, h, false, (reg === 'arms') === rev ? 1 : 0)];
    if (reg === 'head.top') return [vert ? box(x, y, w, h, false, rev ? 1 : 0) : box(x, y, w, h)];
    if (reg === 'head.side' || reg === 'head.side.b') return [vert ? box(x, y, w, h) : box(x, y, w, h, false, 0.5)];
    if (L.builtin) return [{ x: 0, y: 0, w: TS, h: TS, line: vert ? (rev ? [0, TS, 0, 0] : [0, 0, 0, TS]) : (rev ? [TS, 0, 0, 0] : [0, 0, TS, 0]) }];
    return [box(x, y, w, h, back)];
  }
  async function drawLayer1(ctx, r) {
    const L = r.L;
    if (!L.flip && !L.clipRect && !L.cutRects) return drawLayer0(ctx, r);
    ctx.save();
    if (L.clipRect) { ctx.beginPath(); ctx.rect(...L.clipRect); ctx.clip(); }
    if (L.cutRects) { ctx.beginPath(); L.cutRects.forEach(c => ctx.rect(...c)); ctx.clip(); }
    if (L.flip) { ctx.translate(2 * L.x + L.w, 0); ctx.scale(-1, 1); }
    await drawLayer0(ctx, r); ctx.restore();
  }
  async function drawLayer0(ctx, r) {
      const { L, img } = r;
      if (L.copySide) {
        ctx.drawImage(sideSnap[L.copySide], L.x, L.y, L.w, L.h);
      } else if (L.builtin) {
        ctx.drawImage(L.tint ? tinted(L.builtin.name, img, state.colors[L.tint]) : img, 0, 0, TS, TS);
      } else if (L.text) {
        drawName(ctx, L);
      } else if (L.mask) {   // keep the drawing only where a built-in layer is (e.g. stripes only on the shirt)
        const m = BUILTIN.find(b => b.name === L.mask); const mi = m && await loadImage(m.src);
        const t = document.createElement('canvas'); t.width = t.height = TS; const tc = t.getContext('2d');
        tc.drawImage(L.src && L.tint ? tinted(L.src, img, state.colors[L.tint], L.w, L.h) : img, L.x, L.y, L.w, L.h);
        // maskFrom: the mask lives in another region (the left arm's copy uses the shared arm's sleeves)
        const mf = L.maskFrom && CAT.regions[L.maskFrom];
        if (mi) { tc.globalCompositeOperation = 'destination-in'; if (mf) { tc.drawImage(mi, mf[1], mf[2], mf[3], mf[4], L.x, L.y, L.w, L.h); } else tc.drawImage(mi, 0, 0, TS, TS); }
        ctx.drawImage(t, 0, 0);
      } else if (L.src && L.tint) {
        ctx.drawImage(tinted(L.src, img, state.colors[L.tint], L.w, L.h), L.x, L.y, L.w, L.h);
      } else {
        ctx.drawImage(img, L.x, L.y, L.w, L.h);
      }
  }
  const nameFont = () => (CAT.nameFonts || []).find(f => f.id === state.nameFont) || { css: '700 {size}px "Baloo 2"' };
  const fontCss = px => nameFont().css.replace('{size}', px.toFixed(1)) + ', "Nunito Sans", system-ui, sans-serif';
  // The name is always centred on the front of the stand. It shrinks to fit, and a long name goes on two lines.
  function drawName(ctx, L) {
    const name = (state.name || '').trim().replace(/\s+/g, ' '); if (!name) return;
    const [r, g, b] = hex2rgb(state.colors.base); const light = 0.299 * r + 0.587 * g + 0.114 * b > 150;
    ctx.save(); ctx.fillStyle = light ? '#1d1712' : '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const want = L.h * 0.6 * (state.nameSize || 100) / 100, maxW = L.w * 0.92;
    const fit = (lines, maxH) => { let fs = Math.min(want, maxH); ctx.font = fontCss(fs);
      const w = Math.max(...lines.map(t => ctx.measureText(t).width)); if (w > maxW) fs *= maxW / w; return fs; };
    let lines = [name], fs = fit(lines, L.h * 0.85);
    const words = name.split(' ');
    if (fs < want * 0.72 && words.length > 1) {      // try two lines, split where the halves are most even
      let best = null;
      for (let i = 1; i < words.length; i++) { const two = [words.slice(0, i).join(' '), words.slice(i).join(' ')]; const f2 = fit(two, L.h * 0.44); if (!best || f2 > best.f) best = { f: f2, two }; }
      if (best.f > fs) { lines = best.two; fs = best.f; }
    }
    ctx.font = fontCss(fs);
    const lh = fs * 1.08, cy = L.y + L.h / 2;
    lines.forEach((t, i) => ctx.fillText(t, L.x + L.w / 2, cy + (i - (lines.length - 1) / 2) * lh + fs * 0.05));
    ctx.restore();
  }

  let composeQueued = null, composing = false;
  function refresh(changedColor) {
    // which textures must be redrawn?
    const which = new Set();
    for (let i = 0; i < NTEX; i++) if (!changedColor || texUses[i].has(changedColor)) which.add(i);
    if (composeQueued) which.forEach(i => composeQueued.add(i)); else composeQueued = which;
    if (!composing) runCompose();
  }
  async function runCompose() {
    composing = true;
    while (composeQueued && composeQueued.size) {
      const which = composeQueued; composeQueued = null;
      const layers = activeLayers();
      if (which.has(1)) which.add(0);
      // with a gradient on, one texture at a time: a gradient layer briefly swaps a colour in the state while it
      // draws, and a texture drawn at the same moment would pick up the wrong colour
      if (Object.keys(state.grad || {}).length) { for (const i of [...which].filter(i => i !== 0)) await composeTexture(i, layers); }
      else await Promise.all([...which].filter(i => i !== 0).map(i => composeTexture(i, layers)));
      if (which.has(0)) { await composeTexture(0, layers); updateHairView(); if (three.hairTex) three.hairTex.needsUpdate = true; }
      texVersion++; sampleCache.clear();
      which.forEach(i => { if (three.textures[i]) three.textures[i].needsUpdate = true; });
      applyVisibility(); updateProps3D(); syncBrims3D();
      scheduleSheet();
      await new Promise(r => requestAnimationFrame(r));
    }
    composing = false;
  }

  /* ---------------- folded brims ---------------- */
  // A hat, helmet or cap with brim: { cx, rx, fold, depth, tilt } in the front hair piece's drawing coordinates.
  // On paper the brim hangs under the crown on the same piece, with a dashed fold line; it is folded forward
  // (in an L) before gluing. In 3D the brim is cut off the flat piece and drawn folded along that line.
  const hairView = document.createElement('canvas'); hairView.width = hairView.height = TS;
  const activeBrims = () => chosenOptions().flatMap(o => o.brim ? [o.brim] : []);
  function brimTexRect(b) {
    const [, x, y, w, h, vx = 0, vy = 0, vw = w, vh = h] = CAT.regions['hair.front'], kx = w / vw, ky = h / vh;
    return { x0: x + (b.cx - b.rx - vx) * kx, x1: x + (b.cx + b.rx - vx) * kx, y0: y + (b.fold - vy) * ky, y1: y + (b.fold + b.depth - vy) * ky };
  }
  function updateHairView() {
    const c = hairView.getContext('2d'); c.clearRect(0, 0, TS, TS); c.drawImage(tex[0], 0, 0);
    for (const b of activeBrims()) { const r = brimTexRect(b); c.clearRect(r.x0 - 6, r.y0 + 2, r.x1 - r.x0 + 12, r.y1 - r.y0 + 16); }
  }
  // texture pixels of the front hair piece -> 3D (x, y) on its front face, fitted once from the model
  let hairMap = null;
  function getHairMap() {
    if (hairMap) return hairMap;
    const o = MODEL.objects.find(o => o.key === 'cabelo_frente'); if (!o) return null;
    const rows = [];
    for (const f of o.faces) if (f.m === 0 && f.n[2] > 0.5) for (let k = 0; k < f.i.length; k++) { const vi = f.i[k]; rows.push([f.uv[2 * k] * TS, f.uv[2 * k + 1] * TS, o.verts[vi * 3], o.verts[vi * 3 + 1], o.verts[vi * 3 + 2]]); }
    if (rows.length < 3) return null;
    // least squares: X = a u + b v + c, Y = d u + e v + f
    const fit = col => { const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], r = [0, 0, 0];
      for (const q of rows) { const v = [q[0], q[1], 1]; for (let i = 0; i < 3; i++) { r[i] += v[i] * q[col]; for (let j = 0; j < 3; j++) A[i][j] += v[i] * v[j]; } }
      const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      const D = det(A); return [0, 1, 2].map(k => det(A.map((row, i) => row.map((v, j) => j === k ? r[i] : v))) / D); };
    const X = fit(2), Y = fit(3), z0 = Math.max(...rows.map(q => q[4]));
    hairMap = { P: (u, v) => [X[0] * u + X[1] * v + X[2], Y[0] * u + Y[1] * v + Y[2]], z0 };
    return hairMap;
  }
  function syncBrims3D() {
    if (!three.doll || !window.THREE) return;
    const T = window.THREE;
    for (const m of three.brims || []) { three.doll.remove(m); m.geometry.dispose(); }
    three.brims = [];
    const map = getHairMap(); if (!map || !visibleKeys().has('cabelo_frente')) return;
    if (!three.brimMats) three.brimMats = [new T.MeshLambertMaterial({ map: three.textures[0], side: T.FrontSide, transparent: true, alphaTest: 0.04 }),
      new T.MeshLambertMaterial({ map: three.textures[0], side: T.BackSide, transparent: true, alphaTest: 0.04, color: 0xb0b0b0 })];
    for (const b of activeBrims()) {
      const r = brimTexRect(b), [ax, fy] = map.P(r.x0, r.y0), [bx] = map.P(r.x1, r.y0), [, ly] = map.P(r.x0, r.y1);
      const L = Math.abs(ly - fy), th = (b.tilt ?? 88) * Math.PI / 180, z0 = map.z0 + 0.004;
      const dy = -L * Math.cos(th), dz = L * Math.sin(th);
      // A, B on the fold; D, C at the brim's edge (drawn on top, printed side up)
      const P = [[ax, fy, z0], [bx, fy, z0], [bx, fy + dy, z0 + dz], [ax, fy + dy, z0 + dz]], U = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]];
      const pos = [], uv = [];
      for (const k of [0, 3, 2, 0, 2, 1]) { pos.push(...P[k]); uv.push(U[k][0] / TS, U[k][1] / TS); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
      for (const m of three.brimMats) { const mesh = new T.Mesh(g, m); three.doll.add(mesh); three.brims.push(mesh); }
    }
  }

  /* ---------------- three.js doll ---------------- */
  const three = { textures: [], meshes: {}, materials: [] };
  function initThree() {
    const host = document.getElementById('view3d');
    if (!window.THREE) { host.innerHTML = '<p class="fallback">A vista 3D precisa de internet para carregar. O molde ao lado continua funcionando.</p>'; return; }
    const T = window.THREE;
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    if ('outputEncoding' in renderer) renderer.outputEncoding = T.sRGBEncoding;
    host.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(6.5, 3.2, 13.5);
    scene.add(new T.HemisphereLight(0xffffff, 0xb9b3c9, 0.75));
    const sun = new T.DirectionalLight(0xffffff, 0.55); sun.position.set(4, 8, 9); scene.add(sun);
    const fill = new T.DirectionalLight(0xffffff, 0.25); fill.position.set(-6, 2, -5); scene.add(fill);

    for (let i = 0; i < NTEX; i++) {
      const t = new T.CanvasTexture(tex[i]); t.flipY = false; t.anisotropy = 4;
      if ('encoding' in t) t.encoding = T.sRGBEncoding;
      three.textures[i] = t;
    }
    // the hair pieces in 3D use a copy of texture 0 without the folded brims (those are drawn on their own)
    updateHairView(); three.hairTex = new T.CanvasTexture(hairView); three.hairTex.flipY = false; three.hairTex.anisotropy = 4;
    if ('encoding' in three.hairTex) three.hairTex.encoding = T.sRGBEncoding;
    const doll = new T.Group(); scene.add(doll); three.doll = doll;
    for (const o of MODEL.objects) {
      const pos = [], uv = [], nor = [];
      const V = o.verts; const g = new T.BufferGeometry(); const mats = [];
      // faces grouped by texture, so one paper piece can use several textures
      for (const t of [...new Set(o.faces.map(f => f.m))]) {
        const start = pos.length / 3;
        for (const f of o.faces) {
          if (f.m !== t) continue;
          for (let k = 1; k < f.i.length - 1; k++) for (const j of [0, k, k + 1]) {
            const vi = f.i[j]; pos.push(V[vi * 3], V[vi * 3 + 1], V[vi * 3 + 2]);
            uv.push(f.uv[j * 2], f.uv[j * 2 + 1]); nor.push(f.n[0], f.n[1], f.n[2]);
          }
        }
        g.addGroup(start, pos.length / 3 - start, mats.length);
        // the hair planes blend their soft edges (no jagged cut line); everything else is solid paper
        const soft = t === 0 && o.key.startsWith('cabelo'), mk = soft ? 'hair' : t;
        mats.push(three.materials[mk] || (three.materials[mk] = new T.MeshLambertMaterial(soft ? { map: three.hairTex, side: T.DoubleSide, transparent: true, alphaTest: 0.04 }
          : { map: three.textures[t], side: T.DoubleSide, alphaTest: t === 0 ? 0.5 : 0 })));
      }
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
      const mesh = new T.Mesh(g, mats); mesh.name = o.key;
      doll.add(mesh); three.meshes[o.key] = mesh;
    }
    const controls = new T.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0); controls.enableDamping = true; controls.minDistance = 7; controls.maxDistance = 30;
    controls.autoRotate = true; controls.autoRotateSpeed = 1.4; controls.enablePan = false;
    window.__front = (x = 0, y = 0.6, z = 15, ty = 0.6) => { controls.autoRotate = false; camera.position.set(x, y, z); controls.target.set(0, ty, 0); controls.update(); };
    // Foto: the doll seen from the front, on the background colour, copied to the clipboard (saved as a file
    // where the browser does not allow the clipboard)
    // two buttons: 'Foto' keeps the view as it is now (angle and zoom), 'De frente' turns the doll to face the camera
    const takePhoto = async front => {
      const pos = camera.position.clone(), tgt = controls.target.clone(), spin = controls.autoRotate;
      controls.autoRotate = false; if (front) { camera.position.set(0, 0.2, 16.5); controls.target.set(0, 0.2, 0); } controls.update();
      const pr0 = renderer.getPixelRatio(); renderer.setPixelRatio(3); fit(); renderer.render(scene, camera);
      // cropped to the doll (the drawn pixels) with a small margin
      const src = renderer.domElement, t = document.createElement('canvas'); t.width = src.width; t.height = src.height;
      const tx = t.getContext('2d', { willReadFrequently: true }); tx.drawImage(src, 0, 0); const px = tx.getImageData(0, 0, t.width, t.height).data;
      let x0 = t.width, y0 = t.height, x1 = 0, y1 = 0;
      for (let y = 0; y < t.height; y += 2) for (let x = 0; x < t.width; x += 2) if (px[(y * t.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 <= x0) { x0 = 0; y0 = 0; x1 = t.width; y1 = t.height; }
      const pad = Math.round(0.06 * Math.max(x1 - x0, y1 - y0)); x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(t.width, x1 + pad); y1 = Math.min(t.height, y1 + pad);
      const c = document.createElement('canvas'); c.width = x1 - x0; c.height = y1 - y0;
      const cx = c.getContext('2d'); cx.fillStyle = getComputedStyle(host).backgroundColor || '#ffffff'; cx.fillRect(0, 0, c.width, c.height); cx.drawImage(t, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
      renderer.setPixelRatio(pr0); fit();
      camera.position.copy(pos); controls.target.copy(tgt); controls.autoRotate = spin; controls.update();
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      try {
        if (!navigator.clipboard || !window.ClipboardItem) throw new Error('no clipboard');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast('Foto da boneca copiada para a área de transferência. É só colar (Ctrl+V).');
      } catch (e) { await saveBlob(blob, fileBase() + '-foto.png'); toast('O navegador não deixou copiar, então a foto foi salva como arquivo.'); }
    };
    document.getElementById('photo').addEventListener('click', () => takePhoto(false));
    document.getElementById('photoFront').addEventListener('click', () => takePhoto(true));
    renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; document.getElementById('spin').setAttribute('aria-pressed', 'false'); });
    document.getElementById('spin').addEventListener('click', e => {
      controls.autoRotate = !controls.autoRotate; e.currentTarget.setAttribute('aria-pressed', String(controls.autoRotate)); });
    const fit = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    new ResizeObserver(fit).observe(host); fit();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { controls.autoRotate = false; document.getElementById('spin').setAttribute('aria-pressed', 'false'); }
    (function loop() { controls.update(); renderer.render(scene, camera); requestAnimationFrame(loop); })();
  }
  function applyVisibility() {
    const vis = visibleKeys();
    for (const [k, m] of Object.entries(three.meshes)) m.visible = vis.has(k);
  }

  /* ---------------- the printable net ---------------- */
  // Glue tab polygon for an open edge: trapezoid pointing away from its face.
  function tabPolygon(fl, h) {
    const [ax, ay, bx, by] = fl.s; const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    if (len < 1e-6) return null;
    const ux = dx / len, uy = dy / len; let nx = -uy, ny = ux;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    if ((fl.c[0] - mx) * nx + (fl.c[1] - my) * ny > 0) { nx = -nx; ny = -ny; }
    let ha = h, ia = h / Math.tan(fl.fa || Math.PI / 4), ib = h / Math.tan(fl.fb || Math.PI / 4);
    if (ia + ib > len * 0.8) { const k = (len * 0.8) / (ia + ib); ha *= k; ia *= k; ib *= k; }
    return [[ax, ay], [ax + nx * ha + ux * ia, ay + ny * ha + uy * ia], [bx + nx * ha - ux * ib, by + ny * ha - uy * ib], [bx, by]];
  }
  // which faces / tabs the chosen print version leaves out of one part
  function netEdits(pi) {
    const out = { faces: new Set(), tabs: new Set(), lower: new Set() };
    for (const e of [NET.all, NET[state.model]]) if (e) for (const k of ['faces', 'tabs', 'lower']) ((e[k] || {})[pi] || []).forEach(v => out[k].add(v));
    return out;
  }
  const near = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by) < 0.05;
  function faceEdges(obj, fi) {
    const f = obj.faces[fi], n = f.i.length, out = [];
    for (let k = 0; k < n; k++) { const j = (k + 1) % n; out.push({ a: [f.xy[2 * k], f.xy[2 * k + 1]], b: [f.xy[2 * j], f.xy[2 * j + 1]], va: f.i[k], vb: f.i[j] }); }
    return out;
  }
  const sameEdge = (e, s) => (near(e.a[0], e.a[1], s[0], s[1]) && near(e.b[0], e.b[1], s[2], s[3])) || (near(e.b[0], e.b[1], s[0], s[1]) && near(e.a[0], e.a[1], s[2], s[3]));
  // the edge [x1, y1, x2, y2] with its lower end (in 3D, the foot end) first
  function footFirst(p, obj, s) {
    for (const fi of p.faces) for (const e of faceEdges(obj, fi)) if (sameEdge(e, s)) {
      const y = v => obj.verts[v * 3 + 1];
      const lowA = near(e.a[0], e.a[1], s[0], s[1]) ? y(e.va) <= y(e.vb) : y(e.vb) <= y(e.va);
      return lowA ? s : [s[2], s[3], s[0], s[1]];
    }
    return s;
  }
  // fold / cut lines without the left-out faces: a fold next to a removed face becomes a cut
  function netLines(p, obj, edits) {
    if (!edits.faces.size) return p.lines;
    const gone = [...edits.faces].flatMap(fi => faceEdges(obj, fi));
    const kept = p.faces.filter(fi => !edits.faces.has(fi)).flatMap(fi => faceEdges(obj, fi));
    const out = [];
    for (const l of p.lines) {
      if (!gone.some(e => sameEdge(e, l.s))) { out.push(l); continue; }
      if (kept.some(e => sameEdge(e, l.s))) out.push({ t: 'cut', s: l.s });
    }
    return out;
  }
  function pieceGeometry(scale) {
    const vis = visibleKeys(); const pieces = [];
    MODEL.parts.forEach((p, pi) => {
      if (!vis.has(p.key)) return;
      if (p.key === 'corpo' && p.faces.length <= 2) return;   // the small crotch filler: not printed (not needed to build)
      const obj = MODEL.objects[p.obj];
      const edits = netEdits(pi);
      const faces = p.faces.filter(fi => !edits.faces.has(fi)).map(fi => { const f = obj.faces[fi]; const pts = []; for (let k = 0; k < f.xy.length; k += 2) pts.push([f.xy[k] * scale, f.xy[k + 1] * scale]); return { f, pts }; });
      const S = a => a.map(v => v * scale);
      const tabs = p.flaps.map((fl, k) => {
        if (edits.tabs.has(k)) return null;
        let s = fl.s;
        if (edits.lower.has(k)) { const [fx, fy, hx, hy] = footFirst(p, obj, s); s = [fx, fy, fx + (hx - fx) * LOWER_TAB, fy + (hy - fy) * LOWER_TAB]; }
        return tabPolygon({ ...fl, s: S(s), c: S(fl.c) }, TAB_MM);
      }).filter(Boolean);
      const lines = netLines(p, obj, edits).map(l => ({ t: l.t, s: S(l.s) }));
      // where a glue tab was taken off (or shortened), its edge becomes a plain cut line
      const keptEdges = p.faces.filter(fi => !edits.faces.has(fi)).flatMap(fi => faceEdges(obj, fi));
      p.flaps.forEach((fl, k) => {
        if (!keptEdges.some(e => sameEdge(e, fl.s))) return;
        if (edits.tabs.has(k)) lines.push({ t: 'cut', s: S(fl.s) });
        else if (edits.lower.has(k)) { const [fx, fy, hx, hy] = footFirst(p, obj, fl.s);
          lines.push({ t: 'cut', s: S([fx + (hx - fx) * LOWER_TAB, fy + (hy - fy) * LOWER_TAB, hx, hy]) }); }
      });
      const all = faces.flatMap(f => f.pts).concat(tabs.flat());
      const xs = all.map(q => q[0]), ys = all.map(q => q[1]);
      const bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      pieces.push({ part: p, pi, faces, tabs, lines, bb, w: bb[2] - bb[0], h: bb[3] - bb[1] });
    });
    for (const pr of chosenProps()) {
      const h = pr.h * MODEL.unfoldScale * scale, w = h * pr.vb[0] / pr.vb[1];
      pieces.push({ prop: pr, part: { key: 'prop-' + pr.slot }, pi: -1, faces: [{ f: null, pts: [[0, 0], [w, 0], [w, h], [0, h]] }], tabs: [], lines: [], bb: [0, 0, w, h], w, h });
    }
    return pieces;
  }
  // Shape-aware packing: every piece (faces + glue tabs) is rasterised on a 1 mm grid at
  // 0/90/180/270 degrees (and 45 degree steps when needed) and dropped at the lowest free
  // spot ("bottom-left"), so small pieces fill the gaps around big ones. Pieces never overlap
  // and keep GAP mm between them. If the layout still needs two sheets, the doll is scaled
  // down a little (to at most MIN_FIT) so everything fits on one.
  const RES = 1, MIN_FIT = 0.82;
  const layoutCache = new Map();
  function pieceMask(pc, ang) {
    const c = Math.cos(ang * Math.PI / 180), s = Math.sin(ang * Math.PI / 180);
    const R = ([x, y]) => [x * c - y * s, x * s + y * c];
    const polys = pc.faces.map(f => f.pts.map(R)).concat(pc.tabs.map(t => t.map(R)));
    let mx = Infinity, my = Infinity, Mx = -Infinity, My = -Infinity;
    for (const P of polys) for (const [x, y] of P) { mx = Math.min(mx, x); my = Math.min(my, y); Mx = Math.max(Mx, x); My = Math.max(My, y); }
    const pad = Math.ceil(GAP / 2 / RES) + 1, w = Math.ceil((Mx - mx) / RES) + 2 * pad, h = Math.ceil((My - my) / RES) + 2 * pad;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = ctx.strokeStyle = '#000'; ctx.lineWidth = GAP / RES; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const P of polys) { P.forEach(([x, y], k) => { const X = (x - mx) / RES + pad, Y = (y - my) / RES + pad; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); }
    ctx.fill('nonzero'); ctx.stroke();
    const d = ctx.getImageData(0, 0, w, h).data, runs = [];
    for (let y = 0; y < h; y++) {
      const row = []; let st = -1;
      for (let x = 0; x <= w; x++) { const on = x < w && d[(y * w + x) * 4 + 3] > 0; if (on && st < 0) st = x; if (!on && st >= 0) { row.push(st, x - 1); st = -1; } }
      runs.push(row);
    }
    return { ang, c, s, mx, my, pad, w, h, runs };
  }
  function packShapes(pieces, W, H, masks, order, rule) {
    const cols = Math.floor(W / RES), rows = Math.floor(H / RES);
    const pages = [];
    const newPage = () => { const pg = { items: [], pre: Array.from({ length: rows }, () => new Int32Array(cols + 1)), grid: Array.from({ length: rows }, () => new Uint8Array(cols)) }; pages.push(pg); return pg; };
    const fits = (pg, m, X, Y) => {
      for (let i = 0; i < m.h; i++) { const r = m.runs[i]; if (!r.length) continue; const P = pg.pre[Y + i];
        for (let k = 0; k < r.length; k += 2) if (P[X + r[k + 1] + 1] - P[X + r[k]]) return false; }
      return true;
    };
    const place = (pg, m, X, Y) => {
      for (let i = 0; i < m.h; i++) { const r = m.runs[i]; if (!r.length) continue; const G = pg.grid[Y + i], P = pg.pre[Y + i];
        for (let k = 0; k < r.length; k += 2) for (let x = r[k]; x <= r[k + 1]; x++) G[X + x] = 1;
        for (let x = 0; x < cols; x++) P[x + 1] = P[x] + G[x]; }
    };
    const findSpot = (pg, m) => {
      if (m.w > cols || m.h > rows) return null;
      for (let Y = 0; Y + m.h <= rows; Y++) for (let X = 0; X + m.w <= cols; X++) if (fits(pg, m, X, Y)) return { X, Y };
      return null;
    };
    for (const i of order) {
      let done = false;
      for (const pg of pages.length ? pages : [newPage()]) {
        let best = null;
        for (const m of masks[i]) { const sp = findSpot(pg, m); if (!sp) continue; const sc = rule ? sp.Y * 1e4 + sp.X : (sp.Y + m.h) * 1e4 + sp.X; if (!best || sc < best.sc) best = { ...sp, m, sc }; }
        if (best) { place(pg, best.m, best.X, best.Y); pg.items.push({ pc: pieces[i], m: best.m, X: best.X, Y: best.Y }); done = true; break; }
      }
      if (!done) {
        const pg = newPage(); let best = null;
        for (const m of masks[i]) { const sp = findSpot(pg, m); if (sp) { best = { ...sp, m }; break; } }
        if (best) { place(pg, best.m, best.X, best.Y); pg.items.push({ pc: pieces[i], m: best.m, X: best.X, Y: best.Y }); }
        else pg.items.push({ pc: pieces[i], m: masks[i][0], X: 0, Y: 0, tooBig: true });
      }
    }
    return pages.map(pg => ({ items: pg.items }));
  }
  function pack(pieces, W, H) {
    const A = (pc, k) => pc.w * pc.h, orders = [
      (i, j) => pieces[j].w * pieces[j].h - pieces[i].w * pieces[i].h,
      (i, j) => Math.max(pieces[j].w, pieces[j].h) - Math.max(pieces[i].w, pieces[i].h),
      (i, j) => pieces[j].h - pieces[i].h,
      (i, j) => pieces[j].w - pieces[i].w,
    ].map(f => pieces.map((p, i) => i).sort(f));
    let best = null;
    for (const angles of [[0, 90, 180, 270], [0, 45, 90, 135, 180, 225, 270, 315]]) {
      const masks = pieces.map(pc => angles.map(a => pieceMask(pc, pc.prop ? 0 : a)));   // pictures stay upright
      for (const order of orders) for (const rule of [0, 1]) {
        const pages = packShapes(pieces, W, H, masks, order, rule);
        if (!best || pages.length < best.length) best = pages;
        if (best.length === 1) return best;
      }
    }
    return best;
  }
  function layoutSheet() {
    const [W, H] = PAPER[state.paper]; const base = SIZES[state.paper].scale;
    const key = [state.paper, state.model, [...visibleKeys()].sort().join(','), chosenProps().map(p => p.slot + p.id).join(',')].join('|');
    if (layoutCache.has(key)) return layoutCache.get(key);
    const run = f => pack(pieceGeometry(base * f), W - 2 * MARGIN, H - 2 * MARGIN - FOOTER);
    let fit = 1, pages = run(1);
    if (pages.length > 1 || pages.some(p => p.items.some(i => i.tooBig))) {
      // shrink in small steps until everything is on one sheet
      for (let f = 0.97; f >= MIN_FIT - 1e-9; f -= 0.03) { const p = run(f); if (p.length === 1 && !p[0].items.some(i => i.tooBig)) { pages = p; fit = f; break; } }
    }
    const out = { W, H, scale: base * fit, fit, pages };
    layoutCache.set(key, out); return out;
  }
  // piece coordinates (mm) -> page coordinates (mm) for one placed item
  function itemTransform(it) {
    const m = it.m, ox = MARGIN + it.X * RES + m.pad * RES - m.mx, oy = MARGIN + it.Y * RES + m.pad * RES - m.my;
    return ([x, y]) => [x * m.c - y * m.s + ox, x * m.s + y * m.c + oy];
  }

  const sampleCache = new Map();
  // colour of a face whose UVs collapse to a line: the most common colour along that line
  function majorityColor(i, U) {
    const n = {}; let best = null;
    for (let k = 0; k < U.length; k++) for (const t of [0.15, 0.35, 0.5, 0.65, 0.85]) {
      const a = U[k], b = U[(k + 1) % U.length]; const c = sampleColor(i, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
      if (!c) continue; n[c] = (n[c] || 0) + 1; if (!best || n[c] > n[best]) best = c;
    }
    return best;
  }
  function sampleColor(i, u, v) {
    const k = i + ':' + (u | 0) + ':' + (v | 0); if (sampleCache.has(k)) return sampleCache.get(k);
    const d = tex[i].getContext('2d', { willReadFrequently: false }).getImageData(Math.min(TS - 1, Math.max(0, u | 0)), Math.min(TS - 1, Math.max(0, v | 0)), 1, 1).data;
    const c = d[3] < 128 ? null : `rgb(${d[0]},${d[1]},${d[2]})`; sampleCache.set(k, c); return c;
  }
  function affine(s, d) {
    const [[u0, v0], [u1, v1], [u2, v2]] = s, [[x0, y0], [x1, y1], [x2, y2]] = d;
    const det = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0); if (Math.abs(det) < 4) return null;
    const a = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / det, c = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / det;
    const b = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / det, dd = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / det;
    return [a, b, c, dd, x0 - a * u0 - c * v0, y0 - b * u0 - dd * v0];
  }
  // One affine map (texture pixels -> sheet pixels) for a whole face, or null if the face is not flat in UV.
  function faceAffine(U, P) {
    let M = null;
    for (let k = 1; k < P.length - 1 && !M; k++) M = affine([U[0], U[k], U[k + 1]], [P[0], P[k], P[k + 1]]);
    if (!M) return null;
    for (let k = 0; k < P.length; k++) {
      const x = M[0] * U[k][0] + M[2] * U[k][1] + M[4], y = M[1] * U[k][0] + M[3] * U[k][1] + M[5];
      if (Math.hypot(x - P[k][0], y - P[k][1]) > 1.5) return null;
    }
    return M;
  }
  function drawTexturedTriangle(ctx, img, ti, s, d) {
    const [[u0, v0], [u1, v1], [u2, v2]] = s, [[x0, y0], [x1, y1], [x2, y2]] = d;
    const det = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
    const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3;
    ctx.save(); ctx.beginPath();
    for (const [x, y] of d) { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1, e = 0.9 / l; ctx.lineTo(x + dx * e, y + dy * e); }
    ctx.closePath(); ctx.clip();
    if (Math.abs(det) < 4) {   // degenerate UVs: the face is one flat colour
      const c = sampleColor(ti, (u0 + u1 + u2) / 3, (v0 + v1 + v2) / 3); if (c) { ctx.fillStyle = c; ctx.fill(); }
    } else {
      const a = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / det, c = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / det;
      const b = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / det, dd = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / det;
      const e = x0 - a * u0 - c * v0, f = y0 - b * u0 - dd * v0;
      ctx.transform(a, b, c, dd, e, f); ctx.drawImage(img, 0, 0);
    }
    ctx.restore();
  }
  function renderPage(canvas, sheet, pageIndex, pxmm) {
    const { W, H } = sheet; canvas.width = Math.round(W * pxmm); canvas.height = Math.round(H * pxmm);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const page = sheet.pages[pageIndex]; if (!page) return;
    for (const it of page.items) {
      const pc = it.pc; const IT = itemTransform(it);
      const T = q => { const [x, y] = IT(q); return [x * pxmm, y * pxmm]; };
      if (pc.prop) {   // a hand-held picture: drawn as it is, its own outline is the cut line
        const img = propImage(pc.prop); if (!img.complete || !img.naturalWidth) continue;
        const [a, b, c] = [[0, 0], [pc.w, 0], [0, pc.h]].map(T), iw = img.naturalWidth, ih = img.naturalHeight;
        ctx.save(); ctx.transform((b[0] - a[0]) / iw, (b[1] - a[1]) / iw, (c[0] - a[0]) / ih, (c[1] - a[1]) / ih, a[0], a[1]);
        ctx.drawImage(img, 0, 0, iw, ih); ctx.restore(); continue;
      }
      // glue tabs (under the faces)
      ctx.lineJoin = 'round';
      for (const tb of pc.tabs) {
        ctx.beginPath(); tb.map(T).forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = '#1d1712'; ctx.lineWidth = 0.22 * pxmm; ctx.setLineDash([]); ctx.stroke();
      }
      // textured faces
      // faces that share one flat texture mapping are drawn through a single clip, so no seams show
      const groups = new Map();
      for (const { f, pts } of pc.faces) {
        const P = pts.map(T);
        const U = []; for (let k = 0; k < f.uv.length; k += 2) U.push([f.uv[k] * TS, f.uv[k + 1] * TS]);
        const M = faceAffine(U, P);
        if (!M) {
          let area = 0; for (let k = 0; k < U.length; k++) { const a = U[k], b = U[(k + 1) % U.length]; area += a[0] * b[1] - b[0] * a[1]; }
          if (Math.abs(area) < 8) {   // the face uses a single texture colour: fill it in one go
            const c = majorityColor(f.m, U);
            if (c) { ctx.beginPath(); P.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 1.2; ctx.fill(); ctx.stroke(); }
          } else for (let k = 1; k < P.length - 1; k++) drawTexturedTriangle(ctx, tex[f.m], f.m, [U[0], U[k], U[k + 1]], [P[0], P[k], P[k + 1]]);
          continue;
        }
        let g = null;
        for (const gg of groups.values()) if (gg.m === f.m && gg.M.every((v, i) => Math.abs(v - M[i]) < (i < 4 ? 2e-3 * Math.abs(gg.M[0] || 1) + 1e-4 : 1.0))) { g = gg; break; }
        if (!g) { g = { m: f.m, M, polys: [] }; groups.set(groups.size, g); }
        g.polys.push(P);
      }
      for (const g of groups.values()) {
        ctx.save(); ctx.beginPath();
        for (const P of g.polys) {
          const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cy = P.reduce((s, p) => s + p[1], 0) / P.length;
          P.forEach(([x, y], k) => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1, e = 0.8 / l; k ? ctx.lineTo(x + dx * e, y + dy * e) : ctx.moveTo(x + dx * e, y + dy * e); });
          ctx.closePath();
        }
        ctx.clip(); ctx.transform(...g.M); ctx.drawImage(tex[g.m], 0, 0); ctx.restore();
      }
      // fold lines (dashed) then cut lines (solid)
      const seg = s => { const a = T([s[0], s[1]]), b = T([s[2], s[3]]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
      ctx.strokeStyle = '#3a3340'; ctx.lineWidth = 0.2 * pxmm;
      for (const l of pc.lines) if (l.t !== 'cut') {
        ctx.setLineDash(l.t === 'valley' ? [2 * pxmm, 1 * pxmm, 0.5 * pxmm, 1 * pxmm] : [1.4 * pxmm, 1 * pxmm]); seg(l.s); }
      for (const tb of pc.tabs) { ctx.setLineDash([1.4 * pxmm, 1 * pxmm]); seg([tb[0][0], tb[0][1], tb[3][0], tb[3][1]]); }
      ctx.setLineDash([]); ctx.strokeStyle = '#1d1712'; ctx.lineWidth = 0.25 * pxmm;
      for (const l of pc.lines) if (l.t === 'cut') seg(l.s);
    }
    // footer: legend + credit
    ctx.setLineDash([]); ctx.fillStyle = '#4a4452'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.font = `${2.4 * pxmm}px "Nunito Sans", system-ui, sans-serif`;
    const fy = (H - MARGIN - FOOTER / 2) * pxmm, fx = MARGIN * pxmm;
    ctx.strokeStyle = '#1d1712'; ctx.lineWidth = 0.25 * pxmm;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 6 * pxmm, fy); ctx.stroke();
    ctx.fillText('recortar', fx + 7.5 * pxmm, fy);
    ctx.setLineDash([1.4 * pxmm, 1 * pxmm]); ctx.beginPath(); ctx.moveTo(fx + 22 * pxmm, fy); ctx.lineTo(fx + 28 * pxmm, fy); ctx.stroke();
    ctx.fillText('dobrar', fx + 29.5 * pxmm, fy); ctx.setLineDash([]);
    ctx.textAlign = 'right';
    const pages = sheet.pages.length > 1 ? `  ·  folha ${pageIndex + 1}/${sheet.pages.length}` : '';
    let right = (W - MARGIN) * pxmm;
    if (ccImg && ccImg.complete && ccImg.naturalWidth) {
      const bh = 4.2 * pxmm, bw = bh * ccImg.naturalWidth / ccImg.naturalHeight;
      ctx.drawImage(ccImg, right - bw, fy - bh / 2, bw, bh); right -= bw + 2 * pxmm;
    }
    // the credit line shrinks to fit between the legend and the badge
    const credit = ((state.name || '').trim() ? state.name.trim() + '  ·  ' : '') + CREDIT + pages;
    const room = right - (fx + 44 * pxmm);
    let fs = 2.4 * pxmm;
    for (let i = 0; i < 6 && ctx.measureText(credit).width > room; i++) {
      fs *= Math.max(0.5, room / ctx.measureText(credit).width) * 0.98;
      ctx.font = `${fs}px "Nunito Sans", system-ui, sans-serif`;
    }
    ctx.fillText(credit, right, fy, room);
  }

  let sheetTimer = 0, currentPage = 0;
  function scheduleSheet() { clearTimeout(sheetTimer); sheetTimer = setTimeout(drawSheetPreview, 120); }
  function drawSheetPreview() {
    const sheet = layoutSheet();
    currentPage = Math.min(currentPage, sheet.pages.length - 1);
    const cv = document.getElementById('sheet');
    renderPage(cv, sheet, currentPage, 4);
    // the footer only shows the pages (arrows off with one sheet); a warning appears only if a piece doesn't fit
    document.getElementById('pageLabel').textContent = `Folha ${currentPage + 1} de ${sheet.pages.length}`;
    document.getElementById('prevPage').disabled = currentPage <= 0;
    document.getElementById('nextPage').disabled = currentPage >= sheet.pages.length - 1;
    const big = sheet.pages.some(p => p.items.some(i => i.tooBig)), note = document.getElementById('sheetNote');
    note.hidden = !big; note.textContent = big ? 'Uma peça não cabe neste papel.' : '';
  }

  /* ---------------- export ---------------- */
  const DPI = 300, PXMM = DPI / 25.4;
  // Inside a claude.ai Artifact, files go through the viewer's "downloads" capability; anywhere else, a normal download.
  let dl = null;
  if (window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then(d => { dl = d; }).catch(() => {});
  async function saveBlob(blob, name) {
    if (dl) { try { await dl.save({ filename: name, data: blob }); } catch (e) { if (e && e.code !== 'declined') toast('Não foi possível salvar o arquivo aqui.'); } return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  const fileBase = () => 'cientista-' + ((state.name || 'boneca').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'boneca');
  async function exportPDF(btn) {
    if (!window.jspdf) { toast('O PDF precisa de internet para carregar. Use "Imagem PNG".'); return; }
    busy(btn, true);
    try {
      await settle(); const sheet = layoutSheet();
      const doc = new window.jspdf.jsPDF({ unit: 'mm', format: state.paper.toLowerCase(), orientation: 'portrait', compress: true });
      const cv = document.createElement('canvas');
      for (let i = 0; i < sheet.pages.length; i++) {
        if (i) doc.addPage(state.paper.toLowerCase(), 'portrait');
        renderPage(cv, sheet, i, PXMM);
        doc.addImage(cv.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, sheet.W, sheet.H, undefined, 'FAST');
      }
      await saveBlob(doc.output('blob'), fileBase() + '-' + state.paper + '.pdf');
      placarCount();
      toast('PDF pronto. Imprima em tamanho real (100%, sem "ajustar à página").');
    } catch (e) { console.error(e); toast('Não foi possível criar o PDF: ' + e.message); }
    busy(btn, false);
  }
  async function exportPNG(btn) {
    busy(btn, true);
    try {
      await settle(); const sheet = layoutSheet(); const cv = document.createElement('canvas');
      for (let i = 0; i < sheet.pages.length; i++) {
        renderPage(cv, sheet, i, PXMM);
        const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
        await saveBlob(blob, `${fileBase()}-${state.paper}${sheet.pages.length > 1 ? '-folha' + (i + 1) : ''}.png`);
      }
      toast('Imagem em 300 dpi pronta para imprimir.');
    } catch (e) { console.error(e); toast('Não foi possível criar a imagem: ' + e.message); }
    busy(btn, false);
  }
  const settle = async () => { while (composing || (composeQueued && composeQueued.size)) await new Promise(r => setTimeout(r, 50)); };
  function busy(btn, on) { btn.disabled = on; btn.dataset.busy = on ? '1' : ''; }
  let toastTimer = 0;
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 5000); }

  /* ---------------- UI ---------------- */
  function el(tag, attrs, ...kids) { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs || {})) { if (k === 'on') Object.entries(v).forEach(([ev, fn]) => e.addEventListener(ev, fn)); else if (v !== undefined && v !== null) e.setAttribute(k, v); } kids.flat().forEach(k => e.append(k)); return e; }

  // One row per slot: "Label  < option >  [colour]". The arrows step through the options,
  // the colour buttons open the colour wheel right under the row.
  const openSecs = {};   // which menu sections are open (all start closed)
  function buildOptions() {
    // sections go in two columns: accessories next to the print settings, the rest in the middle
    // the colour picker may be open inside the menu: take it out before the menu is rebuilt
    const picker = document.getElementById('picker'); picker.hidden = true; document.body.append(picker);
    const host = document.getElementById('options'); host.innerHTML = ''; sideSyncs.length = 0;
    const sections = [...new Set(CAT.slots.map(s => s.section || s.label))];
    for (const sec of sections) {
      const inSec = CAT.slots.filter(s => (s.section || s.label) === sec);
      // each section folds open / closed with its title button, like the Molde panel: every section
      // starts closed when the page opens (and stays as the user left it while the page is open)
      const open = !!openSecs[sec];
      const body = el('div', { class: 'sec-body', id: 'sec-' + sec.normalize('NFD').replace(/[^a-z]/gi, '').toLowerCase() });
      const act = el('span', { class: 'sec-act' }, el('span', { class: 'sec-act-label' }, open ? 'Esconder' : 'Mostrar'), el('span', { class: 'chev', 'aria-hidden': 'true' }, '▾'));
      const head = el('button', { type: 'button', class: 'sec-toggle', 'aria-expanded': String(open), 'aria-controls': body.id,
        on: { click: () => { const o = head.getAttribute('aria-expanded') !== 'true'; head.setAttribute('aria-expanded', String(o)); body.hidden = !o;
          act.firstChild.textContent = o ? 'Esconder' : 'Mostrar'; openSecs[sec] = o; } } }, el('h2', {}, sec), act);
      body.hidden = !open;
      const box = el('section', { class: 'group' }, head, body);
      for (const slot of inSec) {
        const row = el('div', { class: 'row', id: 'row-' + slot.id });
        row.append(el('span', { class: 'row-label' }, slot.label));
        if (slot.options && slot.options.length) {
          const opts = slot.options, idx = () => Math.max(0, opts.findIndex(o => o.id === state.choices[slot.id]));
          const name = el('span', { class: 'opt-name', 'aria-live': 'polite', id: 'name-' + slot.id });
          // worksIf: [{ slot: [ids] }, ...] - the option only shows on the doll with one of these sets (the
          // choker needs an open neckline): otherwise its name is greyed with a short note
          // blocked options (a hat rules out big hair) are greyed the same way, and the arrows skip greyed options
          const works = o => (!o.worksIf || o.worksIf.some(c => Object.entries(c).every(([sl, ids]) => ids.includes(state.choices[sl])))) && !blocker(slot.id, o.id);
          const note = o => { const b = blocker(slot.id, o.id); return b ? (b.blockNote || '') : (o.worksNote || ''); };
          let show = () => { const i = idx(), ok = works(opts[i]); name.textContent = opts[i].label; name.classList.toggle('off', !ok);
            name.title = ok ? '' : note(opts[i]); name.append(el('small', {}, ok ? `${i + 1}/${opts.length}` : note(opts[i]))); };
          sideSyncs.push(show);
          // pickColors: { colourId: value } is applied when that option is picked in the menu (the overcoat starts grey)
          const pick = o => { if (!works(o)) return; state.choices[slot.id] = o.id;
            for (const [cid, v] of Object.entries(o.pickColors || {})) { state.colors[cid] = v; document.querySelectorAll(`[data-dot="${cid}"]`).forEach(e => { e.style.background = v; }); }
            const moved = fixBlocked(); if (moved.length) toast(`${o.label}: trocado ${moved.join(', ')}`);
            save(); show(); sideSyncs.forEach(f => f()); refresh(); };
          const step = d => { let j = idx();
            for (let k = 0; k < opts.length; k++) { j = (j + d + opts.length) % opts.length; if (works(opts[j])) break; }
            pick(opts[j]); };
          row.append(el('div', { class: 'stepper' },
            el('button', { type: 'button', class: 'arrow', id: `prev-${slot.id}`, 'aria-label': `${slot.label}: anterior`, on: { click: () => step(-1) } }, '‹'),
            name,
            el('button', { type: 'button', class: 'arrow', id: `next-${slot.id}`, 'aria-label': `${slot.label}: próximo`, on: { click: () => step(1) } }, '›')));
          // display setting 'Lista': the same row as a drop-down list (greyed options can't be picked)
          const list = el('select', { class: 'opt-select', id: 'list-' + slot.id, 'aria-label': slot.label },
            opts.map(o => el('option', { value: o.id }, o.label)));
          list.addEventListener('change', () => { const o = opts.find(x => x.id === list.value); if (o && works(o)) pick(o); else show(); });
          row.append(list);
          const show0 = show;
          show = () => { show0(); list.value = opts[idx()].id;
            for (const op of list.options) { const o = opts.find(x => x.id === op.value), ok = works(o); op.disabled = !ok && o.id !== list.value;
              op.textContent = o.label + (ok ? '' : ` (${note(o).toLowerCase()})`); } };
          sideSyncs[sideSyncs.length - 1] = show;
          show();
        } else if (slot.uniforms) {
          // Uniforme: a drop-down; picking one sets the clothes and accessories rows (and their colours) for it
          // 'Escolher…' is only a placeholder (not in the list); the chosen uniform's name stays, with a * once something changes
          const sel = el('select', { class: 'uniform-select', id: 'uniformSelect', 'aria-label': slot.label },
            el('option', { value: '', disabled: '', hidden: '' }, 'Escolher…'), slot.uniforms.map(u => el('option', { value: u.id }, u.label)));
          uniMark = () => { const cur = state.uniform && slot.uniforms.some(u => u.id === state.uniform.id) ? state.uniform : null;
            sel.value = cur ? cur.id : ''; const changed = cur && cur.fp !== uniFP();
            for (const o of sel.options) { const u = slot.uniforms.find(x => x.id === o.value); if (u) o.textContent = u.label + (changed && u.id === cur.id ? ' *' : ''); }
            sel.title = changed ? 'Você mudou alguma peça deste uniforme' : ''; };
          uniMark();
          sel.addEventListener('change', () => {
            const u = slot.uniforms.find(x => x.id === sel.value); if (!u) return;
            const R = slot.uniformReset;
            const mouthWasMask = /^mascara/.test(state.choices.mouth || ''), gogglesOn = state.choices.glasses === 'protecao';
            Object.assign(state.choices, R.choices, u.choices);
            if (mouthWasMask && !u.choices.mouth) state.choices.mouth = 'original';
            if (gogglesOn && !u.choices.glasses) state.choices.glasses = 'nenhum';   // safety goggles come and go with the uniform
            state.toggles = state.toggles || {}; for (const t of R.toggles) state.toggles[t] = false; for (const t of u.toggles) state.toggles[t] = true;
            Object.assign(state.colors, u.colors);
            fixBlocked();
            if (state.grad) delete state.grad.shirt;
            state.uniform = { id: u.id, fp: uniFP() };
            save(); init.again(); state.uniform.fp = uniFP(); save(); toast(`Uniforme "${u.label}" aplicado. Dá para mudar cada peça depois.`);
          });
          row.append(sel);
        } else row.append(el('span', { class: 'stepper empty' }));
        row.append(el('div', { class: 'cbtns' }, slot.colors && slot.colors.length ? colorButton(slot.colors, row) : ''));
        body.append(row);
        // showIf: { slot: [option ids] } - the row only shows together with those options
        // greyOut: instead of disappearing (which moves the rows under it) the row stays, greyed and locked
        if (slot.showIf) { const f = () => { const ok = Object.entries(slot.showIf).every(([sl, ids]) => ids.includes(state.choices[sl]));
          if (slot.greyOut) { row.classList.toggle('off', !ok); row.inert = !ok; row.title = ok ? '' : (slot.greyNote || ''); } else row.hidden = !ok; }; sideSyncs.push(f); f(); }
        if (slot.sides) body.append(sideTags(slot));
        if (slot.toggles || slot.slider) body.append(rowExtras(slot));
        // a whole row blocked ('*': the astronaut's helmet covers the hair): greyed and locked, with what is under it
        if (CAT.slots.some(s => (s.options || []).some(o => o.blocks && o.blocks[slot.id] === '*'))) {
          const f = () => { const b = blocker(slot.id, '\u0000'), extras = document.getElementById('extras-' + slot.id);
            row.classList.toggle('off', !!b); row.inert = !!b; row.title = b ? (b.blockNote || '') : '';
            if (extras) { extras.classList.toggle('off', !!b); extras.inert = !!b; } };
          sideSyncs.push(f); f(); }
      }
      host.append(box);
    }
    document.querySelectorAll('[data-color-slot]').forEach(h => { h.innerHTML = ''; h.append(colorButton([h.dataset.colorSlot], h.closest('.group') || h)); });
  }
  // one colour button per row; a row with several colours (shirt, sleeves, print) gets tabs in the picker
  // which side for one-side items (earrings, piercings): a small tag under the row
  const SIDES = [['esq', 'Esquerda'], ['dir', 'Direita'], ['ambos', 'Os dois']];
  function sideTags(slot) {
    const wrap = el('div', { class: 'sides', role: 'radiogroup', 'aria-label': `${slot.label}: lado`, id: 'sides-' + slot.id });
    // with nothing chosen the tags stay in place, invisible, so the rows under them don't move
    const sync = () => { const none = state.choices[slot.id] === slot.options[0].id; wrap.classList.toggle('empty', none); wrap.inert = none;
      wrap.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.side === sideOf(slot)))); };
    wrap.append(el('span', { class: 'sides-label' }, 'Lado:'));
    for (const [id, label] of SIDES.filter(([id]) => !(slot.noBoth && id === 'ambos'))) wrap.append(el('button', { type: 'button', class: 'sidetag', role: 'radio', 'data-side': id, id: `side-${slot.id}-${id}`,
      on: { click: () => { state.sides = state.sides || {}; state.sides[slot.id] = id; save(); sync(); refresh(); } } }, label));
    sync(); sideSyncs.push(sync); return wrap;
  }
  const sideSyncs = [];
  // on/off tags (eyelashes...) and a size slider (shirt print) under a row
  function rowExtras(slot) {
    const wrap = el('div', { class: 'sides extras', id: 'extras-' + slot.id }); const syncs = [];
    for (const t of slot.toggles || []) {
      const b = el('button', { type: 'button', class: 'sidetag', role: 'switch', id: `toggle-${t.id}`,
        on: { click: () => { state.toggles = state.toggles || {}; state.toggles[t.id] = !state.toggles[t.id]; save(); sync(); refresh(); } } }, t.label);
      syncs.push(() => { b.setAttribute('aria-checked', String(!!(state.toggles || {})[t.id])); b.hidden = (!!t.showOn && !t.showOn.includes(state.choices[slot.id])) || (!!t.ifGrad && !gradOn(t.ifGrad)); });
      wrap.append(b);
    }
    if (slot.slider) {
      const sl = slot.slider; const out = el('span', { class: 'sides-label' });
      const input = el('input', { type: 'range', min: sl.min, max: sl.max, step: 5, id: 'slider-' + sl.id, 'aria-label': `${slot.label}: ${sl.label}` });
      input.addEventListener('input', () => { state.scales = state.scales || {}; state.scales[sl.id] = +input.value; out.textContent = input.value + '%'; save(); refresh(); });
      const box = el('label', { class: 'slider' }, el('span', { class: 'sides-label' }, sl.label), input, out);
      syncs.push(() => { const v = (state.scales || {})[sl.id] ?? sl.max; input.value = v; out.textContent = v + '%'; box.hidden = (sl.hideOn || []).includes(state.choices[slot.id]); });
      wrap.append(box);
    }
    // no switch for this option: the line stays, invisible, so the rows under it don't move up and down
    const sync = () => { syncs.forEach(f => f()); const none = [...wrap.children].every(c => c.hidden); wrap.classList.toggle('empty', none); wrap.inert = none; };
    sync(); sideSyncs.push(sync); return wrap;
  }
  // a colour's name can depend on the choices: labelIf: [{ if: { slot: [ids] }, label }] (e.g. the cocar's feathers)
  const colorLabel = m => { const r = (m.labelIf || []).find(c => Object.entries(c.if).every(([sl, ids]) => ids.includes(state.choices[sl]))); return r ? r.label : m.label; };
  function colorButton(ids, anchor) {
    const metas = ids.map(id => CAT.colors.find(c => c.id === id)).filter(Boolean); if (!metas.length) return '';
    const label = metas.map(colorLabel).join(', ');
    const dots = el('span', { class: 'dots' }, metas.map(m => el('span', { class: 'dot', 'data-dot': m.id, style: `background:${state.colors[m.id]}` })));
    return el('button', { type: 'button', class: 'cbtn' + (metas.length > 1 ? ' multi' : ''), id: 'col-' + metas[0].id, 'data-colors': ids.join(' '), title: 'Cor: ' + label, 'aria-label': 'Cor: ' + label, 'aria-expanded': 'false',
      on: { click: e => togglePicker(metas.map(m => m.id), anchor, e.currentTarget) } }, dots);
  }
  let pickerIds = [];
  function togglePicker(ids, anchor, btn) {
    const picker = document.getElementById('picker');
    const open = !picker.hidden && btn.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.cbtn').forEach(b => b.setAttribute('aria-expanded', 'false'));
    if (open) { picker.hidden = true; return; }
    pickerIds = ids; state.colorTarget = ids[0]; save();
    if (anchor.classList.contains('row')) anchor.after(picker); else anchor.append(picker);
    picker.hidden = false; btn.setAttribute('aria-expanded', 'true'); syncWheel();
  }

  /* colour wheel: hue = angle, saturation = distance from centre, brightness = slider */
  const wheel = { h: 0, s: 0, v: 1 };
  function buildColors() {
    if (!CAT.colors.some(c => c.id === state.colorTarget)) state.colorTarget = 'skin';
    drawWheelBase();
    const cv = document.getElementById('wheel');
    if (cv.dataset.wired) { syncWheel(); return; } cv.dataset.wired = '1';
    document.getElementById('pickerClose').addEventListener('click', () => { document.getElementById('picker').hidden = true; document.querySelectorAll('.cbtn').forEach(b => b.setAttribute('aria-expanded', 'false')); });
    let dragging = false;
    const pick = e => { const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 2 - 1, y = (e.clientY - r.top) / r.height * 2 - 1;
      wheel.h = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; wheel.s = Math.min(1, Math.hypot(x, y)); setFromWheel(); };
    cv.addEventListener('pointerdown', e => { dragging = true; cv.setPointerCapture(e.pointerId); pick(e); });
    cv.addEventListener('pointermove', e => { if (dragging) pick(e); });
    cv.addEventListener('pointerup', () => dragging = false);
    cv.addEventListener('keydown', e => { const k = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, 0.05], ArrowDown: [0, -0.05] }[e.key];
      if (k) { e.preventDefault(); wheel.h = (wheel.h + k[0] + 360) % 360; wheel.s = Math.max(0, Math.min(1, wheel.s + k[1])); setFromWheel(); } });
    document.getElementById('bright').addEventListener('input', e => { wheel.v = e.target.value / 100; setFromWheel(); });
    document.getElementById('hex').addEventListener('change', e => { const v = e.target.value.trim(); if (/^#?[0-9a-f]{6}$/i.test(v)) setColor(v.startsWith('#') ? v : '#' + v, true); else syncWheel(); });
    syncWheel();
  }
  function drawWheelBase() {
    const cv = document.getElementById('wheel'), N = cv.width, ctx = cv.getContext('2d'); const img = ctx.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x / N * 2 - 1, dy = y / N * 2 - 1, r = Math.hypot(dx, dy), o = (y * N + x) * 4;
      if (r > 1) { img.data[o + 3] = 0; continue; }
      const [R, G, B] = hsv2rgb((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, r, wheel.v);
      img.data[o] = R; img.data[o + 1] = G; img.data[o + 2] = B; img.data[o + 3] = r > 0.985 ? (1 - r) / 0.015 * 255 : 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  function placeKnob() {
    const k = document.getElementById('knob'); const a = wheel.h * Math.PI / 180;
    k.style.left = (50 + Math.cos(a) * wheel.s * 50) + '%'; k.style.top = (50 + Math.sin(a) * wheel.s * 50) + '%';
    k.style.background = state.colors[state.colorTarget];
  }
  function syncWheel() {
    const metaId0 = state.colorTarget, c = state.colors[state.colorTarget]; [wheel.h, wheel.s, wheel.v] = rgb2hsv(hex2rgb(c));
    document.getElementById('bright').value = Math.round(wheel.v * 100);
    document.getElementById('hex').value = c;
    const title = document.getElementById('wheelTitle'); title.innerHTML = '';
    // with Degradê on, the second colour gets its own tab right after the first one
    const tabs = pickerIds.flatMap(id => gradOn(id) ? [id, GRAD[id]] : [id]);
    if (tabs.length && !tabs.includes(state.colorTarget)) state.colorTarget = tabs[0];
    syncGradBar();
    if (tabs.length > 1) tabs.forEach(id => { const m = CAT.colors.find(c => c.id === id);
      title.append(el('button', { type: 'button', class: 'chip tab', 'aria-pressed': String(id === state.colorTarget), on: { click: () => { state.colorTarget = id; save(); syncWheel(); } } },
        el('span', { class: 'dot', 'data-dot': id, style: `background:${state.colors[id]}` }), colorLabel(m))); });
    else title.textContent = colorLabel(CAT.colors.find(x => x.id === state.colorTarget));
    const meta = CAT.colors.find(x => x.id === state.colorTarget);
    if (meta.id !== metaId0) { const c2 = state.colors[meta.id]; [wheel.h, wheel.s, wheel.v] = rgb2hsv(hex2rgb(c2)); document.getElementById('bright').value = Math.round(wheel.v * 100); document.getElementById('hex').value = c2; }
    const sw = document.getElementById('swatches'); sw.innerHTML = '';
    for (const s of meta.swatches || []) sw.append(el('button', { type: 'button', class: 'swatch', title: s, 'aria-label': `${colorLabel(meta)} ${s}`, style: `background:${s}`, on: { click: () => setColor(s, true) } }));
    drawWheelBase(); placeKnob();
  }
  // Degradê bar inside the colour picker (hair and shirt): a switch and four arrows for the direction
  const GRAD_UI = [['baixo', '↓', 'De cima para baixo'], ['cima', '↑', 'De baixo para cima'], ['direita', '→', 'Da esquerda para a direita'], ['esquerda', '←', 'Da direita para a esquerda']];
  function syncGradBar() {
    let bar = document.getElementById('gradBar');
    if (!bar) { bar = el('div', { id: 'gradBar', class: 'gradbar' }); document.querySelector('#picker .picker-head').after(bar); }
    const base = pickerIds.find(id => GRAD[id]); bar.innerHTML = ''; bar.hidden = !base; if (!base) return;
    const on = gradOn(base);
    // looks like the colour tabs above it (a round swatch and a word), the swatch a plain black-to-yellow ramp
    bar.append(el('button', { type: 'button', class: 'chip tab gradtab', role: 'switch', id: 'grad-' + base, 'aria-checked': String(on), title: 'Degradê: duas cores',
      on: { click: () => { state.grad = state.grad || {}; state.grad[base] = on ? '' : 'baixo'; if (!on && base === 'shirt') { state.toggles = state.toggles || {}; state.toggles.mangadegrade = true; } if (!on) state.colorTarget = GRAD[base]; else if (state.colorTarget === GRAD[base]) state.colorTarget = base;
        save(); syncWheel(); sideSyncs.forEach(f => f()); refresh(); } } }, el('span', { class: 'dot gradDot', 'aria-hidden': 'true' }), 'Degradê'));
    if (on) for (const [d, arrow, label] of GRAD_UI) bar.append(el('button', { type: 'button', class: 'sidetag arrowtag', role: 'radio', id: `grad-${base}-${d}`, title: label, 'aria-label': label,
      'aria-checked': String(state.grad[base] === d), on: { click: () => { state.grad[base] = d; save(); syncGradBar(); refresh(); } } }, arrow));
  }
  let lastV = -1;
  function setFromWheel() {
    setColor(rgb2hex(hsv2rgb(wheel.h, wheel.s, wheel.v)), false);
    if (Math.abs(lastV - wheel.v) > 0.02) { lastV = wheel.v; drawWheelBase(); }
  }
  function setColor(hex, resync) {
    const id = state.colorTarget; state.colors[id] = hex.toLowerCase(); save();
    document.querySelectorAll(`[data-dot="${id}"]`).forEach(d => { d.style.background = hex; });
    document.getElementById('hex').value = hex;
    if (resync) syncWheel(); else placeKnob();
    if (id === 'fundo') { if (init.paintBg) init.paintBg(); return; }
    refresh(id);
  }

  function init() {
    buildOptions(); buildColors();
    const name = document.getElementById('name'); name.value = state.name;
    name.addEventListener('input', () => { state.name = name.value.slice(0, 48); save(); refresh('name'); });
    const nf = document.getElementById('nameFont');
    nf.innerHTML = ''; (CAT.nameFonts || []).forEach(f => nf.append(el('option', { value: f.id }, f.label))); nf.value = state.nameFont;
    nf.addEventListener('change', () => { state.nameFont = nf.value; save(); refresh('name'); });
    const ns = document.getElementById('nameSize'); ns.value = state.nameSize;
    ns.addEventListener('input', () => { state.nameSize = +ns.value; save(); refresh('name'); });
    const md = document.getElementById('model'); md.innerHTML = '';
    for (const [id, label] of Object.entries(MODELS)) md.append(el('option', { value: id }, label));
    if (!MODELS[state.model]) state.model = 'completo';
    for (const id of ['paper', 'model']) {
      const s = document.getElementById(id); s.value = state[id];
      s.addEventListener('change', () => { state[id] = s.value; save(); currentPage = 0; scheduleSheet(); });
    }
    document.getElementById('prevPage').addEventListener('click', () => { currentPage = Math.max(0, currentPage - 1); drawSheetPreview(); });
    document.getElementById('nextPage').addEventListener('click', () => { currentPage++; drawSheetPreview(); });
    document.getElementById('pdf').addEventListener('click', e => exportPDF(e.currentTarget));
    // "sobre" box (credits and licence)
    const about = document.getElementById('about');
    document.getElementById('aboutBtn').addEventListener('click', () => { if (about.showModal) about.showModal(); else about.setAttribute('open', ''); });
    document.getElementById('aboutClose').addEventListener('click', () => { if (about.close) about.close(); else about.removeAttribute('open'); });
    // background behind the 3D doll only (the printed sheet is not affected): preset squares (light grey first)
    // and a colour circle for any colour, like the other colour buttons
    const bgBox = document.getElementById('bg3d'), v3 = document.getElementById('view3d');
    const BGS = [['#ececec', 'Cinza clarinho'], ['#ffffff', 'Branco'], ['#f0a3a0', 'Vermelho claro'], ['#9cc7e6', 'Azul']];
    const paintBg = () => { const c = state.colors.fundo || '#ececec'; v3.style.background = c;
      document.querySelectorAll('[data-dot="fundo"]').forEach(d => { d.style.background = c; });
      bgBox.querySelectorAll('button[data-bg]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.bg === c))); };
    BGS.forEach(([hex, label]) => { const b = el('button', { type: 'button', role: 'radio', title: label, 'aria-label': label, 'data-bg': hex });
      b.style.background = hex; b.addEventListener('click', () => { state.colors.fundo = hex; save();
        document.querySelectorAll('[data-dot="fundo"]').forEach(d => { d.style.background = hex; }); if (state.colorTarget === 'fundo') syncWheel(); paintBg(); }); bgBox.append(b); });
    bgBox.append(colorButton(['fundo'], document.querySelector('.view.d3')));
    paintBg(); init.paintBg = paintBg;
    // QR code on the stand: a switch opens the link field and the colour button
    const qrUrl = document.getElementById('qrUrl');
    const syncQr = () => { qrUrl.value = state.qr || ''; };
    let qrTimer = null;
    qrUrl.addEventListener('input', () => { state.qr = qrUrl.value.slice(0, 300); save(); clearTimeout(qrTimer); qrTimer = setTimeout(() => refresh('base'), 250); });
    syncQr(); init.syncQr = syncQr;
    // feedback window: email, subject and message, sent through the person's own email program
    const fb = document.getElementById('feedback'), fbForm = document.getElementById('feedbackForm');
    const closeFb = () => { if (fb.open && fb.close) fb.close(); else fb.removeAttribute('open'); };
    document.getElementById('feedbackBtn').addEventListener('click', () => { if (fb.showModal) fb.showModal(); else fb.setAttribute('open', ''); });
    document.getElementById('feedbackClose').addEventListener('click', closeFb);
    document.getElementById('feedbackCancel').addEventListener('click', closeFb);
    fb.addEventListener('click', e => { if (e.target === fb) closeFb(); });
    fbForm.addEventListener('submit', async e => {
      e.preventDefault();
      const from = document.getElementById('fbEmail').value.trim(), subject = document.getElementById('fbSubject').value.trim(), msg = document.getElementById('fbMsg').value.trim();
      let code = ''; try { code = await makeCode(); } catch (err) {}
      const body = `${msg}\n\n---\nEmail para resposta: ${from}` + (code ? `\nCódigo da boneca: ${code}` : '');
      const href = 'mailto:uff.mnc@gmail.com?subject=' + encodeURIComponent('[Cientista de Papel] ' + subject) + '&body=' + encodeURIComponent(body);
      const a = el('a', { href, target: '_blank', rel: 'noopener' }); document.body.append(a); a.click(); a.remove();
      closeFb(); fbForm.reset();
      toast('Abrindo o seu email com a mensagem pronta. Se não abrir, escreva para uff.mnc@gmail.com.');
    });
    // folding / assembly video in a small window
    const tut = document.getElementById('tutorial'), tv = document.getElementById('tutorialVideo');
    document.getElementById('tutorialBtn').addEventListener('click', () => {
      if (tut.showModal) tut.showModal(); else tut.setAttribute('open', '');
      tv.currentTime = 0; const pr = tv.play(); if (pr && pr.catch) pr.catch(() => {}); });
    const closeTut = () => { tv.pause(); if (tut.open && tut.close) tut.close(); else tut.removeAttribute('open'); };
    document.getElementById('tutorialClose').addEventListener('click', closeTut);
    tut.addEventListener('close', () => tv.pause());
    tut.addEventListener('click', e => { if (e.target === tut) closeTut(); });
    if (window.DOLL_BRAND) document.getElementById('aboutLogo').src = window.DOLL_BRAND.logo;
    document.getElementById('reset').addEventListener('click', () => { state = defaults(); save(); init.again(); });
    // the sheet preview: closed at start, opened / closed with its title bar (also opened by the Molde tab)
    const sheetToggle = document.getElementById('sheetToggle'), sheetBody = document.getElementById('sheetBody');
    const showSheet = open => { sheetToggle.setAttribute('aria-expanded', String(open)); sheetBody.hidden = !open;
      sheetToggle.querySelector('.eye-label').textContent = open ? 'Esconder' : 'Mostrar'; sheetToggle.setAttribute('aria-label', open ? 'Esconder molde' : 'Mostrar molde'); if (open) scheduleSheet(); };
    sheetToggle.addEventListener('click', () => showSheet(sheetToggle.getAttribute('aria-expanded') !== 'true'));
    document.querySelectorAll('[data-view="sheet"]').forEach(b => b.addEventListener('click', () => showSheet(true)));
    document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
      document.body.dataset.view = b.dataset.view;
      document.querySelectorAll('[data-view]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.view === b.dataset.view))); }));
    // phones: the Molde title bar keeps the Boneca one's height (so the Boneca | Molde buttons stay put)
    const d3head = document.querySelector('.view.d3 .view-head');
    if (d3head && window.ResizeObserver) new ResizeObserver(() => { if (d3head.offsetHeight) document.body.style.setProperty('--vhead', d3head.offsetHeight + 'px'); }).observe(d3head);
    // printing / assembly instructions and the licence, in a small window opened by the (i) beside Baixar PDF
    const pinfo = document.getElementById('printInfo');
    document.getElementById('printInfoBtn').addEventListener('click', () => { if (pinfo.showModal) pinfo.showModal(); else pinfo.setAttribute('open', ''); });
    document.getElementById('printInfoClose').addEventListener('click', () => { if (pinfo.close) pinfo.close(); else pinfo.removeAttribute('open'); });
    pinfo.addEventListener('click', e => { if (e.target === pinfo && pinfo.close) pinfo.close(); });
    // the doll's code: the box always shows the current doll's code (it is refreshed whenever the doll changes).
    // Copiar copies it; Colar empties the box and pastes the copied code; Aplicar builds the doll from the box.
    const codeBox = document.getElementById('dollCode');
    if (codeBox) {
      document.getElementById('codeCopy').addEventListener('click', async () => {
        codeBox.value = await makeCode(); let ok = false;
        try { await navigator.clipboard.writeText(codeBox.value); ok = true; } catch (e) {
          codeBox.focus(); codeBox.select(); try { ok = document.execCommand('copy'); } catch (e2) {} codeBox.blur(); }
        toast(ok ? 'Código copiado. Cole onde quiser para enviar.' : 'Selecione o código e copie (Ctrl+C).'); });
      const apply = async () => {
        try { state = await readCode(codeBox.value); save(); init.again(); codeBox.blur(); scheduleCode(); toast('Pronto: boneca carregada do código.'); }
        catch (e) { toast('Esse código não funcionou. Confira se copiou ele inteiro.'); } };
      document.getElementById('codeApply').addEventListener('click', apply);
      document.getElementById('codePaste').addEventListener('click', async () => {
        codeBox.value = '';
        try { codeBox.value = (await navigator.clipboard.readText()).trim(); }
        catch (e) { codeBox.focus(); toast('Cole o código no campo (Ctrl+V, ou toque e segure) e aperte Aplicar.'); return; }
        toast(codeBox.value ? 'Código colado. Aperte Aplicar para montar a boneca.' : 'Não há nenhum código copiado.'); });
      codeBox.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
      scheduleCode();
    }
    initSettings(); initMusic(); initPlacar(); initConsent();
    initThree(); initPip();
    refresh();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => refresh('name'));
  }
  /* ---------------- page settings (the ⋯ menu) and the music: kept in this browser, apart from the doll ---------------- */
  const UI_KEY = 'cientista-de-papel-ui', UI_DEF = { theme: 'padrao', display: 'setas', text: 'normal', volume: 20, muted: false };
  const ui = (() => { try { return Object.assign({}, UI_DEF, JSON.parse(localStorage.getItem(UI_KEY) || '{}')); } catch (e) { return Object.assign({}, UI_DEF); } })();
  const saveUi = () => { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (e) {} };
  function applyUi() {
    const r = document.documentElement; r.dataset.ui = ui.theme; r.dataset.display = ui.display; r.dataset.text = ui.text;
    const dt = document.getElementById('darkToggle'); if (dt) dt.setAttribute('aria-checked', String(ui.theme === 'escuro'));
    document.querySelectorAll('#moreMenu .submenu').forEach(m => m.querySelectorAll('[role="menuitemradio"]').forEach(b => b.setAttribute('aria-checked', String(ui[m.dataset.setting] === b.dataset.value))));
  }

  /* ---------------- Placar: anonymous counts of the printed dolls ----------------
     Only when "Baixar PDF" makes a PDF. What is sent: paper (A4/A3), model (completo/simples), the option chosen in each
     row, a few colours (a colour that is not one of the ready-made ones goes as "personalizada") and a one-way fingerprint
     of the doll, so the same doll printed twice counts once among the different dolls. Never the doll code, the name on
     the stand or anything about the person. The counter is a Cloudflare Worker (placar/), its address in js/config.js. */
  const CFG = window.CDP_CONFIG || {};
  const PLACAR = String(CFG.placar || '').replace(/\/+$/, '');
  const PL_COLORS = ['skin', 'hair', 'eyes', 'shirt', 'pants', 'coat'];
  const PL_NONE = new Set(['nada', 'nenhum', 'nenhuma', 'nao', 'sem']);
  const PL_CATS = [   // what the scoreboard shows, top 3 of each
    ['opt', 'hair', 'Cabelo'], ['col', 'skin', 'Cor da pele'], ['col', 'hair', 'Cor do cabelo'], ['opt', 'mouth', 'Boca'],
    ['opt', 'print', 'Camisa'], ['opt', 'coat', 'Terceira peça'], ['opt', 'glasses', 'Óculos'], ['opt', 'headwear', 'Na cabeça'],
  ];
  async function placarCount() {
    if (!PLACAR) return;
    try {
      const opts = {};
      for (const sl of CAT.slots) if (sl.options && state.choices[sl.id]) opts[sl.id] = state.choices[sl.id];
      const cols = {};
      for (const id of PL_COLORS) {
        const c = CAT.colors.find(x => x.id === id), v = String(state.colors[id] || '').toLowerCase();
        if (c && v) cols[id] = (c.swatches || []).concat(c.value).some(w => String(w).toLowerCase() === v) ? v : 'personalizada';
      }
      let doll = '';
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(uniFP()));
        doll = [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      const body = JSON.stringify({ v: 1, paper: state.paper, model: state.model, doll, opts, cols });
      fetch(PLACAR + '/print', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, keepalive: true, mode: 'cors' }).catch(() => {});
    } catch (e) { /* counting never gets in the way of printing */ }
  }
  function initPlacar() {
    const dlg = document.getElementById('placar'), btn = document.getElementById('placarBtn'), body = document.getElementById('placarBody');
    if (!dlg || !btn) return;
    const close = () => { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); };
    document.getElementById('placarClose').addEventListener('click', close);
    btn.addEventListener('click', async () => {
      document.getElementById('moreClose').click();
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      body.replaceChildren(el('p', { class: 'pl-empty' }, PLACAR ? 'Carregando o placar...' : 'O placar ainda não está ligado nesta versão do app.'));
      if (!PLACAR) return;
      try {
        const r = await fetch(PLACAR + '/stats', { mode: 'cors' }); if (!r.ok) throw new Error(r.status);
        renderPlacar(body, await r.json());
      } catch (e) { body.replaceChildren(el('p', { class: 'pl-empty' }, 'Não foi possível carregar o placar agora. Tente de novo mais tarde.')); }
    });
  }
  function renderPlacar(body, d) {
    const n = d.counts || {}, fmt = x => Number(x || 0).toLocaleString('pt-BR'), total = d.total || 0;
    const kids = [];
    kids.push(el('div', { class: 'pl-big' },
      el('div', { class: 'pl-stat' }, el('b', {}, fmt(total)), el('span', {}, total === 1 ? 'boneca impressa' : 'bonecas impressas')),
      el('div', { class: 'pl-stat' }, el('b', {}, fmt(d.distinct)), el('span', {}, d.distinct === 1 ? 'boneca diferente' : 'bonecas diferentes'))));
    if (!total) { kids.push(el('p', { class: 'pl-empty' }, 'Ainda não há bonecas impressas. Baixe o PDF da sua e seja a primeira do placar!')); body.replaceChildren(...kids); return; }
    const split = (title, a, b, la, lb) => { const x = n[a] || 0, y = n[b] || 0, t = x + y || 1, pa = Math.round(100 * x / t);
      return el('div', { class: 'pl-split' }, el('div', { class: 'lbl' }, el('span', {}, `${la} ${pa}%`), el('span', {}, title), el('span', {}, `${lb} ${100 - pa}%`)),
        el('div', { class: 'bar', role: 'img', 'aria-label': `${title}: ${la} ${pa}%, ${lb} ${100 - pa}%` }, el('i', { style: `width:${pa}%` }), el('i', { style: `width:${100 - pa}%` }))); };
    kids.push(split('Papel', 'paper:A4', 'paper:A3', 'A4', 'A3'));
    kids.push(split('Molde', 'model:completo', 'model:simples', 'Completo', 'Simplificado'));
    const cats = el('div', { class: 'pl-cats' });
    for (const [kind, id, title] of PL_CATS) {
      const pre = `${kind}:${id}:`, sl = CAT.slots.find(s => s.id === id);
      const top = Object.keys(n).filter(k => k.startsWith(pre) && !PL_NONE.has(k.slice(pre.length))).sort((a, b) => n[b] - n[a]).slice(0, 3);
      if (!top.length) continue;
      const ol = el('ol', {});
      top.forEach((k, i) => { const v = k.slice(pre.length);
        // a ready-made colour shows as a wide swatch (no hex code to read); a custom one as a rainbow and "Personalizada"
        const name = kind === 'opt' ? ((sl && sl.options.find(o => o.id === v)) || {}).label || v : (v === 'personalizada' ? 'Personalizada' : '');
        const chip = kind !== 'col' ? '' : v === 'personalizada' ? el('span', { class: 'chip', style: 'background:conic-gradient(#e8476f,#f2c230,#58b043,#3c64c8,#8e4fd1,#e8476f)' })
          : el('span', { class: 'chip wide', role: 'img', 'aria-label': 'cor ' + v, style: `background:${v}` });
        ol.append(el('li', {}, el('span', { class: 'md', 'aria-label': `${i + 1}º lugar` }, String(i + 1)), chip,
          name ? el('span', { class: 'nm', title: name }, name) : '', el('span', { class: 'ct' }, fmt(n[k])))); });
      cats.append(el('section', { class: 'pl-cat' }, el('h3', {}, title), ol));
    }
    kids.push(cats);
    kids.push(el('p', { class: 'pl-note' }, 'Conta só as bonecas que alguém baixou em PDF, de forma anônima: não guardamos o código da boneca, o nome na base nem nada sobre quem imprimiu. Cores que não são das prontas aparecem como "cor personalizada".'));
    body.replaceChildren(...kids);
  }
  /* ---------------- Google Analytics, only after consent (LGPD) ---------------- */
  function initConsent() {
    const id = String(CFG.ga || '').trim(), bar = document.getElementById('consent');
    const hosts = Array.isArray(CFG.gaHosts) ? CFG.gaHosts : [];
    if (!/^G-[A-Z0-9]+$/i.test(id) || !bar || (hosts.length && !hosts.includes(location.hostname))) return;
    const KEY = 'cientista-de-papel-cookies';
    let v = null; try { v = localStorage.getItem(KEY); } catch (e) {}
    const load = () => {
      window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
      gtag('js', new Date());
      gtag('config', id, { allow_google_signals: false, allow_ad_personalization_signals: false });
      const sc = document.createElement('script'); sc.async = true; sc.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id); document.head.appendChild(sc);
    };
    const set = x => { try { localStorage.setItem(KEY, x); } catch (e) {} bar.hidden = true; if (x === 'sim') load(); };
    document.getElementById('consentYes').addEventListener('click', () => set('sim'));
    document.getElementById('consentNo').addEventListener('click', () => set('nao'));
    if (v === 'sim') load(); else if (v !== 'nao') bar.hidden = false;
  }
  function initSettings() {
    applyUi();
    const btn = document.getElementById('moreBtn'), menu = document.getElementById('moreMenu'); if (!btn || !menu) return;
    const items = [...menu.querySelectorAll('.has-sub')];
    const setSub = (item, o) => { item.classList.toggle('open', o); item.querySelector('.menu-row').setAttribute('aria-expanded', String(o)); };
    const close = () => { if (menu.hidden) return; menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); items.forEach(i => setSub(i, false)); };
    btn.addEventListener('click', e => { e.stopPropagation(); if (!menu.hidden) return close();
      menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); menu.querySelector('.menu-row').focus(); });
    for (const item of items) {
      const row = item.querySelector('.menu-row');
      item.addEventListener('mouseenter', () => items.forEach(i => setSub(i, i === item)));   // pointing opens a family
      row.addEventListener('click', () => { const o = !item.classList.contains('open'); items.forEach(i => setSub(i, false)); setSub(item, o);
        if (o) item.querySelector('[role="menuitemradio"]').focus(); });
    }
    menu.querySelectorAll('[role="menuitemradio"]').forEach(b => b.addEventListener('click', () => {
      const k = b.closest('.submenu').dataset.setting; ui[k] = b.dataset.value; if (k === 'theme' && ui.theme !== 'escuro') ui.lightTheme = ui.theme;
      saveUi(); applyUi(); }));
    // the dark-mode switch beside the music: back to the last light colours when switched off
    const dt = document.getElementById('darkToggle');
    if (dt) dt.addEventListener('click', () => { if (ui.theme === 'escuro') ui.theme = ui.lightTheme || 'padrao'; else { ui.lightTheme = ui.theme; ui.theme = 'escuro'; } saveUi(); applyUi(); });
    alignTopRow();
    menu.addEventListener('click', e => e.stopPropagation());
    document.getElementById('moreClose').addEventListener('click', () => { close(); btn.focus(); });
    document.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { close(); btn.focus(); } });
  }
  // the row above the buttons follows their widths (they change with the text size and the window)
  function alignTopRow() {
    const row = document.querySelector('.sound'), acts = document.querySelector('.top-actions'); if (!row || !acts) return;
    const $ = id => document.getElementById(id);
    const place = () => {
      const [info, tut, reset, fb, more, dark, mute, vol] = ['aboutBtn', 'tutorialBtn', 'reset', 'feedbackBtn', 'moreBtn', 'darkToggle', 'muteBtn', 'volume'].map($);
      if (![info, tut, reset, fb, more, dark, mute, vol].every(Boolean)) return;
      const R = e => e.getBoundingClientRect(), ri = R(info), rt = R(tut), rr = R(reset), rf = R(fb), rm = R(more);
      // only when the five buttons sit on one line
      const ok = ri.width && rm.width && [rt, rr, rf, rm].every(b => Math.abs(b.top - ri.top) < 4);
      row.classList.toggle('aligned', !!ok);
      for (const e of [dark, mute, vol]) { e.style.left = ''; e.style.width = ''; }
      if (!ok) return;
      const x0 = R(row).left;
      dark.style.left = (ri.left - x0) + 'px'; dark.style.width = (rt.right - ri.left) + 'px';
      // the speaker starts where "Recomeçar" starts; the volume runs from just after it to the end of "⋯", closing the block
      const mx = rr.left - x0, vx = mx + mute.offsetWidth + 10;
      mute.style.left = mx + 'px';
      vol.style.left = vx + 'px'; vol.style.width = Math.max(40, rm.right - x0 - vx) + 'px';
    };
    place();
    if (window.ResizeObserver) new ResizeObserver(place).observe(acts);
    window.addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  }
  // the project's music: starts at 20%; the speaker mutes it. Browsers only allow sound after the first click or key,
  // so if it can't start right away it starts on the first touch of the page.
  function initMusic() {
    const a = document.getElementById('music'), vol = document.getElementById('volume'), mute = document.getElementById('muteBtn'); if (!a || !vol || !mute) return;
    const sync = () => { a.volume = Math.min(1, ui.volume / 100); a.muted = ui.muted || !ui.volume; vol.value = a.muted ? 0 : ui.volume;
      mute.setAttribute('aria-pressed', String(a.muted)); const t = a.muted ? 'Música: ligar o som' : 'Música: tirar o som'; mute.title = t; mute.setAttribute('aria-label', t); };
    const play = () => { if (!a.muted && a.paused) a.play().catch(() => {}); };
    vol.addEventListener('input', () => { ui.volume = +vol.value; ui.muted = !ui.volume; saveUi(); sync(); play(); });
    mute.addEventListener('click', () => { if (a.muted) { ui.muted = false; if (!ui.volume) ui.volume = UI_DEF.volume; } else ui.muted = true; saveUi(); sync(); play(); });
    sync();
    const evs = ['pointerdown', 'keydown'];
    const first = () => { evs.forEach(ev => document.removeEventListener(ev, first, true)); play(); };
    if (!a.muted) a.play().catch(() => evs.forEach(ev => document.addEventListener(ev, first, true)));
  }
  /* Phones: when the doll's place scrolls away (or the Molde tab is open) the 3D view floats in a small window at the
     top left, in the doll's proportions; the corner handle resizes it, the button tucks it away into a small tab.
     It is not draggable: on a phone dragging fights with scrolling the page. */
  function initPip() {
    const v = document.getElementById('view3d'), slot = document.getElementById('d3slot'), tab = document.getElementById('pipTab');
    if (!v || !slot || !tab || !window.IntersectionObserver) return;
    const phone = window.matchMedia('(max-width: 820px)');
    const btn = el('button', { type: 'button', class: 'pip-btn', 'aria-label': 'Esconder a boneca', title: 'Esconder' }, '–');
    const grip = el('span', { class: 'pip-grip', 'aria-hidden': 'true', title: 'Arraste para mudar o tamanho' });
    v.append(btn, grip);
    const setW = w => { const max = Math.min(320, window.innerWidth * 0.7); ui.pipW = Math.round(Math.max(96, Math.min(max, w))); v.style.setProperty('--pip-w', ui.pipW + 'px'); };
    setW(ui.pipW || 136);
    let inView = true;
    const update = () => {
      const float = phone.matches && (!inView || document.body.dataset.view === 'sheet');
      const on = float && !ui.pipMin;
      // floating, the view moves to the end of the page (its card is hidden while the Molde tab is open); its place keeps its height
      if (on && !v.classList.contains('pip')) { slot.style.height = slot.offsetHeight ? slot.offsetHeight + 'px' : ''; document.body.append(v); v.classList.add('pip'); }
      if (!on && v.classList.contains('pip')) { v.classList.remove('pip'); slot.append(v); slot.style.height = ''; }
      tab.hidden = !(float && ui.pipMin);
      place();
    };
    // the window (and the tab) never covers the buttons at the top nor the Boneca / Molde tabs: while they are on screen it sits under them
    const bar = document.querySelector('.top-actions');
    // (the title bar of the panel on screen sits right under the tabs)
    const headNow = () => document.querySelector(document.body.dataset.view === 'sheet' ? '.view.sheet .view-head' : '.view.d3 .view-head');
    const place = () => { const h = headNow(), hb = h ? h.getBoundingClientRect().bottom : 0;
      const top = bar ? Math.max(8, Math.round(bar.getBoundingClientRect().bottom + 8), Math.round(hb + 8)) + 'px' : '';
      v.style.top = v.classList.contains('pip') ? top : ''; tab.style.top = top; };
    window.addEventListener('scroll', () => { if (v.classList.contains('pip') || !tab.hidden) place(); }, { passive: true });
    new IntersectionObserver(es => { for (const e of es) inView = e.isIntersecting && e.intersectionRatio >= 0.35; update(); }, { threshold: [0, 0.35, 0.7] }).observe(slot);
    new MutationObserver(update).observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
    (phone.addEventListener ? phone.addEventListener('change', update) : phone.addListener(update));
    btn.addEventListener('click', e => { e.stopPropagation(); ui.pipMin = true; saveUi(); update(); });
    tab.addEventListener('click', () => { ui.pipMin = false; saveUi(); update(); });
    // resize: the corner handle follows the finger, keeping the doll's proportions
    grip.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); grip.setPointerCapture(e.pointerId);
      const x0 = e.clientX, y0 = e.clientY, w0 = v.getBoundingClientRect().width;
      const move = ev => setW(w0 + Math.max(ev.clientX - x0, (ev.clientY - y0) * 0.75));
      const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up); saveUi(); };
      grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
    });
    window.addEventListener('resize', () => { setW(ui.pipW); update(); });
    update();
  }
  init.again = () => { buildOptions(); buildColors(); document.getElementById('name').value = state.name;
    document.getElementById('nameFont').value = state.nameFont; document.getElementById('nameSize').value = state.nameSize;
    document.getElementById('paper').value = state.paper; document.getElementById('model').value = state.model; currentPage = 0;
    if (init.syncQr) init.syncQr(); if (init.paintBg) init.paintBg(); refresh(); };

  // expose a tiny API for debugging / tests
  const choose = (slot, id) => { state.choices[slot] = id; save(); buildOptions(); refresh(); };
  const loadCode = async code => { state = await readCode(code); save(); init.again(); };
  window.CientistaDePapel = { state: () => state, refresh, layoutSheet, renderPage, choose, textures: tex, makeCode, loadCode };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
