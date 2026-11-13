import { adminService, authService } from './services';
import { getToken, request, setToken } from './backend';
import { mockFetch, resetMockData } from '../mock/server';

let admin, member;
beforeEach(async () => {
  resetMockData(); setToken(null);
  member = await authService.login({ email: 'demo@example.com', password: 'ExamplePassword123' });
  admin = await authService.login({ email: 'admin@example.com', password: 'ExamplePassword123' });
  setToken(admin.token);
});
afterEach(() => setToken(null));
const patch = (id, body) => request(`/api/admin/members/${encodeURIComponent(id)}/role`, { method: 'PATCH', body });

test('promotion persists and gives an already-issued member JWT admin access on its next request', async () => {
  setToken(member.token);
  await expect(adminService.members()).rejects.toMatchObject({ status: 403 });
  setToken(admin.token);
  const updated = await adminService.updateMemberRole(member.member.id, 'admin');
  expect(updated).toEqual({ ...member.member, role: 'admin' });
  expect((await adminService.members()).items.find(m => m.id === updated.id)).toEqual(updated);
  setToken(member.token);
  expect((await adminService.members()).items).toEqual(expect.arrayContaining([admin.member, updated]));
  expect(await authService.me()).toEqual(updated);
});

test('demoting another admin revokes its existing JWT admin access while keeping member access', async () => {
  await adminService.updateMemberRole(member.member.id, 'admin');
  expect(await adminService.updateMemberRole(member.member.id, 'member')).toEqual(member.member);
  setToken(member.token);
  await expect(adminService.members()).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  expect(await authService.me()).toEqual(member.member);
  expect(getToken()).toBe(member.token);
});

test('an unchanged role on another account succeeds idempotently', async () => {
  expect(await adminService.updateMemberRole(member.member.id, 'member')).toEqual(member.member);
  expect(await adminService.updateMemberRole(member.member.id, 'member')).toEqual(member.member);
});

test.each(['admin', 'member'])('self-change is denied even when requesting %s; at least one admin remains', async role => {
  await expect(patch(admin.member.id, { role })).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  expect((await adminService.members()).items.filter(m => m.role === 'admin')).toEqual([admin.member]);
});

test('guest, member and invalid JWT cannot change roles', async () => {
  for (const [token, status] of [[null, 401], [member.token, 403], ['invalid-token', 401]]) {
    setToken(token);
    await expect(patch(member.member.id, { role: 'admin' })).rejects.toMatchObject({ status });
  }
  setToken(admin.token);
  expect((await adminService.members()).items.find(m => m.id === member.member.id).role).toBe('member');
});

test.each(['0', '-1', 'abc', '1.5', '7/role'])('invalid member ID %s is a validation error', async id => {
  await expect(patch(id, { role: 'admin' })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
});

test('an unknown positive member ID returns 404', async () => {
  await expect(patch(999999, { role: 'admin' })).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
});

test.each([
  undefined, null, [], {}, { role: null }, { role: 1 }, { role: true },
  { role: 'owner' }, { role: 'Admin' }, { role: ' admin ' }, { Role: 'admin' }, { role: 'admin', extra: true },
])('the role body must contain exactly one allowed string role: %j', async body => {
  await expect(patch(member.member.id, body)).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
  expect((await adminService.members()).items.find(m => m.id === member.member.id).role).toBe('member');
});

test('malformed JSON is rejected without modifying the member', async () => {
  const result = await mockFetch(`http://mock/api/admin/members/${member.member.id}/role`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${admin.token}` }, body: '{"role":',
  });
  expect(result.status).toBe(400);
  expect((await adminService.members()).items.find(m => m.id === member.member.id).role).toBe('member');
});

test('Register and Profile cannot accept a role field to elevate permissions', async () => {
  await expect(authService.register({ email: 'role-attack@example.invalid', displayName: 'ทดสอบ', password: 'ExamplePassword123', role: 'admin' })).rejects.toMatchObject({ status: 400 });
  setToken(member.token);
  await expect(authService.updateProfile({ displayName: 'ทดสอบ', role: 'admin' })).rejects.toMatchObject({ status: 400 });
  expect((await authService.me()).role).toBe('member');
});
