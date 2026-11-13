import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import Profile from './Profile';
import ChangePassword from './ChangePassword';
import Favorites from './Favorites';
import { useAuth } from '../auth/AuthContext';
import { authService, favoriteService } from '../api/services';

jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../api/backend', () => ({ isMockMode: false }));
jest.mock('../api/services', () => ({
  authService: { changePassword: jest.fn() },
  favoriteService: { list: jest.fn(), remove: jest.fn() },
}));

const login = jest.fn();
const register = jest.fn();
const updateProfile = jest.fn();
const member = { id: 7, displayName: 'นักชิม', email: 'member@example.com', role: 'member' };
const restaurant = { id: 29, name: 'ครัวริมน้ำ', province: 'กรุงเทพมหานคร', category: 'อาหารไทย', rating: 4.2, reviewCount: 3 };
function Destination() {
  const location = useLocation();
  return <output role="note">{JSON.stringify({ path: location.pathname + location.search + location.hash, state: location.state })}</output>;
}
function mount(page, pathname = '/', state) {
  return render(<MemoryRouter initialEntries={[{ pathname, state }]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path={pathname} element={page} /><Route path="*" element={<Destination />} /></Routes>
  </MemoryRouter>);
}
function change(label, value) { fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } }); }
function submit(name) { fireEvent.submit(screen.getByRole('button', { name, exact: true }).closest('form')); }
function fillLogin() { change('อีเมล', ' member@example.com '); change('รหัสผ่าน', ' password with spaces '); }
function fillRegister() {
  change('ชื่อที่แสดง', ' นักชิม '); change('อีเมล', ' new@example.com ');
  change('รหัสผ่าน', ' password with spaces '); change('ยืนยันรหัสผ่าน', ' password with spaces ');
}
function fillPassword() {
  change('รหัสผ่านเดิม', ' old password '); change('รหัสผ่านใหม่', ' new password '); change('ยืนยันรหัสผ่านใหม่', ' new password ');
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  jest.resetAllMocks();
  login.mockResolvedValue(member); register.mockResolvedValue(member); updateProfile.mockResolvedValue(member);
  authService.changePassword.mockResolvedValue(null);
  favoriteService.list.mockResolvedValue({ items: [restaurant] }); favoriteService.remove.mockResolvedValue(null);
  useAuth.mockReturnValue({ member: null, login, register, updateProfile });
});

test('login focuses a described validation error and clears stale invalid state on edit', () => {
  mount(<Login />); submit('เข้าสู่ระบบ');
  const alert = screen.getByRole('alert');
  expect(alert).toHaveFocus();
  for (const label of ['อีเมล', 'รหัสผ่าน']) {
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(label)).toHaveAccessibleDescription(alert.textContent);
  }
  change('อีเมล', 'member@example.com');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(login).not.toHaveBeenCalled();
});

test.each([
  [<Login />, 'เข้าสู่ระบบ'],
  [<Register />, 'สร้างบัญชี'],
  [<Profile />, 'บันทึกการเปลี่ยนแปลง'],
  [<ChangePassword />, 'เปลี่ยนรหัสผ่าน'],
])('every repeated invalid submit returns focus to the feedback', (page, buttonName) => {
  mount(page); submit(buttonName); expect(screen.getByRole('alert')).toHaveFocus();
  const button = screen.getByRole('button', { name: buttonName, exact: true }); button.focus();
  expect(button).toHaveFocus(); submit(buttonName);
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(login).not.toHaveBeenCalled(); expect(register).not.toHaveBeenCalled();
  expect(updateProfile).not.toHaveBeenCalled(); expect(authService.changePassword).not.toHaveBeenCalled();
});

