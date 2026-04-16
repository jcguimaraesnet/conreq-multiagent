# Plano: Centralizar Logs no Elasticsearch

## Contexto

As 3 partes da aplicacao (frontend, backend, agente) nao possuem logging estruturado. O backend e agente usam `print()` ad-hoc, o frontend tem Pino instalado mas nao utilizado. Nao existe infraestrutura de observabilidade. O objetivo e:

1. Adicionar logging estruturado (JSON) em cada servico
2. Coletar logs via Fluent Bit (leve, ideal para dev)
3. Enviar para Elasticsearch + visualizar no Kibana

### Arquitetura Final

```
Frontend (Pino JSON) ──┐
Backend  (python-json-logger) ──┤──> stdout ──> Docker json-file ──> Fluent Bit ──> Elasticsearch :9200
Agent    (python-json-logger) ──┘                                                        |
                                                                                    Kibana :5601
```

---

## Fase 1: Logging Estruturado na Aplicacao

### 1A. Backend + Agent (Python)

**Criar** `backend/app/logging_config.py`:
- Configura root logger com `python-json-logger` (JsonFormatter)
- Campos: `timestamp`, `level`, `service` (backend ou agent), `name`, `message`
- Redireciona loggers do uvicorn para JSON
- Funcao `get_logger(name)` para uso nos modulos

**Modificar** `backend/pyproject.toml`:
- Adicionar `"python-json-logger>=3.0.0"` nas dependencies

**Modificar** `backend/main.py`:
- Chamar `setup_logging(service="backend")` apos `load_dotenv()`
- Adicionar middleware de request logging (request_id, method, path, status, duration_ms)

**Criar** `backend/app/middleware/request_logging.py`:
- Middleware Starlette que loga inicio/fim de cada request com duracao

**Modificar** `backend/app/agent/graph.py`:
- Chamar `setup_logging(service="agent")` no topo do modulo (antes de `create_graph()`)

**Substituir print() por logger em 9 arquivos**:

| Arquivo | prints |
|---------|--------|
| `backend/app/agent/nodes/elicitation.py` | ~46 |
| `backend/app/agent/nodes/specification.py` | ~26 |
| `backend/app/agent/nodes/analysis.py` | ~20 |
| `backend/app/agent/nodes/validation.py` | ~17 |
| `backend/app/agent/nodes/orchestrator.py` | ~7 |
| `backend/app/agent/nodes/coordinator.py` | ~3 |
| `backend/app/agent/nodes/generic.py` | ~3 |
| `backend/app/services/embedding_service.py` | ~4 |
| `backend/app/services/conjectural_persistence.py` | ~6 |

Padrao de conversao:
- `print(f"[Analysis] msg")` -> `logger.info("msg", extra={"node": "analysis"})`
- `print(f"[X] Error: {e}")` -> `logger.error("desc", extra={"node": "x"}, exc_info=True)`
- Logs verbosos de LLM response -> `logger.debug()` (suprimidos por padrao em INFO)

### 1B. Frontend (Next.js)

**Criar** `src/lib/logger.ts`:
- Instancia Pino com `service: "frontend"`, JSON para stdout
- Env var `LOG_LEVEL` (default: info) e `LOG_PRETTY` (pino-pretty em dev local)

**Modificar** `src/app/api/copilotkit/route.ts`:
- Adicionar `logger.info()` no POST e `logger.error()` em falhas

**Modificar** `src/lib/email.ts`:
- Substituir `console.error` por `logger.error`

> Nota: chamadas `console.error` em componentes client-side ficam como estao (rodam no browser, nao no Docker).

---

## Fase 2: Infraestrutura ELK + Fluent Bit

### 2A. Novos containers em `docker-compose.dev.yml`

**Elasticsearch** (single-node dev):
- Imagem: `docker.elastic.co/elasticsearch/elasticsearch:8.17.0`
- `network_mode: host` (porta 9200)
- `xpack.security.enabled=false` (dev only)
- Heap: `-Xms512m -Xmx512m`
- Volume persistente: `es-data`
- Healthcheck via curl

**Kibana**:
- Imagem: `docker.elastic.co/kibana/kibana:8.17.0`
- `network_mode: host` (porta 5601)
- `depends_on: elasticsearch (healthy)`

