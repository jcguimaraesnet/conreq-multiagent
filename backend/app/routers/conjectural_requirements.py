"""
Conjectural Requirements Router

Handles endpoints for conjectural requirements and their evaluations.
"""

from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

from app.services.supabase_client import get_supabase_client


class ConjecturalRequirementUpdate(BaseModel):
    """Editable fields of a conjectural requirement."""
    desired_behavior: Optional[str] = None
    positive_impact: Optional[str] = None
    uncertainty: Optional[str] = None
    solution_assumption: Optional[str] = None
    uncertainty_evaluated: Optional[str] = None
    observation_analysis: Optional[str] = None


router = APIRouter(prefix="/conjectural-requirements", tags=["conjectural-requirements"])


def get_user_id_from_header(authorization: Optional[str]) -> str:
    """Extract user ID from authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    return parts[1]


@router.get("/project/{project_id}")
async def list_by_project(
    project_id: UUID,
    status: Optional[str] = Query(None, description="Filter by status (todo, inprogress, done)"),
    authorization: Optional[str] = Header(None),
):
    """
    List conjectural requirements for a project.
    Optionally filter by status.
    Returns requirements with their evaluations, ordered by created_at descending.
    """
    get_user_id_from_header(authorization)
    supabase = get_supabase_client()

    try:
        query = supabase.table("conjectural_requirements") \
            .select("*, evaluations(*)") \
            .eq("project_id", str(project_id)) \
            .order("created_at", desc=True)

        if status is not None:
            query = query.eq("status", status)

        result = query.execute()
        return result.data

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list conjectural requirements: {str(e)}",
        )


@router.get("/user/has-any")
async def has_any_conjectural(authorization: Optional[str] = Header(None)):
    """Check if the authenticated user has at least one conjectural requirement."""
    user_id = get_user_id_from_header(authorization)
    supabase = get_supabase_client()

    try:
        result = supabase.table("conjectural_requirements") \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .limit(1) \
            .execute()

        return {"has_conjectural": (result.count or 0) > 0}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check conjectural requirements: {str(e)}",
        )


@router.get("/by-cod/{cod_requirement}")
async def get_requirement_by_cod(
    cod_requirement: str,
    authorization: Optional[str] = Header(None),
):
    """Get a single conjectural requirement by cod_requirement (e.g. REQ-C001), including evaluations."""
    get_user_id_from_header(authorization)
    supabase = get_supabase_client()

    try:
        result = supabase.table("conjectural_requirements") \
            .select("*, evaluations(*)") \
            .eq("cod_requirement", cod_requirement) \
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Conjectural requirement not found")

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get conjectural requirement: {str(e)}",
        )


@router.get("/{requirement_id}")
async def get_requirement(
    requirement_id: UUID,
    authorization: Optional[str] = Header(None),
):
    """Get a single conjectural requirement by ID, including evaluations."""
    get_user_id_from_header(authorization)
    supabase = get_supabase_client()

    try:
        result = supabase.table("conjectural_requirements") \
            .select("*, evaluations(*)") \
            .eq("id", str(requirement_id)) \
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Conjectural requirement not found")

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get conjectural requirement: {str(e)}",
        )


@router.patch("/{requirement_id}/status")
async def update_status(
    requirement_id: UUID,
    body: dict,
    authorization: Optional[str] = Header(None),
):
    """Update the status of a conjectural requirement (todo, inprogress, done)."""
    get_user_id_from_header(authorization)
    supabase = get_supabase_client()

    new_status = body.get("status")
    if new_status not in ("todo", "inprogress", "done"):
        raise HTTPException(status_code=400, detail="Invalid status. Must be: todo, inprogress, done")

    try:
        check = supabase.table("conjectural_requirements") \
            .select("id") \
            .eq("id", str(requirement_id)) \
            .execute()

        if not check.data:
            raise HTTPException(status_code=404, detail="Conjectural requirement not found")

        result = supabase.table("conjectural_requirements") \
            .update({"status": new_status}) \
            .eq("id", str(requirement_id)) \
            .execute()

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update status: {str(e)}",
        )


@router.patch("/{requirement_id}")
async def update_requirement(
    requirement_id: UUID,
    body: ConjecturalRequirementUpdate,
    authorization: Optional[str] = Header(None),
):
    """Update editable fields (FERC/QESS) of a conjectural requirement."""
    get_user_id_from_header(authorization)
    supabase = get_supabase_client()

    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    try:
        check = supabase.table("conjectural_requirements") \
            .select("id") \
            .eq("id", str(requirement_id)) \
            .execute()

        if not check.data:
            raise HTTPException(status_code=404, detail="Conjectural requirement not found")

        supabase.table("conjectural_requirements") \
            .update(update_data) \
            .eq("id", str(requirement_id)) \
            .execute()

        result = supabase.table("conjectural_requirements") \
            .select("*, evaluations(*)") \
            .eq("id", str(requirement_id)) \
            .execute()

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update conjectural requirement: {str(e)}",
        )


