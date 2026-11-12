import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { restaurantService } from '../api/services';
import useResource from '../hooks/useResource';
import RestaurantGrid from '../components/RestaurantGrid';
import { ErrorState } from '../components/StateView';
import './Restaurants.css';

const PAGE_SIZE = 12;

function ResultsLoading() {
  return <div className="restaurants-loading" role="status" aria-live="polite">
    <p className="sr-only">กำลังค้นหาร้านอาหาร…</p>
    <div className="restaurants-skeleton-grid" aria-hidden="true">
      {Array.from({ length: PAGE_SIZE }, (_, index) => <div className="restaurants-skeleton" key={index}>
        <div className="restaurants-skeleton-image" /><div className="restaurants-skeleton-line" /><div className="restaurants-skeleton-line restaurants-skeleton-short" />
      </div>)}
    </div>
  </div>;
}

export default function Restaurants() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const province = searchParams.get('province') || '';
  const category = searchParams.get('category') || '';
  const page = Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1);
  const [search, setSearch] = useState(q);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resultsHeading = useRef(null);
  useEffect(() => { setSearch(q); }, [q]);
  const filters = useResource(() => Promise.all([restaurantService.provinces(), restaurantService.categories()]), []);
  const results = useResource(() => restaurantService.list({ q, province, category, page, limit: PAGE_SIZE }), [q, province, category, page]);
  const items = results.data?.items || [];
  const total = results.data?.total;
  const hasTotal = typeof total === 'number' && Number.isFinite(total) && total >= 0;
  const totalPages = hasTotal ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
  const firstItem = (page - 1) * PAGE_SIZE + 1;
  const lastItem = hasTotal ? Math.min(total, firstItem + items.length - 1) : 0;
  const activeFilters = [
    { key: 'q', label: 'คำค้น', value: q },
    { key: 'province', label: 'จังหวัด', value: province },
    { key: 'category', label: 'ประเภทอาหาร', value: category },
  ].filter(filter => filter.value);
  const extraFilterCount = Number(Boolean(province)) + Number(Boolean(category));
  const filterFields = [
    { key: 'province', id: 'province-filter', label: 'จังหวัด', empty: 'ทุกจังหวัด', value: province, items: filters.data?.[0]?.items || [] },
    { key: 'category', id: 'category-filter', label: 'ประเภทอาหาร', empty: 'ทุกประเภท', value: category, items: filters.data?.[1]?.items || [] },
  ];
  const emptyPage = hasTotal && page > totalPages;

  function update(values) {
    const next = new URLSearchParams(searchParams);
    Object.entries({ page: 1, ...values }).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key));
    setSearchParams(next);
  }
  function reset() { setSearch(''); setSearchParams({}); }
  function changePage(nextPage) {
    update({ page: nextPage });
    resultsHeading.current?.focus({ preventScroll: true });
    resultsHeading.current?.scrollIntoView?.({ block: 'start' });
  }

  return <div className="restaurants-page">
    <div className="container restaurants-content">
      <header className="restaurants-intro">
        <p className="eyebrow">EXPLORE LOCAL FLAVORS</p>
        <h1 className="page-heading">ร้านอร่อย รอให้คุณค้นพบ</h1>
        <p>เริ่มจากชื่อร้าน จังหวัด หรือประเภทอาหาร แล้วเลือกมื้อถัดไปในแบบของคุณ</p>
      </header>

      <form className={'search-filter panel restaurants-filters' + (filtersOpen ? ' is-expanded' : '')} role="search" aria-label="ค้นหาและกรองร้านอาหาร" onSubmit={event => { event.preventDefault(); update({ q: search.trim() }); }}>
        <div className="field search-field">
          <label htmlFor="restaurant-search">ค้นหาร้านอาหาร</label>
          <input id="restaurant-search" className="input" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ชื่อร้าน เมนู หรือรสชาติที่คิดถึง" />
        </div>
        <button type="button" className="restaurants-filter-toggle" aria-controls="restaurant-extra-filters" aria-expanded={filtersOpen} aria-label={'ตัวกรองเพิ่มเติม จังหวัดและประเภทอาหาร' + (extraFilterCount ? ' เลือกอยู่ ' + extraFilterCount + ' ตัวกรอง' : '')} onClick={() => setFiltersOpen(open => !open)}>
          <span>ตัวกรองเพิ่มเติม{extraFilterCount ? <span className="restaurants-filter-count">{extraFilterCount}</span> : null}</span><span aria-hidden="true">{filtersOpen ? '−' : '+'}</span>
        </button>
        <div id="restaurant-extra-filters" className={'restaurants-extra-filters' + (filtersOpen ? ' is-open' : '')}>
          {filterFields.map(filter => <div className="field filter-field" key={filter.key}>
            <label htmlFor={filter.id}>{filter.label}</label>
            <select id={filter.id} className="input" value={filter.value} disabled={filters.loading || Boolean(filters.error)} aria-describedby={filters.loading || filters.error ? 'restaurant-filter-status' : undefined} onChange={event => update({ [filter.key]: event.target.value })}>
              <option value="">{filters.loading ? 'กำลังโหลดตัวเลือก…' : filter.empty}</option>
              {filter.value && !filter.items.some(item => item.nameTh === filter.value) && <option value={filter.value}>{filter.value}</option>}
              {filter.items.map(item => <option key={item.id} value={item.nameTh}>{item.nameTh}</option>)}
            </select>
          </div>)}
        </div>
        <button className="btn btn-primary restaurants-submit" type="submit">ค้นหา</button>
      </form>
      {(filters.loading || filters.error) && <p className="restaurants-filter-status" id="restaurant-filter-status" aria-live="polite">{filters.loading ? 'กำลังเตรียมตัวเลือกจังหวัดและประเภทอาหาร…' : 'ตัวกรองที่เลือกไว้ยังคงอยู่ คุณยังค้นหาด้วยคำค้นต่อได้'}</p>}
      {filters.error && <div className="restaurants-filter-error" role="alert">
        <div><p className="restaurants-filter-error-title">โหลดตัวเลือกตัวกรองไม่สำเร็จ</p><p>{filters.error.message || 'เชื่อมต่อไม่ได้ กรุณาลองอีกครั้ง'}</p></div>
        <button type="button" className="btn btn-secondary" onClick={filters.retry}>โหลดตัวกรองอีกครั้ง</button>
      </div>}

      {activeFilters.length > 0 && <div className="restaurants-active-filters" role="group" aria-label="ตัวกรองที่เลือก">
        <ul>{activeFilters.map(filter => <li key={filter.key}>
          <button type="button" className="restaurants-filter-chip" aria-label={'ลบตัวกรอง' + filter.label + ' ' + filter.value} title={filter.label + ': ' + filter.value} onClick={() => update({ [filter.key]: '' })}>
            <span>{filter.label}: {filter.value}</span><span aria-hidden="true">×</span>
          </button>
        </li>)}</ul>
        <button type="button" className="text-button restaurants-clear" onClick={reset}>ล้างตัวกรอง</button>
      </div>}

      <section className="restaurants-results" aria-labelledby="restaurant-results-heading">
        <div className="restaurants-results-heading">
          <h2 id="restaurant-results-heading" tabIndex={-1} ref={resultsHeading}>ผลการค้นหา</h2>
          <p className="restaurants-total" aria-live="polite">{results.loading ? 'กำลังค้นหาร้านอาหาร…' : results.error ? 'ยังโหลดรายการร้านอาหารไม่ได้' : hasTotal ? <><strong>{total.toLocaleString('th-TH')}</strong> ร้านอาหาร</> : 'รายการร้านอาหาร'}</p>
        </div>

        {results.loading ? <ResultsLoading /> : results.error ? <ErrorState error={results.error} onRetry={results.retry} /> : !items.length ?
          <div className="restaurants-empty panel">
            <p className="restaurants-empty-kicker">{emptyPage ? 'กลับไปดูรายการล่าสุด' : 'ยังมีรสชาติอื่นให้ค้นพบ'}</p>
            <h3>{emptyPage ? 'ไม่มีรายการในหน้านี้' : 'ไม่พบร้านที่ค้นหา'}</h3>
            <p>{emptyPage ? 'ลองกลับไปหน้าแรก โดยคงตัวกรองที่คุณเลือกไว้' : activeFilters.length ? 'ลองเปลี่ยนคำค้น จังหวัด หรือประเภทอาหาร เพื่อค้นหาร้านที่ตรงใจ' : 'ขณะนี้ยังไม่มีรายการร้านอาหารให้แสดง ลองโหลดรายการอีกครั้ง'}</p>
            <button type="button" className="btn btn-secondary" onClick={emptyPage ? () => changePage(1) : activeFilters.length ? reset : results.retry}>{emptyPage ? 'กลับไปหน้าแรก' : activeFilters.length ? 'ดูร้านทั้งหมด' : 'โหลดรายการอีกครั้ง'}</button>
          </div> :
          <>
            <RestaurantGrid items={items} />
            <div className="restaurants-pagination">
              {hasTotal && firstItem <= total && <p className="restaurants-range">แสดง {firstItem.toLocaleString('th-TH')}–{lastItem.toLocaleString('th-TH')} จาก {total.toLocaleString('th-TH')} ร้านอาหาร</p>}
              <nav className="pagination" aria-label="แบ่งหน้าร้านอาหาร">
                <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => changePage(page - 1)}>ก่อนหน้า</button>
                <span className="restaurants-page-number">หน้า <strong>{page}</strong>{hasTotal && <> จาก {totalPages}</>}</span>
                <button type="button" className="btn btn-secondary" disabled={!hasTotal || page >= totalPages} onClick={() => changePage(page + 1)}>ถัดไป</button>
              </nav>
            </div>
          </>}
      </section>
    </div>
  </div>;
}
