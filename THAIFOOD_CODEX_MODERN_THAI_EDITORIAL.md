# Codex Implementation Brief — ThaiFood Modern Thai Editorial

> **เป้าหมาย:** ยกระดับ UI/UX ของ ThaiFood ให้เป็นเว็บค้นพบร้านอาหารไทยแบบ **Modern Thai Editorial** ที่ดูอบอุ่น พรีเมียม มีเอกลักษณ์ และใช้งานได้จริง โดย **ไม่ทำให้ฟังก์ชันเดิมเสีย**
>
> **Repository:** https://github.com/Sukrit310/thaifood-frontend  
> **Reference งานเก่า (ใช้เพื่อหลีกเลี่ยงการทำหน้าตาซ้ำ):** https://github.com/670710721/moviehub-670710721

## 1) บทบาทและวิธีทำงานของ Codex

คุณคือ Senior Frontend Engineer + UI/UX Designer ที่เชี่ยวชาญ React, responsive design, accessibility และ design systems ให้ **ลงมือแก้โค้ดจริง** ใน repository ปัจจุบัน ไม่ใช่เพียงเสนอแนวคิดหรือสร้างภาพ mockup

ก่อนแก้ไข:
1. ตรวจสอบโครงสร้าง repository, `package.json`, routes, components, CSS, tests และ README ปัจจุบันด้วยตัวเอง
2. ตรวจสอบว่าตัวแอปอยู่ในโฟลเดอร์ `thaifood/` หรือไม่ แล้วใช้เส้นทางที่มีอยู่จริงเป็นหลัก
3. อ่านไฟล์สำคัญ เช่น `src/pages/Home.jsx`, `src/pages/Restaurants.jsx`, `src/pages/RestaurantDetail.jsx`, `src/components/Layout.jsx`, `src/components/RestaurantCard.jsx`, `src/index.css`, `src/pages/admin/*`
4. สรุปสั้น ๆ ว่าพบระบบเดิมอะไรบ้าง จากนั้นดำเนินการพัฒนาโดยไม่ต้องรอคำยืนยัน เว้นแต่พบการเปลี่ยนแปลงที่อาจลบข้อมูลหรือทำลายสัญญา API
5. ถ้าโครงสร้างไฟล์เปลี่ยนจากที่ระบุ ให้ปรับตามความจริง ไม่สร้างไฟล์ซ้ำโดยไม่จำเป็น

## 2) Design Direction

**Concept:** “Every province has a delicious story.” / “ทุกจังหวัดมีเรื่องอร่อยให้ค้นพบ”

สไตล์: Modern Thai Editorial + Premium Food Discovery + Warm Minimalism

- ดูเหมือนเว็บไลฟ์สไตล์/นิตยสารอาหาร ไม่ใช่เว็บรายการหนังที่เปลี่ยนชื่อข้อมูล
- เน้นภาพอาหารที่มีคุณภาพ การจัด typography แบบ editorial และ whitespace ที่หายใจได้
- ความเป็นไทยต้องร่วมสมัย ไม่ใช้ลวดลายไทยประดับมากจนรก
- ใช้ภาพขนาดใหญ่และองค์ประกอบที่จัดวางอย่างมีจังหวะ มี visual hierarchy ชัดเจน
- สร้างความรู้สึกอบอุ่น น่าเชื่อถือ และกระตุ้นให้ค้นหาร้านต่อ
- อย่าใช้ gradient หนัก ๆ, glassmorphism ทุกจุด, เงาจัด, animation เยอะ หรือสีเขียวเดิมเป็นสีหลัก

### Design tokens (เริ่มต้น; ปรับเล็กน้อยได้เพื่อ contrast)

| Token | Hex | การใช้งาน |
|---|---|---|
| `--color-primary` | `#C65A35` | Terracotta: CTA, active state, accent |
| `--color-primary-hover` | `#A84628` | Hover ของ CTA |
| `--color-bg` | `#FFF8EE` | Warm cream background |
| `--color-surface` | `#FFFFFF` | Card, form, dialog |
| `--color-ink` | `#2E2925` | Heading, body text |
| `--color-muted` | `#695F55` | Secondary text |
| `--color-sand` | `#F1E2CF` | Soft section background |
| `--color-herb` | `#73805A` | Accent รองเท่านั้น |
| `--color-border` | `#E9DCCB` | Borders, separators |

