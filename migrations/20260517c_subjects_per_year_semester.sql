-- ============================================================
-- Migration: Per-(year, semester) subject catalog
-- Date:     2026-05-17
-- Reason:   Subjects should be scoped per academic year (primary) and per
--           (year, semester) for secondary, so admins can edit a year/term
--           without affecting other years/terms. A "clone from previous"
--           button copies subjects between scopes.
--
-- Run via Supabase Dashboard → SQL Editor (single transaction).
-- ============================================================

BEGIN;

-- 1. Add the new columns. Nullable initially so we can backfill before
--    flipping to NOT NULL.
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id),
  ADD COLUMN IF NOT EXISTS semester SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE subjects
  DROP CONSTRAINT IF EXISTS subjects_semester_check;
ALTER TABLE subjects
  ADD CONSTRAINT subjects_semester_check
  CHECK (semester IN (0, 1, 2));

-- 2. Backfill existing rows to (current_year, semester based on grade.system).
--    primary  → semester=0 (year-wide)
--    secondary → semester=academic_year.current_semester
WITH cur_year AS (
  SELECT id, current_semester FROM academic_years WHERE is_current = TRUE LIMIT 1
)
UPDATE subjects s
SET academic_year_id = (SELECT id FROM cur_year),
    semester = CASE
      WHEN gl.system = 'secondary' THEN COALESCE((SELECT current_semester FROM cur_year), 1)
      ELSE 0
    END
FROM grade_levels gl
WHERE s.grade_level_id = gl.id
  AND s.academic_year_id IS NULL;

-- 3. Now flip to NOT NULL (only if backfill found something)
DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count FROM subjects WHERE academic_year_id IS NULL;
  IF null_count = 0 THEN
    EXECUTE 'ALTER TABLE subjects ALTER COLUMN academic_year_id SET NOT NULL';
  END IF;
END $$;

-- 4. Update uniqueness — code is no longer globally unique; instead it is
--    unique within a (year, semester) scope.
ALTER TABLE subjects
  DROP CONSTRAINT IF EXISTS subjects_code_key;

ALTER TABLE subjects
  DROP CONSTRAINT IF EXISTS subjects_code_year_semester_key;
ALTER TABLE subjects
  ADD CONSTRAINT subjects_code_year_semester_key
  UNIQUE (code, academic_year_id, semester);

CREATE INDEX IF NOT EXISTS idx_subjects_year ON subjects(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_subjects_year_semester ON subjects(academic_year_id, semester);

COMMENT ON COLUMN subjects.academic_year_id
  IS 'ปีการศึกษาที่วิชานี้สังกัด · NOT NULL หลัง backfill';
COMMENT ON COLUMN subjects.semester
  IS '0 = ทั้งปี (ประถม) · 1/2 = ภาคเรียน (มัธยม)';

COMMIT;

-- ============================================================
-- After running:
--   1. Table Editor → subjects → ต้องเห็น academic_year_id + semester
--      ค่า academic_year_id ทุกแถวต้องเป็น UUID ของปีปัจจุบัน
--   2. Regen types: manually patch packages/database/src/types.ts
--   3. Refresh /setup/subjects → ทดสอบดู
-- ============================================================
