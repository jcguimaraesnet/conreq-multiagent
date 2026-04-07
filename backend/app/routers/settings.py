"""
Settings Router

Handles user settings endpoints.
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from pydantic import BaseModel

from app.routers.auth_utils import get_user_id_from_header
from app.services.supabase_client import get_supabase_client, safe_maybe_single_execute


router = APIRouter(prefix="/settings", tags=["settings"])


class UserSettingsResponse(BaseModel):
    require_brief_description: bool
    require_evaluation: bool
    batch_mode: bool
    quantity_req_batch: int
    spec_attempts: int
    model: str
    model_judge: str
    is_saved: bool = False


class UserSettingsUpdate(BaseModel):
    require_brief_description: bool
    require_evaluation: bool
    batch_mode: bool
    quantity_req_batch: int
    spec_attempts: int
    model: str
    model_judge: str


DEFAULT_SETTINGS = {
    "require_brief_description": True,
    "require_evaluation": True,
    "batch_mode": True,
    "quantity_req_batch": 5,
    "spec_attempts": 3,
    "model": "gemini",
    "model_judge": "gemini",
}

SETTINGS_FIELDS = (
    "require_brief_description, require_evaluation, batch_mode, "
    "quantity_req_batch, spec_attempts, model, model_judge"
)


@router.get("", response_model=UserSettingsResponse)
async def get_settings(authorization: Optional[str] = Header(None)):
    """Get the authenticated user's settings, or defaults if none saved."""
    user_id = get_user_id_from_header(authorization)
    supabase = get_supabase_client()

    try:
        result = safe_maybe_single_execute(
            supabase.table("settings")
            .select(SETTINGS_FIELDS)
            .eq("user_id", user_id)
            .maybe_single()
        )

        if result.data:
            return {**result.data, "is_saved": True}

        return {**DEFAULT_SETTINGS, "is_saved": False}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch settings: {str(e)}")


@router.put("", response_model=UserSettingsResponse)
async def update_settings(
    settings_data: UserSettingsUpdate,
    authorization: Optional[str] = Header(None),
):
    """Create or update the authenticated user's settings."""
    user_id = get_user_id_from_header(authorization)
    supabase = get_supabase_client()

    try:
        payload = {"user_id": user_id, **settings_data.model_dump()}

        result = supabase.table("settings")\
            .upsert(payload, on_conflict="user_id")\
            .execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to save settings")

        row = result.data[0]
        return {k: row[k] for k in UserSettingsResponse.model_fields if k != "is_saved"} | {"is_saved": True}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")
