// Verify the real Go transport independently of the mock-backed service tests.
const originalMode = process.env.REACT_APP_USE_MOCK;
const originalUrl = process.env.REACT_APP_API_URL;
const originalFetch = global.fetch;
let api;
let services;
const jsonResponse = (status, payload) => ({ status, ok: status >= 200 && status < 300, json: async () => payload });

beforeEach(() => {
  jest.resetModules();
  process.env.REACT_APP_USE_MOCK = 'false';
  process.env.REACT_APP_API_URL = 'https://api.example.test/';
  localStorage.clear();
  global.fetch = jest.fn();
  api = require('./backend');
  services = require('./services');
  api.setToken(null);
});

afterAll(() => {
  if (originalMode === undefined) delete process.env.REACT_APP_USE_MOCK;
  else process.env.REACT_APP_USE_MOCK = originalMode;
  if (originalUrl === undefined) delete process.env.REACT_APP_API_URL;
  else process.env.REACT_APP_API_URL = originalUrl;
  global.fetch = originalFetch;
});

test('fetch sends encoded Thai filters and Bearer authorization to the configured origin', async () => {
  global.fetch.mockResolvedValue(jsonResponse(200, { items: [], page: 2, limit: 12, total: 0 }));
  api.setToken('test-token');
  const result = await services.restaurantService.list({ province: 'เชียงใหม่', category: 'อาหารเหนือ', q: 'ข้าว ซอย', page: 2, limit: 12, omitted: undefined });
  const [url, options] = global.fetch.mock.calls[0];
  expect(new URL(url).origin).toBe('https://api.example.test');
  expect(new URL(url).pathname).toBe('/api/restaurants');
  expect(new URL(url).searchParams.get('province')).toBe('เชียงใหม่');
  expect(new URL(url).searchParams.get('q')).toBe('ข้าว ซอย');
  expect(new URL(url).searchParams.has('omitted')).toBe(false);
  expect(options.headers.Authorization).toBe('Bearer test-token');
  expect(options.method).toBe('GET');
  expect(result).toMatchObject({ page: 2, items: [] });
});

test('204 mutations do not try to parse a JSON body', async () => {
  const response = { status: 204, ok: true, json: jest.fn(() => { throw new Error('Must not parse'); }) };
  global.fetch.mockResolvedValue(response);
  expect(await services.authService.changePassword({ currentPassword: 'OldPassword123', newPassword: 'NewPassword123' })).toBeNull();
  expect(global.fetch).toHaveBeenCalledWith('https://api.example.test/api/me/password', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ currentPassword: 'OldPassword123', newPassword: 'NewPassword123' }) }));
  expect(response.json).not.toHaveBeenCalled();
});

