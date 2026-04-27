# Auditoria: Chamadas diretas ao Supabase no Frontend

## Contexto

A arquitetura do app define que **todas as operações de dados** devem passar pelo backend Python/FastAPI. O frontend Next.js deveria apenas:
1. Gerenciar autenticação (sessão/cookies) via Supabase Auth SSR
2. Intermediar com o agente LangGraph via CopilotKit (`/api/copilotkit`)
3. Health checks (`/api/health/*`)

A auditoria encontrou **chamadas diretas ao Supabase que violam essa regra**.

---

## Chamadas que estao CORRETAS (via FastAPI)

Todas as operações de negócio já passam pelo FastAPI:
- Projects CRUD: `ProjectContext.tsx`, `projects/page.tsx`, `AddProjectPopup.tsx`
- Requirements: `RequirementsContext.tsx`
- Conjectural Requirements: `conjectural-requirements/page.tsx`, `ConjecturalDetailView.tsx`
- Dashboard analytics: `dashboard/page.tsx` (6 endpoints)
- CopilotKit: `/api/copilotkit` (proxy para LangGraph)

---

## Exceções ACEITÁVEIS (Supabase Auth SSR)

Essas chamadas gerenciam sessão/cookies e são infraestrutura de autenticação, não operações de dados. Mover para FastAPI seria impraticável pois FastAPI roda em outra origem (porta 8000) e não tem acesso aos cookies do Next.js.

| Arquivo | Chamadas | Justificativa |
|---------|----------|---------------|
| [middleware.ts](src/lib/supabase/middleware.ts) | `auth.getUser()` | Refresh de sessão no middleware Next.js |
| [AuthContext.tsx](src/contexts/AuthContext.tsx) | `auth.getSession()`, `auth.onAuthStateChange()`, `auth.signOut()` | Lifecycle da sessão client-side |
| [AuthHashErrorHandler.tsx](src/components/auth/AuthHashErrorHandler.tsx) | `auth.signOut()` | Limpeza de hash corrompido |
| [auth/signout/route.ts](src/app/auth/signout/route.ts) | `auth.getUser()`, `auth.signOut()` | Rota server-side de signout (cookies) |
| [auth/actions.ts](src/app/auth/actions.ts) | `signInWithPassword`, `signUp`, `resetPasswordForEmail`, `signOut` | Server actions de autenticação (cookies SSR) |
| [AuthFormPanel.tsx](src/components/auth/AuthFormPanel.tsx) | `auth.signInWithPassword()`, `auth.signOut()` | Login client-side (gerência de sessão) |

---

## VIOLACOES encontradas (devem migrar para FastAPI)

### 1. SettingsContext.tsx - PRIORIDADE ALTA
- **Arquivo**: [src/contexts/SettingsContext.tsx](src/contexts/SettingsContext.tsx)
- **Linha 94-98**: `supabase.from('settings').select('*')` - leitura de settings
- **Linha 144-152**: `supabase.from('settings').upsert(...)` - gravação de settings
- **Tabela**: `settings`
- **Tipo**: CRUD completo de dados, violação clara

### 2. useOnboardingStatus.ts - PRIORIDADE ALTA
- **Arquivo**: [src/hooks/useOnboardingStatus.ts](src/hooks/useOnboardingStatus.ts)
- **Linha 64-68**: `supabase.from('profiles').select(onboarding_columns)` - leitura
- **Linha 110-113**: `supabase.from('profiles').update({ [column]: true })` - escrita
- **Tabela**: `profiles` (colunas `has_completed_onboarding_stage{1,2,3}`)
- **Tipo**: CRUD de dados de onboarding

### 3. AuthContext.tsx (profile fetch) - PRIORIDADE MEDIA
- **Arquivo**: [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)
- **Linha 26-31**: `supabase.from('profiles').select('role, is_approved')` - leitura do perfil
- **Tabela**: `profiles`
- **Nota**: As chamadas `auth.*` neste arquivo sao aceitáveis; apenas o `profiles.select` é violação

### 4. AuthFormPanel.tsx (approval check) - PRIORIDADE MEDIA
- **Arquivo**: [src/components/auth/AuthFormPanel.tsx](src/components/auth/AuthFormPanel.tsx)
- **Linha 50-54**: `supabase.from('profiles').select('is_approved')` - verifica aprovação após login
- **Tabela**: `profiles`
- **Nota**: O `auth.signInWithPassword` e `auth.signOut` neste arquivo são aceitáveis

