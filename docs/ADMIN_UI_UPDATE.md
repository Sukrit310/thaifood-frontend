# G. Admin — Modern Thai Editorial

ปรับเฉพาะหัวข้อ G.Admin ตาม `THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md` วันที่13พฤศจิกายน2026

## สิ่งที่เปลี่ยน

- **Layout / Navigation:** จากเมนูแนวนอนสีเขียว เป็น sidebar บน desktop≥1024px และเมนู2คอลัมน์บนมือถือ ใช้สี Terracotta/Cream และ tokens กลาง มีไอคอนประกอบ active state และพื้นที่กดอย่างน้อย44×44px ยังใช้ header/footer, skip link และ demo banner เดิม
- **ภาพรวม:** KPIร้านอาหารใช้ `total` จาก service เดิม สมาชิกใช้จำนวน `items` ที่โหลดสำเร็จจริง ระหว่าง loading/error ไม่อ้างจำนวน0 และถ้าไม่มีtotalแสดงว่ายังไม่ทราบจำนวน มีทางไปเพิ่มร้าน จัดการร้าน รีวิว และสมาชิก โดยไม่เพิ่มกราฟหรือสถิติที่ไม่มีข้อมูลรองรับ
- **ร้านอาหาร / สมาชิก / รีวิว:** ตารางใช้ native semantics, caption และหัวคอลัมน์ บนมือถือจัดข้อมูลแต่ละแถวพร้อม label เพื่อให้อ่านและกด actions ได้โดยไม่เลื่อนแนวนอน ชื่อร้าน อีเมล และข้อความรีวิวยาวตัดบรรทัดได้ สมาชิกยังเป็นหน้าดูรายชื่อ/สิทธิ์ตามฟังก์ชันเดิม
- **ฟอร์มเพิ่ม/แก้ไขร้าน:** จัดกลุ่มข้อมูลร้านและที่ตั้ง/รูปภาพ แบ่งช่องที่เกี่ยวข้องเป็นสองคอลัมน์เมื่อมีพื้นที่ label/id/name และตัวเลือกจาก API เดิมครบ ข้อความช่วยระบุช่องบังคับ พิกัด และ URLภาพ ระหว่างบันทึกปิดการแก้ช่อง เมื่อผิดพลาดเก็บdraftและคืนโฟกัสให้ feedback รวมถึงเมื่อส่งผิดซ้ำ
- **การลบ:** คง confirmation เดิม ปิดปุ่มลบระหว่างรอ แจ้ง error/success ชัดเจน ลบไม่สำเร็จยังแสดงแถวเดิม ลบสำเร็จโหลดข้อมูลใหม่และคืนโฟกัสให้หัวข้อรายการ ลบร้านแถวสุดท้ายของหน้า2ยังกลับหน้า1และรักษาคำค้นเดิม
- **Loading / Empty / Error:** skeleton และข้อความเข้ากับระบบสี มี retry และคง h1/บริบทหน้าระหว่าง loading/error

## ไฟล์ที่แก้

| ไฟล์ | หน้าที่ |
|---|---|
| `thaifood/src/pages/admin/AdminLayout.jsx` | Sidebar/mobile navigation และขอบเขตstyles |
| `thaifood/src/pages/admin/AdminDashboard.jsx` | KPIข้อมูลจริงและทางลัดจัดการ |
| `thaifood/src/pages/admin/AdminRestaurants.jsx` | ตารางค้นหา/แบ่งหน้าและผลการลบ |
| `thaifood/src/pages/admin/AdminMembers.jsx` | ตารางสมาชิกและสิทธิ์แบบอ่านอย่างเดียว |
| `thaifood/src/pages/admin/AdminReviews.jsx` | ตารางรีวิวรายร้านและ moderation feedback |
| `thaifood/src/pages/admin/AdminRestaurantForm.jsx` | กลุ่มฟอร์มและสถานะบันทึก/validation |
| `thaifood/src/pages/admin/AdminUI.jsx` (เพิ่ม) | Header, skeleton, feedback, table cell และ count presentation |
| `thaifood/src/pages/admin/Admin.css` (เพิ่ม) | CSSทุกselectorอยู่ใต้ `.admin-page` |
| `thaifood/src/pages/admin/AdminUI.test.jsx` (เพิ่ม) |16กรณี UI/contract regression |

คง `useAdminData.js`, service endpoints, auth/role checks, query/reset/pagination semantics, field names, validation, numeric foreign keys, coordinate omission/zero, Mock seed-image normalization และ redirect เดิม ไม่มี dependency, backend, `.env`, global CSS หรือหน้าอื่นเปลี่ยน ผลเทียบ [baseline75ไฟล์](qa/admin/source-baseline.json) พบเปลี่ยนเฉพาะ6ไฟล์ที่อนุญาต อีก69ไฟล์ตรงเดิม ตรวจรายชื่อได้ใน [scope.json](qa/admin/scope.json)

## ผลตรวจ

