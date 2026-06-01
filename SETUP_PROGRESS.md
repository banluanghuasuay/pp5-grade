# 📋 Setup Progress — ระบบ ปพ.5

> สถานะการ setup โปรเจกต์ · อัปเดต **2026-05-17 (Phase 3 reports — ปพ.5 รายวิชา cover + split layout + subject-attendance print)**
> ✅ Phase 0 · ✅ Phase 1 ครบ · ✅ B Design Polish · ✅ Phase 2.1.A-C Subjects+Plans · ✅ Phase 2.2 จัดครู · ✅ Phase 2.3 บันทึกคะแนน · ✅ Phase 2.4 สรุปผล/ตัดเกรด · ✅ Phase 2.5 บันทึกเวลาเรียน · ✅ ตั้งค่าวันหยุด · ✅ Phase 2.6 Current Term Lock · ✅ Phase 2.7 ประเมินตามหลักสูตร · ✅ Phase 4A-B Secondary Score Grid · ✅ Subjects per-(year, semester) + clone-from-prev · ✅ Excel import auto-semester + re-enroll · ✅ Attendance term-lock policy · ✅ Subject-attendance "รายวิชา" page · ✅ Cell dropdown UX + status "ข" · ✅ Plan-based subject fetch + nullable teacher · ✅ **Phase 3A: ปพ.5 รายวิชา (cover + split-preview + section toggles)** · ✅ **Print: subject-attendance (2-page weekly grid)** · 🎯 ถัดไป: Phase 3B (ปพ.5 รวมชั้น) หรือ Phase 4 polish
>
> **⚠️ Migrations ที่ต้องรันที่ Dashboard:** `20260517e_offerings_nullable_teacher.sql` + `20260517f_schools_district_province.sql` (ค้าง 2 ตัว · 4 ตัวก่อนหน้า apply แล้ว)

---

## ✅ ทำไปแล้ว (Step 1-4)

### Step 1: Supabase Project ✅
- ✅ สร้าง project ชื่อ `grade` ใน Supabase (Free tier, region: Singapore)
- ✅ รัน [schema.sql](schema.sql) → 24 ตาราง + seed data
- ✅ รัน [rls_policies.sql](rls_policies.sql) → 77 RLS policies + helper functions
- ✅ Security options: Enable Data API + Automatically expose new tables + Enable automatic RLS (ติ๊กครบ)

### Step 2: pnpm + Monorepo ✅
- ✅ ติดตั้ง pnpm 11.1.0 (ผ่าน `npm install -g pnpm` — corepack ติด permission Program Files)
- ✅ สร้างไฟล์ root: [package.json](package.json), [pnpm-workspace.yaml](pnpm-workspace.yaml), [.gitignore](.gitignore), [.npmrc](.npmrc)
- ✅ ติดตั้ง supabase CLI v1.226.4 + TypeScript 5.9.3

