## Getting Started

CONREQ Multi-Agent is an application for conjectural requirements specification, split into three parts: frontend (Next.js), backend API (FastAPI), and AI agent (LangGraph).

## Setup

<details>
<summary>Show setup steps</summary>

### 1. Install

First-time setup for all three parts:


```bash
# 1) Frontend (root)
pnpm install

# 2) Backend API (Python env + dependencies)
cd backend
uv venv # create virtual environment
uv sync # install packages
cd ..

# 3) AI Agent
# Uses the same backend environment created by `uv sync`
```

### 2. Configure environment variables

This project uses two different environment files:

```bash
# Frontend (root)
cp env.local.example .env.local

# Backend API
cp backend/.env.example backend/.env
```

#### Frontend (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
LANGGRAPH_DEPLOYMENT_URL=http://127.0.0.1:8123
LANGSMITH_API_KEY=your-langsmith-api-key
OPENAI_API_KEY=your-openai-api-key
```

#### Backend (`backend/.env`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
HOST=0.0.0.0
PORT=8000
DEBUG=True
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```



### 3. Run the server

Run all three parts (use separate terminals):

```bash
# 1) backend API Development (with hot reload)
cd backend
uv run python -m uvicorn main:app --reload --port 8000
# or
pnpm dev:backend

# 2) Frontend
pnpm dev:frontend

# 3) AI Agent
cd backend
uv run langgraph dev --port 8123 --no-browser
# or
pnpm dev:agent
```

</details>

## Links

<details>
<summary>Show links</summary>

### Development

Frontend
- App: http://localhost:3000
- CopilotKit API health: http://localhost:3000/api/copilotkit

Backend
- Health: http://127.0.0.1:8000
- Docs: http://127.0.0.1:8000/docs

Agent
- Endpoint: http://127.0.0.1:8123
- LangSmith Studio: https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:8123

### Production

Frontend
- App: https://app-conjectural-assist.azurewebsites.net
- CopilotKit API health: https://app-conjectural-assist.azurewebsites.net/api/copilotkit
- Log stream: https://app-conjectural-assist.scm.azurewebsites.net/api/logstream

Backend
- Health: https://api-conjectural-assist.azurewebsites.net
- Docs: https://api-conjectural-assist.azurewebsites.net/docs

Agent
- Endpoint: https://agent-conjectural-assist-f0htgmepeje2b8a7.brazilsouth-01.azurewebsites.net
- LangSmith Studio: https://smith.langchain.com/studio?baseUrl=https://agent-conjectural-assist-f0htgmepeje2b8a7.brazilsouth-01.azurewebsites.net&mode=graph
- Log stream: https://agent-conjectural-assist-f0htgmepeje2b8a7.scm.brazilsouth-01.azurewebsites.net/api/logstream

</details>
  


## API Endpoints

<details>
<summary>Show API endpoints</summary>

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information |
| GET | `/health` | Health status |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/vision/extract` | Extract text from vision document (PDF) |
| POST | `/api/projects/requirements/extract` | Extract requirements from document (PDF) |
| POST | `/api/projects` | Create a new project |
| GET | `/api/projects` | List all user projects |
| GET | `/api/projects/{id}` | Get a specific project |
| DELETE | `/api/projects/{id}` | Delete a project |

### Requirements

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/requirements/project/{project_id}` | List requirements for a project |
| POST | `/api/requirements` | Create a new requirement |
| GET | `/api/requirements/{id}` | Get a specific requirement |
| PUT | `/api/requirements/{id}` | Update a requirement |
| DELETE | `/api/requirements/{id}` | Delete a requirement |

</details>



## Database (Supabase)

<details>
<summary>Show database tables</summary>

### Table: projects

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| title | TEXT | Project title |
| description | TEXT | Description |
| vision_document_url | TEXT | Vision document URL |
| vision_document_name | TEXT | File name |
| vision_extracted_text | TEXT | Extracted text |
| requirements_document_url | TEXT | Requirements document URL |
| requirements_document_name | TEXT | File name |
| created_at | TIMESTAMPTZ | Creation date |
| updated_at | TIMESTAMPTZ | Last updated |

### Table: requirements

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | UUID | FK to projects |
| requirement_id | TEXT | External ID (REQ-F001) |
| type | ENUM | functional, non_functional, conjectural |
| description | TEXT | Requirement description |
| category | ENUM | NFR category (nullable) |
| created_at | TIMESTAMPTZ | Creation date |
| updated_at | TIMESTAMPTZ | Last updated |

### Table: profiles

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK, references auth.users |
| first_name | TEXT | User first name |
| last_name | TEXT | User last name |
| email | TEXT | User email |
| has_completed_onboarding_stage1 | BOOLEAN | Onboarding stage 1 completion |
| has_completed_onboarding_stage2 | BOOLEAN | Onboarding stage 2 completion |
| has_completed_onboarding_stage3 | BOOLEAN | Onboarding stage 3 completion |
| created_at | TIMESTAMPTZ | Creation date |
| updated_at | TIMESTAMPTZ | Last updated |

### Table: settings

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Unique user reference |
| require_brief_description | BOOLEAN | Require brief description in flow |
| batch_mode | BOOLEAN | Enable batch requirement generation |
| quantity_req_batch | INTEGER | Requirements per batch |

</details>


## Tips

<details>
<summary>Show tips</summary>

### Upgrading transitive dependencies (e.g. langgraph-api)

When running `uv run langgraph dev`, a message may appear indicating that a newer version of `langgraph-api` is available. Since `langgraph-api` is a transitive dependency (installed via `langgraph-cli[inmem]`), commands like `pip install -U` or `uv pip install -U` won't solve the problem.

To upgrade correctly:

```bash
cd backend
uv lock --upgrade-package langgraph-api
uv sync
```

This updates the lockfile specifically for the indicated package and syncs the environment.

</details>
