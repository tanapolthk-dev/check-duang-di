# เช็คดวงดิ๊ — Check Duang Di<sup>CDD</sup>

เว็บแอปเช็คดวงจากวันเกิดของแบรนด์ **Vanij** กรอกวันเกิดแล้วดูภาพรวม ความรัก การงาน การเงิน และกราฟจังหวะชีวิตรอบ 12 ปี ใช้ฟรี ไม่ต้องสมัคร ประมวลผลบนเบราว์เซอร์ของผู้ใช้ทั้งหมด

> **สถานะ: ต้นแบบ 0.1.0 เพื่อความบันเทิงและการสำรวจตนเอง** คำทำนายและกราฟมาจากแบบจำลองที่ทีมออกแบบเอง ไม่ใช่ตำราโหราศาสตร์ดั้งเดิม และไม่ใช่คำแนะนำทางการแพทย์ การเงิน หรือกฎหมาย

## ความสามารถ
- ฟอร์มวันเกิด (จำเป็น) เวลาเกิดและภูมิภาค (ไม่บังคับ ข้ามได้) พร้อม validation ภาษาไทย
- ผลลัพธ์: พื้นดวง (วันเกิดทางโหราศาสตร์ไทยปรับตามเวลาพระอาทิตย์ขึ้น, สีประจำวันเกิด, ปีนักษัตร, ราศีสากล) + 4 หมวดระดับ 1–5 + จังหวะชีวิต
- กราฟจังหวะชีวิต SVG อายุ 0–84 ปี พร้อมแถบความไม่แน่นอน แถบเลื่อนอายุ และตารางข้อมูล
- ป้ายที่มาทุกผล: ปฏิทิน / ความเชื่อ / จำลอง
- สถานะ Loading, Empty, Error, หน้าไม่พบ
- แชร์ข้อความที่ไม่มีข้อมูลเกิด (Web Share API หรือคัดลอก)
- ตัวเลือก "จำข้อมูลบนเครื่องนี้" (localStorage) ลบได้ทุกเมื่อ
- หน้าเปิดบนมือถือ: ปุ่มคัดลอกลิงก์ + QR code — **แสดงเฉพาะเมื่อมี URL เผยแพร่จริง**
- Responsive (มือถือ/แท็บเล็ต/เดสก์ท็อป), โหมดมืด, ใช้คีย์บอร์ดได้ครบ, รองรับโปรแกรมอ่านหน้าจอ
- ไม่มี backend, ฐานข้อมูล, คุกกี้, analytics หรือโฆษณา และตั้ง CSP `connect-src 'none'`

## เทคโนโลยีและเหตุผล
HTML + CSS + JavaScript (ES modules) **ไม่มีขั้นตอน build และไม่มี dependency ตอนรัน** — อ่านง่าย ดูแลต่อได้ deploy บน static hosting ได้ทันที ไม่มีแพ็กเกจให้ตามแพตช์ความปลอดภัย

## โครงสร้างไฟล์
```
check-duang-di/
├─ index.html                 หน้าเดียวของแอป (SPA, hash routing, CSP)
├─ assets/
│  ├─ css/styles.css          design system "ครามกับดาวเรือง"
│  ├─ fonts/                  IBM Plex Sans Thai (woff2) + OFL-LICENSE.txt
│  └─ img/                    favicon.svg, og-image.png
├─ src/
│  ├─ app.js                  router, state, event
│  ├─ config.js               publicUrl (ใส่หลัง deploy), version
│  ├─ engine/                 ฟังก์ชันบริสุทธิ์ ทดสอบได้ด้วย Node
│  │  ├─ calendar.js          วันในสัปดาห์, เวลาพระอาทิตย์ขึ้น, นักษัตร, ราศี
│  │  ├─ validate.js          ตรวจข้อมูลฟอร์ม
│  │  ├─ reading.js           สร้างผลลัพธ์และกราฟจำลอง
│  │  ├─ random.js            hash + ตัวสุ่มแบบกำหนดค่าได้
│  │  └─ content.js           คลังข้อความ
│  ├─ ui/                     views, chart, link(QR), storage, dom
│  └─ vendor/qrcode.mjs       qrcode-generator 2.0.4 (MIT)
├─ tests/
│  ├─ unit/engine.test.mjs    node:test
│  └─ e2e/run_e2e.py          Playwright + Chromium + OpenCV (ถอดรหัส QR)
├─ scripts/
│  ├─ check-secrets.mjs       สแกน secret/ข้อมูลส่วนบุคคลก่อน commit
│  └─ build-single-file.mjs   สร้าง dist/preview.html ไฟล์เดียว (สำหรับพรีวิว)
├─ docs/                      เอกสารทั้งหมด (ดูด้านล่าง)
├─ .github/workflows/pages.yml  ทดสอบ + deploy GitHub Pages
├─ .gitignore  .env.example  THIRD_PARTY_NOTICES.md  package.json
```

## ติดตั้งและรันในเครื่อง
ต้องมี Python 3 (สำหรับเว็บเซิร์ฟเวอร์ทดสอบ) และ Node.js 18+ (สำหรับ unit test)

```bash
git clone <repository-url> check-duang-di
cd check-duang-di
npm start                 # = python3 -m http.server 8080
# เปิด http://localhost:8080
```
ต้องเปิดผ่าน http server เพราะ ES modules โหลดจาก `file://` ไม่ได้ ไม่ต้อง `npm install`

