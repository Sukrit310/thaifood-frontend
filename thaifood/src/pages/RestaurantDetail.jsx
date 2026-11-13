import { Link, useParams } from 'react-router-dom';
import { useRef, useState } from 'react';
import { restaurantService, reviewService, favoriteService } from '../api/services';
import { useAuth } from '../auth/AuthContext';
import useResource from '../hooks/useResource';
import ReviewForm from '../components/ReviewForm';
import ReviewList from '../components/ReviewList';
import { LoadingState, ErrorState } from '../components/StateView';
import './RestaurantDetail.css';

const FALLBACK_IMAGE = '/images/food-rice.svg';

function handleImageError(event) {
  if (event.currentTarget.getAttribute('src') !== FALLBACK_IMAGE) event.currentTarget.src = FALLBACK_IMAGE;
}
function coordinate(value) {
  return typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
}
function DetailLoading() {
  return <div className="detail-loading" role="status" aria-live="polite">
    <h1 className="sr-only">รายละเอียดร้านอาหาร</h1><p>กำลังโหลดรายละเอียดร้านอาหาร…</p>
    <div className="detail-loading-grid" aria-hidden="true"><div><div className="detail-skeleton-line" /><div className="detail-skeleton-line detail-skeleton-short" /><div className="detail-skeleton-image" /></div><div className="detail-skeleton-visit panel" /></div>
  </div>;
}
function ResourceError({ title, error, onRetry }) {
  return <div className="detail-resource-error" role="alert"><p className="detail-feedback-title">{title}</p><p>{error?.message || 'เชื่อมต่อไม่ได้ กรุณาลองอีกครั้ง'}</p><button type="button" className="btn btn-secondary" onClick={onRetry}>ลองอีกครั้ง</button></div>;
}

