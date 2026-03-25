-- ============================================================
-- Migration: Admin Approval Flow
-- Execute este script no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Adicionar coluna role com CHECK constraint
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user'));

-- 2. Adicionar coluna is_approved (default false para novos usuários)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false;

-- 3. Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 4. Aprovar TODOS os usuários existentes (evita bloqueio acidental)
UPDATE public.profiles SET is_approved = true;

-- ============================================================
-- 5. Definir admin - SUBSTITUA pelo seu e-mail real
-- ============================================================
-- UPDATE public.profiles
-- SET role = 'admin', is_approved = true
-- WHERE email = 'SEU_EMAIL@example.com';

-- ============================================================
-- 6. Helper function to check admin role (bypasses RLS to avoid recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================================
-- 7. RLS Policies
-- NOTE: Drop the old recursive policies first if they were already created.
-- ============================================================

-- Drop old recursive policies (safe to run even if they don't exist)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

-- Users can view their own profile (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON public.profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;
END
$$;

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Admins can update profiles (approve/revoke)
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- ============================================================
-- CONFIGURAÇÃO MANUAL NO SUPABASE DASHBOARD:
-- Authentication > Settings > Email > Desabilitar "Enable email confirmations"
-- ============================================================
