# A. Layout / Navigation / Footer — Modern Thai Editorial

ปรับเฉพาะหัวข้อ A ของ `THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md` วันที่13พฤศจิกายน2026 โดยใช้ Design System กลางที่มีอยู่

## สิ่งที่เปลี่ยน

- เปลี่ยนโลโก้เดิมเป็น wordmark **ThaiFood.** และสัญลักษณ์ชามอาหาร SVG ขนาดเล็ก ใช้ซ้ำใน Header/Footer โดยไม่เพิ่ม asset ภายนอกหรือ dependencies
- จัด Header ใหม่: โลโก้ซ้าย เมนูหลักกลาง และบัญชีผู้ใช้ด้านขวาบนเดสก์ท็อป ใช้ active state ที่มีทั้งสีและเส้นใต้
- Header อยู่ใน document flow จึงไม่บดบังหัวข้อหน้า เนื้อหา หรือ keyboard focus
- เมนูมือถือเป็น disclosure ใต้ Header ควบคุมทั้งเมนูและบัญชีผู้ใช้ มี `aria-expanded`, `aria-controls` และชื่อปุ่มที่สื่อการเปิด/ปิด
- เปิดเมนูด้วยคีย์บอร์ดได้; Escape คืน focus ไปปุ่มเมนู; กดภายนอกหรือเปลี่ยนหน้าจะปิดเมนู รวมการเปลี่ยนเฉพาะ query และการเลือกหน้าปัจจุบัน
- เมื่อเลือกเมนูมือถือแล้วเปลี่ยนหน้า จะย้าย focus ไป `main-content`; เมื่อสลับขนาดหน้าจอ จะย้ายจาก control ที่ถูกซ่อนไป control ที่มองเห็น โดยไม่ดึง focus จากเนื้อหาด้านนอก
- ชื่อผู้ใช้ยาวตัดด้วย ellipsis พร้อมชื่อเต็มใน accessible label/title และยังเข้าถึงปุ่มออกจากระบบได้
- Footer แยกลิงก์สำรวจเว็บและบัญชีผู้ใช้ มี tagline และ copyright โดยใช้เฉพาะเส้นทางที่มีอยู่จริง
- คงเมนู Guest/Member/Admin, การ logout/ล้าง token/กลับหน้าแรก, skip link และข้อความ demo/mock-data banner ทั้งสองโหมด

## ไฟล์ในขอบเขตงาน

| ไฟล์ | หน้าที่ |
| --- | --- |
| `thaifood/src/components/Layout.jsx` | Brand, Header, เมนูตามสิทธิ์, disclosure/focus, banner และ Footer |
| `thaifood/src/components/Layout.css` | Styles ที่จำกัดใต้ `.app-shell` และคลาส `layout-*` ของ Header/Footer/banner/skip link |
| `thaifood/src/components/Layout.test.jsx` | 15กรณีทดสอบ behavior โดยใช้ AuthProvider และ mock API ที่มีอยู่จริงในโครงการ |

ก่อนเริ่มงาน application source สะอาดที่ commit `06c32bd` ตรวจ `git diff --exit-code HEAD -- thaifood ':!thaifood/src/components/Layout.jsx'` แล้วได้ exit0; ไฟล์โค้ดใหม่มีเพียง Layout.css และ Layout.test.jsx จึงคง page bodies, Home/Search/Cards/Detail/account/admin, global tokens/index.css, API/auth/backend, environment, packages และ deployment settings เดิมไว้

Header/Footer ใหม่ปรากฏร่วมกับทุกหน้าผ่าน Layout ส่วนเนื้อหาและ composition ภายในหน้าอื่นไม่ถูกปรับในงานนี้

## ผลตรวจสอบ

รันจาก `thaifood`:

```sh
npm test -- --watchAll=false --runInBand --runTestsByPath src/components/Layout.test.jsx
# ผ่าน15tests

npm test -- --watchAll=false --runInBand
# ผ่าน125tests /17suites

npm run build
# Compiled successfully
```

