const { createProxyMiddleware } = require('http-proxy-middleware');
const { apiUrl } = require('./api/defaults.json');

// CRA development server only. Production browsers call Render directly.
module.exports = function setupProxy(app) {
  if (process.env.REACT_APP_USE_MOCK === 'true' || process.env.REACT_APP_DEV_PROXY === 'false') return;
  const target = (process.env.REACT_APP_API_URL || apiUrl).trim().replace(/\/+$/, '');
  const parsed = new URL(target);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.pathname !== '/' || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('REACT_APP_API_URL must be an HTTP(S) backend origin');
  app.use(createProxyMiddleware(['/api', '/health'], {
    target,
    changeOrigin: true,
    secure: true,
    proxyTimeout: 60000,
    timeout: 65000,
    // The browser has already made a same-origin request to CRA. Go still
    // verifies the Bearer token and role. No browser Origin is forwarded.
    onProxyReq(proxyRequest) { proxyRequest.removeHeader('origin'); },
    onError(_error, _request, response) {
      if (response.headersSent) return;
      response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: { code: 'UPSTREAM_UNAVAILABLE', message: 'เชื่อมต่อ Go API ไม่สำเร็จ กรุณาลองอีกครั้ง' } }));
    },
  }));
};