### 5. Admin actions.ts - PRIORIDADE ALTA
- **Arquivo**: [src/app/admin/actions.ts](src/app/admin/actions.ts)
- **Linha 19-23**: `profiles.select('role')` - verificação admin
- **Linha 34-37**: `profiles.select(...)` - listar todos os usuários
- **Linha 48-51**: `profiles.update({ is_approved: true })` - aprovar
- **Linha 67-70**: `profiles.update({ is_approved: false })` - revogar
- **Linha 85-88**: `profiles.update({ role: 'admin', is_approved: true })` - promover
- **Linha 103-106**: `profiles.update({ role: 'user' })` - rebaixar
- **Tabela**: `profiles`
- **Tipo**: Operações admin completas (CRUD sensível)
- **Nota**: `auth.getUser()` na `verifyAdmin` pode permanecer (extração de identidade)

### 6. Admin users/page.tsx - PRIORIDADE BAIXA
- **Arquivo**: [src/app/admin/users/page.tsx](src/app/admin/users/page.tsx)
- **Verificação de role** direto na tabela `profiles` para renderizar página admin
- **Tabela**: `profiles`

---

## Plano de migração

### Fase 1: Novos endpoints no FastAPI

**Router `profiles.py`**:
```
GET  /api/profiles/me              -> { role, is_approved }
GET  /api/profiles/me/onboarding   -> { stage1: bool, stage2: bool, stage3: bool }
PATCH /api/profiles/me/onboarding/{stage}  -> marca stage como completo
```

**Router `settings.py`**:
```
GET  /api/settings     -> retorna settings do usuário (ou defaults)
PUT  /api/settings     -> upsert settings do usuário
```

**Router `admin.py`**:
```
GET   /api/admin/users                   -> lista todos os usuários
PATCH /api/admin/users/approve           -> body: { user_ids: [] }
PATCH /api/admin/users/revoke            -> body: { user_ids: [] }
PATCH /api/admin/users/promote-to-admin  -> body: { user_ids: [] }
PATCH /api/admin/users/demote-to-user    -> body: { user_ids: [] }
```

Todos seguem o padrão existente: `Authorization: Bearer {user_id}`, service-role Supabase no backend.

### Fase 2: Migrar Settings e Onboarding (mais seguro primeiro)
- `SettingsContext.tsx`: trocar Supabase por `fetch(API_URL/api/settings)` + Bearer token
- `useOnboardingStatus.ts`: trocar Supabase por `fetch(API_URL/api/profiles/me/onboarding)` + Bearer token
- Remover imports do `@/lib/supabase/client` desses arquivos

### Fase 3: Migrar leitura de profile
- `AuthContext.tsx`: trocar `fetchProfile()` de `supabase.from('profiles')` para `fetch(API_URL/api/profiles/me)`
- `AuthFormPanel.tsx`: trocar check de `is_approved` para `fetch(API_URL/api/profiles/me)` após login

### Fase 4: Migrar operações admin
- `admin/actions.ts`: reescrever server actions para chamar FastAPI. Manter `supabase.auth.getUser()` apenas para extrair userId, enviar ao FastAPI via header
- `admin/users/page.tsx`: trocar verificação de role para chamar FastAPI

### Fase 5: Limpeza
- Verificar que `src/lib/supabase/client.ts` só é importado por código de auth
- Confirmar que nenhuma operação de dados permanece fora do FastAPI

---

## Arquivos críticos a modificar

**Backend (criar)**:
- `backend/app/routers/profiles.py`
- `backend/app/routers/settings.py`
- `backend/app/routers/admin.py`
- `backend/main.py` (registrar novos routers)

**Frontend (modificar)**:
- `src/contexts/SettingsContext.tsx`
- `src/hooks/useOnboardingStatus.ts`
- `src/contexts/AuthContext.tsx`
- `src/components/auth/AuthFormPanel.tsx`
- `src/app/admin/actions.ts`
- `src/app/admin/users/page.tsx`

**Referência (padrão existente)**:
- `backend/app/routers/projects.py` - padrão de router e `get_user_id_from_header`
- `src/contexts/ProjectContext.tsx` - padrão de fetch com Bearer token no frontend

---

## Verificação

1. Após cada fase, buscar por `supabase.from(` no frontend e confirmar que só resta em código de auth
2. Testar login/signup/signout (auth não deve quebrar)
3. Testar settings (salvar/carregar)
4. Testar onboarding (completar stages)
5. Testar admin (listar, aprovar, revogar, promover, rebaixar)
6. Testar que as chamadas aparecem no log do FastAPI (não mais direto ao Supabase)
