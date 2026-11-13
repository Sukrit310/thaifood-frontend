# Frontend verification

> ผลตรวจรับล่าสุด13พฤศจิกายน2026: ดู [FINAL_ACCEPTANCE.md](FINAL_ACCEPTANCE.md) — 209tests/21suites,168cross-browser checks,42Axe scansและAPIจริง รายงานเดิมด้านล่างเป็นประวัติของรอบก่อนหน้า


ตรวจวันที่ 12 พฤศจิกายน 2569 (Asia/Bangkok)

## Live backend

ผลและขอบเขตอยู่ใน [INTEGRATION.md](INTEGRATION.md) และ [LIVE_API_RESULTS.json](LIVE_API_RESULTS.json): actual frontend services → native Fetch → Go ผ่าน11checks/33requests รวม Public/Member/Auth/Password/Reviews/Favorites และ401/403/404/409. CRA development proxy ตรวจผ่าน HTTPพร้อมCodespacesOrigin ได้ข้อมูลร้านจาก Go200

ตรวจ compatibility กับ source Backend แล้วใน [BACKEND_AUDIT.md](BACKEND_AUDIT.md): UTF-8 password bytes, Unicode text lengths, strict absoluteimageURL, omittedcoordinates และ wrong-current-password401 ที่ต้องไม่ logout

## Local checks

จาก `thaifood/`:

```bash
CI=true npm test -- --watchAll=false --runInBand
CI=true npm run build
npm run smoke:api
```

Jest ใช้ Mock อย่างชัดเจนใน setupTests; production build เรียก Go เป็นค่าเริ่มต้น ชุดทดสอบครอบคลุม contract/statuses, Unicode boundaries, role/owner, session races, search/loading/empty/error/retry, account forms, Admin CRUD/moderation และ member journeys

## ผลล่าสุด

- Jest: **15 suites / 91 tests ผ่านทั้งหมด** (exit0)
- CRA production build: **Compiled successfully** (exit0), JS98.96kB gzip / CSS7.94kB gzip
- Live Go: **11checks / 33requests ผ่านทั้งหมด**
- Development proxy: request พร้อม Codespaces Origin ได้200และข้อมูลจาก Go
- git diff --check ผ่าน; .env.local ถูก ignore

## ข้อจำกัด

ไม่มี browser automation runtime จึงยังไม่ได้ตรวจ visual/keyboard/responsive ใน browser จริง Admin CRUD บน Go ยังต้องตรวจด้วยบัญชี Admin และ Vercel deployment/CORS ต้องตรวจเมื่อมี frontend origin จริง

npm install รอบตั้งต้นรายงาน dependency vulnerabilities ใน CRA dependency tree; ไม่ใช้ npm audit fix --force เปลี่ยน toolchain ที่ข้อกำหนดให้คงไว้ ต้องประเมิน advisory ก่อน production
