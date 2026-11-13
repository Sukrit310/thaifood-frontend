import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { validateDisplayName } from '../utils/validation';
import { AccountError, AccountNav } from '../components/AccountLayout';

export default function Profile() {
  const { member, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(member?.displayName || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setAttempt(current => current + 1);
    const invalid = validateDisplayName(displayName);
    if (invalid) { setError(invalid); return; }
    setBusy(true); setError(''); setSaved(false);
    try { await updateProfile({ displayName: displayName.trim() }); setSaved(true); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  const nameInvalid = Boolean(error) && Boolean(validateDisplayName(displayName));
  return <section className="account-page account-settings-page"><div className="container account-settings-container">
    <header><p className="eyebrow">MY ACCOUNT</p><h1 className="account-heading">โปรไฟล์ของฉัน</h1>
      <p className="account-description">ชื่อที่ใช้ทักทาย และเล่าเรื่องมื้ออร่อยของคุณ</p></header>
    <AccountNav />
    <div className="panel account-settings-panel"><div className="account-profile-summary">
      <span className="account-avatar" aria-hidden="true">{Array.from(member?.displayName || '')[0]}</span>
      <div className="account-profile-identity"><p className="account-profile-name">{member?.displayName}</p><p className="account-profile-role">{member?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก ThaiFood Guide'}</p></div>
    </div>
      <form noValidate onSubmit={submit} className="account-form" aria-busy={busy}>
        <div className="field"><label htmlFor="profile-email">อีเมล</label><input className="input" id="profile-email" type="email" value={member?.email || ''} aria-describedby="profile-email-hint" readOnly /><p id="profile-email-hint" className="account-field-hint">อีเมลใช้สำหรับเข้าสู่ระบบและยังแก้ไขไม่ได้</p></div>
        <div className="field"><label htmlFor="profile-name">ชื่อที่แสดง</label><input className="input" id="profile-name" autoComplete="nickname" value={displayName} onChange={event => { setDisplayName(event.target.value); setSaved(false); setError(''); }} disabled={busy} aria-invalid={nameInvalid || undefined} aria-describedby={nameInvalid ? 'profile-error' : undefined} required /></div>
        <AccountError id="profile-error" message={error} attempt={attempt} />{saved && <p role="status" className="notice account-feedback">บันทึกโปรไฟล์แล้ว</p>}
        <button type="submit" className="btn btn-primary account-submit" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึกการเปลี่ยนแปลง'}</button>
      </form>
    </div></div></section>;
}
