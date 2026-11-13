import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import RestaurantDetail from './RestaurantDetail';
import { restaurantService, reviewService, favoriteService } from '../api/services';
import { useAuth } from '../auth/AuthContext';

jest.mock('../api/services', () => ({ restaurantService: { get: jest.fn() }, reviewService: { list: jest.fn(), create: jest.fn(), remove: jest.fn() }, favoriteService: { list: jest.fn(), add: jest.fn(), remove: jest.fn() } }));
jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));

const member = { id: 7, displayName: 'สมาชิกทดสอบ', email: 'detail@example.invalid', role: 'member' };
const restaurant = { id: 501, name: 'ครัวสายลม', province: 'เชียงใหม่', category: 'อาหารเหนือ', address: 'ถนนนิมมานเหมินท์ อำเภอเมือง', description: 'อาหารท้องถิ่นจากครัวเล็ก ๆ ในเมือง', imageUrl: '/images/food-noodles.svg', rating: 4.5, reviewCount: 2, latitude: 18.79, longitude: 98.98 };
const review = { id: 91, rating: 4, text: 'อาหารอร่อยมากและบริการดี อยากกลับมาอีกครั้ง', member, createdAt: '2026-11-13T09:00:00Z' };

function NavigationProbe() {
  const location = useLocation(), navigate = useNavigate();
  return <><output role="note" aria-label="เส้นทางปัจจุบัน">{location.pathname + location.search}</output><output role="note" aria-label="กลับจากเข้าสู่ระบบ">{location.state?.from?.pathname}</output><button onClick={() => navigate('/restaurants/502')}>ไปร้านถัดไป</button></>;
}
function mount() {
  return render(<MemoryRouter initialEntries={['/restaurants/501']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/restaurants/:id" element={<RestaurantDetail />} /><Route path="/login" element={<h1>เข้าสู่ระบบ</h1>} /><Route path="/restaurants" element={<h1>ค้นหาร้านอาหาร</h1>} /></Routes><NavigationProbe /></MemoryRouter>);
}
const ready = () => screen.findByRole('heading', { name: 'ครัวสายลม', level: 1 });
const visit = () => screen.getByRole('complementary', { name: 'แวะไปอร่อยที่นี่' });
const reviews = () => screen.getByRole('region', { name: /^เสียงจากคนที่ได้ลอง/ });

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ member: null });
  restaurantService.get.mockResolvedValue(restaurant);
  reviewService.list.mockResolvedValue({ items: [] });
  reviewService.create.mockResolvedValue(review);
  reviewService.remove.mockResolvedValue(null);
  favoriteService.list.mockResolvedValue({ items: [] });
  favoriteService.add.mockResolvedValue(null);
  favoriteService.remove.mockResolvedValue(null);
  window.confirm = jest.fn(() => true);
});

test('renders real story/visit/review regions with correct breadcrumb and map destinations', async () => {
  mount(); await ready();
  expect(screen.getByRole('region', { name: 'เรื่องราวของร้าน' })).toHaveTextContent(restaurant.description);
  expect(visit()).toHaveTextContent(restaurant.address);
  const breadcrumb = screen.getByRole('navigation', { name: 'เส้นทาง' });
  const province = new URL(within(breadcrumb).getByRole('link', { name: 'เชียงใหม่' }).getAttribute('href'), 'https://example.com');
  expect(province.pathname).toBe('/restaurants'); expect(province.searchParams.get('province')).toBe('เชียงใหม่');
  expect(within(breadcrumb).getByText('ครัวสายลม')).toHaveAttribute('aria-current', 'page');
  const map = within(visit()).getByRole('link', { name: /ดูตำแหน่งบนแผนที่/ });
  expect(map).toHaveAttribute('href', 'https://www.openstreetmap.org/?mlat=18.79&mlon=98.98#map=16/18.79/98.98');
  expect(map).toHaveAttribute('target', '_blank');
  expect(screen.getByText('4.5 / 5')).toBeInTheDocument();
  expect(reviews()).toHaveTextContent('(2)');
  expect(favoriteService.list).not.toHaveBeenCalled();
});

test('loading announces the resource and resolves into the actual restaurant', async () => {
  let resolve;
  restaurantService.get.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  mount();
  expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลดรายละเอียดร้านอาหาร');
  await waitFor(() => expect(resolve).toBeDefined());
  await act(async () => resolve(restaurant));
  await ready();
});

test('a detail request error can retry without inventing restaurant data', async () => {
  restaurantService.get.mockRejectedValueOnce(new Error('โหลดร้านไม่ได้')).mockResolvedValue(restaurant);
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('โหลดร้านไม่ได้');
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ลองอีกครั้ง', exact: true }));
  await ready();
});

test('a404 has a useful return link and no broken visit controls', async () => {
  restaurantService.get.mockRejectedValueOnce(Object.assign(new Error('ไม่พบร้าน'), { status: 404 }));
  mount();
  expect(await screen.findByRole('heading', { name: 'ไม่พบร้านอาหารนี้' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'กลับไปค้นหาร้าน' })).toHaveAttribute('href', '/restaurants');
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
});

