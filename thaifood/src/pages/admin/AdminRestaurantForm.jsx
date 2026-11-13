import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminService, restaurantService } from '../../api/services';
import { isMockMode } from '../../api/backend';
import { unicodeLength, validateImageUrl } from '../../utils/validation';
import { ErrorState } from '../../components/StateView';
import useAdminData from './useAdminData';
import { AdminFeedback, AdminHeader, AdminLoading } from './AdminUI';

const blank = { name: '', provinceId: '', categoryId: '', address: '', description: '', latitude: '', longitude: '', imageUrl: '' };
export function validateRestaurant(form) {
  if (!form.name.trim() || !form.provinceId || !form.categoryId || !form.address.trim() || !form.description.trim()) return 'กรุณากรอกชื่อร้าน จังหวัด ประเภท ที่อยู่ และรายละเอียดให้ครบ';
  for (const [field, maximum, label] of [['name', 200, 'ชื่อร้าน'], ['address', 1000, 'ที่อยู่'], ['description', 5000, 'รายละเอียด']]) {
    if (form[field].includes('\u0000')) return `${label}มีอักขระที่ไม่รองรับ กรุณาลบและพิมพ์ใหม่`;
    if (unicodeLength(form[field].trim()) > maximum) return `${label}ต้องมีความยาว 1–${maximum} ตัวอักษร`;
  }
  for (const [field, limit, label] of [['latitude', 90, 'ละติจูด'], ['longitude', 180, 'ลองจิจูด']]) {
    if (form[field] !== '' && (!Number.isFinite(Number(form[field])) || Math.abs(Number(form[field])) > limit)) return `${label}ต้องเป็นตัวเลขระหว่าง -${limit} ถึง ${limit}`;
  }
  if ((form.latitude === '') !== (form.longitude === '')) return 'กรุณากรอกพิกัดทั้งละติจูดและลองจิจูด หรือเว้นว่างทั้งคู่';
  return validateImageUrl(form.imageUrl);
}
export default function AdminRestaurantForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const { data, loading, error, reload } = useAdminData(() => Promise.all([restaurantService.provinces(), restaurantService.categories(), id ? restaurantService.get(id) : Promise.resolve(null)]), [id]);
  useEffect(() => {
    if (!data) return;
    const restaurant = data[2];
    setForm(restaurant ? {
      name: restaurant.name, provinceId: String(data[0].items.find(item => item.nameTh === restaurant.province)?.id || ''),
      categoryId: String(data[1].items.find(item => item.nameTh === restaurant.category)?.id || ''), address: restaurant.address || '', description: restaurant.description || '',
      latitude: restaurant.latitude ?? '', longitude: restaurant.longitude ?? '',
      imageUrl: isMockMode && restaurant.imageUrl?.startsWith('/') ? new URL(restaurant.imageUrl, window.location.origin).href : restaurant.imageUrl || '',
    } : blank);
  }, [data]);
  const change = event => { setForm(current => ({ ...current, [event.target.name]: event.target.value })); setFormError(''); };
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setAttempt(current => current + 1);
    const invalid = validateRestaurant(form); if (invalid) { setFormError(invalid); return; }
    setBusy(true); setFormError('');
    const body = { name: form.name.trim(), provinceId: Number(form.provinceId), categoryId: Number(form.categoryId), address: form.address.trim(), description: form.description.trim(), imageUrl: form.imageUrl.trim() || null };
    if (form.latitude !== '' && form.longitude !== '') {
      body.latitude = Number(form.latitude);
      body.longitude = Number(form.longitude);
    }
    try { if (id) await adminService.updateRestaurant(id, body); else await adminService.createRestaurant(body); navigate('/admin/restaurants', { replace: true }); }
    catch (failure) { setFormError(failure.message); }
    finally { setBusy(false); }
  }
  const requiredInvalid = name => formError === 'กรุณากรอกชื่อร้าน จังหวัด ประเภท ที่อยู่ และรายละเอียดให้ครบ' && !String(form[name]).trim();
  return <><Link className="admin-action admin-back" to="/admin/restaurants">← กลับรายการร้านอาหาร</Link><AdminHeader title={id ? 'แก้ไขร้านอาหาร' : 'เพิ่มร้านอาหาร'} description="ช่องที่มี * จำเป็นต้องกรอก ส่วนพิกัดและรูปภาพระบุภายหลังได้" />
    {loading ? <AdminLoading label="กำลังโหลดข้อมูลร้านอาหาร…" /> : error ? <ErrorState error={error} onRetry={reload} /> :
      <form onSubmit={submit} noValidate className="panel admin-form" aria-busy={busy}>
        <fieldset disabled={busy} className="admin-form-section"><legend>ข้อมูลร้านอาหาร</legend>
          <div className="field"><label htmlFor="restaurant-name">ชื่อร้าน *</label><input id="restaurant-name" name="name" className="input" value={form.name} onChange={change} aria-invalid={requiredInvalid('name') || undefined} aria-describedby={requiredInvalid('name') ? 'admin-form-error' : undefined} required /></div>
          <div className="admin-form-pair"><div className="field"><label htmlFor="restaurant-province">จังหวัด *</label><select id="restaurant-province" name="provinceId" className="input" value={form.provinceId} onChange={change} aria-invalid={requiredInvalid('provinceId') || undefined} aria-describedby={requiredInvalid('provinceId') ? 'admin-form-error' : undefined} required><option value="">เลือกจังหวัด</option>{data[0].items.map(item => <option key={item.id} value={item.id}>{item.nameTh}</option>)}</select></div>
            <div className="field"><label htmlFor="restaurant-category">ประเภทอาหาร *</label><select id="restaurant-category" name="categoryId" className="input" value={form.categoryId} onChange={change} aria-invalid={requiredInvalid('categoryId') || undefined} aria-describedby={requiredInvalid('categoryId') ? 'admin-form-error' : undefined} required><option value="">เลือกประเภท</option>{data[1].items.map(item => <option key={item.id} value={item.id}>{item.nameTh}</option>)}</select></div></div>
          <div className="field"><label htmlFor="restaurant-description">รายละเอียด *</label><textarea id="restaurant-description" name="description" className="input" rows={5} value={form.description} onChange={change} aria-invalid={requiredInvalid('description') || undefined} aria-describedby={requiredInvalid('description') ? 'admin-form-error' : undefined} required /></div>
        </fieldset>
        <fieldset disabled={busy} className="admin-form-section"><legend>ที่ตั้งและรูปภาพ</legend>
          <div className="field"><label htmlFor="restaurant-address">ที่อยู่ *</label><input id="restaurant-address" name="address" className="input" value={form.address} onChange={change} aria-invalid={requiredInvalid('address') || undefined} aria-describedby={requiredInvalid('address') ? 'admin-form-error' : undefined} required /></div>
          <div className="admin-form-pair"><div className="field"><label htmlFor="restaurant-latitude">ละติจูด</label><input id="restaurant-latitude" name="latitude" type="number" step="any" min={-90} max={90} className="input" value={form.latitude} onChange={change} aria-describedby="restaurant-coordinates-hint" /></div>
            <div className="field"><label htmlFor="restaurant-longitude">ลองจิจูด</label><input id="restaurant-longitude" name="longitude" type="number" step="any" min={-180} max={180} className="input" value={form.longitude} onChange={change} aria-describedby="restaurant-coordinates-hint" /></div></div>
          <p className="admin-hint" id="restaurant-coordinates-hint">{id ? 'กรอกพิกัดทั้งคู่ หรือเว้นว่างทั้งคู่เพื่อคงพิกัดเดิม' : 'กรอกพิกัดทั้งคู่ หรือเว้นว่างทั้งคู่หากยังไม่ระบุพิกัด'}</p>
          <div className="field"><label htmlFor="restaurant-image">ลิงก์รูปภาพ</label><input id="restaurant-image" name="imageUrl" type="text" className="input" value={form.imageUrl} onChange={change} aria-describedby="restaurant-image-hint" placeholder="https://example.com/food.jpg" /><p className="admin-hint" id="restaurant-image-hint">ใช้ลิงก์ http หรือ https แบบเต็มของภาพที่ได้รับอนุญาต เว้นว่างเพื่อใช้ภาพเริ่มต้น</p></div>
        </fieldset>
        <div className="admin-form-footer"><AdminFeedback id="admin-form-error" message={formError} attempt={attempt} /><div className="admin-actions"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึกร้านอาหาร'}</button><Link className="btn btn-secondary" to="/admin/restaurants">ยกเลิก</Link></div></div>
      </form>}
  </>;
}