### Step 3: Next.js Apps ✅
- ✅ สร้าง `apps/admin` (@pp5/admin, port 3000)
- ✅ สร้าง `apps/parent` (@pp5/parent, port 3001)
- ✅ Stack: Next.js 16.2.6 · React 19.2.4 · TailwindCSS 4 · TypeScript 5 · Turbopack
- ✅ ลบ `pnpm-workspace.yaml` ที่ Next.js สร้างซ้อนใน apps/* (รวมไว้ root)
- ✅ Build ทั้ง 2 apps ผ่าน

### Step 4: Supabase Client + Auth ✅
- ✅ สร้าง `packages/database/` (@pp5/database)
- ✅ ติดตั้ง `@supabase/ssr@0.5.2` + `@supabase/supabase-js@2.105.4`
- ✅ Helpers: `client.ts` (browser), `server.ts` (server, async cookies), `middleware.ts` (session refresh)
- ✅ สร้าง `proxy.ts` ใน apps (⚠️ Next.js 16 เปลี่ยน `middleware.ts` → `proxy.ts`)
- ✅ `.env.local` ใน apps/admin + apps/parent
- ✅ `transpilePackages: ['@pp5/database']` ใน next.config.ts ของทั้ง 2 apps
- ✅ **ทดสอบ runtime สำเร็จ**: หน้า admin ดึง `grade_levels` 12 รายการจาก Supabase แสดงผลถูก

---

### Step 5: Generate TypeScript Types ✅
- ✅ `supabase login` ผ่าน browser (token เก็บใน `%USERPROFILE%\AppData\Roaming\supabase\`)
- ✅ รัน `pnpm db:types` → generate 1486 บรรทัด / 45KB ที่ `packages/database/src/types.ts`
- ✅ ครอบคลุม 24 tables (academic_years → workdays) + 10 enums (school_system, attendance_status, ฯลฯ) + Constants
- ✅ Upgrade `@supabase/ssr` 0.5.2 → 0.10.3 (เพื่อรองรับ `__InternalSupabase.PostgrestVersion` ของ supabase-js 2.105.4)
- ✅ ลบ `.overrideTypes<GradeLevel[]>()` ออกจาก test page → ใช้ type inference ตรงๆ จาก `.from("grade_levels")`
- ✅ Build admin ผ่าน + runtime test ผ่าน (หน้าแสดง 12 ระดับชั้นถูกต้อง)

---

## ✅ Phase 1: Login + Auth — เสร็จสมบูรณ์

- ✅ **1.1** ตัดสินใจ design — fake email pattern Option A · admin app ก่อน
- ✅ **1.2** Seed admin user คนแรก (auth.users + public.users)
- ✅ **1.3** หน้า `/login` (Server Action + useActionState)
- ✅ **1.4** Route protection ใน `updateSession()` (publicPaths/loginPath/homePath)
- ✅ **1.5** Logout button + user header
- ✅ **1.6** Replicate กับ apps/parent (login ด้วย `student_code`) + **cookie separation** ระหว่าง apps

## ✅ Phase 1.7: ตั้งค่าปีการศึกษา — เสร็จสมบูรณ์

CRUD ครบ — list / create / edit / delete / set-current toggle · admin-only

```
apps/admin/app/(admin)/setup/academic-years/
├── page.tsx                  ← list + ?error banner + ปุ่มลบ/แก้
├── year-form.tsx             ← shared form (create + edit) · useActionState
├── actions.ts                ← create / update / setCurrent / delete
├── set-current-button.tsx    ← Client (useFormStatus)
├── delete-form.tsx           ← Client (confirm + useFormStatus)
├── new/page.tsx              ← create
└── [id]/page.tsx             ← edit (Next.js 16 async params)
```

**Patterns ที่ใช้ (จะ reuse ใน Phase 1.8+):**
- Server Action + `useActionState` สำหรับ form ที่มี state (error/fieldErrors)
- Server Action + `useFormStatus` สำหรับ inline toggle/delete
- Browser `confirm()` ก่อน destructive action
- `?error=` query param สำหรับ flash error message
- `revalidatePath` หลัง mutation
- Defensive admin check ใน action (RLS = ด่านแรก, action = ด่านสอง)
- FK violation → friendly redirect แทน error page
- Auto-unset current ก่อน insert/update เมื่อ is_current=true (DB มี partial unique index)

## ✅ Phase 1.8: ตั้งค่าชั้นเรียน — เสร็จ (skip 1.8.3 status toggle)

```
apps/admin/app/(admin)/setup/classrooms/
├── page.tsx              ← list ระดับชั้น 12 row + smart naming
├── actions.ts            ← addClassroom / removeLastClassroom
└── room-counter.tsx      ← Client (+/- buttons · confirm + cascade warning)
```

- Counter pattern: [+] / [−] ทีละห้อง · [−] ลบห้องสุดท้าย (max room_number)
- ใช้ปีปัจจุบัน (is_current = TRUE) อัตโนมัติ · ถ้าไม่มีปัจจุบัน → warning + link
- Sub-nav ใน setup layout: ปีการศึกษา · ชั้นเรียน · ครู

## ✅ Phase 1.9: จัดการครู — เสร็จ (6/6)

```
apps/admin/app/(admin)/setup/teachers/
├── page.tsx                    ← list + toggle button + gray inactive rows
├── actions.ts                  ← create / update / toggleActive / resetPassword
├── teacher-form.tsx            ← shared form (4 sections, dropdown 9 กลุ่มสาระ)
├── toggle-active-form.tsx      ← Client soft-delete toggle
├── reset-password-form.tsx     ← Client "Danger zone" form
├── new/page.tsx
└── [id]/page.tsx               ← edit + reset password section

apps/admin/proxy.ts             ← validateSession เพิ่ม is_active check
apps/admin/app/(auth)/login/actions.ts  ← block deactivated user at signIn
packages/database/src/admin.ts  ← createAdminClient() server-only
```

- 6 sub-phases: service role key → list → create (3-record txn) → edit → toggle → reset password
- "Danger zone" pattern for destructive actions (separate form, amber colors)
- Both `proxy.validateSession` และ `loginAction` check `is_active` (กัน login loop + เด้งกลับสำหรับ deactivated users)

## ✅ Phase 1.10: จัดการนักเรียน — เสร็จ (3/3)

```
apps/admin/app/(admin)/setup/students/
├── page.tsx                    ← list + smart-named classroom column
├── actions.ts                  ← create / update / resetPassword + renumberClassroom helper
├── student-form.tsx            ← shared form (3 sections, classroom dropdown)
├── reset-password-form.tsx     ← Client "Danger zone" form
├── new/page.tsx                ← query classrooms + smart naming for dropdown
└── [id]/page.tsx               ← edit + change classroom + reset password
```

**สิ่งสำคัญที่ใส่:**
- 2-record transaction (auth + students) — ง่ายกว่า teachers (3-record)
- Enrollment เป็น optional ตอน create · classroom dropdown แสดง smart name ("ป.3" หรือ "ป.3/1")
- Enrollment change ในตอน edit: **4-case logic** (X→Y, X→same, X→none, none→Y)
- **`student_number` เรียงตาม `student_code` ASC อัตโนมัติ** — ทุกครั้งหลัง enrollment add/remove
- **2-phase renumber** (negative temps → positive) เพื่อกัน UNIQUE(classroom_id, student_number) conflict
- Reset password section — pattern เดียวกับ teachers

## ✅ Phase 1.11: Dashboard — เสร็จ

KPI cards (ปี/นักเรียน/ครู/ห้อง) + ห้องเรียน breakdown + ทางลัด (admin only) · role-aware

## 🚧 B Design Polish — กำลังทำ (BLOCKED on types regen)

### ✅ B.1: Visual tokens + Layout
- Sky blue primary brand · Sarabun font (Thai-friendly · ใช้กับ ปพ.5 PDF ด้วย)
- **Sidebar layout** (`hidden md:flex`) + Mobile header (`md:hidden`)
- Lucide icons in sidebar nav + sub-nav tabs
- **Active states** (sidebar: bg-primary-50, tab: border-bottom primary)
- `(admin)/loading.tsx` — spinner ตอน navigation
- `Loader2` spinner ใน submit buttons (forms ทั้งหมด)
- **SweetAlert2** แทน browser `confirm()` ใน destructive actions (ลบปี · toggle ครู · ลบห้อง)

### ✅ B.1.13: School Settings (โค้ดเสร็จ · BLOCKED ที่ types)
- `/setup/school` page + form (3 sections: ข้อมูล · ติดต่อ · ผู้บริหาร)
- Schema เพิ่ม 3 columns: `deputy_director_name`, `academic_head_name`, `assessment_officer_name`
- Server Action `updateSchool` (UPDATE single record)

### ✅ types.ts: เขียนเองจาก schema.sql (1460 บรรทัด)

Supabase CLI ถูก block โดย Windows Device Guard + Dashboard popup ปิดเร็ว → token copy ไม่ทัน  
**ทางแก้ที่ใช้:** Agent เขียน types.ts จาก schema.sql แทน (28 tables + 12 enums + 1 view + 1 function + helper types + Constants)  
**Verified:** `pnpm build` ผ่านทั้ง admin + parent

ถ้า schema เปลี่ยนในอนาคต → 2 ทางเลือก:
- ใช้ Supabase Dashboard PAT + Management API (รายละเอียดดู `memory/feedback_device_guard.md`)
- ขอ IT whitelist `supabase.exe` แล้วรัน `pnpm db:types`

### ⚠️ ก่อน test /setup/school: รัน SQL migration

```sql
ALTER TABLE schools 
  ADD COLUMN IF NOT EXISTS deputy_director_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS academic_head_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS assessment_officer_name VARCHAR(255);

INSERT INTO schools (name_th)
SELECT 'โรงเรียน' WHERE NOT EXISTS (SELECT 1 FROM schools);
```

---

## ✅ B.2-B.5: packages/ui + Refactor — เสร็จ

```
packages/ui/src/
├── button.tsx       ← variants: primary/secondary/danger/ghost · sizes: sm/md · `pending` prop (spinner built-in)
├── input.tsx        ← + `invalid` prop
├── field.tsx        ← label + hint + error wrapper (replaces local Field functions across forms)
├── textarea.tsx
├── select.tsx
├── card.tsx         ← variants: default/dashed/warning · padding: sm/md/lg/false
├── badge.tsx        ← variants: success/warning/danger/info/neutral · `withDot`
├── utils.ts         ← cn() helper
└── index.ts
```

**Imports:** `import { Button, Input, Field, Textarea, Select, Card, Badge } from "@pp5/ui";`

**Refactor scope:** 22 ไฟล์ทั้ง admin + parent · -270 บรรทัด · build/lint/type-check ผ่านครบ

**ไฟล์ที่ตั้งใจไม่ refactor (3 ไฟล์ — style เฉพาะ ใช้ครั้งเดียว):**
- `delete-form.tsx` (academic-years) — text-link สีแดง
- `toggle-active-form.tsx` (teachers) — text-link สีอำพัน/เขียว
- `room-counter.tsx` (classrooms) — ปุ่ม 7×7 +/- icon

**สำหรับ Phase 2 ทุกหน้าใหม่:** ใช้ @pp5/ui components ตั้งแต่แรก · `pattern_ui_components.md` มี cheatsheet

## ✅ Phase 2.1.A: Subjects CRUD (วิชาในหลักสูตร) — เสร็จ

```
apps/admin/app/(admin)/setup/subjects/
├── page.tsx                ← list + GradeFilter dropdown + category-aware sort
├── subject-form.tsx        ← Client (useState category drives field switching)
├── actions.ts              ← createSubject / updateSubject / toggleSubjectActive
├── toggle-active-form.tsx  ← Client soft-delete toggle (SweetAlert + useFormStatus)
├── new/page.tsx            ← create
└── [id]/page.tsx           ← edit
```

**Subject schema decisions:**
- `category`: `core` (พื้นฐาน) / `additional` (เพิ่มเติม) / `activity` (กิจกรรม)
- **Hours field switches by category** (form-level state):
  - core/additional → `credit_hours` (หน่วยกิต)
  - activity → `hours_per_year` (ชั่วโมง/ปี) ← column ใหม่
- 1 subject = 1 grade_level (เช่น "คณิตศาสตร์ ป.1" ≠ "คณิตศาสตร์ ป.2")
- Sub-nav: เพิ่ม "วิชา" tab (สี amber)

**SQL migration ที่ต้องรันใน Supabase:**
```sql
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS hours_per_year INTEGER;
```

## ✅ Polish round 2 (2026-05-14) — เสร็จ

**Color-coded design system** (Dashboard + Sub-nav + PageHeader):
- โรงเรียน=indigo · ปีการศึกษา=purple · ชั้นเรียน=pink · ครู=emerald · นักเรียน=sky · วิชา=amber
- **Dashboard hero**: gradient `from-primary-600 via-primary-500 to-primary-700`
- **StatCard**: accent bar (h-1 colored) + icon container (matching `iconBg`)
- **PageHeader component** (`@pp5/ui`): icon + iconBg + title + description + action

**Pencil edit icon**: ทุก list page แทน "แก้ไข" text (8×8 button, hover ring)

**Toggle spinner bug fix**: 
- ปัญหาเดิม: ใช้ `useState(pending)` + manual `setPending(true)` → ค้าง after revalidatePath
- แก้: ใช้ `useFormStatus` ใน child component ของ form → reset อัตโนมัติ
- Applied: `subjects/toggle-active-form.tsx`, `teachers/toggle-active-form.tsx`, `classrooms/room-counter.tsx`

**Duplicate code error**: error banner ตอนเดิม hidden เมื่อ `fieldErrors` มีค่า → แก้ให้แสดงเสมอ (border-2 border-red-300, ⚠️ icon)

**ลบ "ครูวิชาการ" (is_academic_head)**:
- ลบ checkbox ใน `teacher-form.tsx`
- ลบ field ทั้ง 4 ไฟล์: form, actions, list page (SELECT + badge), edit page (SELECT + defaultValues)
- คงไว้ใน `types.ts` + `schema.sql` (DB column ยังมี — รอ migration ถ้าต้องการลบจริง)

**Dropdown filter ระดับชั้น** (Phase 2 prep):
- `setup/_components/grade-filter.tsx` — client component, URL param `?grade=<id>`
- Subject list: เรียงเกรด → category (core→additional→activity) → กลุ่มสาระ (`learning_areas.sort_order` ที่ ภาษาไทย=1) → code
- Student list: ตัดคอลัมน์ "เพศ" ออก + filter ตามเกรด (unenrolled ซ่อนเมื่อ filter)

**BackLink component** (`apps/admin/app/(admin)/_components/back-link.tsx`):
- เปลี่ยนจาก `← ย้อนกลับ` (text-zinc-500) → `[‹ ย้อนกลับ]` ปุ่ม bg-zinc-200
- ใช้ใน 8 หน้า: `teachers|subjects|students|academic-years × [id]|new`

---

## ✅ Phase 2.1.C: Subjects + Plans รวมหน้าเดียว (2026-05-14)

`/setup/subjects` กลายเป็นหน้า 2-column layout:
- ซ้าย: รายการแผนการเรียน (auto-create "ทั่วไป" ถ้ายังไม่มี + ปุ่ม "+ สร้างแผนใหม่")
- ขวา: รายวิชาในแผนที่เลือก (เพิ่ม/แก้/ลบ)
- ปุ่ม **คัดลอก plan**: SweetAlert dropdown → เลือกแผนต้นทาง (จากแผนอื่นในเกรดเดียวกัน) → ดึงวิชามาใส่แผนปัจจุบัน (skip duplicates)
- **Auto-link** ห้องในเกรดเข้ากับ "ทั่วไป" อัตโนมัติ (classroom.study_plan_id)
- **เปลี่ยนแผนของห้อง**: dropdown แบบ button + popup confirm (ป้องกัน admin คลิกพลาด)

```
apps/admin/app/(admin)/setup/subjects/
├── page.tsx                    ← 2-col + grade chips (no room dropdown)
├── actions.ts                  ← ensureDefaultPlan, ensureRoomsLinked, createPlan, copyPlan...
├── grade-room-selector.tsx     ← Client: grade dropdown (rooms passed empty)
├── plan-form.tsx               ← shared create/edit form
├── copy-plan-button.tsx        ← SweetAlert select dropdown
├── delete-plan-form.tsx
├── delete-subject-form.tsx
├── subject-form.tsx            ← lockGradeLevel + planId + cancelHref
├── new/page.tsx + [id]/page.tsx (subjects)
└── plans/new/page.tsx + plans/[id]/page.tsx (plans)
```

ลบทิ้ง: `/setup/study-plans` (เก่า) + sub-nav tab แผนการเรียน

## ✅ Phase 2.2: จัดครูเข้าสอน (Annual) — เสร็จ (2026-05-14)

```
apps/admin/app/(admin)/setup/teaching/
├── page.tsx                  ← skeleton + table + form
├── classroom-selector.tsx    ← เลือกชั้น + ห้อง (≥2) + แสดงแผน + ปุ่มเปลี่ยนแผน — **ไม่มี semester selector**
├── change-plan-button.tsx    ← SweetAlert confirm + change classroom's study_plan_id
├── teaching-form.tsx         ← dropdown ครูแต่ละวิชา + save (annual)
└── actions.ts                ← saveOfferingAssignments (writes BOTH ภาค 1+2), setClassroomPlan
```

**Key decision: Annual teaching, semester-split scoring**
- หน้านี้ครูคนเดียวสำหรับวิชา → save 1 ครั้ง = upsert 2 rows ใน `subject_offerings` (semester=1 + semester=2)
- เปลี่ยนครู = UPSERT (UPDATE) ไม่ใช่ DELETE+INSERT → categories+scores ผูกกับ offering.id เดิม → **ครูใหม่รับช่วงต่อคะแนนเก่าทันที**
- ลบ ("— ยังไม่กำหนด —") = DELETE both semesters → cascade ลบ categories+scores

**Edge cases handled:**
- ห้องยังไม่มีแผน → ปุ่มไป `/setup/subjects?grade=X`
- ปีปัจจุบันไม่มี → warning + link
- ไม่มีห้อง/ครูในระบบ → empty state พร้อม link

## ✅ Phase 2.3: บันทึกคะแนน (grid editor) — เสร็จ (2026-05-14)

`/setup/score-structure` (label "บันทึกคะแนน") — รวม "ตั้งคะแนนเต็ม" + "กรอกคะแนนนักเรียน" หน้าเดียว

```
apps/admin/app/(admin)/setup/score-structure/
├── page.tsx                ← selector + tabs + fetch data + render grid
├── score-selector.tsx      ← เลือกชั้น / ห้อง (≥2) / รายวิชา (auto-load on change)
├── score-grid.tsx          ← Client: spreadsheet editor (max_score row + student rows)
└── actions.ts              ← ensureCategorySlots, saveCategoryMaxScore, saveScore
```

**Layout** (ตามที่ user ออกแบบ):
```
Selector: ระดับชั้น | ห้อง (≥2) | รายวิชา
Tabs:     ภาคเรียน 1 | ภาคเรียน 2 | 🏆 สรุปผล/ตัดเกรด

ครูผู้สอน: <ดึงจาก offering>
┌─#─┬─ชื่อ-สกุล─┬─[ คะแนนระหว่างภาค 1-10 ]─┬─รวม─┬─ปลายภาค─┬─รวมทั้งหมด─┐
│ 🎯│คะแนนเต็ม │ [40][40][0]...[0]       │ 80  │ [20]    │   100      │
│ 1 │สมชาย     │ [35][33][0]...[0]       │ 68  │ [15]    │    83      │
└───┴─────────┴────────────────────────┴─────┴────────┴────────────┘
```

**Key behaviors:**
- **Auto-create 11 categories** (sort_order 1-10 ระหว่างภาค + 11 ปลายภาค, max=0) เมื่อเปิดหน้าครั้งแรกของ offering
- **Self-healing**: `ensureCategorySlots` ลบ duplicates + sort_order > 11 stray (จาก test data เก่า)
- **Auto-heal missing semester**: ถ้า ภาค 2 ไม่มี offering แต่ ภาค 1 มี → INSERT ภาค 2 ด้วยครูคนเดียวกัน
- **Auto-save on blur** (useTransition + server action) — max_score และ score แต่ละ cell
- **Cap at max_score** — input attr + server-side clamp
- **Disabled cells** เมื่อ max=0 (สีเทา)
- **Empty score = DELETE row** (ค่าว่าง = ไม่ได้กรอก)
- **Auto-calc** รวมระหว่างภาค + รวมทั้งหมด (client-side)
- **Key prop** บน ScoreGrid เพื่อ re-mount เมื่อเปลี่ยนวิชา/ภาค (กัน stale state)

**Schema mapping:**
- score_categories per offering, sort_order 1-11 (10 collect + 1 final)
- scores per (student, category) — `recorded_by` = null สำหรับ admin (FK ไปที่ teachers.id)

## ✅ Sidebar Redesign + Polish (2026-05-14)

**Sidebar collapsible + section groups:**
```
┌──────────────────────┐
│ ระบบ ปพ.5     [«]    │  ← chevron toggle (rail/expanded)
├──────────────────────┤
│ 📊 หน้าหลัก          │
│                      │
│ ⚙ ตั้งค่าพื้นฐาน ▾  │  ← expandable (auto-open if active link inside)
│    🏢 ข้อมูลโรงเรียน  │
│    📅 ปีการศึกษา      │
│    🏫 ชั้นเรียน       │
│                      │
│ 🗄 จัดการข้อมูล  ▾  │
│    👥 ข้อมูลครู       │
│    🎓 ข้อมูลนักเรียน  │
│    📖 ข้อมูลรายวิชา   │
│    📋 จัดครูเข้าสอน   │
│                      │
│ 📊 การประเมิน    ▾  │
│    📋 บันทึกคะแนน    │
└──────────────────────┘
```

- **Collapsed mode** (`w-16`): icon-only rail, hover tooltips via `title`, section click → expand + open
- **Active state** ใช้ `pathname.startsWith(${href}/)` (boundary-aware — `/teachers` ไม่ match `/teaching`)
- **No more SubNav** (ลบ `setup/_components/sub-nav.tsx` ออก) — sidebar คือ navigation เดียว

**Navigation feedback (Next.js 16 `useLinkStatus`)**:
- คลิก link ใน sidebar → ไอคอน swap เป็น `<Loader2>` ทันที (ก่อน loading.tsx แสดง)
- เร็วและ feel responsive

## ✅ Polish Bug Fixes (2026-05-14)

1. **React 19 SyntheticEvent pooling bug**: 5 ไฟล์ที่ใช้ `e.currentTarget.form?.requestSubmit()` หลัง `await Swal.fire()` → null pointer
   - Fix: capture `form` ref BEFORE await (`const form = e.currentTarget.form;`)
   - Files: classrooms/room-counter, teachers/toggle-active, subjects/toggle-active + delete-plan + delete-subject

2. **Duplicate score categories** จาก test data เก่า → `ensureCategorySlots` ทำ self-heal

## ✅ Phase 2.5: บันทึกเวลาเรียน — เสร็จ (2026-05-14)

```
apps/admin/app/(admin)/setup/attendance/
├── page.tsx                  ← server: selectors + เทอม tabs + month tabs + grid
├── selector.tsx              ← Client: เลือกชั้น + ห้อง (no semester — annual scoring)
├── attendance-grid.tsx       ← Client: spreadsheet editor (workday toggle + status cycle)
├── calendar.ts               ← Thai school calendar helpers (BE↔CE, term months)
└── actions.ts                ← toggleWorkday, saveAttendance, setAllForDay
```

**Sidebar**: เพิ่ม "บันทึกเวลาเรียน" ใน group "การประเมิน" (icon `CalendarCheck`)

### Layout
```
[Page header: บันทึกเวลาเรียน]
[Selector: ระดับชั้น | ห้อง (≥2)]
[Tabs: เทอม 1 ● | เทอม 2 | 🏆 สรุปรวม]
[Month tabs: พ.ค. | มิ.ย. | ก.ค. | ส.ค. | ก.ย. | ต.ค. | สรุป]

ห้อง ป.1/1 · เทอม 1 · พ.ค. 2569
────────────────────────────────────────
ℹ️ คลิกวงกลม ●/○ เปิด/ปิดวันทำการ · ✓ ใต้วันที่ = เช็คมาทั้งห้อง

┌─#─┬─ชื่อ-สกุล─┬─[ ● ○ ● ● ● ... ]─┬─[ 1 2 3 4 5 ... ]─┬─[ ✓ ✓ ✓ ... ]─┬─วันเปิด │ มา%│ลา│ขาด─┐
│   │           │ ↑ workday toggle  │ ↑ date + dow      │ ↑ all-present  │                  │
│ 1 │ด.ช.สมชาย  │                   │  ✓ ✓ × ล .  ...   │                │  17  16(94%) 1 0 │
└───┴───────────┴───────────────────┴───────────────────┴────────────────┴──────────────────┘
```

### Behavior
- **Term boundaries** hard-coded: เทอม 1 = 16 พ.ค. - 10 ต.ค. · เทอม 2 = 1 พ.ย. - 31 มี.ค.
- **Months per term**: T1 = [พ.ค., มิ.ย., ก.ค., ส.ค., ก.ย., ต.ค.] · T2 = [พ.ย., ธ.ค., ม.ค., ก.พ., มี.ค.]
- **Year resolution**: เทอม 2 months 1-3 → CE year+1 (cross calendar boundary)
- **Cell cycle**: empty → present (✓) → absent (×) → leave (ล) → sick (ป) → empty
- **Status colors**: present=emerald · absent=red · leave=amber · sick=sky
- **Auto-save** on click (useTransition + server action)
- **"เช็คมาทั้งห้อง" toggle**: 1 click → mark all students present · click again → clear all
- **Workday OFF → cascade**: ลบ attendance rows + clear local state สำหรับวันนั้น
- **Weekend tint**: เสาร์/อาทิตย์ → bg-yellow-50
- **Holiday tint**: วันหยุด → bg-red-50 + tooltip ชื่อวันหยุด
- **Title abbreviation**: เด็กชาย → ด.ช., เด็กหญิง → ด.ญ., นางสาว → น.ส.

### Table layout fixes (Polish round)
- `table-fixed` + `<colgroup>` + explicit cell widths + minWidth — บังคับ column widths strict
- ลบ `min-w-full` ป้องกัน sticky offset misalignment เมื่อ table stretch
- ลบ `border-r` บน # column → ไม่มี "ขาดช่วง" ระหว่าง # กับ ชื่อ
- ลบคอลัมน์ "รหัส" + "ป่วย" ออกตาม user request (เก็บ status="sick" เป็นวงจรเซลล์ได้)

## ✅ ตั้งค่าวันหยุด — เสร็จ (2026-05-14)

```
apps/admin/app/(admin)/setup/holidays/
├── page.tsx                ← list + inline add form + seed button
├── actions.ts              ← create/update/delete/seedThaiHolidays
├── holiday-form.tsx        ← Client (inline + block variants)
├── delete-holiday-form.tsx ← SweetAlert confirm + delete
├── seed-button.tsx         ← SweetAlert confirm + bulk seed
├── holidays-data.ts        ← Thai standard holidays (BE 2569 + 2570)
└── [id]/page.tsx           ← edit page
```

**Sidebar**: เพิ่ม "ตั้งค่าวันหยุด" ใน group "ตั้งค่าพื้นฐาน" (icon `CalendarX`)

### Holiday data structure
- **Fixed holidays** (15 รายการ): ปีใหม่, จักรี, สงกรานต์ ×3, แรงงาน, ฉัตรมงคล, ราชินี, ร.10, แม่, นวมินทร, ปิยมหาราช, พ่อ, รัฐธรรมนูญ, สิ้นปี
- **Lunar holidays** (per BE year): มาฆบูชา, วิสาขบูชา, อาสาฬหบูชา, เข้าพรรษา
- **Substitute holidays** (auto-computed): ถ้าวันหลักตรงเสาร์/อาทิตย์ → ชดเชยวันธรรมดาถัดไป
  - เช่น วันวิสาขบูชา 2569 = 31 พ.ค. (อาทิตย์) → ชดเชย 1 มิ.ย. (จันทร์)

### "ดึงวันหยุดมาตรฐาน" button
- คลิก → SweetAlert confirm → bulk UPSERT `holidays` table (idempotent via UNIQUE(date, type))
- ขอบเขต: filter date ตามปีการศึกษา (16 พ.ค. {yearBe} - 15 พ.ค. {yearBe+1})
- type='government' สำหรับวันหยุดราชการ · type='school' สำหรับ admin เพิ่มเอง

### Lunar dates maintenance
⚠️ **วันจันทรคติ** = hardcode รายปี (ไม่มี library คำนวณได้แม่นยำ)
- หากผิด ±1 วัน → admin แก้ผ่าน UI (ปุ่ม ✏)
- เพิ่มปีใหม่ → แก้ `holidays-data.ts` → `LUNAR_HOLIDAYS_BY_BE_YEAR[XXXX] = [...]`
- เคยพิจารณา API (date.nager.at, calendarific) แต่ไม่ครบวันจันทรคติไทย → เลือก hardcode + admin override

## ✅ Phase 2.4: สรุปผล/ตัดเกรด — เสร็จ (2026-05-15)

Tab **🏆 สรุปผล/ตัดเกรด** ใน `/setup/score-structure` — คำนวณ + แสดง + บันทึกเกรดประจำปี

```
apps/admin/app/(admin)/setup/score-structure/
├── page.tsx                ← + Suspense + PassFailGridSection + sorted subjects
├── actions.ts              ← + saveSemesterPassFail / setAllPassFail / saveSummaryGrades
├── grading-utils.ts        ← cutGrade / averageTwoSemesters / abbreviateTitle / sumStudentSemesterScore
├── summary-section.tsx     ← async fetcher: numeric + pass_fail branches
├── summary-table.tsx       ← NumericTable (interactive save) + PassFailTable (read-only)
├── pass-fail-grid.tsx      ← per-semester dropdown UI + bulk "ผ่านทั้งห้อง" button
└── score-grid.tsx          ← mobile-friendly rewrite (sticky + truncate + inline widths)
```

### Logic — วิชา numeric (พื้นฐาน/เพิ่มเติม) — **Plan B: compute on-the-fly**
- **ประถม** (`grade_levels.system='primary'`): `(score_ภาค1 + score_ภาค2) / 2` → cut grade รายปี
- **มัธยม**: Phase 4 (รอ secondary flow)
- Cut grade ใช้ `grade_scales` (8 thresholds: 80→4.0, 75→3.5, ..., 0→0)
- **ไม่มี save button** — เกรดคำนวณจาก `scores` table ทุกครั้งที่เปิดหน้าสรุป / พิมพ์ ปพ.5
- **ไม่มี `grades.grade` row** สำหรับ numeric — single source of truth = `scores`
- เหตุผล: ครูแก้คะแนนแล้วลืมกดบันทึก → ปพ.5 พิมพ์ออกมาไม่ตรง · Plan B แก้ปัญหานี้แบบยั่งยืน
- `grades` table สงวนไว้สำหรับ: `pass_fail` (กิจกรรม) · `is_incomplete` · `is_no_eligibility` · `manual_override` (Phase ภายหลัง)

### Logic — วิชา pass_fail (กิจกรรม)
- Per-semester tab (ภาคเรียนที่ 1/2): dropdown `—/ผ่าน/ไม่ผ่าน` ต่อนักเรียน · **auto-save** ทันที (period='semester')
- Summary tab: **read-only** อ่าน rows จากทั้ง 2 ภาค → AND logic:
  - ทั้งคู่ 'pass' → ผ่าน
  - ใดใดเป็น 'fail' → ไม่ผ่าน
  - มีฝั่งใดยังไม่บันทึก → "—" (รอประเมิน)
- ปุ่ม **"ผ่านทั้งห้อง"** ที่ header: toggle bulk set-all/clear-all สำหรับภาคที่กำลังดู

### Mobile + UX patterns ที่ established
- **`<Suspense key={params}>`** ห่อ section ที่ refetch → spinner ระหว่างเปลี่ยน tab/subject/room (ใช้กับ score-structure + attendance)
- **Inline `style={{ width: ... }}` บน `<col>`** — Tailwind classes บน `<col>` ไม่ apply ใน v4 อย่างเสถียร
- **`min-width` บน table** — บังคับ horizontal scroll บน mobile แทนที่จะให้ column shrink
- **Sticky frozen panel** (เลขที่ + ชื่อ) — `position: sticky; left: 0/48;` + explicit width + bg
- **Title abbreviation** — `เด็กชาย→ด.ช., เด็กหญิง→ด.ญ., นางสาว→น.ส.` (shared helper)
- **Truncate names** — `<div className="truncate" title={fullName}>` ป้องกัน row height แตก
- **`key={`${id}|${value}`}` บน Row** — force remount เมื่อ prop เปลี่ยนจาก server (กัน useState stale หลัง bulk action revalidate)
- **`step="1"` บน `<input type="number">`** — arrow buttons ทีละ 1 (ยังพิมพ์ decimal ได้)
- **`useTransition` + try/catch + alert** ใน async client action — ผู้ใช้เห็น error ถ้าล้มเหลว

### Database design points
- `grades.grading_period` เลือกตาม system: ประถม=annual / มัธยม=semester
- ประถม → save 1 row/student ต่อ subject ที่ offering ภาค 1 เป็น anchor
- pass_fail → save per-semester (อ่านรวมเป็น annual ใน summary แต่ไม่เก็บ aggregate row)
- ทุก save ใช้ `revalidatePath` ของ /setup/score-structure → page refetch
- UPSERT validate grade ∈ {0, 0.5, 1, ..., 4} ที่ server ก่อน insert (กัน client tampering)

### Auto-save vs Batch save (วิเคราะห์ทรัพยากร)
- **Score grid / pass_fail dropdown** (per-cell): auto-save บน blur/change → 1 UPSERT/edit
- **Summary numeric**: ไม่ save (compute on-the-fly) — Plan B
- Supabase free tier (5 GB bandwidth): โรงเรียน 50 ครู ใช้ ~500 MB/เดือน ≈ 10% quota สบายๆ

## 🏛 Architectural decisions (2026-05-15)

### Plan B — Grades for numeric subjects = compute on-the-fly
- **Problem**: ตอนแรกใช้ปุ่ม "บันทึกผลการเรียน" → ครูแก้คะแนนแล้วลืมกด → ปพ.5 ผิด
- **Solution**: ไม่ save grade ของ numeric ลง `grades` table เลย — คำนวณจาก `scores` ทุกครั้งที่แสดง/พิมพ์
- **Impact**: ลบ saveSummaryGrades action · ลบ SaveGradesButton · ลบคอลัมน์ "บันทึกไว้" · ลบการ fetch existingGrades

### Plan B (Smart UI) — Primary/Secondary architecture
- **โรงเรียนเป้าหมาย**: ขยายโอกาส (ป.1 - ม.3) — มีทั้ง 2 ระบบ
- **Strategy**: URL เดียวกัน · ตรวจ `classroom.grade_level.system` ภายใน · render flow ตามที่ตรง
- **Timeline**: Primary now (Phase 2.x + Phase 3 PDF), Secondary later (Phase 4)
- **Lock + readonly model**: applies to ทั้ง primary และ secondary — past = readonly, future = disabled, current = editable
- **ไม่ใช่ hide** — ครู/admin ต้องดูข้อมูลย้อนหลังของวิชาที่ตัวเองสอนได้

## ✅ Phase 2.6: ภาคเรียนปัจจุบัน + Lock — เสร็จ (2026-05-16)

**เหตุผล**: ปพ.5/ปพ.6 ต้องระบุปี+ภาคที่ผลออก · ครู/admin ต้องมี state ชัดว่าจริงๆ "ภาคเรียนไหนกำลังทำงาน" · ป้องกันแก้ภาคเก่าโดยไม่ตั้งใจ

### SQL Migration (admin รันแล้วใน Dashboard)
```sql
ALTER TABLE academic_years
ADD COLUMN current_semester SMALLINT NOT NULL DEFAULT 1
CHECK (current_semester IN (1, 2));

COMMENT ON COLUMN academic_years.current_semester IS
  'ภาคเรียนที่กำลังทำงาน (1 หรือ 2). admin เปลี่ยนเพื่อ lock/unlock ภาคเรียน';
```
→ row เดิมได้ `current_semester = 1` อัตโนมัติ · `schema.sql` + `types.ts` อัปเดตตรงกันแล้ว

### Behavior matrix

| สถานะของ tab | UI | Server | Banner |
|---|---|---|---|
| **Past** (`tab < current`) | inputs disabled · tab label `🔒 ภาคเรียนที่ N` | `ensureSemesterEditable` throws | สีเหลือง "ภาคเรียนนี้ถูกล็อค" |
| **Current** (`tab === current`) | editable เต็มที่ | ผ่าน | (ไม่มี) |
| **Future** (`tab > current`) | ไม่ render grid · placeholder card · tab label `⏳ ภาคเรียนที่ N` | guards ก็ block | "ยังไม่เริ่มภาคเรียนนี้" |
| **Summary tab** | view-only (Plan B) · คอลัมน์ future = "—" · เกรด = "—" | n/a (ไม่มี save) | (ไม่มี) |

### ไฟล์ที่แก้
- `schema.sql` · `packages/database/src/types.ts` · `apps/admin/lib/current-term.ts` (ใหม่)
- `setup/academic-years/[id]/page.tsx` · `year-form.tsx` · `actions.ts` — dropdown ภาคเรียนปัจจุบัน
- `setup/score-structure/page.tsx` — default tab, TabNav decoration, `<Suspense>` branch, `FutureSemesterPlaceholder` + `PastSemesterBanner`
- `setup/score-structure/score-grid.tsx` — `readonly` prop → inputs disabled
- `setup/score-structure/pass-fail-grid.tsx` — `readonly` prop → Select disabled, bulk button ซ่อน
- `setup/score-structure/summary-section.tsx` — รับ `currentSemester` · ภาค 2 = null ถ้ายังไม่ถึง
- `setup/score-structure/summary-table.tsx` — รับ null · แสดง "—" สำหรับ future/grade
- `setup/score-structure/actions.ts` — `ensureCategorySemesterEditable` + `ensureOfferingSemesterEditable` guards
- `setup/attendance/page.tsx` — default term = current · TabNav decoration · `FuturePlaceholder` + lock banner
- `setup/attendance/attendance-grid.tsx` — `readonly` prop → toggleDay/cycleStatus/toggleAllForDay early return
- `setup/attendance/calendar.ts` — `semesterFromIsoDate(iso)` helper
- `setup/attendance/actions.ts` — `ensureDateEditable` guards

### Patterns ใหม่ที่ established
- **Helper `getCurrentTerm()`** ใน `@/lib/current-term` — read once at page level
- **`semesterStateOf(target, current)`** → "past" | "current" | "future" — ใช้ทั้ง UI + decide rendering
- **`ensureSemesterEditable(sem)`** server-side guard — defense in depth, throws clear error
- **3-state tab labels** — `🔒 ภาคเรียนที่ N` / `ภาคเรียนที่ N` / `⏳ ภาคเรียนที่ N`
- **`readonly` prop pattern** — ทุก grid component รับ + ปิด interactivity
- **Date → semester mapping** (สำหรับ attendance guard) — `semesterFromIsoDate` ใน calendar.ts
- **Admin override = เปลี่ยน current_semester** — ไม่มี role-based bypass

### ทดสอบ verify
```powershell
pnpm dev
# /setup/academic-years/[id] → เห็น dropdown "ภาคเรียนปัจจุบัน"
# เปลี่ยน current = 2 → save
# /setup/score-structure → tab default = "ภาคเรียนที่ 2"
#   ภาค 1 → `🔒` icon · เปิดดูได้ · inputs disabled · banner สีเหลือง
#   ภาค 2 → ปกติ
# /setup/attendance → tab default = เทอม 2
#   เทอม 1 → `🔒` · cells อ่านได้ · กดไม่ทำงาน · banner
```

## ⬜ Phase 3: ออกเอกสาร ปพ.5/ปพ.6

- ⬜ PDF generation ของ ปพ.5 (รายชั่วโมง/รายภาค)
- ⬜ PDF generation ของ ปพ.6 (สรุปประจำปี)
- ⬜ พิจารณา library: pdf-lib, jsPDF, หรือ Puppeteer
- ⬜ Layout ตามแบบมาตรฐาน สพฐ.

### Phase 2.4 follow-ups (เผื่ออนาคต)
- ⬜ มัธยม per-semester grading (ตอนนี้ใช้ semester 1 อย่างเดียว)
- ⬜ `is_incomplete` (ร — รอประเมิน) — ครูเลือกได้
- ⬜ `is_no_eligibility` (มส — เวลาเรียน < 80%) — auto-set จาก attendance summary
- ⬜ `manual_override` — ครูแก้เกรดเองทับ auto-cut

---

## 🔑 Auth Architecture (เลือกแล้ว — Phase 1.1)

### Fake Email Pattern (Supabase Auth ไม่รองรับ username ตรงๆ)

| ผู้ใช้กรอก | แปลงเป็น email | ใช้ใน |
|----------|-----------------|------|
| `admin` (Admin) | `admin@admin.pp5.local` | `apps/admin/.../login` |
| `somchai01` (ครู) | `somchai01@teacher.pp5.local` | `apps/admin/.../login` |
| `66012345` (นักเรียน) | `66012345@student.pp5.local` | `apps/parent/.../login` (1.6) |

### Login retry strategy

`apps/admin/app/(auth)/login/actions.ts` ลอง 2 domain ตามลำดับ:
1. `<username>@admin.pp5.local` (admin first)
2. ถ้า fail → `<username>@teacher.pp5.local`
3. ถ้า fail ทั้งคู่ → แจ้ง "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"

### Reset password (สำหรับ fake email accounts)

Dashboard "Send password recovery" ไม่ทำงาน (email ไม่มีจริง) — ใช้ SQL แทน:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE auth.users
SET encrypted_password = crypt('new_password', gen_salt('bf'))
WHERE email = 'admin@admin.pp5.local';
```
Supabase auth ใช้ bcrypt cost-10 = `gen_salt('bf')` produces compatible hash.

### Admin user ปัจจุบัน (สำหรับ dev)
- username: `admin` · password: `pp5admin`
- email: `admin@admin.pp5.local` · auth_user_id: `d9405faa-813a-4d89-90d1-ac61f5dc45ed`

### Test Student ปัจจุบัน (สำหรับ dev)
- student_code: `66012345` · password: `pp5student`
- ชื่อ: เด็กชายสมชาย ใจดี · เพศ ชาย
- email: `66012345@student.pp5.local` · auth_user_id: `199cf47b-d3e9-4fed-abd2-75ede0fff9d7`

> 🔐 password เหล่านี้สำหรับ dev เท่านั้น · production เปลี่ยน

### 🍪 Cookie Separation (สำคัญสำหรับ multi-app dev)

`localhost:3000` (admin) และ `localhost:3001` (parent) แชร์ cookies ตาม browser scope · ไม่ทำอะไรเลย = session ทับกัน → redirect loop + "unexpected server response"

**แก้:** แต่ละ app set `NEXT_PUBLIC_SUPABASE_AUTH_STORAGE_KEY` ต่างกัน:
- `apps/admin/.env.local` → `sb-pp5-admin`
- `apps/parent/.env.local` → `sb-pp5-parent`

`@pp5/database` (client.ts / server.ts / middleware.ts) อ่าน env นี้ → ส่งเป็น `cookieOptions.name` ให้ Supabase

ผลลัพธ์: cookies ของ admin = `sb-pp5-admin-*`, parent = `sb-pp5-parent-*` → 2 sessions อยู่ได้พร้อมกัน

> 💡 Production (admin.school.com + parent.school.com แยก domain) ไม่ต้องการ — แต่ตั้งไว้ก็ harmless

---

## 📦 ไฟล์ใหม่จาก Phase 1

```
packages/database/src/
├── queries.ts          ← getCurrentUser() + getCurrentStudent()
├── middleware.ts       ← updateSession: publicPaths/loginPath/homePath/validateSession + cookie name
├── server.ts           ← UPDATE: cookieOptions.name จาก env
└── client.ts           ← UPDATE: cookieOptions.name จาก env

apps/admin/
├── proxy.ts                            ← validateSession เช็ค users table
├── .env.local                          ← + NEXT_PUBLIC_SUPABASE_AUTH_STORAGE_KEY=sb-pp5-admin
└── app/
    ├── (auth)/login/                   ← layout + page + login-form + actions (try admin→teacher)
    ├── _actions/auth.ts                ← logoutAction
    └── page.tsx                        ← header (user info + logout) + grade_levels

apps/parent/
├── proxy.ts                            ← validateSession เช็ค students table
├── .env.local                          ← + NEXT_PUBLIC_SUPABASE_AUTH_STORAGE_KEY=sb-pp5-parent
└── app/
    ├── (auth)/login/                   ← layout + page + login-form + actions (student domain only)
    ├── _actions/auth.ts                ← logoutAction
    └── page.tsx                        ← header (student info + logout) + dashboard placeholder
```

---

## 🔑 Credentials

| ค่า | ที่อยู่ |
|-----|--------|
| Project URL | `https://tizntrnmvctllwylhthl.supabase.co` |
| Project Ref ID | `tizntrnmvctllwylhthl` |
| Publishable Key | อยู่ใน `apps/admin/.env.local` และ `apps/parent/.env.local` |

> Supabase Dashboard: https://supabase.com/dashboard/project/tizntrnmvctllwylhthl

---

## 📂 โครงสร้างโปรเจกต์ปัจจุบัน

```
C:\webapp\Grade\
├── apps/
│   ├── admin/                    @pp5/admin   port 3000  (admin + ครู)
│   │   ├── app/
│   │   │   └── page.tsx          ← test page (ดึง grade_levels)
│   │   ├── proxy.ts              ← Next.js 16 proxy (refresh session)
│   │   ├── next.config.ts        ← transpilePackages: ['@pp5/database']
│   │   ├── .env.local            ← Supabase credentials
│   │   ├── .env.example
│   │   ├── AGENTS.md             ← Next.js 16 บอกว่ามี breaking changes
│   │   ├── CLAUDE.md             ← @AGENTS.md
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── parent/                   @pp5/parent  port 3001  (Portal ผู้ปกครอง)
│       └── (เหมือน admin)
├── packages/
│   └── database/                 @pp5/database
│       ├── src/
│       │   ├── index.ts          ← re-exports
│       │   ├── client.ts         ← createBrowserClient (สำหรับ 'use client')
│       │   ├── server.ts         ← createServerClient async
│       │   ├── middleware.ts     ← updateSession() (เรียกจาก proxy.ts)
│       │   └── types.ts          ← ⚠️ placeholder · Step 5 replace
│       ├── package.json
│       └── tsconfig.json
├── package.json                  ← root workspace + scripts
├── pnpm-workspace.yaml           ← apps/* + packages/* + allowBuilds
├── pnpm-lock.yaml
├── .gitignore
├── .npmrc
├── README.md
├── pp5-system-design.md          ← เอกสารออกแบบ 17 sections
├── schema.sql                    ← 24 tables + seed
├── rls_policies.sql              ← 77 policies
└── SETUP_PROGRESS.md             ← ไฟล์นี้
```

---

## 🔧 คำสั่งที่ใช้บ่อย

```powershell
# Dev
pnpm dev                # รัน admin + parent ขนานกัน
pnpm dev:admin          # admin only → http://localhost:3000
pnpm dev:parent         # parent only → http://localhost:3001

# Build
pnpm build              # build ทั้งหมด
pnpm --filter @pp5/admin build
pnpm --filter @pp5/parent build

# Type
pnpm db:types           # generate types จาก Supabase (Step 5)
pnpm --filter @pp5/admin type-check

# Lint
pnpm lint
```

---

## ⚠️ Decisions / Gotchas สำคัญ

### 1. Next.js 16 ไม่ใช่ 15
- README ระบุ 15 แต่ create-next-app ให้ 16.2.6
- **Breaking changes**:
  - `middleware.ts` → `proxy.ts` · `export function middleware` → `export function proxy`
  - Proxy runtime = `nodejs` (ไม่ใช่ edge อีกแล้ว)
  - `cookies()` เป็น async — ต้อง `await cookies()`
- AGENTS.md ใน apps เตือนว่า "This is NOT the Next.js you know" — เช็ค `node_modules/next/dist/docs/` ก่อนเขียนโค้ดที่ไม่แน่ใจ

### 2. pnpm บน Windows
- Corepack ติด EPERM (Node.js อยู่ใน `Program Files`) → ใช้ `npm install -g pnpm` แทน
- PowerShell Execution Policy บล็อก `npm.ps1`, `pnpm.ps1` → ใช้ `.cmd` extension (`npm.cmd`, `pnpm.cmd`)
- `pnpm dlx` cache มี bug → ใช้ `npx --yes` แทน

### 3. Type resolution ใน monorepo
- @supabase/ssr ต้องเป็น **direct dep** ของ apps (ไม่ใช่แค่ใน @pp5/database) — TS resolve ไม่เจอถ้าอยู่แค่ใน workspace package
- ต้องใส่ **explicit type annotation** สำหรับ `setAll(cookiesToSet: CookieToSet[])` — `createServerClient` มี 2 overloads (deprecated + new) ทำให้ TS เลือก overload ผิด

### 4. pnpm-workspace.yaml allowBuilds
- `supabase`, `sharp`, `unrs-resolver` ต้องเปิดใน `allowBuilds: true` ไม่งั้น postinstall ไม่รัน
- ตอนนี้เปิดทั้ง 3

### 5. Database type — Generated แล้ว
- `packages/database/src/types.ts` ตอนนี้เป็น types จริงจาก Supabase (1486 บรรทัด, 24 ตาราง, 10 enums)
- **อย่าแก้ด้วยมือ** — ใช้ `pnpm db:types` regenerate เมื่อ schema เปลี่ยน
- ต้องการ login: `pnpm.cmd supabase login` (browser-based, ครั้งเดียวต่อเครื่อง)

### 6. @supabase/ssr version (สำคัญสำหรับ types)
- ต้องใช้ **0.6.0+** เพื่อรองรับ Database type ที่มี `__InternalSupabase` field (Postgrest version detection)
- ตอนนี้ใช้ 0.10.3 + @supabase/supabase-js 2.105.4 — sync version ทั้งใน `@pp5/database`, `@pp5/admin`, `@pp5/parent`
- ถ้า types ดู wrong ใน `.from()` → เช็คว่า 3 package's versions ตรงกัน

---

## 🚀 วิธีกลับมาทำต่อ

Phase 1 Login + Auth เสร็จแล้ว · พร้อม build Phase 1 ต่อ (dashboard / setup pages)

### รัน dev
```powershell
pnpm dev   # admin (3000) + parent (3001) ขนานกัน
```

ทดสอบ:
- admin: http://localhost:3000 → `admin` / `pp5admin`
- parent: http://localhost:3001 → `66012345` / `pp5student`

## ✅ Phase 2.7: ประเมินตามหลักสูตร — เสร็จ (2026-05-16)

**3 เมนูใหม่ในกลุ่ม "การประเมิน":**
- **คุณลักษณะ** (`/setup/characteristics`) — 2 sub-tabs: ตั้งค่า + ประเมิน
- **อ่าน คิด เขียน** (`/setup/reading-thinking`) — 3 dimensions
- **สมรรถนะสำคัญ** (`/setup/competency`) — 5 dimensions

### Schema (มีพร้อมแล้ว · ไม่ต้อง migration)
- `characteristics` — seed 8 ข้อ สพฐ. (admin แก้/เพิ่ม/ลบ/จัดเรียงได้)
- `characteristic_evaluations` — per student × characteristic × year × semester
- `reading_thinking_evaluations` — per student × year × semester (3 fields)
- `competency_evaluations` — per student × year × semester (5 fields)

### Common pattern ทั้ง 3 เมนู
- **0-3 scoring** with cell click cycle: 3 → 2 → 1 → 0 → empty
- **Auto-save** per cell on click (useTransition + revalidatePath)
- **Summary rule** ตาม สพฐ.: ≥80% → ดีเยี่ยม / ≥70% → ดี / ≥50% → ผ่าน / else → ไม่ผ่าน
- **Gating rule**: any cell = 0 → "ไม่ผ่าน" (regardless of percentage)
- **Phase 2.6 lock**: ภาคเรียนปัจจุบันเท่านั้นที่แก้ได้ · ภาคเก่า/ใหม่ readonly
- **Sticky frozen panel** (เลขที่ + ชื่อ) · responsive table-fixed widths

### Shared utilities (ใหม่)
- `apps/admin/lib/curriculum-eval-utils.ts`:
  - `summarize0to3()` → "ดีเยี่ยม" | "ดี" | "ผ่าน" | "ไม่ผ่าน" | null
  - `cellColorClass()` — emerald/sky/amber/rose ตาม score 0-3
  - `summaryColorClass()` — สีของ summary pill
- `apps/admin/app/(admin)/_components/fixed-eval-grid.tsx`:
  - Generic grid สำหรับ schema ที่มี fixed columns
  - ใช้ทั้ง reading-thinking และ competency
  - Server action ส่งเข้าเป็น prop (FixedSaveAction)

### File structure (Phase 2.7)
```
apps/admin/lib/
└── curriculum-eval-utils.ts             ← summary + color helpers

apps/admin/app/(admin)/_components/
└── fixed-eval-grid.tsx                  ← shared grid (3/5 col)

apps/admin/app/(admin)/setup/
├── characteristics/
│   ├── page.tsx                         ← 2 tabs (settings + evaluate)
│   ├── actions.ts                       ← 5 CRUDs + saveCharacteristicScore
│   ├── selector.tsx                     ← grade/room dropdown
│   ├── settings-tab.tsx                 ← CRUD UI (add/edit/move/delete/seed)
│   └── eval-grid.tsx                    ← dynamic-column grid (per char)
├── reading-thinking/
│   ├── page.tsx
│   ├── actions.ts                       ← saveReadingThinkingScore (3 fields)
│   └── selector.tsx
└── competency/
    ├── page.tsx
    ├── actions.ts                       ← saveCompetencyScore (5 fields)
    └── selector.tsx
```

### Patterns ที่ established
- **Cell-cycle click** (no inputs) — เป็น button ที่หมุนค่าทีละครั้ง · เร็วกว่า input + ลด typo
- **Soft delete** สำหรับ characteristics — เก็บประวัติ evaluations ไว้
- **Up/down arrow reorder** แทน drag&drop (เริ่มต้นง่าย · เพิ่ม drag ทีหลังได้)
- **UPSERT preserves other columns** — เปลี่ยน reading_score ไม่ overwrite thinking_score
- **Server action as prop** — `FixedEvalGrid` รับ saveAction ทำให้ reuse กับ 2+ tables ได้
- **Per-cell payload** — formData มี field name (defense in depth via allow-list)

### Sidebar layout (อัปเดต)
```
📊 การประเมิน
   ├ บันทึกคะแนน
   ├ บันทึกเวลาเรียน
   ├ คุณลักษณะ              ✨ ใหม่ (Heart icon)
   ├ อ่าน คิด เขียน         ✨ ใหม่ (Brain icon)
   └ สมรรถนะสำคัญ           ✨ ใหม่ (Activity icon)
```

### Breadcrumb routes ที่เพิ่ม
- `/setup/characteristics` → การประเมิน / คุณลักษณะ
- `/setup/reading-thinking` → การประเมิน / อ่าน คิด เขียน
- `/setup/competency` → การประเมิน / สมรรถนะสำคัญ

### Phase 2.6 integration
- ทุก eval grid รับ `readonly` prop จาก page (computed via `semesterStateOf`)
- Server actions เรียก `ensureSemesterEditable(semester)` ก่อน UPSERT
- Past = readonly + banner สีเหลือง · current = editable · future = handled at academic_years state
- Tab "ตั้งค่าคุณลักษณะ" = global (ไม่ผูกภาค) · ไม่ lock

### Skip ใน v1 (เพิ่มภายหลังได้)
- Drag&drop reorder ของ characteristics → ใช้ ↑↓ ก่อน
- Bulk-set (เช่น "ทุกคนได้ 3") — ใช้ characteristic eval มากกว่า
- Manual comments / notes per cell

### ทดสอบ verify
```powershell
pnpm dev
# /setup/characteristics
#   tab settings → list 8 + เพิ่ม + แก้ + ↑↓ + ลบ + โหลด สพฐ. (idempotent)
#   tab evaluate → grid 0-3 click cycle, summary auto
# /setup/reading-thinking → 3 cols + auto summary
# /setup/competency → 5 cols + auto summary
# Phase 2.6 lock test: เปลี่ยน current_semester ที่ academic-years → ดู readonly
```

## ✅ Phase 2.7 polish (2026-05-17) — Dropdown + Bulk column button

ปรับ UX ของ 3 หน้าประเมินตามหลักสูตร:

### เปลี่ยน
- **Cell input**: button cycle (3→2→1→0→empty) → **`<Select>` dropdown** เลือกค่าตรงๆ
- **Column header**: เพิ่ม **ปุ่ม "ทุกคน 3" / "ล้าง"** ใต้ label
  - Toggle: ทั้งคอลัมน์ ≠ 3 → ปุ่ม "ทุกคน 3" (เขียว) · กด → UPSERT ทุก row ในห้อง = 3
  - ทุกคน = 3 → ปุ่ม "ล้าง" (เทา) · กด → DELETE/SET NULL ทั้งคอลัมน์
- **Optimistic state**: เปลี่ยนจาก useState ที่ initialize ครั้งเดียว → optimistic-merge กับ prop · sync เมื่อ save success · revert เมื่อ error
- **Row key**: รวม scores → force remount เมื่อ bulk action เปลี่ยน prop จากภายนอก

### Server actions (เพิ่ม 3)
- `setAllCharacteristicForColumn` — characteristics/actions.ts
- `setAllReadingThinkingForColumn` — reading-thinking/actions.ts
- `setAllCompetencyForColumn` — competency/actions.ts

ทั้ง 3 actions:
- รับ `classroom_id` → fetch enrolled students
- Phase 2.6 lock → `ensureSemesterEditable`
- `value=""` → DELETE/SET NULL · `value="3"` → UPSERT batch
- onConflict UPSERT ทุก row ในห้องพร้อมกัน (1 RPC)

### Files affected
- `_components/fixed-eval-grid.tsx` (reading-thinking + competency reuse)
- `characteristics/eval-grid.tsx`
- 3 actions.ts ของ characteristics/reading-thinking/competency
- 3 page.tsx ส่งต่อ classroomId + bulkAction prop

---

## ✅ Phase 4A: Score-Recording Secondary Redesign — เสร็จ (2026-05-17)

**Pattern**: **Smart UI Plan B** (URL เดียว · detect `classroom.grade_level.system` ภายใน) · ประถม code cold-touch · มัธยม render layout ใหม่

### Behavior matrix (สรุป)

| ส่วน | ประถม | มัธยม |
|---|---|---|
| Tab nav | 3 tabs (ภาค 1, ภาค 2, สรุปผล) — เดิม | 2 tabs (ภาค 1, ภาค 2) — ตัดสรุปออก |
| Page view | summary tab แยก | Single grid (inline เกรด) |
| Column slots | 11 (10 + ปลายภาค) | **12** (5 + กลางภาค + 5 + ปลายภาค) |
| Column groups | ระหว่างภาค (colspan 10) + ปลายภาค | **4 groups**: ก่อน + กลาง + หลัง + ปลาย |
| Grade compute | tab สรุปผลคำนวณ + ปุ่ม save (Plan B แล้วก็ลบไป) | inline column · `cutGrade(rowSum, scales)` รายภาค |
| Past lock | tab readonly | grid readonly + banner |
| Cell widths | กว้างแบบเดิม | **แคบกว่า** เพื่อพอจอ desktop |

### Files (Phase 4A)
```
apps/admin/app/(admin)/setup/score-structure/
├── page.tsx                       ← เพิ่ม isPrimary detection
│                                    · TabNav รับ showSummary prop
│                                    · branch body: secondary → SecondaryScoreGridSection
│                                    · SecondaryScoreGridSection (async server)
├── actions.ts                     ← เพิ่ม ensureSecondaryCategorySlots (migration)
│                                    · ensureCategorySlots คืน is_midterm ด้วย
├── score-grid.tsx                 ← Category type เพิ่ม is_midterm
└── secondary-score-grid.tsx ✨    ← grid ใหม่: 4 groups + 12 slots + grade column
```

### `ensureSecondaryCategorySlots` (key function · 12 slots)
```
1..5   = ก่อนกลางภาค (regular)
6      = กลางภาค (is_midterm=true)
7..11  = หลังกลางภาค (regular · display "6"-"10")
12     = ปลายภาค (is_final=true)
```

**Migration** สำหรับ offering ที่เคยมี 11 slots (จากประถม):
1. Slot 11 (final) → ย้ายไปเป็น slot 12 — เก็บ max_score + scores ทั้งหมด
2. Slot 6 (regular) → mark เป็น is_midterm + เปลี่ยนชื่อเป็น "กลางภาค"
3. หากมี slot ขาดที่ใด ก็ insert ใหม่ (max_score=0)

→ Idempotent · ไม่เสียข้อมูลเก่า · ครู reset max_score กลางภาคใหม่ได้

### `SecondaryScoreGrid` layout
```
┌──┬─────────────┬─ก่อนกลางภาค──┬กลาง┬─หลังกลางภาค──┬ปลาย┬───┬────┐
│# │ ชื่อ – สกุล  │ 1 │2│3│4│5  │สอบ │ 6 │7│8│9│10 │สอบ │รวม │เกรด│
├──┼─────────────┼───┼─┼─┼─┼───┼────┼───┼─┼─┼─┼───┼────┼────┼────┤
│  │ คะแนนเต็ม → │10 10│10│0│0 │ 20 │10 10│10│0│0 │ 20 │100 │ —  │
│1 │ ด.ช.ภาณุพงศ์ │ 4│6│5│ │   │ 11 │ 3│5│4│ │   │ 7  │ 45 │[0.0]│
└──┴─────────────┴─────────────┴────┴─────────────┴────┴────┴────┘
```

### Cell widths (Phase 4A.1 — ลดให้พอจอ)
| Cell | px |
|---|---|
| `num` (#) | 40 |
| `name` (ชื่อ) | 160 |
| `score` (1-5, 7-11) | 48 |
| `exam` (กลางภาค, ปลายภาค) | 56 |
| `total` (รวม) | 56 |
| `grade` (เกรด) | 64 |

**Table min-width** = ~920px · พอดี desktop 1024+px ไม่ต้อง scroll

### Color coding (groups)
- 🔵 ก่อนกลางภาค = sky
- 🔴 กลางภาค = rose
- 🟢 หลังกลางภาค = emerald
- 🟡 ปลายภาค = amber
- 🟣 เกรด = violet pill

### Confirmed defaults (จาก 4 ข้อที่เคยเสนอ)
1. ✅ Phase A scope = secondary only (ประถมไม่กระทบ)
2. ✅ **มี midterm slot** — ใช้ ensureSecondaryCategorySlots
3. ✅ ปุ่ม ภาค 1/2 = active tab + lock applied (เหมือนประถม)
4. ✅ เกรดรายภาค = `cutGrade(sum, scales)` 8 thresholds

### Phase 4B — Polish (เลื่อนไว้)
- ค้นหานักเรียน (search filter)
- Status indicator "บันทึกแล้ว"
- ปุ่ม "ตั้งโครงสร้าง" (modal dialog)
- ปุ่ม "คัดลอกจากห้องอื่น"
- Combined dropdown "ห้อง + วิชา"
- ระบบประถม/มัธยม badge ที่ context bar
- Pass_fail สำหรับมัธยม — ตอนนี้ใช้ PassFailGrid เดิม · review อีกที

---

## ✅ Phase 4B + polish iterations (2026-05-18)

หลายๆ iteration จาก user ใน session เดียวกัน หลังจาก Phase 4A เสร็จ:

### 1. Toolbar features (เพิ่ม-แล้ว-เอาออก)
- **เพิ่ม**: `secondary-score-view.tsx` wrapper · search + status + ตั้งโครงสร้าง dialog + คัดลอกจากห้องอื่น
- **server action**: `copyMaxScoresFromOffering(target, source)` — copy max_scores ระหว่าง offerings
- **ลบ**: user request "เอาแถวออกทั้งแถว" → ลบ `secondary-score-view.tsx` · render `SecondaryScoreGrid` ตรงๆ
- **คงไว้**: `copyMaxScoresFromOffering` ใน actions.ts (เผื่อใช้ภายหลัง · ไม่มี UI ตอนนี้)

### 2. ตัด tab semester ของ secondary ออกหมด
- ก่อน: TabNav 2 tabs (ภาค 1 / 2) เมื่อ secondary
- หลัง: **ไม่มี TabNav** เลย — secondary แสดง current_semester เสมอ
- Logic ใหม่: `tab = !isPrimary ? defaultTab : requestedTab`
- TabNav simplified (ไม่ต้องมี `showSummary` แล้ว เพราะ render เฉพาะ primary)

### 3. Table ขยายเต็มพื้นที่ Card (`w-full`)
- ใช้ `w-full table-fixed` + คง `minWidth` ไว้
- Desktop wider than minWidth → ตารางขยายเต็ม · columns สัดส่วนตาม colgroup
- Mobile narrower → minWidth บังคับให้ scroll
- ทำใน 3 ไฟล์:
  - `score-grid.tsx` (primary)
  - `secondary-score-grid.tsx`
  - `characteristics/eval-grid.tsx` (+ ลด `CHAR_W 120→72` เพื่อให้ 8 คอลัมน์พอจอ)

### 4. คะแนนเกิน max ไม่ clamp + แสดงสีแดง
- **เดิม**: parseScore clamp `score = min(score, max)` ทั้ง client + server
- **ใหม่**: เก็บค่าตามที่กรอกจริง · clamp แค่ DECIMAL(5,2) ceiling = 999.99 (กัน DB overflow)
- **Visual**: input cell ที่ value > max → แดง (`bg-rose-50 border-rose-300 text-rose-700 font-semibold`)
- ใช้ทั้ง primary + secondary:
  - `score-grid.tsx` student score inputs (collect + final) · `parseScore(v)` (ไม่รับ max)
  - `secondary-score-grid.tsx` ScoreCell component · same logic
  - `actions.ts saveScore` ลบ cap

### 5. สรุปการประเมิน — เปลี่ยน % → mode (ฐานนิยม)
- **เดิม**: average % → 80/70/50 threshold
- **ใหม่**: **mode** ของคะแนน · ties → ต่ำกว่า (conservative)
- **Gating**: ถ้ามี 0 ตัวใดตัวหนึ่ง → "ไม่ผ่าน" (เหมือนเดิม)
- ใช้ใน `lib/curriculum-eval-utils.ts → summarize0to3()`
- กระทบ 3 หน้า: คุณลักษณะ · อ่าน-คิด-เขียน · สมรรถนะ

```ts
// Examples:
//   [2,2,3,3,3,2,2,3]  → mode 2 vs 3 tied → "ดี" (lower)
//   [3,3,3,1,2,2,3,3]  → mode 3 → "ดีเยี่ยม"
//   [3,3,0,3,3,3,3,3]  → any 0 → "ไม่ผ่าน"
```

### 6. Renaming labels
- **"ประเมินคุณลักษณะ" → "ประเมินคุณลักษณะอันพึงประสงค์"** (long form)
  - Tab 2 ที่ `/setup/characteristics`
  - PageHeader title (3 จุด)
  - empty-state message
- **"อ่าน คิด เขียน" → "การอ่าน คิดวิเคราะห์ และเขียน"** (long form)
  - browser tab title
  - PageHeader title (3 จุด)
- **ยกเว้น**: Sidebar เมนู + Breadcrumb → คงสั้น (`คุณลักษณะ`, `อ่าน คิด เขียน`) เพื่อกระชับ

### Files ที่แก้
```
apps/admin/app/(admin)/setup/score-structure/
├── page.tsx                    ← isPrimary branch · TabNav primary-only ·
│                                  SecondaryScoreGridSection (ลบ yearId)
├── actions.ts                  ← saveScore ลบ cap · เก็บ copyMaxScoresFromOffering
├── score-grid.tsx              ← w-full · parseScore(v) · over-max red highlight
├── secondary-score-grid.tsx    ← w-full · over-max red · ScoreCell wraps logic
└── secondary-score-view.tsx    ← ลบไฟล์ (ไม่ใช้แล้ว)

apps/admin/app/(admin)/setup/characteristics/
├── page.tsx                    ← title + tab labels เป็น long form
└── eval-grid.tsx               ← w-full · CHAR_W 120→72 + อื่นๆ ลด

apps/admin/app/(admin)/setup/reading-thinking/
└── page.tsx                    ← title "การอ่าน คิดวิเคราะห์ และเขียน"

apps/admin/lib/
└── curriculum-eval-utils.ts    ← summarize0to3() ใช้ mode + tie-break lower
```

---

### Session ต่อไป — Phase 3 ออก ปพ.5/ปพ.6 (PDF)

**สิ่งที่เสร็จไปแล้ว**: Phase 1 ครบ · B Design Polish · packages/ui · 2.1.A-C Subjects+Plans · 2.2 จัดครู · 2.3 บันทึกคะแนน · **2.4 สรุปผล/ตัดเกรด (Plan B compute on-the-fly)** · 2.5 บันทึกเวลาเรียน · ตั้งค่าวันหยุด · Sidebar redesign · Mobile polish · **2.6 ภาคเรียนปัจจุบัน + Lock** · **2.7 ประเมินตามหลักสูตร (+ polish)** · **4A Secondary Score Grid** · **4B polish iterations**

**ทดสอบ verify quick:**
```powershell
pnpm dev
# /setup/academic-years/[id] → dropdown "ภาคเรียนปัจจุบัน" (เปลี่ยน → lock เปลี่ยน)
# /setup/subjects → 2-col layout + คัดลอก plan
# /setup/teaching → assign ครู 1 ครั้ง → save ทั้ง ภาค 1+2 อัตโนมัติ
# /setup/score-structure → 3 tabs (default = current_semester)
#   ├─ Past tab: 🔒 banner · inputs disabled (numeric + pass_fail)
#   ├─ Current tab: editable ตามปกติ
#   ├─ Future tab: ⏳ placeholder (ไม่ render grid)
#   └─ Summary: คอลัมน์ภาคที่ยังไม่ถึง = "—"
# /setup/attendance → default term = current
#   ├─ Past/Future tab decoration เหมือนกัน + readonly logic
# /setup/holidays → seed Thai standard + CRUD + auto-substitute on weekend
# /setup/characteristics → 2 sub-tabs (settings + evaluate)
# /setup/reading-thinking → 3-col grid
# /setup/competency → 5-col grid
```

**เริ่ม Phase 3** — บอก Claude: **"ลุย Phase 3 ออก ปพ.5"** (PDF ของประถม + มัธยม)

**Phase 3 — ออกเอกสาร ปพ.5/ปพ.6 PDF:**
- ⬜ PDF generation ของ ปพ.5 (รายปี + รายภาค สลับเลือกได้)
- ⬜ PDF generation ของ ปพ.6 (สรุปประจำปี)
- ⬜ พิจารณา library — pdf-lib / Puppeteer / jsPDF
- ⬜ Print preview UI (`/reports/pp5?classroom=X&semester=Y|annual`)
- ⬜ Embed Thai font (Sarabun / TH Sarabun PSK / Kanit)

**Phase 2.4 follow-ups (เผื่ออนาคต)**:
- ⬜ มัธยม per-semester grading (Phase 4)
- ⬜ `is_incomplete` (ร — รอประเมิน)
- ⬜ `is_no_eligibility` (มส — เวลาเรียน < 80%) → auto-set จาก attendance
- ⬜ `manual_override` — ครูแก้เกรดเองทับ auto-cut
- ⬜ Multi-user (ครู login เห็นเฉพาะวิชา/ห้องของตน) — Phase 5

> 💡 Pattern ที่ established แล้ว:
> - 2-col layout (subjects page)
> - Selector + tabs + auto-load on change (score-structure / attendance)
> - **`<Suspense key={params}>`** ให้ spinner ตอน RSC refetch
> - Auto-save on blur with useTransition (per-cell)
> - **Compute on-the-fly grades** (Plan B — single source of truth = scores)
> - Self-healing data (ensureCategorySlots, auto-create offerings, auto-mirror semester)
> - UPSERT preserves child data (offering teacher_id change keeps scores)
> - Mobile sticky table: **inline `style={{ width }}` on `<col>` + cells** + `min-width` on table
> - Title abbreviation (ด.ช./ด.ญ./น.ส.) + truncate for long names
> - Discriminated union props for table modes (numeric vs pass_fail)
> - **Smart UI per system** (`grade_level.system` detects primary/secondary inside same URL)

### Regenerate types เมื่อ schema เปลี่ยน
```powershell
pnpm.cmd supabase login   # ครั้งแรกของเครื่องเท่านั้น (token เก็บไว้แล้ว)
pnpm db:types             # regen types จาก live DB
```

### Reset password (ถ้าลืม)
```sql
UPDATE auth.users
SET encrypted_password = crypt('new_password', gen_salt('bf'))
WHERE email = 'admin@admin.pp5.local';   -- หรือ '66012345@student.pp5.local'
```

### Troubleshooting

| ปัญหา | สาเหตุ | แก้ |
|------|------|-----|
| "An unexpected response was received from the server" หลัง HMR | Server Action ID เก่าหลัง dev hot reload | **Hard refresh** (Ctrl+Shift+R) |
| Redirect loop ระหว่าง / กับ /login | Cookie ของอีก app ทับกัน (ไม่ควรเกิดถ้าตั้ง env แล้ว) | ลบ cookies localhost ทั้งหมด · restart dev |
| Login ได้แต่ session หายอย่างไว | Cookie name ของ 2 apps เท่ากัน | เช็ค `NEXT_PUBLIC_SUPABASE_AUTH_STORAGE_KEY` ใน .env.local ทั้ง 2 app ต้องต่างกัน |
| Table borders หาย / ไม่มี padding (Tailwind v4) | preflight reset `border-width: 0` บนทุก element + custom CSS ใช้ shorthand `border:` อาจไม่ทันบางจังหวะ | ใช้ explicit `border-width/style/color` แยกบรรทัด แทน shorthand |

---

## ✅ Phase 3 ปพ.5 รายวิชา — เสร็จ (2026-05-17)

**Per-subject report** (`/reports/pp5?classroom=X&subject=Y&semester=Z`) — แสดงตารางคะแนน + ลายเซ็น พร้อมพิมพ์ผ่าน browser

### Layout final
- **Title**: `แบบบันทึกผลการเรียนประจำรายวิชา` + ชื่อโรงเรียน + สังกัด (เล็กกว่า title)
- **Info grid 3 col**: ชั้น (full name `ชั้นประถมศึกษาปีที่ 1/1`) | ปีการศึกษา | ภาคเรียน + รหัสวิชา | ชื่อวิชา | หน่วยกิต
- **Table**: smart UI ตาม `subject.grading_mode`
  - `numeric` primary → 11 cells (10 ระหว่างภาค + final)
  - `numeric` secondary → 12 cells (5 ก่อน + กลางภาค + 5 หลัง + ปลายภาค)
  - `pass_fail` → ที่/เลข/ชื่อ/ผลการประเมิน (ผ่าน/ไม่ผ่าน)
- **Footer signers (3-4 คน, แถวเดียว)**: ครูประจำวิชา → หัวหน้างานวัดผล (`assessment_officer_name`) → (รองผอ. `deputy_director_name` ถ้ามี) → ผอ.
- ลบบรรทัด "วันที่ ____" ออกหมด
- ลบบล็อกครูประจำชั้น ออก

### Schema reuse (ไม่ต้อง migration)
ฟิลด์ใน `schools` ที่มีอยู่แล้ว:
- `director_name`, `director_title` (default 'ผู้อำนวยการ')
- `deputy_director_name` (nullable — มี/ไม่มีก็ได้)
- `academic_head_name` — "ลงนาม ปพ.5 รวมห้อง" (ไม่ใช้ในรายวิชา)
- `assessment_officer_name` — "ลงนาม ปพ.5" (ใช้ในรายวิชา ✓)

### CSS — `globals.css`
- `.pp5-page`, `.pp5-toolbar`, `.pp5-header`, `.pp5-info-grid`, `.pp5-table`, `.pp5-footer` (พื้นฐาน)
- `@page { size: A4 portrait; margin: 14mm 12mm }` (default)
- `.pp5-footer { display: flex; gap: 0.75rem }` + `.pp5-sig-block { flex: 1 1 0 }` (บังคับแถวเดียว)

### Hide elements on print
- เพิ่ม `.no-print` class ใน `MobileHeader` + `PageContextBar` → ไม่แสดงตอน Ctrl+P
- `@media print` rule: `aside, nav, .no-print, [data-no-print="true"] { display: none !important }`

### Print button cleanup
- ลบ `target="_blank"` — เปิดในแท็บเดิม (มีลิงก์ "← กลับไปหน้าบันทึกคะแนน")
- เปลี่ยน label "พิมพ์ ปพ.5" → "พิมพ์รายงาน" (จะใช้กับรายงานอื่นด้วย)

### Files
```
apps/admin/app/(admin)/reports/pp5/
├── page.tsx                ← server component · branch ตาม grading_mode
└── print-button.tsx        ← client · window.print()

apps/admin/app/(admin)/_components/
├── mobile-header.tsx       ← + no-print class
└── page-context-bar.tsx    ← + no-print class

apps/admin/app/(admin)/setup/score-structure/page.tsx
└── Pp5PrintLink             ← target=_blank removed · "พิมพ์รายงาน"

apps/admin/app/globals.css   ← .pp5-* + .no-print + @page rule
```

---

## ✅ Phase 3 พิมพ์รายงานเวลาเรียน รายเดือน — เสร็จ (2026-05-17)

**Monthly attendance report** (`/reports/attendance?classroom=X&year=Y&month=Z&term=T`)

### Layout
- **Title**: `แบบบันทึกเวลาเรียน ชั้นประถมศึกษาปีที่ 1/1` (class label inline)
- **Info grid 4 col**: เดือน (full Thai name "มกราคม") | วันทำการ N วัน | ปีการศึกษา | ภาคเรียน
- **Table** (table-layout: fixed)
  - 3-row thead: ที่/ชื่อ (rowspan 3) | วันที่ (col×dim) | สรุป (col×4 rowspan 2)
    - Row 2 of thead: วันของสัปดาห์ (อา จ อ พ พฤ ศ ส)
    - Row 3: เลขวันที่ (1-31)
  - Day cells:
    - workday → status char ( `/` มา / × ขาด / ล ลา / ป ป่วย )
    - non-workday → ทินต์ (เหลือง=weekend, แดง=holiday, เทา=non-workday อื่นๆ)
  - สรุป 4 cols: มา | ขาด | ลา | **ร้อยละ** (`present/workdays × 100`, 1 ตำแหน่งทศนิยม)
- **Footer signers**: ครูประจำชั้น → หัวหน้างานวัดผล → (รองผอ.) → ผอ.

### CSS — print portrait narrow
- `@page att-portrait-narrow { size: A4 portrait; margin: 6mm 5mm }` (named page)
- `.att-page { page: att-portrait-narrow }` (กระทบเฉพาะหน้านี้ ไม่ชน ปพ.5)
- Print: `.att-table { width: auto; margin: auto }` (shrink-fit + จัดกลาง)
- Print col widths สำหรับ 31 วัน:
  - ที่: 18px · ชื่อ: 75px · สรุป×3: 22px · ร้อยละ: 44px = 203px ฟิกซ์
  - วัน: 13px × 31 = 403px (`font-size: 7px`, `padding: 0.05rem 0`)
  - รวม ≈ 606px ในพื้นที่ ~756px → จัดกลาง

### Screen (preview)
- `.att-table { width: auto; max-width: 100%; margin: 1rem auto }`
- ช่องวัน: 20px (explicit), font-size: 10px
- ร้อยละ: 72px

### THAI_MONTH_FULL
เพิ่ม array ใน `calendar.ts` (มกราคม กุมภาพันธ์ ฯลฯ) — ใช้ในรายงาน

### Print button
- ปุ่ม "พิมพ์รายงาน" บนหน้า `/setup/attendance` ใน Card header (ขวาบน)
- แสดงเมื่อ `tab !== "summary" && !isTermSummary` (mode สรุปไม่มีปุ่ม — รอ Step 3)
- เปิดในแท็บเดิม

### Files
```
apps/admin/app/(admin)/reports/attendance/
└── page.tsx                ← server component · monthly grid + footer

apps/admin/app/(admin)/setup/attendance/
├── page.tsx                ← + Printer import · ปุ่มในหัว Card
└── calendar.ts             ← + THAI_MONTH_FULL[]

apps/admin/app/globals.css  ← .att-page · .att-table · .att-info-grid (4-col)
                              .att-day · .att-weekend · .att-holiday · .att-nonwork
                              @page att-portrait-narrow
```

---

## ✅ Phase 3 หน้าสรุปเวลาเรียน + per-term summary — เสร็จ (2026-05-17)

**Summary view** ใน `/setup/attendance` (replace placeholder)

### `summary-section.tsx` (server component)
รับ props: `classroomId, yearBe, term?: 1 | 2`
- `term` undefined → ทั้งปี (11 เดือน + group header เทอม 1/2)
- `term` 1 → เฉพาะเทอม 1 (6 เดือน, ไม่มี group header)
- `term` 2 → เฉพาะเทอม 2 (5 เดือน, ไม่มี group header)

### Layout
- คอลัมน์: ที่ | ชื่อ-สกุล | (เดือนๆ) | สรุป (5 cols: รวมวัน/มา/ขาด/ลา/ร้อยละ)
- **แถววันทำการ** (เหมือน คะแนนเต็ม ใน ปพ.5): แสดงจำนวนวันทำการแต่ละเดือน
- แต่ละเซลล์เดือน: present count (วันที่นักเรียนคนนั้นมาในเดือนนั้น)
- ป่วย (sick) ม้วนรวมเป็น "ลา" ในแถวสรุป

### URL routing
- `tab === "summary"` → full year (ทั้ง 2 เทอม)
- `tab === "1" | "2"` + `month=-1` → per-term summary (เทอมเดียว)
- ปุ่ม "สรุป" ใต้แท็บเดือน → highlight ฟ้าเมื่อ active

### CSS — `.att-summary-table` (polished)
- เส้นขอบ explicit `border-width/style/color` (กัน Tailwind v4 preflight)
- กลุ่ม "เทอม 1/2": `#dbeafe` blue-100 + `#1e3a8a` blue-900 bold
- แถววันทำการ: `#fef9c3` yellow-100 + `#713f12` yellow-900 bold
- Hover row: `#f4f4f5` zinc-100
- `font-variant-numeric: tabular-nums` (ตัวเลขกว้างเท่ากัน)

### Files
```
apps/admin/app/(admin)/setup/attendance/
├── page.tsx                ← + isTermSummary parsing · 2 branches render
└── summary-section.tsx     ← ใหม่ · server component

apps/admin/app/globals.css  ← + .att-summary-table styles
```

---

## ⬜ ค้าง (ทำต่อ session ถัดไป)

### A. พิมพ์สรุปเวลาเรียน (Step 3)
ขยาย `/reports/attendance` รองรับ summary mode:
- `?mode=summary&classroom=X&year=Y` → ทั้งปี
- `?mode=summary&classroom=X&year=Y&term=1|2` → เทอมเดียว
- หรือใช้ route ใหม่ `/reports/attendance/summary`
- ใส่ปุ่ม "พิมพ์รายงาน" บน:
  - แท็บ 🏆 สรุปรวม → พิมพ์ทั้งปี
  - แท็บ "สรุป" ใต้เทอม 1/2 → พิมพ์เทอมเดียว

### B. ประถม — ลบล็อกเทอม (new requirement)
- เดิม: เทอม past = readonly · current = editable · future = ⏳ banner
- ใหม่: สำหรับ **ประถม** ให้แก้ได้ตลอด 2 เทอม (ไม่ lock)
- แก้ `termState` หรือ pass `readonly=false` เสมอเมื่อ grade.system === "primary"

### C. มัธยม — ออกแบบหน้าบันทึกเวลาเรียนใหม่
ยังไม่ตัดสินใจ user กำลังพิจารณา 3 แบบ:
- **A) Per-period** — บันทึกรายคาบ (ต้องมี timetable ก่อน)
- **B) Per-offering** — ครูประจำวิชาบันทึกเอง (ตรงเกณฑ์ สพฐ. "≥ 80% ต่อวิชา")
- **C) Per-day (เหมือนประถม)** — ง่ายสุด แต่ไม่ละเอียดวิชา

มาตรฐาน สพฐ. นิยมแบบ B → คาดว่า user จะเลือกนี้

### Test verify (เมื่อกลับมา)
```powershell
pnpm dev
# /reports/pp5?classroom=X&subject=Y&semester=Z → ดูตัวอย่าง + Ctrl+P
#   ├─ Title มีชั้น · Info grid 3 col · Footer 3-4 ลายเซ็นแถวเดียว ไม่มีวันที่
# /reports/attendance?classroom=X&year=Y&month=Z&term=T → ตารางเช็คชื่อ portrait
# /setup/attendance → 🏆 สรุปรวม tab → ตารางสรุปทั้งปี
#   ├─ กดเทอม 1 หรือ 2 → ปุ่ม "สรุป" ใต้แถวเดือน → per-term summary
```

---

## ✅ Direct-print (no preview) — เสร็จ (2026-05-17)

ทุกปุ่ม "พิมพ์รายงาน" ในระบบ ตอนนี้กดแล้วเปิดหน้าต่าง print ของเบราว์เซอร์ทันที — ไม่ผ่านหน้า preview

### `DirectPrintButton` (shared)
```
apps/admin/app/(admin)/_components/direct-print-button.tsx
```
- โหลด URL ใน hidden iframe (right -9999px, w/h 1px, opacity 0)
- `iframe.onload` → defer 300ms → `iframe.contentWindow.print()`
- Same-origin → cookies ส่งไป → auth ทำงาน · `globals.css` `.no-print` + `@page` rules ทำงานใน iframe context
- Fallback: ถ้า print fail → `window.open(url, "_blank")`
- Safety timeout 8s (กัน onload ไม่ยิง)
- Loading state ("กำลังเตรียม...") + spinner
- Cleanup iframe หลัง 1.5s

### Used by
- ปุ่ม "พิมพ์รายงาน" ที่ `/setup/score-structure` (ปพ.5 รายวิชา)
- ปุ่ม "พิมพ์รายงาน" ที่ `/setup/attendance` (monthly + per-term summary + full-year summary)

---

## ✅ Print summary attendance — เสร็จ (2026-05-17)

`/reports/attendance?mode=summary&classroom=X&year=Y[&term=1|2]` รองรับ summary mode

### Logic
- `mode=summary` (no term) → ทั้งปี (11 เดือน + group headers)
- `mode=summary&term=1` → เทอม 1 (6 เดือน, no group headers)
- `mode=summary&term=2` → เทอม 2 (5 เดือน, no group headers)
- `SummaryReport()` component ใน `/reports/attendance/page.tsx`
- Reuse `AttendanceSummarySection` จาก setup/attendance
- Header info grid 3 col: ขอบเขต | ปีการศึกษา | ครูประจำชั้น (ไม่มีเดือน/วันทำการ)
- Footer signers เหมือนเดิม (ครูประจำชั้น → หัวหน้างานวัดผล → (รองผอ.) → ผอ.)

### Per-term print CSS (`.att-summary-term` scope)
ใช้ class เพิ่ม `att-summary-term` เมื่อ term ระบุ → ตั้งความกว้าง column ฟิกซ์:
- เดือน/ห้อง: 28px
- รวมวัน/มา/ขาด/ลา (`att-sum-col`): 30px
- ร้อยละ (`att-pct-col`): 52px
- เพิ่ม classes `att-month-cell` / `att-sum-col` / `att-pct-col` ใน `summary-section.tsx`

### Table width fill page
Print: `.att-summary-table { width: 100%; margin: 0; }` — explicit widths กลายเป็น ratio (stretch proportionally)

---

## ✅ Phase X.A: Students gating + filter — เสร็จ (2026-05-17)

หน้า `/setup/students` ค่าเริ่มต้น = ไม่แสดงรายชื่อ ให้เลือกชั้น (+ ห้อง ถ้ามีหลายห้อง) ก่อน

### Behavior
- **ไม่เลือกชั้น** → empty state "เลือกชั้นเพื่อแสดงรายชื่อนักเรียน"
- **เลือกชั้น + ชั้นมี 1 ห้อง** → แสดงรายชื่อทันที
- **เลือกชั้น + ชั้นมี 2+ ห้อง** → แสดง RoomFilter dropdown → "เลือกห้องเพื่อแสดงรายชื่อนักเรียน"
- **เลือกครบ** → แสดงรายชื่อกรองตาม grade + room

### Components
- **`GradeFilter`** (ปรับ) — เพิ่ม props `placeholder` + `clearParams`
  - `clearParams={["room"]}` → เปลี่ยนชั้นแล้วเคลียร์ room URL param
- **`RoomFilter`** (ใหม่) — URL-param-driven dropdown (param "room", value = classroom_id)

### URL params
- `?grade=<grade_id>` — เลือกชั้น
- `?grade=<gid>&room=<classroom_id>` — เลือกชั้น + ห้อง

---

## ✅ Excel Import นักเรียน — เสร็จ (2026-05-17)

Bulk import นักเรียนจากไฟล์ Excel `.xlsx` พร้อม validation 4 ระดับ + progress overlay

### Package
- ติดตั้ง `exceljs ^4.4.0` (โดย `pnpm.cmd add exceljs` ใน apps/admin)
- เลือกแทน xlsx เพราะ exceljs maintained ดีกว่า + ไม่มี CVE-2023-30533

### Files
```
apps/admin/app/api/students/template/route.ts   # ใหม่ — Template download endpoint
apps/admin/app/(admin)/setup/students/
├── import/
│   ├── page.tsx                                # ใหม่ — render ImportWizard
│   ├── import-wizard.tsx                       # ใหม่ — client state machine
│   └── actions.ts                              # ใหม่ — server actions
└── page.tsx                                    # + ปุ่ม "นำเข้าจาก Excel"
```

### Template (`/api/students/template`)
- Sheet "นักเรียน": header 6 cols (เลขประจำตัว · คำนำหน้า · ชื่อ · นามสกุล · ชั้น · ห้อง) + 1 sample row
- Sheet "คำอธิบาย": อธิบายค่าที่ใช้ในแต่ละ column
- Auth: admin only (401 ถ้าไม่ใช่)
- Headers: `Content-Type: openxmlformats-officedocument.spreadsheetml.sheet` + `Content-Disposition: attachment`

### Validation flow (`parseStudentImport`)
แยกแถวเป็น 4 กลุ่ม (แสดงในแท็บแยก):
1. **valid** — ผ่านทุก check
2. **duplicates** — `student_code` ซ้ำกับ DB หรือซ้ำในไฟล์
3. **invalidClassroom** — ชั้น/ห้องไม่ตรงกับปีปัจจุบัน หรือชั้นมีหลายห้องแต่ไม่ระบุห้อง
4. **missingFields** — ขาด required field หรือคำนำหน้าไม่รู้จัก

### Title normalization
รับทั้งตัวเต็ม + ตัวย่อ → เก็บเป็นตัวเต็ม
- `เด็กชาย` / `ด.ช.` / `ดช.` → "เด็กชาย"
- `เด็กหญิง` / `ด.ญ.` / `ดญ.` → "เด็กหญิง"
- `นางสาว` / `น.ส.` / `นส.` → "นางสาว"
- `นาย` / `นาง` → ตรงๆ
- อื่นๆ → "invalid_title" → ใส่ missingFields

### Grade key normalization
`gradeKey(raw) = raw.trim().replace(/[.\s]/g, "")` → "ป.1" / "ป1" / "ป. 1" → "ป1"

### Empty room support
- ถ้าชั้นมี **1 ห้อง** + กรอกห้องว่าง → ระบบกำหนดห้องนั้นอัตโนมัติ ✓
- ถ้าชั้นมี **2+ ห้อง** + กรอกห้องว่าง → invalid_classroom: "ต้องระบุห้อง"
- ถ้าไม่พบชั้น + กรอกห้องว่าง → invalid_classroom: "ไม่พบชั้น"

### Commit flow (`commitStudentImportBatch` + `finalizeStudentImport`)
แตกเป็น batches 5 แถว/รอบ → progress real-time
- per row: createUser → students insert → enrollments insert (cache max student_number per classroom)
- Cleanup on failure (delete student + auth user)
- batch return `affectedClassroomIds`
- หลัง batch ทั้งหมด → `finalizeStudentImport(ids)` → renumber affected classrooms + revalidate

### UI: ImportWizard state machine
- **idle/parsing** — UploadForm (file input + spinner)
- **preview** — 4 tabs + ตารางรายชื่อต่อแท็บ + ปุ่ม "บันทึก N คน"
- **committing** — **fullscreen overlay** (`fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm`) บล็อกหน้าทั้งหมด
  - Progress bar เขียว + จำนวน processed/total + %
  - "✓ บันทึกสำเร็จแล้ว: N คน" (อัปเดตทุก batch)
  - `beforeunload` event เตือนถ้าจะปิดหน้า
- **done** — ResultView (สำเร็จ N + ตารางล้มเหลว ถ้ามี)

### Default password
`student_code.padStart(6, "0")` — กัน Supabase 6-char min (เช่น "67001" → "067001")

---

## ✅ Bulk delete + per-row delete — เสร็จ (2026-05-17)

### Bulk delete dialog
```
apps/admin/app/(admin)/setup/students/
├── delete-actions.ts        # ใหม่
└── delete-dialog.tsx         # ใหม่ — modal client
```
- ปุ่ม "ลบข้อมูล" (สีแดง outline) ใน PageHeader action
- Modal:
  - Dropdown "เลือกขอบเขตการลบ" → "ทั้งหมด (N คน)" / per-grade (count)
  - หลังเลือก: banner สีแดง "จะลบ N คน (ไม่สามารถกู้คืน)"
  - Text input: ต้องพิมพ์ `ลบข้อมูล` ตรง → ปุ่ม "ลบข้อมูล" enable
  - Click → resolving → deleting (overlay progress + beforeunload) → done (สำเร็จ/ล้มเหลว)
- batch 5 IDs/รอบ · เก็บ affected classroom IDs ข้าม batch → finalize renumber

### Per-row delete
```
apps/admin/app/(admin)/setup/students/delete-single-button.tsx  # ใหม่
```
- ปุ่ม trash icon ข้างปุ่ม pencil (h-7 w-7 · hover red-50/text-red-600)
- Click → small modal max-w-sm:
  - "ลบ **{ชื่อ}** ออกจากระบบทั้งหมด — บัญชี, คะแนน, เวลาเรียน, ฯลฯ"
  - "ไม่สามารถกู้คืน" (red bold)
  - ปุ่ม "ยกเลิก" + "ลบถาวร"
- ใช้ `deleteSingleStudent(id)` wrapper → batch([id]) + finalize → router.refresh

### Schema cascade
`schema.sql` มี `ON DELETE CASCADE` บน FK ทั้งหมดที่ reference `students(id)`:
- enrollments · scores · attendance · grades · student_characteristics · student_reading_thinking · student_competency

ลบ `public.students` → cascade ลูกทุกตัวอัตโนมัติ
`auth_user_id` ไม่ใช่ FK ตรงๆ → ต้องลบ auth.users แยกผ่าน admin API

### Pattern (cleanup safe)
1. Pre-fetch students rows → get auth_user_id + classroom_ids (via enrollments)
2. Delete `public.students` (cascade dependents)
3. Delete `auth.users` via service-role API
4. Renumber affected classrooms

---

## ✅ Renumber after delete + compact rows + manual renumber button (2026-05-17)

### Renumber after delete
- **`deleteStudentsBatch`**: pre-fetch enrollment → คืน `affectedClassroomIds[]`
- **`finalizeStudentDelete(classroomIds)`**: renumber แต่ละห้อง (2-phase update sort by student_code) + revalidate
- **`deleteSingleStudent`**: เรียก finalize อัตโนมัติด้วย IDs ที่ batch คืน
- **Bulk delete dialog**: เก็บ Set ของ affected ข้าม batch → finalize ตอนจบ
- **edit ผ่าน updateStudent**: มี renumber อยู่แล้ว (ห้องเก่า + ห้องใหม่)

### Compact student list rows
| ค่า | ก่อน | หลัง |
|---|---|---|
| Header padding | px-4 py-3 | **px-3 py-2** |
| Cell padding | px-4 py-3 | **px-3 py-1** |
| ปุ่ม pencil/trash | h-8 w-8 | **h-7 w-7** |
| Icon | h-4 w-4 | **h-3.5 w-3.5** |
| Gap ระหว่างปุ่ม | gap-1 | **gap-0.5** |

แต่ละแถวลดสูง ~40% → เห็นรายชื่อได้มากขึ้นต่อจอ

### Manual renumber button
```
apps/admin/app/(admin)/setup/students/renumber-button.tsx  # ใหม่
```
- ปุ่ม "เรียงเลขที่ใหม่" + icon `ListOrdered` ทางขวาของ filter row
- แสดงเฉพาะเมื่อ `displayedClassroomId` resolved (single-room หรือ multi-room+selected)
- ใต้ปุ่ม: "เฉพาะห้อง **{label}** เท่านั้น" (text-zinc-500)
- Click → `renumberClassroomById(id)` → feedback inline สีเขียว "✓ เรียงเลขที่ใหม่แล้ว (N คน)" auto-dismiss 3.5s
- `actions.ts` เพิ่ม `renumberClassroomById(classroomId)` export

---

## ⬜ Pending — Session ถัดไป

### A. เลื่อนชั้นนักเรียน (Promote students wizard)
งานที่ user ขอคู่กับ Excel import ตั้งแต่ตอนแรก
- Wizard เลือก year_source → year_target
- Mapping: ป.1→ป.2 … ป.6→ม.1 (โรงเรียนขยายโอกาส) … ม.2→ม.3 · ม.3 = จบ (ไม่เลื่อน)
- Per-student override (ตก/ซ้ำชั้น)
- Confirmation step

### B. ประถม — ลบล็อกเทอม attendance (small)
- เดิม: เทอม past = readonly
- ใหม่: ประถม → editable ทุกเทอม (ตรวจ `grade.system === "primary"`)
- ที่ `/setup/attendance/page.tsx` `termState` logic

### C. มัธยม — ออกแบบหน้า attendance ใหม่
3 ตัวเลือก:
- **A) Per-period** — รายคาบ (ต้องมี timetable)
- **B) Per-offering** — ครูประจำวิชาบันทึกเอง (ตรงเกณฑ์ สพฐ. "≥ 80% ต่อวิชา") **คาดว่า user จะเลือกนี้**
- **C) Per-day** (เหมือนประถม)

### Test verify (เมื่อกลับมา)
```powershell
pnpm dev
# /setup/students → ไม่แสดงรายชื่อจนกว่าจะเลือกชั้น (และห้อง ถ้ามี 2+ ห้อง)
#   ├─ ปุ่ม "นำเข้าจาก Excel" → /setup/students/import → ดาวน์โหลด template → upload → preview 4 tabs → commit
#   ├─ ปุ่ม "ลบข้อมูล" → modal dropdown + พิมพ์ "ลบข้อมูล" → confirm → progress overlay
#   ├─ ปุ่มถังขยะข้างแก้ไข → ลบรายคน
#   ├─ ปุ่ม "เรียงเลขที่ใหม่" ขวาบนตาราง → renumber ห้องที่กำลังแสดง
# /setup/score-structure → ปุ่ม "พิมพ์รายงาน" → ปพ.5 พิมพ์เลย ไม่ผ่าน preview
# /setup/attendance → ปุ่มทุก context → พิมพ์เลย
```

---

## ✅ "นำเข้าจากภาคเรียน/ปีที่แล้ว" wizard — เสร็จ v1 (2026-05-17)

**เดิม**: ออกแบบเป็น "เลื่อนชั้นนักเรียน" (promote)
**ปรับใหม่**: rebrand → "นำเข้าจากภาคเรียน/ปีที่แล้ว" (import-previous)
**ตำแหน่งไฟล์**: `/setup/students/import-previous/` (ใต้ students namespace)

### Flow
1. ปีต้นทาง/ปลายทาง **fixed** (ลบ dropdown ออก):
   - target = `academic_years` ที่ `is_current = true`
   - source = year_be ของ current ลบ 1 (auto-resolve)
   - ถ้าไม่มี previous year → banner "ไม่พบปีการศึกษา (X-1)"
2. **เลือกชั้น (+ ห้อง ถ้ามี 2+ ห้อง)** ที่จะนำเข้าก่อน — 1 ชั้น/รอบ (ลดเวลานำเข้า)
3. กด "ตรวจสอบรายชื่อ" → loading → preview ตาราง
4. แต่ละแถวมี checkbox "นำเข้า" (uncheck = ข้าม)
5. Status:
   - `will_promote` — ห้องปลายทางพร้อม (`ป.1/1 → ป.2/1`)
   - `will_graduate` — ม.3 → จบการศึกษา (auto, no enrollment created)
   - `no_target` — ไม่พบห้องปลายทาง (admin ต้องสร้าง classroom ก่อน)
   - `already_enrolled` — มี enrollment ในปีปลายทางอยู่แล้ว
6. พิมพ์ `นำเข้า` ยืนยัน → batched commit (5 ต่อชุด) + progress overlay
7. Result: เลื่อนสำเร็จ N + จบ M + ข้าม K (+ failed)

### Files
```
apps/admin/app/(admin)/setup/students/import-previous/
├── page.tsx       — fixed source/target + SourceClassroomsLoader (fetches grades + rooms)
├── wizard.tsx     — ImportPreviousWizard (state machine 5 phase)
└── actions.ts     — getPromotePreview / commitPromoteBatch / finalizePromote

apps/admin/app/(admin)/_components/breadcrumb.tsx
└── + "/setup/students/import" + "/setup/students/import-previous" entries

apps/admin/app/(admin)/setup/students/page.tsx
└── + ปุ่ม "นำเข้าจากปีที่แล้ว" (icon History, emerald border)
```

### Internal naming หลัง rebrand
- File/dir: `import-previous/` (URL-facing)
- Function names: `getPromotePreview` / `commitPromoteBatch` (internal — verb "promote" ยังตรงกับการ map ชั้น+1)
- UI labels: "นำเข้า" / "ภาคเรียนที่แล้ว/ปีที่แล้ว" / "ตรวจสอบรายชื่อ"

---

## ✅ Reframe "ลบ" = ถอนจากปีปัจจุบัน — เสร็จ (2026-05-17)

**Concept change:** "ลบนักเรียน" ตอนนี้หมายถึง "ลบ enrollment จากปีปัจจุบันเท่านั้น" — **ไม่** ลบ student record / auth.users / ประวัติปีก่อน

### พฤติกรรมใหม่
| Action | เดิม | ใหม่ |
|---|---|---|
| ปุ่มถังขยะรายแถว | ลบ student + cascade ทุกตาราง + auth.users | **ลบ enrollment ปีนี้เท่านั้น** + renumber |
| ปุ่ม "ลบข้อมูล" dialog | ลบ student ทั้งหมด | **ลบ enrollments ในปีปัจจุบัน** (ตามชั้นที่เลือก) |
| ประวัติ scores/attendance/grades ปีก่อน | หาย | **คงอยู่** |
| Student record + auth.users | ลบ | **คงอยู่** |

### Renamed actions (`delete-actions.ts`)
- `getStudentsToDelete` → `getEnrollmentsToDelete` (return enrollment IDs)
- `deleteStudentsBatch` → `deleteEnrollmentsBatch` (delete enrollment rows only)
- `finalizeStudentDelete` → `finalizeEnrollmentDelete` (renumber + revalidate)
- `deleteSingleStudent` → `deleteSingleEnrollment` (wrapper)

### UI changes
- **Single delete modal**: title "ลบนักเรียน" → "ลบออกจากห้อง" · icon red→amber · body explains "ประวัติปีก่อนหน้าจะยังคงอยู่"
- **Bulk delete modal**: title "ลบข้อมูลนักเรียน" → "ลบรายชื่อจากปีปัจจุบัน" · confirm phrase "ลบข้อมูล" → "ลบรายชื่อ"
- **page.tsx**: Row type เพิ่ม `enrollment_id` · DeleteSingleStudentButton render เฉพาะเมื่อมี enrollment · totalCount นับเฉพาะ enrolled

---

## ⚠️ Phase 1A-B-D-E.1: Per-semester enrollments — ⚠️ ต้องรัน migration ก่อน (2026-05-17)

**Reason**: สำหรับ **มัธยม** ตัดเกรดรายภาค — student transferring in/out mid-year ไม่ควรกระทบเทอมที่ผ่านแล้ว

### Phase 1A: SQL Migration
`migrations/20260517_enrollments_semester.sql`:
```sql
ALTER TABLE enrollments
  ADD COLUMN semester SMALLINT NOT NULL DEFAULT 0;
-- CHECK constraint: semester IN (0, 1, 2)
-- 0 = ทั้งปี (ประถม · default · backward-compat)
-- 1/2 = เฉพาะภาคเรียน (มัธยม)

-- Drop old UNIQUE: (student_id, classroom_id), (classroom_id, student_number)
-- Add new UNIQUE: (student_id, classroom_id, semester), (classroom_id, semester, student_number)
```

**⚠️ Apply ผ่าน Supabase Dashboard → SQL Editor**
- Device Guard บล็อก supabase CLI → copy paste manual
- ข้อมูลเก่าทั้งหมด semester=0 → ประถมใช้งานต่อได้ปกติ

### Phase 1B: Schema + types.ts patch
- `schema.sql` — `enrollments` รวม `semester SMALLINT NOT NULL DEFAULT 0 CHECK (...)`
- `packages/database/src/types.ts` — Row/Insert/Update ของ enrollments รวม `semester: number`
- Manual patch เพราะ Device Guard ปิด CLI

### Phase 1D: Students page semester-aware
- Query `enrollments` รวม `semester` + classroom.grade_level.system
- Compute `viewSemester`:
  - primary grade selected → 0
  - secondary grade selected → `academic_years.current_semester` (ไม่มี tab override)
- Filter rows ด้วย `enrollment.semester === viewSemester`
- **ลบ semester tabs ออก** (per user): มัธยมแสดง bar เล็กๆ ใต้ filter "กำลังแสดง ภาคเรียนที่ N · เปลี่ยนภาคเรียนปัจจุบัน"
- Per-grade dropdown count = enrollments matching grade's effective semester (primary=0, secondary=current)
- Bulk delete dialog: receive `currentSemester` prop, server scopes accordingly

### Phase 1E.1: createStudent + updateStudent + form semester-aware
- `parseForm` รับ `semester: 1 | 2`
- `createStudent` look up `classroom.grade_level.system`:
  - primary → force semester=0
  - secondary → use form value (default current_semester)
- `updateStudent` 
  - เก็บ `oldSemester` จาก existing enrollment → renumber old classroom × old semester
  - ห้องใหม่: look up system → apply rule
- `renumberClassroom` helper รับ `semester` param (filter + 2-phase update scoped)
- `renumberClassroomById` action รับ semester (button passes `viewSemester`)
- `StudentForm`:
  - Props: `currentSemester` + `ClassroomOption.system`
  - State `selectedClassroomId` track classroom → show `<Select name="semester">` เฉพาะ secondary
  - Suffix " (มัธยม)" ใน option label

### Files updated
```
apps/admin/app/(admin)/setup/students/
├── actions.ts              ← parseForm + create/update + renumber + renumberById
├── delete-actions.ts       ← renamed actions · enrollment-scoped · currentSemester param
├── delete-dialog.tsx       ← currentSemester prop · rewording
├── delete-single-button.tsx ← enrollmentId prop · "ลบออกจากห้อง"
├── student-form.tsx        ← + system in ClassroomOption · semester picker conditional
├── new/page.tsx            ← fetch + pass currentSemester · system in classrooms
├── [id]/page.tsx           ← fetch existing semester + pass to form
├── page.tsx                ← semester-aware view · counts · totalStudentCount
└── renumber-button.tsx     ← semester prop

migrations/20260517_enrollments_semester.sql  ← apply via Dashboard
schema.sql                                     ← + semester column documented
packages/database/src/types.ts                 ← + semester in Row/Insert/Update
```

---

## ⬜ Pending — ต่อ session ถัดไป

### A. **ต้องทำก่อน:** Apply migration ใน Dashboard
- เปิด `migrations/20260517_enrollments_semester.sql`
- Paste ใน Supabase Dashboard → SQL Editor → Run
- ตรวจ Table Editor: `enrollments` มี `semester` column (default 0)
- Test: /setup/students → error "column enrollments_1.semester does not exist" ต้องหาย

### B. Phase 1E.2: Excel import semester-aware
- รองรับ template column "ภาคเรียน" (optional, ใช้กับมัธยม)
- Parse: ถ้า row's classroom เป็น secondary → ใช้ semester ใน Excel (default current)
- ถ้า primary → semester=0

### C. Phase 1E.3: Import-previous wizard semester scoping
- For secondary intra-year (sem 1 → sem 2 ในปีเดียวกัน):
  - source = current year + sem 1
  - target = current year + sem 2
  - no grade advancement (same classroom)
- For secondary cross-year (prev year sem 2 → this year sem 1):
  - same as primary cross-year logic + semester transition
- For primary: as-is (year-only, sem=0)
- Auto-resolve source based on `currentSemester` + selected grade.system

### D. Phase 2: Downstream queries semester-aware
- `/setup/score-structure` · `/setup/attendance` · `/setup/characteristics` ·
  `/setup/reading-thinking` · `/setup/competency` · `/reports/pp5` · `/reports/attendance`
- ต้องกรอง `enrollments` ด้วย:
  - `WHERE semester = 0 OR semester = :currentSemester` (เพื่อ backward-compat กับ semester=0)
  - หรือ strict: `semester = (grade.system === 'secondary' ? currentSemester : 0)`

### E. Phase 2B: จัดครูสอน per-semester
- เดิม Annual → ต้อง split ต่อภาคเรียนสำหรับมัธยม
- Schema: `subject_offerings` มี semester อยู่แล้ว
- `teacher_assignments` ต้องเช็คว่า scoping ระดับใด

### F. Other pending
- ประถม: ลบล็อกเทอม (attendance editable across both)
- มัธยม: ออกแบบหน้าบันทึกเวลาเรียน (per-period / per-offering / per-day)

---

## ✅ Phase 1D + 1E.1: Students semester-aware (form + page) — เสร็จ (2026-05-17 cont.)

### Phase 1D — Students page (no tabs · current_semester only)
- Query `enrollments` รวม `semester` + `system`
- Compute `viewSemester`:
  - primary → 0
  - secondary → `academic_years.current_semester` (ลบ semester tabs ออก per user · แสดงเป็นบรรทัดเล็กๆ ใต้ filter "กำลังแสดง ภาคเรียนที่ N · เปลี่ยนภาคเรียนปัจจุบัน")
- Filter rows ด้วย `enrollment.semester === viewSemester`
- Counts dropdown per-grade: primary นับ sem=0, secondary นับ sem=current
- DeleteStudentsDialog + DeleteSingleStudentButton + RenumberClassroomButton ทุกตัวรับ semester-aware

### Phase 1E.1 — Forms (new + edit)
- `parseForm` รับ `semester: 1 | 2`
- `createStudent`:
  - Look up `classroom.grade_level.system`
  - primary → force semester=0 · secondary → use form value
  - Insert enrollment พร้อม semester · renumber per (classroom, semester)
- `updateStudent`:
  - เก็บ oldSemester จาก existing → renumber ห้องเก่า × old semester
  - ห้องใหม่: look up system → apply rule
- `renumberClassroom` helper รับ `semester` param + filter
- `renumberClassroomById` action รับ semester arg (button passes viewSemester)
- `StudentForm`:
  - Props: `currentSemester` + `ClassroomOption.system`
  - State `selectedClassroomId` track → show semester `<Select>` เฉพาะ secondary
  - Suffix " (มัธยม)" ใน option

### Files updated
```
apps/admin/app/(admin)/setup/students/
├── actions.ts            ← parseForm + create/update + renumber helpers
├── delete-actions.ts     ← enrollment-scoped delete + currentSemester arg
├── delete-dialog.tsx     ← + currentSemester prop · wording
├── delete-single-button.tsx ← enrollmentId prop · "ลบออกจากห้อง"
├── student-form.tsx      ← + system + semester picker conditional
├── new/page.tsx          ← pass currentSemester + system
├── [id]/page.tsx         ← fetch existing semester + pass
├── page.tsx              ← semester-aware view + counts + total
└── renumber-button.tsx   ← semester prop
```

---

## ✅ Phase 1E.3: Import-previous wizard semester-aware — เสร็จ

**Context-aware button:**
- `/setup/students` page:
  - `isSecondaryView` → "นำเข้าจากเทอมที่แล้ว" (`?mode=semester`)
  - else → "นำเข้าจากปีที่แล้ว" (`?mode=year`)

**`/setup/students/import-previous/page.tsx` resolve source/target:**

| Mode | Cur Sem | Source | Target |
|---|---|---|---|
| year | - | prev year, sem=0 | current year, sem=0 |
| semester | 2 | current year, sem=1 | current year, sem=2 (intra-year) |
| semester | 1 | prev year, sem=2 | current year, sem=1 (cross-year) |

- Filter grade dropdown by system: year→primary, semester→secondary
- Title + description เปลี่ยนตาม mode

**`wizard.tsx`:**
- `mode` + `source/target.semester` props
- `YearChip` แสดง "2569 ภาค 1" / "2569 ภาค 2"
- Step 1 ข้อความชัด: intra-year → "ห้องเดิม ชั้นเดิม คนละภาคเรียน" / cross-year → "ห้องเดิม ชั้นถัดไป"
- **ลบ "พิมพ์ยืนยัน" ออก** (per user) — ปุ่ม enable ทันทีเมื่อ finalPromote > 0
- Review summary: "จาก 2569 ภาค 1 → ไป 2569 ภาค 2"

**`actions.ts`:**
- `getPromotePreview(sourceYearId, targetYearId, sourceSemester, targetSemester, sourceClassroomId?)`
- `intraYear = sourceYearId === targetYearId`
- Source enrollments filter `.eq("semester", sourceSemester)`
- alreadyEnrolled check filter `.eq("semester", targetSemester)`
- Mapping:
  - intraYear → same classroom (no grade advance) · status = `will_promote`
  - else → grade+1 same room
- `commitPromoteBatch` insert พร้อม semester · cache by (classroom, semester) pair
- `finalizePromote(classroomIds, semester)` renumber per (classroom, semester)

---

## ✅ Phase 2A-D: Downstream queries semester-aware — เสร็จ (2026-05-17 cont.)

**Pattern ใช้ทุกหน้า:**
```ts
const { data: classroomInfo } = await supabase
  .from("classrooms")
  .select(`grade_level:grade_levels!grade_level_id (system)`)
  .eq("id", classroomId).maybeSingle();
const isSecondary = classroomInfo?.grade_level?.system === "secondary";
const enrollmentSemester: 0 | 1 | 2 = isSecondary ? semester : 0;
// ...
.eq("classroom_id", classroomId)
.eq("semester", enrollmentSemester)
```

**ไฟล์ที่อัปเดต:**

| Phase | File · Function | Note |
|---|---|---|
| 2A | `score-structure/page.tsx ScoreGridSection` | primary-only → sem=0 hardcoded |
| 2A | `score-structure/page.tsx SecondaryScoreGridSection` | secondary-only → sem=passed |
| 2A | `score-structure/page.tsx PassFailGridSection` | + `isPrimary` prop · resolve effective |
| 2A | `score-structure/summary-section.tsx` | primary-only → sem=0 |
| 2B | `attendance/page.tsx MonthGridSection` | look up system → derive semester |
| 2B | `attendance/summary-section.tsx` | **dedupe by student.id** (secondary full-year มี sem 1+2 rows) |
| 2B | `attendance/actions.ts setAllForDay` | derive semester จาก date (semesterFromIsoDate) |
| 2C | `characteristics/page.tsx EvalSection` | system lookup + filter |
| 2C | `reading-thinking/page.tsx GridSection` | system lookup + filter |
| 2C | `competency/page.tsx GridSection` | system lookup + filter |
| 2D | `reports/pp5/page.tsx` | ใช้ `isPrimary` ที่มีอยู่แล้ว |
| 2D | `reports/attendance/page.tsx` | ใช้ `classroom.grade_level.system` ที่ fetch อยู่แล้ว |

หลังจาก Phase 2 เสร็จ: **มัธยมใช้งานได้ end-to-end** ทุกหน้า — บันทึกคะแนน, เวลาเรียน, ประเมินคุณลักษณะ/อ่าน-คิด-เขียน/สมรรถนะ, รายงาน (pp.5 + attendance) ทั้งหมดกรอง enrollment ตาม semester ของ classroom system

---

## ✅ Change Semester button — เสร็จ (2026-05-17 cont.)

หน้า `/setup/academic-years` แถวปีปัจจุบันมีปุ่ม "เปลี่ยนภาคเรียน" ข้าง Badge:

```
ปี 2569 | ปีปัจจุบัน | [ภาคเรียนที่ 2] [⇆ เปลี่ยนภาคเรียน] | ...
```

**`actions.ts setCurrentSemester(formData)`:**
- รับ id + current_semester (1 หรือ 2)
- Update เฉพาะ column ของ row
- revalidate: academic-years + students + score-structure + attendance

**`change-semester-button.tsx`** (client):
- SweetAlert2 radio (1/2) pre-select ภาคเรียนปัจจุบัน
- Validator: ห้ามเลือกเหมือนเดิม
- Pending state spinner

---

## 🚧 Pending — ถัดไป

### A. ~~Apply migrations~~ — ✅ เสร็จทั้งหมด (3 ตัว applied via Dashboard)

### B. ~~Subjects scoping~~ — ✅ เสร็จ (รายละเอียดดูส่วนล่าง "Subjects per-(year, semester)")

### C. ~~Phase 1E.2: Excel import auto-semester~~ — ✅ เสร็จ (รายละเอียดดูส่วนล่าง "Excel import auto-semester")

### D. ~~ประถม: ลบล็อกเทอม attendance~~ — ✅ เสร็จ (รายละเอียดดูส่วนล่าง "Attendance term-lock policy")

### E. ~~มัธยม: ออกแบบหน้า attendance ใหม่~~ — ✅ เสร็จ (รายละเอียดดูส่วนล่าง "Subject-attendance รายวิชา")

### Test verify (เมื่อกลับมา · หลัง apply migrations)
```powershell
pnpm dev
# /setup/academic-years → ปุ่ม "เปลี่ยนภาคเรียน" บนแถวปีปัจจุบัน
# /setup/students → เลือก ม.1 → แสดงเฉพาะ current_semester · มี bar "กำลังแสดง ภาค N"
#   ├─ ปุ่ม "นำเข้าจากเทอมที่แล้ว" → wizard intra-year (sem 1→2) หรือ cross-year (prev sem 2→cur sem 1)
#   ├─ เพิ่ม/แก้ ม.X → form แสดงตัวเลือก "ภาคเรียน"
# /setup/score-structure → ม.X ภาค N → เห็นนักเรียนเฉพาะ enrollment ของ sem N
# /setup/attendance → ม.X → enrollment กรอง ตาม term ของวันที่
# /setup/characteristics + /reading-thinking + /competency → กรองตาม sem
# /reports/pp5 + /reports/attendance → กรองตาม sem
```

---

## ✅ Subjects per-(year, semester) + clone-from-prev — เสร็จ (2026-05-17 cont.)

**Reason:** วิชาเคยเป็น global catalog · แก้วิชาปีนี้กระทบทุกปี · ลบวิชาออกจากแผน A กระทบแผน B
ที่ใช้วิชาเดียวกัน · มัธยมตัดเกรดรายภาค → วิชาภาค 1 และภาค 2 เป็นคนละชุด

**ขอบเขต:**
- ประถม → subjects per `academic_year` (semester=0 = year-wide)
- มัธยม → subjects per `(academic_year, semester)` — ภาค 1 / ภาค 2 = คนละ subjects

### Migration: `migrations/20260517c_subjects_per_year_semester.sql`
```sql
ALTER TABLE subjects
  ADD COLUMN academic_year_id UUID REFERENCES academic_years(id),
  ADD COLUMN semester SMALLINT NOT NULL DEFAULT 0 CHECK (semester IN (0,1,2));

-- Backfill: subjects เก่าทั้งหมด → current year + sem ตาม grade.system
--   primary  → semester=0
--   secondary → academic_year.current_semester

-- Uniqueness: DROP UNIQUE(code) → ADD UNIQUE(code, academic_year_id, semester)
CREATE INDEX idx_subjects_year, idx_subjects_year_semester
```

### Delete-subject = unlink-only (per-plan independent)
- เดิม: ลบวิชา = hard-delete (กระทบทุกแผนที่ใช้)
- ใหม่: ลบวิชาจากแผน X = DELETE FROM `study_plan_subjects` WHERE plan=X AND subject=ID
  - subject record คงอยู่ · แผนอื่นไม่กระทบ · re-link ใหม่ได้ทีหลัง
- Dialog: "ลบวิชา X ออกจากแผนนี้?" · "เอาออกจากแผน" · "ตัววิชายังคงอยู่ในระบบ"
- File: `apps/admin/app/(admin)/setup/subjects/delete-subject-form.tsx`

### Clone subjects from prev year — preview dialog + 3-state logic
**Flow:**
1. Admin กดปุ่ม "นำเข้าจากปีที่แล้ว" (ซ่อนถ้าไม่มีปีก่อนหน้า)
2. Dialog เปิด → fetch source subjects + check status per row
3. Admin ติ๊ก checkbox + (optional) เปลี่ยน source plan
4. กด "ดำเนินการ N วิชา" → bulk insert + revalidate

**3-state per row:**

| Status | Badge | ทำอะไร |
|---|---|---|
| `new` | ✓ เพิ่มใหม่ (เขียว) | INSERT subject + ADD study_plan_subjects link |
| `relink` | ↻ ใส่กลับเข้าแผน (น้ำเงิน) | subject มีอยู่แล้วในปีปัจจุบัน แต่ไม่อยู่ในแผน → ADD link เท่านั้น |
| `in_plan` | • อยู่ในแผนแล้ว (เทา · disabled) | nothing |

**Sort: category → learning_area_sort → code** (ตรงกับ /setup/subjects)

**Source plan dropdown** (ใน toolbar เดียวกับ "เลือกทั้งหมด"):
- เปลี่ยน dropdown → re-fetch in-place · dialog ไม่ปิด · มี inline spinner
- `isReloading` state แยกจาก `phase` เพื่อไม่ unmount dialog
- Disabled: dropdown + "เลือกทั้งหมด" + "ล้างทั้งหมด" ระหว่าง reload

**Source scope:**
- primary → prev year, semester=0
- secondary → prev year, **same semester** (sem 1 ปีก่อน → sem 1 ปีนี้)

### Downstream pages year/semester-aware
หลังจาก subjects scoped per (year, semester) แล้ว · `study_plan_subjects` (per-plan, not year-scoped)
สะสมลิงก์ข้ามปี · ต้อง filter ใน read paths:

| File | Pattern |
|---|---|
| `setup/subjects/page.tsx` | filter `planSubjects` + `subjectCountByPlan` by `academic_year_id` + `effectiveSemester` |
| `setup/teaching/page.tsx` | + currentYearId/effectiveSemester props · in-memory filter หลัง fetch |
| `setup/score-structure/page.tsx` | dedup subjects filter by year + `isPrimary ? 0 : currentSemester` |
| `setup/teaching/actions.ts` saveOfferingAssignments | lookup `subject.semester` → primary (sem=0) เขียน 2 rows · secondary เขียน 1 row เฉพาะภาคของวิชา |

### Files
```
migrations/20260517c_subjects_per_year_semester.sql   ← apply via Dashboard
schema.sql                                             ← subjects + new columns
packages/database/src/types.ts                         ← Row/Insert/Update + academic_year_id + semester

apps/admin/app/(admin)/setup/subjects/
├── actions.ts                  ← createSubject lookup year+semester · deleteSubject unlink-only
│                                  · getCloneSubjectsPreview / commitCloneSubjects + 3-state
│                                  · resolveCloneScope helper · CloneSubjectStatus type
├── page.tsx                    ← previousYearExists guard · effectiveSemester · filter planSubjects
│                                  · sourcePlans prop ส่งเข้า dialog
├── clone-subjects-dialog.tsx   ← state machine idle→loading→preview→committing→done
│                                  · isReloading separate · source plan dropdown in toolbar
└── delete-subject-form.tsx     ← title "ลบวิชา X ออกจากแผนนี้?" · "เอาออกจากแผน"

apps/admin/app/(admin)/setup/teaching/
├── page.tsx                    ← + currentYearId / effectiveSemester props · subject filter
└── actions.ts                  ← saveOfferingAssignments writes correct row count per semester

apps/admin/app/(admin)/setup/score-structure/
└── page.tsx                    ← effectiveSubjectSemester + filter ตอน dedup
```

### Migrations idempotency
- `20260517_enrollments_semester.sql` — เพิ่ม DROP IF EXISTS ของ constraint ชื่อใหม่ก่อน ADD (รันซ้ำได้)
- `20260517b` — UPDATE WHERE semester=0 (no-op รอบ 2)
- `20260517c` — DROP IF EXISTS + ADD pattern + IF NOT EXISTS indexes (idempotent ทุก step)

ทั้ง 3 ตัว wrap ด้วย `BEGIN; ... COMMIT;` → ถ้า error ระหว่างทาง rollback ทันที

---

## ✅ Excel import auto-semester + re-enroll — เสร็จ (2026-05-17 cont.)

**Reason:** หลัง migration #1 enrollments มี column `semester` แล้ว แต่ Excel import
ยัง insert โดยไม่ใส่ semester → ทุก row ได้ semester=0 → นักเรียนมัธยมที่ import
จะไม่แสดงในหน้า /setup/students (เพราะ filter ตาม current_semester) ·
ปัญหาอีกอย่าง: delete-student = unlink-only (เก็บประวัติคะแนนเดิม) → re-import
นักเรียนกลับเข้าไปจะติด duplicate ทั้งที่ลบไปแล้ว

### Design choice: Auto-only (no Excel column override)
- Template Excel เดิม 6 columns ใช้ต่อได้เลย ไม่ต้องแก้
- ระบบคิด semester เองตาม `grade_level.system`:
  - primary  → semester=0 (year-wide)
  - secondary → semester=current_semester
- ถ้าจะ import เข้าภาคที่ยังไม่เปิด ต้องเปลี่ยน current_semester ก่อน
  (ไม่มี per-row override)

### 3-state duplicate check (เหมือน clone-subjects pattern)

| Case | ผล |
|---|---|
| ซ้ำในไฟล์เดียวกัน | block · "ซ้ำกับแถวที่ N" |
| มีใน DB + มี enrollment ที่ (target classroom, target semester) | block · "เลขประจำตัวนี้มีในห้อง/ภาคนี้อยู่แล้ว" |
| มีใน DB แต่ไม่มี enrollment ที่ target | **allow** · re-enroll (reuse students row, no auth.users insert) |
| ไม่มีใน DB | allow · สร้างใหม่ |

Re-enroll path: skip `auth.admin.createUser` + `students.insert` · update name fields
เผื่อ Excel มีแก้ชื่อ · insert enrollment row · default password ของ student เก่าคงไว้

### (classroom, semester) scope tracking
- `enrollments` UNIQUE เปลี่ยนจาก `(classroom_id, student_number)` → `(classroom_id, semester, student_number)`
- `commitStudentImportBatch` cache `maxByScope` keyed by `"classroomId|semester"` แทน per-classroom
- `affectedScopes: Array<{classroomId, semester}>` แทน `affectedClassroomIds: string[]`
- `renumberClassroom(admin, classroomId, semester)` รับ semester + filter (Phase 1/2 negative-temp)
- `finalizeStudentImport(scopes)` renumber ทุก (classroom, semester) pair แยกกัน

### Files
```
apps/admin/app/(admin)/setup/students/import/
├── actions.ts         ← parseStudentImport + commit + finalize semester-aware
│                         · re-enroll path · 3-state duplicate check
└── import-wizard.tsx  ← affected = Set<"classroomId|semester"> · decode ก่อนส่ง finalize
```

### Preview label
- Primary row: `"ป.1/2"` (เหมือนเดิม)
- Secondary row: `"ม.1/1 ภาค 2"` (ต่อท้ายภาค)
- Re-enroll row: ไม่มี decoration พ่วงท้าย (per user preference — visual clean)

---

## ✅ Attendance term-lock policy — เสร็จ (2026-05-17 cont.)

**Reason:** ประถมตัดเกรดรายปี → ไม่ควรมี "เทอมที่ปิดแล้ว" · มัธยมตัดเกรดรายภาค
→ ต้องเห็นเฉพาะภาคปัจจุบัน (ตัด/แก้คะแนนภาคเก่าไม่ได้ — ตัดเกรดไปแล้ว)
Pattern เดียวกับ `/setup/score-structure` ที่มัธยม pin ที่ current_semester

### Primary — both terms editable
- เดิม: past term = `readonly=true` → yellow banner "🔒 เทอม X ถูกล็อค"
- ใหม่: primary's past → override เป็น "current" → ไม่ readonly, ไม่ banner
- Tab nav: 🔒 icon ไม่แสดงบน past tab ของประถมแล้ว (แสดงเป็น tab ปกติ active ได้)
- ไม่กระทบ score-structure (primary scores ยังคง lock per-term เหมือนเดิม —
  ป้องกัน accidental edit หลังตัดเกรดประจำเทอม)

### Secondary — pin to current term (no tab switcher)
- ตัว tab Level 1 (เทอม 1 / เทอม 2 / สรุปรวม) **hidden ทั้งหมด** สำหรับมัธยม
- แทนด้วย bar เล็กๆ: `กำลังแสดง เทอม N (เทอมเรียนปัจจุบันของโรงเรียน) · [เปลี่ยนเทอมปัจจุบัน]`
- ลิงก์ไป `/setup/academic-years` (admin เปลี่ยน semester ที่นั่น)
- `?term=` ใน URL ถูก ignore → `tab = defaultTab` (= currentSemester) เสมอ
- Level 2 (month tabs + "สรุป" pill) คงเดิม — สลับเดือนของภาคปัจจุบันได้

### Write-side guard (defense-in-depth)
- `attendance/actions.ts` มี helper `ensureDateEditableForClassroom(classroomId, date)`:
  - Lookup `classroom.grade_level.system`
  - primary  → **return ทันที** (skip lock)
  - secondary → derive sem จาก date → `ensureSemesterEditable(sem)` ตามเดิม
- Default fallback: lookup fail → ถือเป็น secondary (safer to false-positive on locked)
- ใช้ใน 3 callsite: `toggleWorkday`, `setAllForDay`, `saveAttendance`

### Files
```
apps/admin/app/(admin)/setup/attendance/
├── page.tsx     ← + isPrimary · termState override (primary past → current)
│                  · Level 1 nav wrap ใน {isPrimary && (...)} · มัธยม bar lookup
│                  · tab force = defaultTab สำหรับมัธยม
└── actions.ts   ← ensureDateEditable → ensureDateEditableForClassroom
                   · classroomId-aware · primary skips guard
```

### Result matrix

| Grade | Layout | Past term editable? |
|---|---|---|
| ประถม (ป.X) | 3 tabs: เทอม 1 · เทอม 2 · 🏆 สรุปรวม | ✅ Yes (no lock) |
| มัธยม (ม.X) | ไม่มี tab · bar "กำลังแสดง เทอม N" | ❌ No (ตัดเกรดไปแล้ว) — เปลี่ยน term ผ่าน /setup/academic-years |

---

## ✅ Subject-attendance "รายวิชา" — เสร็จ (2026-05-17 cont.)

**Reason:** ปพ.5 มัธยม นับเวลาเรียนต่อวิชาตามคาบ × สัปดาห์ ตลอด 20 สัปดาห์/ภาค
แบบ "รายวัน" (ครูประจำชั้นเช็คเช้า) เหมาะกับประถมแต่ไม่ตรงมาตรฐานของมัธยม
จึงเพิ่มแบบใหม่ "รายวิชา" — ครูเช็คชื่อต่อวิชา × สัปดาห์ × ช่อง

### Sidebar restructure
ตัด "บันทึกเวลาเรียน" ออกจากกลุ่ม "การประเมิน" → สร้างกลุ่มใหม่:
```
การประเมิน                  (เหลือ 4 รายการ)
├── บันทึกคะแนน
├── คุณลักษณะ
├── อ่าน คิด เขียน
└── สมรรถนะสำคัญ

บันทึกเวลาเรียน              ← กลุ่มใหม่ (icon: CalendarClock)
├── 📅 รายวัน                → /setup/attendance (เดิม)
└── 📚 รายวิชา               → /setup/attendance/by-subject (ใหม่)
```

### Sidebar active-state fix (longest-prefix-wins)
ปัญหา: `/setup/attendance/by-subject` ทำให้ทั้ง "รายวัน" และ "รายวิชา" ขึ้น active
(เพราะ "รายวัน" ที่ `/setup/attendance` match prefix ด้วย)

แก้: เปลี่ยน `isLinkActive(pathname, href)` เป็น 2 helpers:
- `pathMatches(pathname, href)` — prefix/exact match (ใช้สำหรับ section expand
  + section button highlight)
- `findBestMatchHref(pathname, allLinks)` — เลือก href ที่ยาวที่สุดที่ match
  (longest-prefix-wins) → render active เฉพาะ link เดียว

### Schema: `subject_attendance` table
```sql
CREATE TABLE subject_attendance (
  id              UUID PRIMARY KEY,
  offering_id     UUID NOT NULL → subject_offerings ON DELETE CASCADE,
  student_id      UUID NOT NULL → students ON DELETE CASCADE,
  week            SMALLINT NOT NULL CHECK (1-30),
  slot_in_week    SMALLINT NOT NULL CHECK (1-10),
  status          attendance_status NOT NULL,  -- reuse enum, UI ใช้ 3 ค่า
  recorded_at     TIMESTAMPTZ DEFAULT NOW(),
  recorded_by     UUID NULLABLE → teachers,
  UNIQUE(offering_id, student_id, week, slot_in_week)
);
```
RLS: `is_admin()` policy (เหมือน attendance เดิม)
Migration: `migrations/20260517d_subject_attendance.sql`

### Page design
- **URL**: `/setup/attendance/by-subject?grade=X&room=Y&subject=Z&tab=1|2|3|4`
- **Selectors**: ชั้น / ห้อง / วิชา (filter ออก activity + ต้องมี credit_hours > 0
  + scope ตาม `(academic_year, semester)`)
- **มัธยม**: pin ที่ currentSemester (ไม่มี term tab) — bar เล็กๆ "กำลังแสดง เทอม N"
- **4 tabs** × 5 สัปดาห์/tab (1-5, 6-10, 11-15, 16-20)
- **Slots/week** = `Math.round(credit_hours × 2)`:
  - 0.5 หน่วยกิต → 1 ช่อง/สัปดาห์
  - 1.0 หน่วยกิต → 2 ช่อง/สัปดาห์
  - 1.5 หน่วยกิต → 3 ช่อง/สัปดาห์
- **Grid**: rows = นักเรียน · cols = (สัปดาห์ × ช่อง) · cell cycle 4 states:
  - empty → present "/" (เขียว) → absent "-" (แดง) → leave "ล" (เหลือง) → empty
- **Bulk-check button** ✓ ที่หัวแต่ละช่อง → set ทั้งห้องเป็น present (หรือ clear)
- **คอลัมน์ "รวม"** (sticky ขวาสุด): `present/totalSlots` + %
  (เขียว ≥80, เหลือง 60-79, แดง <60)

### Week date labels in header
Header แต่ละ "สัปดาห์ N" แสดงช่วงวันที่ด้วย เช่น "18-22 พ.ค." หรือ "30 พ.ค. - 3 มิ.ย."
(cross-month auto-format)

**Anchor date logic:**
- ภาค 1 anchor = `academic_years.start_date` หรือ fallback `${baseCe}-05-16`
- ภาค 2 anchor = `academic_years.end_date` (REPURPOSED — เดิมความหมาย "วันปิดเทอม")
  หรือ fallback `${baseCe}-11-01`
- ถ้า anchor ตรงเสาร์/อาทิตย์ → เลื่อนไปจันทร์ถัดไป
- ถ้า anchor ตรงอังคาร-ศุกร์ → ถอยกลับวันจันทร์ของสัปดาห์เดียวกัน
- สัปดาห์ N = Mon-Fri 5 วัน · เริ่มจาก anchor's Monday + (N-1) × 7 วัน

### academic_years.end_date repurpose
**ก่อน:** `end_date` = "วันปิดเทอม" (end of school year, ใช้ใน holidays seeding)
**หลัง:** `end_date` = "วันเริ่มภาคเรียนที่ 2" (anchor สำหรับ by-subject week dates)

ไม่ต้องทำ migration (column นั้นๆ ใช้ต่อ แค่เปลี่ยนความหมาย)

- year-form: label "วันปิดเทอม" → "วันเริ่มภาคเรียนที่ 2"
- list page header: เดิม → "วันเริ่มภาคเรียนที่ 2"
- validation: "วันปิดเทอมต้องหลังวันเปิดเทอม" → "วันเริ่มภาค 2 ต้องหลังภาค 1"
- holidays/actions.ts: ไม่ใช้ end_date แล้ว · derive year-end จาก year_be เสมอ:
  `endIso = ${baseCe + 1}-05-15`

### Offering selection fix (primary fallback)
หน้า by-subject ต้องเลือก `subject_offering` ของวิชาที่จะบันทึก attendance ใส่:
- **มัธยม**: subject scoped per (year, semester) → 1 offering/วิชา trivially
- **ประถม**: subject (semester=0) มี 2 offerings (sem 1 + sem 2 mirror)
  → prefer offering ที่ `semester === currentSemester` เสมอ
  → attendance ของ term 1 ลง sem-1 offering · term 2 ลง sem-2 offering
  → สลับ term ที่ /setup/academic-years → คนละชุดข้อมูล

### Files
```
migrations/20260517d_subject_attendance.sql              ← apply via Dashboard
schema.sql                                                ← + subject_attendance documented
packages/database/src/types.ts                            ← + subject_attendance Row/Insert/Update

apps/admin/app/(admin)/_components/sidebar.tsx           ← new group + longest-prefix-wins

apps/admin/app/(admin)/setup/attendance/by-subject/
├── page.tsx                       ← selectors + tab nav + grid section
│                                     · fetch start_date/end_date as anchors
│                                     · resolve offering by currentSemester
├── selector.tsx                   ← grade/room/subject dropdowns
├── subject-attendance-grid.tsx    ← client grid + per-cell save
│                                     · week header shows "สัปดาห์ N · DD-DD MMM"
├── actions.ts                     ← saveSubjectAttendance + setSubjectAttendanceForSlot
└── term-weeks.ts                  ← anchor resolution + Mon-Fri week range helpers
                                     · defaultAnchorIso, resolveAnchorIso,
                                       firstMondayFromAnchor, weekDateRange,
                                       formatWeekRangeLabel

apps/admin/app/(admin)/setup/academic-years/
├── year-form.tsx                  ← labels: "วันเริ่มภาคเรียนที่ 1/2"
├── actions.ts                     ← validation message update
└── page.tsx                       ← list header column labels updated

apps/admin/app/(admin)/setup/holidays/
└── actions.ts                     ← year-end derived from year_be (decouple from end_date)
```

### ⚠️ ต้อง apply migration ก่อนใช้
`migrations/20260517d_subject_attendance.sql` ผ่าน Supabase Dashboard → SQL Editor
- single transaction · idempotent (CREATE TABLE IF NOT EXISTS · DROP POLICY IF EXISTS)
- ตรวจ Table Editor ว่ามี `subject_attendance` (เปล่า) หลังรันสำเร็จ

---

---

## ✅ Cell dropdown UX + width tightening + status "ข" — เสร็จ (2026-05-17 cont.)

**Reason:** Click-cycle UX สับสน (ต้องคลิก 1-4 ครั้งเพื่อเปลี่ยนสถานะ) + ช่องกว้างไป
+ user อยากเปลี่ยน "-" → "ข" สำหรับขาด ให้ตรงกับการใช้กระดาษจริง

### Cell interaction
- เดิม: `<button onClick={cycle}>` cycle เป็น empty → / → - → ล → empty
- ใหม่: `<select>` ใน cell · 4 ตัวเลือก: `—` `/` `ข` `ล` · เลือกแล้ว auto-save
- `appearance-none` ซ่อน dropdown arrow ของ browser → cell ดูสะอาด
- Focus ring สีน้ำเงินรอบ cell ตอนเปิด dropdown

### Width tightening
- เดิม cell select: `h-7 w-10` (40px)
- ใหม่: `h-7 w-7 px-0` (28px) — ลด ~30% · เห็น 5 สัปดาห์ในหน้าเดียวสบาย

### Status label เปลี่ยน
- `absent`: "-" → **"ข"** (ตามการใช้กระดาษ ปพ.5 มัธยม)
- present "/" · leave "ล" คงเดิม
- Legend ด้านล่าง grid อัพเดทด้วย

### Files
```
apps/admin/app/(admin)/setup/attendance/by-subject/
└── subject-attendance-grid.tsx   ← STATUS_LABEL.absent="ข" + parseStatus helper
                                     · <select> per cell · w-7 px-0 · legend
```

---

## ✅ Plan-based subject fetch + nullable teacher — เสร็จ (2026-05-17 cont.)

**Reason:** Admin เพิ่มวิชาในแผนแล้ว แต่หน้า score-structure + by-subject ไม่แสดงวิชาที่ยังไม่จัดครู
เพราะดึงผ่าน `subject_offerings` (มีแค่วิชาที่จัดครูแล้ว) + `teacher_id` เป็น `NOT NULL`
→ สร้าง offering โดยไม่มีครูไม่ได้

User ต้องการ: **บันทึกคะแนน/เวลาเรียนได้ทุกวิชาในแผน** แม้ยังไม่จัดครู · ดร็อปดาวน์แสดง
"(ยังไม่จัดครูเข้าสอน)" หลังชื่อวิชาที่ยังไม่จัดครู

### Migration: `20260517e_offerings_nullable_teacher.sql`
```sql
ALTER TABLE subject_offerings
  ALTER COLUMN teacher_id DROP NOT NULL;
```
- `teacher_id NULL` = "ยังไม่จัดครู" — admin บันทึกได้ก่อน
- Teaching page UPDATE teacher_id ทีหลังเมื่อจัดครูจริง

### Page refactor (score-structure + by-subject)
**เดิม**:
```ts
.from("subject_offerings").select("...subject(...)").eq("classroom_id", X)
// เห็นแค่วิชาที่มี offering แล้ว
```

**ใหม่** (plan-based):
```ts
.from("study_plan_subjects").select("subject(...)").eq("study_plan_id", planId)
// เห็นทุกวิชาในแผน

// แยก query offerings ที่ classroom + currentSemester มา attach offering_id
.from("subject_offerings").select("id, subject_id, teacher_id")
  .eq("classroom_id", X)
  .eq("semester", currentSemester);  // STRICT match ป้องกัน stale data

// ถ้า selectedSubject ไม่มี offering → auto-create teacher_id=NULL
await admin.from("subject_offerings").insert({
  classroom_id, subject_id, semester, teacher_id: null
});
```

### Selector label suffix
- `hasTeacher = !!offering?.teacher_id`
- ถ้า `false` → ดร็อปดาวน์แสดง `[ค21201] คณิตศาสตร์เพิ่มเติม · (ยังไม่จัดครูเข้าสอน)`
- Selector type เพิ่ม `hasTeacher: boolean` field

### Teaching actions: NULLify แทน DELETE
- เดิม: admin เลือก "—ยังไม่กำหนด—" → DELETE offering → CASCADE ลบ attendance/scores
- ใหม่: UPDATE `teacher_id = NULL` → offering คงอยู่ · attendance/scores ปลอดภัย

### Bug fix: teaching page อ่าน semester ผิด
- เดิม `readSemester: 1 | 2 = 1` (hardcoded ตั้งแต่สมัย annual-only)
- หลัง subjects per-semester: secondary subject (sem=2) → offerings ที่ sem=2 เท่านั้น
- อ่าน sem=1 → ไม่เจอ → ครูที่จัดไปแล้วไม่แสดง · เห็นเป็น "—ยังไม่กำหนด—" หมด
- Fix: `readSemester = currentSemester` (ทั้ง primary + secondary)

### Strict semester matching
- เดิม fallback `else if (!existing)` → ถ้า currentSemester ไม่มี offering หยิบของ sem อื่นมา
- ปัญหา: stale offerings ที่ sem ผิด (จากยุคก่อน subjects per-semester) ถูก พาเข้า → ดูเหมือนวิชามีครู
- Fix: query `.eq("semester", currentSemester)` ที่ DB layer → ไม่ดึง stale offerings เลย

### Summary auto-heal: ยกเลิก guard teacher_id
- เดิม `if (!offering1 && offering2?.teacher_id)` → ต้องมีครูถึง mirror
- หลัง: `if (!offering1 && offering2)` → mirror ได้แม้ teacher_id NULL
- รองรับ workflow ใหม่ (บันทึกก่อนจัดครู)

### Files
```
migrations/20260517e_offerings_nullable_teacher.sql            ← apply via Dashboard
schema.sql                                                      ← teacher_id no NOT NULL
packages/database/src/types.ts                                  ← teacher_id: string | null

apps/admin/app/(admin)/setup/
├── score-structure/
│   ├── page.tsx                    ← plan-based fetch + auto-create + strict sem
│   ├── score-selector.tsx          ← SubjectOption.hasTeacher + label suffix
│   └── summary-section.tsx         ← auto-heal mirror without teacher_id
├── attendance/by-subject/
│   ├── page.tsx                    ← plan-based fetch + auto-create + strict sem
│   └── selector.tsx                ← SubjectOption.hasTeacher + label suffix
└── teaching/
    ├── page.tsx                    ← readSemester = currentSemester (was 1)
    └── actions.ts                  ← clear-teacher: UPDATE NULL (was DELETE)
```

---

## 🚧 Pending สำหรับ session ถัดไป

1. ✅ ~~Apply migration #4~~ (applied) · **⚠️ Apply migrations** #5 + #6
2. **Phase 3B — ปพ.5 รวมชั้น** (homeroom-wide report — yet to design)
3. **Distribution prep** (ตอน Phase 3 ใกล้เสร็จ):
   - INSTALL.md
   - Consolidated `setup.sql` (1 ไฟล์ — schema + RLS + migrations + seeds)
   - First-admin signup flow (replace SQL bootstrap)
   - License (MIT/Apache 2.0 แนะนำ)
4. **Test verify backlog**:
   - by-subject: เปลี่ยนแท็บ 1-4 · cell dropdown · auto-save · % column
   - บันทึกคะแนน + เวลาเรียนของวิชาที่ "ยังไม่จัดครู" → ทำงานปกติ
   - จัดครูทีหลัง → ข้อมูลเก่าไม่หาย
   - พิมพ์ ปพ.5 รายวิชา + subject-attendance — ดู PDF preview ครบทุกหน้า

---

## ✅ Phase 3A: ปพ.5 รายวิชา (Cover + Split Preview + Section Toggles) — เสร็จ (2026-05-17 cont.)

**Reason:** ปพ.5 รายวิชาตามมาตรฐานต้องมีหน้าปกสรุปผล + รายละเอียดแยกตามหัวข้อ ·
ตามตัวอย่างจริงของโรงเรียนอื่น

### Sidebar restructure
ตัด print menu แยกออกจากการประเมิน → กลุ่มใหม่ "พิมพ์เล่มรายงาน":
```
พิมพ์เล่มรายงาน
├── 📄 ปพ.5 รายวิชา  → /reports/pp5 (split-pane selector + iframe preview)
└── 🗂️ ปพ.5 รวมชั้น  → /reports/pp5-class (placeholder; Phase 3B)
```

### Split-pane selector + live iframe preview
`/reports/pp5` (no params) → split layout:
- **ซ้าย (340px)**: cascading selector — ระดับชั้น → ห้อง → ภาค → วิชา + 7 toggle switches
- **ขวา (fill)**: live iframe ของ `/reports/pp5?...&embed=1`
- เปลี่ยนค่า → debounce 250ms → iframe โหลดใหม่
- ปุ่ม "พิมพ์รายงาน" บนซ้าย → `iframe.contentWindow.print()`
- `?embed=1` → ซ่อน admin layout chrome (sidebar/breadcrumb/etc.) ผ่าน inline `<style>` ที่ inject

### 7 section toggles
| Toggle | URL key | หน้า |
|---|---|---|
| หน้าปก | `cover` | คะแนน distribution + eval summary + signatures |
| ตารางเวลาเรียน (รายสัปดาห์) | `weeklyGrid` | 4 sub-tables × 5 weeks |
| สรุปเวลาเรียน | `attendance` | per-student มา/ขาด/ลา/% |
| ตารางคะแนน | `scores` | NumericTable / PassFailTable |
| คุณลักษณะ | `characteristics` | 8 หัวข้อ + สรุป |
| อ่าน คิดวิเคราะห์ เขียน | `reading` | 3 sub-scores + สรุป |
| สมรรถนะสำคัญ | `competency` | 5 ด้าน + สรุป |

URL: `?parts=cover,scores,reading` → render เฉพาะที่เลือก  
URL ไม่มี `parts` → render ทุก section (backward-compat)

### Pp5Cover (หน้า 1 — single A4 portrait)
ตามตัวอย่างจาก ปพ.5 ของโรงเรียนอื่น:
- Title + โรงเรียน + อำเภอ/จังหวัด (centered)
- Meta table 7 rows: กลุ่มสาระ · ☑พื้นฐาน/☐เพิ่มเติม · ☑ตอนต้น/☐ตอนปลาย ·
  ชั้น/ปี/ภาค · รายวิชา/รหัส · หน่วยกิต/เวลาเรียน · ครู/ครูที่ปรึกษา
- **สรุปผลการเรียน**: count + % ต่อเกรด (4/3.5/.../0/ร/มส) + ผ่าน/ไม่ผ่าน
- **สรุปผลการประเมิน**: คุณลักษณะ + อ่านคิดเขียน (3/2/1/0/ผ่าน/ไม่ผ่าน + %)
- **การอนุมัติผลการเรียน**: 3 signers (ครูผู้สอน · หัวหน้ากลุ่มสาระ · หัวหน้างานวัดผล)
- **เสนอเพื่อพิจารณา**: รองผอ. + ☐อนุมัติ/☐ไม่อนุมัติ + ผอ.

### Per-section page breaks
`@media print { .pp5-cover { break-after: page } · .pp5-section-title { break-before: page } }`
→ แต่ละ section ลงคนละหน้า เมื่อพิมพ์

### Schema additions
**Migration `20260517f_schools_district_province.sql`** — ADD `district` + `province` ลง schools
- ใช้ใน Pp5Cover header (อำเภอ X จังหวัด Y)
- Form ที่ /setup/school มี input + hint

### Files
```
migrations/20260517f_schools_district_province.sql        ← apply via Dashboard
schema.sql                                                 ← + district, province
packages/database/src/types.ts                             ← + 2 fields

apps/admin/app/(admin)/_components/sidebar.tsx            ← new group "พิมพ์เล่มรายงาน"

apps/admin/app/(admin)/reports/pp5/
├── page.tsx                ← Pp5Selector (split layout) · Pp5Cover · ทุก section + page-breaks
├── pp5-selector-form.tsx   ← cascading + 7 toggles + iframe ref + print button
└── print-button.tsx        ← (kept for legacy)

apps/admin/app/(admin)/reports/pp5-class/page.tsx         ← placeholder (Phase 3B)

apps/admin/app/(admin)/setup/school/
├── school-form.tsx                                        ← + district/province inputs
└── actions.ts                                             ← parse + save 2 fields
```

---

## ✅ Subject-attendance print page — เสร็จ (2026-05-17 cont.)

**Reason:** ครูประจำวิชาต้องการเล่มกระดาษเอาไปลงชื่อ + ตรวจสอบเวลาเรียน ·
แยกจาก ปพ.5 รายวิชา (cover) — มีเฉพาะ grid 20 สัปดาห์ + ลายเซ็น

### `/reports/attendance-by-subject?classroom=X&subject=Y&semester=Z[&embed=1]`
ใช้ pattern เดียวกับ `/reports/attendance` (per-day):
- `.pp5-page .att-page` → A4 portrait + narrow margins (15mm 5mm 8mm)
- Print button on `/setup/attendance/by-subject` card header → DirectPrintButton

### Layout: 2-page split (10 weeks each)
- **Page 1**: header (4 rows: title · subject info · school · affiliation) + table 1-10
- **Page 2**: same header + table 11-20 + summary cols (มา/ขาด/ลา/ร้อยละ) + 4 signatures

### Asymmetric column setup (per user spec)
- Page 1: ที่ + ชื่อ-นามสกุล + slot cells (no summary)
- Page 2: ที่ only (no ชื่อ — cross-ref with page 1) + slot cells + summary

### Misc design decisions
- **Padded to 30 rows** even when students < 30 (ที่ shows row number, rest empty)
- **Running hour numbers** across the term — slot 1 ของ week 1 = 1, slot 1 ของ week 2 = N+1
  - Same formula in UI grid (`/setup/attendance/by-subject`) + print
- Row 2 (subject info): center-aligned with gap 2rem (was space-between, too spread out)
- Top page margin 15mm (was 6mm, too cramped)
- Footer 1.5em gap above (away from table)

### Files
```
apps/admin/app/(admin)/reports/attendance-by-subject/page.tsx  ← print-friendly report
apps/admin/app/(admin)/setup/attendance/by-subject/page.tsx    ← + DirectPrintButton
apps/admin/app/(admin)/setup/attendance/by-subject/subject-attendance-grid.tsx
                                                               ← running hour numbers
                                                               ← sticky columns explicit
                                                                 width + zIndex 30 +
                                                                 border-separate (fix
                                                                 scroll bleed-through)
```

### Sticky column bug fix (UI grid)
**ปัญหา:** เมื่อ scroll ตารางในแนวนอน · slot data cells "/" โผล่ระหว่าง sticky columns
(ที่/ชื่อ-นามสกุล/รวม) เพราะ `border-collapse: collapse` + native `<select>` มี z-index
quirk

**Fix:** เปลี่ยนเป็น `border-separate border-spacing-0` + ใส่ explicit `width`, `minWidth`,
`backgroundColor`, `zIndex: 30` ทั้ง header + body sticky cells ผ่าน inline style

---

## ✅ ปพ.5 รายวิชา — Polish + บั๊กใหญ่ data-not-saving (2026-05-18)

### A. ปพ.5 weekly attendance grid — รีเขียนตาม `/reports/attendance-by-subject`
**ผ่านการแก้ใน `apps/admin/app/(admin)/reports/pp5/page.tsx`** — `AttendanceWeeklyGridSection`

- เปลี่ยน 4 sub-tables × 5 weeks → **2 sub-tables × 10 weeks** (per user spec)
- 4-row header repeated ต่อ sub-table: title + รหัสวิชา/รายวิชา/ภาคเรียน/ปีการศึกษา + โรงเรียน + สังกัด
- คอลัมน์ asymmetric:
  - หน้า 1 → ที่ + ชื่อ-สกุล + 10 weeks × slots (ไม่มีสรุป)
  - หน้า 2 → ที่ + 10 weeks × slots + สรุป มา/ขาด/ลา/ร้อยละ
- 30-row pad คงที่ไม่ว่าจะมีนักเรียนกี่คน
- Running hour numbers ข้ามทั้งภาค: `(week-1) × slotsPerWeek + slot`
- **ไม่มี Pp5Footer ในนี้** (per user spec) — cover + eval sections ถือ signatures อยู่แล้ว
- `pp5-page-content pp5-page-content-wide` modifier ใช้กับ page นี้เพื่อขอ `@page att-portrait-narrow` (margin ข้างแคบ — ให้ตาราง 40-col ฟิต)

### B. หน้าปก — refinement หลายรอบ

**Layout / Content**
- "ระดับชั้นมัธยมศึกษา ☐ตอนต้น ☐ตอนปลาย" → "ระดับชั้น ☐ประถมศึกษา ☐มัธยมศึกษา" (ใช้ `grade_level.system`)
- "หน่วยการเรียน" → **"หน่วยกิต"**
- "รวมเวลาเรียน" แสดงค่าตามระดับ: ประถม `X ชม./ปี` (totalHoursPerSemester × 2) · มัธยม `X ชม./ภาค`
- เพิ่มบรรทัด "สังกัด" ใต้ "อำเภอ/จังหวัด" ใน cover head (เดิมแสดงอย่างใดอย่างหนึ่ง)
- ย้ายแถว "รายวิชา / รหัสวิชา" ไปอยู่บนสุดของ meta table
- "ครูที่ปรึกษา" → **"ครูประจำชั้น"**

**Typography / Spacing (เฉพาะ `@media print`)**
- Font ของ cover ทุก element bump ขึ้น 3px จาก baseline หลังลองหลายรอบ (body 11→14px, title 16→19px, ฯลฯ)
- `padding: 0 8mm` บน `.pp5-cover` — เพิ่ม inset ซ้าย/ขวา (@page 12mm + 8mm = ขอบจริง ~20mm)
- `.pp5-cover-approval { margin-top: 1.5rem }` — gap หัวข้อ "การอนุมัติฯ" กับตารางด้านบน
- `.pp5-cover-approval + .pp5-cover-approval { margin-top: 2.5rem }` — gap "เสนอเพื่อพิจารณา" กับ block ก่อนหน้า (adjacent sibling combinator)
- `.pp5-cover-approval-title { margin-bottom: 1.5rem }` — gap หัวข้อกับ signature row
- `.pp5-cover-sig-decision > p:first-child { margin-bottom: 1.5rem }` — gap "☐ อนุมัติ ☐ ไม่อนุมัติ" กับ "ลงชื่อ ผอ."

**Underline ใต้ค่าใน meta table** — ลองหลาย technique
- `border-style: dotted` → Chrome PDF (PDFium) render เป็น dashes ไม่ใช่จุด
- `radial-gradient` background pattern → render ไม่ออกใน PDF บางจังหวะ
- **Final decision (user accepted):** `border-bottom: none` ใน @media print — clean ดูสะอาด · screen mode ยังเห็น dotted underline ปกติ (เพื่อ admin review)

### C. Print quality — ตารางและ asymmetric layout

**1) Border thickness:**
- `1px` borders ที่ทุกตาราง (`.pp5-table`, `.pp5-cover-table`, `.att-table`) แสดงหนาเกินไปตอน export PDF (1 CSS px = ~3 device pixels @ 300 DPI)
- Print rule: `border-width: 0.5pt` (= ~2 device pixels) — เส้นบางลงครึ่ง ตัวอักษรกับตารางบาลานซ์กัน

**2) Weekly grid horizontal position:**
- Chrome PDF backend (PDFium) **override asymmetric `@page` margins** เป็น minimum default — ตารางที่ตั้งใจให้เลื่อนขวาใน preview กลับดูจัดกลางใน PDF
- Solution: ย้าย shift logic ออกจาก `@page` margin ไปไว้ที่ `.att-table` directly
  - `@page att-portrait-narrow { margin: 15mm 10mm 8mm }` (symmetric)
  - `.pp5-page-content-wide .att-table { margin-left: 12mm; margin-right: 0 }` (explicit asymmetric shift)
- Chrome PDF honor content positioning เสมอ (ไม่ใช่ page-level) → preview กับ PDF match กัน

### D. Embed mode (`?embed=1`) — กัน chrome flash ตอน iframe โหลด

**ปัญหา:** iframe preview ของ `/reports/pp5?embed=1` แสดง chrome (sidebar / MobileHeader / PageContextBar) แวบนึงก่อน `<style display: none>` ของ page render เพราะ Next.js stream HTML จาก layout ลงมา page

**แก้ root cause:**
1. `apps/admin/proxy.ts` — ตรวจ `?embed=1` ก่อน `updateSession()` → set request header `x-pp5-embed: 1` (middleware ส่งต่อให้ server components ผ่าน `NextResponse.next({ request })`)
2. `apps/admin/app/(admin)/layout.tsx` — อ่าน header ด้วย `headers()` ตอนแรก: ถ้า embed → `return <>{children}</>` ตรง ๆ ไม่ render chrome เลย → ไม่มี flash ตั้งแต่ server render

Generic fix ครอบทุก iframe preview ในระบบ (รวม attendance-by-subject ฯลฯ) ไม่ใช่เฉพาะ pp5

### E. **🚨 บั๊กใหญ่: data not saving on navigation back** — root cause = max-rows truncation

**Symptom (user report):** กดเช็คเวลาเรียนในหน้า `/setup/attendance/by-subject` → navigate ไปหน้าอื่น → กลับมา → ช่องที่เพิ่งเช็คหายไป แต่ totals คงค่าใหม่

**Diagnostic process (server-side logging):**
- ใส่ `console.log` ใน server action ทั้ง path: action เขียน DB สำเร็จ (`UPSERT ok · { id: '...', status: 'present' }`)
- ใส่ `console.log` ฝั่ง read (GridSection): พบ `attendanceRows: 1000` **ตายตัวเป๊ะ**
- **Smoking gun: ตัวเลข 1000 = Supabase PostgREST max-rows default** — query ที่ไม่ระบุ `.range()` ถูกตัดเหลือ 1000 row · row ใหม่ที่เพิ่ง upsert ตกหล่นเพราะอยู่ลำดับท้าย

**Fix: Pagination ด้วย `.range()` ในทุก SELECT ที่อาจคืน > 1000 rows**

Pattern:
```ts
const PAGE = 1000;
const all: Row[] = [];
let from = 0;
while (true) {
  const { data, error } = await supabase
    .from(...)
    .select(...)
    .order(...)            // deterministic ordering for batching
    .range(from, from + PAGE - 1);
  if (error || !data || data.length === 0) break;
  all.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
}
```

ไฟล์ที่แก้:
- `apps/admin/app/(admin)/setup/attendance/by-subject/page.tsx` (recording UI)
- `apps/admin/app/(admin)/reports/pp5/page.tsx` (full ปพ.5 print)
- `apps/admin/app/(admin)/setup/attendance/summary-section.tsx` (term/year summary)
- `apps/admin/app/(admin)/reports/attendance-by-subject/page.tsx` (per-subject print)

**Defensive UPSERT verification:**
- เพิ่ม `.select("id")` ต่อท้าย `.upsert()` ใน `actions.ts` ของ by-subject
- เช็ค `upserted.length === 0` → throw "UPSERT returned no rows" (กัน silent fail ในอนาคต)

**Memory:** บันทึก lesson ใน `~/.claude/projects/.../memory/pattern_supabase_pagination.md` + เพิ่มบรรทัดใน MEMORY.md index — กัน Claude session ถัดไปไม่ต้องเสียเวลา debug ซ้ำ

### F. Score-structure "พิมพ์รายงาน" — restore Phase 3 simple version

**Context:** ปุ่ม "พิมพ์รายงาน" ที่ `/setup/score-structure` เคยพิมพ์เป็น simple report (title + score table + signatures) ตาม Phase 3 ดั้งเดิม · พอ `/reports/pp5` ถูกพัฒนาเป็น full bundle (cover + weekly grid + eval + ...) → ปุ่มเลยเริ่มพิมพ์ออกมาเป็นเล่มหนา ไม่ใช่ที่ต้องการ

**Solution: รี-introduce simple-mode บน route เดียวกัน**

1. เพิ่ม `<Pp5SimpleHeader info={headerInfo} />` component ใน `pp5/page.tsx`:
   - ใช้คลาส CSS เดิม `.pp5-header / .pp5-title / .pp5-info-grid` ที่ยังอยู่ใน globals.css
   - Render title + school + อำเภอ/จังหวัด + สังกัด + 3-col info grid (ชั้น/ปี/ภาค/รหัส/ชื่อ/หน่วยกิต/เวลาเรียน/รวมเวลา/ครู)
2. ทั้ง 2 branch (pass_fail + numeric) ของ `Pp5Page`:
   ```tsx
   {parts.cover && <Pp5Cover ... />}
   {!parts.cover && <Pp5SimpleHeader info={headerInfo} />}
   ```
3. `Pp5PrintLink` ใน `score-structure/page.tsx` เปลี่ยน URL เป็น:
   ```ts
   /reports/pp5?...&parts=scores
   ```

**ผลลัพธ์:**
| Entry point | URL | Output |
|---|---|---|
| `/setup/score-structure` → "พิมพ์รายงาน" | `/reports/pp5?...&parts=scores` | Simple header + score table + signatures |
| Sidebar "พิมพ์เล่มรายงาน" → ปพ.5 รายวิชา | `/reports/pp5` (no parts) | Full bundle |

หนึ่ง route รับทั้ง 2 use case ผ่าน `parts` filter — ไม่ duplicate logic

---

## Session 2026-05-19 — ปพ.5 รายวิชา bundle restructure + summary/ตัดเกรด + print polish

### A. ปพ.5 รายวิชา bundle — แยก behavior ตาม mode

**Bundle mode (`parts.cover=true`):**
- ประถม: 3 หน้า — ภาคเรียนที่ 1 / ภาคเรียนที่ 2 / สรุปทั้งปี
- มัธยม: 1 หน้า ตาม URL semester
- แต่ละหน้ามี `Pp5ScoreHeader` ของตัวเอง (เหมือน `Pp5SimpleHeader` แต่ไม่มี logo)
- Eval sections (chars/reading/competency) — แต่ละ section render เป็น "หน้า" เต็มเหมือนหน้า `/reports/student-eval` มี header + 30-row table + footer signature
- ครูประจำชั้น (homeroomNames) เป็น signer หลักของ eval footers; ครูประจำวิชา (teacherLabel) เป็น signer ของ score table

**Simple-print mode (`parts.cover=false`):**
- ประถม: render เฉพาะ semester ใน URL ไม่รวม 3 หน้า (ผู้ใช้: "กดพิมพ์ที่ปุ่มของภาคเรียนใด ก็ให้พิมพ์เฉพาะของภาคเรียนนั้น อย่าเอาไปปนกัน")
- ใช้ `Pp5SimpleHeader` (with logo) ที่หัวเอกสารอย่างเดียว
- มี `Pp5Footer` (signatures) ที่ท้าย

**Data flow ของประถม:**
- `subject_offerings` สร้าง 2 row ต่อ (classroom × subject) แม้ subject.semester=0 (ดูที่ `teaching/actions.ts:114-120` expand semester=0 → [1,2])
- ใน `pp5/page.tsx` มี helper `ensureOfferingId(cId, sId, sem)` สร้าง offering ถ้าไม่มี + `loadSemBundle` โหลด categories + scores ของหนึ่ง offering
- Annual grade = `cutGrade(averageTwoSemesters(t1, t2), scales)` คำนวณสด ไม่ stored (per `score-structure/summary-section.tsx:372`)

### B. `/setup/score-structure` หน้า "สรุปผล/ตัดเกรด"

**ทั้งประถม + มัธยม:**
- เพิ่มคอลัมน์ "รหัส" (student_code จาก enrollments)
- เพิ่มคอลัมน์ "สถานะ" สุดท้าย — dropdown: ปกติ / ร / มส (saves to `grades.is_incomplete` / `grades.is_no_eligibility` — schema มีอยู่แล้ว ไม่ต้อง migration)
- คอลัมน์ "เกรด" — แสดง ร/มส (badge) แทนตัวเลขถ้า status set; numeric pill เมื่อปกติ
- `setGradeSpecialStatus` server action ใน `score-structure/actions.ts`:
  - status=`""` → DELETE row (numeric grade คำนวณใหม่อัตโนมัติ)
  - status=`"incomplete"` / `"no_eligibility"` → UPSERT + เซ็ต flag
- footer สรุปนับ ร + มส แยก (มส = ไม่ผ่าน, ร = pending)

**มัธยม recording grid:**
- `SecondaryScoreGrid` มี **คอลัมน์ "สถานะ" สุดท้าย** เหมือนกัน (dropdown ปกติ/ร/มส)
- เกรด column แสดง ร/มส badge เมื่อ flag เซ็ต — สอดคล้องกับ summary tab + ปพ.5 print

### C. หน้าพิมพ์ใหม่: `/reports/grade-summary`

**Route ใหม่** สำหรับ "พิมพ์รายงาน" จากแท็บสรุปผล:
- รับ `?classroom=...&subject=...`
- Layout เหมือนหน้า `/reports/student-eval` — logo + title "แบบบันทึกสรุปผลการเรียน" + class + subject + ทั้งปี + meta
- 30-row padded table: ที่ · รหัสประจำตัว · ชื่อ-สกุล · ภาค 1 · ภาค 2 · เฉลี่ยรายปี · เกรด
- เกรดแสดง ร/มส/numeric ตาม flag ของแต่ละ student
- Footer: ครูประจำวิชา → หัวหน้างานวัดผล → (รองผอ.) → ผอ.

---

## Session 2026-05-22 — Print density tiers + dashboard widget + bug fixes

> สถานะวันนี้: **เตรียมทดสอบข้อมูลจริง** · ทุกอย่าง `tsc --noEmit` ผ่านทั้งหมด

### 1. Bug fixes (ช่วงเช้า)
- **`teacher-scope.ts`** — `ensureCanEvaluateStudent` รับ `yearId` (required) แล้ว filter enrollments ด้วย academic_year_id ผ่าน classroom join · กัน bug ที่นักเรียนเรียนหลายปีแล้ว query คืน enrollment ปีเก่า → เช็ค homeroom กับห้องผิด · ทั้ง 3 eval action files ส่ง `yearId` แล้ว
- **`pp5-class/page.tsx`** — ชื่อตาราง `grading_scales` → `grade_scales` · คอลัมน์ `value` → `score` (ผิดมาแต่ต้น เพิ่งโดน TS catch)
- **`/reports/pp5/page.tsx`** — permission guard เพิ่ม `.eq("semester", semester)` ก่อน `.maybeSingle()` · แก้ "ไม่ได้เป็นครูผู้สอน" ขึ้นผิดสำหรับวิชากิจกรรมประถม (เคยมี 2 offering rows ต่อวิชา ทำให้ `.maybeSingle()` error)

### 2. Subject form — `subjects/subject-form.tsx`
- Activity subject: label ชั่วโมง สลับตาม system ของระดับชั้น
  - ประถม → "ชั่วโมง/ปี" · เช่น "40 ชม. สำหรับลูกเสือฯ"
  - มัธยม → "ชั่วโมง/ภาค" · เช่น "20 ชม./ภาค สำหรับลูกเสือฯ"
- DB column ยังเป็น `hours_per_year` ตามเดิม (เปลี่ยนเฉพาะ UI text) · ⚠️ รายงาน ปพ.5 ของมัธยมที่บวก `hours_per_year` ตรงๆ จะเป็น "ชั่วโมง/ภาค" ไม่ใช่ "ชั่วโมง/ปี" — ยังไม่แตะ (decide ทีหลัง)
- เพิ่ม `system: "primary" | "secondary"` ใน `GradeLevelOption` · 3 page passes มาแล้ว (new + [id])

### 3. Print density tiers (3 ระดับ) — pattern หลักของวันนี้

```
≤30 คน  → roomy    (พื้นที่กว้าง · font ใหญ่)
31-35  → compact  (logo inline · font ย่อ · header ลดสูง)
>35    → xcompact (logo เล็กสุด · font 11px · line-height 1.1)
```

**Reports ที่เปลี่ยน:**
| Route | Tables ที่ใช้ tier | Header/Footer ใช้ tier |
|---|---|---|
| `/reports/pp5` (score-recording) | `NumericTable` + `PrimaryAnnualSummary` + `PassFailTable` | `Pp5SimpleHeader` + `Pp5Footer` (รับ `compact`/`xcompact` props) |
| `/reports/student-eval` (3 eval pages) | main grid table | `pp5-header pp5-header--eval` + `pp5-footer` |
| `/reports/attendance` (รายวัน) | weekly grid | `AttFrame` + `AttFooter` (รับ props) |
| `/reports/attendance-by-subject` (รายวิชา) | grid 50 slot cells | inline header + footer |

**CSS modifier classes:**
- `.pp5-header--compact` / `.pp5-header--xcompact` · `.pp5-footer--*` · `.pp5-table--roomy` / `.pp5-table--xcompact`
- `.att-table--roomy` / `.att-table--xcompact` (ที่มีอยู่แล้ว + extend xcompact)
- Source order: compact rules → xcompact rules ล่างเพื่อ override ค่า specific

**Special — dense-slots สำหรับ attendance-by-subject:**
- วิชา ≥5 slot/สัปดาห์ × 10 weeks = 50+ slot cols → ล้น A4 portrait
- เพิ่ม class `att-table--dense-slots` (slotsPerWeek ≥ 5) → ลด col-num 14, col-name 85, slot 10px
- วิชา 2.5 หน่วยกิตในห้องเล็ก (roomy + slotsPerWeek=5) — ขยาย slot back to 12px ใช้ `[data-slots-per-week="5"]` attribute selector

### 4. Attendance header redesign (scope: `.att-page`)

- Logo inline กับ title ทุก tier (เคย stack บนเฉพาะ compact)
- ทุก tier แสดงชื่อโรงเรียน (เคย hide ใน compact/xcompact ของ score)
- ซ่อนสังกัดใน compact/xcompact (เปลี่ยนจากซ่อน school name)
- Logo: 40px (roomy) → 32px (compact) → 24px (xcompact)
- Roomy mode: ชื่อนักเรียน 12px · col-name 95px (เคย 14px / 115px)
- attendance-by-subject: ชื่อนักเรียน 12px ตลอดทุก tier (ใช้ `.att-page-section` scope)

### 5. Eval titles
- 3 ที่ใน `pp5/page.tsx` (lines 2848/2896/2924) + TYPE_TITLE ใน `student-eval/page.tsx`
- "แบบบันทึกผลการประเมิน..." → **"สรุปผลการประเมิน..."**
- CSS `.pp5-header--eval h1 { font-size: 14px }` (เคย 1.25rem ≈ 20px) · เท่ากับ `.pp5-header--score h1`

### 6. Score-table print fine-tuning
- Roomy: 22px row height + 14px font (เคย 26px)
- Compact (>30): 12px font + line-height 1.15 + padding-top/bottom 0 → ~18-19px row
- Xcompact (>35): 11px font + line-height 1.1 → ~14-15px row
- Logo เปลี่ยน compact: 56→32→24px ตาม tier · save ~75-80px vertical

### 7. แดชบอร์ดแอดมินใหม่ — `app/(admin)/page.tsx`

**ลบ:** classroom list grid + quick links sections + dead code (QUICK_LINKS, classroomRows, BookOpen import)

**เพิ่ม widget "ความคืบหน้าการประเมิน":**
- 3 sections (chars / RT / comp) ยุบ-ขยายได้ด้วย `<details>`/`<summary>` (server component native · ไม่ต้องใช้ JS)
- แสดง overall % (weighted: total_filled / total_expected) + progress bar (สีตาม %)
- ขยาย → list ทุกห้อง พร้อมชื่อครูประจำชั้น (1-2 ชื่อ) + % ของห้องนั้น
- Icon ตรงกับ sidebar: Heart (chars) · Brain (RT) · Activity (comp)
- คลิกแต่ละห้อง → `/setup/{type}?grade=X&room=Y`
- Performance: 30-45 `count + head: true` queries ขนาน → ไม่ดึง rows

**Fix bugs ในแดชบอร์ด:**
- นับนักเรียน: filter ตาม semester scope (primary→0, secondary→current_sem) · ไม่นับซ้ำมัธยม
- นับห้องเรียน: เฉพาะที่มีนักเรียน > 0 ในภาคปัจจุบัน

**Font polish:**
- % ใช้ `font-sans tabular-nums` (Sarabun + เลขความกว้างเท่ากัน) · เคย `font-mono`

### 8. ตารางสรุปเวลาเรียน — สีดำสนิท
- `.att-summary-table .att-group` color `#1e3a8a` → `#000`
- `.att-summary-table .att-workday-row th` color `#713f12` → `#000`
- พื้นหลัง (light blue + yellow) เก็บไว้

---

### 🔜 พรุ่งนี้ทำต่อ
- ผู้ใช้จะลองทดสอบข้อมูลจริง · เจอ bug ค่อยกลับมาแก้
- ⚠️ Migrations ทุกตัวที่อ้างถึงใน file นี้ apply แล้วทั้งหมด (รวม `20260517e` + `20260517f`)
- หากต้องการ widget สำหรับครู (homeroom-scoped) ของ pending evals → ยังเป็น Phase 2 ที่ดูแลทีหลัง
- Score widget (จำนวน offering ที่ยังไม่บันทึก) — ยังไม่ทำ (skip จาก v1)

**ปุ่มพิมพ์ใช้ `DirectPrintButton` pattern (hidden iframe + `iframe.contentWindow.print()`)** ที่ภาคเรียน 1/2 ใช้ — ไม่เด้งแท็บใหม่ คลิกแล้ว print dialog เด้งทันที

### D. Eval print pages (chars/reading-thinking/competency) — header layout

**คุณลักษณะอันพึงประสงค์:**
- Header แต่ละ column 2 บรรทัด:
  - บรรทัด 1: `ข้อที่ N` (bold, 10px)
  - บรรทัด 2: ชื่อเต็ม (9px, `white-space: nowrap` + `overflow: hidden` + `text-overflow: ellipsis` → ย่อด้วย … ถ้ายาว)
- ลบ legend ด้านล่าง (ซ้ำซ้อนเพราะชื่ออยู่ใน header แล้ว)

**ทุก eval table (chars/reading/competency):**
- ใช้ `<colgroup>` + `table-layout: fixed` กำหนด width เป๊ะ:
  - `#` = 5%
  - `ชื่อ-สกุล` = 26%
  - data cols ละ `55/N %` (8 chars = 6.875%, 5 competency = 11%, 3 reading = 18.33%)
  - `สรุป` = 14%
- ทุกอย่างรวมเป็น 100% เป๊ะ ไม่ overflow ขอบกระดาษ

### E. CSS print polish

**`@page` (default):**
- top margin: 12mm → **10mm** ขยับหัวขึ้น
- bottom margin: 14mm → **10mm** ลดท้ายกระดาษ
- ได้พื้นที่เพิ่ม ~6mm

**`@page att-portrait-narrow` (attendance):**
- top: 12mm → **10mm** ขยับหัวขึ้น

**`.pp5-footer` (print):**
- margin-top: 2rem → 1rem
- font-size: 12px → 11px
- line-height: 1.75 → 1.4

**`.pp5-sig-name` (print):** font 11px → 10px

**ตารางขอบขวาหายในโหมด print:**
- สาเหตุ: `table-layout: fixed` + width 100% + box-sizing content-box → border 1px ขวา bleed นอก 100% → Chrome PDF crop ที่ขอบกระดาษ
- Fix: `.pp5-table { box-sizing: border-box; width: 99% }` ใน print — buffer 1% ป้องกัน crop

### F. Row count expansion

**`PADDED_ROW_COUNT` ทุกหน้าพิมพ์:** เปลี่ยนจาก hard-coded 30 → `Math.max(30, max(student_number))` รองรับห้องที่มีนักเรียน >30 คน

แก้ทั้ง 5 ไฟล์:
- `pp5/page.tsx` (NumericTable / PrimaryAnnualSummary / WeeklyGrid / EvalReportPage)
- `student-eval/page.tsx`
- `grade-summary/page.tsx`
- `attendance/page.tsx`
- `attendance-by-subject/page.tsx`

### G. UI tweaks

- ปุ่ม "พิมพ์รายงาน" ทุกที่ใช้สีน้ำเงิน `bg-blue-600` (เปลี่ยนจาก emerald / primary / white) — สม่ำเสมอทั่วระบบ
- `/reports/pp5` selector form — เพิ่ม useEffect: เลือกวิชาแล้วเด้งไปแท็บพรีวิวอัตโนมัติ
- แท็ปพรีวิวใช้ได้ตอนยังไม่เลือกวิชา — แสดง empty state "ยังไม่ได้เลือกรายวิชา" + ปุ่ม "← ไปที่แท็ปตั้งค่า"
- Zoom dropdown: เพิ่ม 25% (พอดี · 25% · 50% · 75% · 100% · 125% · 150% · 200%)

### Key findings & gotchas

1. **`table-layout: fixed` + width 100% → border ขอบขวาหาย** (Chrome PDF crop) — fix: `box-sizing: border-box` + `width: 99%`
2. **Container query บนตัว container เอง + เปลี่ยน display ในตัวเอง = unreliable** — แยก wrapper ที่ตั้ง `container-type` ออกจากตัวที่ flip grid↔flex
3. **`overflow: hidden` บน table cells + `border-collapse: collapse`** → ขอบขวาหายใน Chrome (ใช้ overflow: hidden ใน `<div>` inside cell แทน)
4. **`grades` table มี `is_incomplete` + `is_no_eligibility` columns พร้อม CHECK constraint** ที่อนุญาตให้มี row ที่ grade=null + pass_fail=null ถ้า flag เซ็ต — ไม่ต้อง migration สำหรับ ร/มส
5. **ประถม `subject_offerings` มี 2 rows ต่อ (classroom × subject)** — sem 1 + sem 2 แม้ subject.semester=0

---

## Session 2026-05-19 (Part 2) — Print page layout pass

User went through each print page one-by-one to tighten margins, font sizes,
and row heights. Pattern: show current values → user picks a target → tweak →
print preview → adjust iteratively.

### A. `@page` defaults (`/reports/pp5`, `/reports/student-eval`, `/reports/grade-summary`)

```
@page {
  size: A4 portrait;
  margin: 7mm 12mm 5mm;  /* top · sides · bottom */
}
```

- Top 7mm = inside Chrome PDF's ~10mm no-print zone — risks logo clip on
  tighter school printers (user accepts the trade-off)
- Bottom 5mm = aggressive; relies on the footer's `margin-top: 1rem` +
  tightened `.pp5-sig-block` for breathing room

### B. Score recording print (`/reports/pp5?...&parts=scores` + bundle)

**Cell font-size (print):** 13px (base) — bumped from 12px

**Row heights — `tbody td` with `height: ...` enforced + matching padding:**

| Mode | tr height | tbody td padding | name font (att-table only) |
|---|---|---|---|
| **Compact (>30 students)** — `.pp5-table` | 19px | (default) | — |
| **Roomy (≤30 students)** — `.pp5-table--roomy` | **22px** | (default) | — |

**JSX:** every 30-row table component (`NumericTable`, `PassFailTable`,
`PrimaryAnnualSummary`, `EvalReportPage`, plus standalone student-eval +
grade-summary) computes:

```ts
const maxStudentNum = students.length === 0 ? 0
  : Math.max(...students.map(s => s.student_number));
