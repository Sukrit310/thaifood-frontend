import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import './AccountLayout.css';

const FALLBACK_IMAGE = '/images/hero-bowl.svg';

export function AccountAuthLayout({ children }) {
  return <section className="account-page account-auth-page"><div className="container account-auth-layout">
    <div className="panel account-auth-panel">{children}</div>
    <aside className="account-auth-story" aria-label="มื้ออร่อยในแบบของคุณ">
      <p className="eyebrow">A TABLE OF YOUR OWN</p>
      <p className="account-story-title">ร้านที่ถูกใจ<br />เก็บไว้ใกล้ตัว</p>
      <p className="muted">เก็บร้านที่อยากลอง แบ่งปันมื้อที่ประทับใจ<br />แล้วค่อย ๆ เติมเรื่องราวอร่อยในแบบของคุณ</p>
      <img className="account-story-image" src="/images/home-editorial/khao-soi-640.webp" width="640" height="640" loading="lazy" decoding="async" alt="" onError={event => {
        if (event.currentTarget.getAttribute('src') !== FALLBACK_IMAGE) event.currentTarget.src = FALLBACK_IMAGE;
      }} />
      <p className="account-story-caption">มื้อถัดไป อาจกลายเป็นร้านโปรดร้านใหม่</p>
    </aside>
  </div></section>;
}

export function AccountNav() {
  return <nav className="account-nav" aria-label="เมนูบัญชีผู้ใช้">
    <NavLink to="/profile" end>โปรไฟล์</NavLink>
    <NavLink to="/change-password">เปลี่ยนรหัสผ่าน</NavLink>
    <NavLink to="/favorites">ร้านโปรด</NavLink>
  </nav>;
}

export function AccountError({ id, message, attempt }) {
  const ref = useRef(null);
  useEffect(() => { if (message) ref.current?.focus(); }, [message, attempt]);
  return message ? <p id={id} ref={ref} className="form-error account-feedback" role="alert" tabIndex={-1}>{message}</p> : null;
}
