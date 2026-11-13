import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminMembers from './AdminMembers';
import { adminService } from '../../api/services';
import { useAuth } from '../../auth/AuthContext';

jest.mock('../../api/services', () => ({ adminService: { members: jest.fn(), updateMemberRole: jest.fn() } }));
jest.mock('../../auth/AuthContext', () => ({ useAuth: jest.fn() }));

const actor = { id: 8, displayName: 'ผู้ดูแลปัจจุบัน', email: 'admin@example.invalid', role: 'admin' };
const member = { id: 7, displayName: 'นักชิม', email: 'member@example.invalid', role: 'member' };
const otherAdmin = { id: 9, displayName: 'ผู้ดูแลอีกคน', email: 'other@example.invalid', role: 'admin' };
let directory, showModalDescriptor, closeDescriptor;
beforeAll(() => {
  const proto = window.HTMLDialogElement.prototype;
  showModalDescriptor = Object.getOwnPropertyDescriptor(proto, 'showModal');
  closeDescriptor = Object.getOwnPropertyDescriptor(proto, 'close');
  // JSDOM has no top layer. Browser QA verifies native trapping/Escape separately.
  Object.defineProperty(proto, 'showModal', { configurable: true, value() { this.setAttribute('open', ''); } });
  Object.defineProperty(proto, 'close', { configurable: true, value() { this.removeAttribute('open'); } });
});
afterAll(() => {
  const proto = window.HTMLDialogElement.prototype;
  if (showModalDescriptor) Object.defineProperty(proto, 'showModal', showModalDescriptor); else delete proto.showModal;
  if (closeDescriptor) Object.defineProperty(proto, 'close', closeDescriptor); else delete proto.close;
});
beforeEach(() => {
  jest.clearAllMocks();
  directory = [member, actor, otherAdmin].map(m => ({ ...m }));
  useAuth.mockReturnValue({ member: actor });
  adminService.members.mockImplementation(async () => ({ items: directory.map(m => ({ ...m })) }));
  adminService.updateMemberRole.mockImplementation(async (id, role) => {
    directory = directory.map(m => m.id === id ? { ...m, role } : m);
    return directory.find(m => m.id === id);
  });
});
function mount() { return render(<div className="admin-page"><AdminMembers /></div>); }
function row(name) { return screen.getByRole('rowheader', { name, exact: true }).closest('tr'); }
async function edit(name = member.displayName) {
  const button = await screen.findByRole('button', { name: `เปลี่ยนสิทธิ์ ${name}`, exact: true });
  button.focus(); fireEvent.click(button);
  return screen.findByRole('dialog', { name: 'เปลี่ยนสิทธิ์สมาชิก' });
}
function choose(dialog, role) { fireEvent.change(within(dialog).getByLabelText('สิทธิ์ใหม่'), { target: { value: role } }); }
function confirm(dialog) { fireEvent.click(within(dialog).getByRole('button', { name: 'ยืนยันการเปลี่ยนสิทธิ์', exact: true })); }

test('directory retains native rows/count and explains why the current account has no role action', async () => {
  mount(); await screen.findByText('3 คน');
  expect(screen.getByRole('columnheader', { name: 'จัดการ' })).toBeInTheDocument();
  expect(within(row(actor.displayName)).getByText('บัญชีของคุณ')).toBeInTheDocument();
  expect(within(row(actor.displayName)).queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^เปลี่ยนสิทธิ์ / })).toHaveLength(2);
});

test('dialog names its target, current role and labeled options; unchanged role cannot submit', async () => {
  mount(); const dialog = await edit(); const d = within(dialog);
  expect(d.getByText(member.displayName)).toBeInTheDocument();
  expect(d.getByText(member.email)).toBeInTheDocument();
  expect(d.getByText('สิทธิ์ปัจจุบัน')).toBeInTheDocument();
  expect(d.getByLabelText('สิทธิ์ใหม่')).toHaveValue('member');
  expect(d.getByRole('option', { name: 'สมาชิก (Member)' })).toHaveValue('member');
  expect(d.getByRole('option', { name: 'ผู้ดูแลระบบ (Admin)' })).toHaveValue('admin');
  expect(d.getByRole('button', { name: 'ยืนยันการเปลี่ยนสิทธิ์' })).toBeDisabled();
  expect(d.getByRole('button', { name: 'ยกเลิก' })).toHaveFocus();
  fireEvent.submit(dialog.querySelector('form'));
  choose(dialog, 'admin'); choose(dialog, 'member'); fireEvent.submit(dialog.querySelector('form'));
  expect(adminService.updateMemberRole).not.toHaveBeenCalled();
});

test.each([
  [member, 'admin', 'ผู้ดูแลระบบ'], [otherAdmin, 'member', 'สมาชิก'],
])('confirmed role change for $displayName reloads the saved role and announces success', async (target, role, label) => {
  mount(); const dialog = await edit(target.displayName); choose(dialog, role);
  if (role === 'admin') expect(within(dialog).getByText(/จัดการร้านอาหาร รีวิว และสิทธิ์ของสมาชิก/)).toBeInTheDocument();
  confirm(dialog);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(adminService.updateMemberRole).toHaveBeenCalledTimes(1);
  expect(adminService.updateMemberRole).toHaveBeenCalledWith(target.id, role);
  await waitFor(() => expect(within(row(target.displayName)).getByText(label, { exact: true })).toBeInTheDocument());
  expect(screen.getByRole('status')).toHaveTextContent(`เปลี่ยนสิทธิ์ของ ${target.displayName}`);
  expect(screen.getByRole('heading', { name: 'รายชื่อสมาชิก', exact: true })).toHaveFocus();
  expect(adminService.members).toHaveBeenCalledTimes(2);
});

