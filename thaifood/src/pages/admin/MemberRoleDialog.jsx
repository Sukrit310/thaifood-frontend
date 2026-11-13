import { useEffect, useRef, useState } from 'react';
import { adminService } from '../../api/services';
import { ApiError } from '../../api/backend';
import { AdminFeedback } from './AdminUI';

function roleError(error) {
  if (error.code === 'INVALID_RESPONSE') return 'เซิร์ฟเวอร์ส่งข้อมูลไม่ถูกต้อง กรุณาปิดหน้าต่างแล้วโหลดรายชื่อใหม่';
  if (error.code === 'LAST_ADMIN') return 'ต้องมีผู้ดูแลระบบเหลืออย่างน้อย 1 คน ไม่สามารถลดสิทธิ์บัญชีนี้ได้';
  if (error.status === 400) return 'ข้อมูลสิทธิ์ไม่ถูกต้อง กรุณาเลือกสิทธิ์แล้วลองอีกครั้ง';
  if (error.status === 401) return 'กรุณาเข้าสู่ระบบใหม่เพื่อเปลี่ยนสิทธิ์';
  if (error.status === 403) return 'คุณไม่มีสิทธิ์เปลี่ยนสิทธิ์บัญชีนี้ กรุณาตรวจสอบสิทธิ์ของคุณ';
  if (error.status === 404) return 'ไม่พบบัญชีนี้ กรุณาปิดหน้าต่างแล้วโหลดรายชื่อใหม่';
  if (error.status === 0) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบเครือข่ายแล้วลองอีกครั้ง';
  return 'เปลี่ยนสิทธิ์ไม่สำเร็จ กรุณาลองอีกครั้ง';
}

export default function MemberRoleDialog({ member, returnFocus, onDismiss, onSaved }) {
  const dialog = useRef(null), cancel = useRef(null), pending = useRef(false);
  const [role, setRole] = useState(member.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = dialog.current, overflow = document.body.style.overflow;
    element.showModal(); cancel.current?.focus(); document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = overflow; if (returnFocus?.isConnected) returnFocus.focus(); };
  }, [returnFocus]);

  async function submit(event) {
    event.preventDefault();
    if (pending.current || role === member.role || !['member', 'admin'].includes(role)) return;
    pending.current = true; setSaving(true); setError('');
    try {
      const updated = await adminService.updateMemberRole(member.id, role);
      if (!updated || String(updated.id) !== String(member.id) || updated.role !== role) throw new ApiError(502, 'INVALID_RESPONSE', 'Invalid member role response');
      onSaved(updated);
    } catch (failure) { setError(roleError(failure)); setAttempt(value => value + 1); }
    finally { pending.current = false; setSaving(false); }
  }

  return <dialog ref={dialog} className="admin-role-dialog" aria-labelledby="member-role-title" aria-describedby="member-role-hint" aria-modal="true" onCancel={event => { event.preventDefault(); if (!pending.current) onDismiss(); }}>
    <form onSubmit={submit} aria-busy={saving}>
      <header><h2 id="member-role-title" className="admin-section-heading">เปลี่ยนสิทธิ์สมาชิก</h2><p id="member-role-hint" className="admin-hint">ตรวจสอบบัญชีและเลือกสิทธิ์ใหม่ก่อนยืนยัน</p></header>
      <dl className="admin-role-details"><div><dt>ชื่อที่แสดง</dt><dd>{member.displayName}</dd></div><div><dt>อีเมล</dt><dd>{member.email}</dd></div><div><dt>สิทธิ์ปัจจุบัน</dt><dd>{member.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก'}</dd></div></dl>
      <div className="field"><label htmlFor="member-role">สิทธิ์ใหม่</label><select className="input" id="member-role" value={role} disabled={saving} aria-describedby={role === 'admin' && member.role !== 'admin' ? 'member-role-warning' : 'member-role-hint'} onChange={event => { if (!pending.current) { setRole(event.target.value); setError(''); } }}><option value="member">สมาชิก (Member)</option><option value="admin">ผู้ดูแลระบบ (Admin)</option></select></div>
      {role === 'admin' && member.role !== 'admin' && <p className="admin-role-warning" id="member-role-warning" role="note">บัญชีนี้จะจัดการร้านอาหาร รีวิว และสิทธิ์ของสมาชิกได้ โปรดยืนยันว่าเป็นผู้ที่ควรได้รับสิทธิ์ผู้ดูแลระบบ</p>}
      {role === 'member' && member.role === 'admin' && <p className="admin-hint">บัญชีนี้จะใช้งานส่วนสมาชิกได้ แต่จะจัดการระบบไม่ได้ตั้งแต่คำขอถัดไป</p>}
      <AdminFeedback id="member-role-error" message={error} attempt={attempt} />
      <footer className="admin-role-actions"><button ref={cancel} type="button" className="btn btn-secondary" disabled={saving} onClick={onDismiss}>ยกเลิก</button><button type="submit" className="btn btn-primary" disabled={saving || role === member.role || !['member', 'admin'].includes(role)}>{saving ? 'กำลังเปลี่ยนสิทธิ์…' : 'ยืนยันการเปลี่ยนสิทธิ์'}</button></footer>
    </form>
  </dialog>;
}
