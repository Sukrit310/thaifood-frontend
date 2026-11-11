import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService, reviewService } from '../../api/services';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateView';
import useAdminData, { listAllRestaurants } from './useAdminData';

function RestaurantReviews({ restaurantId }) {
  const { data, loading, error, reload } = useAdminData(() => reviewService.list(restaurantId), [restaurantId]);
  const [removing, setRemoving] = useState(null);
  const [mutationError, setMutationError] = useState('');
  async function remove(review) {
    if (removing || !window.confirm('ลบรีวิวนี้ออกจากระบบ?')) return;
    setRemoving(review.id); setMutationError('');
    try { await adminService.deleteReview(review.id); reload(); }
    catch (failure) { setMutationError(failure.message); }
    finally { setRemoving(null); }
  }
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data.items.length) return <EmptyState title="ร้านนี้ยังไม่มีรีวิว" description="รีวิวของสมาชิกจะแสดงที่นี่" />;
  return <>{mutationError && <p role="alert" className="text-red-700 mb-4">{mutationError}</p>}<ul className="space-y-4">{data.items.map(review => <li key={review.id} className="panel p-5 md:p-6"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{review.member.displayName}</h2><p className="text-sm text-green-800 mt-1">คะแนน {review.rating} / 5</p></div><time className="text-xs muted" dateTime={review.createdAt}>{new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(review.createdAt))}</time></div><p className="my-4 whitespace-pre-wrap break-words leading-relaxed">{review.text}</p><button type="button" className="text-red-700 underline text-sm disabled:opacity-50" onClick={() => remove(review)} disabled={Boolean(removing)} aria-label={`ลบรีวิวของ ${review.member.displayName}`}>{removing === review.id ? 'กำลังลบ…' : 'ลบรีวิว'}</button></li>)}</ul></>;
}
export default function AdminReviews() {
  const { data, loading, error, reload } = useAdminData(listAllRestaurants);
  const [params, setParams] = useSearchParams();
  const selected = params.get('restaurant') || '';
  return <><h1 className="page-heading">จัดการรีวิว</h1><p className="muted mb-7">เลือกร้านเพื่ออ่านและดูแลรีวิวจากสมาชิก</p>
    {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.items.length ? <EmptyState title="ยังไม่มีร้านอาหาร" description="เพิ่มร้านอาหารก่อนเพื่อเริ่มดูแลรีวิว" /> : <><div className="field max-w-xl mb-7"><label htmlFor="review-restaurant">ร้านอาหาร</label><select className="input" id="review-restaurant" value={selected} onChange={event => { const next = new URLSearchParams(); if (event.target.value) next.set('restaurant', event.target.value); setParams(next); }}><option value="">เลือกร้านอาหาร</option>{data.items.map(restaurant => <option key={restaurant.id} value={restaurant.id}>{restaurant.name} · {restaurant.province}</option>)}</select></div>{selected ? <RestaurantReviews key={selected} restaurantId={selected} /> : <EmptyState title="เริ่มจากเลือกร้านอาหาร" description="รีวิวของร้านที่เลือกจะแสดงที่นี่" />}</>}
  </>;
}
