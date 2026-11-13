const { randomUUID, randomBytes } = require('node:crypto');
const q = require('./support.cjs');
const { assert, base, protect, redact, save, response, expectResponse, readApi, track, open, login } = q;
const report = { status: 'running', target: base, checks: [], requests: [], pageErrors: [], corsErrors: [], cleanup: {}, retainedData: null };
const email = protect('qa-accept-' + randomUUID() + '@example.invalid');
const password = protect('Qa!' + randomBytes(24).toString('hex'));
const nextPassword = protect('Qa!' + randomBytes(24).toString('hex'));
let browser, ctx, p, token, member, restaurant, reviewId = null, favoriteAdded = false;
function pass(label) { report.checks.push(label); save('live-member', report); console.log('PASS ' + label); }
(async () => {
  try {
    browser = await q.launch('chromium'); ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); p = await ctx.newPage(); track(p, report);
    p.on('dialog', dialog => dialog.accept());
    console.log('Checking registration/login through production UI and real Go API');
    const list = await readApi('/api/restaurants?page=1&limit=1'); assert.equal(list.status, 200); restaurant = list.data.items[0]; assert.ok(restaurant?.id);
    await open(p, '/favorites'); await p.locator('#login-email').waitFor();
    await p.locator('.account-switch').getByRole('link', { name: 'สมัครสมาชิก', exact: true }).click(); await p.locator('#register-name').waitFor();
    await p.locator('#register-name').fill('QA ตรวจรับ ThaiFood'); await p.locator('#register-email').fill(email);
    await p.locator('#register-password').fill(password); await p.locator('#register-confirm').fill(password);
    let pending = response(p, 'POST', '/api/auth/register'); await p.getByRole('button', { name: 'สร้างบัญชี', exact: true }).click(); member = await expectResponse(pending, 201);
    assert.equal(member.role, 'member'); report.retainedData = { memberId: member.id, reason: 'One clearly labelled disposable QA member remains; the API has no member-delete endpoint. Random credentials are discarded and never saved.' };
    await p.locator('#login-email').waitFor(); await p.getByRole('status').filter({ hasText: 'สร้างบัญชีแล้ว' }).waitFor();
    await p.locator('#login-email').fill(email); await p.locator('#login-password').fill(password);
    pending = response(p, 'POST', '/api/auth/login'); await p.locator('.account-form button[type="submit"]').click(); const session = await expectResponse(pending, 200); token = protect(session.token);
    await p.getByRole('heading', { name: 'ร้านโปรดของคุณ', exact: true }).waitFor(); assert.equal(new URL(p.url()).pathname, '/favorites');
    const me = await readApi('/api/me', token); assert.equal(me.status, 200); assert.equal(me.data.id, member.id);
    pass('UI Register201 → Login200 → original Favorites destination; authenticated GET Me200 matches created member');
    await open(p, '/profile'); await p.locator('#profile-name').fill('QA ตรวจรับ ThaiFood ผ่านโปรไฟล์');
    pending = response(p, 'PATCH', '/api/me'); await p.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง', exact: true }).click(); const updated = await expectResponse(pending, 200);
    await p.getByRole('status').filter({ hasText: 'บันทึกโปรไฟล์แล้ว' }).waitFor(); assert.equal(updated.displayName, 'QA ตรวจรับ ThaiFood ผ่านโปรไฟล์');
    assert.equal((await readApi('/api/me', token)).data.displayName, updated.displayName); pass('UI Profile PATCH persists the new displayName; email remains read-only');
    await open(p, '/change-password'); await p.locator('#current-password').fill(protect('Wrong!' + randomBytes(12).toString('hex'))); await p.locator('#new-password').fill(nextPassword); await p.locator('#confirm-password').fill(nextPassword);
    pending = response(p, 'PUT', '/api/me/password'); await p.locator('.account-form button[type="submit"]').click(); const wrong = await expectResponse(pending, 401); assert.equal(wrong.error.code, 'INVALID_CREDENTIALS');
    await p.locator('#password-error').waitFor(); assert.equal(new URL(p.url()).pathname, '/change-password'); assert.equal((await readApi('/api/me', token)).status, 200);
    await p.locator('#current-password').fill(password); pending = response(p, 'PUT', '/api/me/password'); await p.locator('.account-form button[type="submit"]').click(); await expectResponse(pending, 204);
    await p.getByRole('status').filter({ hasText: 'เปลี่ยนรหัสผ่านแล้ว' }).waitFor(); assert.equal(await p.locator('#new-password').inputValue(), '');
    pass('UI wrong-current-password401 retains session/draft; corrected password PUT204 clears fields on success');
    await p.getByRole('banner').getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
    await p.waitForFunction(() => location.pathname === '/' && !localStorage.getItem('thaifood.token'));
    const session2 = await login(p, email, nextPassword); token = protect(session2.token); assert.equal(session2.member.id, member.id);
    await open(p, '/admin'); await p.getByRole('heading', { name: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้', exact: true }).waitFor(); assert.equal((await readApi('/api/admin/members', token)).status, 403);
    pass('Logout/new-password login works; real Go403 and UI role gate prevent Member access to Admin');
    await open(p, '/restaurants/' + restaurant.id); await p.locator('.detail-heading h1').waitFor();
    const favoriteButton = p.getByRole('button', { name: 'บันทึกร้านโปรด', exact: true }); await favoriteButton.waitFor();
    pending = response(p, 'POST', '/api/favorites'); await favoriteButton.click(); await expectResponse(pending, 201); favoriteAdded = true;
    await p.getByRole('button', { name: 'บันทึกในร้านโปรดแล้ว', exact: true }).waitFor();
    const favorites = await readApi('/api/favorites', token); assert.ok(favorites.data.items.some(r => r.id === restaurant.id));
    await open(p, '/favorites'); const row = p.getByRole('article').filter({ has: p.getByRole('heading', { name: restaurant.name, exact: true }) }); await row.waitFor();
    pending = response(p, 'DELETE', '/api/favorites/' + restaurant.id); await row.getByRole('button', { name: 'นำออกจากร้านโปรด', exact: true }).click(); await expectResponse(pending, 204); favoriteAdded = false;
    await p.getByRole('heading', { name: 'เริ่มสะสมร้านอร่อยกัน', exact: true }).waitFor(); assert.equal((await readApi('/api/favorites', token)).data.items.some(r => r.id === restaurant.id), false);
    pass('UI Favorite POST201 → persisted collection → DELETE204 → verified empty collection');
    await open(p, '/restaurants/' + restaurant.id); await p.locator('.review-form').waitFor();
    const before = await readApi('/api/restaurants/' + restaurant.id); report.reviewCountBefore = before.data.reviewCount;
    const text = '[QA ตรวจรับ] รีวิวทดสอบระบบ ThaiFood จะลบออกหลังตรวจเสร็จ';
    await p.getByRole('radio', { name: '4 ดาว', exact: true }).check(); await p.locator('#review-text').fill(text);
    pending = response(p, 'POST', '/api/restaurants/' + restaurant.id + '/reviews'); await p.getByRole('button', { name: 'ส่งรีวิว', exact: true }).click(); const created = await expectResponse(pending, 201); reviewId = created.id;
    assert.equal(created.member.id, member.id); await p.getByText('คุณรีวิวร้านนี้แล้ว สามารถลบรีวิวเดิมก่อนเขียนใหม่ได้', { exact: true }).waitFor();
    const after = await readApi('/api/restaurants/' + restaurant.id); assert.equal(after.data.reviewCount, before.data.reviewCount + 1);
    const own = p.locator('.review-item').filter({ hasText: text }); await own.waitFor();
    pending = response(p, 'DELETE', '/api/reviews/' + reviewId); await own.getByRole('button', { name: 'ลบรีวิว', exact: true }).click(); await expectResponse(pending, 204); reviewId = null;
    await p.locator('.review-form').waitFor(); const remaining = await readApi('/api/restaurants/' + restaurant.id + '/reviews'); assert.ok(!remaining.data.items.some(r => r.member.id === member.id));
    const restored = await readApi('/api/restaurants/' + restaurant.id); report.reviewCountAfterCleanup = restored.data.reviewCount; assert.equal(restored.data.reviewCount, before.data.reviewCount);
    pass('UI Review POST201 persists member/rating/text and aggregate; native-confirm DELETE204 removes own review and restores count');
    assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.corsErrors, []); report.status = 'passed';
  } catch (error) { report.status = 'failed'; report.failure = redact(error.stack); console.error(redact(error.stack)); }
  finally {
    if (reviewId && token) { const removed = await readApi('/api/reviews/' + reviewId, token, 'DELETE').catch(() => null); report.cleanup.reviewFallback = removed?.status === 204; }
    if (favoriteAdded && token && restaurant) { const removed = await readApi('/api/favorites/' + restaurant.id, token, 'DELETE').catch(() => null); report.cleanup.favoriteFallback = removed?.status === 204; }
    if (token && member && restaurant) {
      const favoriteList = await readApi('/api/favorites', token).catch(() => null); const reviewList = await readApi('/api/restaurants/' + restaurant.id + '/reviews').catch(() => null);
      report.cleanup.noTestFavorite = favoriteList?.status === 200 && Array.isArray(favoriteList.data?.items) && !favoriteList.data.items.some(r => r.id === restaurant.id);
      report.cleanup.noTestReview = reviewList?.status === 200 && Array.isArray(reviewList.data?.items) && !reviewList.data.items.some(r => r.member.id === member.id);
      report.cleanup.verificationResponses = { favorites: favoriteList?.status ?? null, reviews: reviewList?.status ?? null };
      if (!report.cleanup.noTestFavorite || !report.cleanup.noTestReview) report.status = 'cleanup_unverified';
    }
    if (browser) await browser.close(); save('live-member', report);
    console.log(JSON.stringify({ status: report.status, checks: report.checks.length, requests: report.requests.length, cleanup: report.cleanup, retainedMemberId: member?.id }));
    if (report.status !== 'passed') process.exitCode = 1;
  }
})();
