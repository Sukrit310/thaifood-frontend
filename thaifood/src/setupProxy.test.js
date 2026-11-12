const { createProxyMiddleware } = require('http-proxy-middleware');
const setupProxy = require('./setupProxy');
jest.mock('http-proxy-middleware', () => ({ createProxyMiddleware: jest.fn(() => 'middleware') }));
const saved = { mode: process.env.REACT_APP_USE_MOCK, proxy: process.env.REACT_APP_DEV_PROXY, url: process.env.REACT_APP_API_URL };
beforeEach(() => { jest.clearAllMocks(); createProxyMiddleware.mockReturnValue('middleware'); process.env.REACT_APP_USE_MOCK = 'false'; delete process.env.REACT_APP_DEV_PROXY; delete process.env.REACT_APP_API_URL; });
afterAll(() => {
  for (const [key, value] of Object.entries({ REACT_APP_USE_MOCK: saved.mode, REACT_APP_DEV_PROXY: saved.proxy, REACT_APP_API_URL: saved.url })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
test('proxies only API/health to verified TLS origin and removes browser Origin without altering Bearer auth', () => {
  const app = { use: jest.fn() }; setupProxy(app);
  const [paths, options] = createProxyMiddleware.mock.calls[0];
  expect(paths).toEqual(['/api', '/health']);
  expect(options).toMatchObject({ target: 'https://thaifood-guide-api-a7c7.onrender.com', changeOrigin: true, secure: true });
  const request = { removeHeader: jest.fn() }; options.onProxyReq(request);
  expect(request.removeHeader).toHaveBeenCalledWith('origin');
  expect(request.removeHeader).toHaveBeenCalledTimes(1);
  const response = { writeHead: jest.fn(), end: jest.fn() };
  options.onError(new Error('network down'), {}, response);
  expect(response.writeHead).toHaveBeenCalledWith(502, expect.any(Object));
  expect(JSON.parse(response.end.mock.calls[0][0])).toMatchObject({ error: { code: 'UPSTREAM_UNAVAILABLE' } });
  expect(app.use).toHaveBeenCalledWith('middleware');
});
test('does not install a proxy for explicitly requested mock/direct mode', () => {
  const app = { use: jest.fn() };
  process.env.REACT_APP_USE_MOCK = 'true'; setupProxy(app);
  process.env.REACT_APP_USE_MOCK = 'false'; process.env.REACT_APP_DEV_PROXY = 'false'; setupProxy(app);
  expect(app.use).not.toHaveBeenCalled();
});
