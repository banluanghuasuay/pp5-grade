# คู่มือติดตั้งระบบ EasyGrade สำหรับโรงเรียน

> คู่มือนี้สำหรับโรงเรียนที่ต้องการติดตั้งระบบ EasyGrade ของตัวเอง
> ไม่จำเป็นต้องมีความรู้ด้านโปรแกรมมิ่ง — ทำตามขั้นตอนได้เลย

---

## สิ่งที่ต้องเตรียม

- 📧 อีเมลสำหรับสมัครบริการ (แนะนำให้ใช้อีเมลโรงเรียน)
- 💻 คอมพิวเตอร์ที่มีเบราว์เซอร์ Chrome หรือ Edge
- ⏱️ เวลาประมาณ 30-45 นาที

---

## ภาพรวมขั้นตอน

```
1. สมัคร Supabase  →  2. ตั้งค่าฐานข้อมูล  →  3. สร้างบัญชีแอดมิน
        ↓
4. สมัคร Vercel   →  5. Deploy ระบบ  →  6. ตั้งค่าโรงเรียน
```

---

## ขั้นตอนที่ 1 — สมัคร Supabase (ฐานข้อมูล)

Supabase คือที่เก็บข้อมูลทั้งหมดของระบบ (ข้อมูลครู นักเรียน คะแนน ฯลฯ)

### 1.1 สมัครบัญชี

