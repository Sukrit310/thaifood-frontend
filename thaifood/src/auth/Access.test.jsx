import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import RequireRole from '../components/RequireRole';
import { useAuth } from './AuthContext';

jest.mock('./AuthContext', () => ({ useAuth: jest.fn() }));
function LoginDestination() {
  const location = useLocation();
  return <p>Login destination: {location.state?.from?.pathname}</p>;
}
function renderGuard(guard, auth) {
  useAuth.mockReturnValue(auth);
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/private?tab=saved']}><Routes>
    <Route path="/login" element={<LoginDestination />} />
    <Route element={guard}><Route path="/private" element={<p>Protected content</p>} /></Route>
  </Routes></MemoryRouter>);
}
test('guest is redirected to login with requested destination', () => {
  renderGuard(<ProtectedRoute />, { member: null, loading: false });
  expect(screen.getByText('Login destination: /private')).toBeInTheDocument();
  expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
});
test('member cannot see admin content', () => {
  renderGuard(<RequireRole />, { member: { role: 'member' }, loading: false });
  expect(screen.getByRole('heading', { name: /ไม่มีสิทธิ์/ })).toBeInTheDocument();
  expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
});
test('admin can access nested admin route', () => {
  renderGuard(<RequireRole />, { member: { role: 'admin' }, loading: false });
  expect(screen.getByText('Protected content')).toBeInTheDocument();
});
test('guard waits for session validation before revealing protected content', () => {
  renderGuard(<ProtectedRoute />, { member: { role: 'admin' }, loading: true });
  expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
});
