# Production CORS check

ตรวจ HTTP จริงวันที่ 12 พฤศจิกายน 2026 (Asia/Bangkok) ไปที่ `https://thaifood-guide-api-a7c7.onrender.com` โดยไม่แก้ environment หรือ deploy Backend

## ผลล่าสุด

Origin หลัก `https://thaifood-frontend.vercel.app` ผ่าน CORS แล้ว ต่างจากผล `403 CORS_FORBIDDEN` ที่พบตอน deploy ครั้งแรก Response ของทั้ง public endpoints และ authentication endpoints มี `Access-Control-Allow-Origin: https://thaifood-frontend.vercel.app` ตรงกับ origin ที่ส่ง

| Request | Origin | Status / ผล |
| --- | --- | --- |
| `GET /health` | ไม่ส่ง Origin | 200, `status: ok` |
| `GET /api/provinces` | ไม่ส่ง Origin | 200, 77 จังหวัด |
| `GET /api/provinces` | `http://localhost:3000` | 200, CORS header ตรง origin |
| `GET /api/provinces` | โดเมนหลัก | 200, 77 จังหวัด |
| `GET /api/restaurants?limit=1` | โดเมนหลัก | 200, 1 item, total 25 |
| `OPTIONS /api/auth/login` (`POST`, `content-type`) | `http://localhost:3000` | 204 |
| `OPTIONS /api/auth/login` (`POST`, `content-type`) | โดเมนหลัก | 204 |
| `OPTIONS /api/me` (`GET`, `authorization`) | โดเมนหลัก | 204 |
| `POST /api/auth/login` ด้วย JSON `{}` | โดเมนหลัก | 400 `VALIDATION_ERROR`, ผ่าน CORS และถึง validation ของ login |
| `GET /api/me` ไม่ส่ง token | โดเมนหลัก | 401 `UNAUTHORIZED`, ผ่าน CORS และถึง auth middleware |
| `GET /api/provinces` | `https://thaifood-frontend-670710721.vercel.app` | 403 `CORS_FORBIDDEN` |
| `OPTIONS /api/auth/login` (`POST`, `content-type`) | `https://thaifood-frontend-670710721.vercel.app` | 403 `CORS_FORBIDDEN` |

Preflight ที่ผ่านอนุญาต methods `GET, POST, PUT, PATCH, DELETE, OPTIONS` และ headers `Authorization, Content-Type`

## การใช้งาน

เปิดเว็บผ่าน **https://thaifood-frontend.vercel.app** แล้ว refresh ได้เลย หากต้องการใช้โดเมนสำรองด้วย ให้เพิ่ม `https://thaifood-frontend-670710721.vercel.app` ใน Render `ALLOWED_ORIGINS` โดยคง origins เดิม แล้ว redeploy Backend; ไม่ใส่ path หรือ slash ท้าย origin

ผลนี้ยืนยัน HTTP/CORS และ login validation เท่านั้น ไม่ได้ทดสอบการเข้าสู่ระบบด้วยบัญชีจริงหรือ browser journey ไม่ได้สร้างบัญชีหรือแก้ข้อมูลของสมาชิก

Backend exact-match origin ตาม [CORS middleware](https://github.com/Sukrit310/thaifood-backend/blob/89f2ce2898717ae2649985f45d4034de18e12131/mw/http.go#L21); environment ใช้ comma-separated origins ตาม [configuration parser](https://github.com/Sukrit310/thaifood-backend/blob/89f2ce2898717ae2649985f45d4034de18e12131/internal/config/config.go#L33)
