import { resolveApiConfig, DEPLOYED_API_URL } from './config';
test('uses deployed Go API by default and requires explicit mock opt-in', () => {
  expect(resolveApiConfig({})).toMatchObject({ apiUrl: DEPLOYED_API_URL, useMock: false, error: '' });
  expect(resolveApiConfig({ REACT_APP_USE_MOCK: 'true' }).useMock).toBe(true);
  expect(resolveApiConfig({ REACT_APP_USE_MOCK: 'false' }).useMock).toBe(false);
});
test('normalizes backend origin and rejects repository URLs or credentials', () => {
  expect(resolveApiConfig({ REACT_APP_API_URL: ' https://api.example.com/// ' }).apiUrl).toBe('https://api.example.com');
  for (const apiUrl of ['https://github.com/Sukrit310/thaifood-backend', 'javascript:alert(1)', 'https://user:pass@example.com', 'not a url']) {
    expect(resolveApiConfig({ REACT_APP_API_URL: apiUrl }).error).not.toBe('');
  }
});

test('uses a same-origin proxy only during development so Codespaces works without production CORS changes', () => {
  expect(resolveApiConfig({ NODE_ENV: 'development' }).useDevProxy).toBe(true);
  expect(resolveApiConfig({ NODE_ENV: 'production' }).useDevProxy).toBe(false);
  expect(resolveApiConfig({ NODE_ENV: 'development', REACT_APP_USE_MOCK: 'true' }).useDevProxy).toBe(false);
  expect(resolveApiConfig({ NODE_ENV: 'development', REACT_APP_DEV_PROXY: 'false' }).useDevProxy).toBe(false);
});
