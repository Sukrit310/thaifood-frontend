import { useState } from 'react';
import { Link } from 'react-router-dom';
import { favoriteService } from '../api/services';
import useResource from '../hooks/useResource';
import RestaurantGrid from '../components/RestaurantGrid';
import { LoadingState, ErrorState, EmptyState } from '../components/StateView';
export default function Favorites() {
  const favorites = useResource(() => favoriteService.list(), []);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  async function remove(id) {
    if (busy !== null) return;
    setBusy(id); setError('');
    try { await favoriteService.remove(id); favorites.retry(); } catch (failure) { setError(failure.message); } finally { setBusy(null); }
  }
  return <div className="container page-space"><p className="eyebrow">YOUR DELICIOUS LITTLE COLLECTION</p><h1 className="page-heading">ร้านโปรดของคุณ</h1><p className="muted intro-description">เก็บร้านที่อยากลอง และร้านที่อยากกลับไปอีกครั้งไว้ที่นี่</p>{error && <p role="alert" className="form-error">{error}</p>}{favorites.loading ? <LoadingState /> : favorites.error ? <ErrorState error={favorites.error} onRetry={favorites.retry} /> : !favorites.data?.items.length ? <EmptyState title="เริ่มสะสมร้านอร่อยกัน" description="กดบันทึกร้านที่ชอบ แล้วกลับมาวางแผนมื้อถัดไปได้ที่นี่"><Link className="btn btn-primary" to="/restaurants">ออกไปค้นหาร้าน</Link></EmptyState> : <RestaurantGrid items={favorites.data.items} renderAction={restaurant => <button className="text-button danger" onClick={() => remove(restaurant.id)} disabled={busy !== null}>{busy === restaurant.id ? 'กำลังนำออก…' : 'นำออกจากร้านโปรด'}</button>} />}</div>;
}