// add `pp5-table--roomy` modifier when class fits in 30 rows
```

### C. Characteristics / reading / competency print (`/reports/student-eval`)

**Header format per column (8 chars):**
- Line 1: `ข้อที่ N` (bold, 10px)
- Line 2: full name (9px, `white-space: nowrap` + `text-overflow: ellipsis`)

**Equal column widths via `<colgroup>` + `table-layout: fixed`:**
- `#` = 5%, `ชื่อ-สกุล` = 26%, data cols = `55/N %` each, `สรุป` = 14%
- Sum = 100% exactly; `.pp5-table { box-sizing: border-box; width: 99% }`
  in print to keep the outer border inside the printable area

**Border ขวาตารางหายใน Chrome PDF — final fix combo:**
- `.pp5-table { box-sizing: border-box }` so border-1px fits inside 100%
- `.pp5-table { width: 99% }` in print as buffer against subpixel rounding
- (Earlier attempts: `overflow: hidden` on cells dropped the right edge
  in Chrome with `border-collapse: collapse` — reverted)

**Header padding-top to match score recording's table-start position:**
- `.pp5-header--eval { padding-top: 7.5mm }` in print
- Applied via JSX class `<header className="pp5-header pp5-header--eval">`
  in standalone + `EvalReportPage` in bundle

