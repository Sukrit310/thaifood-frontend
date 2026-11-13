# E. รายละเอียดร้านอาหาร — Modern Thai Editorial

ปรับเฉพาะหัวข้อ E ของ `THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md` วันที่13พฤศจิกายน2026 โดยใช้ Design System กลางเดิม

## สิ่งที่เปลี่ยน

- จัด breadcrumbs ชื่อร้าน จังหวัด หมวดอาหาร และคะแนนให้ชัดขึ้น พร้อมภาพหลักขนาดใหญ่ มี intrinsic sizing/async decode และ fallback ใน repo ที่ไม่วนเปลี่ยน src เมื่อโหลดไม่ได้
- Desktop ตั้งแต่1024px เป็น2คอลัมน์: เรื่องราว/ภาพ/รีวิวทางซ้าย และที่อยู่/แผนที่/ร้านโปรดทางขวา หน้าจอเล็กเรียง story → visit details → reviews ตามลำดับ DOM และภาพหลักเปลี่ยนเป็น4:3
- Sidebar อยู่ใน normal flow เพื่อไม่บังเนื้อหาหรือ controls ในหน้าจอสั้น/กรณีที่อยู่ยาว
- แยกรายการรีวิว แบบฟอร์ม และข้อความตอบรับของรีวิว/ร้านโปรดให้อยู่ใกล้การใช้งาน คะแนนและจำนวนรีวิวอ่านจาก response จริง ไม่มีข้อมูลใช้ข้อความที่ตรงกับสถานะ
- ดาวเป็น native radio controls เดิม เพิ่มตัวเลขและพื้นที่กดอย่างน้อย44px รองรับลูกศรคีย์บอร์ดและ focus ชัดเจน คะแนนในรีวิวมี accessible image role/name
- คง guest login CTAs และ return pathname, การบันทึก/นำออกร้านโปรด, การส่ง/ยืนยันลบรีวิว, owner/admin permissions และข้อจำกัด1รีวิวต่อสมาชิกต่อร้าน
- หลังส่ง/ลบรีวิวสำเร็จ refresh คะแนน/จำนวน/รายการผ่าน service เดิม และย้าย focus ไปหัวข้อรีวิวพร้อมข้อความสถานะ
- แยก error/retry ของรายละเอียด รีวิว และร้านโปรด ข้อมูลส่วนที่โหลดได้ยังใช้งานต่อได้ ข้อผิดพลาดขณะส่งรีวิวยังคง draft ไว้
- ใช้ OpenStreetMap URL/zoom16เดิมเมื่อพิกัดเป็นตัวเลขที่อยู่ในขอบเขต รับค่า0และ numeric strings ที่ถูกต้อง; ถ้าพิกัดว่าง/ไม่ครบ/ผิดรูป/เกินขอบเขต จะไม่สร้างลิงก์เสีย
- ผูก content component กับ restaurant ID เพื่อไม่ให้ busy/message/draft จากร้านก่อนค้างเมื่อเปลี่ยนเส้นทาง รวมกรณี request เก่ายังไม่เสร็จ

## ไฟล์ที่แก้

| ไฟล์ | เหตุผล |
| --- | --- |
| `thaifood/src/pages/RestaurantDetail.jsx` | โครงหน้า สถานะ UI พิกัด รูปสำรอง และ feedback/lifecycle เฉพาะร้าน |
| `thaifood/src/pages/RestaurantDetail.css` | CSSทั้งหมดจำกัดใต้ `.restaurant-detail-page` ไม่แก้ global styles |
| `thaifood/src/components/ReviewList.jsx` | empty heading เป็นH3ใต้ section รีวิว, accessible rating และ explicit button type; คง permission/confirmation/delete logic |
| `thaifood/src/components/ReviewForm.jsx` | เพิ่มตัวเลขใต้ดาวและ explicit submit type; คง validation/payload/error-draft/busy logic |
| `thaifood/src/pages/RestaurantDetail.test.jsx` | 26กรณีทดสอบของรายละเอียด รีวิว ร้านโปรด พิกัด และ route lifecycle |
| `thaifood/src/Journey.test.jsx` | ปรับเพียง assertion ของรีวิวให้รอข้อความใน saved review article โดยคง persistence/rating/count/delete checks เดิม |

ตรวจเทียบ hash ของ70ไฟล์ก่อนเริ่มงาน: เปลี่ยนไฟล์เดิมเพียง4ไฟล์ข้างต้น ส่วน Layout/Card/Home/Search, pageอื่น, global CSS/tokens, services/auth/backend, routes, environment, packages และ deployment settings คงเดิม [ผลตรวจขอบเขต](qa/restaurant-detail/scope.json)

## ผลการตรวจสอบ

รันจาก `thaifood`:

```sh
npm test -- --watchAll=false --runInBand
# ผ่าน164tests /19suites รวม26testsของRestaurantDetail

npm run build
# Compiled successfully
```

