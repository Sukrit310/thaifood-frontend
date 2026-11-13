# ThaiFood — Final acceptance

รายงานรอบตรวจรับ13พฤศจิกายน2026 ตาม Modern Thai Editorial brief บันทึกก่อนปล่อยเวอร์ชัน โดยขณะตรวจยังไม่ commit, push หรือ deploy และใช้workspaceบนHEAD`58376d8` ผลด้านล่างเป็นหลักฐานของรอบตรวจรับ ไม่ใช่สถานะdeploymentปัจจุบัน

## ผลตรวจ

| ส่วน | ผลและหลักฐาน |
|---|---|
| Member UI → Go API → persistence |ผ่าน6checks/40browserAPIrequests:สมัคร,login/return path,profile,passwordผิด/ถูก,logout,member403,favorite,reviewและcleanup [report](qa/final-acceptance/live-member.json) |
| Admin UI → Go API → persistence |ผ่าน5checks/42browserAPIrequests:adminrole,members,create/edit,reviewmoderation,confirmationcancel,delete/cascadeและcleanup [report](qa/final-acceptance/live-admin.json) |
| Public services / CORS / errors |ผ่าน6checks/13HTTPrequests แบบอ่านอย่างเดียว:health,productionorigin/preflight,ปฏิเสธoriginอื่น,provinces/categories/list/filter/detail/reviews/empty/404/401 [report](qa/final-acceptance/read-only-api.json) |
| หลายเบราว์เซอร์ |Chromium141.0.7390.37,Firefox142.0.1,WebKit26.0 ผ่าน14routes×375/768/1024/1440px รวม168checks ไม่มีhorizontaloverflow [report](qa/final-acceptance/cross-browser.json) |
| Accessibility |axe42page scans ตามWCAG2A/AA,2.1A/AA,2.2AA ไม่มีviolations;มีARIA snapshots,keyboardmenu/Escape/skip/focusและreducedmotion |
| Tests |`CI=true npm test -- --watchAll=false --runInBand`:209tests/21suitesผ่าน รวม3regressionsใหม่สำหรับlogoutจากprotectedroutes |
| Build |`npm run build`:Compiled successfully;JSgzip104.83kB/CSS14.79kB ไม่มีcompile/linterror มีNode toolchain deprecation warningเดิม |
| Review / scope |fresh read-only reviewerอนุมัติการแก้แอป ตรวจพบQA-script3จุดและแก้แล้ว ดู [review](qa/final-acceptance/review.md);ไม่มีdependency/backend/auth-provider/endpoint/envเปลี่ยน |

Member flowรอบแรกใช้เว็บproductionและพบบั๊กlogout จึงหยุดตรวจจุดนั้น แล้วพิสูจน์ด้วยregressionก่อนแก้ Member flowรอบผ่านใช้localpreview3100 → CRAproxyเดิม → Goจริง พร้อมอ่านAPIโดยตรงยืนยันpersistence ส่วนAdmin CRUDรอบนี้ใช้productionfrontend → Goจริง การตรวจหลายเบราว์เซอร์ใช้localpreviewหลังแก้และAPIจริง เฉพาะlogin/อ่านข้อมูล ไม่ทำCRUDซ้ำ

## ปัญหาที่พบและแก้

1. **Logoutจากหน้าที่ต้องloginไปLoginแทนHome:** ยืนยันบนproduction`/profile→/login`ทั้งที่tokenถูกล้างแล้ว ([probe](qa/final-acceptance/logout-production-probe.json)) เกิดจากrouteguardเห็นsessionว่างก่อนnavigationไปHome ใช้React`startTransition`รวมสองstate updatesในLayout โดยคงAuthContext/ProtectedRouteและAPIเดิม เพิ่ม3Journeyregressionsที่ล้มเหลวก่อนแก้ แล้วผ่านหลังแก้ รวมbrowser3engines
2. **สีข้อความเล็กบนsandมีcontrast4.01:1:** Community kickerและAdminrolebadgesเปลี่ยนเฉพาะforegroundเป็นprimary-hover token ผ่านเกณฑ์4.5:1จากการตรวจAxeจริง ไม่เปลี่ยนpaletteกลาง
3. **Accessible nameไม่ตรงvisible label:** ลิงก์จังหวัด/การ์ด/โปรไฟล์ใช้ชื่อจากข้อความจริงแทนoverrideที่ตัดหรือเพิ่มคำต่างจากที่เห็น ปุ่มAdminลบใช้idle/busyชื่อที่สอดคล้องกับข้อความและยังระบุรายการเป้าหมาย ปลายทางลิงก์และAPIไม่เปลี่ยน

