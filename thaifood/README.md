# ThaiFood Guide

React 19 + Create React App (`react-scripts` 5) + React Router 6 + Tailwind CSS 3 + native Fetch + Jest/React Testing Library เว็บภาษาไทยสำหรับค้นหาร้านอาหาร บันทึกร้านโปรด เขียนรีวิว และจัดการร้านโดย Admin

## เริ่มใช้งาน

ใช้ Node.js 22 LTS และ npm จาก directory นี้:

```bash
npm ci
npm start
```

เปิด `http://localhost:3000` ค่าเริ่มต้นเชื่อม Go API จริงที่ **https://thaifood-guide-api-a7c7.onrender.com** จาก [thaifood-backend](https://github.com/Sukrit310/thaifood-backend) โดยใช้ Contract v2 เดิม ปัจจุบัน API มี 77 จังหวัด 7 ประเภท และร้านเริ่มต้นสมมติ 25 ร้านที่อ่านจากฐานข้อมูล

ใน Codespaces/VS Code Remote ให้เปิด workspace ที่ root ของ repository แล้วรัน `npm start` จาก `thaifood/` การตั้งค่าใน `../.vscode/settings.json` จะตรวจ port 3000, forward และเปิดหน้าเว็บใน browser อัตโนมัติ หาก editor ยังใช้ค่าเดิม ให้ใช้ **Developer: Reload Window** หนึ่งครั้งก่อนเริ่ม server ใหม่

ตอน `npm start` เรียก `/api/*` ผ่าน CRA proxy ไป Go เพื่อให้ localhost/Codespaces ใช้งานได้โดยไม่ติด browser CORS; production build เรียก Render โดยตรง Proxy ตรวจ TLS และส่ง Bearer token ให้ Go ตรวจตามปกติ หลังแก้ `.env` หรือ `src/setupProxy.js` ต้องหยุด dev server เดิมแล้วรัน `npm start` ใหม่

**สมัครบัญชีใหม่ผ่านเว็บเพื่อใช้ Backend จริง** ไม่มีบัญชี Admin เริ่มต้น ให้ผู้ดูแล Backend เลื่อน role ด้วยขั้นตอนที่ระบุใน repository Backend; Frontend ไม่มี endpoint สมัคร Admin

ฟอนต์ Noto Sans Thai จาก Fontsource (OFL) เสิร์ฟจาก build เอง ภาพ fallback เป็น SVG ของโครงการ

## ทดลอง Mock แบบออฟไลน์

ถ้าต้องการ Mock ให้ตั้ง `REACT_APP_USE_MOCK=true` ใน `.env.local` แล้ว restart มีร้านสมมติ 18 ร้านและบัญชีสาธารณะต่อไปนี้ ซึ่ง **ไม่ใช่บัญชีของ Backend จริง**

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

## การตั้งค่า Go Backend

ค่าเริ่มต้นตั้งไว้แล้วใน `src/api/defaults.json` สามารถคัดลอก `.env.example` เป็น `.env.local` เพื่อระบุค่าเอง:

```dotenv
REACT_APP_USE_MOCK=false
REACT_APP_API_URL=https://thaifood-guide-api-a7c7.onrender.com
```

URL นี้เป็น deployment จริงที่ตรวจ `/health` และทดสอบ service แล้ว Restart `npm start` หรือ rebuild ทุกครั้งที่แก้ตัวแปร CRA การไม่ตั้งค่า หรือใช้ `false` จะเรียก Go จริง ไม่มี fallback ไป Mock เมื่อเครือข่าย/CORS ล้มเหลว Mock ต้องระบุ `true` อย่างชัดเจนเท่านั้น

Development ใช้ same-origin proxy โดยค่าเริ่มต้น หากต้องการตรวจ direct CORS จาก localhost ให้ตั้ง `REACT_APP_DEV_PROXY=false` แล้ว restart; ค่า proxy ไม่มีผลกับ production

