# pré-requisitos (ambiente linux)
- docker engine (linux)
- uv
- pnpm
- node22+

# Step 1 - Comandos abaixos para ambiente WSL

## lista as distro (para copiar o nome)
wsl --list --online

## baixa distro
wsl --install Ubuntu-24.04 --name ubuntu24

## seta como distro default
wsl --set-default ubuntu24

## configurar recurso wsl
notepad C:\Users\jcgui\.wslconfig
[wsl2]
memory=8GB
swap=2GB

## entrar na distro (para configurar docker auto-start)
wsl
## habilitar systemd (para Docker auto-start)
nano /etc/wsl.conf
[boot]
systemd=true
## reiniciar wsl (no powershel/cmd)
wsl --shutdown

## Atualiza a lista de pacotes disponíveis nos repositórios
sudo apt-get update

## Instala dependências necessárias para adicionar repositórios HTTPS
sudo apt-get install -y ca-certificates curl gnupg

## Cria o diretório para armazenar chaves GPG de repositórios
sudo install -m 0755 -d /etc/apt/keyrings

## baixa e converte a chave GPG oficial do Docker para formato binário
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

## adiciona o repositório oficial do Docker às fontes do apt
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list

## atualiza a lista de pacotes novamente (agora inclui o repo do Docker)
sudo apt-get update

## instala o Docker Engine, CLI, containerd e o plugin do Compose
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

## adiciona o usuário atual ao grupo docker (permite rodar sem sudo)
sudo usermod -aG docker $USER

## recarregar a sessão para o grupo ter efeito
newgrp docker

## pra verificar se o docker está rodando
docker ps

## (opcional) se docker não tiver rodando, inicie
sudo service docker start

## baixa e executa o script de setup do NodeSource para adicionar o repo do Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -

## instala o Node.js 20 (inclui npm)
sudo apt-get install -y nodejs

## ativa o corepack (gerenciador nativo de package managers do Node)
sudo corepack enable

## instala/ativa o pnpm via corepack
corepack prepare pnpm@latest --activate

# Step 2 - A partir daqui são pré-requisitos para ambiente linux (pnpm e uv)

## para verificar instalação do pnpm
pnpm --version

## instala uv
curl -LsSf https://astral.sh/uv/install.sh | s

## add $HOME/.local/bin to your PATH
source $HOME/.local/bin/env

## para verificar instalação do uv
uv --version

# Step 3 - A partir daqui é recomendado fazer de forma manual

## clonar repositório
git clone https://github.com/jcguimaraesnet/app-multi-agent-conjectural-assist.git

# configurar arquivos de ambiente
# cp .env.local.example .env.local
# cp backend/.env.example backend/.env

# inicia 15 containers do supabase no docker
npx supabase start

# copiar secrets ANON_KEY e SERVICE_ROLE_KEY
npx supabase status -o env

# reseta banco aplicando migrations + seed
npx supabase db reset

# build das imagens do compose
docker compose -f docker-compose.dev.yml build

# iniciar container do compose
docker compose -f docker-compose.dev.yml up


