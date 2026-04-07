-- ============================================================
-- Seed Data for Local Development
-- This file runs automatically after `supabase db reset`
-- ============================================================

-- 1. Create a test admin user via Supabase Auth
-- Email: admin@local.dev / Password: admin123456
-- Note: The trigger on auth.users should auto-create the profile row.
-- If no trigger exists, uncomment the manual profile insert below.

-- INSERT INTO auth.users (
--   instance_id, id, aud, role, email, encrypted_password,
--   email_confirmed_at, created_at, updated_at,
--   confirmation_token, raw_app_meta_data, raw_user_meta_data
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   'a0000000-0000-0000-0000-000000000001',
--   'authenticated', 'authenticated',
--   'admin@local.dev',
--   crypt('admin123456', gen_salt('bf')),
--   now(), now(), now(), '',
--   '{"provider":"email","providers":["email"]}',
--   '{"first_name":"Admin","last_name":"Local"}'
-- );

-- 2. Manual profile insert (use only if auth trigger doesn't create profiles)
-- INSERT INTO public.profiles (id, first_name, last_name, email, role, is_approved)
-- VALUES (
--   'a0000000-0000-0000-0000-000000000001',
--   'Admin', 'Local', 'admin@local.dev', 'admin', true
-- );

-- 3. Default settings for admin user
-- INSERT INTO public.settings (user_id, require_brief_description, require_evaluation, batch_mode, quantity_req_batch, spec_attempts, model, model_judge)
-- VALUES (
--   'a0000000-0000-0000-0000-000000000001',
--   true, true, true, 5, 3, 'gemini', 'gemini'
-- );

-- ============================================================
-- NOTE: After running `supabase db reset`, you can also create
-- users via the Supabase Studio UI at http://127.0.0.1:54323
-- or sign up normally through the app at http://localhost:3000
-- ============================================================