ก่อนลงโค้ดใหม่ ชุดทดสอบ26กรณีพบ20ล้มเหลว/6ผ่าน แล้วผ่านทั้งหมดหลังพัฒนา Scoped `git diff --check` ผ่าน

ชุด Journey เดิมเคยจับข้อความจาก TEXTAREA ซึ่งถูกถอดระหว่าง refresh รีวิว ตัว probe ยืนยันว่า node ที่ได้เป็น TEXTAREA/isConnected=false จึงปรับ assertion ให้รอข้อความใน review article จริง การตรวจ service data, คะแนน, จำนวนรีวิว, การลบ และ Journey อื่นยังอยู่ครบ

Browser QA ด้วย Chromium:

- Guest/Member/Admin ที่320/375/768/1024/1440px รวม15กรณี ไม่พบ horizontal overflow; desktop2คอลัมน์และ mobile order ถูกต้อง ภาพ/ฟอร์ม/ปุ่มไม่ล้น
- เพิ่ม long-content stress อีก5ขนาดจอ ทั้งชื่อร้าน description ที่อยู่ ชื่อผู้รีวิว และข้อความยาว
- Guest ไม่เรียก private favorites API; ลิงก์เข้าสู่ระบบกลับร้านเดิมได้; map URL ถูกต้องและไม่มีลิงก์เมื่อไม่มีพิกัด
- Member ทดสอบ favorite write failure/retry/add/remove, radio arrow keys, failed review submit/draft retention, submit/delete/one-review notice, true rating/count refresh และ focus กลับหัวข้อรีวิว
- Admin ทดสอบ cancel/confirm ลบรีวิวของผู้อื่นตามสิทธิ์เดิม
- ทดสอบ loading/empty/404/error/retry, independent review/favorite failures, image fallback และ reduced motion
- ตรวจ Search/Home/Login หลังโหลด Detail CSS แล้ว styles เดิมยังคงอยู่
- อ่าน APIจริงผ่าน local dev proxy เดิมไป Render ได้ HTTP200 ชื่อ/ภาพตรงกับ response ของร้านid29ในรอบตรวจ ไม่มี live writes และไม่มี JavaScript page errors

การเขียนข้อมูล7คำขอใน QA เป็น requests ที่ intercept เฉพาะ browser fixtures รวมคำขอที่จำลองการล้มเหลว ไม่มีการส่งรีวิว/เปลี่ยนร้านโปรด/ลบข้อมูลบน backend จริง

ผู้รีวิว source อิสระตรวจ scope, contracts, tests/build และโค้ดแล้วไม่พบ Critical/Important/Minor ที่ต้องแก้เพิ่ม การตรวจ browser และ keyboard ดำเนินการแยกโดยผู้พัฒนา [review/verification record](qa/restaurant-detail/review.json)

หลักฐาน: [browser results](qa/restaurant-detail/results.json), [QA script](qa/restaurant-detail/check.cjs)

ภาพตัวอย่างข้อมูลจำลองสำหรับ QA:

- [Guest desktop](qa/restaurant-detail/guest-detail-1440.jpg) / [mobile](qa/restaurant-detail/guest-detail-375.jpg)
- [Review form desktop](qa/restaurant-detail/member-form-1440.jpg) / [mobile](qa/restaurant-detail/member-form-375.jpg)
- [Loading](qa/restaurant-detail/loading-1440.jpg), [detail error](qa/restaurant-detail/detail-error-1440.jpg), [404](qa/restaurant-detail/not-found-1440.jpg)
- [Review error/draft](qa/restaurant-detail/review-error-draft.jpg), [review load error](qa/restaurant-detail/reviews-error-1440.jpg), [no map](qa/restaurant-detail/no-map-empty-375.jpg)

ภาพจาก live API แบบอ่านอย่างเดียว: [desktop](qa/restaurant-detail/live-detail-1440.jpg) / [mobile](qa/restaurant-detail/live-detail-375.jpg)

ข้อจำกัด QA: ใช้ Chromium ยังไม่ได้ตรวจ Safari/Firefox หรือใช้ screen reader จริง Review DTO/date/member fields ยังคงยึด API contract เดิม ไม่ได้ทดสอบ production CORS ใหม่หรือส่ง live mutations

## วิธีเปิดดู

```sh
cd thaifood
npm start
```

เปิด `http://localhost:3000` หรือ forwarded URL ของ Codespaces แล้วเปิดร้านผ่านหน้าค้นหา หรือ `/restaurants/<id>` ที่มีอยู่จริง พอร์ต3100ใช้เฉพาะ QA และปิดหลังตรวจ ไม่เปลี่ยน process พอร์ต3000

งานนี้ไม่มีการ deploy ส่วน F/G และเนื้อหาหน้าอื่นรอคำสั่งถัดไป