test.each([[null, null], [null, 100], ['', 0], [91, 100], [10, 181], ['ไม่ใช่พิกัด', 100]])('omits unusable map coordinates %s,%s', async (latitude, longitude) => {
  restaurantService.get.mockResolvedValue({ ...restaurant, latitude, longitude });
  mount(); await ready();
  expect(within(visit()).queryByRole('link', { name: /ดูตำแหน่งบนแผนที่/ })).not.toBeInTheDocument();
  expect(visit()).toHaveTextContent('ยังไม่มีตำแหน่งแผนที่ที่พร้อมใช้งาน');
});

test.each([[0, 0, '0'], ['18.79', '98.98', '18.79']])('retains valid coordinates including zero and numeric strings', async (latitude, longitude, lat) => {
  restaurantService.get.mockResolvedValue({ ...restaurant, latitude, longitude });
  mount(); await ready();
  const map = within(visit()).getByRole('link', { name: /ดูตำแหน่งบนแผนที่/ });
  expect(new URL(map.href).searchParams.get('mlat')).toBe(lat);
});

test('unrated and empty reviews stay honest and use a subordinate empty heading', async () => {
  restaurantService.get.mockResolvedValue({ ...restaurant, rating: null, reviewCount: 0 });
  mount(); await ready();
  expect(screen.getByText('ยังไม่มีคะแนน')).toBeInTheDocument();
  expect(await within(reviews()).findByRole('heading', { name: 'เป็นคนแรกที่รีวิวร้านนี้', level: 3 })).toBeInTheDocument();
  expect(screen.queryByText('4.5 / 5')).not.toBeInTheDocument();
});

test.each(['เข้าสู่ระบบเพื่อรีวิว', 'เข้าสู่ระบบเพื่อบันทึกร้าน'])('guest CTA %s keeps the existing restaurant return path', async name => {
  mount(); await ready();
  fireEvent.click(screen.getByRole('link', { name, exact: true }));
  expect(screen.getByLabelText('เส้นทางปัจจุบัน')).toHaveTextContent('/login');
  expect(screen.getByLabelText('กลับจากเข้าสู่ระบบ')).toHaveTextContent('/restaurants/501');
});

test('member favorite state tracks real add/remove responses', async () => {
  useAuth.mockReturnValue({ member });
  favoriteService.list.mockResolvedValueOnce({ items: [] }).mockResolvedValueOnce({ items: [restaurant] }).mockResolvedValue({ items: [] });
  mount(); await ready();
  let button = await within(visit()).findByRole('button', { name: 'บันทึกร้านโปรด', exact: true });
  expect(button).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(button);
  button = await within(visit()).findByRole('button', { name: 'บันทึกในร้านโปรดแล้ว', exact: true });
  expect(favoriteService.add).toHaveBeenCalledWith(501); expect(button).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(button);
  await within(visit()).findByRole('button', { name: 'บันทึกร้านโปรด', exact: true });
  expect(favoriteService.remove).toHaveBeenCalledWith(501);
  expect(within(visit()).getByRole('status')).toHaveTextContent('นำออกจากร้านโปรดแล้ว');
});

