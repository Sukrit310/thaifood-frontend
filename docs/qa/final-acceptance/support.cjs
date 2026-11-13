const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const cache = path.join(root, 'thaifood/node_modules/.cache/layout-qa');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(cache, 'browsers');
const npx = path.join(cache, 'npm/_npx');
const playwright = require(fs.readdirSync(npx).map(n => path.join(npx, n, 'node_modules/playwright')).find(fs.existsSync));
const AxeBuilder = require(path.join(root, 'thaifood/node_modules/.cache/final-qa-tools/node_modules/@axe-core/playwright')).default;
const productionOrigin = 'https://thaifood-frontend.vercel.app';
const base = process.env.THAIFOOD_QA_BASE_URL || productionOrigin;
const api = 'https://thaifood-guide-api-a7c7.onrender.com';
const secrets = new Set();
function protect(value) { if (value) secrets.add(value); return value; }
function redact(value) {
  let text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  for (const secret of secrets) text = text.split(secret).join('[REDACTED]');
  return text;
}
function save(name, report) { fs.writeFileSync(path.join(__dirname, name + '.json'), redact(report) + '\n'); }
function adminCredentials() {
  const filename = path.join(root, 'thaifood/.env.qa.local');
  const parsed = fs.existsSync(filename) ? require(path.join(root, 'thaifood/node_modules/dotenv')).parse(fs.readFileSync(filename)) : {};
  return { email: protect(process.env.THAIFOOD_QA_ADMIN_EMAIL || parsed.THAIFOOD_QA_ADMIN_EMAIL), password: protect(process.env.THAIFOOD_QA_ADMIN_PASSWORD || parsed.THAIFOOD_QA_ADMIN_PASSWORD) };
}
async function launch(engine) { return playwright[engine].launch({ headless: true, ...(engine === 'chromium' ? { args: ['--no-sandbox'] } : {}) }); }
function response(p, method, pathname) { return p.waitForResponse(r => r.request().method() === method && new URL(r.url()).pathname === pathname, { timeout: 90000 }); }
async function expectResponse(promise, status) {
  const r = await promise; const body = r.status() === 204 ? null : await r.json();
  if (body?.token) protect(body.token);
  assert.equal(r.status(), status, 'Unexpected API status for ' + new URL(r.url()).pathname + ': ' + (body?.error?.message || ''));
  return body;
}
async function readApi(pathname, token, method = 'GET', body) {
  const r = await fetch(api + pathname, { method, headers: { Origin: productionOrigin, Accept: 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000) });
  const data = r.status === 204 ? null : await r.json(); if (data?.token) protect(data.token);
  return { status: r.status, data };
}
function track(p, report) {
  p.on('pageerror', error => report.pageErrors.push(redact(error.message)));
  p.on('console', message => { if (message.type() === 'error' && /CORS|Access-Control-Allow-Origin/.test(message.text())) report.corsErrors.push(redact(message.text())); });
  p.on('response', r => {
    if (!new URL(r.url()).pathname.startsWith('/api/')) return;
    const req = r.request(); report.requests.push({ method: req.method(), path: new URL(r.url()).pathname, status: r.status() });
  });
}
async function open(p, route) {
  const r = await p.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 60000 }); assert.ok([200, 304].includes(r.status()), 'Unexpected document status: ' + r.status());
  await p.locator('main h1').waitFor({ timeout: 60000 });
  assert.equal(await p.locator('.layout-demo-banner').count(), 0);
}
async function login(p, email, password) {
  await open(p, '/login'); await p.locator('#login-email').fill(email); await p.locator('#login-password').fill(password);
  const pending = response(p, 'POST', '/api/auth/login'); await p.locator('.account-form button[type="submit"]').click();
  const session = await expectResponse(pending, 200); await p.locator('#login-email').waitFor({ state: 'detached' }); return session;
}
async function audit(p) {
  const result = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return { violations: result.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary })) })), incomplete: result.incomplete.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), passes: result.passes.length };
}
module.exports = { fs, path, assert, root, playwright, base, api, protect, redact, save, adminCredentials, launch, response, expectResponse, readApi, track, open, login, audit };
