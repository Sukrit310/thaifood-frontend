// Read-only production comparison with isolated authentication/directory fixtures.
const q = require('../final-acceptance/support.cjs');
(async () => {
  const browser = await q.launch('chromium');
  try {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 1000 } });
    await ctx.addInitScript(() => localStorage.setItem('thaifood.token', 'baseline-ui-fixture'));
    const actor = { id: 8, displayName: 'ผู้ดูแลทดสอบ UI', email: 'admin@example.invalid', role: 'admin' };
    await ctx.route('**/api/**', route => {
      q.assert.equal(route.request().method(), 'GET', 'No writes allowed in baseline comparison');
      if (new URL(route.request().url()).pathname === '/api/me') return route.fulfill({ json: actor });
      return route.fulfill({ json: { items: [actor] } });
    });
    const p = await ctx.newPage(); await q.open(p, '/admin/members'); await p.getByRole('table').waitFor();
    const result = await q.audit(p);
    const report = { base: q.base, width: 320, bundle: await p.locator('script[src*="/static/js/main."]').getAttribute('src'), source: 'production with read-only UI fixtures; no real authentication or data writes', menuHTML: await p.locator('.layout-menu-toggle').evaluate(el => el.outerHTML), ...result };
    q.fs.writeFileSync(q.path.join(__dirname, 'baseline-a11y.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ base: report.base, bundle: report.bundle, violations: report.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) }));
    await ctx.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
