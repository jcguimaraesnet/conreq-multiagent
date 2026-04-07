"""
Profiles Router

Handles user profile endpoints including profile data and onboarding status.
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from pydantic import BaseModel

from app.routers.auth_utils import get_user_id_from_header
from app.services.supabase_client import get_supabase_client, safe_maybe_single_execute


router = APIRouter(prefix="/profiles", tags=["profiles"])


class ProfileResponse(BaseModel):
    role: str
    is_approved: bool


class OnboardingStatusResponse(BaseModel):
    stage1: bool
    stage2: bool
    stage3: bool


ONBOARDING_COLUMNS = (
    "has_completed_onboarding_stage1, "
    "has_completed_onboarding_stage2, "
    "has_completed_onboarding_stage3"
)


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(authorization: Optional[str] = Header(None)):
    """Get the authenticated user's profile (role and approval status)."""
    user_id = get_user_id_from_header(authorization)
    supabase = get_supabase_client()

    try:
        result = supabase.table("profiles")\
            .select("role, is_approved")\
            .eq("id", user_id)\
            .single()\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        return result.data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")


@router.get("/me/onboarding", response_model=OnboardingStatusResponse)
async def get_onboarding_status(authorization: Optional[str] = Header(None)):
    """Get the authenticated user's onboarding completion status."""
    user_id = get_user_id_from_header(authorization)
    supabase = get_supabase_client()

    try:
        result = safe_maybe_single_execute(
            supabase.table("profiles")
            .select(ONBOARDING_COLUMNS)
            .eq("id", user_id)
            .maybe_single()
        )

        row = result.data
        return OnboardingStatusResponse(
            stage1=(row or {}).get("has_completed_onboarding_stage1", False),
            stage2=(row or {}).get("has_completed_onboarding_stage2", False),
            stage3=(row or {}).get("has_completed_onboarding_stage3", False),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch onboarding status: {str(e)}")


@router.patch("/me/onboarding/{stage}")
async def complete_onboarding_stage(
    stage: str,
    authorization: Optional[str] = Header(None),
):
    """Mark an onboarding stage as completed."""
    user_id = get_user_id_from_header(authorization)

    valid_stages = {"stage1", "stage2", "stage3"}
    if stage not in valid_stages:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {', '.join(valid_stages)}")

    column = f"has_completed_onboarding_{stage}"
    supabase = get_supabase_client()

    try:
        result = supabase.table("profiles")\
            .update({column: True})\
            .eq("id", user_id)\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update onboarding stage: {str(e)}")
