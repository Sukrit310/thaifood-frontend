import { mockFetch } from '../mock/server';

export const isMockMode = process.env.REACT_APP_USE_MOCK !== 'false';
const API_URL = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');
const TOKEN_KEY = 'thaifood.token';
let memoryToken = null;

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function setToken(token) {
  memoryToken = token || null;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* Keep a working in-memory session if storage is disabled. */ }
}

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); }
  catch { return memoryToken; }
}

export async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  const publicAuth = path === '/api/auth/login' || path === '/api/auth/register';
  const token = publicAuth ? null : getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const options = { method, headers, signal };
  if (body !== undefined) options.body = JSON.stringify(body);
  let response;
  try {
    if (!isMockMode && !API_URL) throw new ApiError(0, 'CONFIGURATION_ERROR', 'กรุณาตั้ง REACT_APP_API_URL เป็น URL ของ Go Backend');
    response = await (isMockMode ? mockFetch : fetch)(`${API_URL}${path}`, options);
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof ApiError) throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบเครือข่ายและลองอีกครั้ง');
  }
  if (response.status === 204) return null;
  let payload;
  try { payload = await response.json(); }
  catch {
    if (response.ok) throw new ApiError(502, 'INVALID_RESPONSE', 'เซิร์ฟเวอร์ส่งข้อมูลที่ไม่ถูกต้อง');
  }
  if (!response.ok) {
    // A response only invalidates the session that authorized its request.
    // Older requests and public login failures must not log out a newer user.
    if (response.status === 401 && token && token === getToken()) {
      setToken(null);
      window.dispatchEvent(new Event('thaifood:unauthorized'));
    }
    throw new ApiError(response.status, payload?.error?.code || 'HTTP_ERROR', payload?.error?.message || `เกิดข้อผิดพลาด (${response.status})`);
  }
  return payload;
}