- ใช้ `Noto Sans Thai` เป็น body และพิจารณา `Prompt` หรือ `IBM Plex Sans Thai` สำหรับ heading หากโหลดได้เหมาะสม; กำหนด fallback เสมอ
- Heading: responsive ด้วย `clamp()`, น้ำหนัก 600–700, line-height เหมาะกับภาษาไทย
- Body: อ่านง่าย 15–17px, line-height ประมาณ 1.65–1.85
- Container: ประมาณ 1200–1280px; spacing scale ที่สม่ำเสมอ
- Radius: card 16–20px, button 10–12px; shadow เบา ๆ เท่านั้น
- ใช้ CSS variables เพื่อให้ทุกหน้าสอดคล้องกัน และหลีกเลี่ยง inline style ที่ไม่จำเป็น

## 3) หน้าและองค์ประกอบที่ต้องพัฒนา

### A. Global Layout / Navigation / Footer

แก้ `src/components/Layout.jsx` และ styles ที่เกี่ยวข้อง:
- สร้าง brand mark / wordmark “ThaiFood.” ที่ดูเรียบแต่จำได้ง่าย
- Header แบบ sticky ได้ถ้าไม่บดบังเนื้อหา: โลโก้ซ้าย, เมนูหลักกลาง, actions ด้านขวา
- เมนู: หน้าแรก, ค้นหาร้านอาหาร, ร้านโปรด (เมื่อ login), โปรไฟล์, Admin (เฉพาะ admin)
- CTA เข้าสู่ระบบ/สมัครสมาชิกต้องมองเห็นชัดแต่ไม่แย่งความเด่นจากเนื้อหา
- เมนูมือถือเป็น hamburger ที่ใช้งานด้วยคีย์บอร์ดได้, มี `aria-expanded`, ปิดเมื่อเปลี่ยนหน้า
- Footer มี tagline, navigation, copyright และการจัดวางที่ดี
- รักษา demo/mock-data banner ที่มีอยู่ และไม่ทำให้ข้อความสาธิตหายไป

### B. Home — หน้าแรกต้องสร้างความประทับใจ

แก้ `src/pages/Home.jsx`:
1. **Hero แบบ Editorial:** heading ภาษาไทยที่เด่น เช่น “อร่อยทั่วไทย ไปกับทุกเรื่องราว”, subheading กระชับ, ภาพอาหารคุณภาพสูงทางขวาหรือเป็น composition แบบ asymmetrical
2. **Search bar สำคัญที่สุด:** ค้นหาชื่อร้าน/เมนู + เลือกจังหวัด + ปุ่มค้นหา; ใช้ query params/route เดิมให้ถูกต้อง
3. **Explore by Destination:** จังหวัดเด่น 4 แห่ง (เชียงใหม่, กรุงเทพฯ, ภูเก็ต, ขอนแก่น) เป็น destination tiles ที่มีภาพ/สีและคำอธิบายสั้น ๆ; เชื่อมหน้าค้นหาด้วยจังหวัดจริง
4. **Recommended / Discover Restaurants:** แสดงร้านจาก service เดิมเป็น grid ที่สวยและ responsive
5. **Why ThaiFood / Community CTA:** ส่วนเชิญชวนให้บันทึกร้านและเขียนรีวิว โดยไม่กล่าวอ้างข้อมูลเกินจริง
6. เพิ่ม micro-interactions แบบเบา ๆ และรองรับ `prefers-reduced-motion`

**ห้าม** ใส่จำนวนร้าน, คะแนน, รีวิว, จังหวัดที่รองรับจริง หรือคำว่า “ยอดนิยม” แบบอ้างเป็นข้อเท็จจริงหาก API ไม่ได้ให้ข้อมูลรองรับ; สามารถใช้ข้อความทั่วไปแทนได้

### C. Restaurant Cards / Grid

แก้ `src/components/RestaurantCard.jsx`, `RestaurantGrid.jsx`:
- รูปภาพอัตราส่วน 4:3 หรือ 3:2 ที่คงที่ ใช้ `object-fit: cover`
- ชื่อร้านเด่น รองลงมาคือจังหวัด, หมวดอาหาร, คะแนน/จำนวนรีวิวเมื่อมีข้อมูลจริง
- Badge หมวดอาหารที่อ่านง่าย ไม่ทับภาพจนรก
- Hover ยกการ์ดเล็กน้อย + ภาพ zoom เบา ๆ, มี keyboard focus ชัด
- แสดงสถานะยังไม่มีคะแนนอย่างถูกต้อง; ไม่สร้างคะแนนสมมติ
- มี image fallback เมื่อรูปไม่โหลด, lazy loading สำหรับรูปที่อยู่นอก viewport
- Grid: desktop 3 คอลัมน์, tablet 2, mobile 1 (ปรับตามพื้นที่จริง)

