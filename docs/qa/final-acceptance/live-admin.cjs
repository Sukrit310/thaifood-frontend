const { randomUUID } = require('node:crypto');
const q = require('./support.cjs');
const { assert, base, protect, redact, save, response, expectResponse, readApi, track, open, login } = q;
const report = { status: 'running', target: base, checks: [], requests: [], pageErrors: [], corsErrors: [], cleanup: {} };
const prefix = '[QA ThaiFood ' + randomUUID().slice(0, 8) + ']';
let browser, p, token, restaurantId, reviewId, favoriteAdded = false, deleted = false, confirmDelete = true, beforeFavorites = [];
function pass(label) { report.checks.push(label); save('live-admin', report); console.log('PASS ' + label); }
async function search(name) { await p.locator('#admin-search').fill(name); await p.locator('#admin-search').press('Enter'); await p.getByRole('link', { name, exact: true }).waitFor(); }
async function createReview(text) {
  await open(p, '/restaurants/' + restaurantId); await p.locator('.review-form').waitFor();
  await p.getByRole('radio', { name: '4 ดาว', exact: true }).check(); await p.locator('#review-text').fill(text);
  const pending = response(p, 'POST', '/api/restaurants/' + restaurantId + '/reviews'); await p.getByRole('button', { name: 'ส่งรีวิว', exact: true }).click();
  const data = await expectResponse(pending, 201); reviewId = data.id; await p.getByText('คุณรีวิวร้านนี้แล้ว สามารถลบรีวิวเดิมก่อนเขียนใหม่ได้', { exact: true }).waitFor();
}
(async () => {
  try {
    const credentials = q.adminCredentials(); assert.ok(credentials.email && credentials.password, 'Set the ignored QA credential file first');
    browser = await q.launch('chromium'); const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); p = await ctx.newPage(); track(p, report);
    p.on('dialog', d => confirmDelete ? d.accept() : d.dismiss());
    const session = await login(p, credentials.email, credentials.password); assert.equal(session.member.role, 'admin'); token = protect(session.token); protect(session.member.displayName);
    report.adminRoleVerified = true; beforeFavorites = (await readApi('/api/favorites', token)).data.items.map(r => r.id).sort((a, b) => a - b);
    await open(p, '/admin/members');
    const members = await readApi('/api/admin/members', token); assert.equal(members.status, 200);
    await p.getByRole('table').waitFor(); assert.equal(await p.locator('.admin-members-table tbody tr').count(), members.data.items.length);
    report.memberDirectoryCount = members.data.items.length;
    pass('Real Admin login/role and protected member directory GET200 match the rendered count; no member records modified');
    await open(p, '/admin/restaurants/new'); await p.locator('#restaurant-name').waitFor();
    const provinceId = await p.locator('#restaurant-province option').nth(1).getAttribute('value'), categoryId = await p.locator('#restaurant-category option').nth(1).getAttribute('value');
    const originalName = prefix + ' ร้านตรวจรับ'; const updatedName = prefix + ' ร้านตรวจรับแก้ไข';
    await p.locator('#restaurant-name').fill(originalName); await p.locator('#restaurant-province').selectOption(provinceId); await p.locator('#restaurant-category').selectOption(categoryId);
    await p.locator('#restaurant-address').fill('ที่อยู่ทดสอบชั่วคราว จะลบหลังตรวจระบบ'); await p.locator('#restaurant-description').fill('ร้าน QA สำหรับตรวจรับระบบ ThaiFood เท่านั้น จะลบออกเมื่อจบการทดสอบ');
    await p.locator('#restaurant-latitude').fill('0'); await p.locator('#restaurant-longitude').fill('0');
    let pending = response(p, 'POST', '/api/admin/restaurants'); await p.getByRole('button', { name: 'บันทึกร้านอาหาร', exact: true }).click(); const created = await expectResponse(pending, 201); restaurantId = created.id; report.createdTestRestaurantId = restaurantId;
    await p.getByRole('heading', { name: 'จัดการร้านอาหาร', exact: true }).waitFor(); await search(originalName);
    const persisted = await readApi('/api/restaurants/' + restaurantId); assert.equal(persisted.status, 200); assert.equal(persisted.data.name, originalName); assert.equal(persisted.data.latitude, 0); assert.equal(persisted.data.longitude, 0);
    pass('UI Admin create POST201 with real foreign-key IDs/zero coordinates persists and appears in restaurant search');
    await p.getByRole('row').filter({ has: p.getByRole('link', { name: originalName, exact: true }) }).getByRole('link', { name: 'แก้ไข', exact: true }).click();
    await p.waitForFunction(name => document.querySelector('#restaurant-name')?.value === name, originalName);
    await p.locator('#restaurant-name').fill(updatedName); await p.locator('#restaurant-address').fill('ที่อยู่ QA หลังแก้ไข'); await p.locator('#restaurant-latitude').fill(''); await p.locator('#restaurant-longitude').fill('');
    pending = response(p, 'PUT', '/api/admin/restaurants/' + restaurantId); await p.getByRole('button', { name: 'บันทึกร้านอาหาร', exact: true }).click(); await expectResponse(pending, 200);
    await p.getByRole('heading', { name: 'จัดการร้านอาหาร', exact: true }).waitFor(); await search(updatedName);
    const changed = await readApi('/api/restaurants/' + restaurantId); assert.equal(changed.data.name, updatedName); assert.equal(changed.data.address, 'ที่อยู่ QA หลังแก้ไข'); assert.equal(changed.data.latitude, 0); assert.equal(changed.data.longitude, 0);
    pass('UI Admin edit PUT200 updates persisted fields and preserves coordinates when omitted');
    await createReview(prefix + ' รีวิวชั่วคราวสำหรับตรวจ Admin moderation');
    await open(p, '/admin/reviews?restaurant=' + restaurantId); await p.getByRole('table', { name: 'รีวิวของร้านที่เลือก' }).waitFor(); assert.equal(await p.locator('#review-restaurant').inputValue(), String(restaurantId));
    const removeReview = p.getByRole('button', { name: 'ลบรีวิวของ ' + session.member.displayName, exact: true })
      .or(p.getByRole('button', { name: 'ลบรีวิว ของ ' + session.member.displayName, exact: true }));
    confirmDelete = false; await removeReview.click(); assert.ok((await readApi('/api/restaurants/' + restaurantId + '/reviews')).data.items.some(r => r.id === reviewId));
    confirmDelete = true; pending = response(p, 'DELETE', '/api/admin/reviews/' + reviewId); await removeReview.click(); await expectResponse(pending, 204); reviewId = null;
    await p.getByRole('heading', { name: 'ร้านนี้ยังไม่มีรีวิว', exact: true }).waitFor(); assert.equal((await readApi('/api/restaurants/' + restaurantId)).data.reviewCount, 0);
    pass('UI Admin review selection, confirmation cancel and real moderation DELETE204 refresh empty state and aggregate');
    await createReview(prefix + ' รีวิวตรวจ cascade จะลบพร้อมร้าน QA');
    await p.getByRole('button', { name: 'บันทึกร้านโปรด', exact: true }).waitFor(); pending = response(p, 'POST', '/api/favorites'); await p.getByRole('button', { name: 'บันทึกร้านโปรด', exact: true }).click(); await expectResponse(pending, 201); favoriteAdded = true;
    await open(p, '/admin/restaurants'); await search(updatedName); confirmDelete = false;
    const removeRestaurant = p.getByRole('button', { name: 'ลบร้าน ' + updatedName, exact: true }); await removeRestaurant.click(); assert.equal((await readApi('/api/restaurants/' + restaurantId)).status, 200);
    confirmDelete = true; pending = response(p, 'DELETE', '/api/admin/restaurants/' + restaurantId); await removeRestaurant.click(); await expectResponse(pending, 204); deleted = true;
    await p.getByRole('heading', { name: 'ยังไม่พบร้านอาหาร', exact: true }).waitFor(); assert.equal((await readApi('/api/restaurants/' + restaurantId)).status, 404);
    assert.equal((await readApi('/api/admin/reviews/' + reviewId, token, 'DELETE')).status, 404); reviewId = null;
    const afterFavorites = (await readApi('/api/favorites', token)).data.items.map(r => r.id).sort((a, b) => a - b); assert.deepEqual(afterFavorites, beforeFavorites); favoriteAdded = false;
    pass('UI restaurant confirmation cancel/delete204 and database cascade remove only QA restaurant/review/favorite; existing favorites unchanged');
    assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.corsErrors, []); report.status = 'passed';
  } catch (e) { report.status = 'failed'; report.failure = redact(e.stack); console.error(redact(e.stack)); }
  finally {
    if (token && reviewId) { const r = await readApi('/api/admin/reviews/' + reviewId, token, 'DELETE').catch(() => null); report.cleanup.reviewFallback = [204, 404].includes(r?.status); }
    if (token && favoriteAdded && restaurantId) { const r = await readApi('/api/favorites/' + restaurantId, token, 'DELETE').catch(() => null); report.cleanup.favoriteFallback = [204, 404].includes(r?.status); }
    if (token && restaurantId && !deleted) { const r = await readApi('/api/admin/restaurants/' + restaurantId, token, 'DELETE').catch(() => null); report.cleanup.restaurantFallback = [204, 404].includes(r?.status); }
    if (restaurantId) report.cleanup.restaurantGone = (await readApi('/api/restaurants/' + restaurantId).catch(() => null))?.status === 404;
    if (token) { const favorites = await readApi('/api/favorites', token).catch(() => null); report.cleanup.existingFavoritesPreserved = favorites?.status === 200 && Array.isArray(favorites.data?.items) && JSON.stringify(favorites.data.items.map(r => r.id).sort((a, b) => a - b)) === JSON.stringify(beforeFavorites); }
    if (browser) await browser.close(); save('live-admin', report); console.log(JSON.stringify({ status: report.status, checks: report.checks.length, requests: report.requests.length, cleanup: report.cleanup }));
    if (report.status !== 'passed') process.exitCode = 1;
  }
})();
