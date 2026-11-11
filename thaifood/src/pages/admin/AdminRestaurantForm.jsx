import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminService, restaurantService } from '../../api/services';
import { LoadingState, ErrorState } from '../../components/StateView';
import useAdminData from './useAdminData';

const blank = { name: '', provinceId: '', categoryId: '', address: '', description: '', latitude: '', longitude: '', imageUrl: '' };
export function validateRestaurant(form) {
  if (!form.name.trim() || !form.provinceId || !form.categoryId || !form.address.trim() || !form.description.trim()) return 'กรุณากรอกชื่อร้าน จังหวัด ประเภท ที่อยู่ และรายละเอียดให้ครบ';
  for (const [field, limit, label] of [['latitude', 90, 'ละติจูด'], ['longitude', 180, 'ลองจิจูด']]) {
    if (form[field] !== '' && (!Number.isFinite(Number(form[field])) || Math.abs(Number(form[field])) > limit)) return `${label}ต้องเป็นตัวเลขระหว่าง -${limit} ถึง ${limit}`;
  }
  if ((form.latitude === '') !== (form.longitude === '')) return 'กรุณากรอกพิกัดทั้งละติจูดและลองจิจูด หรือเว้นว่างทั้งคู่';
  if (form.imageUrl.trim()) {
    const value = form.imageUrl.trim();
    if (value.startsWith('/') && !value.startsWith('//')) return '';
    try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol)) return 'ลิงก์รูปภาพต้องใช้ http หรือ https'; }
    catch { return 'กรุณากรอกลิงก์รูปภาพ http/https ที่ถูกต้อง หรือพาธที่เริ่มด้วย /'; }
  }
  return '';
}
export default function AdminRestaurantForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const { data, loading, error, reload } = useAdminData(() => Promise.all([restaurantService.provinces(), restaurantService.categories(), id ? restaurantService.get(id) : Promise.resolve(null)]), [id]);
  useEffect(() => {
    if (!data) return;
    const restaurant = data[2];
    setForm(restaurant ? {
      name: restaurant.name, provinceId: String(data[0].items.find(item => item.nameTh === restaurant.province)?.id || ''),
      categoryId: String(data[1].items.find(item => item.nameTh === restaurant.category)?.id || ''), address: restaurant.address || '', description: restaurant.description || '',
      latitude: restaurant.latitude ?? '', longitude: restaurant.longitude ?? '', imageUrl: restaurant.imageUrl || '',
    } : blank);
  }, [data]);
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    const invalid = validateRestaurant(form); if (invalid) { setFormError(invalid); return; }
    setBusy(true); setFormError('');
    const body = { name: form.name.trim(), provinceId: Number(form.provinceId), categoryId: Number(form.categoryId), address: form.address.trim(), description: form.description.trim(), latitude: form.latitude === '' ? null : Number(form.latitude), longitude: form.longitude === '' ? null : Number(form.longitude), imageUrl: form.imageUrl.trim() || null };
    try { if (id) await adminService.updateRestaurant(id, body); else await adminService.createRestaurant(body); navigate('/admin/restaurants', { replace: true }); }
    catch (failure) { setFormError(failure.message); }
    finally { setBusy(false); }
  }
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return <div className="max-w-3xl"><Link className="text-sm muted underline" to="/admin/restaurants">กลับรายการร้านอาหาร</Link><h1 className="page-heading mt-4 mb-7">{id ? 'แก้ไขร้านอาหาร' : 'เพิ่มร้านอาหาร'}</h1>
    <form onSubmit={submit} noValidate className="panel p-6 md:p-8 space-y-5"><div className="field"><label htmlFor="restaurant-name">ชื่อร้าน *</label><input id="restaurant-name" name="name" className="input" maxLength={200} value={form.name} onChange={change} required /></div>
      <div className="grid sm:grid-cols-2 gap-5"><div className="field"><label htmlFor="restaurant-province">จังหวัด *</label><select id="restaurant-province" name="provinceId" className="input" value={form.provinceId} onChange={change} required><option value="">เลือกจังหวัด</option>{data[0].items.map(item => <option key={item.id} value={item.id}>{item.nameTh}</option>)}</select></div><div className="field"><label htmlFor="restaurant-category">ประเภทอาหาร *</label><select id="restaurant-category" name="categoryId" className="input" value={form.categoryId} onChange={change} required><option value="">เลือกประเภท</option>{data[1].items.map(item => <option key={item.id} value={item.id}>{item.nameTh}</option>)}</select></div></div>
      <div className="field"><label htmlFor="restaurant-address">ที่อยู่ *</label><input id="restaurant-address" name="address" className="input" value={form.address} onChange={change} required /></div>
      <div className="field"><label htmlFor="restaurant-description">รายละเอียด *</label><textarea id="restaurant-description" name="description" className="input min-h-32" rows={5} value={form.description} onChange={change} required /></div>
      <div className="grid sm:grid-cols-2 gap-5"><div className="field"><label htmlFor="restaurant-latitude">ละติจูด</label><input id="restaurant-latitude" name="latitude" type="number" step="any" min={-90} max={90} className="input" value={form.latitude} onChange={change} /></div><div className="field"><label htmlFor="restaurant-longitude">ลองจิจูด</label><input id="restaurant-longitude" name="longitude" type="number" step="any" min={-180} max={180} className="input" value={form.longitude} onChange={change} /></div></div>
      <div className="field"><label htmlFor="restaurant-image">ลิงก์รูปภาพ</label><input id="restaurant-image" name="imageUrl" className="input" value={form.imageUrl} onChange={change} placeholder="https://… หรือ /images/…" /><p className="text-xs muted">ใช้ภาพที่ได้รับอนุญาต เว้นว่างเพื่อแสดงภาพเริ่มต้น</p></div>
      {formError && <p role="alert" className="text-red-700 text-sm">{formError}</p>}<div className="flex flex-wrap gap-3 pt-2"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึกร้านอาหาร'}</button><Link className="btn btn-secondary" to="/admin/restaurants">ยกเลิก</Link></div>
    </form></div>;
}
