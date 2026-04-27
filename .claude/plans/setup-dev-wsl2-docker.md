# Plano: Ambiente de Desenvolvimento WSL2 — Tudo em Docker

## Contexto

O objetivo é criar um ambiente de desenvolvimento 100% Docker no WSL2 que levante as 4 partes do app (frontend, backend, agente, Supabase) com um único comando. Este setup será replicado em um laboratório de universidade, então precisa ser portável e reproduzível — basta Docker + Supabase CLI para funcionar.

---

## Estratégia: Docker Compose (app) + Supabase CLI (banco)

### Por que dois stacks e não um único docker-compose?

O `supabase start` gerencia ~15 containers internamente (PostgreSQL, GoTrue, PostgREST, Kong, Studio, Realtime, Storage, etc.). Tentar replicar isso manualmente num docker-compose seria:
- ~500 linhas de YAML com variáveis de ambiente complexas
- Incompatível com `supabase db reset`, `supabase db pull`, migrations
- Manutenção contínua para acompanhar versões do Supabase

**A solução**: usar `supabase start` para o banco (ele já usa Docker internamente) + `docker-compose.dev.yml` para os 3 serviços do app. Um script une tudo.

### Networking: `network_mode: host`

Todos os containers do app usam `network_mode: host`, compartilhando a rede do WSL2. Assim:
- Containers se veem via `localhost` (exatamente como dev nativo)
- Acessam Supabase em `localhost:54321` (publicado pelo `supabase start`)
- **Nenhuma mudança** nos arquivos `.env` — URLs já apontam para `127.0.0.1`
- Portas acessíveis do Windows via `localhost` (WSL2 auto-forward)

### Arquitetura

```
Windows 11 → navegador em localhost:3000/8000/54323
  └── WSL2 (Ubuntu 24.04)
        ├── Docker Engine
        │     ├── docker-compose.dev.yml (app)
        │     │     ├── init          → instala deps (pnpm install + uv sync)
        │     │     ├── frontend      → next dev              :3000
        │     │     ├── backend       → uvicorn --reload       :8000
        │     │     └── agent         → langgraph dev          :8123
        │     │
        │     └── supabase start (banco)
        │           ├── supabase-db        :54322
        │           ├── supabase-api       :54321
        │           ├── supabase-studio    :54323
        │           ├── supabase-inbucket  :54324
        │           └── +~11 containers
        │
        └── ~/projects/app-.../ (repo no filesystem ext4 nativo)
```

---

## Passo a Passo

### Fase 1: Setup do WSL2 (único, manual no Windows)

**1.1 Instalar WSL2:**
```powershell
wsl --install -d Ubuntu-24.04
```

**1.2 Configurar recursos** — criar `C:\Users\jcgui\.wslconfig`:
```ini
[wsl2]
memory=8GB
swap=2GB
```
> Supabase (~2-3 GB) + 3 containers do app (~1-2 GB) = ~4-5 GB mínimo. 8 GB dá margem.

**1.3 Habilitar systemd** (para Docker auto-start) — dentro do WSL, `/etc/wsl.conf`:
```ini
[boot]
systemd=true
```
Reiniciar: `wsl --shutdown` no PowerShell.

### Fase 2: Instalar ferramentas no WSL2 (`scripts/wsl-setup.sh`)

Criar script de setup único:

**2.1 Docker Engine** (nativo no WSL2, não Docker Desktop):
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
```

**2.2 Node.js 20 + pnpm** (necessário para Supabase CLI via npx):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pnpm
```

**2.3 Supabase CLI:**
```bash
npm install -g supabase
```

**2.4 Python 3.12 + uv** (opcional, só se quiser rodar fora do Docker também):
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**2.5 Clonar repo** (CRÍTICO: no filesystem nativo, nunca em `/mnt/c/`):
```bash
mkdir -p ~/projects
git clone <repo-url> ~/projects/app-multi-agent-conjectural-assist
cd ~/projects/app-multi-agent-conjectural-assist
```

