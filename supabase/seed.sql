-- ============================================================
-- Seed Data for Local Development
-- This file runs automatically after `supabase db reset`
-- ============================================================

-- 1. Create a test admin user via Supabase Auth
-- Email: admin@local.dev / Password: admin123456
-- The trigger on_auth_user_created auto-creates the profile row
-- via public.handle_new_user() using raw_user_meta_data.

INSERT INTO
    auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        confirmation_token,
        raw_app_meta_data,
        raw_user_meta_data
    )
VALUES (
        '00000000-0000-0000-0000-000000000000',
        'a0000000-0000-0000-0000-000000000001',
        'authenticated',
        'authenticated',
        'admin@cos.ufrj.br',
        extensions.crypt ('senha123', extensions.gen_salt ('bf')),
        now(),
        now(),
        now(),
        '',
        '{"provider":"email","providers":["email"]}',
        '{"first_name":"Admin","last_name":"Local"}'
    );

-- 2. Promote to admin (trigger creates profile with role='user' by default)
UPDATE public.profiles
SET role = 'admin',
is_approved = true
WHERE
    id = 'a0000000-0000-0000-0000-000000000001';

-- ============================================================
-- NOTE: After running `supabase db reset`, you can also create
-- users via the Supabase Studio UI at http://127.0.0.1:54323
-- or sign up normally through the app at http://localhost:3000
-- ============================================================