ไฟล์แอปที่แก้:`components/Layout.jsx`,`RestaurantCard.jsx`,`pages/Home.jsx`,`Home.css`,`pages/admin/Admin.css`,`AdminRestaurants.jsx`,`AdminReviews.jsx` และ5ไฟล์testsที่เกี่ยวข้อง ไม่มีการลบtestsเดิม

## ข้อมูลทดสอบและความเป็นส่วนตัว

- ใช้บัญชีสมาชิกQAแยกจากผู้ใช้เดิม2บัญชี:ID15(รอบที่พบlogoutbug)และID16(รอบผ่าน) ทั้งสองยังอยู่เพราะAPIไม่มีmember-delete endpoint สุ่มcredentialsเฉพาะในหน่วยความจำและทิ้งหลังรัน ไม่ได้แก้บัญชีผู้ใช้เดิม
- สร้างร้านQAID147 เพื่อทดสอบAdmin ลบร้าน/รีวิว/favoriteที่สร้างและยืนยันcascadeแล้ว รายการfavoritesเดิมของAdminตรงกับก่อนทดสอบ
- บัญชีAdminจากไฟล์`thaifood/.env.qa.local`ที่Gitignore ใช้เฉพาะlogin/สิทธิ์และรายการทดสอบ ไม่เปลี่ยนpassword/profileของAdmin ไม่มีpassword/tokenในรายงานหรือbrowserstorage artifacts
- ปิดบังชื่อprofileในภาพและARIA artifactsที่บันทึก ไม่เก็บรายชื่อสมาชิกจริงทั้งชุดในรายงาน มีเฉพาะจำนวนและผลตรวจ
- QA-scriptแก้ให้cleanupยืนยันได้เฉพาะHTTP200ที่มีitems array ไม่สรุปว่าสะอาดจากresponseที่หาย/ผิดพลาด และรองรับชื่อปุ่มทั้งdeploymentเดิมกับโค้ดlocalใหม่

## ข้อจำกัดและสถานะส่งขึ้นใช้งาน

- WebKit26.0เป็นengine automationบนUbuntu ไม่ใช่SafariจริงบนmacOS/iOS;ยังไม่ได้ใช้NVDA/VoiceOverจริง ไม่มีการอ้างว่าเครื่องมืออัตโนมัติแทนการใช้งานassistive technologyจริงได้ทั้งหมด
- Axe incomplete findingsที่ต้องใช้คนพิจารณาถูกเก็บในJSON ไม่ถูกนับเป็นผ่านโดยอัตโนมัติ ผลzero violationsมีขอบเขตเฉพาะroutes/statesและtagsที่ตรวจ
- Loading/empty/error/retryและrolefixtureยังมีtestsเดิมครบ ส่วนการเขียนข้อมูลรอบนี้ใช้APIจริงไม่ได้mockผลสำเร็จ
- ณเวลาตรวจรับ Productionเป็นcommit`58376d8`;fixesรอบนี้ยังอยู่local การตรวจและchecklistอ้างcodeหลังแก้ในworkspace สถานะนี้บันทึกก่อนการcommit/push/deployที่ผู้ใช้อนุญาตภายหลัง
- เครื่องมือQAอยู่ในignoredcache ไม่เพิ่มpackage.json/lockfile เซิร์ฟเวอร์3100ใช้ชั่วคราวและปิดหลังตรวจ ไม่เปลี่ยนพอร์ต3000

## เปิดดูและทำซ้ำ

รัน`npm start`ใน`thaifood`แล้วเปิดหน้าที่ต้องการ หรือใช้สคริปต์ใน [qa/final-acceptance](qa/final-acceptance) โดยกำหนด`THAIFOOD_QA_BASE_URL`ตามtarget แยกlive-member/live-adminที่มีwritesและcleanupออกจากcross-browserที่มีเฉพาะlogin/reads อ่านcommentและreportก่อนรันซ้ำเพื่อไม่เพิ่มบัญชีQAโดยไม่จำเป็น
