import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isMockMode } from '../api/backend';
import './Layout.css';

const DESKTOP_MEDIA = '(min-width: 1024px)';

function Brand() {
  return <Link to="/" className="layout-brand" aria-label="ThaiFood หน้าแรก">
    <svg className="layout-brand-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
      <path d="M9 21h22c-1 7-5 11-11 11S10 28 9 21Z" fill="currentColor" />
      <path d="M8 20h24M15 15c-3-3 3-4 0-7m6 7c-3-3 3-4 0-7m6 7c-3-3 3-4 0-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
    <span>ThaiFood<span className="layout-brand-dot">.</span></span>
  </Link>;
}

export default function Layout() {
  const { member, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);
  const headerFocus = useRef(null);
  const menuRef = useRef(null);
  const toggleRef = useRef(null);
  const mainRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo?.(0, 0); }, [location.pathname]);
  useEffect(() => {
    if (menuRef.current?.contains(document.activeElement) && window.matchMedia && !window.matchMedia(DESKTOP_MEDIA).matches) {
      mainRef.current?.focus({ preventScroll: true });
    }
    setMenuOpen(false);
  }, [location.key]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKeyDown(event) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMenuOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
    }
    function onPointerDown(event) {
      if (!headerRef.current?.contains(event.target)) { headerFocus.current = null; setMenuOpen(false); }
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const viewport = window.matchMedia(DESKTOP_MEDIA);
    function onViewportChange(event) {
      // CSS can blur a hidden control before the media event reaches this handler.
      const focused = document.activeElement === document.body ? headerFocus.current : document.activeElement;
      setMenuOpen(false);
      if (event.matches && focused === toggleRef.current) menuRef.current?.querySelector('a')?.focus({ preventScroll: true });
      else if (!event.matches && menuRef.current?.contains(focused)) toggleRef.current?.focus({ preventScroll: true });
    }
    viewport.addEventListener('change', onViewportChange);
    return () => viewport.removeEventListener('change', onViewportChange);
  }, []);

  function signOut() { logout(); navigate('/'); }
  function onHeaderBlur(event) {
    const next = event.relatedTarget instanceof Element ? event.relatedTarget : null;
    if (!headerRef.current?.contains(next) && (next || event.target.getClientRects().length)) headerFocus.current = null;
  }
  return <div className="app-shell">
    <a className="layout-skip-link" href="#main-content">ข้ามไปยังเนื้อหา</a>
    <header className="layout-header" ref={headerRef} onFocusCapture={event => { headerFocus.current = event.target; }} onBlurCapture={onHeaderBlur}>
      <div className="container layout-header-inner">
        <Brand />
        <button type="button" className="btn btn-secondary layout-menu-toggle" ref={toggleRef} aria-label={menuOpen ? 'ปิดเมนูหลัก' : 'เปิดเมนูหลัก'} aria-expanded={menuOpen} aria-controls="layout-navigation" onClick={() => setMenuOpen(open => !open)}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d={menuOpen ? 'M6 6l12 12M6 18 18 6' : 'M4 7h16M4 12h16M4 17h16'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" /></svg>
          <span>{menuOpen ? 'ปิดเมนู' : 'เมนู'}</span>
        </button>
        <div id="layout-navigation" className={'layout-navigation' + (menuOpen ? ' is-open' : '')} ref={menuRef}>
          <nav className="layout-main-nav" aria-label="เมนูหลัก">
            <NavLink end to="/">หน้าแรก</NavLink>
            <NavLink to="/restaurants">ค้นหาร้านอาหาร</NavLink>
            {member && <NavLink to="/favorites">ร้านโปรด</NavLink>}
            {member?.role === 'admin' && <NavLink to="/admin">จัดการระบบ</NavLink>}
          </nav>
          <div className="layout-account">
            {member ? <>
              <NavLink className="layout-profile-link" to="/profile" aria-label={'โปรไฟล์ของ ' + member.displayName} title={member.displayName}>
                <span className="layout-avatar" aria-hidden="true">{member.displayName.slice(0, 1)}</span>
                <span className="layout-profile-copy"><span>โปรไฟล์</span><strong>{member.displayName}</strong></span>
              </NavLink>
              <button type="button" className="text-button layout-signout" onClick={signOut}>ออกจากระบบ</button>
            </> : <>
              <Link className="layout-login-link" to="/login">เข้าสู่ระบบ</Link>
              <Link className="btn btn-primary" to="/register">สมัครสมาชิก <span aria-hidden="true">↗</span></Link>
            </>}
          </div>
        </div>
      </div>
    </header>

    {isMockMode && <div className="layout-demo-banner" role="note" aria-label="ข้อมูลสาธิต">
      <div className="container"><span className="layout-demo-dot" aria-hidden="true" /><p>ข้อมูลสาธิต · ร้านอาหารและรีวิวเป็นข้อมูลสมมติสำหรับทดลองใช้งาน</p></div>
    </div>}

    <main id="main-content" tabIndex={-1} ref={mainRef}><Outlet /></main>

    <footer className="layout-footer">
      <div className="container layout-footer-top">
        <div className="layout-footer-story"><Brand /><p className="layout-footer-tagline">ทุกจังหวัด มีเรื่องอร่อยให้ค้นพบ</p><p>ค้นพบรสชาติท้องถิ่น เก็บร้านที่อยากไป<br />และแบ่งปันมื้อที่ประทับใจ</p></div>
        <nav className="layout-footer-nav" aria-label="เมนูท้ายเว็บ"><h2>ออกไปอร่อยด้วยกัน</h2><Link to="/">หน้าแรก</Link><Link to="/restaurants">ค้นหาร้านอาหาร</Link>{member && <Link to="/favorites">ร้านโปรด</Link>}</nav>
        <nav className="layout-footer-nav" aria-label="บัญชีผู้ใช้ในท้ายเว็บ"><h2>มุมของคุณ</h2>{member ? <><Link to="/profile">โปรไฟล์ของฉัน</Link>{member.role === 'admin' && <Link to="/admin">จัดการระบบ</Link>}</> : <><Link to="/login">เข้าสู่ระบบ</Link><Link to="/register">สมัครสมาชิก</Link></>}</nav>
      </div>
      <div className="container layout-footer-bottom"><p>© {new Date().getFullYear()} ThaiFood. <span>โครงการแนะนำร้านอาหารทั่วประเทศไทย</span></p><p>ภาพประกอบสร้างสำหรับโครงการ · คะแนนจากรีวิวบนเว็บ</p></div>
    </footer>
  </div>;
}
