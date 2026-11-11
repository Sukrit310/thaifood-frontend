import { Link } from 'react-router-dom';
export default function NotFound() { return <div className="container state-view page-space"><p className="eyebrow">404 · NOT FOUND</p><h1 className="page-heading">เส้นทางนี้ยังไม่มีร้านอร่อย</h1><p>ไม่พบหน้าที่คุณกำลังมองหา ลองกลับไปเริ่มต้นค้นหาใหม่</p><Link className="btn btn-primary" to="/restaurants">ค้นหาร้านอาหาร</Link></div>; }
