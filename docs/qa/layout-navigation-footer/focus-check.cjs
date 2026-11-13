const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const cache = path.join(root, 'thaifood/node_modules/.cache/layout-qa');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(cache, 'browsers');
const npx = path.join(cache, 'npm/_npx');
const { chromium } = require(fs.readdirSync(npx).map(n => path.join(npx, n, 'node_modules/playwright')).find(p => fs.existsSync(p)));
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const logs = [];
  try {
    const p = await browser.newPage({ viewport: { width: 375, height: 900 } });
    await p.goto('http://127.0.0.1:3100/login', { waitUntil: 'networkidle' });
    await p.evaluate(() => {
      window.focusProbe = [];
      const describe = el => ({ tag: el?.tagName, className: el?.className, hidden: el?.getClientRects?.().length === 0 });
      for (const type of ['focusin', 'focusout']) document.addEventListener(type, e => window.focusProbe.push({ type, target: describe(e.target), related: describe(e.relatedTarget), active: describe(document.activeElement) }));
      matchMedia('(min-width: 1024px)').addEventListener('change', e => window.focusProbe.push({ type: 'media', desktop: e.matches, active: describe(document.activeElement) }));
    });
    await p.locator('.layout-menu-toggle').click();
    await p.locator('.layout-menu-toggle').focus();
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.waitForTimeout(150);
    logs.push({ direction: 'mobile to desktop', ...(await p.evaluate(() => ({ active: document.activeElement.className, href: document.activeElement.getAttribute('href'), events: window.focusProbe }))) });
    await p.locator('.layout-main-nav a').first().focus();
    await p.evaluate(() => { window.focusProbe = []; });
    await p.setViewportSize({ width: 375, height: 900 });
    await p.waitForTimeout(150);
    logs.push({ direction: 'desktop to mobile', ...(await p.evaluate(() => ({ active: document.activeElement.className, events: window.focusProbe }))) });
    fs.writeFileSync(path.join(__dirname, 'focus-check.json'), JSON.stringify(logs, null, 2) + '\n');
    console.log(JSON.stringify(logs, null, 2));
    assert.equal(logs[0].href, '/');
    assert.match(logs[1].active, /layout-menu-toggle/);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
