import React from 'react';
import { Link } from 'react-router-dom';
import { adminService, restaurantService } from '../../api/services';
import { ErrorState } from '../../components/StateView';
import useAdminData from './useAdminData';
import { AdminCount, AdminHeader, AdminLoading } from './AdminUI';

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAdminData(() => Promise.all([restaurantService.list({ page: 1, limit: 1 }), adminService.members()]));
  return <><AdminHeader title="ภาพรวม" description="ดูแลข้อมูลร้านอาหารและชุมชนนักชิมของเรา" />
    {loading ? <AdminLoading label="กำลังโหลดภาพรวม…" cards /> : error ? <ErrorState error={error} onRetry={reload} /> : <>
      <div className="admin-stat-grid"><Link className="panel admin-stat-card" to="/admin/restaurants"><h2 className="admin-stat-label">ร้านอาหารทั้งหมด</h2><p className="admin-stat-value"><AdminCount value={data[0].total} /></p><span className="admin-stat-link">จัดการร้านอาหาร →</span></Link>
        <Link className="panel admin-stat-card" to="/admin/members"><h2 className="admin-stat-label">สมาชิกทั้งหมด</h2><p className="admin-stat-value"><AdminCount value={data[1].items.length} /></p><span className="admin-stat-link">ดูรายชื่อสมาชิก →</span></Link></div>
      <div className="panel admin-welcome"><h2 className="admin-section-heading">ให้ทุกมื้อมีข้อมูลที่เชื่อถือได้</h2><p>เพิ่มร้านใหม่ ตรวจสอบข้อมูล และดูแลรีวิวของสมาชิก</p>
        <div className="admin-actions"><Link to="/admin/restaurants/new" className="btn btn-primary">เพิ่มร้านอาหาร</Link><Link to="/admin/reviews" className="btn btn-secondary">จัดการรีวิว</Link></div></div>
    </>}
  </>;
}
