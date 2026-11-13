// Re-run after npm start on port3100. Playwright stays in the ignored node_modules cache.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const cacheRoot = path.join(root, 'thaifood/node_modules/.cache/layout-qa');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(cacheRoot, 'browsers');
const npxRoot = path.join(cacheRoot, 'npm/_npx');
const { chromium } = require(fs.readdirSync(npxRoot).map(n => path.join(npxRoot, n, 'node_modules/playwright')).find(p => fs.existsSync(p)));
const base = 'http://127.0.0.1:3100';
const output = { status: 'running', viewports: [], checks: [], errors: [], writes: [], live: {} };
const save = () => fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(output, null, 2) + '\n');
const longName = 'นักชิมผู้ชื่นชอบอาหารท้องถิ่นและการเดินทาง'.repeat(5);
const member = role => ({ id: role === 'admin' ? 901 : 902, displayName: role === 'member' ? longName : 'ผู้ดูแล ThaiFood', email: role + '@example.invalid', role });
const restaurants = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: 'ครัวตรวจ Layout ' + (i + 1), province: 'เชียงใหม่', category: 'อาหารเหนือ', imageUrl: null, address: 'ที่อยู่สำหรับทดสอบ', rating: null, reviewCount: 0, description: 'ข้อมูลเฉพาะ browser QA' }));
function track(page) {
  page.on('pageerror', e => output.errors.push(e.message));
  page.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/') && r.method() !== 'GET') output.writes.push(r.method() + ' ' + r.url()); });
}
async function contextFor(browser, role) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  // Only seed the first document. A hard navigation after logout must not recreate a session.
  if (role !== 'guest') await ctx.addInitScript(() => { if (!sessionStorage.getItem('layout-qa-seeded')) { localStorage.setItem('thaifood.token', 'layout-qa-only'); sessionStorage.setItem('layout-qa-seeded', 'true'); } });
  await ctx.route('**/api/**', route => {
    assert.equal(route.request().method(), 'GET');
    const u = new URL(route.request().url());
    let data;
    if (u.pathname === '/api/me' && role !== 'guest') data = member(role);
    else if (u.pathname === '/api/provinces') data = { items: [{ id: 1, nameTh: 'เชียงใหม่' }, { id: 2, nameTh: 'กรุงเทพมหานคร' }] };
    else if (u.pathname === '/api/categories') data = { items: [{ id: 1, nameTh: 'อาหารเหนือ' }] };
    else if (u.pathname === '/api/restaurants') data = { items: restaurants, total: 6, page: 1, limit: Number(u.searchParams.get('limit') || 12) };
    else if (u.pathname === '/api/restaurants/1') data = restaurants[0];
    else if (u.pathname === '/api/restaurants/1/reviews') data = { items: [] };
    else if (u.pathname === '/api/favorites') data = { items: restaurants.slice(0, 2) };
    else if (u.pathname === '/api/admin/members') data = { items: [member('member')] };
    else return route.fulfill({ status: 401, json: { error: { code: 'UNAUTHORIZED', message: 'QA guest' } } });
    return route.fulfill({ json: data });
  });
  return ctx;
}
const snap = (locator, name) => locator.screenshot({ path: path.join(__dirname, name + '.jpg'), type: 'jpeg', quality: 82 });
const closed = p => p.waitForFunction(() => document.querySelector('.layout-menu-toggle').getAttribute('aria-expanded') === 'false');
const active = p => p.evaluate(() => ({ tag: document.activeElement.tagName, href: document.activeElement.getAttribute('href'), id: document.activeElement.id, className: document.activeElement.className }));
function metrics(p, role) {
  return p.evaluate(roleName => ({ role: roleName, width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    toggleVisible: getComputedStyle(document.querySelector('.layout-menu-toggle')).display !== 'none',
    navVisible: getComputedStyle(document.querySelector('.layout-navigation')).display !== 'none',
    headerPosition: getComputedStyle(document.querySelector('.layout-header')).position,
    headerBoxes: ['.layout-brand', '.layout-main-nav', '.layout-account'].map(s => { const b = document.querySelector('.layout-header ' + s).getBoundingClientRect(); return { left: b.left, right: b.right }; }),
  }), role);
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const role of ['guest', 'member', 'admin']) {
      console.log('Checking role:', role);
      const ctx = await contextFor(browser, role), p = await ctx.newPage();
      track(p);
      await p.goto(base, { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      if (role !== 'guest') await p.locator('.layout-profile-link').waitFor();
      for (const width of [320, 375, 768, 1024, 1440]) {
        await p.setViewportSize({ width, height: 1000 });
        await closed(p);
        await p.locator('.layout-demo-banner').click();
        const m = await metrics(p, role);
        assert.ok(m.scrollWidth <= width, role + ' overflow at' + width);
        assert.equal(m.toggleVisible, width < 1024);
        assert.equal(m.navVisible, width >= 1024);
        assert.equal(m.headerPosition, 'static');
        if (width >= 1024) assert.ok(m.headerBoxes[0].right < m.headerBoxes[1].left && m.headerBoxes[1].right < m.headerBoxes[2].left, role + ' overlap at' + width);
        output.viewports.push(m); save();
        if (width === 375 || width === 1440) {
          await snap(p.locator('.layout-header'), role + '-header-' + width);
          await snap(p.locator('.layout-footer'), role + '-footer-' + width);
        }
        if (width === 375) {
          await p.locator('.layout-menu-toggle').click();
          const nav = p.getByRole('navigation', { name: 'เมนูหลัก', exact: true });
          assert.equal(await nav.getByRole('link', { name: 'ร้านโปรด', exact: true }).count(), role === 'guest' ? 0 : 1);
          assert.equal(await nav.getByRole('link', { name: 'จัดการระบบ', exact: true }).count(), role === 'admin' ? 1 : 0);
          assert.ok((await metrics(p, role)).scrollWidth <= width);
          if (role === 'member') {
            assert.equal(await p.locator('.layout-profile-link').getAttribute('title'), longName);
            assert.equal(await p.locator('.layout-profile-copy strong').evaluate(el => getComputedStyle(el).textOverflow), 'ellipsis');
          }
          await snap(p.locator('.layout-header'), role + '-menu-open-375');
          await p.keyboard.press('Escape'); await closed(p);
          assert.match((await active(p)).className, /layout-menu-toggle/);
        }
      }
      const f = p.getByRole('contentinfo');
      assert.equal(await f.getByRole('link', { name: 'ร้านโปรด', exact: true }).count(), role === 'guest' ? 0 : 1);
      assert.equal(await f.getByRole('link', { name: 'จัดการระบบ', exact: true }).count(), role === 'admin' ? 1 : 0);
      assert.match(await f.innerText(), /© 2026 ThaiFood\./);
      if (role !== 'guest') {
        await p.locator('.layout-signout').click();
        await p.locator('.layout-login-link').waitFor();
        assert.equal(await p.evaluate(() => localStorage.getItem('thaifood.token')), null);
        assert.equal(new URL(p.url()).pathname, '/');
      }
      output.checks.push(role + ' role destinations/5 widths/footer/logout passed'); save();
      await ctx.close();
    }
    console.log('Checking keyboard and navigation');
    const ctx = await contextFor(browser, 'guest'), p = await ctx.newPage();
    track(p);
    await p.setViewportSize({ width: 375, height: 900 });
    await p.goto(base + '/login', { waitUntil: 'networkidle' });
    await p.keyboard.press('Tab');
    assert.match((await active(p)).className, /layout-skip-link/);
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => document.activeElement.id === 'main-content');
    await p.goto(base + '/login', { waitUntil: 'networkidle' });
    const t = p.locator('.layout-menu-toggle');
    await t.focus(); await p.keyboard.press('Tab');
    assert.equal((await active(p)).id, 'login-email');
    await t.focus(); await p.keyboard.press('Enter');
    for (const href of ['/', '/restaurants', '/login', '/register']) { await p.keyboard.press('Tab'); assert.equal((await active(p)).href, href); }
    assert.equal(await p.evaluate(() => getComputedStyle(document.activeElement).outlineWidth), '3px');
    await p.keyboard.press('Escape'); await closed(p);
    assert.match((await active(p)).className, /layout-menu-toggle/);
    await t.click();
    await p.locator('.layout-main-nav a').last().focus();
    await p.locator('.layout-demo-banner').click(); await closed(p);
    output.outsidePointerFocus = await active(p);
    assert.equal(await p.evaluate(() => document.querySelector('.layout-navigation').contains(document.activeElement)), false);
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.waitForFunction(() => !matchMedia('(max-width: 1023px)').matches);
    assert.equal((await active(p)).tag, 'BODY');
    await p.setViewportSize({ width: 375, height: 900 });
    await p.waitForFunction(() => matchMedia('(max-width: 1023px)').matches);
    assert.equal((await active(p)).tag, 'BODY');
    await t.click();
    await p.getByRole('navigation', { name: 'เมนูหลัก', exact: true }).getByRole('link', { name: 'ค้นหาร้านอาหาร', exact: true }).click();
    await p.locator('.restaurants-page').waitFor(); await closed(p);
    assert.equal((await active(p)).id, 'main-content');
    await t.click();
    await p.getByRole('navigation', { name: 'เมนูหลัก', exact: true }).getByRole('link', { name: 'ค้นหาร้านอาหาร', exact: true }).click(); await closed(p);
    await p.goto(base + '/restaurants?q=ข้าว', { waitUntil: 'networkidle' });
    await t.click();
    await p.getByRole('navigation', { name: 'เมนูหลัก', exact: true }).getByRole('link', { name: 'ค้นหาร้านอาหาร', exact: true }).click();
    await p.waitForURL(url => !url.search); await closed(p);
    output.checks.push('skip link/tab order/visible focus/Escape/outside/path/current-route/query close passed'); save();
    await t.click(); await t.focus();
    await p.setViewportSize({ width: 1440, height: 1000 }); await closed(p);
    await p.waitForFunction(() => document.activeElement.matches('.layout-main-nav a:first-child'));
    await p.setViewportSize({ width: 375, height: 900 });
    await p.waitForFunction(() => document.activeElement.matches('.layout-menu-toggle'));
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await t.click();
    assert.equal(await p.locator('.layout-main-nav a').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    await p.keyboard.press('Escape'); await closed(p);
    output.checks.push('responsive focus transfer and reduced motion passed'); save();
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.goto(base, { waitUntil: 'networkidle' });
    await p.screenshot({ path: path.join(__dirname, 'guest-home-1440.jpg'), type: 'jpeg', quality: 82 });
    assert.equal(await p.locator('.home-hero').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 2);
    await p.goto(base + '/restaurants', { waitUntil: 'networkidle' });
    assert.equal(await p.locator('.restaurant-card').first().evaluate(el => getComputedStyle(el).borderTopLeftRadius), '18px');
    await p.getByRole('link', { name: 'ครัวตรวจ Layout 1', exact: true }).click();
    await p.locator('.detail-grid').waitFor();
    assert.equal(await p.locator('.detail-image').evaluate(el => getComputedStyle(el).borderTopLeftRadius), '12px');
    output.checks.push('Home/Search/Detail page style isolation and existing routing passed'); save();
    await ctx.close();
    console.log('Checking live public API');
    const live = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), lp = await live.newPage();
    track(lp);
    const responsePromise = lp.waitForResponse(r => new URL(r.url()).pathname === '/api/restaurants', { timeout: 90000 });
    await lp.goto(base + '/restaurants', { waitUntil: 'domcontentloaded' });
    const response = await responsePromise, data = await response.json();
    assert.equal(response.status(), 200);
    await lp.locator('.restaurant-card').first().waitFor({ timeout: 90000 });
    assert.equal(await lp.locator('.restaurant-card').count(), data.items.length);
    assert.equal(await lp.getByRole('note', { name: 'ข้อมูลสาธิต' }).count(), 0);
    output.live = { status: response.status(), total: data.total, cards: data.items.length, source: 'unchanged local proxy -> Render; no API fixtures in this context' };
    await live.close();
    assert.equal(output.errors.length, 0); assert.equal(output.writes.length, 0);
    output.status = 'passed'; save(); console.log(JSON.stringify(output, null, 2));
  } catch (error) { output.status = 'failed'; output.failure = error.stack; save(); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
