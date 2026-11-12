import defaults from './defaults.json';
export const DEPLOYED_API_URL = defaults.apiUrl;

export function resolveApiConfig(environment = {}) {
  const useMock = environment.REACT_APP_USE_MOCK === 'true';
  const apiUrl = (environment.REACT_APP_API_URL || DEPLOYED_API_URL).trim().replace(/\/+$/, '');
  let error = '';
  try {
    const url = new URL(apiUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('invalid origin');
  } catch { error = 'REACT_APP_API_URL ต้องเป็น origin ของ Go API เช่น https://thaifood-guide-api-a7c7.onrender.com ไม่ใช่ URL repository'; }
  const useDevProxy = environment.NODE_ENV === 'development' && !useMock && environment.REACT_APP_DEV_PROXY !== 'false';
  return { apiUrl, useMock, useDevProxy, error };
}
