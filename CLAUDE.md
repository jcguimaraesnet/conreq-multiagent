# CLAUDE.md

## Language

Responder sempre em português brasileiro (pt-BR).

## Package Manager

Usar `pnpm` (nunca npm ou yarn).

## Arquitetura do App

O app é composto por 3 partes que rodam em processos separados:

| Parte     | Stack                  | Porta padrão | Diretório        |
|-----------|------------------------|--------------|------------------|
| Frontend  | Next.js + React + Tailwind | 3000    | `/src`           |
| Backend   | Python + FastAPI       | 8000         | `/backend`       |
| Agente    | Python + LangGraph     | 8123         | `/backend` (agent) |

### Princípio: todas as operações de dados passam pelo FastAPI

O frontend **NÃO** deve acessar o Supabase diretamente para operações de dados (CRUD em tabelas).
Toda leitura/escrita de dados deve passar pelo backend FastAPI via `fetch()` com header `Authorization: Bearer {userId}`.

**Exceções permitidas** (apenas auth/sessão, não dados):
- `supabase.auth.*` (getSession, onAuthStateChange, signInWithPassword, signUp, signOut, resetPasswordForEmail) — gerência de sessão/cookies SSR
- Middleware Next.js (`src/lib/supabase/middleware.ts`) — refresh de sessão
- Server actions de auth (`src/app/auth/actions.ts`) — fluxos de login/signup que dependem de cookies

**Proibido no frontend**:
- `supabase.from('tabela')` — qualquer select/insert/update/delete direto em tabelas
- `supabase.rpc()` — chamadas RPC diretas

Se precisar de um dado do Supabase, crie um endpoint no FastAPI (`backend/app/routers/`) e chame via `fetch()` do frontend.

### API routes do Next.js

- `/api/copilotkit` — proxy para o agente LangGraph (requer autenticação)
- `/api/health/backend` — health check do FastAPI (pública, sem autenticação)
- `/api/health/agent` — health check do LangGraph (pública, sem autenticação)

Essas rotas são excluídas do middleware de autenticação em `src/lib/supabase/middleware.ts`.

### Padrão de routers no backend

- Auth: usar `get_user_id_from_header` de `app.routers.auth_utils`
- Supabase: usar `get_supabase_client()` de `app.services.supabase_client` (service role key, bypassa RLS)
- Registrar novos routers em `backend/main.py` com `prefix="/api"`

### Provider chain no frontend

```
CopilotKit > ThemeProvider > AuthProvider > ProjectProvider > RequirementsProvider > SettingsProvider
```

## Stack

- Frontend: Next.js 16, React 19, Tailwind CSS v4, App Router
- Backend: Python, FastAPI, Supabase (via service role key)
- Agente: Python, LangGraph, CopilotKit
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth (SSR com `@supabase/ssr`)

## Convenções do Frontend

- **Idioma da UI**: todos os textos, labels e mensagens da interface devem ser em **inglês americano (en-US)** — nunca em português
- **TypeScript**: nunca usar `any` como tipo
- **Ícones**: usar apenas `lucide-react`
- **Novas páginas**: usar `AppLayout` como wrapper e `PageTitle` para o título
- **Dark mode**: novos componentes devem incluir classes `dark:` para suporte a tema escuro

## Banco de Dados Local (Supabase Local)

O app suporta dois modos de banco de dados, controlados pelas variáveis de ambiente:

| Modo | Quando usar | Env files |
|------|-------------|-----------|
| **Supabase Cloud** | Deploy na Azure, dev padrão | `backend/.env` + `.env.local` (valores padrão) |
| **Supabase Local** | Dev offline, testes isolados | Copiar de `backend/.env.local.example` + `.env.local.local-example` |

### Pré-requisitos para modo local

- Docker Desktop instalado e rodando
- Supabase CLI (`npx supabase` funciona sem instalação global)

### Setup inicial (uma vez)

```bash
# 1. na raiz do projeto - inicia instância local
npx supabase start --debug

# 2. na raiz do projeto - recria banco e aplicar migration + seed
# vai no diretório /supabase/migrations e /supabase/seed.sql e aplica sqls
npx supabase db reset

# 0.1 (opcional) se quiser sincronizar com supabase cloud
npx supabase login

# 1.1 (opcional) se quiser fazer diff do banco na nuvem
npx supabase link --project-ref wmysvvoiiesvttpynpfy

# 1.2 (opcional) Se quiser obter schema completo do banco da nuvem como migration
npx supabase db pull
```

