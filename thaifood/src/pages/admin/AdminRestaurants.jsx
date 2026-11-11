import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminService, restaurantService } from '../../api/services';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateView';
import useAdminData from './useAdminData';

export default function AdminRestaurants() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const requestedPage = Number(params.get('page'));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  const [removing, setRemoving] = useState(null);
  const [mutationError, setMutationError] = useState('');
  const { data, loading, error, reload } = useAdminData(() => restaurantService.list({ q, page, limit: 12 }), [q, page]);
  function move(nextPage) { const next = new URLSearchParams(params); next.set('page', String(nextPage)); setParams(next); }
  async function remove(restaurant) {
    if (removing || !window.confirm(`ลบร้าน “${restaurant.name}” พร้อมรีวิวและรายการโปรดที่เกี่ยวข้อง?`)) return;
    setRemoving(restaurant.id); setMutationError('');
    try { await adminService.deleteRestaurant(restaurant.id); if (data.items.length === 1 && page > 1) move(page - 1); else reload(); }
    catch (failure) { setMutationError(failure.message); }
    finally { setRemoving(null); }
  }
  return <><div className="flex flex-wrap justify-between items-start gap-4 mb-6"><div><h1 className="page-heading">จัดการร้านอาหาร</h1><p className="muted">เพิ่มและปรับปรุงข้อมูลร้านให้พร้อมสำหรับมื้อถัดไป</p></div><Link to="/admin/restaurants/new" className="btn btn-primary">+ เพิ่มร้านอาหาร</Link></div>
    <form className="flex gap-3 mb-6" onSubmit={event => { event.preventDefault(); const next = new URLSearchParams(); if (search.trim()) next.set('q', search.trim()); setParams(next); }}><label className="sr-only" htmlFor="admin-search">ค้นหาร้านอาหาร</label><input className="input flex-1" id="admin-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหาชื่อร้านหรือคำอธิบาย" /><button className="btn btn-secondary" type="submit">ค้นหา</button></form>
    {mutationError && <p role="alert" className="text-red-700 mb-4">{mutationError}</p>}
    {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.items.length ? <EmptyState title="ยังไม่พบร้านอาหาร" description="ลองค้นหาคำอื่น หรือเพิ่มร้านอาหารใหม่" /> : <>
      <div className="panel overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">รายการร้านอาหารสำหรับจัดการ</caption><thead className="bg-gray-50 text-gray-600"><tr><th scope="col" className="p-4">ชื่อร้าน</th><th scope="col" className="p-4">จังหวัด</th><th scope="col" className="p-4">ประเภท</th><th scope="col" className="p-4">การจัดการ</th></tr></thead><tbody>{data.items.map(restaurant => <tr className="border-t" key={restaurant.id}><th scope="row" className="p-4 font-medium min-w-48"><Link className="hover:underline" to={`/restaurants/${restaurant.id}`}>{restaurant.name}</Link></th><td className="p-4 whitespace-nowrap">{restaurant.province}</td><td className="p-4 whitespace-nowrap">{restaurant.category}</td><td className="p-4"><div className="flex gap-3 items-center"><Link className="text-green-800 underline whitespace-nowrap" to={`/admin/restaurants/${restaurant.id}/edit`}>แก้ไข</Link><button type="button" className="text-red-700 underline disabled:opacity-50 whitespace-nowrap" onClick={() => remove(restaurant)} disabled={Boolean(removing)} aria-label={`ลบร้าน ${restaurant.name}`}>{removing === restaurant.id ? 'กำลังลบ…' : 'ลบ'}</button></div></td></tr>)}</tbody></table></div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"><p className="muted">{data.total} ร้าน · หน้า {page} / {Math.max(1, Math.ceil(data.total / 12))}</p><div className="flex gap-2"><button className="btn btn-secondary" disabled={page <= 1} onClick={() => move(page - 1)}>ก่อนหน้า</button><button className="btn btn-secondary" disabled={page * 12 >= data.total} onClick={() => move(page + 1)}>ถัดไป</button></div></div>
    </>}
  </>;
}
