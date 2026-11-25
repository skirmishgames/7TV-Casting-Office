/* Episodes page: episodes written for this site, with filters. Each script is a Writers' Room file in episodes/. */
(function () {
  const R = window.SEVENTV_RULES;
  const S = window.SEVENTV_SHOWS;
  const App = window.App;
  const $ = (s, el = document) => el.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const FEEDBACK = 'mailto:skirmishgames.app@gmail.com';
  const BOOKS = [['80s', '80s'], ['steeljustice', 'Steel Justice'], ['nightterrors', 'Night Terrors']];
  const STATUS = {
    untested: { label: 'Needs playtest', note: `Counts as playtested after ${S.playtestsNeeded} playtests.` },
    playtested: { label: 'Playtested', note: `Played at least ${S.playtestsNeeded} times and tuned.` },
    sample: { label: 'Sample', note: 'Shows the layout only.' }
  };
  const F = { q: '', status: '', genre: '', scenario: '', objective: '', size: '', sort: 'order', own: null, built: false };
  const cache = new Map();

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
  const genreName = (k) => { for (const set of ['core', '80s']) { const g = R.GENRE_SETS[set].genres.find((x) => x.key === k); if (g) return g.name; } return ''; };
  const bookName = (b) => (R.BOOKS[b] || { label: b }).label;
  const boardName = (b) => { const [w, hh] = String(b || '').split('x').map(Number); return w && hh ? `${w / 12}' x ${hh / 12}'` : ''; };
  const sizeOf = (e) => (S.sizes.find(([, , lo, hi]) => e.ratings >= lo && e.ratings <= hi) || [''])[0];
  const genreLine = (e) => e.genres.filter(Boolean).map(genreName).join(' vs ');

  /* which books the reader owns: Core always, the rest remembered in this browser */
  function loadOwn() {
    try { const v = JSON.parse(localStorage.getItem('seventv-own-books')); if (Array.isArray(v)) return v; } catch (e) { /* none */ }
    return BOOKS.map(([k]) => k);
  }
  function saveOwn() { try { localStorage.setItem('seventv-own-books', JSON.stringify(F.own)); } catch (e) { /* private mode */ } }

  function match(e, f) {
    if (f.status && e.status !== f.status) return false;
    if (f.genre && !e.genres.includes(f.genre)) return false;
    if (f.scenario && (e.scenario || '') !== (f.scenario === '-' ? '' : f.scenario)) return false;
    if (f.objective && !e.objectives.includes(f.objective)) return false;
    if (f.size && sizeOf(e) !== f.size) return false;
    if (e.needs.some((b) => b !== 'core' && !f.own.includes(b))) return false;
    if (f.q) {
      const hay = [e.title, e.tagline, e.premise, genreLine(e), e.scenario, ...e.objectives.map((k) => S.objectives[k]), ...e.features.map((k) => S.features[k])].join(' ').toLowerCase();
      if (!f.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
    }
    return true;
  }

  async function loadDoc(e) {
    if (!cache.has(e.id)) {
      cache.set(e.id, fetch(e.file).then((r) => { if (!r.ok) throw new Error('Could not load ' + e.title); return r.json(); })
        .then((data) => window.WritersRoom.norm(data.doc || data))
        .catch((err) => { cache.delete(e.id); throw err; }));
    }
    return cache.get(e.id);
  }

  function renderFilters() {
    const box = $('#shFilters'); box.textContent = '';
    const count = (key, value) => S.list.filter((e) => match(e, Object.assign({}, F, { [key]: value }))).length;
    const opt = (key, value, label) => h('option', { value, selected: F[key] === value || null }, `${label} (${count(key, value)})`);
    const select = (key, label, opts) => h('label', { class: 'field sh-field' }, h('span', {}, label),
      h('select', { onchange: (ev) => { F[key] = ev.target.value; render(); } }, opts));
    const genres = [...new Set(S.list.flatMap((e) => e.genres).filter(Boolean))];
    const scenarios = [...new Set(S.list.map((e) => e.scenario).filter(Boolean))].sort();
    const objectives = Object.keys(S.objectives).filter((k) => S.list.some((e) => e.objectives.includes(k)));
    box.append(
      h('input', { type: 'search', id: 'shSearch', value: F.q, placeholder: 'Search titles and premises: heist, zombies, rescue', 'aria-label': 'Search episodes',
        oninput: (ev) => { F.q = ev.target.value; render(); const i = $('#shSearch'); i.focus(); i.setSelectionRange(F.q.length, F.q.length); } }),
      h('div', { class: 'sh-selects' },
        select('status', 'Status', [opt('status', '', 'Any'), ...Object.entries(STATUS).filter(([k]) => count('status', k) || F.status === k).map(([k, v]) => opt('status', k, v.label))]),
        select('genre', 'Genre', [opt('genre', '', 'Any'), ...genres.map((g) => opt('genre', g, genreName(g)))]),
        select('scenario', 'Scenario', [opt('scenario', '', 'Any'), ...scenarios.map((x) => opt('scenario', x, x.replace(/^The /, ''))), S.list.some((e) => !e.scenario) ? opt('scenario', '-', 'Its own rules') : null]),
        select('objective', 'Objective', [opt('objective', '', 'Any'), ...objectives.map((k) => opt('objective', k, S.objectives[k]))]),
        select('size', 'Cast size', [opt('size', '', 'Any'), ...S.sizes.map(([k, l]) => opt('size', k, l))]),
        h('label', { class: 'field sh-field' }, h('span', {}, 'Order'), h('select', { onchange: (ev) => { F.sort = ev.target.value; renderList(); } },
          h('option', { value: 'order', selected: F.sort === 'order' || null }, 'Suggested play order'), h('option', { value: 'new', selected: F.sort === 'new' || null }, 'Newest first')))),
      h('div', { class: 'sh-own' }, h('span', { class: 'hint' }, 'Books I own: Core and'),
        BOOKS.map(([k, l]) => h('label', { class: 'inline check' }, h('input', { type: 'checkbox', checked: F.own.includes(k), onchange: (ev) => {
          F.own = ev.target.checked ? [...new Set([...F.own, k])] : F.own.filter((x) => x !== k); saveOwn(); render();
        } }), ' ' + l))),
      ...[(F.status || F.genre || F.scenario || F.objective || F.size || F.q) ? h('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: () => { F.q = F.status = F.genre = F.scenario = F.objective = F.size = ''; render(); } }, 'Clear filters') : null].filter(Boolean));
  }
  function renderCount() {
    const n = S.list.filter((e) => match(e, F)).length, all = S.list.length;
    $('#shCount').textContent = n === all ? `${all} episode${all === 1 ? '' : 's'}` : `${n} of ${all}`;
  }

  function card(e) {
    const st = STATUS[e.status];
    const thumb = h('div', { class: 'sh-thumb', 'aria-hidden': 'true' });
    const meta = [`${e.players} players`, e.ratings ? `${e.ratings} ratings a side` : '', boardName(e.board), e.time ? `${e.time} min` : '', e.needs.map(bookName).join(' + '), `version ${e.version}`].filter(Boolean).join(' · ');
    const play = (fn) => async () => { try { fn(await loadDoc(e)); } catch (err) { App.toast(err.message); } };
    const issue = `${FEEDBACK}?subject=${encodeURIComponent(`Playtest: ${e.title} v${e.version}`)}&body=${encodeURIComponent(['Players and casts:', 'Playing time:', 'Result (who won, by how many VPs):', '', ...(e.testNotes || []).map((t, k) => `${k + 1}. ${t}\nAnswer:\n`), 'Anything else:'].join('\n'))}`;
    const el = h('article', { class: 'sh-card', id: 'episode-' + e.id },
      h('div', { class: 'sh-body' },
        h('p', { class: 'sh-label' }, [genreLine(e), e.format === 'narrative' ? 'Narrative episode' : 'Open play episode'].filter(Boolean).join(' · ')),
        h('h3', { class: 'sh-title' }, e.title),
        e.tagline ? h('p', { class: 'sh-tag' }, e.tagline) : null,
        h('div', {}, h('span', { class: 'sh-status sh-status-' + e.status, title: st.note }, st.label)),
        h('p', { class: 'sh-meta' }, meta),
        h('div', { class: 'sh-tags' },
          e.scenario ? h('span', { class: 'sh-pill sh-pill-scen' }, e.scenario.replace(/^The /, '')) : null,
          e.objectives.map((k) => h('span', { class: 'sh-pill' }, S.objectives[k])),
          e.features.map((k) => h('span', { class: 'sh-pill sh-pill-feat' }, S.features[k]))),
        h('p', {}, e.premise),
        e.status !== 'playtested' && (e.testNotes || []).length ? h('details', { class: 'sh-more' }, h('summary', {}, `What to test (${e.testNotes.length})`), h('ol', {}, e.testNotes.map((t) => h('li', {}, t)))) : null,
        (e.changes || []).length ? h('details', { class: 'sh-more' }, h('summary', {}, `Changes (${e.changes.length})`), h('ul', {}, e.changes.map((t) => h('li', {}, t)))) : null,
        h('div', { class: 'row wrap sh-actions' },
          h('button', { type: 'button', class: 'btn btn-primary btn-small', onclick: play(read) }, 'Read'),
          h('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: play((d) => window.WritersRoom.printDoc(d)) }, 'Print'),
          h('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: play((d) => window.WritersRoom.openCopy(d)) }, "Copy to Writers' Room"),
          h('a', { class: 'btn btn-ghost btn-small', href: issue }, 'Send feedback'),
          h('a', { class: 'btn btn-ghost btn-small', href: '#episode/' + e.id, title: 'Link to this episode' }, 'Link')),
        h('p', { class: 'hint' }, e.status === 'sample' ? 'Layout sample, not a real episode.' : e.status === 'playtested' ? `Playtested ${e.playtests.length} times.` : `Playtests: ${e.playtests.length} of ${S.playtestsNeeded}.`)),
      thumb);
    loadDoc(e).then((d) => { thumb.append(window.WritersRoom.mapSvg(d.map, false)); thumb.setAttribute('title', 'Open the full script'); thumb.addEventListener('click', () => read(d)); }).catch(() => thumb.remove());
    return el;
  }
  function renderList() {
    const list = $('#shList'); list.textContent = '';
    let shown = S.list.filter((e) => match(e, F));
    if (F.sort === 'new') shown = shown.slice().sort((a, b) => String(b.added).localeCompare(String(a.added)));
    if (!shown.length) list.append(h('p', { class: 'hint' }, 'No episode matches these filters.'));
    shown.forEach((e) => list.append(card(e)));
    renderCount();
  }
  function render() { renderFilters(); renderList(); }

  /* the full script in a dialog */
  function read(d) {
    let dlg = $('#shReader');
    if (!dlg) { dlg = h('dialog', { id: 'shReader', class: 'sh-reader' }); document.body.append(dlg); dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); }); }
    dlg.textContent = '';
    dlg.append(h('div', { class: 'sh-reader-bar' },
      h('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: () => window.WritersRoom.printDoc(d) }, 'Print'),
      h('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: () => { dlg.close(); window.WritersRoom.openCopy(d); } }, "Copy to Writers' Room"),
      h('button', { type: 'button', class: 'btn btn-primary btn-small', onclick: () => dlg.close() }, 'Close')),
      window.WritersRoom.docEl(d, false));
    dlg.showModal(); dlg.scrollTop = 0;
  }

  function show(openId) {
    if (!F.built) { F.own = loadOwn(); F.built = true; }
    render();
    if (openId) { const t = document.getElementById('episode-' + openId); if (t) setTimeout(() => t.scrollIntoView({ block: 'start' }), 50); }
  }
  /* links like #episode/<id> open this page at that episode */
  function fromHash() {
    const m = location.hash.match(/^#episode\/([\w-]+)/);
    if (m) { App.showView('shows'); show(m[1]); return true; }
    return false;
  }
  window.addEventListener('hashchange', fromHash);
  window.ShowsUI = { show, fromHash, state: F };
})();
