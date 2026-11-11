import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { restaurantService } from '../api/services';
import useResource from '../hooks/useResource';
import RestaurantGrid from '../components/RestaurantGrid';
import { LoadingState, ErrorState, EmptyState } from '../components/StateView';

export default function Restaurants() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const province = searchParams.get('province') || '';
  const category = searchParams.get('category') || '';
  const page = Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1);
  const [search, setSearch] = useState(q);
  useEffect(() => { setSearch(q); }, [q]);
  const filters = useResource(() => Promise.all([restaurantService.provinces(), restaurantService.categories()]), []);
  const results = useResource(() => restaurantService.list({ q, province, category, page, limit: 12 }), [q, province, category, page]);
  function update(values) {
    const next = new URLSearchParams(searchParams);
    Object.entries({ page: 1, ...values }).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key));
    setSearchParams(next);
  }
  function reset() { setSearch(''); setSearchParams({}); }
  return <div className="container page-space"><div className="page-intro"><p className="eyebrow">EXPLORE LOCAL FLAVORS</p><h1 className="page-heading">ร้านอร่อย รอให้คุณค้นพบ</h1><p className="muted">เลือกจุดหมาย แล้วออกเดินทางผ่านรสชาติของแต่ละท้องถิ่น</p></div>
    <form className="search-filter panel" onSubmit={event => { event.preventDefault(); update({ q: search.trim() }); }}><label className="search-field" htmlFor="restaurant-search"><span>ค้นหาร้านอาหาร</span><input id="restaurant-search" className="input" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ชื่อร้าน เมนู หรือรสชาติที่คิดถึง" /></label><label className="filter-field" htmlFor="province-filter"><span>จังหวัด</span><select id="province-filter" className="input" value={province} onChange={event => update({ province: event.target.value })}><option value="">ทุกจังหวัด</option>{filters.data?.[0].items.map(item => <option key={item.id} value={item.nameTh}>{item.nameTh}</option>)}</select></label><label className="filter-field" htmlFor="category-filter"><span>ประเภทอาหาร</span><select id="category-filter" className="input" value={category} onChange={event => update({ category: event.target.value })}><option value="">ทุกประเภท</option>{filters.data?.[1].items.map(item => <option key={item.id} value={item.nameTh}>{item.nameTh}</option>)}</select></label><button className="btn btn-primary" type="submit">ค้นหา</button></form>
    {filters.error && <ErrorState error={filters.error} onRetry={filters.retry} />}
    <div className="results-heading"><p><strong>{results.loading ? '…' : results.data?.total ?? 0}</strong> ร้านอาหาร {province && <span>ใน{province}</span>}</p>{(q || province || category) && <button className="text-button" onClick={reset}>ล้างตัวกรอง</button>}</div>
    {results.loading ? <LoadingState /> : results.error ? <ErrorState error={results.error} onRetry={results.retry} /> : !results.data?.items.length ? <EmptyState title="ไม่พบร้านที่ค้นหา" description="ลองเปลี่ยนคำค้น จังหวัด หรือประเภทอาหาร"><button className="btn btn-secondary" onClick={reset}>ดูร้านทั้งหมด</button></EmptyState> : <><RestaurantGrid items={results.data.items} /><nav className="pagination" aria-label="แบ่งหน้าร้านอาหาร"><button className="btn btn-secondary" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>ก่อนหน้า</button><span>หน้า {page} / {Math.max(1, Math.ceil(results.data.total / 12))}</span><button className="btn btn-secondary" disabled={page * 12 >= results.data.total} onClick={() => update({ page: page + 1 })}>ถัดไป</button></nav></>}
  </div>;
}