`src/api/backend.js` จัดการ Bearer token, JSON, 204, ApiError (`status`, `code`, `message`), 401 และ 403. ฟังก์ชันแต่ละกลุ่มอยู่ใน `src/api/services.js` ใช้ endpoint และ camelCase ตรง Contract v2; query จังหวัด/ประเภทใช้ชื่อภาษาไทย ส่วน Admin write ใช้ numeric IDs

Session ใช้ key `thaifood.token`, revalidate ผ่าน `/api/me`, รอการตรวจ session ก่อนเปิด protected route และเก็บ token ไว้ให้ Retry เมื่อเครือข่ายล่ม 401 ของ session ปัจจุบันล้าง session; ยกเว้น `INVALID_CREDENTIALS` จากการกรอกรหัสผ่านเดิมผิดใน Change Password ซึ่งจะแสดงข้อความและคง session; 403 แสดงข้อผิดพลาดโดยไม่ logout. Guard ฝั่ง React มีไว้ควบคุม UI; Go ต้องตรวจ JWT/Role/Owner จริง Logout ลบ session ใน browser และไม่ revoke JWT ที่ออกไปแล้ว

Mock บันทึกข้อมูลต่อ browser origin ที่ `thaifood.mock.v2` เพื่อให้ refresh แล้วยังมีข้อมูล รีเซ็ตใน DevTools Console:

```js
localStorage.removeItem('thaifood.mock.v2');
localStorage.removeItem('thaifood.token');
location.reload();
```

Validation ตรง Go: รหัสผ่านใหม่ 8–72 UTF-8 bytes, Login/รหัสผ่านเดิม 1–72 bytes, ชื่อแสดงผล 1–100 Unicode code points, รีวิว 10–5000 code points; imageUrl สำหรับ Admin ต้องเป็น absolute HTTP(S) ไม่เกิน 2048 bytes และไม่มี userinfo พิกัดต้องเป็นคู่ เมื่อเว้นว่างจะละ keys ไม่ส่ง `null`; ในหน้าแก้ไขการละพิกัดหมายถึงคงค่าเดิม

## ทดสอบและ build

```bash
npm test -- --watchAll=false --runInBand
npm run build
npm run smoke:api
```

Jest/RTL ครอบคลุม HTTP paths/query/header/body, 204/400/401/403/404/409, API failure, รีวิวซ้ำ/เจ้าของ/คะแนน, favorite/cascade, mock persistence ข้ามแท็บ, 401 session race, AuthContext, role guards, Login/Register validation, search/loading/empty/error/retry, review forms และ UI journeys ผ่าน mock จริง รวม Admin CRUD/moderation

`npm run smoke:api` ตรวจ public endpoints/CORS/401/404 ผ่าน **service และ transport ของ Frontend จริง** โดยใช้ native Fetch ไป Go ไม่มี Mock. หากต้องการทดสอบสมาชิกด้วย ใช้:

```bash
npm run smoke:api -- --member-flow --report=../docs/LIVE_API_RESULTS.json
```

คำสั่ง `--member-flow` สร้างบัญชีทดสอบใหม่ 1 บัญชี ทดสอบ Register/Login/Profile/Password/Favorites/Reviews/403/409 แล้วลบรีวิวและ favorite ที่สร้าง รหัสผ่าน/token ใช้เฉพาะในหน่วยความจำและไม่บันทึก บัญชีทดสอบยังคงอยู่เพราะ Contract ไม่มี endpoint ลบสมาชิก; อย่ารันซ้ำโดยไม่จำเป็น

GitHub Actions ใน `../.github/workflows/frontend.yml` ใช้ `npm ci`, test และ build บน Node22

## Deploy Vercel

