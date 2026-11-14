# ผลตรวจ Backend: Admin คนสุดท้ายและ concurrency

ตรวจวันที่ 14 พฤศจิกายน 2026 (Asia/Bangkok) ตามคำสั่งให้ตรวจ Backend เพิ่มจาก Live Frontend QA โดยใช้ source [`a8c0d78f76220f596a1646913685021ccfdc83f8`](https://github.com/Sukrit310/thaifood-backend/tree/a8c0d78f76220f596a1646913685021ccfdc83f8) สำเนาใน `/tmp/thaifood-backend-verify-20261114` ไม่มีการแก้ source หรือ deploy Backend

ใช้ Go 1.27.4, race detector และ PostgreSQL 17.12 จาก `postgres:17-alpine` ใน Docker ชั่วคราว ฐานข้อมูล `thaifood_test` เปิดพอร์ตสุ่มเฉพาะ `127.0.0.1` เก็บข้อมูลใน tmpfs ไม่โหลด `DATABASE_URL` หรือ credentials ของ Production และส่งเฉพาะ `TEST_DATABASE_URL` ของ container นี้ให้ tests

| การตรวจที่รันจริง | ผล |
|---|---|
| Race tests ทั้งโปรเจกต์ | ผ่าน39 testsหลักและ90 subtests; fail0/skip0 |
| Concurrency3กรณี ×20รอบ | ผ่าน60ครั้งเพิ่มเติม; fail0/skip0 |
| `go vet ./...` | ผ่าน exit0 |
| `go build ./...` | ผ่าน exit0 |
| Cleanup/source | ไม่มี schemaทดสอบเหลือ, containerถูกหยุดและลบ โดยตรวจ listingของDockerสำเร็จซ้ำ; Backend sourceไม่เปลี่ยน |

ผลคำสั่งจริง สถานะสุดท้าย จำนวน test/skip/fail และ cleanup อยู่ใน [results.json](results.json) พร้อม logs:

- [race-all.jsonl](race-all.jsonl): `go test -race -count=1 -timeout=5m -json ./...`
- [race-concurrency-20.jsonl](race-concurrency-20.jsonl): `go test -race -count=20 -timeout=5m -json ./store ./integration -run 'Test(UpdateMemberRoleConcurrentCrossDemotions|UpdateMemberRoleRechecksActorAfterLockWait|AdminMemberRolesConcurrentCrossDemotions)$'`
- [vet.txt](vet.txt): `go vet ./...`
- [build.txt](build.txt): `go build ./...`

ชุดเต็มต้องไม่มี test ถูก skip ส่วน package หลัก `thaifood-backend` ไม่มี test files จึงมี package-level `skip` ใน Go JSON ซึ่งเป็นคนละอย่างกับการ skip test ฐานข้อมูล

## สิ่งที่ตรวจ

1. `TestUpdateMemberRoleGuards/self_demotion_of_last_admin`: Admin คนเดียวลดสิทธิ์ตัวเองไม่ได้และยังมี Admin เหลือ
2. `TestUpdateMemberRoleConcurrentCrossDemotions`: Store สองคำขอลดสิทธิ์กันพร้อมกัน สำเร็จหนึ่งคำขอและอีกคำขอได้ Forbidden ฐานข้อมูลเหลือ Admin หนึ่งคน
3. `TestUpdateMemberRoleRechecksActorAfterLockWait`: ผู้สั่งที่ถูกลดสิทธิ์ระหว่างรอ lock ถูกตรวจใหม่และใช้สิทธิ์เดิมลดอีกบัญชีไม่ได้ การทดสอบรอจน PostgreSQL รายงาน lock wait จริง
4. `TestAdminMemberRolesConcurrentCrossDemotions`: ทดสอบสองคำขอ HTTP ผ่าน middleware/handler/Store/PostgreSQL ได้หนึ่ง200และหนึ่ง403 แล้วนับ Admin ในฐานข้อมูลเหลือหนึ่งคน
5. `TestAdminMemberRoles`: JWT เดิมได้รับ/เสียสิทธิ์ใน request ถัดไป ตรวจ self/guest/member, validation, idempotency และการปฏิเสธ role ใน Register/Profile

สามกรณี concurrency ในข้อ2–4 ถูกกำหนดให้รันซ้ำกรณีละ20ครั้ง รวม60ครั้งเพิ่มเติมจากชุดเต็ม เพื่อตรวจพฤติกรรมตามลำดับการแข่งของคำขอ ไม่มี traffic ไป Production

## ขอบเขตหลักฐาน last-admin

API ป้องกันการเหลือ Admin ศูนย์คนด้วย self-change rejection ร่วมกับการล็อก transaction และอ่าน role ผู้สั่งใหม่หลังได้ lock เมื่อผู้สั่งยังเป็น Admin และเป้าหมายเป็น Admin อีกคน จะมี Admin อย่างน้อยสองคนอยู่แล้ว ดังนั้น `ErrLastAdmin` เป็นเงื่อนไขเสริมที่คำขอปกติไปไม่ถึง ส่วน HTTP409`LAST_ADMIN` ถูกตรวจด้วย handler mock ไม่ใช่ผลที่อ้างว่ากระตุ้นได้จาก PostgreSQL จริง ดู [audit.md](audit.md) และคำอธิบายของ Backend ที่อ้าง revision ตรงกัน

ผลนี้ครอบคลุม tests ที่มีอยู่ ยังไม่ได้เพิ่มการทดสอบหลาย API servers/connection pools แยกกัน หรือยกเลิกคำขอระหว่างรอ table lock และไม่ได้ทดสอบ SQL ที่ผู้ดูแลฐานข้อมูลสั่งเอง การตรวจ source ไม่พบข้อบกพร่องสำคัญในเส้นทาง API นี้

สคริปต์ [verify.py](verify.py) ตรวจ revision/ownership ของ container ก่อนเริ่ม รันคำสั่งพร้อมเก็บ logs ตรวจ schema ทดสอบถูกล้าง ตรวจ source ไม่เปลี่ยน และหยุด container ที่สร้างเฉพาะงานนี้เมื่อจบ
