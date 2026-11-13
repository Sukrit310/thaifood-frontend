# Home: Modern Thai Editorial

ปรับตาม `THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md` เฉพาะหน้า Home ตามคำสั่งผู้ใช้ วันที่ 12 พฤศจิกายน 2026

## ขอบเขตและสิ่งที่เปลี่ยน

- เปลี่ยน Hero เป็นภาพอาหารขนาดใหญ่กับหัวเรื่องภาษาไทยสองบรรทัด พื้นครีม สี terracotta และข้อความ espresso ใช้ Noto Sans Thai ที่โครงการเสิร์ฟเอง
- จัดช่องค้นหาชื่อร้าน/เมนูและจังหวัดไว้ใน Hero คงเส้นทาง `/restaurants` และ query `q` / `province` เดิม โดย trim คำค้นและใช้ชื่อจังหวัดจาก API
- Destination tiles สี่จังหวัดใช้ชื่อจังหวัดจริงใน URL พร้อมภาพประกอบเดิมของโครงการ
- ปรับรูปลักษณ์ RestaurantGrid เฉพาะภายใน Home: 1/2/3 คอลัมน์, รูป 4:3, category ใต้ภาพ, focus/hover ชัดเจน คะแนนและจำนวนรีวิวมาจากข้อมูลจริงเท่านั้น
- เพิ่ม skeleton ตามรูปแบบการ์ด, empty state, error/retry, และ province error ที่ยังค้นหาด้วยคำค้นได้
- CTA ของ Guest เปิด `/register`; สมาชิกเปิด `/favorites` โดยอ่าน auth context เดิม
- ลบตัวเลขจำนวนจังหวัดที่เคย hard-code ใน Hero และไม่เพิ่มข้อความอ้างความนิยม

ในรอบ Home เดิม CSS tokens อยู่ภายใต้ `.home-page` สี primary ใช้ `#B64E2E` ซึ่งเข้มขึ้นเล็กน้อยจาก token เริ่มต้นใน brief เพื่อให้ตัวอักษรขาวบนปุ่มได้ contrast 5.10:1 ตัวอักษรรองบนพื้นครีมได้ 5.91:1 ต่อมาในวันที่13พฤศจิกายน2026 ย้าย tokens ไปเป็น [Design System กลาง](DESIGN_SYSTEM.md) โดย Home ใช้แหล่งสีเดียวกับส่วนกลางแล้ว ส่วน composition ของหน้า Home คงไว้

ไม่ได้แก้ shared Layout/Header/Footer, RestaurantCard/Grid, หน้าอื่น, API, auth logic, Backend, database, environment files หรือ dependencies ของแอป งานหน้าอื่นรอคำสั่งถัดไป ไม่มีการ deploy ในงานปรับ Home รอบนี้

## ตรวจสอบ

คำสั่งจาก `thaifood/package.json`:

```bash
cd thaifood
npm test -- --watchAll=false --runInBand --runTestsByPath src/pages/Home.test.jsx
npm test -- --watchAll=false --runInBand
npm run build
```

- Home tests: 9 ผ่าน ครอบคลุม service data, search/query, destination links, loading, error/retry/empty, province failure/retry, image fallback และ Guest/Member CTA
- Full suite: 100 tests / 16 suites ผ่าน รวม regression tests ของ auth, favorites, reviews และ Admin ด้วย fixtures เดิม
- Production build: compiled successfully
- Browser: Chromium ผ่าน `npm start` ที่ 375×812, 768×1024, 1024×900 และ 1440×1000; ไม่มี horizontal overflow, การ์ด 1/2/3 คอลัมน์ถูกต้อง, ปุ่มค้นหามองเห็นใน viewport เดสก์ท็อป
- Live flow: browser → CRA development proxy → Go API ที่ Render → restaurant/province responses 200 → การ์ดบน Home; การค้นหาและลิงก์จังหวัดไปหน้ารายการตาม query เดิม
- ตรวจ keyboard order, visible focus, reduced motion, long Thai names, hero fallback และ Home CSS ไม่ไหลไปหน้ารายการร้าน ผ่านทั้งหมด ไม่มี uncaught browser errors
- Browser states ที่จำลอง: loading/error/retry/empty และภาพที่โหลดไม่สำเร็จ ใช้การ intercept เฉพาะใน QA context ไม่ได้เปลี่ยนโหมดแอปหรือ environment
- ไม่ได้ทำ live member/admin writes หรือทดสอบ Safari/Firefox ในรอบนี้

หลักฐาน: [ผล browser QA](qa/home-editorial/results.json), [375px](qa/home-editorial/home-375.png), [768px](qa/home-editorial/home-768.png), [1024px](qa/home-editorial/home-1024.png), [1440px](qa/home-editorial/home-1440.png)

## เปิดดู

```bash
cd thaifood
npm start
```

เปิด `http://localhost:3000` หรือ port 3000 ของ Codespaces โดยดูหน้า `/`

## ภาพ Hero

สร้างด้วย built-in ImageGen เป็นภาพอาหารประกอบทั่วไป ไม่ใช่ภาพของร้านที่ระบุชื่อ ไม่ใช้ภาพ hotlink ใหม่ รูปร้านในรายการยังใช้ `imageUrl` จาก service และ fallback เดิม

ไฟล์ที่ใช้จริง:

- `thaifood/public/images/home-editorial/khao-soi-640.webp` (117,072 bytes)
- `thaifood/public/images/home-editorial/khao-soi-1100.webp` (255,046 bytes)

ใช้ `srcSet` / `sizes` เลือกไฟล์ให้เหมาะกับจอ, มี intrinsic width/height และ fallback ไป `public/images/hero-bowl.svg` เมื่อภาพโหลดไม่ได้ แปลงขนาดและ format จากต้นฉบับด้วย browser canvas โดยไม่แก้เนื้อหาภาพ

Prompt ที่ใช้:

> Use case: photorealistic-natural. Asset type: food editorial hero photography for ThaiFood, a Thai restaurant discovery website. Create a beautiful premium magazine food photograph, square composition, realistic warm daylight, tactile natural food styling. Overhead three-quarter close view of a generous Thai meal on a pale warm cream table: a beautiful hand-thrown celadon ceramic bowl of northern Thai khao soi with golden curry broth, crispy noodles, coriander and a little red chilli oil as the dominant subject, a smaller plate of som tam papaya salad to the side, cut lime, shallots and fresh herbs, folded natural linen, subtle wooden chopsticks. Natural terracotta and olive accents, rich appetizing authentic food textures, restrained props, gentle imperfect human warmth. Compose to fill the frame, main bowl slightly to right and center, table visible around it, small salad in upper left edge. Warm but not orange color cast, soft short directional shadows, detailed realistic photography. No people, no visible hands, no text, no typography, no logos, no watermarks, no collage, no frames, no ornamental motifs. This is generic editorial food imagery, not a photo of an identified restaurant. Save the finished image as a project image asset if a filesystem output is available.
