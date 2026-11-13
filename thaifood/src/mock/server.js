import { categories, createSeedData, mockPasswordDigest, provinces } from './data';
import { unicodeLength, validateCurrentPassword, validateDisplayName, validateImageUrl, validateNewPassword } from '../utils/validation';

export const MOCK_STORAGE_KEY = 'thaifood.mock.v2';
let memoryData;
const copy = value => JSON.parse(JSON.stringify(value));
const memberPublic = ({ id, email, displayName, role }) => ({ id, email, displayName, role });

function save(data) {
  memoryData = data;
  try { localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data)); }
  catch { /* Mock still works in memory when browser storage is unavailable. */ }
}

function load() {
  let stored;
  try {
    // Other tabs write sessions and mutations to this shared store. Read the
    // latest snapshot for every request instead of keeping a permanent cache.
    stored = localStorage.getItem(MOCK_STORAGE_KEY);
  } catch {
    // Only inaccessible storage should fall back to this tab's memory snapshot.
    if (!memoryData) memoryData = createSeedData();
    return memoryData;
  }
  try {
    const data = JSON.parse(stored);
    if (data?.version === 2 && ['restaurants', 'members', 'reviews', 'favorites'].every(key => Array.isArray(data[key])) && data.sessions && [data.nextMemberId, data.nextRestaurantId, data.nextReviewId].every(Number.isInteger)) {
      memoryData = data;
      return data;
    }
  } catch { /* Reset an obsolete or corrupt mock store. */ }
  save(createSeedData());
  return memoryData;
}

export function resetMockData() { save(createSeedData()); }

class MockError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new MockError(status, code, message); };
const validation = message => fail(400, 'VALIDATION_ERROR', message);
const notFound = () => fail(404, 'NOT_FOUND', 'ไม่พบข้อมูลที่ต้องการ');

function publicRestaurant(restaurant, data) {
  const reviews = data.reviews.filter(review => review.restaurantId === restaurant.id);
  return { ...restaurant, rating: reviews.length ? Number((reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)) : null, reviewCount: reviews.length };
}
function publicReview(review, data) {
  const member = data.members.find(item => item.id === review.memberId);
  return { id: review.id, restaurantId: review.restaurantId, rating: review.rating, text: review.text, createdAt: review.createdAt, member: { id: member.id, displayName: member.displayName } };
}
function getRestaurant(id, data) {
  const restaurant = data.restaurants.find(item => item.id === Number(id));
  if (!restaurant) notFound();
  return restaurant;
}
function getMember(options, data, admin = false) {
  const authorization = options.headers?.Authorization || options.headers?.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const session = data.sessions[token];
  const member = session && session.expiresAt > Date.now() ? data.members.find(item => item.id === session.memberId) : null;
  if (!member) fail(401, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบอีกครั้ง');
  if (admin && member.role !== 'admin') fail(403, 'FORBIDDEN', 'คุณไม่มีสิทธิ์ใช้งานส่วนผู้ดูแลระบบ');
  return member;
}
function getBody(options) {
  if (options.body === undefined) return {};
  try {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) validation('ข้อมูลต้องเป็น JSON object');
    return body;
  } catch (error) {
    if (error instanceof MockError) throw error;
    validation('ข้อมูล JSON ไม่ถูกต้อง');
  }
}
function requiredString(value, label, min = 1, max = 1000) {
  if (typeof value !== 'string' || unicodeLength(value.trim()) < min || unicodeLength(value.trim()) > max) validation(`${label}ต้องมีความยาว ${min}–${max} ตัวอักษร`);
  return value.trim();
}
function password(value, current = false) {
  if (typeof value !== 'string') validation('กรุณากรอกรหัสผ่าน');
  const error = current ? validateCurrentPassword(value) : validateNewPassword(value);
  if (error) validation(error);
  return value;
}
function displayName(value) {
  if (typeof value !== 'string') validation('กรุณากรอกชื่อที่แสดง');
  const error = validateDisplayName(value);
  if (error) validation(error);
  return value.trim();
}
function restaurantBody(body, previous) {
  const province = body.provinceId === undefined && previous ? provinces.find(item => item.nameTh === previous.province) : provinces.find(item => item.id === body.provinceId);
  const category = body.categoryId === undefined && previous ? categories.find(item => item.nameTh === previous.category) : categories.find(item => item.id === body.categoryId);
  if (!province || !category) validation('กรุณาเลือกจังหวัดและประเภทอาหารที่ถูกต้อง');
  const values = { ...previous, ...body };
  const latitude = values.latitude ?? null;
  const longitude = values.longitude ?? null;
  if (body.latitude !== undefined && (!Number.isFinite(body.latitude) || body.latitude < -90 || body.latitude > 90)) validation('ละติจูดต้องอยู่ระหว่าง -90 ถึง 90');
  if (body.longitude !== undefined && (!Number.isFinite(body.longitude) || body.longitude < -180 || body.longitude > 180)) validation('ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180');
  let imageUrl = previous?.imageUrl ?? null;
  if (body.imageUrl !== undefined && body.imageUrl !== null) {
    if (typeof body.imageUrl !== 'string') validation('URL รูปภาพต้องเป็นข้อความหรือ null');
    const imageError = validateImageUrl(body.imageUrl);
    if (imageError) validation(imageError);
    imageUrl = body.imageUrl.trim() || null;
  } else if (body.imageUrl === null) imageUrl = null;
  return { name: requiredString(values.name, 'ชื่อร้าน', 1, 200), province: province.nameTh, category: category.nameTh, address: requiredString(values.address, 'ที่อยู่', 1, 1000), description: requiredString(values.description, 'รายละเอียด', 1, 5000), latitude, longitude, imageUrl };
}
const response = (status, payload = null) => ({ status, ok: status >= 200 && status < 300, json: async () => copy(payload), text: async () => payload === null ? '' : JSON.stringify(payload) });