### D. Attendance recording print

**`@page att-portrait-narrow`** (used by `.att-page` + `.pp5-page-content-wide`):

```
@page att-portrait-narrow {
  size: A4 portrait;
  margin: 7mm 10mm 5mm;  /* matches default's top/bottom; narrower sides */
}
```

**`.att-table` row heights — compact/roomy split:**

| Mode | tbody tr height | tbody td padding | name font |
|---|---|---|---|
| Compact (>30) — `.att-table` | **18px** | 0.05rem | 9px |
| Roomy (≤30) — `.att-table--roomy` | **22px** | 0.2rem | 11px |

Compact mode needs the smaller name font + tighter padding because the
default 11px name + 0.2rem padding generates ~22px content height which
would push the row past the 18px enforced height.

**Per-subject attendance header padding-top:** `.pp5-header--att-sub`
landed at `padding-top: 0` after iteration — user spec was "match the
daily attendance" but the wrapping `<section class="att-page-section">`
already provides the visual breathing room expected.

### E. Footer (`.pp5-footer`) tightening for all reports

```css
@media print {
  .pp5-footer       { margin-top: 1rem; }    /* was 2.5rem */
  .pp5-sig-block    { font-size: 11px; line-height: 1.4; }  /* was 12/1.75 */
  .pp5-sig-name     { font-size: 10px; }      /* was 11 */
}
```

