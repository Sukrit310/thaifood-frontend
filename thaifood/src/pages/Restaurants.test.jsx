import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import Restaurants from './Restaurants';
import { restaurantService } from '../api/services';

jest.mock('../api/services', () => ({ restaurantService: { list: jest.fn(), provinces: jest.fn(), categories: jest.fn() } }));
const restaurant = { id: 101, name: 'ครัวตัวอย่าง', province: 'เชียงใหม่', category: 'อาหารเหนือ', imageUrl: null, rating: null, reviewCount: 0 };
function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output role="note" aria-label="ตำแหน่งปัจจุบัน">{location.pathname}{location.search}</output><button type="button" onClick={() => navigate(-1)}>ประวัติก่อนหน้า</button></>;
}
function mount(url = '/restaurants') { return render(<MemoryRouter initialEntries={[url]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Restaurants /><LocationProbe /></MemoryRouter>); }
function currentUrl() { return new URL(screen.getByLabelText('ตำแหน่งปัจจุบัน').textContent, 'https://example.com'); }
beforeEach(() => {
  jest.clearAllMocks();
  restaurantService.provinces.mockResolvedValue({ items: [{ id: 1, nameTh: 'เชียงใหม่' }] });
  restaurantService.categories.mockResolvedValue({ items: [{ id: 1, nameTh: 'อาหารเหนือ' }] });
  restaurantService.list.mockResolvedValue({ items: [restaurant], page: 1, limit: 12, total: 1 });
});
test('shows loading then restaurant with unrated label', async () => {
  mount();
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'ครัวตัวอย่าง' })).toBeInTheDocument();
  expect(screen.getByText('ยังไม่มีคะแนน')).toBeInTheDocument();
});
test('sends Thai filters and resets pagination after search', async () => {
  mount('/restaurants?province=เชียงใหม่&page=2');
  await screen.findByRole('heading', { name: 'ครัวตัวอย่าง' });
  fireEvent.change(screen.getByLabelText('ค้นหาร้านอาหาร'), { target: { value: 'ข้าวซอย' } });
  fireEvent.click(screen.getByRole('button', { name: 'ค้นหา' }));
  await waitFor(() => expect(restaurantService.list).toHaveBeenLastCalledWith(expect.objectContaining({ province: 'เชียงใหม่', q: 'ข้าวซอย', page: 1, limit: 12 })));
});
test('offers retry after network failure and an empty state after retry', async () => {
  restaurantService.list.mockRejectedValueOnce(new Error('เครือข่ายขัดข้อง')).mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 12 });
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('เครือข่ายขัดข้อง');
  fireEvent.click(screen.getByRole('button', { name: 'ลองอีกครั้ง' }));
  expect(await screen.findByText('ไม่พบร้านที่ค้นหา')).toBeInTheDocument();
});

test('restores all supported filters from the URL and shows the actual API total', async () => {
  restaurantService.list.mockResolvedValue({ items: [restaurant], total: 37, page: 2, limit: 12 });
  mount('/restaurants?q=ข้าวซอย&province=เชียงใหม่&category=อาหารเหนือ&page=2');
  await screen.findByRole('heading', { name: restaurant.name });
  expect(screen.getByLabelText('ค้นหาร้านอาหาร')).toHaveValue('ข้าวซอย');
  expect(screen.getByLabelText('จังหวัด')).toHaveValue('เชียงใหม่');
  expect(screen.getByLabelText('ประเภทอาหาร')).toHaveValue('อาหารเหนือ');
  expect(restaurantService.list).toHaveBeenLastCalledWith({ q: 'ข้าวซอย', province: 'เชียงใหม่', category: 'อาหารเหนือ', page: 2, limit: 12 });
  expect(screen.getByRole('region', { name: 'ผลการค้นหา' })).toHaveTextContent('37 ร้านอาหาร');
});

test('changing a dropdown keeps the other filters and resets to page one', async () => {
  mount('/restaurants?q=กาแฟ&province=เชียงใหม่&page=3');
  await screen.findByRole('heading', { name: restaurant.name });
  fireEvent.change(screen.getByLabelText('ประเภทอาหาร'), { target: { value: 'อาหารเหนือ' } });
  await waitFor(() => expect(restaurantService.list).toHaveBeenLastCalledWith({ q: 'กาแฟ', province: 'เชียงใหม่', category: 'อาหารเหนือ', page: 1, limit: 12 }));
});

test('pagination retains filters and unrelated URL parameters in both directions', async () => {
  restaurantService.list.mockResolvedValue({ items: [restaurant], total: 37, page: 2, limit: 12 });
  mount('/restaurants?q=อาหาร&province=เชียงใหม่&category=อาหารเหนือ&page=2&utm_source=test');
  await screen.findByRole('heading', { name: restaurant.name });
  fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
  await waitFor(() => expect(restaurantService.list).toHaveBeenLastCalledWith({ q: 'อาหาร', province: 'เชียงใหม่', category: 'อาหารเหนือ', page: 3, limit: 12 }));
  expect(currentUrl().searchParams.get('utm_source')).toBe('test');
  fireEvent.click(screen.getByRole('button', { name: 'ก่อนหน้า' }));
  await waitFor(() => expect(currentUrl().searchParams.get('page')).toBe('2'));
  expect(currentUrl().searchParams.get('q')).toBe('อาหาร');
  expect(currentUrl().searchParams.get('category')).toBe('อาหารเหนือ');
});

