# Conjectural Assist - Backend API

FastAPI backend for the Conjectural Assist system, responsible for document processing and requirements extraction using AI.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Main language |
| FastAPI | ≥0.109 | Async web framework |
| PyPDF2 | ≥3.0 | PDF text extraction |
| pdfplumber | ≥0.10 | PDF table extraction |
| google-genai | ≥1.0 | Google GenAI SDK (Gemini) |
| supabase-py | ≥2.0 | Supabase client |
| Pydantic | ≥2.5 | Data validation |

## Project Structure

```
backend/
├── main.py                    # FastAPI application entry point
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variables example
├── .gitignore
└── app/
    ├── __init__.py
    ├── config.py              # Configuration (env vars)
    ├── routers/
    │   ├── __init__.py
    │   ├── projects.py        # Project endpoints
    │   └── requirements.py    # Requirements endpoints
    ├── services/
    │   ├── __init__.py
    │   ├── document_parser.py      # Text extraction (PyPDF2)
    │   ├── requirement_extractor.py # Requirements extraction (pdfplumber + Gemini)
    │   └── supabase_client.py      # Supabase client
    └── models/
        ├── __init__.py
        └── schemas.py         # Pydantic schemas
```

## Setup

### 1. Create virtual environment

```bash
cd backend
uv venv
```

### 2. Install dependencies

```bash
uv pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit the `.env` file with your credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

### 4. Run the server

```bash
# Development (with hot reload)
uv run uvicorn main:app --reload --port 8000

# Production
python main.py
```

## Development

### Upgrading transitive dependencies (e.g. langgraph-api)

When running `uv run langgraph dev`, a message may appear indicating that a newer version of `langgraph-api` is available. Since `langgraph-api` is a transitive dependency (installed via `langgraph-cli[inmem]`), commands like `pip install -U` or `uv pip install -U` won't solve the problem.

To upgrade correctly:

```bash
cd backend
uv lock --upgrade-package langgraph-api
uv sync
```

This updates the lockfile specifically for the indicated package and syncs the environment.

## API Endpoints

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

## Usage Examples

### Extract text from vision document (Step 2)

```bash
curl -X POST "http://localhost:8000/api/projects/vision/extract" \
  -F "file=@vision_document.pdf"
```

**Response:**
```json
{
  "text": "Extracted text content...",
  "metadata": {
    "page_count": 5,
    "title": "Project Vision",
    "author": "Author Name"
  },
  "char_count": 15000,
  "page_count": 5
}
```

### Extract requirements from document (Step 3)

```bash
curl -X POST "http://localhost:8000/api/projects/requirements/extract" \
  -F "file=@requirements_document.pdf"
```

**Response:**
```json
{
  "functional": [
    {
      "id": "REQ-F001",
      "description": "The system shall allow users to login with email and password"
    }
  ],
  "non_functional": [
    {
      "id": "REQ-NF001",
      "description": "The system shall respond to requests within 2 seconds",
      "category": "performance"
    }
  ]
}
```

### Create a complete project

```bash
curl -X POST "http://localhost:8000/api/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_id>" \
  -d '{
    "title": "My Project",
    "description": "Project description",
    "vision_extracted_text": "Extracted vision text..."
  }'
```

## Non-Functional Requirement Categories

| Category | Description |
|----------|-------------|
| interoperability | Integration with other systems |
| reliability | Reliability and fault tolerance |
| performance | Speed, throughput, response time |
| availability | System availability |
| scalability | Ability to scale |
| maintainability | Ease of maintenance |
| portability | Cross-platform portability |
| security | Data and access security |
| usability | Usability and user experience |
| regulatory | Legal and compliance requirements |
| constraint | Technical or business constraints |

## Interactive Documentation

With the server running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Database (Supabase)

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