### F. Row count expansion (recap from earlier this session)

All 5 print page files use:
```ts
const PADDED_ROW_COUNT = students.length === 0 ? 30
  : Math.max(30, ...students.map(s => s.student_number));
```

Padded to ≥30 rows for binding consistency; expands when class >30 students.

### Process gotchas learned this session

1. **Next.js dev server HMR doesn't always pickup global CSS edits** — user
   reported "ฮาร์ดรีเฟรชแล้วยังเท่าเดิม" multiple times until restart.
   Workflow: kill node processes (`taskkill /F /IM node.exe`) → start fresh
   dev server → hard refresh browser → print preview.
2. **Two ways to push a header down — both look the same visually:**
   - `padding-top` (inside the box) — preferred, no margin-collapse risk
   - `margin-top` (outside the box) — risks collapse with parent/sibling
3. **`tr { height: Xpx }` is min-height, not max** — cell content (font ×
   line-height + padding) can push rows taller. To actually shrink rows,
   reduce padding + font size in addition to setting height.
4. **`overflow: hidden` on `<td>` + `border-collapse: collapse`** drops the
   right-edge border in Chrome PDF. Apply overflow on a `<div>` INSIDE
   the cell instead (e.g. char-header div with ellipsis).
5. **Port 3000 conflicts** when 2 admin dev servers run simultaneously.
   `netstat -ano | grep :3000` to find PID, `taskkill /F /PID X` to free.

