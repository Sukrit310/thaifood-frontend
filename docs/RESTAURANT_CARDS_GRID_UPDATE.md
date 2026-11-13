# C. Restaurant Cards / Grid กลาง — Modern Thai Editorial

ปรับเฉพาะหัวข้อ C ของ `THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md` วันที่13พฤศจิกายน2026 ให้ Home, หน้าค้นหา และ Favorites ใช้รูปแบบการ์ดเดียวกัน

## สิ่งที่เปลี่ยน

- รวม styles ของ RestaurantCard/Grid เป็นชุดกลาง แทนการ override แยกในแต่ละหน้า ใช้สี spacing typography และ radius18px จาก Design System เดิม
- ภาพ4:3 พร้อม `object-fit: cover`, lazy loading, async decode และ intrinsic640×480 เพื่อจองพื้นที่ภาพ ส่วนที่ zoom ถูกตัดอยู่ภายในกรอบภาพ
- ชื่อร้านเด่น หมวดอาหารอยู่ใต้ภาพ จังหวัดและคะแนนอ่านง่าย ที่อยู่ไม่เกิน2บรรทัด ชื่อร้านที่ยาวมากแสดงได้2บรรทัดโดยยังมีชื่อเต็มใน accessible name/title
- หมวดอาหารไม่ถูกซ่อนด้วย `aria-hidden` อีกต่อไป รูปตกแต่งใช้ alt ว่าง และลิงก์ได้ชื่อจาก heading ของร้าน
- การ์ดมีลิงก์เดียวครอบภาพและเนื้อหา จึงกด Tab ครั้งเดียวต่อร้านและคลิกภาพเพื่อเปิดรายละเอียดได้ ปุ่มนำออกจาก Favorites อยู่แยกจากลิงก์และคง API/พฤติกรรมเดิม
- แสดงคะแนนและจำนวนรีวิวจาก props จริงเท่านั้น ถ้าคะแนนไม่มี/ใช้ไม่ได้แสดง “ยังไม่มีคะแนน” และไม่สร้างจำนวนรีวิวเมื่อไม่มีข้อมูล
- คงภาพสำรองใน repo พร้อมป้องกันการตั้ง src ซ้ำเมื่อรูปสำรองเองโหลดไม่สำเร็จ คงข้อความสำรองของที่อยู่เดิม
- ใช้ native list สำหรับกริด:1คอลัมน์ต่ำกว่า640px,2คอลัมน์640–1023px และ3คอลัมน์ตั้งแต่1024px ระยะห่างร่วม24px
- Hover ยกการ์ด/zoom ภาพเบา ๆ มี focus ชัดเจนและไม่ถูกกรอบการ์ดตัด รองรับ `prefers-reduced-motion`

## ไฟล์ที่แก้

| ไฟล์ | เหตุผล |
| --- | --- |
| `thaifood/src/components/RestaurantCard.jsx` | โครงลิงก์/metadata/action และ fallback กลาง |
| `thaifood/src/components/RestaurantGrid.jsx` | native UL/LI และคง `items` / `renderAction` เดิม |
| `thaifood/src/components/RestaurantCard.css` | รูปลักษณ์และ responsive rules ของการ์ด/กริดกลาง |
| `thaifood/src/components/RestaurantCard.test.jsx` | 13กรณีทดสอบ data/image/navigation/action/list behavior |
| `thaifood/src/index.css` | นำออกเฉพาะกฎการ์ด/กริดเดิมที่ซ้ำกับชุดกลาง |
| `thaifood/src/pages/Home.css` | นำออกเฉพาะ override การ์ด/กริด และปรับ gap loading-grid จาก28เป็น24pxให้ตรงกริดกลาง |
| `thaifood/src/pages/Restaurants.css` | นำออกเฉพาะ override การ์ด/กริด โดยคง styles ตัวกรอง/ผลลัพธ์/สถานะเดิม |

ตรวจ hash เทียบ baseline68ไฟล์ก่อนเริ่มงาน และเปรียบเทียบ CSS ด้วย PostCSS AST แล้ว: เปลี่ยนไฟล์เดิมเฉพาะ5ไฟล์ที่อนุญาตข้างต้น ส่วน CSS composition อื่นเหมือนเดิม ยกเว้น gap ของ loading-grid ที่ระบุไว้ ไม่มีการแก้ page JSX, Layout จากงานก่อน, Detail, account/admin, API/auth/backend, global tokens/primitives, environment, dependencies หรือ deployment settings

