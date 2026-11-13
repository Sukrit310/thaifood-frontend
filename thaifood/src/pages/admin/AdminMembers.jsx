import React from 'react';
import { adminService } from '../../api/services';
import { ErrorState, EmptyState } from '../../components/StateView';
import useAdminData from './useAdminData';
import { AdminCell, AdminHeader, AdminLoading } from './AdminUI';

export default function AdminMembers() {
  const { data, loading, error, reload } = useAdminData(() => adminService.members());
  return <><AdminHeader title="สมาชิก" description="รายชื่อสมาชิกและสิทธิ์การใช้งานในระบบ" />
    <section aria-labelledby="admin-members-heading"><div className="admin-summary-bar"><h2 className="admin-section-heading" id="admin-members-heading">รายชื่อสมาชิก</h2>{!loading && !error && <p className="admin-count">{data.items.length.toLocaleString('th-TH')} คน</p>}</div>
      {loading ? <AdminLoading label="กำลังโหลดสมาชิก…" /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.items.length ? <EmptyState title="ยังไม่มีสมาชิก" description="สมาชิกใหม่จะปรากฏที่นี่หลังสมัครสำเร็จ" /> : <div className="panel admin-table-panel"><table className="admin-table admin-members-table" role="table"><caption className="sr-only">สมาชิกทั้งหมด {data.items.length} คน</caption><thead><tr role="row"><th scope="col">ชื่อที่แสดง</th><th scope="col">อีเมล</th><th scope="col">สิทธิ์</th></tr></thead><tbody>
        {data.items.map(member => <tr key={member.id} role="row"><AdminCell label="ชื่อที่แสดง" header>{member.displayName}</AdminCell><AdminCell label="อีเมล">{member.email}</AdminCell><AdminCell label="สิทธิ์"><span className={`admin-member-role ${member.role === 'admin' ? 'admin-member-role-admin' : ''}`}>{member.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก'}</span></AdminCell></tr>)}
      </tbody></table></div>}
    </section>
  </>;
}
