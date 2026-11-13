import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import './Admin.css';

export default function AdminLayout() {
  const links = [['/admin', 'ภาพรวม'], ['/admin/restaurants', 'ร้านอาหาร'], ['/admin/reviews', 'รีวิว'], ['/admin/members', 'สมาชิก']];
  const icons = ['M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z', 'M4 8h16M6 8v12h12V8M8 4h8M10 12v4M14 12v4', 'M4 4h16v12H9l-5 4V4zM8 8h8M8 12h5', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'];
  return <section className="admin-page"><div className="container admin-shell">
    <aside className="admin-sidebar" aria-label="พื้นที่ผู้ดูแลระบบ"><div className="admin-sidebar-heading"><p className="admin-sidebar-title">พื้นที่ผู้ดูแลระบบ</p><span className="admin-role">ADMIN</span></div>
      <p className="admin-sidebar-note">ดูแลร้านอาหารและชุมชนนักชิม</p>
      <nav aria-label="เมนูผู้ดูแลระบบ" className="admin-nav">{links.map(([to, label], index) => <NavLink key={to} to={to} end={to === '/admin'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={icons[index]} /></svg>{label}</NavLink>)}</nav>
    </aside>
    <div className="admin-content"><Outlet /></div>
  </div></section>;
}