### D. Restaurant Search / Explore

แก้ `src/pages/Restaurants.jsx`:
- Header หน้า + คำอธิบายที่ช่วยเริ่มต้นค้นหา
- Search + province + category filters ดูเป็นระบบ; ใช้ค่าจาก API เดิม
- แสดงจำนวนผลลัพธ์ที่ตรงกับข้อมูลจริง
- มีปุ่มล้างตัวกรอง, loading skeleton, empty state, error state และ retry
- Pagination เดิมต้องทำงาน และ query params ต้องไม่สูญหาย
- Mobile filter ต้องไม่กินพื้นที่เกินไป และควรใช้งานได้โดยไม่ต้องซูม
- **ห้ามเพิ่ม filter ที่ Backend ไม่รองรับ** เว้นแต่ทำ client-side ได้ถูกต้องและอธิบายข้อจำกัด

### E. Restaurant Detail

แก้ `src/pages/RestaurantDetail.jsx`:
- Hero image เด่น, breadcrumbs, ชื่อร้าน, จังหวัด, หมวดอาหาร, คะแนนและจำนวนรีวิวจากข้อมูลจริง
- เนื้อหา 2 คอลัมน์บน desktop: รายละเอียด/รีวิว + sidebar ที่อยู่/แผนที่/บันทึกร้านโปรด
- Mobile จัดเป็นคอลัมน์เดียว อ่านและกดง่าย
- Review list / review form แยกส่วนชัดเจน, rating UI อ่านง่าย
- Favorite state และปุ่มเข้าสู่ระบบเมื่อเป็น guest ต้องทำงานเหมือนเดิม
- ถ้ามีพิกัด ใช้ลิงก์แผนที่เดิม; ถ้าไม่มี อย่าแสดงลิงก์เสีย

### F. Auth / Profile / Favorites

- Login/Register ใช้ layout สะอาด สวย อ่านง่าย; อาจใช้ split layout ที่มีภาพอาหารด้านหนึ่งบน desktop
- แสดง validation, error และ success feedback อย่างชัดเจน
- Favorites มี empty state ที่ชวนกลับไปค้นหาร้าน
- Profile / Change Password ใช้ form styles เดียวกับทั้งเว็บ
- **อย่าเปลี่ยน auth logic, role checks, endpoints, field names หรือ redirect semantics โดยไม่จำเป็น**

### G. Admin Dashboard

- เปลี่ยนรูปลักษณ์เป็น clean management dashboard แยกจากหน้าลูกค้าพอสมควร แต่ใช้ design tokens เดียวกัน
- Sidebar บน desktop และ navigation ที่ใช้งานสะดวกบน mobile
- KPI cards: จำนวนร้าน/สมาชิกจากข้อมูลจริงเท่านั้น
- ตารางร้าน/สมาชิก/รีวิว อ่านง่าย มี actions ชัดเจนและ confirmation เมื่อจำเป็น
- รักษาการเพิ่ม/แก้ไข/ลบร้าน การจัดการรีวิวและสมาชิกตามที่ระบบรองรับ
- ไม่เพิ่มกราฟหรือสถิติที่ไม่มี API รองรับเพียงเพื่อความสวย

## 4) Responsive / Accessibility / Quality

- ทดสอบที่ viewport ประมาณ 375px, 768px, 1024px และ 1440px
- ห้าม horizontal overflow โดยไม่ตั้งใจ; ปุ่มและฟอร์มไม่ล้นจอ
- สีข้อความและ control มี contrast ตาม WCAG AA เท่าที่ทำได้
- ทุก input มี label; ทุกปุ่มมี accessible name; รูปสำคัญมี alt ที่เหมาะสม
- รองรับ keyboard navigation, visible focus, semantic headings และ skip link เดิม
- Animation ไม่ทำให้เวียนหัว; เคารพ `prefers-reduced-motion`
- รักษาความเร็ว: รูปภาพบีบอัดเหมาะสม, lazy load, ไม่ติดตั้ง animation/UI library หนักโดยไม่จำเป็น
- **ห้าม hotlink รูปจากแหล่งที่ไม่อนุญาต**; ใช้ asset ที่มีสิทธิ์ใช้งาน หรือ asset ใน repo ที่เหมาะสม พร้อม fallback
- ถ้าภาพจริงยังไม่พร้อม ให้ทำระบบรองรับภาพและ fallback ที่สวย ไม่ใส่ URL ภาพปลอมหรือ asset ที่ไม่มีอยู่จริง