## ผลการทดสอบ

รันจาก `thaifood`:

```sh
npm test -- --watchAll=false --runInBand --runTestsByPath src/components/RestaurantCard.test.jsx
# ผ่าน13tests

npm test -- --watchAll=false --runInBand
# ผ่าน138tests /18suites

npm run build
# Compiled successfully
```

ทดสอบใหม่ก่อนลงโค้ดแล้วพบ7กรณีล้มเหลว/6กรณีผ่าน หลังปรับผ่านทั้งหมด รวม category ที่เข้าถึงได้, คะแนนที่ไม่ถูกต้อง, จำนวนรีวิวที่ไม่มีข้อมูล, fallback ที่ล้มเหลวซ้ำ, การอัปเดต image prop, action แยกจากลิงก์ และรายการว่าง Scoped `git diff --check` ผ่าน

ผู้รีวิวโค้ดอิสระตรวจ source, scope hashes, tests/build, browser results และภาพตัวอย่างแล้ว ไม่พบประเด็น Critical, Important หรือ Minor ที่ต้องแก้เพิ่ม [ผลรีวิวและ verification](qa/restaurant-cards/review.json)

Browser QA ด้วย Chromium:

- Home/Search/Favorites ที่320/375/768/1024/1440px รวม15กรณี รูปลักษณ์การ์ดตรงกัน ไม่พบ horizontal overflow แม้มีชื่อ/จังหวัด/ประเภท/ที่อยู่ยาวมาก
- ตรวจ3/2/1คอลัมน์ ระยะห่าง24px ภาพ4:3/object-fit/clip radius18px และขนาดข้อความตรงชุดกลาง
- ตรวจภาพไม่มี URL/URLเสียแล้วใช้ SVG เดิม, หนึ่งลิงก์ต่อการ์ด, Tab/focus ของลิงก์และปุ่ม Favorites, hover และ reduced motion
- ลองนำออกจาก Favorites ผ่าน DELETE ที่ intercept เฉพาะ browser context ใช้ restaurant ID ถูกต้อง ไม่มีการเปลี่ยนหน้า และไม่มีข้อมูลจริงถูกลบ
- คลิกภาพไป `/restaurants/:id` ได้ตามเดิม ตรวจ styles ของ Detail และ Layout เดิมไม่เปลี่ยน รวม signed-in redirect เดิม
- อ่าน API จริงผ่าน development proxy เดิมไป Render ได้ HTTP200 แสดง12รายการจากยอด59ที่ APIส่งมาในรอบตรวจ ตรวจชื่อ ลิงก์ และคะแนนของการ์ดเทียบ response จริง ไม่มี live writes และไม่มี JavaScript page errors

หลักฐาน: [ผลตรวจ browser](qa/restaurant-cards/results.json), [ผลตรวจขอบเขต](qa/restaurant-cards/scope.json), [browser QA script](qa/restaurant-cards/check.cjs), [scope checker](qa/restaurant-cards/scope-check.cjs)

ภาพตัวอย่างใช้ข้อมูลจำลองสำหรับทดสอบโดยเฉพาะ รวมกรณีข้อความยาว/รูปเสีย:

- [Home desktop](qa/restaurant-cards/home-grid-1440.jpg) / [mobile](qa/restaurant-cards/home-card-375.jpg)
- [Search desktop](qa/restaurant-cards/search-grid-1440.jpg) / [mobile](qa/restaurant-cards/search-card-375.jpg)
- [Favorites desktop](qa/restaurant-cards/favorites-grid-1440.jpg) / [mobile](qa/restaurant-cards/favorites-card-375.jpg)

ขอบเขต QA: ใช้ Chromium ยังไม่ได้ตรวจ Safari/Firefox; favorite write ใช้ isolated fixture เท่านั้น ส่วน live API เป็น public GET ผ่าน local proxy ไม่ใช่การตรวจ production CORS ใหม่

## วิธีเปิดดู

```sh
cd thaifood
npm start
```

เปิด `http://localhost:3000` หรือ forwarded URL ของ Codespaces ที่หน้า `/`, `/restaurants` และ `/favorites` เมื่อเข้าสู่ระบบตามเดิม พอร์ต3100ใช้เฉพาะ QA ชั่วคราวและปิดเมื่อจบ โดยไม่เปลี่ยน process ของพอร์ต3000

งานนี้ไม่มีการ deploy และไม่มีการปรับส่วน E/F/G ซึ่งรอคำสั่งถัดไป
