import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import AdminDashboard from './AdminDashboard';
import AdminRestaurants from './AdminRestaurants';
import AdminMembers from './AdminMembers';
import AdminReviews from './AdminReviews';
import AdminRestaurantForm from './AdminRestaurantForm';
import { adminService, restaurantService, reviewService } from '../../api/services';

jest.mock('../../api/services', () => ({
  adminService: { members: jest.fn(), deleteRestaurant: jest.fn(), deleteReview: jest.fn(), createRestaurant: jest.fn(), updateRestaurant: jest.fn() },
  restaurantService: { list: jest.fn(), get: jest.fn(), provinces: jest.fn(), categories: jest.fn() },
  reviewService: { list: jest.fn() },
}));
jest.mock('../../api/backend', () => ({ isMockMode: false }));
const restaurant = { id: 29, name: 'ครัวริมน้ำ', province: 'เชียงใหม่', category: 'อาหารเหนือ', address: 'อำเภอเมือง', description: 'อาหารไทยท้องถิ่น', imageUrl: null, latitude: 0, longitude: 0, rating: 4, reviewCount: 1 };
const members = [{ id: 7, displayName: 'นักชิม', email: 'member@example.com', role: 'member' }, { id: 8, displayName: 'ผู้ดูแล', email: 'admin@example.com', role: 'admin' }];
const review = { id: 41, member: members[0], rating: 4, text: 'อาหารอร่อยและบริการดีมาก', createdAt: '2026-11-13T09:00:00Z' };
function Location() { const l = useLocation(); return <output role="note">{l.pathname + l.search}</output>; }
function mount(path = '/admin') {
  return render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Location /><Routes>
    <Route path="/admin" element={<AdminLayout />}><Route index element={<AdminDashboard />} />
      <Route path="restaurants" element={<AdminRestaurants />} /><Route path="restaurants/new" element={<AdminRestaurantForm />} />
      <Route path="restaurants/:id/edit" element={<AdminRestaurantForm />} /><Route path="members" element={<AdminMembers />} /><Route path="reviews" element={<AdminReviews />} />
    </Route>
  </Routes></MemoryRouter>);
}
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function change(label, value) { fireEvent.change(screen.getByLabelText(label), { target: { value } }); }
function fillForm() {
  change('ชื่อร้าน *', ' ร้านใหม่ '); change('จังหวัด *', '1'); change('ประเภทอาหาร *', '2');
  change('ที่อยู่ *', ' เมืองเชียงใหม่ '); change('รายละเอียด *', ' อาหารอร่อยท้องถิ่น ');
  change('ละติจูด', '0'); change('ลองจิจูด', '0');
}
beforeEach(() => {
  jest.resetAllMocks();
  restaurantService.list.mockResolvedValue({ items: [restaurant], total: 1, page: 1, limit: 12 });
  restaurantService.get.mockResolvedValue(restaurant);
  restaurantService.provinces.mockResolvedValue({ items: [{ id: 1, nameTh: 'เชียงใหม่' }] });
  restaurantService.categories.mockResolvedValue({ items: [{ id: 2, nameTh: 'อาหารเหนือ' }] });
  adminService.members.mockResolvedValue({ items: members }); reviewService.list.mockResolvedValue({ items: [review] });
  adminService.deleteRestaurant.mockResolvedValue(null); adminService.deleteReview.mockResolvedValue(null);
  adminService.createRestaurant.mockResolvedValue(restaurant); adminService.updateRestaurant.mockResolvedValue(restaurant);
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => window.confirm.mockRestore());

test('overview keeps its heading during loading and never shows a fabricated zero', async () => {
  const request = deferred(); restaurantService.list.mockReturnValue(request.promise); mount();
  expect(screen.getByRole('heading', { level: 1, name: 'ภาพรวม' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลดภาพรวม');
  expect(screen.queryByText('0')).not.toBeInTheDocument();
  await act(async () => { request.resolve({ items: [restaurant], total: 23, page: 1, limit: 1 }); });
  expect(await screen.findByText('23')).toBeInTheDocument(); expect(screen.getByText('2')).toBeInTheDocument();
});

test('overview uses API total rather than the first page size, and preserves actual zero', async () => {
  restaurantService.list.mockResolvedValue({ items: [], total: 0, page: 1, limit: 1 }); mount();
  const card = await screen.findByRole('link', { name: /ร้านอาหารทั้งหมด/ });
  expect(within(card).getByText('0')).toBeInTheDocument();
  expect(card).toHaveAttribute('href', '/admin/restaurants');
  expect(restaurantService.list).toHaveBeenCalledWith({ page: 1, limit: 1 });
});

test('overview reports an unavailable count when API omits the total', async () => {
  restaurantService.list.mockResolvedValue({ items: [restaurant], page: 1, limit: 1 }); mount();
  expect(await screen.findByText('ยังไม่ทราบจำนวน')).toBeInTheDocument();
  expect(screen.queryByText('0')).not.toBeInTheDocument();
});

test('overview load failure retains page context and recovers via retry', async () => {
  adminService.members.mockRejectedValueOnce(new Error('โหลดสมาชิกไม่ได้')).mockResolvedValue({ items: members }); mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('โหลดสมาชิกไม่ได้');
  expect(screen.getByRole('heading', { level: 1, name: 'ภาพรวม' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ลองอีกครั้ง' }));
  expect(await screen.findByText('2')).toBeInTheDocument();
});

test('member directory shows a truthful count, native row headers and roles without unsupported actions', async () => {
  mount('/admin/members');
  expect(await screen.findByText('2 คน')).toBeInTheDocument();
  const table = screen.getByRole('table', { name: /สมาชิกทั้งหมด/ });
  expect(within(table).getByRole('rowheader', { name: 'นักชิม' })).toBeInTheDocument();
  expect(within(table).getByText('member@example.com')).toBeInTheDocument();
  expect(within(table).getByText('ผู้ดูแลระบบ')).toBeInTheDocument();
  expect(within(table).queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'เมนูผู้ดูแลระบบ' }).querySelector('[aria-current="page"]')).toHaveAttribute('href', '/admin/members');
});

test('restaurant list load error hides counts and retry restores the real table', async () => {
  restaurantService.list.mockRejectedValueOnce(new Error('โหลดร้านไม่ได้')).mockResolvedValue({ items: [restaurant], total: 1, page: 1, limit: 12 });
  mount('/admin/restaurants'); expect(await screen.findByRole('alert')).toHaveTextContent('โหลดร้านไม่ได้');
  expect(screen.queryByText('0 ร้าน')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ลองอีกครั้ง' }));
  expect(await screen.findByRole('link', { name: 'ครัวริมน้ำ' })).toBeInTheDocument();
  expect(screen.getByText('1 ร้าน')).toBeInTheDocument();
});

test('canceling restaurant confirmation preserves the row and makes no write', async () => {
  window.confirm.mockReturnValue(false); mount('/admin/restaurants');
  fireEvent.click(await screen.findByRole('button', { name: 'ลบร้าน ครัวริมน้ำ' }));
  expect(screen.getByRole('link', { name: 'ครัวริมน้ำ' })).toBeInTheDocument();
  expect(adminService.deleteRestaurant).not.toHaveBeenCalled();
});

test('pending restaurant deletion locks actions; failure keeps the row and focuses feedback', async () => {
  const request = deferred(); adminService.deleteRestaurant.mockReturnValue(request.promise); mount('/admin/restaurants');
  fireEvent.click(await screen.findByRole('button', { name: 'ลบร้าน ครัวริมน้ำ' }));
  expect(screen.getByRole('button', { name: 'ลบร้าน ครัวริมน้ำ' })).toBeDisabled();
  await act(async () => { request.reject(new Error('ลบร้านไม่ได้')); });
  expect(screen.getByRole('alert')).toHaveFocus(); expect(screen.getByRole('alert')).toHaveTextContent('ลบร้านไม่ได้');
  expect(screen.getByRole('link', { name: 'ครัวริมน้ำ' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'ลบร้าน ครัวริมน้ำ' })).toBeEnabled();
});

test('successful last restaurant deletion announces success and retains keyboard position after reload', async () => {
  restaurantService.list.mockResolvedValueOnce({ items: [restaurant], total: 1, page: 1, limit: 12 }).mockResolvedValue({ items: [], total: 0, page: 1, limit: 12 });
  mount('/admin/restaurants'); fireEvent.click(await screen.findByRole('button', { name: 'ลบร้าน ครัวริมน้ำ' }));
  expect(await screen.findByRole('heading', { name: 'ยังไม่พบร้านอาหาร' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('ลบร้านอาหารแล้ว');
  expect(screen.getByRole('heading', { name: 'รายการร้านอาหาร', exact: true })).toHaveFocus();
  expect(adminService.deleteRestaurant).toHaveBeenCalledWith(29);
});

test('deleting the last row on page2 moves back while preserving the search query', async () => {
  restaurantService.list.mockResolvedValue({ items: [restaurant], total: 13, page: 2, limit: 12 });
  mount('/admin/restaurants?q=ครัว&page=2'); fireEvent.click(await screen.findByRole('button', { name: 'ลบร้าน ครัวริมน้ำ' }));
  await waitFor(() => expect(screen.getByRole('note')).toHaveTextContent('page=1'));
  expect(new URL('https://example.invalid' + screen.getByRole('note').textContent).searchParams.get('q')).toBe('ครัว');
});

test('review load keeps the selected restaurant context and exposes native moderation table', async () => {
  mount('/admin/reviews?restaurant=29');
  expect(await screen.findByRole('table', { name: 'รีวิวของร้านที่เลือก' })).toBeInTheDocument();
  expect(screen.getByLabelText('ร้านอาหาร')).toHaveValue('29');
  expect(screen.getByText('1 รีวิว')).toBeInTheDocument();
  expect(screen.getByText('อาหารอร่อยและบริการดีมาก')).toBeInTheDocument();
});

test('canceling review deletion preserves the review without a write', async () => {
  window.confirm.mockReturnValue(false); mount('/admin/reviews?restaurant=29');
  fireEvent.click(await screen.findByRole('button', { name: 'ลบรีวิวของ นักชิม' }));
  expect(screen.getByText(review.text)).toBeInTheDocument(); expect(adminService.deleteReview).not.toHaveBeenCalled();
});

test('review deletion failure retains the review and focuses feedback; successful retry returns focus to its heading', async () => {
  const request = deferred(); adminService.deleteReview.mockReturnValueOnce(request.promise).mockResolvedValue(null);
  reviewService.list.mockResolvedValueOnce({ items: [review] }).mockResolvedValue({ items: [] }); mount('/admin/reviews?restaurant=29');
  fireEvent.click(await screen.findByRole('button', { name: 'ลบรีวิวของ นักชิม' }));
  expect(screen.getByRole('button', { name: 'ลบรีวิวของ นักชิม' })).toBeDisabled();
  await act(async () => { request.reject(new Error('ลบรีวิวไม่ได้')); });
  expect(screen.getByRole('alert')).toHaveFocus(); expect(screen.getByText(review.text)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ลบรีวิวของ นักชิม' }));
  expect(await screen.findByRole('heading', { name: 'ร้านนี้ยังไม่มีรีวิว' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('ลบรีวิวแล้ว');
  expect(screen.getByRole('heading', { name: 'รีวิวที่เผยแพร่', exact: true })).toHaveFocus();
  expect(adminService.deleteReview).toHaveBeenCalledWith(41);
});

test('restaurant form has labelled groups and focuses repeated validation failures without sending API', async () => {
  mount('/admin/restaurants/new'); await screen.findByLabelText('ชื่อร้าน *');
  expect(screen.getByRole('group', { name: 'ข้อมูลร้านอาหาร' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'ที่ตั้งและรูปภาพ' })).toBeInTheDocument();
  const button = screen.getByRole('button', { name: 'บันทึกร้านอาหาร' }); fireEvent.click(button);
  expect(screen.getByRole('alert')).toHaveFocus(); button.focus(); fireEvent.click(button);
  expect(screen.getByRole('alert')).toHaveFocus(); expect(adminService.createRestaurant).not.toHaveBeenCalled();
});

test('pending restaurant form disables editable controls, retains failure draft and sends the unchanged zero-coordinate contract', async () => {
  const request = deferred(); adminService.createRestaurant.mockReturnValue(request.promise); mount('/admin/restaurants/new');
  await screen.findByLabelText('ชื่อร้าน *'); fillForm(); fireEvent.click(screen.getByRole('button', { name: 'บันทึกร้านอาหาร' }));
  for (const label of ['ชื่อร้าน *', 'จังหวัด *', 'ประเภทอาหาร *', 'รายละเอียด *', 'ละติจูด', 'ลิงก์รูปภาพ']) expect(screen.getByLabelText(label)).toBeDisabled();
  expect(adminService.createRestaurant).toHaveBeenCalledWith({ name: 'ร้านใหม่', provinceId: 1, categoryId: 2, address: 'เมืองเชียงใหม่', description: 'อาหารอร่อยท้องถิ่น', imageUrl: null, latitude: 0, longitude: 0 });
  await act(async () => { request.reject(new Error('บันทึกร้านไม่ได้')); });
  expect(screen.getByRole('alert')).toHaveFocus(); expect(screen.getByLabelText('ชื่อร้าน *')).toHaveValue(' ร้านใหม่ ');
  expect(screen.getByLabelText('จังหวัด *')).toHaveValue('1'); expect(screen.getByLabelText('ชื่อร้าน *')).toBeEnabled();
  expect(screen.getByRole('note')).toHaveTextContent('/admin/restaurants/new');
});

test('edit load error retains heading and retry restores the original fields', async () => {
  restaurantService.get.mockRejectedValueOnce(new Error('โหลดรายละเอียดไม่ได้')).mockResolvedValue(restaurant); mount('/admin/restaurants/29/edit');
  expect(await screen.findByRole('alert')).toHaveTextContent('โหลดรายละเอียดไม่ได้');
  expect(screen.getByRole('heading', { level: 1, name: 'แก้ไขร้านอาหาร' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ลองอีกครั้ง' }));
  await waitFor(() => expect(screen.getByLabelText('ชื่อร้าน *')).toHaveValue('ครัวริมน้ำ'));
});