test.each(['cancel', 'Escape'])('%s dismisses without a request and returns focus to the same action', async how => {
  mount(); const dialog = await edit(); choose(dialog, 'admin');
  if (how === 'cancel') fireEvent.click(within(dialog).getByRole('button', { name: 'ยกเลิก' }));
  else fireEvent(dialog, new Event('cancel', { cancelable: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(adminService.updateMemberRole).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: `เปลี่ยนสิทธิ์ ${member.displayName}`, exact: true })).toHaveFocus();
  expect(within(row(member.displayName)).getByText('สมาชิก', { exact: true })).toBeInTheDocument();
});

test('pending write locks controls and Escape; two rapid submissions produce only one PATCH', async () => {
  let resolve; adminService.updateMemberRole.mockReturnValue(new Promise(yes => { resolve = yes; }));
  mount(); const dialog = await edit(); choose(dialog, 'admin');
  fireEvent.submit(dialog.querySelector('form')); fireEvent.submit(dialog.querySelector('form'));
  expect(adminService.updateMemberRole).toHaveBeenCalledTimes(1);
  expect(within(dialog).getByRole('button', { name: 'กำลังเปลี่ยนสิทธิ์…' })).toBeDisabled();
  expect(within(dialog).getByRole('button', { name: 'ยกเลิก' })).toBeDisabled();
  expect(within(dialog).getByLabelText('สิทธิ์ใหม่')).toBeDisabled();
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(dialog).toBeInTheDocument();
  expect(within(row(member.displayName)).getByText('สมาชิก', { exact: true })).toBeInTheDocument();
  await act(async () => {
    directory = directory.map(m => m.id === member.id ? { ...m, role: 'admin' } : m);
    resolve({ ...member, role: 'admin' });
  });
  await waitFor(() => expect(within(row(member.displayName)).getByText('ผู้ดูแลระบบ')).toBeInTheDocument());
});

test.each([
  [400, 'VALIDATION_ERROR', 'ข้อมูลสิทธิ์ไม่ถูกต้อง'],
  [403, 'FORBIDDEN', 'ไม่มีสิทธิ์'],
  [404, 'NOT_FOUND', 'ไม่พบบัญชี'],
  [409, 'LAST_ADMIN', 'ผู้ดูแลระบบเหลืออย่างน้อย 1 คน'],
  [500, 'INTERNAL_ERROR', 'ลองอีกครั้ง'],
  [0, 'NETWORK_ERROR', 'เชื่อมต่อ'],
])('HTTP %s failure stays in dialog, focuses feedback and leaves the saved role untouched', async (status, code, text) => {
  adminService.updateMemberRole.mockRejectedValue(Object.assign(new Error('Backend error'), { status, code }));
  mount(); const dialog = await edit(); choose(dialog, 'admin'); confirm(dialog);
  const feedback = await within(dialog).findByRole('alert');
  expect(feedback).toHaveTextContent(text); expect(feedback).toHaveFocus();
  expect(within(dialog).getByLabelText('สิทธิ์ใหม่')).toHaveValue('admin');
  expect(within(dialog).getByRole('button', { name: 'ยืนยันการเปลี่ยนสิทธิ์' })).toBeEnabled();
  expect(within(row(member.displayName)).getByText('สมาชิก', { exact: true })).toBeInTheDocument();
  expect(adminService.members).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('a failed mutation can be retried successfully without closing the dialog', async () => {
  adminService.updateMemberRole.mockRejectedValueOnce(Object.assign(new Error('Unavailable'), { status: 500 }));
  mount(); const dialog = await edit(); choose(dialog, 'admin'); confirm(dialog);
  await within(dialog).findByRole('alert'); confirm(dialog);
  await waitFor(() => expect(within(row(member.displayName)).getByText('ผู้ดูแลระบบ')).toBeInTheDocument());
  expect(adminService.updateMemberRole).toHaveBeenCalledTimes(2);
});

test.each([null, { ...member, id: 999, role: 'admin' }, { ...member, role: 'member' }])('invalid successful role response %j cannot announce or display an unconfirmed change', async result => {
  adminService.updateMemberRole.mockResolvedValueOnce(result);
  mount(); const dialog = await edit(); choose(dialog, 'admin'); confirm(dialog);
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('เซิร์ฟเวอร์ส่งข้อมูลไม่ถูกต้อง');
  expect(within(row(member.displayName)).getByText('สมาชิก', { exact: true })).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(adminService.members).toHaveBeenCalledTimes(1);
});

test('a failed list re-fetch reports its own error and retry retrieves the saved server role', async () => {
  mount(); const dialog = await edit(); choose(dialog, 'admin');
  adminService.members.mockRejectedValueOnce(new Error('โหลดรายชื่อสมาชิกไม่สำเร็จ')); confirm(dialog);
  expect(await screen.findByRole('alert')).toHaveTextContent('โหลดรายชื่อสมาชิกไม่สำเร็จ');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(`เปลี่ยนสิทธิ์ของ ${member.displayName}`);
  fireEvent.click(screen.getByRole('button', { name: 'ลองอีกครั้ง' }));
  await waitFor(() => expect(within(row(member.displayName)).getByText('ผู้ดูแลระบบ')).toBeInTheDocument());
  expect(adminService.updateMemberRole).toHaveBeenCalledTimes(1);
});
