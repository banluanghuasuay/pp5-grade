# ระบบ ปพ.5 (PP.5 School Grading System)

> ระบบบันทึกผลการเรียนสำหรับโรงเรียนเล็ก (<300 นักเรียน) ตามมาตรฐาน สพฐ. หลักสูตรแกนกลาง 2551

## 📋 สำหรับ Claude Code

**กรุณาอ่านไฟล์เหล่านี้ก่อนเริ่มงาน:**

1. **`pp5-system-design.md`** — ภาพรวมระบบ, business rules, wireframes (17 หน้า), ฟีเจอร์ทั้งหมด
2. **`schema.sql`** — Database schema (PostgreSQL/Supabase) 24 ตาราง + seed data
3. **`rls_policies.sql`** — Row-Level Security policies + helper functions

## 🎯 Tech Stack ที่ตัดสินใจแล้ว

```
Frontend:   Next.js 15 (App Router) × 2 apps
UI:         TailwindCSS + shadcn/ui
DB+Auth:    Supabase (PostgreSQL + Row-Level Security)
PDF:        Puppeteer (HTML → PDF, ฟอนต์ไทยดีกว่า React-PDF)
Excel:      SheetJS (xlsx)
Deploy:     Vercel × 2 projects + Supabase
Monorepo:   pnpm workspaces
Font:       Sarabun New (สำหรับ ปพ.5 PDF - มาตรฐานราชการ)
```

## 🏗️ Architecture

```
parent.school.com           admin.school.com
─────────────────           ─────────────────
Portal ผู้ปกครอง            หลังบ้าน (Admin + ครู)
(read-only)                 (responsive - ครูใช้บนมือถือได้)
Mobile-first                Desktop-first + Mobile responsive

         │                            │
         └──────────┬─────────────────┘
                    ↓
           ┌────────────────┐
           │   Supabase     │
           │ (1 project)    │
           └────────────────┘
```

## 📂 โครงสร้าง Codebase (Monorepo)

```
pp5-system/
├── apps/
│   ├── admin/                    # admin.school.com (Next.js)
│   │   ├── app/
│   │   │   ├── (auth)/login
│   │   │   ├── (admin)/dashboard
│   │   │   ├── (admin)/setup/*   # ตั้งค่าระบบ
│   │   │   ├── (teacher)/grades  # บันทึกคะแนน
│   │   │   └── (teacher)/attendance
│   │   └── package.json
│   │
│   └── parent/                   # parent.school.com (Next.js)
│       ├── app/
│       │   ├── login
│       │   └── dashboard
│       └── package.json
│
├── packages/
│   ├── database/                 # Supabase types + queries
│   │   ├── schema.sql
│   │   ├── rls_policies.sql
│   │   └── types.ts              # auto-generated
│   ├── ui/                       # Shared components
│   └── lib/                      # Utility (grading, pdf, ฯลฯ)
│
└── package.json (workspace root)
```

## 🔑 Decisions ที่ตัดสินใจแล้ว

### Auth
- **Admin + ครู** → username + password (Supabase Auth)
- **ผู้ปกครอง** → 1 นักเรียน = 1 account · login ด้วย `student_code` + password · ครอบครัวใช้ร่วมกัน

### Domain Rules
- **2 ระบบแยก** — ประถม (ป.1-ป.6) + มัธยม (ม.1-ม.6)
- **3 ประเภทวิชา** — พื้นฐาน, เพิ่มเติม, กิจกรรม (กิจกรรม = ผ่าน/ไม่ผ่าน)
- **เกรด** — มัธยม=รายภาค, ประถม=รายปี
- **ครูประจำชั้น** — 1-2 คน/ห้อง (หลัก + รอง)
- **ปพ.5 PDF** — 2 รูปแบบ (รายวิชา + รวมห้อง)

### UX
- **Smart room naming** — 1 ห้อง = "ป.3" / หลายห้อง = "ป.3/1, ป.3/2"
- **ไม่ล็อกคะแนน** — แค่ highlight สีแดงเมื่อเกิน max
- **CASCADE ON DELETE** — UI ต้องเตือนก่อนลบ
- **ไม่ track ประวัตินักเรียน** — ระบบทะเบียนแยก

