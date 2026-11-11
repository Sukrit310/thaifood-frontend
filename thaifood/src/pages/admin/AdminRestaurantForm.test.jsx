import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminRestaurantForm, { validateRestaurant } from './AdminRestaurantForm';
import { adminService, restaurantService } from '../../api/services';

jest.mock('../../api/services', () => ({
  adminService: { createRestaurant: jest.fn(), updateRestaurant: jest.fn() },
  restaurantService: { provinces: jest.fn(), categories: jest.fn(), get: jest.fn() },
}));
const valid = { name: 'ร้านใหม่', provinceId: '1', categoryId: '2', address: 'เมืองเชียงใหม่', description: 'อาหารอร่อยท้องถิ่น', latitude: '', longitude: '', imageUrl: '' };
beforeEach(() => {
  jest.clearAllMocks();
  restaurantService.provinces.mockResolvedValue({ items: [{ id: 1, nameTh: 'เชียงใหม่' }] });
  restaurantService.categories.mockResolvedValue({ items: [{ id: 2, nameTh: 'อาหารเหนือ' }] });
});
test('rejects invalid coordinate and unsafe image URLs', () => {
  expect(validateRestaurant({ ...valid, latitude: '91', longitude: '100' })).toMatch(/ละติจูด/);
  expect(validateRestaurant({ ...valid, latitude: '18' })).toMatch(/ทั้งละติจูด/);
  expect(validateRestaurant({ ...valid, imageUrl: 'javascript:alert(1)' })).toMatch(/http/);
  expect(validateRestaurant({ ...valid, imageUrl: '//untrusted.test/a.jpg' })).toMatch(/ถูกต้อง/);
  expect(validateRestaurant(valid)).toBe('');
});
test('edit submits numeric foreign keys and nullable optional fields', async () => {
  restaurantService.get.mockResolvedValue({ id: 101, name: 'ร้านเดิม', province: 'เชียงใหม่', category: 'อาหารเหนือ', address: 'เมืองเชียงใหม่', description: 'อาหารอร่อยท้องถิ่น', latitude: null, longitude: null, imageUrl: null });
  adminService.updateRestaurant.mockResolvedValue({ id: 101 });
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/admin/restaurants/101/edit']}><Routes><Route path="/admin/restaurants/:id/edit" element={<AdminRestaurantForm />} /><Route path="/admin/restaurants" element={<p>saved list</p>} /></Routes></MemoryRouter>);
  await screen.findByLabelText('ชื่อร้าน *');
  await waitFor(() => expect(screen.getByLabelText('ชื่อร้าน *')).toHaveValue('ร้านเดิม'));
  fireEvent.change(screen.getByLabelText('ชื่อร้าน *'), { target: { value: 'ร้านแก้ไข' } });
  fireEvent.click(screen.getByRole('button', { name: 'บันทึกร้านอาหาร' }));
  await screen.findByText('saved list');
  expect(adminService.updateRestaurant).toHaveBeenCalledWith('101', { name: 'ร้านแก้ไข', provinceId: 1, categoryId: 2, address: 'เมืองเชียงใหม่', description: 'อาหารอร่อยท้องถิ่น', latitude: null, longitude: null, imageUrl: null });
});
