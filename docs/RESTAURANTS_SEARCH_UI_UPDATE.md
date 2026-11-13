# Restaurant Search / Explore — Modern Thai Editorial

ปรับเฉพาะ `/restaurants` ตามหัวข้อ D ของ `THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md` โดยใช้ Design System กลางที่มีอยู่แล้ว

## สิ่งที่เปลี่ยน

- จัดหัวข้อและคำอธิบายหน้าใหม่ แยกแถบค้นหา ตัวกรอง และผลลัพธ์ให้ชัดเจน ใช้พื้นครีม สี terracotta ตัวอักษร และระยะจาก tokens กลาง
- คงคำค้น จังหวัด และประเภทอาหารจาก API เดิม บนมือถือย่อจังหวัด/ประเภทอาหารไว้ในปุ่ม “ตัวกรองเพิ่มเติม” พร้อมจำนวนตัวกรองที่เลือก
- เพิ่มรายการตัวกรองที่ใช้อยู่ ลบทีละตัวได้ และมีปุ่มล้างทั้งหมด แสดงจำนวนและช่วงรายการจากข้อมูล API จริง
- เพิ่ม skeleton ตามรูปการ์ด สถานะไม่พบผลลัพธ์ และทางกลับหน้าแรกเมื่อเลขหน้าเกินรายการที่มี
- แยกข้อผิดพลาดของตัวเลือกตัวกรองออกจากรายการร้านอาหาร พร้อมปุ่มลองใหม่ คงค่าที่เลือกใน URL และยังค้นหาด้วยคำค้นได้
- เมื่อ API ล้มเหลว แสดงข้อความสถานะแทนการอ้างว่าพบ 0 ร้าน
- ปรับการ์ดเฉพาะภายในหน้านี้: ภาพ 4:3, หมวดอาหารใต้ภาพ, ตัวอักษรอ่านง่าย, grid 1/2/3 คอลัมน์ และ hover ที่เคารพ reduced motion
- คง `q`, `province`, `category`, `page` และ `limit=12`; เปลี่ยนตัวกรองหรือส่งคำค้นแล้วกลับหน้า 1; เปลี่ยนหน้าแล้วรักษาตัวกรองและ query อื่น; browser back คืนค่าคำค้นในฟอร์ม
- คงการล้าง query ทั้งหมดด้วยปุ่มล้างตามพฤติกรรมเดิม เพิ่ม focus ที่หัวข้อผลลัพธ์เมื่อเปลี่ยนหน้าเพื่อให้ใช้คีย์บอร์ดต่อได้

## ไฟล์โค้ดในขอบเขตงานนี้

| ไฟล์ | หน้าที่ |
| --- | --- |
| `thaifood/src/pages/Restaurants.jsx` | โครงหน้า ตัวกรอง การแสดงสถานะ จำนวนผลลัพธ์ และ pagination |
| `thaifood/src/pages/Restaurants.css` | รูปลักษณ์และ responsive rules ทุก selector จำกัดอยู่ใต้ `.restaurants-page` |
| `thaifood/src/pages/Restaurants.test.jsx` | คง 3 tests เดิมและเพิ่ม 10 กรณีสำหรับ query/filter/history/pagination/error flows |

ตรวจ hash เทียบ baseline ก่อนเริ่มงาน 64 ไฟล์: ไฟล์เดิมเปลี่ยนเฉพาะ `Restaurants.jsx` และ `Restaurants.test.jsx`; stylesheet เป็นไฟล์ใหม่ ไม่เปลี่ยน Home, Layout, shared cards, หน้าอื่น, global tokens, API/auth/backend, `.env` หรือ dependencies ในงานนี้ มี dirty files จากงานก่อนอยู่แล้วและคงไว้

## ผลตรวจสอบ

รันจากโฟลเดอร์ `thaifood`:

```sh
npm test -- --watchAll=false --runInBand --runTestsByPath src/pages/Restaurants.test.jsx
# ผ่าน 13 tests / 1 suite

npm test -- --watchAll=false --runInBand
# ผ่าน 110 tests / 16 suites

npm run build
# Compiled successfully
```

