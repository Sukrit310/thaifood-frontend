import React from 'react';
import { adminService } from '../../api/services';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateView';
import useAdminData from './useAdminData';

export default function AdminMembers() {
  const { data, loading, error, reload } = useAdminData(() => adminService.members());
  return <><h1 className="page-heading">สมาชิก</h1><p className="muted mb-7">รายชื่อสมาชิกและสิทธิ์การใช้งานในระบบ</p>
    {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.items.length ? <EmptyState title="ยังไม่มีสมาชิก" description="สมาชิกใหม่จะปรากฏที่นี่หลังสมัครสำเร็จ" /> : <div className="panel overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">สมาชิกทั้งหมด {data.items.length} คน</caption><thead className="bg-gray-50 text-gray-600"><tr><th scope="col" className="p-4">ชื่อที่แสดง</th><th scope="col" className="p-4">อีเมล</th><th scope="col" className="p-4">สิทธิ์</th></tr></thead><tbody>{data.items.map(member => <tr className="border-t" key={member.id}><th scope="row" className="p-4 font-medium whitespace-nowrap">{member.displayName}</th><td className="p-4">{member.email}</td><td className="p-4 whitespace-nowrap"><span className={`rounded-full px-3 py-1 text-xs font-medium ${member.role === 'admin' ? 'bg-green-100 text-green-900' : 'bg-gray-100 text-gray-700'}`}>{member.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก'}</span></td></tr>)}</tbody></table></div>}
  </>;
}
