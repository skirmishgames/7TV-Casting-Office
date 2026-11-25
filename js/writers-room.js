/* Writers' Room: write your own episodes and tropes in the 7TV format, draw the playing area,
   and print them. Everything saves in this browser (CardStore 'episodes') and travels in the backup file. */
(function () {
  const R = window.SEVENTV_RULES;
  const D = window.SEVENTV_WRITERS_ROOM;
  const App = window.App;
  const PROFILES = window.SEVENTV_PROFILES || [];
  const $ = (s, el = document) => el.querySelector(s);
  const W = { docs: [], cur: null, built: false, spark: null };

  /* ---------- small DOM helpers ---------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(Infinity).forEach((kid) => { if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); });
    return el;
  }
  const NS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs, ...kids) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
    kids.flat(Infinity).forEach((kid) => { if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); });
    return el;
  }
  const opt = (value, label, sel) => h('option', { value, selected: sel || null }, label);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const lines = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const paras = (t) => String(t || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  const R2 = (n) => Math.round(n * 100) / 100;
  const snap = (v) => Math.round(v * 2) / 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const NUM = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

  /* ---------- genres and lookups ---------- */
  const GENRES = [];
  for (const set of ['core', '80s']) R.GENRE_SETS[set].genres.forEach((g) => GENRES.push({ key: g.key, name: g.name, set }));
  const bookName = (b) => (R.BOOKS[b] || { label: b }).label;
  const genreName = (k) => (GENRES.find((g) => g.key === k) || {}).name || '';
  const OPEN = (window.SEVENTV_EPISODES || []).filter((e) => e.type === 'Open play');
  const TROPES = window.SEVENTV_TROPES || [];
  const profileByName = (n) => PROFILES.find((p) => p.name.toLowerCase() === String(n || '').trim().toLowerCase()) || null;

  /* ---------- the documents ---------- */
  const section = (title) => ({ title: title || '', text: '', dice: 'None', rows: [] });
  function newMap(W0, H0) {
    const w = W0 || 36, hh = H0 || 36;
    return { w, h: hh, shapes: D.presets.edges.zones(w, hh), labels: {}, note: '', compass: 'none' };
  }
  function newEpisode() {
    return {
      id: App.uid(), type: 'episode', title: 'Untitled episode', tagline: '', genres: ['action', ''], basis: '',
      synopsisTitle: 'Synopsis', synopsis: '', production: '', location: '',
      casts: [newCast('heroic', 'defending'), newCast('villainous', 'attacking')],
      setup: { text: '', tokens: '1D6', maguffin: '' }, action: '',
      rules: newRules(), tokens: newTokens(),
      special: [], directors: [], credits: '', vp: [], vpMode: 'add', dressing: '',
      map: newMap()
    };
  }
  const newCast = (affiliation, role) => ({ affiliation, role, genre: '', ratings: '', intro: '', collect: true, members: [] });
  const newRules = () => ({ initiative: 'roll', deck: '', remove: '', noDouble: false, injuries: false, noGenreCards: false, noSteal: false });
  const newTokens = () => ({ carry: false, ordered: false, who: '', names: [] });
  /* fill in fields added after a script was first saved */
  function norm(d) {
    if (!d) return d;
    d.vp = d.vp || []; d.vpMode = d.vpMode || 'add';
    d.map = d.map || newMap(); d.map.compass = d.map.compass || 'none';
    if (d.type !== 'episode') return d;
    d.synopsisTitle = d.synopsisTitle || 'Synopsis';
    // fill gaps in place: the editor holds references to these objects
    const fillIn = (o, defs) => { for (const [k, v] of Object.entries(defs)) if (!(k in o)) o[k] = v; return o; };
    d.rules = fillIn(d.rules || {}, newRules());
    d.tokens = fillIn(d.tokens || {}, newTokens());
    d.casts.forEach((c) => { if (c.collect == null) c.collect = true; c.members.forEach((m) => { if (m.arrives == null) m.arrives = ''; }); });
    return d;
  }
  function newTrope() {
    return {
      id: App.uid(), type: 'trope', title: 'Untitled trope', tagline: '', genre: 'action',
      sections: [section('Set up'), section('Collecting objective tokens')],
      cameo: { on: false, deck: '' }, maguffin: '', vp: [], vpMode: 'add', useMap: false, map: newMap()
    };
  }
  const cur = () => W.cur;
  let saveT = 0;
  function save() {
    const d = cur(); if (!d) return;
    clearTimeout(saveT);
    saveT = setTimeout(async () => { await CardStore.putEpisode(clone(d)); renderList(); }, 300);
  }
  let prevT = 0;
  function later() { save(); clearTimeout(prevT); prevT = setTimeout(renderPreview, 150); }

  /* ---------- the printed page ---------- */
  function labelOf(d) {
    if (d.type === 'trope') return (genreName(d.genre) || 'Any genre') + ' trope';
    const g = (d.genres || []).filter(Boolean).map(genreName);
    const narrative = d.casts.some((c) => c.members.length);
    return (g.length ? g.join(' vs ') + ' · ' : '') + (narrative ? 'Narrative episode' : 'Episode');
  }
  function tableEl(s) {
    if (!s.rows || !s.rows.length || s.dice === 'None') return null;
    const head = s.dice === 'Token number' ? 'Token' : s.dice === 'Named list' ? 'Name' : s.dice;
    return h('table', { class: 'wr-table' },
      h('thead', {}, h('tr', {}, h('th', {}, head), h('th', {}, s.tableTitle || (s.title ? s.title + ' effects' : 'Result')))),
      h('tbody', {}, s.rows.filter((r) => s.dice !== 'Named list' || r[0] || r[1]).map((r) => h('tr', {}, h('td', { class: s.dice === 'Named list' ? 'wr-name' : 'num' }, rich(r[0])), h('td', {}, rich(r[1]))))));
  }
  /* light formatting: **bold**, *italic*, {PP} for a plot point star */
  function rich(t) {
    const out = [], re = /(\*\*[^*]+\*\*|\*[^*]+\*|\{PP\})/g;
    let last = 0, m;
    const s = String(t || '');
    while ((m = re.exec(s))) {
      if (m.index > last) out.push(s.slice(last, m.index));
      const x = m[0];
      if (x === '{PP}') out.push(h('span', { class: 'wr-pp', title: 'plot point' }, '★'));
      else if (x.startsWith('**')) out.push(h('b', {}, x.slice(2, -2)));
      else out.push(h('i', {}, x.slice(1, -1)));
      last = m.index + x.length;
    }
    if (last < s.length) out.push(s.slice(last));
    return out;
  }
  const P = (t) => paras(t).map((p) => h('p', {}, rich(p)));
  function sectionEl(s, level) {
    const body = [P(s.text), tableEl(s)];
    if (!s.title && !body.flat().filter(Boolean).length) return null;
    return h('div', { class: 'wr-sec' }, s.title ? h(level || 'h4', {}, s.title) : null, body);
  }
  function memberLine(m) {
    const n = +m.qty || 1;
    const plural = (t) => (/s$/i.test(t) ? t : t + 's');
    const who = n > 1 ? `${NUM[n] || n} ${m.name || plural(m.profile || 'model')}` : (m.name || m.profile || 'Unnamed');
    const bits = [m.profile && m.name ? m.profile : '', m.note, m.ratings !== '' && m.ratings != null ? `${m.ratings} rating${+m.ratings === 1 ? '' : 's'}` : ''].filter(Boolean);
    return h('li', {}, who + (bits.length ? ` (${bits.join(', ')})` : ''));
  }
  const ARRIVE_LINE = { 'Act One': 'Enters play at the start of Act One:', 'Act Two': 'Enters play at the start of Act Two:', Finale: 'Enters play at the start of the Finale:', Reserve: 'Held in reserve:' };
  function castEl(c) {
    if (!c.members.length && !c.intro) return null;
    const total = c.ratings !== '' ? c.ratings : c.members.reduce((t, m) => t + (+m.ratings || 0), 0);
    const g = genreName(c.genre);
    const lead = c.role === 'third'
      ? 'These third-party models act for neither cast and follow the cameo rules (Core Rulebook, pp. 146-147):'
      : `The ${c.affiliation} (${c.role})${g ? ' ' + g : ''} cast ${+total ? `is ${total} ratings and ` : ''}consists of:`;
    const groups = D.arrives.map(([a]) => [a, c.members.filter((m) => (m.arrives || '') === a)]).filter((x) => x[1].length);
    return h('div', { class: 'wr-cast' }, P(c.intro),
      c.members.length ? [h('p', {}, lead), groups.map(([a, ms]) => [a ? h('p', { class: 'wr-wave' }, ARRIVE_LINE[a]) : null, h('ul', {}, ms.map(memberLine))])] : null);
  }
  function legendOf(map) {
    const seen = [];
    map.shapes.forEach((s) => { if (s.k !== 'label' && D.pieces[s.k] && !seen.includes(s.k)) seen.push(s.k); });
    const out = seen.map((k) => [k, (map.labels && map.labels[k]) || D.pieces[k].legend]);
    if (map.shapes.some((s) => s.hz)) out.push(['hazard', (map.labels && map.labels.hazard) || 'Hazard (see special rules)']);
    return out;
  }
  /* add a piece near the middle of the board; the next one lands a little offset so they do not stack */
  function addPiece(map, k) {
    const s = Object.assign({ k }, clone(D.pieces[k].def)), off = (map.shapes.length % 5) * 2 - 4;
    if ('cx' in s) { s.cx = clamp(snap(map.w / 2 + off), 0, map.w); s.cy = clamp(snap(map.h / 2 + off), 0, map.h); if (s.w === 36) s.w = map.w; if (s.h === 36) s.h = map.h; }
    else { if (s.w === 36) s.w = map.w; if (k === 'zone-h') s.y = map.h - s.h; }
    if (k === 'objective') s.n = String(map.shapes.filter((x) => x.k === 'objective').length + 1);
    if (k === 'exit') { s.x = map.w - 1; s.y = 0; s.h = map.h; }
    map.shapes.push(s); renderEditor(); later();
    App.toast(`Added ${D.pieces[k].name.toLowerCase()}. Drag it into place, or click it to edit it.`);
  }
  const TOOL_GROUPS = [
    ['Set up', ['zone-h', 'zone-v', 'zone-n', 'exit']],
    ['Markers', ['objective', 'maguffin', 'search', 'cameo', 'waypoint', 'spawn', 'label']],
    ['Terrain', ['building', 'ruin', 'wall', 'woods', 'rough', 'hill', 'water', 'road', 'vehicle', 'crate', 'crater', 'platform']]
  ];
  const SHORT = { waypoint: 'Route marker', 'zone-h': 'Heroic area', 'zone-v': 'Villainous area', 'zone-n': 'Third area', exit: 'Escape edge', objective: 'Objective', search: 'Search point', cameo: 'Cameo', spawn: 'Spawn point', label: 'Text', wall: 'Wall', woods: 'Woods', rough: 'Rough ground', crate: 'Cover', crater: 'Crater', platform: 'Platform' };
  function mapToolbar(map) {
    return h('div', { class: 'wr-tools' },
      TOOL_GROUPS.map(([g, ks]) => h('div', { class: 'wr-toolgroup' }, h('span', { class: 'wr-toolhead' }, g),
        ks.map((k) => h('button', { type: 'button', class: 'wr-tool', title: 'Add ' + D.pieces[k].name.toLowerCase(), onclick: () => addPiece(map, k) }, h('i', { class: 'wr-sw wr-k-' + k }), SHORT[k] || D.pieces[k].name)))),
      h('p', { class: 'wr-toolhint' }, 'Click a piece above to add it. Drag pieces to move them. Click a piece on the map to edit its size, turn it, or remove it.'));
  }
  function mapFigure(map, editable) {
    const area = D.areas.find((a) => a[0] === map.w && a[1] === map.h);
    return h('figure', { class: 'wr-fig' }, editable ? mapToolbar(map) : null, mapSvg(map, editable),
      h('ul', { class: 'wr-legend' }, legendOf(map).map(([k, label]) => h('li', {}, h('i', { class: 'wr-sw wr-k-' + k }), label))),
      h('figcaption', {}, (area ? area[2] : `${map.w}" x ${map.h}"`) + ' playing area, grid squares 6 inches.' + (map.note ? ' ' + map.note : '')));
  }
  function docEl(d, editable) {
    const head = h('header', { class: 'wr-head' }, h('p', { class: 'wr-label' }, labelOf(d)), h('h2', { class: 'wr-title' }, d.title || 'Untitled'), d.tagline ? h('p', { class: 'wr-tag' }, d.tagline) : null);
    if (d.type === 'trope') {
      return h('article', { class: 'wr-doc' }, head,
        d.sections.map((s) => sectionEl(s, 'h3')),
        d.cameo.on ? h('div', { class: 'wr-sec' }, h('h3', {}, 'Cameo deck'), h('p', {}, 'Before play, shuffle these profile cards into a cameo deck: ', lines(d.cameo.deck.replace(/,/g, '\n')).join(', ') || '...', '. Cameos act on the cameo reactions table (Core Rulebook, p. 147).')) : null,
        d.maguffin ? h('div', { class: 'wr-sec' }, h('h3', {}, 'Maguffin'), P(d.maguffin)) : null,
        vpEl(d.vp, 'h3', false, d.vpMode),
        d.useMap ? mapFigure(d.map, editable) : null);
    }
    norm(d);
    const basis = OPEN.find((e) => e.t === d.basis);
    const casts = d.casts.map(castEl).filter(Boolean);
    const ru = d.rules, tk = d.tokens;
    const named = tk.names.filter((x) => x.label);
    const castName = (c) => c.role === 'third' ? 'third-party' : c.affiliation;
    const setupBits = [
      P(d.setup.text),
      d.setup.tokens && d.setup.tokens !== 'None' ? h('p', {}, d.setup.tokens === '1D6' ? 'Roll 1D6 for the number of objective tokens and place them following the standard steps (Core Rulebook, p. 67).' : `This scene uses ${d.setup.tokens} objective token${d.setup.tokens === '1' ? '' : 's'}${named.length ? ', placed as shown on the map' : '. Place them following the standard steps (Core Rulebook, p. 67)'}.`) : null,
      named.length ? h('ul', { class: 'wr-tokens' }, named.map((x) => h('li', {}, h('b', {}, `Token ${x.n}: `), rich(x.label)))) : null,
      tk.ordered ? h('p', {}, 'Objective tokens must be collected in numbered order.') : null,
      tk.who ? h('p', {}, 'Only these models can collect objective tokens: ', rich(tk.who), '.') : null,
      d.casts.filter((c) => !c.collect && c.role !== 'third' && (c.members.length || c.intro)).map((c) => h('p', {}, `The ${castName(c)} cast cannot collect objective tokens.`)),
      tk.carry ? h('p', {}, h('b', {}, 'Pick up and carry. '), 'A model in base contact with an objective token can spend a special action to pick it up. The token moves with the model, and the cast claims it only if one of its models still holds it when the scene ends. A carrying model can make one Move action per activation and cannot charge or make fight attacks, though it can still shoot and make presence attacks. If it is Knocked Down, Stunned or Immobilised, any model that moves into base contact can take the token as a free action. If it is removed from play, leave the token where it stood.') : null,
      d.setup.maguffin ? h('p', {}, h('b', {}, 'Maguffin: '), rich(d.setup.maguffin)) : null
    ];
    const prologueRules = [ru.injuries ? 'Use the injury rules (Core Rulebook, p. 196).' : '', ru.noGenreCards ? 'Genre cards are not used in this episode.' : ''].filter(Boolean);
    const actionRules = [
      ru.initiative === 'heroic' ? 'The heroic cast has the initiative and is on screen first.' : ru.initiative === 'villainous' ? 'The villainous cast has the initiative and is on screen first.' : '',
      ru.deck ? `Build the script deck from ${ru.deck} of each act card.` : '',
      ru.remove ? `Remove these script cards before play: ${ru.remove}.` : '',
      ru.noDouble ? 'You cannot flip two script cards in one turn.' : '',
      ru.noSteal ? 'Neither cast may Steal the Scene.' : ''
    ].filter(Boolean);
    return h('article', { class: 'wr-doc' }, head,
      d.synopsis ? [h('h3', {}, d.synopsisTitle || 'Synopsis'), P(d.synopsis)] : null,
      d.production ? [h('h3', {}, 'Production notes'), P(d.production)] : null,
      basis ? [h('h3', {}, 'Episode'), h('p', {}, `This is a ${basis.t.replace(/^The /, '')} episode (Core Rulebook, p. ${basis.p}). Use its rules except where this script says otherwise.`)] : null,
      casts.length ? [h('h3', {}, casts.length > 1 ? 'Casts' : 'Cast'), casts] : null,
      d.location ? [h('h3', {}, 'Location'), P(d.location)] : null,
      h('h3', { class: 'wr-act' }, 'Prologue'), prologueRules.map((t) => h('p', {}, t)), h('h4', {}, 'Set up'), setupBits, mapFigure(d.map, editable),
      h('h3', { class: 'wr-act' }, 'The scene'), h('h4', {}, 'And... action!'), actionRules.map((t) => h('p', {}, t)),
      d.action ? P(d.action) : (ru.initiative === 'roll' ? h('p', {}, 'Determine initiative as normal.') : null),
      d.special.length ? [h('h4', {}, 'Special rules'), d.special.map((s) => sectionEl(s, 'h5'))] : null,
      d.directors.filter((x) => x.name || x.text).length ? [h('h4', {}, "Director's cut"), h('p', { class: 'wr-keep' }, 'Add one of these conditions for variety:'),
        h('ul', {}, d.directors.filter((x) => x.name || x.text).map((x) => h('li', {}, x.name ? h('b', {}, x.name + ' - ') : null, rich(x.text))))] : null,
      h('h4', {}, 'End credits'), d.credits ? P(d.credits) : h('p', {}, 'The scene ends when one cast has no models left in play, or when the script deck runs out.'),
      h('h3', { class: 'wr-act' }, 'Epilogue'), vpEl(d.vp, 'h4', true, d.vpMode),
      d.dressing ? [h('h3', {}, 'Set dressing'), P(d.dressing)] : null);
  }
  function vpEl(vp, level, always, mode) {
    const rows = (vp || []).filter((r) => r.condition);
    if (!rows.length) return always ? [h(level, {}, 'Victory points'), h('p', {}, 'Use the standard victory points (Core Rulebook, p. 115).')] : null;
    return h('div', { class: 'wr-sec' }, h(level, {}, 'Victory points'),
      h('p', {}, mode === 'replace' ? 'Use these victory points instead of the standard ones (Core Rulebook, p. 115):' : 'In addition to the standard victory points (Core Rulebook, p. 115):'),
      h('table', { class: 'wr-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Victory condition'), h('th', {}, 'Who'), h('th', { class: 'num' }, 'VPs'))),
        h('tbody', {}, rows.map((r) => h('tr', {}, h('td', {}, rich(r.condition)), h('td', {}, r.who || 'Either cast'), h('td', { class: 'num' }, r.vp))))));
  }

  /* ---------- the playing area map ---------- */
  let mapSeq = 0;
  function mapSvg(map, editable) {
    const id = 'wrm' + (++mapSeq), Wd = map.w, Ht = map.h;
    const extra = map.compass && map.compass !== 'none' ? 2.2 : 0;
    const svg = sv('svg', { viewBox: `-3.5 -3.2 ${Wd + 7 + extra} ${Ht + 7.6}`, class: 'wr-map' + (editable ? ' wr-edit' : ''), role: 'img', 'aria-label': `Playing area map, ${Wd} by ${Ht} inches` });
    const hatch = (z) => sv('pattern', { id: `${id}-h${z}`, width: 1.3, height: 1.3, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, sv('line', { x1: 0, y1: 0, x2: 0, y2: 1.3, class: 'wr-hatch wr-hatch-' + z }));
    svg.append(sv('defs', {},
      sv('clipPath', { id: id + '-c' }, sv('rect', { x: 0, y: 0, width: Wd, height: Ht, rx: 1 })),
      sv('filter', { id: id + '-s', x: '-20%', y: '-20%', width: '140%', height: '150%' }, sv('feDropShadow', { dx: 0, dy: 0.25, stdDeviation: 0.25, 'flood-color': '#000', 'flood-opacity': 0.3 })),
      hatch('h'), hatch('v'), hatch('n')));
    svg.append(sv('rect', { x: 0, y: 0, width: Wd, height: Ht, rx: 1, class: 'wr-board' }));
    const g = sv('g', { 'clip-path': `url(#${id}-c)` });
    for (let v = 6; v < Wd; v += 6) g.append(sv('line', { x1: v, y1: 0, x2: v, y2: Ht, class: v % 12 ? 'wr-grid' : 'wr-major' }));
    for (let v = 6; v < Ht; v += 6) g.append(sv('line', { x1: 0, y1: v, x2: Wd, y2: v, class: v % 12 ? 'wr-grid' : 'wr-major' }));
    const shadow = `url(#${id}-s)`;
    // draw area pieces first, then terrain, then markers, so tokens sit on top
    const layer = (k) => (k.startsWith('zone') || ['water', 'road', 'rough', 'hill', 'exit', 'platform'].includes(k) ? 0 : ['objective', 'maguffin', 'search', 'cameo', 'waypoint', 'spawn', 'label'].includes(k) ? 2 : 1);
    const order = map.shapes.map((s, i) => i).sort((a, b) => layer(map.shapes[a].k) - layer(map.shapes[b].k) || a - b);
    for (const i of order) {
      const s = map.shapes[i], k = s.k, el = sv('g', { 'data-i': i, class: 'wr-shape' });
      const rot = (inner) => sv('g', { transform: `rotate(${s.rot || 0} ${s.cx} ${s.cy})` }, inner);
      const box = () => ({ x: R2(s.cx - s.w / 2), y: R2(s.cy - s.h / 2), width: s.w, height: s.h });
      if (k.startsWith('zone')) {
        const z = k.slice(-1), at = { x: s.x, y: s.y, width: s.w, height: s.h, rx: 0.4 };
        el.append(sv('rect', Object.assign({ class: 'wr-z wr-z-' + z }, at)), sv('rect', Object.assign({ fill: `url(#${id}-h${z})` }, at)), sv('rect', Object.assign({ class: 'wr-zl wr-zl-' + z }, at)));
      } else if (k === 'objective') {
        el.append(sv('circle', { cx: s.cx, cy: s.cy, r: 1.2, class: 'wr-k-objective', filter: shadow }), sv('text', { x: s.cx, y: R2(s.cy + 0.5), 'text-anchor': 'middle', class: 'wr-obj-n' }, String(s.n == null ? '' : s.n).slice(0, 2)));
      } else if (k === 'maguffin') {
        const r = 1.35, pts = Array.from({ length: 10 }, (_, j) => { const a = -Math.PI / 2 + j * Math.PI / 5, rr = j % 2 ? r * 0.45 : r; return `${R2(s.cx + rr * Math.cos(a))},${R2(s.cy + rr * Math.sin(a))}`; }).join(' ');
        el.append(sv('circle', { cx: s.cx, cy: s.cy, r: 1.55, class: 'wr-k-maguffin', filter: shadow }), sv('polygon', { points: pts, class: 'wr-star' }));
      } else if (k === 'search') {
        el.append(sv('rect', { x: R2(s.cx - 1.1), y: R2(s.cy - 0.9), width: 2.2, height: 1.8, rx: 0.25, class: 'wr-k-search', filter: shadow }),
          sv('text', { x: s.cx, y: R2(s.cy + 0.45), 'text-anchor': 'middle', class: 'wr-q' }, '?'));
      } else if (k === 'cameo') {
        el.append(sv('circle', { cx: s.cx, cy: s.cy, r: 1.15, class: 'wr-k-cameo', filter: shadow }), sv('circle', { cx: s.cx, cy: R2(s.cy - 0.38), r: 0.27, class: 'wr-person' }),
          sv('path', { d: `M${R2(s.cx - 0.6)} ${R2(s.cy + 0.72)} Q${R2(s.cx - 0.6)} ${R2(s.cy + 0.08)} ${s.cx} ${R2(s.cy + 0.08)} Q${R2(s.cx + 0.6)} ${R2(s.cy + 0.08)} ${R2(s.cx + 0.6)} ${R2(s.cy + 0.72)} Z`, class: 'wr-person' }));
      } else if (k === 'building') {
        const b = box(), long = s.w >= s.h;
        el.append(rot([sv('rect', Object.assign({ rx: 0.4, class: 'wr-k-building', filter: shadow }, b)),
          sv('rect', { x: R2(b.x + 0.7), y: R2(b.y + 0.7), width: R2(Math.max(0.2, s.w - 1.4)), height: R2(Math.max(0.2, s.h - 1.4)), rx: 0.25, class: 'wr-roof' }),
          long ? sv('line', { x1: R2(b.x + 0.7), y1: s.cy, x2: R2(b.x + s.w - 0.7), y2: s.cy, class: 'wr-roof' }) : sv('line', { x1: s.cx, y1: R2(b.y + 0.7), x2: s.cx, y2: R2(b.y + s.h - 0.7), class: 'wr-roof' })]));
      } else if (k === 'ruin') {
        const b = box();
        el.append(rot([sv('rect', Object.assign({ class: 'wr-k-ruin-floor' }, b)), sv('path', { d: `M${b.x} ${R2(b.y + s.h * 0.6)} V${b.y} H${R2(b.x + s.w * 0.55)} M${R2(b.x + s.w)} ${R2(b.y + s.h * 0.35)} V${R2(b.y + s.h)} H${R2(b.x + s.w * 0.4)}`, class: 'wr-k-ruin' })]));
      } else if (k === 'wall') {
        el.append(rot(sv('rect', Object.assign({ rx: 0.12, class: 'wr-k-wall', filter: shadow }, box()))));
      } else if (k === 'woods') {
        el.append(sv('ellipse', { cx: s.cx, cy: s.cy, rx: s.w / 2, ry: s.h / 2, class: 'wr-k-woods-base' }));
        const n = Math.max(3, Math.round(s.w * s.h / 9));
        for (let j = 0; j < n; j++) {
          const a = j * 2.399, rr = Math.sqrt((j + 0.5) / n) * 0.72;
          el.append(sv('circle', { cx: R2(s.cx + Math.cos(a) * rr * s.w / 2), cy: R2(s.cy + Math.sin(a) * rr * s.h / 2), r: R2(Math.min(s.w, s.h) * 0.14 + 0.35), class: 'wr-tree', filter: shadow }));
        }
      } else if (k === 'rough') {
        el.append(sv('ellipse', { cx: s.cx, cy: s.cy, rx: s.w / 2, ry: s.h / 2, class: 'wr-k-rough' }));
      } else if (k === 'hill') {
        el.append(sv('ellipse', { cx: s.cx, cy: s.cy, rx: s.w / 2, ry: s.h / 2, class: 'wr-k-hill' }), sv('ellipse', { cx: s.cx, cy: s.cy, rx: R2(s.w * 0.3), ry: R2(s.h * 0.3), class: 'wr-k-hill-top' }));
      } else if (k === 'water') {
        el.append(rot(sv('rect', Object.assign({ rx: 0.8, class: 'wr-k-water' }, box()))));
      } else if (k === 'road') {
        const b = box();
        el.append(rot([sv('rect', Object.assign({ class: 'wr-k-road' }, b)),
          s.w < s.h ? sv('line', { x1: s.cx, y1: b.y, x2: s.cx, y2: R2(b.y + s.h), class: 'wr-road-line' }) : sv('line', { x1: b.x, y1: s.cy, x2: R2(b.x + s.w), y2: s.cy, class: 'wr-road-line' })]));
      } else if (k === 'vehicle') {
        const b = box();
        el.append(rot([sv('rect', Object.assign({ rx: R2(Math.min(s.w, s.h) * 0.28), class: 'wr-k-vehicle', filter: shadow }, b)),
          sv('rect', { x: R2(b.x + s.w * 0.14), y: R2(b.y + s.h * 0.2), width: R2(s.w * 0.72), height: R2(s.h * 0.16), rx: 0.2, class: 'wr-glass' }),
          sv('rect', { x: R2(b.x + s.w * 0.14), y: R2(b.y + s.h * 0.7), width: R2(s.w * 0.72), height: R2(s.h * 0.1), rx: 0.2, class: 'wr-glass' })]));
      } else if (k === 'crate') {
        const b = box();
        el.append(rot([sv('rect', Object.assign({ rx: 0.15, class: 'wr-k-crate', filter: shadow }, b)), sv('path', { d: `M${b.x} ${b.y} L${R2(b.x + s.w)} ${R2(b.y + s.h)} M${R2(b.x + s.w)} ${b.y} L${b.x} ${R2(b.y + s.h)}`, class: 'wr-crate-x' })]));
      } else if (k === 'crater') {
        el.append(sv('ellipse', { cx: s.cx, cy: s.cy, rx: s.w / 2, ry: s.h / 2, class: 'wr-k-crater' }), sv('ellipse', { cx: s.cx, cy: R2(s.cy + s.h * 0.06), rx: R2(s.w * 0.32), ry: R2(s.h * 0.3), class: 'wr-k-crater-in' }));
      } else if (k === 'platform') {
        const b = box();
        el.append(rot([sv('rect', Object.assign({ class: 'wr-k-platform', filter: shadow }, b)),
          sv('rect', { x: R2(b.x + 0.6), y: R2(b.y + 0.6), width: R2(Math.max(0.2, s.w - 1.2)), height: R2(Math.max(0.2, s.h - 1.2)), class: 'wr-platform-in' })]),
          s.ht ? sv('text', { x: s.cx, y: R2(s.cy + s.h / 2 - 0.9), 'text-anchor': 'middle', class: 'wr-ht' }, `${s.ht}" high`) : null);
      } else if (k === 'waypoint') {
        const r = 1.3;
        el.append(sv('polygon', { points: `${s.cx},${R2(s.cy - r)} ${R2(s.cx + r)},${s.cy} ${s.cx},${R2(s.cy + r)} ${R2(s.cx - r)},${s.cy}`, class: 'wr-k-waypoint', filter: shadow }),
          sv('text', { x: s.cx, y: R2(s.cy + 0.38), 'text-anchor': 'middle', class: 'wr-wp-n' }, String(s.n || '').slice(0, 3)));
      } else if (k === 'spawn') {
        const pts = Array.from({ length: 16 }, (_, j) => { const a = -Math.PI / 2 + j * Math.PI / 8, rr = j % 2 ? 0.75 : 1.4; return `${R2(s.cx + rr * Math.cos(a))},${R2(s.cy + rr * Math.sin(a))}`; }).join(' ');
        el.append(sv('polygon', { points: pts, class: 'wr-k-spawn', filter: shadow }),
          s.n ? sv('text', { x: s.cx, y: R2(s.cy + 0.45), 'text-anchor': 'middle', class: 'wr-spawn-n' }, String(s.n).slice(0, 2)) : null);
      } else if (k === 'exit') {
        const vert = s.h > s.w;
        el.append(sv('rect', { x: s.x, y: s.y, width: s.w, height: s.h, class: 'wr-k-exit' }),
          sv('text', { x: R2(s.x + s.w / 2), y: R2(s.y + s.h / 2 + 0.4), 'text-anchor': 'middle', class: 'wr-exit-t', transform: vert ? `rotate(90 ${R2(s.x + s.w / 2)} ${R2(s.y + s.h / 2)})` : null }, 'ESCAPE'));
      } else if (k === 'label') {
        el.append(sv('text', { x: s.cx, y: s.cy, 'text-anchor': 'middle', class: 'wr-label-t' }, String(s.t || '')));
      }
      if (s.hz) {
        const round = ['woods', 'rough', 'hill', 'crater'].includes(k);
        el.append(round ? sv('ellipse', { cx: s.cx, cy: s.cy, rx: R2(s.w / 2 + 0.3), ry: R2(s.h / 2 + 0.3), class: 'wr-hz' })
          : sv('rect', { x: R2(s.cx - s.w / 2 - 0.3), y: R2(s.cy - s.h / 2 - 0.3), width: R2(s.w + 0.6), height: R2(s.h + 0.6), rx: 0.4, class: 'wr-hz', transform: `rotate(${s.rot || 0} ${s.cx} ${s.cy})` }));
      }
      if (s.hp) {
        const bx = R2(s.cx - 1.8), by = R2(s.cy - s.h / 2 + 0.35);
        el.append(sv('rect', { x: bx, y: by, width: 3.6, height: 1.3, rx: 0.3, class: 'wr-hp' }), sv('text', { x: s.cx, y: R2(by + 0.9), 'text-anchor': 'middle', class: 'wr-hp-t' }, 'Health ' + s.hp));
      }
      g.append(el);
    }
    svg.append(g, sv('rect', { x: 0, y: 0, width: Wd, height: Ht, rx: 1, class: 'wr-frame' }));
    const ang = { up: 0, right: 90, down: 180, left: 270 }[map.compass];
    if (ang != null) {
      const cx = Wd + 2.9, cy = 3.2, a = (ang - 90) * Math.PI / 180;
      svg.append(sv('g', { class: 'wr-compass' }, sv('circle', { cx, cy, r: 1.4, class: 'wr-compass-ring' }),
        sv('polygon', { points: '0,-1.2 0.55,0.8 0,0.35 -0.55,0.8', transform: `translate(${cx} ${cy}) rotate(${ang})`, class: 'wr-compass-arrow' }),
        sv('text', { x: R2(cx + Math.cos(a) * 2.2), y: R2(cy + Math.sin(a) * 2.2 + 0.45), 'text-anchor': 'middle', class: 'wr-compass-n' }, 'N')));
    }
    for (let v = 0; v <= Wd; v += 12) svg.append(sv('text', { x: v, y: -1.1, 'text-anchor': 'middle', class: 'wr-tick' }, v + '"'));
    for (let v = 0; v <= Ht; v += 12) svg.append(sv('text', { x: -1.1, y: v + 0.45, 'text-anchor': 'end', class: 'wr-tick' }, v + '"'));
    return svg;
  }

  /* Objective tokens: not within 12" of a start location, or within 6" of another token (Core p. 67) */
  const rectDist = (s, x, y) => { const dx = Math.max(s.x - x, 0, x - (s.x + s.w)), dy = Math.max(s.y - y, 0, y - (s.y + s.h)); return Math.hypot(dx, dy); };
  function tokenWarnings(map) {
    const zones = map.shapes.filter((s) => s.k.startsWith('zone')), toks = map.shapes.filter((s) => s.k === 'objective'), out = [];
    toks.forEach((t, i) => {
      if (zones.some((z) => rectDist(z, t.cx, t.cy) < 12)) out.push(`Token ${t.n || i + 1} is within 12" of a set-up area.`);
      toks.forEach((u, j) => { if (j > i && Math.hypot(t.cx - u.cx, t.cy - u.cy) < 6) out.push(`Tokens ${t.n || i + 1} and ${u.n || j + 1} are within 6" of each other.`); });
    });
    return out;
  }
  function scatterTokens(map, n) {
    const zones = map.shapes.filter((s) => s.k.startsWith('zone'));
    let best = null;
    for (let tries = 0; tries < 400; tries++) {
      const pts = [];
      for (let a = 0; a < 300 && pts.length < n; a++) {
        const x = snap(2 + Math.random() * (map.w - 4)), y = snap(2 + Math.random() * (map.h - 4));
        if (zones.some((z) => rectDist(z, x, y) < 12)) continue;
        if (pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < 6)) continue;
        pts.push([x, y]);
      }
      if (!best || pts.length > best.length) best = pts;
      if (pts.length === n) break;
    }
    map.shapes = map.shapes.filter((s) => s.k !== 'objective').concat(best.map(([x, y], i) => ({ k: 'objective', cx: x, cy: y, n: String(i + 1) })));
    return best.length;
  }

  /* ---------- editor ---------- */
  const field = (label, el, help) => h('label', { class: 'field wr-field' }, h('span', {}, label), el, help ? h('small', { class: 'hint' }, help) : null);
  const text = (obj, prop, attrs) => h('input', Object.assign({ type: 'text', value: obj[prop] || '', oninput: (e) => { obj[prop] = e.target.value; later(); } }, attrs || {}));
  const area = (obj, prop, attrs) => h('textarea', Object.assign({ value: obj[prop] || '', oninput: (e) => { obj[prop] = e.target.value; later(); } }, attrs || {}));
  const help = (t) => h('p', { class: 'hint wr-help' }, t);
  const btn = (label, fn, cls) => h('button', { type: 'button', class: 'btn btn-small ' + (cls || 'btn-ghost'), onclick: (e) => { e.preventDefault(); fn(); } }, label);
  const genreSelect = (val, onch, any) => h('select', { onchange: (e) => onch(e.target.value) }, opt('', any || 'None', !val),
    ['core', '80s'].map((set) => h('optgroup', { label: R.GENRE_SETS[set].label + ' genres' }, R.GENRE_SETS[set].genres.map((g) => opt(g.key, g.name, val === g.key)))));
  /* sections remember whether they are open, because the form redraws after structural changes */
  const OPEN_STATE = {};
  function block(title, open, ...kids) {
    const key = (cur() ? cur().type : '') + ':' + title;
    const isOpen = key in OPEN_STATE ? OPEN_STATE[key] : !!open;
    return h('details', { class: 'wr-block', 'data-key': key, open: isOpen || null }, h('summary', {}, title), kids);
  }

  function sectionEditor(s, list, i, again) {
    const rowsEl = h('div', { class: 'wr-rows' });
    const drawRows = () => {
      rowsEl.textContent = '';
      if (s.dice === 'None') return;
      const namedList = s.dice === 'Named list';
      s.rows.forEach((r, j) => rowsEl.append(h('div', { class: 'wr-row' + (namedList ? ' wr-row-named' : '') },
        h('input', { type: 'text', class: 'wr-roll', value: r[0], 'aria-label': namedList ? 'Name' : 'Roll', placeholder: namedList ? 'Name' : '', oninput: (e) => { r[0] = e.target.value; later(); } }),
        h('textarea', { rows: 2, value: r[1], 'aria-label': 'Result', oninput: (e) => { r[1] = e.target.value; later(); } }),
        btn('Remove', () => { s.rows.splice(j, 1); drawRows(); later(); }))));
      rowsEl.append(btn('Add row', () => { const next = s.dice === 'Named list' ? '' : s.dice === '2D6' ? String(Math.min(12, 2 + s.rows.length)) : String(s.rows.length + 1); s.rows.push([next, '']); drawRows(); later(); }));
    };
    const fill = () => {
      const n = s.dice === '1D3' ? 3 : s.dice === '1D6' || s.dice === 'Token number' ? 6 : s.dice === '2D6' ? 11 : s.dice === 'Named list' ? 5 : 0;
      s.rows = Array.from({ length: n }, (_, j) => [s.dice === 'Named list' ? ((s.rows[j] || [])[0] || '') : String(s.dice === '2D6' ? j + 2 : j + 1), (s.rows[j] || [])[1] || '']);
    };
    drawRows();
    return h('div', { class: 'wr-section' },
      h('div', { class: 'wr-section-head' }, text(s, 'title', { placeholder: 'Section name, for example Searching the ruins', 'aria-label': 'Section name' }),
        i > 0 ? btn('Up', () => { list.splice(i - 1, 0, list.splice(i, 1)[0]); again(); later(); }) : null,
        btn('Remove', () => { list.splice(i, 1); again(); later(); }, 'btn-ghost btn-danger')),
      area(s, 'text', { rows: 3, placeholder: 'Rules text. Leave a blank line between paragraphs. **bold**, *italic*, {PP} for a plot point.' }),
      h('div', { class: 'row wrap' }, h('span', { class: 'hint' }, 'Dice table'),
        h('select', { onchange: (e) => { s.dice = e.target.value; if (s.dice !== 'None' && !s.rows.length) fill(); drawRows(); later(); } }, D.dice.map((x) => opt(x, x, s.dice === x))),
        btn('Fill rows for this dice', () => { fill(); drawRows(); later(); })),
      rowsEl);
  }
  function sectionsEditor(list, addLabel, preset) {
    const box = h('div', { class: 'wr-sections' });
    const lib = () => h('select', { class: 'wr-lib', 'aria-label': 'Add from the rule library', onchange: (e) => {
      const sn = D.snippets[+e.target.value]; e.target.value = ''; if (!sn) return;
      list.push(clone(sn)); again(); later();
    } }, opt('', 'Add from the rule library...'), D.snippets.map((sn, i) => opt(String(i), sn.title)));
    const again = () => { box.textContent = ''; list.forEach((s, i) => box.append(sectionEditor(s, list, i, again))); box.append(h('div', { class: 'row wrap' }, btn(addLabel, () => { list.push(section(preset || '')); again(); later(); }, 'btn-ghost'), lib())); };
    again();
    return box;
  }
  function vpEditor(vp, holder) {
    const box = h('div', { class: 'wr-vps' });
    const again = () => {
      box.textContent = '';
      if (holder) box.append(h('div', { class: 'row wrap' },
        h('select', { 'aria-label': 'Standard victory points', onchange: (e) => { holder.vpMode = e.target.value; later(); } },
          opt('add', 'Add these to the standard victory points', holder.vpMode !== 'replace'), opt('replace', 'Use these instead of the standard ones', holder.vpMode === 'replace')),
        btn('Add the usual rows', () => { vp.push(...clone(D.vpStandard)); holder.vpMode = 'replace'; again(); later(); })));
      vp.forEach((r, i) => box.append(h('div', { class: 'wr-vp' },
        h('input', { type: 'text', value: r.condition, placeholder: 'For each hostage removed from play', 'aria-label': 'Condition', oninput: (e) => { r.condition = e.target.value; later(); } }),
        h('input', { type: 'text', value: r.who, placeholder: 'Villainous cast only', 'aria-label': 'Who scores it', oninput: (e) => { r.who = e.target.value; later(); } }),
        h('input', { type: 'text', value: r.vp, placeholder: '+1', class: 'wr-vpn', 'aria-label': 'VPs', oninput: (e) => { r.vp = e.target.value; later(); } }),
        btn('Remove', () => { vp.splice(i, 1); again(); later(); }))));
      box.append(btn('Add a victory condition', () => { vp.push({ condition: '', who: '', vp: '+1' }); again(); later(); }));
    };
    again();
    return box;
  }

  const PROFILE_LIST = h('datalist', { id: 'wrProfiles' }, PROFILES.map((p) => h('option', { value: p.name }, `${R.AFFILIATIONS[p.affiliation]} ${R.KINDS[p.kind].label}, ${R.BOOKS[R.bookOf(p)].label}`)));
  function castEditor(c, idx, d) {
    const list = h('div', { class: 'wr-members' });
    const total = h('span', { class: 'hint' });
    const sum = () => { total.textContent = `Members add up to ${c.members.reduce((t, m) => t + (+m.ratings || 0), 0)} ratings.`; };
    const again = () => {
      list.textContent = '';
      c.members.forEach((m, i) => {
        const price = () => { const p = profileByName(m.profile); if (p) { m.ratings = String(CastRules.memberCost(p, +m.qty || 1)); rat.value = m.ratings; } };
        const rat = h('input', { type: 'text', class: 'wr-vpn', value: m.ratings, 'aria-label': 'Ratings', oninput: (e) => { m.ratings = e.target.value; sum(); later(); } });
        list.append(h('div', { class: 'wr-member' },
          h('input', { type: 'number', min: 1, max: 12, class: 'wr-qty', value: m.qty || 1, 'aria-label': 'How many', oninput: (e) => { m.qty = +e.target.value || 1; price(); sum(); later(); } }),
          h('input', { type: 'text', value: m.name, placeholder: 'Character, for example Robin Hood', 'aria-label': 'Character', oninput: (e) => { m.name = e.target.value; later(); } }),
          h('input', { type: 'text', value: m.profile, list: 'wrProfiles', placeholder: 'Profile card', 'aria-label': 'Profile card', oninput: (e) => { m.profile = e.target.value; price(); sum(); later(); } }),
          rat,
          h('select', { 'aria-label': 'Enters play', onchange: (e) => { m.arrives = e.target.value; later(); } }, D.arrives.map(([v, l]) => opt(v, l, (m.arrives || '') === v))),
          btn('Remove', () => { c.members.splice(i, 1); again(); later(); })));
      });
      sum();
    };
    again();
    const fromSheet = h('select', { 'aria-label': 'Fill from a Call Sheet cast', onchange: async (e) => {
      const id = e.target.value; e.target.value = ''; if (!id) return;
      const cast = (await CardStore.casts()).find((x) => x.id === id); if (!cast || !window.CastUI) return;
      const dsc = window.CastUI.describe(cast);
      c.members = dsc.lines.map((l) => ({ qty: l.qty, name: '', profile: l.profile, ratings: String(l.cost), arrives: '' }));
      c.ratings = String(dsc.total); if (dsc.affiliation !== 'neutral') c.affiliation = dsc.affiliation;
      renderEditor(); later(); App.toast(`Filled from "${dsc.name}".`);
    } }, opt('', 'Fill from a Call Sheet cast...'));
    CardStore.casts().then((cs) => cs.forEach((x) => fromSheet.append(opt(x.id, x.name || 'Unnamed cast'))));
    return h('div', { class: 'wr-castbox' },
      h('div', { class: 'wr-grid3' },
        field('Affiliation', h('select', { onchange: (e) => { c.affiliation = e.target.value; later(); } }, ['heroic', 'villainous', 'neutral'].map((a) => opt(a, R.AFFILIATIONS[a], c.affiliation === a)))),
        field('Role', h('select', { onchange: (e) => { c.role = e.target.value; later(); } }, [['attacking', 'Attacking'], ['defending', 'Defending'], ['third', 'Third party (cameo rules)']].map(([a, l]) => opt(a, l, c.role === a)))),
        field('Genre', genreSelect(c.genre, (v) => { c.genre = v; later(); }))),
      field('Introduction', area(c, 'intro', { rows: 2, placeholder: 'Who they are and what they want in this scene.' })),
      h('label', { class: 'inline check' }, h('input', { type: 'checkbox', checked: c.collect !== false, onchange: (e) => { c.collect = e.target.checked; later(); } }), ' This cast can collect objective tokens'),
      h('div', { class: 'wr-member wr-member-head' }, h('span', {}, 'No.'), h('span', {}, 'Character'), h('span', {}, 'Profile card'), h('span', {}, 'Ratings'), h('span', {}, 'Enters'), h('span')),
      list,
      h('div', { class: 'row wrap' }, btn('Add a member', () => { c.members.push({ qty: 1, name: '', profile: '', ratings: '', arrives: '' }); again(); later(); }), fromSheet,
        idx > 1 ? btn('Remove this group', () => { d.casts.splice(idx, 1); renderEditor(); later(); }, 'btn-ghost btn-danger') : null),
      c.role === 'third' ? null : h('div', { class: 'row wrap' }, total, field('Cast total (blank to add up the members)', text(c, 'ratings', { class: 'wr-vpn', placeholder: String(c.members.reduce((t, m) => t + (+m.ratings || 0), 0)) }))));
  }

  function mapEditor(map) {
    const box = h('div', { class: 'wr-mapedit' });
    const sizeSel = h('select', { onchange: (e) => {
      const [w, hh] = e.target.value.split('x').map(Number), ow = map.w, oh = map.h;
      map.w = w; map.h = hh;
      // keep pieces in proportion, so a set-up along an edge stays on that edge
      map.shapes.forEach((s) => {
        if ('cx' in s) { s.cx = snap(s.cx * w / ow); s.cy = snap(s.cy * hh / oh); }
        else { const fx = (v) => snap(v * w / ow), fy = (v) => snap(v * hh / oh); const ex = s.x + s.w, ey = s.y + s.h; s.x = fx(s.x); s.y = fy(s.y); s.w = s.w === ow ? w : fx(ex) - s.x; s.h = s.h === oh ? hh : fy(ey) - s.y; if (s.w < 3 && ex === ow) s.x = w - s.w; }
      });
      renderEditor(); later();
    } }, D.areas.map(([w, hh, n]) => opt(`${w}x${hh}`, n, map.w === w && map.h === hh)));
    const presetSel = h('select', {}, Object.entries(D.presets).map(([k, p]) => opt(k, p.name)));
    const tokN = h('select', {}, opt('roll', 'Roll 1D6'), [1, 2, 3, 4, 5, 6].map((n) => opt(n, n + ' token' + (n > 1 ? 's' : ''))));
    const warn = h('div', { class: 'wr-warn' });
    const showWarn = () => { const w = tokenWarnings(map); warn.textContent = ''; if (w.length) warn.append(h('p', { class: 'hint' }, 'Objective token placement (Core p. 67): ' + w.join(' '))); };
    showWarn();
    const tbl = h('tbody');
    map.shapes.forEach((s, i) => {
      const K = D.pieces[s.k] || { name: s.k };
      const num = (p, step) => h('input', { type: 'number', step: step || 0.5, value: s[p], 'aria-label': p, oninput: (e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) { s[p] = v; later(); showWarn(); } } });
      const cells = [];
      if ('cx' in s) cells.push(h('span', { class: 'wr-xy' }, 'x ', num('cx'), ' y ', num('cy')));
      else cells.push(h('span', { class: 'wr-xy' }, 'x ', num('x'), ' y ', num('y')));
      if ('w' in s) cells.push(h('span', { class: 'wr-xy' }, 'w ', num('w'), ' h ', num('h')));
      if (K.rot) cells.push(h('span', { class: 'wr-xy' }, 'turn ', num('rot', 15)));
      if (K.n) cells.push(h('span', { class: 'wr-xy' }, 'no. ', h('input', { type: 'text', value: s.n || '', maxlength: 3, class: 'wr-n', oninput: (e) => { s.n = e.target.value; later(); } })));
      if (K.text) cells.push(h('span', { class: 'wr-xy' }, 'text ', h('input', { type: 'text', value: s.t || '', oninput: (e) => { s.t = e.target.value; later(); } })));
      if (K.height) cells.push(h('span', { class: 'wr-xy' }, 'height ', num('ht')));
      if (D.hazardable.includes(s.k)) cells.push(
        h('label', { class: 'wr-xy inline check' }, h('input', { type: 'checkbox', checked: !!s.hz, onchange: (e) => { s.hz = e.target.checked; renderEditor(); later(); } }), 'hazard'),
        h('span', { class: 'wr-xy' }, 'health ', h('input', { type: 'number', min: 0, max: 20, step: 1, value: s.hp || '', placeholder: '-', 'aria-label': 'Health', oninput: (e) => { s.hp = parseInt(e.target.value, 10) || 0; later(); } })));
      const copy = () => { const c = Object.assign({}, s); if ('cx' in c) { c.cx = clamp(c.cx + 2, 0, map.w); c.cy = clamp(c.cy + 2, 0, map.h); } else { c.x = clamp(c.x + 2, 0, map.w - c.w); c.y = clamp(c.y + 2, 0, map.h - c.h); } if (K.n) c.n = String((parseInt(s.n, 10) || 0) + 1); map.shapes.splice(i + 1, 0, c); renderEditor(); later(); };
      tbl.append(h('tr', { 'data-row': i }, h('td', {}, h('div', { class: 'wr-kind' }, h('i', { class: 'wr-sw wr-k-' + s.k }), K.name), h('div', { class: 'row' }, btn('Copy', copy), btn('Remove', () => { map.shapes.splice(i, 1); renderEditor(); later(); }))), h('td', {}, cells)));
    });
    const addSel = h('select', { 'aria-label': 'Piece to add' }, D.order.map((k) => opt(k, D.pieces[k].name)));
    box.append(
      h('div', { class: 'wr-grid3' }, field('Playing area', sizeSel),
        field('Set-up areas', h('div', { class: 'row' }, presetSel, btn('Apply', () => { map.shapes = D.presets[presetSel.value].zones(map.w, map.h).concat(map.shapes.filter((s) => !s.k.startsWith('zone'))); renderEditor(); later(); }))),
        field('Objective tokens', h('div', { class: 'row' }, tokN, btn('Scatter', () => {
          const n = tokN.value === 'roll' ? 1 + Math.floor(Math.random() * 6) : +tokN.value;
          const got = scatterTokens(map, n);
          renderEditor(); later();
          App.toast(got < n ? `Only ${got} of ${n} tokens fit 12" from the set-up areas and 6" apart. Try a bigger area or smaller set-up areas.` : `Placed ${n} objective token${n > 1 ? 's' : ''}, at least 12" from the set-up areas and 6" apart.`);
        }))),
        field('Compass', h('select', { onchange: (e) => { map.compass = e.target.value; later(); } }, [['none', 'None'], ['up', 'North is up'], ['right', 'North is right'], ['down', 'North is down'], ['left', 'North is left']].map(([v, l]) => opt(v, l, (map.compass || 'none') === v))))),
      help('Drag pieces on the map to move them. They snap to half inches. Type exact positions below: x and y are inches from the top-left corner.'),
      warn,
      h('div', { class: 'table-wrap' }, h('table', { class: 'wr-shapes' }, tbl)),
      h('div', { class: 'row wrap' }, addSel, btn('Add to map', () => addPiece(map, addSel.value), 'btn-primary')));
    const leg = legendOf(map);
    if (leg.length) box.append(h('details', { class: 'wr-sub' }, h('summary', {}, 'Rename the map key'),
      leg.map(([k]) => field(D.pieces[k] ? D.pieces[k].name : 'Hazard', h('input', { type: 'text', value: (map.labels || {})[k] || '', placeholder: D.pieces[k] ? D.pieces[k].legend : 'Hazard (see special rules)', oninput: (e) => { map.labels = map.labels || {}; map.labels[k] = e.target.value; later(); } })))));
    box.append(field('Note under the map', area(map, 'note', { rows: 2, placeholder: 'Fill the rest of the table with trees that block line of sight.' })));
    return box;
  }

  function renderEditor() {
    const root = $('#wrEditor');
    root.querySelectorAll('.wr-block').forEach((b) => { OPEN_STATE[b.dataset.key] = b.open; });
    const pc = root.querySelector('.wr-prevcol'), keepScroll = pc ? pc.scrollTop : 0;
    root.textContent = '';
    const d = norm(cur());
    if (!d) {
      root.append(h('div', { class: 'panel wr-empty' }, h('h2', {}, "Writers' Room"),
        h('p', {}, 'Write your own episodes and tropes in the same format as the rulebooks, draw the playing area, and print them for the table. Pick one on the left, start a new one, or roll a spark for ideas.')));
      return;
    }
    const isEp = d.type === 'episode';
    const head = h('div', { class: 'panel-head wr-actions' },
      h('h2', {}, isEp ? 'Episode' : 'Trope'),
      h('div', { class: 'row wrap' },
        btn('Print', () => printDoc(d), 'btn-primary'),
        btn('Export', () => exportDoc(d)),
        btn('Duplicate', async () => { const c = clone(d); c.id = App.uid(); c.title = (d.title || 'Untitled') + ' (copy)'; delete c.createdAt; await CardStore.putEpisode(c); W.docs = await CardStore.episodes(); W.cur = W.docs.find((x) => x.id === c.id); renderAll(); }),
        btn('Delete', async () => { if (!confirm(`Delete "${d.title || 'Untitled'}"?`)) return; await CardStore.removeEpisode(d.id); W.docs = await CardStore.episodes(); W.cur = null; renderAll(); }, 'btn-ghost btn-danger')));
    const form = h('div', { class: 'wr-form' });
    if (isEp) {
      form.append(
        block('Title and pitch', true,
          field('Title', text(d, 'title', { oninput: (e) => { d.title = e.target.value; later(); } })),
          field('Tagline', text(d, 'tagline', { placeholder: 'On All Hallows Eve, a strange mist descends...' })),
          h('div', { class: 'wr-grid3' }, field('Genre', genreSelect(d.genres[0], (v) => { d.genres[0] = v; later(); })), field('Versus', genreSelect(d.genres[1], (v) => { d.genres[1] = v; later(); }, 'Same genre or none'))),
          field('Built on an open play episode', h('select', { onchange: (e) => { d.basis = e.target.value; later(); } }, opt('', 'None, all its own rules', !d.basis), OPEN.map((e) => opt(e.t, `${e.t} (Core p. ${e.p})`, d.basis === e.t)))), help(D.episodeHelp.basis),
          field('Synopsis', area(d, 'synopsis', { rows: 4 })),
          h('div', { class: 'row wrap' }, h('span', { class: 'hint' }, 'Print it as'), h('select', { 'aria-label': 'Synopsis heading', onchange: (e) => { d.synopsisTitle = e.target.value; later(); } }, ['Synopsis', 'Opening crawl', 'The story so far'].map((x) => opt(x, x, d.synopsisTitle === x)))),
          help(D.episodeHelp.synopsis),
          field('Production notes (optional)', area(d, 'production', { rows: 3 })), help(D.episodeHelp.production)),
        block('Casts', false, help(D.episodeHelp.casts), help(D.episodeHelp.arrives),
          d.casts.map((c, i) => [h('h3', { class: 'wr-sub-h' }, c.role === 'third' ? 'Third party' : i === 0 ? 'First cast' : i === 1 ? 'Second cast' : 'Third cast'), c.role === 'third' ? help(D.episodeHelp.third) : null, castEditor(c, i, d)]),
          d.casts.length < 3 ? btn('Add a third party', () => { const c = newCast('neutral', 'third'); c.collect = false; d.casts.push(c); renderEditor(); later(); }) : null),
        block('Location and set up', false,
          field('Location', area(d, 'location', { rows: 3 })), help(D.episodeHelp.location),
          field('Set up', area(d.setup, 'text', { rows: 4, placeholder: 'The 3\' x 3\' playing area is a small village. The heroic cast sets up along the southern edge...' })), help(D.episodeHelp.setup),
          h('div', { class: 'wr-grid3' },
            field('Objective tokens', h('select', { onchange: (e) => { d.setup.tokens = e.target.value; later(); } }, ['1D6', '1', '2', '3', '4', '5', '6', 'None'].map((x) => opt(x, x === '1D6' ? 'Roll 1D6 (standard)' : x === 'None' ? 'None, or as written' : x, d.setup.tokens === x)))),
            field('Maguffin', text(d.setup, 'maguffin', { placeholder: 'A random maguffin, or name one' }))),
          h('h3', { class: 'wr-sub-h' }, 'Objective tokens'), help(D.episodeHelp.tokens), tokensEditor(d)),
        block('Playing area map', false, mapEditor(d.map)),
        block('Table rules', false, help(D.episodeHelp.rules), rulesEditor(d.rules)),
        block('The scene', false,
          field('And... action!', area(d, 'action', { rows: 2, placeholder: 'Anything else that happens as the scene starts. Initiative and the script deck are set under Table rules.' })), help(D.episodeHelp.action),
          h('h3', { class: 'wr-sub-h' }, 'Special rules'), help(D.episodeHelp.special), sectionsEditor(d.special, 'Add a special rule'),
          h('h3', { class: 'wr-sub-h' }, "Director's cut"), help(D.episodeHelp.directors), directorsEditor(d),
          field('End credits', area(d, 'credits', { rows: 2 })), help(D.episodeHelp.credits)),
        block('Epilogue and set dressing', false,
          h('h3', { class: 'wr-sub-h' }, 'Victory points'), help(D.episodeHelp.vp), vpEditor(d.vp, d),
          field('Set dressing', area(d, 'dressing', { rows: 3, placeholder: 'Trope: Haunted House (Core p. 161)\nMaguffin: Treasure Map (Core p. 199)' })), help(D.episodeHelp.dressing)));
    } else {
      form.append(
        block('Title and genre', true,
          field('Title', text(d, 'title')),
          field('Tagline', text(d, 'tagline', { placeholder: 'Whatever the treasure, it carries a curse...' })),
          field('Suggested genre', genreSelect(d.genre, (v) => { d.genre = v; later(); }, 'Any genre')), help(D.tropeHelp.intro)),
        block('Rules', true, help(D.tropeHelp.sections), sectionsEditor(d.sections, 'Add a section')),
        block('Cameos, maguffin and victory points', false,
          h('label', { class: 'inline check' }, h('input', { type: 'checkbox', checked: d.cameo.on, onchange: (e) => { d.cameo.on = e.target.checked; later(); } }), ' This trope uses a cameo deck'),
          field('Cameo deck profiles', area(d.cameo, 'deck', { rows: 2, placeholder: 'Bystander, Cop, Reporter, Thug, Zombie' })), help(D.tropeHelp.cameo),
          field('Maguffin', area(d, 'maguffin', { rows: 2 })), help(D.tropeHelp.maguffin),
          h('h3', { class: 'wr-sub-h' }, 'Victory points'), help(D.tropeHelp.vp), vpEditor(d.vp, d)),
        block('Playing area map', false,
          h('label', { class: 'inline check' }, h('input', { type: 'checkbox', checked: d.useMap, onchange: (e) => { d.useMap = e.target.checked; later(); } }), ' Print a map with this trope'),
          mapEditor(d.map)));
    }
    const prev = h('div', { id: 'wrPreview', class: 'wr-preview' });
    root.append(h('div', { class: 'panel' }, head, h('div', { class: 'wr-cols' }, form, h('div', { class: 'wr-prevcol' }, h('p', { class: 'hint' }, 'Preview. This is what prints.'), prev))));
    renderPreview();
    const pc2 = root.querySelector('.wr-prevcol'); if (pc2) pc2.scrollTop = keepScroll;
  }
  function tokensEditor(d) {
    const tk = d.tokens, box = h('div', { class: 'wr-tokbox' });
    const again = () => {
      box.textContent = '';
      box.append(
        h('label', { class: 'inline check' }, h('input', { type: 'checkbox', checked: tk.carry, onchange: (e) => { tk.carry = e.target.checked; later(); } }), ' Models pick up and carry objective tokens'),
        h('label', { class: 'inline check' }, h('input', { type: 'checkbox', checked: tk.ordered, onchange: (e) => { tk.ordered = e.target.checked; later(); } }), ' Tokens must be collected in numbered order'),
        field('Only these models can collect tokens (optional)', text(tk, 'who', { placeholder: 'Lisa, Troy and Albert' })),
        tk.names.map((x, i) => h('div', { class: 'wr-tokname' },
          h('input', { type: 'text', class: 'wr-n', value: x.n, 'aria-label': 'Token number', oninput: (e) => { x.n = e.target.value; later(); } }),
          h('input', { type: 'text', value: x.label, placeholder: "Manager's office: the keys", 'aria-label': 'What the token is', oninput: (e) => { x.label = e.target.value; later(); } }),
          btn('Remove', () => { tk.names.splice(i, 1); again(); later(); }))),
        h('div', { class: 'row wrap' },
          btn('Name a token', () => { tk.names.push({ n: String(tk.names.length + 1), label: '' }); again(); later(); }),
          btn('One for each token on the map', () => {
            const ns = d.map.shapes.filter((x) => x.k === 'objective').map((x) => String(x.n || ''));
            ns.forEach((n) => { if (!tk.names.some((x) => x.n === n)) tk.names.push({ n, label: '' }); });
            tk.names.sort((a, b) => (parseInt(a.n, 10) || 0) - (parseInt(b.n, 10) || 0));
            if (/^\d$/.test(String(ns.length)) && ns.length && d.setup.tokens === '1D6') d.setup.tokens = String(ns.length);
            renderEditor(); later();
          })));
    };
    again();
    return box;
  }
  function rulesEditor(ru) {
    const chk = (prop, label) => h('label', { class: 'inline check' }, h('input', { type: 'checkbox', checked: !!ru[prop], onchange: (e) => { ru[prop] = e.target.checked; later(); } }), ' ' + label);
    return h('div', { class: 'wr-rules' },
      h('div', { class: 'wr-grid3' },
        field('Initiative', h('select', { onchange: (e) => { ru.initiative = e.target.value; later(); } }, [['roll', 'Roll as normal'], ['heroic', 'Heroic cast goes first'], ['villainous', 'Villainous cast goes first']].map(([v, l]) => opt(v, l, ru.initiative === v)))),
        field('Script deck: cards of each act', h('input', { type: 'number', min: 1, max: 12, value: ru.deck, placeholder: 'Standard', oninput: (e) => { ru.deck = e.target.value; later(); } }))),
      field('Script cards to remove (optional)', text(ru, 'remove', { placeholder: 'Set Change, Script Editing' })),
      chk('noDouble', 'No flipping two script cards in one turn'),
      chk('noSteal', 'No Steal the Scene'),
      chk('injuries', 'Use the injury rules (Core p. 196)'),
      chk('noGenreCards', 'No genre cards'));
  }
  function directorsEditor(d) {
    const box = h('div', { class: 'wr-dirs' });
    const again = () => {
      box.textContent = '';
      d.directors.forEach((x, i) => box.append(h('div', { class: 'wr-dir' },
        h('input', { type: 'text', value: x.name, placeholder: 'Blackout', 'aria-label': 'Name', oninput: (e) => { x.name = e.target.value; later(); } }),
        h('input', { type: 'text', value: x.text, placeholder: 'The range of all shoot attacks is halved.', 'aria-label': 'Rule', oninput: (e) => { x.text = e.target.value; later(); } }),
        btn('Remove', () => { d.directors.splice(i, 1); again(); later(); }))));
      if (d.directors.length < 3) box.append(btn("Add a director's cut", () => { d.directors.push({ name: '', text: '' }); again(); later(); }));
    };
    again();
    return box;
  }

  /* a click on a map piece opens its row in the map section */
  function focusRow(i) {
    const blk = [...document.querySelectorAll('#wrEditor .wr-block')].find((b) => /:Playing area map$/.test(b.dataset.key));
    if (!blk) return;
    blk.open = true; OPEN_STATE[blk.dataset.key] = true;
    const row = blk.querySelector(`tr[data-row="${i}"]`); if (!row) return;
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.classList.add('wr-flash'); setTimeout(() => row.classList.remove('wr-flash'), 1600);
  }
  function renderPreview() {
    const box = $('#wrPreview'), d = cur(); if (!box || !d) return;
    box.textContent = ''; box.append(docEl(d, true)); wireDrag(box, d);
  }
  /* drag pieces on the preview map; they snap to half inches when dropped */
  function wireDrag(box, d) {
    const svg = $('svg.wr-edit', box); if (!svg) return;
    const map = d.map; let drag = null;
    const pt = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
    svg.addEventListener('pointerdown', (e) => {
      const g = e.target.closest('[data-i]'); if (!g) return;
      e.preventDefault(); svg.setPointerCapture(e.pointerId);
      drag = { g, i: +g.dataset.i, start: pt(e), dx: 0, dy: 0 };
    });
    svg.addEventListener('pointermove', (e) => {
      if (!drag) return; const p = pt(e);
      drag.dx = p.x - drag.start.x; drag.dy = p.y - drag.start.y;
      drag.g.setAttribute('transform', `translate(${drag.dx} ${drag.dy})`);
    });
    const end = () => {
      if (!drag) return; const s = map.shapes[drag.i];
      const i = drag.i;
      if (Math.abs(drag.dx) + Math.abs(drag.dy) > 0.25) {
        if ('cx' in s) { s.cx = clamp(snap(s.cx + drag.dx), 0, map.w); s.cy = clamp(snap(s.cy + drag.dy), 0, map.h); }
        else { s.x = clamp(snap(s.x + drag.dx), 0, map.w - (s.w || 0)); s.y = clamp(snap(s.y + drag.dy), 0, map.h - (s.h || 0)); }
        drag = null; save(); renderEditor();
      } else { drag = null; renderEditor(); focusRow(i); }
    };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  }

  /* ---------- list, spark, import and export ---------- */
  function renderList() {
    const ul = $('#wrList'); if (!ul) return;
    const f = $('#wrFilter .is-on') ? $('#wrFilter .is-on').dataset.f : '';
    const docs = W.docs.filter((x) => !f || x.type === f);
    ul.textContent = '';
    docs.forEach((x) => {
      const live = W.cur && W.cur.id === x.id ? W.cur : x;
      ul.append(h('li', {}, h('button', { type: 'button', class: 'wr-item' + (W.cur && W.cur.id === x.id ? ' is-on' : ''), onclick: () => { W.cur = norm(clone(x)); renderAll(); } },
        h('span', { class: 'wr-item-t' }, live.title || 'Untitled'), h('small', {}, labelOf(live)))));
    });
    if (!docs.length) ul.append(h('li', { class: 'hint' }, W.docs.length ? 'Nothing of that kind yet.' : 'No episodes or tropes yet.'));
  }
  function renderAll() { renderList(); renderEditor(); }

  function rollSpark() {
    const basis = pick(OPEN), g1 = pick(GENRES), g2 = Math.random() < 0.6 ? pick(GENRES.filter((g) => g.set === g1.set)) : g1;
    const tropes = TROPES.filter((t) => t.g.includes(g1.key) || t.g.includes(g2.key));
    W.spark = { basis: basis.t, page: basis.p, genres: [g1.key, g2.key === g1.key ? '' : g2.key], hook: pick(D.sparks.hooks), place: pick(D.sparks.places), trope: tropes.length ? pick(tropes) : null };
    renderSpark();
  }
  function renderSpark() {
    const box = $('#wrSpark'); box.textContent = ''; const s = W.spark; if (!s) return;
    const g = s.genres.filter(Boolean).map(genreName).join(' vs ');
    box.append(h('div', { class: 'wr-spark' },
      h('p', {}, h('b', {}, g), ' · ', s.basis, ` (Core p. ${s.page})`),
      h('p', {}, h('b', {}, 'Where: '), s.place, h('br'), h('b', {}, 'Twist: '), s.hook),
      s.trope ? h('p', {}, h('b', {}, 'Trope: '), `${s.trope.t} (${bookName(s.trope.b)} p. ${s.trope.p})`) : null,
      h('div', { class: 'row wrap' }, btn('Start an episode from this', async () => {
        const e = newEpisode(); e.genres = s.genres.slice(); e.basis = s.basis;
        e.location = s.place + '.'; e.synopsis = 'Twist: ' + s.hook + '.';
        if (s.trope) e.dressing = `Trope: ${s.trope.t} (${s.trope.b === 'core' ? 'Core Rulebook' : bookName(s.trope.b)}, p. ${s.trope.p})`;
        await add(e);
      }, 'btn-primary'), btn('Roll again', rollSpark))));
  }
  async function add(d) { await CardStore.putEpisode(d); W.docs = await CardStore.episodes(); W.cur = clone(W.docs.find((x) => x.id === d.id)); renderAll(); }

  function exportDoc(d) {
    const blob = new Blob([JSON.stringify({ app: '7tv-casting-office', kind: d.type, version: 1, doc: d }, null, 1)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: (d.title || d.type).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.json' });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  async function importFile(f) {
    try {
      const data = JSON.parse(await f.text());
      const docs = data.doc ? [data.doc] : Array.isArray(data.episodes) ? data.episodes : [];
      const ok = docs.filter((x) => x && (x.type === 'episode' || x.type === 'trope'));
      if (!ok.length) throw new Error('That file has no episode or trope from this site.');
      let last = null;
      for (const x of ok) { const base = x.type === 'episode' ? newEpisode() : newTrope(); last = Object.assign(base, x, { id: App.uid() }); delete last.createdAt; await CardStore.putEpisode(last); }
      W.docs = await CardStore.episodes(); W.cur = clone(W.docs.find((x) => x.id === last.id)); renderAll();
      App.toast(ok.length > 1 ? `Imported ${ok.length} items.` : `Imported "${last.title}".`);
    } catch (err) { App.toast(err.message); }
  }

  /* ---------- print: the page opens in its own window with a print stylesheet ---------- */
  const PRINT_CSS = `
    @page { margin: 12mm; }
    html, body { background: #fff !important; color: #111 !important; }
    body { margin: 0; font-size: 10.5pt; }
    .wr-doc { max-width: none; box-shadow: none; border: 0; padding: 0; }
    .wr-fig { break-inside: avoid; }
    .wr-map { max-width: 115mm; margin: 0 auto; }
    .wr-legend { justify-content: center; }
    .wr-fig figcaption { text-align: center; }
    .wr-keep { break-after: avoid; }
    .wr-table, .wr-sec, li { break-inside: avoid; }
    h3, h4, h5 { break-after: avoid; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`;
  function printDoc(d) {
    const w = window.open('', '_blank');
    if (!w) { App.toast('Allow pop-ups for this site to print.'); return; }
    const base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
    const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => `<link rel="stylesheet" href="${l.href}">`).join('');
    w.document.write(`<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><base href="${base}"><title></title>${links}<style>${PRINT_CSS}</style></head><body></body></html>`);
    w.document.close();
    w.document.title = d.title || 'Episode';
    w.document.body.append(w.document.importNode(docEl(d, false), true));
    const go = () => setTimeout(() => { w.focus(); w.print(); }, 300);
    if (w.document.fonts && w.document.fonts.ready) w.document.fonts.ready.then(go); else go();
  }

  /* ---------- page ---------- */
  function build() {
    document.body.append(PROFILE_LIST);
    $('#wrNewEp').addEventListener('click', () => add(newEpisode()));
    $('#wrNewTrope').addEventListener('click', () => add(newTrope()));
    $('#wrSparkBtn').addEventListener('click', rollSpark);
    $('#wrImport').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importFile(f); });
    $('#wrFilter').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $('#wrFilter').querySelectorAll('button').forEach((x) => x.classList.toggle('is-on', x === b)); renderList(); });
    // flush a pending save when leaving the page
    const flush = () => { if (saveT && W.cur) { clearTimeout(saveT); saveT = 0; CardStore.putEpisode(clone(W.cur)); } };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
    W.built = true;
  }
  async function show() {
    if (!W.built) build();
    W.docs = await CardStore.episodes();
    if (W.cur) { const fresh = W.docs.find((x) => x.id === W.cur.id); W.cur = fresh ? W.cur : null; }
    renderAll();
  }
  /* open a copy of a script (from the Episodes page) in the Writers' Room */
  async function openCopy(doc) {
    const base = doc.type === 'trope' ? newTrope() : newEpisode();
    const c = Object.assign(base, clone(doc), { id: App.uid() });
    delete c.createdAt;
    await CardStore.putEpisode(c);
    W.cur = norm(clone(c));
    App.showView('writers');
    window.scrollTo(0, 0);
    App.toast(`"${c.title}" is now in your Writers' Room.`);
  }
  window.WritersRoom = { show, state: W, mapSvg, docEl, newEpisode, newTrope, scatterTokens, tokenWarnings, printDoc, openCopy, norm };
})();