function route(url, options, data) {
  const method = (options.method || 'GET').toUpperCase();
  const path = url.pathname.replace(/\/$/, '');
  const body = getBody(options);
  let match;

  if (method === 'GET' && path === '/api/provinces') return response(200, { items: provinces });
  if (method === 'GET' && path === '/api/categories') return response(200, { items: categories });
  if (method === 'GET' && path === '/api/restaurants') {
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 12);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) validation('page ต้องเป็นจำนวนเต็มบวก และ limit ต้องอยู่ระหว่าง 1 ถึง 50');
    const q = (url.searchParams.get('q') || '').trim().toLocaleLowerCase('th');
    const province = url.searchParams.get('province');
    const category = url.searchParams.get('category');
    const filtered = data.restaurants.filter(restaurant => (!province || restaurant.province === province) && (!category || restaurant.category === category) && (!q || [restaurant.name, restaurant.description, restaurant.address].join(' ').toLocaleLowerCase('th').includes(q)));
    return response(200, { items: filtered.slice((page - 1) * limit, page * limit).map(restaurant => publicRestaurant(restaurant, data)), page, limit, total: filtered.length });
  }
  if (method === 'GET' && (match = path.match(/^\/api\/restaurants\/(\d+)$/))) return response(200, publicRestaurant(getRestaurant(match[1], data), data));
  if ((match = path.match(/^\/api\/restaurants\/(\d+)\/reviews$/))) {
    const restaurant = getRestaurant(match[1], data);
    if (method === 'GET') return response(200, { items: data.reviews.filter(review => review.restaurantId === restaurant.id).map(review => publicReview(review, data)) });
    if (method === 'POST') {
      const member = getMember(options, data);
      if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) validation('กรุณาให้คะแนนเป็นจำนวนเต็มตั้งแต่ 1 ถึง 5');
      const text = requiredString(body.text, 'ข้อความรีวิว', 10, 5000);
      if (data.reviews.some(review => review.restaurantId === restaurant.id && review.memberId === member.id)) fail(409, 'DUPLICATE_REVIEW', 'คุณรีวิวร้านนี้แล้ว สามารถลบรีวิวเดิมเพื่อเขียนใหม่ได้');
      const review = { id: data.nextReviewId++, restaurantId: restaurant.id, memberId: member.id, rating: body.rating, text, createdAt: new Date().toISOString() };
      data.reviews.push(review); save(data);
      return response(201, publicReview(review, data));
    }
  }
  if (method === 'POST' && path === '/api/auth/register') {
    if (Object.keys(body).some(key => !['email', 'password', 'displayName'].includes(key))) validation('ข้อมูลสมัครสมาชิกมีฟิลด์ที่ไม่รองรับ');
    const email = requiredString(body.email, 'อีเมล', 3, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) validation('รูปแบบอีเมลไม่ถูกต้อง');
    const memberDisplayName = displayName(body.displayName);
    const passwordDigest = mockPasswordDigest(password(body.password));
    if (data.members.some(member => member.email === email)) fail(409, 'EMAIL_EXISTS', 'อีเมลนี้ถูกใช้งานแล้ว');
    const member = { id: data.nextMemberId++, email, displayName: memberDisplayName, role: 'member', passwordDigest };
    data.members.push(member); save(data);
    return response(201, memberPublic(member));
  }
  if (method === 'POST' && path === '/api/auth/login') {
    password(body.password, true);
    const member = data.members.find(item => item.email === String(body.email || '').trim().toLowerCase() && item.passwordDigest === mockPasswordDigest(body.password || ''));
    if (!member) fail(401, 'INVALID_CREDENTIALS', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    const token = `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${member.id}`;
    data.sessions[token] = { memberId: member.id, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }; save(data);
    return response(200, { token, member: memberPublic(member) });
  }
  if (path === '/api/me') {
    const member = getMember(options, data);
    if (method === 'GET') return response(200, memberPublic(member));
    if (method === 'PATCH') {
      if (Object.keys(body).some(key => key !== 'displayName')) validation('โปรไฟล์แก้ไขได้เฉพาะชื่อที่แสดง');
      member.displayName = displayName(body.displayName); save(data); return response(200, memberPublic(member));
    }
  }
  if (method === 'PUT' && path === '/api/me/password') {
    const member = getMember(options, data);
    const currentPassword = password(body.currentPassword, true);
    const newPassword = password(body.newPassword);
    if (member.passwordDigest !== mockPasswordDigest(currentPassword)) fail(401, 'INVALID_CREDENTIALS', 'รหัสผ่านเดิมไม่ถูกต้อง');
    member.passwordDigest = mockPasswordDigest(newPassword); save(data);
    return response(204);
  }
  if (path === '/api/favorites') {
    const member = getMember(options, data);
    if (method === 'GET') return response(200, { items: data.favorites.filter(favorite => favorite.memberId === member.id).map(favorite => data.restaurants.find(restaurant => restaurant.id === favorite.restaurantId)).filter(Boolean).map(restaurant => publicRestaurant(restaurant, data)) });
    if (method === 'POST') {
      if (!Number.isInteger(body.restaurantId)) validation('restaurantId ต้องเป็นจำนวนเต็ม');
      const restaurant = getRestaurant(body.restaurantId, data);
      if (data.favorites.some(favorite => favorite.memberId === member.id && favorite.restaurantId === restaurant.id)) fail(409, 'DUPLICATE_FAVORITE', 'ร้านนี้อยู่ในรายการโปรดแล้ว');
      data.favorites.push({ memberId: member.id, restaurantId: restaurant.id }); save(data);
      return response(201, { restaurantId: restaurant.id });
    }
  }
  if (method === 'DELETE' && (match = path.match(/^\/api\/favorites\/(\d+)$/))) {
    const member = getMember(options, data);
    data.favorites = data.favorites.filter(favorite => !(favorite.memberId === member.id && favorite.restaurantId === Number(match[1]))); save(data);
    return response(204);
  }
  if (method === 'DELETE' && (match = path.match(/^\/api\/reviews\/(\d+)$/))) {
    const member = getMember(options, data);
    const review = data.reviews.find(item => item.id === Number(match[1]));
    if (!review) notFound();
    if (review.memberId !== member.id && member.role !== 'admin') fail(403, 'FORBIDDEN', 'คุณลบได้เฉพาะรีวิวของตัวเอง');
    data.reviews = data.reviews.filter(item => item.id !== review.id); save(data);
    return response(204);
  }
  if (path.startsWith('/api/admin/')) {
    const actor = getMember(options, data, true);
    if (method === 'GET' && path === '/api/admin/members') return response(200, { items: data.members.map(memberPublic) });
    if (method === 'PATCH' && (match = path.match(/^\/api\/admin\/members\/([^/]+)\/role$/))) {
      let rawId;
      try { rawId = decodeURIComponent(match[1]); } catch { validation('ID ต้องเป็นจำนวนเต็มบวก'); }
      const targetId = rawId.replace(/^\+?0*/, '');
      if (!/^\+?\d+$/.test(rawId) || !targetId || targetId.length > 19 || (targetId.length === 19 && targetId > '9223372036854775807')) validation('ID ต้องเป็นจำนวนเต็มบวกในช่วง int64');
      if (Object.keys(body).join() !== 'role' || !['member', 'admin'].includes(body.role)) validation('กรุณาระบุ role เป็น member หรือ admin เพียงฟิลด์เดียว');
      const target = data.members.find(item => String(item.id) === targetId);
      if (!target) notFound();
      if (target.id === actor.id) fail(403, 'FORBIDDEN', 'ไม่สามารถเปลี่ยนสิทธิ์บัญชีของตัวเองได้');
      if (target.role === body.role) return response(200, memberPublic(target));
      if (target.role === 'admin' && body.role === 'member' && data.members.filter(item => item.role === 'admin').length <= 1) fail(409, 'LAST_ADMIN', 'ต้องมีผู้ดูแลระบบเหลืออย่างน้อย 1 คน');
      target.role = body.role; save(data);
      return response(200, memberPublic(target));
    }
    if (method === 'POST' && path === '/api/admin/restaurants') {
      const restaurant = { id: data.nextRestaurantId, ...restaurantBody(body) };
      data.nextRestaurantId++; data.restaurants.push(restaurant); save(data);
      return response(201, publicRestaurant(restaurant, data));
    }
    if ((match = path.match(/^\/api\/admin\/restaurants\/(\d+)$/))) {
      const previous = getRestaurant(match[1], data);
      if (method === 'PUT') {
        const restaurant = { id: previous.id, ...restaurantBody(body, previous) };
        data.restaurants = data.restaurants.map(item => item.id === previous.id ? restaurant : item); save(data);
        return response(200, publicRestaurant(restaurant, data));
      }
      if (method === 'DELETE') {
        data.restaurants = data.restaurants.filter(item => item.id !== previous.id);
        data.reviews = data.reviews.filter(review => review.restaurantId !== previous.id);
        data.favorites = data.favorites.filter(favorite => favorite.restaurantId !== previous.id); save(data);
        return response(204);
      }
    }
    if (method === 'DELETE' && (match = path.match(/^\/api\/admin\/reviews\/(\d+)$/))) {
      const review = data.reviews.find(item => item.id === Number(match[1]));
      if (!review) notFound();
      data.reviews = data.reviews.filter(item => item.id !== review.id); save(data);
      return response(204);
    }
  }
  return notFound();
}

export async function mockFetch(input, options = {}) {
  if (options.signal?.aborted) throw new DOMException('The request was aborted', 'AbortError');
  // Use the exact same HTTP-shaped contract as native fetch, without intercepting
  // or replacing the global fetch used when connecting to Go.
  await Promise.resolve();
  if (options.signal?.aborted) throw new DOMException('The request was aborted', 'AbortError');
  try { return route(new URL(input, window.location.origin), options, load()); }
  catch (error) {
    if (error instanceof MockError) return response(error.status, { error: { code: error.code, message: error.message } });
    return response(500, { error: { code: 'MOCK_ERROR', message: 'ข้อมูลจำลองมีปัญหา กรุณารีเซ็ตข้อมูลและลองอีกครั้ง' } });
  }
}
