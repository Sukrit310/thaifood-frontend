# คำสั่ง Codex เครื่อง FE (ThaiFood Guide)

**FE Reference:** https://github.com/670710721/moviehub-670710721  
**BE Reference:** https://github.com/Sukrit310/week6-lab-fork/tree/main/moviehub  
**เอกสารข้อตกลง:** ThaiFood_Guide_API_CONTRACT_v2.md

> งานของคุณ: พัฒนาเว็บ ThaiFood Guide - ระบบแนะนำร้านอาหารทั่วประเทศไทย แยกตามจังหวัด โดยใช้ FE ของ MovieHub ในลิงก์เป็นตัวอย่างโครงสร้างและการเขียน React ไม่ใช่แก้โปรเจกต์ MovieHub เดิมโดยตรง ให้เปิดอ่าน README, package.json, src/App.jsx, src/api/backend.js, src/auth/AuthContext.jsx, src/components/ProtectedRoute.jsx, src/components/RequireRole.jsx, หน้า Home, Movies, MovieDetail, Wishlist, Admin pages และ React tests จาก Repository อ้างอิงก่อนลงมือ เขียนแผน mapping ไฟล์ MovieHub -> ThaiFood ก่อนแก้โค้ด เริ่มจาก React Create React App เดิม (react-scripts) + React Router 6 + Tailwind CSS + Jest/React Testing Library; อย่าใช้ Vite จนกว่าจะมีคำสั่งเปลี่ยนอย่างชัดเจน ใช้ `REACT_APP_API_URL` ผ่าน `process.env.REACT_APP_API_URL`, dev server localhost:3000, `npm start`, `npm test`, `npm run build`. ปรับระบบให้เป็นร้านอาหารและจังหวัด ไม่ใช้เนื้อหา หนัง / TMDB หรือคีย์จริงของ MovieHub; เปลี่ยน Movies/Genres/Wishlist เป็น Restaurants/Categories/Favorites; เพิ่ม Province Filter, Restaurant Detail, Review 1-5 ดาว, Auth, Profile, Change Password, Admin Restaurant CRUD, Review Moderation, Guest/Member/Admin UI, Route guards, Controlled Forms, Loading/Empty/Error, Responsive และ Unit Tests ที่มี Assertions ถูกต้อง. ระหว่างรอ Go Backend ให้ใช้ Mock Data ที่ตรงกับ ThaiFood_Guide_API_CONTRACT_v2.md; เมื่อมี Render URL ให้สลับเป็น Fetch API จริงและทดสอบ 401/403/CORS. ห้ามเปลี่ยนชื่อ endpoint หรือ JSON fields ฝ่ายเดียว ห้าม Commit Secrets, .env หรือ API keys ให้สรุปไฟล์ที่สร้าง/แก้พร้อมขั้นตอนทดสอบ/Deploy Vercel.

## แผนส่งงาน FE

1. สำรวจ repo ต้นแบบและทำตาราง File Mapping
2. สร้าง ThaiFood repo ใหม่พร้อมปรับ routes และ components
3. ทำ Home/Restaurants/Detail และ province/category filters จาก Mock JSON
4. ปรับ Register/Login/Logout/AuthContext/Route Guards และ Profile/Change Password
5. ทำ Favorites/Reviews/Admin Restaurant CRUD, Members และ Moderation
6. ปรับ src/api/backend.js ตาม Contract เชื่อม Go Render จริง
7. เขียน Jest + React Testing Library ครอบคลุม loading/empty/error/forms/roles และ build
8. ตั้ง REACT_APP_API_URL บน Vercel, Deploy, ตรวจสอบพร้อม BE

**หมายเหตุ:** `moviehub-670710721` เป็นแหล่งอ้างอิง FE ไม่ใช่ Repository งานส่งใหม่ ให้ระบุเครดิตแหล่งอ้างอิงตามความเหมาะสม