### Comandos do Supabase Local

```bash
npx supabase start       # sobe banco local (requer Docker)
npx supabase stop        # para banco local
npx supabase status      # mostra URLs e keys locais
npx supabase status -o env  # mostra keys no formato JWT (usar ANON_KEY e SERVICE_ROLE_KEY para os .env)
npx supabase db reset    # recria banco local do zero (aplica migrations + seed)
```

**Importante**: usar `npx supabase status -o env` para obter as keys JWT (`ANON_KEY` e `SERVICE_ROLE_KEY`). O comando sem `-o env` mostra keys no formato `sb_publishable_`/`sb_secret_` que **não funciona** com a lib Python.

### URLs locais

- **API**: http://127.0.0.1:54321
- **Studio** (UI): http://127.0.0.1:54323
- **Inbucket** (emails de teste): http://127.0.0.1:54324
- **Database**: postgresql://postgres:postgres@127.0.0.1:54322/postgres

## Comandos úteis

```bash
pnpm dev              # roda frontend + backend + agent juntos
pnpm dev:frontend     # só frontend (porta 3000)
pnpm dev:backend      # só backend (porta 8000, via uv)
pnpm dev:agent        # só agente LangGraph (porta 8123)
pnpm dev:wsl          # WSL2: levanta Supabase + app (tudo em Docker)
pnpm dev:wsl:stop     # WSL2: para tudo (app + Supabase)
pnpm build            # build de produção
pnpm tsc --noEmit     # type check sem emitir
```

## Desenvolvimento com WSL2 (Docker)

Ambiente 100% Docker no WSL2 que levanta as 4 partes com um comando.

### Arquitetura

```
WSL2 (Ubuntu 24.04)
  ├── docker-compose.dev.yml (app)
  │     ├── init      → instala deps (pnpm install + uv sync)
  │     ├── frontend   → next dev              :3000
  │     ├── backend    → uvicorn --reload       :8000
  │     └── agent      → langgraph dev          :8123
  └── supabase start (banco)
        ├── supabase-api     :54321
        ├── supabase-db      :54322
        ├── supabase-studio  :54323
        └── supabase-inbucket:54324
```

Todas as portas ficam acessíveis no Windows via `localhost`.

### Pré-requisitos

- WSL2 com Ubuntu 24.04
- Docker Engine (nativo no WSL, **não** Docker Desktop)
- Node.js 20 + pnpm + Supabase CLI

### Setup inicial (uma vez)

```bash
# 1. Rodar script de setup (instala Docker, Node, pnpm, Supabase CLI, uv)
bash scripts/wsl-setup.sh

# 2. Clonar repo no filesystem nativo do WSL (NUNCA em /mnt/c/)
mkdir -p ~/projects
git clone <repo-url> ~/projects/app-multi-agent-conjectural-assist
cd ~/projects/app-multi-agent-conjectural-assist

# 3. Configurar env files
cp .env.local.example .env.local
cp backend/.env.example backend/.env
# Editar com suas API keys

# 4. Iniciar Supabase e pegar keys
npx supabase start
npx supabase status -o env   # copiar ANON_KEY e SERVICE_ROLE_KEY para os .env
npx supabase db reset         # aplicar migrations + seed
```

### Uso diário

```bash
bash scripts/dev.sh       # levanta Supabase + frontend + backend + agent
# ou: pnpm dev:wsl

bash scripts/dev-stop.sh  # para tudo
# ou: pnpm dev:wsl:stop
```

### Configuração de recursos do WSL2

Criar `C:\Users\<usuario>\.wslconfig`:

```ini
[wsl2]
memory=8GB
swap=2GB
```

### Arquivos do ambiente WSL2

| Arquivo | Propósito |
|---------|-----------|
| `docker-compose.dev.yml` | Orquestra frontend, backend e agent em Docker |
| `scripts/wsl-setup.sh` | Setup único do WSL2 |
| `scripts/dev.sh` | Levanta Supabase + app services |
| `scripts/dev-stop.sh` | Para tudo |
