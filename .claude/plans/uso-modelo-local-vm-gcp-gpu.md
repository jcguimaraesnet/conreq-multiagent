# Plano — Adicionar provider LLM local via VM GPU no GCP

## Contexto

Este é um projeto de mestrado. Hoje o agent LangGraph suporta 4 providers em [backend/app/agent/llm_config.py](backend/app/agent/llm_config.py) — todos via API paga (Gemini, OpenAI, Azure OpenAI, Azure AI Llama). Precisa-se **oferecer uma opção de modelo rodando local** para permitir testes sem custo de API e com controle total do modelo.

### Por que GCP e não Azure

A subscription Azure disponível é **MCT (Microsoft Certified Trainer)**, que bloqueia famílias GPU por política contratual — a mensagem "alta demanda" aparece em qualquer região porque não é limitação de capacidade, é da subscription. Tentar ticket de quota seria negado.

**GCP** resolve porque:
- Usuário tem **US$ 300 de crédito gratuito** (free tier de 90 dias).
- Quota default de T4 em regiões US (ex: `us-central1`) é suficiente (1 GPU) sem ticket.
- **Spot VMs** custam ~US$ 0.14/h vs ~US$ 0.47/h on-demand — 70% mais barato. Com US$ 300 dá pra rodar Spot T4 8h/dia por mais de 7 meses.

### Por que não fallback local na 2060 6GB

Usuário tem RTX 2060 (6GB VRAM) + 16GB RAM com 95% de uso. Qwen 14B Q4 precisa de ~9GB VRAM — não cabe. Qwen 7B Q4 cabe na VRAM mas o dev stack local (frontend + backend + agent + Supabase + ELK) já consome ~15GB da RAM, deixando <1GB livre. Rodar Ollama simultâneo causaria OOM. **Fallback local fica viável apenas se upgradar RAM pra 32GB** — nota registrada ao final do plano, não é parte do escopo atual.

### Decisões tomadas

- **Chamadas só do dev local** (WSL no PC). Container App de produção continua com providers atuais — zero mudança em [.github/workflows/conreq-multiagent-azure-workflow.yml](.github/workflows/conreq-multiagent-azure-workflow.yml).
- **VM GPU no GCP** (Spot T4), sem Docker/app — apenas Ollama como systemd service.
- **Modelo padrão: Qwen 2.5 14B Instruct** (melhor tool calling entre open-source desse porte, crucial pro orchestrator/validation).

## Arquitetura

```
WSL2 local (notebook)                        GCP VM (T4 Spot)
─────────────────────                        ──────────────────
pnpm dev:wsl                                 Ollama serve
  ├── frontend  :3000                          └── :11434
  ├── backend   :8000
  ├── agent     :8123  ──────┐
  ├── supabase  :54321       │
  └── ELK stack              │
                             │
                    SSH tunnel encaminha
                    WSL:11434 → VM:11434
                             │
                             └──> agent chama http://localhost:11434/v1
                                  (literal localhost — o tunnel redireciona)
```

**A VM GCP NÃO roda `docker-compose.dev.yml`.** Apenas Ollama. Dev stack permanece 100% no WSL local. Razões:

1. GPU só serve pro LLM — renderizar Next.js/FastAPI numa VM cara com T4 é desperdício.
2. VM fica ligada só durante testes com LLM — para o restante, custo zero.
3. Hot reload + edição no VS Code local continua funcionando normal.
4. ELK local continua coletando logs do agent local.
5. Do ponto de vista do código, o Ollama "parece" rodar em localhost (o túnel SSH mascara).

## Parte 1 — Infraestrutura GCP

### 1.1 Pré-requisitos

- Instalar `gcloud` CLI no WSL: `curl https://sdk.cloud.google.com | bash` e `gcloud init`.
- Autenticar: `gcloud auth login`.
- Criar/selecionar projeto: `gcloud projects list` e `gcloud config set project <PROJECT_ID>`.
- Habilitar Compute Engine API: `gcloud services enable compute.googleapis.com`.

### 1.2 Verificar quota de T4 em `us-central1`