## 5) ข้อจำกัดด้านสถาปัตยกรรมและฟังก์ชัน

- ใช้ **React และเทคโนโลยีที่โปรเจกต์ใช้อยู่** เป็นหลัก; ไม่ย้าย framework
- ใช้ React Router, service layer, auth context, mock mode และ API contracts เดิม
- ห้ามแก้ Backend, database schema, endpoint หรือ `.env` เพื่อทำ UI redesign
- รักษา Guest / Member / Admin flows, reviews, favorites, search, pagination และ CRUD เดิม
- ไม่ลบ tests เดิม; เพิ่มหรือปรับ tests เมื่อ markup/behavior เปลี่ยน
- ไม่ใช้ข้อมูลสมมติแอบอ้างเป็นข้อมูล production
- ไม่แก้ unrelated code, ไม่เพิ่ม dependencies โดยไม่จำเป็น

## 6) ลำดับการทำงาน

ดำเนินการเป็นขั้นตอน:

1. **Audit:** อ่านโค้ดจริง สรุปจุดที่ต้องเปลี่ยนและข้อควรระวัง
2. **Design system:** ปรับ global tokens, typography, buttons, inputs, surfaces, utilities
3. **Public pages:** Layout → Home → Cards → Restaurants → Restaurant Detail
4. **Account pages:** Login, Register, Favorites, Profile, Change Password
5. **Admin pages:** Dashboard, layout, lists, forms
6. **Polish:** responsive, loading/empty/error states, hover/focus, reduced motion
7. **Verify:** รันคำสั่ง install/build/test/lint **เฉพาะที่มีใน package scripts** และรายงานผลจริง

หากงานทั้งหมดใหญ่เกินหนึ่งรอบ ให้ทำ **Phase 1 (Design System + Layout + Home + Restaurant Cards)** ให้สมบูรณ์ก่อน แล้วรายงานไฟล์ที่แก้และรายการที่เหลือโดยไม่แกล้งอ้างว่าทำครบ

## 7) Acceptance Criteria — ต้องผ่านก่อนส่งมอบ

- [ ] หน้าแรกดูต่างจาก MovieHub อย่างชัดเจนทั้งสี, layout, typography และภาพลักษณ์
- [ ] ใช้ Terracotta / Cream / Espresso อย่างสม่ำเสมอ
- [ ] Hero, Search, Destination, Restaurant Cards มี hierarchy ชัด
- [ ] ทุกหน้าหลัก responsive และไม่มี overflow
- [ ] ค้นหาร้าน/กรองจังหวัดและประเภท/แบ่งหน้ายังทำงาน
- [ ] เข้าสู่ระบบ สมัครสมาชิก ออกจากระบบ และการจำกัดสิทธิ์ยังทำงาน
- [ ] รีวิว ร้านโปรด และ Admin CRUD ยังทำงานตามเดิม
- [ ] Loading, Empty, Error states ดูดีและสื่อสารชัด
- [ ] Accessibility พื้นฐานและ keyboard focus ผ่านการตรวจ
- [ ] Build และ tests ที่เกี่ยวข้องผ่าน หรือแจ้งสาเหตุที่ไม่ผ่านอย่างตรงไปตรงมา

## 8) รูปแบบการรายงานเมื่อทำเสร็จ

ตอบเป็นภาษาไทย โดยสรุป:

1. **สิ่งที่เปลี่ยน:** ก่อน/หลังในระดับหน้าหรือองค์ประกอบ
2. **ไฟล์ที่แก้:** path และเหตุผลสั้น ๆ
3. **การทดสอบ:** คำสั่งที่รัน + ผ่าน/ไม่ผ่าน + ข้อจำกัด
4. **จุดที่ยังต้องทำ:** หากมี
5. **วิธีเปิดดู:** คำสั่งรันแอปจาก `package.json` จริง

**เริ่มลงมือแก้โค้ดใน repository ตอนนี้ โดยรักษาพฤติกรรมเดิมทั้งหมดและเน้นคุณภาพงานออกแบบที่นำไปใช้งานได้จริง**
