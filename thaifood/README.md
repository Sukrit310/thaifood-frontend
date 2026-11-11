# ThaiFood Guide

React 19 + Create React App (`react-scripts` 5) + React Router 6 + Tailwind CSS 3 + native Fetch + Jest/React Testing Library เว็บภาษาไทยสำหรับค้นหาร้านอาหาร บันทึกร้านโปรด เขียนรีวิว และจัดการร้านโดย Admin

## เริ่มใช้งาน

ใช้ Node.js 22 LTS และ npm จาก directory นี้:

```bash
npm ci
npm start
```

เปิด `http://localhost:3000` ค่าเริ่มต้นเป็น Mock ไม่ต้องมี Go Backend หรือ `.env` เพื่อเริ่มทดลอง มีจังหวัดครบ 77 จังหวัด ร้านสมมติ 18 ร้านใน 5 จังหวัด และภาพ SVG ที่สร้างสำหรับโครงการ ฟอนต์ Noto Sans Thai จากแพ็กเกจ Fontsource (OFL) เสิร์ฟจาก build เอง

| บทบาท | อีเมลทดลอง | รหัสผ่านทดลอง |
| --- | --- | --- |
| Member | demo@example.com | ExamplePassword123 |
| Admin | admin@example.com | ExamplePassword123 |

ข้อมูลและบัญชีข้างต้นเป็น fixture สาธารณะสำหรับ Mock เท่านั้น ระบบจำลองใช้ digest เพื่อไม่เก็บรหัสผ่านเป็น plain text แต่ไม่ใช่ระบบรักษาความปลอดภัยจริง ห้ามใช้รหัสผ่านจริงใน Mock; เมื่อเชื่อม Go ระบบ authentication/authorization เป็นหน้าที่ backend

## หน้าจอ

| Route | ผู้ใช้ | การใช้งาน |
| --- | --- | --- |
| `/` | ทุกคน | หน้าแรก ค้นหา จังหวัดแนะนำ ร้านจากฐานข้อมูล |
| `/restaurants` | ทุกคน | คำค้น จังหวัด ประเภท Pagination และ query ใน URL |
| `/restaurants/:id` | ทุกคน | รายละเอียด คะแนน รีวิว แผนที่ และปุ่มร้านโปรด |
| `/register`, `/login` | Guest | สมัครและเข้าสู่ระบบ |
| `/profile`, `/change-password` | Member/Admin | แก้ชื่อแสดงผลและเปลี่ยนรหัสผ่าน |
| `/favorites` | Member/Admin | ดูและนำร้านออกจากรายการโปรด |
| `/admin` | Admin | ภาพรวมจาก API ที่มีใน Contract |
| `/admin/restaurants` | Admin | ค้นหา เพิ่ม แก้ไข ลบร้าน |
| `/admin/restaurants/new`, `/admin/restaurants/:id/edit` | Admin | ฟอร์มร้านพร้อม provinceId/categoryId และตรวจพิกัด |
| `/admin/reviews` | Admin | เลือกร้านเพื่อดูและลบรีวิว |
| `/admin/members` | Admin | อ่านรายชื่อสมาชิก ไม่มี endpoint เปลี่ยน role |
| `*` | ทุกคน | 404 |

ทุกหน้าดึงข้อมูลรองรับ Loading/Empty/Error/Retry; ฟอร์มใช้ controlled inputs และป้องกันส่งซ้ำ รีวิว 1–5 ดาว ข้อความอย่างน้อย 10 ตัวอักษร และสมาชิกหนึ่งคนรีวิวร้านหนึ่งได้ครั้งเดียว (409 เมื่อซ้ำ) คะแนนเฉลี่ยคำนวณจากรีวิวเว็บ หากไม่มีรีวิวเป็น `rating: null`, `reviewCount: 0`

Admin moderation เลือกร้านและใช้ `GET /api/restaurants/{id}/reviews` เพราะ Contract v2 ไม่มี endpoint รวมรีวิว Admin หรือ admin stats; ไม่สร้าง endpoint เพิ่มเอง หน้ารายการรีวิวของฉันไม่ได้เพิ่มเพราะไม่มี API ใน MVP

## สลับไป Go Backend

คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ URL จริง:

```dotenv
REACT_APP_USE_MOCK=false
REACT_APP_API_URL=https://YOUR-ACTUAL-BACKEND.onrender.com
```

ตัวอย่าง URL ยังไม่ใช่ deployment จริง Restart `npm start` หรือ rebuild ทุกครั้งที่แก้ตัวแปร CRA เมื่อเป็น `false` จะเรียก `fetch()` จริงเท่านั้น ไม่มี fallback ไป Mock หากเครือข่ายหรือ CORS ผิดพลาด การไม่ตั้งค่าหรือใช้ `true` จะเป็น Mock

