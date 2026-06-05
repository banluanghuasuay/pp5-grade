-- ============================================================
-- ไฟล์สำเร็จรูป: รายวิชาพื้นฐาน + กิจกรรม ปีการศึกษา 2569
-- หลักสูตรแกนกลาง 2551 · ป.1-ป.6 + ม.1-ม.3
-- ============================================================
-- วิธีใช้ (สำหรับโรงเรียนใหม่ที่ใช้หลักสูตรเดียวกัน):
--   1. สร้าง "ปีการศึกษา 2569" ในระบบก่อน (เมนู ตั้งค่า → ปีการศึกษา)
--   2. เปิด Supabase → SQL Editor → New query
--   3. วางไฟล์นี้ทั้งหมด → Run
--      = ได้รายวิชา + แผนการเรียน ครบทุกชั้น พร้อมใช้งาน
--
-- หมายเหตุ:
--   • รันซ้ำได้ปลอดภัย — วิชาซ้ำจะถูกข้าม (ON CONFLICT DO NOTHING)
--   • copy เฉพาะวิชา "พื้นฐาน (core) + กิจกรรม (activity)" — ไม่รวมวิชาเพิ่มเติม
--   • ชื่อ/รหัส/ชั่วโมงของแต่ละวิชา แก้ไขภายหลังได้ในระบบ
--   • ถ้าใช้ปีอื่น (ไม่ใช่ 2569) ให้ค้นแทนที่ 2569 เป็นปีที่ต้องการ
-- ============================================================

-- PART 1: แผนการเรียน
INSERT INTO study_plans (grade_level_id, name, description, is_default)
SELECT gl.id, 'ทั่วไป', NULL, true
FROM grade_levels gl WHERE gl.code = 'p1'
ON CONFLICT DO NOTHING;
INSERT INTO study_plans (grade_level_id, name, description, is_default)
SELECT gl.id, 'ทั่วไป', NULL, true
FROM grade_levels gl WHERE gl.code = 'p2'
ON CONFLICT DO NOTHING;
INSERT INTO study_plans (grade_level_id, name, description, is_default)
SELECT gl.id, 'ทั่วไป', NULL, true
FROM grade_levels gl WHERE gl.code = 'p3'
ON CONFLICT DO NOTHING;
INSERT INTO study_plans (grade_level_id, name, description, is_default)
SELECT gl.id, 'ทั่วไป', NULL, true
FROM grade_levels gl WHERE gl.code = 'p4'
ON CONFLICT DO NOTHING;
INSERT INTO study_plans (grade_level_id, name, description, is_default)
SELECT gl.id, 'ทั่วไป', NULL, true
FROM grade_levels gl WHERE gl.code = 'p5'
ON CONFLICT DO NOTHING;
INSERT INTO study_plans (grade_level_id, name, description, is_default)
SELECT gl.id, 'ทั่วไป', NULL, true
FROM grade_levels gl WHERE gl.code = 'p6'
ON CONFLICT DO NOTHING;
INSERT INTO study_plans (grade_level_id, name, description, is_default)
SELECT gl.id, 'ทั่วไป', NULL, true
FROM grade_levels gl WHERE gl.code = 'm1'
ON CONFLICT DO NOTHING;
INSERT INTO study_plans (grade_level_id, name, description, is_default)
SELECT gl.id, 'ทั่วไป', NULL, true
FROM grade_levels gl WHERE gl.code = 'm2'
ON CONFLICT DO NOTHING;
INSERT INTO study_plans (grade_level_id, name, description, is_default)
SELECT gl.id, 'ทั่วไป', NULL, true
FROM grade_levels gl WHERE gl.code = 'm3'
ON CONFLICT DO NOTHING;

