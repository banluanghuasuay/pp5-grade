-- ============================================================
-- Migration: 3 student-eval tables — allow semester=0 (annual)
-- Date:     2026-05-18
-- Reason:   Per สพฐ. หลักสูตรแกนกลาง 2551:
--             - ประถม (primary): ประเมินคุณลักษณะ/อ่านคิดเขียน/สมรรถนะ
--               เป็น "รายปี" (1 set ต่อนักเรียน/ปี ใช้ได้ตลอดทั้งปี)
--             - มัธยม (secondary): ประเมิน "รายภาค" (sem 1 / sem 2 แยกกัน)
--
--           ก่อนหน้านี้ทุก table บังคับ `semester IN (1, 2)` → ประถม
--           ที่ประเมินใน sem 1 จะกลับมาว่างใน sem 2 ตอน admin
--           เปลี่ยน current_semester
--
--           แก้โดยใช้ pattern เดียวกับ `enrollments`: ขยาย CHECK ให้
--           รองรับ semester=0 (= "year-wide" / annual) · code ฝั่ง app
--           จะตัดสินใจตาม classroom.grade_level.system:
--             - primary  → semester=0
--             - secondary → semester=current_semester (1 หรือ 2)
--
-- Run via Supabase Dashboard → SQL Editor (single transaction).
-- ============================================================

BEGIN;

-- 1. คุณลักษณะอันพึงประสงค์
ALTER TABLE characteristic_evaluations
  DROP CONSTRAINT IF EXISTS characteristic_evaluations_semester_check;
ALTER TABLE characteristic_evaluations
  ADD CONSTRAINT characteristic_evaluations_semester_check
    CHECK (semester IN (0, 1, 2));

COMMENT ON COLUMN characteristic_evaluations.semester IS
  '0 = ทั้งปี (ประถม) · 1 = ภาคเรียนที่ 1 (มัธยม) · 2 = ภาคเรียนที่ 2 (มัธยม)';

-- 2. การอ่าน คิดวิเคราะห์ และเขียน
ALTER TABLE reading_thinking_evaluations
  DROP CONSTRAINT IF EXISTS reading_thinking_evaluations_semester_check;
ALTER TABLE reading_thinking_evaluations
  ADD CONSTRAINT reading_thinking_evaluations_semester_check
    CHECK (semester IN (0, 1, 2));

COMMENT ON COLUMN reading_thinking_evaluations.semester IS
  '0 = ทั้งปี (ประถม) · 1 = ภาคเรียนที่ 1 (มัธยม) · 2 = ภาคเรียนที่ 2 (มัธยม)';

-- 3. สมรรถนะสำคัญ
ALTER TABLE competency_evaluations
  DROP CONSTRAINT IF EXISTS competency_evaluations_semester_check;
ALTER TABLE competency_evaluations
  ADD CONSTRAINT competency_evaluations_semester_check
    CHECK (semester IN (0, 1, 2));

COMMENT ON COLUMN competency_evaluations.semester IS
  '0 = ทั้งปี (ประถม) · 1 = ภาคเรียนที่ 1 (มัธยม) · 2 = ภาคเรียนที่ 2 (มัธยม)';

COMMIT;

-- ============================================================
-- After running:
--   1. ตรวจว่า CHECK constraint ทั้ง 3 ตารางอนุญาต semester=0 แล้ว
--      (Table Editor → ดูที่ Constraints หรือ run:
--       SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--       WHERE conrelid IN (
--         'characteristic_evaluations'::regclass,
--         'reading_thinking_evaluations'::regclass,
--         'competency_evaluations'::regclass
--       ) AND contype = 'c'; )
--
--   2. (ถ้ามีข้อมูลจริงของประถมเก็บเป็น semester=1/2 อยู่แล้ว) — รัน
--      backfill optional ด้านล่าง เพื่อย้ายมาเป็น semester=0
--      ⚠️ บน fresh / test data ข้ามไปได้
-- ============================================================

-- =================================================================
-- OPTIONAL backfill — ย้ายข้อมูลของประถมจาก semester=1/2 → semester=0
-- =================================================================
-- รันต่อจาก migration บน เฉพาะถ้าเก็บข้อมูลจริงของประถมไว้แล้ว
-- Logic: เลือก row ที่มี score ครบที่สุดมาเป็น "ทั้งปี" ของประถม
--
-- ถ้า test data เริ่มจาก scratch ไม่ต้องรัน
--
-- ⚠️ ก่อนรัน — backup ตารางก่อนเสมอ
-- =================================================================
--
-- BEGIN;
--
-- -- ตัวอย่าง: characteristic_evaluations
-- -- ถ้านักเรียน X (ประถม) มีทั้ง sem=1 และ sem=2 ในปีเดียวกัน
-- -- → เลือกตัวที่บันทึกล่าสุด (evaluated_at) เป็น "ทั้งปี" → INSERT เป็น sem=0
-- -- → DELETE sem=1/2 ของประถมทิ้ง
--
-- WITH primary_students AS (
--   SELECT DISTINCT e.student_id
--   FROM enrollments e
--   JOIN classrooms c ON c.id = e.classroom_id
--   JOIN grade_levels g ON g.id = c.grade_level_id
--   WHERE g.system = 'primary'
-- ),
-- latest_per_eval AS (
--   SELECT DISTINCT ON (student_id, academic_year_id, characteristic_id)
--     student_id, academic_year_id, characteristic_id, score, evaluated_by
--   FROM characteristic_evaluations
--   WHERE student_id IN (SELECT student_id FROM primary_students)
--     AND semester IN (1, 2)
--   ORDER BY student_id, academic_year_id, characteristic_id, evaluated_at DESC NULLS LAST
-- )
-- INSERT INTO characteristic_evaluations
--   (student_id, academic_year_id, semester, characteristic_id, score, evaluated_by)
-- SELECT student_id, academic_year_id, 0, characteristic_id, score, evaluated_by
-- FROM latest_per_eval
-- ON CONFLICT (student_id, academic_year_id, semester, characteristic_id)
--   DO UPDATE SET score = EXCLUDED.score;
--
-- DELETE FROM characteristic_evaluations
-- WHERE student_id IN (SELECT student_id FROM primary_students)
--   AND semester IN (1, 2);
--
-- -- repeat similar blocks for reading_thinking_evaluations + competency_evaluations
--
-- COMMIT;
