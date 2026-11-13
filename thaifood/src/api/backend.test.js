import { ApiError, getToken, request, setToken } from './backend';
import { authService, restaurantService, reviewService, favoriteService, adminService } from './services';
import { resetMockData } from '../mock/server';

beforeEach(() => {
  localStorage.clear();
  resetMockData();
  setToken(null);
});

async function login(email = 'demo@example.com') {
  const session = await authService.login({ email, password: 'ExamplePassword123' });
  setToken(session.token);
  return session.member;
}

test('province lookup contains every Thai province without duplicates', async () => {
  const { items } = await restaurantService.provinces();
  expect(items).toHaveLength(77);
  expect(new Set(items.map(p => p.nameTh)).size).toBe(77);
  expect(items).toEqual(expect.arrayContaining([expect.objectContaining({ nameTh: 'บึงกาฬ' })]));
});

test('Thai filters, search, pagination and empty responses use contract envelopes', async () => {
  const data = await restaurantService.list({ province: 'เชียงใหม่', category: 'อาหารเหนือ', q: 'ข้าวซอย', page: 1, limit: 1 });
  expect(data).toMatchObject({ page: 1, limit: 1 });
  expect(data.items).toHaveLength(1);
  expect(data.items[0]).toMatchObject({ province: 'เชียงใหม่', category: 'อาหารเหนือ' });
  expect(await restaurantService.list({ q: 'ไม่มีร้านชื่อนี้แน่นอน' })).toEqual({ items: [], page: 1, limit: 12, total: 0 });
  await expect(restaurantService.list({ page: 0 })).rejects.toMatchObject({ status: 400 });
  await expect(restaurantService.list({ limit: 51 })).rejects.toMatchObject({ status: 400 });
});

test('ratings come from actual reviews and unrated restaurants return null', async () => {
  const { items } = await restaurantService.list({ limit: 50 });
  expect(items).toHaveLength(18);
  expect(items.some(r => r.rating === null && r.reviewCount === 0)).toBe(true);
  for (const restaurant of items) {
    const reviews = await reviewService.list(restaurant.id);
    const average = reviews.items.length ? reviews.items.reduce((sum, review) => sum + review.rating, 0) / reviews.items.length : null;
    expect(restaurant.rating).toBe(average === null ? null : Number(average.toFixed(1)));
    expect(restaurant.reviewCount).toBe(reviews.items.length);
  }
});

test('protected calls with an invalid token return 401 and dispatch session expiration', async () => {
  setToken('expired-mock-token');
  const expired = jest.fn();
  window.addEventListener('thaifood:unauthorized', expired);
  await expect(favoriteService.list()).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
  expect(expired).toHaveBeenCalledTimes(1);
  window.removeEventListener('thaifood:unauthorized', expired);
});

test('review validation, uniqueness and averages survive deletion', async () => {
  await login();
  const { items } = await restaurantService.list({ limit: 50 });
  const restaurant = items.find(r => r.reviewCount === 0);
  await expect(reviewService.create(restaurant.id, { rating: 6, text: 'อาหารอร่อยและบริการดีมาก' })).rejects.toMatchObject({ status: 400 });
  await expect(reviewService.create(restaurant.id, { rating: 5, text: 'สั้น' })).rejects.toMatchObject({ status: 400 });
  const review = await reviewService.create(restaurant.id, { rating: 5, text: 'อาหารอร่อยและบริการดีมาก' });
  expect(review).toMatchObject({ restaurantId: restaurant.id, rating: 5, member: { id: 1, displayName: 'นักชิมตัวอย่าง' } });
  expect(await restaurantService.get(restaurant.id)).toMatchObject({ rating: 5, reviewCount: 1 });
  await expect(reviewService.create(restaurant.id, { rating: 4, text: 'ลองเขียนรีวิวร้านเดิมซ้ำอีกครั้ง' })).rejects.toMatchObject({ status: 409 });
  expect(await reviewService.remove(review.id)).toBeNull();
  expect(await restaurantService.get(restaurant.id)).toMatchObject({ rating: null, reviewCount: 0 });
});

