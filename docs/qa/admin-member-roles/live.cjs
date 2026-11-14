// Production UI -> real Go API. Existing QA accounts only; original roles restored in finally.
// node docs/qa/admin-member-roles/live.cjs --preflight
// node docs/qa/admin-member-roles/live.cjs --run
// Optional ignored .env.qa.local keys: THAIFOOD_QA_MEMBER_EMAIL / THAIFOOD_QA_MEMBER_PASSWORD.
process.env.THAIFOOD_QA_BASE_URL = 'https://thaifood-frontend.vercel.app';
const q = require('../final-acceptance/support.cjs');
const { assert, fs, path } = q;
const capture = process.argv.includes('--capture');
const preflight = process.argv.includes('--preflight') || capture;
assert.ok(preflight || process.argv.includes('--run'), 'Select --preflight or --run explicitly');
const filename = path.join(__dirname, capture ? 'live-capture.json' : preflight ? 'live-preflight.json' : 'live-results.json');
const report = {
  status: 'running', startedAt: new Date().toISOString(), clientTimezone: 'Asia/Bangkok',
  frontend: q.base, backend: q.api, mode: preflight ? 'read-only preflight' : 'existing QA role round trip',
  checks: [], requests: [], pageErrors: [], corsErrors: [], blockedRequests: [],
  roleWrites: [], cleanup: {}, limitations: [], accountsCreated: 0, accountsDeleted: 0,
};
let browser, ctx, page, actor, token, target, originalRoles, mutationWindow = false;
// Report fields contain only IDs, roles, request metadata and already-redacted errors.
// Redacting this whole object would hide public paths/roles when an account is named 'admin'.
const save = () => fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n');
function pass(check, evidence = {}) {
  report.checks.push({ check, ...evidence }); save(); console.log('PASS ' + check);
}
function protectMembers(items) { items.forEach(m => { q.protect(m.email); q.protect(m.displayName); }); }
function roles(items) { return items.map(({ id, role }) => ({ id, role })).sort((a, b) => Number(a.id) - Number(b.id)); }
async function call(method, pathname, jwt, body) {
  const result = await q.readApi(pathname, jwt, method, body);
  report.requests.push({ source: 'independent API', method, path: pathname, status: result.status, ...(result.data?.error?.code ? { code: result.data.error.code } : {}) });
  return result;
}
async function directory() {
  const r = await call('GET', '/api/admin/members', token);
  assert.equal(r.status, 200, 'Admin directory must respond 200');
  assert.ok(Array.isArray(r.data?.items), 'Directory response must contain items');
  protectMembers(r.data.items); return r.data.items;
}
function memberRow(p, member) {
  return p.locator('.admin-members-table tbody tr').filter({ has: p.locator('th', { hasText: member.displayName }) }).filter({ has: p.getByText(member.email, { exact: true }) });
}
async function assertPersisted(role, reload = false) {
  const items = await directory();
  assert.equal(items.find(m => String(m.id) === String(target.id))?.role, role, 'Independent GET must show the saved target role');
  if (reload) { await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('table').waitFor(); }
  await memberRow(page, target).locator('.admin-member-role').filter({ hasText: role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก' }).waitFor();
}
async function screenshot(name) {
  // Playwright's mask overlay is behind a native dialog's top layer. Replace only
  // its visible identity text for the capture, then restore the browser DOM.
  const details = page.locator('.admin-role-details dd');
  const originals = await details.allTextContents();
  try {
    await details.evaluateAll(nodes => nodes.slice(0, 2).forEach(node => { node.textContent = '[ข้อมูลบัญชี QA ปกปิด]'; }));
    await page.screenshot({ path: path.join(__dirname, name + '.jpg'), type: 'jpeg', quality: 80,
      mask: [page.locator('.layout-header'), page.locator('.admin-members-table tbody th'), page.locator('.admin-members-table tbody tr > :nth-child(2)'), page.locator('.admin-feedback')],
    });
  } finally {
    await details.evaluateAll((nodes, values) => nodes.forEach((node, i) => { node.textContent = values[i]; }), originals);
  }
}
async function openDialog() {
  const row = memberRow(page, target); assert.equal(await row.count(), 1, 'Target QA row must be unique');
  await row.getByRole('button', { name: 'เปลี่ยนสิทธิ์ ' + target.displayName, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'เปลี่ยนสิทธิ์สมาชิก', exact: true }); await dialog.waitFor();
  assert.equal(await dialog.locator('dd').nth(0).innerText(), target.displayName, 'Dialog must identify selected QA member');
  assert.equal(await dialog.locator('dd').nth(1).innerText(), target.email, 'Dialog email must match selected QA member');
  assert.ok(await dialog.evaluate(el => el.matches(':modal')), 'Dialog must be native modal');
  return dialog;
}
async function changeThroughUI(role) {
  const dialog = await openDialog();
  await dialog.getByLabel('สิทธิ์ใหม่').selectOption(role);
  if (role === 'admin') await dialog.getByRole('note').filter({ hasText: 'จัดการร้านอาหาร รีวิว และสิทธิ์ของสมาชิก' }).waitFor();
  const pending = q.response(page, 'PATCH', '/api/admin/members/' + target.id + '/role');
  mutationWindow = true; // A failed/timed-out response can still have committed on the server.
  await dialog.getByRole('button', { name: 'ยืนยันการเปลี่ยนสิทธิ์', exact: true }).click();
  const result = await pending;
  assert.equal(new URL(result.url()).origin, q.api, 'Mutation must reach real Go API');
  assert.deepEqual(result.request().postDataJSON(), { role }, 'PATCH body must match the UI selection');
  assert.equal(result.status(), 200, 'Role PATCH must succeed');
  const updated = await result.json(); protectMembers([updated]);
  assert.equal(String(updated.id), String(target.id), 'Response must identify selected QA account');
  assert.equal(updated.role, role, 'Response must contain saved role');
  report.roleWrites.push({ source: 'production UI', id: target.id, role, status: result.status() });
  await dialog.waitFor({ state: 'detached' });
  await page.getByRole('status').filter({ hasText: 'เปลี่ยนสิทธิ์ของ ' }).waitFor();
  await page.getByRole('table').waitFor();
  await assertPersisted(role); // Before a document reload: confirms automatic UI re-fetch.
  await assertPersisted(role, true); // Fresh browser request plus independent persisted read.
  pass(role === 'admin' ? 'UI promotion persists and appears without reload and after reload' : 'UI demotion persists and appears without reload and after reload', { patchStatus: 200, persistedGETStatus: 200 });
}
async function retainedTokenChecks(memberToken, expectedRole) {
  const me = await call('GET', '/api/me', memberToken); assert.equal(me.status, 200); assert.equal(String(me.data.id), String(target.id)); assert.equal(me.data.role, expectedRole);
  const members = await call('GET', '/api/admin/members', memberToken);
  assert.equal(members.status, expectedRole === 'admin' ? 200 : 403);
  if (members.status === 200) { assert.ok(Array.isArray(members.data?.items)); protectMembers(members.data.items); }
  else assert.equal(members.data?.error?.code, 'FORBIDDEN');
  const favorites = await call('GET', '/api/favorites', memberToken); assert.equal(favorites.status, 200);
  pass('Previously issued QA token uses current ' + expectedRole + ' permissions', { me: 200, adminDirectory: members.status, memberEndpoint: favorites.status, relogin: false });
}
(async () => {
  try {
    const credentials = q.adminCredentials(); assert.ok(credentials.email && credentials.password, 'Existing QA Admin credentials are required');
    browser = await q.launch('chromium'); report.browser = { engine: 'chromium', version: browser.version() };
    ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.route('**/api/**', route => {
      const req = route.request(), url = new URL(req.url()), pathname = url.pathname;
      const allowed = url.origin === q.api && (['GET', 'OPTIONS'].includes(req.method()) ||
        (req.method() === 'POST' && pathname === '/api/auth/login') ||
        (!preflight && target && req.method() === 'PATCH' && pathname === '/api/admin/members/' + target.id + '/role' && ['member', 'admin'].includes(req.postDataJSON()?.role)));
      if (allowed) return route.continue();
      report.blockedRequests.push({ method: req.method(), path: pathname }); return route.abort();
    });
    page = await ctx.newPage(); q.track(page, report);
    const session = await q.login(page, credentials.email, credentials.password);
    actor = session.member; protectMembers([actor]); token = q.protect(session.token);
    assert.equal(actor.role, 'admin', 'QA actor must already be Admin'); report.actorId = actor.id;
    const listRequest = q.response(page, 'GET', '/api/admin/members'); await q.open(page, '/admin/members');
    const listResponse = await listRequest; assert.equal(new URL(listResponse.url()).origin, q.api);
    assert.equal(listResponse.status(), 200); assert.equal(await listResponse.headerValue('access-control-allow-origin'), q.base);
    await page.getByRole('table').waitFor();
    const items = await directory(); originalRoles = roles(items);
    report.memberCountBefore = items.length; report.adminCountBefore = items.filter(m => m.role === 'admin').length;
    const requested = process.env.THAIFOOD_QA_TARGET_ID;
    const candidates = items.filter(m => String(m.id) !== String(actor.id) && m.role === 'member' &&
      /^QA(?:\s|$)/i.test(m.displayName) && /@example\.invalid$/i.test(m.email));
    report.existingQACandidates = candidates.map(({ id, role }) => ({ id, role }));
    let memberCredentials;
    const parsed = require(path.join(q.root, 'thaifood/node_modules/dotenv')).parse(fs.readFileSync(path.join(q.root, 'thaifood/.env.qa.local')));
    const rawEmail = q.protect(process.env.THAIFOOD_QA_MEMBER_EMAIL || parsed.THAIFOOD_QA_MEMBER_EMAIL);
    const email = q.protect(rawEmail?.trim().toLowerCase());
    const password = q.protect(process.env.THAIFOOD_QA_MEMBER_PASSWORD || parsed.THAIFOOD_QA_MEMBER_PASSWORD);
    if (email && password) memberCredentials = { email, password };
    target = memberCredentials ? items.find(m => m.email.toLowerCase() === email && (!requested || String(m.id) === String(requested))) : requested ? candidates.find(m => String(m.id) === String(requested)) : candidates.find(m => m.id === 16) || candidates.find(m => m.id === 15) || candidates[0];
    assert.ok(target, 'No existing member matches the supplied QA identity');
    assert.notEqual(String(target.id), String(actor.id)); assert.equal(target.role, 'member');
    report.targetId = target.id; report.originalTargetRole = target.role;
    report.memberCredentialsAvailable = Boolean(memberCredentials);
    let memberToken;
    if (memberCredentials) {
      const login = await call('POST', '/api/auth/login', null, memberCredentials); assert.equal(login.status, 200, 'Supplied QA member credentials must log in successfully');
      protectMembers([login.data.member]); assert.equal(String(login.data.member.id), String(target.id), 'QA credentials must belong to the selected target');
      assert.equal(login.data.member.role, 'member'); memberToken = q.protect(login.data.token);
      report.memberCredentialsVerified = true;
    }
    pass('Production Admin login, real directory, CORS, and existing QA target confirmed', { adminLogin: 200, directory: 200, targetRole: target.role });
    const selfRow = memberRow(page, actor); assert.equal(await selfRow.getByRole('button').count(), 0);
    assert.equal(await selfRow.getByText('บัญชีของคุณ', { exact: true }).count(), 1);
    assert.equal(await page.locator('.admin-members-table tbody tr').count(), items.length);
    pass('Production directory displays current members and protects the signed-in Admin row');
    if (preflight) {
      if (capture) for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 667 }]) {
        await page.setViewportSize(viewport); const dialog = await openDialog();
        await dialog.getByLabel('สิทธิ์ใหม่').selectOption('admin');
        await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).scrollIntoViewIfNeeded();
        await screenshot('live-dialog-' + viewport.width);
        await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
      }
      report.cleanup = { roleWrites: 0, roleStateUnchanged: true }; report.status = 'passed'; return;
    }

    // A guest denied before mutation, using an unchanged role as an extra safeguard.
    let r = await call('PATCH', '/api/admin/members/' + target.id + '/role', null, { role: target.role }); assert.equal(r.status, 401); assert.equal(r.data?.error?.code, 'UNAUTHORIZED');
    r = await call('PATCH', '/api/admin/members/' + target.id + '/role', 'invalid-role-qa-token', { role: target.role }); assert.equal(r.status, 401);
    r = await call('PATCH', '/api/admin/members/' + actor.id + '/role', token, { role: actor.role }); assert.equal(r.status, 403); assert.equal(r.data?.error?.code, 'FORBIDDEN');
    pass('Real API rejects guest, invalid JWT and self-change without changing any role', { guest: 401, invalidJWT: 401, self: 403 });

    if (memberToken) {
      await retainedTokenChecks(memberToken, 'member');
      const denied = await call('PATCH', '/api/admin/members/' + target.id + '/role', memberToken, { role: 'member' }); assert.equal(denied.status, 403);
      pass('Real Member token cannot call role mutation', { status: 403 });
    } else report.limitations.push('Existing QA member passwords were discarded during earlier QA. No member credentials supplied: retained-member-token authorization and Member403 were not verified live.');

    const patchesBeforeCancel = report.requests.filter(r => r.source !== 'independent API' && r.method === 'PATCH').length;
    for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 667 }]) {
      await page.setViewportSize(viewport); const dialog = await openDialog();
      assert.equal(await dialog.getByRole('button', { name: 'ยืนยันการเปลี่ยนสิทธิ์', exact: true }).isDisabled(), true);
      await dialog.getByLabel('สิทธิ์ใหม่').selectOption('admin');
      assert.ok(await dialog.getByRole('button', { name: 'ยืนยันการเปลี่ยนสิทธิ์', exact: true }).isEnabled());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const bounds = await dialog.boundingBox(); assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.width <= viewport.width && bounds.height <= viewport.height, 'Dialog must fit viewport');
      await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).scrollIntoViewIfNeeded();
      const cancelBounds = await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).boundingBox();
      assert.ok(cancelBounds.y >= 0 && cancelBounds.y + cancelBounds.height <= viewport.height, 'Cancel control must remain reachable on short screens');
      await screenshot('live-dialog-' + viewport.width);
      await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
      pass('Real directory/dialog cancel and viewport ' + viewport.width + 'x' + viewport.height, { changedRoles: 0 });
    }
    assert.equal(report.requests.filter(r => r.source !== 'independent API' && r.method === 'PATCH').length, patchesBeforeCancel);
    await assertPersisted(target.role);
    await page.setViewportSize({ width: 1440, height: 900 });
    await changeThroughUI('admin');
    if (memberToken) await retainedTokenChecks(memberToken, 'admin');
    await changeThroughUI('member');
    if (memberToken) await retainedTokenChecks(memberToken, 'member');
    // Idempotent request against the already-restored QA target.
    r = await call('PATCH', '/api/admin/members/' + target.id + '/role', token, { role: target.role });
    assert.equal(r.status, 200); assert.equal(r.data?.role, target.role);
    pass('Real API accepts unchanged role idempotently', { status: 200 });
    assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.corsErrors, []); assert.deepEqual(report.blockedRequests, []);
    report.status = report.limitations.length ? 'passed_with_limitations' : 'passed';
  } catch (error) {
    report.status = 'failed'; report.failure = q.redact(error.stack || String(error)); console.error(report.failure); process.exitCode = 1;
  } finally {
    if (token && target && originalRoles && !preflight) {
      try {
        let current, lastError;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            // Idempotent restoration does not depend on a preliminary GET succeeding.
            if (mutationWindow) {
              const restored = await call('PATCH', '/api/admin/members/' + target.id + '/role', token, { role: target.role });
              assert.equal(restored.status, 200, 'Restoration must succeed');
              assert.equal(restored.data?.role, target.role, 'Restoration response must confirm original role');
              report.roleWrites.push({ source: 'finally restoration', id: target.id, role: target.role, status: restored.status });
            }
            current = await directory();
            assert.equal(current.find(m => String(m.id) === String(target.id))?.role, target.role, 'Independent read must confirm original role');
            break;
          } catch (error) { lastError = error; current = undefined; }
        }
        if (!current) throw lastError;
        const actual = current.find(m => String(m.id) === String(target.id));
        report.cleanup.targetOriginalRoleRestored = actual?.role === target.role;
        report.cleanup.allOriginalRolesPreserved = JSON.stringify(roles(current)) === JSON.stringify(originalRoles);
        report.cleanup.memberCountUnchanged = current.length === originalRoles.length;
        report.cleanup.adminActorStillAdmin = current.find(m => String(m.id) === String(actor.id))?.role === 'admin';
        const me = await call('GET', '/api/me', token); report.cleanup.actorSessionValid = me.status === 200 && me.data?.role === 'admin';
        assert.ok(Object.values(report.cleanup).every(Boolean), 'All restoration checks must succeed');
      } catch (error) { report.status = 'cleanup_unverified'; report.cleanup.failure = q.redact(error.message); console.error('Cleanup could not be confirmed: ' + q.redact(error.message)); process.exitCode = 1; }
    }
    if (browser) await browser.close();
    report.finishedAt = new Date().toISOString(); save();
    console.log(JSON.stringify({ status: report.status, checks: report.checks.length, requests: report.requests.length, targetId: report.targetId, roleWrites: report.roleWrites, cleanup: report.cleanup, limitations: report.limitations }));
  }
})();
