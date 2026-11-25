// Episodes page: episodes written for the site, filters, reader, copy to the Writers' Room, links.
const { chromium } = require('playwright');
const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };
(async () => {
  const base = process.env.BASE || 'http://localhost:8765/';
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(base); await p.waitForTimeout(700);

  assert(await p.textContent('.tab[data-view="shows"]') === 'Episodes' && await p.textContent('.tab[data-view="episodes"]') === 'Episode Guide', 'tabs read Episodes and Episode Guide');
  await p.click('.tab[data-view="shows"]'); await p.waitForTimeout(600);
  const n = await p.evaluate(() => window.SEVENTV_SHOWS.list.length);
  assert((await p.$$('.sh-card')).length === n, 'every listed episode has a card');
  assert(await p.isVisible('.sh-card .sh-thumb svg.wr-map'), 'cards show the map');
  for (const e of await p.evaluate(() => window.SEVENTV_SHOWS.list.map((x) => ({ id: x.id, file: x.file, genres: x.genres, needs: x.needs, objectives: x.objectives })))) {
    const r = await p.evaluate(async (f) => { const res = await fetch(f); return res.ok ? (await res.json()).doc : null; }, e.file);
    assert(r && r.type === 'episode', `${e.id}: script file loads`);
  }

  // filters
  await p.fill('#shSearch', 'nothing-matches-this'); await p.waitForTimeout(200);
  assert((await p.$$('.sh-card')).length === 0 && (await p.textContent('#shList')).includes('No episode'), 'search filters the list');
  await p.click('#shFilters button:has-text("Clear filters")'); await p.waitForTimeout(200);
  assert((await p.$$('.sh-card')).length === n, 'Clear filters shows everything again');
  const g = await p.evaluate(() => window.SEVENTV_SHOWS.list[0].genres[0]);
  await p.selectOption('.sh-field:has-text("Genre") select', g); await p.waitForTimeout(200);
  assert((await p.$$('.sh-card')).length >= 1, 'genre filter keeps matching episodes');
  await p.click('#shFilters button:has-text("Clear filters")'); await p.waitForTimeout(200);

  // books owned: an episode needing 80s hides when 80s is unticked
  await p.evaluate(() => { window.SEVENTV_SHOWS.list.push(Object.assign({}, window.SEVENTV_SHOWS.list[0], { id: 'needs-80s', title: 'Needs 80s', needs: ['core', '80s'] })); ShowsUI.show(); });
  await p.waitForTimeout(300);
  await p.click('.sh-own label:has-text("80s") input'); await p.waitForTimeout(200);
  assert(!(await p.isVisible('#episode-needs-80s')), 'unticking a book hides episodes that need it');
  await p.click('.sh-own label:has-text("80s") input'); await p.waitForTimeout(200);
  assert(await p.isVisible('#episode-needs-80s'), 'ticking it again brings them back');
  await p.evaluate(() => { window.SEVENTV_SHOWS.list.pop(); ShowsUI.show(); });

  // reader and copy
  await p.click('.sh-card >> nth=0 >> button:has-text("Read")'); await p.waitForTimeout(500);
  assert(await p.isVisible('#shReader .wr-doc .wr-title'), 'Read opens the full script');
  await p.click('#shReader button:has-text("Copy to Writers")'); await p.waitForTimeout(700);
  assert(await p.evaluate(() => document.querySelector('.view.is-active').id) === 'view-writers' && (await p.$$('#wrList .wr-item')).length === 1, "Copy to Writers' Room adds an editable copy");

  // links
  const id = await p.evaluate(() => window.SEVENTV_SHOWS.list[0].id);
  await p.goto(base + '#episode/' + id); await p.waitForTimeout(1200);
  assert(await p.evaluate(() => document.querySelector('.view.is-active').id) === 'view-shows', 'a #episode/ link opens the Episodes page');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  assert(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no sideways scroll on a phone');
  assert(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
