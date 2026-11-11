import { useState } from 'react';
import { EmptyState } from './StateView';
export default function ReviewList({ items, member, onDelete }) {
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  async function remove(id) {
    if (deleting !== null || !window.confirm('ต้องการลบรีวิวนี้หรือไม่?')) return;
    setDeleting(id); setError('');
    try { await onDelete(id); } catch (failure) { setError(failure.message); } finally { setDeleting(null); }
  }
  if (!items.length) return <EmptyState title="เป็นคนแรกที่รีวิวร้านนี้" description="ประสบการณ์ของคุณช่วยให้คนอื่นค้นพบร้านอร่อย" />;
  return <div className="review-list">{error && <p role="alert" className="form-error">{error}</p>}{items.map(review => <article className="review-item" key={review.id}><div className="review-avatar" aria-hidden="true">{review.member.displayName.slice(0, 1)}</div><div className="review-body"><div className="review-heading"><h3>{review.member.displayName}</h3><time dateTime={review.createdAt}>{new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(review.createdAt))}</time></div><p className="review-stars" aria-label={`${review.rating} จาก 5 ดาว`}>{'★'.repeat(review.rating)}<span>{'☆'.repeat(5 - review.rating)}</span></p><p>{review.text}</p>{member && (member.id === review.member.id || member.role === 'admin') && <button className="text-button danger" onClick={() => remove(review.id)} disabled={deleting !== null}>{deleting === review.id ? 'กำลังลบ…' : 'ลบรีวิว'}</button>}</div></article>)}</div>;
}