**Fluent Bit** (coletor de logs):
- Imagem: `fluent/fluent-bit:3.2`
- `network_mode: host`
- Monta `/var/lib/docker/containers` (read-only) para ler logs Docker
- Monta configs de `config/fluent-bit/`
- `depends_on: elasticsearch (healthy)`

**Log rotation** nos 3 servicos app:
```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

**Volume novo**: `es-data`

### 2B. Configuracao do Fluent Bit

**Criar** `config/fluent-bit/fluent-bit.conf`:
- INPUT: tail dos Docker container logs (`/var/lib/docker/containers/*/*.log`)
- FILTER: parser para extrair JSON aninhado do campo `log` do Docker
- OUTPUT: plugin `es` apontando para `localhost:9200`, indice `conreq-logs-*` (formato Logstash com data)

**Criar** `config/fluent-bit/parsers.conf`:
- Parser `docker`: formato JSON do Docker log driver
- Parser `json_log`: formato JSON dos logs da aplicacao (extrai campos service, level, message etc.)

---

## Fase 3: Scripts e Env

**Modificar** `scripts/dev-start.sh`:
- Adicionar URLs do Elasticsearch e Kibana na mensagem de startup

**Adicionar env vars** (nos .env.example):
- `LOG_LEVEL=info`

---

## Fase 4: Verificacao

1. `docker compose -f docker-compose.dev.yml up --build`
2. Aguardar ES ficar healthy: `curl http://localhost:9200/_cluster/health?pretty`
3. Verificar indices: `curl http://localhost:9200/_cat/indices?v` -> deve mostrar `conreq-logs-YYYY.MM.DD`
4. Testar logs por servico: `curl http://localhost:9200/conreq-logs-*/_search?pretty&size=5`
5. Abrir Kibana `http://localhost:5601` -> Stack Management -> Data Views -> criar `conreq-logs-*`
6. Aba Discover: filtrar por `service: "backend"`, `service: "agent"`, `service: "frontend"`
7. Navegar no app para gerar logs dos 3 servicos

---

## Arquivos

### Novos (6)
| Arquivo | Descricao |
|---------|-----------|
| `backend/app/logging_config.py` | Setup de logging JSON (compartilhado backend+agent) |
| `backend/app/middleware/request_logging.py` | Middleware de log de requests HTTP |
| `src/lib/logger.ts` | Logger Pino para o frontend |
| `config/fluent-bit/fluent-bit.conf` | Config principal do Fluent Bit |
| `config/fluent-bit/parsers.conf` | Parsers do Fluent Bit |

### Modificados (14)
| Arquivo | Mudanca |
|---------|---------|
| `backend/pyproject.toml` | + `python-json-logger>=3.0.0` |
| `backend/main.py` | + setup_logging() + request middleware |
| `backend/app/agent/graph.py` | + setup_logging(service="agent") |
| `backend/app/agent/nodes/elicitation.py` | print() -> logger |
| `backend/app/agent/nodes/specification.py` | print() -> logger |
| `backend/app/agent/nodes/analysis.py` | print() -> logger |
| `backend/app/agent/nodes/validation.py` | print() -> logger |
| `backend/app/agent/nodes/orchestrator.py` | print() -> logger |
| `backend/app/agent/nodes/coordinator.py` | print() -> logger |
| `backend/app/agent/nodes/generic.py` | print() -> logger |
| `backend/app/services/embedding_service.py` | print() -> logger |
| `backend/app/services/conjectural_persistence.py` | print() -> logger |
| `src/app/api/copilotkit/route.ts` | + logging com Pino |
| `src/lib/email.ts` | console.error -> logger |
| `docker-compose.dev.yml` | + elasticsearch, kibana, fluent-bit, es-data volume, log rotation |
| `scripts/dev-start.sh` | + URLs ES/Kibana |

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Memoria WSL2 (8GB) com ES+Kibana (~1.3GB extra) | Heap ES em 512MB, reduzir para 256MB se necessario |
| Fluent Bit sem acesso a `/var/lib/docker/containers` | Imagem oficial roda como root, volume read-only |
| `langgraph dev` pode interceptar stdout do agent | Testar cedo; se necessario, usar stderr |
| Logs verbosos de LLM (respostas completas) | Usar `logger.debug()` para payloads grandes |
