-- ============================================================
-- Create the FIRST admin user — fresh PP.5 / EasyGrade deployment
-- ============================================================
-- A new school has no admin yet, and the app login uses fake emails
-- (admin → <username>@admin.pp5.local), so you can't self-register
-- through the UI. Create the first admin ONCE with this file.
--
-- Run AFTER setup.sql, in the new project's Supabase Dashboard → SQL Editor.
-- ============================================================


-- ============================================================
-- METHOD A (recommended) — Dashboard creates the auth user, SQL links it
-- ============================================================
-- STEP 1: Dashboard → Authentication → Users → "Add user" → "Create new user"
--           Email:    admin@admin.pp5.local
--           Password: <choose a strong password>
--           ✅ Auto Confirm User   ← REQUIRED (fake email has no inbox)
--         Then copy the new user's UID (a UUID).
--
-- STEP 2: paste that UID into <AUTH_UID> below and run this INSERT:

INSERT INTO public.users (auth_user_id, username, full_name, title, role, is_active)
VALUES (
  '<AUTH_UID>',          -- ← paste UUID from Dashboard step 1
  'admin',               -- login username (maps to admin@admin.pp5.local)
  'ผู้ดูแลระบบ',          -- full name (edit freely)
  NULL,                  -- title (นาย/นาง/นางสาว/ดร.) — optional
  'admin',
  TRUE
);

-- Done. Log in to the admin app with username "admin" + the password above.


-- ============================================================
-- METHOD B (optional, no Dashboard) — pure SQL
-- ============================================================
-- More fragile: auth.users has several required columns and some Supabase
-- versions also need an auth.identities row for the email provider.
-- Use METHOD A if login fails after this.
--
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
--
-- WITH new_auth AS (
--   INSERT INTO auth.users (
--     instance_id, id, aud, role, email,
--     encrypted_password, email_confirmed_at,
--     raw_app_meta_data, raw_user_meta_data,
--     created_at, updated_at
--   ) VALUES (
--     '00000000-0000-0000-0000-000000000000',
--     gen_random_uuid(),
--     'authenticated', 'authenticated',
--     'admin@admin.pp5.local',
--     crypt('<password>', gen_salt('bf')),   -- bcrypt, compatible with Supabase
--     NOW(),
--     '{"provider":"email","providers":["email"]}',
--     '{}',
--     NOW(), NOW()
--   )
--   RETURNING id
-- )
-- INSERT INTO public.users (auth_user_id, username, full_name, role, is_active)
-- SELECT id, 'admin', 'ผู้ดูแลระบบ', 'admin', TRUE FROM new_auth;
--
-- -- If login still fails, the email identity may be missing. Add it:
-- --   INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
-- --   SELECT id, id, json_build_object('sub', id::text, 'email', email), 'email', NOW(), NOW()
-- --   FROM auth.users WHERE email = 'admin@admin.pp5.local';
-- ============================================================


-- ============================================================
-- Change/reset an admin password later (fake emails can't use the
-- Dashboard "send recovery email" flow):
-- ============================================================
--   CREATE EXTENSION IF NOT EXISTS pgcrypto;
--   UPDATE auth.users
--   SET encrypted_password = crypt('<new_password>', gen_salt('bf'))
--   WHERE email = 'admin@admin.pp5.local';
-- ============================================================
