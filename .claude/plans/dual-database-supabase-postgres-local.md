# Plano: Dual Database — Supabase (cloud) + PostgreSQL Local

## Context

O app atualmente depende 100% do Supabase (cloud) para banco de dados e autenticação. O objetivo é permitir desenvolvimento local com um banco PostgreSQL local, mantendo o Supabase para deploy na Azure. Uma flag controlaria qual backend usar.

**Problema central**: o backend Python faz ~52 chamadas usando a API do cliente Supabase (`supabase.from_('table').select()...`) em 11 arquivos. O frontend usa `supabase.auth.*` diretamente para login/signup/sessão. Migrar para PostgreSQL puro exigiria reescrever tudo isso.

---

## Resposta à Pergunta 1: Estratégias para lidar com duas realidades

Existem **3 estratégias viáveis**, ordenadas da mais pragmática à mais complexa:

### Estratégia A: Supabase Local via `supabase start` (RECOMENDADA)

O Supabase CLI tem o comando `supabase start` que sobe via Docker uma instância **completa** do Supabase localmente: PostgreSQL + PostgREST + GoTrue (auth) + pgvector + tudo mais.

**Resultado**: o código do app não muda NADA. Só troca as variáveis de ambiente (URL e keys) para apontar para `localhost:54321`.

| Aspecto | Impacto |
|---------|---------|
| Código backend (52 chamadas) | **Zero mudanças** — mesma API |
| Código frontend (auth) | **Zero mudanças** — GoTrue local funciona igual |
| pgvector + RPC functions | **Automático** — migrations aplicam tudo |
| Triggers (auth.users → profiles) | **Automático** — GoTrue local cria users igual |
| RLS policies | Funcionam identicamente |
| Novo código necessário | ~30 linhas (config + scripts) |

### Estratégia B: Repository Pattern + PostgreSQL puro

Criar uma camada de abstração (interfaces) com duas implementações: `SupabaseAdapter` e `PostgresAdapter` (usando SQLAlchemy async ou asyncpg).

| Aspecto | Impacto |
|---------|---------|
| Novos arquivos Python | 8-10 |
| Arquivos modificados | 11+ |
| Novo código | ~2000-3000 linhas |
| Auth local | Precisaria implementar sistema completo (bcrypt + JWT + endpoints) — ~500 linhas |
| Frontend | 4-6 arquivos modificados (AuthProvider alternativo) |
| Novas dependências | asyncpg, pgvector, passlib, python-jose |
| Manutenção permanente | Duas implementações paralelas de cada query |

### Estratégia C: SQLAlchemy como ORM unificado

Substituir o cliente Supabase por SQLAlchemy para TODAS as operações. Como Supabase é PostgreSQL por baixo, SQLAlchemy conecta em ambos via connection string.

| Aspecto | Impacto |
|---------|---------|
| Reescrita total | Sim — todas as 52 chamadas |
| Vantagem | Uma única implementação |
| Desvantagem | Perde conveniências do cliente Supabase, reescrita massiva |
| Auth | Mesmo problema da Estratégia B |

### Veredicto

**Estratégia A (Supabase Local) é superior por margem enorme.** As estratégias B e C só se justificam se houver plano concreto de abandonar o Supabase completamente no futuro. Para o caso de uso descrito (flag de dev local), é over-engineering.

---

## Resposta à Pergunta 2: Exportar schema do Supabase vs. varrer código

**Resposta definitiva: exportar diretamente do Supabase.**

Motivos:
1. O código só mostra as queries (SELECT, INSERT...), não a estrutura (CREATE TABLE, constraints, defaults, indexes)
2. A função RPC `match_business_need_embeddings` não existe em nenhum arquivo local — só no Supabase
3. Os triggers (ex: criar profile quando user é criado no auth.users) não estão no código
4. As RLS policies estão parcialmente nos 2 SQLs de migration, mas incompletas
5. A extensão pgvector e a configuração da coluna `business_need_embedding` como tipo VECTOR só existe no Supabase
6. Os 2 arquivos em `supabase/` são migrations incrementais, não o schema completo

**Como exportar:**

```bash
# Opção 1: Via Supabase CLI (recomendada)
supabase link --project-ref wmysvvoiiesvttpynpfy
supabase db diff --schema public --file supabase/migrations/00000000000000_initial_schema.sql

# Opção 2: Via pg_dump direto
pg_dump --schema-only --no-owner --no-acl \
  "postgresql://postgres:[PASSWORD]@db.wmysvvoiiesvttpynpfy.supabase.co:5432/postgres" \
  > schema_dump.sql
```

