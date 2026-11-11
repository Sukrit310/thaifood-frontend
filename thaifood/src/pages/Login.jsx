import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isMockMode } from '../api/backend';

export default function Login() {
  const { member, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const from = location.state?.from;
  const pathname = typeof from?.pathname === 'string' ? from.pathname : '';
  const destination = pathname.startsWith('/') && !pathname.startsWith('//') && !pathname.includes('\\') && !['/login', '/register'].includes(pathname)
    ? `${pathname}${typeof from.search === 'string' ? from.search : ''}${typeof from.hash === 'string' ? from.hash : ''}` : '/';
  if (member) return <Navigate to={destination} replace />;
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || !form.password) { setError('กรุณากรอกอีเมลที่ถูกต้องและรหัสผ่าน'); return; }
    setBusy(true); setError('');
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate(destination, { replace: true });
    } catch (failure) { setError(failure.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง'); }
    finally { setBusy(false); }
  }
  return <section className="container py-12 md:py-20"><div className="mx-auto max-w-md panel p-6 md:p-9">
    <p className="eyebrow">WELCOME BACK</p><h1 className="page-heading">กลับมาอร่อยกันต่อ</h1>
    <p className="muted mb-7">เข้าสู่ระบบเพื่อบันทึกร้านโปรดและแบ่งปันรีวิว</p>
    {location.state?.registered && <p role="status" className="mb-5 rounded-lg bg-green-50 p-3 text-green-900">สร้างบัญชีแล้ว เข้าสู่ระบบได้เลย</p>}
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="field"><label htmlFor="login-email">อีเมล</label><input className="input" id="login-email" name="email" type="email" autoComplete="email" value={form.email} onChange={change} required /></div>
      <div className="field"><label htmlFor="login-password">รหัสผ่าน</label><input className="input" id="login-password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={change} required /></div>
      {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
      <button className="btn btn-primary w-full" type="submit" disabled={busy}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
    </form>
    <p className="mt-6 text-sm text-center muted">ยังไม่มีบัญชี? <Link className="font-semibold text-green-800 underline" to="/register" state={{ from: location.state?.from }}>สมัครสมาชิก</Link></p>
    {isMockMode && <aside className="mt-7 border-t pt-5 text-xs muted leading-relaxed"><strong>บัญชีทดลองในโหมด Mock</strong><p>สมาชิก: demo@example.com</p><p>ผู้ดูแล: admin@example.com</p><p>รหัสผ่านทั้งสองบัญชี: ExamplePassword123</p></aside>}
  </div></section>;
}