test('members cannot delete another member review or use admin API', async () => {
  await login();
  const { items } = await reviewService.list(101);
  const another = items.find(review => review.member.id !== 1);
  await expect(reviewService.remove(another.id)).rejects.toMatchObject({ status: 403 });
  await expect(adminService.members()).rejects.toMatchObject({ status: 403 });
});

test('favorites preserve contract shape and reject duplicates', async () => {
  await login();
  expect(await favoriteService.add(118)).toEqual({ restaurantId: 118 });
  await expect(favoriteService.add(118)).rejects.toMatchObject({ status: 409 });
  expect((await favoriteService.list()).items.some(item => item.id === 118)).toBe(true);
  expect(await favoriteService.remove(118)).toBeNull();
  expect((await favoriteService.list()).items.some(item => item.id === 118)).toBe(false);
});

test('registration cannot assign admin; profile and password changes work', async () => {
  const registration = { email: 'NEW@example.com', password: 'LongPassword123', displayName: 'คนใหม่' };
  await expect(authService.register({ ...registration, role: 'admin' })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
  const member = await authService.register(registration);
  expect(member).toMatchObject({ email: 'new@example.com', displayName: 'คนใหม่', role: 'member' });
  expect(Object.keys(member).sort()).toEqual(['displayName', 'email', 'id', 'role']);
  await expect(authService.register({ email: 'new@example.com', password: 'LongPassword123', displayName: 'อีกคน' })).rejects.toMatchObject({ status: 409 });
  const session = await authService.login({ email: 'new@example.com', password: 'LongPassword123' });
  setToken(session.token);
  expect(await authService.updateProfile({ displayName: 'ชื่อใหม่' })).toMatchObject({ displayName: 'ชื่อใหม่' });
  await expect(authService.changePassword({ currentPassword: 'wrong', newPassword: 'AnotherPassword123' })).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  expect(getToken()).toBe(session.token);
  expect(await authService.changePassword({ currentPassword: 'LongPassword123', newPassword: 'AnotherPassword123' })).toBeNull();
  await expect(authService.login({ email: 'new@example.com', password: 'LongPassword123' })).rejects.toMatchObject({ status: 401 });
  expect(await authService.login({ email: 'new@example.com', password: 'AnotherPassword123' })).toHaveProperty('token');
  expect(localStorage.getItem('thaifood.mock.v2')).not.toContain('AnotherPassword123');
});

test('admin CRUD accepts IDs, resolves names and cascades favorites/reviews', async () => {
  await login('admin@example.com');
  const restaurant = await adminService.createRestaurant({ name: 'ร้านทดสอบ', provinceId: 1, categoryId: 1, address: 'ที่อยู่ตัวอย่าง', description: 'รายละเอียดร้านอาหาร', latitude: 18.8, longitude: 99, imageUrl: null });
  expect(restaurant).toMatchObject({ province: 'เชียงใหม่', category: 'อาหารเหนือ', rating: null, reviewCount: 0 });
  const updated = await adminService.updateRestaurant(restaurant.id, { name: 'ร้านแก้ไข', provinceId: 1, categoryId: 1, address: 'ที่อยู่ตัวอย่าง', description: 'รายละเอียดร้านอาหาร', latitude: 18.8, longitude: 99, imageUrl: null });
  expect(updated.name).toBe('ร้านแก้ไข');
  await favoriteService.add(restaurant.id);
  await reviewService.create(restaurant.id, { rating: 4, text: 'อาหารอร่อยและบริการดีมาก' });
  expect(await adminService.deleteRestaurant(restaurant.id)).toBeNull();
  await expect(restaurantService.get(restaurant.id)).rejects.toMatchObject({ status: 404 });
  expect((await favoriteService.list()).items.find(r => r.id === restaurant.id)).toBeUndefined();
  expect((await adminService.members()).items.every(m => !('passwordDigest' in m))).toBe(true);
});

test('ApiError exposes HTTP status, contract code and message', () => {
  const error = new ApiError(403, 'FORBIDDEN', 'ไม่มีสิทธิ์');
  expect(error).toBeInstanceOf(Error);
  expect(error).toMatchObject({ status: 403, code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์' });
});

test('unknown routes and missing restaurant return 404', async () => {
  await expect(request('/api/unknown')).rejects.toMatchObject({ status: 404 });
  await expect(reviewService.list(99999)).rejects.toMatchObject({ status: 404 });
});

test('cross-tab removal of the stored token does not resurrect a cached session', async () => {
  await login();
  expect(getToken()).not.toBeNull();
  localStorage.removeItem('thaifood.token');
  expect(getToken()).toBeNull();
  await expect(authService.me()).rejects.toMatchObject({ status: 401 });
});

test('mock requests observe another tab session and data updates instead of cached data', async () => {
  // Prime this tab's mock cache before simulating writes performed in tab B.
  await restaurantService.list();
  const shared = JSON.parse(localStorage.getItem('thaifood.mock.v2'));
  shared.sessions['other-tab-token'] = { memberId: 1, expiresAt: Date.now() + 60_000 };
  shared.members.find(member => member.id === 1).displayName = 'ชื่อที่แก้จากอีกแท็บ';
  shared.favorites.push({ memberId: 1, restaurantId: 118 });
  localStorage.setItem('thaifood.mock.v2', JSON.stringify(shared));
  localStorage.setItem('thaifood.token', 'other-tab-token');

  expect(await authService.me()).toMatchObject({ id: 1, displayName: 'ชื่อที่แก้จากอีกแท็บ' });
  expect(getToken()).toBe('other-tab-token');
  expect((await favoriteService.list()).items.some(restaurant => restaurant.id === 118)).toBe(true);
});

test('mock session continues in memory when browser storage becomes inaccessible', async () => {
  await login();
  const read = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage disabled'); });
  try {
    expect(await authService.me()).toMatchObject({ id: 1, role: 'member' });
  } finally {
    read.mockRestore();
  }
});

test.each([
  ['Thai text with nine UTF-8 bytes', 'กกก'],
  ['exactly 72 UTF-8 bytes', 'ก'.repeat(24)],
  ['18 non-BMP characters at exactly 72 UTF-8 bytes', '😀'.repeat(18)],
])('registration accepts %s under Go byte-based password limits', async (_, password) => {
  const member = await authService.register({ email: 'unicode@example.com', password, displayName: 'สมาชิกใหม่' });
  expect(member).toMatchObject({ email: 'unicode@example.com', role: 'member' });
  expect(await authService.login({ email: member.email, password })).toHaveProperty('token');
});

test.each(['ก'.repeat(25), 'a'.repeat(73), 'abcdefg'])('registration rejects passwords outside Go 8–72 UTF-8 byte bounds', async password => {
  await expect(authService.register({ email: 'invalid@example.com', password, displayName: 'สมาชิกใหม่' })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
});

test('display names accept 100 trimmed Unicode code points and reject 101', async () => {
  const displayName = '😀'.repeat(100);
  const member = await authService.register({ email: 'display@example.com', password: 'ExamplePassword123', displayName: `  ${displayName}  ` });
  expect(member.displayName).toBe(displayName);
  const session = await authService.login({ email: member.email, password: 'ExamplePassword123' });
  setToken(session.token);
  expect((await authService.updateProfile({ displayName: ` ${'ข'.repeat(100)} ` })).displayName).toBe('ข'.repeat(100));
  await expect(authService.updateProfile({ displayName: '😀'.repeat(101) })).rejects.toMatchObject({ status: 400 });
});

test('reviews measure their 10–5000 bounds in trimmed Unicode code points', async () => {
  await login();
  await expect(reviewService.create(118, { rating: 5, text: '😀'.repeat(9) })).rejects.toMatchObject({ status: 400 });
  const longReview = await reviewService.create(118, { rating: 5, text: `  ${'😀'.repeat(5000)}  ` });
  expect(longReview.text).toBe('😀'.repeat(5000));
  await reviewService.remove(longReview.id);
  await expect(reviewService.create(118, { rating: 5, text: '😀'.repeat(5001) })).rejects.toMatchObject({ status: 400 });
  expect((await reviewService.create(118, { rating: 4, text: '😀'.repeat(10) })).text).toBe('😀'.repeat(10));
});

const validRestaurantInput = { name: 'ร้านทดสอบ', provinceId: 1, categoryId: 1, address: 'ที่อยู่ตัวอย่าง', description: 'รายละเอียดร้านอาหาร', imageUrl: null };

test('admin may omit coordinates but explicit null coordinates are rejected', async () => {
  await login('admin@example.com');
  const restaurant = await adminService.createRestaurant(validRestaurantInput);
  expect(restaurant).toMatchObject({ name: 'ร้านทดสอบ', imageUrl: null });
  for (const coordinate of ['latitude', 'longitude']) {
    await expect(adminService.createRestaurant({ ...validRestaurantInput, [coordinate]: null })).rejects.toMatchObject({ status: 400 });
    await expect(adminService.updateRestaurant(restaurant.id, { ...validRestaurantInput, [coordinate]: null })).rejects.toMatchObject({ status: 400 });
  }
  expect(await adminService.updateRestaurant(restaurant.id, { ...validRestaurantInput, latitude: 0, longitude: 0 })).toMatchObject({ latitude: 0, longitude: 0 });
  expect(await adminService.updateRestaurant(restaurant.id, { name: 'แก้ไขโดยไม่ส่งพิกัด' })).toMatchObject({ name: 'แก้ไขโดยไม่ส่งพิกัด', latitude: 0, longitude: 0 });
});

test.each([
  ['relative path', '/images/food-rice.svg'],
  ['userinfo', 'https://user:password@example.com/food.jpg'],
  ['non HTTP protocol', 'javascript:alert(1)'],
  ['empty raw host', 'https:///food.jpg'],
  ['more than 2048 bytes', `https://example.com/${'a'.repeat(2048)}`],
])('admin rejects image URL outside Go absolute HTTP(S) URL rules: %s', async (_, imageUrl) => {
  await login('admin@example.com');
  await expect(adminService.createRestaurant({ ...validRestaurantInput, imageUrl })).rejects.toMatchObject({ status: 400 });
});

test('admin accepts valid absolute HTTP(S) image URLs and null', async () => {
  await login('admin@example.com');
  expect(await adminService.createRestaurant({ ...validRestaurantInput, imageUrl: 'https://example.com/food.jpg' })).toMatchObject({ imageUrl: 'https://example.com/food.jpg' });
  expect(await adminService.createRestaurant({ ...validRestaurantInput, imageUrl: null })).toMatchObject({ imageUrl: null });
});

test('admin text field limits match Go Unicode bounds', async () => {
  await login('admin@example.com');
  const restaurant = await adminService.createRestaurant({ ...validRestaurantInput, name: '😀'.repeat(200), address: '😀'.repeat(1000), description: '😀'.repeat(5000) });
  expect(restaurant.name).toBe('😀'.repeat(200));
  for (const [field, limit] of [['name', 200], ['address', 1000], ['description', 5000]]) {
    await expect(adminService.updateRestaurant(restaurant.id, { ...validRestaurantInput, [field]: '😀'.repeat(limit + 1) })).rejects.toMatchObject({ status: 400 });
  }
});

test('login and current password reject more than 72 UTF-8 bytes', async () => {
  await expect(authService.login({ email: 'demo@example.com', password: 'ก'.repeat(25) })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
  await login();
  await expect(authService.changePassword({ currentPassword: 'ก'.repeat(25), newPassword: 'ExamplePassword123' })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
  await expect(authService.changePassword({ currentPassword: 'ExamplePassword123', newPassword: 'ก'.repeat(25) })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
});