Scoped `git diff --check` ผ่าน ไม่มี dependencies ใหม่ใน package.json/lockfile เครื่องมือ browser QA ติดตั้งแยกใน ignored cache ใต้ node_modules

Browser QA ด้วย Chromium:

- Guest, Member และ Admin ที่320/375/768/1024/1440px รวม15กรณี ไม่พบ horizontal overflow หรือส่วน Header ทับกัน
- ตรวจเมนูและ Footer ตามสิทธิ์ การแสดงชื่อผู้ใช้ยาว และ logout โดยใช้ fixtures เฉพาะ browser context
- ตรวจ skip link → main, tab order เมื่อเมนูปิด/เปิด, focus ring, Escape, คลิกภายนอก, เปลี่ยน route/query/หน้าปัจจุบัน และ responsive focus transfer
- ตรวจว่า resize หลังผู้ใช้คลิกภายนอกไม่ดึง focus กลับ Header และ reduced motion ลด transition เป็น0s
- ตรวจการนำทางและ styles เดิมของ Home/Search/Detail ขณะใช้ Layout ใหม่
- โหลดร้านอาหารจาก Render ผ่าน development proxy เดิมได้ HTTP200 แสดง12รายการจากยอด59ในรอบตรวจ ไม่มี live writes และไม่มี JavaScript page errors
- คอนทราสต์ของคู่สีที่ใช้: primary/white5.10:1, muted/white6.23:1, muted/cream5.91:1 และ ink/white14.38:1

ผู้รีวิวพบประเด็นสำคัญ1จุด: browser อาจ blur control หลัง CSS ซ่อน ก่อน `matchMedia` ส่ง change event ทำให้ focus กลับ BODY แก้ด้วยการจำเจ้าของ focus ก่อนถูกซ่อนและล้างเมื่อผู้ใช้ออกจาก Header โดยตั้งใจ เพิ่ม regression ที่ล้มเหลวก่อนแก้ แล้วผ่านทั้ง unit tests และ browser จริง ไม่มีข้อสังเกต Minor ที่ค้างอยู่

หลักฐาน: [browser results](qa/layout-navigation-footer/results.json), [review/scope](qa/layout-navigation-footer/review-and-scope.json), [focus probe หลังแก้](qa/layout-navigation-footer/focus-check.json), [QA script](qa/layout-navigation-footer/check.cjs)

ภาพตัวอย่าง:

- [Header ร่วมกับ Home](qa/layout-navigation-footer/guest-home-1440.jpg)
- [Header เดสก์ท็อป](qa/layout-navigation-footer/guest-header-1440.jpg)
- [เมนูมือถือ Guest](qa/layout-navigation-footer/guest-menu-open-375.jpg)
- [เมนูมือถือชื่อสมาชิกยาว](qa/layout-navigation-footer/member-menu-open-375.jpg)
- [เมนูมือถือ Admin](qa/layout-navigation-footer/admin-menu-open-375.jpg)
- [Footer เดสก์ท็อป](qa/layout-navigation-footer/guest-footer-1440.jpg)
- [Footer มือถือ](qa/layout-navigation-footer/guest-footer-375.jpg)

ข้อจำกัดการตรวจ: browser รอบนี้ใช้ Chromium การทดสอบสิทธิ์ใช้ isolated fixtures และไม่ส่งข้อมูลสมัครสมาชิก/review/favorite/admin จริง ไม่ใช่การรับรอง accessibility ของ page bodies ทุกหน้า หรือการตรวจ production CORS รอบใหม่

## วิธีเปิดดู

```sh
cd thaifood
npm start
```

เปิด `http://localhost:3000` หรือ forwarded URL ของ Codespaces แล้วตรวจ Header/Footer บนหน้าที่มีอยู่ พอร์ต3100ใช้เฉพาะ QA และปิดหลังตรวจ ไม่มีการเปลี่ยน process ที่พอร์ต3000

ไม่มีงานค้างในขอบเขต A ที่พบจากการตรวจ ส่วน C/E/F/G รอคำสั่งถัดไป งานนี้ไม่มีการ deploy
