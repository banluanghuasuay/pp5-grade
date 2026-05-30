-- ============================================================
-- Migration: schools.district + schools.province
-- Date:     2026-05-17
-- Reason:   ปพ.5 หน้าปกตามมาตรฐาน แสดง "อำเภอ ... จังหวัด ..."
--           ของเดิมมีแต่ `address` (TEXT รวม) — แยก field เพื่อใส่ใน layout
--           ของหน้าปกได้ตรงตาราง
--
-- Run via Supabase Dashboard → SQL Editor (single transaction).
-- ============================================================

BEGIN;

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS province VARCHAR(100);

COMMENT ON COLUMN schools.district IS 'อำเภอ · ใช้ในหน้าปก ปพ.5 (เช่น "ศรีสำโรง")';
COMMENT ON COLUMN schools.province IS 'จังหวัด · ใช้ในหน้าปก ปพ.5 (เช่น "สุโขทัย")';

COMMIT;

-- ============================================================
-- After running:
--   1. Table Editor → schools → ต้องเห็น 2 column ใหม่ (district, province)
--   2. ไปหน้า /setup/school → กรอก อำเภอ + จังหวัด
--   3. หน้าปก ปพ.5 จะดึงค่ามาใช้
-- ============================================================
