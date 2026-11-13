import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { utf8ByteLength, validateDisplayName, validateNewPassword } from '../utils/validation';
import { AccountAuthLayout, AccountError } from '../components/AccountLayout';

export default function Register() {
  const { member, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (member) return <Navigate to="/" replace />;
  const change = event => { setForm(current => ({ ...current, [event.target.name]: event.target.value })); setError(''); };
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setAttempt(current => current + 1);
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
  const nameInvalid = Boolean(error) && error === validateDisplayName(form.displayName);
  const emailInvalid = error === 'กรุณากรอกอีเมลที่ถูกต้อง' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const passwordInvalid = Boolean(error) && error === validateNewPassword(form.password);
  const confirmInvalid = error === 'รหัสผ่านและยืนยันรหัสผ่านต้องตรงกัน' && form.password !== form.confirmPassword;
  return <AccountAuthLayout>
    <header><p className="eyebrow">JOIN THE TABLE</p><h1 className="account-heading">มื้อดี ๆ เริ่มที่นี่</h1><p className="account-description">สร้างบัญชีเพื่อเก็บร้านที่อยากไปและเล่ามื้อที่ประทับใจ</p></header>
    <form noValidate onSubmit={submit} className="account-form" aria-busy={busy}>
      <div className="field"><label htmlFor="register-name">ชื่อที่แสดง</label><input className="input" id="register-name" name="displayName" autoComplete="nickname" value={form.displayName} onChange={change} disabled={busy} aria-invalid={nameInvalid || undefined} aria-describedby={nameInvalid ? 'register-error' : undefined} required /></div>
      <div className="field"><label htmlFor="register-email">อีเมล</label><input className="input" id="register-email" name="email" type="email" autoComplete="email" value={form.email} onChange={change} disabled={busy} aria-invalid={emailInvalid || undefined} aria-describedby={emailInvalid ? 'register-error' : undefined} required /></div>
      <div className="field"><label htmlFor="register-password">รหัสผ่าน</label><input className="input" id="register-password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={change} disabled={busy} aria-invalid={passwordInvalid || undefined} aria-describedby={`register-password-hint${passwordInvalid ? ' register-error' : ''}`} required /><p id="register-password-hint" className="account-field-hint">{utf8ByteLength(form.password)} / 72 ไบต์ · ขั้นต่ำ 8 ไบต์ (ตัวอักษรไทยใช้หลายไบต์)</p></div>
      <div className="field"><label htmlFor="register-confirm">ยืนยันรหัสผ่าน</label><input className="input" id="register-confirm" name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={change} disabled={busy} aria-invalid={confirmInvalid || undefined} aria-describedby={confirmInvalid ? 'register-error' : undefined} required /></div>
      <AccountError id="register-error" message={error} attempt={attempt} />
      <button className="btn btn-primary account-submit" type="submit" disabled={busy}>{busy ? 'กำลังสร้างบัญชี…' : 'สร้างบัญชี'}</button>
    </form><p className="account-switch">มีบัญชีแล้ว? <Link className="account-link" to="/login" state={{ from: location.state?.from }}>เข้าสู่ระบบ</Link></p>
  </AccountAuthLayout>;
}
