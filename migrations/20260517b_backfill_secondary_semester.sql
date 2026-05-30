-- ============================================================
-- Migration: Backfill semester for legacy secondary enrollments
-- Date:     2026-05-17
-- Reason:   The first semester migration set all existing enrollments to
--           semester=0 (default). For mathayom classrooms, that hides
--           students from the new semester-aware view. This converts
--           current-year secondary enrollments from semester=0 to the
--           year's current_semester so admins see them again.
--
-- Old academic years stay at semester=0 (legacy, not actively used).
--
-- Run via Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

-- For each current-year secondary enrollment with semester=0, set it to the
-- academic_year's current_semester (1 or 2).
UPDATE enrollments AS e
SET semester = ay.current_semester
FROM classrooms AS c
JOIN grade_levels AS gl ON c.grade_level_id = gl.id
JOIN academic_years AS ay ON c.academic_year_id = ay.id
WHERE e.classroom_id = c.id
  AND gl.system = 'secondary'
  AND e.semester = 0
  AND ay.is_current = true
  AND ay.current_semester IN (1, 2);

COMMIT;

-- ============================================================
-- After running:
--   1. Refresh /setup/students → เลือก ม.1 → นักเรียนเก่าควรปรากฏแล้ว
--   2. ถ้าจะใช้ภาคเรียนถัดไป (เช่น เปลี่ยน current_semester เป็น 2):
--      - ไปหน้า /setup/students
--      - กดปุ่ม "นำเข้าจากเทอมที่แล้ว" → ระบบจะ copy enrollments
--        จาก sem 1 มาเป็น sem 2 (ห้องเดิม)
-- ============================================================
