# ThaiFood: Design System กลาง

อัปเดต 13 พฤศจิกายน 2026 ตาม `THAIFOOD_CODEX_MODERN_THAI_EDITORIAL.md` เฉพาะช่วง Design System กลาง

## แหล่งข้อมูลกลาง

- `thaifood/src/styles/tokens.css`: สี ตัวอักษร spacing, container, radius, shadow และ motion
- `thaifood/src/styles/primitives.css`: พื้นฐานหน้าเว็บ ปุ่ม ฟอร์ม surfaces, feedback และ focus
- `thaifood/src/index.css`: layout และ styles เฉพาะหน้าที่มีอยู่เดิม
- `thaifood/src/index.js`: โหลด tokens → styles เดิม/Tailwind → primitives; Home ยังมี styles เฉพาะการจัดวางของตัวเอง
- `thaifood/tailwind.config.js`: ชื่อ semantic ที่อ้างช่องสีเดียวกับ CSS tokens และรองรับ opacity modifiers

Home ไม่ประกาศ palette ซ้ำแล้ว สีและ radius หลักอ้างชุดกลางร่วมกับหน้าที่ใช้ primitives อยู่เดิม

## สี

ค่า `--color-*-rgb` เป็นแหล่งสีหลักแบบช่อง RGB; ค่า `--color-*` ประกอบจากช่องเดียวกัน ไม่ต้องแก้ hex ซ้ำใน Tailwind

| Token | สี | ใช้กับ |
| --- | --- | --- |
| `--color-primary` | `#B64E2E` | CTA, links, active และ focus |
| `--color-primary-hover` | `#9C3F24` | Hover ของ CTA |
| `--color-bg` | `#FFF8EE` | พื้นหน้าเว็บ |
| `--color-surface` | `#FFFFFF` | ฟอร์มและ panel |
| `--color-ink` | `#2E2925` | ข้อความหลัก |
| `--color-muted` | `#695F55` | ข้อความรองและ placeholder |
| `--color-sand` | `#F1E2CF` | พื้นรองและ skeleton |
| `--color-herb` | `#73805A` | Accent รอง ไม่ใช้เป็นสีข้อความทั่วไป |
| `--color-border` | `#E9DCCB` | เส้นแบ่งและขอบตกแต่ง |
| `--color-control-border` | `#9B8977` | ขอบ control ที่ต้องมองเห็นชัด |
| `--color-danger` | `#A42F28` | Error/invalid |
| `--color-success` | `#34563E` | ผลสำเร็จ |
| `--color-warning` | `#805600` | คำเตือน |

Primary ใช้ค่าที่เข้มขึ้นเล็กน้อยจาก brief และตรงกับ Home ที่ทำไว้ก่อน เพื่อให้ข้อความขาวผ่าน contrast 4.5:1 ใช้สี success เฉพาะสถานะสำเร็จ ไม่ใช้สีเขียวเป็น brand หลัก

Legacy aliases `--leaf`, `--leaf-dark`, `--ink`, `--muted`, `--line`, `--surface` และ Tailwind `leaf` / `mist` คงไว้ให้โค้ดเดิมทำงาน โดยอ้างชุดใหม่ ไม่มีการ override palette `green` ของ Tailwind ทั้งชุด

## Typography, spacing และพื้นผิว

- ใช้ Noto Sans Thai น้ำหนัก 400/500/600/700 ที่เสิร์ฟในโปรเจกต์ พร้อม Tahoma/sans-serif fallback ไม่ติดตั้งฟอนต์เพิ่ม
- Body 16px, line-height1.75; headings ใช้ `clamp()` และ line-height1.5 เพื่อรองรับภาษาไทย
- Input 16px และสูงขั้นต่ำ48px; ปุ่มปกติ48px ปุ่มเล็ก44px และ token ขนาดใหญ่52px
- Spacing scale: 4/8/12/16/20/24/32/40/48/64/72/80px ผ่าน `--space-*`
- Container สูงสุด1240px มี gutter ที่ปรับตามหน้าจอ
- Control radius10px, panel16px, card token18px, hero/องค์ประกอบขนาดใหญ่20px
- Shadows แบบเบา; motion160/220ms และปิด animation/transition เมื่อ reduced motion

