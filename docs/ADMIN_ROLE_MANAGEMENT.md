# ThaiFood Admin — Member role management

งานตาม [ThaiFood_Admin_Role_Management_Codex.md](../ThaiFood_Admin_Role_Management_Codex.md) ใน repository Frontend ที่เปิดอยู่ ใช้ Auth/JWT, route guards, request helper และ Modern Thai Editorial design เดิม ไม่แก้ Backend repository, ฐานข้อมูล, dependencies หรือ environment

ผู้ใช้ยกเลิกงานลบบัญชี QA แล้ว จึงไม่มีการลบบัญชี ต่อมาวันที่ 14 พฤศจิกายน 2026 ผู้ใช้สั่งให้ทดสอบผ่านเว็บกับ Backend จริง และเพิ่มข้อมูลล็อกอินสมาชิก QA ในไฟล์ที่ Git ignore ทดสอบเปลี่ยน role เฉพาะบัญชีที่ระบุแล้วคืนเป็น Member เดิม ไม่มีการสร้างหรือลบบัญชี

## พฤติกรรมหน้าเว็บ

- หน้า `/admin/members` คงรายชื่อ อีเมล สิทธิ์ จำนวนสมาชิก และตาราง responsive เดิม เพิ่มคอลัมน์จัดการ
- บัญชีที่ login อยู่แสดง “บัญชีของคุณ — เปลี่ยนสิทธิ์ตัวเองไม่ได้” ไม่มีปุ่มแก้สิทธิ์ตัวเอง
- บัญชีอื่นมีปุ่ม “เปลี่ยนสิทธิ์” เปิด native modal dialog พร้อมชื่อ อีเมล สิทธิ์ปัจจุบันและตัวเลือก Member/Admin
- การเพิ่มสิทธิ์มีคำเตือนเรื่องการจัดการร้าน รีวิว และสิทธิ์สมาชิก ต้องเลือก role ที่ต่างจากเดิมและยืนยันก่อนส่ง PATCH
- ระหว่างส่งคำขอ ปิดการแก้ไข/ยืนยัน/ยกเลิกและ Escape พร้อม synchronous guard กันการส่งซ้ำ
- API สำเร็จและ response ตรง target/role จึงปิด dialog ประกาศผล และ re-fetch รายชื่อ ไม่แสดง role แบบ optimistic
- API ล้มเหลวคง role เดิมบนตารางและ draft ใน dialog พร้อมข้อความไทยและ focus ที่ error; retry ได้ ส่วน GET หลังบันทึกที่ล้มเหลวแสดง error/retry ของรายชื่อโดยไม่ปลอมข้อมูล
- Native dialog จัดการ modal focus containment; เริ่ม focus ที่ยกเลิก คืน focus ให้ปุ่มเดิมเมื่อยกเลิก/Escape และให้หัวข้อรายชื่อเมื่อบันทึกสำเร็จ

## Contract ที่ใช้

