/* =====================================================================
   DOLL CATALOG - everything the player can choose lives here.
   =====================================================================
   This is the file to edit when you want to ADD A NEW HAIRSTYLE,
   OUTFIT DETAIL, ACCESSORY OR COLOUR. No other file needs to change:
   buttons, the 3D doll and the printable net all update by themselves.

   HOW IT WORKS
   The doll's paper is printed from 5 square pictures ("textures"),
   2024 x 2024 pixels each, the same ones the Pepakura model uses:
       0 = hair planes   1 = head + arms   2 = body   3 = lab coat + skirt   4 = base
   A REGION is a named rectangle on one of those textures, for example
   "head.front" is the face square. A LAYER is a drawing placed into a
   region. Whatever you draw into a region shows up on the 3D doll AND on
   the printed sheet, in the right place, automatically.

   TO ADD A HAIRSTYLE (or any option)
   1. Copy an existing option inside the slot (e.g. one of the `hair` entries).
   2. Give it a new `id` and `label`.
   3. Give it `layers`: each layer has a `region` and either
        svg:  SVG drawing code, coordinates in the region's own pixels
              (open data/templates/<region>.png in Inkscape/Illustrator
              to see where the face, ear, etc. are), or
        src:  a PNG/SVG file the same size as the region
              (e.g. 'assets/hair/my-hair-front.png'; works when the
              app is served from a web server or GitHub Pages).
   4. Colours: in SVG write {hair}, {hair-dark}, {hair-light}, {skin},
      {accent}... and the colour wheel controls them. In a PNG, paint
      the part that should change colour in grey/white and add
      tint: 'hair' - the colour wheel multiplies over it.
   5. `hide: ['cabelo_frente']` removes a paper piece (3D + print) while
      that option is chosen; `show: [...]` adds one.

   Paper pieces (by name): cabeca (head), cabelo_frente (front hair
   plane), cabelo_tras (back hair plane), corpo (body), bracos (arms),
   jaleco (lab coat), saia (skirt), base (stand).
   ===================================================================== */
