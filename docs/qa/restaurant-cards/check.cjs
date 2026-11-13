// Requires npm start on temporary port3100 and the existing ignored Playwright cache.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const cache = path.join(root, 'thaifood/node_modules/.cache/layout-qa');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(cache, 'browsers');
const npx = path.join(cache, 'npm/_npx');
const { chromium } = require(fs.readdirSync(npx).map(n => path.join(npx, n, 'node_modules/playwright')).find(p => fs.existsSync(p)));
const base = 'http://127.0.0.1:3100';
const result = { status: 'running', viewports: [], checks: [], errors: [], fixtureWrites: [], live: {} };
const save = () => fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(result, null, 2) + '\n');
const longName = 'ครัวอาหารไทยริมแม่น้ำและเรื่องราวรสชาติท้องถิ่น'.repeat(7);
const member = { id: 902, displayName: 'สมาชิกทดสอบการ์ด', email: 'cards-qa@example.invalid', role: 'member' };
const restaurants = [
  { id: 501, name: 'ครัวสายลม', province: 'เชียงใหม่', category: 'อาหารเหนือ', imageUrl: '/images/food-noodles.svg', rating: 4.5, reviewCount: 2, address: 'ถนนตัวอย่าง อำเภอเมือง จังหวัดเชียงใหม่' },
  { id: 502, name: 'ครัวริมสวน', province: 'ขอนแก่น', category: 'อาหารอีสาน', imageUrl: null, rating: null, reviewCount: 0, address: 'ถนนตัวอย่าง จังหวัดขอนแก่น' },
  { id: 503, name: 'ร้านรูปไม่พร้อม', province: 'ภูเก็ต', category: 'อาหารทะเล', imageUrl: 'https://cards-qa.invalid/broken.webp', rating: null, reviewCount: 0, address: '' },
  { id: 504, name: longName, province: 'ชื่อจังหวัดสำหรับตรวจความกว้าง'.repeat(7), category: 'ประเภทอาหารชื่อยาว'.repeat(7), imageUrl: '/images/food-rice.svg', rating: 3.75, reviewCount: 1234, address: 'ที่อยู่ภาษาไทยและอาคาร'.repeat(35) + 'A'.repeat(150) },
  { id: 505, name: 'คาเฟ่ในเมือง', province: 'กรุงเทพมหานคร', category: 'คาเฟ่', imageUrl: '/images/food-cafe.svg', rating: 5, reviewCount: 1, address: 'ถนนตัวอย่าง กรุงเทพมหานคร' },
  { id: 506, name: 'ครัวริมทะเล', province: 'ภูเก็ต', category: 'อาหารใต้', imageUrl: '/images/food-soup.svg', rating: null, reviewCount: 0, address: 'ถนนตัวอย่าง จังหวัดภูเก็ต' },
].map(r => ({ ...r, description: 'ข้อมูลเฉพาะ browser QA' }));
const snap = (locator, name) => locator.screenshot({ path: path.join(__dirname, name + '.jpg'), type: 'jpeg', quality: 82 });
function track(p) { p.on('pageerror', e => result.errors.push(e.message)); }
async function settled(locator) { await locator.evaluate(async el => { getComputedStyle(el).transform; await Promise.all(el.getAnimations().map(a => a.finished.catch(() => {}))); }); }
async function metrics(p, route) {
  return p.evaluate(routeName => {
    const grid = document.querySelector('.restaurant-grid'), card = grid.querySelector('.restaurant-card');
    const media = card.querySelector('.card-media'), image = card.querySelector('.card-image');
    const box = media.getBoundingClientRect();
    return { route: routeName, width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      gap: getComputedStyle(grid).gap, radius: getComputedStyle(card).borderTopLeftRadius,
      titleSize: getComputedStyle(card.querySelector('.card-name')).fontSize,
      metaSize: getComputedStyle(card.querySelector('.card-meta')).fontSize,
      addressSize: getComputedStyle(card.querySelector('.card-address')).fontSize,
      imageRatio: box.width / box.height, imageFit: getComputedStyle(image).objectFit,
      mediaOverflow: getComputedStyle(media).overflow,
      nativeList: grid.tagName === 'UL', itemCount: grid.querySelectorAll(':scope > li').length,
      linksPerCard: [...grid.querySelectorAll('.restaurant-card')].map(c => c.querySelectorAll('a').length),
    };
  }, route);
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    let favorites = [...restaurants];
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.addInitScript(() => localStorage.setItem('thaifood.token', 'cards-fixture-only'));
    await ctx.route('https://cards-qa.invalid/**', route => route.abort());
    await ctx.route('**/api/**', async route => {
      const request = route.request(), u = new URL(request.url());
      if (request.method() === 'DELETE' && /^\/api\/favorites\/\d+$/.test(u.pathname)) {
        result.fixtureWrites.push({ method: 'DELETE', path: u.pathname, intercepted: true });
        await new Promise(resolve => setTimeout(resolve, 350));
        favorites = favorites.filter(r => r.id !== Number(u.pathname.split('/').at(-1)));
        return route.fulfill({ status: 204 });
      }
      assert.equal(request.method(), 'GET', 'No live writes are allowed');
      let data;
      if (u.pathname === '/api/me') data = member;
      else if (u.pathname === '/api/provinces') data = { items: [{ id: 1, nameTh: 'เชียงใหม่' }, { id: 2, nameTh: 'ภูเก็ต' }] };
      else if (u.pathname === '/api/categories') data = { items: [{ id: 1, nameTh: 'อาหารเหนือ' }, { id: 2, nameTh: 'อาหารใต้' }] };
      else if (u.pathname === '/api/restaurants') data = { items: restaurants, total: 6, page: 1, limit: Number(u.searchParams.get('limit') || 12) };
      else if (u.pathname === '/api/favorites') data = { items: favorites };
      else if (u.pathname === '/api/restaurants/501') data = restaurants[0];
      else if (u.pathname === '/api/restaurants/501/reviews') data = { items: [4, 5].map((rating, i) => ({ id: i + 1, rating, text: 'ข้อมูลรีวิวเฉพาะการทดสอบ Layout', member: { ...member, id: 100 + i }, createdAt: '2026-11-13T09:00:00Z' })) };
      else return route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', message: 'QA fixture missing' } } });
      return route.fulfill({ json: data });
    });
    const p = await ctx.newPage(); track(p);
    const styles = [];
    for (const [route, name] of [['/', 'home'], ['/restaurants', 'search'], ['/favorites', 'favorites']]) {
      console.log('Checking cards:', name);
      await p.goto(base + route, { waitUntil: 'networkidle' });
      await p.getByRole('list', { name: 'รายการร้านอาหาร' }).waitFor();
      await p.evaluate(() => document.fonts.ready);
      for (const width of [320, 375, 768, 1024, 1440]) {
        await p.setViewportSize({ width, height: 1000 });
        await p.locator('h1').first().click();
        const m = await metrics(p, route);
        assert.ok(m.scrollWidth <= width, name + ' overflow at' + width);
        assert.equal(m.columns, width < 640 ? 1 : width < 1024 ? 2 : 3);
        assert.equal(m.gap, '24px'); assert.equal(m.radius, '18px');
        assert.equal(m.titleSize, '20px'); assert.equal(m.metaSize, '14px'); assert.equal(m.addressSize, '14px');
        assert.ok(Math.abs(m.imageRatio - 4 / 3) < .01);
        assert.equal(m.imageFit, 'cover'); assert.equal(m.mediaOverflow, 'hidden');
        assert.ok(m.nativeList); assert.equal(m.itemCount, 6);
        assert.ok(m.linksPerCard.every(n => n === 1));
        result.viewports.push(m); save();
        if (width === 375) await snap(p.getByRole('article', { name: 'ครัวสายลม', exact: true }), name + '-card-375');
        if (width === 1440) await snap(p.locator('.restaurant-grid'), name + '-grid-1440');
      }
      styles.push(await p.getByRole('article', { name: 'ครัวสายลม', exact: true }).evaluate(c => ({ radius: getComputedStyle(c).borderTopLeftRadius, padding: getComputedStyle(c.querySelector('.card-content')).padding, title: getComputedStyle(c.querySelector('.card-name')).fontSize, meta: getComputedStyle(c.querySelector('.card-meta')).fontSize })));
      const broken = p.getByRole('article', { name: 'ร้านรูปไม่พร้อม', exact: true }).locator('img');
      await broken.scrollIntoViewIfNeeded();
      await p.waitForFunction(() => { const img = [...document.querySelectorAll('.restaurant-card')].find(c => c.textContent.includes('ร้านรูปไม่พร้อม')).querySelector('img'); return img.getAttribute('src') === '/images/food-rice.svg' && img.complete && img.naturalWidth > 0; });
      assert.equal(await p.getByRole('article', { name: 'ครัวริมสวน', exact: true }).locator('img').getAttribute('src'), '/images/food-rice.svg');
      const first = p.getByRole('link', { name: 'ครัวสายลม', exact: true });
      await p.keyboard.press('Tab'); await first.focus();
      await p.keyboard.press('Tab');
      if (name === 'favorites') assert.equal(await p.getByRole('article', { name: 'ครัวสายลม', exact: true }).getByRole('button').evaluate(el => document.activeElement === el), true);
      else assert.equal(await p.getByRole('link', { name: 'ครัวริมสวน', exact: true }).evaluate(el => document.activeElement === el), true);
    }
    assert.deepEqual(styles[0], styles[1]); assert.deepEqual(styles[1], styles[2]);
    result.checks.push('Home/Search/Favorites use the same card styles at320/375/768/1024/1440;1/2/3 columns;no overflow with long Thai text;4:3/lazy images and bounded local fallback'); save();

    console.log('Checking action isolation, focus and hover');
    const firstCard = p.getByRole('article', { name: 'ครัวสายลม', exact: true });
    const firstLink = firstCard.getByRole('link', { name: 'ครัวสายลม', exact: true });
    await firstLink.focus();
    assert.equal(await firstLink.evaluate(el => getComputedStyle(el).outlineWidth), '3px');
    assert.equal(await firstCard.evaluate(el => getComputedStyle(el).overflow), 'visible');
    await p.locator('h1').click();
    await firstCard.hover(); await settled(firstCard); await settled(firstCard.locator('img'));
    assert.match(await firstCard.evaluate(el => getComputedStyle(el).transform), /-3\)/);
    assert.match(await firstCard.locator('img').evaluate(el => getComputedStyle(el).transform), /1\.025/);
    assert.equal(await firstCard.locator('.card-media').evaluate(el => getComputedStyle(el).overflow), 'hidden');
    await p.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await firstCard.evaluate(el => getComputedStyle(el).transform), 'none');
    assert.equal(await firstCard.locator('img').evaluate(el => getComputedStyle(el).transform), 'none');
    await p.emulateMedia({ reducedMotion: 'no-preference' });
    const remove = firstCard.getByRole('button', { name: 'นำออกจากร้านโปรด', exact: true });
    await remove.click();
    assert.equal(new URL(p.url()).pathname, '/favorites');
    await p.waitForFunction(() => document.querySelectorAll('.restaurant-card').length === 5);
    assert.equal(await p.getByRole('article', { name: 'ครัวสายลม', exact: true }).count(), 0);
    assert.deepEqual(result.fixtureWrites, [{ method: 'DELETE', path: '/api/favorites/501', intercepted: true }]);
    result.checks.push('one keyboard stop per restaurant link;separate favorite action;fixture-only removal uses correct restaurant ID without navigation;visible focus;clipped hover and reduced motion'); save();

    await p.goto(base + '/restaurants', { waitUntil: 'networkidle' });
    const link = p.getByRole('link', { name: 'ครัวสายลม', exact: true });
    await link.locator('img').click();
    await p.waitForURL(u => u.pathname === '/restaurants/501');
    await p.locator('.detail-grid').waitFor();
    assert.equal(await p.locator('.detail-image').evaluate(el => getComputedStyle(el).borderTopLeftRadius), '12px');
    assert.equal(await p.locator('.layout-brand').first().innerText(), 'ThaiFood.');
    await p.goto(base + '/login', { waitUntil: 'networkidle' });
    // A signed-in fixture is redirected Home by the original login behavior.
    await p.locator('.home-page').waitFor();
    result.checks.push('image/content link retains restaurant route;Detail and prior Layout styles remain unchanged;existing signed-in redirect preserved'); save();
    await ctx.close();

    console.log('Checking real public API');
    const live = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), lp = await live.newPage(); track(lp);
    const liveWrites = [];
    lp.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/') && r.method() !== 'GET') liveWrites.push(r.method() + r.url()); });
    const responsePromise = lp.waitForResponse(r => new URL(r.url()).pathname === '/api/restaurants', { timeout: 90000 });
    await lp.goto(base + '/restaurants', { waitUntil: 'domcontentloaded' });
    const response = await responsePromise, data = await response.json();
    assert.equal(response.status(), 200);
    await lp.getByRole('list', { name: 'รายการร้านอาหาร' }).waitFor();
    assert.equal(await lp.locator('.restaurant-card').count(), data.items.length);
    for (const r of data.items) {
      const card = lp.getByRole('article', { name: r.name, exact: true });
      assert.equal(await card.getByRole('link', { name: r.name, exact: true }).getAttribute('href'), '/restaurants/' + r.id);
      if (r.rating == null) assert.match(await card.locator('.rating').innerText(), /ยังไม่มีคะแนน/);
      else assert.ok((await card.locator('.rating').innerText()).includes(Number(r.rating).toFixed(1)));
    }
    assert.equal(liveWrites.length, 0);
    result.live = { status: response.status(), cards: data.items.length, total: data.total, writes: liveWrites, source: 'local UI -> unchanged development proxy -> Render; no fixtures in this context' };
    await live.close();
    assert.equal(result.errors.length, 0);
    result.status = 'passed'; save(); console.log(JSON.stringify(result, null, 2));
  } catch (error) { result.status = 'failed'; result.failure = error.stack; save(); throw error; }
  finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
