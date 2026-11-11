import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../api/services';

export default function ChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const change = event => { setForm(current => ({ ...current, [event.target.name]: event.target.value })); setSaved(false); };
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    if (!form.currentPassword || form.newPassword.length < 8) { setError('กรอกรหัสผ่านเดิมและรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร'); return; }
    if (form.newPassword !== form.confirmPassword) { setError('รหัสผ่านใหม่และยืนยันรหัสผ่านต้องตรงกัน'); return; }
    if (form.currentPassword === form.newPassword) { setError('กรุณาเลือกรหัสผ่านใหม่ที่ต่างจากเดิม'); return; }
    setBusy(true); setError(''); setSaved(false);
    try { await authService.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }); setForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setSaved(true); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="container py-12"><div className="mx-auto max-w-md"><Link className="text-sm muted underline" to="/profile">กลับโปรไฟล์</Link><h1 className="page-heading mt-4">เปลี่ยนรหัสผ่าน</h1><div className="panel p-6 md:p-8 mt-7"><form noValidate onSubmit={submit} className="space-y-5">
    <div className="field"><label htmlFor="current-password">รหัสผ่านเดิม</label><input className="input" id="current-password" name="currentPassword" type="password" autoComplete="current-password" value={form.currentPassword} onChange={change} required /></div>
    <div className="field"><label htmlFor="new-password">รหัสผ่านใหม่</label><input className="input" id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} value={form.newPassword} onChange={change} required /><p className="text-xs muted">อย่างน้อย 8 ตัวอักษร</p></div>
    <div className="field"><label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</label><input className="input" id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={change} required /></div>
    {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}{saved && <p role="status" className="text-green-800">เปลี่ยนรหัสผ่านแล้ว</p>}
    <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'เปลี่ยนรหัสผ่าน'}</button>
  </form></div></div></section>;
}
