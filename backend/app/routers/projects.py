"""
Projects Router

Handles project-related endpoints including document upload and text extraction.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Header, Form
from fastapi.responses import StreamingResponse
from typing import Optional
from uuid import UUID
import base64
import json
import io

from app.models.schemas import (
    VisionExtractionResponse,
    ExtractedRequirements,
    ProjectResponse,
    ProjectCreatedResponse,
    ProjectDetailsResponse,
    RequirementCounts,
    RequirementType,
)
from app.services.document_parser import extract_text_from_pdf, get_pdf_metadata
from app.services.requirement_extractor import extract_requirements_with_ai
from app.services.language_detector import detect_language
from app.services.supabase_client import get_supabase_client


PROJECT_SELECT_COLUMNS = (
    "id, user_id, project_id, title, description, vision_document_name, "
    "vision_extracted_text, requirements_document_name, created_at, updated_at"
)


router = APIRouter(prefix="/projects", tags=["projects"])


def _fetch_profiles_map(supabase, user_ids: set[str]) -> dict[str, dict]:
    if not user_ids:
        return {}
    result = supabase.table("profiles")\
        .select("id, first_name, last_name")\
        .in_("id", list(user_ids))\
        .execute()
    profiles = result.data or []
    return {profile["id"]: profile for profile in profiles}


def _attach_author_metadata(records: list[dict], profiles_map: dict[str, dict]) -> list[dict]:
    """Attach author names from profiles map."""
    for record in records:
        profile = profiles_map.get(record.get("user_id"))
        record["author_first_name"] = profile.get("first_name") if profile else None
        record["author_last_name"] = profile.get("last_name") if profile else None
    return records


def _fetch_requirement_counts(supabase, project_id: str) -> RequirementCounts:
    counts = RequirementCounts()
    result = supabase.table("requirements")\
        .select("type")\
        .eq("project_id", project_id)\
        .execute()
    for row in result.data or []:
        req_type = row.get("type")
        if req_type == RequirementType.FUNCTIONAL.value:
            counts.functional += 1
        elif req_type == RequirementType.NON_FUNCTIONAL.value:
            counts.non_functional += 1

    # Conjectural requirements are stored in a separate table
    conjectural_result = supabase.table("conjectural_requirements")\
        .select("id", count="exact")\
        .eq("project_id", project_id)\
        .execute()
    counts.conjectural = conjectural_result.count or 0

    return counts


def _decode_document_blob(data: Optional[str | bytes | bytearray]) -> bytes:
    """Decode stored document data (supports base64, hex, raw bytes)."""
    if data is None:
        raise ValueError("Document data is empty")

    if isinstance(data, str):
        # Postgres bytea returns "\\x"-prefixed hex strings by default
        if data.startswith("\\x"):
            try:
                raw_bytes = bytes.fromhex(data[2:])
            except ValueError as exc:
                raise ValueError("Invalid hex-encoded data") from exc
        else:
            try:
                raw_bytes = base64.b64decode(data)
            except Exception as exc:
                raise ValueError("Invalid base64-encoded data") from exc
    elif isinstance(data, (bytes, bytearray)):
        raw_bytes = bytes(data)
    else:
        raise ValueError("Unsupported document data type")

    # If already a PDF payload, return directly
    if raw_bytes.startswith(b"%PDF"):
        return raw_bytes

    # Attempt to treat decoded bytes as base64 text (double-encoded storage)
    try:
        as_text = raw_bytes.decode("utf-8")
        nested = base64.b64decode(as_text)
        if nested.startswith(b"%PDF") or nested:
            return nested
    except Exception:
        pass

    return raw_bytes


def get_user_id_from_header(authorization: Optional[str]) -> str:
    """
    Extract user ID from authorization header.
    In production, this should validate the JWT and extract the user ID.
    For now, we expect the user_id to be passed directly for simplicity.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # For development: expect "Bearer <user_id>"
    # In production: decode JWT and extract user_id
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    return parts[1]


