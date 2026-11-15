/* Binder dividers: one card per binder section (js/data/binder.js), drawn in the style of the profile cards
   at 63.5 x 88 mm, with an icon, the section name and an alphabetical list of the cards it holds.
   Core is always included; the 80s genre guide and Steel Justice are optional, so the dividers only list
   cards the player owns. Sections with no cards in the chosen books are left out.
   Used by the Print Sheet page and by tools/dividers/make-dividers.js. */
(function () {
  const R = window.SEVENTV_RULES;
  const B = window.SEVENTV_BINDER || { sections: [], icons: {} };
  const W = 750, HT = 1040;
  const STORE = 'seventv-binder-books';

  /* ---------- sections for a set of books ---------- */
  function sections(books) {
    const own = new Set(['core', ...(books || [])]);
    const all = window.SEVENTV_PROFILES || [];
    const byName = new Map();
    for (const p of all) if (p.kind === 'extra') byName.set(p.name, p);
    const out = [];
    for (const c of B.sections) {
      const cards = c.members
        ? c.members.map((n) => byName.get(n)).filter(Boolean)
        : all.filter((p) => p.kind === c.kind && (!c.affiliation || p.affiliation === c.affiliation));
      const names = cards.filter((p) => own.has(R.bookOf(p))).map((p) => p.name).sort((a, b) => a.localeCompare(b));
      if (!names.length) continue;
      const k = R.KINDS[c.kind];
      out.push({ title: c.title, group: c.group, names, band: k.band, accent: k.accent, icon: B.icons[c.icon] || '', seed: out.length + 1 });
    }
    return out;
  }

  /* Extras that are in no section, or in more than one (the build tool refuses to run with any) */
  function problems() {
    const extras = (window.SEVENTV_PROFILES || []).filter((p) => p.kind === 'extra').map((p) => p.name);
    const seen = new Map(), out = [];
    for (const c of B.sections) for (const n of c.members || []) {
      if (!extras.includes(n)) out.push(`"${n}" in ${c.title} is not an Extra`);
      seen.set(n, (seen.get(n) || 0) + 1);
    }
    for (const n of extras) if (!seen.has(n)) out.push(`Extra "${n}" has no binder section`);
    for (const [n, k] of seen) if (k > 1) out.push(`Extra "${n}" is in ${k} binder sections`);
    for (const c of B.sections) if (!B.icons[c.icon]) out.push(`icon ${c.icon} is missing`);
    return out;
  }

  /* ---------- drawing ---------- */
  const iconCache = new Map();
  function loadIcon(body, colour) {
    const key = colour + body.length + body.slice(0, 40);
    if (!iconCache.has(key)) {
      iconCache.set(key, new Promise((res) => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${body.replace(/currentColor/g, colour)}</svg>`;
        const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null);
        im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      }));
    }
    return iconCache.get(key);
  }

  async function draw(s, canvas) {
    const H = CardRender.helpers;
    await CardRender.loadAssets();
    const cv = canvas || document.createElement('canvas'); cv.width = W; cv.height = HT;
    const ctx = cv.getContext('2d');
    const grunge = (x, y, w, h, seed) => {
      const rand = H.rng(seed);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 26; i++) {
        let px = x + rand() * w, py = y + rand() * h; ctx.beginPath(); ctx.moveTo(px, py);
        for (let j = 0; j < 4; j++) { px += (rand() - 0.3) * 60; py += (rand() - 0.5) * 30; ctx.lineTo(px, py); }
        ctx.stroke();
      }
      ctx.restore();
    };
    const dark = (x, y, w, h, seed) => { ctx.fillStyle = '#14171a'; ctx.fillRect(x, y, w, h); H.texture(ctx, x, y, w, h, 'screen', 0.14); grunge(x, y, w, h, seed); };
    const bandFill = (colour, seed) => {
      ctx.fillStyle = colour; ctx.fill();
      ctx.save(); ctx.clip(); H.texture(ctx, 0, 0, W, HT, 'multiply', 0.28);
      const rand = H.rng(seed); ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let i = 0; i < 500; i++) ctx.fillRect(rand() * W, rand() * HT, 1 + rand() * 2, 1);
      ctx.restore();
    };

    // grey card body, as on the profile cards
    ctx.fillStyle = '#d6d7d9'; ctx.fillRect(0, 0, W, HT);
    H.texture(ctx, 0, 142, W, 858, 'multiply', 0.5);
    const g = ctx.createRadialGradient(375, 300, 60, 375, 300, 520);
    g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 142, W, 858);

    // header: dark strip, coloured band, section name, group pill, TV badge
    dark(0, 0, W, 142, 11);
    ctx.save(); H.rr(ctx, 36, -24, 678, 160, [0, 0, 30, 30]); ctx.lineWidth = 5; ctx.strokeStyle = s.band; ctx.stroke(); ctx.restore();
    ctx.save(); H.rr(ctx, 48, -24, 654, 146, [0, 0, 22, 22]); bandFill(s.band, 3 + s.seed); ctx.restore();
    H.distressText(ctx, s.title.toUpperCase(), W / 2, 94, { size: 78, colour: '#ffffff', maxW: 560 });
    const label = s.group.toUpperCase();
    ctx.save(); ctx.font = H.headFont(38);
    const pw = Math.max(190, ctx.measureText(label).width + 56);
    H.rr(ctx, 375 - pw / 2, 106, pw, 52, 26); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = s.band; ctx.stroke(); ctx.restore();
    H.distressText(ctx, label, 375, 132 + 38 * 0.36, { size: 38, colour: s.accent, strength: 0.6 });
    const bx = 118, by = 132, br = 29, u = br / 29;
    ctx.save();
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fillStyle = '#1b1d20'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = s.band; ctx.stroke();
    ctx.strokeStyle = s.band; ctx.fillStyle = s.band; ctx.lineCap = 'round'; ctx.lineWidth = 2.6 * u;
    ctx.beginPath(); ctx.moveTo(bx - 7 * u, by - 18 * u); ctx.lineTo(bx, by - 9 * u); ctx.lineTo(bx + 8 * u, by - 19 * u); ctx.stroke();
    H.rr(ctx, bx - 17 * u, by - 10 * u, 34 * u, 24 * u, 5 * u); ctx.fill();
    ctx.fillStyle = '#1b1d20'; H.rr(ctx, bx - 13 * u, by - 6.5 * u, 20 * u, 17 * u, 4 * u); ctx.fill();
    for (const ky of [-2, 5]) { ctx.beginPath(); ctx.arc(bx + 11 * u, by + ky * u, 2 * u, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();

    // the big icon badge
    const cx = 375, cy = 298, r = 122;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy + 6, r + 10, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = '#1b1d20'; ctx.fill();
    ctx.save(); ctx.clip(); H.texture(ctx, cx - r, cy - r, r * 2, r * 2, 'screen', 0.08); ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.lineWidth = 16; ctx.strokeStyle = s.band; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r - 16, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.stroke();
    ctx.restore();
    const icon = s.icon ? await loadIcon(s.icon, s.band) : null;
    if (icon) { const isz = 156; ctx.drawImage(icon, cx - isz / 2, cy - isz / 2, isz, isz); }

    // the cards in this section, alphabetical, in a table like the attack table
    const tx = 30, tw = 690, top = 450, bottom = 980, headH = 46;
    const n = s.names.length, cols = n > 18 ? 3 : 2, rows = Math.ceil(n / cols);
    const rowH = Math.min(62, (bottom - top - headH) / rows);
    const tb = top + headH + rows * rowH;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    H.rr(ctx, tx, top, tw, tb - top, 18); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
    ctx.save(); H.rr(ctx, tx, top, tw, tb - top, 18); ctx.clip();
    ctx.fillStyle = '#1b1d20'; ctx.fillRect(tx, top, tw, headH);
    for (let i = 1; i < rows; i += 2) { ctx.fillStyle = '#ececee'; ctx.fillRect(tx, top + headH + i * rowH, tw, rowH); }
    ctx.restore();
    H.distressText(ctx, 'IN THIS SECTION', tx + 24, top + 33, { size: 29, colour: '#fff', align: 'left', distress: false });
    H.distressText(ctx, `${n} CARD${n === 1 ? '' : 'S'}`, tx + tw - 24, top + 33, { size: 29, colour: '#fff', align: 'right', distress: false });
    const colW = tw / cols, fs = Math.min(38, rowH * 0.7);
    ctx.save(); ctx.fillStyle = '#1b1d20'; ctx.textBaseline = 'middle'; ctx.font = H.bodyFont(fs);
    s.names.forEach((name, i) => {
      const c = Math.floor(i / rows), row = i % rows;
      const x = tx + c * colW + 20, y = top + headH + row * rowH + rowH / 2;
      const sx = Math.min(1, (colW - 30) / ctx.measureText(name).width);
      ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1); ctx.fillText(name, 0, 1); ctx.restore();
    });
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
    for (let c = 1; c < cols; c++) { ctx.beginPath(); ctx.moveTo(tx + c * colW, top + headH + 6); ctx.lineTo(tx + c * colW, tb - 6); ctx.stroke(); }
    ctx.restore();

    // dark bottom edge, as on the card backs
    dark(0, 1000, W, HT - 1000, 23);
    return cv;
  }

  /* ---------- PDF: nine to a page at actual size ---------- */
  async function pdf(list, opts = {}) {
    const paper = opts.paper === 'a4' ? 'a4' : 'letter';
    const [pw, ph] = paper === 'a4' ? [210, 297] : [215.9, 279.4];
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: paper });
    const cw = 63.5, ch = 88, x0 = (pw - cw * 3) / 2, y0 = (ph - ch * 3) / 2;
    const cv = document.createElement('canvas');
    for (let p = 0; p * 9 < list.length; p++) {
      if (p) doc.addPage();
      const page = list.slice(p * 9, p * 9 + 9);
      for (let k = 0; k < page.length; k++) {
        await draw(page[k], cv);
        doc.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', x0 + (k % 3) * cw, y0 + Math.floor(k / 3) * ch, cw, ch);
      }
      if (opts.marks !== false) {
        const rows = Math.ceil(page.length / 3), cols = Math.min(3, page.length);
        doc.setDrawColor(120); doc.setLineWidth(0.2);
        const xs = [...Array(cols + 1).keys()].map((c) => x0 + c * cw), ys = [...Array(rows + 1).keys()].map((r2) => y0 + r2 * ch);
        const yEnd = ys[ys.length - 1], xEnd = xs[xs.length - 1];
        for (const x of xs) { doc.line(x, y0 - 6, x, y0 - 1); doc.line(x, yEnd + 1, x, yEnd + 6); }
        for (const y of ys) { doc.line(x0 - 6, y, x0 - 1, y); doc.line(xEnd + 1, y, xEnd + 6, y); }
      }
      doc.setFontSize(6); doc.setTextColor(120);
      doc.text('7TV Casting Office binder dividers. Icons from game-icons.net by Lorc, Delapouite and contributors (CC BY 3.0). Print at 100%.', pw / 2, ph - 4, { align: 'center' });
    }
    return doc;
  }

  /* ---------- Print Sheet panel ---------- */
  const $ = (s) => document.querySelector(s);
  let built = false, busy = false, token = 0;
  function chosenBooks() { return [...document.querySelectorAll('#dvBooks input[data-book]:checked')].map((i) => i.dataset.book); }
  async function preview() {
    const my = ++token;
    const list = sections(chosenBooks());
    const total = list.reduce((t, s) => t + s.names.length, 0);
    $('#dvCount').textContent = `${list.length} dividers covering ${total} cards`;
    const box = $('#dvPreview'); box.innerHTML = '';
    for (const s of list) {
      if (my !== token) return;
      const c = await draw(s);
      if (my !== token) return;
      c.className = 'dv-thumb'; c.setAttribute('role', 'img'); c.setAttribute('aria-label', `${s.group}: ${s.title}`);
      box.appendChild(c);
    }
  }
  function build() {
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(STORE) || '[]'); } catch (e) { saved = []; }
    document.querySelectorAll('#dvBooks input[data-book]').forEach((i) => { i.checked = saved.includes(i.dataset.book); });
    $('#dvBooks').addEventListener('change', () => {
      try { localStorage.setItem(STORE, JSON.stringify(chosenBooks())); } catch (e) { /* private mode */ }
      preview();
    });
    $('#btnDividers').addEventListener('click', async () => {
      if (busy) return; busy = true;
      const st = $('#dvState'); st.textContent = 'Making the PDF...';
      try {
        const list = sections(chosenBooks());
        const doc = await pdf(list, { paper: $('#pPaper') ? $('#pPaper').value : 'letter', marks: $('#pMarks') ? $('#pMarks').checked : true });
        doc.save('7TV Binder Dividers.pdf');
        st.textContent = `PDF ready: ${list.length} dividers on ${Math.ceil(list.length / 9)} page${list.length > 9 ? 's' : ''}.`;
      } catch (err) { st.textContent = 'PDF failed: ' + err.message; }
      busy = false;
    });
    built = true;
  }
  function show() { if (!$('#dvPreview')) return; if (!built) build(); preview(); }

  window.Dividers = { sections, problems, draw, pdf, show };
})();
