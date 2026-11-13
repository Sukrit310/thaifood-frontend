# ThaiFood Guide Frontend

React frontend เชื่อม [thaifood-backend](https://github.com/Sukrit310/thaifood-backend) และ Go API จริงที่ **https://thaifood-guide-api-a7c7.onrender.com** แล้ว

Frontend production: **https://thaifood-frontend.vercel.app** (Vercel, deploy วันที่ 12 พฤศจิกายน 2026 จากไฟล์ล่าสุดใน workspace) ตรวจหน้าแรกและ SPA deep links ผ่านแล้ว ผลตรวจ API ล่าสุดจากโดเมนหลักผ่าน CORS ทั้ง public endpoints และ login preflight ส่วนโดเมนสำรอง `thaifood-frontend-670710721.vercel.app` ยังถูกปฏิเสธ ดู [ผลตรวจ CORS ล่าสุด](docs/CORS_CHECK.md) รอบนี้ deploy เฉพาะ Frontend ตามที่เลือก

แอปอยู่ใน [`thaifood/`](thaifood/README.md):

```bash
cd thaifood
npm ci
npm start
```

เปิด http://localhost:3000 หรือ Codespaces forwarded port ของ dev server ต้อง restart `npm start` หลังอัปเดต `.env`/`setupProxy.js` หากมี server เดิมเปิดอยู่

ค่าเริ่มต้นเรียก Go จริง ไม่ใช้ Mock; สมัครบัญชีใหม่ผ่านเว็บ บัญชี `demo@example.com` และ `admin@example.com` เป็น fixture เฉพาะ Mock และใช้เข้าระบบ Backend จริงไม่ได้

ดู [คู่มือรัน/ทดสอบ/Deploy Vercel](thaifood/README.md), [ผล integration จริง](docs/INTEGRATION.md), [หลักฐาน HTTP](docs/LIVE_API_RESULTS.json), [ผล audit Backend](docs/BACKEND_AUDIT.md) และ [ตาราง mapping ต้นแบบ FE](docs/REFERENCE_MAPPING.md)
