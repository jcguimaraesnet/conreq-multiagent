"""
User Settings Service

Fetches user preferences from the Supabase `settings` table.
"""

from app.services.supabase_client import get_supabase_client
from app.agent.llm_config import LLMProvider, DEFAULT_LLM_PROVIDER


def get_user_model_preference(user_id: str) -> LLMProvider:
    """Fetch the user's LLM provider preference from the settings table.

    Returns DEFAULT_LLM_PROVIDER ("gemini") when no setting is found.
    """
    supabase = get_supabase_client()
    result = (
        supabase.table("settings")
        .select("model")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if result.data and result.data.get("model"):
        return result.data["model"]
    return DEFAULT_LLM_PROVIDER