1. เปิด [https://supabase.com](https://supabase.com)
2. คลิกปุ่ม **"Start your project"** หรือ **"Sign Up"**
3. เลือก **"Continue with GitHub"** หรือกรอกอีเมล + รหัสผ่าน
4. ยืนยันอีเมล (เช็คกล่องจดหมาย)

### 1.2 สร้าง Project ใหม่

1. หลัง login คลิก **"New project"**
2. กรอกข้อมูล:
   - **Organization**: (ใช้ default ที่มีอยู่)
   - **Project name**: ชื่อโรงเรียน เช่น `easygrade-bangkokschool`
   - **Database Password**: ตั้งรหัสผ่านที่แข็งแรง — **จดเก็บไว้ด้วย!**
   - **Region**: เลือก **`Southeast Asia (Singapore)`**  ← สำคัญมาก
3. คลิก **"Create new project"**
4. รอประมาณ 1-2 นาที จนสถานะเปลี่ยนเป็น **"Project is ready"**

### 1.3 เก็บค่าสำคัญ (จำเป็นต้องใช้ในขั้นตอนถัดไป)

ไปที่ **Settings → API** แล้วจดหรือก๊อปค่าเหล่านี้:

| ชื่อ | อยู่ที่ไหน | ตัวอย่างหน้าตา |
|------|-----------|----------------|
| **Project URL** | Project URL | `https://xxxxxxxxxxxx.supabase.co` |
| **anon public key** | Project API keys → anon | `eyJhbGciOi...` (ยาวมาก) |
| **service_role key** | Project API keys → service_role | `eyJhbGciOi...` (ยาวมาก) |

> ⚠️ **service_role key เป็นความลับ** — ห้ามแชร์กับใคร เก็บใว้เฉพาะตัวเอง

---

## ขั้นตอนที่ 2 — ตั้งค่าฐานข้อมูล

### 2.1 รัน setup.sql

1. ใน Supabase Dashboard ไปที่เมนู **"SQL Editor"** (ไอคอนรูป `</>`  ด้านซ้าย)
2. คลิก **"New query"**
3. เปิดไฟล์ `setup.sql` จาก repo นี้
   - ไปที่ [https://github.com/WebAppSchool-By-Chanon/pp5-grade](https://github.com/WebAppSchool-By-Chanon/pp5-grade)
   - คลิกไฟล์ `setup.sql`
   - คลิกปุ่ม **"Raw"** (มุมขวาบน)
   - กด `Ctrl+A` เพื่อเลือกทั้งหมด → `Ctrl+C` เพื่อก๊อป
4. วางในช่อง SQL Editor (`Ctrl+V`)
5. คลิก **"Run"** (ปุ่มสีเขียว) หรือกด `Ctrl+Enter`
6. รอจนเห็นข้อความ **"Success"** ด้านล่าง

> หากมี error ให้ลองรันซ้ำอีกครั้ง (setup.sql รันซ้ำได้ปลอดภัย)

### 2.2 สร้าง Storage Bucket (สำหรับโลโก้โรงเรียน)

1. เมนูซ้าย คลิก **"Storage"** (ไอคอนรูปถังน้ำ)
2. คลิก **"New bucket"**
3. ตั้งชื่อ: **`school-logos`** (ตัวพิมพ์เล็กทั้งหมด มีขีดกลาง)
4. ติ๊ก **"Public bucket"** ✅  ← สำคัญมาก ถ้าไม่ติ๊กโลโก้จะไม่แสดงในรายงาน
5. คลิก **"Save"**

---

## ขั้นตอนที่ 3 — สร้างบัญชีผู้ดูแลระบบคนแรก

ระบบนี้ใช้อีเมลพิเศษ ไม่ใช่อีเมลจริง ดังนั้นต้องสร้างบัญชีผ่าน Supabase

### 3.1 สร้างบัญชีใน Supabase Authentication

1. ไปที่เมนู **"Authentication"** ด้านซ้าย
2. คลิก **"Users"**
3. คลิกปุ่ม **"Add user"** → เลือก **"Create new user"**
4. กรอกข้อมูล:
   - **Email**: `admin@admin.pp5.local`  ← พิมพ์ตรงนี้เป๊ะๆ
   - **Password**: ตั้งรหัสผ่านที่ต้องการ เช่น `School@2024` — **จดเก็บไว้**
   - ✅ ติ๊ก **"Auto Confirm User"**
5. คลิก **"Create user"**
6. **จด UUID** ที่ปรากฏ (รูปแบบ `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### 3.2 เชื่อมบัญชีกับระบบ

1. กลับไปที่ **"SQL Editor"** → **"New query"**
2. พิมพ์คำสั่งนี้ โดยแทนที่ส่วนที่เป็นตัวหนาด้วยข้อมูลจริง:

```sql
INSERT INTO public.users (auth_user_id, username, full_name, role, is_active)
VALUES (
  'ใส่ UUID ที่จดไว้',
  'admin',
  'ผู้ดูแลระบบ',
  'admin',
  TRUE
);
```

ตัวอย่าง:
```sql
INSERT INTO public.users (auth_user_id, username, full_name, role, is_active)
VALUES (
  'd9405faa-813a-4d89-90d1-ac61f5dc45ed',
  'admin',
  'ผู้ดูแลระบบ',
  'admin',
  TRUE
);
```

3. คลิก **"Run"** → เห็น **"Success"**

---

## ขั้นตอนที่ 4 — สมัคร Vercel (ที่ Host เว็บ)

Vercel คือบริการที่จะทำให้ระบบเข้าถึงได้ผ่านอินเทอร์เน็ต

1. เปิด [https://vercel.com](https://vercel.com)
2. คลิก **"Sign Up"**
3. เลือก **"Continue with Email"** แล้วกรอกอีเมล
   (หรือ **"Continue with GitHub"** ถ้ามีบัญชีอยู่แล้ว)
4. ยืนยันอีเมล
5. เมื่อถามเรื่อง plan เลือก **"Hobby"** (ฟรี) → Continue

---

## ขั้นตอนที่ 5 — Deploy ระบบแอดมิน

### 5.1 Import โปรเจ็ค

1. ใน Vercel Dashboard คลิก **"Add New..."** → **"Project"**
2. เลือก **"Import Git Repository"**
3. คลิก **"Import Third-Party Git Repository"** (ถ้าไม่ได้เชื่อม GitHub)
4. พิมพ์ URL: `https://github.com/WebAppSchool-By-Chanon/pp5-grade`
5. คลิก **"Continue"**

### 5.2 ตั้งค่า Project (สำคัญ)

ก่อนกด Deploy ต้องตั้งค่าดังนี้:

**Root Directory:**
- คลิก **"Edit"** ข้าง Root Directory
- พิมพ์ `apps/admin`
- คลิก **"Continue"**

**Environment Variables:**
คลิก **"Environment Variables"** แล้วเพิ่มทีละตัว:

| Variable Name | Value |
|---------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL จากขั้นตอนที่ 1.3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key จากขั้นตอนที่ 1.3 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key จากขั้นตอนที่ 1.3 |
| `NEXT_PUBLIC_SUPABASE_AUTH_STORAGE_KEY` | `sb-pp5-admin` |

วิธีเพิ่มแต่ละตัว: กรอกชื่อใน **"Key"** → กรอกค่าใน **"Value"** → คลิก **"Add"**

### 5.3 Deploy

คลิก **"Deploy"** แล้วรอประมาณ 2-3 นาที

เมื่อเห็น **"Congratulations!"** หรือ **"Your project has been deployed"** แสดงว่าสำเร็จ

### 5.4 ตั้งค่า Region (ให้ระบบเร็วขึ้น)

1. ใน Vercel → คลิก Project ที่เพิ่ง deploy
2. ไปที่ **Settings → Functions**
3. เปลี่ยน **"Function Region"** เป็น **`Singapore (sin1)`**
4. คลิก **"Save"**
5. ไปที่ **Deployments** → คลิก deployment ล่าสุด → คลิก **"Redeploy"** → ยืนยัน

---

## ขั้นตอนที่ 6 — ทดสอบเข้าระบบ

1. คลิก URL ที่ Vercel แสดง (รูปแบบ `https://your-project.vercel.app`)
2. หน้า Login จะปรากฏ
3. กรอก:
   - **ชื่อผู้ใช้**: `admin`
   - **รหัสผ่าน**: รหัสที่ตั้งในขั้นตอนที่ 3.1
4. คลิก **"เข้าสู่ระบบ"**

✅ เข้าระบบได้ = ติดตั้งสำเร็จ!

---

## ขั้นตอนที่ 7 — ตั้งค่าโรงเรียนครั้งแรก

หลังเข้าระบบครั้งแรก ให้ตั้งค่าตามลำดับนี้:

### 7.1 ข้อมูลโรงเรียน
เมนู **"ข้อมูลโรงเรียน"** → กรอกชื่อโรงเรียน, อำเภอ, จังหวัด, สังกัด → บันทึก

### 7.2 ปีการศึกษา
เมนู **"ปีการศึกษา"** → คลิก **"เพิ่มปีการศึกษา"** → กรอกข้อมูล → บันทึก

### 7.3 ชั้นเรียน
เมนู **"ชั้นเรียน"** → เพิ่มห้องเรียนทั้งหมดของโรงเรียน

### 7.4 ข้อมูลครู
เมนู **"ข้อมูลครู"** → เพิ่มครูทีละคน (ชื่อ + รหัสผ่านสำหรับ login)

### 7.5 ข้อมูลนักเรียน
เมนู **"ข้อมูลนักเรียน"** → เพิ่มด้วยมือ หรือนำเข้าจาก Excel

---

## (เพิ่มเติม) ย้ายรายวิชาจากโรงเรียนต้นแบบ

ถ้าต้องการใช้รายวิชาเดิมโดยไม่ต้องกรอกใหม่ทั้งหมด:

> ⚠️ **ทำหลังจาก** สร้าง "ปีการศึกษา 2569" ในระบบใหม่แล้ว
> (เมนู ตั้งค่า → ปีการศึกษา) — ไม่งั้นจะไม่มีรายวิชาถูกเพิ่ม

### ขั้นตอนที่ 1 — Export จาก Supabase เดิม

1. เปิด Supabase เดิม → **SQL Editor** → **New query**
2. เปิดไฟล์ `docs/export-subjects.sql` จาก repo นี้ → ก๊อปทั้งหมด → วาง → **Run**
3. จะได้ผลลัพธ์ 1 ช่อง ชื่อ `migration_sql`
4. **คลิกที่ช่องนั้น** → ก๊อปข้อความทั้งหมด (อาจยาวมาก)

### ขั้นตอนที่ 2 — Import ใน Supabase ใหม่

1. เปิด Supabase ใหม่ → **SQL Editor** → **New query**
2. วางข้อความที่ก๊อปมา → **Run**
3. เห็น "Success" = รายวิชาและแผนการเรียนถูกนำเข้าครบแล้ว

> Script นี้ copy เฉพาะ **วิชาพื้นฐาน + กิจกรรม** ทุกชั้น ปีการศึกษา 2569
> รันซ้ำได้ปลอดภัย — ถ้ามีวิชาซ้ำจะข้ามไปโดยอัตโนมัติ

---

## ปัญหาที่พบบ่อย

### เข้าระบบไม่ได้
- ตรวจสอบว่า Environment Variables ถูกต้องทุกตัว
- ตรวจสอบว่าทำขั้นตอน 3.2 (SQL INSERT) สำเร็จแล้ว

### ระบบขึ้น error หลัง deploy
- ไปที่ Vercel → Project → **"Functions"** tab → ดู error log
- มักเกิดจาก Environment Variables พิมพ์ผิด

### ระบบโหลดช้า
- ตรวจสอบว่าตั้ง Region เป็น Singapore แล้ว (ขั้นตอน 5.4)

---

## (เพิ่มเติม) Deploy แอปผู้ปกครอง

ถ้าต้องการให้ผู้ปกครองดูผลการเรียนของบุตรหลานได้ ทำซ้ำขั้นตอนที่ 5 โดยเปลี่ยน:

- **Root Directory**: `apps/parent` (แทน `apps/admin`)
- Environment Variables เหมือนกันทุกอย่าง **ยกเว้น**:
  - `NEXT_PUBLIC_SUPABASE_AUTH_STORAGE_KEY` = `sb-pp5-parent` (แทน `sb-pp5-admin`)
  - **ไม่ต้องใส่** `SUPABASE_SERVICE_ROLE_KEY`

---

## ต้องการความช่วยเหลือ

ติดต่อผู้พัฒนาระบบได้ที่ [topchanon@gmail.com](mailto:topchanon@gmail.com)