test('pending/failed favorite writes stay disabled then recover without a false saved state', async () => {
  useAuth.mockReturnValue({ member });
  let reject;
  favoriteService.add.mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail; }));
  mount(); await ready();
  fireEvent.click(await within(visit()).findByRole('button', { name: 'บันทึกร้านโปรด', exact: true }));
  expect(within(visit()).getByRole('button', { name: 'กำลังบันทึก…' })).toBeDisabled();
  await act(async () => reject(new Error('บันทึกไม่สำเร็จ')));
  expect(within(visit()).getByRole('alert')).toHaveTextContent('บันทึกไม่สำเร็จ');
  expect(within(visit()).getByRole('button', { name: 'บันทึกร้านโปรด', exact: true })).toBeEnabled();
  expect(within(visit()).getByRole('button', { name: 'บันทึกร้านโปรด', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('favorite-list failure retries independently from story/reviews', async () => {
  useAuth.mockReturnValue({ member });
  favoriteService.list.mockRejectedValueOnce(new Error('ตรวจร้านโปรดไม่ได้')).mockResolvedValue({ items: [] });
  mount(); await ready();
  expect(await within(visit()).findByRole('alert')).toHaveTextContent('ตรวจร้านโปรดไม่ได้');
  expect(await screen.findByRole('heading', { name: 'แบ่งปันความอร่อยของคุณ' })).toBeInTheDocument();
  fireEvent.click(within(visit()).getByRole('button', { name: 'ลองอีกครั้ง', exact: true }));
  expect(await within(visit()).findByRole('button', { name: 'บันทึกร้านโปรด', exact: true })).toBeInTheDocument();
});

test('review-list failure can retry while the story/visit information remains available', async () => {
  reviewService.list.mockRejectedValueOnce(new Error('โหลดรีวิวไม่ได้')).mockResolvedValue({ items: [] });
  mount(); await ready();
  expect(await within(reviews()).findByRole('alert')).toHaveTextContent('โหลดรีวิวไม่ได้');
  expect(visit()).toHaveTextContent(restaurant.address);
  fireEvent.click(within(reviews()).getByRole('button', { name: 'ลองอีกครั้ง', exact: true }));
  expect(await within(reviews()).findByRole('heading', { name: 'เป็นคนแรกที่รีวิวร้านนี้' })).toBeInTheDocument();
});

test('submitting a review refreshes real score/count and places success near reviews', async () => {
  useAuth.mockReturnValue({ member });
  reviewService.create.mockImplementationOnce(async () => {
    reviewService.list.mockResolvedValue({ items: [review] });
    restaurantService.get.mockResolvedValue({ ...restaurant, rating: 4, reviewCount: 1 });
    return review;
  });
  mount(); await ready();
  await screen.findByRole('heading', { name: 'แบ่งปันความอร่อยของคุณ' });
  fireEvent.click(screen.getByRole('radio', { name: '4 ดาว' }));
  fireEvent.change(screen.getByLabelText('รีวิวของคุณ'), { target: { value: '  ' + review.text + '  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'ส่งรีวิว' }));
  expect(await within(reviews()).findByText('ขอบคุณที่แบ่งปันรีวิว')).toHaveAttribute('role', 'status');
  expect(reviewService.create).toHaveBeenCalledWith(501, { rating: 4, text: review.text });
  expect(await screen.findByText('4.0 / 5')).toBeInTheDocument();
  expect(await screen.findByText(/คุณรีวิวร้านนี้แล้ว/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'ส่งรีวิว' })).not.toBeInTheDocument();
});

test('owner can confirm/delete a review and the original form becomes available again', async () => {
  useAuth.mockReturnValue({ member });
  reviewService.list.mockResolvedValueOnce({ items: [review] }).mockResolvedValue({ items: [] });
  restaurantService.get.mockResolvedValueOnce({ ...restaurant, rating: 4, reviewCount: 1 }).mockResolvedValue({ ...restaurant, rating: null, reviewCount: 0 });
  mount(); await ready();
  expect(await screen.findByRole('img', { name: '4 จาก 5 ดาว' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ลบรีวิว', exact: true }));
  await screen.findByRole('heading', { name: 'แบ่งปันความอร่อยของคุณ' });
  expect(window.confirm).toHaveBeenCalled(); expect(reviewService.remove).toHaveBeenCalledWith(91);
  expect(screen.getByText('ยังไม่มีคะแนน')).toBeInTheDocument();
});

test.each([['member', 0], ['admin', 1]])('%s review-delete permission is unchanged for other authors', async (role, count) => {
  useAuth.mockReturnValue({ member: { ...member, role } });
  reviewService.list.mockResolvedValue({ items: [{ ...review, member: { ...member, id: 8 } }] });
  mount(); await ready(); await screen.findByText(review.text);
  expect(screen.queryAllByRole('button', { name: 'ลบรีวิว', exact: true })).toHaveLength(count);
});

test('hero fallback is bounded even if the local fallback fails', async () => {
  mount(); await ready();
  const image = screen.getByRole('img', { name: 'ภาพประกอบ ครัวสายลม' });
  fireEvent.error(image); expect(image).toHaveAttribute('src', '/images/food-rice.svg');
  const setter = jest.spyOn(image, 'src', 'set');
  fireEvent.error(image); expect(setter).not.toHaveBeenCalled(); setter.mockRestore();
});

test('missing story/address use honest copy rather than undefined content', async () => {
  restaurantService.get.mockResolvedValue({ ...restaurant, address: '', description: null });
  mount(); await ready();
  expect(screen.getByRole('region', { name: 'เรื่องราวของร้าน' })).toHaveTextContent('ร้านนี้ยังไม่มีเรื่องราวเพิ่มเติม');
  expect(visit()).toHaveTextContent('ยังไม่ได้ระบุที่อยู่');
});

test('a pending favorite response from the previous restaurant cannot leak feedback into the next one', async () => {
  useAuth.mockReturnValue({ member });
  let resolve;
  favoriteService.add.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  restaurantService.get.mockImplementation(id => Promise.resolve(id === '501' ? restaurant : { ...restaurant, id: 502, name: 'ครัวแห่งถัดไป' }));
  mount(); await ready();
  fireEvent.click(await within(visit()).findByRole('button', { name: 'บันทึกร้านโปรด', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'ไปร้านถัดไป' }));
  await screen.findByRole('heading', { name: 'ครัวแห่งถัดไป', level: 1 });
  await act(async () => resolve(null));
  expect(await within(visit()).findByRole('button', { name: 'บันทึกร้านโปรด', exact: true })).toBeEnabled();
  expect(within(visit()).queryByText('บันทึกเป็นร้านโปรดแล้ว')).not.toBeInTheDocument();
});
