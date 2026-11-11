import { useState } from 'react';
export default function ReviewForm({ onSubmit }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (text.trim().length < 10) { setError('กรุณาเขียนรีวิวอย่างน้อย 10 ตัวอักษร'); return; }
    setError(''); setBusy(true);
    try { await onSubmit({ rating, text: text.trim() }); setText(''); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="review-form panel" noValidate><h3>แบ่งปันความอร่อยของคุณ</h3><fieldset disabled={busy}><legend>ให้คะแนนร้านนี้</legend><div className="star-input">{[1, 2, 3, 4, 5].map(value => <label key={value} className={value <= rating ? 'selected' : ''}><input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} aria-label={`${value} ดาว`} /><span aria-hidden="true">★</span></label>)}</div></fieldset><label className="field" htmlFor="review-text">รีวิวของคุณ<textarea id="review-text" className="input" value={text} onChange={event => setText(event.target.value)} rows={4} maxLength={3000} placeholder="เมนูที่ชอบ บรรยากาศ และประสบการณ์ของคุณ…" disabled={busy} aria-describedby="review-help" /></label><small id="review-help" className="muted">อย่างน้อย 10 ตัวอักษร · 1 รีวิวต่อสมาชิกต่อร้าน</small>{error && <p role="alert" className="form-error">{error}</p>}<button className="btn btn-primary" disabled={busy}>{busy ? 'กำลังส่ง…' : 'ส่งรีวิว'}</button></form>;
}
