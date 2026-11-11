import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '../api/services';
import { getToken, setToken } from '../api/backend';

jest.mock('../api/services', () => ({ authService: { me: jest.fn(), login: jest.fn(), register: jest.fn(), updateProfile: jest.fn() } }));
jest.mock('../api/backend', () => ({ getToken: jest.fn(), setToken: jest.fn() }));
function Probe() {
  const auth = useAuth();
  return <><p>{auth.loading ? 'loading' : auth.member?.displayName || 'guest'}</p>{auth.sessionError && <p role="alert">{auth.sessionError.message}</p>}<button onClick={auth.retrySession}>retry</button><button onClick={auth.logout}>logout</button><button onClick={() => auth.updateProfile({ displayName: 'Updated' })}>update</button></>;
}
beforeEach(() => { jest.clearAllMocks(); getToken.mockReturnValue(null); });
test('stored token is revalidated instead of trusting a cached user', async () => {
  getToken.mockReturnValue('stored-token');
  authService.me.mockResolvedValue({ id: 1, displayName: 'Verified', role: 'member' });
  render(<AuthProvider><Probe /></AuthProvider>);
  expect(screen.getByText('loading')).toBeInTheDocument();
  expect(await screen.findByText('Verified')).toBeInTheDocument();
  expect(authService.me).toHaveBeenCalledTimes(1);
});
test('temporary revalidation failure retains token and can retry', async () => {
  getToken.mockReturnValue('stored-token');
  authService.me.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ id: 1, displayName: 'Recovered', role: 'member' });
  render(<AuthProvider><Probe /></AuthProvider>);
  expect(await screen.findByRole('alert')).toHaveTextContent('offline');
  expect(setToken).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('retry'));
  expect(await screen.findByText('Recovered')).toBeInTheDocument();
});
test('401 event removes session immediately', async () => {
  getToken.mockReturnValue('stored-token');
  authService.me.mockResolvedValue({ id: 1, displayName: 'Verified', role: 'member' });
  render(<AuthProvider><Probe /></AuthProvider>);
  await screen.findByText('Verified');
  act(() => window.dispatchEvent(new Event('thaifood:unauthorized')));
  expect(screen.getByText('guest')).toBeInTheDocument();
  expect(setToken).toHaveBeenCalledWith(null);
});
test('profile update refreshes user in context', async () => {
  getToken.mockReturnValue('stored-token');
  authService.me.mockResolvedValue({ id: 1, displayName: 'Verified', role: 'member' });
  authService.updateProfile.mockResolvedValue({ id: 1, displayName: 'Updated', role: 'member' });
  render(<AuthProvider><Probe /></AuthProvider>);
  await screen.findByText('Verified');
  fireEvent.click(screen.getByText('update'));
  await waitFor(() => expect(screen.getByText('Updated')).toBeInTheDocument());
  expect(authService.updateProfile).toHaveBeenCalledWith({ displayName: 'Updated' });
});
test('profile response arriving after logout cannot restore a session', async () => {
  getToken.mockReturnValue('stored-token');
  authService.me.mockResolvedValue({ id: 1, displayName: 'Verified', role: 'member' });
  let resolveProfile;
  authService.updateProfile.mockReturnValue(new Promise(resolve => { resolveProfile = resolve; }));
  render(<AuthProvider><Probe /></AuthProvider>);
  await screen.findByText('Verified');
  fireEvent.click(screen.getByText('update'));
  fireEvent.click(screen.getByText('logout'));
  await act(async () => { resolveProfile({ id: 1, displayName: 'Late response', role: 'member' }); });
  expect(screen.getByText('guest')).toBeInTheDocument();
  expect(screen.queryByText('Late response')).not.toBeInTheDocument();
});
