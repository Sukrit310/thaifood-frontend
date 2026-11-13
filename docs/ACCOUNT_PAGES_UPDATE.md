# Account pages — Modern Thai Editorial

ปรับเฉพาะหัวข้อ **F. Auth / Profile / Favorites** ตาม `THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md` เมื่อ 13 พฤศจิกายน 2026

## สิ่งที่เปลี่ยน

- **Login / Register:** ฟอร์มสะอาดบนพื้นครีม ใช้สีดินเผา ฟอนต์และ controls จาก Design System กลาง เดสก์ท็อปมีภาพอาหารใน repository ประกอบด้านซ้าย มือถือซ่อนภาพและเข้าถึงฟอร์มได้ทันที รูปมีขนาดกำกับ, lazy loading และ fallback ที่จำกัดไม่ให้วนซ้ำ
- **การกรอกข้อมูล:** label, autocomplete และตัวนับไบต์เดิมครบ ข้อผิดพลาดมีสี/ข้อความ/กรอบ/โฟกัส และเชื่อมกับช่องที่เกี่ยวข้องเท่านั้น กดส่งผิดซ้ำก็กลับไปที่ feedback ระหว่างรอ API ปิดการแก้ช่องและปุ่มส่ง เมื่อผิดพลาดเก็บค่าที่กรอกไว้ให้แก้แล้วลองใหม่
- **Profile / Change Password:** ใช้ form styles ชุดเดียวกัน เพิ่มเมนูบัญชีเชื่อมสามหน้าและแสดงหน้าปัจจุบัน Email ยังอ่านอย่างเดียว ชื่อ Unicode ยาวไม่ดันหน้าล้น บทบาทสมาชิก/ผู้ดูแลแสดงตามข้อมูลเดิม เปลี่ยนรหัสผ่านสำเร็จจึงล้างช่อง และแก้ข้อมูลต่อแล้วซ่อนสถานะสำเร็จเดิม
- **Favorites:** ใช้ RestaurantCard/RestaurantGrid กลางเดิม เพิ่มหัวข้อคอลเลกชัน จำนวนจาก `items.length` เฉพาะเมื่อโหลดสำเร็จ skeleton, error/retry และ empty state ชวนกลับไปค้นหาร้าน นำออกไม่สำเร็จยังเก็บการ์ดไว้ นำออกสำเร็จโหลดรายการใหม่ แจ้งผล และคืนโฟกัสให้หัวข้อรายการ

## ขอบเขตโค้ด

แก้ไฟล์เดิมเฉพาะ:

- `thaifood/src/pages/Login.jsx`
- `thaifood/src/pages/Register.jsx`
- `thaifood/src/pages/Profile.jsx`
- `thaifood/src/pages/ChangePassword.jsx`
- `thaifood/src/pages/Favorites.jsx`

เพิ่ม `thaifood/src/components/AccountLayout.jsx`, stylesheet `AccountLayout.css` ซึ่ง scope ทุก selector ใต้ `.account-page` และ `thaifood/src/pages/AccountPages.test.jsx` จำนวน26กรณี ไม่มี dependency เพิ่ม

คง AuthContext, ProtectedRoute, role gates, service layer และ API contracts เดิม: login/register ใช้ field เดิม, Profile ส่งเฉพาะ `displayName`, เปลี่ยนรหัสผ่านส่ง `currentPassword`/`newPassword` โดยไม่ trim รหัสผ่าน และ Favorites ลบด้วย restaurant ID เดิม กติกา Unicode/UTF8 และ byte limits ไม่เปลี่ยน Registration ยังกลับ Login พร้อม `registered`/`from` และ Login ยังคืน pathname/search/hash พร้อม safe fallback เดิม บัญชีทดลองยังแสดงเฉพาะ Mock mode

ผลเทียบ SHA-256 กับ [baseline72ไฟล์](qa/account-pages/source-baseline.json): เปลี่ยนเฉพาะ5หน้าที่อนุญาต อีก67ไฟล์ตรงเดิม รวมทั้ง Home/Search/Layout/Cards/Detail, admin, auth, services, validators และ package/config ตรวจรายชื่อได้ใน [scope.json](qa/account-pages/scope.json)