**2.6 Configurar env files:**
```bash
cp .env.local.example .env.local
cp backend/.env.example backend/.env
# Editar com suas API keys (OpenAI, LangSmith, etc.)
```

**2.7 Setup inicial do Supabase:**
```bash
npx supabase start
npx supabase status -o env   # copiar ANON_KEY e SERVICE_ROLE_KEY para os .env
npx supabase db reset         # aplicar migrations + seed
```

### Fase 3: Criar `docker-compose.dev.yml` (raiz do projeto)

Este é o arquivo principal. Usa os Dockerfiles do devcontainer que já existem, com `network_mode: host` para integrar com Supabase.

```yaml
services:
  # Serviço de inicialização — instala dependências uma vez
  init:
    build:
      context: .
      dockerfile: .devcontainer/Dockerfile.python
    volumes:
      - .:/workspace:cached
      - pnpm-store:/home/vscode/.local/share/pnpm/store
      - uv-cache:/home/vscode/.cache/uv
    network_mode: host
    user: "1000:1000"
    command: >
      bash -c "
        cd /workspace &&
        pnpm config set store-dir /home/vscode/.local/share/pnpm/store &&
        pnpm install &&
        cd backend && uv sync
      "

  backend:
    build:
      context: .
      dockerfile: .devcontainer/Dockerfile.python
    volumes:
      - .:/workspace:cached
      - uv-cache:/home/vscode/.cache/uv
    network_mode: host
    env_file:
      - backend/.env
    user: "1000:1000"
    working_dir: /workspace
    command: pnpm dev:backend
    depends_on:
      init:
        condition: service_completed_successfully
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: .devcontainer/Dockerfile.frontend
    volumes:
      - .:/workspace:cached
      - pnpm-store:/home/node/.local/share/pnpm/store
    network_mode: host
    env_file:
      - .env.local
    user: "1000:1000"
    working_dir: /workspace
    command: pnpm dev:frontend
    depends_on:
      init:
        condition: service_completed_successfully
    restart: unless-stopped

  agent:
    build:
      context: .
      dockerfile: .devcontainer/Dockerfile.python
    volumes:
      - .:/workspace:cached
      - uv-cache:/home/vscode/.cache/uv
    network_mode: host
    env_file:
      - backend/.env
    user: "1000:1000"
    working_dir: /workspace/backend
    command: >
      uv run langgraph dev --port 8123 --host 0.0.0.0
      --no-browser --n-jobs-per-worker 10
    depends_on:
      init:
        condition: service_completed_successfully
    restart: unless-stopped

volumes:
  pnpm-store:
  uv-cache:
```

**Decisões de design:**
- **`depends_on: init: condition: service_completed_successfully`** — substitui o hack do `.ready` file do devcontainer. O init roda, instala deps, termina. Só então os serviços sobem.
- **Volumes nomeados** (`pnpm-store`, `uv-cache`) — cacheia dependências entre restarts, evitando reinstalar tudo.
- **`network_mode: host`** — todos compartilham a rede do host WSL2, acessam Supabase em `localhost:54321`.
- **`restart: unless-stopped`** — se um serviço crashar, reinicia automaticamente.
- **Reutiliza os Dockerfiles do devcontainer** — não duplica imagens.

### Fase 4: Criar script de inicialização (`scripts/dev.sh`)

```bash
#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== SMA Conjectural Assist — Dev Environment ===${NC}"

# 1. Docker
echo -e "\n${GREEN}[1/4] Verificando Docker...${NC}"
if ! docker info &>/dev/null; then
    echo "Iniciando Docker..."
    sudo service docker start
    sleep 2
    if ! docker info &>/dev/null; then
        echo -e "${RED}Erro: Docker não iniciou. Verifique a instalação.${NC}"
        exit 1
    fi
fi
echo "Docker OK."

# 2. Supabase
echo -e "\n${GREEN}[2/4] Verificando Supabase...${NC}"
if docker ps --format '{{.Names}}' | grep -q "supabase_db"; then
    echo -e "${YELLOW}Supabase já está rodando.${NC}"
else
    echo "Iniciando Supabase (pode demorar na primeira vez)..."
    npx supabase start
fi

# 3. Build das imagens (se necessário)
echo -e "\n${GREEN}[3/4] Buildando imagens Docker...${NC}"
docker compose -f docker-compose.dev.yml build

# 4. Subir serviços
echo -e "\n${GREEN}[4/4] Iniciando Frontend + Backend + Agent...${NC}"
echo ""
echo "  Frontend:        http://localhost:3000"
echo "  Backend (docs):  http://localhost:8000/docs"
echo "  Agent Studio:    http://localhost:8123"
echo "  Supabase Studio: http://localhost:54323"
echo "  Inbucket (email):http://localhost:54324"
echo ""
docker compose -f docker-compose.dev.yml up
```