(function () {

  /* ---------- regions: [texture, x, y, width, height] in texture pixels.
     The two hair planes also give their own coordinate box [x0, y0, width, height]: drawings use
     "plane px" where the head top is at y 166 and the face opening is x 217-819 from y 446 down
     (the planes were enlarged, so coordinates can be negative: x -160..1196, y -181..1418 in front). */
  const regions = {
    'hair.front': [0, 0, 0, 1085, 1279, -160, -181, 1356, 1599],     // flat hair piece in FRONT of the face
    'hair.back':  [0, 1087, 0, 937, 1104, -138, -156, 1171, 1380],   // flat hair piece BEHIND the head (x -138..1033)
    'head.front': [1, 138, 93, 887, 887],   // the face (eyes at x 192 / 697, y 521)
    'head.side':  [1, 1163, 93, 657, 887],  // sides of the head (ear at x 282-440, y 330-590; face is to the right)
    // the doll's LEFT side of the head has its own copy (texture 0); it gets everything drawn on
    // 'head.side' automatically. Use it only for one-side items (side: 'esq'); see EAR() below.
    'head.side.b': [0, 0, 1285, 526, 710, 0, 0, 657, 887],
    'head.back':  [1, 138, 1037, 887, 887], // back of the head
    'arms':       [1, 1170, 1150, 760, 850],
    // the doll's LEFT arm has its own copy (texture 0, 0.7 density); it gets everything drawn on
    // 'arms' automatically. Use it only for one-arm items (side: 'esq'); see ARM() below.
    'arms.b':     [0, 545, 1290, 532, 595, 0, 0, 760, 850],
    'body.front': [2, 25, 331, 723, 1237],  // shirt front (belt at y 618, shoes from y 1140)
    'body.back':  [2, 781, 331, 723, 1237],
    'head.top':   [0, 1087, 1112, 572, 655], // top of the head (front at the bottom edge)
    'body.all':   [2, 0, 0, 2024, 2024],      // the whole body texture (belt y 949, trousers 1025-1473, shoes below)
    'base.top':   [4, 95, 59, 918, 919],
    'base.bottom': [4, 95, 1050, 918, 918], // underside of the stand
    'base.label': [4, 1233, 1779, 559, 181], // front of the stand: the name goes here
  };

  const ASHLEY = window.DOLL_ASHLEY || { hairs: [] };

  /* ---------- colours the colour wheel can change */
  const SKIN = ['#ffe3c8', '#f6cba3', '#e9b48a', '#d49a6a', '#b97a4e', '#9b5d38', '#7b4427', '#5c311c', '#3e2214'];
  const HAIR = ['#1b1512', '#3b2416', '#6b3e1f', '#bc6313', '#d9a441', '#f0d27a', '#b03a2e', '#c9c4bd', '#8e5bd6', '#2d8fd1', '#e45a9b'];
  const BRIGHT = ['#f5633a', '#e8476f', '#8e4fd1', '#3c64c8', '#2a9d8f', '#58b043', '#f2c230', '#ffffff', '#222630'];
  const colors = [
    { id: 'skin',    label: 'Pele',        value: '#ffd6aa', swatches: SKIN },
    { id: 'hair',    label: 'Cabelo',      value: '#bc6313', swatches: HAIR },
    { id: 'eyes',    label: 'Olhos',       value: '#8a4a14', swatches: ['#3b2416', '#8a4a14', '#3f8a3c', '#2d6fc4', '#6a7b88', '#7a3fa0'] },
    { id: 'brows',   label: 'Sobrancelhas', value: '#3b2416', swatches: ['#1b1512', '#3b2416', '#6b3e1f', '#a8692e', '#d9a441', '#8c8680'] },
    { id: 'lips',    label: 'Batom',       value: '#c2365a', swatches: ['#c2365a', '#e8476f', '#a0303a', '#b56a5a', '#8e4fd1', '#f08a6a'] },
    { id: 'shirt',   label: 'Camisa',    value: '#f5633a', swatches: BRIGHT },
    { id: 'sleeves', label: 'Mangas',      value: '#f5633a', swatches: BRIGHT.concat(SKIN.slice(0, 4)) },
    { id: 'pants',   label: 'Calça',       value: '#4c97da', swatches: ['#4c97da', '#25365e', '#222630', '#7a5a3a', '#e8e1d0', '#8e4fd1', '#2a9d8f'] },
    { id: 'belt',    label: 'Cinto',       value: '#7e5c1c', swatches: ['#7e5c1c', '#222630', '#b03a2e', '#ffffff'] },
    { id: 'socks',   label: 'Meia',        value: '#ffffff', swatches: ['#ffffff', '#222630', '#e8476f', '#3c64c8', '#f2c230', '#8e4fd1'] },
    { id: 'shoes',   label: 'Sapatos',     value: '#7e5c1c', swatches: ['#7e5c1c', '#222630', '#ffffff', '#e8476f', '#3c64c8'] },
    { id: 'coat',    label: 'Jaleco',      value: '#ffffff', swatches: ['#ffffff', '#dfeff7', '#e7f5e4', '#fde7ef'] },
    { id: 'skirt',   label: 'Saia',        value: '#4c97da', swatches: BRIGHT },
    { id: 'accent',  label: 'Elástico do cabelo', value: '#8e4fd1', swatches: BRIGHT.concat(['#d4a017', '#c0c0c0']) },
    { id: 'glasses', label: 'Óculos',      value: '#8e4fd1', swatches: BRIGHT.concat(['#d4a017', '#c0c0c0']) },
    { id: 'headwear', label: 'Enfeite da cabeça', value: '#8e4fd1', swatches: BRIGHT.concat(['#d4a017', '#c0c0c0']) },
    { id: 'neck',    label: 'Colar / crachá', value: '#8e4fd1', swatches: BRIGHT.concat(['#d4a017', '#c0c0c0']) },
    { id: 'wrist',   label: 'Pulseira do relógio', value: '#c0c0c0', swatches: ['#c0c0c0', '#d4a017', '#222630', '#7e5c1c', '#e8476f', '#3c64c8'] },
    { id: 'bracelet', label: 'Pulseira',  value: '#d4a017', swatches: ['#d4a017', '#c0c0c0'].concat(BRIGHT) },
    { id: 'gloves',  label: 'Luvas',       value: '#5b8fd6', swatches: ['#5b8fd6', '#8e4fd1', '#ffffff', '#f2c230', '#222630', '#e8476f', '#58b043'] },
    { id: 'earrings', label: 'Brincos',    value: '#8e4fd1', swatches: BRIGHT.concat(['#d4a017', '#c0c0c0']) },
    { id: 'print',   label: 'Estampa',     value: '#ffffff', swatches: BRIGHT },
    { id: 'base',    label: 'Base',        value: '#8e7e81', swatches: ['#8e7e81', '#5b4b8a', '#2a6f97', '#2a9d8f', '#e8476f', '#222630'] },
    { id: 'fundo',   label: 'Fundo da boneca', value: '#ececec', swatches: ['#ececec', '#ffffff', '#f0a3a0', '#9cc7e6', '#fed652', '#9fd8b4', '#2b2f3a'] },
    { id: 'qr',      label: 'QR code',     value: '#000000', swatches: ['#000000', '#10304a', '#015d8c', '#5b4b8a', '#cd4245', '#1f6f43'] },
    // second colours of the Degradê switch in the colour picker (gradOf: the colour they fade from)
    { id: 'hair2',   label: 'Cabelo: cor 2', value: '#e45a9b', swatches: HAIR, gradOf: 'hair' },
    { id: 'shirt2',  label: 'Camisa: cor 2', value: '#3c64c8', swatches: BRIGHT, gradOf: 'shirt' },
  ];

  /* ---------- small drawing helpers (used by the hairstyles below) */
  const INK = 'stroke="#1d1712" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"';
  // bumpy "cloud" outline, used for curly hair
  function cloud(cx, cy, rx, ry, n, bump) {
    let d = '';
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2, m = ((i - 0.5) / n) * Math.PI * 2;
      const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
      if (i === 0) { d += `M${x.toFixed(1)} ${y.toFixed(1)}`; continue; }
      const qx = cx + rx * (1 + bump) * Math.cos(m), qy = cy + ry * (1 + bump) * Math.sin(m);
      d += ` Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d + ' Z';
  }
  function curls(x0, y0, x1, y1, step) {
    let s = '';
    for (let y = y0; y < y1; y += step) for (let x = x0 + ((y / step) % 2) * step / 2; x < x1; x += step)
      s += `<path d="M${x} ${y} q18 -22 36 0" fill="none" stroke="{hair-dark}" stroke-width="9" stroke-linecap="round"/>`;
    return s;
  }
  // a hair shape with texture drawn only inside it
  let clipN = 0;
  function clipped(d, inside, outline = d) {
    const id = 'c' + (++clipN);
    return `<defs><clipPath id="${id}"><path fill-rule="evenodd" clip-rule="evenodd" d="${d}"/></clipPath></defs>` +
      `<path fill-rule="evenodd" d="${d}" fill="{hair}"/><g clip-path="url(#${id})">${inside}` +
      `<path d="${outline}" fill="none" stroke="#1d1712" stroke-width="14" stroke-linejoin="round"/></g>`;
  }
  function braid(cx, y0, y1) {
    let s = '';
    for (let y = y0; y < y1; y += 70) s += `<ellipse cx="${cx}" cy="${y + 40}" rx="72" ry="48" fill="{hair}" ${INK}/>` +
      `<path d="M${cx - 40} ${y + 40} q40 -26 80 0" fill="none" stroke="{hair-dark}" stroke-width="10"/>`;
    return s + `<rect x="${cx - 40}" y="${y1 + 10}" width="80" height="30" rx="12" fill="{accent}" ${INK}/>` +
      `<path d="M${cx - 35} ${y1 + 40} l-15 70 h100 l-15 -70 z" fill="{hair}" ${INK}/>`;
  }
  // hairlines on the forehead (head.front): used by the hairstyles and by the "Testa" row
  const HAIRLINE = {
    ondas: `<path d="M-10 -10 H897 V150 Q760 250 600 205 Q443 160 290 205 Q130 250 -10 150 Z" fill="{hair}" ${INK}/>`,
    bicos: `<path d="M-10 -10 H897 V150 L800 260 L720 190 L630 280 L540 200 L443 290 L350 200 L260 280 L170 190 L90 260 L-10 150 Z" fill="{hair}" ${INK}/>`,
    arco: `<path d="M-10 -10 H897 V150 Q443 215 -10 150 Z" fill="{hair}" ${INK}/>`,
    reta: `<path d="M-10 -10 H897 V150 H-10 Z" fill="{hair}" ${INK}/>`,
    bico: `<path d="M-10 -10 H897 V150 Q620 160 443 250 Q266 160 -10 150 Z" fill="{hair}" ${INK}/>`,
  };
  // hair pulled close to the head (used by short, bun, ponytail and braids)
  const TOP = (op = 1) => ({ region: 'head.top', svg: `<rect x="-10" y="-10" width="600" height="680" fill="{hair}" opacity="${op}"/>` });
  // The nape line on the back of the head, drawn from the right corner to the left one. It starts and ends flat at
  // height Y, exactly where the side pieces end (see SIDE_END), and dips gently in the middle. Below y 730 the back's
  // corners are cut off (the bottom bevel), so the line meets the side there at x = Y - 730 instead of x = 0.
  const NAPE = (Y, dip = 24) => { const c = Math.max(0, Y - 730);
    return `V${Y} H${887 - c} C${687 - c} ${Y} 643 ${Y + dip} 443 ${Y + dip} S${c + 200} ${Y} ${c} ${Y} H-10`; };
  const tightHead = (front) => [
    TOP(),
    { region: 'head.front', tag: 'hairline', svg: front || HAIRLINE.ondas },
    { region: 'head.side', svg: `<path d="M-10 -10 H667 V150 Q560 160 520 260 Q470 330 400 300 Q300 300 285 430 L280 640 Q262 800 110 800 H-10 Z" fill="{hair}" ${INK}/>` },
    { region: 'head.back', svg: `<path d="M-10 -10 H897 ${NAPE(800)} Z" fill="{hair}" ${INK}/>` },
  ];
  // on the side of the head the hair comes down to where the parting ends at the face's edge and runs
  // straight back over the ear (hair combed tight towards the back)
  const RISCA_SIDE = { region: 'head.side', z: 20.5, tag: 'hairline', svg: `<path d="M667 -10 V318 H450 Q420 318 396 300 V-10 Z" fill="{hair}"/>` +
    `<path d="M667 318 H450 Q420 318 396 300" fill="none" stroke="#1d1712" stroke-width="8" stroke-linecap="round"/>` +
    `<path d="M640 250 Q540 240 440 250 M640 190 Q520 180 420 200" fill="none" stroke="{hair-dark}" stroke-width="9" stroke-linecap="round"/>` };
  const fullHead = () => [
    TOP(),
    { region: 'head.front', tag: 'hairline', svg: `<path d="M-10 -10 H897 V150 Q700 240 443 215 Q186 240 -10 150 Z" fill="{hair}" ${INK}/>` },
    { region: 'head.side', svg: `<path d="M-10 -10 H667 V150 Q560 170 510 280 Q470 330 400 300 Q300 300 285 430 L300 897 H-10 Z" fill="{hair}" ${INK}/>` },
    { region: 'head.back', svg: `<rect x="-10" y="-10" width="907" height="907" fill="{hair}"/>` },
  ];

  // draw the same shape on both eyes (centres x 196 / 690); the right one is mirrored
  const pair = (shape, y = 540) => `<g transform="translate(196 ${y})">${shape}</g><g transform="translate(690 ${y}) scale(-1 1)">${shape}</g>`;
  // glasses: one lens shape (drawn around 0,0), the bridge, and the half width of one lens
  const STETH = `<path d="M210 0 Q215 160 270 220 Q300 260 300 330 M512 0 Q505 160 450 220 Q420 260 420 300" fill="none" stroke="#2a2d3a" stroke-width="22" stroke-linecap="round"/>
           <circle cx="300" cy="360" r="34" fill="#c0c4cc" ${INK}/><circle cx="300" cy="360" r="16" fill="#8b909c"/>`;
  const glasses = (lens, bridge, half) => [
    { region: 'head.front', z: 40, svg: pair(lens) + bridge +
      `<path d="M${196 - half} 515 H-10 M${690 + half} 515 H897" stroke="{accent}" stroke-width="20"/>` }];   // face only (nothing on the sides)
  function flower(r, fill = '{accent}') {
    return [0, 72, 144, 216, 288].map(a => `<ellipse rx="${r}" ry="${r * 0.62}" cx="${r}" transform="rotate(${a})" fill="${fill}" ${INK}/>`).join('') + `<circle r="${r * 0.58}" fill="#f2c230" ${INK}/>`;
  }
  // a feather pointing up from (0,0); k picks one of three colours
  function feather(k) {
    const fill = ['{accent}', '{accent-light}', '#f2c230'][k % 3];
    return `<path d="M0 0 C-70 -60 -60 -170 0 -240 C60 -170 70 -60 0 0 Z" fill="${fill}" ${INK}/>` +
      `<path d="M0 0 V-230 M0 -60 L-35 -95 M0 -110 L-35 -145 M0 -60 L35 -95 M0 -110 L35 -145" stroke="#1d1712" stroke-width="7" stroke-linecap="round" fill="none"/>` +
      `<path d="M-30 -190 Q0 -255 30 -190 Q0 -215 -30 -190 Z" fill="{accent-dark}"/>`;
  }

  // bare legs below a hem that runs from the outside of the leg (y = outer) to the inside seam (y = inner).
  // In texture 2 the front legs meet at x 385, y 1240 and the back legs at x 1144; shoes start at y 1473.
  function legs(outer, inner) {
    const t = (inner - 1240) / 329, L = 145 * t, R = 146 * t; let fill = '', line = '';
    for (const ax of [385, 1144]) {
      const x0 = ax - 395, x1 = ax + 395;
      fill += `M${x0} ${outer} L${(ax - L).toFixed(0)} ${inner} L${(ax + R).toFixed(0)} ${inner} L${x1} ${outer} V1470 H${x0} Z `;
      line += `M${x0} ${outer} L${(ax - L).toFixed(0)} ${inner} M${(ax + R).toFixed(0)} ${inner} L${x1} ${outer} `;
    }
    fill += `M1525 ${outer} H2034 V1470 H1525 Z`; line += `M1525 ${outer} H2034`;
    return `<path d="${fill}" fill="{skin}"/><path d="${line}" fill="none" stroke="#1d1712" stroke-width="7"/>`;
  }

  // with straps or strapless, the T-shirt collar (the neck ovals at x 386 / 1140, y 330) is covered with skin
  const NECKLINE = { region: 'body.all', z: 31, svg: [386, 1140].map(x => `<ellipse cx="${x}" cy="330" rx="84" ry="34" fill="{skin}"/>`).join('') };
  // bare arms: skin over the whole sleeve
  // the long sleeve's cuff, drawn as one solid line (the built-in one has gaps at the sides)
  const CUFF = `<path d="M18 555 L210 562 L375 587 L545 587 L718 558" fill="none" stroke="#1d1712" stroke-width="6" stroke-linejoin="round"/>`;
  const SKINARMS = { region: 'arms', z: 20, svg: `<rect x="-10" y="-10" width="780" height="870" fill="{skin}"/>` };
  // no belt: trousers colour over the belt band and the buckle, with the waist seam on top
  const NOBELT = { region: 'body.all', z: 31, svg: `<rect x="-10" y="944" width="2044" height="86" fill="{pants}"/>
    <path d="M-10 949 H2034" stroke="#1d1712" stroke-width="7"/>` };
  // the buckle is its own built-in layer ('body_buckle'); options that have no buckle drop it with without: [...]
  const NOBUCKLE = ['body_buckle'];
  // one-side items on the ears: the same drawing on the right ear ('dir', shared side picture)
  // and on the left ear ('esq', the left side's own copy); the row's tag picks which are shown
  const EAR = (svg, z = 40) => [{ region: 'head.side', side: 'dir', z, svg }, { region: 'head.side.b', side: 'esq', z, svg }];
  // one-arm items (watch, bracelets): the doll's right arm uses the shared 'arms' picture, the left
  // arm its own copy ('arms.b'); the row's tag picks which are shown
  const ARM = (svg, z = 30) => [{ region: 'arms', side: 'dir', z, svg }, { region: 'arms.b', side: 'esq', z, svg }];
  // a band round the arm, parallel to the cuff line (the hand starts at the cuff, y ~555-587);
  // dy moves it up the forearm
  const BAND = dy => `M-10 ${554 + dy} L18 ${555 + dy} L210 ${562 + dy} L375 ${587 + dy} L545 ${587 + dy} L718 ${558 + dy} L770 ${557 + dy}`;
  const RING = (dy, w, color = '{accent}') => `<path d="${BAND(dy)}" fill="none" stroke="#1d1712" stroke-width="${w + 8}" stroke-linejoin="round"/>
    <path d="${BAND(dy)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round"/>`;
  // one-side items on the face: the doll's right is on the viewer's left (x < 443)
  const FACE2 = (svgAt, z = 41) => [{ region: 'head.front', side: 'dir', z, svg: svgAt(1) }, { region: 'head.front', side: 'esq', z, svg: svgAt(-1) }];
  const METAL = '#b9bec6';
  // bare legs + bare feet: hide the trouser hem line at the ankle (only when the legs are bare)
  const ANKLE = { region: 'body.all', z: 36, if: { bottoms: ['curta', 'bermuda', 'shorts'] }, svg: `<rect x="-10" y="1462" width="2044" height="13" fill="{skin}"/>` };

  /* ---------- the slots: each slot is one row "< option >" in the menu.
     colors: the colour buttons shown next to that row (ids from the list above).
     A slot with colors and no options is a colour-only row (skin, shoes, base). */
  /* ---------- hand-held props: flat pictures glued onto a hand (rows 'Mão direita' / 'Mão esquerda')
     vb: drawing size, h: height in doll units (the head is 2.3 wide), grip: the point held by the hand.
     Everything inherits a black 3-unit outline; give fill="none" to lines. Add a new one here and it
     shows up in both hand rows. */
  const K = '#1d1712';
  const PROPS = {
    livro: { label: 'Livro', vb: [70, 95], h: 1.35, grip: [35, 62], svg:
      `<rect x="8" y="5" width="56" height="84" rx="4" fill="#3f6fb5"/><rect x="8" y="5" width="12" height="84" rx="3" fill="#2d538c"/>
       <rect x="28" y="20" width="28" height="16" rx="2" fill="#f5e6c8"/><path d="M32 28 H52" fill="none" stroke-width="2.5"/>
       <circle cx="42" cy="60" r="9" fill="none" stroke="#f5e6c8" stroke-width="3"/><ellipse cx="42" cy="60" rx="15" ry="5" fill="none" stroke="#f5e6c8" stroke-width="2.5"/>` },
    bequer: { label: 'Béquer', vb: [70, 90], h: 1.15, grip: [35, 62], svg:
      `<path d="M16 9 V78 Q16 86 24 86 H46 Q54 86 54 78 V9 Z" fill="#e6f3fa"/>
       <path d="M18 46 H52 V78 Q52 84 46 84 H24 Q18 84 18 78 Z" fill="#6cc4a4" stroke="none"/><path d="M18 46 H52" fill="none" stroke-width="2.5"/>
       <path d="M16 9 V78 Q16 86 24 86 H46 Q54 86 54 78 V9" fill="none"/><path d="M10 9 H60" fill="none" stroke-width="6"/>
       <path d="M40 26 H50 M43 34 H50 M40 42 H50" fill="none" stroke-width="2.5"/>
       <circle cx="28" cy="62" r="4" fill="#ffffff" stroke-width="2"/><circle cx="38" cy="72" r="3" fill="#ffffff" stroke-width="2"/><circle cx="33" cy="54" r="2.5" fill="#ffffff" stroke-width="2"/>` },
    camera: { label: 'Câmera fotográfica', vb: [100, 72], h: 0.85, grip: [82, 48], svg:
      `<path d="M30 18 L37 7 H63 L70 18 Z" fill="#3a3f4a"/><rect x="6" y="18" width="88" height="48" rx="8" fill="#3a3f4a"/>
       <rect x="13" y="11" width="12" height="7" rx="2" fill="#d9453b"/><circle cx="50" cy="42" r="19" fill="#b9bec6"/>
       <circle cx="50" cy="42" r="11" fill="#1f3550"/><circle cx="45" cy="37" r="3.5" fill="#ffffff" stroke="none"/><rect x="74" y="24" width="12" height="8" rx="2" fill="#f5e6a8"/>` },
    prancheta: { label: 'Prancheta', vb: [70, 96], h: 1.4, grip: [35, 70], svg:
      `<rect x="6" y="7" width="58" height="86" rx="5" fill="#b57a43"/><rect x="13" y="18" width="44" height="68" fill="#ffffff"/>
       <rect x="23" y="3" width="24" height="12" rx="3" fill="#b9bec6"/>
       <path d="M20 32 H50 M20 42 H50 M20 52 H40" fill="none" stroke-width="2.5"/><path d="M20 66 L24 70 L32 61" fill="none" stroke="#3d8b4a" stroke-width="3.5"/><path d="M36 66 H50" fill="none" stroke-width="2.5"/>` },
    microfone: { label: 'Microfone', vb: [44, 110], h: 1.35, grip: [22, 80], svg:
      `<path d="M14 44 H30 L26 106 H18 Z" fill="#3a3f4a"/><rect x="11" y="38" width="22" height="8" rx="2" fill="#b9bec6"/>
       <rect x="7" y="4" width="30" height="36" rx="15" fill="#8a8f99"/><path d="M9 16 H35 M8 27 H36 M22 5 V39" fill="none" stroke-width="2"/>` },
    telescopio: { label: 'Telescópio', vb: [130, 58], h: 0.6, grip: [62, 40], svg:
      `<g transform="rotate(-14 65 29)"><rect x="4" y="22" width="16" height="14" rx="2" fill="#3a3f4a"/><rect x="18" y="19" width="34" height="20" rx="3" fill="#2d538c"/>
       <rect x="50" y="16" width="44" height="26" rx="3" fill="#3f6fb5"/><rect x="92" y="12" width="30" height="34" rx="4" fill="#2d538c"/><path d="M122 14 V44" fill="none" stroke="#f5e6a8" stroke-width="3"/></g>` },
    geiger: { label: 'Contador Geiger', vb: [104, 80], h: 0.95, grip: [64, 12], svg:
      `<path d="M48 22 V9 H80 V22" fill="none" stroke-width="7"/><path d="M48 22 V9 H80 V22" fill="none" stroke="#f2c230" stroke-width="3"/>
       <rect x="32" y="20" width="66" height="52" rx="7" fill="#f2c230"/><rect x="41" y="28" width="38" height="24" rx="3" fill="#f5f1e6"/>
       <path d="M46 47 A15 15 0 0 1 74 47" fill="none" stroke-width="2"/><path d="M60 48 L68 34" fill="none" stroke="#d9453b" stroke-width="3"/>
       <circle cx="86" cy="62" r="6" fill="#1d1712"/><circle cx="50" cy="62" r="4" fill="#3d8b4a"/>
       <path d="M32 56 Q16 60 18 72" fill="none" stroke-width="3"/><rect x="4" y="66" width="30" height="10" rx="4" fill="#3a3f4a"/>` },
    lupa: { label: 'Lupa', vb: [72, 100], h: 1.3, grip: [58, 84], svg:
      `<path d="M46 56 L64 92" fill="none" stroke-width="15"/><path d="M46 56 L64 92" fill="none" stroke="#8b5a2b" stroke-width="9"/>
       <circle cx="32" cy="32" r="27" fill="#3a3f4a"/><circle cx="32" cy="32" r="20" fill="#d9eef8"/><path d="M20 26 Q22 18 30 16" fill="none" stroke="#ffffff" stroke-width="4"/>` },
    microscopio: { label: 'Microscópio', vb: [82, 110], h: 1.2, grip: [52, 70], svg:
      `<rect x="10" y="94" width="62" height="12" rx="4" fill="#3a3f4a"/><path d="M50 94 C68 80 70 50 50 34" fill="none" stroke-width="16"/>
       <path d="M50 94 C68 80 70 50 50 34" fill="none" stroke="#f5f1e6" stroke-width="10"/>
       <rect x="12" y="68" width="44" height="7" rx="2" fill="#3a3f4a"/>
       <g transform="rotate(-24 34 30)"><rect x="25" y="6" width="18" height="48" rx="3" fill="#f5f1e6"/><rect x="22" y="2" width="24" height="8" rx="2" fill="#3a3f4a"/><rect x="29" y="52" width="10" height="9" fill="#b9bec6"/></g>` },
    tubos: { label: 'Tubos de ensaio', vb: [70, 100], h: 1.2, grip: [35, 64], svg:
      `<path d="M14 8 V80 Q14 92 24 92 Q34 92 34 80 V8 Z" fill="#e6f3fa"/><path d="M16 44 H32 V80 Q32 90 24 90 Q16 90 16 80 Z" fill="#e86aa0" stroke="none"/>
       <path d="M14 8 V80 Q14 92 24 92 Q34 92 34 80 V8" fill="none"/><path d="M10 8 H38" fill="none" stroke-width="5"/>
       <path d="M38 14 V82 Q38 94 48 94 Q58 94 58 82 V14 Z" fill="#e6f3fa"/><path d="M40 56 H56 V82 Q56 92 48 92 Q40 92 40 82 Z" fill="#f2a530" stroke="none"/>
       <path d="M38 14 V82 Q38 94 48 94 Q58 94 58 82 V14" fill="none"/><path d="M34 14 H62" fill="none" stroke-width="5"/>` },
    notebook: { label: 'Notebook', vb: [110, 78], h: 0.95, grip: [55, 66], svg:
      `<rect x="16" y="4" width="78" height="54" rx="4" fill="#3a3f4a"/><rect x="22" y="10" width="66" height="42" fill="#9fd6f2"/>
       <path d="M28 20 H48 M34 28 H64 M34 36 H54 M28 44 H44" fill="none" stroke-width="2.5"/>
       <path d="M6 60 H104 L98 72 H12 Z" fill="#b9bec6"/><path d="M46 66 H64" fill="none" stroke-width="2.5"/>` },
    estetoscopio: { label: 'Estetoscópio', vb: [92, 100], h: 1.3, grip: [48, 62], svg:
      `<path d="M28 10 V32 Q28 54 48 54 Q68 54 68 32 V10 M48 54 V72 Q48 86 62 86" fill="none" stroke-width="9"/>
       <path d="M28 10 V32 Q28 54 48 54 Q68 54 68 32 V10 M48 54 V72 Q48 86 62 86" fill="none" stroke="#3f6fb5" stroke-width="4"/>
       <circle cx="28" cy="8" r="5" fill="#b9bec6"/><circle cx="68" cy="8" r="5" fill="#b9bec6"/>
       <circle cx="72" cy="86" r="13" fill="#b9bec6"/><circle cx="72" cy="86" r="6" fill="#e6f3fa"/>` },
    martelo: { label: 'Martelo de geóloga', vb: [92, 104], h: 1.35, grip: [46, 82], svg:
      `<rect x="40" y="28" width="13" height="72" rx="5" fill="#b57a43"/>
       <path d="M12 16 H74 L88 25 L74 34 H12 Q7 25 12 16 Z" fill="#8a8f99"/><path d="M12 16 Q7 25 12 34 H22 V16 Z" fill="#6e737c"/>` },
    planta: { label: 'Planta', vb: [72, 100], h: 1.25, grip: [36, 80], svg:
      `<path d="M36 58 V26" fill="none" stroke-width="8"/><path d="M36 58 V26" fill="none" stroke="#3d8b4a" stroke-width="3"/>
       <path d="M36 44 Q14 40 10 20 Q32 20 36 44 Z" fill="#5cb85c"/><path d="M36 32 Q58 28 62 8 Q40 8 36 32 Z" fill="#5cb85c"/>
       <path d="M16 64 H56 L50 96 H22 Z" fill="#c8643b"/><rect x="11" y="56" width="50" height="11" rx="3" fill="#d9774c"/>` },
    globo: { label: 'Globo terrestre', vb: [84, 104], h: 1.4, grip: [42, 92], svg:
      `<path d="M42 72 V92" fill="none" stroke-width="7"/><ellipse cx="42" cy="96" rx="22" ry="6" fill="#b57a43"/>
       <path d="M14 18 A34 34 0 0 0 66 76" fill="none" stroke-width="8"/><path d="M14 18 A34 34 0 0 0 66 76" fill="none" stroke="#b9bec6" stroke-width="3"/>
       <circle cx="44" cy="42" r="29" fill="#5aa9e6"/>
       <path d="M28 28 Q38 20 46 28 Q42 42 32 40 Q24 36 28 28 Z M48 48 Q60 44 64 54 Q58 66 50 62 Z M36 56 Q42 54 42 62 Q36 64 36 56 Z" fill="#6cc46c" stroke-width="2"/>` },
    calculadora: { label: 'Calculadora', vb: [62, 92], h: 1.05, grip: [31, 62], svg:
      `<rect x="6" y="4" width="50" height="84" rx="7" fill="#3a3f4a"/><rect x="13" y="11" width="36" height="17" rx="2" fill="#cfe8c8"/>
       <path d="M30 20 H44" fill="none" stroke-width="2.5"/>` +
      [0, 1, 2].map(c => [0, 1, 2, 3].map(r => `<rect x="${13 + c * 13}" y="${35 + r * 12}" width="10" height="8" rx="2" fill="${c === 2 && r === 3 ? '#f2a530' : '#e8e8ee'}" stroke-width="1.5"/>`).join('')).join('') },
    foguete: { label: 'Foguete', vb: [62, 112], h: 1.5, grip: [31, 64], svg:
      `<path d="M20 80 Q31 110 42 80 Z" fill="#f2a530"/><path d="M15 62 L4 90 L15 84 Z M47 62 L58 90 L47 84 Z" fill="#d9453b"/>
       <path d="M31 4 Q47 20 47 50 V84 H15 V50 Q15 20 31 4 Z" fill="#f5f1e6"/><path d="M31 4 Q42 14 45 28 H17 Q20 14 31 4 Z" fill="#d9453b"/>
       <circle cx="31" cy="46" r="8" fill="#5aa9e6"/>` },
  };

  // which of Ashley's hairs get the extra controls under the Cabelo row
  const HAIR_MIRROR = ['ondulado', 'lisocurto', 'presolado', 'cacholateral', 'cacheadolongo'];
  const HAIR_LENGTH = [...new Set(ASHLEY.hairs.filter(h => h.layers.some(l => l.len)).map(h => h.id))];
  const slots = [
    {
      id: 'hair', label: 'Cabelo', section: 'Cabelo', colors: ['hair', 'accent'],
      toggles: [
        { id: 'espelhar', label: 'Espelhar lado', showOn: HAIR_MIRROR },
      ],
      options: [
        { id: 'raspado', label: 'Raspado', hide: ['cabelo_frente', 'cabelo_tras'], layers: [
          TOP(0.75),
          { region: 'head.front', tag: 'hairline', svg: `<path d="M-10 -10 H897 V120 Q443 200 -10 120 Z" fill="{hair}" opacity="0.75"/>` },
          { region: 'head.side', svg: `<path d="M-10 -10 H667 V120 Q520 150 470 260 Q330 300 290 430 L270 650 Q252 760 100 760 H-10 Z" fill="{hair}" opacity="0.75"/>` },
          { region: 'head.back', svg: `<path d="M-10 -10 H897 ${NAPE(760)} Z" fill="{hair}" opacity="0.75"/>` },
        ] },
        { id: 'original', label: 'Chanel', builtin: 'hair:original', layers: [TOP()] },
        // Ashley Campos's hairstyles (data/ashley.js, made by tools/import_ashley.py from Assets.psd)
        // (the face stays as it is: only the hair pieces, glued on top of it)
        // hairfx: the 'Espelhar lado' toggle under the row work on these pieces (app.js);
        // len: the Comprimento row picks the long / medium / short cut of the long hairs
        ...ASHLEY.hairs.map(h => ({ id: h.id, label: h.label, layers: tightHead().concat(h.layers.filter(l => l.region !== 'head.front').map(l => ({
          ...l, hairfx: l.region === 'hair.front' ? 'front' : 'back', ...(l.len ? { if: { comprimento: [l.len] } } : {}) }))) })),
        { id: 'coque', label: 'Coque', hide: ['cabelo_frente'], layers: tightHead().concat([
          { region: 'hair.back', svg: `<circle cx="447" cy="135" r="125" fill="{hair}" ${INK}/>
             <path d="M370 90 Q447 40 524 90 M350 160 Q447 230 544 160" fill="none" stroke="{hair-dark}" stroke-width="14"/>
             <path d="M250 240 Q447 330 644 240 L700 330 Q447 420 194 330 Z" fill="{hair}" ${INK}/>
             <rect x="370" y="230" width="154" height="40" rx="16" fill="{accent}" ${INK}/>` },
        ]) },
        { id: 'rabo', label: 'Rabo de cavalo', hide: ['cabelo_frente'], layers: tightHead().concat([
          { region: 'hair.back', svg: `<path d="M200 160 Q447 20 694 160 L700 330 Q447 420 194 330 Z" fill="{hair}" ${INK}/>
             <path d="M380 300 Q300 560 360 900 Q447 960 534 900 Q600 560 514 300 Z" fill="{hair}" ${INK}/>
             <path d="M447 340 Q420 600 447 900" fill="none" stroke="{hair-dark}" stroke-width="14"/>
             <rect x="380" y="280" width="134" height="50" rx="18" fill="{accent}" ${INK}/>` },
        ]) },
        { id: 'curto', label: 'Curto', hide: ['cabelo_frente', 'cabelo_tras'], layers: tightHead(HAIRLINE.bicos) },
      ],
    },
    {
      // the hairline on the forehead; "Do cabelo" keeps the one that comes with the hairstyle
      id: 'testa', label: 'Testa', section: 'Cabelo',
      options: [
        { id: 'auto', label: 'Do cabelo' },
        { id: 'livre', label: 'Livre', drop: ['hairline'] },
        { id: 'arco', label: 'Arco', drop: ['hairline'], layers: [{ region: 'head.front', z: 2, svg: HAIRLINE.arco }] },
        { id: 'bicos', label: 'Pontas', drop: ['hairline'], layers: [{ region: 'head.front', z: 2, svg: HAIRLINE.bicos }] },
        { id: 'ondas', label: 'Ondas', drop: ['hairline'], layers: [{ region: 'head.front', z: 2, svg: HAIRLINE.ondas }] },
        { id: 'reta', label: 'Reta', drop: ['hairline'], layers: [{ region: 'head.front', z: 2, svg: HAIRLINE.reta }] },
        { id: 'bico', label: 'Bico de viúva', drop: ['hairline'], layers: [{ region: 'head.front', z: 2, svg: HAIRLINE.bico }] },
      ],
    },
    {
      id: 'coat', label: 'Jaleco', section: 'Roupa', colors: ['coat'],
      options: [
        { id: 'nao', label: 'Sem jaleco', hide: ['jaleco'] },
        { id: 'sim', label: 'Com jaleco', layers: [
          { region: 'arms', z: 25, mask: 'head_sleeves', svg: `<rect x="-10" y="-10" width="780" height="870" fill="{coat}"/>` },
          { region: 'arms', z: 26, svg: CUFF }] },
      ],
      toggles: [{ id: 'jalecofechado', label: 'Jaleco fechado', showOn: ['sim'], layers: [
        // the whole front of the body (shirt and trousers down to the coat's hem) in the coat colour,
        // with the collar V, the closing line and buttons
        { region: 'body.all', z: 34, if: { coat: ['sim'] }, svg:
          `<path d="M186 325 H283.7 L386.6 521 L489.6 331 V325 H587 L756 1025 L728 1306 H45 L17 1025 Z" fill="{coat}"/>
           <path d="M283.7 331 L386.6 521 L489.6 331 M386.6 521 V1299.4 M52 1299.4 H721" fill="none" stroke="#1d1712" stroke-width="5"/>` +
          [600, 760, 920, 1080].map(y => `<circle cx="408" cy="${y}" r="13" fill="{coat-dark}" stroke="#1d1712" stroke-width="4"/>`).join('') },
        // with a skirt: its front panel (texture 3) is covered too, down to the coat's hem
        { rect: [3, 0, 0, 2024, 2024], z: 25, if: { coat: ['sim'], skirt: ['sim', 'curta'] }, svg:
          `<path d="M427 1172 L1013 1121 L1026 1352 L454 1402 Z" fill="{coat}"/>
           <path d="M721 1150 L740 1376 M454 1401 L1025 1351" fill="none" stroke="#1d1712" stroke-width="5"/>
           <circle cx="736" cy="1300" r="13" fill="{coat-dark}" stroke="#1d1712" stroke-width="4"/>` }] },
        { id: 'jalecocurta', label: 'Jaleco de manga curta', showOn: ['sim'], layers: [
        { region: 'arms', z: 27, if: { coat: ['sim'] }, svg: `<rect x="-10" y="330" width="780" height="600" fill="{skin}"/>` },
        { region: 'arms', z: 28, if: { coat: ['sim'] }, mask: 'head_sleeves', svg: `<path d="M-10 330 H780" stroke="#1d1712" stroke-width="7"/>` }] }],
    },
    {
      // necklines on the shirt front (front centre x 386, top edge y 331; the round neck is the built-in ellipse)
      id: 'gola', label: 'Gola', section: 'Roupa', showIf: { sleevecut: ['longa', 'curta', 'sem'] }, greyOut: true, greyNote: 'Alcinha e tomara que caia não têm gola',
      options: [
        { id: 'redonda', label: 'Redonda' },
        { id: 'u', label: 'Gola U', layers: [{ region: 'body.all', z: 30.5, if: { sleevecut: ['longa', 'curta', 'sem'] }, svg:
          `<path d="M298 300 V362 Q298 432 386 432 Q474 432 474 362 V300 Z" fill="{skin}" stroke="#1d1712" stroke-width="6"/>` }] },
        { id: 'v', label: 'Gola V', layers: [{ region: 'body.all', z: 30.5, if: { sleevecut: ['longa', 'curta', 'sem'] }, svg:
          `<ellipse cx="386" cy="331" rx="94" ry="42" fill="{shirt}"/><path d="M298 300 L386 470 L474 300 Z" fill="{skin}" stroke="#1d1712" stroke-width="6"/>` }] },
        { id: 'decoteu', label: 'Decote U', layers: [{ region: 'body.all', z: 30.5, if: { sleevecut: ['longa', 'curta', 'sem'] }, svg:
          `<path d="M268 300 Q268 506 386 506 Q504 506 504 300 Z" fill="{skin}" stroke="#1d1712" stroke-width="6"/>` }] },
        { id: 'decotev', label: 'Decote V', layers: [{ region: 'body.all', z: 30.5, if: { sleevecut: ['longa', 'curta', 'sem'] }, svg:
          `<ellipse cx="386" cy="331" rx="94" ry="42" fill="{shirt}"/><path d="M276 300 L386 540 L496 300 Z" fill="{skin}" stroke="#1d1712" stroke-width="6"/>` }] },
      ],
    },
    {
      id: 'skirt', label: 'Saia', section: 'Roupa', colors: ['skirt'],
      options: [
        { id: 'nao', label: 'Sem saia', hide: ['saia', 'saia_curta'] },
        { id: 'sim', label: 'Saia', hide: ['saia_curta'] },
        // 'saia_curta' is made in app.js from the skirt, shorter
        { id: 'curta', label: 'Saia curta', hide: ['saia'] },
      ],
      // pleats: alternate darker panels and fold lines on the skirt texture (texture 3)
      toggles: [{ id: 'plissada', label: 'Plissada', showOn: ['sim', 'curta'], layers: [{ rect: [3, 0, 0, 2024, 2024], z: 20, svg:
        `<path d="M1472 1152 L1568 1169 L1504 1547 L1412 1530 Z M1664 1186 L1761 1203 L1690 1580 L1597 1563 Z M1857 1220 L1954 1237 L1875 1613 L1782 1596 Z M1103 1123 L1194 1127 L1176 1508 L1105 1505 Z M1284 1131 L1375 1135 L1319 1514 L1248 1511 Z M161 1229 L250 1209 L333 1582 L263 1597 Z M339 1190 L427 1170 L472 1551 L402 1566 Z M525 1162 L622 1153 L659 1535 L565 1543 Z M720 1145 L817 1136 L846 1518 L753 1526 Z M915 1128 L1012 1119 L1034 1502 L940 1510 Z" fill="{skirt-dark}" opacity="0.35"/><path d="M1472 1152 L1412 1530 M1568 1169 L1504 1547 M1664 1186 L1597 1563 M1761 1203 L1690 1580 M1857 1220 L1782 1596 M1103 1123 L1105 1505 M1194 1127 L1176 1508 M1284 1131 L1248 1511 M161 1229 L263 1597 M250 1209 L333 1582 M339 1190 L402 1566 M525 1162 L565 1543 M622 1153 L659 1535 M720 1145 L753 1526 M817 1136 L846 1518 M915 1128 L940 1510" fill="none" stroke="#1d1712" stroke-width="4" opacity="0.7"/>` }] }],
    },
    {
      id: 'print', label: 'Camisa', section: 'Roupa', colors: ['shirt', 'print'],
      // the size slider under the row shrinks the drawings marked scaleBy: 'print' around their origin
      slider: { id: 'print', label: 'Tamanho', min: 50, max: 100, hideOn: ['lisa', 'listras'] },
      options: [
        { id: 'lisa', label: 'Lisa' },
        { id: 'atomo', label: 'Átomo', layers: [{ region: 'body.front', z: 12, scaleBy: 'print', origin: [361, 330], svg:
          `<g transform="translate(361 330)" fill="none" stroke="{print}" stroke-width="16">
             <ellipse rx="190" ry="70"/><ellipse rx="190" ry="70" transform="rotate(60)"/><ellipse rx="190" ry="70" transform="rotate(-60)"/></g>
           <circle cx="361" cy="330" r="34" fill="{print}"/>` }] },
        { id: 'estrela', label: 'Estrela', layers: [{ region: 'body.front', z: 12, scaleBy: 'print', origin: [361, 330], svg:
          `<path transform="translate(361 330) scale(1.6)" d="M0 -110 L30 -35 L110 -35 L45 15 L70 95 L0 45 L-70 95 L-45 15 L-110 -35 L-30 -35 Z" fill="{print}" ${INK}/>` }] },
        { id: 'frasco', label: 'Laboratório', layers: [{ region: 'body.front', z: 12, scaleBy: 'print', origin: [361, 330], svg:
          `<g transform="translate(361 330)" ${INK}>
             <path d="M-45 -170 H45 V-60 L130 120 Q140 160 100 160 H-100 Q-140 160 -130 120 L-45 -60 Z" fill="#ffffff"/>
             <path d="M-90 40 H90 L128 120 Q138 158 100 158 H-100 Q-138 158 -128 120 Z" fill="{print}"/>
             <circle cx="-10" cy="90" r="16" fill="#ffffff"/><circle cx="40" cy="60" r="10" fill="#ffffff"/></g>` }] },
        // mask: keep the stripes only where the shirt / sleeves are
        { id: 'listras', label: 'Listras', layers: [
          { region: 'body.all', z: 12, mask: 'body_shirt', svg: Array.from({ length: 12 }, (_, i) => `<rect x="-10" y="${330 + i * 70}" width="2044" height="30" fill="{print}"/>`).join('') },
          { region: 'arms', z: 12, mask: 'head_sleeves', svg: Array.from({ length: 12 }, (_, i) => `<rect x="-10" y="${30 + i * 70}" width="780" height="30" fill="{print}"/>`).join('') }] },
      ],
    },
    {
      // sleeves are the head_sleeves layer on the arms (texture 1); the hand end is at the bottom of the arms region
      id: 'sleevecut', label: 'Mangas', section: 'Roupa', colors: ['sleeves'],
      options: [
        { id: 'longa', label: 'Manga longa', layers: [{ region: 'arms', z: 21, svg: CUFF }] },
        // short sleeves: skin from the elbow down (no mask, so the long sleeve's cuff line goes too)
        { id: 'curta', label: 'Manga curta', layers: [{ region: 'arms', z: 20, svg:
          `<rect x="-10" y="330" width="780" height="600" fill="{skin}"/>` }, { region: 'arms', z: 21, mask: 'head_sleeves', svg: `<path d="M-10 330 H780" stroke="#1d1712" stroke-width="7"/>` }] },
        { id: 'sem', label: 'Sem manga', layers: [SKINARMS] },
        // straps: skin over the top of the shirt, two shirt-coloured straps front and back
        { id: 'alcinha', label: 'Alcinha', layers: [SKINARMS, { region: 'body.all', z: 20, mask: 'body_shirt', svg:
          `<rect x="-10" y="-10" width="2044" height="530" fill="{skin}"/>
           <path d="M-10 520 H2034" stroke="#1d1712" stroke-width="7"/>` +
          [385, 1144].map(c => [c - 150, c + 150].map(x => `<rect x="${x - 24}" y="-10" width="48" height="534" fill="{shirt}" stroke="#1d1712" stroke-width="6"/>`).join('')).join('') }, NECKLINE] },
        { id: 'tomara', label: 'Tomara que caia', layers: [SKINARMS, { region: 'body.all', z: 20, mask: 'body_shirt', svg:
          `<rect x="-10" y="-10" width="2044" height="560" fill="{skin}"/><path d="M-10 550 H2034" stroke="#1d1712" stroke-width="7"/>` }, NECKLINE] },
      ],
    },
    {
      id: 'shirtlen', label: 'Comprimento', section: 'Roupa',
      // navel piercing (only with the cropped shirt): a ball above the navel and a small gem below
      toggles: [{ id: 'umbigo', label: 'Piercing no umbigo', showOn: ['cropped'], layers: [{ region: 'body.all', z: 22, if: { shirtlen: ['cropped'] }, svg:
        `<circle cx="385" cy="856" r="9" fill="${METAL}" stroke="#1d1712" stroke-width="3"/><path d="M385 865 V880" stroke="${METAL}" stroke-width="5"/>
         <circle cx="385" cy="898" r="13" fill="${METAL}" stroke="#1d1712" stroke-width="4"/>` }] }],
      options: [
        { id: 'normal', label: 'Normal' },
        // cropped: belly (skin) between the shirt hem and the trousers, with a small navel on the front
        { id: 'cropped', label: 'Cropped', layers: [{ region: 'body.all', z: 21, mask: 'body_shirt', svg:
          `<rect x="-10" y="800" width="2044" height="160" fill="{skin}"/><path d="M-10 800 H2034" stroke="#1d1712" stroke-width="7"/>
           <path d="M372 872 Q385 904 398 872" fill="none" stroke="{skin-dark}" stroke-width="9" stroke-linecap="round"/>` }] },
      ],
    },
    {
      id: 'bottoms', label: 'Calça', section: 'Roupa', colors: ['pants'],
      options: [
        { id: 'comprida', label: 'Comprida' },
        { id: 'curta', label: 'Curta', layers: [{ region: 'body.all', z: 35, svg: legs(1415, 1415) }] },
        { id: 'bermuda', label: 'Bermuda', layers: [{ region: 'body.all', z: 35, svg: legs(1310, 1310) }] },
        // shorts: higher on the outside of the thigh, down to the crotch on the inside
        { id: 'shorts', label: 'Shorts', layers: [{ region: 'body.all', z: 35, svg: legs(1165, 1250) }] },
      ],
    },
    {
      id: 'belt', label: 'Cinto', section: 'Roupa', colors: ['belt'],
      // the belt band is texture 2 y 949-1026 all the way round; the buckle sits at x 300-472 (front centre)
      options: [
        { id: 'classico', label: 'Clássico', without: NOBUCKLE, layers: [{ region: 'body.all', z: 32, svg:
          `<rect x="303" y="934" width="166" height="82" rx="10" fill="#ababab" ${INK}/>` }] },
        { id: 'sem', label: 'Sem cinto', without: NOBUCKLE, layers: [NOBELT] },
        { id: 'fino', label: 'Cinto fino', without: NOBUCKLE, layers: [NOBELT, { region: 'body.all', z: 32, svg:
          `<rect x="-10" y="970" width="2044" height="34" fill="{belt}" stroke="#1d1712" stroke-width="6"/>
           <rect x="358" y="958" width="56" height="58" rx="10" fill="#c9c4bd" ${INK}/>` }] },
        { id: 'dourada', label: 'Fivela dourada', layers: [{ region: 'body.all', z: 32, svg:
          `<rect x="292" y="922" width="188" height="96" rx="18" fill="#e2b13c" ${INK}/><rect x="330" y="948" width="112" height="44" rx="10" fill="{belt}" ${INK}/>` }] },
        // drawn above the strap top and the cropped belly, so they always show
        { id: 'suspensorios', label: 'Suspensórios', without: NOBUCKLE, layers: [NOBELT, { region: 'body.all', z: 23, mask: 'body_shirt', svg:
          [385, 1144].map(c => `<path d="M${c - 130} 0 V960 M${c + 130} 0 V960" stroke="{belt}" stroke-width="40"/>
           <path d="M${c - 150} 0 V960 M${c - 110} 0 V960 M${c + 110} 0 V960 M${c + 150} 0 V960" stroke="#1d1712" stroke-width="5"/>`).join('') },
          { region: 'body.all', z: 33, svg: [255, 515].map(x => `<circle cx="${x}" cy="985" r="18" fill="#e2b13c" ${INK}/>`).join('') }] },
      ],
    },
    /* ---------- face: eyes, eyebrows, mouth (positions in head.front: eyes at 196 / 690, y 540; mouth at 444, 752) */
    {
      id: 'eyes', label: 'Olhos', section: 'Rosto', colors: ['eyes'],
      // small on/off tags under the row
      toggles: [{ id: 'cilios', label: 'Cílios', layers: [{ region: 'head.front', z: 30.8, svg: pair(
        `<path d="M-62 -72 L-84 -104 M-82 -50 L-112 -72 M-94 -22 L-128 -32" fill="none" stroke="#1d1712" stroke-width="10" stroke-linecap="round"/>`, 525) }] }],
      options: [
        { id: 'original', label: 'Clássicos', builtin: 'eyes:original' },
        { id: 'felizes', label: 'Felizes', layers: [{ region: 'head.front', z: 30.4, svg: pair(
          `<path d="M-72 25 Q0 -65 72 25" fill="none" stroke="#1d1712" stroke-width="20" stroke-linecap="round"/>`) }] },
      ],
    },
    {
      id: 'brows', label: 'Sobrancelhas', section: 'Rosto', colors: ['brows'],
      options: [
        { id: 'original', label: 'Naturais', builtin: 'brows:original' },
        { id: 'finas', label: 'Finas', layers: [{ region: 'head.front', z: 31, svg: pair(`<path d="M-80 12 Q0 -26 80 4" fill="none" stroke="{brows}" stroke-width="13" stroke-linecap="round"/>`, 310) }] },
        { id: 'grossas', label: 'Grossas', layers: [{ region: 'head.front', z: 31, svg: pair(`<path d="M-88 18 Q-10 -42 86 -6 Q84 16 72 20 Q-5 -8 -84 34 Z" fill="{brows}" stroke="{brows}" stroke-width="6" stroke-linejoin="round"/>`, 310) }] },
        { id: 'arqueadas', label: 'Arqueadas', layers: [{ region: 'head.front', z: 31, svg: pair(`<path d="M-84 26 Q-30 -46 80 2" fill="none" stroke="{brows}" stroke-width="20" stroke-linecap="round"/>`, 300) }] },
        { id: 'retas', label: 'Retas', layers: [{ region: 'head.front', z: 31, svg: pair(`<path d="M-78 0 H78" stroke="{brows}" stroke-width="26" stroke-linecap="round"/>`, 315) }] },
        { id: 'preocupadas', label: 'Preocupadas', layers: [{ region: 'head.front', z: 31, svg: pair(`<path d="M-78 14 L78 -26" stroke="{brows}" stroke-width="20" stroke-linecap="round"/>`, 310) }] },
        { id: 'bravas', label: 'Bravas', layers: [{ region: 'head.front', z: 31, svg: pair(`<path d="M-78 -22 L78 18" stroke="{brows}" stroke-width="22" stroke-linecap="round"/>`, 315) }] },
      ],
    },
    {
      id: 'mouth', label: 'Boca', section: 'Rosto', colors: ['lips'],
      options: [
        { id: 'original', label: 'Sorriso', builtin: 'mouth:original' },
        { id: 'aberto', label: 'Sorriso aberto', layers: [{ region: 'head.front', z: 32, svg:
          `<path d="M364 735 Q444 742 524 735 Q520 830 444 832 Q368 830 364 735 Z" fill="#7a1f2b" ${INK}/>
           <path d="M374 742 Q444 750 514 742 L508 766 Q444 774 380 766 Z" fill="#ffffff"/>
           <path d="M402 806 Q444 786 486 806 Q470 828 444 829 Q418 828 402 806 Z" fill="#e8737f"/>` }] },
        { id: 'surpresa', label: 'Surpresa', layers: [{ region: 'head.front', z: 32, svg: `<ellipse cx="444" cy="772" rx="36" ry="46" fill="#7a1f2b" ${INK}/>` }] },
        { id: 'lado', label: 'De lado', layers: [{ region: 'head.front', z: 32, svg: `<path d="M385 770 Q455 792 515 742" fill="none" stroke="#1d1712" stroke-width="12" stroke-linecap="round"/>` }] },
        { id: 'lingua', label: 'Língua', layers: [{ region: 'head.front', z: 32, svg:
          `<path d="M420 770 Q418 832 446 834 Q474 832 472 768 Z" fill="#e8737f" ${INK}/><path d="M368 745 Q444 802 520 745" fill="none" stroke="#1d1712" stroke-width="12" stroke-linecap="round"/>` }] },
        { id: 'serio', label: 'Séria', layers: [{ region: 'head.front', z: 32, svg: `<path d="M396 762 H492" stroke="#1d1712" stroke-width="12" stroke-linecap="round"/>` }] },
        { id: 'triste', label: 'Triste', layers: [{ region: 'head.front', z: 32, svg: `<path d="M388 790 Q444 738 500 790" fill="none" stroke="#1d1712" stroke-width="12" stroke-linecap="round"/>` }] },
        { id: 'labios', label: 'Batom', layers: [{ region: 'head.front', z: 32, svg:
          `<path d="M378 756 Q411 726 444 742 Q477 726 510 756 Q444 808 378 756 Z" fill="{lips}" ${INK}/><path d="M384 756 Q444 770 504 756" fill="none" stroke="#1d1712" stroke-width="6"/>` }] },
        // lipstick on a smile: corners turned up, the lips parted along a curve
        // lipstick on a smile: corners turned up, lips parted along a curve; the lower lip no fuller than the upper
        { id: 'batomsorriso', label: 'Batom sorrindo', layers: [{ region: 'head.front', z: 32, svg:
          `<path d="M370 740 Q402 732 423 741 Q444 734 465 741 Q486 732 518 740 Q498 784 444 786 Q390 784 370 740 Z" fill="{lips}" ${INK}/>` +
          `<path d="M376 745 Q444 770 512 745" fill="none" stroke="#1d1712" stroke-width="6" stroke-linecap="round"/>` +
          `<path d="M362 732 Q368 740 377 745 M526 732 Q520 740 511 745" fill="none" stroke="#1d1712" stroke-width="5" stroke-linecap="round"/>` +
          `<path d="M420 777 Q444 781 468 777" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="6" stroke-linecap="round"/>` }] },
      ],
    },
    {
      id: 'nose', label: 'Nariz', section: 'Rosto',
      options: [
        { id: 'sem', label: 'Sem nariz' },
        { id: 'c', label: 'Nariz A', layers: [{ region: 'head.front', z: 33, svg: `<path d="M478 592 Q412 600 414 646 Q416 692 478 700" fill="none" stroke="#1d1712" stroke-width="7" stroke-linecap="round"/>` }] },
        { id: 'seta', label: 'Nariz B', layers: [{ region: 'head.front', z: 33, svg: `<path d="M420 596 L476 646 L420 696" fill="none" stroke="#1d1712" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` }] },
        // round tip with two little nostrils
        { id: 'narinas', label: 'Nariz C', layers: [{ region: 'head.front', z: 33, svg: `<path d="M398 664 Q384 692 406 701 Q421 706 431 695 M488 664 Q502 692 480 701 Q465 706 455 695 M431 695 Q443 704 455 695" fill="none" stroke="#1d1712" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` }] },
        // small round bump
        { id: 'bolinha', label: 'Nariz D', layers: [{ region: 'head.front', z: 33, svg: `<path d="M418 690 Q420 652 443 652 Q466 652 468 690" fill="none" stroke="#1d1712" stroke-width="7" stroke-linecap="round"/>` }] },
      ],
    },
    {
      id: 'cheeks', label: 'Marcas', section: 'Rosto',
      // expression / age lines and other marks, each one on or off
      toggles: [
        { id: 'sorriso', label: 'Linhas do sorriso', layers: [{ region: 'head.front', z: 34, svg:
          `<path d="M344 676 Q314 716 324 772 M544 676 Q574 716 564 772" fill="none" stroke="{skin-dark}" stroke-width="7" stroke-linecap="round"/>` }] },
        { id: 'pegalinha', label: 'Pés de galinha', layers: [{ region: 'head.front', z: 34, svg:
          `<path d="M66 498 L30 482 M62 522 L24 522 M66 546 L30 562 M822 498 L858 482 M826 522 L864 522 M822 546 L858 562" fill="none" stroke="{skin-dark}" stroke-width="7" stroke-linecap="round"/>` }] },
        { id: 'testa', label: 'Linhas na testa', layers: [{ region: 'head.front', z: 34, svg:
          `<path d="M326 222 Q443 204 560 222 M346 254 Q443 238 540 254" fill="none" stroke="{skin-dark}" stroke-width="7" stroke-linecap="round"/>` }] },
        { id: 'olheiras', label: 'Olheiras', layers: [{ region: 'head.front', z: 34, svg:
          `<path d="M120 640 Q196 672 272 640 M614 640 Q690 672 766 640" fill="none" stroke="{skin-dark}" stroke-width="7" stroke-linecap="round" opacity="0.7"/>` }] },
      ],
      options: [
        { id: 'simples', label: 'Sem marcas' },
        { id: 'bochechas', label: 'Rosadas', layers: [{ region: 'head.front', z: 35, svg:
          `<g fill="#f07a8a" opacity="0.5"><ellipse cx="160" cy="705" rx="80" ry="45"/><ellipse cx="726" cy="705" rx="80" ry="45"/></g>` }] },
        { id: 'sardas', label: 'Sardas', layers: [{ region: 'head.front', z: 35, svg:
          `<g fill="{skin-dark}">${[[120, 690], [160, 720], [200, 690], [140, 745], [185, 752], [686, 690], [726, 720], [766, 690], [701, 750], [746, 752]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11"/>`).join('')}</g>` }] },
        { id: 'covinhas', label: 'Covinhas', layers: [{ region: 'head.front', z: 35, svg:
          `<path d="M318 742 Q324 760 316 774 M570 742 Q564 760 572 774" fill="none" stroke="{skin-dark}" stroke-width="7" stroke-linecap="round"/>` }] },
        { id: 'pinta', label: 'Pinta', layers: [{ region: 'head.front', z: 35, svg: `<circle cx="590" cy="735" r="13" fill="{skin-dark}"/>` }] },
      ],
    },
    /* ---------- accessories */
    {
      id: 'glasses', label: 'Óculos', section: 'Acessórios', colors: ['glasses'],
      options: [
        { id: 'nenhum', label: 'Sem óculos' },
        { id: 'redondo', label: 'Redondos', layers: glasses(
          `<circle r="135" fill="#ffffff" fill-opacity="0.16" stroke="{accent}" stroke-width="24"/>`, `<path d="M331 525 Q443 465 555 525" fill="none" stroke="{accent}" stroke-width="20"/>`, 135) },
        { id: 'quadrado', label: 'Quadrados', layers: glasses(
          `<rect x="-140" y="-112" width="280" height="224" rx="40" fill="#ffffff" fill-opacity="0.16" stroke="{accent}" stroke-width="26"/>`, `<path d="M336 510 Q443 460 550 510" fill="none" stroke="{accent}" stroke-width="22"/>`, 140) },
        { id: 'gatinho', label: 'Gatinho', layers: glasses(
          `<path d="M-150 -95 Q-60 -110 115 -80 Q140 -20 110 50 Q40 120 -60 100 Q-140 70 -150 -95 Z" fill="#ffffff" fill-opacity="0.16" stroke="{accent}" stroke-width="24" stroke-linejoin="round"/>
           <path d="M-150 -95 L-175 -130" stroke="{accent}" stroke-width="24" stroke-linecap="round"/>`, `<path d="M306 470 Q443 430 580 470" fill="none" stroke="{accent}" stroke-width="22"/>`, 145) },
        { id: 'coracao', label: 'Coração', layers: glasses(
          `<path d="M0 120 C-60 70 -150 20 -140 -50 C-130 -115 -45 -125 0 -60 C45 -125 130 -115 140 -50 C150 20 60 70 0 120 Z" fill="#ff8fb3" fill-opacity="0.35" stroke="{accent}" stroke-width="22" stroke-linejoin="round"/>`,
          `<path d="M336 480 Q443 440 550 480" fill="none" stroke="{accent}" stroke-width="20"/>`, 140) },
        { id: 'sol', label: 'De sol', layers: glasses(
          `<path d="M-145 -80 H145 Q150 60 60 95 Q0 110 -60 95 Q-150 60 -145 -80 Z" fill="#20222e" fill-opacity="0.88" stroke="{accent}" stroke-width="18" stroke-linejoin="round"/>
           <path d="M-90 -50 L-40 -50" stroke="#ffffff" stroke-opacity="0.6" stroke-width="14" stroke-linecap="round"/>`, `<path d="M341 470 H545" stroke="{accent}" stroke-width="24"/>`, 145) },
        { id: 'meiaarmacao', label: 'Meia armação', layers: glasses(
          `<path d="M-135 -60 Q0 -100 135 -60" fill="none" stroke="{accent}" stroke-width="34" stroke-linecap="round"/>
           <path d="M-135 -60 Q-140 60 -60 95 Q0 110 60 95 Q140 60 135 -60" fill="#ffffff" fill-opacity="0.12" stroke="{accent}" stroke-width="6"/>`, `<path d="M331 470 Q443 440 555 470" fill="none" stroke="{accent}" stroke-width="20"/>`, 135) },
      ],
    },
    {
      id: 'headwear', label: 'Na cabeça', section: 'Acessórios', colors: ['headwear'],
      options: [
        { id: 'nada', label: 'Nada' },
        { id: 'tiara', label: 'Tiara', layers: [
          { region: 'head.top', z: 40, svg: `<path d="M-10 470 H600" stroke="{accent}" stroke-width="46"/>` },
          { region: 'head.side', z: 40, svg: `<path d="M470 -10 V300" stroke="{accent}" stroke-width="46" stroke-linecap="round"/>` }] },
        { id: 'flor', label: 'Flor', layers: [
          { region: 'head.side', z: 40, svg: `<g transform="translate(470 170)">${flower(55)}</g>` },
          { region: 'hair.front', z: 40, svg: `<g transform="translate(860 230)">${flower(70)}</g>` }] },
        { id: 'laco', label: 'Laço', layers: [
          { region: 'head.side', z: 40, svg: `<g transform="translate(470 175) scale(0.85)"><path d="M0 0 L-120 -60 L-120 60 Z M0 0 L120 -60 L120 60 Z" fill="{accent}" ${INK}/><circle r="34" fill="{accent}" ${INK}/></g>` }] },
        // pieces drawn on the front hair plane stick out above the head; show: makes sure that plane is printed
        { id: 'coroa', label: 'Coroa de flores', show: ['cabelo_frente'], layers: [
          { region: 'hair.front', z: 45, svg: [190, 290, 400, 518, 636, 746, 846].map((x, i) =>
              `<g transform="translate(${x} ${175 - Math.sin(i / 6 * Math.PI) * 45}) scale(${i % 2 ? 0.75 : 0.95})">${flower(60, i % 2 ? '#ffffff' : '{accent}')}</g>`).join('') },
          { region: 'head.side', z: 40, svg: `<g transform="translate(560 90) scale(0.8)">${flower(55)}</g><g transform="translate(250 70) scale(0.6)">${flower(55, '#ffffff')}</g>` },
          { region: 'head.back', z: 40, svg: [150, 443, 736].map(x => `<g transform="translate(${x} 80) scale(0.7)">${flower(55)}</g>`).join('') }] },
      ],
    },
    {
      id: 'neck', label: 'No pescoço', section: 'Acessórios', colors: ['neck'],
      options: [
        { id: 'nada', label: 'Nada' },
        { id: 'perolas', label: 'Colar de pérolas', layers: [{ region: 'body.front', z: 38, svg:
          Array.from({ length: 13 }, (_, i) => { const t = i / 12, x = 225 + 272 * t, y = 120 * Math.sin(t * Math.PI); return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="17" fill="#fbf7ef" stroke="#1d1712" stroke-width="5"/>`; }).join('') }] },
        { id: 'pingente', label: 'Pingente', layers: [{ region: 'body.front', z: 38, svg:
          `<path d="M225 0 Q361 230 497 0" fill="none" stroke="#c9a227" stroke-width="10"/>
           <path d="M361 125 l38 50 l-38 55 l-38 -55 z" fill="{accent}" ${INK}/>` }] },
        // round medallion on a long thin cord (added 2026-11-23 for the doll made from a photo)
        { id: 'medalhao', label: 'Medalhão', layers: [{ region: 'body.front', z: 38, svg:
          `<path d="M232 0 L355 250 M490 0 L367 250" fill="none" stroke="#3a2a2a" stroke-width="7" stroke-linecap="round"/>
           <circle cx="361" cy="292" r="46" fill="{accent}" ${INK}/>
           <circle cx="361" cy="292" r="24" fill="none" stroke="{accent-dark}" stroke-width="8"/>` }] },
        { id: 'estetoscopio', label: 'Estetoscópio', layers: [{ region: 'body.front', z: 38, svg: STETH },
          // the only accessory worn OVER the third piece: the same drawing again on the coat's two front panels
          // (texture 3; panel = body.front moved, both 1.044 x 1.039 bigger), each clipped to its own panel
          { rect: [3, 0, 0, 2024, 2024], z: 39, if: { coat: ['sim', 'blazer', 'jaqueta', 'colete'] }, svg:
            `<defs><clipPath id="stethB"><path d="M214 46 H310 L238 767 H24 Z"/></clipPath><clipPath id="stethA"><path d="M342 46 H438 L630 767 H414 Z"/></clipPath></defs>` +
            [['stethB', 214], ['stethA', 30]].map(([id, x0]) => `<g clip-path="url(#${id})"><g transform="translate(${(x0 - 166 * 1.0444).toFixed(1)} 46) scale(1.0444 1.0394)">${STETH}</g></g>`).join('') }] },
        { id: 'cracha', label: 'Crachá', layers: [{ region: 'body.front', z: 38, svg:
          `<path d="M230 0 L330 230 M492 0 L392 230" stroke="{accent}" stroke-width="18"/>
           <rect x="291" y="220" width="140" height="180" rx="14" fill="#ffffff" ${INK}/>
           <rect x="311" y="245" width="100" height="70" rx="8" fill="{accent}"/><path d="M311 340 H411 M311 370 H385" stroke="#1d1712" stroke-width="12" stroke-linecap="round"/>` }] },
      ],
    },
    {
      // wrist watch on ONE wrist (left or right, never both); the dial is on the outer face of the arm
      id: 'wrist', label: 'Relógio', section: 'Acessórios', colors: ['wrist'], sides: true, noBoth: true, sideDefault: 'esq',
      options: [
        { id: 'nada', label: 'Sem relógio' },
        { id: 'relogio', label: 'Relógio', layers: ARM(RING(-35, 30) +
          `<circle cx="460" cy="550" r="40" fill="#b9bec6" stroke="#1d1712" stroke-width="5"/>
           <circle cx="460" cy="550" r="28" fill="#ffffff" stroke="#1d1712" stroke-width="3"/>
           <path d="M460 550 V530 M460 550 L474 556" stroke="#1d1712" stroke-width="5" stroke-linecap="round"/>`) },
      ],
    },
    {
      // bracelets just above the watch, on one arm or both
      id: 'bracelet', label: 'Pulseira', section: 'Acessórios', colors: ['bracelet'], sides: true,
      options: [
        { id: 'nenhuma', label: 'Sem pulseira' },
        { id: 'fina', label: 'Pulseira fina', layers: ARM(RING(-95, 12), 31) },
        { id: 'grossa', label: 'Pulseira grossa', layers: ARM(RING(-100, 36), 31) },
        { id: 'tripla', label: 'Pulseira tripla', layers: ARM(RING(-80, 10) + RING(-105, 10) + RING(-130, 10), 31) },
      ],
    },
    {
      // gloves: the hand (everything below the cuff line) in the glove colour
      id: 'gloves', label: 'Luvas', section: 'Acessórios', colors: ['gloves'],
      options: [
        { id: 'sem', label: 'Sem luvas' },
        { id: 'com', label: 'Com luvas', layers: [{ region: 'arms', z: 29, svg:
          `<path d="M-10 554 L18 555 L210 562 L375 587 L545 587 L718 558 L770 557 V870 H-10 Z" fill="{gloves}"/>
           <path d="${BAND(8)}" fill="none" stroke="{gloves-dark}" stroke-width="10"/>
           <path d="${BAND(0)}" fill="none" stroke="#1d1712" stroke-width="6" stroke-linejoin="round"/>` }] },
      ],
    },
    {
      id: 'earrings', label: 'Brincos', section: 'Acessórios', colors: ['earrings'], sides: true,
      options: [
        { id: 'nenhum', label: 'Sem brincos' },
        { id: 'argola', label: 'Argolas', layers: EAR(`<circle cx="332" cy="586" r="30" fill="none" stroke="{accent}" stroke-width="12"/>`) },
        { id: 'bolinha', label: 'Bolinhas', layers: EAR(`<circle cx="330" cy="550" r="20" fill="{accent}" ${INK}/>`) },
        { id: 'estrela', label: 'Estrelas', layers: EAR(`<path transform="translate(332 566) scale(0.26)" d="M0 -110 L30 -35 L110 -35 L45 15 L70 95 L0 45 L-70 95 L-45 15 L-110 -35 L-30 -35 Z" fill="{accent}" stroke="#1d1712" stroke-width="20" stroke-linejoin="round"/>`) },
        { id: 'pena', label: 'Pena', layers: EAR(`<circle cx="332" cy="558" r="9" fill="#c9a227"/><g transform="translate(332 564) scale(0.38) rotate(180)">${feather(0)}</g>`) },
      ],
    },
    {
      // the back pockets are drawn in the base art (texture 2, x 846-1020 and 1246-1420, y 1046-1174)
      id: 'pockets', label: 'Bolsos', section: 'Acessórios',
      options: [
        { id: 'com', label: 'Com bolsos' },
        { id: 'sem', label: 'Sem bolsos', layers: [{ region: 'body.all', z: 31, svg: `<rect x="836" y="1040" width="194" height="142" fill="{pants}"/><rect x="1236" y="1040" width="194" height="142" fill="{pants}"/>` }] },
      ],
    },
    {
      id: 'piercing', label: 'Piercing orelha', section: 'Acessórios', sides: true,
      options: [
        { id: 'nenhum', label: 'Sem piercing' },
        // an industrial bar shown only by its two balls, one each side of the top of the ear
        { id: 'barra', label: 'Barra', layers: EAR(`<circle cx="296" cy="372.5" r="12" fill="${METAL}" stroke="#1d1712" stroke-width="4"/><circle cx="442" cy="349.5" r="12" fill="${METAL}" stroke="#1d1712" stroke-width="4"/>`, 41) },
        { id: 'argolinha', label: 'Argolinha', layers: EAR(`<circle cx="312" cy="356" r="15" fill="none" stroke="#c9a227" stroke-width="7"/>`, 41) },
      ],
    },
    {
      // eyebrow piercing at the outer end of the brow (doll's right brow ends near x 110, left near 776)
      id: 'browpiercing', label: 'Piercing sobrancelha', section: 'Acessórios', sides: true, sideDefault: 'esq',
      options: [
        { id: 'nenhum', label: 'Sem piercing' },
        { id: 'argola', label: 'Argola', layers: FACE2(k => { const x = 443 - k * 333; return `<path d="M${x} 296 A30 30 0 1 ${k > 0 ? 0 : 1} ${x} 356" fill="none" stroke="${METAL}" stroke-width="9" stroke-linecap="round"/>`; }) },
        { id: 'bolinhas', label: 'Bolinhas', layers: FACE2(k => { const x = 443 - k * 330; return `<circle cx="${x}" cy="296" r="11" fill="${METAL}" stroke="#1d1712" stroke-width="4"/><circle cx="${x}" cy="356" r="11" fill="${METAL}" stroke="#1d1712" stroke-width="4"/>`; }) },
      ],
    },
    {
      // nose piercings: septum (centred) or on the doll's left nostril (ring or stud)
      id: 'nosepiercing', label: 'Piercing nariz', section: 'Acessórios',
      options: [
        { id: 'nenhum', label: 'Sem piercing' },
        { id: 'septo', label: 'Septo', layers: [{ region: 'head.front', z: 41, svg: `<path d="M420 694 A23 23 0 0 0 466 694" fill="none" stroke="${METAL}" stroke-width="8" stroke-linecap="round"/><circle cx="420" cy="694" r="7" fill="${METAL}"/><circle cx="466" cy="694" r="7" fill="${METAL}"/>` }] },
        { id: 'argola', label: 'Argola', layers: [{ region: 'head.front', z: 41, svg: `<path d="M485 668 A20 20 0 1 1 487 706" fill="none" stroke="${METAL}" stroke-width="7" stroke-linecap="round"/>` }] },
        { id: 'bolinha', label: 'Bolinha', layers: [{ region: 'head.front', z: 41, svg: `<circle cx="487" cy="680" r="10" fill="${METAL}" stroke="#1d1712" stroke-width="3"/>` }] },
      ],
    },
  ];

  /* ---------- fonts for the name on the base (the text is always centred) */
  const nameFonts = [
    { id: 'baloo', label: 'Arredondada', css: '700 {size}px "Baloo 2"' },
    { id: 'estreita', label: 'Estreita (nomes longos)', css: '600 {size}px "Roboto Condensed"' },
    { id: 'fina', label: 'Fina', css: '300 {size}px "Nunito Sans"' },
    { id: 'simples', label: 'Simples', css: '700 {size}px "Nunito Sans"' },
    { id: 'manuscrita', label: 'Manuscrita', css: '400 {size}px "Patrick Hand"' },
    { id: 'cursiva', label: 'Cursiva', css: '400 {size}px "Pacifico"' },
  ];

  // the other eyes and eyebrows first cover the book's ones with skin (no trace of them is left)
  for (const o of slots.find(sl => sl.id === 'eyes').options) if (!o.builtin)
    o.layers = [{ region: 'head.front', z: 29.5, svg: [196, 690].map(x => `<ellipse cx="${x}" cy="522" rx="104" ry="136" fill="{skin}"/>`).join('') }].concat(o.layers || []);
  for (const o of slots.find(sl => sl.id === 'brows').options) if (!o.builtin)
    o.layers = [{ region: 'head.front', z: 29.6, svg: [196, 690].map(x => `<ellipse cx="${x}" cy="311" rx="104" ry="26" fill="{skin}"/>`).join('') }].concat(o.layers || []);
  // the other mouths first cover the book's smile with skin (no trace of it is left)
  for (const o of slots.find(sl => sl.id === 'mouth').options) if (!o.builtin)
    o.layers = [{ region: 'head.front', z: 31, svg: `<ellipse cx="444" cy="752" rx="112" ry="46" fill="{skin}"/>` }].concat(o.layers || []);
  // colour-only rows
  // VOL2-BEGIN
  /* ---------- Volume 2 additions (2026-11-23): pieces made for the dolls of the Volume 2 scientists.
     Drawn in Ashley Campos's way (flat colour, dark outline, a light strip along one edge, a few inner
     strand lines), kept simple to cut. */
  const V2 = (() => {
    const LINE = '#1d1712';
    // Ashley's hair layers, used the same way as in the hair row above
    const ashleyLayers = id => {
      const h = ASHLEY.hairs.find(x => x.id === id); if (!h) return [];
      return h.layers.filter(l => l.region !== 'head.front').map(l => ({ ...l, hairfx: l.region === 'hair.front' ? 'front' : 'back' }));
    };
    // one feather pointing up from (0,0): fill, darker tip, light strip, quill
    const pena = (L, w, fill, tip) => {
      const body = `M0 0 C${-w * 0.95} ${-L * 0.22} ${-w} ${-L * 0.72} 0 ${-L} C${w} ${-L * 0.72} ${w * 0.95} ${-L * 0.22} 0 0 Z`;
      const t = `M${-w * 0.74} ${-L * 0.8} Q0 ${-L * 0.72} ${w * 0.74} ${-L * 0.8} C${w * 0.6} ${-L * 0.9} ${w * 0.3} ${-L * 0.97} 0 ${-L} C${-w * 0.3} ${-L * 0.97} ${-w * 0.6} ${-L * 0.9} ${-w * 0.74} ${-L * 0.8} Z`;
      return `<path d="${body}" fill="${fill}"/>` + (tip ? `<path d="${t}" fill="${tip}"/>` : '') +
        `<path d="M${-w * 0.5} ${-L * 0.18} Q${-w * 0.78} ${-L * 0.5} ${-w * 0.36} ${-L * 0.76}" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="10" stroke-linecap="round"/>` +
        `<path d="M0 -6 V${-L * 0.93}" stroke="${LINE}" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="${body}" fill="none" stroke="${LINE}" stroke-width="9" stroke-linejoin="round"/>`;
    };
    // the cocar: a woven band (arumã basketry pattern) with a fan of feathers, on the FRONT hair piece
    const cocar = (() => {
      const top = x => { const u = (x - 518) / 340; return 178 - 22 * (1 - u * u); };
      let feathers = '';
      const n = 9;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) * 2 - 1, x = 518 + u * 300, big = i % 2 === 0;
        const L = (big ? 330 : 290) - 40 * u * u, ang = u * 26;
        feathers += `<g transform="translate(${x.toFixed(0)} ${(top(x) + 40).toFixed(0)}) rotate(${ang.toFixed(1)})">${big ? pena(L, 60, '{accent}', LINE) : pena(L, 54, '#f2c230', '{accent}')}</g>`;
      }
      const xs = [], step = 30; for (let x = 178; x <= 858; x += step) xs.push(x);
      const band = `M178 ${top(178)} ` + xs.map(x => `L${x} ${top(x).toFixed(1)}`).join(' ') + ` L858 ${top(858) + 92} ` +
        xs.slice().reverse().map(x => `L${x} ${(top(x) + 92).toFixed(1)}`).join(' ') + ' Z';
      // zigzag of dark triangles, like the woven arumã baskets
      let zig = '';
      for (let x = 196; x < 840; x += 44) {
        const a = top(x) + 22, b = top(x + 44) + 22;
        zig += `M${x} ${(a + 48).toFixed(1)} L${x + 22} ${(a + (b - a) / 2).toFixed(1)} L${x + 44} ${(b + 48).toFixed(1)} Z `;
      }
      return feathers +
        `<path d="${band}" fill="#e6b45c"/>` +
        `<path d="${zig}" fill="${LINE}"/>` +
        `<path d="M184 ${(top(184) + 12).toFixed(1)} ` + xs.map(x => `L${x} ${(top(x) + 12).toFixed(1)}`).join(' ') + `" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="8" stroke-linecap="round"/>` +
        `<path d="${band}" fill="none" stroke="${LINE}" stroke-width="9" stroke-linejoin="round"/>`;
    })();
    return { ashleyLayers, cocar, pena };
  })();
  {
    const hair = slots.find(s => s.id === 'hair');
    // Francy Baniwa: Ashley's long straight hair with a cocar drawn INTO the front hair piece (it is a hairstyle, not an accessory);
    // its feathers take the hair row's second colour
    hair.options.push({ id: 'cocar', label: 'Longo liso com cocar', layers: tightHead().concat(V2.ashleyLayers('longoliso'), [{ region: 'hair.front', z: 25, svg: V2.cocar }]) });
  }
  {
    const slot = id => slots.find(s => s.id === id);
    // pseudo-random numbers that are the same every time (the prints must look the same on every computer)
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    // Testa: hair parted in the middle and combed to the sides (Enedina, Sonja, Nise)
    HAIRLINE.risca = `<path d="M436 -10 V112 Q300 128 190 220 Q90 300 -10 318 V-10 Z M450 -10 V112 Q586 128 696 220 Q796 300 897 318 V-10 Z" fill="{hair}" ${INK}/>` +
      `<path d="M400 60 Q280 100 160 200 M410 20 Q300 50 200 120 M486 60 Q606 100 726 200 M476 20 Q586 50 686 120" fill="none" stroke="{hair-dark}" stroke-width="9" stroke-linecap="round"/>`;
    slot('testa').options.push({ id: 'risca', label: 'Risca no meio', drop: ['hairline'], layers: [{ region: 'head.front', z: 2, svg: HAIRLINE.risca }, { ...RISCA_SIDE, tag: undefined }] });

    // Coque baixo: hair combed back to a bun at the nape (1940s), parted in the middle
    slot('hair').options.push({ id: 'coquebaixo', label: 'Coque baixo', hide: ['cabelo_frente'], layers: tightHead(HAIRLINE.risca).concat([RISCA_SIDE], [
      { region: 'hair.back', svg: `<ellipse cx="447" cy="700" rx="150" ry="118" fill="{hair}" ${INK}/>
         <path d="M340 660 Q447 600 554 660 M330 720 Q447 670 564 720 M360 775 Q447 745 534 775" fill="none" stroke="{hair-dark}" stroke-width="12" stroke-linecap="round"/>
         <path d="M350 640 Q380 610 420 600" fill="none" stroke="{hair-light}" stroke-width="12" stroke-linecap="round"/>
         <path d="M330 590 Q447 560 564 590" fill="none" stroke="{accent}" stroke-width="22" stroke-linecap="round"/>` },
    ]) });

    // Gola: pointed shirt collar with a button placket (Enedina, Sonja, Nise)
    const flap = `M386 358 L304 316 Q288 330 294 348 L336 440 Q362 402 386 358 Z`;
    slot('gola').options.push({ id: 'colarinho', label: 'Colarinho', layers: [{ region: 'body.all', z: 30.5, if: { sleevecut: ['longa', 'curta', 'sem'] }, svg:
      `<path d="M386 362 V930" stroke="#1d1712" stroke-width="6"/>` + [480, 600, 720, 840].map(y => `<circle cx="400" cy="${y}" r="10" fill="{shirt-light}" stroke="#1d1712" stroke-width="5"/>`).join('') +
      `<path d="${flap}" fill="{shirt}" ${INK}/><path d="${flap}" transform="translate(772 0) scale(-1 1)" fill="{shirt}" ${INK}/>` +
      `<path d="M318 340 Q330 380 346 410" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="8" stroke-linecap="round"/>` +
      `<path d="M1052 318 Q1140 300 1228 318 L1222 352 Q1140 336 1058 352 Z" fill="{shirt}" ${INK}/>` }] });

    // No pescoço: bow tie (Enedina's graduation photo)
    slot('neck').options.push({ id: 'gravata', label: 'Gravata borboleta', layers: [{ region: 'body.front', z: 38, svg:
      `<g transform="translate(361 46)"><path d="M0 0 L-82 -42 Q-96 0 -82 42 Z M0 0 L82 -42 Q96 0 82 42 Z" fill="{accent}" ${INK}/>
         <path d="M-66 -24 Q-74 0 -66 24 M66 -24 Q74 0 66 24" fill="none" stroke="{accent-dark}" stroke-width="7" stroke-linecap="round"/>
         <rect x="-22" y="-22" width="44" height="44" rx="10" fill="{accent}" ${INK}/></g>` }] });

    // Camisa: all-over prints (on the shirt and the sleeves, like Listras)
    const allOver = (bodySvg, armSvg) => [{ region: 'body.all', z: 12, mask: 'body_shirt', svg: bodySvg }, { region: 'arms', z: 12, mask: 'head_sleeves', svg: armSvg }];
    const scatter = (x0, x1, y0, y1, step, draw) => { let s = ''; for (let y = y0; y < y1; y += step) for (let x = x0 + ((y / step) % 2) * step / 2; x < x1; x += step) s += draw(x + (rnd() - 0.5) * step * 0.5, y + (rnd() - 0.5) * step * 0.5, rnd()); return s; };
    // onça (animal spots, Niède Guidon's blouse): broken rings of {print}
    const spot = (x, y, r) => { const a = (r * 360).toFixed(0), s = 1.4 + r * 0.6;
      return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${a}) scale(${s.toFixed(2)})"><ellipse rx="17" ry="14" fill="{print}" opacity="0.3"/>` +
        `<path d="M-30 -4 Q-34 -26 -12 -30 Q-8 -18 -18 -6 Z M2 -32 Q30 -30 32 -6 Q18 -8 6 -20 Z M30 8 Q26 30 4 32 Q4 20 18 10 Z M-8 32 Q-32 28 -32 10 Q-20 12 -10 20 Z" fill="{print}"/></g>`; };
    seed = 7; const oncaB = scatter(-10, 2040, 320, 960, 125, spot), oncaA = scatter(-10, 780, -10, 860, 125, spot);
    // florzinhas (Sonja Ashauer's blouse): small five-petal flowers with a yellow centre
    const flor = (x, y, r) => `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${(r * 72).toFixed(0)}) scale(${(0.8 + r * 0.3).toFixed(2)})">` +
      [0, 72, 144, 216, 288].map(a => `<ellipse cx="13" rx="13" ry="9" transform="rotate(${a})" fill="{print}"/>`).join('') + `<circle r="7" fill="#f2c230"/></g>`;
    seed = 11; const florB = scatter(-10, 2040, 320, 960, 80, flor), florA = scatter(-10, 780, -10, 860, 80, flor);
    // geométrica (knitted / embroidered bands: Johanna Döbereiner's sweater, Bertha Lutz's dress)
    const band = (y, w) => { let z = `M-10 ${y + 40}`; for (let x = -10; x < w; x += 50) z += ` L${x + 25} ${y + 10} L${x + 50} ${y + 40}`;
      return `<rect x="-10" y="${y}" width="${w + 20}" height="50" fill="{print}" opacity="0.35"/><path d="M-10 ${y} H${w + 10} M-10 ${y + 50} H${w + 10}" stroke="{print}" stroke-width="7"/><path d="${z}" fill="none" stroke="{print}" stroke-width="7" stroke-linejoin="round"/>`; };
    const pr = slot('print');
    pr.options.push(
      { id: 'onca', label: 'Onça', layers: allOver(oncaB, oncaA) },
      { id: 'florzinhas', label: 'Florzinhas', layers: allOver(florB, florA) },
      { id: 'geometrica', label: 'Faixas geométricas', layers: allOver([400, 600, 800].map(y => band(y, 2024)).join(''), [120, 320, 520].map(y => band(y, 760)).join('')) });
    pr.slider.hideOn.push('onca', 'florzinhas', 'geometrica');
  }
  /* ---------- Volume 2, second round (2026-11-24): more hairstyles in Ashley's way, the overcoat, the scarf
     (Afro curto and Ondas curtas were tried and removed at the user's request; their drawings stay in H2 unused) */
  {
    const slot = id => slots.find(s => s.id === id);
    const K = '#1d1712';
    let hid = 0;
    // a symmetric hair piece from its LEFT half (drawn left of the centre line cx): flat {hair}, light strips
    // and darker shading kept inside the shape, a few strand lines, the dark outline; the centre seam is
    // not outlined (a thin parting line can be added with `part`)
    const sym = (cx, half, { light = '', dark = '', lines = '', part = '' } = {}) => {
      const id = 'h2c' + (++hid), M = `translate(${2 * cx} 0) scale(-1 1)`;
      const both = d => `<path d="${d}"/><path d="${d}" transform="${M}"/>`;
      const both2 = (d, a) => `<path d="${d}" ${a}/><path d="${d}" transform="${M}" ${a}/>`;
      return `<defs><clipPath id="${id}">${both(half + ' Z')}</clipPath></defs>` +
        `<g fill="{hair}">${both(half + ' Z')}</g>` +
        `<g clip-path="url(#${id})">` +
          (dark ? both2(dark, 'fill="{hair-dark}" opacity="0.55"') : '') +
          (light ? both2(light, 'fill="none" stroke="#ffffff" stroke-opacity="0.38" stroke-width="18" stroke-linecap="round"') : '') +
          (lines ? both2(lines, `fill="none" stroke="${K}" stroke-width="5" stroke-linecap="round"`) : '') +
          (part ? `<path d="${part}" fill="none" stroke="${K}" stroke-width="5" stroke-linecap="round"/>` : '') +
        `</g>` + both2(half, `fill="none" stroke="${K}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"`);
    };
    const front = svg => ({ region: 'hair.front', z: 20, svg });
    const back = svg => ({ region: 'hair.back', z: 20, svg });
    const H2 = {};

    // Chanel liso: Liso curto made straight and symmetric, both sides curving IN under the chin (Bertha Lutz)
    H2.chanel = [
      front(sym(518, `M518 96 C330 96 168 176 150 360 C140 470 136 570 142 640 C150 712 210 748 282 744 C318 742 344 730 360 708 C330 716 292 708 268 682 C240 640 232 560 232 470 C232 380 318 286 518 262`, {
        dark: `M232 470 C232 380 318 286 518 262 V320 C340 330 270 400 262 480 C258 580 266 650 300 700 C250 700 228 640 232 470 Z`,
        light: `M210 230 C176 290 168 400 170 520 M300 150 C380 118 450 112 500 112`,
        lines: `M330 190 C270 250 250 330 246 420 M196 470 C192 560 196 640 230 700`,
        part: `M518 104 V254` })),
      back(sym(447.5, `M447.5 80 C260 80 120 170 104 360 C96 470 98 590 112 670 C128 740 200 768 280 756 C330 750 360 730 372 712 C400 738 425 752 447.5 752`, {
        dark: `M112 640 C150 700 230 730 300 720 C340 716 370 700 380 690 L447.5 700 V752 C420 752 400 738 372 712 C330 760 150 770 112 670 Z`,
        light: `M180 230 C150 300 142 400 146 520 M300 120 C360 100 420 96 440 96`,
        lines: `M300 200 C250 300 240 450 260 620 M400 250 C380 400 380 550 400 690 M180 420 C176 520 180 600 200 660` })),
    ];
    slot('hair').options.push({ id: 'chanelliso', label: 'Chanel liso', layers: tightHead(HAIRLINE.risca).concat([RISCA_SIDE], H2.chanel) });

    // a puffy hair piece (curly / wavy): outer outline, the face hole taken out, curl marks inside
    let pid = 0, pseed = 3; const prnd = () => { pseed = (pseed * 16807) % 2147483647; return pseed / 2147483647; };
    const puff = (outer, hole, marks = '') => {
      const id = 'h2p' + (++pid);
      const holeFill = hole ? `<path d="${hole}" fill="#000"/>` : '';
      return `<defs><mask id="${id}m" maskUnits="userSpaceOnUse" x="-400" y="-400" width="2000" height="2200"><rect x="-400" y="-400" width="2000" height="2200" fill="#fff"/>${holeFill}</mask>` +
        `<clipPath id="${id}c"><path d="${outer}"/></clipPath></defs>` +
        `<g mask="url(#${id}m)"><path d="${outer}" fill="{hair}"/><g clip-path="url(#${id}c)">${marks}</g>` +
        `<path d="${outer}" fill="none" stroke="${K}" stroke-width="8" stroke-linejoin="round"/></g>` +
        (hole ? `<g clip-path="url(#${id}c)"><path d="${hole}" fill="none" stroke="${K}" stroke-width="8" stroke-linejoin="round"/></g>` : '');
    };
    // small curls (a light arc and a dark arc) scattered inside a box
    const curlMarks = (x0, x1, y0, y1, step) => { let m = ''; for (let y = y0; y < y1; y += step) for (let x = x0 + ((y / step) % 2) * step / 2; x < x1; x += step) {
      const px = x + (prnd() - 0.5) * step * 0.6, py = y + (prnd() - 0.5) * step * 0.6, a = (prnd() * 360).toFixed(0);
      m += `<g transform="translate(${px.toFixed(0)} ${py.toFixed(0)}) rotate(${a}) scale(1.9)"><path d="M-16 4 Q-14 -14 2 -14 Q16 -12 14 2" fill="none" stroke="${K}" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="M-10 10 Q4 14 12 6" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="7" stroke-linecap="round"/></g>`; } return m; };
    const waveMarks = (x0, x1, y0, y1, step) => { let m = ''; for (let x = x0; x < x1; x += step) {
      m += `<path d="M${x} ${y0} q-30 ${(y1 - y0) / 4} 0 ${(y1 - y0) / 2} t0 ${(y1 - y0) / 2}" fill="none" stroke="${K}" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="M${x + 22} ${y0 + 20} q-24 ${(y1 - y0) / 5} 0 ${(y1 - y0) / 2.6}" fill="none" stroke="#ffffff" stroke-opacity="0.38" stroke-width="12" stroke-linecap="round"/>`; } return m; };
    // soft waves: short S strokes, dark with a light one beside it
    const swirlMarks = (x0, x1, y0, y1, step) => { let m = ''; for (let y = y0; y < y1; y += step * 0.8) for (let x = x0 + ((y / step) % 2) * step / 2; x < x1; x += step) {
      const px = x + (prnd() - 0.5) * step * 0.5, py = y + (prnd() - 0.5) * step * 0.4, a = ((prnd() - 0.5) * 70).toFixed(0);
      m += `<g transform="translate(${px.toFixed(0)} ${py.toFixed(0)}) rotate(${a})"><path d="M-44 6 Q-22 -22 0 0 T44 -6" fill="none" stroke="${K}" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="M-36 22 Q-16 0 4 16" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="10" stroke-linecap="round"/></g>`; } return m; };
    // the face opening of the front piece (open at the bottom)
    const FACEHOLE = `M236 1500 V430 Q236 330 330 322 Q518 300 706 322 Q800 330 800 430 V1500 Z`;

    // Afro curto: a small, rounded afro close to the head (less volume than Black power)
    H2.afro = [front(puff(cloud(518, 400, 430, 360, 24, 0.1), FACEHOLE, curlMarks(90, 950, 60, 760, 118))),
      back(puff(cloud(447.5, 420, 400, 350, 24, 0.1), '', curlMarks(60, 840, 90, 780, 118)))];
    // Ondas curtas: short, soft waves (like the hair of older ladies in the references)
    H2.ondas = [front(puff(cloud(518, 370, 410, 300, 16, 0.1), FACEHOLE, swirlMarks(120, 930, 90, 660, 125))),
      back(puff(cloud(447.5, 390, 370, 310, 16, 0.1), '', swirlMarks(90, 820, 110, 690, 125)))];
    // Curtinho: short straight pixie cut with a fringe swept to one side
    H2.curtinho = [front(puff(`M518 112 C330 108 196 170 182 330 C176 400 186 450 206 490 L242 470 C236 420 236 380 246 340 Q360 322 446 392 L470 318 Q640 300 790 352 C800 400 800 440 794 470 L830 490 C852 440 860 400 854 330 C840 170 706 116 518 112 Z`, '',
        `<path d="M300 170 Q420 150 520 160 M560 150 Q700 170 780 250 M246 340 Q330 230 470 210" fill="none" stroke="#ffffff" stroke-opacity="0.38" stroke-width="16" stroke-linecap="round"/>` +
        `<path d="M300 240 Q380 260 440 330 M520 230 Q640 250 740 330 M220 300 Q215 380 222 450" fill="none" stroke="${K}" stroke-width="5" stroke-linecap="round"/>`)),
      back(puff(`M110 420 C100 170 260 96 447.5 96 C635 96 795 170 785 420 C780 520 760 570 720 600 L690 560 L660 612 L600 570 L560 625 L500 585 L447.5 632 L395 585 L335 625 L295 570 L235 612 L205 560 L175 600 C135 570 114 520 110 420 Z`, '',
        `<path d="M220 200 Q170 300 170 430 M300 140 Q380 118 440 116" fill="none" stroke="#ffffff" stroke-opacity="0.38" stroke-width="16" stroke-linecap="round"/>` +
        `<path d="M300 260 Q280 400 300 560 M447.5 200 V560 M595 260 Q615 400 595 560" fill="none" stroke="${K}" stroke-width="5" stroke-linecap="round"/>`))];
    // Liso médio: straight, close to the head, down to the shoulders
    H2.medio = [
      front(sym(518, `M518 100 C330 100 176 176 164 360 C156 520 160 760 172 940 L214 1010 L246 948 L272 1000 C262 860 248 640 244 470 C244 380 318 286 518 262`, {
        light: `M214 230 C186 300 180 420 184 560 M300 150 C380 120 450 114 500 114`,
        lines: `M330 190 C270 250 254 330 252 420 M206 470 C204 640 210 800 226 940`,
        part: `M518 106 V254` })),
      back(sym(447.5, `M447.5 84 C262 84 124 172 110 360 C100 520 104 760 118 960 L170 1040 L210 970 L260 1030 L300 965 L350 1025 L395 960 L447.5 1020`, {
        light: `M180 230 C150 300 144 420 148 560 M300 120 C360 100 420 96 440 96`,
        lines: `M290 220 C250 400 250 650 270 940 M390 260 C370 450 370 700 390 950 M180 450 C176 650 180 820 196 960` })),
    ];
    const h = slot('hair');
    h.options.push(
      // front piece only, 10% bigger around the face centre so it frames the face better
      { id: 'curtinho', label: 'Curtinho', hide: ['cabelo_tras'], layers: tightHead(HAIRLINE.arco).concat([{ ...H2.curtinho[0], svg: `<g transform="translate(518 330) scale(1.1) translate(-518 -330)">${H2.curtinho[0].svg}</g>` }]) },
      { id: 'lisomedio', label: 'Liso médio', layers: tightHead(HAIRLINE.risca).concat([RISCA_SIDE], H2.medio) });
  }
  {
    const slot = id => slots.find(s => s.id === id);
    const K = '#1d1712';
    let cid = 0;
    // one cornrow: little plaits along a polyline, each leaf tilted left / right in turn
    const row = (pts, size = 1.55) => {
      let s = '', acc = 0;
      for (let k = 0; k < pts.length - 1; k++) {
        const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
        for (let d = 0; d < L; d += 30 * size, acc++) {
          const t = d / L, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, side = acc % 2 ? 1 : -1;
          s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(a + side * 38).toFixed(1)}) scale(${size})">` +
            `<ellipse rx="22" ry="12" fill="{hair}" stroke="${K}" stroke-width="4"/><path d="M-12 -4 Q0 -9 12 -4" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="5" stroke-linecap="round"/></g>`;
        }
      }
      return s;
    };
    const clip = (d, inner) => { const id = 'tr' + (++cid); return `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><path d="${d}" fill="{hair-dark}"/><g clip-path="url(#${id})">${inner}</g><path d="${d}" fill="none" stroke="${K}" stroke-width="7" stroke-linejoin="round"/>`; };
    const range = (a, b, st) => { const r = []; for (let v = a; v <= b; v += st) r.push(v); return r; };
    // front: an arched hairline, the rows run straight up
    const fd = `M-10 -10 H897 V190 Q700 130 443 140 Q186 130 -10 190 Z`;
    const tFront = clip(fd, range(30, 880, 94).map(x => row([[x, 200 - 60 * Math.cos((x - 443) / 443 * 1.2)], [x + (x - 443) * 0.05, -20]])).join(''));
    // top of the head (front at the bottom edge): rows run from the front to the back, closing in towards the bun
    const tTop = clip(`M-10 -10 H582 V665 H-10 Z`, range(20, 570, 94).map(x => row([[x, 670], [286 + (x - 286) * 0.55, -10]])).join(''));
    // sides: rows above the ear run back; behind the ear they go up
    const sd = `M-10 -10 H667 V150 Q560 160 520 260 Q470 330 400 300 Q300 300 285 430 L280 640 Q262 800 110 800 H-10 Z`;
    const tSide = clip(sd, [50, 150, 250].map(y => row([[680, y], [-20, y - 40]])).join('') +
      [60, 170].map(x => row([[x, 800], [x + 60, 300]])).join(''));
    // back of the head: rows from the nape up to the crown (where the bun is)
    const bd = `M-10 -10 H897 ${NAPE(800)} Z`;
    const tBack = clip(bd, range(40, 860, 94).map(x => row([[x, 800], [443 + (x - 443) * 0.45, -20]])).join(''));
    // the bun on top, made of a braid wound round
    let coil = '';
    for (let i = 0; i < 26; i++) { const a = i * 0.55, r = 112 - i * 3.6; coil += `<g transform="translate(${(447 + r * Math.cos(a)).toFixed(1)} ${(140 + r * 0.8 * Math.sin(a)).toFixed(1)}) rotate(${(a * 180 / Math.PI + 90 + (i % 2 ? 35 : -35)).toFixed(1)}) scale(1.6)"><ellipse rx="22" ry="12" fill="{hair}" stroke="${K}" stroke-width="3"/><path d="M-12 -4 Q0 -9 12 -4" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="4" stroke-linecap="round"/></g>`; }
    const bun = `<ellipse cx="447" cy="140" rx="140" ry="118" fill="{hair-dark}" stroke="${K}" stroke-width="8"/>${coil}` ;
    slot('hair').options.push({ id: 'trancascoque', label: 'Tranças com coque', hide: ['cabelo_frente'], layers: [
      { region: 'head.top', svg: tTop },
      { region: 'head.front', tag: 'hairline', svg: tFront },
      { region: 'head.side', svg: tSide },
      { region: 'head.back', svg: tBack },
      { region: 'hair.back', svg: bun },
    ] });
    // Tranças nagô (Vol. 3+, Hilda): the same little plaits, but in straight parallel rows (no bun), and a
    // flat piece of long braids hanging at the back only (the front hair piece is not used)
    const straightTop = clip(`M-10 -10 H582 V665 H-10 Z`, range(20, 570, 78).map(x => row([[x, 670], [x, -10]])).join(''));
    const straightFront = clip(fd, range(30, 880, 78).map(x => row([[x, 200 - 60 * Math.cos((x - 443) / 443 * 1.2)], [x, -20]])).join(''));
    const straightBack = clip(bd, range(40, 860, 78).map(x => row([[x, 800], [x, -20]])).join(''));
    // the hanging braids: side by side so they cut out as one piece, each ending in a rounded tip
    const nb = 8, bx0 = 150, bx1 = 745, bw = (bx1 - bx0) / nb, bTop = 120, bEnd = 930;
    let tips = ''; for (let i = nb; i > 0; i--) { const x = bx0 + i * bw; tips += ` Q${(x - bw / 2).toFixed(1)} ${bEnd + 78} ${(x - bw).toFixed(1)} ${bEnd}`; }
    const ext = `M${bx0} ${bTop + 60} Q${bx0} ${bTop} ${bx0 + 60} ${bTop} H${bx1 - 60} Q${bx1} ${bTop} ${bx1} ${bTop + 60} V${bEnd}${tips} Z`;
    const extBraids = clip(ext, Array.from({ length: nb }, (_, i) => row([[bx0 + (i + 0.5) * bw, bTop - 30], [bx0 + (i + 0.5) * bw, bEnd + 60]], 1.25)).join('') +
      Array.from({ length: nb - 1 }, (_, i) => `<path d="M${(bx0 + (i + 1) * bw).toFixed(1)} ${bTop + 20} V${bEnd + 10}" stroke="${K}" stroke-width="4"/>`).join(''));
    slot('hair').options.push({ id: 'nago', label: 'Tranças nagô', hide: ['cabelo_frente'], layers: [
      { region: 'head.top', svg: straightTop },
      { region: 'head.front', tag: 'hairline', svg: straightFront },
      { region: 'head.side', svg: tSide },
      { region: 'head.back', svg: straightBack },
      { region: 'hair.back', svg: extBraids },
    ] });
  }
  {
    const slot = id => slots.find(s => s.id === id);
    const K = '#1d1712';
    // the hair row's 2nd colour is the feathers when the cocar is chosen (app.js: colorLabel)
    colors.find(c => c.id === 'accent').labelIf = [{ if: { hair: ['cocar'] }, label: 'Penas do cocar' }];

    // "Terceira peça": the row of clothes worn over the others (lab coat, overcoat)
    const coat = slot('coat');
    coat.label = 'Terceira peça';
    colors.find(c => c.id === 'coat').label = 'Jaleco / casaco';
    coat.options.find(o => o.id === 'nao').label = 'Sem terceira peça';
    Object.assign(coat.options.find(o => o.id === 'sim'), { label: 'Jaleco', pickColors: { coat: '#ffffff' } });   // the lab coat starts white again
    // Sobretudo: the same coat without the pockets (the breast pocket with pens and the two lower ones are
    // covered with the coat colour); the 'Bolsos' toggle puts the two lower pockets back
    const T3 = [3, 0, 0, 2024, 2024];
    coat.options.push({ id: 'sobretudo', label: 'Sobretudo', pickColors: { coat: '#8a8d93' }, layers: coat.options.find(o => o.id === 'sim').layers.concat([
      { rect: T3, z: 30.5, svg: `<rect x="398" y="276" width="104" height="146" fill="{coat}"/><rect x="40" y="716" width="182" height="186" fill="{coat}"/><rect x="414" y="716" width="182" height="186" fill="{coat}"/>` }]) });
    const pocket = x => `<path d="M${x} 736 Q${x + 74} 744 ${x + 146} 736 M${x + 2} 736 L${x} 800 Q${x - 2} 866 ${x + 18} 888 M${x + 144} 736 L${x + 146} 800 Q${x + 148} 866 ${x + 128} 888" fill="none" stroke="${K}" stroke-width="5" stroke-linecap="round"/>`;
    for (const t of coat.toggles) {
      t.showOn = ['sim', 'sobretudo'];
      for (const L of t.layers) if (L.if && L.if.coat) L.if = { ...L.if, coat: ['sim', 'sobretudo'] };
    }
    coat.toggles.find(t => t.id === 'jalecofechado').label = 'Fechado';
    coat.toggles.find(t => t.id === 'jalecocurta').label = 'Manga curta';
    coat.toggles.push({ id: 'bolsos', label: 'Bolsos', showOn: ['sobretudo'], layers: [{ rect: T3, z: 31, if: { coat: ['sobretudo'] }, svg: pocket(58) + pocket(432) }] });

    // No pescoço: scarf (wrapped round the neck, one end hanging) and shawl (over the shoulders)
    const fringe = (x0, x1, y, len) => { let s = ''; for (let x = x0; x <= x1; x += 14) s += `M${x} ${y} v${len} `; return `<path d="${s}" stroke="{accent}" stroke-width="8" stroke-linecap="round"/><path d="${s}" stroke="${K}" stroke-width="2" opacity="0.5"/>`; };
    const stripes = (d, ys) => ys.map(y => `<path d="M-10 ${y} H740" stroke="{accent-dark}" stroke-width="16"/>`).join('');
    slot('neck').options.push(
      { id: 'cachecol', label: 'Cachecol', layers: [
        { region: 'body.front', z: 39, svg:
          `<g transform="rotate(-6 430 60)">${fringe(412, 482, 470, 46)}<rect x="404" y="40" width="86" height="436" rx="10" fill="{accent}" ${INK}/>` +
          [140, 250, 360].map(y => `<rect x="406" y="${y}" width="82" height="22" fill="{accent-dark}"/>`).join('') +
          `<path d="M420 60 V450" stroke="#ffffff" stroke-opacity="0.35" stroke-width="10" stroke-linecap="round"/></g>` +
          `<path d="M196 -20 Q361 120 526 -20 L548 46 Q361 190 174 46 Z" fill="{accent}" ${INK}/>` +
          `<path d="M200 40 Q361 150 522 40" fill="none" stroke="{accent-dark}" stroke-width="18"/>` },
        { region: 'body.back', z: 39, svg: `<path d="M196 -20 Q361 100 526 -20 L540 36 Q361 160 182 36 Z" fill="{accent}" ${INK}/><path d="M206 30 Q361 126 516 30" fill="none" stroke="{accent-dark}" stroke-width="16"/>` }] },
      { id: 'xale', label: 'Xale', layers: [
        // front: the two ends come down over the shoulders
        { region: 'body.front', z: 39, svg:
          `${fringe(70, 200, 640, 44)}${fringe(522, 652, 640, 44)}` +
          `<path d="M-10 -10 H250 Q260 300 210 640 H60 Q20 400 -10 300 Z M733 -10 H472 Q462 300 512 640 H662 Q702 400 733 300 Z" fill="{accent}" ${INK}/>` +
          `<path d="M40 60 Q60 300 110 600 M682 60 Q662 300 612 600" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="12" stroke-linecap="round"/>` +
          `<path d="M150 40 Q180 300 150 600 M572 40 Q542 300 572 600" fill="none" stroke="{accent-dark}" stroke-width="8" stroke-linecap="round"/>` },
        // back: a big triangle down to the waist
        { region: 'body.back', z: 39, svg: `${fringe(320, 400, 640, 44)}<path d="M-10 -10 H733 V90 L380 660 H340 L-10 90 Z" fill="{accent}" ${INK}/>` +
          `<path d="M60 120 L330 560 M662 120 L392 560" fill="none" stroke="{accent-dark}" stroke-width="8" stroke-linecap="round"/>` } ] });
  }
  // VOL2-END
  // VOL3-BEGIN
  /* ---------- Volumes 3 to 10 (2026-11-24): pieces for the interviewees who don't have a doll yet.
     Hair is drawn in Ashley Campos's way: flat {hair}, a darker band near the roots, light strips
     along the edges, a few thin strand lines, an 8 px dark outline; kept simple to cut. */
  {
    const slot = id => slots.find(s => s.id === id);
    const K = '#1d1712';
    let vid = 0;
    // one hair (or fabric) piece: fill, shading and strand lines kept inside it, then the outline.
    // outline: the path to stroke (defaults to the whole shape; give an open path to leave an edge unlined)
    const piece = (d, { fill = '{hair}', dark = '', light = '', lines = '', outline = d, extra = '' } = {}) => {
      const id = 'v3c' + (++vid);
      return `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><path d="${d}" fill="${fill}"/>` +
        `<g clip-path="url(#${id})">` +
          (dark ? `<path d="${dark}" fill="${fill.replace('}', '-dark}')}" opacity="0.55"/>` : '') +
          (light ? `<path d="${light}" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="18" stroke-linecap="round"/>` : '') +
          (lines ? `<path d="${lines}" fill="none" stroke="${K}" stroke-width="5" stroke-linecap="round"/>` : '') + extra +
        `</g><path d="${outline}" fill="none" stroke="${K}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>`;
    };
    // little curls scattered inside a box (puff)
    let ps = 5; const pr = () => { ps = (ps * 16807) % 2147483647; return ps / 2147483647; };
    const curls = (x0, x1, y0, y1, step) => { let m = ''; for (let y = y0; y < y1; y += step) for (let x = x0 + ((y / step) % 2) * step / 2; x < x1; x += step) {
      const px = x + (pr() - 0.5) * step * 0.6, py = y + (pr() - 0.5) * step * 0.6, a = (pr() * 360).toFixed(0);
      m += `<g transform="translate(${px.toFixed(0)} ${py.toFixed(0)}) rotate(${a}) scale(1.8)"><path d="M-16 4 Q-14 -14 2 -14 Q16 -12 14 2" fill="none" stroke="${K}" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="M-10 10 Q4 14 12 6" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="7" stroke-linecap="round"/></g>`; } return m; };
    const hair = slot('hair');
    const at = (id, opt) => { const i = hair.options.findIndex(o => o.id === id); hair.options.splice(i + 1, 0, opt); };

    /* Puff alto: hair pulled up into a round puff on top, with the elastic ({accent}) at its base */
    const puffBall = (cx, cy, rx, ry) => piece(cloud(cx, cy, rx, ry, 22, 0.09), { extra: curls(cx - rx, cx + rx, cy - ry, cy + ry, 92),
      light: `M${cx - rx * 0.7} ${cy - ry * 0.2} Q${cx - rx * 0.55} ${cy - ry * 0.75} ${cx - rx * 0.1} ${cy - ry * 0.85}` });
    hair.options.push({ id: 'puff', label: 'Puff alto', hide: ['cabelo_frente'], layers: tightHead(HAIRLINE.arco).concat([
      { region: 'hair.back', z: 20, svg: puffBall(447.5, 10, 290, 150) + `<rect x="360" y="150" width="176" height="44" rx="16" fill="{accent}" stroke="${K}" stroke-width="7"/>` },
    ]) });

    /* Pixie: short at the back, a long fringe swept across the forehead (front piece only) */
    const pixie = `M518 92 C320 88 176 160 166 330 C160 430 172 520 198 590 L236 566 C230 520 230 480 238 446 L296 440 Q420 398 540 344 Q680 292 800 300 C806 360 806 420 800 470 L838 500 C860 430 868 380 862 320 C848 160 712 92 518 92 Z`;
    hair.options.push({ id: 'pixie', label: 'Pixie com franja', hide: ['cabelo_tras'], layers: tightHead(HAIRLINE.arco).concat([{ region: 'hair.front', z: 20, svg: '<g transform="translate(518 92) scale(1.07) translate(-518 -92)">' + piece(pixie, {
      dark: `M166 330 C176 160 320 88 518 92 C712 92 848 160 862 320 L862 230 C800 180 680 150 518 150 C360 150 230 190 166 260 Z`,
      light: `M216 250 C196 320 194 420 206 520 M300 150 C380 120 460 112 520 114 M600 300 Q700 270 780 280`,
      lines: `M270 230 Q400 230 520 290 M360 190 Q520 190 660 270 M620 330 Q700 300 790 320 M214 420 C212 470 216 520 226 560 M820 360 C826 410 824 450 818 480` }) + '</g>' }]) });

    /* Turbante: a hairstyle. The wrap ({accent}) covers the head and makes a dome on the hair pieces, with a
       knot (laço) on the forehead. The Franja row still works under it (the hair that "escapes"). The
       'Turbante de poá' tag under the row prints white dots on the fabric. */
    const turban = (F, deco = '') => {
      const P = F === '{accent}' ? '' : F;   // a pattern fill keeps the plain colour under it
      const fab = (d, o = {}) => piece(d, { fill: '{accent}', outline: d, ...o, extra: (P ? `<path d="${d}" fill="${P}"/>` : '') + (o.extra || '') });
      return {
        top: `<rect x="-10" y="-10" width="600" height="680" fill="{accent}"/>` + (P ? `<rect x="-10" y="-10" width="600" height="680" fill="${P}"/>` : '') +
          `<path d="M-10 520 Q290 300 590 470 M-10 260 Q290 60 590 210" fill="none" stroke="{accent-dark}" stroke-width="12" stroke-linecap="round"/>`,
        front: fab(`M-10 -10 H897 V170 Q700 215 443 200 Q186 215 -10 170 Z`, { outline: `M-10 170 Q186 215 443 200 Q700 215 897 170`,
          lines: `M60 120 Q300 60 520 110 M400 150 Q600 90 820 130` }),
        side: fab(`M-10 -10 H667 V150 Q540 170 470 270 Q440 300 460 296 Q420 318 370 314 Q300 312 286 380 L282 600 Q276 760 210 830 Q160 840 -10 840 Z`, {
          outline: `M667 150 Q540 170 470 270 Q440 300 460 296 Q420 318 370 314 Q300 312 286 380 L282 600 Q276 760 210 830 Q160 840 -10 840`,
          lines: `M40 700 Q160 420 620 150 M40 420 Q200 200 560 60` }),
        back: fab(`M-10 -10 H897 ${NAPE(840)} Z`, { outline: `M897 840 ${NAPE(840).slice(5)}`,
          lines: `M60 640 Q300 300 820 120 M60 360 Q300 120 700 20 M300 740 Q520 460 860 380` }),
        hf: '<g transform="translate(0 90)">' + fab(`M172 206 C150 60 320 -110 518 -110 C716 -110 886 60 864 206 Q700 172 518 178 Q336 172 172 206 Z`, {
          light: `M240 120 Q300 0 420 -60`, lines: `M240 170 Q360 40 520 30 Q680 40 800 170 M330 -40 Q520 -100 700 -40` }) +
          // the knot on the forehead: two loops and a round middle
          `<g transform="translate(518 196)">` +
          fab(`M0 0 C-60 -90 -190 -70 -170 10 C-150 80 -60 60 0 10 Z`, { lines: `M-30 0 Q-100 -40 -150 0` }) +
          fab(`M0 0 C60 -90 190 -70 170 10 C150 80 60 60 0 10 Z`, { lines: `M30 0 Q100 -40 150 0` }) +
          fab(`M-46 4 C-46 -46 46 -46 46 4 C46 60 -46 60 -46 4 Z`, { light: `M-24 -16 Q-10 -30 10 -28` }) + `</g></g>`,
        hb: fab(`M150 210 C130 50 300 -110 447.5 -110 C595 -110 765 50 745 210 Q600 180 447.5 186 Q295 180 150 210 Z`, {
          light: `M210 120 Q270 0 380 -60`, lines: `M190 160 Q350 20 600 -20 M240 200 Q420 80 720 100` }),
      };
    };
    const dots = (id, r = 13, st = 64) => `<defs><pattern id="${id}" width="${st}" height="${st}" patternUnits="userSpaceOnUse"><circle cx="${st / 4}" cy="${st / 4}" r="${r}" fill="#ffffff"/><circle cx="${st * 3 / 4}" cy="${st * 3 / 4}" r="${r}" fill="#ffffff"/></pattern></defs>`;
    const turbanLayers = (T, z, pre = '') => [
      { region: 'head.top', z: 21 + z, svg: pre + T.top },
      { region: 'head.side', z: 21 + z, svg: pre + T.side }, { region: 'head.back', z: 21 + z, svg: pre + T.back },
      { region: 'hair.front', z: 30 + z, svg: pre + T.hf }];
    const T0 = turban('{accent}');
    at('cocar', { id: 'turbante', label: 'Turbante', hide: ['cabelo_tras'], pickColors: { accent: '#24345f' }, layers: [TOP(), { region: 'head.front', z: 2, tag: 'hairline', svg: HAIRLINE.bicos }].concat(turbanLayers(T0, 0)) });
    hair.toggles.push({ id: 'turbantepoa', label: 'Turbante de poá', showOn: ['turbante'], layers: turbanLayers(turban('url(#tpoa)'), 0.2, dots('tpoa')).map(L => ({ ...L, if: { hair: ['turbante'] } })) });

    /* Longo liso com faixa (Kunhã Jeguakai): Ashley's long straight hair with a band round the forehead and a
       feather hanging at the side; next to the cocar in the list */
    const band = `<path d="M150 214 Q518 150 886 214 L886 276 Q518 214 150 276 Z" fill="{accent}" stroke="${K}" stroke-width="8" stroke-linejoin="round"/>` +
      `<path d="M170 246 Q518 186 866 246" fill="none" stroke="{accent-light}" stroke-width="5" stroke-dasharray="18 14"/>`;
    const hang = `<path d="M842 262 Q850 300 846 330" fill="none" stroke="${K}" stroke-width="6"/><circle cx="846" cy="334" r="14" fill="#c9a227" stroke="${K}" stroke-width="5"/>` +
      `<g transform="translate(846 346) rotate(180)">${V2.pena(300, 48, '#f3eee2', '#3b2416')}</g>`;
    const bandBack = `<path d="M110 220 Q447 160 785 220 L785 282 Q447 222 110 282 Z" fill="{accent}" stroke="${K}" stroke-width="8" stroke-linejoin="round"/>` +
      `<path d="M412 226 L380 420 L428 410 L447 240 L466 410 L514 420 L482 226 Z" fill="{accent}" stroke="${K}" stroke-width="7" stroke-linejoin="round"/>` +
      `<rect x="412" y="210" width="70" height="60" rx="14" fill="{accent}" stroke="${K}" stroke-width="7"/>`;
    at('cocar', { id: 'faixa', label: 'Longo liso com faixa', pickColors: { accent: '#7a5233' }, layers: tightHead().concat(V2.ashleyLayers('longoliso'), [
      { region: 'hair.front', z: 26, svg: band + hang }, { region: 'hair.back', z: 26, svg: bandBack }]) });
    colors.find(c => c.id === 'accent').labelIf.push({ if: { hair: ['turbante'] }, label: 'Turbante' }, { if: { hair: ['faixa'] }, label: 'Faixa' });

    /* Na cabeça: cap and field hat. Only their front is a piece glued on the front hair piece (so the
       front hair is not printed); the rest is drawn on the head and on the back hair piece. */
    const HB = { drop: ['hairfront'], show: ['cabelo_frente'] };
    const capHead = h => [
      { region: 'head.top', z: 40, svg: `<rect x="-10" y="-10" width="600" height="680" fill="{accent}"/><path d="M286 -10 V670 M-10 330 Q286 300 590 330" fill="none" stroke="{accent-dark}" stroke-width="10"/>` },
      { region: 'head.front', z: 40, svg: `<path d="M-10 -10 H897 V${h} H-10 Z" fill="{accent}" ${INK}/>` },
      // the band runs at one height all round the head (front, sides and back meet at the corners)
      { region: 'head.side', z: 40, svg: `<path d="M-10 -10 H667 V${h} H-10 Z" fill="{accent}" ${INK}/>` },
      { region: 'head.back', z: 40, svg: `<path d="M-10 -10 H897 V${h} H-10 Z" fill="{accent}" ${INK}/>` }];
    const bone = piece(`M196 206 C186 30 336 -50 518 -50 C700 -50 850 30 840 206 Z`, { fill: '{accent}',
        light: `M260 140 Q290 30 400 -10`, lines: `M518 -44 V200 M360 -20 Q300 80 300 200 M676 -20 Q736 80 736 200` }) +
      `<circle cx="518" cy="-50" r="20" fill="{accent}" stroke="${K}" stroke-width="7"/>` +
      piece(`M120 210 Q518 132 916 210 Q518 312 120 210 Z`, { fill: '{accent}', dark: `M120 210 Q518 132 916 210 Q518 180 120 210 Z`, light: `M220 214 Q518 170 816 214` });
    const boneBack = `<path d="M-10 -10 H897 V210 H-10 Z" fill="{accent}" ${INK}/>` +
      `<path d="M320 214 Q320 96 443 96 Q566 96 566 214 Z" fill="{hair}" stroke="${K}" stroke-width="8"/>` +
      `<path d="M320 170 H566" stroke="${K}" stroke-width="30"/><path d="M320 170 H566" stroke="{accent-dark}" stroke-width="18"/>` +
      `<rect x="420" y="156" width="46" height="30" fill="#c9c4bd" stroke="${K}" stroke-width="5"/>` +
      `<path d="M443 -10 V96 M150 -10 Q190 100 180 210 M736 -10 Q696 100 706 210" fill="none" stroke="{accent-dark}" stroke-width="8"/>`;
    const hat = (cx, top) => piece(`M${cx - 470} 190 C${cx - 470} 120 ${cx + 470} 120 ${cx + 470} 190 C${cx + 470} 262 ${cx - 470} 262 ${cx - 470} 190 Z`, { fill: '{accent}', dark: `M${cx - 470} 190 C${cx - 470} 120 ${cx + 470} 120 ${cx + 470} 190 Z` }) +
      piece(`M${cx - 220} 196 L${cx - 190} ${top} Q${cx} ${top - 50} ${cx + 190} ${top} L${cx + 220} 196 Q${cx} 222 ${cx - 220} 196 Z`, { fill: '{accent}',
        light: `M${cx - 160} 150 L${cx - 140} ${top + 40}`, lines: `M${cx - 120} ${top + 20} Q${cx} ${top + 50} ${cx + 120} ${top + 20}`,
        extra: `<path d="M${cx - 230} 130 Q${cx} 160 ${cx + 230} 130 L${cx + 230} 186 Q${cx} 216 ${cx - 230} 186 Z" fill="#6b4a2e"/>` }) +
      `<path d="M${cx - 470} 196 C${cx - 440} 268 ${cx + 440} 268 ${cx + 470} 196" fill="none" stroke="${K}" stroke-width="8"/>` +
      piece(`M${cx - 470} 190 C${cx - 450} 300 ${cx + 450} 300 ${cx + 470} 190 C${cx + 380} 236 ${cx - 380} 236 ${cx - 470} 190 Z`, { fill: '{accent}', light: `M${cx - 300} 236 Q${cx} 266 ${cx + 300} 236` });
    /* Folded brims (hat, helmet, cap): the brim hangs under the crown on the front piece, a "C" (half oval) that is
       folded forward in an L along the dashed line before gluing. The 3D view shows it folded (option.brim).
       fold: the fold line's height; the crown's lower edge sits on it (half width 'half'). */
    const FOLD = h => Math.round(166 + h * 0.679);   // a head band at h (capHead) -> the same height on the front piece
    const brimSvg = (cx, fold, rx, depth, half, fill = '{accent}', extra = '') => {
      const d = `M${cx - rx} ${fold} C${cx - rx} ${fold + depth * 1.33} ${cx + rx} ${fold + depth * 1.33} ${cx + rx} ${fold} Z`;
      return piece(d, { fill, outline: `M${cx - half} ${fold} H${cx - rx} C${cx - rx} ${fold + depth * 1.33} ${cx + rx} ${fold + depth * 1.33} ${cx + rx} ${fold} H${cx + half}`,
          light: `M${cx - rx * 0.6} ${fold + depth * 0.45} Q${cx} ${fold + depth * 0.75} ${cx + rx * 0.6} ${fold + depth * 0.45}`, extra }) +
        `<path d="M${cx - half} ${fold} H${cx + half}" stroke="#3a3340" stroke-width="6" stroke-dasharray="22 14"/>`;
    };
    const hatF = FOLD(120);
    const hatNew = piece(`M300 ${hatF} L330 0 Q518 -50 706 0 L736 ${hatF} Z`, { fill: '{accent}',
        light: `M360 ${hatF - 60} L380 40`, lines: `M400 20 Q518 50 636 20`,
        extra: `<path d="M318 ${hatF - 70} Q518 ${hatF - 44} 718 ${hatF - 70} L724 ${hatF - 6} Q518 ${hatF + 18} 312 ${hatF - 6} Z" fill="#6b4a2e"/>` }) +
      brimSvg(518, hatF, 470, 210, 218);
    // boné: the crown (six panels and a button) on the fold line, the visor folded forward under it
    const boneF = FOLD(210), bt = boneF - 256;
    const boneNew = piece(`M196 ${boneF} C186 ${boneF - 176} 336 ${bt} 518 ${bt} C700 ${bt} 850 ${boneF - 176} 840 ${boneF} Z`, { fill: '{accent}',
        light: `M260 ${boneF - 66} Q290 ${bt + 80} 400 ${bt + 40}`, lines: `M518 ${bt + 6} V${boneF - 6} M360 ${bt + 30} Q300 ${bt + 130} 300 ${boneF - 6} M676 ${bt + 30} Q736 ${bt + 130} 736 ${boneF - 6}` }) +
      `<circle cx="518" cy="${bt}" r="20" fill="{accent}" stroke="${K}" stroke-width="7"/>` + brimSvg(518, boneF, 360, 215, 322);
    slot('headwear').options.push(
      { id: 'bone', label: 'Boné', pickColors: { headwear: '#3c64c8' }, ...HB, brim: { cx: 518, rx: 360, fold: boneF, depth: 215, tilt: 80 },
        layers: capHead(210).concat([{ region: 'hair.front', z: 45, svg: boneNew }, { region: 'head.back', z: 41, svg: boneBack }]) },
      { id: 'chapeu', label: 'Chapéu de campo', pickColors: { headwear: '#d8cdb0' }, ...HB, brim: { cx: 518, rx: 470, fold: hatF, depth: 210, tilt: 86 },
        layers: capHead(120).concat([{ region: 'hair.front', z: 45, svg: hatNew }]) });

    /* Boca: open smile with braces (the brackets stay inside the teeth) */
    slot('mouth').options.push(
      { id: 'mascara', label: 'Máscara branca', layers: [{ region: 'head.front', z: 36, svg:
          `<path d="M150 646 Q443 600 737 646 L728 826 Q443 884 159 826 Z" fill="#f6f7f9" ${INK}/>` +
          `<path d="M176 700 Q443 662 711 700 M172 752 Q443 716 715 752 M168 802 Q443 772 719 802" fill="none" stroke="#c9ced6" stroke-width="7" stroke-linecap="round"/>` +
          `<path d="M150 660 H-10 M154 812 H-10 M737 660 H897 M733 812 H897" stroke="#c9ced6" stroke-width="6"/>` }] },
      { id: 'mascaraazul', label: 'Máscara azul', layers: [{ region: 'head.front', z: 36, svg:
          `<path d="M150 646 Q443 600 737 646 L728 826 Q443 884 159 826 Z" fill="#7fb8e0" ${INK}/>` +
          `<path d="M176 700 Q443 662 711 700 M172 752 Q443 716 715 752 M168 802 Q443 772 719 802" fill="none" stroke="#4f88b8" stroke-width="7" stroke-linecap="round"/>` +
          `<path d="M150 660 H-10 M154 812 H-10 M737 660 H897 M733 812 H897" stroke="#4f88b8" stroke-width="6"/>` }] });
    slot('mouth').options.push({ id: 'aparelho', label: 'Sorriso com aparelho', layers: [{ region: 'head.front', z: 32, svg:
      `<ellipse cx="444" cy="752" rx="112" ry="46" fill="{skin}"/>` +
      `<path d="M364 735 Q444 742 524 735 Q520 830 444 832 Q368 830 364 735 Z" fill="#7a1f2b" ${INK}/>
       <path d="M374 742 Q444 750 514 742 L508 774 Q444 782 380 774 Z" fill="#ffffff"/>
       <path d="M384 759 Q444 766 504 759" fill="none" stroke="#9aa0a8" stroke-width="4"/>` +
      [398, 421, 444, 467, 490].map(x => `<rect x="${x - 7}" y="${752 + Math.abs(x - 444) * -0.03}" width="14" height="13" rx="2" fill="#b9bec6" stroke="#5d636c" stroke-width="2.5"/>`).join('') +
      `<path d="M406 812 Q444 794 482 812 Q468 828 444 829 Q420 828 406 812 Z" fill="#e8737f"/>` }] });

    /* No pescoço: seed necklace, wide beaded collar, choker */
    const seeds = Array.from({ length: 17 }, (_, i) => { const t = i / 16, x = 215 + 292 * t, y = 175 * Math.sin(t * Math.PI);
      return `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${i % 2 ? 14 : 17}" ry="${i % 2 ? 11 : 15}" fill="${['#6b3e1f', '{accent}', '#8a5a2b', '#e98b2a'][i % 4]}" stroke="${K}" stroke-width="5"/>`; }).join('');
    const seedFlower = `<g transform="translate(361 222)">` + [0, 72, 144, 216, 288].map(a => `<ellipse cx="22" rx="22" ry="14" transform="rotate(${a - 90})" fill="#f2c230" stroke="${K}" stroke-width="5"/>`).join('') + `<circle r="13" fill="#e98b2a" stroke="${K}" stroke-width="5"/></g>`;
    const mi = (r0, r1, cols) => { let s2 = ''; const n = 22;
      for (let i = 0; i < n; i++) { const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n, P = (a, r) => `${(361 - r * 1.06 * Math.cos(a)).toFixed(1)} ${(-10 + r * Math.sin(a)).toFixed(1)}`;
        s2 += `<path d="M${P(a0, r0)} L${P(a1, r0)} L${P(a1, r1)} L${P(a0, r1)} Z" fill="${cols[i % cols.length]}"/>`; } return s2; };
    const collar = mi(120, 160, ['#2a9d8f', '#f2c230']) + mi(160, 200, ['#cd4245', '#ffffff', '#222630']) + mi(200, 238, ['{accent}', '#f2c230']) +
      `<path d="M${361 - 238 * 1.06} -10 A${238 * 1.06} 238 0 0 0 ${361 + 238 * 1.06} -10 M${361 - 120 * 1.06} -10 A${120 * 1.06} 120 0 0 0 ${361 + 120 * 1.06} -10" fill="none" stroke="${K}" stroke-width="7"/>` +
      `<path d="M${361 - 160 * 1.06} -10 A${160 * 1.06} 160 0 0 0 ${361 + 160 * 1.06} -10 M${361 - 200 * 1.06} -10 A${200 * 1.06} 200 0 0 0 ${361 + 200 * 1.06} -10" fill="none" stroke="${K}" stroke-width="3"/>`;
    const choker = `<path d="M300 338 Q386 392 472 338" fill="none" stroke="${K}" stroke-width="22" stroke-linecap="round"/><path d="M300 338 Q386 392 472 338" fill="none" stroke="{accent}" stroke-width="12" stroke-linecap="round"/>`;
    slot('neck').options.push(
      { id: 'sementes', label: 'Colar de sementes', layers: [{ region: 'body.front', z: 38, svg: seeds + seedFlower }] },
      { id: 'micangas', label: 'Colar de miçangas', layers: [{ region: 'body.front', z: 38, svg: collar }] },
      // no neck on the doll: the choker sits at the top of the shirt and only shows with an open neckline
      { id: 'gargantilha', label: 'Gargantilha', worksIf: [{ gola: ['u', 'v', 'decoteu', 'decotev'], sleevecut: ['longa', 'curta', 'sem'] }, { sleevecut: ['alcinha', 'tomara'] }], worksNote: 'precisa de gola aberta', pickColors: { neck: '#d4a017' }, layers: [
        { region: 'body.all', z: 30.7, if: { gola: ['u', 'v', 'decoteu', 'decotev'], sleevecut: ['longa', 'curta', 'sem'] }, svg: choker },
        { region: 'body.all', z: 30.7, if: { sleevecut: ['alcinha', 'tomara'] }, svg: choker }] });

    /* Brincos: drop (coloured stone or pearl) and the big double hoop */
    slot('earrings').options.push(
      { id: 'gota', label: 'Gota', layers: EAR(`<circle cx="332" cy="576" r="11" fill="#c9a227" stroke="${K}" stroke-width="4"/><path d="M332 588 C300 630 306 664 332 668 C358 664 364 630 332 588 Z" fill="{accent}" stroke="${K}" stroke-width="5"/><path d="M322 630 Q324 614 332 606" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="5" stroke-linecap="round"/>`) },
      { id: 'perola', label: 'Gota de pérola', layers: EAR(`<circle cx="332" cy="576" r="11" fill="#c9a227" stroke="${K}" stroke-width="4"/><path d="M332 588 V612" stroke="#c9a227" stroke-width="6"/><circle cx="332" cy="634" r="22" fill="#fbf7ef" stroke="${K}" stroke-width="5"/><circle cx="325" cy="626" r="6" fill="#ffffff"/>`) },
      { id: 'maxi', label: 'Maxi argola', layers: EAR(`<circle cx="332" cy="606" r="26" fill="none" stroke="${K}" stroke-width="20"/><circle cx="332" cy="606" r="26" fill="none" stroke="{accent}" stroke-width="11"/>` +
        `<circle cx="332" cy="690" r="46" fill="none" stroke="${K}" stroke-width="22"/><circle cx="332" cy="690" r="46" fill="none" stroke="{accent}" stroke-width="13"/>`) });

    /* Camisa: polka dots (small, and big ones) all over the shirt and the sleeves */
    const dotsAll = (r, st) => { const d = (w, h, y0) => { let s2 = ''; for (let y = y0, k = 0; y < h; y += st, k++) for (let x = (k % 2) * st / 2 - 10; x < w; x += st) s2 += `<circle cx="${x}" cy="${y}" r="${r}" fill="{print}"/>`; return s2; };
      return [{ region: 'body.all', z: 12, mask: 'body_shirt', svg: d(2040, 1000, 300) }, { region: 'arms', z: 12, mask: 'head_sleeves', svg: d(780, 870, 10) }]; };
    const prt = slot('print');
    prt.options.push({ id: 'poa', label: 'Poá', layers: dotsAll(13, 64) }, { id: 'bolinhas', label: 'Bolinhas grandes', layers: dotsAll(30, 130) });
    prt.slider.hideOn.push('poa', 'bolinhas');

    /* Terceira peça: blazer, jeans jacket and vest, made from the lab coat cut short ('jaleco_curto', app.js):
       the coat's own pockets are covered, then lapel buttons, pocket flaps and stitching are drawn */
    const coat = slot('coat'), T3 = [3, 0, 0, 2024, 2024];
    const jal = coat.options.find(o => o.id === 'sim');
    coat.options.find(o => o.id === 'nao').hide = ['jaleco', 'jaleco_curto'];
    for (const o of coat.options) if (o.id !== 'nao') o.hide = (o.hide || []).concat('jaleco_curto');
    const cover = `<rect x="398" y="276" width="104" height="146" fill="{coat}"/><rect x="30" y="700" width="200" height="220" fill="{coat}"/><rect x="404" y="700" width="200" height="220" fill="{coat}"/>`;
    const flaps = `<path d="M70 690 H210 V724 Q140 736 70 724 Z M430 690 H570 V724 Q500 736 430 724 Z" fill="{coat}" stroke="${K}" stroke-width="5" stroke-linejoin="round"/>`;
    const buttons = col => [430, 580].map(y => `<circle cx="${(311 + (238 - 311) * (y - 46) / 721 - 22).toFixed(0)}" cy="${y}" r="14" fill="${col}" stroke="${K}" stroke-width="4"/>`).join('');
    const SHORT = ['jaleco'];
    coat.options.push(
      { id: 'blazer', label: 'Blazer', hide: SHORT, pickColors: { coat: '#2b3040' }, layers: jal.layers.concat([
        { rect: T3, z: 30.5, svg: cover + flaps + buttons('{coat-dark}') + `<path d="M470 330 H560" stroke="${K}" stroke-width="6" stroke-linecap="round"/>` }]) },
      { id: 'jaqueta', label: 'Jaqueta jeans', hide: SHORT, pickColors: { coat: '#5b7fb5' }, layers: jal.layers.concat([
        { rect: T3, z: 30.5, svg: cover + buttons('#c9a227') +
          `<path d="M80 250 H210 V330 Q145 344 80 330 Z M440 250 H570 V330 Q505 344 440 330 Z" fill="{coat}" stroke="${K}" stroke-width="5" stroke-linejoin="round"/>` +
          [[80, 210], [440, 570]].map(([a, b]) => `<circle cx="${(a + b) / 2}" cy="318" r="8" fill="#c9a227" stroke="${K}" stroke-width="3"/>`).join('') +
          `<path d="M24 780 H238 M414 780 H628 M672 780 H1155 M1209 780 H1995 M90 262 H200 M450 262 H560" fill="none" stroke="#e8b84a" stroke-width="5" stroke-dasharray="14 10"/>` }]) },
      // the vest: no coat sleeves (the shirt's sleeves show)
      { id: 'colete', label: 'Colete', hide: SHORT, pickColors: { coat: '#cfc6ad' }, layers: [
        { rect: T3, z: 30.5, svg: cover + [[70, 420], [430, 420], [70, 600], [430, 600]].map(([x, y]) => `<rect x="${x}" y="${y}" width="140" height="120" fill="{coat}" stroke="${K}" stroke-width="5"/><path d="M${x} ${y + 30} H${x + 140}" stroke="${K}" stroke-width="4"/>`).join('') +
          buttons('{coat-dark}') }] });
    // the coat's switches: 'Fechado' stays for the long coats; 'Manga curta' also for the blazer and the jacket
    const mc = coat.toggles.find(t => t.id === 'jalecocurta'); mc.showOn = mc.showOn.concat('blazer', 'jaqueta');
    for (const L of mc.layers) if (L.if && L.if.coat) L.if = { ...L.if, coat: L.if.coat.concat('blazer', 'jaqueta') };

    /* ---------- Uniformes (2026-11-25): pieces for the uniform presets (Corpo > Uniforme) ---------- */
    // Camisa: Farda (two chest pockets with flaps, a button strip and a patch on the arm), Camuflado,
    // Faixas refletivas (firefighters) and Seleção (green trim and a small Brazilian flag)
    const farda = [{ region: 'body.front', z: 12, svg:
      `<path d="M361 30 V618" stroke="{shirt-dark}" stroke-width="10"/>` + [120, 230, 340, 450, 560].map(y => `<circle cx="361" cy="${y}" r="13" fill="{shirt-dark}"/>`).join('') +
      [170, 552].map(x => `<rect x="${x - 82}" y="170" width="164" height="150" rx="10" fill="none" stroke="{shirt-dark}" stroke-width="9"/>` +
        `<path d="M${x - 90} 165 H${x + 90} V215 Q${x} 245 ${x - 90} 215 Z" fill="{shirt}" stroke="{shirt-dark}" stroke-width="9" stroke-linejoin="round"/><circle cx="${x}" cy="218" r="11" fill="{shirt-dark}"/>`).join('') +
      `<rect x="470" y="95" width="120" height="42" rx="6" fill="{print}" stroke="{shirt-dark}" stroke-width="6"/>` },
      { region: 'arms', z: 12, mask: 'head_sleeves', svg: `<path d="M300 90 Q380 60 460 90 L450 210 Q380 240 310 210 Z" fill="{print}" stroke="{shirt-dark}" stroke-width="8"/>` }];
    let cs = 11; const cr = () => { cs = (cs * 16807) % 2147483647; return cs / 2147483647; };
    const blobs = (w, h, n, fill) => Array.from({ length: n }, () => { const x = cr() * w, y = cr() * h, r = 40 + cr() * 70, a = (cr() * 180).toFixed(0);
      return `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${r.toFixed(0)}" ry="${(r * 0.55).toFixed(0)}" transform="rotate(${a} ${x.toFixed(0)} ${y.toFixed(0)})" fill="${fill}"/>`; }).join('');
    const camo = [{ region: 'body.all', z: 12, mask: 'body_shirt', svg: blobs(2040, 1100, 70, '{print}') + blobs(2040, 1100, 70, '{shirt-dark}') },
      { region: 'arms', z: 12, mask: 'head_sleeves', svg: blobs(780, 870, 24, '{print}') + blobs(780, 870, 24, '{shirt-dark}') }];
    const rband = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="64" fill="#e8e23a"/><rect x="${x}" y="${y + 18}" width="${w}" height="28" fill="#d3d8de"/>`;
    const refl = [{ region: 'body.all', z: 12, mask: 'body_shirt', svg: rband(-10, 640, 2050) + rband(-10, 850, 2050) },
      { region: 'arms', z: 12, mask: 'head_sleeves', svg: rband(-10, 250, 790) + rband(-10, 470, 790) }];
    const flag = `<g transform="translate(500 120)"><rect x="-52" y="-36" width="104" height="72" fill="#1f9a46" stroke="#1d1712" stroke-width="5"/>` +
      `<path d="M0 -28 L44 0 L0 28 L-44 0 Z" fill="#f7d117"/><circle r="17" fill="#1f4fa3"/><path d="M-16 -3 Q0 -9 16 3" stroke="#ffffff" stroke-width="4" fill="none"/></g>`;
    const selecao = [{ region: 'body.front', z: 12, svg: `<path d="M220 -10 Q361 150 502 -10" fill="none" stroke="#1f9a46" stroke-width="34"/>` + flag },
      { region: 'body.back', z: 12, svg: `<path d="M240 -10 Q361 90 482 -10" fill="none" stroke="#1f9a46" stroke-width="34"/>` },
      { region: 'arms', z: 12, mask: 'head_sleeves', svg: `<rect x="-10" y="292" width="790" height="34" fill="#1f9a46"/><rect x="-10" y="520" width="790" height="34" fill="#1f9a46"/>` }];
    prt.options.push({ id: 'farda', label: 'Farda', layers: farda }, { id: 'camuflado', label: 'Camuflado', layers: camo },
      { id: 'refletiva', label: 'Faixas refletivas', layers: refl }, { id: 'selecao', label: 'Seleção', layers: selecao });
    prt.slider.hideOn.push('farda', 'camuflado', 'refletiva', 'selecao');

    // Na cabeça: Touca (scrub cap), Capacete (made like the field hat: only the front piece changes) and Quepe
    const touca = piece(`M176 236 C150 40 330 -70 518 -70 C706 -70 886 40 860 236 Q700 214 518 220 Q336 214 176 236 Z`, { fill: '{headwear}',
        light: `M240 140 Q290 20 400 -30`, lines: `M300 210 Q320 90 420 20 M736 210 Q716 90 616 20 M518 -60 V214` }) +
      `<path d="M176 236 Q336 210 518 218 Q700 210 860 236" fill="none" stroke="{headwear-dark}" stroke-width="22"/>`;
    const helF = FOLD(120), capF = FOLD(150);
    const capacete = piece(`M200 ${helF} C190 10 340 -80 518 -80 C696 -80 846 10 836 ${helF} Z`, { fill: '{headwear}',
        light: `M260 ${helF - 60} Q290 10 410 -40`, lines: `M518 -76 V${helF - 4}` }) +
      `<path d="M470 -78 Q518 -100 566 -78 L560 ${helF} H476 Z" fill="{headwear}" stroke="#1d1712" stroke-width="7" stroke-linejoin="round"/>` +
      brimSvg(518, helF, 400, 80, 318, '{headwear}');
    const quepe = piece(`M150 ${capF - 170} Q518 ${capF - 270} 886 ${capF - 170} Q840 ${capF - 100} 760 ${capF - 90} H276 Q196 ${capF - 100} 150 ${capF - 170} Z`, { fill: '{headwear}', light: `M220 ${capF - 170} Q400 ${capF - 220} 560 ${capF - 214}` }) +
      piece(`M260 ${capF - 100} H776 V${capF} H260 Z`, { fill: '{headwear-dark}', lines: `M260 ${capF - 50} H776` }) +
      `<circle cx="518" cy="${capF - 72}" r="30" fill="#d4a017" stroke="#1d1712" stroke-width="6"/>` +
      brimSvg(518, capF, 300, 120, 258, '#1d1712');
    slot('headwear').options.push(
      // the scrub cap is only drawn on the head (no piece in front): the front hair piece is left out
      { id: 'touca', label: 'Touca', pickColors: { headwear: '#7fb8e0' }, drop: ['hairfront'], hide: ['cabelo_frente'], layers: capHead(200) },
      { id: 'capacete', label: 'Capacete', pickColors: { headwear: '#f2c230' }, ...HB, brim: { cx: 518, rx: 400, fold: helF, depth: 80, tilt: 80 }, layers: capHead(120).concat([{ region: 'hair.front', z: 45, svg: capacete }]) },
      { id: 'quepe', label: 'Quepe', pickColors: { headwear: '#2e3f66' }, ...HB, brim: { cx: 518, rx: 300, fold: capF, depth: 120, tilt: 62 }, layers: capHead(150).concat([{ region: 'hair.front', z: 45, svg: quepe }]) });

    /* Science uniforms (2026-11-25): safety goggles, the astronaut's suit (print) and helmet */
    slot('glasses').options.push({ id: 'protecao', label: 'Óculos de proteção', layers: [{ region: 'head.front', z: 40, svg:
      // one wide lens like ski goggles, covering both eyes whole, with a notch over the nose and a short strap on each side
      `<path d="M38 545 H-10 M848 545 H897" stroke="{accent}" stroke-width="44"/>` +
      `<path d="M62 374 Q443 334 824 374 Q866 540 834 690 Q650 724 548 668 Q443 612 338 668 Q236 724 52 690 Q20 540 62 374 Z" fill="#dff3ff" fill-opacity="0.38" stroke="{accent}" stroke-width="26" stroke-linejoin="round"/>` +
      `<path d="M112 414 Q220 396 310 400" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" opacity="0.8"/>` }] });
    const brFlag = `<rect x="-60" y="-40" width="120" height="80" fill="#1f9a46" stroke="#1d1712" stroke-width="5"/><path d="M0 -32 L50 0 L0 32 L-50 0 Z" fill="#f7d117"/><circle r="19" fill="#1f4fa3"/>` +
      `<path d="M-18 -4 Q0 -10 18 2" fill="none" stroke="#ffffff" stroke-width="4"/>`;
    const patch = `<g transform="translate(527 262) scale(1.15)">${brFlag}</g>`;
    prt.options.push({ id: 'macacao', label: 'Macacão', layers: [
      // a closed suit: the round neckline and the top of the body under the head take the suit colour (no skin shows)
      { region: 'body.all', z: 30.6, svg: `<ellipse cx="386" cy="331" rx="100" ry="48" fill="{shirt}"/><rect x="1090" y="428" width="110" height="84" fill="{shirt}"/>` },{ region: 'body.front', z: 12, svg:
        `<path d="M361 20 V618" stroke="{shirt-dark}" stroke-width="14"/><path d="M361 20 V618" stroke="{print}" stroke-width="5" stroke-dasharray="10 10"/>` + patch +
        `<rect x="110" y="236" width="170" height="52" rx="8" fill="{print}" stroke="{shirt-dark}" stroke-width="6"/><path d="M130 262 H260" stroke="{shirt-dark}" stroke-width="8"/>` +
        `<rect x="120" y="330" width="150" height="120" rx="12" fill="none" stroke="{shirt-dark}" stroke-width="8"/><rect x="452" y="330" width="150" height="120" rx="12" fill="none" stroke="{shirt-dark}" stroke-width="8"/>` },
] });
    prt.slider.hideOn.push('macacao');
    // astronaut's helmet: white all round the head, the front piece a frame with the face showing through
    // round, with a round opening (a bit of the mouth shows), the dark visor raised above it, ear knobs and a neck ring
    // (on this plane the face is 0.805 x head.front px: hair x = 161 + 0.805 x, hair y = 166 + 0.805 y)
    const OPEN = `M233 560 A285 240 0 1 0 803 560 A285 240 0 1 0 233 560 Z`;
    const astro = `<defs><clipPath id="visorUp"><rect x="0" y="-100" width="1100" height="645"/></clipPath></defs>` +
      `<rect x="240" y="950" width="556" height="84" rx="32" fill="{headwear-dark}" stroke="#1d1712" stroke-width="8"/>` +
      `<path d="M48 520 A470 460 0 1 0 988 520 A470 460 0 1 0 48 520 Z ${OPEN}" fill="{headwear}" fill-rule="evenodd" stroke="#1d1712" stroke-width="8"/>` +
      `<g clip-path="url(#visorUp)"><path d="M183 520 A335 300 0 1 1 853 520 A335 300 0 1 1 183 520 Z ${OPEN}" fill="#1d2433" fill-rule="evenodd" stroke="#1d1712" stroke-width="8"/>` +
      `<path d="M285 330 Q390 250 520 246" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round" opacity="0.55"/></g>` +
      `<path d="${OPEN}" fill="none" stroke="#9aa0aa" stroke-width="18"/>` +
      `<path d="M150 270 Q240 140 390 90" fill="none" stroke="#ffffff" stroke-width="22" stroke-linecap="round" opacity="0.7"/>` +
      `<rect x="26" y="430" width="68" height="200" rx="24" fill="{headwear-dark}" stroke="#1d1712" stroke-width="6"/><rect x="942" y="430" width="68" height="200" rx="24" fill="{headwear-dark}" stroke="#1d1712" stroke-width="6"/>`;
    const whole = r => ({ region: r, z: 40, svg: `<rect x="-10" y="-10" width="2000" height="2000" fill="{accent}"/>` });
    slot('headwear').options.push({ id: 'astronauta', label: 'Capacete de astronauta', pickColors: { headwear: '#f4f4f4' }, drop: ['hairfront'], hide: ['cabelo_tras'], show: ['cabelo_frente'],
      layers: [whole('head.top'), whole('head.side'), whole('head.back'), { region: 'hair.front', z: 45, svg: astro },
        // the underside of the head takes its colour from these two thin strips of texture 1
        // the face's corners stick out under the round helmet: white too, round the opening
        { region: 'head.front', z: 39, svg: `<path d="M-10 -10 H897 V897 H-10 Z M63 489 A380 325 0 1 0 823 489 A380 325 0 1 0 63 489 Z" fill="{accent}" fill-rule="evenodd"/>` },
        { rect: [1, 280, 976, 610, 12], z: 40, svg: `<rect x="-10" y="-10" width="700" height="40" fill="{accent}"/>` },
        { rect: [1, 1250, 1093, 420, 12], z: 40, svg: `<rect x="-10" y="-10" width="500" height="40" fill="{accent}"/>` }] });

    /* Hats and hair (2026-11-25). The big hairs can't go under a hat: with one, they are greyed in the menu and the
       arrows skip them (blocks, app.js). The other hairs are cut off where the hat sits (cutHair: the height, in each
       hair plane's own px, above which the hair pieces are not drawn), in 3D and on the printed sheet.
       Heights: a hat band at head.front y h is at y 167 + 0.8045 h on the front plane and 144 + 0.6946 h on the back
       one (from the model's UVs); on the front the brim's fold line is used, so the hair meets the brim. */
    // the rule (user, 2026-11-25): the hair must fit inside the hat's space; with a hat only the BACK hair piece is used
    const NO_HAT = ['cachovolume', 'blackpower', 'coque', 'cocar', 'faixa', 'trancascoque', 'puff', 'ondulado', 'longoondas', 'cacholateral', 'cacheadolongo'];
    const HATS = { bone: [210, 'o boné'], chapeu: [120, 'o chapéu'], capacete: [120, 'o capacete'], quepe: [150, 'o quepe'], touca: [200, 'a touca'] };
    for (const o of slot('headwear').options) {
      const hat = HATS[o.id]; if (!hat) continue; const [h, name] = hat;
      o.blocks = { hair: NO_HAT }; o.blockNote = `Não cabe com ${name}`;
      o.cutHair = { 'hair.front': 99999, 'hair.back': Math.round(144 + 0.6946 * h) };   // the front hair piece is left out whole
    }
    // the astronaut's helmet covers all the hair; only the hairlines that show through its opening stay
    Object.assign(slot('headwear').options.find(o => o.id === 'astronauta'), { blockNote: 'O capacete cobre o cabelo',
      blocks: { hair: '*', comprimento: '*', testa: ['livre', 'arco', 'ondas', 'reta', 'risca'] } });

    // every hair piece glued in front of the face can be left out by the cap and the hat (drop: ['hairfront'])
    for (const o of hair.options) for (const L of o.layers || []) if (L.region === 'hair.front' && !L.tag) L.tag = 'hairfront';
  }
  // VOL3-END
  slots.push({ id: 'pele', label: 'Pele', section: 'Rosto', colors: ['skin'] });
  const handOptions = [{ id: 'nada', label: 'Nada' }].concat(Object.entries(PROPS).map(([id, p]) => ({ id, label: p.label, prop: id })));
  // hand-held props are switched off for now (to be redrawn); to bring them back, push the rows again:
  // slots.push({ id: 'maodir', label: 'Mão direita', section: 'Acessórios', options: handOptions });
  // slots.push({ id: 'maoesq', label: 'Mão esquerda', section: 'Acessórios', options: handOptions });
  void handOptions;
  // socks with trainers: a band of the leg above the shoe (shoe top y 1474) in the sock colour, with a
  // ribbed top. Only on bare legs (never over long trousers); the 3/4 sock stops under a short trouser's hem.
  const sock = top => `<rect x="-10" y="${top}" width="2044" height="${1476 - top}" fill="{socks}"/>
    <path d="M-10 ${top} H2034" stroke="#1d1712" stroke-width="5"/><path d="M-10 ${top + 14} H2034" stroke="{socks-dark}" stroke-width="4"/>`;
  const SOCKS = [
    { id: 'meia', label: 'Meia curta', showOn: ['tenis'], layers: [{ region: 'body.all', z: 36.5, if: { sapatos: ['tenis'], bottoms: ['curta', 'bermuda', 'shorts'] }, svg: sock(1432) }] },
    { id: 'meia34', label: 'Meia 3/4', showOn: ['tenis'], layers: [
      { region: 'body.all', z: 36.6, if: { sapatos: ['tenis'], bottoms: ['bermuda', 'shorts'] }, svg: sock(1336) },
      { region: 'body.all', z: 36.6, if: { sapatos: ['tenis'], bottoms: ['curta'] }, svg: sock(1419) }] },
  ];
  slots.push({ id: 'sapatos', label: 'Calçado', section: 'Roupa', colors: ['shoes', 'socks'], toggles: SOCKS, options: [
    { id: 'tenis', label: 'Tênis' },
    // barefoot: skin over the whole shoe
    { id: 'descalco', label: 'Descalço', layers: [{ region: 'body.all', z: 31, svg: `<rect x="-10" y="1474" width="2044" height="170" fill="{skin}"/>` }, ANKLE] },
    // flip-flops: bare feet (skin) over the shoe band y 1473-1544, a thin sole and a V strap on the front of each foot (x 168 / 608)
    { id: 'chinelo', label: 'Chinelo', layers: [{ region: 'body.all', z: 31, svg:
      `<rect x="-10" y="1474" width="2044" height="58" fill="{skin}"/><rect x="-10" y="1530" width="2044" height="16" fill="{shoes}"/>
       <path d="M-10 1530 H2034" stroke="#1d1712" stroke-width="5"/>` +
      [168, 608].map(x => `<path d="M${x - 46} 1484 L${x} 1520 L${x + 46} 1484" fill="none" stroke="{shoes}" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x}" cy="1520" r="9" fill="{shoes}"/>`).join('') }, ANKLE] },
  ] });
  // each accessory row has its own colour: {accent} in its drawings becomes {glasses}, {headwear}...
  for (const sl of slots) if (['glasses', 'headwear', 'neck', 'earrings', 'wrist', 'bracelet'].includes(sl.id))
    for (const o of sl.options) for (const L of o.layers || []) if (L.svg) L.svg = L.svg.replace(/\{accent/g, '{' + sl.id);
  // hair length (long hairs only), right under the Cabelo row
  slots.splice(slots.findIndex(s => s.id === 'hair') + 1, 0, { id: 'comprimento', label: 'Comprimento', section: 'Cabelo', showIf: { hair: HAIR_LENGTH },
    options: [{ id: 'longo', label: 'Longo' }, { id: 'medio', label: 'Médio' }, { id: 'curto', label: 'Curto' }] });
  /* Mangas em degradê: when the shirt has a gradient the sleeves follow it (on by itself when the gradient is
     turned on; it can be turned off to give the sleeves their own colour). Coats keep their own sleeves. */
  {
    const sc = slots.find(s => s.id === 'sleevecut'); sc.toggles = sc.toggles || [];
    const LR = Object.assign(['direita', 'esquerda'], { of: 'shirt' });
    const fill = h => `<rect x="-10" y="-10" width="780" height="${h}" fill="{shirt}"/>` + (h < 800 ? `<path d="M-10 330 H780" stroke="#1d1712" stroke-width="7"/>` : '');
    sc.toggles.push({ id: 'mangadegrade', label: 'Mangas em degradê', ifGrad: 'shirt', showOn: ['longa', 'curta'], layers: [
      { region: 'arms', z: 11, mask: 'head_sleeves', if: { sleevecut: ['longa'] }, svg: fill(870) },
      { region: 'arms', z: 11, mask: 'head_sleeves', if: { sleevecut: ['curta'] }, svg: fill(340) },
      // left / right: the doll's left arm (its own copy) gets the other end of the ramp
      { region: 'arms.b', z: 11, mask: 'head_sleeves', maskFrom: 'arms', ifGradDirs: LR, if: { sleevecut: ['longa'], coat: ['nao', 'colete'] }, svg: fill(870) + CUFF },
      { region: 'arms.b', z: 11, mask: 'head_sleeves', maskFrom: 'arms', ifGradDirs: LR, if: { sleevecut: ['curta'], coat: ['nao', 'colete'] }, svg: fill(340) }] });
  }
  // the neckline row goes right under the sleeves row
  { const [g] = slots.splice(slots.findIndex(s => s.id === 'gola'), 1); slots.splice(slots.findIndex(s => s.id === 'sleevecut') + 1, 0, g); }
  // menu order (from the first test round): Cabelo, Rosto, Corpo (skin, clothes, then the extras jaleco and saia),
  // Acessórios from the head down. A row not listed here goes to the end of its section.
  // Boca: smiles first (with and without lipstick), then the other faces, the masks last
  { const m = slots.find(s => s.id === 'mouth'), order = ['original', 'aberto', 'aparelho', 'labios', 'batomsorriso', 'lingua', 'lado', 'surpresa', 'serio', 'triste', 'mascara', 'mascaraazul'];
    m.options.sort((a, b) => (order.indexOf(a.id) + 1 || 99) - (order.indexOf(b.id) + 1 || 99)); }
  /* Uniforme: ready-made sets of clothes and accessories. Picking one changes the other rows (they can still be
     changed one by one after); the uniform itself is not saved. Listed in alphabetical order, Seleção brasileira last. */
  {
    const D = '#1d1712';
    const RESET = { choices: { print: 'lisa', shirtlen: 'normal', gola: 'redonda', sleevecut: 'longa', bottoms: 'comprida', pockets: 'com', belt: 'classico',
      sapatos: 'tenis', coat: 'nao', skirt: 'nao', headwear: 'nada', neck: 'nada', gloves: 'sem' },
      toggles: ['jalecofechado', 'jalecocurta', 'bolsos', 'meia', 'meia34', 'mangadegrade', 'plissada', 'umbigo'] };
    const U = (id, label, choices, colors, toggles = []) => ({ id, label, choices, colors, toggles });
    const same = (c, ...ids) => Object.fromEntries(ids.map(i => [i, c]));
    const uniforms = [
      U('aeronautica', 'Aeronáutica', { print: 'farda', gola: 'colarinho', coat: 'blazer', headwear: 'quepe' },
        { ...same('#9cbfe0', 'shirt', 'sleeves'), ...same('#2e3f66', 'coat', 'pants', 'headwear'), ...same(D, 'shoes', 'socks', 'belt'), print: '#d4a017' }),
      U('bombeiros', 'Bombeiros', { print: 'refletiva', headwear: 'capacete', gloves: 'com' },
        { ...same('#b8262b', 'shirt', 'sleeves', 'pants'), headwear: '#f2c230', gloves: '#3a3a3a', ...same(D, 'shoes', 'belt') }),
      U('engenharia', 'Engenharia', { coat: 'colete', headwear: 'capacete' },
        { ...same('#3c64c8', 'shirt', 'sleeves'), coat: '#f28c28', headwear: '#ffffff', pants: '#4c97da', shoes: '#7e5c1c', belt: '#7e5c1c' }),
      U('enfermagem', 'Enfermagem', { coat: 'sim', headwear: 'touca', mouth: 'mascaraazul', neck: 'cracha' },
        { ...same('#4a90c8', 'shirt', 'sleeves', 'coat', 'pants', 'shoes', 'headwear', 'neck'), socks: '#ffffff' }, ['jalecofechado']),
      U('exercito', 'Exército', { print: 'camuflado', headwear: 'capacete' },
        { ...same('#6b7a45', 'shirt', 'sleeves'), print: '#3f4a28', ...same('#4f5a33', 'pants', 'headwear'), ...same(D, 'shoes', 'belt') }),
      U('marinha', 'Marinha', { print: 'farda', gola: 'colarinho', headwear: 'quepe' },
        { ...same('#f4f4f4', 'shirt', 'sleeves', 'pants', 'shoes', 'socks', 'headwear'), print: '#1f2f55', belt: D }),
      U('medicina', 'Medicina', { coat: 'sim', neck: 'estetoscopio' },
        { ...same('#8fc1e3', 'shirt', 'sleeves'), coat: '#ffffff', pants: '#2b3040', ...same(D, 'shoes', 'belt') }),
      U('policia', 'Polícia', { print: 'farda', gola: 'colarinho', headwear: 'bone' },
        { ...same('#2e3a4f', 'shirt', 'sleeves', 'pants'), headwear: '#1d2433', print: '#d4a017', ...same(D, 'shoes', 'belt') }),
      U('astronauta', 'Astronauta', { print: 'macacao', gola: 'redonda', headwear: 'astronauta', gloves: 'com', belt: 'sem', pockets: 'sem' },
        { ...same('#f4f4f4', 'shirt', 'sleeves', 'pants', 'shoes', 'socks', 'gloves', 'headwear'), print: '#e8eaee' }),
      U('biologia', 'Biologia de campo', { coat: 'colete', headwear: 'bone' },
        { ...same('#e9e1c6', 'shirt', 'sleeves'), coat: '#5b7f4a', headwear: '#5b7f4a', pants: '#7a6a48', shoes: '#5a3e24', belt: '#5a3e24' }),
      U('farmacia', 'Farmácia', { coat: 'blazer', neck: 'cracha' },
        { ...same('#d9ecf7', 'shirt', 'sleeves'), coat: '#ffffff', neck: '#2a9d8f', pants: '#2b3040', ...same(D, 'shoes', 'belt') }),
      U('paleontologia', 'Paleontologia', { print: 'farda', gola: 'colarinho', headwear: 'chapeu', sleevecut: 'curta' },
        { ...same('#c8b48a', 'shirt', 'sleeves'), print: '#8a7a55', headwear: '#d8cdb0', pants: '#8a7a55', shoes: '#5a3e24', belt: '#5a3e24' }),
      U('quimica', 'Química', { coat: 'sim', glasses: 'protecao', gloves: 'com' },
        { ...same('#f2b8c6', 'shirt', 'sleeves'), coat: '#ffffff', glasses: '#3c64c8', gloves: '#7c7ce8', pants: '#2b3040', ...same(D, 'shoes', 'belt') }, ['jalecofechado']),
      U('veterinaria', 'Veterinária', { coat: 'sim', neck: 'estetoscopio' },
        { ...same('#3f9a7a', 'shirt', 'sleeves', 'coat', 'pants'), ...same(D, 'shoes', 'belt') }, ['jalecofechado']),
    ].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    // the Brazilian team goes last (user's wish): bermuda shorts, no belt, 3/4 socks
    uniforms.push(U('selecao', 'Seleção brasileira', { print: 'selecao', sleevecut: 'curta', bottoms: 'bermuda', belt: 'sem', sapatos: 'tenis' },
      { ...same('#f7d117', 'shirt', 'sleeves'), pants: '#1f4fa3', ...same('#ffffff', 'socks', 'shoes') }, ['meia34']));
    slots.push({ id: 'uniforme', label: 'Uniforme', section: 'Corpo', uniforms, uniformReset: RESET });
  }
  const MENU = {
    Cabelo: ['hair', 'comprimento', 'testa'],
    Rosto: ['brows', 'eyes', 'nose', 'mouth', 'cheeks'],
    Corpo: ['pele', 'uniforme', 'print', 'shirtlen', 'gola', 'sleevecut', 'bottoms', 'pockets', 'belt', 'sapatos', 'coat', 'skirt'],
    'Acessórios': ['headwear', 'glasses', 'earrings', 'piercing', 'browpiercing', 'nosepiercing', 'neck'],
  };
  const SECS = Object.keys(MENU);
  for (const sl of slots) { const sec = SECS.find(k => MENU[k].includes(sl.id)); if (sec) sl.section = sec; else if (sl.section === 'Roupa') sl.section = 'Corpo'; }
  const rank = sl => SECS.indexOf(sl.section) * 100 + (MENU[sl.section] || []).indexOf(sl.id) + ((MENU[sl.section] || []).includes(sl.id) ? 0 : 99);
  slots.sort((a, b) => rank(a) - rank(b));
  // always drawn, under everything else
  const base = [{ region: 'head.top', z: 0, svg: `<rect x="-10" y="-10" width="600" height="680" fill="{skin}"/>` }];
  // the Meninas nas Ciências logo, big and centred on the underside of the stand (inside the octagon)
  const BR = window.DOLL_BRAND;
  if (BR) { const h = 640, w = Math.round(h * BR.logoSize[0] / BR.logoSize[1]); base.push({ region: 'base.bottom', z: 5, at: [459 - w / 2, 459 - h / 2, w, h], src: BR.logo }); }
  window.DOLL_CATALOG = { regions, colors, slots, nameFonts, base, props: PROPS };
})();
