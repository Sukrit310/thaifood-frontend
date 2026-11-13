import React, { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService, reviewService } from '../../api/services';
import { ErrorState, EmptyState } from '../../components/StateView';
import useAdminData, { listAllRestaurants } from './useAdminData';
import { AdminCell, AdminFeedback, AdminHeader, AdminLoading } from './AdminUI';

function ReviewDate({ value }) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? <span className="admin-review-date">ไม่ระบุวันที่</span> : <time className="admin-review-date" dateTime={value}>{new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(date)}</time>;
}

function RestaurantReviews({ restaurantId }) {
  const { data, loading, error, reload } = useAdminData(() => reviewService.list(restaurantId), [restaurantId]);
  const [removing, setRemoving] = useState(null);
  const [mutationError, setMutationError] = useState('');
  const [notice, setNotice] = useState('');
  const heading = useRef(null);
  async function remove(review) {
    if (removing || !window.confirm('ลบรีวิวนี้ออกจากระบบ?')) return;
    setRemoving(review.id); setMutationError(''); setNotice('');
    try { await adminService.deleteReview(review.id); setNotice('ลบรีวิวแล้ว'); heading.current?.focus(); reload(); }
    catch (failure) { setMutationError(failure.message); }
    finally { setRemoving(null); }
  }
  return <section aria-labelledby="admin-reviews-heading"><div className="admin-summary-bar"><h2 id="admin-reviews-heading" ref={heading} tabIndex={-1} className="admin-section-heading">รีวิวที่เผยแพร่</h2>{!loading && !error && <p className="admin-count">{data.items.length.toLocaleString('th-TH')} รีวิว</p>}</div>
    <AdminFeedback id="admin-review-delete-error" message={mutationError} /><AdminFeedback success message={notice} />
    {loading ? <AdminLoading label="กำลังโหลดรีวิว…" /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.items.length ? <EmptyState title="ร้านนี้ยังไม่มีรีวิว" description="รีวิวของสมาชิกจะแสดงที่นี่" /> :
      <div className="panel admin-table-panel"><table className="admin-table admin-reviews-table" role="table"><caption className="sr-only">รีวิวของร้านที่เลือก</caption><thead><tr role="row"><th scope="col">ผู้เขียน</th><th scope="col">รีวิว</th><th scope="col">การจัดการ</th></tr></thead><tbody>
        {data.items.map(review => <tr key={review.id} role="row"><AdminCell label="ผู้เขียน" header><p>{review.member.displayName}</p><p className="admin-review-rating">{typeof review.rating === 'number' && Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5 ? `คะแนน ${review.rating} / 5` : 'ยังไม่มีคะแนน'}</p><ReviewDate value={review.createdAt} /></AdminCell><AdminCell label="รีวิว"><p className="admin-review-text">{review.text}</p></AdminCell><AdminCell label="การจัดการ"><button type="button" className="admin-action admin-action-danger" onClick={() => remove(review)} disabled={Boolean(removing)} aria-label={`ลบรีวิวของ ${review.member.displayName}`}>{removing === review.id ? 'กำลังลบ…' : 'ลบรีวิว'}</button></AdminCell></tr>)}
      </tbody></table></div>}
  </section>;
}
export default function AdminReviews() {
  const { data, loading, error, reload } = useAdminData(listAllRestaurants);
  const [params, setParams] = useSearchParams();
  const selected = params.get('restaurant') || '';
  return <><AdminHeader title="จัดการรีวิว" description="เลือกร้านเพื่ออ่านและดูแลรีวิวจากสมาชิก" />
    {loading ? <AdminLoading label="กำลังโหลดรายชื่อร้านอาหาร…" /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.items.length ? <EmptyState title="ยังไม่มีร้านอาหาร" description="เพิ่มร้านอาหารก่อนเพื่อเริ่มดูแลรีวิว" /> : <><div className="field admin-review-selector"><label htmlFor="review-restaurant">ร้านอาหาร</label><select className="input" id="review-restaurant" value={selected} onChange={event => { const next = new URLSearchParams(); if (event.target.value) next.set('restaurant', event.target.value); setParams(next); }}><option value="">เลือกร้านอาหาร</option>{data.items.map(restaurant => <option key={restaurant.id} value={restaurant.id}>{restaurant.name} · {restaurant.province}</option>)}</select></div>{selected ? <RestaurantReviews key={selected} restaurantId={selected} /> : <EmptyState title="เริ่มจากเลือกร้านอาหาร" description="รีวิวของร้านที่เลือกจะแสดงที่นี่" />}</>}
  </>;
}
