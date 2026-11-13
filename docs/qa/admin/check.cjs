// Run against temporary3100. Cached Playwright; all API writes intercepted.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..'), cache = path.join(root, 'thaifood/node_modules/.cache/layout-qa');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(cache, 'browsers');
const npx = path.join(cache, 'npm/_npx');
const { chromium } = require(fs.readdirSync(npx).map(n => path.join(npx, n, 'node_modules/playwright')).find(fs.existsSync));
const base = 'http://127.0.0.1:3100', widths = [320, 375, 768, 1024, 1440];
const result = { status: 'running', viewports: [], checks: [], errors: [], fixtureMutations: [], dialogs: [] };
const save = () => fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(result, null, 2) + '\n');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const member = role => ({ id: role === 'admin' ? 901 : 902, displayName: role === 'admin' ? 'ผู้ดูแลทดสอบ' : 'สมาชิกทดสอบ', email: role + '@example.invalid', role });
const restaurant = i => ({ id: 501 + i, name: ['ครัวสายลม', 'ข้าวแกงบ้านเรา', 'ริมทางอร่อย'][i % 3] + ' ' + (i + 1), province: 'เชียงใหม่', category: 'อาหารเหนือ', address: 'ที่อยู่ร้านสำหรับทดสอบ', description: 'อาหารท้องถิ่นและบรรยากาศสบาย', latitude: 0, longitude: 0, imageUrl: null, rating: 4.5, reviewCount: 2 });
const seedReviews = () => [4, 5].map((rating, i) => ({ id: 71 + i, rating, text: ['อาหารอร่อยและบริการดีมาก อยากกลับมาอีกครั้ง', 'รสชาติท้องถิ่นที่ชอบ บรรยากาศเป็นกันเอง'][i], member: { ...member('member'), id: 21 + i, displayName: ['นักชิมท้องถิ่น', 'คนชอบเดินทาง'][i] }, createdAt: '2026-11-13T09:00:00Z' }));
let activePage;
const shot = (locator, name) => locator.screenshot({ path: path.join(__dirname, name + '.jpg'), type: 'jpeg', quality: 82 });
const focused = (p, id) => p.waitForFunction(id => document.activeElement?.id === id, id);
async function fixture(browser, role = 'admin') {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  if (role !== 'guest') await ctx.addInitScript(() => localStorage.setItem('thaifood.token', 'admin-fixture-only'));
  const state = { restaurants: Array.from({ length: 13 }, (_, i) => restaurant(i)), members: [member('admin'), member('member')], reviews: seedReviews(), errorFor: new Set(), readDelay: 0, writeError: false, writeDelay: 650, confirm: true, missingTotal: false, writes: [], reads: [] };
  const fail = (route, message, status = 503) => route.fulfill({ status, json: { error: { code: 'QA_ERROR', message } } });
  await ctx.route('**/api/**', async route => {
    const req = route.request(), u = new URL(req.url()), method = req.method();
    if (method !== 'GET') {
      assert.equal(role, 'admin'); assert.equal(req.headers().authorization, 'Bearer admin-fixture-only');
      const body = req.postData() ? req.postDataJSON() : null;
      state.writes.push({ method, path: u.pathname, body }); result.fixtureMutations.push({ method, path: u.pathname, fields: Object.keys(body || {}), intercepted: true });
      await pause(state.writeDelay);
      if (state.writeError) return fail(route, 'บันทึกการเปลี่ยนแปลงไม่สำเร็จสำหรับทดสอบ');
      if (u.pathname === '/api/admin/restaurants' && method === 'POST') {
        assert.equal(typeof body.provinceId, 'number'); assert.equal(typeof body.categoryId, 'number');
        const item = { ...restaurant(0), ...body, id: 9001 }; state.restaurants.unshift(item); return route.fulfill({ status: 201, json: item });
      }
      if (/^\/api\/admin\/restaurants\/\d+$/.test(u.pathname)) {
        const id = Number(u.pathname.split('/').at(-1));
        if (method === 'DELETE') { state.restaurants = state.restaurants.filter(r => r.id !== id); return route.fulfill({ status: 204 }); }
        if (method === 'PUT') { const item = state.restaurants.find(r => r.id === id); Object.assign(item, body); return route.fulfill({ json: item }); }
      }
      if (/^\/api\/admin\/reviews\/\d+$/.test(u.pathname) && method === 'DELETE') { state.reviews = state.reviews.filter(r => r.id !== Number(u.pathname.split('/').at(-1))); return route.fulfill({ status: 204 }); }
      throw new Error('Unexpected QA write ' + method + ' ' + u.pathname);
    }
    state.reads.push({ path: u.pathname, query: u.search });
    if (state.readDelay) await pause(state.readDelay);
    if (state.errorFor.has(u.pathname)) return fail(route, 'โหลดข้อมูลไม่สำเร็จสำหรับทดสอบ');
    let data;
    if (u.pathname === '/api/me') data = member(role);
    else if (u.pathname === '/api/admin/members') data = { items: state.members };
    else if (u.pathname === '/api/restaurants') {
      const q = u.searchParams.get('q') || '', page = Number(u.searchParams.get('page') || 1), limit = Number(u.searchParams.get('limit') || 12);
      const filtered = state.restaurants.filter(r => (r.name + r.description).includes(q));
      data = { items: filtered.slice((page - 1) * limit, page * limit), page, limit, ...(!state.missingTotal ? { total: filtered.length } : {}) };
    } else if (/^\/api\/restaurants\/\d+$/.test(u.pathname)) { data = state.restaurants.find(r => r.id === Number(u.pathname.split('/').at(-1))); if (!data) return fail(route, 'ไม่พบร้าน', 404); }
    else if (/^\/api\/restaurants\/\d+\/reviews$/.test(u.pathname)) data = { items: state.reviews };
    else if (u.pathname === '/api/provinces') data = { items: [{ id: 1, nameTh: 'เชียงใหม่' }] };
    else if (u.pathname === '/api/categories') data = { items: [{ id: 2, nameTh: 'อาหารเหนือ' }] };
    else if (u.pathname === '/api/favorites') data = { items: [] };
    else return fail(route, 'Unexpected QA read', 404);
    return route.fulfill({ json: data });
  });
  const p = await ctx.newPage(); activePage = p; p.on('pageerror', e => result.errors.push(e.message));
  p.on('dialog', async d => { result.dialogs.push({ message: d.message(), accepted: state.confirm }); await (state.confirm ? d.accept() : d.dismiss()); });
  return { p, ctx, state };
}
async function open(p, route) { await p.goto(base + route, { waitUntil: 'networkidle' }); await p.locator('.admin-content h1').waitFor(); await p.evaluate(() => document.fonts.ready); }
async function metrics(p, route) {
  return p.evaluate(route => {
    const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const table = document.querySelector('.admin-table');
    return { route, width: innerWidth, scrollWidth: document.documentElement.scrollWidth, h1Count: document.querySelectorAll('h1').length,
      sidebar: rect(document.querySelector('.admin-sidebar')), content: rect(document.querySelector('.admin-content')),
      shellColumns: getComputedStyle(document.querySelector('.admin-shell')).gridTemplateColumns.split(' ').length,
      tableDisplay: table ? getComputedStyle(table).display : null,
      controls: [...document.querySelectorAll('.admin-page .input, .admin-page .btn, .admin-nav a, .admin-page .admin-action')].map(el => ({ tag: el.tagName, ...rect(el), fontSize: getComputedStyle(el).fontSize })),
    };
  }, route);
}
async function checkWidths(p, route) {
  for (const width of widths) {
    await p.setViewportSize({ width, height: 1000 });
    const m = await metrics(p, route); assert.ok(m.scrollWidth <= width, route + ' overflow at' + width); assert.equal(m.h1Count, 1);
    assert.equal(m.shellColumns, width >= 1024 ? 2 : 1);
    if (width >= 1024) assert.ok(m.sidebar.right < m.content.x); else assert.ok(m.sidebar.bottom <= m.content.y);
    if (m.tableDisplay) assert.equal(m.tableDisplay, width < 768 ? 'block' : 'table');
    for (const c of m.controls) {
      assert.ok(c.height >= 44 && c.width >= 44, route + ' target smaller than44×44: ' + c.width + '×' + c.height); assert.ok(c.x >= 0 && c.right <= width + 1, route + ' control overflows');
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(c.tag)) assert.equal(c.fontSize, '16px');
    }
    const table = p.getByRole('table'); if (await table.count()) { assert.ok(await table.getByRole('rowheader').count() > 0); assert.ok(await table.getByRole('columnheader').count() >= 3); }
    result.viewports.push(m); save();
    if (width === 375 || width === 1440) await p.screenshot({ path: path.join(__dirname, route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') + '-' + width + '.jpg'), type: 'jpeg', quality: 82, fullPage: true });
  }
}
async function fillForm(p, name) {
  await p.getByLabel('ชื่อร้าน *', { exact: true }).fill(name); await p.getByLabel('จังหวัด *', { exact: true }).selectOption('1'); await p.getByLabel('ประเภทอาหาร *', { exact: true }).selectOption('2');
  await p.getByLabel('ที่อยู่ *', { exact: true }).fill(' เมืองเชียงใหม่ '); await p.getByLabel('รายละเอียด *', { exact: true }).fill(' อาหารอร่อยท้องถิ่น ');
  await p.getByLabel('ละติจูด', { exact: true }).fill('0'); await p.getByLabel('ลองจิจูด', { exact: true }).fill('0');
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    console.log('Checking six Admin routes × five widths');
    {
      const { p, ctx } = await fixture(browser);
      for (const route of ['/admin', '/admin/restaurants', '/admin/restaurants/new', '/admin/restaurants/501/edit', '/admin/reviews?restaurant=501', '/admin/members']) { await open(p, route); await checkWidths(p, route); }
      result.checks.push('Six routes × five widths: responsive sidebar/navigation/tables/forms, accessible table headers,44px targets,16px inputs, one h1, no overflow'); save(); await ctx.close();
    }
    console.log('Checking role gates');
    for (const role of ['guest', 'member']) {
      const { p, ctx, state } = await fixture(browser, role); await p.goto(base + '/admin/restaurants', { waitUntil: 'networkidle' });
      if (role === 'guest') { await p.locator('#login-email').waitFor(); assert.equal(new URL(p.url()).pathname, '/login'); assert.equal(await p.evaluate(() => history.state.usr.from.pathname), '/admin/restaurants'); }
      else { await p.getByRole('heading', { name: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้', exact: true }).waitFor(); assert.equal(await p.locator('.admin-page').count(), 0); }
      assert.equal(state.reads.some(r => r.path.startsWith('/api/admin/')), false); await ctx.close();
    }
    result.checks.push('Guest → Login with return path; Member403; no unauthorized Admin data requests'); save();
    console.log('Checking loading, errors, retry and truthful KPI counts');
    {
      const { p, ctx, state } = await fixture(browser); state.readDelay = 900;
      await p.goto(base + '/admin', { waitUntil: 'domcontentloaded' }); await p.getByRole('status').filter({ hasText: 'กำลังโหลดภาพรวม' }).waitFor();
      assert.equal(await p.locator('.admin-content h1').innerText(), 'ภาพรวม'); assert.equal(await p.locator('.admin-stat-value').count(), 0);
      await p.getByText('13', { exact: true }).waitFor(); state.readDelay = 0;
      state.errorFor.add('/api/admin/members'); await open(p, '/admin'); await p.getByRole('alert').waitFor(); assert.equal(await p.locator('.admin-stat-value').count(), 0);
      state.errorFor.clear(); await p.getByRole('button', { name: 'ลองอีกครั้ง', exact: true }).click(); await p.getByText('13', { exact: true }).waitFor();
      state.missingTotal = true; await open(p, '/admin'); await p.getByText('ยังไม่ทราบจำนวน', { exact: true }).waitFor(); state.missingTotal = false;
      for (const [route, endpoint] of [['/admin/restaurants', '/api/restaurants'], ['/admin/members', '/api/admin/members'], ['/admin/restaurants/new', '/api/provinces'], ['/admin/reviews?restaurant=501', '/api/restaurants/501/reviews']]) {
        state.errorFor.add(endpoint); await open(p, route); await p.getByRole('alert').waitFor(); assert.equal(await p.locator('.admin-count').count(), 0);
        state.errorFor.clear(); await p.getByRole('button', { name: 'ลองอีกครั้ง', exact: true }).click(); await p.getByRole('alert').waitFor({ state: 'detached' });
      }
      result.checks.push('Loading preserves context, no fake0; overview/list/members/form/reviews errors and retry; missing total has unavailable count'); save(); await ctx.close();
    }
    console.log('Checking intercepted create/edit/delete/search/pagination contracts');
    {
      const { p, ctx, state } = await fixture(browser); await open(p, '/admin/restaurants/new'); await p.setViewportSize({ width: 375, height: 1000 });
      const submit = p.getByRole('button', { name: 'บันทึกร้านอาหาร', exact: true });
      await submit.click(); await focused(p, 'admin-form-error'); await submit.click(); await focused(p, 'admin-form-error'); assert.equal(state.writes.length, 0);
      await fillForm(p, ' ร้านทดสอบใหม่ '); state.writeError = true; await submit.click(); await p.getByRole('button', { name: 'กำลังบันทึก…', exact: true }).waitFor();
      assert.equal(await p.locator('#restaurant-name').isDisabled(), true); assert.equal(await p.locator('#restaurant-province').isDisabled(), true);
      await focused(p, 'admin-form-error'); assert.equal(await p.locator('#restaurant-name').inputValue(), ' ร้านทดสอบใหม่ ');
      await shot(p.locator('.admin-form'), 'form-error-draft-375'); state.writeError = false;
      await submit.click(); await p.getByRole('heading', { name: 'จัดการร้านอาหาร', exact: true }).waitFor();
      const expected = { name: 'ร้านทดสอบใหม่', provinceId: 1, categoryId: 2, address: 'เมืองเชียงใหม่', description: 'อาหารอร่อยท้องถิ่น', imageUrl: null, latitude: 0, longitude: 0 };
      assert.deepEqual(state.writes.at(-1).body, expected);
      let row = p.getByRole('row').filter({ has: p.getByRole('link', { name: 'ร้านทดสอบใหม่', exact: true }) });
      await row.getByRole('link', { name: 'แก้ไข', exact: true }).click(); await p.locator('#restaurant-name').waitFor(); await p.waitForFunction(() => document.querySelector('#restaurant-name').value === 'ร้านทดสอบใหม่');
      await p.getByLabel('ชื่อร้าน *', { exact: true }).fill('ร้านทดสอบแก้ไข'); await p.getByRole('button', { name: 'บันทึกร้านอาหาร', exact: true }).click(); await p.getByRole('link', { name: 'ร้านทดสอบแก้ไข', exact: true }).waitFor();
      assert.equal(state.writes.at(-1).method, 'PUT'); assert.equal(state.writes.at(-1).path, '/api/admin/restaurants/9001'); assert.deepEqual(state.writes.at(-1).body, { ...expected, name: 'ร้านทดสอบแก้ไข' });
      state.confirm = false; const count = state.writes.length; await p.getByRole('button', { name: 'ลบร้าน ร้านทดสอบแก้ไข', exact: true }).click(); assert.equal(state.writes.length, count);
      state.confirm = true; state.writeError = true; await p.getByRole('button', { name: 'ลบร้าน ร้านทดสอบแก้ไข', exact: true }).click(); await focused(p, 'admin-delete-error');
      assert.equal(await p.getByRole('link', { name: 'ร้านทดสอบแก้ไข', exact: true }).count(), 1); state.writeError = false;
      await p.getByRole('button', { name: 'ลบร้าน ร้านทดสอบแก้ไข', exact: true }).click(); await p.getByRole('link', { name: 'ร้านทดสอบแก้ไข', exact: true }).waitFor({ state: 'detached' }); await focused(p, 'admin-restaurants-heading');
      assert.equal(await p.getByRole('status').innerText(), 'ลบร้านอาหารแล้ว');
      state.restaurants = Array.from({ length: 13 }, (_, i) => ({ ...restaurant(i), name: 'ร้านเลื่อนหน้า ' + (i + 1) })); await open(p, '/admin/restaurants');
      await p.getByLabel('ค้นหาร้านอาหาร', { exact: true }).fill('ร้านเลื่อนหน้า'); await p.getByRole('button', { name: 'ค้นหา', exact: true }).click(); await p.getByText('13 ร้าน', { exact: true }).waitFor();
      await p.getByRole('button', { name: 'ถัดไป', exact: true }).click(); await p.getByRole('button', { name: 'ลบร้าน ร้านเลื่อนหน้า 13', exact: true }).waitFor();
      assert.equal(new URL(p.url()).searchParams.get('page'), '2');
      await p.getByRole('button', { name: 'ลบร้าน ร้านเลื่อนหน้า 13', exact: true }).click(); await p.waitForURL(u => u.searchParams.get('page') === '1');
      assert.equal(new URL(p.url()).searchParams.get('q'), 'ร้านเลื่อนหน้า'); await p.getByText('12 ร้าน', { exact: true }).waitFor();
      result.checks.push('Native confirmation cancel/failure/success, repeated validation focus, pending/draft, POST/PUT numeric keys andzero coordinates/nullimage, search/pagination/q preservation, last-page deletion'); save(); await ctx.close();
    }
    console.log('Checking review moderation, long content and empty states');
    {
      const { p, ctx, state } = await fixture(browser); state.restaurants = Array.from({ length: 53 }, (_, i) => restaurant(i));
      await open(p, '/admin/reviews?restaurant=501'); assert.equal(await p.locator('#review-restaurant option').count(), 54);
      assert.ok(state.reads.some(r => r.path === '/api/restaurants' && r.query.includes('page=2') && r.query.includes('limit=50')));
      state.confirm = false; await p.getByRole('button', { name: 'ลบรีวิว ของ นักชิมท้องถิ่น', exact: true }).click(); assert.equal(state.writes.length, 0);
      state.confirm = true; state.writeError = true; await p.getByRole('button', { name: 'ลบรีวิว ของ นักชิมท้องถิ่น', exact: true }).click(); await focused(p, 'admin-review-delete-error');
      assert.equal(await p.getByText(seedReviews()[0].text, { exact: true }).count(), 1); state.writeError = false;
      await p.getByRole('button', { name: 'ลบรีวิว ของ นักชิมท้องถิ่น', exact: true }).click(); await p.getByText('1 รีวิว', { exact: true }).waitFor(); await focused(p, 'admin-reviews-heading');
      await p.getByRole('button', { name: 'ลบรีวิว ของ คนชอบเดินทาง', exact: true }).click(); await p.getByRole('heading', { name: 'ร้านนี้ยังไม่มีรีวิว', exact: true }).waitFor(); await focused(p, 'admin-reviews-heading');
      await p.setViewportSize({ width: 375, height: 1000 }); await shot(p.locator('.admin-content'), 'reviews-empty-375');
      state.reviews = [{ ...seedReviews()[0], member: { ...member('member'), displayName: 'นักชิม'.repeat(30) }, text: 'เรื่องราวอาหารไทย'.repeat(300) + 'A'.repeat(200) }];
      state.members = [{ ...member('admin'), displayName: '😀'.repeat(100), email: 'long'.repeat(40) + '@example.invalid' }];
      state.restaurants = [{ ...restaurant(0), name: 'ชื่อร้านอาหาร'.repeat(35), category: 'ประเภทอาหาร'.repeat(20), province: 'ชื่อจังหวัด'.repeat(20) }];
      for (const route of ['/admin/restaurants', '/admin/members', '/admin/reviews?restaurant=501']) {
        await open(p, route); for (const width of widths) { await p.setViewportSize({ width, height: 1000 }); assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + ' long text overflow'); }
        await p.setViewportSize({ width: 375, height: 1000 }); await p.screenshot({ path: path.join(__dirname, 'long-' + route.replace(/[^a-z0-9]+/gi, '-') + '-375.jpg'), type: 'jpeg', quality: 82 });
      }
      state.members = []; await open(p, '/admin/members'); await p.getByRole('heading', { name: 'ยังไม่มีสมาชิก', exact: true }).waitFor();
      state.restaurants = []; await open(p, '/admin/restaurants'); await p.getByRole('heading', { name: 'ยังไม่พบร้านอาหาร', exact: true }).waitFor();
      await open(p, '/admin/reviews'); await p.getByRole('heading', { name: 'ยังไม่มีร้านอาหาร', exact: true }).waitFor();
      await open(p, '/admin'); await p.getByText('0', { exact: true }).first().waitFor(); assert.equal(await p.getByText('0', { exact: true }).count(), 2);
      await p.getByRole('navigation', { name: 'เมนูผู้ดูแลระบบ' }).getByRole('link', { name: 'ร้านอาหาร', exact: true }).focus();
      assert.equal(await p.evaluate(() => getComputedStyle(document.activeElement).outlineWidth), '3px'); await p.keyboard.press('Enter'); await p.getByRole('heading', { name: 'จัดการร้านอาหาร', exact: true }).waitFor();
      await p.emulateMedia({ reducedMotion: 'reduce' }); assert.equal(await p.locator('.admin-nav a').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await p.goto(base + '/profile', { waitUntil: 'networkidle' }); await p.locator('.account-page').waitFor(); assert.equal(await p.locator('.admin-page').count(), 0);
      result.checks.push('All53 review options from paginated service, review delete cancel/error/success/last-row focus,15 long-content width checks, all empty states and realzero KPI, keyboard/reduced motion/account scope isolation'); save(); await ctx.close();
    }
    assert.deepEqual(result.errors, []); result.status = 'passed'; save(); console.log(JSON.stringify({ status: result.status, viewportCases: result.viewports.length, checks: result.checks.length, fixtureWrites: result.fixtureMutations.length, pageErrors: result.errors.length }));
  } catch (e) { result.status = 'failed'; result.failure = e.stack; save(); if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(__dirname, 'failure.jpg'), type: 'jpeg', quality: 82, fullPage: true }).catch(() => {}); console.error(e); process.exitCode = 1; }
  finally { await browser.close(); }
})();
