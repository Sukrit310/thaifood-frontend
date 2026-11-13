import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isMockMode } from '../api/backend';
import { validateCurrentPassword } from '../utils/validation';
import { AccountAuthLayout, AccountError } from '../components/AccountLayout';

export default function Login() {
  const { member, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const from = location.state?.from;
  const pathname = typeof from?.pathname === 'string' ? from.pathname : '';
  const destination = pathname.startsWith('/') && !pathname.startsWith('//') && !pathname.includes('\\') && !['/login', '/register'].includes(pathname)
    ? `${pathname}${typeof from.search === 'string' ? from.search : ''}${typeof from.hash === 'string' ? from.hash : ''}` : '/';
  if (member) return <Navigate to={destination} replace />;
  const change = event => { setForm(current => ({ ...current, [event.target.name]: event.target.value })); setError(''); };
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setAttempt(current => current + 1);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || !form.password) { setError('กรุณากรอกอีเมลที่ถูกต้องและรหัสผ่าน'); return; }
    const invalid = validateCurrentPassword(form.password);
    if (invalid) { setError(invalid); return; }
    setBusy(true); setError('');
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate(destination, { replace: true });
    } catch (failure) { setError(failure.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง'); }
    finally { setBusy(false); }
  }
  const emailInvalid = Boolean(error) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const passwordInvalid = Boolean(error) && Boolean(validateCurrentPassword(form.password));
  return <AccountAuthLayout>
    <header><p className="eyebrow">WELCOME BACK</p><h1 className="account-heading">กลับมาอร่อยกันต่อ</h1>
      <p className="account-description">เข้าสู่ระบบเพื่อบันทึกร้านโปรดและแบ่งปันรีวิว</p></header>
    {location.state?.registered && <p role="status" className="notice">สร้างบัญชีแล้ว เข้าสู่ระบบได้เลย</p>}
    <form onSubmit={submit} noValidate className="account-form" aria-busy={busy}>
      <div className="field"><label htmlFor="login-email">อีเมล</label><input className="input" id="login-email" name="email" type="email" autoComplete="email" value={form.email} onChange={change} disabled={busy} aria-invalid={emailInvalid || undefined} aria-describedby={emailInvalid ? 'login-error' : undefined} required /></div>
      <div className="field"><label htmlFor="login-password">รหัสผ่าน</label><input className="input" id="login-password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={change} disabled={busy} aria-invalid={passwordInvalid || undefined} aria-describedby={passwordInvalid ? 'login-error' : undefined} required /></div>
      <AccountError id="login-error" message={error} attempt={attempt} />
      <button className="btn btn-primary account-submit" type="submit" disabled={busy}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
    </form>
    <p className="account-switch">ยังไม่มีบัญชี? <Link className="account-link" to="/register" state={{ from: location.state?.from }}>สมัครสมาชิก</Link></p>
    {isMockMode && <aside className="account-mock-note"><strong>บัญชีทดลองในโหมด Mock</strong><p>สมาชิก: demo@example.com</p><p>ผู้ดูแล: admin@example.com</p><p>รหัสผ่านทั้งสองบัญชี: ExamplePassword123</p></aside>}
  </AccountAuthLayout>;
}
