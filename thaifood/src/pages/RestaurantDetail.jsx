import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { restaurantService, reviewService, favoriteService } from '../api/services';
import { useAuth } from '../auth/AuthContext';
import useResource from '../hooks/useResource';
import ReviewForm from '../components/ReviewForm';
import ReviewList from '../components/ReviewList';
import { LoadingState, ErrorState } from '../components/StateView';

export default function RestaurantDetail() {
  const { id } = useParams();
  const { member } = useAuth();
  const detail = useResource(() => restaurantService.get(id), [id]);
  const reviews = useResource(() => reviewService.list(id), [id]);
  const favorites = useResource(() => member ? favoriteService.list() : Promise.resolve({ items: [] }), [member?.id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const saved = favorites.data?.items.some(item => item.id === Number(id));
  async function toggleFavorite() {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (saved) await favoriteService.remove(Number(id)); else await favoriteService.add(Number(id));
      favorites.retry(); setMessage(saved ? 'นำออกจากร้านโปรดแล้ว' : 'บันทึกเป็นร้านโปรดแล้ว');
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  async function addReview(body) { await reviewService.create(Number(id), body); reviews.retry(); detail.retry(); setMessage('ขอบคุณที่แบ่งปันรีวิว'); }
  async function deleteReview(reviewId) { await reviewService.remove(reviewId); reviews.retry(); detail.retry(); }
  if (detail.loading && !detail.data) return <div className="container page-space"><LoadingState /></div>;
  if (detail.error) return <div className="container page-space">{detail.error.status === 404 ? <><p className="eyebrow">404</p><h1>ไม่พบร้านอาหารนี้</h1><Link to="/restaurants" className="btn btn-primary">กลับไปค้นหาร้าน</Link></> : <ErrorState error={detail.error} onRetry={detail.retry} />}</div>;
  const restaurant = detail.data;
  if (!restaurant) return null;
  const ownReview = reviews.data?.items.some(review => review.member.id === member?.id);
  const coordinatesValid = restaurant.latitude != null && restaurant.longitude != null && Number.isFinite(Number(restaurant.latitude)) && Number.isFinite(Number(restaurant.longitude));
  return <div className="container page-space"><nav aria-label="เส้นทาง" className="breadcrumbs"><Link to="/restaurants">ร้านอาหาร</Link><span aria-hidden="true">/</span><Link to={`/restaurants?province=${encodeURIComponent(restaurant.province)}`}>{restaurant.province}</Link><span aria-hidden="true">/</span><span>{restaurant.name}</span></nav><div className="detail-grid"><div className="detail-main"><img className="detail-image" src={restaurant.imageUrl || '/images/food-rice.svg'} alt={`ภาพประกอบ ${restaurant.name}`} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/food-rice.svg'; }} /><div className="detail-heading"><p className="eyebrow">{restaurant.province} / {restaurant.category}</p><h1>{restaurant.name}</h1><p className="detail-rating"><span aria-hidden="true">★</span> {restaurant.rating == null ? 'ยังไม่มีคะแนน' : `${Number(restaurant.rating).toFixed(1)} / 5`} <span className="muted">จาก {restaurant.reviewCount} รีวิวของสมาชิก</span></p></div><section className="detail-description"><h2>เรื่องราวของร้าน</h2><p>{restaurant.description}</p></section><section className="reviews-section" aria-labelledby="reviews-heading"><div className="section-heading"><h2 id="reviews-heading">เสียงจากคนที่ได้ลอง <small>({restaurant.reviewCount})</small></h2></div>{reviews.loading ? <LoadingState /> : reviews.error ? <ErrorState error={reviews.error} onRetry={reviews.retry} /> : <ReviewList items={reviews.data?.items || []} member={member} onDelete={deleteReview} />}{member ? ownReview ? <p className="notice">คุณรีวิวร้านนี้แล้ว สามารถลบรีวิวเดิมก่อนเขียนใหม่ได้</p> : !reviews.loading && !reviews.error && <ReviewForm onSubmit={addReview} /> : <div className="panel review-invitation"><h3>มื้อนี้เป็นอย่างไรบ้าง?</h3><p>เข้าสู่ระบบเพื่อให้คะแนนและแบ่งปันประสบการณ์</p><Link className="btn btn-primary" to="/login" state={{ from: { pathname: `/restaurants/${id}` } }}>เข้าสู่ระบบเพื่อรีวิว</Link></div>}</section></div><aside className="detail-sidebar"><div className="panel location-panel"><p className="eyebrow">PLAN YOUR VISIT</p><h2>แวะไปอร่อยที่นี่</h2><dl><dt>จังหวัด</dt><dd>{restaurant.province}</dd><dt>ที่อยู่</dt><dd>{restaurant.address}</dd><dt>ประเภทอาหาร</dt><dd>{restaurant.category}</dd></dl>{coordinatesValid && <a className="btn btn-secondary" href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(restaurant.latitude)}&mlon=${encodeURIComponent(restaurant.longitude)}#map=16/${encodeURIComponent(restaurant.latitude)}/${encodeURIComponent(restaurant.longitude)}`} target="_blank" rel="noreferrer">ดูตำแหน่งบนแผนที่ ↗</a>}{member ? favorites.loading ? <LoadingState label="กำลังตรวจสอบร้านโปรด…" /> : favorites.error ? <ErrorState error={favorites.error} onRetry={favorites.retry} /> : <button className="btn btn-primary" onClick={toggleFavorite} disabled={busy} aria-pressed={!!saved}>{busy ? 'กำลังบันทึก…' : saved ? '♥ บันทึกในร้านโปรดแล้ว' : '♡ บันทึกร้านโปรด'}</button> : <Link to="/login" state={{ from: { pathname: `/restaurants/${id}` } }} className="btn btn-primary">เข้าสู่ระบบเพื่อบันทึกร้าน</Link>}{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="notice" role="status">{message}</p>}</div></aside></div></div>;
}
