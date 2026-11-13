import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminService, restaurantService } from '../../api/services';
import { ErrorState, EmptyState } from '../../components/StateView';
import useAdminData from './useAdminData';
import { AdminCell, AdminFeedback, AdminHeader, AdminLoading } from './AdminUI';

export default function AdminRestaurants() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const requestedPage = Number(params.get('page'));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  const [removing, setRemoving] = useState(null);
  const [mutationError, setMutationError] = useState('');
  const [notice, setNotice] = useState('');
  const heading = useRef(null);
  const { data, loading, error, reload } = useAdminData(() => restaurantService.list({ q, page, limit: 12 }), [q, page]);
  function move(nextPage) { const next = new URLSearchParams(params); next.set('page', String(nextPage)); setParams(next); }
  async function remove(restaurant) {
    if (removing || !window.confirm(`ลบร้าน “${restaurant.name}” พร้อมรีวิวและรายการโปรดที่เกี่ยวข้อง?`)) return;
    setRemoving(restaurant.id); setMutationError(''); setNotice('');
    try { await adminService.deleteRestaurant(restaurant.id); setNotice('ลบร้านอาหารแล้ว'); heading.current?.focus(); if (data.items.length === 1 && page > 1) move(page - 1); else reload(); }
    catch (failure) { setMutationError(failure.message); }
    finally { setRemoving(null); }
  }
  const hasTotal = Number.isInteger(data?.total) && data.total >= 0;
  return <><AdminHeader title="จัดการร้านอาหาร" description="เพิ่มและปรับปรุงข้อมูลร้านให้พร้อมสำหรับมื้อถัดไป" action={<Link to="/admin/restaurants/new" className="btn btn-primary">+ เพิ่มร้านอาหาร</Link>} />
    <form className="panel admin-search" onSubmit={event => { event.preventDefault(); const next = new URLSearchParams(); if (search.trim()) next.set('q', search.trim()); setParams(next); }}>
      <div className="field"><label htmlFor="admin-search">ค้นหาร้านอาหาร</label><input className="input" type="search" id="admin-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหาชื่อร้านหรือคำอธิบาย" /></div><button className="btn btn-secondary" type="submit">ค้นหา</button>
    </form>
    <section aria-labelledby="admin-restaurants-heading"><div className="admin-summary-bar"><h2 id="admin-restaurants-heading" ref={heading} tabIndex={-1} className="admin-section-heading">รายการร้านอาหาร</h2>{!loading && !error && hasTotal && <p className="admin-count">{data.total.toLocaleString('th-TH')} ร้าน</p>}</div>
      <AdminFeedback id="admin-delete-error" message={mutationError} /><AdminFeedback success message={notice} />
      {loading ? <AdminLoading label="กำลังโหลดร้านอาหาร…" /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.items.length ? <EmptyState title="ยังไม่พบร้านอาหาร" description="ลองค้นหาคำอื่น หรือเพิ่มร้านอาหารใหม่" /> : <>
        <div className="panel admin-table-panel"><table className="admin-table admin-restaurants-table" role="table"><caption className="sr-only">รายการร้านอาหารสำหรับจัดการ</caption><thead><tr role="row"><th scope="col">ชื่อร้าน</th><th scope="col">จังหวัด</th><th scope="col">ประเภท</th><th scope="col">การจัดการ</th></tr></thead><tbody>
          {data.items.map(restaurant => <tr key={restaurant.id} role="row"><AdminCell label="ชื่อร้าน" header><Link className="admin-row-link" to={`/restaurants/${restaurant.id}`}>{restaurant.name}</Link></AdminCell><AdminCell label="จังหวัด">{restaurant.province}</AdminCell><AdminCell label="ประเภท">{restaurant.category}</AdminCell><AdminCell label="การจัดการ"><div className="admin-actions"><Link className="admin-action" to={`/admin/restaurants/${restaurant.id}/edit`}>แก้ไข</Link><button type="button" className="admin-action admin-action-danger" onClick={() => remove(restaurant)} disabled={Boolean(removing)} aria-label={removing === restaurant.id ? `กำลังลบ… ร้าน ${restaurant.name}` : `ลบร้าน ${restaurant.name}`}>{removing === restaurant.id ? 'กำลังลบ…' : 'ลบร้าน'}</button></div></AdminCell></tr>)}
        </tbody></table></div>
        <nav aria-label="แบ่งหน้าร้านอาหาร" className="admin-pagination"><p className="muted">หน้า {page}{hasTotal && <> / {Math.max(1, Math.ceil(data.total / 12))}</>}</p><div className="admin-actions"><button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => move(page - 1)}>ก่อนหน้า</button><button type="button" className="btn btn-secondary" disabled={!hasTotal || page * 12 >= data.total} onClick={() => move(page + 1)}>ถัดไป</button></div></nav>
      </>}
    </section>
  </>;
}