## ใช้งาน primitives

```jsx
<button type="button" className="btn btn-primary">ค้นหาร้านอาหาร</button>
<button type="button" className="btn btn-secondary">ล้างตัวกรอง</button>
<button type="button" className="btn btn-primary" disabled>กำลังบันทึก</button>

<div className="panel p-6">
  <div className="field">
    <label htmlFor="example-name">ชื่อร้าน</label>
    <input id="example-name" className="input" />
  </div>
</div>
```

ใช้ native `disabled` และ `readOnly` สำหรับ behavior ของฟอร์ม ส่วน `aria-invalid="true"` ใช้กับ control ที่มีข้อความอธิบาย error ผ่าน label/`aria-describedby` ปุ่มลิงก์ที่มี `aria-disabled` ได้เฉพาะรูปลักษณ์จาก CSS; ผู้เรียกยังต้องจัดการการป้องกัน action และ keyboard ให้ถูกต้อง

Feedback ใช้ `.form-error`, `.notice`, `.notice.notice-warning`; loading/empty/error ที่ใช้ shared StateView จะได้รับ tokens ชุดเดียวกัน ใช้ข้อความและ semantics เดิมประกอบสีต่อไป

ตัวอย่าง Tailwind สำหรับองค์ประกอบใหม่:

```jsx
<div className="bg-primary/10 text-primary border border-primary/20 rounded-panel p-6">
  ข้อมูลเพิ่มเติม
</div>
```

มีชื่อสี `primary`, `primary-hover`, `canvas`, `surface`, `ink`, `muted`, `sand`, `herb`, `border`, `control-border`, `danger`, `success`, `warning`; radius `control/panel/card`, shadows `soft/raised`, max-width `content`

## ผลตรวจ

- `npm test -- --watchAll=false --runInBand`: 100 tests /16 suites ผ่าน
- `npm run build`: compiled successfully
- ตรวจไฟล์กับ baseline ก่อนเริ่มงาน: เปลี่ยนเฉพาะ styles กลาง, style imports, Tailwind mapping และการอ้าง tokens ใน Home; JSX, API/auth, tests, package.json และ lockfile เดิมไม่เปลี่ยน
- Chromium: Home, Login, Restaurants, Profile และฟอร์มเพิ่มร้าน Admin ที่375/768/1024/1440px รวม20กรณี ไม่มี horizontal overflow และไม่มี uncaught browser errors
- ตรวจ default/disabled/readonly/invalid+hover/focus, reduced motion, shared root token update และ Tailwind `bg-primary/20` ผ่าน
- คอนทราสต์ข้อความ: primary5.10:1, secondary14.38:1, danger6.41:1, success7.36:1, warning5.80:1; ขอบ control3.37:1
- Browser QA ใช้ fixtures เฉพาะ context เพื่อตรวจ styles และ role-protected forms ไม่ได้ส่ง live writes หรือแก้ข้อมูลบัญชี/ร้านจริง
- ไม่ใช่การรับรอง accessibility ของทุกหน้า; ยังไม่ได้ตรวจ Safari/Firefox หรือ redesign หน้าอื่น

หลักฐาน: [ผลตรวจ](qa/design-system/results.json), [ชุด primitives](qa/design-system/primitives-1440.jpg), [Home](qa/design-system/home-1440.jpg), [Login มือถือ](qa/design-system/login-375.jpg), [ฟอร์ม Admin มือถือ](qa/design-system/admin-form-375.jpg)

## ขอบเขตที่รอคำสั่งต่อไป

ไม่ได้แก้โครง Header/Footer/เมนู, RestaurantCard/Grid, Search/Detail, Account หรือ Admin หน้าเหล่านี้อาจเปลี่ยนสี ตัวอักษร ปุ่มและพื้นผิวที่อ้าง styles กลางอยู่แล้ว ส่วนสีที่ hard-code ด้วย `green-*` หรือ style เฉพาะหน้าคงไว้ให้ปรับใน phase ของหน้านั้น ไม่เปลี่ยน API, auth logic, environment หรือ dependencies และไม่ได้ deploy

เปิดดูด้วย `cd thaifood` แล้ว `npm start` ตามเดิม Preview port3100 ใช้ชั่วคราวเพื่อ QA เท่านั้น