| การตรวจ | ผล |
|---|---|
| Targeted Admin / Journey |27 tests /4 suites ผ่าน |
| `CI=true npm test -- --watchAll=false --runInBand` หลังแก้สุดท้าย |206 tests /21 suites ผ่าน รวม tests เดิมครบ |
| `npm run build` |Production build compile สำเร็จ ไม่มี ESLint warning ที่เพิ่มจากงานนี้ |
| Chromium6หน้า×320/375/768/1024/1440px |30กรณีผ่าน ไม่มี horizontal overflow มีh1หนึ่งตัว inputs16px targets≥44×44px |
| Native tables บนทุกขนาด |ยังพบtable/columnheader/rowheaderและอ่านข้อมูล/กดactionsได้ |
| ข้อความยาวใน3ตาราง×5ขนาด |15กรณีเพิ่มเติมผ่าน ชื่อUnicode/email/reviewยาวไม่ดันหน้าล้น |
| Guest / Member / Admin |GuestไปLoginพร้อมfrom, Memberเห็น403 ไม่มีadminAPIrequest; Adminเข้าหน้าและทำCRUDได้กับfixture |
| KPI / resource states |Loading/errorไม่สร้างจำนวน0, missingtotalไม่ทำหน้าพัง, truezeroแสดง0, retry/emptyผ่าน |
| Restaurant CRUD |POST/PUTส่งfieldเดิม numerickeys/0coordinates/nullimage, errorเก็บdraft, confirmcancel/error/success, search/page/qยังทำงาน |
| Review moderation |โหลดตัวเลือกร้านครบ53รายการจาก2หน้า, เลือก/ลบ/ยกเลิก/error/success/ลบแถวสุดท้ายผ่าน |
| Keyboard / motion / scope |Focusชัด ส่งผิดซ้ำรับfocus, ลบแล้วfocusไม่หาย, Enterใช้นำทาง, reducedmotion และออกไปProfileไม่ติดstylesAdmin |
| Fresh read-only review |ไม่พบประเด็นพฤติกรรมที่บล็อก พบพื้นที่กดแคบและแก้พร้อม regressionตรวจgeometry RED→GREEN |

Buildครั้งแรกพบ ARIA `rowgroup` ซ้ำกับnative `thead/tbody` จึงเอาเฉพาะส่วนซ้ำออก ยังคง table/row/cell roles สำหรับการจัดตารางบนมือถือ และยืนยัน semantics ในbrowser หลังแก้ Buildยังมี Node/CRA deprecation warning เดิมของtoolchain ไม่ได้เปลี่ยนdependenciesเพื่อแก้งานนอกขอบเขต

Reviewerพบปุ่มแก้ไข37×44pxและลบ25×44px จึงเพิ่ม `min-width` จากcontrol token และแก้ browser assertion ให้ตรวจทั้งสองมิติ ยืนยันว่า test fail ที่37×44จริงก่อนแก้ ([RED result](qa/admin/target-size-red.json)) แล้วรันเต็มจนผ่าน ([ผลล่าสุด](qa/admin/results.json), [สคริปต์](qa/admin/check.cjs)) พร้อมfullsuite206รายการหลังแก้

Browserใช้ AuthProvider/service layer จริงของแอป แต่ intercept API responses และ9mutation requestsด้วยfixtures ไม่มีการเขียนข้อมูลproduction ตัวเลข/ชื่อในภาพเป็นข้อมูลทดสอบ ผลนี้ยืนยัน UI/API contract ไม่ใช่การทดสอบแก้ข้อมูลหลังบ้านจริง

## ภาพตรวจ

- ภาพรวม: [desktop](qa/admin/admin-1440.jpg) / [mobile](qa/admin/admin-375.jpg)
- ร้านอาหาร: [desktop](qa/admin/admin-restaurants-1440.jpg) / [mobile](qa/admin/admin-restaurants-375.jpg)
- เพิ่มร้าน: [desktop](qa/admin/admin-restaurants-new-1440.jpg) / [mobile](qa/admin/admin-restaurants-new-375.jpg)
- แก้ไขร้าน: [desktop](qa/admin/admin-restaurants-501-edit-1440.jpg) / [mobile](qa/admin/admin-restaurants-501-edit-375.jpg)
- รีวิว: [desktop](qa/admin/admin-reviews-restaurant-501-1440.jpg) / [mobile](qa/admin/admin-reviews-restaurant-501-375.jpg) / [empty](qa/admin/reviews-empty-375.jpg)
- สมาชิก: [desktop](qa/admin/admin-members-1440.jpg) / [mobile](qa/admin/admin-members-375.jpg)
- Form errorที่เก็บdraft: [mobile](qa/admin/form-error-draft-375.jpg)

## เปิดดู

รัน `npm start` ในโฟลเดอร์ `thaifood` เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ผู้ดูแลเดิม แล้วเปิด `/admin`, `/admin/restaurants`, `/admin/restaurants/new`, `/admin/reviews`, `/admin/members` หรือแก้ไขร้านจากรายการ

งานนี้ยังไม่ได้deploy เซิร์ฟเวอร์3100ใช้ชั่วคราวสำหรับQA ปิดPID35544หลังตรวจ command/PORT ของโปรเซสแล้ว และยืนยันด้วยcurlว่าพอร์ต3100ไม่รับการเชื่อมต่อ ไม่ได้เปลี่ยนการรันพอร์ต3000 ดู [สรุปผลตรวจ](qa/admin/verification.json)