test('removing one active filter preserves the remaining query values', async () => {
  mount('/restaurants?q=กาแฟ&province=เชียงใหม่&category=อาหารเหนือ&page=3');
  await screen.findByRole('heading', { name: restaurant.name });
  fireEvent.click(screen.getByRole('button', { name: 'ลบตัวกรองจังหวัด เชียงใหม่' }));
  await waitFor(() => expect(restaurantService.list).toHaveBeenLastCalledWith({ q: 'กาแฟ', province: '', category: 'อาหารเหนือ', page: 1, limit: 12 }));
  expect(currentUrl().searchParams.has('province')).toBe(false);
});

test('clearing an empty filtered result clears both the URL and keyword field', async () => {
  restaurantService.list.mockResolvedValue({ items: [], total: 0, page: 1, limit: 12 });
  mount('/restaurants?q=ไม่พบร้าน&province=เชียงใหม่&category=อาหารเหนือ');
  await screen.findByText('ไม่พบร้านที่ค้นหา');
  fireEvent.click(screen.getByRole('button', { name: 'ดูร้านทั้งหมด' }));
  await waitFor(() => expect(restaurantService.list).toHaveBeenLastCalledWith({ q: '', province: '', category: '', page: 1, limit: 12 }));
  expect(currentUrl().search).toBe('');
  expect(screen.getByLabelText('ค้นหาร้านอาหาร')).toHaveValue('');
});

test('option failures preserve URL values and allow keyword search and retry', async () => {
  restaurantService.provinces.mockRejectedValueOnce(new Error('โหลดจังหวัดไม่ได้'))
    .mockResolvedValueOnce({ items: [{ id: 1, nameTh: 'เชียงใหม่' }] });
  mount('/restaurants?province=เชียงใหม่&category=อาหารเหนือ&page=2');
  expect(await screen.findByRole('alert')).toHaveTextContent('โหลดจังหวัดไม่ได้');
  expect(screen.getByLabelText('จังหวัด')).toBeDisabled();
  expect(screen.getByLabelText('จังหวัด')).toHaveValue('เชียงใหม่');
  expect(screen.getByLabelText('ประเภทอาหาร')).toHaveValue('อาหารเหนือ');
  expect(screen.getByRole('button', { name: 'ค้นหา' })).toBeEnabled();
  fireEvent.change(screen.getByLabelText('ค้นหาร้านอาหาร'), { target: { value: ' ข้าวซอย ' } });
  fireEvent.click(screen.getByRole('button', { name: 'ค้นหา' }));
  await waitFor(() => expect(restaurantService.list).toHaveBeenLastCalledWith({ q: 'ข้าวซอย', province: 'เชียงใหม่', category: 'อาหารเหนือ', page: 1, limit: 12 }));
  fireEvent.click(screen.getByRole('button', { name: 'โหลดตัวกรองอีกครั้ง' }));
  await waitFor(() => expect(screen.getByLabelText('จังหวัด')).toBeEnabled());
  expect(screen.getByLabelText('จังหวัด')).toHaveValue('เชียงใหม่');
});

test('a failed result request does not falsely announce zero restaurants', async () => {
  restaurantService.list.mockRejectedValue(new Error('API ไม่พร้อมใช้งาน'));
  mount();
  await screen.findByRole('alert');
  expect(screen.getByRole('region', { name: 'ผลการค้นหา' })).not.toHaveTextContent('0 ร้านอาหาร');
});

test('an out-of-range page offers a return to page one without losing filters', async () => {
  restaurantService.list.mockResolvedValueOnce({ items: [], total: 24, page: 9, limit: 12 })
    .mockResolvedValue({ items: [restaurant], total: 24, page: 1, limit: 12 });
  mount('/restaurants?q=ข้าวซอย&province=เชียงใหม่&page=9');
  await screen.findByRole('heading', { name: 'ไม่มีรายการในหน้านี้' });
  fireEvent.click(screen.getByRole('button', { name: 'กลับไปหน้าแรก' }));
  await waitFor(() => expect(restaurantService.list).toHaveBeenLastCalledWith({ q: 'ข้าวซอย', province: 'เชียงใหม่', category: '', page: 1, limit: 12 }));
});

test('browser history restores the previous keyword in the form', async () => {
  mount('/restaurants?q=กาแฟ');
  await screen.findByRole('heading', { name: restaurant.name });
  fireEvent.change(screen.getByLabelText('ค้นหาร้านอาหาร'), { target: { value: ' ข้าวซอย & ชา ' } });
  fireEvent.click(screen.getByRole('button', { name: 'ค้นหา' }));
  await waitFor(() => expect(currentUrl().searchParams.get('q')).toBe('ข้าวซอย & ชา'));
  fireEvent.click(screen.getByRole('button', { name: 'ประวัติก่อนหน้า' }));
  await waitFor(() => expect(screen.getByLabelText('ค้นหาร้านอาหาร')).toHaveValue('กาแฟ'));
});

test('the mobile filter toggle exposes its state without submitting the form', async () => {
  mount('/restaurants?page=2');
  await screen.findByRole('heading', { name: restaurant.name });
  const toggle = screen.getByRole('button', { name: /ตัวกรองเพิ่มเติม/ });
  expect(toggle).toHaveAttribute('type', 'button');
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(currentUrl().searchParams.get('page')).toBe('2');
});
