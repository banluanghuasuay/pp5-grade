-- ============================================================
-- Migration: subject_attendance teacher RLS policies
-- Date:     2026-05-18
-- Reason:   20260517d enabled RLS on subject_attendance with an admin-only
--           policy (comment said "ครูเพิ่ม policy ทีหลัง" — never done).
--           Teachers recording per-subject attendance COULD save (server
--           actions use the service-role client = bypass RLS) but the page
--           READ uses the RLS client → is_admin()=false → rows hidden →
--           "บันทึกแล้วหาย" / print report empty. Add staff-read +
--           teacher-write (own offering), mirroring the scores policies.
--
-- Run via Supabase Dashboard → SQL Editor (single transaction).
-- ============================================================

BEGIN;

-- All staff (admin + teacher) can READ subject_attendance — mirrors
-- scores_staff_read / attendance_staff_read.
DROP POLICY IF EXISTS "subject_attendance_staff_read" ON subject_attendance;
CREATE POLICY "subject_attendance_staff_read" ON subject_attendance
    FOR SELECT USING (is_staff());

-- Teachers can WRITE rows for offerings they teach — mirrors
-- scores_teacher_write_own. (Server actions bypass RLS via the service-role
-- client, but this policy is correct defense-in-depth + future-proofs any
-- RLS-client write path.)
DROP POLICY IF EXISTS "subject_attendance_teacher_write" ON subject_attendance;
CREATE POLICY "subject_attendance_teacher_write" ON subject_attendance
    FOR ALL
    USING (is_teacher() AND teacher_teaches_offering(offering_id))
    WITH CHECK (is_teacher() AND teacher_teaches_offering(offering_id));

-- subject_attendance_admin_all already exists (from 20260517d) — leave it.

COMMIT;

-- ============================================================
-- After running: log in as a teacher, record a per-subject attendance cell,
-- navigate away + back → the cell must persist (was hidden before this).
-- ============================================================