## 🚀 ขั้นตอนเริ่มต้น (Suggested)

### Phase 0: Setup
```bash
# 1. สร้าง Supabase project
#    → https://supabase.com/dashboard
#    → New project (Free tier)
#    → Region: Singapore (ใกล้ไทยที่สุด)

# 2. Run SQL
#    → SQL Editor ใน Supabase
#    → Copy-paste schema.sql → Run
#    → Copy-paste rls_policies.sql → Run

# 3. สร้าง Next.js Monorepo
mkdir pp5-system && cd pp5-system
pnpm init
# ... (Claude Code จะช่วย setup ต่อ)

# 4. Generate TypeScript types
npx supabase gen types typescript --project-id YOUR_ID > packages/database/types.ts
```

### Phase 1: หน้าพื้นฐาน
1. Login + Auth setup
2. Dashboard (Admin + ครู แยก layout)
3. ตั้งค่าปีการศึกษา
4. ตั้งค่าชั้นเรียน (toggle + counter)
5. จัดการครู
6. จัดการนักเรียน

### Phase 2: ฟีเจอร์หลัก
1. แผนการเรียน
2. จัดครูเข้าสอน
3. ตั้งโครงสร้างคะแนน
4. บันทึกคะแนน (มัธยม + ประถม)
5. บันทึกเวลาเรียน (รายวัน + workday toggle)

### Phase 3: ส่วนสำคัญ
1. ครูประจำชั้น
2. ประเมินคุณลักษณะ (8 ข้อ + อ่านคิดเขียน + สมรรถนะ)
3. ปพ.5 PDF (Puppeteer + Sarabun New)
4. Portal ผู้ปกครอง

## 📝 ทำงานกับ Claude Code อย่างไรให้ดี

### ที่ควรทำ
- ✅ บอก Claude Code อ่านไฟล์ทั้ง 3 ก่อนเริ่ม
- ✅ ให้ทำทีละหน้า/feature เล็กๆ ทดสอบทันที
- ✅ Commit เป็นระยะ (Git)
- ✅ ใช้ TypeScript types ที่ generate มาแล้ว — ไม่เขียนเอง
- ✅ ทดสอบ RLS policies ด้วยการ login เป็น role ต่างๆ

### ที่ควรเลี่ยง
- ❌ ทำหลาย features พร้อมกัน
- ❌ ข้าม Phase
- ❌ ลืม run RLS policies (ข้อมูลรั่ว!)
- ❌ Hardcode role/permission ในโค้ด (RLS จัดการให้)

## 🔐 Security Checklist (สำคัญ!)

ก่อน deploy production:
- [ ] Run `rls_policies.sql` แล้วแน่ใจว่า RLS enable ทุกตาราง
- [ ] Test login แต่ละ role (admin, ครู, นักเรียน) ดูข้อมูลถูก scope
- [ ] เปลี่ยน password ของ admin คนแรก
- [ ] ตั้ง CORS allowed domains ใน Supabase
- [ ] Backup ข้อมูล (Supabase free tier ไม่มี auto backup)

## 📚 Resources

- Supabase Docs: https://supabase.com/docs
- Next.js 15 App Router: https://nextjs.org/docs/app
- shadcn/ui: https://ui.shadcn.com
- TailwindCSS: https://tailwindcss.com
- Puppeteer: https://pptr.dev

## ✅ Status

```
✅ Wireframes 17 หน้า          (in pp5-system-design.md)
✅ Database Schema (24 tables) (in schema.sql)
✅ RLS Policies (77 policies)  (in rls_policies.sql)
⬜ Setup Supabase Project
⬜ Setup Next.js Monorepo
⬜ Phase 1: หน้าพื้นฐาน
⬜ Phase 2: ฟีเจอร์หลัก
⬜ Phase 3: ส่วนสำคัญ
⬜ Deploy
```
