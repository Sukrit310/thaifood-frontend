// UI-only contract fixtures. Every API request is intercepted; never changes live members.
// THAIFOOD_QA_BASE_URL=http://127.0.0.1:3100 node docs/qa/admin-member-roles/check.cjs
process.env.THAIFOOD_QA_BASE_URL ||= 'http://127.0.0.1:3100';
const q = require('../final-acceptance/support.cjs');
const { assert, fs, path } = q;
const AxeBuilder = require(path.join(q.root, 'thaifood/node_modules/.cache/final-qa-tools/node_modules/@axe-core/playwright')).default;
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(q.base).hostname), 'Run this fixture test against the local preview only');
const actor = { id: 8, displayName: 'ผู้ดูแลทดสอบ UI', email: 'admin@example.invalid', role: 'admin' };
const member = { id: 7, displayName: 'สมาชิกทดสอบสิทธิ์', email: 'member@example.invalid', role: 'member' };
const other = { id: 9, displayName: 'ผู้ดูแลอีกบัญชี', email: 'other@example.invalid', role: 'admin' };
const long = { id: 10, displayName: 'สมาชิกทดสอบชื่อภาษาไทยที่ยาวเพื่อยืนยันว่ารายชื่อและหน้าต่างเปลี่ยนสิทธิ์ยังอ่านได้ครบถ้วน', email: 'long-address-for-testing-table-wrapping-and-keyboard-navigation@example.invalid', role: 'member' };
const report = { status: 'running', base: q.base, source: 'isolated UI contract fixtures; no production data mutations', axeScope: '.admin-content (member directory and dialog)', cases: [], guards: [], audits: [], requests: [], pageErrors: [], corsErrors: [], unexpectedRequests: [] };
const save = () => fs.writeFileSync(path.join(__dirname, 'results.json'), q.redact(report) + '\n');
const copy = value => JSON.parse(JSON.stringify(value));
function row(p, name) { return p.locator('.admin-members-table tbody tr').filter({ has: p.locator('th', { hasText: name }) }); }
async function audit(p, engine, width, state) {
  const raw = await new AxeBuilder({ page: p }).include('.admin-content').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const r = { violations: raw.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary })) })), incomplete: raw.incomplete.map(v => ({ id: v.id, nodes: v.nodes.length })), passes: raw.passes.length };
  report.audits.push({ engine, width, state, ...r });
  if (r.violations.length) {
    for (const violation of r.violations) for (const node of violation.nodes) node.html = await p.locator(node.target.join(' ')).first().evaluate(el => el.outerHTML);
    console.log(JSON.stringify({ engine, width, state, violations: r.violations }));
  }
  assert.deepEqual(r.violations, [], `Axe violations in ${engine}/${width}/${state}`);
}
async function geometry(p) {
  await p.evaluate(() => document.fonts.ready);
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Viewport overflows horizontally');
}
async function dialogFor(p, name) {
  const trigger = p.getByRole('button', { name: 'เปลี่ยนสิทธิ์ ' + name, exact: true });
  await trigger.focus(); await p.keyboard.press('Enter');
  const dialog = p.getByRole('dialog', { name: 'เปลี่ยนสิทธิ์สมาชิก', exact: true }); await dialog.waitFor();
  assert.ok(await dialog.evaluate(el => el.matches(':modal')));
  assert.ok(await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).evaluate(el => el === document.activeElement));
  return { trigger, dialog };
}
(async () => {
  let browser;
  try {
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      browser = await q.launch(engine); console.log('Checking native role dialog in ' + engine + ' ' + browser.version());
      for (const width of [320, 375, 768, 1024, 1440]) {
        const ctx = await browser.newContext({ viewport: { width, height: 1000 } });
        await ctx.addInitScript(() => localStorage.setItem('thaifood.token', 'role-ui-fixture-only'));
        let directory = copy([member, actor, other, long]), mode = 'success', release, arrived;
        const pendingArrival = new Promise(resolve => { arrived = resolve; });
        const patches = [];
        await ctx.route('**/api/**', async route => {
          const req = route.request(), pathname = new URL(req.url()).pathname;
          if (req.method() === 'GET' && pathname === '/api/me') return route.fulfill({ json: actor });
          if (req.method() === 'GET' && pathname === '/api/admin/members') return route.fulfill({ json: { items: directory } });
          const match = pathname.match(/^\/api\/admin\/members\/(\d+)\/role$/);
          if (req.method() === 'PATCH' && match) {
            assert.equal(req.headers().authorization, 'Bearer role-ui-fixture-only');
            const body = req.postDataJSON(); assert.deepEqual(Object.keys(body), ['role']);
            assert.ok(['member', 'admin'].includes(body.role));
            patches.push({ id: Number(match[1]), role: body.role });
            if (mode === 'pending') {
              const response = await new Promise(resolve => { release = resolve; arrived(); }); release = null;
              return route.fulfill({ status: response.status, json: { error: { code: 'INTERNAL_ERROR', message: 'Fixture failure' } } });
            }
            directory = directory.map(m => m.id === Number(match[1]) ? { ...m, role: body.role } : m);
            return route.fulfill({ json: directory.find(m => m.id === Number(match[1])) });
          }
          report.unexpectedRequests.push({ method: req.method(), path: pathname }); return route.abort();
        });
        const p = await ctx.newPage(); q.track(p, report);
        try {
          await q.open(p, '/admin/members'); await p.getByRole('table').waitFor(); await geometry(p);
          assert.equal(await row(p, actor.displayName).getByRole('button').count(), 0);
          assert.equal(await p.getByRole('button', { name: /^เปลี่ยนสิทธิ์ / }).count(), 3);
          const outside = p.locator('.layout-header a:visible').first();
          await outside.focus(); assert.ok(await outside.evaluate(el => el === document.activeElement));
          await audit(p, engine, width, 'directory');
          if ([375, 1440].includes(width)) await p.screenshot({ path: path.join(__dirname, engine + '-directory-' + width + '.jpg'), type: 'jpeg', quality: 80 });
          let { trigger, dialog } = await dialogFor(p, long.displayName);
          assert.equal(await dialog.getByRole('button', { name: 'ยืนยันการเปลี่ยนสิทธิ์', exact: true }).isDisabled(), true);
          await dialog.getByLabel('สิทธิ์ใหม่').selectOption('admin');
          await p.getByRole('note').filter({ hasText: 'จัดการร้านอาหาร รีวิว และสิทธิ์ของสมาชิก' }).waitFor();
          await geometry(p);
          const bounds = await dialog.boundingBox(); assert.ok(bounds.x >= 0 && bounds.width <= width && bounds.y >= 0 && bounds.height <= 1000);
          assert.equal(await dialog.getByLabel('สิทธิ์ใหม่').evaluate(el => getComputedStyle(el).fontSize), '16px');
          const focusSequence = [];
          for (let n = 0; n < 6; n++) {
            await p.keyboard.press('Tab');
            const focus = await dialog.evaluate(el => ({ within: el.contains(document.activeElement), tag: document.activeElement?.tagName, id: document.activeElement?.id, classes: document.activeElement?.className, documentFocused: document.hasFocus(), modal: el.matches(':modal') }));
            focusSequence.push(focus);
            // Native Tab may reach browser chrome (BODY + document.hasFocus=false).
            // No page control outside the modal may receive focus.
            assert.ok(focus.within || (focus.tag === 'BODY' && !focus.documentFocused && focus.modal), 'Focus escaped into the page outside the native modal');
          }
          assert.equal(await outside.evaluate(el => { el.focus(); return el === document.activeElement; }), false, 'The background must remain inert');
          await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).focus();
          await audit(p, engine, width, 'promotion-dialog');
          if ([375, 1440].includes(width)) await p.screenshot({ path: path.join(__dirname, engine + '-dialog-' + width + '.jpg'), type: 'jpeg', quality: 80 });
          await p.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
          assert.ok(await trigger.evaluate(el => el === document.activeElement)); assert.equal(patches.length, 0);
          assert.notEqual(await p.evaluate(() => document.body.style.overflow), 'hidden');
          ({ dialog } = await dialogFor(p, member.displayName)); await dialog.getByLabel('สิทธิ์ใหม่').selectOption('admin'); mode = 'pending';
          await dialog.getByRole('button', { name: 'ยืนยันการเปลี่ยนสิทธิ์', exact: true }).click(); await pendingArrival;
          assert.equal(await dialog.getByRole('button', { name: 'กำลังเปลี่ยนสิทธิ์…', exact: true }).isDisabled(), true);
          assert.equal(await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).isDisabled(), true);
          assert.equal(await dialog.getByLabel('สิทธิ์ใหม่').isDisabled(), true);
          await p.keyboard.press('Escape'); assert.equal(await dialog.isVisible(), true); assert.equal(patches.length, 1);
          assert.equal(await row(p, member.displayName).locator('.admin-member-role').innerText(), 'สมาชิก');
          release({ status: 500 }); const feedback = dialog.getByRole('alert'); await feedback.waitFor();
          assert.ok(await feedback.evaluate(el => el === document.activeElement)); assert.equal(await dialog.getByLabel('สิทธิ์ใหม่').inputValue(), 'admin');
          if (width === 375) await audit(p, engine, width, 'error-dialog');
          mode = 'success'; await dialog.getByRole('button', { name: 'ยืนยันการเปลี่ยนสิทธิ์', exact: true }).click(); await dialog.waitFor({ state: 'detached' });
          await p.getByRole('table').waitFor(); assert.equal(await row(p, member.displayName).locator('.admin-member-role').innerText(), 'ผู้ดูแลระบบ');
          assert.ok(await p.getByRole('heading', { name: 'รายชื่อสมาชิก', exact: true }).evaluate(el => el === document.activeElement));
          ({ dialog } = await dialogFor(p, other.displayName)); await dialog.getByLabel('สิทธิ์ใหม่').selectOption('member');
          await dialog.getByRole('button', { name: 'ยืนยันการเปลี่ยนสิทธิ์', exact: true }).click(); await dialog.waitFor({ state: 'detached' });
          await p.getByRole('table').waitFor(); assert.equal(await row(p, other.displayName).locator('.admin-member-role').innerText(), 'สมาชิก');
          assert.deepEqual(patches, [{ id: member.id, role: 'admin' }, { id: member.id, role: 'admin' }, { id: other.id, role: 'member' }]);
          await geometry(p); report.cases.push({ engine, version: browser.version(), width, passed: true, focusSequence, checks: ['native modal', 'self-row guard', 'unchanged-role guard', 'long content', 'native inert background/Escape/focus', 'pending lock', 'error/no optimistic update', 'retry/promotion/re-fetch', 'demotion/re-fetch'] }); save();
          console.log('PASS ' + engine + ' width ' + width);
        } finally { if (release) release({ status: 500 }); await ctx.close(); }
      }
      for (const role of ['guest', 'member']) {
        const ctx = await browser.newContext();
        if (role === 'member') await ctx.addInitScript(() => localStorage.setItem('thaifood.token', 'member-guard-fixture'));
        await ctx.route('**/api/**', route => {
          if (role === 'member' && new URL(route.request().url()).pathname === '/api/me') return route.fulfill({ json: member });
          report.unexpectedRequests.push({ method: route.request().method(), path: new URL(route.request().url()).pathname }); return route.abort();
        });
        const p = await ctx.newPage(); q.track(p, report); await q.open(p, '/admin/members');
        if (role === 'guest') { await p.locator('#login-email').waitFor(); assert.equal(new URL(p.url()).pathname, '/login'); assert.equal(await p.evaluate(() => history.state.usr.from.pathname), '/admin/members'); }
        else await p.getByRole('heading', { name: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้', exact: true }).waitFor();
        report.guards.push({ engine, role, passed: true }); await ctx.close();
      }
      await browser.close(); browser = null;
    }
    assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.corsErrors, []); assert.deepEqual(report.unexpectedRequests, []);
    report.status = 'passed';
  } catch (error) { report.status = 'failed'; report.failure = q.redact(error.stack); console.error(q.redact(error.stack)); process.exitCode = 1; }
  finally { if (browser) await browser.close(); save(); console.log(JSON.stringify({ status: report.status, cases: report.cases.length, guards: report.guards.length, axeScans: report.audits.length, pageErrors: report.pageErrors.length, corsErrors: report.corsErrors.length, unexpectedRequests: report.unexpectedRequests.length })); }
})();
