"""
Vision Analyzer Service

Analyzes the vision document text using the user's configured LLM provider
to extract project summary, business domain, business objective, and stakeholder.
"""

import json as json_module

from app.agent.llm_config import get_model, extract_text, LLMProvider


class VisionAnalysisResult:
    def __init__(self, summary: str, business_domain: str, business_objective: str, stakeholder: str):
        self.summary = summary
        self.business_domain = business_domain
        self.business_objective = business_objective
        self.stakeholder = stakeholder


async def analyze_vision_text(text: str, provider: LLMProvider = "gemini") -> VisionAnalysisResult:
    """
    Analyze the vision document text to extract key project information.

    Returns a VisionAnalysisResult with summary, business_domain,
    business_objective, and stakeholder.

    Raises ValueError if mandatory fields (summary, business_domain,
    business_objective) cannot be extracted.
    """
    if not text or not text.strip():
        raise ValueError("Vision text is empty — cannot analyze.")

    prompt = f"""Analyze the following project vision document text and extract the information below.
All output MUST be in the same language as the vision document text below.

1. **summary**: Rewrite the content of the vision document sentence by sentence in a concise manner without losing relevant information.
2. **business_domain**: Identify the business domain of the project.
3. **business_objective**: Identify the main business objective of the project.
4. **stakeholder**: Identify the project's main stakeholder, and only the main stakeholder. If you cannot identify one, use "End User".

Respond with ONLY a valid JSON object in this exact format (no markdown, no code fences, no extra text):
{{"summary": "...", "business_domain": "...", "business_objective": "...", "stakeholder": "..."}}

Vision document text:
{text}"""

    llm = get_model(provider=provider, temperature=0)
    response = await llm.ainvoke(prompt)

    raw = extract_text(response.content).strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        lines = raw.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        raw = "\n".join(lines).strip()

    try:
        data = json_module.loads(raw)
    except json_module.JSONDecodeError as e:
        raise ValueError(f"Failed to parse vision analysis response as JSON: {e}")

    summary = (data.get("summary") or "").strip()
    business_domain = (data.get("business_domain") or "").strip()
    business_objective = (data.get("business_objective") or "").strip()
    stakeholder = (data.get("stakeholder") or "").strip() or "End User"

    if not summary:
        raise ValueError("LLM failed to extract the project summary from the vision document.")
    if not business_domain:
        raise ValueError("LLM failed to extract the business domain from the vision document.")
    if not business_objective:
        raise ValueError("LLM failed to extract the business objective from the vision document.")

    return VisionAnalysisResult(
        summary=summary,
        business_domain=business_domain,
        business_objective=business_objective,
        stakeholder=stakeholder,
    )
