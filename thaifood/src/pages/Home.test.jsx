import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Home from './Home';
import { restaurantService } from '../api/services';
import { useAuth } from '../auth/AuthContext';

jest.mock('../api/services', () => ({ restaurantService: { list: jest.fn(), provinces: jest.fn() } }));
jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));

const restaurant = {
  id: 42, name: 'ครัวทดสอบจาก API', province: 'เชียงใหม่', category: 'อาหารเหนือ',
  imageUrl: null, rating: null, reviewCount: 0, address: 'ถนนสายอาหาร',
};
const provinceItems = [{ id: 1, nameTh: 'เชียงใหม่' }, { id: 2, nameTh: 'กรุงเทพมหานคร' }];

function Location() {
  const location = useLocation();
  return <output role="note" aria-label="ตำแหน่งปัจจุบัน">{location.pathname}{location.search}</output>;
}
function mount() {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Home /><Location /></MemoryRouter>);
}
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ member: null });
  restaurantService.list.mockResolvedValue({ items: [restaurant], total: 1, page: 1, limit: 6 });
  restaurantService.provinces.mockResolvedValue({ items: provinceItems });
});

test('shows the editorial sections and restaurant data returned by the existing API', async () => {
  mount();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ทุกจังหวัด');
  expect(await screen.findByRole('heading', { name: restaurant.name })).toBeInTheDocument();
  expect(restaurantService.list).toHaveBeenCalledWith({ page: 1, limit: 6 });
  expect(restaurantService.provinces).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('region', { name: 'ปักหมุดมื้อถัดไป' })).toBeInTheDocument();
  expect(screen.getByText('ยังไม่มีคะแนน')).toBeInTheDocument();
  expect(screen.queryByText(/77|ยอดนิยม/)).not.toBeInTheDocument();
});

test('submits trimmed Thai keywords and the exact API province name to the existing route', async () => {
  mount();
  await screen.findByRole('option', { name: 'เชียงใหม่' });
  fireEvent.change(screen.getByLabelText('ชื่อร้านหรือเมนู'), { target: { value: '  ข้าวซอย & กาแฟ  ' } });
  fireEvent.change(screen.getByLabelText('จังหวัด'), { target: { value: 'เชียงใหม่' } });
  fireEvent.click(screen.getByRole('button', { name: /ค้นหาร้านอร่อย/ }));
  const destination = new URL(screen.getByLabelText('ตำแหน่งปัจจุบัน').textContent, 'https://example.com');
  expect(destination.pathname).toBe('/restaurants');
  expect(Object.fromEntries(destination.searchParams)).toEqual({ q: 'ข้าวซอย & กาแฟ', province: 'เชียงใหม่' });
});

test('allows an unfiltered search without adding empty query parameters', async () => {
  mount();
  await screen.findByRole('heading', { name: restaurant.name });
  fireEvent.click(screen.getByRole('button', { name: /ค้นหาร้านอร่อย/ }));
  expect(screen.getByLabelText('ตำแหน่งปัจจุบัน')).toHaveTextContent(/^\/restaurants$/);
});

test('links every destination to its actual Thai province filter', async () => {
  mount();
  await screen.findByRole('heading', { name: restaurant.name });
  for (const province of ['เชียงใหม่', 'กรุงเทพมหานคร', 'ภูเก็ต', 'ขอนแก่น']) {
    const link = screen.getByRole('link', { name: `ค้นหาร้านอาหารใน${province}` });
    const destination = new URL(link.getAttribute('href'), 'https://example.com');
    expect(destination.pathname).toBe('/restaurants');
    expect(destination.searchParams.get('province')).toBe(province);
  }
});

test('announces loading while keeping keyword search available', async () => {
  let resolveRestaurants;
  restaurantService.list.mockReturnValueOnce(new Promise(resolve => { resolveRestaurants = resolve; }));
  mount();
  expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลดร้านอาหาร');
  expect(screen.getByRole('button', { name: /ค้นหาร้านอร่อย/ })).toBeEnabled();
  await waitFor(() => expect(resolveRestaurants).toBeDefined());
  resolveRestaurants({ items: [restaurant] });
  expect(await screen.findByRole('heading', { name: restaurant.name })).toBeInTheDocument();
});

test('retries a restaurant error and shows an honest empty state', async () => {
  restaurantService.list.mockRejectedValueOnce(new Error('เครือข่ายขัดข้อง'))
    .mockResolvedValueOnce({ items: [], total: 0 });
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('เครือข่ายขัดข้อง');
  fireEvent.click(screen.getByRole('button', { name: 'ลองโหลดร้านอาหารอีกครั้ง' }));
  expect(await screen.findByRole('heading', { name: 'ยังไม่พบร้านอาหาร' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'สำรวจร้านอาหารทั้งหมด' })).toHaveAttribute('href', '/restaurants');
  expect(screen.queryByRole('heading', { name: restaurant.name })).not.toBeInTheDocument();
});

test('keeps search usable when provinces fail, and restores the selector after retry', async () => {
  restaurantService.provinces.mockRejectedValueOnce(new Error('โหลดจังหวัดไม่ได้'))
    .mockResolvedValueOnce({ items: provinceItems });
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('โหลดจังหวัดไม่ได้');
  expect(screen.getByLabelText('จังหวัด')).toBeDisabled();
  expect(screen.getByRole('button', { name: /ค้นหาร้านอร่อย/ })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'ลองโหลดจังหวัดอีกครั้ง' }));
  expect(await screen.findByRole('option', { name: 'เชียงใหม่' })).toBeInTheDocument();
  expect(screen.getByLabelText('จังหวัด')).toBeEnabled();
});

test('uses an existing local hero illustration if the editorial image cannot load', async () => {
  mount();
  const image = screen.getByRole('img', { name: /ข้าวซอย.*ส้มตำ/ });
  fireEvent.error(image);
  expect(image).toHaveAttribute('src', '/images/hero-bowl.svg');
  expect(image).not.toHaveAttribute('srcset');
  await screen.findByRole('heading', { name: restaurant.name });
});

test('invites guests to register and members to open their existing favorites', async () => {
  const first = mount();
  expect(screen.getByRole('link', { name: /เริ่มบันทึกร้านที่ชอบ/ })).toHaveAttribute('href', '/register');
  await screen.findByRole('heading', { name: restaurant.name });
  first.unmount();
  useAuth.mockReturnValue({ member: { id: 7, role: 'member', displayName: 'สมาชิก' } });
  mount();
  expect(screen.getByRole('link', { name: /ไปยังร้านโปรด/ })).toHaveAttribute('href', '/favorites');
  await screen.findByRole('heading', { name: restaurant.name });
});