test('login pending state prevents edits and duplicate requests; API error restores the draft', async () => {
  const request = deferred(); login.mockReturnValue(request.promise);
  mount(<Login />); fillLogin(); submit('เข้าสู่ระบบ');
  expect(screen.getByLabelText('อีเมล')).toBeDisabled(); expect(screen.getByLabelText('รหัสผ่าน')).toBeDisabled();
  submit('กำลังเข้าสู่ระบบ…');
  expect(login).toHaveBeenCalledTimes(1);
  expect(login).toHaveBeenCalledWith({ email: 'member@example.com', password: ' password with spaces ' });
  await act(async () => { request.reject(new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง')); });
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(screen.getByLabelText('รหัสผ่าน')).toHaveValue(' password with spaces ');
  expect(screen.getByLabelText('อีเมล')).toBeEnabled();
  expect(screen.getByLabelText('อีเมล')).not.toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('รหัสผ่าน')).not.toHaveAttribute('aria-invalid', 'true');
});

test('login retains the complete requested destination after successful submit', async () => {
  mount(<Login />, '/login', { from: { pathname: '/favorites', search: '?source=detail', hash: '#saved' } });
  fillLogin(); submit('เข้าสู่ระบบ');
  expect(await screen.findByRole('note')).toHaveTextContent('/favorites?source=detail#saved');
});

test('real API login does not disclose mock accounts and registration confirmation uses status', () => {
  mount(<Login />, '/login', { registered: true });
  expect(screen.getByRole('status')).toHaveTextContent('สร้างบัญชีแล้ว เข้าสู่ระบบได้เลย');
  expect(screen.queryByText(/บัญชีทดลอง/)).not.toBeInTheDocument();
  expect(screen.queryByText(/demo@example/)).not.toBeInTheDocument();
});

test('registration keeps its return state when linking to login', async () => {
  const from = { pathname: '/restaurants/29', search: '?review=1', hash: '#reviews' };
  mount(<Register />, '/register', { from });
  fireEvent.click(screen.getByRole('link', { name: 'เข้าสู่ระบบ', exact: true }));
  expect(await screen.findByRole('note')).toHaveTextContent(JSON.stringify({ path: '/login', state: { from } }));
});

test('registration pending state locks fields and preserves the registered/from redirect contract', async () => {
  const request = deferred(); register.mockReturnValue(request.promise);
  const from = { pathname: '/favorites', search: '?saved=1', hash: '#saved' };
  mount(<Register />, '/register', { from }); fillRegister(); submit('สร้างบัญชี');
  for (const label of ['ชื่อที่แสดง', 'อีเมล', 'รหัสผ่าน', 'ยืนยันรหัสผ่าน']) expect(screen.getByLabelText(label)).toBeDisabled();
  expect(register).toHaveBeenCalledWith({ displayName: 'นักชิม', email: 'new@example.com', password: ' password with spaces ' });
  await act(async () => { request.resolve(member); });
  expect(await screen.findByRole('note')).toHaveTextContent(JSON.stringify({ path: '/login', state: { registered: true, from } }));
});

test('registration focuses its confirmation error and preserves the UTF8 hint description', () => {
  mount(<Register />); fillRegister(); change('ยืนยันรหัสผ่าน', 'different password'); submit('สร้างบัญชี');
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(screen.getByLabelText('ยืนยันรหัสผ่าน')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('ยืนยันรหัสผ่าน')).toHaveAccessibleDescription(/ตรงกัน/);
  expect(screen.getByLabelText('รหัสผ่าน')).toHaveAccessibleDescription(/72 ไบต์/);
  expect(register).not.toHaveBeenCalled();
});

test.each([
  [<Register />, 'สร้างบัญชี', 'อีเมล', ['ชื่อที่แสดง', 'รหัสผ่าน', 'ยืนยันรหัสผ่าน']],
  [<ChangePassword />, 'เปลี่ยนรหัสผ่าน', 'รหัสผ่านเดิม', ['รหัสผ่านใหม่', 'ยืนยันรหัสผ่านใหม่']],
])('only fields described by the current validation message are marked invalid', (page, button, invalidLabel, otherLabels) => {
  mount(page); submit(button);
  expect(screen.getByLabelText(invalidLabel)).toHaveAttribute('aria-invalid', 'true');
  for (const label of otherLabels) expect(screen.getByLabelText(label)).not.toHaveAttribute('aria-invalid', 'true');
});

test('registration API error keeps entered fields and does not report format errors for valid fields', async () => {
  register.mockRejectedValue(new Error('อีเมลนี้มีบัญชีแล้ว'));
  mount(<Register />); fillRegister(); submit('สร้างบัญชี');
  expect(await screen.findByRole('alert')).toHaveFocus();
  expect(screen.getByRole('alert')).toHaveTextContent('อีเมลนี้มีบัญชีแล้ว');
  expect(screen.getByLabelText('ชื่อที่แสดง')).toHaveValue(' นักชิม ');
  expect(screen.getByLabelText('รหัสผ่าน')).toHaveValue(' password with spaces ');
  expect(screen.getByLabelText('อีเมล')).toBeEnabled();
  expect(screen.getByLabelText('อีเมล')).not.toHaveAttribute('aria-invalid', 'true');
});

test.each(['member', 'admin'])('profile shows the %s role and the current account navigation', role => {
  useAuth.mockReturnValue({ member: { ...member, role }, updateProfile });
  mount(<Profile />, '/profile');
  expect(screen.getByText(role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก ThaiFood Guide')).toBeInTheDocument();
  const nav = within(screen.getByRole('navigation', { name: 'เมนูบัญชีผู้ใช้' }));
  expect(nav.getByRole('link', { name: 'โปรไฟล์' })).toHaveAttribute('aria-current', 'page');
  expect(nav.getByRole('link', { name: 'เปลี่ยนรหัสผ่าน' })).toHaveAttribute('href', '/change-password');
  expect(nav.getByRole('link', { name: 'ร้านโปรด' })).toHaveAttribute('href', '/favorites');
  expect(screen.getByLabelText('อีเมล')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('อีเมล')).toHaveAccessibleDescription('อีเมลใช้สำหรับเข้าสู่ระบบและยังแก้ไขไม่ได้');
});

test('profile pending update sends only displayName and clears success when editing again', async () => {
  const request = deferred(); updateProfile.mockReturnValue(request.promise);
  useAuth.mockReturnValue({ member, updateProfile }); mount(<Profile />, '/profile');
  change('ชื่อที่แสดง', ' นักชิมคนใหม่ '); submit('บันทึกการเปลี่ยนแปลง');
  expect(screen.getByLabelText('ชื่อที่แสดง')).toBeDisabled();
  expect(updateProfile).toHaveBeenCalledWith({ displayName: 'นักชิมคนใหม่' });
  await act(async () => { request.resolve({ ...member, displayName: 'นักชิมคนใหม่' }); });
  expect(screen.getByRole('status')).toHaveTextContent('บันทึกโปรไฟล์แล้ว');
  expect(screen.getByLabelText('ชื่อที่แสดง')).toBeEnabled();
  change('ชื่อที่แสดง', 'แก้ไขต่อ'); expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('profile failed update keeps the name draft and focuses its error', async () => {
  updateProfile.mockRejectedValue(new Error('บันทึกไม่ได้ กรุณาลองอีกครั้ง'));
  useAuth.mockReturnValue({ member, updateProfile }); mount(<Profile />, '/profile');
  change('ชื่อที่แสดง', 'ชื่อที่ยังไม่ได้บันทึก'); submit('บันทึกการเปลี่ยนแปลง');
  expect(await screen.findByRole('alert')).toHaveFocus();
  expect(screen.getByLabelText('ชื่อที่แสดง')).toHaveValue('ชื่อที่ยังไม่ได้บันทึก');
  expect(screen.getByLabelText('ชื่อที่แสดง')).toBeEnabled();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('password update locks controls, sends untrimmed values, and clears fields only after success', async () => {
  const request = deferred(); authService.changePassword.mockReturnValue(request.promise);
  mount(<ChangePassword />, '/change-password'); fillPassword(); submit('เปลี่ยนรหัสผ่าน');
  for (const label of ['รหัสผ่านเดิม', 'รหัสผ่านใหม่', 'ยืนยันรหัสผ่านใหม่']) expect(screen.getByLabelText(label)).toBeDisabled();
  expect(screen.getByLabelText('รหัสผ่านใหม่')).toHaveValue(' new password ');
  expect(authService.changePassword).toHaveBeenCalledWith({ currentPassword: ' old password ', newPassword: ' new password ' });
  await act(async () => { request.resolve(null); });
  expect(screen.getByRole('status')).toHaveTextContent('เปลี่ยนรหัสผ่านแล้ว');
  for (const label of ['รหัสผ่านเดิม', 'รหัสผ่านใหม่', 'ยืนยันรหัสผ่านใหม่']) {
    expect(screen.getByLabelText(label)).toHaveValue(''); expect(screen.getByLabelText(label)).toBeEnabled();
  }
  change('รหัสผ่านเดิม', 'editing again'); expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('password API failure retains the draft and focuses the error without false invalid fields', async () => {
  authService.changePassword.mockRejectedValue(new Error('รหัสผ่านเดิมไม่ถูกต้อง'));
  mount(<ChangePassword />, '/change-password'); fillPassword(); submit('เปลี่ยนรหัสผ่าน');
  expect(await screen.findByRole('alert')).toHaveFocus();
  expect(screen.getByLabelText('รหัสผ่านเดิม')).toHaveValue(' old password ');
  expect(screen.getByLabelText('รหัสผ่านใหม่')).toHaveValue(' new password ');
  expect(screen.getByLabelText('รหัสผ่านใหม่')).not.toHaveAttribute('aria-invalid', 'true');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('password confirmation validation connects the invalid field with focused feedback', () => {
  mount(<ChangePassword />, '/change-password'); fillPassword(); change('ยืนยันรหัสผ่านใหม่', 'mismatch password'); submit('เปลี่ยนรหัสผ่าน');
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(screen.getByLabelText('ยืนยันรหัสผ่านใหม่')).toHaveAccessibleDescription(/ตรงกัน/);
  expect(screen.getByLabelText('ยืนยันรหัสผ่านใหม่')).toHaveAttribute('aria-invalid', 'true');
  expect(authService.changePassword).not.toHaveBeenCalled();
});

test('favorites loading announces progress without pretending the collection is empty', async () => {
  const request = deferred(); favoriteService.list.mockReturnValue(request.promise);
  mount(<Favorites />, '/favorites');
  expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลดร้านโปรด');
  expect(screen.queryByText('0 ร้าน')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'เริ่มสะสมร้านอร่อยกัน' })).not.toBeInTheDocument();
  await act(async () => { request.resolve({ items: [restaurant] }); });
  expect(await screen.findByText('1 ร้าน')).toBeInTheDocument();
});

test('favorites empty collection has a working search action and account navigation', async () => {
  favoriteService.list.mockResolvedValue({ items: [] }); mount(<Favorites />, '/favorites');
  expect(await screen.findByRole('heading', { name: 'เริ่มสะสมร้านอร่อยกัน' })).toBeInTheDocument();
  expect(screen.getByText('0 ร้าน')).toBeInTheDocument();
  expect(within(screen.getByRole('navigation', { name: 'เมนูบัญชีผู้ใช้' })).getByRole('link', { name: 'ร้านโปรด' })).toHaveAttribute('aria-current', 'page');
  fireEvent.click(screen.getByRole('link', { name: 'ออกไปค้นหาร้าน' }));
  expect(await screen.findByRole('note')).toHaveTextContent('/restaurants');
});

test('favorites list failure offers retry, hides counts, and recovers the real collection', async () => {
  favoriteService.list.mockRejectedValueOnce(new Error('โหลดร้านโปรดไม่ได้')).mockResolvedValue({ items: [restaurant] });
  mount(<Favorites />, '/favorites');
  expect(await screen.findByRole('alert')).toHaveTextContent('โหลดร้านโปรดไม่ได้');
  expect(screen.queryByText('0 ร้าน')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ลองอีกครั้ง' }));
  expect(await screen.findByRole('heading', { name: restaurant.name })).toBeInTheDocument();
  expect(screen.getByText('1 ร้าน')).toBeInTheDocument();
});

test('failed favorite removal prevents duplicates, retains cards, and focuses actionable feedback', async () => {
  const request = deferred(); favoriteService.remove.mockReturnValue(request.promise);
  mount(<Favorites />, '/favorites');
  const remove = await screen.findByRole('button', { name: 'นำออกจากร้านโปรด' }); fireEvent.click(remove);
  expect(screen.getByRole('button', { name: 'กำลังนำออก…' })).toBeDisabled();
  expect(favoriteService.remove).toHaveBeenCalledWith(29);
  await act(async () => { request.reject(new Error('นำออกไม่สำเร็จ กรุณาลองใหม่')); });
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(screen.getByRole('heading', { name: restaurant.name })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'นำออกจากร้านโปรด' })).toBeEnabled();
  expect(favoriteService.list).toHaveBeenCalledTimes(1);
});

test('successful favorite removal reloads, announces the result, and retains keyboard position', async () => {
  favoriteService.list.mockResolvedValueOnce({ items: [restaurant] }).mockResolvedValue({ items: [] });
  mount(<Favorites />, '/favorites'); fireEvent.click(await screen.findByRole('button', { name: 'นำออกจากร้านโปรด' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'ร้านที่บันทึกไว้' })).toHaveFocus());
  expect(await screen.findByRole('heading', { name: 'เริ่มสะสมร้านอร่อยกัน' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('นำร้านออกจากร้านโปรดแล้ว');
  expect(screen.getByText('0 ร้าน')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: restaurant.name })).not.toBeInTheDocument();
  expect(favoriteService.remove).toHaveBeenCalledTimes(1);
});
