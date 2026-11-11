import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ProtectedRoute from './ProtectedRoute';

export default function RequireRole({ role = 'admin', children }) {
  const { member } = useAuth();
  return <ProtectedRoute>{member?.role === role ? children || <Outlet /> : <section className="container py-16 text-center">
    <p className="eyebrow">403 · FORBIDDEN</p><h1 className="page-heading">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
    <p className="muted mb-6">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p><Link className="btn btn-primary" to="/">กลับหน้าแรก</Link>
  </section>}</ProtectedRoute>;
}