1. Import GitHub repository `thaifood-frontend` ใน Vercel
2. ตั้ง **Root Directory: `thaifood`**, Framework Preset: **Create React App**
3. Install: `npm ci`, Build: `npm run build`, Output: `build` (`vercel.json` เตรียมไว้แล้ว)
4. ตั้ง `REACT_APP_USE_MOCK=false` และ `REACT_APP_API_URL=https://thaifood-guide-api-a7c7.onrender.com` ใน environment ที่ deploy; Preview แบบออฟไลน์เลือก `REACT_APP_USE_MOCK=true` ได้
5. Redeploy หลังแก้ environment; ให้ BE เพิ่ม localhost และ Vercel origin จริงใน `ALLOWED_ORIGINS`
6. ตรวจ direct URL และ refresh `/restaurants/101`, `/favorites`, `/admin` เพื่อยืนยัน SPA rewrite/guards และทำ integration checklist ก่อนส่งงาน

Frontend production อยู่ที่ **https://thaifood-frontend.vercel.app** (deploy วันที่ 12 พฤศจิกายน 2026 จากไฟล์ล่าสุดใน workspace, Node 22, `npm ci`, `npm run build`) Vercel แสดงสถานะ `READY`; หน้าแรกและ direct URLs `/restaurants/1`, `/favorites`, `/admin` เสิร์ฟ SPA ได้ HTTP 200 และ Jest ผ่าน 91 tests ผลตรวจ Render ล่าสุดจาก origin หลักผ่าน CORS แล้ว: จังหวัด/ร้านอาหาร 200, login preflight 204, login ข้อมูลว่าง 400 `VALIDATION_ERROR` พร้อม CORS header ถูกต้อง ยังไม่ได้ตรวจการเข้าสู่ระบบด้วยบัญชีจริง ส่วน origin สำรอง **https://thaifood-frontend-670710721.vercel.app** ยังตอบ 403 `CORS_FORBIDDEN` ดู [ผลตรวจ CORS ล่าสุด](../docs/CORS_CHECK.md) รอบนี้ deploy เฉพาะ Frontend ตามที่เลือก

Frontend เชื่อม Render จริงและผ่าน live member/public probes จากสภาพแวดล้อมเดิมแล้ว; ยังไม่ได้ทดสอบ Admin CRUD จริงเพราะไม่มีบัญชี Admin ใน session นี้ ดูหลักฐานใน `../docs/INTEGRATION.md` ไม่ commit `.env`, token หรือ secret; ค่า `REACT_APP_*` เป็นค่าที่ฝังใน public bundle จึงไม่ใช้เก็บความลับ

## โครงสร้างและเครดิต

- `src/App.jsx`: routes; `App.js`: CRA-compatible re-export
- `src/components`: Layout, route guards, RestaurantCard/Grid, ReviewForm/List และ StateView
- `src/pages`: public/member pages และ `admin/`
- `src/auth/AuthContext.jsx`: identity/session state
- `src/api`: live configuration, API transport/services และ contract tests
- `src/setupProxy.js`: CRA development proxy สำหรับ localhost/Codespaces
- `scripts/smoke-api.cjs`: actual-service live API probes
- `src/utils/validation.js`: Go-compatible Unicode/UTF-8 validation
- `src/mock`: fixtures/77 provinces และ contract mock transport
- `src/hooks/useResource.js`: async loading/retry และกัน response เก่าทับค่าล่าสุด
- `public/images`: ภาพประกอบ SVG ของโครงการ ไม่ใช้ภาพ/คะแนนจาก Google หรือ TMDB

อ้างอิงโครงสร้างจาก [MovieHub โดย 670710721](https://github.com/670710721/moviehub-670710721) อ่านต้นแบบอย่างเดียว ไม่แก้ repository ต้นฉบับ รายการไฟล์ที่อ่านและ mapping ก่อน implementation อยู่ใน `../docs/REFERENCE_MAPPING.md` เอกสาร ThaiFood v2 ทั้งสามไฟล์ใน root เป็นข้อกำหนดงาน
