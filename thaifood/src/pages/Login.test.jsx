import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import { useAuth } from '../auth/AuthContext';

jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../api/backend', () => ({ isMockMode: true }), { virtual: true });
const login = jest.fn();
const register = jest.fn();
beforeEach(() => { jest.clearAllMocks(); useAuth.mockReturnValue({ member: null, loading: false, login, register }); });
function renderPage(page) { render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/" element={page} /><Route path="/restaurants" element={<p>ร้านทั้งหมด</p>} /></Routes></MemoryRouter>); }
test('login rejects empty fields before calling API', () => {
  renderPage(<Login />);
  fireEvent.submit(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }).closest('form'));
  expect(screen.getByRole('alert')).toHaveTextContent(/อีเมล/);
  expect(login).not.toHaveBeenCalled();
});
test('login sends controlled fields and returns to requested destination', async () => {
  login.mockResolvedValue({ id: 1, role: 'member' });
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[{ pathname: '/login', state: { from: { pathname: '/restaurants', search: '?q=ข้าว' } } }]}><Routes><Route path="/login" element={<Login />} /><Route path="/restaurants" element={<p>ร้านทั้งหมด</p>} /></Routes></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'demo@example.com' } });
  fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'ExamplePassword123' } });
  fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }));
  await waitFor(() => expect(screen.getByText('ร้านทั้งหมด')).toBeInTheDocument());
  expect(login).toHaveBeenCalledWith({ email: 'demo@example.com', password: 'ExamplePassword123' });
});
test('register rejects mismatched password confirmation', () => {
  renderPage(<Register />);
  fireEvent.change(screen.getByLabelText('ชื่อที่แสดง'), { target: { value: 'นักชิม' } });
  fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'new@example.com' } });
  fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'ExamplePassword123' } });
  fireEvent.change(screen.getByLabelText('ยืนยันรหัสผ่าน'), { target: { value: 'OtherPassword123' } });
  fireEvent.submit(screen.getByRole('button', { name: 'สร้างบัญชี' }).closest('form'));
  expect(screen.getByRole('alert')).toHaveTextContent(/ตรงกัน/);
  expect(register).not.toHaveBeenCalled();
});
test('authenticated member render uses the same preserved destination', async () => {
  useAuth.mockReturnValue({ member: { id: 1, role: 'member' }, loading: false, login, register });
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[{ pathname: '/login', state: { from: { pathname: '/restaurants', search: '?q=ข้าว', hash: '#saved' } } }]}><Routes><Route path="/login" element={<Login />} /><Route path="/restaurants" element={<p>preserved destination</p>} /><Route path="/" element={<p>home destination</p>} /></Routes></MemoryRouter>);
  expect(await screen.findByText('preserved destination')).toBeInTheDocument();
  expect(screen.queryByText('home destination')).not.toBeInTheDocument();
});
test('unsafe return destination falls back to home', async () => {
  useAuth.mockReturnValue({ member: { id: 1, role: 'member' }, loading: false, login, register });
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[{ pathname: '/login', state: { from: { pathname: '//external.example' } } }]}><Routes><Route path="/login" element={<Login />} /><Route path="/" element={<p>safe home destination</p>} /></Routes></MemoryRouter>);
  expect(await screen.findByText('safe home destination')).toBeInTheDocument();
});
