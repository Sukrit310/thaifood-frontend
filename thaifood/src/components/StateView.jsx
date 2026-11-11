export function LoadingState({ label = 'กำลังโหลดข้อมูล…' }) {
  return <div className="state-view" role="status" aria-live="polite"><div className="skeleton-bar" /><p>{label}</p></div>;
}
export function ErrorState({ error, onRetry }) {
  return <div className="state-view error-state" role="alert"><span className="state-symbol">!</span><h2>โหลดข้อมูลไม่สำเร็จ</h2><p>{error?.message || 'ไม่สามารถเชื่อมต่อได้ กรุณาลองอีกครั้ง'}</p>{onRetry && <button className="btn btn-secondary" onClick={onRetry}>ลองอีกครั้ง</button>}</div>;
}
export function EmptyState({ title = 'ยังไม่มีข้อมูล', description, children }) {
  return <div className="state-view"><span className="state-symbol">—</span><h2>{title}</h2>{description && <p>{description}</p>}{children}</div>;
}