`src/api/backend.js` จัดการ Bearer token, JSON, 204, ApiError (`status`, `code`, `message`), 401 และ 403. ฟังก์ชันแต่ละกลุ่มอยู่ใน `src/api/services.js` ใช้ endpoint และ camelCase ตรง Contract v2; query จังหวัด/ประเภทใช้ชื่อภาษาไทย ส่วน Admin write ใช้ numeric IDs

Session ใช้ key `thaifood.token`, revalidate ผ่าน `/api/me`, รอการตรวจ session ก่อนเปิด protected route และเก็บ token ไว้ให้ Retry เมื่อเครือข่ายล่ม 401 ของ session ปัจจุบันล้าง session; 403 แสดงข้อผิดพลาดโดยไม่ logout. Guard ฝั่ง React มีไว้ควบคุม UI; Go ต้องตรวจ JWT/Role/Owner จริง Logout ลบ session ใน browser และไม่ revoke JWT ที่ออกไปแล้ว

Mock บันทึกข้อมูลต่อ browser origin ที่ `thaifood.mock.v2` เพื่อให้ refresh แล้วยังมีข้อมูล รีเซ็ตใน DevTools Console:

```js
localStorage.removeItem('thaifood.mock.v2');
localStorage.removeItem('thaifood.token');
location.reload();
```

## ทดสอบและ build

```bash
npm test -- --watchAll=false --runInBand
npm run build
```

Jest/RTL ครอบคลุม HTTP paths/query/header/body, 204/400/401/403/404/409, API failure, รีวิวซ้ำ/เจ้าของ/คะแนน, favorite/cascade, mock persistence ข้ามแท็บ, 401 session race, AuthContext, role guards, Login/Register validation, search/loading/empty/error/retry, review forms และ UI journeys ผ่าน mock จริง รวม Admin CRUD/moderation

GitHub Actions ใน `../.github/workflows/frontend.yml` ใช้ `npm ci`, test และ build บน Node22

## Deploy Vercel

1. Import GitHub repository `thaifood-frontend` ใน Vercel
2. ตั้ง **Root Directory: `thaifood`**, Framework Preset: **Create React App**
3. Install: `npm ci`, Build: `npm run build`, Output: `build` (`vercel.json` เตรียมไว้แล้ว)
4. Preview แบบ Mock ตั้ง `REACT_APP_USE_MOCK=true`; เมื่อพร้อมเชื่อม Go ตั้ง `REACT_APP_USE_MOCK=false` และ `REACT_APP_API_URL` เป็น Render URL จริงใน environment ที่ deploy
5. Redeploy หลังแก้ environment; ให้ BE เพิ่ม localhost และ Vercel origin จริงใน `ALLOWED_ORIGINS`
6. ตรวจ direct URL และ refresh `/restaurants/101`, `/favorites`, `/admin` เพื่อยืนยัน SPA rewrite/guards และทำ integration checklist ก่อนส่งงาน

ไม่มี deployment หรือ Render URL จริงถูกสร้างในการส่งงานรอบนี้ รายละเอียดและช่องเก็บหลักฐานอยู่ใน `../docs/INTEGRATION.md` ไม่ commit `.env`, token หรือ secret; ค่า `REACT_APP_*` เป็นค่าที่ฝังใน public bundle จึงไม่ใช้เก็บความลับ

## โครงสร้างและเครดิต

- `src/App.jsx`: routes; `App.js`: CRA-compatible re-export
- `src/components`: Layout, route guards, RestaurantCard/Grid, ReviewForm/List และ StateView
- `src/pages`: public/member pages และ `admin/`
- `src/auth/AuthContext.jsx`: identity/session state
- `src/api`: API transport/services และ contract tests
- `src/mock`: fixtures/77 provinces และ contract mock transport
- `src/hooks/useResource.js`: async loading/retry และกัน response เก่าทับค่าล่าสุด
- `public/images`: ภาพประกอบ SVG ของโครงการ ไม่ใช้ภาพ/คะแนนจาก Google หรือ TMDB

อ้างอิงโครงสร้างจาก [MovieHub โดย 670710721](https://github.com/670710721/moviehub-670710721) อ่านต้นแบบอย่างเดียว ไม่แก้ repository ต้นฉบับ รายการไฟล์ที่อ่านและ mapping ก่อน implementation อยู่ใน `../docs/REFERENCE_MAPPING.md` เอกสาร ThaiFood v2 ทั้งสามไฟล์ใน root เป็นข้อกำหนดงาน
