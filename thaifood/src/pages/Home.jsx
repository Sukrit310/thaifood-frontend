import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { restaurantService } from '../api/services';
import { useAuth } from '../auth/AuthContext';
import useResource from '../hooks/useResource';
import RestaurantGrid from '../components/RestaurantGrid';
import './Home.css';

const destinations = [
  { name: 'เชียงใหม่', title: 'เชียงใหม่', region: 'เสน่ห์เมืองเหนือ', caption: 'เครื่องแกงหอมกรุ่น กับมื้ออุ่นใจ', image: 'food-noodles.svg', tone: 'north' },
  { name: 'กรุงเทพมหานคร', title: 'กรุงเทพฯ', region: 'รสชาติของเมือง', caption: 'ร้านริมทางถึงคาเฟ่ในซอยเล็ก', image: 'food-cafe.svg', tone: 'central' },
  { name: 'ภูเก็ต', title: 'ภูเก็ต', region: 'กลิ่นอายทะเลใต้', caption: 'เครื่องเทศเข้มข้น และรสมือพื้นถิ่น', image: 'food-soup.svg', tone: 'south' },
  { name: 'ขอนแก่น', title: 'ขอนแก่น', region: 'ม่วนใจสไตล์อีสาน', caption: 'ข้าวเหนียวร้อน ๆ กับรสแซ่บคุ้นเคย', image: 'food-rice.svg', tone: 'isan' },
];

function ResourceError({ error, onRetry, label }) {
  return <div className="home-resource-error" role="alert">
    <p>{error?.message || 'เชื่อมต่อไม่ได้ กรุณาลองอีกครั้ง'}</p>
    <button type="button" className="home-retry" onClick={onRetry}>{label}</button>
  </div>;
}

function RestaurantLoading() {
  return <div role="status" aria-live="polite" className="home-loading">
    <p className="home-visually-hidden">กำลังโหลดร้านอาหาร</p>
    <div className="home-loading-grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => <div className="home-skeleton" key={index}>
        <div className="home-skeleton-image" /><div className="home-skeleton-line" /><div className="home-skeleton-line home-skeleton-short" />
      </div>)}
    </div>
  </div>;
}

function handleHeroError(event) {
  const image = event.currentTarget;
  image.removeAttribute('srcset');
  if (image.getAttribute('src') !== '/images/hero-bowl.svg') image.src = '/images/hero-bowl.svg';
}

