# Go Backend integration

เชื่อมกับ [Sukrit310/thaifood-backend](https://github.com/Sukrit310/thaifood-backend) ที่ commit `89f2ce2898717ae2649985f45d4034de18e12131` ตรวจวันที่ 12 พฤศจิกายน 2569 (Asia/Bangkok)

**API:** https://thaifood-guide-api-a7c7.onrender.com

Frontend ใช้ Go เป็นค่าเริ่มต้นแล้ว (`REACT_APP_USE_MOCK=false`); Mock ต้องเปิดด้วย `true` ชัดเจน Service/endpoint/JSON ยังคง Contract v2 ไม่มีการแก้ backend repository หรือ environment ของ Render

## ผล integration จริง

เรียก **src/api/services.js → src/api/backend.js → native fetch → Go** ด้วย `scripts/smoke-api.cjs --member-flow` ได้ **11 checks / 33 HTTP requests ผ่านทั้งหมด** หลักฐาน status/path และเวลาอยู่ใน [LIVE_API_RESULTS.json](LIVE_API_RESULTS.json) ไม่มี token/password ในไฟล์รายงาน

- [x] Health200: Go แจ้ง database พร้อมใช้งาน
- [x] Provinces77, categories7, restaurants25 จาก API จริง
- [x] Thai filters, pagination, detail, reviews, empty200 และ404
- [x] CORS preflight อนุญาต localhost:3000 พร้อม Authorization/write methods และปฏิเสธ originอื่น403
- [x] Guest/invalid token401 และล้าง client session
- [x] Register201 → Login200 → GET/PATCH Me200
- [x] รหัสผ่านเดิมผิด401INVALID_CREDENTIALS คง session; เปลี่ยนรหัสผ่าน204 และ loginรหัสใหม่200
- [x] Member เรียก Admin members ได้403 และไม่ logout
- [x] Favorites POST201/GET200/DELETE204 และตรวจผลหลังลบ
- [x] Review POST201/GET200, รีวิวซ้ำ409, DELETE204 และ reviewCount อัปเดต/กลับค่าเดิม
- [x] ลบรีวิวและ favorite ที่ probe สร้างออกแล้ว

Probe สร้างบัญชี disposable member 1 บัญชีซึ่งยังอยู่ใน DB เพราะไม่มี member-delete endpoint; สุ่มรหัสผ่านไว้เฉพาะหน่วยความจำและทิ้งหลังรัน ไม่แก้ข้อมูลหรือใช้บัญชีของสมาชิกเดิม

## Development / Codespaces

`npm start` ใช้ relative `/api/*` → CRA development proxy → Go API แบบ HTTPS พร้อมตรวจ TLS; proxy เอา Origin ของ browser ออกเนื่องจาก browser ส่ง same-origin request มาแล้ว แต่ส่ง Bearer token ให้ Go ตรวจสิทธิ์ตามปกติ ไม่เปลี่ยน Authorization ของ backend

ตรวจ HTTP ผ่าน CRA dev server ชั่วคราวพอร์ต3001 โดยส่ง Origin ของ Codespaces ได้200 และ restaurant response จาก Go: `total:25`, seed restaurant `id:1`, rating:null/count0. ไม่ใช่ browser visual/keyboard test

หลังแก้ `.env.local`/`setupProxy.js` ให้ restart server เดิม หากต้องการ direct CORS test ตั้ง `REACT_APP_DEV_PROXY=false`. Production build ไม่ใช้ development proxy

## สถานะตรวจรับล่าสุด

- [x] Admin restaurant CRUD/moderation บน Go จริงด้วยบัญชีAdminทดสอบ:5checks/42browserAPIrequests;ลบร้านQAและข้อมูลที่เกี่ยวข้องแล้ว
- [x] Browser visual/keyboard/responsive QA:Chromium/Firefox/WebKit,168viewportchecksและ42Axe scansไม่มีviolations
- [x] Deploy Vercelและตรวจdirect deep links/refresh/guardsด้วยbrowser;ผลตรวจlogout/accessibilityก่อนปล่อยเวอร์ชันอยู่ใน [FINAL_ACCEPTANCE.md](FINAL_ACCEPTANCE.md)
- [x] ตรวจ CORS ของ production origin หลัก: จังหวัด/ร้านอาหาร 200 และ login/auth preflight 204; ดู [ผลตรวจล่าสุด](CORS_CHECK.md)

รายละเอียดรอบ13พฤศจิกายน2026,APIจริง/cleanupและข้อจำกัดSafari/assistive technologyจริงอยู่ใน [FINAL_ACCEPTANCE.md](FINAL_ACCEPTANCE.md) ใช้รายงานนี้สำหรับสถานะปัจจุบัน ส่วนตัวเลขและผลด้านบนเป็นintegrationรอบ12พฤศจิกายน

ขณะตรวจ integration รอบแรก Backend อนุญาต `http://localhost:3000` เท่านั้น ผลตรวจล่าสุดอนุญาต `https://thaifood-frontend.vercel.app` แล้ว แต่ยังปฏิเสธโดเมนสำรอง `https://thaifood-frontend-670710721.vercel.app` ไม่ได้แก้ environment หรือ deploy Backend ใน session นี้ หากต้องเพิ่ม origin ให้ append ค่าที่ไม่มี path หรือ slashท้าย โดยคง origins เดิม ไม่ใช้ wildcard ไม่ใส่ DATABASE_URL/JWT_SECRET ใน Frontend

บัญชี Mock `demo@example.com`/`admin@example.com` ใช้กับ Go จริงไม่ได้ ให้สมัครบัญชีใหม่ ผู้ดูแล backend ต้องเลื่อน role ของบัญชีที่ต้องเป็น Admin ตาม README ของ Backend
