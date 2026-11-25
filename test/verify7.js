// Writers' Room: write an episode and a trope, draw the map, print, export, import and back up.
const { chromium } = require('playwright');
const fs = require('fs');
const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };
(async () => {
  const base = process.env.BASE || 'http://localhost:8765/';
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(base); await p.waitForTimeout(700);
  const cur = () => p.evaluate(() => JSON.parse(JSON.stringify(WritersRoom.state.cur)));

  await p.evaluate(() => App.showView('writers')); await p.waitForTimeout(400);
  assert(await p.isVisible('.wr-empty'), "Writers' Room opens on its intro");
  await p.click('#wrNewEp'); await p.waitForTimeout(400);
  await p.fill('.wr-block input[type="text"] >> nth=0', 'The Odeon Job');
  await p.waitForTimeout(500);
  assert(await p.textContent('#wrPreview .wr-title') === 'The Odeon Job', 'the preview follows the form');
  assert((await p.textContent('#wrList')).includes('The Odeon Job'), 'the episode is listed');

  // casts: a profile name prices the member
  await p.click('summary:text-is("Casts")');
  await p.click('.wr-castbox >> nth=0 >> button:has-text("Add a member")');
  await p.fill('.wr-castbox >> nth=0 >> .wr-member:not(.wr-member-head) >> nth=0 >> input[type="number"]', '3');
  await p.fill('.wr-castbox >> nth=0 >> input[list="wrProfiles"]', 'Thug'); await p.waitForTimeout(300);
  assert((await cur()).casts[0].members[0].ratings === '6', 'typing a profile card fills in its ratings (3 Thugs = 6)');
  assert((await p.textContent('#wrPreview')).includes('Three Thugs'), 'the cast list reads "Three Thugs" in the preview');

  // special rule with a 1D6 table
  await p.click('summary:text-is("The scene")');
  await p.click('button:has-text("Add a special rule")');
  await p.fill('.wr-section input[aria-label="Section name"]', 'Searching the cinema');
  await p.selectOption('.wr-section select', '1D6'); await p.waitForTimeout(300);
  assert((await cur()).special[0].rows.length === 6, 'choosing 1D6 adds six table rows');
  assert(await p.isVisible('#wrPreview .wr-table'), 'the dice table prints');

  // narrative extras: rule library, table rules, third party, standard VP rows
  await p.selectOption('.wr-lib >> nth=0', { label: 'Hazard' }); await p.waitForTimeout(300);
  assert((await cur()).special.some((x) => x.title === 'Hazard'), 'the rule library adds an editable special rule');
  await p.click('summary:text-is("Table rules")');
  await p.selectOption('.wr-rules select', 'heroic');
  await p.fill('.wr-rules input[type="number"]', '5');
  await p.click('.wr-rules label:has-text("Steal the Scene") input'); await p.waitForTimeout(400);
  let txt = await p.textContent('#wrPreview');
  assert(txt.includes('heroic cast has the initiative') && txt.includes('5 of each act card') && txt.includes('Steal the Scene'), 'table rules print under And... action!');
  await p.click('button:has-text("Add a third party")'); await p.waitForTimeout(300);
  await p.evaluate(() => { const c = WritersRoom.state.cur.casts[2]; c.members.push({ qty: 2, name: 'Zombies', profile: 'Zombie', ratings: '', arrives: '' }); WritersRoom.state.cur.casts[1].members.push({ qty: 1, name: 'Queen Ant', profile: '', ratings: '6', arrives: 'Act Two' }); });
  await p.click('summary:text-is("Epilogue and set dressing")');
  await p.click('button:has-text("Add the usual rows")'); await p.waitForTimeout(400);
  txt = await p.textContent('#wrPreview');
  assert(txt.includes('cameo rules') && txt.includes('start of Act Two'), 'third parties and late arrivals print in the cast list');
  assert(txt.includes('instead of the standard ones') && (await cur()).vp.length === 3, 'the usual VP rows replace the standard victory points');
  // map: size, objective tokens, drag
  await p.click('summary:text-is("Playing area map")');
  await p.selectOption('.wr-mapedit select >> nth=0', '48x36'); await p.waitForTimeout(300);
  let d = await cur();
  assert(d.map.w === 48 && d.map.shapes.filter((s) => s.k.startsWith('zone')).every((z) => z.w === 48), 'a wider board stretches the edge set-up areas');
  await p.selectOption('.wr-mapedit select >> nth=2', '4');
  await p.click('.wr-mapedit button:has-text("Scatter")'); await p.waitForTimeout(300);
  d = await cur();
  assert(d.map.shapes.filter((s) => s.k === 'objective').length === 4, 'Scatter places 4 objective tokens');
  assert((await p.evaluate(() => WritersRoom.tokenWarnings(WritersRoom.state.cur.map))).length === 0, 'scattered tokens are 12" from set-up areas and 6" apart');
  await p.selectOption('.wr-mapedit select[aria-label="Piece to add"]', 'building');
  await p.click('.wr-mapedit button:has-text("Add to map")'); await p.waitForTimeout(300);
  const before = (await cur()).map.shapes.find((s) => s.k === 'building');
  await p.evaluate(() => { const b = document.querySelector('.wr-edit .wr-k-building'); b.scrollIntoView({ block: 'center' }); });
  const bb = await p.locator('.wr-edit .wr-k-building').boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down();
  await p.mouse.move(bb.x + bb.width / 2 + 60, bb.y + bb.height / 2 + 30, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(400);
  const after = (await cur()).map.shapes.find((s) => s.k === 'building');
  assert(after.cx > before.cx && after.cx * 2 === Math.round(after.cx * 2), 'dragging moves a piece and snaps it to half inches');
  const near = await p.evaluate(() => { const m = WritersRoom.state.cur.map; return WritersRoom.tokenWarnings({ w: m.w, h: m.h, shapes: [m.shapes[0], { k: 'objective', cx: 10, cy: 31, n: '1' }] }); });
  assert(near.length === 1, 'a token next to a set-up area is flagged');

  await p.evaluate(() => { const m = WritersRoom.state.cur.map; m.compass = 'up'; m.shapes.find((s) => s.k === 'building').hz = true; WritersRoom.show(); }); await p.waitForTimeout(400);
  assert(await p.isVisible('#wrPreview .wr-compass') && await p.isVisible('#wrPreview .wr-hz') && (await p.textContent('#wrPreview .wr-legend')).includes('Hazard'), 'compass and hazard outline draw, and the key lists hazards');
  // toolbar above the preview map, and click a piece to edit it
  const nBefore = (await cur()).map.shapes.length;
  await p.click('#wrPreview .wr-tool:has-text("Woods")'); await p.waitForTimeout(300);
  assert((await cur()).map.shapes.length === nBefore + 1 && (await cur()).map.shapes.at(-1).k === 'woods', 'the toolbar on the map adds a piece');
  await p.evaluate(() => document.querySelector('.wr-edit .wr-k-woods-base').scrollIntoView({ block: 'center' }));
  await p.click('.wr-edit .wr-k-woods-base', { force: true }); await p.waitForTimeout(500);
  assert(await p.isVisible(`.wr-shapes tr[data-row="${nBefore}"]`), 'clicking a piece on the map opens its row for editing');
  // print opens a page with the map
  const [pop] = await Promise.all([p.waitForEvent('popup'), p.click('.wr-actions button:has-text("Print")')]);
  await pop.waitForLoadState(); await pop.waitForTimeout(500);
  assert(await pop.isVisible('.wr-doc svg.wr-map') && await pop.title() === 'The Odeon Job', 'Print opens the script with its map');
  await pop.close();

  // export, then import as a copy
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.wr-actions button:has-text("Export")')]);
  const file = await dl.path(); const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert(data.kind === 'episode' && data.doc.title === 'The Odeon Job', 'Export writes the episode as JSON');
  await p.setInputFiles('#wrImport', file); await p.waitForTimeout(500);
  assert((await p.$$('#wrList .wr-item')).length === 2, 'Import adds it back as a second copy');

  const old = { app: '7tv-casting-office', kind: 'episode', version: 1, doc: { type: 'episode', title: 'Old script', genres: ['action', ''], casts: [{ affiliation: 'heroic', role: 'defending', genre: '', ratings: '', intro: '', members: [{ qty: 1, name: 'A', profile: '', ratings: '3' }] }], setup: { text: '', tokens: '1D6', maguffin: '' }, special: [], directors: [], vp: [], map: { w: 36, h: 36, shapes: [], labels: {}, note: '' } } };
  await p.setInputFiles('#wrImport', { name: 'old.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(old)) }); await p.waitForTimeout(500);
  assert((await p.textContent('#wrPreview .wr-title')) === 'Old script' && (await cur()).rules.initiative === 'roll' && (await cur()).casts[0].members[0].arrives === '', 'a script saved before these fields opens without errors');
  // trope
  await p.click('#wrNewTrope'); await p.waitForTimeout(300);
  await p.fill('.wr-block input[type="text"] >> nth=0', 'Cursed Reel'); await p.waitForTimeout(500);
  assert((await p.textContent('#wrPreview .wr-label')).includes('trope'), 'a trope is labelled with its genre');
  assert(!(await p.isVisible('#wrPreview svg')), 'a trope prints without a map unless asked');

  // spark
  await p.click('#wrSparkBtn');
  await p.click('#wrSpark button:has-text("Start an episode")'); await p.waitForTimeout(500);
  d = await cur();
  assert(d.type === 'episode' && d.basis && d.location, 'a spark starts a prefilled episode');

  // backup and reload
  await p.waitForTimeout(500);
  const backup = await p.evaluate(async () => JSON.parse(await CardStore.exportJSON()).episodes.length);
  assert(backup === 5, 'the backup file holds all episodes and tropes');
  await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(() => App.showView('writers')); await p.waitForTimeout(400);
  assert((await p.$$('#wrList .wr-item')).length === 5, 'everything is still there after a reload');

  await p.setViewportSize({ width: 390, height: 844 }); await p.click('#wrList .wr-item >> nth=0'); await p.waitForTimeout(300);
  assert(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no sideways scroll on a phone');
  assert(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
