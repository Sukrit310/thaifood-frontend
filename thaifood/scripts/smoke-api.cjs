/* Exercise the actual FE services/transport against Go using Node's real Fetch.
 * Default: read-only. --member-flow creates ONE disposable member (no member
 * deletion endpoint); reviews/favorites created by the probe are removed.
 * Passwords/tokens exist in memory only and are never printed or saved.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const babel = require('@babel/core');
const modulePlugin = require('@babel/plugin-transform-modules-commonjs');
const sourceRoot = path.resolve(__dirname, '../src') + path.sep;
const previousLoader = require.extensions['.js'];
require.extensions['.js'] = (module, filename) => {
  if (!filename.startsWith(sourceRoot)) return previousLoader(module, filename);
  const compiled = babel.transformFileSync(filename, { babelrc: false, configFile: false, plugins: [modulePlugin] });
  module._compile(compiled.code, filename);
};
process.env.REACT_APP_USE_MOCK = 'false';
const storage = new Map();
global.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) };
global.window = new EventTarget();
const { resolveApiConfig } = require('../src/api/config');
const config = resolveApiConfig(process.env);
assert.equal(config.error, '');
const backend = require('../src/api/backend');
const { authService, restaurantService, reviewService, favoriteService, adminService } = require('../src/api/services');
require.extensions['.js'] = previousLoader;
assert.equal(backend.isMockMode, false);
const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const originalFetch = global.fetch;
const requests = [];
global.fetch = async (url, options = {}) => {
  const headers = new Headers(options.headers);
  if (!headers.has('Origin')) headers.set('Origin', origin);
  const response = await originalFetch(url, { ...options, headers, signal: options.signal || AbortSignal.timeout(60000) });
  requests.push({ method: options.method || 'GET', path: new URL(url).pathname, status: response.status });
  return response;
};
const report = { checkedAt: new Date().toISOString(), apiUrl: config.apiUrl, frontendOrigin: origin, transport: 'actual src/api/services.js → backend.js → native fetch → Go', checks: [], requests, memberFlow: false };
function pass(label) { report.checks.push(label); console.log(`PASS ${label}`); }
async function expectStatus(action, status, code) {
  await assert.rejects(action, error => error.status === status && (!code || error.code === code));
}
async function main() {
  const health = await fetch(`${config.apiUrl}/health`);
  assert.equal(health.status, 200); assert.equal((await health.json()).status, 'ok');
  pass('GET /health reaches healthy Go/database');
  const preflight = await fetch(`${config.apiUrl}/api/me`, { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'PATCH', 'Access-Control-Request-Headers': 'authorization,content-type' } });
  assert.ok([200, 204].includes(preflight.status));
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  const allowed = preflight.headers.get('access-control-allow-methods') || '';
  for (const method of ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']) assert.ok(allowed.includes(method));
  pass('CORS preflight permits frontend Origin, Authorization and write methods');
  const blocked = await fetch(`${config.apiUrl}/api/provinces`, { headers: { Origin: 'https://untrusted-frontend.example.invalid' } });
  assert.equal(blocked.status, 403);
  pass('CORS rejects an unapproved Origin');
  const provinces = await restaurantService.provinces();
  assert.equal(provinces.items.length, 77);
  const categories = await restaurantService.categories();
  assert.ok(categories.items.length > 0 && typeof categories.items[0].nameTh === 'string');
  const list = await restaurantService.list({ page: 1, limit: 12 });
  assert.equal(list.page, 1); assert.equal(list.limit, 12); assert.ok(list.total > 0);
  report.data = { provinces: provinces.items.length, categories: categories.items.length, restaurants: list.total };
  pass('Public FE services receive provinces/categories/paginated restaurants');
  const first = list.items[0];
  const detail = await restaurantService.get(first.id);
  assert.equal(detail.id, first.id);
  assert.equal(typeof detail.reviewCount, 'number');
  assert.ok(detail.rating === null || (detail.rating >= 1 && detail.rating <= 5));
  const reviews = await reviewService.list(first.id);
  assert.ok(Array.isArray(reviews.items));
  const filtered = await restaurantService.list({ province: detail.province, category: detail.category, page: 1, limit: 12 });
  assert.ok(filtered.items.length > 0);
  assert.ok(filtered.items.every(item => item.province === detail.province && item.category === detail.category));
  const empty = await restaurantService.list({ q: `missing-${randomUUID()}`, page: 1, limit: 12 });
  assert.equal(empty.total, 0); assert.deepEqual(empty.items, []);
  await expectStatus(() => restaurantService.get(2147483647), 404);
  pass('Thai filters, detail/reviews, empty result and 404 match Contract v2');
  await expectStatus(() => authService.me(), 401);
  backend.setToken('invalid-frontend-smoke-token');
  await expectStatus(() => authService.me(), 401);
  assert.equal(backend.getToken(), null);
  pass('Unauthenticated/invalid-token 401 clears client session');
  if (!process.argv.includes('--member-flow')) return;
  const email = `fe-smoke-${randomUUID()}@example.invalid`;
  const password = `Fe!${randomBytes(20).toString('hex')}`;
  const newPassword = `Fe!${randomBytes(20).toString('hex')}`;
  let createdReview = null;
  let addedFavorite = false;
  const member = await authService.register({ email, password, displayName: 'FE Integration Probe' });
  assert.equal(member.role, 'member'); assert.ok(!('password_hash' in member));
  report.memberFlow = true;
  report.retainedData = 'One disposable member remains because Contract v2 has no member-delete endpoint; its random credentials are discarded.';
  try {
    const login = await authService.login({ email, password });
    backend.setToken(login.token);
    assert.equal((await authService.me()).id, member.id);
    assert.equal((await authService.updateProfile({ displayName: 'ทดสอบเชื่อมต่อ FE 😀' })).displayName, 'ทดสอบเชื่อมต่อ FE 😀');
    pass('Actual Register/Login/Me/Profile services reach Go and persist changes');
    const activeToken = backend.getToken();
    await expectStatus(() => authService.changePassword({ currentPassword: 'WrongPassword123!', newPassword }), 401, 'INVALID_CREDENTIALS');
    assert.equal(backend.getToken(), activeToken);
    assert.equal((await authService.me()).id, member.id);
    assert.equal(await authService.changePassword({ currentPassword: password, newPassword }), null);
    await expectStatus(() => authService.login({ email, password }), 401);
    const nextLogin = await authService.login({ email, password: newPassword });
    backend.setToken(nextLogin.token);
    pass('ChangePassword204 works; wrong current password401 preserves session; new login works');
    await expectStatus(() => adminService.members(), 403);
    assert.ok(backend.getToken());
    pass('Member receives403 from Go admin endpoint without losing session');
    await favoriteService.add(first.id); addedFavorite = true;
    assert.ok((await favoriteService.list()).items.some(item => item.id === first.id));
    assert.equal(await favoriteService.remove(first.id), null); addedFavorite = false;
    assert.ok(!(await favoriteService.list()).items.some(item => item.id === first.id));
    pass('Favorites POST/GET/DELETE204 use actual Go persistence');
    createdReview = await reviewService.create(first.id, { rating: 4, text: 'รีวิวทดสอบการเชื่อมต่อ Frontend จะลบเมื่อทดสอบเสร็จ' });
    assert.equal(createdReview.member.id, member.id);
    await expectStatus(() => reviewService.create(first.id, { rating: 5, text: 'รีวิวซ้ำเพื่อทดสอบสถานะ409ของระบบ' }), 409);
    assert.ok((await reviewService.list(first.id)).items.some(item => item.id === createdReview.id));
    const after = await restaurantService.get(first.id);
    assert.equal(after.reviewCount, detail.reviewCount + 1);
    assert.equal(await reviewService.remove(createdReview.id), null); createdReview = null;
    assert.equal((await restaurantService.get(first.id)).reviewCount, detail.reviewCount);
    pass('Review POST/GET/duplicate409/DELETE204 refreshes aggregate and cleans up');
  } finally {
    if (createdReview) await reviewService.remove(createdReview.id).catch(() => { report.cleanupError = 'Review cleanup failed'; });
    if (addedFavorite) await favoriteService.remove(first.id).catch(() => { report.cleanupError = 'Favorite cleanup failed'; });
    backend.setToken(null);
    storage.clear();
  }
}
main().then(() => {
  report.passed = true;
  const output = process.argv.find(argument => argument.startsWith('--report='));
  if (output) fs.writeFileSync(path.resolve(output.slice('--report='.length)), JSON.stringify(report, null, 2) + '\n');
  console.log(`Completed ${report.checks.length} checks / ${requests.length} HTTP requests. No tokens or passwords saved.`);
}).catch(error => {
  console.error(`FAIL ${error.code || error.name}: ${error.message}`);
  process.exitCode = 1;
}).finally(() => { global.fetch = originalFetch; });
