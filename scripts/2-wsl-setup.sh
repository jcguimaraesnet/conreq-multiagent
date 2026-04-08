#!/usr/bin/env bash
# =============================================================================
# 2-wsl-setup.sh - Setup de Docker, Node.js 22, pnpm e uv no WSL
# Uso: bash scripts/2-wsl-setup.sh
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TOTAL_STEPS=16

step() {
	local num="$1"
	local message="$2"
	echo -e "\n${GREEN}[${num}/${TOTAL_STEPS}] ${message}${NC}"
}

cmd() {
	echo -e "${YELLOW}>> $*${NC}"
	"$@"
}

echo -e "${GREEN}=== WSL Setup (Docker + Node 22 + pnpm + uv) ===${NC}"

step 1 "Atualizando lista de pacotes"
cmd sudo apt-get update

step 2 "Instalando dependencias para repositos HTTPS"
cmd sudo apt-get install -y ca-certificates curl gnupg

step 3 "Criando diretorio de keyrings do apt"
cmd sudo install -m 0755 -d /etc/apt/keyrings

step 4 "Baixando chave GPG oficial do Docker"
echo -e "${YELLOW}>> curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg${NC}"
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
cmd sudo chmod a+r /etc/apt/keyrings/docker.gpg

step 5 "Adicionando repositorio oficial do Docker"
ARCH="$(dpkg --print-architecture)"
CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
DOCKER_LIST_LINE="deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${CODENAME} stable"
echo -e "${YELLOW}>> sudo tee /etc/apt/sources.list.d/docker.list${NC}"
echo "$DOCKER_LIST_LINE" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

step 6 "Atualizando lista de pacotes (com repo Docker)"
cmd sudo apt-get update

step 7 "Instalando Docker Engine, CLI, containerd e Compose plugin"
cmd sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

step 8 "Adicionando usuario atual ao grupo docker"
if id -nG "$USER" | grep -qw docker; then
	echo -e "${YELLOW}Usuario '$USER' ja esta no grupo docker.${NC}"
else
	cmd sudo usermod -aG docker "$USER"
fi

step 9 "Adicionando repositorio NodeSource para Node.js 22"
echo -e "${YELLOW}>> curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -${NC}"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

step 10 "Instalando Node.js 22"
cmd sudo apt-get install -y nodejs

step 11 "Ativando Corepack"
cmd sudo corepack enable

step 12 "Instalando/ativando pnpm via Corepack"
cmd corepack prepare pnpm@latest --activate

step 13 "Verificando pnpm"
cmd pnpm --version

step 14 "Instalando uv"
if command -v uv >/dev/null 2>&1; then
	echo -e "${YELLOW}uv ja esta instalado: $(uv --version)${NC}"
else
	echo -e "${YELLOW}>> curl -LsSf https://astral.sh/uv/install.sh | sh${NC}"
	curl -LsSf https://astral.sh/uv/install.sh | sh
fi

step 15 "Carregando PATH do uv no shell atual"
if [ -f "$HOME/.local/bin/env" ]; then
	# shellcheck source=/dev/null
	source "$HOME/.local/bin/env"
else
	echo -e "${RED}Arquivo nao encontrado: $HOME/.local/bin/env${NC}"
	echo -e "${YELLOW}Continue e adicione manualmente ao shell de login se necessario.${NC}"
fi

step 16 "Verificando uv"
cmd uv --version

echo -e "\n${GREEN}Proximos passos manuais:${NC}"
echo -e "${YELLOW}1 - SAIA da sessão atual e reinicie o WSL no PowerShell/CMD:${NC}"
echo -e "${YELLOW}    wsl --shutdown${NC}"
echo -e "${YELLOW}    wsl${NC}"
echo -e "${YELLOW}2 - clonar repo (exemplo):${NC}"
echo -e "${YELLOW}    git clone https://github.com/jcguimaraesnet/conreq-multiagent.git${NC}"
echo -e "${YELLOW}3 - montar .env.local e backend/.env${NC}"
echo -e "${YELLOW}4 - executar o supabase na raiz do projeto:${NC}"
echo -e "${YELLOW}    npx supabase start${NC}"
echo -e "${YELLOW}5 - copiar secrets ANON e ROLE_KEY:${NC}"
echo -e "${YELLOW}    npx supabase status -o env${NC}"
echo -e "${YELLOW}6 - criar banco do zero com migrations e seed:${NC}"
echo -e "${YELLOW}    npx supabase db reset${NC}"
echo -e "${YELLOW}7 - buildar imagens:${NC}"
echo -e "${YELLOW}    docker compose -f docker-compose.dev.yml build${NC}"
echo -e "${YELLOW}8 - levantar container:${NC}"
echo -e "${YELLOW}    docker compose -f docker-compose.dev.yml up${NC}"

echo -e "\n${GREEN}Setup concluido com sucesso.${NC}"
echo -e "${YELLOW}Ativando grupo docker na sessao atual (newgrp docker)...${NC}"
newgrp docker