test('401 clears token and publishes expiration while 403 preserves the session', async () => {
  const expired = jest.fn();
  window.addEventListener('thaifood:unauthorized', expired);
  api.setToken('expired-token');
  global.fetch.mockResolvedValueOnce(jsonResponse(401, { error: { code: 'TOKEN_EXPIRED', message: 'หมดอายุ' } }));
  await expect(api.request('/api/me')).rejects.toMatchObject({ status: 401, code: 'TOKEN_EXPIRED', message: 'หมดอายุ' });
  expect(api.getToken()).toBeNull();
  expect(expired).toHaveBeenCalledTimes(1);
  api.setToken('member-token');
  global.fetch.mockResolvedValueOnce(jsonResponse(403, { error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์' } }));
  await expect(services.adminService.members()).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  expect(api.getToken()).toBe('member-token');
  expect(expired).toHaveBeenCalledTimes(1);
  window.removeEventListener('thaifood:unauthorized', expired);
});

test('network failures stay errors and never substitute mock data', async () => {
  global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
  await expect(services.restaurantService.list()).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  expect(api.isMockMode).toBe(false);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('aborted requests preserve AbortError for callers', async () => {
  const abortError = new DOMException('Aborted', 'AbortError');
  global.fetch.mockRejectedValue(abortError);
  const controller = new AbortController();
  await expect(api.request('/api/restaurants', { signal: controller.signal })).rejects.toBe(abortError);
  expect(global.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ signal: controller.signal }));
});

test('non JSON successful responses become useful invalid-response errors', async () => {
  global.fetch.mockResolvedValue({ status: 200, ok: true, json: async () => { throw new SyntaxError('bad JSON'); } });
  await expect(api.request('/api/restaurants')).rejects.toMatchObject({ status: 502, code: 'INVALID_RESPONSE' });
});

test('invalid backend origin fails clearly without calling fetch', async () => {
  process.env.REACT_APP_API_URL = 'https://github.com/Sukrit310/thaifood-backend';
  jest.resetModules();
  const unconfigured = require('./backend');
  await expect(unconfigured.request('/api/restaurants')).rejects.toMatchObject({ code: 'CONFIGURATION_ERROR' });
  expect(global.fetch).not.toHaveBeenCalled();
});

function deferredResponse() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  global.fetch.mockReturnValueOnce(promise);
  return resolve;
}

test('a delayed 401 from an older token cannot invalidate a newer session', async () => {
  const expired = jest.fn();
  window.addEventListener('thaifood:unauthorized', expired);
  try {
    api.setToken('session-A');
    const resolve = deferredResponse();
    const pending = api.request('/api/me');
    api.setToken('session-B');
    resolve(jsonResponse(401, { error: { code: 'TOKEN_EXPIRED', message: 'หมดอายุ' } }));
    await expect(pending).rejects.toMatchObject({ status: 401 });
    expect(api.getToken()).toBe('session-B');
    expect(expired).not.toHaveBeenCalled();
  } finally { window.removeEventListener('thaifood:unauthorized', expired); }
});

test('a delayed 401 for the current token still expires that session', async () => {
  const expired = jest.fn();
  window.addEventListener('thaifood:unauthorized', expired);
  try {
    api.setToken('current-session');
    const resolve = deferredResponse();
    const pending = api.request('/api/me');
    resolve(jsonResponse(401, { error: { code: 'TOKEN_EXPIRED', message: 'หมดอายุ' } }));
    await expect(pending).rejects.toMatchObject({ status: 401 });
    expect(api.getToken()).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
  } finally { window.removeEventListener('thaifood:unauthorized', expired); }
});

test('a no-token login 401 cannot remove a session established while login was pending', async () => {
  const expired = jest.fn();
  window.addEventListener('thaifood:unauthorized', expired);
  try {
    const resolve = deferredResponse();
    const pending = services.authService.login({ email: 'wrong@example.com', password: 'WrongPassword123' });
    api.setToken('new-session');
    resolve(jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: 'รหัสผ่านไม่ถูกต้อง' } }));
    await expect(pending).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
    expect(api.getToken()).toBe('new-session');
    expect(expired).not.toHaveBeenCalled();
  } finally { window.removeEventListener('thaifood:unauthorized', expired); }
});

test('public authentication errors preserve an already active session', async () => {
  api.setToken('active-session');
  global.fetch.mockResolvedValue(jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: 'รหัสผ่านไม่ถูกต้อง' } }));
  await expect(services.authService.login({ email: 'wrong@example.com', password: 'WrongPassword123' })).rejects.toMatchObject({ status: 401 });
  expect(api.getToken()).toBe('active-session');
  expect(global.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
});

test('wrong current password 401 preserves a valid session but expired auth still logs out', async () => {
  api.setToken('valid-session');
  global.fetch.mockResolvedValueOnce(jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: 'current password is incorrect' } }));
  await expect(services.authService.changePassword({ currentPassword: 'WrongPassword123', newPassword: 'NewPassword123' })).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  expect(api.getToken()).toBe('valid-session');
  global.fetch.mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'invalid token' } }));
  await expect(services.authService.changePassword({ currentPassword: 'OldPassword123', newPassword: 'NewPassword123' })).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
  expect(api.getToken()).toBeNull();
});

test('development proxy preserves API paths and browser headers while production uses the Go origin', async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    global.fetch.mockResolvedValue(jsonResponse(200, { items: [] }));
    const proxied = require('./backend');
    await proxied.request('/api/provinces');
    expect(global.fetch).toHaveBeenCalledWith('/api/provinces', expect.objectContaining({ method: 'GET' }));
  } finally { process.env.NODE_ENV = oldNodeEnv; }
});