```bash
gcloud compute regions describe us-central1 \
  --format="value(quotas.filter(metric=NVIDIA_T4_GPUS).list(limit=1))"
```

Se retornar 1 ou mais, segue. Se 0, pedir aumento em Console → IAM & Admin → Quotas, filtrando `NVIDIA T4 GPUs` em `us-central1` — aprovação em minutos pra 1 GPU.

### 1.3 Criar VM Spot com T4

Usamos **Deep Learning VM image** (já vem com driver NVIDIA + CUDA instalados — economiza ~20 min de setup):

```bash
gcloud compute instances create vm-conreq-llm \
  --zone=us-central1-a \
  --machine-type=n1-standard-4 \
  --accelerator="type=nvidia-tesla-t4,count=1" \
  --image-family=common-cu124-ubuntu-2204 \
  --image-project=deeplearning-platform-release \
  --maintenance-policy=TERMINATE \
  --provisioning-model=SPOT \
  --instance-termination-action=STOP \
  --boot-disk-size=100GB \
  --boot-disk-type=pd-balanced \
  --metadata="install-nvidia-driver=True"
```

Detalhes:
- `n1-standard-4`: 4 vCPU, 15 GB RAM — suficiente.
- `--provisioning-model=SPOT` + `--instance-termination-action=STOP`: VM pode ser preemptada, mas o disco persiste. Recriar = reiniciar, modelo já baixado.
- Disco 100 GB: modelo Qwen 14B (~9GB) + CUDA + Ollama + buffer.

Custo estimado Spot: **~US$ 0.14/h** (região us-central1). On-demand equivalente seria ~US$ 0.47/h.

Na primeira inicialização (~5 min), a imagem Deep Learning instala o driver NVIDIA automaticamente. Valide:

```bash
gcloud compute ssh vm-conreq-llm --zone=us-central1-a --command="nvidia-smi"
```

Deve mostrar T4 com driver OK.

### 1.4 Instalar Ollama e baixar Qwen 2.5 14B

SSH na VM:

```bash
gcloud compute ssh vm-conreq-llm --zone=us-central1-a
```

Dentro da VM:

```bash
# Instala Ollama (detecta CUDA automaticamente)
curl -fsSL https://ollama.com/install.sh | sh

# Configura pra aceitar conexões em 0.0.0.0 (SSH tunnel aponta pra localhost da VM)
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf <<EOF
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_KEEP_ALIVE=10m"
EOF
sudo systemctl daemon-reload
sudo systemctl restart ollama

# Baixar modelo (~9GB, Q4_K_M)
ollama pull qwen2.5:14b-instruct

# Teste local na VM
curl http://localhost:11434/v1/chat/completions \
  -d '{"model":"qwen2.5:14b-instruct","messages":[{"role":"user","content":"Olá"}]}'
```

### 1.5 Túnel SSH do WSL local

No WSL (terminal separado, manter aberto enquanto usar):

```bash
gcloud compute ssh vm-conreq-llm --zone=us-central1-a -- -N -L 11434:localhost:11434
```

Flags: `-N` (sem shell remoto), `-L` (port forward). Endpoint fica disponível em `http://localhost:11434/v1` no WSL.

Testar no WSL:

```bash
curl http://localhost:11434/v1/models
```

Deve listar `qwen2.5:14b-instruct`.

### 1.6 Stop/Start quando não usar

```bash
# Para (libera compute, mantém disco)
gcloud compute instances stop vm-conreq-llm --zone=us-central1-a

# Religa (~30s até Ollama responder)
gcloud compute instances start vm-conreq-llm --zone=us-central1-a
```

Parada = paga só disco (~US$ 4/mês). Custo de compute só quando ligada.

### 1.7 Se a VM Spot for preemptada

GCP termina a VM com aviso de 30s quando precisa da capacidade. Com `--instance-termination-action=STOP`, a VM é parada (não deletada) — disco persiste, modelo ainda lá. Pra religar: `gcloud compute instances start ...`. Se a preempção for frequente em `us-central1-a`, trocar pra outra zona (`us-central1-b`, `us-east1-c` etc.).