export default function Home() {
  const navigate = useNavigate();
  const { member } = useAuth();
  const [q, setQ] = useState('');
  const [province, setProvince] = useState('');
  const restaurants = useResource(() => restaurantService.list({ page: 1, limit: 6 }), []);
  const provinces = useResource(() => restaurantService.provinces(), []);

  function search(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (province) params.set('province', province);
    const query = params.toString();
    navigate('/restaurants' + (query ? '?' + query : ''));
  }

  return <div className="home-page">
    <section className="home-container home-hero" aria-labelledby="home-title">
      <div className="home-hero-copy">
        <p className="home-kicker" lang="en">THAILAND, ONE BITE AT A TIME</p>
        <h1 id="home-title" className="home-title"><span>ทุกจังหวัด</span><span>มีเรื่อง<span className="home-title-accent">อร่อย</span></span></h1>
        <p className="home-intro">ออกตามหารสชาติท้องถิ่น ตั้งแต่มื้อคุ้นเคย<br className="home-desktop-break" />ไปจนถึงร้านเล็ก ๆ ที่อยากลอง</p>
        <form className="home-search-form" role="search" aria-label="ค้นหาร้านอาหาร" onSubmit={search}>
          <label className="home-query-field" htmlFor="home-query"><span>ชื่อร้านหรือเมนู</span>
            <input id="home-query" type="search" value={q} onChange={event => setQ(event.target.value)} placeholder="วันนี้อยากกินอะไร?" />
          </label>
          <div className="home-search-bottom">
            <label htmlFor="home-province"><span>จังหวัด</span>
              <select id="home-province" value={province} onChange={event => setProvince(event.target.value)} disabled={provinces.loading || !provinces.data}>
                <option value="">{provinces.loading ? 'กำลังโหลดจังหวัด…' : provinces.error ? 'ค้นหาได้โดยไม่เลือกจังหวัด' : 'ทุกจังหวัด'}</option>
                {provinces.data?.items.map(item => <option value={item.nameTh} key={item.id}>{item.nameTh}</option>)}
              </select>
            </label>
            <button className="home-button home-button-primary" type="submit">ค้นหาร้านอร่อย <span aria-hidden="true">↗</span></button>
          </div>
        </form>
        {provinces.error && <ResourceError error={provinces.error} onRetry={provinces.retry} label="ลองโหลดจังหวัดอีกครั้ง" />}
      </div>
      <figure className="home-hero-visual">
        <img src="/images/home-editorial/khao-soi-1100.webp" srcSet="/images/home-editorial/khao-soi-640.webp 640w, /images/home-editorial/khao-soi-1100.webp 1100w" sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1279px) 46vw, 560px" width="1100" height="1100" alt="ภาพประกอบข้าวซอยในชามเซรามิก เสิร์ฟกับส้มตำ มะนาว และสมุนไพรไทย" fetchPriority="high" onError={handleHeroError} />
      </figure>
    </section>

    <section className="home-container home-destinations" aria-labelledby="home-destinations-title">
      <div className="home-section-heading"><h2 id="home-destinations-title">อยากไปอร่อยที่ไหน?</h2><p>เลือกจุดหมาย แล้วให้รสชาติพาออกเดินทาง</p></div>
      <div className="home-destination-grid">
        {destinations.map(item => <Link to={'/restaurants?province=' + encodeURIComponent(item.name)} className={'home-destination home-destination-' + item.tone} key={item.name} aria-label={'ค้นหาร้านอาหารใน' + item.name}>
          <div className="home-destination-top"><span>{item.region}</span><span className="home-destination-arrow" aria-hidden="true">↗</span></div>
          <img src={'/images/' + item.image} alt="" width="240" height="160" loading="lazy" className="home-destination-image" />
          <h3>{item.title}</h3><p>{item.caption}</p>
        </Link>)}
      </div>
    </section>

    <section className="home-discover" aria-labelledby="home-discover-title">
      <div className="home-container">
        <div className="home-discover-heading">
          <div className="home-section-heading"><h2 id="home-discover-title">ปักหมุดมื้อถัดไป</h2><p>เปิดดูร้านที่น่าสนใจ แล้วเลือกมื้อที่เป็นคุณ</p></div>
          <Link className="home-text-link" to="/restaurants">ดูร้านทั้งหมด <span aria-hidden="true">↗</span></Link>
        </div>
        {restaurants.loading ? <RestaurantLoading /> : restaurants.error ?
          <ResourceError error={restaurants.error} onRetry={restaurants.retry} label="ลองโหลดร้านอาหารอีกครั้ง" /> :
          restaurants.data?.items.length ? <RestaurantGrid items={restaurants.data.items} /> :
            <div className="home-empty"><h3>ยังไม่พบร้านอาหาร</h3><p>ลองเปิดหน้าค้นหาเพื่อเลือกจังหวัดหรือคำค้นที่คุณสนใจ</p><Link className="home-button home-button-secondary" to="/restaurants">สำรวจร้านอาหารทั้งหมด</Link></div>}
      </div>
    </section>

    <section className="home-container home-community" aria-labelledby="home-community-title">
      <div className="home-community-copy">
        <p className="home-kicker" lang="en">GOOD FOOD IS BETTER SHARED</p>
        <h2 id="home-community-title">บางร้าน อร่อยจนอยากเก็บไว้</h2>
        <p>บันทึกร้านที่ชอบไว้ในรายการโปรด แล้วแบ่งปันประสบการณ์มื้ออร่อยผ่านรีวิวของคุณ</p>
      </div>
      <div className="home-community-action">
        <ul><li>เก็บร้านที่อยากกลับไปอีก</li><li>เล่ารสชาติในแบบของคุณ</li></ul>
        <Link to={member ? '/favorites' : '/register'} className="home-button home-button-primary">{member ? 'ไปยังร้านโปรด' : 'เริ่มบันทึกร้านที่ชอบ'} <span aria-hidden="true">↗</span></Link>
      </div>
    </section>
  </div>;
}