## ทดสอบ
```bash
npm test                  # unit tests
npm run check:secrets     # สแกน secret
# e2e (ครั้งแรกติดตั้งก่อน):
pip install playwright opencv-python-headless numpy
python3 -m playwright install chromium
npm run test:e2e
```

## Build
แอปไม่ต้อง build ไฟล์ที่ใช้ deploy คือ `index.html`, `assets/`, `src/`
ถ้าต้องการไฟล์ HTML ไฟล์เดียวสำหรับพรีวิว: `npm run build:preview` → `dist/preview.html` (ไฟล์นี้ตัด CSP ออกเพราะสคริปต์ถูกฝังแบบ inline จึงไม่ใช่เวอร์ชันสำหรับ deploy)

## Deploy บน GitHub Pages (ขั้นตอนที่เจ้าของบัญชีต้องทำเอง)
1. ที่ https://github.com/tanapolthk-dev สร้าง repository ใหม่แบบ **Public** ชื่อแนะนำ `check-duang-di` (แผน GitHub Free ใช้ Pages ได้กับ repo สาธารณะ)
2. ในโฟลเดอร์โปรเจกต์ (มี git history ภายในเครื่องแล้ว):
   ```bash
   npm run check:secrets
   git remote add origin https://github.com/tanapolthk-dev/check-duang-di.git
   git push -u origin main
   ```
3. Repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**
4. ไปที่แท็บ **Actions** รอ workflow "Test and deploy to GitHub Pages" เป็นสีเขียว (ถ้าไม่เริ่มเอง กด Run workflow)
5. URL จะเป็น `https://tanapolthk-dev.github.io/check-duang-di/` — เปิดตรวจว่าเว็บทำงาน
6. หน้า "เปิดบนมือถือ" จะแสดงปุ่มคัดลอกลิงก์และ QR ให้อัตโนมัติบนโดเมน `*.github.io` ถ้าใช้โดเมนอื่นให้ใส่ URL ใน `src/config.js` → `publicUrl` แล้ว push ใหม่
7. `index.html` ตั้ง `og:url` และ `og:image` เป็น URL เต็มของ `https://tanapolthk-dev.github.io/check-duang-di/` ไว้แล้ว ถ้าเปลี่ยนชื่อ repo หรือโดเมน ต้องแก้สองค่านี้ด้วย
8. สแกน QR จากหน้าจอด้วยมือถือ iOS และ Android อย่างน้อยอย่างละ 1 เครื่อง และยืนยันว่าเปิดหน้าแรกได้ จึงค่อยใช้ QR ในสื่อ

เงื่อนไข GitHub Pages ที่ตรวจเมื่อ 8 ต.ค. 2569: เว็บที่เผยแพร่สูงสุด 1 GB, แบนด์วิดท์ soft limit 100 GB/เดือน, ไม่ได้มีไว้สำหรับไซต์เชิงพาณิชย์หรือ SaaS เป็นหลัก — เงื่อนไขอาจเปลี่ยน ตรวจที่ https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits ก่อนใช้งานจริง และตรวจซ้ำก่อนเริ่มมีสปอนเซอร์

### ทางเลือก: โฮสต์ static อื่น
ใช้ได้ทุกบริการที่เสิร์ฟไฟล์ static: อัปโหลด `index.html`, `assets/`, `src/` ไม่ต้องตั้งค่า rewrite เพราะใช้ hash routing ตรวจเงื่อนไขแผนฟรี ณ วันที่ใช้งาน แล้วใส่ URL ใน `publicUrl`

## ความเป็นส่วนตัวและข้อมูล (สรุป)
- ข้อมูลเกิดอยู่ในหน่วยความจำของแท็บ เก็บใน localStorage เฉพาะเมื่อผู้ใช้เลือก
- GitHub เก็บเฉพาะ source code และเอกสาร **ห้าม commit ข้อมูลผู้ใช้หรือ secret** — ตรวจด้วย `npm run check:secrets` ทุกครั้งก่อน commit
- แอปไม่ต้องใช้ API key ใด ๆ `.env.example` เป็นแม่แบบสำหรับอนาคตเท่านั้น
รายละเอียด: `docs/03-how-it-works-and-data.md`

## เอกสาร
| ไฟล์ | เนื้อหา |
|---|---|
| `docs/01-reference-study.md` | ผลศึกษาเว็บอ้างอิง (myhora.com, domor.app/life-graph) |
| `docs/02-product-and-design-system.md` | แนวคิดผลิตภัณฑ์ design system sitemap user flow |
| `docs/03-how-it-works-and-data.md` | หลักการทำงาน validation สูตรกราฟ แนวทางข้อมูล |
| `docs/04-whitepaper.md` | Whitepaper |
| `docs/05-test-plan-and-report.md` | แผนทดสอบและผลทดสอบจริง |
| `docs/06-content-plan-30-days.md` | แผนคอนเทนต์ 30 วันและแนวทางสปอนเซอร์ |

## ใบอนุญาต
- ฟอนต์ IBM Plex Sans Thai: SIL Open Font License 1.1
- qrcode-generator: MIT
- โค้ดของโปรเจกต์: **ยังไม่ได้กำหนดใบอนุญาต** — เจ้าของแบรนด์ Vanij ควรเลือกก่อนเผยแพร่ repository สาธารณะ (ถ้าไม่ใส่ LICENSE ผู้อื่นจะไม่มีสิทธิ์นำโค้ดไปใช้ซ้ำโดยปริยาย)

ดู `THIRD_PARTY_NOTICES.md`
