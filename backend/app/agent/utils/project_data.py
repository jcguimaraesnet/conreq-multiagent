"""
Utility functions for fetching project data from Supabase.

Reusable across multiple workflow nodes (elicitation, generic, etc.).
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple, cast

from app.services.supabase_client import get_async_supabase_client


def language_instruction(language: str) -> str:
    """Return a translation instruction if the language is not en-us, otherwise empty string."""
    if language.lower() == "en-us":
        return ""
    return f"\n\nIMPORTANT: You MUST write your entire response in {language}. Translate all output to {language}."


@dataclass
class ProjectContext:
    vision_extracted_text: Optional[str]
    summary: str
    domain: str
    stakeholder: str
    business_objective: str
    language: str


@dataclass
class ProjectSummary:
    title: Optional[str]
    vision_extracted_text: Optional[str]
    functional_count: int
    non_functional_count: int
    conjectural_count: int


async def fetch_project_context(
    project_id: Optional[str],
    requirement_types: Optional[List[str]] = None,
) -> Tuple[Optional[str], List[Dict[str, Any]]]:
    """
    Fetch the vision document text and existing requirements for a given project.

    Args:
        project_id: The UUID of the current project (as string).
        requirement_types: List of requirement types to fetch (e.g. ["functional", "non_functional"]).
            If None, fetches all types.

    Returns:
        A tuple of (vision_extracted_text, existing_requirements).
        - vision_extracted_text: The extracted text from the vision document, or None.
        - existing_requirements: A list of dicts with requirement_id, type, description, category.
    """
    vision_extracted_text: Optional[str] = None
    existing_requirements: List[Dict[str, Any]] = []

    if not project_id:
        return vision_extracted_text, existing_requirements

    supabase = await get_async_supabase_client()

    # Fetch vision_extracted_text from the projects table
    try:
        result = await supabase.table("projects") \
            .select("vision_extracted_text") \
            .eq("id", str(project_id)) \
            .single() \
            .execute()
        data = result.data if isinstance(result.data, dict) else {}
        raw_value = data.get("vision_extracted_text")
        vision_extracted_text = str(raw_value) if raw_value is not None else None
        print(f"Vision extracted text found: {bool(vision_extracted_text)}")
    except Exception as e:
        print(f"Error fetching vision_extracted_text: {e}")

    # Fetch existing requirements (filtered by type if specified)
    try:
        query = supabase.table("requirements") \
            .select("requirement_id, type, description, category") \
            .eq("project_id", str(project_id))
        if requirement_types:
            query = query.in_("type", requirement_types)
        req_result = await query.order("requirement_id").execute()
        existing_requirements = cast(List[Dict[str, Any]], req_result.data) if req_result.data else []
    except Exception as e:
        print(f"Error fetching existing requirements: {e}")

    return vision_extracted_text, existing_requirements


async def fetch_project_summary(project_id: Optional[str]) -> ProjectSummary:
    """
    Fetch the vision document text and requirement counts for a given project.

    Counts functional and non_functional from the requirements table,
    and conjectural from the conjectural_requirements table.
    """
    summary = ProjectSummary(
        title=None,
        vision_extracted_text=None,
        functional_count=0,
        non_functional_count=0,
        conjectural_count=0,
    )

    if not project_id:
        return summary

    supabase = await get_async_supabase_client()

    # Fetch vision_extracted_text from the projects table
    try:
        result = await supabase.table("projects") \
            .select("title, vision_extracted_text") \
            .eq("id", str(project_id)) \
            .single() \
            .execute()
        data = result.data if isinstance(result.data, dict) else {}
        raw_title = data.get("title")
        summary.title = str(raw_title) if raw_title is not None else None
        raw_value = data.get("vision_extracted_text")
        summary.vision_extracted_text = str(raw_value) if raw_value is not None else None
    except Exception as e:
        print(f"Error fetching vision_extracted_text: {e}")

    # Count functional and non_functional requirements
    try:
        req_result = await supabase.table("requirements") \
            .select("type") \
            .eq("project_id", str(project_id)) \
            .execute()
        if req_result.data:
            for r in req_result.data:
                req_type = r.get("type")
                if req_type == "functional":
                    summary.functional_count += 1
                elif req_type == "non_functional":
                    summary.non_functional_count += 1
    except Exception as e:
        print(f"Error counting requirements: {e}")

    # Count conjectural requirements
    try:
        conj_result = await supabase.table("conjectural_requirements") \
            .select("id", count="exact") \
            .eq("project_id", str(project_id)) \
            .execute()
        summary.conjectural_count = conj_result.count or 0
    except Exception as e:
        print(f"Error counting conjectural requirements: {e}")

    return summary


async def fetch_project_context_fields(project_id: Optional[str]) -> ProjectContext:
    """
    Fetch vision_extracted_text, summary, business_domain, stakeholder, and
    business_objective directly from the projects table.
    """
    ctx = ProjectContext(
        vision_extracted_text=None,
        summary="No vision document available.",
        domain="general software",
        stakeholder="end user",
        business_objective="No business objective identified.",
        language="en",
    )

    if not project_id:
        return ctx

    supabase = await get_async_supabase_client()

    try:
        result = await supabase.table("projects") \
            .select("vision_extracted_text, summary, business_domain, stakeholder, business_objective, language") \
            .eq("id", str(project_id)) \
            .single() \
            .execute()
        data = result.data if isinstance(result.data, dict) else {}

        raw_vision = data.get("vision_extracted_text")
        ctx.vision_extracted_text = str(raw_vision) if raw_vision is not None else None
        ctx.summary = data.get("summary") or ctx.summary
        ctx.domain = data.get("business_domain") or ctx.domain
        ctx.stakeholder = data.get("stakeholder") or ctx.stakeholder
        ctx.business_objective = data.get("business_objective") or ctx.business_objective
        ctx.language = data.get("language") or ctx.language

        print(f"[ProjectContext] summary={len(ctx.summary)} chars, domain={ctx.domain}, stakeholder={ctx.stakeholder}, language={ctx.language}")
    except Exception as e:
        print(f"Error fetching project context fields: {e}")

    return ctx
