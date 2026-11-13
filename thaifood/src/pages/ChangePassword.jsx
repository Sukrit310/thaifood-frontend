import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../api/services';
import { utf8ByteLength, validateCurrentPassword, validateNewPassword } from '../utils/validation';
import { AccountError, AccountNav } from '../components/AccountLayout';

export default function ChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const change = event => { setForm(current => ({ ...current, [event.target.name]: event.target.value })); setSaved(false); setError(''); };
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setAttempt(current => current + 1);
    const invalid = validateCurrentPassword(form.currentPassword) || validateNewPassword(form.newPassword);
    if (invalid) { setError(invalid); return; }
    if (form.newPassword !== form.confirmPassword) { setError('รหัสผ่านใหม่และยืนยันรหัสผ่านต้องตรงกัน'); return; }
    if (form.currentPassword === form.newPassword) { setError('กรุณาเลือกรหัสผ่านใหม่ที่ต่างจากเดิม'); return; }
    setBusy(true); setError(''); setSaved(false);
    try { await authService.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }); setForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setSaved(true); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  const currentInvalid = Boolean(error) && error === validateCurrentPassword(form.currentPassword);
  const newInvalid = Boolean(error) && (error === validateNewPassword(form.newPassword) || (error === 'กรุณาเลือกรหัสผ่านใหม่ที่ต่างจากเดิม' && form.currentPassword === form.newPassword));
  const confirmInvalid = error === 'รหัสผ่านใหม่และยืนยันรหัสผ่านต้องตรงกัน' && form.newPassword !== form.confirmPassword;
  return <section className="account-page account-settings-page"><div className="container account-settings-container">
    <header><p className="eyebrow">ACCOUNT SECURITY</p><h1 className="account-heading">เปลี่ยนรหัสผ่าน</h1><p className="account-description">เลือกรหัสผ่านใหม่ที่ต่างจากเดิม เพื่อดูแลบัญชีของคุณ</p></header>
    <AccountNav />
    <div className="panel account-settings-panel"><form noValidate onSubmit={submit} className="account-form" aria-busy={busy}>
      <div className="field"><label htmlFor="current-password">รหัสผ่านเดิม</label><input className="input" id="current-password" name="currentPassword" type="password" autoComplete="current-password" value={form.currentPassword} onChange={change} disabled={busy} aria-invalid={currentInvalid || undefined} aria-describedby={currentInvalid ? 'password-error' : undefined} required /></div>
      <div className="field"><label htmlFor="new-password">รหัสผ่านใหม่</label><input className="input" id="new-password" name="newPassword" type="password" autoComplete="new-password" value={form.newPassword} onChange={change} disabled={busy} aria-invalid={newInvalid || undefined} aria-describedby={`new-password-hint${newInvalid ? ' password-error' : ''}`} required /><p id="new-password-hint" className="account-field-hint">{utf8ByteLength(form.newPassword)} / 72 ไบต์ · ขั้นต่ำ 8 ไบต์ (ตัวอักษรไทยใช้หลายไบต์)</p></div>
      <div className="field"><label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</label><input className="input" id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={change} disabled={busy} aria-invalid={confirmInvalid || undefined} aria-describedby={confirmInvalid ? 'password-error' : undefined} required /></div>
      <AccountError id="password-error" message={error} attempt={attempt} />{saved && <p role="status" className="notice account-feedback">เปลี่ยนรหัสผ่านแล้ว</p>}
      <button type="submit" className="btn btn-primary account-submit" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'เปลี่ยนรหัสผ่าน'}</button>
    </form></div>
    <Link className="account-link account-back-link" to="/profile">กลับโปรไฟล์</Link>
  </div></section>;
}