function RestaurantDetailContent({ id }) {
  const { member } = useAuth();
  const detail = useResource(() => restaurantService.get(id), [id]);
  const reviews = useResource(() => reviewService.list(id), [id]);
  const favorites = useResource(() => member ? favoriteService.list() : Promise.resolve({ items: [] }), [member?.id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [favoriteMessage, setFavoriteMessage] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const reviewHeading = useRef(null);
  const saved = favorites.data?.items.some(item => item.id === Number(id));
  async function toggleFavorite() {
    if (busy) return;
    setBusy(true); setError(''); setFavoriteMessage('');
    try {
      if (saved) await favoriteService.remove(Number(id)); else await favoriteService.add(Number(id));
      favorites.retry(); setFavoriteMessage(saved ? 'นำออกจากร้านโปรดแล้ว' : 'บันทึกเป็นร้านโปรดแล้ว');
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  async function addReview(body) {
    setReviewMessage('');
    await reviewService.create(Number(id), body);
    reviews.retry(); detail.retry(); setReviewMessage('ขอบคุณที่แบ่งปันรีวิว'); reviewHeading.current?.focus();
  }
  async function deleteReview(reviewId) {
    setReviewMessage('');
    await reviewService.remove(reviewId);
    reviews.retry(); detail.retry(); setReviewMessage('ลบรีวิวแล้ว'); reviewHeading.current?.focus();
  }
  if (detail.loading && !detail.data) return <div className="restaurant-detail-page"><div className="container detail-content"><DetailLoading /></div></div>;
  if (detail.error) return <div className="restaurant-detail-page"><div className="container detail-content"><div className="detail-page-error panel">{detail.error.status === 404 ? <><p className="eyebrow">404</p><h1>ไม่พบร้านอาหารนี้</h1><p>ลองกลับไปค้นหาร้านอาหารที่ต้องการอีกครั้ง</p><Link to="/restaurants" className="btn btn-primary">กลับไปค้นหาร้าน</Link></> : <><h1 className="page-heading">ยังเปิดรายละเอียดร้านไม่ได้</h1><ErrorState error={detail.error} onRetry={detail.retry} /></>}</div></div></div>;
  const restaurant = detail.data;
  if (!restaurant) return null;
  const ownReview = reviews.data?.items.some(review => review.member.id === member?.id);
  const latitude = coordinate(restaurant.latitude), longitude = coordinate(restaurant.longitude);
  const coordinatesValid = Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
  const hasRating = typeof restaurant.rating === 'number' && Number.isFinite(restaurant.rating) && restaurant.rating >= 1 && restaurant.rating <= 5;
  const hasReviewCount = Number.isInteger(restaurant.reviewCount) && restaurant.reviewCount >= 0;

  return <div className="restaurant-detail-page"><div className="container detail-content">
    <nav aria-label="เส้นทาง" className="breadcrumbs"><ol><li><Link to="/restaurants">ร้านอาหาร</Link></li><li><span aria-hidden="true">/</span><Link to={`/restaurants?province=${encodeURIComponent(restaurant.province)}`}>{restaurant.province}</Link></li><li><span aria-hidden="true">/</span><span aria-current="page">{restaurant.name}</span></li></ol></nav>
    <div className="detail-grid">
      <div className="detail-main" aria-busy={detail.loading}>
        <header className="detail-heading">
          <p className="eyebrow detail-province">{restaurant.province}</p><h1>{restaurant.name}</h1>
          <div className="detail-summary"><span className="detail-category-badge">{restaurant.category}</span><p className="detail-rating">{hasRating ? <><span className="detail-rating-star" aria-hidden="true">★</span><strong>{restaurant.rating.toFixed(1)} / 5</strong></> : <span>ยังไม่มีคะแนน</span>}{hasReviewCount && <a href="#reviews-heading">จาก {restaurant.reviewCount.toLocaleString('th-TH')} รีวิวของสมาชิก</a>}</p></div>
        </header>
        <figure className="detail-figure"><img className="detail-image" src={restaurant.imageUrl || FALLBACK_IMAGE} alt={`ภาพประกอบ ${restaurant.name}`} onError={handleImageError} width="1280" height="800" decoding="async" fetchPriority="high" /></figure>
        <section className="detail-description" aria-labelledby="restaurant-story-heading"><h2 id="restaurant-story-heading">เรื่องราวของร้าน</h2><p>{restaurant.description || 'ร้านนี้ยังไม่มีเรื่องราวเพิ่มเติม'}</p></section>
      </div>

      <aside className="detail-sidebar" aria-labelledby="visit-heading"><div className="panel location-panel">
        <p className="eyebrow">PLAN YOUR VISIT</p><h2 id="visit-heading">แวะไปอร่อยที่นี่</h2>
        <dl><dt>จังหวัด</dt><dd>{restaurant.province}</dd><dt>ที่อยู่</dt><dd>{restaurant.address || 'ยังไม่ได้ระบุที่อยู่'}</dd><dt>ประเภทอาหาร</dt><dd>{restaurant.category}</dd></dl>
        {coordinatesValid ? <a className="btn btn-secondary" href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitude)}&mlon=${encodeURIComponent(longitude)}#map=16/${encodeURIComponent(latitude)}/${encodeURIComponent(longitude)}`} target="_blank" rel="noreferrer">ดูตำแหน่งบนแผนที่ <span aria-hidden="true">↗</span></a> : <p className="detail-map-unavailable">ยังไม่มีตำแหน่งแผนที่ที่พร้อมใช้งาน</p>}
        <div className="detail-favorite-action">{member ? favorites.loading ? <LoadingState label="กำลังตรวจสอบร้านโปรด…" /> : favorites.error ? <ResourceError title="ตรวจสอบร้านโปรดไม่สำเร็จ" error={favorites.error} onRetry={favorites.retry} /> : <button type="button" className="btn btn-primary" onClick={toggleFavorite} disabled={busy} aria-pressed={!!saved}><span aria-hidden="true">{saved ? '♥' : '♡'}</span><span>{busy ? 'กำลังบันทึก…' : saved ? 'บันทึกในร้านโปรดแล้ว' : 'บันทึกร้านโปรด'}</span></button> : <Link to="/login" state={{ from: { pathname: `/restaurants/${id}` } }} className="btn btn-primary">เข้าสู่ระบบเพื่อบันทึกร้าน</Link>}</div>
        {error && <p className="form-error" role="alert">{error}</p>}{favoriteMessage && <p className="notice" role="status">{favoriteMessage}</p>}
      </div></aside>

      <section className="reviews-section" aria-labelledby="reviews-heading">
        <div className="detail-reviews-heading"><p className="eyebrow">AT THE TABLE</p><h2 id="reviews-heading" ref={reviewHeading} tabIndex={-1}>เสียงจากคนที่ได้ลอง{hasReviewCount && <small> ({restaurant.reviewCount.toLocaleString('th-TH')})</small>}</h2><p>ประสบการณ์จากสมาชิกที่แบ่งปันไว้บน ThaiFood</p></div>
        {reviewMessage && <p className="notice detail-review-notice" role="status">{reviewMessage}</p>}
        {reviews.loading ? <LoadingState label="กำลังโหลดรีวิว…" /> : reviews.error ? <ResourceError title="โหลดรีวิวไม่สำเร็จ" error={reviews.error} onRetry={reviews.retry} /> : <ReviewList items={reviews.data?.items || []} member={member} onDelete={deleteReview} />}
        {member ? !reviews.loading && !reviews.error && (ownReview ? <p className="notice detail-own-review">คุณรีวิวร้านนี้แล้ว สามารถลบรีวิวเดิมก่อนเขียนใหม่ได้</p> : <ReviewForm onSubmit={addReview} />) : <div className="panel review-invitation"><h3>มื้อนี้เป็นอย่างไรบ้าง?</h3><p>เข้าสู่ระบบเพื่อให้คะแนนและแบ่งปันประสบการณ์</p><Link className="btn btn-primary" to="/login" state={{ from: { pathname: `/restaurants/${id}` } }}>เข้าสู่ระบบเพื่อรีวิว</Link></div>}
      </section>
    </div>
  </div></div>;
}

export default function RestaurantDetail() {
  const { id } = useParams();
  return <RestaurantDetailContent key={id} id={id} />;
}
