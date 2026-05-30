-- ============================================================
-- Migration: per-semester enrollments
-- Date:     2026-05-17
-- Reason:   Secondary (มัธยม) grades each semester independently — a
--           student transferring in/out mid-year shouldn't retroactively
--           change the previous semester's roster.
--
-- Run via Supabase Dashboard → SQL Editor (single transaction).
-- ============================================================

BEGIN;

-- 1. New column. Default 0 = "ทั้งปี" so existing rows (which were
--    implicitly whole-year) keep the same semantics. Primary keeps using 0.
--    Secondary will start using 1/2 going forward.
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS semester SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE enrollments
  DROP CONSTRAINT IF EXISTS enrollments_semester_check;
ALTER TABLE enrollments
  ADD CONSTRAINT enrollments_semester_check
  CHECK (semester IN (0, 1, 2));

COMMENT ON COLUMN enrollments.semester
  IS '0 = ทั้งปี (ประถม · default · backward-compat) · 1/2 = เฉพาะภาคเรียน (มัธยม)';

-- 2. Drop the old uniqueness constraints (year-scoped) and replace with
--    semester-scoped variants. Use IF EXISTS in case Postgres named them
--    differently — adjust by hand if these names don't match.
--
--    Also DROP IF EXISTS the NEW constraint names so this script can be
--    re-run cleanly without "constraint already exists" errors.
ALTER TABLE enrollments
  DROP CONSTRAINT IF EXISTS enrollments_student_id_classroom_id_key;
ALTER TABLE enrollments
  DROP CONSTRAINT IF EXISTS enrollments_classroom_id_student_number_key;
ALTER TABLE enrollments
  DROP CONSTRAINT IF EXISTS enrollments_student_classroom_semester_key;
ALTER TABLE enrollments
  DROP CONSTRAINT IF EXISTS enrollments_classroom_semester_number_key;

ALTER TABLE enrollments
  ADD CONSTRAINT enrollments_student_classroom_semester_key
  UNIQUE (student_id, classroom_id, semester);

ALTER TABLE enrollments
  ADD CONSTRAINT enrollments_classroom_semester_number_key
  UNIQUE (classroom_id, semester, student_number);

COMMIT;

-- ============================================================
-- After running this:
--   1. Confirm in Dashboard → Table Editor → enrollments:
--      - new `semester` column shows · all existing rows = 0
--   2. Regenerate types: either
--      - copy types.ts from Dashboard's "Generate types" link, OR
--      - manually patch types.ts (small change — add `semester: number`)
-- ============================================================
