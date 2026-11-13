import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { authService, restaurantService, reviewService } from '../../api/services';
import { setToken } from '../../api/backend';
import { resetMockData } from '../../mock/server';
import AdminRestaurants from './AdminRestaurants';
import AdminRestaurantForm from './AdminRestaurantForm';
import AdminReviews from './AdminReviews';

beforeEach(async () => {
  localStorage.clear(); setToken(null); resetMockData();
  const session = await authService.login({ email: 'admin@example.com', password: 'ExamplePassword123' });
  setToken(session.token);
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => { window.confirm.mockRestore(); setToken(null); });
function mount(path) {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[path]}><Routes>
    <Route path="/admin/restaurants" element={<AdminRestaurants />} />
    <Route path="/admin/restaurants/new" element={<AdminRestaurantForm />} />
    <Route path="/admin/restaurants/:id/edit" element={<AdminRestaurantForm />} />
    <Route path="/admin/reviews" element={<AdminReviews />} />
  </Routes></MemoryRouter>);
}
function change(label, value) { fireEvent.change(screen.getByLabelText(label), { target: { value } }); }
function search(value) {
  const input = screen.getByLabelText('ค้นหาร้านอาหาร');
  fireEvent.change(input, { target: { value } });
  fireEvent.submit(input.closest('form'));
}
test('admin creates, edits and deletes a restaurant through forms and list', async () => {
  mount('/admin/restaurants/new');
  await screen.findByRole('option', { name: 'เชียงใหม่' });
  change('ชื่อร้าน *', 'ร้านทดสอบใหม่');
  change('จังหวัด *', '1');
  change('ประเภทอาหาร *', '1');
  change('ที่อยู่ *', 'อำเภอเมืองเชียงใหม่');
  change('รายละเอียด *', 'อาหารเหนือทำสดทุกวันสำหรับทดสอบ');
  fireEvent.click(screen.getByRole('button', { name: 'บันทึกร้านอาหาร' }));
  await screen.findByRole('heading', { name: 'จัดการร้านอาหาร' });
  search('ร้านทดสอบใหม่');
  await screen.findByRole('link', { name: 'ร้านทดสอบใหม่' });
  const created = (await restaurantService.list({ q: 'ร้านทดสอบใหม่' })).items[0];
  expect(created).toMatchObject({ province: 'เชียงใหม่', category: 'อาหารเหนือ', rating: null, reviewCount: 0, latitude: null, imageUrl: null });
  fireEvent.click(screen.getByRole('link', { name: 'แก้ไข' }));
  await waitFor(() => expect(screen.getByLabelText('ชื่อร้าน *')).toHaveValue('ร้านทดสอบใหม่'));
  change('ชื่อร้าน *', 'ร้านทดสอบแก้ไข');
  fireEvent.click(screen.getByRole('button', { name: 'บันทึกร้านอาหาร' }));
  await screen.findByRole('heading', { name: 'จัดการร้านอาหาร' });
  search('ร้านทดสอบแก้ไข');
  await screen.findByRole('link', { name: 'ร้านทดสอบแก้ไข' });
  expect((await restaurantService.get(created.id)).name).toBe('ร้านทดสอบแก้ไข');
  fireEvent.click(screen.getByRole('button', { name: 'ลบร้าน ร้านทดสอบแก้ไข' }));
  await screen.findByRole('heading', { name: 'ยังไม่พบร้านอาหาร' });
  await expect(restaurantService.get(created.id)).rejects.toMatchObject({ status: 404 });
  expect(window.confirm).toHaveBeenCalledTimes(1);
});
test('admin can select a restaurant and moderate a review with aggregate refresh', async () => {
  mount('/admin/reviews');
  const selector = await screen.findByLabelText('ร้านอาหาร');
  fireEvent.change(selector, { target: { value: '102' } });
  await screen.findByText('นักชิมเดินทาง');
  expect((await restaurantService.get(102)).rating).toBe(4.5);
  fireEvent.click(screen.getByRole('button', { name: 'ลบรีวิว ของ นักชิมเดินทาง' }));
  await waitFor(() => expect(screen.queryByText('นักชิมเดินทาง')).not.toBeInTheDocument());
  expect(await screen.findByText('คนชอบอาหารไทย')).toBeInTheDocument();
  expect((await reviewService.list(102)).items).toHaveLength(1);
  expect(await restaurantService.get(102)).toMatchObject({ rating: 5, reviewCount: 1 });
});
test('canceling delete confirmation keeps the restaurant', async () => {
  window.confirm.mockReturnValue(false);
  mount('/admin/restaurants?q=ข้าวซอยริมสวน');
  await screen.findByRole('link', { name: 'ข้าวซอยริมสวน' });
  fireEvent.click(screen.getByRole('button', { name: 'ลบร้าน ข้าวซอยริมสวน' }));
  expect(screen.getByRole('link', { name: 'ข้าวซอยริมสวน' })).toBeInTheDocument();
  expect((await restaurantService.get(101)).id).toBe(101);
});
