const q = require('./support.cjs');
const { fs, path, assert, base, redact, save, open, login, track, audit, readApi } = q;
const report = { status: 'running', target: base, browsers: [], viewportChecks: [], accessibility: [], checks: [], pageErrors: [], corsErrors: [], requests: [] };
const widths = [375, 768, 1024, 1440];
let activeBrowser;
async function dimensions(p, route, engine) {
  const metrics = await p.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, h1: document.querySelectorAll('main h1').length,
    fields: [...document.querySelectorAll('main input:not([type="radio"]), main select, main textarea')].filter(el => el.getClientRects().length).map(el => ({ id: el.id, label: el.labels?.length || 0, fontSize: getComputedStyle(el).fontSize, width: el.getBoundingClientRect().width })) }));
  assert.ok(metrics.scrollWidth <= metrics.width, engine + ' overflow on ' + route + ' at' + metrics.width); assert.equal(metrics.h1, 1, route);
  for (const field of metrics.fields) { assert.ok(field.label > 0, route + ' field lacks label: ' + field.id); assert.equal(field.fontSize, '16px'); assert.ok(field.width > 0); }
  report.viewportChecks.push({ engine, route, ...metrics }); save('cross-browser', report);
}
async function inspect(p, route, ready, engine, privatePage = false, displayName) {
  console.log(engine + ': ' + route);
  await open(p, route); await p.locator(ready).first().waitFor({ timeout: 90000 }); await p.evaluate(() => document.fonts.ready);
  for (const width of widths) { await p.setViewportSize({ width, height: 1000 }); await dimensions(p, route, engine); }
  const a = await audit(p); report.accessibility.push({ engine, route, width: 1440, ...a }); save('cross-browser', report);
  // Capture WCAG findings without user HTML or API payloads; investigate any failures before acceptance.
  if (a.violations.length) console.log('AXE ' + engine + ' ' + route + ': ' + a.violations.map(v => v.id).join(','));
  if (!privatePage) {
    const name = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
    let snapshot = redact(await p.locator('body').ariaSnapshot());
    if (displayName) snapshot = snapshot.split(displayName).join('[REDACTED_NAME]');
    fs.writeFileSync(path.join(__dirname, engine + '-' + name + '-aria.txt'), snapshot + '\n');
    if (route === '/' || route === '/admin/restaurants/new') await p.screenshot({ path: path.join(__dirname, engine + '-' + name + '-1440.jpg'), type: 'jpeg', quality: 80, mask: [p.locator('.layout-profile-copy')] });
  }
}
(async () => {
  try {
    const credentials = q.adminCredentials(); assert.ok(credentials.email && credentials.password, 'Set QA admin credentials first');
    const list = await readApi('/api/restaurants?page=1&limit=12'); assert.equal(list.status, 200); const first = list.data.items.find(r => !r.name.startsWith('[QA')); assert.ok(first?.id);
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      console.log('Checking engine ' + engine); activeBrowser = await q.launch(engine); report.browsers.push({ engine, version: activeBrowser.version() });
      const ctx = await activeBrowser.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await ctx.newPage(); track(p, report);
      for (const [route, ready] of [['/', '.restaurant-card'], ['/restaurants', '.restaurant-card'], ['/restaurants/' + first.id, '.detail-heading h1'], ['/login', '#login-email'], ['/register', '#register-name']]) await inspect(p, route, ready, engine);
      const session = await login(p, credentials.email, credentials.password); assert.equal(session.member.role, 'admin');
      for (const [route, ready] of [['/profile', '#profile-name'], ['/change-password', '#current-password'], ['/favorites', '.account-collection-count'], ['/admin', '.admin-stat-value'], ['/admin/restaurants', '.admin-count'], ['/admin/restaurants/new', '#restaurant-name'], ['/admin/restaurants/' + first.id + '/edit', '#restaurant-name'], ['/admin/members', '.admin-count'], ['/admin/reviews?restaurant=' + first.id, '#admin-reviews-heading + .admin-count']]) {
        await inspect(p, route, ready, engine, !['/admin', '/admin/restaurants/new'].includes(route), session.member.displayName);
      }
      await p.setViewportSize({ width: 375, height: 1000 }); await open(p, '/profile'); await p.locator('#profile-name').waitFor();
      const toggle = p.getByRole('button', { name: 'เปิดเมนูหลัก', exact: true }); await toggle.click();
      assert.equal(await p.getByRole('button', { name: 'ปิดเมนูหลัก', exact: true }).getAttribute('aria-expanded'), 'true');
      await p.keyboard.press('Escape'); assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
      await p.locator('.layout-skip-link').focus(); await p.keyboard.press('Enter'); assert.equal(await p.evaluate(() => document.activeElement.id), 'main-content');
      await p.emulateMedia({ reducedMotion: 'reduce' }); assert.equal(await p.locator('#profile-name').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.locator('.layout-header').getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
      await p.waitForFunction(() => location.pathname === '/' && !localStorage.getItem('thaifood.token'));
      report.checks.push(engine + ':14 routes ×4widths; real Admin read-only session, keyboard menu/skip/focus, reduced motion and corrected logout'); save('cross-browser', report);
      await ctx.close(); await activeBrowser.close(); activeBrowser = null;
    }
    assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.corsErrors, []);
    const violations = report.accessibility.reduce((sum, page) => sum + page.violations.length, 0);
    report.status = violations ? 'accessibility_findings' : 'passed'; report.wcagViolationCount = violations; save('cross-browser', report);
    console.log(JSON.stringify({ status: report.status, engines: report.browsers, viewportChecks: report.viewportChecks.length, axePages: report.accessibility.length, violations }));
    if (violations) process.exitCode = 1;
  } catch (e) { report.status = 'failed'; report.failure = redact(e.stack); save('cross-browser', report); console.error(redact(e.stack)); process.exitCode = 1; }
  finally { if (activeBrowser) await activeBrowser.close(); }
})();