@router.post("/vision/extract", response_model=VisionExtractionResponse)
async def extract_vision_document(
    file: UploadFile = File(..., description="PDF file to extract text from")
):
    """
    Extract text from a vision document (PDF).
    
    Uses PyPDF2 to extract raw text, ignoring tables and images.
    This is Step 2 of the project wizard.
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Only PDF files are supported"
        )
    
    # Read file content
    content = await file.read()
    
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    
    try:
        # Extract text using PyPDF2
        extracted_text = extract_text_from_pdf(content)
        metadata = get_pdf_metadata(content)
        
        return VisionExtractionResponse(
            text=extracted_text,
            metadata=metadata,
            char_count=len(extracted_text),
            page_count=metadata.get("page_count", 0)
        )
        
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process document: {str(e)}"
        )


@router.post("/requirements/extract", response_model=ExtractedRequirements)
async def extract_requirements_document(
    file: UploadFile = File(..., description="PDF file to extract requirements from")
):
    """
    Extract requirements from a requirements document (PDF).
    
    Uses pdfplumber for table extraction and Google Gemini AI for
    intelligent requirement extraction and categorization.
    This is Step 3 of the project wizard.
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Only PDF files are supported"
        )
    
    # Read file content
    content = await file.read()
    
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    
    try:
        # Extract requirements using pdfplumber + Gemini AI
        requirements = await extract_requirements_with_ai(content)
        return requirements
        
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to extract requirements: {str(e)}"
        )


@router.post("", response_model=ProjectCreatedResponse)
async def create_project(
    title: str = Form(...),
    project_id: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    vision_document_name: Optional[str] = Form(None),
    vision_extracted_text: Optional[str] = Form(None),
    requirements_document_name: Optional[str] = Form(None),
    requirements_json: Optional[str] = Form(None),
    vision_file: Optional[UploadFile] = File(None),
    requirements_file: Optional[UploadFile] = File(None),
    authorization: Optional[str] = Header(None)
):
    """
    Create a new project with optional extracted requirements and document files.
    
    This is called after the wizard completes all steps.
    Accepts multipart/form-data to include document files.
    """
    user_id = get_user_id_from_header(authorization)
    supabase = get_supabase_client()
    
    # Parse requirements JSON if provided
    requirements = None
    if requirements_json:
        try:
            req_data = json.loads(requirements_json)
            requirements = ExtractedRequirements(**req_data)
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid requirements JSON: {str(e)}")
    
    try:
        # Read file contents if provided
        vision_document_data = None
        requirements_document_data = None
        
        if vision_file:
            vision_content = await vision_file.read()
            # Encode as base64 for storage (Supabase expects base64 for bytea via REST API)
            vision_document_data = base64.b64encode(vision_content).decode('utf-8')
        
        if requirements_file:
            requirements_content = await requirements_file.read()
            requirements_document_data = base64.b64encode(requirements_content).decode('utf-8')
        
        # Detect language from vision document text
        detected_language = await detect_language(vision_extracted_text) if vision_extracted_text else None

        # Insert project
        project_data = {
            "user_id": user_id,
            "project_id": project_id,
            "title": title,
            "description": description,
            "vision_document_name": vision_document_name,
            "vision_extracted_text": vision_extracted_text,
            "requirements_document_name": requirements_document_name,
            "language": detected_language,
        }
        
        # Add document data if files were uploaded
        if vision_document_data:
            project_data["vision_document_data"] = vision_document_data
        if requirements_document_data:
            project_data["requirements_document_data"] = requirements_document_data
        
        result = supabase.table("projects").insert(project_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create project")
        
        project_id = result.data[0]["id"]
        requirements_count = 0
        
        # Insert requirements if provided
        if requirements:
            reqs_to_insert = []
            
            # Functional requirements
            for req in requirements.functional:
                reqs_to_insert.append({
                    "project_id": project_id,
                    "requirement_id": req.id,
                    "type": RequirementType.FUNCTIONAL.value,
                    "description": req.description,
                    "category": None,
                })
            
            # Non-functional requirements
            for req in requirements.non_functional:
                reqs_to_insert.append({
                    "project_id": project_id,
                    "requirement_id": req.id,
                    "type": RequirementType.NON_FUNCTIONAL.value,
                    "description": req.description,
                    "category": req.category.value,
                })
            
            if reqs_to_insert:
                supabase.table("requirements").insert(reqs_to_insert).execute()
                requirements_count = len(reqs_to_insert)
        
        return ProjectCreatedResponse(
            success=True,
            project_id=UUID(project_id),
            message="Project created successfully",
            requirements_count=requirements_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to create project: {str(e)}"
        )


@router.get("", response_model=list[ProjectResponse])
async def list_projects(authorization: Optional[str] = Header(None)):
    """
    List all projects.
    Excludes document blob data to keep response size small.
    """
    get_user_id_from_header(authorization)
    supabase = get_supabase_client()

    try:
        # Select specific columns, excluding blob data
        result = supabase.table("projects")\
            .select(PROJECT_SELECT_COLUMNS)\
            .order("created_at", desc=True)\
            .execute()
        
        projects = result.data or []
        user_ids = {proj.get("user_id") for proj in projects if proj.get("user_id")}
        profiles_map = _fetch_profiles_map(supabase, user_ids)
        return _attach_author_metadata(projects, profiles_map)
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to list projects: {str(e)}"
        )


