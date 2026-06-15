# คู่มือตั้งค่า Firebase (ออนไลน์ + ซิงค์หลายอุปกรณ์) — 101

> เปิดให้แอป **ซิงค์งาน + ลูกค้าข้ามอุปกรณ์** ด้วยบัญชีร้านเดียว
> ⚠️ ถ้า **ไม่** ทำขั้นตอนนี้ แอปยังใช้ได้ปกติแบบ **local-only** (เก็บในเครื่องเดียว ไม่ซิงค์)

---

## ภาพรวม (ทำครั้งเดียว ~15 นาที)

1. สร้าง Firebase project + Web app → ได้ค่า config
2. เปิด Authentication (Email/Password) + สร้างบัญชีร้าน 1 บัญชี
3. สร้าง Firestore Database
4. **Deploy กฎความปลอดภัย** (`firestore.rules`) ← สำคัญที่สุด
5. ใส่ค่า config เป็น Environment Variables (Vercel + `.env` สำหรับ dev)
6. ทดสอบซิงค์ข้ามเครื่อง

---

## 1) สร้าง Firebase project + Web app

1. ไปที่ <https://console.firebase.google.com> → **Add project** → ตั้งชื่อ (เช่น `marnthara`) → สร้าง (ปิด Google Analytics ได้)
2. ในหน้า project กด **ไอคอน `</>`  (Web)** → ตั้งชื่อ app → **Register app**
3. จะเห็นบล็อก `firebaseConfig = { apiKey: "…", authDomain: "…", … }` → **ก๊อปค่าทั้งหมดไว้** (ใช้ขั้นตอน 5)

## 2) Authentication — เปิด Email/Password + สร้างบัญชีร้าน

1. เมนูซ้าย **Build › Authentication › Get started**
2. แท็บ **Sign-in method** → เปิด **Email/Password** → Save
3. แท็บ **Users › Add user** → กรอกอีเมล + รหัสผ่านของร้าน → Add
   - นี่คือบัญชีที่ใช้ล็อกอินในแอปทุกเครื่อง (ไม่ต้องเปิดปุ่ม "สร้างบัญชี" ในแอป — ปลอดภัยกว่า)

## 3) Firestore Database

1. เมนูซ้าย **Build › Firestore Database › Create database**
2. เลือก **Production mode** (อย่าเลือก Test mode — เปิดให้ใครก็เข้าถึง)
3. เลือก location ใกล้ไทย เช่น `asia-southeast1` → Enable

## 4) Deploy กฎความปลอดภัย ⚠️ สำคัญที่สุด

กฎอยู่ในไฟล์ [`firestore.rules`](../firestore.rules) ของโปรเจกต์ — มันจำกัดให้ **เจ้าของบัญชีเข้าถึงเฉพาะข้อมูลร้านตัวเอง** (คนอื่นอ่าน/เขียนไม่ได้)

**วิธีง่ายสุด (ผ่าน Console):**
1. **Firestore Database › แท็บ Rules**
2. ลบของเดิม วางเนื้อหาจาก `firestore.rules` ทั้งหมด → **Publish**

**หรือผ่าน CLI** (ถ้าติดตั้ง Firebase CLI):
```bash
npm i -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules
```

> ❗ ถ้าข้ามขั้นนี้ หรือปล่อย Test mode ไว้ = **ข้อมูลลูกค้าอาจถูกเข้าถึงจากภายนอก**

## 5) ใส่ค่า config (Environment Variables)

ใช้ค่าจากขั้นตอน 1 เติมตามชื่อนี้ (ดูตัวอย่างใน [`.env.example`](../.env.example)):

| ตัวแปร | มาจาก firebaseConfig |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_ALLOW_SIGNUP` | `false` (แนะนำ — กันคนนอกสมัคร) |

**Production (Vercel):** Project → **Settings › Environment Variables** → เพิ่มทุกตัว → **Redeploy**
**Dev (เครื่องตัวเอง):** ก๊อป `.env.example` เป็น `.env` แล้วเติมค่า → `npm run dev`

> หมายเหตุ: `apiKey` ของ Firebase **ไม่ใช่ความลับ** (ฝังในเว็บได้ตามปกติ) — ความปลอดภัยมาจากกฎ Firestore (ขั้นตอน 4) + บัญชี ไม่ใช่การซ่อน key

## 6) ทดสอบ

1. เปิดแอป → เมนู → แถว "เข้าสู่ระบบ" → ใส่อีเมล/รหัสที่สร้างไว้
2. แถบบัญชีจะขึ้นไอคอน ☁️ + อีเมล = ซิงค์ทำงาน
3. เปิดแอปอีกเครื่อง (หรืออีกหน้าต่าง) ล็อกอินบัญชีเดียวกัน → สร้าง/แก้งานเครื่องนึง → อีกเครื่องเห็นเองภายในไม่กี่วินาที
4. ลองตัดเน็ต → แก้งานต่อได้ → ต่อเน็ต → ซิงค์ขึ้นเอง

---

## ลิมิต & ค่าใช้จ่าย (Free tier — Spark)

- เก็บข้อมูล **1 GB** · อ่าน **50,000/วัน** · เขียน **20,000/วัน**
- ร้านเดียว (ลูกค้าหลักพัน + งานหลักร้อย-พัน) ใช้ไม่ถึงเศษเสี้ยว — ฟรีเพียงพอ
- ถ้าโตมากค่อยอัป Blaze (จ่ายตามใช้จริง)

## ✅ เช็คลิสต์ความปลอดภัย

- [ ] Deploy `firestore.rules` แล้ว (ไม่ใช่ Test mode)
- [ ] สร้างบัญชีร้านผ่าน Console แล้ว
- [ ] `VITE_ALLOW_SIGNUP=false` (ปิดสมัครในแอป)
- [ ] รหัสผ่านบัญชีร้านเดายาก (ใช้หลายเครื่อง = จุดเดียวพลาดทั้งระบบ)
- [ ] (ถ้าจำเป็น) เปิด backup ไฟล์เป็นระยะ เป็นสำเนาที่ 2
