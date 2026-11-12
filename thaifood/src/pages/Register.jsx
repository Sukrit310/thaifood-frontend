import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { utf8ByteLength, validateDisplayName, validateNewPassword } from '../utils/validation';

export default function Register() {
  const { member, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (member) return <Navigate to="/" replace />;
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('กรุณากรอกอีเมลที่ถูกต้อง'); return; }
    const invalid = validateDisplayName(form.displayName) || validateNewPassword(form.password);
    if (invalid) { setError(invalid); return; }
    if (form.password !== form.confirmPassword) { setError('รหัสผ่านและยืนยันรหัสผ่านต้องตรงกัน'); return; }
    setBusy(true); setError('');
    try {
      await register({ displayName: form.displayName.trim(), email: form.email.trim(), password: form.password });
      navigate('/login', { replace: true, state: { registered: true, from: location.state?.from } });
    } catch (failure) { setError(failure.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองอีกครั้ง'); }
    finally { setBusy(false); }
  }
  return <section className="container py-12 md:py-20"><div className="mx-auto max-w-md panel p-6 md:p-9">
    <p className="eyebrow">JOIN THE TABLE</p><h1 className="page-heading">มื้อดี ๆ เริ่มที่นี่</h1><p className="muted mb-7">สร้างบัญชีเพื่อเก็บร้านที่อยากไปและเล่ามื้อที่ประทับใจ</p>
    <form noValidate onSubmit={submit} className="space-y-5">
      <div className="field"><label htmlFor="register-name">ชื่อที่แสดง</label><input className="input" id="register-name" name="displayName" autoComplete="nickname" value={form.displayName} onChange={change} required /></div>
      <div className="field"><label htmlFor="register-email">อีเมล</label><input className="input" id="register-email" name="email" type="email" autoComplete="email" value={form.email} onChange={change} required /></div>
      <div className="field"><label htmlFor="register-password">รหัสผ่าน</label><input className="input" id="register-password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={change} aria-describedby="register-password-hint" required /><p id="register-password-hint" className="muted text-xs">{utf8ByteLength(form.password)} / 72 ไบต์ · ขั้นต่ำ 8 ไบต์ (ตัวอักษรไทยใช้หลายไบต์)</p></div>
      <div className="field"><label htmlFor="register-confirm">ยืนยันรหัสผ่าน</label><input className="input" id="register-confirm" name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={change} required /></div>
      {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
      <button className="btn btn-primary w-full" type="submit" disabled={busy}>{busy ? 'กำลังสร้างบัญชี…' : 'สร้างบัญชี'}</button>
    </form><p className="mt-6 text-center text-sm muted">มีบัญชีแล้ว? <Link className="font-semibold text-green-800 underline" to="/login" state={{ from: location.state?.from }}>เข้าสู่ระบบ</Link></p>
  </div></section>;
}
