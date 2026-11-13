import { useEffect, useRef, useState } from 'react';
import { adminService } from '../../api/services';
import { useAuth } from '../../auth/AuthContext';
import { ErrorState, EmptyState } from '../../components/StateView';
import useAdminData from './useAdminData';
import { AdminCell, AdminFeedback, AdminHeader, AdminLoading } from './AdminUI';
import MemberRoleDialog from './MemberRoleDialog';
import './AdminMembers.css';

export default function AdminMembers() {
  const { member: actor } = useAuth();
  const { data, loading, error, reload } = useAdminData(() => adminService.members());
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');
  const heading = useRef(null);
  useEffect(() => { if (notice && !selected) heading.current?.focus(); }, [notice, selected]);
  function edit(member, trigger) { setNotice(''); setSelected({ member, trigger }); }
  function saved(member) {
    setNotice(`เปลี่ยนสิทธิ์ของ ${member.displayName} เป็น${member.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก'}แล้ว`);
    setSelected(null); reload();
  }
  return <><AdminHeader title="สมาชิก" description="รายชื่อสมาชิกและสิทธิ์การใช้งานในระบบ" />
    <section aria-labelledby="admin-members-heading"><div className="admin-summary-bar"><h2 ref={heading} tabIndex={-1} className="admin-section-heading" id="admin-members-heading">รายชื่อสมาชิก</h2>{!loading && !error && <p className="admin-count">{data.items.length.toLocaleString('th-TH')} คน</p>}</div>
      <AdminFeedback success message={notice} />
      {loading ? <AdminLoading label="กำลังโหลดสมาชิก…" /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.items.length ? <EmptyState title="ยังไม่มีสมาชิก" description="สมาชิกใหม่จะปรากฏที่นี่หลังสมัครสำเร็จ" /> : <div className="panel admin-table-panel"><table className="admin-table admin-members-table" role="table"><caption className="sr-only">สมาชิกทั้งหมด {data.items.length} คน</caption><thead><tr role="row"><th scope="col">ชื่อที่แสดง</th><th scope="col">อีเมล</th><th scope="col">สิทธิ์</th><th scope="col">จัดการ</th></tr></thead><tbody>
        {data.items.map(member => <tr key={member.id} role="row"><AdminCell label="ชื่อที่แสดง" header>{member.displayName}</AdminCell><AdminCell label="อีเมล">{member.email}</AdminCell><AdminCell label="สิทธิ์"><span className={`admin-member-role ${member.role === 'admin' ? 'admin-member-role-admin' : ''}`}>{member.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก'}</span></AdminCell><AdminCell label="จัดการ">{String(member.id) === String(actor?.id) ? <><span className="admin-member-self">บัญชีของคุณ</span><p className="admin-hint">เปลี่ยนสิทธิ์ตัวเองไม่ได้</p></> : actor?.role === 'admin' ? <button type="button" className="admin-action" aria-haspopup="dialog" aria-label={`เปลี่ยนสิทธิ์ ${member.displayName}`} onClick={event => edit(member, event.currentTarget)}>เปลี่ยนสิทธิ์</button> : <span className="admin-hint">ไม่มีสิทธิ์จัดการ</span>}</AdminCell></tr>)}
      </tbody></table></div>}
    </section>
    {selected && <MemberRoleDialog member={selected.member} returnFocus={selected.trigger} onDismiss={() => setSelected(null)} onSaved={saved} />}
  </>;
}
