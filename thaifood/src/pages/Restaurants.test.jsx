import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Restaurants from './Restaurants';
import { restaurantService } from '../api/services';

jest.mock('../api/services', () => ({ restaurantService: { list: jest.fn(), provinces: jest.fn(), categories: jest.fn() } }));
const restaurant = { id: 101, name: 'ครัวตัวอย่าง', province: 'เชียงใหม่', category: 'อาหารเหนือ', imageUrl: null, rating: null, reviewCount: 0 };
function mount(url = '/restaurants') { return render(<MemoryRouter initialEntries={[url]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Restaurants /></MemoryRouter>); }
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
