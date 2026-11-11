import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  const links = [['/admin', 'ภาพรวม'], ['/admin/restaurants', 'ร้านอาหาร'], ['/admin/reviews', 'รีวิว'], ['/admin/members', 'สมาชิก']];
  return <section className="container py-8 md:py-12"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">THAIFOOD MANAGEMENT</p><p className="text-2xl font-bold">พื้นที่ผู้ดูแลระบบ</p></div><span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-900">ADMIN</span></div>
    <nav aria-label="เมนูผู้ดูแลระบบ" className="flex gap-2 overflow-x-auto border-b mb-8 pb-3">{links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${isActive ? 'bg-green-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{label}</NavLink>)}</nav><Outlet />
  </section>;
}