ตรงกับ [Backend API_CONTRACT.md ณ revision 927869a](https://github.com/Sukrit310/thaifood-backend/blob/927869a09821f49064f6305353db1ebd7b707611/API_CONTRACT.md)

```http
PATCH /api/admin/members/7/role
Authorization: Bearer <ADMIN_JWT>
Content-Type: application/json

{"role":"admin"}
```

ตัวอย่าง response `200 OK` เป็น Member object โดยไม่มี wrapper; ข้อมูลด้านล่างเป็นตัวอย่าง:

```json
{"id":7,"email":"member@example.invalid","displayName":"สมาชิกตัวอย่าง","role":"admin"}
```

| สถานการณ์ | HTTP / code |
|---|---|
| สำเร็จ / role เดิมของคนอื่น | 200 + Member (idempotent) |
| JWT ไม่มี/ผิด/หมดอายุ | 401 UNAUTHORIZED |
| Member, self-change หรือ actor ถูกลดสิทธิ์ระหว่างรอ | 403 FORBIDDEN |
| id/body/role ไม่ถูกต้อง | 400 VALIDATION_ERROR |
| target ไม่พบ | 404 NOT_FOUND |
| ลดสิทธิ์ขัดกับ last-admin guard | 409 LAST_ADMIN |
| Server/DB error | 500 INTERNAL_ERROR |

Body มี `role` เพียงฟิลด์เดียว รับเฉพาะ `member`/`admin`; id เป็น int64 บวก ฝั่ง Go เป็นผู้ตรวจ identity, role ปัจจุบันจาก DB, self-change, transaction/concurrency และการคง Admin อย่างน้อยหนึ่งคน Frontend และ Mock ไม่ใช่หลักฐานแทนการบังคับสิทธิ์ในฐานข้อมูลจริง

Production ยังคงใช้ fetch ไป Go API ตาม config เดิม ไม่มีการ fallback มาใช้ Mock เมื่อ endpoint ล้มเหลว Mock route ที่เพิ่มใช้เฉพาะโหมด Mock/tests และอ่าน role ปัจจุบันจากสมาชิกทุก request ดังนั้น token เดิมได้รับ/สูญเสียสิทธิ์ใน tests หลังเปลี่ยน role โดยไม่ต้อง login ใหม่ Register/Profile ใน Mock ปฏิเสธฟิลด์ role ให้ตรงกับ Go แทนการละทิ้งฟิลด์นี้เงียบ ๆ การสมัคร แก้ชื่อ และเปลี่ยนรหัสผ่านด้วย payload ปกติยังถูกทดสอบครบ

## ผลตรวจที่รันจริง

| การตรวจ | ผล |
|---|---|
| API transport / mock role contract | 40 tests ผ่าน; ก่อนเพิ่ม implementation พบ 22 failures ตามความสามารถที่ยังไม่มี |
| Member directory/dialog + Admin UI regressions | 34 tests ผ่าน; ก่อนเพิ่ม UI พบ 15 failures และ 3 response-validation cases ที่ล้มเหลวก่อนแก้ |
| ทั้งโปรเจกต์ | `CI=true npm test -- --watchAll=false --runInBand`: **254 tests / 23 suites ผ่าน** |
| Production build | `CI=true npm run build`: **Compiled successfully**; JS gzip106.70kB, CSS15.07kB มี Node toolchain deprecation warning เดิม |
| Browser/axe | Chromium141.0.7390.37, Firefox142.0.1, WebKit26.0: **15viewportcases + 6guest/memberguards ผ่าน; 33axe scans ใน `.admin-content` ไม่มี violation**; fixture requests ถูก intercept ทั้งหมด ไม่พบJS/CORS/unexpected-request errors ดู [ผล](qa/admin-member-roles/results.json) |
| Fresh review | ไม่มีCritical/Important findings;มีMinorเรื่องการยังไม่ทดสอบความสูงจอมือถือที่สั้นกว่า1000px ดู [review](qa/admin-member-roles/review.md) |
| Live role QA — 14 พฤศจิกายน 2026 | Production Frontend → Go API จริง **12 checks / 35 HTTP requests ผ่าน**: UI promotion/demotion, read-back, reload, retained JWT, guest/member/self denial, cancel และ idempotency; คืน role เดิมและยืนยันทุกบัญชีมี role/จำนวนเท่าเดิม ดู [ผลจริง](qa/admin-member-roles/live-results.json) |
| Go tests/vet/build — ตรวจ Backend เพิ่ม 14 พฤศจิกายน 2026 | Go1.27.4 + PostgreSQL17.12 ชั่วคราว: raceผ่าน39testsหลัก/90subtests, concurrency3กรณี×20ผ่าน60ครั้งเพิ่ม, testskip0, vet/build exit0; sourceBackendไม่เปลี่ยน ดู [รายงาน Backend](qa/admin-member-roles/backend/README.md) |

Browser script ตรวจเฉพาะหน้าสมาชิก/dialog ที่เปลี่ยน ใช้ข้อมูลจำลองชื่อ/อีเมล `.invalid` และไม่เก็บ token หรือข้อมูลสมาชิกจริง ดู [script](qa/admin-member-roles/check.cjs)

ตรวจภาพ directory1440px และ dialog375px ของ Chromium/WebKit แล้ว ชื่อ/อีเมลยาว wrap ได้ ปุ่มและ control ใช้ tokens เดิม Browser fixtures รอบเดิมใช้ความสูง1000px ทุกความกว้าง รอบ Live QA เพิ่ม Chromium 1440×900 และ 375×667: dialog อยู่ใน viewport ไม่มี horizontal overflow เลื่อนถึงปุ่มยกเลิกได้ และ Escape ปิดโดยไม่ส่ง PATCH การตรวจ long-content/internal scrolling บนจอเตี้ยใน Firefox/WebKit ยังไม่ได้ทำ การใช้Tabของnative dialogอาจไปแถบเครื่องมือbrowserได้ สคริปต์แยกกรณีBODYที่`document.hasFocus()===false`และยังตรวจว่าฉากหลังในหน้าเว็บไม่รับfocusจริง

รอบแรกพบช่องเลือกสิทธิ์ใช้ class ที่ไม่มีใน Design System จึงได้ font14px แทน16px แก้ให้ใช้ `.input` เดิม และเก็บ browser regression ที่ตรวจขนาดจริงไว้ นอกจากนี้ full-page axe แจ้ง `label-content-name-mismatch` ที่ปุ่มเมนูของ Header เดิม ยืนยันซ้ำบน production bundle `main.8f18e63b.js` ได้คำเตือนเดียวกัน ([baseline](qa/admin-member-roles/baseline-a11y.json)) จึงไม่ได้แก้ Layout นอกขอบเขตนี้ การตรวจ axe ของฟีเจอร์ระบุ scope `.admin-content` ซึ่งรวมหน้ารายชื่อและ dialog โดยไม่ปิด rule นั้นสำหรับโค้ดที่เพิ่ม

## สถานะ API และผล Live QA ล่าสุด

รอบ 13 พฤศจิกายน 2026 ยังได้ **404 NOT_FOUND** ดู [หลักฐานเดิม](qa/admin-member-roles/api-probe.json) แต่รอบ 14 พฤศจิกายน endpoint พร้อมแล้ว และทดสอบ `https://thaifood-frontend.vercel.app` → `https://thaifood-guide-api-a7c7.onrender.com` จริงสำเร็จ ไม่ใช้ mock หรือ local proxy ดู [live-results.json](qa/admin-member-roles/live-results.json)

ใช้ Admin ID13 และสมาชิก QA ID12 ที่ผู้ใช้ระบุผ่าน credentials: เปิด dialog บนเว็บจริง เลื่อน Member → Admin และลด Admin → Member ได้ PATCH200 ทั้งสองครั้ง UI re-fetch แสดง role ใหม่โดยไม่ reload และยังตรงหลัง reload รวมถึง GET แยกยืนยันข้อมูลที่บันทึกแล้ว ไม่ได้เชื่อเฉพาะ mutation response และไม่ได้เข้าถึงฐานข้อมูลโดยตรง

สมาชิก QA login เพียงครั้งเดียวก่อนเปลี่ยนสิทธิ์ ใช้ JWT เดิมตลอด: Admin directory403 → 200 หลังเลื่อน → 403 หลังลดกลับ ขณะที่ `/api/me` ตอบ200พร้อม role ปัจจุบัน และ `/api/favorites` ตอบ200ทุกช่วง Guest/invalid JWT เปลี่ยน role ได้401; Member และ self-change ได้403 การทดสอบ self-change ใช้ role เดิมของ Admin เพื่อไม่เสี่ยงลดสิทธิ์บัญชีผู้ทดสอบ

`finally` ส่งคำขอคืน role เดิมแบบ idempotent และอ่าน directory/identity ยืนยัน: QAกลับเป็นMember, Adminผู้ทดสอบยังเป็นAdmin, roleทุกบัญชีและจำนวนสมาชิกเท่าเดิม ไม่พบ JS/CORS errors ไม่มีการสร้าง/ลบบัญชี เปลี่ยนรหัสผ่าน แก้ profile หรือข้อมูลร้าน/รีวิว ภาพหลักฐานปกปิดชื่อ/อีเมลและ header; native dialog ใช้การแทนข้อความเฉพาะ DOM ระหว่าง capture เพราะ mask overlay อยู่หลัง top layer ไม่มีการแก้ข้อมูลบน server

ขอบเขต Live QA ไม่รวมการจงใจทำให้เหลือ Admin=0 หรือยิง concurrent demotion บน production รอบ Live ใช้ Chromium; ผล Firefox/WebKit เดิมเป็น UI fixtures ต่อมาผู้ใช้สั่งตรวจ Backend เพิ่ม จึงรัน Go tests/vet/build บนฐานข้อมูลชั่วคราวแยกครบและผ่าน ดูรายละเอียดด้านล่าง

## ผลตรวจ Backend เพิ่ม — 14 พฤศจิกายน 2026

ตรวจ Backend main revision `a8c0d78f76220f596a1646913685021ccfdc83f8` ในสำเนา `/tmp` โดยไม่แก้ source ใช้ Go1.27.4 และ PostgreSQL17.12 ใน Docker ที่เปิดเฉพาะloopback ไม่ใช้ credentials/ฐานข้อมูล Production ผลจริงอยู่ใน [backend/results.json](qa/admin-member-roles/backend/results.json), [สรุป](qa/admin-member-roles/backend/README.md) และ [static audit](qa/admin-member-roles/backend/audit.md)

- `go test -race -count=1 -timeout=5m -json ./...`: ผ่าน39testsหลักและ90subtests ไม่มีtestถูกskip/fail
- รัน Store cross-demotion, recheck actor after lock wait และ HTTP cross-demotion ซ้ำกรณีละ20ครั้ง: ผ่าน60ครั้งเพิ่มเติม
- `go vet ./...` และ `go build ./...`: ผ่าน exit0 ทั้งคู่
- ยืนยัน self-demotion ของAdminคนสุดท้ายถูกปฏิเสธ, concurrent cross-demotionสำเร็จหนึ่งคำขอ/ปฏิเสธอีกคำขอและเหลือAdminหนึ่งคน, ผู้สั่งที่ถูกลดสิทธิ์ระหว่างรอlockใช้สิทธิ์เดิมไม่ได้
- ไม่เหลือschemaทดสอบ ตรวจ sourceBackendไม่เปลี่ยน และหยุด/ลบcontainerพร้อมตรวจDocker listingซ้ำสำเร็จ

การคงAdminอย่างน้อยหนึ่งคนผ่านAPIอาศัย self-change guard และการตรวจactorซ้ำในtransactionที่ล็อกแล้ว ทำให้ `LAST_ADMIN` เป็นเงื่อนไขเสริมที่คำขอปกติไปไม่ถึง: ผู้สั่งAdminที่ต่างจากเป้าหมายAdminหมายถึงยังมีอย่างน้อยสองคน การตอบ409`LAST_ADMIN` มีhandler mock testผ่าน แต่ไม่ได้อ้างว่ากระตุ้นสถานะนี้จากPostgreSQLจริง ยังไม่ได้เพิ่มการทดสอบหลายAPI serversแยกกันหรือการcancelระหว่างรอlock; ไม่พบข้อบกพร่องสำคัญจากการตรวจครั้งนี้

รอบนี้ไม่แก้ source Backend, ไม่ deploy และไม่แก้ application source งานเริ่มจาก baseline `da24851`; source Frontend ปัจจุบันอยู่ใน commit `d414f91` และ Production bundle ตรงกับ build ที่ตรวจแล้ว เอกสาร/QA ยังรอ commit ตาม workflow ของผู้ใช้ Preview3100จากรอบก่อนปิดแล้ว รอบ Live QA ไม่ได้เปิด local server

## วิธีลอง

1. ตรวจ Backend endpoint และใช้บัญชี Admin/สมาชิก QA ที่แยกจากกัน โดยตั้ง credentials ในไฟล์ `thaifood/.env.qa.local` ที่ Git ignore
2. รัน `npm start` ใน `thaifood/` แล้ว login ด้วย Admin ที่มีอยู่ เปิดเมนูผู้ดูแลระบบ → สมาชิก
3. ตรวจว่าแถวของตัวเองไม่มีปุ่มแก้สิทธิ์ เลือกบัญชี QA อีกบัญชี กดเปลี่ยนสิทธิ์แล้วตรวจชื่อ/อีเมล/สิทธิ์ปัจจุบัน
4. เลือก Admin อ่านคำเตือน กดยืนยัน ตรวจ role ใหม่และ success จากนั้นลดกลับเป็น Member และตรวจรายการอีกครั้ง
5. ตรวจด้วย token เดิมของบัญชี QA ว่า Admin endpoint อนุญาตหลังเลื่อนสิทธิ์และปฏิเสธหลังลดสิทธิ์ Member endpoint ต้องยังใช้ได้
6. ตรวจ cancel/Escape, error/retry, keyboard และหน้าจอมือถือ ถ้า role ยังเหมือนเดิมหรือกำลังบันทึก ต้องส่งคำขอซ้ำไม่ได้

ทดสอบ UI แบบไม่ใช้ Production API ได้โดยเปิด dev server ที่พอร์ต3100 และรัน:

```bash
THAIFOOD_QA_BASE_URL=http://127.0.0.1:3100 node docs/qa/admin-member-roles/check.cjs
```

คำสั่งนี้ใช้ Chromium/Firefox/WebKit และ axe จาก ignored QA cache เดิม WebKit บน Linux ไม่ใช่ native Safari บน macOS/iOS และไม่ได้อ้างว่าตรวจด้วย NVDA/VoiceOver จริง ไฟล์ผลสรุปที่ตรวจยืนยันแล้วอยู่ใน [verification.json](qa/admin-member-roles/verification.json)

ทำซ้ำ Live QA ด้วย [live.cjs](qa/admin-member-roles/live.cjs): `node docs/qa/admin-member-roles/live.cjs --preflight` ตรวจบัญชีแบบอ่านอย่างเดียว; `--run` เปลี่ยนและคืน role ของสมาชิก QA จริงตามที่ผู้ใช้ระบุ ข้อมูลล็อกอินสมาชิกใช้ `THAIFOOD_QA_MEMBER_EMAIL` และ `THAIFOOD_QA_MEMBER_PASSWORD` จากไฟล์ ignored เดียวกับ Admin สคริปต์ไม่บันทึก password/token/ชื่อ/อีเมลลง report และไม่สร้างหรือลบบัญชี

## ไฟล์ที่เปลี่ยน

- `src/api/services.js`: PATCH method ผ่าน request helper เดิม
- `src/mock/server.js`: role contract/authorization สำหรับ Mock และปฏิเสธ role field ใน Register/Profile
- `src/pages/admin/AdminMembers.jsx`: action/self-row, success และ re-fetch/focus
- `src/pages/admin/MemberRoleDialog.jsx`, `AdminMembers.css`: native dialog, pending/error/response validation และ responsive styles เฉพาะหน้า
- `src/api/adminRoles.test.js`, `fetch.test.js`, `backend.test.js`: role/auth/transport และ regression tests โดยคง assertions เดิมของ Profile/Password
- `src/pages/admin/AdminMembers.test.jsx`, `AdminUI.test.jsx`: dialog, controls/focus, errors/retry และปรับ assertion เดิมที่เคยเป็น directory แบบอ่านอย่างเดียว
- เอกสารแผนและ QA ใน `docs/qa/admin-member-roles/`
