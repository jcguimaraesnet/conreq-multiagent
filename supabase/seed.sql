-- ============================================================
-- Seed Data for Local Development
-- This file runs automatically after `supabase db reset`
-- ============================================================

-- 1. Create a test admin user via Supabase Auth
-- Email: admin@cos.ufrj.br / Password: senha123
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
        email_change,
        email_change_token_new,
        email_change_token_current,
        recovery_token,
        reauthentication_token,
        phone,
        phone_change,
        phone_change_token,
        raw_app_meta_data,
        raw_user_meta_data,
        is_sso_user,
        is_super_admin
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
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '{"provider":"email","providers":["email"]}',
        '{"first_name":"Admin","last_name":"Local"}',
        false,
        false
    );

-- 1b. Create the identity record (required for Supabase Auth login)
INSERT INTO
    auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    )
VALUES (
        'a0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'email', 'admin@cos.ufrj.br', 'email_verified', true, 'phone_verified', false),
        'email',
        now(),
        now(),
        now()
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
