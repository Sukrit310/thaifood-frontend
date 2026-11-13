// Temporary port3100, existing ignored Playwright cache, all API writes intercepted.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const cache = path.join(root, 'thaifood/node_modules/.cache/layout-qa');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(cache, 'browsers');
const npx = path.join(cache, 'npm/_npx');
const { chromium } = require(fs.readdirSync(npx).map(n => path.join(npx, n, 'node_modules/playwright')).find(p => fs.existsSync(p)));
const base = 'http://127.0.0.1:3100';
const widths = [320, 375, 768, 1024, 1440];
const result = { status: 'running', viewports: [], checks: [], fixtureMutations: [], errors: [] };
const save = () => fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(result, null, 2) + '\n');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const food = i => ({ id: 501 + i, name: ['ครัวสายลม', 'ข้าวแกงบ้านเรา', 'ริมทางอร่อย', 'มื้ออุ่นที่เชียงใหม่'][i], province: 'เชียงใหม่', category: 'อาหารเหนือ', address: 'ที่อยู่ร้านตัวอย่างสำหรับทดสอบ', description: 'รายละเอียดร้านสำหรับทดสอบ', imageUrl: '/images/home-editorial/khao-soi-640.webp', rating: 4.5, reviewCount: 2 });
const account = role => ({ id: role === 'admin' ? 901 : 902, displayName: role === 'admin' ? 'ผู้ดูแลสำหรับทดสอบ' : 'สมาชิกสำหรับทดสอบ', email: role + '@example.invalid', role });
let activePage;
const shot = (locator, name) => locator.screenshot({ path: path.join(__dirname, name + '.jpg'), type: 'jpeg', quality: 82 });
const focused = async (p, id) => p.waitForFunction(id => document.activeElement?.id === id, id);
async function fixture(browser, role = 'guest') {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const state = { member: account(role === 'guest' ? 'member' : role), favorites: [0, 1, 2, 3].map(food), favoriteError: false, favoriteDelay: 0, writeError: false, writeDelay: 700, loginError: false, registerError: false, requests: [], mutations: [], brokenImage: false };
  if (role !== 'guest') await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('account-fixture-seeded')) { localStorage.setItem('thaifood.token', 'account-fixture-only'); sessionStorage.setItem('account-fixture-seeded', 'yes'); }
  });
  const fail = (route, message, status = 503, code = 'QA_ERROR') => route.fulfill({ status, json: { error: { code, message } } });
  await ctx.route('**/images/home-editorial/khao-soi-640.webp', route => state.brokenImage ? route.abort() : route.continue());
  await ctx.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    state.requests.push({ method, path: url.pathname });
    if (method !== 'GET') {
      const body = request.postData() ? request.postDataJSON() : null;
      state.mutations.push({ method, path: url.pathname, body });
      result.fixtureMutations.push({ method, path: url.pathname, fields: Object.keys(body || {}), intercepted: true });
      await delay(state.writeDelay);
      if (url.pathname === '/api/auth/login' && method === 'POST') {
        if (state.loginError) return fail(route, 'อีเมลหรือรหัสผ่านไม่ถูกต้องสำหรับทดสอบ', 401, 'INVALID_CREDENTIALS');
        return route.fulfill({ json: { token: 'account-fixture-login', member: state.member } });
      }
      if (url.pathname === '/api/auth/register' && method === 'POST') {
        if (state.registerError) return fail(route, 'อีเมลนี้มีบัญชีแล้วสำหรับทดสอบ', 409);
        return route.fulfill({ status: 201, json: { ...state.member, displayName: body.displayName, email: body.email } });
      }
      if (url.pathname === '/api/me' && method === 'PATCH') {
        assert.deepEqual(Object.keys(body), ['displayName']);
        if (state.writeError) return fail(route, 'บันทึกโปรไฟล์ไม่สำเร็จสำหรับทดสอบ');
        state.member = { ...state.member, ...body }; return route.fulfill({ json: state.member });
      }
      if (url.pathname === '/api/me/password' && method === 'PUT') {
        assert.deepEqual(Object.keys(body), ['currentPassword', 'newPassword']);
        if (state.writeError) return fail(route, 'รหัสผ่านเดิมไม่ถูกต้องสำหรับทดสอบ', 401, 'INVALID_CREDENTIALS');
        return route.fulfill({ status: 204 });
      }
      if (/^\/api\/favorites\/\d+$/.test(url.pathname) && method === 'DELETE') {
        if (state.writeError) return fail(route, 'นำร้านออกไม่สำเร็จสำหรับทดสอบ');
        const id = Number(url.pathname.split('/').at(-1)); state.favorites = state.favorites.filter(r => r.id !== id);
        return route.fulfill({ status: 204 });
      }
      throw new Error('Unexpected intercepted write: ' + method + ' ' + url.pathname);
    }
    let data;
    if (url.pathname === '/api/me') data = state.member;
    else if (url.pathname === '/api/favorites') {
      if (state.favoriteDelay) await delay(state.favoriteDelay);
      if (state.favoriteError) return fail(route, 'โหลดร้านโปรดไม่ได้สำหรับทดสอบ');
      data = { items: state.favorites };
    } else if (url.pathname === '/api/restaurants') data = { items: [food(0)], total: 1, page: 1, limit: Number(url.searchParams.get('limit') || 12) };
    else if (url.pathname === '/api/restaurants/501') data = food(0);
    else if (url.pathname === '/api/restaurants/501/reviews') data = { items: [] };
    else if (url.pathname === '/api/provinces') data = { items: [{ id: 1, nameTh: 'เชียงใหม่' }] };
    else if (url.pathname === '/api/categories') data = { items: [{ id: 1, nameTh: 'อาหารเหนือ' }] };
    else return fail(route, 'Unexpected QA read', 404);
    return route.fulfill({ json: data });
  });
  const p = await ctx.newPage(); activePage = p;
  p.on('pageerror', error => result.errors.push(error.message));
  return { p, ctx, state };
}
async function open(p, route) {
  await p.goto(base + route, { waitUntil: 'networkidle' });
  await p.locator('.account-page h1').waitFor(); await p.evaluate(() => document.fonts.ready);
}
async function layoutMetrics(p, route, role) {
  return p.evaluate(({ route, role }) => {
    const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const story = document.querySelector('.account-auth-story');
    const panel = document.querySelector('.account-auth-panel');
    const grid = document.querySelector('.restaurant-grid');
    const controls = [...document.querySelectorAll('.account-page input, .account-page button, .account-nav a')];
    return { route, role, width: innerWidth, scrollWidth: document.documentElement.scrollWidth, h1Count: document.querySelectorAll('h1').length,
      storyDisplay: story ? getComputedStyle(story).display : null, story: story && box(story), panel: panel && box(panel),
      controls: controls.map(el => ({ tag: el.tagName, id: el.id, ...box(el), fontSize: getComputedStyle(el).fontSize })),
      gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : null,
      gridGap: grid ? getComputedStyle(grid).gap : null,
    };
  }, { route, role });
}
async function checkWidths(p, route, role) {
  for (const width of widths) {
    await p.setViewportSize({ width, height: 1000 });
    const m = await layoutMetrics(p, route, role);
    assert.ok(m.scrollWidth <= width, route + ' overflow at' + width); assert.equal(m.h1Count, 1);
    for (const c of m.controls) {
      assert.ok(c.width > 0 && c.right <= width + 1 && c.x >= 0, route + ' control exceeds viewport');
      assert.ok(c.height >= 44, route + ' control too short');
      if (c.tag === 'INPUT') assert.equal(c.fontSize, '16px');
    }
    if (m.panel) {
      assert.equal(m.storyDisplay, width < 1024 ? 'none' : 'block');
      if (width >= 1024) assert.ok(m.story.right < m.panel.x);
    }
    if (m.gridColumns) { assert.equal(m.gridColumns, width >= 1024 ? 3 : width >= 640 ? 2 : 1); assert.equal(m.gridGap, '24px'); }
    result.viewports.push(m); save();
    if (width === 375 || width === 1440) await p.screenshot({ path: path.join(__dirname, role + '-' + route.slice(1) + '-' + width + '.jpg'), type: 'jpeg', quality: 82, fullPage: true });
  }
}
async function fillLogin(p) {
  await p.getByLabel('อีเมล', { exact: true }).fill('member@example.invalid');
  await p.getByLabel('รหัสผ่าน', { exact: true }).fill(' fixture password ');
}
async function fillRegister(p) {
  await p.getByLabel('ชื่อที่แสดง', { exact: true }).fill(' นักชิมทดสอบ ');
  await p.getByLabel('อีเมล', { exact: true }).fill('new@example.invalid');
  await p.getByLabel('รหัสผ่าน', { exact: true }).fill('กขค');
  await p.getByLabel('ยืนยันรหัสผ่าน', { exact: true }).fill('กขค');
}
async function fillPassword(p) {
  await p.getByLabel('รหัสผ่านเดิม', { exact: true }).fill(' old fixture password ');
  await p.getByLabel('รหัสผ่านใหม่', { exact: true }).fill(' new fixture password ');
  await p.getByLabel('ยืนยันรหัสผ่านใหม่', { exact: true }).fill(' new fixture password ');
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    console.log('Checking all five account pages at five widths');
    for (const role of ['guest', 'member']) {
      const { p, ctx } = await fixture(browser, role);
      for (const route of role === 'guest' ? ['/login', '/register'] : ['/profile', '/change-password', '/favorites']) {
        await open(p, route); await checkWidths(p, route, role);
        if (route === '/profile' || route === '/change-password') {
          const nav = p.getByRole('navigation', { name: 'เมนูบัญชีผู้ใช้' });
          assert.equal(await nav.locator('[aria-current="page"]').getAttribute('href'), route);
        }
      }
      await ctx.close();
    }
    result.checks.push('Five account routes × five widths: no overflow, single h1, input labels/sizing, desktop split/mobile form, shared1/2/3-column grid'); save();

    console.log('Checking login/register return flow and error/pending states');
    {
      const { p, ctx, state } = await fixture(browser);
      await open(p, '/login'); await p.setViewportSize({ width: 375, height: 1000 });
      assert.equal(await p.getByText(/บัญชีทดลองในโหมด Mock/).count(), 0);
      const submit = p.locator('.account-form').getByRole('button', { name: 'เข้าสู่ระบบ', exact: true });
      await submit.click(); await focused(p, 'login-error'); assert.equal(state.mutations.length, 0);
      assert.equal(await p.locator('#login-email').getAttribute('aria-invalid'), 'true');
      await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab');
      await p.getByLabel('อีเมล', { exact: true }).focus();
      assert.equal(await p.locator('#login-email').evaluate(el => getComputedStyle(el).outlineWidth), '3px');
      await fillLogin(p); state.loginError = true; await submit.click();
      await p.getByRole('button', { name: 'กำลังเข้าสู่ระบบ…', exact: true }).waitFor();
      assert.equal(await p.locator('#login-email').isDisabled(), true); assert.equal(await p.locator('#login-password').isDisabled(), true);
      await focused(p, 'login-error'); assert.match(await p.getByRole('alert').innerText(), /ไม่ถูกต้องสำหรับทดสอบ/);
      assert.equal(await p.locator('#login-password').inputValue(), ' fixture password ');
      assert.equal(await p.locator('#login-email').getAttribute('aria-invalid'), null);
      await shot(p.locator('.account-auth-panel'), 'login-error-draft-375');
      assert.equal(state.mutations[0].body.password, ' fixture password ');
      state.loginError = false;
      await p.goto(base + '/favorites?source=detail#saved', { waitUntil: 'networkidle' }); await p.locator('#login-email').waitFor();
      assert.deepEqual(await p.evaluate(() => { const from = history.state.usr.from; return { pathname: from.pathname, search: from.search, hash: from.hash }; }), { pathname: '/favorites', search: '?source=detail', hash: '#saved' });
      await p.locator('.account-switch').getByRole('link', { name: 'สมัครสมาชิก', exact: true }).click(); await p.locator('#register-name').waitFor();
      await fillRegister(p); assert.match(await p.locator('#register-password-hint').innerText(), /^9 \/ 72 ไบต์/);
      state.registerError = true;
      await p.getByRole('button', { name: 'สร้างบัญชี', exact: true }).click();
      await p.getByRole('button', { name: 'กำลังสร้างบัญชี…', exact: true }).waitFor();
      assert.equal(await p.locator('#register-name').isDisabled(), true);
      await focused(p, 'register-error'); assert.equal(await p.locator('#register-password').inputValue(), 'กขค');
      state.registerError = false;
      await p.getByRole('button', { name: 'สร้างบัญชี', exact: true }).click(); await p.locator('#login-email').waitFor();
      await p.getByRole('status').filter({ hasText: 'สร้างบัญชีแล้ว' }).waitFor();
      assert.equal(await p.evaluate(() => history.state.usr.from.search), '?source=detail');
      await fillLogin(p); await p.locator('.account-form').getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
      await p.getByRole('heading', { name: 'ร้านโปรดของคุณ', exact: true }).waitFor();
      assert.equal(new URL(p.url()).pathname + new URL(p.url()).search + new URL(p.url()).hash, '/favorites?source=detail#saved');
      assert.equal(await p.evaluate(() => localStorage.getItem('thaifood.token')), 'account-fixture-login');
      const reg = state.mutations.filter(m => m.path === '/api/auth/register').at(-1);
      assert.deepEqual(reg.body, { displayName: 'นักชิมทดสอบ', email: 'new@example.invalid', password: 'กขค' });
      result.checks.push('Guest protection → Register → Login → complete pathname/search/hash; API error/pending drafts, focused validation, UTF8 bytes, exact payloads'); save(); await ctx.close();
    }

    console.log('Checking profile and password writes and role/long text');
    {
      const { p, ctx, state } = await fixture(browser, 'member'); await open(p, '/profile');
      await p.setViewportSize({ width: 375, height: 1000 });
      assert.equal(await p.locator('#profile-email').getAttribute('readonly'), '');
      await p.getByLabel('ชื่อที่แสดง', { exact: true }).fill(' ชื่อที่แก้ไขใหม่ '); state.writeError = true;
      await p.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง', exact: true }).click();
      await p.getByRole('button', { name: 'กำลังบันทึก…', exact: true }).waitFor(); assert.equal(await p.locator('#profile-name').isDisabled(), true);
      await focused(p, 'profile-error'); assert.equal(await p.locator('#profile-name').inputValue(), ' ชื่อที่แก้ไขใหม่ ');
      state.writeError = false;
      await p.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง', exact: true }).click();
      await p.getByRole('status').filter({ hasText: 'บันทึกโปรไฟล์แล้ว' }).waitFor();
      assert.deepEqual(state.mutations.at(-1).body, { displayName: 'ชื่อที่แก้ไขใหม่' });
      assert.equal(await p.locator('.account-profile-name').innerText(), 'ชื่อที่แก้ไขใหม่');
      await p.locator('#profile-name').fill('แก้ไขต่อ'); assert.equal(await p.locator('.account-form [role="status"]').count(), 0);
      await p.getByRole('navigation', { name: 'เมนูบัญชีผู้ใช้' }).getByRole('link', { name: 'เปลี่ยนรหัสผ่าน', exact: true }).click(); await p.locator('#current-password').waitFor();
      await fillPassword(p); state.writeError = true;
      await p.locator('.account-form').getByRole('button', { name: 'เปลี่ยนรหัสผ่าน', exact: true }).click();
      await p.getByRole('button', { name: 'กำลังบันทึก…', exact: true }).waitFor(); assert.equal(await p.locator('#new-password').isDisabled(), true);
      await focused(p, 'password-error'); assert.equal(await p.locator('#current-password').inputValue(), ' old fixture password ');
      assert.equal(await p.locator('#new-password').inputValue(), ' new fixture password ');
      assert.equal(new URL(p.url()).pathname, '/change-password');
      assert.equal(await p.locator('#new-password').getAttribute('aria-invalid'), null);
      await shot(p.locator('.account-settings-panel'), 'password-error-draft-375'); state.writeError = false;
      await p.locator('.account-form').getByRole('button', { name: 'เปลี่ยนรหัสผ่าน', exact: true }).click();
      await p.getByRole('status').filter({ hasText: 'เปลี่ยนรหัสผ่านแล้ว' }).waitFor();
      assert.deepEqual(state.mutations.at(-1).body, { currentPassword: ' old fixture password ', newPassword: ' new fixture password ' });
      for (const id of ['#current-password', '#new-password', '#confirm-password']) assert.equal(await p.locator(id).inputValue(), '');
      await p.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await p.locator('#new-password').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      state.member.displayName = '😀'.repeat(100); state.member.email = 'long'.repeat(40) + '@example.invalid';
      await open(p, '/profile');
      for (const width of widths) { await p.setViewportSize({ width, height: 1000 }); assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); }
      await p.setViewportSize({ width: 375, height: 1000 }); await shot(p.locator('.account-settings-panel'), 'profile-long-unicode-375');
      assert.equal(await p.locator('.account-avatar').innerText(), '😀');
      result.checks.push('Profile PATCH displayName only, read-only email, role/100-Unicode-name wrapping; Password PUT exact untrimmed fields, failure retains session/draft, success clears, reduced motion'); save(); await ctx.close();
      const admin = await fixture(browser, 'admin'); await open(admin.p, '/profile'); await admin.p.getByText('ผู้ดูแลระบบ', { exact: true }).waitFor();
      await admin.p.setViewportSize({ width: 375, height: 1000 }); assert.ok(await admin.p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await shot(admin.p.locator('.account-settings-panel'), 'admin-profile-375'); result.checks.push('Admin profile retains actual role presentation'); save(); await admin.ctx.close();
    }

    console.log('Checking Favorites loading/error/empty/remove and image fallback/isolation');
    {
      const { p, ctx, state } = await fixture(browser, 'member'); state.favoriteDelay = 1600;
      await p.goto(base + '/favorites', { waitUntil: 'domcontentloaded' }); await p.getByRole('status').filter({ hasText: 'กำลังโหลดร้านโปรด' }).waitFor();
      assert.equal(await p.locator('.account-collection-count').count(), 0);
      await shot(p.locator('.account-loading-grid'), 'favorites-loading-1440'); await p.getByText('4 ร้าน', { exact: true }).waitFor(); state.favoriteDelay = 0;
      state.favoriteError = true; await open(p, '/favorites'); await p.getByRole('alert').waitFor();
      assert.equal(await p.locator('.account-collection-count').count(), 0); await shot(p.locator('.account-favorites-page'), 'favorites-error-1440');
      state.favoriteError = false; await p.getByRole('button', { name: 'ลองอีกครั้ง', exact: true }).click(); await p.getByText('4 ร้าน', { exact: true }).waitFor();
      state.writeError = true;
      const collection = p.getByRole('region', { name: 'ร้านที่บันทึกไว้', exact: true });
      await collection.getByRole('button', { name: 'นำออกจากร้านโปรด', exact: true }).first().click();
      await p.getByRole('button', { name: 'กำลังนำออก…', exact: true }).waitFor();
      assert.equal(await collection.locator('button:enabled').count(), 0);
      await focused(p, 'favorites-error'); assert.equal(await collection.getByRole('article').count(), 4);
      state.writeError = false;
      await collection.getByRole('button', { name: 'นำออกจากร้านโปรด', exact: true }).first().click();
      await p.getByText('3 ร้าน', { exact: true }).waitFor(); await focused(p, 'favorites-collection-heading');
      assert.equal(await p.getByRole('status').innerText(), 'นำร้านออกจากร้านโปรดแล้ว'); assert.equal(state.mutations.at(-1).path, '/api/favorites/501');
      state.favorites = [food(0)]; await open(p, '/favorites'); await p.getByText('1 ร้าน', { exact: true }).waitFor();
      await collection.getByRole('button', { name: 'นำออกจากร้านโปรด', exact: true }).click();
      await p.getByRole('heading', { name: 'เริ่มสะสมร้านอร่อยกัน', exact: true }).waitFor(); await focused(p, 'favorites-collection-heading');
      await p.setViewportSize({ width: 375, height: 1000 }); await shot(p.locator('.account-favorites-page'), 'favorites-empty-375');
      await p.getByRole('link', { name: 'ออกไปค้นหาร้าน', exact: true }).click(); await p.locator('.restaurants-page').waitFor();
      assert.equal(new URL(p.url()).pathname, '/restaurants'); assert.equal(await p.locator('.account-page').count(), 0);
      result.checks.push('Favorites skeleton/real counts/list retry; pending removal locks actions, failure keeps cards, success refreshes count and heading focus, last removal → search CTA; search scope isolation'); save(); await ctx.close();
      const auth = await fixture(browser); auth.state.brokenImage = true; await open(auth.p, '/login');
      await auth.p.waitForFunction(() => { const img = document.querySelector('.account-story-image'); return img.getAttribute('src') === '/images/hero-bowl.svg' && img.complete && img.naturalWidth > 0; });
      assert.equal(await auth.p.locator('.account-story-image').getAttribute('alt'), '');
      await auth.p.locator('#login-email').focus(); await auth.p.keyboard.press('Tab'); assert.equal(await auth.p.evaluate(() => document.activeElement.id), 'login-password');
      await auth.p.keyboard.press('Tab'); assert.equal(await auth.p.evaluate(() => document.activeElement.type), 'submit');
      result.checks.push('Auth food image bounded fallback and decorative alt; keyboard email → password → submit'); save(); await auth.ctx.close();
    }
    assert.deepEqual(result.errors, []);
    result.status = 'passed'; save(); console.log(JSON.stringify({ status: result.status, viewports: result.viewports.length, checks: result.checks.length, interceptedMutations: result.fixtureMutations.length, pageErrors: result.errors.length }));
  } catch (error) {
    result.status = 'failed'; result.failure = error.stack; save();
    if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(__dirname, 'failure.jpg'), type: 'jpeg', quality: 82, fullPage: true }).catch(() => {});
    console.error(error); process.exitCode = 1;
  } finally { await browser.close(); }
})();
