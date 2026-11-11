import React from 'react';
import { Link } from 'react-router-dom';
import { adminService, restaurantService } from '../../api/services';
import { LoadingState, ErrorState } from '../../components/StateView';
import useAdminData from './useAdminData';

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAdminData(() => Promise.all([restaurantService.list({ page: 1, limit: 1 }), adminService.members()]));
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return <><h1 className="page-heading">ภาพรวม</h1><p className="muted mb-8">ดูแลข้อมูลร้านอาหารและชุมชนนักชิมของเรา</p>
    <div className="grid sm:grid-cols-2 gap-5 mb-8"><Link className="panel p-6 hover:border-green-700 transition-colors" to="/admin/restaurants"><p className="muted text-sm">ร้านอาหารทั้งหมด</p><p className="text-4xl font-bold my-3">{data[0].total.toLocaleString('th-TH')}</p><span className="text-sm text-green-800 font-semibold">จัดการร้านอาหาร →</span></Link><Link className="panel p-6 hover:border-green-700 transition-colors" to="/admin/members"><p className="muted text-sm">สมาชิกทั้งหมด</p><p className="text-4xl font-bold my-3">{data[1].items.length.toLocaleString('th-TH')}</p><span className="text-sm text-green-800 font-semibold">ดูรายชื่อสมาชิก →</span></Link></div>
    <div className="panel p-6 flex flex-wrap justify-between items-center gap-5"><div><h2 className="text-lg font-semibold">ให้ทุกมื้อมีข้อมูลที่เชื่อถือได้</h2><p className="muted mt-2 text-sm">เพิ่มร้านใหม่ ตรวจสอบข้อมูล และดูแลรีวิวของสมาชิก</p></div><div className="flex flex-wrap gap-3"><Link to="/admin/restaurants/new" className="btn btn-primary">เพิ่มร้านอาหาร</Link><Link to="/admin/reviews" className="btn btn-secondary">จัดการรีวิว</Link></div></div>
  </>;
}
