import { useEffect, useRef } from 'react';

export function AdminHeader({ title, description, action }) {
  return <header className="admin-page-header"><div><h1 className="admin-heading">{title}</h1>{description && <p className="admin-description">{description}</p>}</div>{action}</header>;
}

export function AdminLoading({ label = 'กำลังโหลดข้อมูล…', cards = false }) {
  return <div role="status"><p className="sr-only">{label}</p><div className={`admin-loading ${cards ? 'admin-loading-cards' : ''}`} aria-hidden="true">
    {Array.from({ length: cards ? 2 : 3 }, (_, index) => <div key={index} className="admin-skeleton"><span /><span /><span /></div>)}
  </div></div>;
}

export function AdminFeedback({ id, message, success = false, attempt }) {
  const ref = useRef(null);
  useEffect(() => { if (message && !success) ref.current?.focus(); }, [message, success, attempt]);
  return message ? <p id={id} ref={ref} role={success ? 'status' : 'alert'} tabIndex={success ? undefined : -1} className={`${success ? 'notice' : 'form-error'} admin-feedback`}>{message}</p> : null;
}

export function AdminCell({ label, header = false, children }) {
  const Tag = header ? 'th' : 'td';
  return <Tag scope={header ? 'row' : undefined} role={header ? 'rowheader' : 'cell'}><span className="admin-cell-label" aria-hidden="true">{label}</span><div className="admin-cell-value">{children}</div></Tag>;
}

export function AdminCount({ value }) {
  return Number.isInteger(value) && value >= 0 ? value.toLocaleString('th-TH') : 'ยังไม่ทราบจำนวน';
}