@router.get("/{uuid}", response_model=ProjectResponse)
async def get_project(
    uuid: UUID,
    authorization: Optional[str] = Header(None)
):
    """
    Get a specific project by ID.
    Excludes document blob data to keep response size small.
    """
    get_user_id_from_header(authorization)
    supabase = get_supabase_client()

    try:
        # Select specific columns, excluding blob data
        result = supabase.table("projects")\
            .select(PROJECT_SELECT_COLUMNS)\
            .eq("id", str(uuid))\
            .single()\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Project not found")

        profiles_map = _fetch_profiles_map(supabase, {result.data.get("user_id")})
        enriched = _attach_author_metadata([result.data], profiles_map)
        return enriched[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get project: {str(e)}"
        )


@router.get("/{uuid}/details", response_model=ProjectDetailsResponse)
async def get_project_details(
    uuid: UUID,
    authorization: Optional[str] = Header(None)
):
    """Return project metadata along with requirement counts."""
    get_user_id_from_header(authorization)
    supabase = get_supabase_client()

    try:
        result = supabase.table("projects")\
            .select(PROJECT_SELECT_COLUMNS)\
            .eq("id", str(uuid))\
            .single()\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Project not found")

        profiles_map = _fetch_profiles_map(supabase, {result.data.get("user_id")})
        enriched = _attach_author_metadata([result.data], profiles_map)[0]
        counts = _fetch_requirement_counts(supabase, str(uuid))

        return {**enriched, "requirement_counts": counts.dict()}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load project details: {str(e)}"
        )


@router.get("/{uuid}/documents/{doc_type}")
async def download_project_document(
    uuid: UUID,
    doc_type: str,
    authorization: Optional[str] = Header(None)
):
    """Download a stored project document (vision or requirements)."""
    get_user_id_from_header(authorization)
    supabase = get_supabase_client()

    if doc_type not in {"vision", "requirements"}:
        raise HTTPException(status_code=400, detail="Invalid document type")

    try:
        result = supabase.table("projects")\
            .select("id, user_id, vision_document_name, vision_document_data, requirements_document_name, requirements_document_data")\
            .eq("id", str(uuid))\
            .single()\
            .execute()

        project = result.data
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        if doc_type == "vision":
            data_key = "vision_document_data"
            name_key = "vision_document_name"
        else:
            data_key = "requirements_document_data"
            name_key = "requirements_document_name"

        base64_data = project.get(data_key)
        if not base64_data:
            raise HTTPException(status_code=404, detail="Document not found")

        try:
            binary_data = _decode_document_blob(base64_data)
        except ValueError as exc:
            raise HTTPException(status_code=500, detail="Stored document data is invalid") from exc

        filename = project.get(name_key) or f"{doc_type}_document_{uuid}.pdf"
        file_stream = io.BytesIO(binary_data)

        return StreamingResponse(
            file_stream,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\""
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download document: {str(e)}"
        )


@router.delete("/{uuid}")
async def delete_project(
    uuid: UUID,
    authorization: Optional[str] = Header(None)
):
    """
    Delete a project and all its requirements.
    """
    get_user_id_from_header(authorization)
    supabase = get_supabase_client()

    try:
        # Verify project exists
        check = supabase.table("projects")\
            .select("id")\
            .eq("id", str(uuid))\
            .execute()

        if not check.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Delete project (requirements cascade automatically)
        supabase.table("projects")\
            .delete()\
            .eq("id", str(uuid))\
            .execute()
        
        return {"success": True, "message": "Project deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to delete project: {str(e)}"
        )
