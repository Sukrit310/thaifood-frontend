import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from './App';
import { resetMockData } from './mock/server';
import { authService, reviewService, restaurantService, adminService } from './api/services';
import { setToken } from './api/backend';

beforeEach(() => { resetMockData(); setToken(null); window.scrollTo = jest.fn(); });
async function loginAs(email) { const result = await authService.login({ email, password: 'ExamplePassword123' }); setToken(result.token); }
function open(path) { window.history.replaceState({}, '', path); return render(<App />); }

test('guest is sent to login and returns to favorites after signing in', async () => {
  open('/favorites');
  await screen.findByRole('heading', { name: 'กลับมาอร่อยกันต่อ' });
  fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'demo@example.com' } });
  fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'ExamplePassword123' } });
  fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }));
  expect(await screen.findByRole('heading', { name: 'ร้านโปรดของคุณ' })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'ข้าวซอยริมสวน' })).toBeInTheDocument();
  const card = screen.getByRole('heading', { name: 'ข้าวซอยริมสวน' }).closest('article');
  fireEvent.click(within(card).getByRole('button', { name: 'นำออกจากร้านโปรด' }));
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'ข้าวซอยริมสวน' })).not.toBeInTheDocument());
});

test('member writes a review on an unrated restaurant and rating updates from it', async () => {
  await loginAs('demo@example.com');
  open('/restaurants/113');
  expect(await screen.findByRole('heading', { name: 'ครัวเลเมืองเก่า' })).toBeInTheDocument();
  await screen.findByRole('heading', { name: 'แบ่งปันความอร่อยของคุณ' });
  fireEvent.click(screen.getByRole('radio', { name: '4 ดาว' }));
  fireEvent.change(screen.getByLabelText('รีวิวของคุณ'), { target: { value: 'อาหารอร่อย บริการดี อยากกลับมาอีกครั้ง' } });
  fireEvent.click(screen.getByRole('button', { name: 'ส่งรีวิว' }));
  expect(await within(screen.getByRole('region', { name: /^เสียงจากคนที่ได้ลอง/ })).findByText('อาหารอร่อย บริการดี อยากกลับมาอีกครั้ง', { selector: 'article p' })).toBeInTheDocument();
  expect(await screen.findByText('คุณรีวิวร้านนี้แล้ว สามารถลบรีวิวเดิมก่อนเขียนใหม่ได้')).toBeInTheDocument();
  const restaurant = await restaurantService.get(113);
  expect(restaurant.rating).toBe(4); expect(restaurant.reviewCount).toBe(1);
  window.confirm = jest.fn(() => true);
  fireEvent.click(screen.getByRole('button', { name: 'ลบรีวิว' }));
  await screen.findByRole('heading', { name: 'แบ่งปันความอร่อยของคุณ' });
  expect((await reviewService.list(113)).items).toHaveLength(0);
  expect((await restaurantService.get(113)).rating).toBeNull();
});

test('member sees forbidden when opening an admin route', async () => {
  await loginAs('demo@example.com'); open('/admin/restaurants');
  expect(await screen.findByRole('heading', { name: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'เพิ่มร้านอาหาร' })).not.toBeInTheDocument();
});

test('admin creates a restaurant with Thai option IDs through the actual mock API', async () => {
  await loginAs('admin@example.com'); open('/admin/restaurants/new');
  await screen.findByLabelText('ชื่อร้าน *');
  fireEvent.change(screen.getByLabelText('ชื่อร้าน *'), { target: { value: 'ครัวทดสอบการเดินทาง' } });
  fireEvent.change(screen.getByLabelText('จังหวัด *'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('ประเภทอาหาร *'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('ที่อยู่ *'), { target: { value: 'เมืองเชียงใหม่' } });
  fireEvent.change(screen.getByLabelText('รายละเอียด *'), { target: { value: 'ร้านอาหารสมมติสำหรับการทดสอบการเพิ่มร้าน' } });
  fireEvent.click(screen.getByRole('button', { name: 'บันทึกร้านอาหาร' }));
  await waitFor(() => expect(window.location.pathname).toBe('/admin/restaurants'));
  const created = await restaurantService.list({ q: 'ครัวทดสอบการเดินทาง' });
  expect(created.total).toBe(1);
  expect(created.items[0]).toMatchObject({ province: 'เชียงใหม่', category: 'อาหารเหนือ', rating: null, reviewCount: 0 });
  await adminService.deleteRestaurant(created.items[0].id);
});