## Parte 2 — Código (mínimo) — ✅ JÁ IMPLEMENTADO

As mudanças de código já foram aplicadas. Referência para verificação:

### 2.1 [backend/app/agent/llm_config.py](backend/app/agent/llm_config.py)

- Adicionado `"model_local"` ao `LLMProvider` (linha 22).
- Adicionada constante `DEFAULT_MODEL_LOCAL = "qwen2.5:14b-instruct"` (linha 31).
- Adicionado branch `if provider == "model_local"` no `get_model()`:
  ```python
  if provider == "model_local":
      return ChatOpenAI(
          model=model or DEFAULT_MODEL_LOCAL,
          base_url=os.environ.get("MODEL_LOCAL_ENDPOINT", "http://localhost:11434/v1"),
          api_key=SecretStr("ollama"),
          temperature=temperature,
      )
  ```

### 2.2 [src/components/settings/SettingsPanel.tsx](src/components/settings/SettingsPanel.tsx)

Linha 213: adicionada `<option value="model_local">Local (Ollama/Qwen 14B)</option>`.

### 2.3 Env var no dev local (pendente)

Adicionar em `backend/.env` (local apenas, **não** no workflow Azure):

```
MODEL_LOCAL_ENDPOINT=http://localhost:11434/v1
```

## Parte 3 — Verificação end-to-end

1. **VM ligada + modelo carregado + túnel aberto**:
   ```bash
   gcloud compute instances start vm-conreq-llm --zone=us-central1-a
   gcloud compute ssh vm-conreq-llm --zone=us-central1-a -- -N -L 11434:localhost:11434  # manter aberto
   ```
   Em outro terminal: `curl http://localhost:11434/v1/models` — deve listar `qwen2.5:14b-instruct`.

2. **Backend reconhece o provider**:
   - `pnpm dev:wsl` (levanta Supabase + containers).
   - UI em http://localhost:3000, Settings → selecionar **"Local (Ollama/Qwen 14B)"** (value `model_local`).
   - Criar projeto, gerar requirement conjectural.
   - No Kibana (http://localhost:5601) ou `docker logs` do container `agent`: confirmar que request sai pra `localhost:11434` e não pra Gemini/OpenAI.

3. **Tool calling funciona**: orchestrator ([backend/app/agent/nodes/orchestrator.py](backend/app/agent/nodes/orchestrator.py)) usa `classify_intent` com structured output. Se falhar, fallback: `ollama pull qwen2.5:7b-instruct` (mais conservador) e ajustar `DEFAULT_MODEL_LOCAL`.

4. **Parar VM ao terminar**:
   ```bash
   gcloud compute instances stop vm-conreq-llm --zone=us-central1-a
   ```

## Estimativa de custo (GCP Spot T4)

| Uso | Custo |
|---|---|
| Ligada (compute + GPU) | ~US$ 0.14/h |
| Parada (só disco 100GB) | ~US$ 4/mês |
| Cenário mestrado (8h/dia, 20 dias/mês) | ~US$ 22/mês |
| Com crédito US$ 300 | **~13 meses grátis** |

## Sobre "Gemma 4"

Não existe. Última família Google é **Gemma 3** (mar/2025). Pra uso como agent com tool calling, **Qwen 2.5 14B** (escolhido) tem suporte mais robusto a function calling. Trocar depois é trivial: `ollama pull <modelo>` na VM + ajustar `DEFAULT_MODEL_LOCAL`.

## Nota: futuro fallback local (se upgradar RAM)

Com RAM atual (16GB, ~95% em uso) + RTX 2060 (6GB VRAM), **não é viável** rodar Ollama localmente enquanto o dev stack está em pé. Upgrade pra 32GB (pente DDR4 16GB ~R$ 200-250) habilitaria fallback local rodando **Qwen 2.5 7B Q4** (~4.7GB VRAM) — útil quando a VM GCP estiver parada ou sem internet. Mesma env var `MODEL_LOCAL_ENDPOINT=http://localhost:11434/v1`, só Ollama no WSL com GPU habilitada. Não é parte do escopo atual.
