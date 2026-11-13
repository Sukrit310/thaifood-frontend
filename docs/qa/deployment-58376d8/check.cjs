// Production smoke: real public API reads; no account/admin writes.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..'), cache = path.join(root, 'thaifood/node_modules/.cache/layout-qa');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(cache, 'browsers');
const npx = path.join(cache, 'npm/_npx');
const { chromium } = require(fs.readdirSync(npx).map(n => path.join(npx, n, 'node_modules/playwright')).find(fs.existsSync));
const base = 'https://thaifood-frontend.vercel.app';
const result = { status: 'running', base, commit: '58376d80e3d13a88f8005f52d97b0669c70cf199', checks: [], apiReads: [], pageErrors: [], corsErrors: [], blockedWrites: [] };
const save = () => fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(result, null, 2) + '\n');
let activePage;
function track(p) {
  p.on('pageerror', e => result.pageErrors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && /CORS|Access-Control-Allow-Origin/.test(m.text())) result.corsErrors.push(m.text()); });
}
async function open(p, route) {
  const response = await p.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 60000 }); assert.equal(response.status(), 200, route);
  await p.locator('main h1').waitFor({ timeout: 60000 });
  assert.equal(await p.locator('.layout-demo-banner').count(), 0);
  assert.equal(await p.locator('script[src*="/static/js/main."]').getAttribute('src'), '/static/js/main.1dd738ce.js');
}
function apiResponse(p, pathname) { return p.waitForResponse(r => new URL(r.url()).pathname === pathname && r.request().method() === 'GET', { timeout: 90000 }); }
async function read(response) {
  assert.equal(response.status(), 200); const url = new URL(response.url());
  assert.equal(url.hostname, 'thaifood-guide-api-a7c7.onrender.com');
  const cors = await response.headerValue('access-control-allow-origin'); assert.ok(cors === base || cors === '*');
  result.apiReads.push({ url: response.url(), status: response.status(), allowedOrigin: cors });
  return response.json();
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.route('**/api/**', route => {
      if (route.request().method() !== 'GET') { result.blockedWrites.push({ method: route.request().method(), path: new URL(route.request().url()).pathname }); return route.abort(); }
      return route.continue();
    });
    const p = await ctx.newPage(); activePage = p; track(p);
    console.log('Checking canonical production bundle, Home and public API/CORS');
    let request = apiResponse(p, '/api/restaurants'); await open(p, '/'); const home = await read(await request);
    assert.ok(home.items.length > 0); await p.locator('.restaurant-card').first().waitFor({ timeout: 90000 });
    for (const width of [375, 1440]) {
      await p.setViewportSize({ width, height: 1000 }); await p.evaluate(() => document.fonts.ready);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await p.screenshot({ path: path.join(__dirname, 'home-' + width + '.jpg'), type: 'jpeg', quality: 82 });
    }
    result.checks.push('Canonical URL serves expected latest bundle; Home at375/1440 has no banner/overflow and loads real Render data'); save();
    console.log('Checking list/search/detail with live public reads');
    request = apiResponse(p, '/api/restaurants'); await open(p, '/restaurants'); const list = await read(await request);
    await p.locator('.restaurant-card').first().waitFor({ timeout: 90000 }); assert.equal(await p.locator('.restaurant-card').count(), list.items.length);
    const first = list.items[0]; assert.ok(first?.id); result.liveRestaurantTotal = list.total;
    request = apiResponse(p, '/api/restaurants'); await open(p, '/restaurants?q=' + encodeURIComponent(first.name)); const searched = await read(await request);
    await p.locator('.restaurant-card').first().waitFor({ timeout: 90000 }); assert.ok(searched.items.some(r => r.id === first.id));
    request = apiResponse(p, '/api/restaurants/' + first.id); await open(p, '/restaurants/' + first.id); const detail = await read(await request);
    await p.locator('.detail-heading h1').waitFor({ timeout: 90000 }); assert.equal(await p.locator('.detail-heading h1').innerText(), detail.name);
    result.checks.push('SPA list/search/detail return200 and render matching real API data; CORS allows canonical origin'); save();
    console.log('Checking account routes, guest guards and mobile navigation');
    await open(p, '/login'); await p.locator('#login-email').waitFor(); assert.equal(await p.locator('.account-auth-panel').count(), 1);
    assert.equal(await p.getByText(/บัญชีทดลองในโหมด Mock/).count(), 0);
    await open(p, '/register'); await p.locator('#register-name').waitFor(); assert.equal(await p.locator('.account-form input').count(), 4);
    for (const route of ['/favorites', '/profile', '/admin']) {
      await open(p, route); await p.locator('#login-email').waitFor(); assert.equal(new URL(p.url()).pathname, '/login');
      assert.equal(await p.evaluate(() => history.state.usr.from.pathname), route);
    }
    await p.setViewportSize({ width: 375, height: 1000 }); const toggle = p.getByRole('button', { name: 'เปิดเมนูหลัก', exact: true });
    await toggle.click(); assert.equal(await p.getByRole('button', { name: 'ปิดเมนูหลัก', exact: true }).getAttribute('aria-expanded'), 'true');
    await p.keyboard.press('Escape'); assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    result.checks.push('New account composition/deep links, guest return-path guards and mobile disclosure navigation work on production'); save(); await ctx.close();
    console.log('Checking shipped Admin presentation with isolated read-only auth fixtures');
    const admin = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await admin.addInitScript(() => localStorage.setItem('thaifood.token', 'deployment-ui-fixture-only'));
    await admin.route('**/api/**', route => {
      const req = route.request(), pathname = new URL(req.url()).pathname;
      if (req.method() !== 'GET') { result.blockedWrites.push({ method: req.method(), path: pathname }); return route.abort(); }
      if (pathname === '/api/me') return route.fulfill({ json: { id: 999, displayName: 'ผู้ดูแลทดสอบ UI', email: 'qa@example.invalid', role: 'admin' } });
      if (pathname === '/api/admin/members') return route.fulfill({ json: { items: [] } });
      if (pathname === '/api/restaurants') return route.fulfill({ json: list });
      if (pathname === '/api/provinces') return route.fulfill({ json: { items: [{ id: 1, nameTh: first.province }] } });
      if (pathname === '/api/categories') return route.fulfill({ json: { items: [{ id: 1, nameTh: first.category }] } });
      return route.fulfill({ status: 404, json: { error: { message: 'Unexpected QA read' } } });
    });
    const a = await admin.newPage(); activePage = a; track(a);
    await open(a, '/admin'); await a.locator('.admin-stat-card').first().waitFor(); assert.equal(await a.locator('.admin-sidebar').count(), 1);
    await open(a, '/admin/restaurants'); await a.getByRole('table').waitFor(); assert.equal(await a.locator('.admin-table tbody tr').count(), list.items.length);
    await a.setViewportSize({ width: 375, height: 1000 }); assert.ok(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal(await a.getByRole('button', { name: 'ลบร้าน ' + first.name, exact: true }).evaluate(el => getComputedStyle(el).minWidth), '44px');
    await a.screenshot({ path: path.join(__dirname, 'admin-ui-fixture-375.jpg'), type: 'jpeg', quality: 82 });
    await open(a, '/admin/restaurants/new'); await a.locator('#restaurant-name').waitFor(); assert.equal(await a.getByRole('group').count(), 2);
    result.checks.push('Shipped Admin sidebar/table/mobile44px actions/grouped form render with isolated read-only auth fixtures; no real Admin operations'); save(); await admin.close();
    assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.corsErrors, []); assert.deepEqual(result.blockedWrites, []);
    result.status = 'passed'; save(); console.log(JSON.stringify({ status: result.status, checks: result.checks.length, liveAPIReads: result.apiReads.length, pageErrors: result.pageErrors.length, corsErrors: result.corsErrors.length, writes: result.blockedWrites.length }));
  } catch (e) { result.status = 'failed'; result.failure = e.stack; save(); if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(__dirname, 'failure.jpg'), type: 'jpeg', quality: 82 }).catch(() => {}); console.error(e); process.exitCode = 1; }
  finally { await browser.close(); }
})();
