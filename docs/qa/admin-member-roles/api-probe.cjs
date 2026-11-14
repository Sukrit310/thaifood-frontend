// No JWT: detects deployed route availability without modifying any account.
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const filename = path.join(__dirname, 'api-probe.json');
  const report = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const { base, path: pathname, method, body } = report.probe;
  const response = await fetch(base + pathname, { method, headers: { Origin: 'https://thaifood-frontend.vercel.app', 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(45000) });
  const payload = await response.json();
  report.recheckedAt = new Date().toISOString();
  report.probe.status = response.status; report.probe.code = payload.error?.code;
  report.probe.allowedOrigin = response.headers.get('access-control-allow-origin');
  report.conclusion = response.status === 401 ? 'The deployed route now rejects guests with401; authenticated role/persistence verification remains to be performed.' : 'The deployed API still returned endpoint-not-found. No production role updates attempted.';
  fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: response.status, code: payload.error?.code, allowedOrigin: report.probe.allowedOrigin, dataChanges: false }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