ก่อนลงโค้ดใหม่ ชุดทดสอบที่ขยายแล้วล้มเหลวในพฤติกรรมใหม่ 6 กรณี แล้วผ่านทั้งหมดหลังแก้ไข Scoped `git diff --check` ผ่าน และผู้รีวิวโค้ดอิสระไม่พบประเด็นที่ต้องแก้เพิ่ม

Browser QA ด้วย Chromium ที่ 375, 768, 1024 และ 1440px:

- ไม่พบ horizontal overflow; grid 1/2/3 คอลัมน์; ภาพ 4:3 และ lazy loading; input 16px สูงอย่างน้อย 48px
- ตัวกรองมือถือเปิด/ปิดด้วยคีย์บอร์ดได้ ลำดับ Tab ถูกต้อง มี focus ชัดเจน และการลบ chip แล้ว Tab ไปตัวกรอง/ผลลัพธ์ถัดไปได้
- ทดสอบคำค้นไทย การตัดช่องว่าง การรักษา URL การเปลี่ยนหน้า 3 หน้า ประวัติย้อนกลับ การลบตัวกรอง และ query ที่ยาวมาก
- ทดสอบ skeleton/empty/error/retry รวมตัวเลือกตัวกรองล้มเหลว และการกลับจากหน้าที่เกินขอบเขต ด้วย browser fixtures โดยไม่เปลี่ยนโหมดของแอป
- ทดสอบ fallback รูปภาพ สถานะยังไม่มีคะแนน และ reduced motion
- ตรวจการนำทาง Search → Detail → Home → Login ขณะ stylesheet ของ Search ยังโหลดอยู่ หน้าอื่นยังใช้โครงและ styles เดิม
- ไม่พบ JavaScript page errors และไม่มีคำขอเขียนข้อมูล API

ทดสอบเชื่อม API จริงผ่าน development proxy เดิมไป Render: รายการ/จำนวนผลลัพธ์ตอบ HTTP 200, เปลี่ยนหน้าและค้นหาชื่อร้านสำเร็จ ในรอบตรวจได้รับทั้งหมด 59 ร้าน แสดงหน้าแรก 12 ร้านและหน้าที่สอง 12 ร้าน จำนวนนี้เป็นข้อมูลที่ API ส่งมาในขณะตรวจเท่านั้น โค้ดไม่กำหนดจำนวนไว้ตายตัว

หลักฐาน: [results.json](qa/restaurants-search/results.json), [desktop 1440](qa/restaurants-search/restaurants-1440.jpg), [mobile 375](qa/restaurants-search/restaurants-375.jpg), [tablet 768](qa/restaurants-search/restaurants-768.jpg), [1024](qa/restaurants-search/restaurants-1024.jpg), [ตัวกรองมือถือ](qa/restaurants-search/filters-expanded-375.jpg), [loading](qa/restaurants-search/loading-1440.jpg), [empty](qa/restaurants-search/empty-1440.jpg), [error](qa/restaurants-search/error-1440.jpg), [ตัวกรองโหลดไม่สำเร็จ](qa/restaurants-search/filter-error-375.jpg)

ขอบเขตการตรวจ: browser QA รอบนี้ใช้ Chromium และ local dev proxy; การทดสอบสถานะผิดพลาดใช้ fixtures ไม่ใช่การทำให้บริการจริงล่ม ไม่ได้ deploy หรือยืนยัน production CORS ใหม่ และไม่ส่งข้อมูล login/review/favorite/admin เพราะอยู่นอกงานหน้าค้นหา

## วิธีเปิดดู

```sh
cd thaifood
npm start
```

เปิด `/restaurants` ที่ `http://localhost:3000` หรือ forwarded URL ของ Codespaces ตัวอย่าง URL สำหรับตัวกรองเดิม: `/restaurants?q=ข้าว&province=เชียงใหม่&category=อาหารเหนือ&page=1`

งานนี้ไม่มีการ deploy; ปิดพอร์ต 3100 ที่ใช้ QA ชั่วคราวแล้ว และไม่ได้ปรับ process ที่พอร์ต 3000 ส่วนหน้าอื่นรอคำสั่งถัดไป
