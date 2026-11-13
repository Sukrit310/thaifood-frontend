import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { favoriteService } from '../api/services';
import useResource from '../hooks/useResource';
import RestaurantGrid from '../components/RestaurantGrid';
import { ErrorState } from '../components/StateView';
import { AccountError, AccountNav } from '../components/AccountLayout';

function FavoritesLoading() {
  return <div role="status"><p className="sr-only">กำลังโหลดร้านโปรด…</p><div className="account-loading-grid" aria-hidden="true">
    {Array.from({ length: 6 }, (_, index) => <div key={index} className="account-loading-card"><div className="account-loading-media" /><div className="account-loading-lines"><span /><span /></div></div>)}
  </div></div>;
}

export default function Favorites() {
  const favorites = useResource(() => favoriteService.list(), []);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const collectionHeading = useRef(null);
  async function remove(id) {
    if (busy !== null) return;
    setBusy(id); setError(''); setNotice('');
    try {
      await favoriteService.remove(id);
      setNotice('นำร้านออกจากร้านโปรดแล้ว');
      favorites.retry();
      collectionHeading.current?.focus();
    } catch (failure) { setError(failure.message); } finally { setBusy(null); }
  }
  const items = favorites.data?.items || [];
  return <section className="account-page account-favorites-page"><div className="container">
    <header><p className="eyebrow">SAVED FOR YOUR NEXT MEAL</p><h1 className="account-heading">ร้านโปรดของคุณ</h1><p className="account-description">เก็บร้านที่อยากลอง และร้านที่อยากกลับไปอีกครั้งไว้ที่นี่</p></header>
    <AccountNav />
    <section aria-labelledby="favorites-collection-heading">
      <div className="account-collection-bar"><h2 className="account-collection-heading" id="favorites-collection-heading" ref={collectionHeading} tabIndex={-1}>ร้านที่บันทึกไว้</h2>
        {!favorites.loading && !favorites.error && <p className="account-collection-count">{items.length.toLocaleString('th-TH')} ร้าน</p>}
      </div>
      {(error || notice) && <div className="account-collection-feedback"><AccountError id="favorites-error" message={error} />{notice && <p className="notice account-feedback" role="status">{notice}</p>}</div>}
      {favorites.loading ? <FavoritesLoading /> : favorites.error ? <ErrorState error={favorites.error} onRetry={favorites.retry} /> : !items.length ?
        <div className="panel account-empty"><svg className="account-empty-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M14 8h20a2 2 0 0 1 2 2v30L24 32l-12 8V10a2 2 0 0 1 2-2Z" /><path d="M19 19h10M24 14v10" /></svg>
          <h3>เริ่มสะสมร้านอร่อยกัน</h3><p>กดบันทึกร้านที่ชอบ แล้วกลับมาวางแผนมื้อถัดไปได้ที่นี่</p><Link className="btn btn-primary" to="/restaurants">ออกไปค้นหาร้าน</Link>
        </div> : <RestaurantGrid items={items} renderAction={restaurant => <button type="button" className="text-button danger" onClick={() => remove(restaurant.id)} disabled={busy !== null}>{busy === restaurant.id ? 'กำลังนำออก…' : 'นำออกจากร้านโปรด'}</button>} />}
    </section>
  </div></section>;
}
