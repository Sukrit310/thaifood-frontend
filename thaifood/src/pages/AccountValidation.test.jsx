import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Register from './Register';
import Login from './Login';
import Profile from './Profile';
import ChangePassword from './ChangePassword';
import { useAuth } from '../auth/AuthContext';
import { authService } from '../api/services';

jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../api/services', () => ({ authService: { changePassword: jest.fn() } }));
jest.mock('../api/backend', () => ({ isMockMode: false }));
const register = jest.fn();
const login = jest.fn();
const updateProfile = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  register.mockResolvedValue({ id: 1 });
  authService.changePassword.mockResolvedValue(null);
  useAuth.mockReturnValue({ member: null, register, login, updateProfile });
});
function mount(page) {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/" element={page} /><Route path="/login" element={<p>registration completed</p>} /></Routes></MemoryRouter>);
}
function change(label, value) { fireEvent.change(screen.getByLabelText(label), { target: { value } }); }
function fillRegistration(password) {
  change('ชื่อที่แสดง', 'นักชิม'); change('อีเมล', 'new@example.com');
  change('รหัสผ่าน', password); change('ยืนยันรหัสผ่าน', password);
  fireEvent.submit(screen.getByRole('button', { name: 'สร้างบัญชี' }).closest('form'));
}
test.each(['กขค', 'ก'.repeat(24), '😀'.repeat(18)])('register accepts a password of 8–72 UTF8 bytes: %s', async password => {
  mount(<Register />); fillRegistration(password);
  await waitFor(() => expect(register).toHaveBeenCalledWith({ displayName: 'นักชิม', email: 'new@example.com', password }));
  expect(await screen.findByText('registration completed')).toBeInTheDocument();
});
test('register rejects Thai password over the Go bcrypt byte limit', () => {
  mount(<Register />); fillRegistration('ก'.repeat(25));
  expect(screen.getByRole('alert')).toHaveTextContent(/72/);
  expect(register).not.toHaveBeenCalled();
});
test('login rejects a password larger than 72 UTF8 bytes before requesting API', () => {
  mount(<Login />); change('อีเมล', 'demo@example.com'); change('รหัสผ่าน', 'ก'.repeat(25));
  fireEvent.submit(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }).closest('form'));
  expect(screen.getByRole('alert')).toHaveTextContent(/72/);
  expect(login).not.toHaveBeenCalled();
});
test('change password accepts three Thai characters as nine bytes', async () => {
  mount(<ChangePassword />); change('รหัสผ่านเดิม', 'ExamplePassword123'); change('รหัสผ่านใหม่', 'กขค'); change('ยืนยันรหัสผ่านใหม่', 'กขค');
  fireEvent.submit(screen.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }).closest('form'));
  expect(await screen.findByRole('status')).toHaveTextContent('เปลี่ยนรหัสผ่านแล้ว');
  expect(authService.changePassword).toHaveBeenCalledWith({ currentPassword: 'ExamplePassword123', newPassword: 'กขค' });
  expect(screen.getByLabelText('รหัสผ่านใหม่')).not.toHaveAttribute('minlength');
});
test('change password rejects current password exceeding 72 bytes', () => {
  mount(<ChangePassword />); change('รหัสผ่านเดิม', 'ก'.repeat(25)); change('รหัสผ่านใหม่', 'ExamplePassword123'); change('ยืนยันรหัสผ่านใหม่', 'ExamplePassword123');
  fireEvent.submit(screen.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }).closest('form'));
  expect(screen.getByRole('alert')).toHaveTextContent(/72/);
  expect(authService.changePassword).not.toHaveBeenCalled();
});
test('profile accepts 100 Unicode characters and rejects 101', async () => {
  useAuth.mockReturnValue({ member: { id: 1, email: 'demo@example.com', displayName: 'นักชิม', role: 'member' }, updateProfile });
  updateProfile.mockResolvedValue({ id: 1, displayName: '😀'.repeat(100) });
  mount(<Profile />);
  expect(screen.getByLabelText('ชื่อที่แสดง')).not.toHaveAttribute('maxlength');
  change('ชื่อที่แสดง', `  ${'😀'.repeat(100)}  `);
  fireEvent.submit(screen.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).closest('form'));
  await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ displayName: '😀'.repeat(100) }));
  await screen.findByRole('status');
  updateProfile.mockClear();
  change('ชื่อที่แสดง', '😀'.repeat(101));
  fireEvent.submit(screen.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).closest('form'));
  expect(screen.getByRole('alert')).toHaveTextContent(/100/);
  expect(updateProfile).not.toHaveBeenCalled();
});