---

## Session 2026-05-19 (Part 3) — ปพ.5 รายวิชา bundle layout pass

User went through each page of `/reports/pp5` (the per-subject ปพ.5 bundle)
in order, fine-tuning print layout iteratively. Page-by-page work.

### A. Per-page `@page` rules (margins)

Each section of the bundle now uses its own named `@page`:

| Section | `@page` name | top / sides / bottom |
|---|---|---|
| Cover | `pp5-bundle-cover` | 15mm / 12mm / 5mm |
| Weekly grid + Attendance summary | `pp5-bundle-weekly` | 15mm / 10mm / 5mm |
| Score (NumericTable / PrimaryAnnualSummary) | `pp5-bundle-score` | 15mm / 12mm / 5mm |
| Eval (chars / reading / competency) | default | 7mm / 12mm / 5mm |

Standalone pages (`/reports/attendance`, `/reports/student-eval`,
`/reports/grade-summary`, simple-print) stay on `att-portrait-narrow` /
default — bundle changes don't ripple to them.

Applied via class on the section wrapper:
- `.pp5-cover { page: pp5-bundle-cover }`
- `.pp5-page-content-wide { page: pp5-bundle-weekly }`
- `.pp5-page-content-score { page: pp5-bundle-score }` (added conditionally
  in `NumericTable` + `PrimaryAnnualSummary` when `info` is present)

### B. `att-table` weekly grid — dynamic slot widths

