-- ============================================================
-- Migration: subject_attendance (per-subject weekly attendance)
-- Date:     2026-05-17
-- Reason:   มัธยมตามมาตรฐาน ปพ.5 ต้องบันทึกเวลาเรียนต่อวิชา (per-offering)
--           เป็นช่องคาบ × สัปดาห์ ตลอด 20 สัปดาห์/ภาค
--           จำนวนช่องต่อสัปดาห์ = หน่วยกิต × 2 (0.5 หน่วยกิต = 1 ช่อง,
--           1.0 หน่วยกิต = 2 ช่อง, 1.5 หน่วยกิต = 3 ช่อง, ...)
--
--           ตารางเดิม `attendance` ใช้ track per-day (ครูประจำชั้นเช็คเช้า)
--           ตารางนี้แยกออกมา — ไม่กระทบของเดิม
--
-- Run via Supabase Dashboard → SQL Editor (single transaction).
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS subject_attendance (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Offering = (classroom, subject, semester) tuple — already scoped to
  -- a specific academic year via classroom.
  offering_id     UUID NOT NULL REFERENCES subject_offerings(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  -- สัปดาห์ที่ 1-20 ของภาค (อนุญาตถึง 30 เผื่อโรงเรียนใดยืดภาคออก)
  week            SMALLINT NOT NULL CHECK (week BETWEEN 1 AND 30),
  -- ช่องที่ N ในสัปดาห์นั้น (= หน่วยกิต × 2 สูงสุด)
  slot_in_week    SMALLINT NOT NULL CHECK (slot_in_week BETWEEN 1 AND 10),
  -- Reuse `attendance_status` enum (present/absent/leave/sick).
  -- UI ใช้แค่ 3 ค่า: present (มา) · absent (ขาด) · leave (ลา)
  -- — sick กันไว้กรณีอนาคตอยากเพิ่ม "ป่วย"
  status          attendance_status NOT NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ครูคนไหนเป็นคนกรอก (NULL = admin ผ่านระบบ)
  recorded_by     UUID REFERENCES teachers(id) ON DELETE SET NULL,

  -- 1 ช่องต่อ (offering, student, week, slot) — แก้ค่าจะใช้ UPSERT
  UNIQUE (offering_id, student_id, week, slot_in_week)
);

-- Index ช่วยตอน query ทั้งห้องของ offering (อ่านในหน้า grid)
CREATE INDEX IF NOT EXISTS idx_subject_attendance_offering
  ON subject_attendance(offering_id);

-- Index ช่วยตอน query ของนักเรียนคนหนึ่ง (รายงานสรุป)
CREATE INDEX IF NOT EXISTS idx_subject_attendance_student
  ON subject_attendance(student_id);

COMMENT ON TABLE subject_attendance IS
  'เวลาเรียนต่อวิชาแบบ ปพ.5 มัธยม — 1 row ต่อ (offering, student, week, slot)';

-- RLS — admin มีสิทธิ์เต็ม (ใช้ helper `is_admin()` ของเดิม จาก rls_policies.sql
-- pattern เดียวกับ attendance/workdays_admin_all). ครู/ผู้ใช้คนอื่นเพิ่ม policy
-- ทีหลังตามแต่ role
ALTER TABLE subject_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_attendance_admin_all" ON subject_attendance;
CREATE POLICY "subject_attendance_admin_all" ON subject_attendance
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

COMMIT;

-- ============================================================
-- After running:
--   1. Table Editor → subject_attendance → ต้องเห็นตารางใหม่ (เปล่า)
--   2. Regen types: manually patch packages/database/src/types.ts
--   3. ทดสอบหน้า /setup/attendance/by-subject (Build ต่อ)
-- ============================================================