## ผลตรวจ

| การตรวจ | ผล |
|---|---|
| `CI=true npm test -- --watchAll=false --runInBand` | ผ่าน190 tests /20 suites รวม tests เดิมครบ และ26กรณีใหม่ |
| `npm run build` หลังแก้โฟกัส | ผ่าน production build ไม่มี compile/lint error |
| Chromium ทั้ง5หน้าที่320,375,768,1024,1440px | ผ่าน25กรณี ไม่มี horizontal overflow, h1หนึ่งตัว, inputs16px, controls≥44px |
| Auth split / Favorites grid | ภาพซ่อนก่อน1024px, เดสก์ท็อปสองฝั่ง; grid เดิม1/2/3คอลัมน์และgap24px |
| Guest → Register → Login → Favorites | คง pathname/search/hash และregistered/from; ตรวจ API error/pending, draft, UTF8 counter และ payload |
| Profile / Password | ส่ง field เดิมครบ, readonly email, error/success/draft, sessionไม่หลุดเมื่อรหัสเดิมผิด, ล้างช่องเฉพาะสำเร็จ |
| Favorites | loadingไม่อ้าง0ร้าน, error/retry, pending/failure/success, last removal→empty→search, count และ keyboard focus |
| Keyboard / motion / image | focusชัด, tab email→password→submit, reduced motion, decorative alt และ image fallback |
| Member / Admin / long content | แสดงบทบาทเดิม ชื่อ100Unicodeและemailยาวไม่ดันหน้าล้นทั้ง5ขนาด |
| Review | fresh read-only reviewer ตรวจ source/contracts/scope; พบP3เรื่องโฟกัสซ้ำ แก้และยืนยันด้วย regression testsทั้ง4ฟอร์ม |

Browser ใช้ service/auth จริงของแอป แต่ intercept API responses ด้วย fixture ทุก mutation รวม11requests ไม่มีการสมัคร/เข้าสู่ระบบ/แก้บัญชี production จริง จึงเป็นผลตรวจ UI และ API contract ไม่ใช่การยืนยันว่าบัญชี production ใดใช้งานได้ ไม่พบ page errors; ดู [ผล JSON](qa/account-pages/results.json) และ [สคริปต์ตรวจ](qa/account-pages/check.cjs)

Node/CRA มี deprecation warning เดิม (`fs.F_OK`/dev-server middleware) แต่ build compile สำเร็จ ไม่มีการแก้ dependencies นอกขอบเขต

## ภาพตรวจ

- [Login desktop](qa/account-pages/guest-login-1440.jpg) / [mobile](qa/account-pages/guest-login-375.jpg)
- [Register desktop](qa/account-pages/guest-register-1440.jpg) / [mobile](qa/account-pages/guest-register-375.jpg)
- [Profile desktop](qa/account-pages/member-profile-1440.jpg) / [mobile](qa/account-pages/member-profile-375.jpg) / [Admin](qa/account-pages/admin-profile-375.jpg)
- [Change Password desktop](qa/account-pages/member-change-password-1440.jpg) / [mobile](qa/account-pages/member-change-password-375.jpg) / [errorเก็บdraft](qa/account-pages/password-error-draft-375.jpg)
- [Favorites desktop](qa/account-pages/member-favorites-1440.jpg) / [mobile](qa/account-pages/member-favorites-375.jpg) / [empty](qa/account-pages/favorites-empty-375.jpg) / [loading](qa/account-pages/favorites-loading-1440.jpg) / [error](qa/account-pages/favorites-error-1440.jpg)

## ดูในเครื่อง

รัน `npm start` ในโฟลเดอร์ `thaifood` แล้วเปิด `/login`, `/register`, `/profile`, `/change-password`, `/favorites` ตามสิทธิ์บัญชีเดิม งานนี้ไม่ได้ deploy และไม่ได้เปลี่ยนพอร์ต3000 เซิร์ฟเวอร์3100ใช้ชั่วคราวเพื่อ QA เท่านั้น ปิดPID8304หลังตรวจ command/PORT ของโปรเซส และยืนยันด้วย curl ว่าพอร์ต3100ไม่รับการเชื่อมต่อแล้ว
