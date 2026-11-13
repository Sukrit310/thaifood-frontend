// npm start on temporary port3100; QA dependencies remain in the ignored cache.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const cache = path.join(root, 'thaifood/node_modules/.cache/layout-qa');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(cache, 'browsers');
const npx = path.join(cache, 'npm/_npx');
const { chromium } = require(fs.readdirSync(npx).map(n => path.join(npx, n, 'node_modules/playwright')).find(p => fs.existsSync(p)));
const base = 'http://127.0.0.1:3100';
const result = { status: 'running', viewports: [], checks: [], errors: [], fixtureMutations: [], live: {} };
let activePage;
const save = () => fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(result, null, 2) + '\n');
const r1 = { id: 501, name: 'ครัวสายลม', province: 'เชียงใหม่', category: 'อาหารเหนือ', address: 'ถนนตัวอย่าง ตำบลสุเทพ อำเภอเมืองเชียงใหม่', description: 'มื้ออุ่น ๆ จากครัวเล็กในเมืองเชียงใหม่\nแบ่งปันเรื่องราวผ่านรสชาติของอาหารท้องถิ่น', imageUrl: '/images/home-editorial/khao-soi-1100.webp', latitude: 18.79, longitude: 98.98 };
const member = role => ({ id: role === 'admin' ? 901 : 902, displayName: role === 'admin' ? 'ผู้ดูแลสำหรับทดสอบ' : 'สมาชิกสำหรับทดสอบ', email: role + '@example.invalid', role });
const seedReviews = () => [4, 5].map((rating, i) => ({ id: 91 + i, rating, text: ['มื้ออร่อยและบรรยากาศสบาย ชอบอาหารท้องถิ่นของที่นี่', 'รสชาติดีและบริการเป็นกันเอง อยากกลับมาลองเมนูอื่นอีก'][i], member: { id: 21 + i, displayName: ['นักชิมท้องถิ่น', 'คนชอบเดินทาง'][i], email: 'review-' + i + '@example.invalid', role: 'member' }, createdAt: '2026-11-13T09:00:00Z' }));
const shot = (locator, name) => locator.screenshot({ path: path.join(__dirname, name + '.jpg'), type: 'jpeg', quality: 82 });
const visit = p => p.getByRole('complementary', { name: 'แวะไปอร่อยที่นี่' });
const reviews = p => p.getByRole('region', { name: /^เสียงจากคนที่ได้ลอง/ });
const ready = p => p.locator('.detail-heading h1').waitFor();
function track(p) { p.on('pageerror', e => result.errors.push(e.message)); }
async function fixture(browser, role) {
  const state = { role, detailMode: 'success', reviewsMode: 'success', favoritesMode: 'success', favoriteWriteError: false, reviewWriteError: false, delay: 0, noCoordinates: false, brokenImage: false, longText: false, confirm: true, requests: [], dialogs: [], reviews: seedReviews(), favorites: [] };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  if (role !== 'guest') await ctx.addInitScript(() => localStorage.setItem('thaifood.token', 'detail-fixture-only'));
  const detail = () => ({ ...r1,
    name: state.longText ? 'ร้านอาหารท้องถิ่นและความทรงจำระหว่างทาง'.repeat(9) : r1.name,
    address: state.longText ? 'ที่อยู่สำหรับทดสอบข้อความยาว'.repeat(25) : r1.address,
    description: state.longText ? 'เรื่องราวอาหารไทยและการเดินทาง'.repeat(45) + 'A'.repeat(200) : r1.description,
    latitude: state.noCoordinates ? null : r1.latitude, longitude: state.noCoordinates ? null : r1.longitude,
    imageUrl: state.brokenImage ? 'https://detail-qa.invalid/broken.webp' : r1.imageUrl,
    rating: state.reviews.length ? state.reviews.reduce((sum, r) => sum + r.rating, 0) / state.reviews.length : null,
    reviewCount: state.reviews.length,
  });
  const fail = (route, message, status = 503) => route.fulfill({ status, json: { error: { code: 'QA_ERROR', message } } });
  await ctx.route('https://detail-qa.invalid/**', route => route.abort());
  await ctx.route('**/api/**', async route => {
    const request = route.request(), u = new URL(request.url()), method = request.method();
    state.requests.push({ path: u.pathname, method });
    if (method !== 'GET') {
      assert.notEqual(role, 'guest');
      const body = request.postDataJSON();
      result.fixtureMutations.push({ role, method, path: u.pathname, body, intercepted: true });
      if (u.pathname === '/api/favorites' && method === 'POST') {
        assert.equal(body.restaurantId, 501);
        await new Promise(resolve => setTimeout(resolve, 400));
        if (state.favoriteWriteError) return fail(route, 'บันทึกร้านโปรดไม่สำเร็จสำหรับทดสอบ');
        state.favorites = [detail()]; return route.fulfill({ status: 201, json: { restaurantId: 501 } });
      }
      if (u.pathname === '/api/favorites/501' && method === 'DELETE') { state.favorites = []; return route.fulfill({ status: 204 }); }
      if (u.pathname === '/api/restaurants/501/reviews' && method === 'POST') {
        if (state.reviewWriteError) return fail(route, 'ส่งรีวิวไม่สำเร็จสำหรับทดสอบ', 409);
        assert.ok(body.rating >= 1 && body.rating <= 5); assert.ok(body.text.trim().length >= 10);
        const review = { id: 95, ...body, member: member(role), createdAt: '2026-11-13T10:00:00Z' };
        state.reviews = [...state.reviews, review]; return route.fulfill({ status: 201, json: review });
      }
      if (/^\/api\/reviews\/\d+$/.test(u.pathname) && method === 'DELETE') {
        const id = Number(u.pathname.split('/').at(-1)), item = state.reviews.find(r => r.id === id);
        assert.ok(item && (role === 'admin' || item.member.id === member(role).id));
        state.reviews = state.reviews.filter(r => r.id !== id); return route.fulfill({ status: 204 });
      }
      throw new Error('Unexpected fixture write: ' + method + ' ' + u.pathname);
    }
    let data;
    if (u.pathname === '/api/me' && role !== 'guest') data = member(role);
    else if (u.pathname === '/api/restaurants/501') {
      if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
      if (state.detailMode === 'error') return fail(route, 'โหลดรายละเอียดไม่สำเร็จสำหรับทดสอบ');
      if (state.detailMode === '404') return fail(route, 'ไม่พบร้าน', 404);
      data = detail();
    } else if (u.pathname === '/api/restaurants/501/reviews') {
      if (state.reviewsMode === 'error') return fail(route, 'โหลดรีวิวไม่สำเร็จสำหรับทดสอบ');
      data = { items: state.reviews };
    } else if (u.pathname === '/api/favorites') {
      if (state.favoritesMode === 'error') return fail(route, 'ตรวจร้านโปรดไม่สำเร็จสำหรับทดสอบ');
      data = { items: state.favorites };
    } else if (u.pathname === '/api/restaurants') data = { items: [detail()], total: 1, page: 1, limit: Number(u.searchParams.get('limit') || 12) };
    else if (u.pathname === '/api/provinces') data = { items: [{ id: 1, nameTh: 'เชียงใหม่' }] };
    else if (u.pathname === '/api/categories') data = { items: [{ id: 1, nameTh: 'อาหารเหนือ' }] };
    else return fail(route, 'Unexpected QA endpoint', 404);
    return route.fulfill({ json: data });
  });
  const p = await ctx.newPage(); track(p);
  p.on('dialog', async dialog => { state.dialogs.push({ message: dialog.message(), accepted: state.confirm }); await (state.confirm ? dialog.accept() : dialog.dismiss()); });
  return { ctx, p, state };
}
async function metrics(p, role) {
  return p.evaluate(roleName => {
    const box = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const labels = [...document.querySelectorAll('.star-input label')].map(el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, y: r.y }; });
    return { role: roleName, width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      columns: getComputedStyle(document.querySelector('.detail-grid')).gridTemplateColumns.split(' ').length,
      story: box('.detail-main'), visit: box('.detail-sidebar'), reviews: box('.reviews-section'), hero: box('.detail-figure'),
      heroFit: getComputedStyle(document.querySelector('.detail-image')).objectFit, sidebarPosition: getComputedStyle(document.querySelector('.detail-sidebar')).position,
      radioLabels: labels,
    };
  }, role);
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const role of (process.argv.includes('--member-only') ? ['member'] : ['guest', 'member', 'admin'])) {
      console.log('Checking detail role:', role);
      const { ctx, p, state } = await fixture(browser, role);
      activePage = p;
      await p.goto(base + '/restaurants/501', { waitUntil: 'networkidle' }); await ready(p); await p.evaluate(() => document.fonts.ready);
      for (const width of [320, 375, 768, 1024, 1440]) {
        await p.setViewportSize({ width, height: 1000 }); await p.locator('.detail-heading h1').click();
        const m = await metrics(p, role);
        assert.ok(m.scrollWidth <= width, role + ' overflow at' + width);
        assert.equal(m.columns, width >= 1024 ? 2 : 1); assert.equal(m.sidebarPosition, 'static');
        assert.ok(Math.abs(m.hero.width / m.hero.height - (width < 640 ? 4 / 3 : 1.6)) < .01); assert.equal(m.heroFit, 'cover');
        if (width >= 1024) assert.ok(m.story.right < m.visit.x && m.reviews.x === m.story.x);
        else assert.ok(m.story.bottom <= m.visit.y && m.visit.bottom <= m.reviews.y, 'mobile order must be story/visit/reviews');
        if (role !== 'guest') { assert.equal(m.radioLabels.length, 5); assert.ok(m.radioLabels.every(r => r.width >= 44 && r.height >= 44)); assert.ok(m.radioLabels.every(r => Math.abs(r.y - m.radioLabels[0].y) < 1)); }
        result.viewports.push(m); save();
        if (role === 'guest' && (width === 375 || width === 1440)) await p.screenshot({ path: path.join(__dirname, 'guest-detail-' + width + '.jpg'), type: 'jpeg', quality: 82, fullPage: true });
        if (role === 'member' && (width === 375 || width === 1440)) await shot(p.locator('.review-form'), 'member-form-' + width);
      }
      assert.equal(await p.getByRole('button', { name: 'ลบรีวิว', exact: true }).count(), role === 'admin' ? 2 : 0);
      const map = visit(p).getByRole('link', { name: /ดูตำแหน่งบนแผนที่/ });
      assert.equal(await map.getAttribute('href'), 'https://www.openstreetmap.org/?mlat=18.79&mlon=98.98#map=16/18.79/98.98');
      assert.equal(await map.getAttribute('target'), '_blank');
      if (role === 'guest') {
        assert.equal(state.requests.some(r => r.path === '/api/favorites'), false);
        await p.locator('.detail-rating a').click(); await p.waitForFunction(() => document.activeElement.id === 'reviews-heading');
        await p.getByRole('link', { name: 'เข้าสู่ระบบเพื่อรีวิว', exact: true }).click();
        await p.locator('#login-email').waitFor(); assert.equal(await p.evaluate(() => history.state.usr.from.pathname), '/restaurants/501');
      } else if (role === 'member') {
        state.favoriteWriteError = true;
        await visit(p).getByRole('button', { name: 'บันทึกร้านโปรด', exact: true }).click();
        await visit(p).getByRole('alert').filter({ hasText: 'บันทึกร้านโปรดไม่สำเร็จสำหรับทดสอบ' }).waitFor();
        state.favoriteWriteError = false;
        await visit(p).getByRole('button', { name: 'บันทึกร้านโปรด', exact: true }).click();
        await visit(p).getByRole('button', { name: 'บันทึกในร้านโปรดแล้ว', exact: true }).waitFor();
        assert.equal(await visit(p).getByRole('button', { name: 'บันทึกในร้านโปรดแล้ว', exact: true }).getAttribute('aria-pressed'), 'true');
        await visit(p).getByRole('button', { name: 'บันทึกในร้านโปรดแล้ว', exact: true }).click();
        await visit(p).getByRole('button', { name: 'บันทึกร้านโปรด', exact: true }).waitFor();
        await p.getByRole('radio', { name: '5 ดาว', exact: true }).focus(); await p.keyboard.press('ArrowLeft');
        assert.equal(await p.getByRole('radio', { name: '4 ดาว', exact: true }).isChecked(), true);
        assert.equal(await p.getByRole('radio', { name: '4 ดาว', exact: true }).evaluate(el => getComputedStyle(el.closest('label')).outlineWidth), '3px');
        const text = 'อาหารอร่อย บริการดี และบรรยากาศสบาย อยากกลับมาอีกครั้ง';
        await p.getByLabel('รีวิวของคุณ', { exact: true }).fill(text); state.reviewWriteError = true;
        await p.getByRole('button', { name: 'ส่งรีวิว', exact: true }).click();
        await p.locator('.review-form').getByRole('alert').waitFor();
        const retainedDraft = p.getByRole('textbox', { name: 'รีวิวของคุณ', exact: true });
        assert.equal(await retainedDraft.count(), 1, 'review textbox must retain a stable accessible name');
        assert.equal(await retainedDraft.inputValue(), text);
        await shot(p.locator('.review-form'), 'review-error-draft'); state.reviewWriteError = false;
        await p.getByRole('button', { name: 'ส่งรีวิว', exact: true }).click();
        await p.getByText('คุณรีวิวร้านนี้แล้ว สามารถลบรีวิวเดิมก่อนเขียนใหม่ได้', { exact: true }).waitFor();
        await p.getByText('4.3 / 5', { exact: true }).waitFor(); assert.match(await p.locator('#reviews-heading').innerText(), /\(3\)/);
        assert.equal(await p.evaluate(() => document.activeElement.id), 'reviews-heading');
        assert.equal(await reviews(p).getByRole('status').innerText(), 'ขอบคุณที่แบ่งปันรีวิว');
        await p.getByRole('button', { name: 'ลบรีวิว', exact: true }).click();
        await p.locator('.review-form').waitFor(); await p.getByText('4.5 / 5', { exact: true }).waitFor();
        assert.equal(await p.evaluate(() => document.activeElement.id), 'reviews-heading'); assert.equal(state.reviews.length, 2);
        await p.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await p.getByRole('button', { name: 'ส่งรีวิว', exact: true }).evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      } else {
        state.confirm = false; await p.getByRole('button', { name: 'ลบรีวิว', exact: true }).first().click(); assert.equal(state.reviews.length, 2);
        state.confirm = true; await p.getByRole('button', { name: 'ลบรีวิว', exact: true }).first().click();
        await p.getByText('5.0 / 5', { exact: true }).waitFor(); assert.equal(state.reviews.length, 1);
      }
      result.checks.push(role + '5widths/layout/rating/map/permissions/interactions passed'); save(); await ctx.close();
    }
    console.log('Checking independent resource states and long content');
    const { ctx, p, state } = await fixture(browser, 'member'); state.delay = 1800;
    await p.goto(base + '/restaurants/501', { waitUntil: 'domcontentloaded' });
    await p.getByRole('status').filter({ hasText: 'กำลังโหลดรายละเอียดร้านอาหาร' }).waitFor(); await shot(p.locator('.detail-content'), 'loading-1440'); await ready(p); state.delay = 0;
    state.detailMode = 'error'; await p.reload({ waitUntil: 'networkidle' }); await p.getByRole('alert').waitFor(); await shot(p.locator('.detail-content'), 'detail-error-1440');
    state.detailMode = 'success'; await p.getByRole('button', { name: 'ลองอีกครั้ง', exact: true }).click(); await ready(p);
    state.reviewsMode = 'error'; await p.reload({ waitUntil: 'networkidle' }); await ready(p);
    await reviews(p).getByRole('alert').waitFor(); assert.equal(await visit(p).getByRole('button', { name: 'บันทึกร้านโปรด', exact: true }).isVisible(), true); await shot(reviews(p), 'reviews-error-1440');
    state.reviewsMode = 'success'; await reviews(p).getByRole('button', { name: 'ลองอีกครั้ง', exact: true }).click(); await p.locator('.review-form').waitFor();
    state.favoritesMode = 'error'; await p.reload({ waitUntil: 'networkidle' }); await ready(p); await visit(p).getByRole('alert').waitFor();
    assert.equal(await p.locator('.review-form').isVisible(), true); state.favoritesMode = 'success'; await visit(p).getByRole('button', { name: 'ลองอีกครั้ง', exact: true }).click(); await visit(p).getByRole('button', { name: 'บันทึกร้านโปรด', exact: true }).waitFor();
    state.noCoordinates = true; state.brokenImage = true; state.reviews = []; await p.setViewportSize({ width: 375, height: 1000 }); await p.reload({ waitUntil: 'networkidle' }); await ready(p);
    assert.equal(await visit(p).getByRole('link', { name: /ดูตำแหน่งบนแผนที่/ }).count(), 0);
    await reviews(p).getByRole('heading', { name: 'เป็นคนแรกที่รีวิวร้านนี้', level: 3 }).waitFor();
    await p.waitForFunction(() => { const img = document.querySelector('.detail-image'); return img.getAttribute('src') === '/images/food-rice.svg' && img.complete && img.naturalWidth > 0; });
    await shot(visit(p), 'no-map-empty-375');
    state.longText = true; state.brokenImage = false; state.reviews = [{ ...seedReviews()[0], member: { ...seedReviews()[0].member, displayName: 'นักชิมผู้ชื่นชอบอาหาร'.repeat(25) }, text: 'เรื่องราวของรสชาติ'.repeat(60) + 'A'.repeat(200) }];
    await p.reload({ waitUntil: 'networkidle' }); await ready(p);
    for (const width of [320, 375, 768, 1024, 1440]) { await p.setViewportSize({ width, height: 1000 }); assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'long content overflow at' + width); }
    state.detailMode = '404'; await p.reload({ waitUntil: 'networkidle' }); await p.getByRole('heading', { name: 'ไม่พบร้านอาหารนี้' }).waitFor();
    assert.equal(await p.getByRole('link', { name: 'กลับไปค้นหาร้าน' }).getAttribute('href'), '/restaurants'); await shot(p.locator('.detail-content'), 'not-found-1440');
    result.checks.push('loading/detail404/error/retry;independent review/favorite errors;empty/unrated/no-map/broken-image;long text5widths passed'); save(); await ctx.close();

    console.log('Checking real read-only API and route isolation');
    const live = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), lp = await live.newPage(); track(lp);
    const writes = []; await live.route('**/api/**', route => { if (route.request().method() !== 'GET') { writes.push(route.request().method()); return route.abort(); } return route.continue(); });
    const listResponse = lp.waitForResponse(r => new URL(r.url()).pathname === '/api/restaurants', { timeout: 90000 }); await lp.goto(base + '/restaurants', { waitUntil: 'domcontentloaded' });
    const list = await (await listResponse).json(), id = list.items[0].id;
    const detailResponse = lp.waitForResponse(r => new URL(r.url()).pathname === '/api/restaurants/' + id, { timeout: 90000 }); await lp.goto(base + '/restaurants/' + id, { waitUntil: 'domcontentloaded' });
    const response = await detailResponse, data = await response.json(); assert.equal(response.status(), 200); await ready(lp);
    assert.equal(await lp.locator('.detail-heading h1').innerText(), data.name); assert.equal(await lp.locator('.detail-image').getAttribute('src'), data.imageUrl || '/images/food-rice.svg');
    await lp.screenshot({ path: path.join(__dirname, 'live-detail-1440.jpg'), type: 'jpeg', quality: 82 });
    await lp.setViewportSize({ width: 375, height: 1000 }); await lp.screenshot({ path: path.join(__dirname, 'live-detail-375.jpg'), type: 'jpeg', quality: 82 });
    await lp.setViewportSize({ width: 1440, height: 1000 }); await lp.getByRole('navigation', { name: 'เมนูหลัก', exact: true }).getByRole('link', { name: 'ค้นหาร้านอาหาร', exact: true }).click();
    await lp.locator('.restaurant-card').first().waitFor(); assert.equal(await lp.locator('.restaurant-card').first().evaluate(el => getComputedStyle(el).borderTopLeftRadius), '18px');
    await lp.getByRole('navigation', { name: 'เมนูหลัก', exact: true }).getByRole('link', { name: 'หน้าแรก', exact: true }).click(); await lp.locator('.home-page').waitFor();
    assert.equal(await lp.locator('.home-hero').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 2);
    await lp.locator('.layout-login-link').click(); await lp.locator('#login-email').waitFor(); assert.equal(await lp.locator('#login-email').evaluate(el => getComputedStyle(el).fontSize), '16px');
    assert.equal(writes.length, 0); result.live = { status: response.status(), restaurantId: id, name: data.name, writes, source: 'local UI -> unchanged proxy -> Render; no API response fixtures' };
    result.checks.push('real detail GET200 and retained image/name;Search/Home/Login style isolation passed'); await live.close();
    assert.equal(result.errors.length, 0); result.status = 'passed'; save(); console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    result.status = 'failed'; result.failure = error.stack;
    if (activePage && !activePage.isClosed()) result.failureDOM = await activePage.evaluate(() => { const t = document.querySelector('#review-text'); return { title: document.querySelector('h1')?.textContent, formPresent: Boolean(document.querySelector('.review-form')), textareaValue: t?.value, labelText: t?.labels?.[0]?.textContent, formText: document.querySelector('.review-form')?.textContent }; });
    save(); throw error;
  }
  finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
