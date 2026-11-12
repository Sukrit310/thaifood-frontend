import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { validateDisplayName } from '../utils/validation';

export default function Profile() {
  const { member, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(member?.displayName || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    const invalid = validateDisplayName(displayName);
    if (invalid) { setError(invalid); return; }
    setBusy(true); setError(''); setSaved(false);
    try { await updateProfile({ displayName: displayName.trim() }); setSaved(true); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="container py-12"><div className="mx-auto max-w-xl"><p className="eyebrow">MY ACCOUNT</p><h1 className="page-heading">โปรไฟล์ของฉัน</h1>
    <div className="panel p-6 md:p-8 mt-7"><div className="flex items-center gap-4 mb-7"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-900 text-xl font-bold" aria-hidden="true">{member?.displayName?.slice(0, 1)}</span><div><p className="font-semibold">{member?.displayName}</p><p className="muted text-sm">{member?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก ThaiFood Guide'}</p></div></div>
      <form noValidate onSubmit={submit} className="space-y-5"><div className="field"><label htmlFor="profile-email">อีเมล</label><input className="input" id="profile-email" type="email" value={member?.email || ''} readOnly /><p className="muted text-xs">อีเมลใช้สำหรับเข้าสู่ระบบและยังแก้ไขไม่ได้</p></div>
        <div className="field"><label htmlFor="profile-name">ชื่อที่แสดง</label><input className="input" id="profile-name" autoComplete="nickname" value={displayName} onChange={event => { setDisplayName(event.target.value); setSaved(false); }} required /></div>
        {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}{saved && <p role="status" className="text-green-800">บันทึกโปรไฟล์แล้ว</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึกการเปลี่ยนแปลง'}</button>
      </form><div className="mt-7 pt-5 border-t"><Link className="text-green-800 underline font-semibold text-sm" to="/change-password">เปลี่ยนรหัสผ่าน</Link></div>
    </div></div></section>;
}