### Fase 5: Criar script de parada (`scripts/dev-stop.sh`)

```bash
#!/bin/bash
echo "Parando serviços do app..."
docker compose -f docker-compose.dev.yml down

echo "Parando Supabase..."
npx supabase stop

echo "Tudo parado."
```

### Fase 6: Adicionar scripts ao `package.json`

```json
"dev:wsl": "bash scripts/dev.sh",
"dev:wsl:stop": "bash scripts/dev-stop.sh"
```

### Fase 7: Atualizar `CLAUDE.md`

Adicionar seção sobre o ambiente WSL2:
- Pré-requisitos (WSL2 + Docker + Supabase CLI)
- Setup inicial (`scripts/wsl-setup.sh`)
- Uso diário (`pnpm dev:wsl` ou `bash scripts/dev.sh`)
- Como parar (`pnpm dev:wsl:stop`)
- Portas e URLs

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Propósito |
|---------|------|-----------|
| `docker-compose.dev.yml` | **Criar** | Orquestra os 3 serviços do app em Docker |
| `scripts/wsl-setup.sh` | **Criar** | Setup único do WSL2 (Docker, Node, Supabase CLI) |
| `scripts/dev.sh` | **Criar** | Levanta tudo: Supabase + app services |
| `scripts/dev-stop.sh` | **Criar** | Para tudo |
| `package.json` | **Modificar** | Adicionar `dev:wsl` e `dev:wsl:stop` |
| `CLAUDE.md` | **Modificar** | Documentar ambiente WSL2 |

**Sem mudança**: `.env.local.example`, `backend/.env.example`, `supabase/config.toml`, Dockerfiles existentes, código-fonte.

---

## Para o Laboratório da Universidade

O setup na máquina do lab seria:

1. Instalar Docker Engine + Supabase CLI + Node.js
2. `git clone <repo>`
3. Copiar `.env` files dos examples
4. `bash scripts/dev.sh`

Pronto. Mesmo fluxo que o desenvolvedor usa no dia a dia.

---

## Possíveis Problemas e Mitigações

| Problema | Mitigação |
|----------|-----------|
| Docker Desktop no Windows conflita com Docker Engine no WSL2 | Desinstalar Docker Desktop ou desabilitar WSL integration |
| Supabase já rodando no Windows | `npx supabase stop` no Windows antes |
| Repo em `/mnt/c/` (lento) | Script de setup clona em `~/projects/` |
| Portas conflitantes | `network_mode: host` usa portas direto; script verifica antes |
| Init service reinstala deps a cada `up` | Volumes nomeados (`pnpm-store`, `uv-cache`) cacheia tudo |
| RAM insuficiente | `.wslconfig` com 8 GB; documentar requisito mínimo |

## Verificação

1. No WSL2, rodar `bash scripts/dev.sh`
2. No Windows, acessar:
   - `http://localhost:3000` — frontend carrega
   - `http://localhost:8000/docs` — Swagger do FastAPI abre
   - `http://localhost:54323` — Supabase Studio abre
3. Editar um arquivo `.tsx` no VS Code (Remote-WSL) e ver hot-reload no browser
4. Criar um projeto pela UI e verificar no Supabase Studio que os dados persistiram
5. Parar com `bash scripts/dev-stop.sh` e verificar que todos os containers pararam
