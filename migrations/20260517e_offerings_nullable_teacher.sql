-- ============================================================
-- Migration: subject_offerings.teacher_id → NULLABLE
-- Date:     2026-05-17
-- Reason:   Admin must be able to record scores/attendance for ANY subject
--           in the classroom's plan, even before assigning a teacher.
--           Previously, an offering row required a teacher_id, which blocked
--           score/attendance entry for un-staffed subjects.
--
--           After this migration, an offering can exist with teacher_id=NULL
--           (= "ยังไม่จัดครูเข้าสอน"). The teaching page later UPDATEs the
--           same row with a real teacher_id when the admin assigns one.
--
-- Run via Supabase Dashboard → SQL Editor (single transaction).
-- ============================================================

BEGIN;

ALTER TABLE subject_offerings
  ALTER COLUMN teacher_id DROP NOT NULL;

COMMENT ON COLUMN subject_offerings.teacher_id IS
  'ครูประจำวิชา · NULL = ยังไม่จัดครู (admin บันทึกคะแนน/เวลาเรียนได้ก่อน)';

COMMIT;

-- ============================================================
-- After running:
--   1. Table Editor → subject_offerings → teacher_id column is now nullable
--   2. Existing rows unaffected (all have teacher_id set already)
--   3. /setup/score-structure + /setup/attendance/by-subject ใช้ต่อ —
--      ดร็อปดาวน์จะแสดงทุกวิชาในแผน · auto-create offering ตอนเลือก
-- ============================================================
