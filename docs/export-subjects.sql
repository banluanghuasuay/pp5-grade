-- ============================================================
-- Export: รายวิชาพื้นฐาน + กิจกรรม ปีการศึกษา 2569
-- ============================================================
-- วิธีใช้:
--   STEP 1) เปิดไฟล์นี้บน Supabase "เดิม" → SQL Editor → Run
--   STEP 2) คลิกผลลัพธ์ในช่อง "migration_sql" → ก็อปข้อความทั้งหมด
--   STEP 3) เปิด Supabase "ใหม่" → SQL Editor → วาง → Run
--
-- ⚠️ ก่อน Import ในฐานใหม่: ต้องสร้าง "ปีการศึกษา 2569" ในระบบก่อน
--    (เมนู ตั้งค่า → ปีการศึกษา) ไม่งั้นจะไม่มีอะไรถูกเพิ่ม
--
-- หมายเหตุ: copy เฉพาะวิชา core + activity ที่ยัง active · ทุกชั้น
--           grade_levels / learning_areas มากับ setup.sql อยู่แล้ว
-- ============================================================

SELECT
  -- Header
  '-- ============================================================' || chr(10) ||
  '-- Import: รายวิชาพื้นฐาน + กิจกรรม ปีการศึกษา 2569' || chr(10) ||
  '-- ⚠️ ต้องสร้างปีการศึกษา 2569 ในระบบก่อนรัน SQL นี้' || chr(10) ||
  '-- ============================================================' || chr(10) ||
  chr(10) ||

  -- ============================================================
  -- PART 1: สร้างแผนการเรียน (study_plans)
  -- ============================================================
  '-- PART 1: แผนการเรียน' || chr(10) ||
  (
    SELECT COALESCE(string_agg(plan_sql, chr(10)), '-- (ไม่พบแผนการเรียน)')
    FROM (
      SELECT format(
        'INSERT INTO study_plans (grade_level_id, name, description, is_default)' || chr(10) ||
        'SELECT gl.id, %L, %L, %s' || chr(10) ||
        'FROM grade_levels gl WHERE gl.code = %L' || chr(10) ||
        'ON CONFLICT DO NOTHING;',
        sp.name,
        sp.description,
        CASE WHEN sp.is_default THEN 'true' ELSE 'false' END,
        gl.code
      ) AS plan_sql
      FROM study_plans sp
      JOIN grade_levels gl ON sp.grade_level_id = gl.id
      WHERE EXISTS (
        -- เอาเฉพาะแผนที่มีวิชา core/activity (active) ในปี 2569
        SELECT 1
        FROM study_plan_subjects sps
        JOIN subjects s ON sps.subject_id = s.id
        JOIN academic_years ay ON s.academic_year_id = ay.id
        WHERE sps.study_plan_id = sp.id
          AND ay.year_be = 2569
          AND s.category IN ('core', 'activity')
          AND s.is_active = true
      )
      ORDER BY gl.sort_order, sp.is_default DESC, sp.name
    ) t
  ) ||

  chr(10) || chr(10) ||

  -- ============================================================
  -- PART 2: สร้างรายวิชา (subjects)
  -- ============================================================
  '-- PART 2: รายวิชา' || chr(10) ||
  (
    SELECT COALESCE(string_agg(subj_sql, chr(10)), '-- (ไม่พบรายวิชา)')
    FROM (
      SELECT format(
        'INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)' || chr(10) ||
        'SELECT %L, %L, %L, %L, %s, %s, %s, %s, ay.id, gl.id, la.id' || chr(10) ||
        'FROM academic_years ay' || chr(10) ||
        'JOIN grade_levels gl ON gl.code = %L' || chr(10) ||
        'LEFT JOIN learning_areas la ON la.code = %L' || chr(10) ||
        'WHERE ay.year_be = 2569' || chr(10) ||
        'ON CONFLICT (code, academic_year_id, semester) DO NOTHING;',
        s.code,
        s.name_th,
        s.category::text,
        s.grading_mode::text,
        COALESCE(s.credit_hours::text, 'NULL'),
        COALESCE(s.hours_per_week::text, 'NULL'),
        COALESCE(s.hours_per_year::text, 'NULL'),
        s.semester,
        gl.code,
        la.code
      ) AS subj_sql
      FROM subjects s
      JOIN academic_years ay ON s.academic_year_id = ay.id
      JOIN grade_levels gl ON s.grade_level_id = gl.id
      LEFT JOIN learning_areas la ON s.learning_area_id = la.id
      WHERE ay.year_be = 2569
        AND s.category IN ('core', 'activity')
        AND s.is_active = true
      ORDER BY gl.sort_order, s.category, s.code, s.semester
    ) t
  ) ||

  chr(10) || chr(10) ||

  -- ============================================================
  -- PART 3: เชื่อมวิชาเข้าแผน (study_plan_subjects)
  -- ============================================================
  '-- PART 3: เชื่อมวิชาเข้าแผน' || chr(10) ||
  (
    SELECT COALESCE(string_agg(link_sql, chr(10)), '-- (ไม่พบการเชื่อมโยง)')
    FROM (
      SELECT format(
        'INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)' || chr(10) ||
        'SELECT sp.id, s.id, %s' || chr(10) ||
        'FROM study_plans sp' || chr(10) ||
        'JOIN grade_levels gl ON sp.grade_level_id = gl.id' || chr(10) ||
        'JOIN subjects s ON s.code = %L AND s.semester = %s' || chr(10) ||
        'JOIN academic_years ay ON s.academic_year_id = ay.id' || chr(10) ||
        'WHERE gl.code = %L AND sp.name = %L AND ay.year_be = 2569' || chr(10) ||
        'ON CONFLICT DO NOTHING;',
        COALESCE(sps.sort_order::text, 'NULL'),
        s.code,
        s.semester,
        gl.code,
        sp.name
      ) AS link_sql
      FROM study_plan_subjects sps
      JOIN study_plans sp ON sps.study_plan_id = sp.id
      JOIN grade_levels gl ON sp.grade_level_id = gl.id
      JOIN subjects s ON sps.subject_id = s.id
      JOIN academic_years ay ON s.academic_year_id = ay.id
      WHERE ay.year_be = 2569
        AND s.category IN ('core', 'activity')
        AND s.is_active = true
      ORDER BY gl.sort_order, sp.name, s.code, s.semester
    ) t
  ) ||

  chr(10) || chr(10) ||
  '-- ============================================================' || chr(10) ||
  '-- เสร็จสิ้น — รายวิชาและแผนการเรียนพร้อมใช้งาน' || chr(10) ||
  '-- ============================================================'

  AS migration_sql;