-- PART 2: รายวิชา
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ค11101', 'คณิตศาสตร์', 'core', 'numeric', NULL, NULL, 200, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p1'
LEFT JOIN learning_areas la ON la.code = 'math'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ง11101', 'การงานอาชีพ', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p1'
LEFT JOIN learning_areas la ON la.code = 'career'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ท11101', 'ภาษาไทย', 'core', 'numeric', NULL, NULL, 200, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p1'
LEFT JOIN learning_areas la ON la.code = 'thai'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'พ11101', 'สุขศึกษาพลศึกษา', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p1'
LEFT JOIN learning_areas la ON la.code = 'health'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว11101', 'วิทยาศาสตร์', 'core', 'numeric', NULL, NULL, 120, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p1'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว11102', 'วิทยาการคำนวณ', 'core', 'numeric', NULL, NULL, 38, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p1'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ศ11101', 'ศิลปะ', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p1'
LEFT JOIN learning_areas la ON la.code = 'arts'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส11101', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p1'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส11102', 'ประวัติศาสตร์', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p1'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'อ11101', 'ภาษาอังกฤษ', 'core', 'numeric', NULL, NULL, 120, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p1'
LEFT JOIN learning_areas la ON la.code = 'foreign'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก11101', 'กิจกรรมแนะแนว', 'activity', 'pass_fail', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p1'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก11102', 'กิจกรรมลูกเสือ-เนตรนารี', 'activity', 'pass_fail', NULL, NULL, 30, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p1'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก11103', 'กิจกรรมชุมนุม', 'activity', 'pass_fail', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p1'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก11104', 'กิจกรรมเพื่อสังคมและสาธารณประโยชน์', 'activity', 'pass_fail', NULL, NULL, 10, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p1'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ค12101', 'คณิตศาสตร์', 'core', 'numeric', NULL, NULL, 200, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p2'
LEFT JOIN learning_areas la ON la.code = 'math'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ง12101', 'การงานอาชีพ', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p2'
LEFT JOIN learning_areas la ON la.code = 'career'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ท12101', 'ภาษาไทย', 'core', 'numeric', NULL, NULL, 200, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p2'
LEFT JOIN learning_areas la ON la.code = 'thai'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'พ12101', 'สุขศึกษาพลศึกษา', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p2'
LEFT JOIN learning_areas la ON la.code = 'health'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว12101', 'วิทยาศาสตร์', 'core', 'numeric', NULL, NULL, 120, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p2'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว12102', 'วิทยาการคำนวณ', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p2'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ศ12101', 'ศิลปะ', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p2'
LEFT JOIN learning_areas la ON la.code = 'arts'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส12101', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p2'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส12102', 'ประวัติศาสตร์', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p2'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'อ12101', 'ภาษาอังกฤษ', 'core', 'numeric', NULL, NULL, 120, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p2'
LEFT JOIN learning_areas la ON la.code = 'foreign'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก12101', 'กิจกรรมแนะแนว', 'activity', 'pass_fail', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p2'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก12102', 'กิจกรรมลูกเสือ-เนตรนารี', 'activity', 'pass_fail', NULL, NULL, 30, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p2'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก12103', 'กิจกรรมชุมนุม', 'activity', 'pass_fail', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p2'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก12104', 'กิจกรรมเพื่อสังคมและสาธารณประโยชน์', 'activity', 'pass_fail', NULL, NULL, 10, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p2'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ค13101', 'คณิตศาสตร์', 'core', 'numeric', NULL, NULL, 200, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p3'
LEFT JOIN learning_areas la ON la.code = 'math'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ง13101', 'การงานอาชีพ', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p3'
LEFT JOIN learning_areas la ON la.code = 'career'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ท13101', 'ภาษาไทย', 'core', 'numeric', NULL, NULL, 200, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p3'
LEFT JOIN learning_areas la ON la.code = 'thai'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'พ13101', 'สุขศึกษาพลศึกษา', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p3'
LEFT JOIN learning_areas la ON la.code = 'health'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว13101', 'วิทยาศาสตร์', 'core', 'numeric', NULL, NULL, 120, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p3'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว13102', 'วิทยาการคำนวณ', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p3'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ศ13101', 'ศิลปะ', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p3'
LEFT JOIN learning_areas la ON la.code = 'arts'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส13101', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p3'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส13102', 'ประวัติศาสตร์', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p3'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'อ13101', 'ภาษาอังกฤษ', 'core', 'numeric', NULL, NULL, 120, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p3'
LEFT JOIN learning_areas la ON la.code = 'foreign'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก13101', 'กิจกรรมแนะแนว', 'activity', 'pass_fail', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p3'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก13102', 'กิจกรรมลูกเสือ-เนตรนารี', 'activity', 'pass_fail', NULL, NULL, 30, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p3'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก13103', 'กิจกรรมชุมนุม', 'activity', 'pass_fail', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p3'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก13104', 'กิจกรรมเพื่อสังคมและสาธารณประโยชน์', 'activity', 'pass_fail', NULL, NULL, 10, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p3'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ค14101', 'คณิตศาสตร์ 4', 'core', 'numeric', NULL, NULL, 160, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p4'
LEFT JOIN learning_areas la ON la.code = 'math'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ง14101', 'การงานอาชีพ 4', 'core', 'numeric', NULL, NULL, 80, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p4'
LEFT JOIN learning_areas la ON la.code = 'career'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ท14101', 'ภาษาไทย 4', 'core', 'numeric', NULL, NULL, 160, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p4'
LEFT JOIN learning_areas la ON la.code = 'thai'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'พ14101', 'สุขศึกษาและพลศึกษา 4', 'core', 'numeric', NULL, NULL, 80, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p4'
LEFT JOIN learning_areas la ON la.code = 'health'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว14101', 'วิทยาศาสตร์และเทคโนโลยี 4', 'core', 'numeric', NULL, NULL, 80, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p4'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว14102', 'วิทยาการคำนวณ 4', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p4'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ศ14101', 'ศิลปศึกษา 4', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p4'
LEFT JOIN learning_areas la ON la.code = 'arts'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส14101', 'สังคมศึกษา  ศาสนาและวัฒนธรรม 4', 'core', 'numeric', NULL, NULL, 80, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p4'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส14102', 'ประวัติศาสตร์ 4', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p4'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'อ14101', 'ภาษาอังกฤษ 4', 'core', 'numeric', NULL, NULL, 80, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p4'
LEFT JOIN learning_areas la ON la.code = 'foreign'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก14101', 'กิจกรรมแนะแนว', 'activity', 'pass_fail', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p4'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก14102', 'กิจกรรมลูกเสือ-เนตรนารี', 'activity', 'pass_fail', NULL, NULL, 30, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p4'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก14103', 'กิจกรรมชุมนุม', 'activity', 'pass_fail', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p4'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก14104', 'กิจกรรมเพื่อสังคมและสาธารณประโยชน์', 'activity', 'pass_fail', NULL, NULL, 10, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p4'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ค15101', 'คณิตศาสตร์ 5', 'core', 'numeric', NULL, NULL, 160, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p5'
LEFT JOIN learning_areas la ON la.code = 'math'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ง15101', 'การงานอาชีพ 5', 'core', 'numeric', NULL, NULL, 80, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p5'
LEFT JOIN learning_areas la ON la.code = 'career'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ท15101', 'ภาษาไทย 5', 'core', 'numeric', NULL, NULL, 160, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p5'
LEFT JOIN learning_areas la ON la.code = 'thai'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'พ15101', 'สุขศึกษาและพลศึกษา 5', 'core', 'numeric', NULL, NULL, 80, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p5'
LEFT JOIN learning_areas la ON la.code = 'health'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว15101', 'วิทยาศาสตร์และเทคโนโลยี 5', 'core', 'numeric', NULL, NULL, 80, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p5'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว15102', 'วิทยาการคำนวณ 5', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p5'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ศ15101', 'ศิลปศึกษา 5', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p5'
LEFT JOIN learning_areas la ON la.code = 'arts'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส15101', 'สังคมศึกษา  ศาสนาและวัฒนธรรม 5', 'core', 'numeric', NULL, NULL, 80, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p5'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส15102', 'ประวัติศาสตร์ 5', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p5'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'อ15101', 'ภาษาอังกฤษ 5', 'core', 'numeric', NULL, NULL, 80, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p5'
LEFT JOIN learning_areas la ON la.code = 'foreign'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก15101', 'กิจกรรมแนะแนว', 'activity', 'pass_fail', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p5'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก15102', 'กิจกรรมลูกเสือ-เนตรนารี', 'activity', 'pass_fail', NULL, NULL, 30, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p5'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก15103', 'กิจกรรมชุมนุม', 'activity', 'pass_fail', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p5'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก15104', 'กิจกรรมเพื่อสังคมและสาธารณประโยชน์', 'activity', 'pass_fail', NULL, NULL, 10, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p5'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ค16101', 'คณิตศาสตร์ 6', 'core', 'numeric', NULL, NULL, 160, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p6'
LEFT JOIN learning_areas la ON la.code = 'math'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ง16101', 'การงานอาชีพ 6', 'core', 'numeric', NULL, NULL, 80, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p6'
LEFT JOIN learning_areas la ON la.code = 'career'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ท16101', 'ภาษาไทย 6', 'core', 'numeric', NULL, NULL, 160, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p6'
LEFT JOIN learning_areas la ON la.code = 'thai'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'พ16101', 'สุขศึกษาและพลศึกษา 6', 'core', 'numeric', NULL, NULL, 80, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p6'
LEFT JOIN learning_areas la ON la.code = 'health'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว16101', 'วิทยาศาสตร์และเทคโนโลยี 6', 'core', 'numeric', NULL, NULL, 80, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p6'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว16102', 'วิทยาการคำนวณ 6', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p6'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ศ16101', 'ศิลปศึกษา 6', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p6'
LEFT JOIN learning_areas la ON la.code = 'arts'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส16101', 'สังคมศึกษา  ศาสนาและวัฒนธรรม 6', 'core', 'numeric', NULL, NULL, 80, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p6'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส16102', 'ประวัติศาสตร์ 6', 'core', 'numeric', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p6'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'อ16101', 'ภาษาอังกฤษ 6', 'core', 'numeric', NULL, NULL, 80, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p6'
LEFT JOIN learning_areas la ON la.code = 'foreign'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก16101', 'กิจกรรมแนะแนว', 'activity', 'pass_fail', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p6'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก16102', 'กิจกรรมลูกเสือ-เนตรนารี', 'activity', 'pass_fail', NULL, NULL, 30, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p6'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก16103', 'กิจกรรมชุมนุม', 'activity', 'pass_fail', NULL, NULL, 40, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p6'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก16104', 'กิจกรรมเพื่อสังคมและสาธารณประโยชน์', 'activity', 'pass_fail', NULL, NULL, 10, 0, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'p6'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ค21101', 'คณิตศาสตร์', 'core', 'numeric', 1.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm1'
LEFT JOIN learning_areas la ON la.code = 'math'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ง21101', 'การงานอาชีพ', 'core', 'numeric', 1.0, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm1'
LEFT JOIN learning_areas la ON la.code = 'career'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ท21101', 'ภาษาไทย', 'core', 'numeric', 1.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm1'
LEFT JOIN learning_areas la ON la.code = 'thai'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'พ21101', 'สุขศึกษา', 'core', 'numeric', 0.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm1'
LEFT JOIN learning_areas la ON la.code = 'health'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'พ21102', 'วอลเลย์บอล', 'core', 'numeric', 0.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm1'
LEFT JOIN learning_areas la ON la.code = 'health'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว21101', 'วิทยาศาสตร์และเทคโนโลยี', 'core', 'numeric', 1.0, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm1'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว21103', 'วิทยาการคำนวณ', 'core', 'numeric', 0.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm1'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ศ21101', 'ศิลปศึกษา', 'core', 'numeric', 1.0, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm1'
LEFT JOIN learning_areas la ON la.code = 'arts'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส21101', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'core', 'numeric', 1.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm1'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส21102', 'ประวัติศาสตร์', 'core', 'numeric', 0.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm1'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'อ21101', 'ภาษาอังกฤษ', 'core', 'numeric', 1.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm1'
LEFT JOIN learning_areas la ON la.code = 'foreign'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก21101', 'กิจกรรมแนะแนว', 'activity', 'pass_fail', NULL, NULL, 20, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm1'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก21103', 'กิจกรรมลูกเสือ-เนตรนารี', 'activity', 'pass_fail', NULL, NULL, 20, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm1'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก21105', 'กิจกรรมชุมนุม', 'activity', 'pass_fail', NULL, NULL, 15, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm1'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก21107', 'กิจกรรมเพื่อสังคมและสาธารณประโยชน์', 'activity', 'pass_fail', NULL, NULL, 5, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm1'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ค22101', 'คณิตศาสตร์', 'core', 'numeric', 1.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm2'
LEFT JOIN learning_areas la ON la.code = 'math'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ง22101', 'การงานอาชีพ', 'core', 'numeric', 1.0, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm2'
LEFT JOIN learning_areas la ON la.code = 'career'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ท22101', 'ภาษาไทย', 'core', 'numeric', 1.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm2'
LEFT JOIN learning_areas la ON la.code = 'thai'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'พ22101', 'สุขศึกษา', 'core', 'numeric', 0.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm2'
LEFT JOIN learning_areas la ON la.code = 'health'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'พ22102', 'แบดมินตัน', 'core', 'numeric', 0.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm2'
LEFT JOIN learning_areas la ON la.code = 'health'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว22101', 'วิทยาศาสตร์และเทคโนโลยี', 'core', 'numeric', 1.0, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm2'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว22103', 'วิทยาการคำนวณ', 'core', 'numeric', 0.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm2'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ศ22101', 'ศิลปศึกษา', 'core', 'numeric', 1.0, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm2'
LEFT JOIN learning_areas la ON la.code = 'arts'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส22101', 'สังคมศึกษา ศาสนาและวัฒนธรรม', 'core', 'numeric', 1.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm2'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส22102', 'ประวัติศาสตร์', 'core', 'numeric', 0.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm2'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'อ22101', 'ภาษาอังกฤษ', 'core', 'numeric', 1.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm2'
LEFT JOIN learning_areas la ON la.code = 'foreign'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก22101', 'กิจกรรมแนะแนว', 'activity', 'pass_fail', NULL, NULL, 20, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm2'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก22103', 'กิจกรรมลูกเสือ-เนตรนารี', 'activity', 'pass_fail', NULL, NULL, 20, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm2'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก22105', 'กิจกรรมชุมนุม', 'activity', 'pass_fail', NULL, NULL, 15, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm2'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก22107', 'กิจกรรมเพื่อสังคมและสาธารณประโยชน์', 'activity', 'pass_fail', NULL, NULL, 5, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm2'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ค23101', 'คณิตศาสตร์', 'core', 'numeric', 1.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm3'
LEFT JOIN learning_areas la ON la.code = 'math'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ง23101', 'การงานอาชีพ', 'core', 'numeric', 1.0, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm3'
LEFT JOIN learning_areas la ON la.code = 'career'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ท23101', 'ภาษาไทย', 'core', 'numeric', 1.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm3'
LEFT JOIN learning_areas la ON la.code = 'thai'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'พ23101', 'สุขศึกษา', 'core', 'numeric', 0.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm3'
LEFT JOIN learning_areas la ON la.code = 'health'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'พ23102', 'ฟุตซอล', 'core', 'numeric', 0.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm3'
LEFT JOIN learning_areas la ON la.code = 'health'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว23101', 'วิทยาศาสตร์และเทคโนโลยี', 'core', 'numeric', 1.0, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm3'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ว23103', 'วิทยาการคำนวณ', 'core', 'numeric', 0.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm3'
LEFT JOIN learning_areas la ON la.code = 'science'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ศ23101', 'ศิลปศึกษา', 'core', 'numeric', 1.0, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm3'
LEFT JOIN learning_areas la ON la.code = 'arts'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส23101', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'core', 'numeric', 1.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm3'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ส23102', 'ประวัติศาสตร์', 'core', 'numeric', 0.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm3'
LEFT JOIN learning_areas la ON la.code = 'social'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'อ23101', 'ภาษาอังกฤษ', 'core', 'numeric', 1.5, NULL, NULL, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm3'
LEFT JOIN learning_areas la ON la.code = 'foreign'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก23101', 'กิจกรรมแนะแนว', 'activity', 'pass_fail', NULL, NULL, 20, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm3'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก23103', 'กิจกรรมลูกเสือ-เนตรนารี', 'activity', 'pass_fail', NULL, NULL, 20, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm3'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก23105', 'กิจกรรมชุมนุม', 'activity', 'pass_fail', NULL, NULL, 15, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm3'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;
INSERT INTO subjects (code, name_th, category, grading_mode, credit_hours, hours_per_week, hours_per_year, semester, academic_year_id, grade_level_id, learning_area_id)
SELECT 'ก23107', 'กิจกรรมเพื่อสังคมและสาธารณประโยชน์', 'activity', 'pass_fail', NULL, NULL, 5, 1, ay.id, gl.id, la.id
FROM academic_years ay
JOIN grade_levels gl ON gl.code = 'm3'
LEFT JOIN learning_areas la ON la.code = 'activity'
WHERE ay.year_be = 2569
ON CONFLICT (code, academic_year_id, semester) DO NOTHING;