Slot cells in weekly grid expand inversely with slot count so the table
always fills ~178mm regardless of credit_hours (user spec: "ถ้าหน่วยกิต
ลดลงให้ขยายช่องแต่ละวัน"):

```ts
// In AttendanceWeeklyGridSection — inserted before <thead>:
const TOTAL_TABLE_PX = 673;  // ~178mm
const slotsArea = TOTAL_TABLE_PX - NUM_PX
  - (showNameCol ? NAME_PX : 0)
  - (showSummaryCols ? SUM_PX : 0);
const slotWidthPx = slotsArea / rangeSlots;
// <colgroup> renders explicit widths per column
```

Result: primary (4 slots/wk → 40 cells @ 13.5px) and secondary (3 slots/wk
→ 30 cells @ 18px) tables look the same width on paper.

**0.5 credit-hour subjects collapse to a single weekly page** (`PAGE_RANGES`
becomes `[[1,20]]` when `slotsPerWeek <= 1`) — 20 weeks fit comfortably
without the 2-sub-table split.

### C. `att-table` roomy/compact + tr+td height (gotcha learned)

| Mode | tbody tr+td height | tbody td padding | name font |
|---|---|---|---|
| Compact (>30 students) — `.att-table` | 22px | 0.05rem | 13px |
| Roomy (≤30) — `.att-table--roomy` | 24px | 0.2rem | 14px |

**`height: Xpx` set on BOTH `tr` AND `td`** — `tr` alone was treated as
min-height + the name-cell content silently pushed page-1 rows ~1-2px
taller than page-2 rows (page 2 has no name column). Setting height on
both forces uniform.

### D. AttendanceSummarySection moved + restyled

Moved BEFORE the score table (was after) so weekly grid → summary read
together as one continuous attendance report:

- Wrapper changed from `pp5-page-content` → `pp5-page-content pp5-page-content-wide`
  (inherits `pp5-bundle-weekly` @page — 15mm top, 10mm sides)
- Table changed from `pp5-table pp5-table-eval` → `att-table att-table--summary`
- Added `.att-table--summary` modifier — uniform 13/14px font across
  header + data cells (rule applied OUTSIDE `@media print` so the preview
  iframe sees it too)
- Header copied from weekly grid (`att-page-header` 2-row variant) so the
  pages flow together
- 30-row padded table with same compact/roomy split + `att-table--roomy`
- New column: `รหัสประจำตัว` (student_code) between `ที่` and `ชื่อ`
- Column widths tuned to ~178mm total via `<colgroup>`:
  `ที่ 22 + รหัส 80 + ชื่อ 200 + มา/ขาด/ลา/เต็ม 55×4 + % 70 + สิทธิ์สอบ 80 = 672px`

**สิทธิ์สอบ** = `pct >= 80 ? "มี" : "ไม่มี"` (สพฐ. 80% threshold).

### E. `pp5-table` row heights (score pages)

| Mode | tbody td height | font (cell + name) |
|---|---|---|
| Compact (>30 students) — `.pp5-table` | 22px | 13px |
| Roomy (≤30) — `.pp5-table--roomy` | **26px** | 14px |

(Roomy bumped from 22 → 25 → 26px over iterations.)

### F. `PrimaryAnnualSummary` (สรุปทั้งปี, primary's 3rd page)

Final column layout via `<colgroup>` (sum = 636px ≈ 168mm):

| Column | Width |
|---|---|
| ที่ | 36px |
| เลขประจำตัว | 80px |
| ชื่อ – สกุล | 200px |
| ภาคเรียนที่ 1 (was "รวม ภาคเรียนที่ 1") | 80px |
| ภาคเรียนที่ 2 (was "รวม ภาคเรียนที่ 2") | 80px |
| **คะแนนเฉลี่ย** (new) | 100px |
| เกรด (was "เกรด ทั้งปี") | 60px |

คะแนนเต็ม row: `100 / 100 / 100 / —`

### G. Header refactors

**`Pp5ScoreHeader` (score pages in bundle):**
- Added class modifier `.pp5-header--score`
- Removed `<p className="pp5-school-name">` (cover handles school identity)
- CSS: `.pp5-header--score h1, .pp5-header--score .pp5-meta-line { font-size: 15px }`
  applied OUTSIDE `@media print` so preview iframe + actual print both render
  uniform 15px title + meta

**`att-page-header` (weekly grid + attendance summary):**
- Removed `att-page-school` + `att-page-affiliation` `<p>` elements
- CSS: `.att-page-header .att-page-title + .att-page-meta { font-size: 15px }`
  uniform (screen + print)

### H. Eval pages — compact mode in bundle

`EvalReportPage` gains a `compact?: boolean` prop (default false):
- `compact={false}` (standalone `/reports/student-eval`) — logo + school
  + signature footer all render
- `compact={true}` (passed by `EvalSection` in pp5 bundle) — hide logo +
  school + signature footer (cover handles bundle-wide signatures + logo)

JSX guards: `{!compact && info.logoUrl && <img...>}`, `{!compact && <footer>}`.

### I. Cover page tweaks

**Meta-row order** (`Pp5Cover` table):
1. ชั้น / ปีการศึกษา / ภาคเรียนที่ ← moved to top (was row 5)
2. รายวิชา / รหัสวิชา
3. กลุ่มสาระการเรียนรู้
4. สาระการเรียนรู้ (พื้นฐาน / เพิ่มเติม)

---

## ✅ Phase 3 ต่อ: ปพ.6 + score decouple + optimistic UI — เสร็จ (2026-06-01)

เซสชันยาว · UX polish + ฟีเจอร์ใหม่ ปพ.6 · ทุก commit ขึ้น production แล้ว

### A. แยกหน้าบันทึกคะแนนออกจาก ปพ.5 (composition principle)
**หลักการ user:** "หน้าอื่นๆ = ส่วนประกอบ · พิมพ์รวมเล่ม = ตัวรวมส่วนต่างๆ"
- เดิม: ปุ่มพิมพ์หน้า score-structure ชี้ `/reports/pp5?...&parts=scores` (coupled กับ ปพ.5)
- ใหม่: route อิสระ `/reports/score-table` — PDF ชื่อไฟล์ "บันทึกคะแนน" (generateMetadata title)
- ย้าย 10 components ที่ใช้ร่วม (HeaderInfo, Pp5Frame, NumericTable, PrimaryAnnualSummary,
  PassFailTable, Pp5SimpleHeader, Pp5ScoreHeader, Pp5Footer, fmtScore, fmtGrade)
  → `reports/_shared/score-report.tsx` (neutral · route + booklet import ทั้งคู่ · ไม่ depend กันเอง)
- Bug fix: score PDF filename ค้างที่ "ระบบบันทึกผลการเรียนออนไลน์" — sem-tab print button
  ลืม `&embed=1` → pp5 generateMetadata gate (`if embed !== "1" return {}`) คืน {} → title default

### B. "ภาค N" → "ภาคเรียนที่ N" (8 ไฟล์ UI)
แก้เฉพาะข้อความที่ผู้ใช้เห็น (NOT "ระหว่างภาค" · NOT comments/internal)

### C. Optimistic UI ทั้งระบบ — แก้ "เลือกแล้วไม่ active ทันที"
**ปัญหา:** React 19 controlled `<Select value={prop}>` · value ผูกกับ prop จาก URL ·
อัปเดตตอน navigation commit เท่านั้น → dropdown/tab ค้างค่าเก่าจนโหลดเสร็จ
**แก้:** `useOptimisticValue(propValue)` — useState mirror + useEffect reset เมื่อ prop เปลี่ยน
- `OptimisticTabs` — client tab bar (เดือน/ภาคเรียน/sub-tab) optimistic active
- Applied: score-structure · attendance (รายวัน + by-subject) · teaching · subjects ·
  characteristics · competency · reading-thinking · teachers-filters · grade-filter · room-filter
- **DirectPrintButton** — กดพิมพ์ → modal overlay เต็มจอ "กำลังเตรียมรายงาน…" ทันที
  (กัน user กดที่อื่นระหว่างรอ) · dismiss ใน finally

### D. ปพ.6 รายนักเรียน (1 นักเรียน = 1 หน้า A4) — ใหม่ทั้งหมด
**เมนู:** "พิมพ์เล่มรายงาน" → "ปพ.6 รายนักเรียน" · **select-first**
ชั้น → ห้อง → ทั้งห้อง/รายบุคคล → นักเรียน → (ประถม) เทอม/ทั้งปี → อันดับ → ปุ่ม "สร้างรายงาน"

**Route:** `/reports/pp6?classroom=&semester=&student=&scope=&rank=&embed=`
- `scope=all|individual` · `rank` ON (default) = แสดง+เรียงตาม GPA · `rank=0` = ซ่อน+เรียงเลขที่

**Layout (ตาราง):**
- พื้นฐานก่อนเพิ่มเติม (category core→additional → learning_area → code)
- Pad วิชาเป็น 15 แถว + กิจกรรมเป็น 4 แถว (ความสูงหน้าเท่ากันทุกใบ · เกินแสดงจริงทั้งหมด)
- คอลัมน์: **ประถม = "เวลาเรียน (ชั่วโมง)"** (แสดง hours_per_year ดิบ) · **มัธยม = "น้ำหนัก (หน่วยกิต)"**
- GPA = Σ(เกรด × weight) ÷ Σ(weight) · ประถม weight = hours/40 · มัธยม = credit_hours · ร/มส = 0
- อันดับ = dense rank by GPA ในห้อง

**สรุปผลการประเมิน (ตารางมีเส้นขอบ):**
เวลาเรียนวิชาพื้นฐานที่ได้ → เพิ่มเติม → กิจกรรมพัฒนาผู้เรียน → **รวม** (พื้นฐาน+เพิ่มเติม+กิจกรรม) →
คุณลักษณะอันพึงประสงค์ → การอ่าน คิด วิเคราะห์และเขียน → กิจกรรมพัฒนาผู้เรียน → GPA (เต็มแถว)

**Selector — manual generate (ล่าสุด):**
- ไม่ auto-preview · กด "สร้างรายงาน" (ใต้ checkbox อันดับ) ค่อยโหลด iframe
- เปลี่ยนค่าใดๆ → preview reset (กันค้างค่าเก่า) · print/zoom เปิดเมื่อ generate แล้ว

**ลายเซ็นครูประจำชั้น:**
- คำนำหน้า "ครู{ชื่อ-สกุล}" (สั้นกว่า นาย/นาง → ไม่ตกบรรทัด) · เส้นประยาวขึ้นเมื่อมีครู 2 คน
- summary block: ตารางสรุป (ซ้าย 48%) · ลายเซ็น (ขวา 52%)

**Files:**
```
reports/_shared/score-report.tsx  ← 10 shared score components (extract จาก pp5)
reports/score-table/page.tsx      ← standalone "บันทึกคะแนน" print route
reports/pp6/page.tsx              ← route + Pp6Page/Pp6StudentPage + data fetch + GPA/rank
reports/pp6/pp6-selector-form.tsx ← select-first + manual "สร้างรายงาน" + iframe preview
setup/_components/use-optimistic-value.ts + optimistic-tabs.tsx  ← optimistic helpers
_components/direct-print-button.tsx ← loading overlay
_components/sidebar.tsx           ← + "ปพ.6 รายนักเรียน"
globals.css                       ← .pp6-* (page/logo/table/summary-table)
```

### Test verify (เมื่อกลับมา · ต้องมีคะแนนจริง)
```
# /reports/score-table?... → PDF ชื่อ "บันทึกคะแนน"
# /reports/pp6 → เลือกครบ → "สร้างรายงาน" → preview 1 นักเรียน/หน้า
#   ├─ ประถม: เวลาเรียน(ชม.) · สรุป "เวลาเรียนวิชา…ที่ได้"
#   ├─ มัธยม: น้ำหนัก(หน่วยกิต)
#   ├─ อันดับ ON → เรียง GPA + "ได้อันดับที่ N ของห้อง" · OFF → เลขที่
#   └─ ลายเซ็น "ครู…" ไม่ล้น · 2 ครู เส้นยาว
# ทุก dropdown/tab → active ทันที (optimistic)
# กดพิมพ์ → modal "กำลังเตรียมรายงาน…" เด้งทันที
```

### ค้าง (verify เมื่อมีข้อมูลจริง)
ปพ.6: ความถูกต้องของ activity fetch · gradeName wording · signature/decimal format
(ยังไม่ตรวจกับ PDF จริงเพราะยังไม่มีห้องที่คะแนนครบ)
5. ระดับชั้น (ประถม / มัธยม)
6. หน่วยกิต / เวลาเรียน / รวมเวลาเรียน
7. ครูผู้สอน
8. ครูประจำชั้น

**Approval block spacing:** `.pp5-cover-sig-decision > p:first-child
{ margin-bottom: 2.5rem }` (was 1.5rem) — ผอ. signature row no longer
crammed against the อนุมัติ/ไม่อนุมัติ checkboxes.

### J. New gotchas

6. **Preview iframe renders in `@media screen`, not `@media print`**.
   For changes to show in the pp5-selector-form preview (NOT just actual
   print), CSS rules must live outside `@media print`. Otherwise dev
   testing via preview sees nothing change.
7. **`student_number` vs `students.length`** — when class numbering is
   sparse (withdrew students), `Math.max(...students.map(s =>
   s.student_number))` is the correct upper bound for `PADDED_ROW_COUNT`
   and roomy-mode detection. Using `length` would miss e.g. student #35
   in a class of 33.
8. **CSS `min-height`-style behavior of `tr { height }`** — actual
   row height in tables is `max(tr-height, max(td-content-height))`. To
   shrink rows you must ALSO shrink padding + font/line-height on the
   cells, not just lower the tr height.

---

## NEXT UP — ปพ.5 รวมชั้น (per-classroom bundle) · planning notes 2026-05-19

User requested next phase. Discussed structure before implementing.
Placeholder route already exists at `/reports/pp5-class/page.tsx` (just a
"🚧 ยังไม่พร้อมใช้งาน" card).

### Decisions made

**Layout:** A4 portrait. Per-section paging.

**Page order:** Cover → เวลาเรียน (รายเดือน) → ผลการเรียน (1/วิชา) → Eval (3 หน้า).

**Cover:** styled like the reference image the user shared (a standard
ปพ.5 (รวม) school form). Single A4 portrait page containing:
- Logo + "ปพ.5 (รวม)" label top-right
- Title "แบบบันทึกผลการพัฒนาคุณภาพผู้เรียน"
- School line: name + อำเภอ + สังกัด
- Class meta: ชั้น · ปีการศึกษา · เวลาเรียน (ชม./ปี)
- Homeroom teachers (both slots)
- **Subject grade-distribution table** — for each subject (core +
  additional + activity), count students per grade bucket. 8 buckets:
  `0 · 1 · 1.5 · 2 · 2.5 · 3 · 3.5 · 4` (no 0.5).
- **3 eval summary tables (left)** — chars / reading-thinking /
  competency. Cols: จำนวน นร. · ดีเยี่ยม · ดี · ผ่าน · ไม่ผ่าน
- **Activity (pass/fail) summary** — cols: ทั้งหมด · ผ่าน · ไม่ผ่าน
- **Student count table (right)** — cols: ชาย · หญิง · รวม.
  Only "ที่มีในบัญชีทั้งหมด" row (other rows like
  เข้าระหว่างปี/ออกระหว่างปี/ซ้ำชั้น/เลื่อนชั้น dropped because the
  schema doesn't have that lifecycle data).
- Approval signatures: ครูประจำชั้น → หัวหน้าฝ่ายวิชาการ → ☐ อนุมัติ /
  ☐ ไม่อนุมัติ + ผู้อำนวยการ

**Attendance section (1 หน้า/เดือน):** mirrors `/reports/attendance`'s
daily-monthly calendar grid layout. No เดือน selector — print every month.
Add per-term summary + annual summary pages too.

**Score section (1 หน้า/วิชา):** all subjects taught in this classroom.
- Primary subject (numeric): annual summary only (`PrimaryAnnualSummary`)
- Secondary subject (numeric): current semester only (`NumericTable`)
- Activity subject (pass/fail): the existing `PassFailTable` layout

**Eval section (3 หน้า):** reuse `EvalReportPage` from `/reports/pp5/page.tsx`
in `compact={true}` mode (no logo, no signature footer).

**Selector form (`/reports/pp5-class` UI):**
- Inputs: ระดับชั้น + ห้อง (no subject — bundle covers all)
- Section toggles (parts) — same UX as pp5 รายวิชา
- Live preview iframe — same as pp5 รายวิชา

### Schema gaps noted

- `students.gender` exists → can derive ชาย/หญิง count ✓
- `enrollments.created_at` exists → could derive "เข้าระหว่างปี" but the
  user dropped that row from the design
- No `left_at` / `decision_type` columns → ออก/ซ้ำ/เลื่อน rows dropped

### Implementation plan (5 steps, incremental)

1. **Step 1 — Cover page only** — selector form + data fetch + cover JSX.
   Verify the cover renders correctly before adding more sections.
2. **Step 2 — Daily attendance section** — 1 page/month (12 pages annual /
   per-term for secondary).
3. **Step 3 — Score per subject** — loop subjects, render appropriate
   variant (primary annual / secondary semester / activity pass-fail).
4. **Step 4 — Eval 3 pages** — reuse `EvalReportPage` in `compact={true}`.
5. **Step 5 — Selector polish** — live preview iframe + zoom + print
   button (mirror pp5 รายวิชา UX).

To resume: open `/reports/pp5-class/page.tsx` (currently a placeholder) and
start with Step 1.

---

## Session 2026-05-20 — ปพ.5 รวมชั้น Step 1-2 + bundle polish

Two-step delivery + extensive UX/polish work on the per-classroom bundle.
Step 1 (cover) and Step 2 (monthly attendance) shipped; Step 3 (per-subject
scores) and Step 4 (3 eval pages) remain as placeholders.

### A. Cover page (Step 1) — `Pp5ClassCover` in `apps/admin/app/(admin)/reports/pp5-class/page.tsx`

**Layout** (single A4 portrait page):
- Top: school logo (64px centered) + "ปพ.5 (รวม)" label top-right
- Title: "แบบบันทึกผลการพัฒนาคุณภาพผู้เรียน"
- Two-line school header (user spec): line 1 = ชื่อโรงเรียน + อำเภอ + จังหวัด,
  line 2 = สังกัด (affiliation). Required adding `province` to the schools
  select query + prop type.
- Class meta: ชั้น/ปี/เวลาเรียน/ครูประจำชั้น (NO bold per user request)
- **Subject grade-distribution table** (13 cols, all widths locked via
  `<colgroup>` + `table-layout: fixed`):
  ที่ 4% · รหัสวิชา 8% · รายวิชา 30% · จำนวนนักเรียน 9% ·
  **0,ร,มส** + 1 + 1.5 + 2 + 2.5 + 3 + 3.5 + 4 (5% each = 40%) · หมายเหตุ 9%
  - First grade-bucket column renamed from "0" → "0, ร, มส" and absorbs
    `is_incomplete` + `is_no_eligibility` counts (combined with grade=0).
    Per user 2026-05-20: "0 ร มส เอาไปรวมกัน".
  - หมายเหตุ column now blank (since ร/มส moved into the combined col).
  - Subject name column gets `white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis;` — long names truncate with "…" instead of
    wrapping. User spec: "หากชื่อยาวล้นช่องให้ย่อเลย".
  - Row count padded to `MIN_SUBJECT_ROWS = 13` (module-level const) —
    blank rows pre-numbered 1-13 so the form looks complete regardless
    of actual subject count. User spec: "สร้างตารางรายวิชาไว้ 13 วิชา
    ถึงแม้จะมีไม่ถึง".
- **Eval summary grid** (2-col):
  LEFT col = chars + reading-thinking; RIGHT col = competency + activity
  pass/fail. `min-width: 0` on the grid items is the magic — grid items
  default to `min-width: auto` (= min-content), so without this the eval
  tables' intrinsic width would force the cell wider than the 1fr share
  and break the 2-column layout.
- **Approval signature block** — restructured per user image 2026-05-20:
  - "การอนุมัติผลการเรียน": 3 sigs in a row (homeroom×1 or ×2 +
    หัวหน้างานวัดและประเมินผล). `approveCells` array built dynamically:
    2 cells if 1 homeroom, 3 cells if 2 — `gridTemplateColumns` set
    inline via `repeat(${cells.length}, 1fr)` so distribution stays even.
    User spec: "ชั้นที่มีคนเดียวก็จัดให้ดี".
  - "เสนอเพื่อพิจารณา": 2-column (LEFT = รองผู้อำนวยการ signature, RIGHT =
    ☐ อนุมัติ / ☐ ไม่อนุมัติ + ผอ. signature stacked below with 1.8rem
    gap so director sig sits clearly below checkboxes).
  - Required adding `assessment_officer_name` + `deputy_director_name`
    to the schools select query + prop type.

**Approval typography:**
- Names (`.pp5-class-sig-name`): 14px → 13px (final), font-weight 500,
  `color: #000`. User confirmed cache issue with 10px test before
  settling on 13px.
- Roles (`.pp5-class-sig-role`): 12px.
- Checkboxes line (`.pp5-class-decision-line`): 14px so ☐ characters
  are clearly visible.

### B. Monthly attendance (Step 2) — `Pp5ClassMonthlyAttendance` in page.tsx

**Data flow:**
1. Compute `monthsInTerm`:
   - Primary: `[...TERM_MONTHS[1], ...TERM_MONTHS[2]]` (11 months)
   - Secondary: `TERM_MONTHS[semester]` (5 or 6 months)
   User spec 2026-05-20: "มัธยมเฉพาะภาคเรียน · ประถมทั้งปี".
2. `termForMonth(m)` helper picks term 1 for months 5-10, term 2 for
   11-12 + 1-3 — fed to `resolveCalendarYear` so Jan-Mar correctly bump
   to the next CE year.
3. Single paginated fetch for `attendance` (1000-row PostgREST cap) +
   parallel fetches for `workdays`, `holidays`. `fetchAttendanceRange`
   helper added (mirrors the pattern_supabase_pagination memory).
4. Group day-of-month sets + per-student attendance maps into
   `workdaysByMonth`, `holidaysByMonth`, `attByMonth` — one entry per
   month, so the rendered page just looks up its data.

**Table layout** (mirrors `/reports/attendance` monthly grid):
- ที่ 18px · ชื่อ-สกุล 150px · day-cols 13px×N · มา 24px · ขาด 24px ·
  ลา 24px · ร้อยละ 44px. Total ≈ 687px (31-day month) — fits 702px
  paper-box content area with ~15px buffer.
- Status chars: `/` (present) · `×` (absent) · `ล` (leave) · `ป` (sick)
- Row padding: ≥ 30 rows OR max student_number (same convention as
  /reports/attendance + cover subject table).
- `att-table--roomy` modifier when ≤ 30 students for taller rows.

**Per-section CSS (`.pp5-class-monthly-att`):**
- Compact column widths in **screen** mode (default `.att-table` widths
  designed for 1100px-wide standalone .pp5-page would overflow the
  210mm A4 paper-box used in the bundle preview).
- Student name font 13px (other cells 8.5px, day cells 7px).
- name column trial sequence: 115 → 165 → 160 → **150px** (final) —
  earlier values caused the right border to clip in 31-day months
  due to subpixel rounding at 88% zoom. 150px gives ~15px total slack.

### C. Selector form polish — `pp5-class-selector-form.tsx`

- **Filter classrooms to current academic year only** in
  `Pp5ClassSelector()` (server). Previously the query fetched all years
  → dropdown showed "ป.1/1" twice (one row per academic_year). Query
  now does an extra hop to `academic_years` (`is_current = true`) then
  `.eq("academic_year_id", ...)` on classrooms.
- **Don't auto-select first room on mount** — start `roomId = ""`. User
  spec: "อย่าพึ่งแสดงพรีวิวก่อน ให้ผู้ใช้เลือกห้องก่อน".
- **Auto-select when grade has only 1 room** — `useEffect` watches
  `rooms` and sets `roomId` to `rooms[0].id` when length === 1. Combined
  with hiding the dropdown for single-room grades (`{rooms.length > 1
  && ...}`), the form skips the redundant click. User spec: "ชั้นที่มี
  ห้องเดียว ไม่ต้องให้เลือกห้องอีก".
- **Reset roomId to "" on grade change** so multi-room grades require
  an explicit pick after switching.
- **Auto-jump to preview tab** (narrow screen) when roomId becomes
  non-empty; flip back to "config" when roomId clears.
- **Print button disabled while iframe is loading** — added `isLoading`
  to the `disabled` prop condition on BOTH selectors (รายวิชา and
  รวมชั้น). User spec: "ขณะที่รอโหลดพรีวิว ห้ามให้กดปุ่มพิมพ์รายงาน".
- **Empty state messages** — 3-tier logic:
  `rooms.length === 0` → "ยังไม่มีห้องเรียน"
  `!selectedRoom` → "เลือกห้องเรียนก่อน"
  `enabledSections.length === 0` → "ยังไม่ได้เลือกส่วนที่จะพิมพ์"

### D. Preview iframe styling — `isEmbed` inline `<style>` block in page.tsx

- **Paper-box layout** mirrors `/reports/pp5` per-subject preview:
  body gray bg `#e2e8f0`, `.pp5-page` transparent + max-width 210mm,
  each `.pp5-page-content` is a white box with `padding: 14mm 12mm`,
  shadow, border, and `min-height: 250mm` — looks like browser print
  preview pages.
- **`@page` override** for the iframe context: `margin: 15mm 12mm 5mm`
  (vs globals.css default 7mm). Needed because CSS Paged Media `page`
  property on inner elements doesn't always apply to the FIRST printed
  page in Chrome — so the named `@page pp5-class-cover-page` didn't
  affect print. Inline `@page` override at the iframe document level
  catches every page. User spec: "ที่แบบพิมพ์ยังอยู่ที่เดิม".
- **Hide scrollbar** with three cross-browser declarations
  (`scrollbar-width: none` · `-ms-overflow-style: none` ·
  `::-webkit-scrollbar { display: none }`). Scroll functionality stays.

### E. Globally — solid black text for ALL official document content

User spec 2026-05-20: "เอกสารแบบนี้ต้องดำสนิท". 18 selectors changed
from gray-ish (`#18181b`, `#52525b`, `#71717a`) to `#000`. The biggest
impact change was `.pp5-page color: #18181b → #000` — root of inheritance
for all printable text in the per-subject + per-class + attendance
reports. Specific overrides also bumped:
- `.pp5-meta-line`, `.pp5-school-name`, `.pp5-school-affiliation`
- `.pp5-label`, `.pp5-section-title`, `.pp5-section-hint`, `.pp5-legend-small`
- `.pp5-sig-name`, `.pp5-cover`, `.pp5-cover-affiliation`, `.pp5-cover-lbl`
- `.pp5-wk-week-date`, `.att-wk-date`, `.att-summary-table`
- `.pp5-class-label`, `.pp5-class-subhead`, `.pp5-class-sig-name`

Intentionally KEPT gray:
- UI chrome (`.pp5-back`, selector form labels, zoom select)
- Status colors (green/red/orange for present/absent/leave)
- Border colors (`#71717a`, `#a1a1aa`)
- Empty-state placeholders ("ไม่มีข้อมูล" italic)
- Group badges (blue-900 term group, yellow-900 workday row)

### F. Visual page-break in screen mode

Added `.pp5-page-content + .pp5-page-content` rule in `@media screen`
with dashed top border + `::before` "— หน้าใหม่ —" label. Applies
across all pp5 previews (per-subject + per-class + att). In print the
real `break-before: page` (already present) handles physical pagination
and the label is hidden by the @media screen scope. User spec
2026-05-20: "หน้าพรีวิวให้แสดงแบบแยกหน้าชัดเจน".

### G. Bug fixes during the session

- **React duplicate key error** in cover subject table — DB has two
  subjects with same `code="ท16101"` (different ids). Changed key from
  `s.subject.code` to `s.subject.id` (UUID, guaranteed unique).
  Required adding `id: string` to the SubjectSummary subject sub-type
  in the cover prop. User report: "เกิดจากอะไร" (Encountered two
  children with the same key, `ท16101`).
- **Cross-year subject_offerings** — `/setup/subjects` UI filters by
  current `academic_year_id` (so users see 1 subject for ป.6/1) but the
  cover query joined subject_offerings without that filter (so it
  showed 3 = 2 dup ภาษาไทย from year 2570 + 1 ภาษาไทย year 2569). Fix:
  added `academic_year_id` to the subjects select + filter
  `o.subject.academic_year_id !== yearId` in the grouping loop.
  Surveyed all 9 classrooms in year 2569 to verify behavior:
  - ป.1/1, ป.5/1, ม.1/1, ป.6/1 — work correctly post-fix
  - ป.1/2, ป.2/1, ป.3/1, ม.2/1 — no offerings (haven't registered yet)
  - ป.4/1 — 5 offerings all pointing to year 2570 subjects (user's
    test data); post-fix cover renders empty subject table. User
    confirmed: "ป.4 ฉันทดสอบเฉยๆ ปล่อยไว้ได้".

### H. Gotchas worth remembering

- **Browser cache + iframe HMR**: when changing CSS, the iframe's own
  document might keep stale CSS until URL changes (a toggle flip
  works). Ctrl+Shift+R on the parent doesn't always propagate.
- **CSS Paged Media `page` property quirk in Chrome**: assigning
  `page: name` to an inner element doesn't always apply to the FIRST
  printed page (no `break-before` precedes it). Workaround: redefine
  the default `@page` inline in the iframe document.
- **Subpixel rounding at non-100% zoom** clips right table borders when
  total table width touches the container exactly. Always leave at
  least ~10-15px buffer total (5-7px each side after auto-center) on
  wide tables.
- **CSS `text-overflow: ellipsis` requires THREE props together**:
  `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`.
  Missing nowrap and the text wraps to a new line instead of
  truncating.
- **Grid items default to `min-width: auto` (= min-content)** — set
  `min-width: 0` on grid children when the contained element has an
  intrinsic width (like a table) that would otherwise push the cell
  wider than its 1fr share.
- **Subjects table is per-academic-year** (each year has its own
  subject records with own ids). subject_offerings can outlive subject
  rebuilds → orphaned offerings pointing to old/stale subject ids in a
  different year. Always filter by `subject.academic_year_id =
  classroom.academic_year_id`.

### Remaining (resume from here)

1. **Step 3 — Score per subject** in `Pp5ClassPage` (placeholder still
   at line ~691). User spec: 1 page/subject:
   - Primary: annual summary only (reuse `PrimaryAnnualSummary` from
     `/reports/pp5/page.tsx`)
   - Secondary: current semester only (reuse `NumericTable`)
   - Activity subjects: pass/fail layout (reuse `PassFailTable`)
2. **Step 4 — Eval pages (3 pages: chars, reading-thinking, competency)**.
   Reuse `EvalReportPage` from `/reports/pp5/page.tsx` in
   `compact={true}` mode.
3. Optional: data integrity migration to fix cross-year
   subject_offerings (or add a DB constraint preventing them).

---

## Session 2026-05-22 (Part 2) — Teacher CRUD cleanup + admin-grant + bulk-delete + subject fixes

> ต่อจาก Part 1 · ทั้งหมด `tsc --noEmit` ผ่าน · ยังไม่ทดสอบกับข้อมูลจริง

### 1. แดชบอร์ดแอดมิน — รายละเอียดเพิ่ม
- **Bug นับนักเรียน**: filter ตาม semester scope (primary→0, secondary→current_sem) กันมัธยมนับ 2 ครั้ง
- **Bug นับห้องเรียน**: เฉพาะห้องที่มีนักเรียน > 0 ในภาคปัจจุบัน
- **Widget redesign**: ลบตัวเลข filled/expected · แสดง % เท่านั้น + progress bar
- **Font**: `font-sans tabular-nums` (Sarabun) แทน `font-mono`
- **Icon ตรงกับ sidebar**: Heart / Brain / Activity

### 2. Teacher form cleanup — `setup/teachers/`
- ลบช่อง `teacher_code` (ไม่ใช้ที่ไหน · dead field)
- ลบช่อง `subject_specialty` (เหมือนกัน)
- DB columns ยังอยู่ใน schema · drop ทีหลังได้
- **ตำแหน่ง = Select** 3 ตัวเลือก: ผู้อำนวยการ / รองผู้อำนวยการ / ครูผู้สอน · ค่าเก่าที่ไม่ตรงเก็บไว้แสดง "(ค่าเดิม)"

### 3. List sort ใหม่
1. ผู้อำนวยการ
2. รองผู้อำนวยการ
3. ครูผู้สอน → เรียงตาม `learning_areas.sort_order` แล้วชื่อ

ดึง `learning_areas` (name_th, sort_order) ขนานใน Promise.all → build deptOrder map

### 4. Admin-grant — Checkbox "ให้สิทธิ์เป็นแอดมิน"
- `createTeacher`: switch email domain + role ตาม checkbox
- `updateTeacher`: รองรับ toggle admin ↔ teacher
  - Order: rewrite auth email ก่อน → update users.role → กัน race
- ผู้บริหารกับ teachers row ทำงานคู่กัน (admin role + teachers row · ไม่มี DB constraint ห้าม) → ปรากฏใน rosters + login ผ่าน admin app

### 5. ปุ่มลบครู — strict + force mode
- **Strict**: pre-check subject_offerings count > 0 → block
- **Force** (test data):
  - NULL out attribution FKs (attendance/eval recorded_by/evaluated_by)
  - DELETE announcements ที่เป็น author
  - DELETE teachers → CASCADE → users + auth.users
- **UI**: SweetAlert2 dialog 3 ตัวเลือก + 2-step confirm สำหรับ force

### 6. ปุ่มลบปีการศึกษา — เพิ่ม force mode
- ใช้ pattern เดียวกัน
- Force: DELETE holidays + subjects + classrooms ก่อน → DELETE academic_year
- Cascade chain: subjects → offerings → scores · classrooms → enrollments/homerooms/attendance · academic_year → 3 eval tables

### 7. Subject re-add recovery — `createSubject`
**Bug**: deleteSubject ทำ unlink เฉพาะ study_plan_subjects (preserve row · shared subjects) → INSERT รหัสซ้ำชน UNIQUE

**Fix**: catch 23505 + helper `recoverFromDuplicateCode`:
- (a) อยู่ใน plan นี้แล้ว → error
- (b) link plan อื่นเท่านั้น → ไม่แตะ fields · แค่ link เข้า plan นี้
- (c) orphan → UPDATE fields + link → recover transparent

### 8. หน่วยกิตประถม — แก้ misinterpretation
**ก่อน**: ประถม core/additional แสดง "หน่วยกิต" — ผิด · สพฐ. 2551 ประถมไม่มีระบบหน่วยกิต

**หลัง** — `usesCredits = isSecondary && !isActivity`:
| ระบบ | Category | Label | Column |
|---|---|---|---|
| ประถม | core/additional | ชั่วโมง/ปี | `hours_per_year` |
| ประถม | activity | ชั่วโมง/ปี | `hours_per_year` |
| มัธยม | core/additional | หน่วยกิต | `credit_hours` |
| มัธยม | activity | ชั่วโมง/ภาค | `hours_per_year` |

- `parseForm` ปรับ: รับทั้ง 2 field โดยไม่ branch ตาม category (form decides)
- ข้อมูลเก่า credit_hours ของประถม ค้างใน DB · ไม่แสดงในฟอร์มใหม่ · admin กรอกใหม่

### 9. ตารางสรุปเวลาเรียน — แก้สีดำสนิท
- `.att-summary-table .att-group` (เทอม 1/2/สรุปทั้งปี) สี `#1e3a8a` → `#000`
- `.att-summary-table .att-workday-row th` (วันทำการ + เลข) สี `#713f12` → `#000`
- พื้นหลัง (blue + yellow tint) เก็บไว้

### 10. Misc decisions
- **ผู้บริหาร**: ตัดสินใจใช้ของเดิม — เก็บแค่ชื่อใน `schools.director_name/etc.` (text · ไม่ login)
- **ปรึกษาเพิ่ม "ผู้บริหาร" ใน learning_areas**: คิดไว้ · user เลือก "ไม่ต้องแก้ ยังไม่สำคัญ"
- **Excel formula transliterate ชื่อ-สกุล**: ให้สูตรไป (helper columns + nested IF · split title prefix + ชื่อ + นามสกุล)

---

### 🔜 ครั้งหน้าทำต่อ
- ทดสอบข้อมูลจริง · เจอ bug ค่อยกลับมาแก้
- Cleanup migration (ถ้าอยากเคลียร์ schema):
  - `ALTER TABLE teachers DROP COLUMN teacher_code, subject_specialty`
  - ย้ายค่า `credit_hours` ของวิชาประถมเก่า → `hours_per_year` (ถ้าค่าเดิมเป็นชั่วโมงจริง)
- Pending features:
  - Teacher-scoped widget (homeroom-only pending evals)
  - Score widget (จำนวน offering ที่ยังไม่บันทึก) — skip จาก v1

---

## Session 2026-05-22 (Part 3) — Production deploy + UX polish

> สิ้นสุดวันนี้: ระบบขึ้น production บน Vercel ครบทั้ง 2 apps · พร้อมใช้งานจริง

### 1. Subjects list UI polish
- **ลบช่อง "วิธีประเมิน"** จากฟอร์มเพิ่ม/แก้วิชา · คงเหลือเลือก category อย่างเดียว (grading_mode ตัดสินใจอัตโนมัติใน parseForm) · rename legend "ประเภทและการประเมิน" → "ประเภทวิชา"
- **Column "หน่วยกิต/ชั่วโมง" ใน list**: ปรับ display ตาม system
  - ประถม → header "ชั่วโมง/ปี" · cell แสดง "X ชม./ปี"
  - มัธยม → header "หน่วยกิต" · cell แสดง credit_hours
  - มัธยม activity → "X ชม./ภาค"
- **Font**: cell ใช้ `font-sans tabular-nums` (Sarabun + เลขความกว้างเท่ากัน) แทน `font-mono`

### 2. Attendance per-subject grid fixes (รองรับ ชั่วโมง/ปี ของประถม)
**Bug**: ตอนเปลี่ยน credit_hours → hours_per_year สำหรับประถม · หน้า `/setup/attendance/by-subject` + `/reports/attendance-by-subject` คำนวณ slotsPerWeek จาก credit_hours อย่างเดียว → ประถมเห็น 1 ช่อง/สัปดาห์ทุกวิชา (ผิด)

**Fix**: slotsPerWeek แยกตาม (system, category):
- Secondary core/additional → `credit_hours × 2`
- Primary core/additional   → `hours_per_year ÷ 40` (40 weeks/year)
- Primary activity          → `hours_per_year ÷ 40`
- Secondary activity        → `hours_per_year ÷ 20` (20 weeks/term)

ตัวอย่าง: ภาษาไทย ป.1 ที่ตั้ง 200 ชม./ปี → 200/40 = 5 ช่อง/สัปดาห์ (เท่ากับ credit_hours=2.5 เดิม)

Display ปรับ: ประถมแสดง "X ชม./ปี" · มัธยมแสดง "X หน่วยกิต"

### 3. Teacher list — sort + dropdown ครอบทั้ง app
- **List** (`/setup/teachers`): ใช้ `learning_areas.sort_order` เป็นเกณฑ์ tertiary
  ```
  Sort: ผู้อำนวยการ → รองผู้อำนวยการ → ครูผู้สอน (ตาม กลุ่มสาระ → ชื่อ)
  ```
- **Dropdown** `/setup/teaching` (จัดครูเข้าสอน): sort เดียวกัน · เพิ่ม `position`+`department` ใน query + parallel `learning_areas`
- **Dropdown** `/setup/homerooms` (ครูประจำชั้น): sort เดียวกัน · แปลง 2 sequential awaits เป็น Promise.all

### 4. Subject re-add bug fix
**Bug user**: ลบวิชาแล้วจะเพิ่มใหม่ด้วยรหัสเดิม → "ใช้ไปแล้ว"

**Root cause**: `deleteSubject` ทำ unlink เฉพาะ `study_plan_subjects` row (preserve subjects row · shared subject across plans pattern)

**Fix** `createSubject` catch error code 23505 + `recoverFromDuplicateCode`:
- (a) มีในแผนนี้แล้ว → error "วิชานี้อยู่ในแผนนี้แล้ว"
- (b) link plan อื่นเท่านั้น → link เข้าแผนนี้ · ไม่แตะ subject fields
- (c) orphan (ไม่มี plan link) → UPDATE fields + link → recover transparent

### 5. Dashboard spinner UX
**Iteration 1**: เพิ่ม `<Suspense>` + key รอบ subjects table — ขยาย/refetch ตอนเปลี่ยนชั้น

**Issue user**: "เลือกชั้นแล้ว spinner ไม่ขึ้นทันที · มีหน่วงก่อน"
- สาเหตุ: Suspense fallback กระตุ้นเมื่อ new RSC เริ่ม render · ระหว่าง network fetch ยังเห็นของเดิม

**Iteration 2**: ใช้ `useTransition` + spinner ข้าง dropdown — แต่ user "ไม่อยากเห็นข้าง dropdown · อยากเห็นในพื้นที่ตาราง"

**Iteration 3 (final)**: สร้าง `NavigationGate` client component
- watch `useSearchParams()` ทันที (client-side · 0ms)
- compare URL params กับ rendered props (server-rendered)
- mismatch → ซ่อน children + แสดง spinner ในพื้นที่ตาราง

→ ตอนนี้คลิกชั้น ตารางหายทันที + spinner ขึ้นเลย

### 6. Production Deploy (Vercel)
**Pre-deploy**:
- ✅ Initial commit + git init (project ไม่เคยอยู่ใน git มาก่อน)
- ✅ Verified `.gitignore` ครอบ `.env.local` (ใช้ `git check-ignore`)
- ✅ Git user (local repo only): `Topchanon <topchanon@gmail.com>`
- ✅ Commit: `abe9333` · 213 files
- ✅ Push → `github.com/WebAppSchool-By-Chanon/pp5-grade` (private)
- ✅ Production build ทดสอบ local: admin 34 routes / parent 3 routes ผ่านทั้งคู่

**Deploy steps**:
1. **Admin** `pp5-admin` project · Root Directory `apps/admin` · 4 env vars (รวม SERVICE_ROLE_KEY)
2. **Parent** `pp5-parent` project · Root Directory `apps/parent` · 3 env vars (NO SERVICE_ROLE_KEY)
3. **Supabase Auth URLs** ตั้ง 4 URLs:
   - Site URL: `https://pp5-grade-admin.vercel.app`
   - Redirect URLs: admin/parent vercel + localhost:3000/3001 (มี `/**` wildcard)

**Production URLs**:
- 🔧 Admin: https://pp5-grade-admin.vercel.app
- 👨‍👩‍👧 Parent: https://pp5-grade-parent.vercel.app
- 📦 Code: github.com/WebAppSchool-By-Chanon/pp5-grade

**Test**: login admin ใน production ผ่าน ✅

### ⚠️ Pending after deploy
- **Rotate SUPABASE_SERVICE_ROLE_KEY** (key เคยถูกส่งในแชต · user ข้ามไว้ก่อน · แนะนำ rotate ภายหลังเพื่อความปลอดภัย)
- **Apply migrations ใน prod Supabase** — ยังไม่เช็คว่าทุก migration ที่อยู่ใน `migrations/` apply ใน production Supabase หรือยัง · ถ้าหน้าใดเพี้ยน → ตรวจตรงนี้
- **Custom domain** (optional) — admin.school.ac.th / parent.school.ac.th

### 🔜 Workflow ครั้งหน้า
```
1. แก้โค้ดในเครื่อง
2. ทดสอบ localhost:3000
3. git push → Vercel auto-deploy ทั้ง 2 apps (~3 นาที)
```
- Auto-deploy: default ON · ทุก push ขึ้น main branch จะ trigger build
- Preview deployments: branch อื่น push ขึ้นไปก็ได้ preview URL อัตโนมัติ

---

## Session 2026-05-30 — Login redesign + Multi-school deployment plan

### งานที่ทำเสร็จ (commit `aaa12cf` pushed)

#### 1. Teaching page skeleton loading
- **ปัญหา**: เปลี่ยน classroom selector แล้วตารางวิชาเก่าค้างอยู่จนกว่า RSC ใหม่จะมาถึง · admin ไม่รู้ว่ากำลังโหลด
- **แก้ 2 layers**:
  - `NavigationGate` — client component watch `useSearchParams()` (instant 0ms · ก่อน network เริ่มด้วยซ้ำ)
  - `<Suspense key={classroomId}>` + `<TeachingSkeleton>` fallback (RSC streaming phase)
- ทั้ง 2 layer แสดง skeleton เดียวกัน → ไม่มีรอยต่อระหว่าง 2 phase
- ไฟล์ใหม่: `navigation-gate.tsx`, `teaching-skeleton.tsx`
- Pattern เดียวกับ `/setup/subjects` ที่ทำไว้ก่อนหน้า

#### 2. Login redesign — admin (น้ำเงิน) + parent (ชมพูเข้ม)
- **`LoginPage` เป็น async server component**: fetch `schools` (name_th, affiliation, logo_url)
- **Identity block ในการ์ด**: โลโก้ (วงกลม 80px + ring) + ชื่อโรงเรียน + สังกัด · แสดงด้านบนของ form
  - ถ้ายังไม่มี row `schools` → ซ่อน block (form ยังโผล่)
  - ถ้ามีโรงเรียนแต่ไม่มี logo → fallback เป็น icon `School`
- **Layout**: `bg-gradient-to-br from-white via-primary-50/60 to-primary-100/70` + radial blur blobs 2 ก้อน
- **Admin (น้ำเงิน · primary)**: gradient strip บนการ์ด `from-primary-500 via-primary-600 to-primary-700` · ring `primary-100`
- **Parent (ชมพูเข้ม · pink)**: เปลี่ยนทั้งหมดเป็น pink — `from-pink-500 via-pink-600 to-pink-700` + bg + ring
  - ปุ่ม submit: `!bg-pink-700 !text-white hover:!bg-pink-800` (ใช้ `!` เพราะ `cn()` ไม่ใช่ tailwind-merge)
  - ลบ footer "1 รหัสนักเรียน = 1 บัญชี · ครอบครัวใช้ร่วมกันได้" ออก

#### 3. Rebrand
- **Admin** sidebar/title: `ระบบ ปพ.5` → `ระบบบันทึกผลการเรียน` + subtitle `(ปพ.5 ออนไลน์)`
- **Parent** header + tab title + root metadata: `ระบบ ปพ.5` → `ระบบรายงานผลการเรียน`
- **Parent** tagline: `สำหรับผู้ปกครอง` → `สำหรับนักเรียนและผู้ปกครอง`
- **Sidebar กว้างขึ้น**: `md:w-60` → `md:w-72` (รับข้อความใหม่ที่ยาวกว่า)

#### 4. PP.5 รวมชั้น cover improvements
- Source subjects จาก `study_plan_subjects` (เดิมใช้ `subject_offerings` ที่ต้องมี teacher assignment → ขาดวิชาที่ยังไม่ assign ครู)
- รวมเวลาเรียน/ปี ของทุกวิชา**รวมกิจกรรม** สำหรับประถม
- Compact mode (`.pp5-class-cover--compact`) เมื่อ >13 วิชา + ขยับ header/footer ของหน้าปก
- Officer signature fallback: `assessment_officer_name` → `academic_head_name`
- Truncate long student names with `…` globally — รุ่นเดียวกับ pp5-class · pp5 รายห้อง · attendance ทุกหน้าพิมพ์ (`.pp5-table .pp5-name`: `white-space:nowrap` + `overflow:hidden` + `text-overflow:ellipsis`)

#### 5. Mobile responsive sweep
- **Mobile drawer + hamburger menu** ผ่าน `MobileNavContext` (Provider ใน `(admin)/layout.tsx`)
- **Tables**: `overflow-x-auto` + `min-w-[N]` wrapper + ซ่อนคอลัมน์รองบนมือถือ
  - subjects (`hidden md:table-cell` + dual-render)
  - teaching, academic-years, teachers, students (`overflow-x-auto`)
- **Subjects/teaching list** mobile stacking: code+name in cell, name+meta combined
- **Teacher dropdown** (`/setup/teaching` + `/setup/homerooms`): drop title prefix, sort ตาม `learning_areas.sort_order` เดียวกับ list หน้าจัดการครู

---

### Discussion: Multi-school deployment plan (คุยกัน · ยังไม่ลงมือ)

**สถานการณ์**: User อยากใช้ระบบสำหรับโรงเรียนอื่นด้วย ช่วงทดลอง

**คำถามที่ user ตอบ**:
1. ไม่เกิน 10 โรงเรียน (ทดลอง)
2. ฟีเจอร์เหมือนกันเป๊ะทุกที่
3. ส่งมอบให้ admin โรงเรียนดูแลเอง (Supabase + Vercel + GitHub ของแต่ละ รร.)
4. Free ทั้งหมด (ทดลอง · หาบั๊ก)

#### Decision: Option A — 1 deployment ต่อ 1 โรงเรียน
- Option B (1 repo + multi Vercel ของคุณ) **ใช้ไม่ได้** เพราะ admin โรงเรียนถือ infra เอง
- Option C (multi-tenant) **ใช้ไม่ได้** เพราะต้อง rewrite ใหญ่ + ขัดกับ "ดูแลเอง"

#### Update workflow ที่ admin โรงเรียนทำได้เอง
```
Code update:
  คุณ push upstream → admin โรงเรียนกด "Sync fork" บน GitHub
  → Vercel auto-deploy
  → ใช้เวลา ~30 วินาที · ไม่ต้องใช้ git

Schema update:
  คุณส่ง SQL file → admin paste ลง Supabase SQL Editor
  → ~1-2 นาที
```

#### Hybrid 3 ส่วนสำหรับ seed data
1. **Static SQL bootstrap** `packages/database/seeds/01-bootstrap.sql`
   - Global tables: `learning_areas` (8 กลุ่มสาระ), `grade_levels` (ป.1-ม.6 ครบ 12), `characteristics` (8 ลักษณะ), `schools` (1 row เปล่า)
   - Admin user คนแรก
2. **Template JSON ใน repo** `packages/database/seeds/subjects-template-2551.json`
   - วิชาพื้นฐานตามหลักสูตรแกนกลาง 2551 · user confirm "พื้นฐาน ตรง"
   - **ไม่รวม**: วิชาเพิ่มเติม + กิจกรรม (แต่ละ รร. ต่างกัน)
3. **Import button ใน app** ที่ `/setup/subjects`
   - Dialog: เลือกชั้นที่เปิดสอน (checkbox ป.1-ม.6 · default ป.1-ป.6 สำหรับ รร. กลุ่มเป้าหมาย)
   - Server action: สร้าง `classrooms` + `subjects` + `study_plans` + `study_plan_subjects` ผูกกับ year ปัจจุบัน

#### Phase plan (ยังไม่เริ่ม)
- **Phase 1** Dump + extract template (1-2h)
- **Phase 2** Bootstrap SQL (1h)
- **Phase 3** Import feature ใน app (3-4h)
- **Phase 4** Setup guide markdown + screenshots (1-2h)

#### Risk / Note
- Free tier limits: Supabase project pause หลัง 7 วันไม่ใช้ · DB 500MB · Vercel Hobby 100GB bandwidth (ไม่ commercial → OK)
- ถ้า admin โรงเรียนไม่ sync fork → ใช้เวอร์ชันเก่า · ต้องคิด version check ใน app ภายหลัง

---

### Discussion: ปพ.6 รายงานผลการเรียนรายบุคคล

**Question**: ถ้าเพิ่มเมนูพิมพ์ ปพ.6 ทีหลัง — ต้องสร้างตารางใหม่ใน DB ไหม?

**Answer**: ส่วนใหญ่**ไม่ต้อง** — ตาราง 90% ที่ ปพ.6 ใช้มีอยู่แล้ว
- **มีครบ**: grades (มี `grading_period: 'semester' | 'annual'`), characteristic_evaluations, reading_thinking_evaluations, competency_evaluations, attendance, schools, homeroom_assignments, grade_scales
- **อาจขาด 2 อย่าง** (ขึ้นกับรุ่น ปพ.6 ที่ใช้):
  - น้ำหนัก/ส่วนสูง/สมรรถภาพ → ถ้าจะเก็บ ใช้ตาราง `student_health_records` (1 row/นักเรียน/ภาคเรียน)
  - ความเห็นครูประจำชั้น/เลื่อนชั้น → `student_annual_remarks` (1 row/นักเรียน/ปี)

#### 3 ทางเลือก
- **(A) ทำจากข้อมูลที่มี · ช่องที่ขาดเป็นเส้นว่างกรอกด้วยมือ** — MVP · ไม่เพิ่มตาราง
- **(B) เพิ่ม 2 ตาราง + 2 UI กรอก** — ครบทุกฟิลด์
- **(C) เพิ่มเฉพาะ "ความเห็นครู" · น้ำหนัก skip ก่อน** — กลาง

**แนะนำ**: ทาง A สำหรับ MVP — ไม่ขัด setup โรงเรียนใหม่ · เพิ่มทีหลังได้ผ่าน Sync fork workflow

---

### 🔜 Pending decisions (รอ user ตอบเมื่อกลับมาทำต่อ)

**Multi-school setup**:
1. **Admin user แรกใช้รหัสผ่านยังไง?**
   - (a) Hard-code default `admin1234` ใน SQL · บังคับเปลี่ยนตอน login ครั้งแรก
   - (b) Admin โรงเรียนแก้ SQL ก่อน paste
   - (c) Generate ใน app — ครั้งแรกที่เข้า `/login` เห็นปุ่ม "Setup admin user"
2. **ห้องเรียนต่อชั้น default = 1** หรือให้ admin เลือก checkbox ในตอน import?
3. **รวม 7 migration files + initial schema เป็น baseline ตัวเดียว** หรือ admin run 8 ไฟล์ตามลำดับ?

**ปพ.6**:
4. **ปพ.6 รุ่นไหน** — สพฐ. มาตรฐาน หรือมี custom ของโรงเรียน?
5. เลือกทาง **A / B / C**?
6. **รวมในแผน setup โรงเรียนใหม่** (= Phase 5) หรือ **แยกทำหลัง deploy โรงเรียนแรก**?

---

### 🛑 หยุดพักเซสชันนี้
- **ครั้งหน้ามาต่อ**: ตอบ 6 ข้อ pending → เริ่ม Phase 1 (Dump schema + extract subject template)
- **Working tree**: clean หลัง append doc นี้ + commit ใหม่

---

## Session 2026-05-31 — Loading UX, teacher filters, titles/filenames, select-first flow

> เซสชันยาวมาก · งาน UX/polish หลายเรื่อง · commit เป็นชุดๆ

### 1. Loading UX overhaul (commit `9eff9d8`)
**ปัญหา**: กดเมนูข้าง/เปลี่ยนชั้น → เนื้อหาเก่าค้าง (Next 16 client nav ค้าง content ใน shared-layout Suspense)
- **NavigationOverlay** (กดเมนูข้ามหน้า): `useLinkStatus` ใน sidebar → bump context → overlay skeleton ทันที · ครอบด้วย `usePathname` change → ซ่อน
- **FilterNavProvider/Gate/Link** (เปลี่ยน dropdown/tab ในหน้า): `startNav()` imperative ตอน onChange/onClick → `pending` (derived จาก searchParams snapshot) → skeleton 0ms
  - **เปลี่ยนจาก useSearchParams-gate เดิมที่ไม่เคยทำงาน** (URL อัปเดตตอน commit ใน transition → ไม่มีช่วง mismatch)
- ครอบ 10 หน้า: subjects/teaching/students/attendance(×2)/score-structure/characteristics/reading-thinking/competency/activities
- `FilterNavLink` = `<Link>` + startNav (สำหรับ tab/เดือน/สัปดาห์)

### 2. หน้าครู (commit `9eff9d8` + `1e22d03`)
- 3 filters: ตำแหน่ง / กลุ่มสาระ / สถานะ(default ใช้งาน) · จอเล็กบรรทัดเดียว สัดส่วน flex (กลุ่มสาระกว้างสุด)
- ย้าย toggle ปิดใช้งาน → ฟอร์มแก้ไข (`showStatus` + updateTeacher รับ is_active)
- mobile `table-fixed` (ไม่เลื่อน + ชื่อ truncate)
- ลบ dead code (`toggle-active-form.tsx` + action `toggleTeacherActive`)

### 3. บันทึกเวลาเรียน
- เมนู "รายวัน(โฮมรูม)" · "เทอม X"→"ภาคเรียนที่ X" ทุกจุด
- รายวิชา grid: คอลัมน์ "รวม" เลิก sticky (เลื่อนกับตาราง) · legend ย้ายนอก scroll (ล็อก)

### 4. นักเรียน/ปพ.5 รวมชั้น
- นักเรียน mobile `table-fixed`
- ปพ.5 รวมชั้น: เลือกชั้นก่อนค่อยแสดง preview (`gradeId=""` + placeholder)

### 5. Overlay z-index fix (`9eff9d8`)
- attendance sticky columns (`zIndex:30` inline + `z-20`) ทะลุ NavigationOverlay (z-10)
- แก้: overlay `z-40` + `isolate` (stacking context) · audit max sticky z = 30

### 6. Title bar คงที่ทุกหน้า (commit `3bb4bad`)
- root layout `title: "ระบบบันทึกผลการเรียนออนไลน์"` (ค่าคงที่ ไม่มี template)
- 35 page ลบ suffix "· ระบบ ปพ.5" → constant (batch ด้วย PowerShell + .NET UTF8 no-BOM — Thai-safe)

### 7. ชื่อไฟล์ PDF รายงาน (commit `5441f6a` + `b592a9b`)
- print iframe `document.title` = ชื่อไฟล์ Save-as-PDF → constant ทุกตัว (จากข้อ 6)
- `generateMetadata` ใน 6 reports: embed → "`<ชื่องาน> ภาคเรียนที่ X ปีการศึกษา Y`" · non-embed → `{}` (inherit constant)
- helper `currentTermSuffix()` ใน `lib/current-term.ts`
- **bug grade-summary**: print URL ไม่มี `embed=1` → แก้เป็น always-dynamic (เหมือน attendance)

### 8. Select-first flow — เลือกชั้น/ห้อง/วิชาก่อนค่อยแสดง (4/7 หน้า · commit `a2aaf84`,`d4fa4d0`,`c36a8a5`)
**User spec (revised)**: เข้ามาว่างหมด · เลือกชั้นเอง · **ห้องเดียว auto · หลายห้องโผล่ dropdown รอ** · วิชาเดียว auto/หลายวิชา dropdown
- Pattern: `selectedClassroom = params.room ? find : roomsInGrade.length===1 ? [0] : null` · selector grade placeholder "— เลือกชั้น —" + room `rooms.length>1` + placeholder · body empty state "เลือก..."
- **เสร็จ 4/7**: reading-thinking, competency, attendance(รายวัน, guard-early), characteristics(tab settings=global แสดงได้ · evaluate=ต้องห้อง)
- **✅ เสร็จ 7/7** (commit `cff762a` · verified production score-structure +
  by-subject): `score-structure`, `activities`, `attendance/by-subject`
  - เลิก auto-pick ชั้น/ห้อง (null จนกว่าจะเลือก) · single-room/subject auto ·
    multi รอ dropdown · early guard return ก่อน subject/offering fetch
  - `ScoreSelector` + `BySubjectSelector` ได้ placeholder "— เลือก… —"
  - body แยก "ไม่มีวิชา (ในแผน)" vs "เลือกวิชาก่อน (หลายวิชา)"
  - by-subject: resolve `tab` inline ใน guard selector (tab อยู่ใต้ guard)

### 💬 ถาม-ตอบ: Sonnet ไหวไหม?
- งาน ~80% เป็น pattern-based (template→apply) → Sonnet ไหวสบาย
- ~20% (debug ลึก Next 16 quirks / z-index / transition timing / architecture) → Opus เด่นกว่า
- แนะนำ: Sonnet เป็นหลัก + Opus ตอนติด · กุญแจ = ทีละ step + type-check ทุกครั้ง

### 🐞 ค้าง: PDF ชื่อยังไม่เปลี่ยน (debug พรุ่งนี้)
User รายงาน: Save-as-PDF ชื่อยังเป็น "ระบบบันทึกผลการเรียนออนไลน์" (constant)
แม้ commit `5441f6a`/`b592a9b` deploy แล้ว · generateMetadata embed logic
ดูถูก (type-check ผ่าน) แต่ filename ยัง constant

**ข้อสันนิษฐาน (เรียงตามความน่าจะ):**
1. **browser ใช้ parent (top) document.title ตอน print iframe** — ไม่ใช่
   iframe.contentDocument.title · `iframe.contentWindow.print()` อาจให้
   filename = หน้า admin (parent) = constant แทน iframe (report) title
   → **น่าจะข้อนี้** (logic generateMetadata ถูก แต่ browser ไม่ใช้ iframe title)
2. generateMetadata ไม่ override root constant ใน iframe context (ไม่น่า)
3. report client-side ไม่ได้ set title (ไม่มี client override)

**Debug plan:**
1. เปิด report embed ตรงๆ: `/reports/pp5-class?classroom=<id>&embed=1`
   → ดู browser TAB title
   - ถ้า tab = "ปพ.5 รวมชั้น ภาคเรียนที่..." → generateMetadata ทำงาน →
     ปัญหาคือ **print ใช้ parent title** (ข้อ 1) → แก้ที่ handlePrint
   - ถ้า tab = constant → generateMetadata ไม่ทำงาน (debug metadata)
2. ถ้าข้อ 1: แก้ DirectPrintButton + selector handlePrint ให้ set
   `document.title` (parent) = ชื่อรายงาน ชั่วคราวก่อน `iframe.print()`
   แล้ว restore หลัง print (ต้องส่งชื่อรายงานเข้า DirectPrintButton/
   selector form เป็น prop)
   - DirectPrintButton: เพิ่ม prop `downloadName?: string` → onPrint set
     document.title = downloadName · finally restore
   - pp5/pp5-class selector handlePrint: set document.title ก่อน win.print()
   - currentTermSuffix() ต้องเรียกฝั่ง server (page) ส่งชื่อเต็มเป็น prop
     (client print button ไม่มี DB access)

### ✅ PDF filename — แก้แล้ว (commit `307c150` + `63ac049`)
- **Root cause (ยืนยันแล้ว)**: browser ใช้ `document.title` ของหน้าแม่
  (constant) ตอน print iframe · generateMetadata (iframe title) ทำงานถูก —
  verified ผ่าน browser MCP: title แท็บ production `/reports/pp5-class?embed=1`
  = "ปพ.5 รวมชั้น ภาคเรียนที่ 1 ปีการศึกษา 2569" (dynamic ✓)
  → ที่ user เห็น constant คือ print-fix ยังไม่ deploy ตอนทดสอบ
- **แก้**: print button (DirectPrintButton + pp5/pp5-class handlePrint) ยืม
  iframe `<title>` ใส่ `document.title` หน้าแม่ชั่วคราว → print → restore (1s)
- **เพิ่มชั้น+ห้อง** (`reportClassroomLabel`): "ปพ.5 รวมชั้น ป.1 ห้อง 2
  ภาคเรียนที่ 1 ปีการศึกษา 2569" (ห้องเดียว = "ป.1") · ใช้ "ห้อง" ไม่ใช่ "/"
  (slash = path separator โดน strip)

### 🛑 หยุดพัก
- **เสร็จเซสชันนี้**: PDF filename score-print = "บันทึกคะแนน" · **Phase 1**
  (แยก score → `/reports/score-table` อิสระ + `_shared/score-report.tsx`) ·
  "ภาค N"→"ภาคเรียนที่ N" (10 จุด UI) · **select-first ครบ 9/9** (7 ประเมิน/
  เวลาเรียน + `subjects` ชั้นเดียว + `teaching` ชั้น+ห้อง · commit `cf8cfeb` ·
  verified production ทุกหน้า) · **UX optimistic** (commit `85ee4ed`→`483229d`):
  `useOptimisticValue` → dropdown ทุกตัว snap ทันที (8 selectors +
  GradeFilter/RoomFilter + teachers 3 filters) · `OptimisticTabs` → tab/เดือน
  highlight ทันที (score-structure/activities/by-subject/attendance/
  characteristics) · DirectPrintButton → print loading overlay (no-print)
- **ปพ.6 รายนักเรียน** (commit `319544b`→`97796a3` · verified ป.5 prod):
  `/reports/pp6` 1 หน้า/นักเรียน · selector (ชั้น/ห้อง/ทั้งห้อง-รายบุคคล/นักเรียน/
  เทอม-ทั้งปี/เรียงลำดับ) + preview + print · เมนูใต้พิมพ์เล่มรายงาน · คำนวณ
  GPA/อันดับ/น้ำหนัก (ประถม hours÷40 · มัธยม credit) · annual=avg2sem · layout
  ตรง PDF
  - **Phase D ค้าง (verify เทียบ PDF)**: activity ดึงเจอไหม · gradeName
    name_th vs name_short · ปพ.6 tag/formatting · ปพ.5 (Pp5SimpleHeader) อาจมี
    bug "โรงเรียนโรงเรียน" เดียวกัน — ยังไม่ได้แก้
- **ครั้งหน้า (ตัวเลือก)**: ปพ.6 Phase D polish · Phase 2 (แยก section อื่น) ·
  multi-school template
- commit ล่าสุด: `97796a3` · pushed

---

## ✅ EasyGrade branding: favicon + PWA install + mobile header — เสร็จ (2026-06-01)

แอปได้โลโก้ "EasyGrade" (หนังสือ + เครื่องหมายถูก + ลูกศร · ฟ้า) · ทุก commit pushed

### A. Favicon (Next.js 16 file conventions — วางใน app/ แล้ว auto inject)
- โลโก้ต้นฉบับ 500×500 (Desktop, พาธไทย → copy ascii ก่อน) → sharp resize
  (sharp 0.34.5 มากับ Next.js ใน .pnpm → require ผ่าน path ตรง)
- `app/icon.png` (512, โปร่งใส) → tab browser · `app/apple-icon.png` (180,
  flatten สีฟ้า dominant เพราะ iOS เติมดำให้พื้นโปร่งใส) → iOS home screen
- **`app/favicon.ico`** — create-next-app วาง default (Next/Vercel mark) ค้างไว้ ·
  Next inject พร้อม icon.png → tab โชว์ Vercel · แก้: craft favicon.ico ใหม่
  (16/32/48 PNG-in-ICO) จากโลโก้ทับ default — sharp ออก .ico ไม่ได้ จึงเขียน
  ICO container เอง (header + dir entries + PNG frames)

### B. PWA install ("ติดตั้งแอป")
- `app/manifest.ts` — name EasyGrade · short_name EasyGrade · display standalone ·
  theme #48b8d8 · icons 192/512 (any) + 512 (maskable)
- `public/icon-192.png` + `icon-512.png`
- **`InstallButton`** (sidebar, เหนือ logout) — ดัก `beforeinstallprompt` →
  ปุ่มสีฟ้า · ซ่อนเองถ้าติดตั้งแล้ว (display-mode standalone) / browser ไม่รองรับ
  (iOS Safari → ใช้ Share → เพิ่มไปหน้าจอโฮม เอง)
- **`public/sw.js`** — minimal service worker (fetch pass-through) · จำเป็นเพราะ
  Chrome ยิง beforeinstallprompt เฉพาะเมื่อมี SW ที่มี fetch handler · register
  จาก InstallButton (`navigator.serviceWorker.register("/sw.js")`)
- **proxy.ts**: เพิ่ม `manifest.webmanifest|sw.js` เข้า matcher negative-lookahead
  — ไม่งั้น auth proxy 307-redirect → browser โหลด manifest/sw แบบ anonymous
  ไม่ได้ = ติดตั้งไม่ได้ (icons เป็น .png อยู่ใน image-ext exclude แล้ว)

### C. Mobile header (จอ < md / 768px)
- ปุ่มออกจากระบบ (mobile-header บนสุด) → ย้ายเข้า sidebar drawer (ที่มี logout
  อยู่แล้ว ล่างสุด) · มือถือเหลือ logout ที่ drawer ที่เดียว
- badge ภาคเรียน/ปีการศึกษา (สีเขียว) → แสดงที่ mobile-header แทนปุ่ม logout
- extract **`TermBadge`** (shared) · layout fetch `getCurrentTerm()` ครั้งเดียว →
  ส่งทั้ง PageContextBar + MobileHeader (เลี่ยง query ซ้ำ · getCurrentTerm ไม่ cache)
- PageContextBar badge → desktop only · **gotcha**: `@pp5/ui` cn() = join เฉยๆ
  ไม่มี tailwind-merge → "inline-flex" (base ของ TermBadge) + "hidden" ลงมาชนกัน
  → badge ไม่ซ่อน (โชว์ 2 ที่) · แก้ด้วย wrap `<div className="hidden md:flex">`

### Files
```
apps/admin/app/icon.png · apple-icon.png · favicon.ico · manifest.ts
apps/admin/public/icon-192.png · icon-512.png · sw.js
apps/admin/app/(admin)/_components/install-button.tsx · term-badge.tsx   ← ใหม่
apps/admin/app/(admin)/_components/mobile-header.tsx · page-context-bar.tsx · sidebar.tsx
apps/admin/app/(admin)/layout.tsx · proxy.ts
```

### Verify (production · curl — Chrome MCP ไม่มี browser เชื่อม)
- icon/apple-icon/icon-192/manifest.webmanifest/sw.js = 200 · manifest name=EasyGrade ✓
- favicon.ico = 9694 bytes (EasyGrade) ✓
- ⚠️ browser cache favicon หนัก → ต้อง hard-refresh (Ctrl+Shift+R) / incognito

### commit (2026-06-01)
`a043093` favicon · `f3ea6e3` manifest+ปุ่ม · `6ab8273` sw · `ad31e2f` proxy exclude ·
`f766b8f` mobile header · `381aaae` badge dup fix · `db0a464` favicon.ico EasyGrade

---

## ✅ Reports polish: characteristics + attendance header + ปพ.5 รายวิชา ประถม — เสร็จ (2026-06-01 ต่อ)

ต่อจาก branding · ลุยงานค้าง + คำขอใหม่ · ทุก commit ขึ้น production + verify ด้วย Chrome MCP

### A. characteristics TabNav — RSC function error
TabNav (local ใน page server) ส่ง `label: (isActive)=>JSX` (render-prop) → OptimisticTabs (client) ·
Next 16 บล็อก "Functions cannot be passed to Client Components" · แก้: extract → `characteristics/tab-nav.tsx`
("use client") · page ส่งแค่ props ธรรมดา · `c4eda8c`

### B. attendance report header (รายวัน + รายวิชา)
- 3 บรรทัด (หัวข้อ+โรงเรียน+สังกัด) จัดกลางเป็น **flex group** · โลโก้อยู่ซ้ายชิดข้อความ (gap 0.6rem) · margin ชิด
- scope `.att-page` + `.att-title-text` wrapper · **gotcha**: cn() ไม่มี tailwind-merge → "inline-flex"+"hidden"
  ชนกัน · ต้อง wrap `<div className="hidden md:flex">` (เจอตอนแก้ badge มือถือด้วย)
- `0a1a52c` · `6db026a`

### C. "โรงเรียนโรงเรียน" ซ้ำ — 10 จุด
- name_th มี "โรงเรียน" อยู่แล้ว + component เติมซ้ำ → helper **`withSchoolPrefix(name)`** (`lib/school-name.ts`)
- 10 จุด: pp5 (cover/director-sig/simple-header) · pp5-class (cover/monthly/summary) · grade-summary ·
  student-eval · _shared/score-report (attendance/by-subject/pp6 fixed inline ก่อนหน้า) · `d46a7bd`

### D. ปพ.5 รายวิชา ประถม — เวลาเรียน
- **ปัญหา**: weeklyGrid + summary ใช้ `subject_attendance` (รายคาบ × หน่วยกิต = ระบบมัธยม) ·
  `slotsPerWeek = credit_hours×2` · ประถม credit=0 → slotsPerWeek=0 → guard `return null` → section หาย
- **แก้**: ประถม slotsPerWeek = `hours_per_year / 40` · เพิ่ม `hours_per_year` ใน subject fetch · `c98ed30`
- **2 ภาค** (ประถมตัดเกรดรายปี): extract `buildOfferingAttendance(offeringId, sem)` · primary build
  sem1+sem2 → render weeklyGrid+summary × 2 ("ภาคเรียนที่ N") · secondary คงเดิม · `ac77bde`
- **สรุปทั้งปี**: merge sem1+sem2 counts → AttendanceSummarySection semester="annual" → "(สรุปทั้งปี)" ·
  % จาก totalSlots รวม · `2849eed`

### E. slot / preview / dropdown polish (ปพ.5 รายวิชา)
- **slot uniform**: table-layout:fixed + width:auto ทำคาบ 1-9 แคบกว่า 10+ → pin min-width=max-width ทั้ง 4 tier · `9738479`
- **preview = print**: base col widths กว้างกว่า print → 50-slot grid ล้น paper-box แต่ print fit ·
  set base = print widths (slot 14 · num 18 · sum 24 · pct 44) · `9a49093`
- **dense slots**: 5+ ช่อง/สัปดาห์ (50+ คอลัมน์) ล้นแม้ 14px → `att-table--dense-slots` (10px) เมื่อ slotsPerWeek≥5 · `7a4a4e5`
- **dropdown width**: subject `<select>` (option ยาว) ดันเกิน aside → `w-full min-w-0` ทั้ง 3 selects (เท่าระดับชั้น) · `7a4a4e5`

### Files
```
characteristics/tab-nav.tsx (ใหม่) · characteristics/page.tsx
lib/school-name.ts (ใหม่)
reports/{pp5,pp5-class,grade-summary,student-eval,_shared/score-report,attendance,attendance-by-subject}
globals.css (.att-page header flex · .att-wk-slot min/max · base=print col widths · dense)
```

### Verify (Chrome MCP · production)
- ปพ.5 ป.5 ภาษาไทย (5 slots): weeklyGrid 2 ภาค + summary 2 ภาค + (สรุปทั้งปี) · slot 11px uniform ·
  table fit (secOverflow false) · cover "โรงเรียนบ้านโคกผักหอม" ไม่ซ้ำ
- attendance header logo flush · dropdown รายวิชา = ระดับชั้น (ไม่มี scroll aside)

### commit (2026-06-01 ต่อ)
`c4eda8c` TabNav · `0a1a52c`+`6db026a` att header · `d46a7bd` โรงเรียนโรงเรียน · `c98ed30` ประถมเวลาเรียน ·
`9738479` slot uniform · `ac77bde` 2 ภาค · `9a49093` preview=print · `7a4a4e5` dense+dropdown · `2849eed` สรุปทั้งปี



