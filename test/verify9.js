// Home page, grouped navigation menus, theme icon and page addresses.
const { chromium } = require('playwright');
const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };
(async () => {
  const base = process.env.BASE || 'http://localhost:8765/';
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  const active = () => p.evaluate(() => document.querySelector('.view.is-active').id);
  await p.goto(base); await p.waitForTimeout(900);
  assert(await active() === 'view-home', 'the site opens on Home');
  assert((await p.$$('.home-tile')).length === 11, 'Home links to every page');
  await p.click('.home-tile[data-goto="writers"]'); await p.waitForTimeout(300);
  assert(await active() === 'view-writers' && (await p.evaluate(() => location.hash)) === '#writers', 'a Home tile opens its page and the address follows');

  // menus
  assert(!(await p.isVisible('.tab-menu .tab[data-view="props"]')), 'menus start closed');
  await p.click('.tab-group[data-group="cards"] .tab-head');
  assert(await p.isVisible('.tab-menu .tab[data-view="props"]'), 'clicking Cards opens its menu');
  await p.click('.tab-menu .tab[data-view="props"]'); await p.waitForTimeout(300);
  assert(await active() === 'view-props' && !(await p.isVisible('.tab-menu .tab[data-view="props"]')), 'picking a page opens it and closes the menu');
  assert(await p.evaluate(() => document.querySelector('.tab-group[data-group="cards"] .tab-head').classList.contains('is-active')), 'the group of the open page is highlighted');
  await p.click('.tab-group[data-group="rules"] .tab-head'); await p.keyboard.press('Escape');
  assert(!(await p.isVisible('.tab-menu .tab[data-view="index"]')), 'Escape closes a menu');
  await p.click('.tab-group[data-group="episodes"] .tab-head'); await p.click('.home-hero, .view.is-active', { position: { x: 5, y: 5 } }).catch(() => {});
  await p.mouse.click(700, 700); await p.waitForTimeout(100);
  assert(!(await p.isVisible('.tab-menu .tab[data-view="shows"]')), 'clicking elsewhere closes a menu');

  // theme
  await p.click('#btnTheme');
  assert(await p.evaluate(() => document.documentElement.dataset.theme) === 'dark' && (await p.getAttribute('#btnTheme', 'aria-label')) === 'Light mode', 'the theme icon switches to dark and offers light');
  await p.click('#btnTheme');

  // addresses
  await p.goto(base + '#reference'); await p.waitForTimeout(900);
  assert(await active() === 'view-reference', 'a #page address opens that page');
  await p.goto(base + '#nonsense'); await p.waitForTimeout(900);
  assert(await active() === 'view-home', 'an unknown address falls back to Home');

  // phone
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  await p.click('.tab-group[data-group="episodes"] .tab-head'); await p.waitForTimeout(100);
  const box = await p.locator('.tab-group.open .tab-menu').boundingBox();
  assert(box && box.x >= 0 && box.x + box.width <= 390, 'menus stay on screen on a phone');
  assert(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no sideways scroll on a phone');
  assert(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
