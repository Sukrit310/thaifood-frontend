import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { restaurantService } from '../api/services';
import useResource from '../hooks/useResource';
import RestaurantGrid from '../components/RestaurantGrid';
import { LoadingState, ErrorState, EmptyState } from '../components/StateView';
const destinations = [
  { name: 'เชียงใหม่', caption: 'ละมุนกลิ่นเครื่องแกงเมืองเหนือ', style: 'north', number: '01' },
  { name: 'กรุงเทพมหานคร', caption: 'รสชาติหลากหลาย ใจกลางเมือง', style: 'central', number: '02' },
  { name: 'ภูเก็ต', caption: 'ครบรสอาหารใต้ สบายใจริมทะเล', style: 'south', number: '03' },
  { name: 'ขอนแก่น', caption: 'แซ่บถึงใจ สไตล์อีสาน', style: 'isan', number: '04' },
];
export default function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [province, setProvince] = useState('');
  const restaurants = useResource(() => restaurantService.list({ page: 1, limit: 6 }), []);
  const provinces = useResource(() => restaurantService.provinces(), []);
  return <>
    <section className="container hero-section"><div className="hero-copy"><p className="eyebrow"><span className="little-line" /> YOUR NEXT DELICIOUS DISCOVERY</p><h1>ทุกจังหวัด<br />มีเรื่อง<span>อร่อย</span>ให้ค้นพบ<span className="hero-dot">.</span></h1><p className="hero-description">จากครัวท้องถิ่นถึงคาเฟ่มุมโปรด<br />ตามหารสชาติที่ใช่ แล้วเก็บความประทับใจไปด้วยกัน</p><div className="hero-note"><span className="note-mark">77</span><span>จังหวัดทั่วไทย<br /><strong>หลากรสชาติในที่เดียว</strong></span></div></div><div className="hero-art"><img src="/images/hero-bowl.svg" alt="ภาพวาดชามอาหารไทย พร้อมผัก สมุนไพร และมะนาว" fetchPriority="high" /><div className="art-label"><span>ปรุงด้วยเรื่องราว</span><strong>เสิร์ฟด้วยความเป็นท้องถิ่น</strong></div><span className="art-caption">A TASTE OF THAILAND</span></div></section>
    <div className="container"><form className="home-search panel" onSubmit={event => { event.preventDefault(); const params = new URLSearchParams(); if (q.trim()) params.set('q', q.trim()); if (province) params.set('province', province); navigate(`/restaurants?${params}`); }}><label htmlFor="home-query"><span>วันนี้อยากกินอะไร?</span><input id="home-query" type="search" value={q} onChange={event => setQ(event.target.value)} placeholder="ค้นหาชื่อร้าน หรือเมนูที่ชอบ" /></label><label htmlFor="home-province"><span>ไปอร่อยที่ไหนดี</span><select id="home-province" value={province} onChange={event => setProvince(event.target.value)}><option value="">ทุกจังหวัด</option>{provinces.data?.items.map(item => <option value={item.nameTh} key={item.id}>{item.nameTh}</option>)}</select></label><button className="btn btn-primary">ค้นหาร้านอร่อย <span aria-hidden="true">↗</span></button></form>{provinces.error && <ErrorState error={provinces.error} onRetry={provinces.retry} />}</div>
    <section className="container section-space"><div className="section-heading"><div><p className="eyebrow">PICK YOUR DESTINATION</p><h2>เริ่มต้นที่จังหวัดที่คุณรัก</h2></div><Link className="text-link" to="/restaurants">สำรวจทุกจังหวัด <span aria-hidden="true">↗</span></Link></div><div className="destination-grid">{destinations.map(item => <Link to={`/restaurants?province=${encodeURIComponent(item.name)}`} className={`destination ${item.style}`} key={item.name}><span className="destination-number">{item.number} / DESTINATION</span><div className="destination-landmark" aria-hidden="true"><i /><i /><i /></div><div><h3>{item.name}</h3><p>{item.caption}</p></div><span className="destination-arrow" aria-hidden="true">↗</span></Link>)}</div></section>
    <section className="recommendations section-space"><div className="container"><div className="section-heading"><div><p className="eyebrow">GOOD FOOD, GOOD MEMORIES</p><h2>ปักหมุดความอร่อยครั้งต่อไป</h2></div><Link className="text-link" to="/restaurants">ดูร้านทั้งหมด <span aria-hidden="true">↗</span></Link></div>{restaurants.loading ? <LoadingState /> : restaurants.error ? <ErrorState error={restaurants.error} onRetry={restaurants.retry} /> : restaurants.data?.items.length ? <RestaurantGrid items={restaurants.data.items} /> : <EmptyState title="ร้านอร่อยกำลังจะมา" description="กลับมาค้นพบร้านใหม่ได้เร็ว ๆ นี้" />}</div></section>
    <section className="container community-section"><span className="community-mark" aria-hidden="true">✳</span><div><p className="eyebrow">BETTER WHEN SHARED</p><h2>มื้อที่ดี เริ่มจากเรื่องเล่าของคุณ</h2><p>บันทึกร้านโปรด แชร์รีวิว และช่วยกันค้นพบความอร่อยทั่วไทย</p></div><Link to="/register" className="btn btn-primary">ร่วมเป็นส่วนหนึ่ง <span aria-hidden="true">↗</span></Link></section>
  </>;
}