-- PART 3: เชื่อมวิชาเข้าแผน
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก11101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก11102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก11103' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก11104' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ค11101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ง11101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ท11101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'พ11101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว11101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว11102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ศ11101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส11101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส11102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'อ11101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก12101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก12102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก12103' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก12104' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ค12101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ง12101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ท12101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'พ12101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว12101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว12102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ศ12101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส12101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส12102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'อ12101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก13101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก13102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก13103' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก13104' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ค13101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ง13101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ท13101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'พ13101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว13101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว13102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ศ13101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส13101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส13102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'อ13101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก14101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p4' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก14102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p4' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก14103' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p4' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก14104' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p4' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ค14101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p4' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ง14101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p4' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ท14101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p4' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'พ14101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p4' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว14101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p4' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว14102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p4' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ศ14101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p4' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส14101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p4' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส14102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p4' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'อ14101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p4' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก15101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p5' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก15102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p5' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก15103' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p5' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก15104' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p5' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ค15101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p5' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ง15101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p5' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ท15101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p5' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'พ15101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p5' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว15101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p5' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว15102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p5' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ศ15101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p5' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส15101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p5' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส15102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p5' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'อ15101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p5' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก16101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p6' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก16102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p6' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก16103' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p6' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก16104' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p6' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ค16101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p6' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ง16101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p6' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ท16101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p6' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'พ16101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p6' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว16101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p6' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว16102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p6' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ศ16101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p6' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส16101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p6' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส16102' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p6' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'อ16101' AND s.semester = 0
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'p6' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก21101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก21103' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก21105' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก21107' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ค21101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ง21101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ท21101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'พ21101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'พ21102' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว21101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว21103' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ศ21101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส21101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส21102' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'อ21101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm1' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก22101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก22103' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก22105' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก22107' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ค22101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ง22101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ท22101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'พ22101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'พ22102' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว22101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว22103' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ศ22101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส22101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส22102' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'อ22101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm2' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก23101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก23103' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก23105' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ก23107' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ค23101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ง23101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ท23101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'พ23101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'พ23102' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว23101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ว23103' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ศ23101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส23101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'ส23102' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
INSERT INTO study_plan_subjects (study_plan_id, subject_id, sort_order)
SELECT sp.id, s.id, NULL
FROM study_plans sp
JOIN grade_levels gl ON sp.grade_level_id = gl.id
JOIN subjects s ON s.code = 'อ23101' AND s.semester = 1
JOIN academic_years ay ON s.academic_year_id = ay.id
WHERE gl.code = 'm3' AND sp.name = 'ทั่วไป' AND ay.year_be = 2569
ON CONFLICT DO NOTHING;