O `supabase db diff` é preferível porque captura tudo no formato correto para migrations.

---

## Plano de Implementação (Estratégia A)

### Fase 1: Inicializar projeto Supabase local

1. **Instalar Supabase CLI** (se não instalado)
   ```bash
   pnpm add -g supabase
   ```

2. **Inicializar projeto Supabase**
   ```bash
   supabase init
   ```
   Isso cria `supabase/config.toml` e `supabase/migrations/`

3. **Linkar ao projeto cloud**
   ```bash
   supabase link --project-ref wmysvvoiiesvttpynpfy
   ```

4. **Capturar schema completo como migration inicial**
   ```bash
   supabase db diff --schema public -f initial_schema
   ```
   Resultado: `supabase/migrations/YYYYMMDDHHMMSS_initial_schema.sql` contendo:
   - Todas as 6 tabelas (profiles, projects, requirements, conjectural_requirements, evaluations, settings)
   - Extensão pgvector (`CREATE EXTENSION IF NOT EXISTS vector`)
   - Função RPC `match_business_need_embeddings`
   - Função `is_admin()` (SECURITY DEFINER)
   - Todas as RLS policies
   - Todos os indexes
   - Todos os triggers

5. **Mover os 2 SQLs antigos** para uma pasta `supabase/archive/` (são históricos, o schema inicial já contém tudo)

### Fase 2: Configuração de ambiente

6. **Criar arquivo `backend/.env.local.example`** com template para Supabase local:
   ```env
   # Valores padrão do supabase start (determinísticos)
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

7. **Criar arquivo `.env.local.local-example`** (frontend) com os mesmos valores locais

8. **Atualizar `backend/app/config.py`** — adicionar campo opcional:
   ```python
   db_backend: str = "supabase"  # "supabase" | "local"
   ```
   (Nota: este campo serve mais como documentação/flag. Na prática, a troca é feita pelas env vars de URL/keys.)

### Fase 3: Seed data

9. **Criar `supabase/seed.sql`** com dados iniciais para dev:
   - Um usuário admin de teste
   - Um projeto de exemplo
   - Alguns requirements de exemplo

### Fase 4: Script de conveniência

10. **Criar `scripts/start-local-db.sh`**:
    ```bash
    #!/bin/bash
    supabase start
    supabase status  # mostra URLs e keys
    echo "Copie as URLs/keys acima para seus arquivos .env"
    ```

### Fase 5: Atualizar docker-compose (se necessário)

11. **Avaliar `.devcontainer/docker-compose.yml`** — o `supabase start` gerencia seus próprios containers Docker, então não precisa ser adicionado ao compose. Apenas documentar a ordem de startup.

### Fase 6: Documentação

12. **Atualizar CLAUDE.md** com novo comando:
    ```bash
    supabase start        # sobe banco local (requer Docker)
    supabase stop         # para banco local
    supabase db reset     # recria banco local do zero
    ```

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `supabase/config.toml` | Criado pelo `supabase init` |
| `supabase/migrations/YYYYMMDD_initial_schema.sql` | Criado pelo `supabase db diff` |
| `supabase/seed.sql` | **Criar** — dados de teste |
| `supabase/admin-approval-migration.sql` | **Mover** para `supabase/archive/` |
| `supabase/rename-positive-impact-to-business-need.sql` | **Mover** para `supabase/archive/` |
| `backend/.env.local.example` | **Criar** — template para env local |
| `.env.local.local-example` | **Criar** — template frontend local |
| `scripts/start-local-db.sh` | **Criar** — script de conveniência |
| `backend/app/config.py` | **Editar** — adicionar campo `db_backend` |
| `CLAUDE.md` | **Editar** — documentar comandos supabase |

---

## Verificação

1. `supabase start` — subir instância local
2. Trocar `.env` files para apontar para localhost:54321
3. `pnpm dev` — rodar o app completo
4. Criar conta via signup (GoTrue local)
5. Criar projeto, adicionar requirements
6. Gerar conjectural requirements (testa pgvector + embeddings)
7. Verificar dashboard (testa queries complexas)
8. `supabase stop` — parar instância local
9. Trocar `.env` de volta para Supabase cloud
10. Verificar que tudo continua funcionando normalmente

---

## Pré-requisitos

- **Docker Desktop** instalado e rodando (obrigatório para `supabase start`)
- **Supabase CLI** instalado (`pnpm add -g supabase` ou via scoop/brew)
- **Senha do banco Supabase cloud** (para o `supabase link`)
