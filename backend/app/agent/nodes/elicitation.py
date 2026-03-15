"""
Elicitation Node - Extract requirements from input.

This node uses an LLM to extract and generate requirements
based on user input and context. It builds a domain Knowledge Graph
containing entities (Known Knowns and Unknown Knowns) and their
relationships, serialized for downstream nodes.
"""

import asyncio
import json
from difflib import SequenceMatcher
from typing import Optional, List, Dict, Any

from langchain_core.runnables.config import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.agent.llm_config import get_model, extract_text
from langgraph.types import Command
from copilotkit.langgraph import copilotkit_emit_message, copilotkit_emit_state, copilotkit_customize_config
from langgraph.types import Command, interrupt

from app.agent.state import WorkflowState
from app.agent.tools import generate_task_steps_generative_ui
from app.agent.utils.context_utils import extract_copilotkit_context
from app.agent.utils.project_data import fetch_project_context
from app.agent.utils.nlp_entity_extractor import extract_domain_entities, extract_entity_relations
from app.agent.models.knowledge_graph import (
    EntityNode,
    EntityRelation,
    KnowledgeGraph,
    kg_to_state,
    to_networkx,
)
from app.agent.models.data_context import DataContext, ConjecturalData


# Processing mode: "quick" (default) or "extended"
# Quick  → Steps 1-2 only (1 LLM call + NLP), simple KnowledgeGraph
# Extended → Steps 1-7 (multiple LLM calls), full KnowledgeGraph with meanings
PROCESSING_MODE = "quick"


ELICITATION_SYSTEM_PROMPT = """You are a helpful assistant for any questions.
When asked to answer any question, you MUST answer '🔍 **Elicitation Generated!**'."""


KNOWN_KNOWNS_SYSTEM_PROMPT = """You are a domain analysis expert specializing in software requirements engineering.

You are given:
1. A list of domain entities extracted from a project.
2. A summary of the project.

For each domain entity, provide a concise definition or meaning based EXCLUSIVELY on the information found in the project summary. Do not use external knowledge.

If an entity cannot be clearly defined from the project summary, set its meaning to "NOT_DEFINED".

You MUST return ONLY a valid JSON array (no markdown, no explanation) where each element has:
- "entity": the domain entity name (string)
- "meaning": its definition based on the project summary (string)

Domain entities:
{entities}

Project summary:
{project_summary}
"""


CONTEXT_EXTRACTION_SYSTEM_PROMPT = """You are a software requirements engineering expert.

Analyze the following project vision document and existing requirements to extract:

1. **PRIMARY STAKEHOLDER**: the most important user role or stakeholder mentioned in the documents. Look for roles like "administrator", "manager", "operator", "end user", "customer", etc.
2. **PROJECT DOMAIN**: the business or technical domain of the project (e.g., "healthcare", "e-commerce", "education", "financial services", "logistics", etc.).
3. **PROJECT SUMMARY**: a comprehensive summary of up to 500 characters that integrates the context from the project vision document with the main capabilities described in the existing requirements. Preserve the understanding of each requirement while adding the broader project context from the vision. This summary will be used as the sole context for all downstream analysis, so maximize information density within the character limit.
4. **BUSINESS OBJECTIVE**: the main business goal or value proposition the project aims to achieve (e.g., "reduce operational costs by automating X", "increase customer retention through Y", "enable Z for end users"). Up to 200 characters. Focus on the "why" behind the project, not the "what".

You MUST return ONLY a valid JSON object (no markdown, no explanation) with:
- "stakeholder": the primary stakeholder role identified (string)
- "domain": the project domain identified (string)
- "summary": the concise project summary (string)
- "business_objective": the main business objective identified (string)

If you cannot identify a clear stakeholder, use "end user".
If you cannot identify a clear domain, use "general software".
If no documents are provided, set summary to "No project documentation available.".
If no business objective is identifiable, use "No business objective identified.".

Project vision document:
{vision_text}

Existing requirements:
{requirements}
"""


UNKNOWN_KNOWNS_SYSTEM_PROMPT = """You are simulating the persona of a {stakeholder} working in the {domain} domain.

As a {stakeholder}, you have tacit professional knowledge about the terms and concepts used in your field. The following domain entities appeared in the project documentation but were NOT clearly defined. Based on your professional experience in {domain}, articulate what each term most likely means in this project context.

Use the project summary and requirements below as context to ground your definitions in the specific project, but leverage your professional knowledge as a {stakeholder} to fill in the gaps.

You MUST return ONLY a valid JSON array (no markdown, no explanation) where each element has:
- "entity": the domain entity name (string)
- "meaning": your articulated definition of the term based on your professional knowledge as a {stakeholder} (string)

Undefined entities:
{entities}

Project summary:
{project_summary}

Existing requirements:
{requirements}
"""


REFINE_POSITIVE_IMPACT_SYSTEM_PROMPT = """You are a business analyst specializing in requirements engineering.

You are given a set of brief descriptions of desired positive business impacts provided by a stakeholder, along with the project context.

For each brief description, produce a refined, elaborated sentence that:
- Preserves the original intent of the brief description
- Adds specificity and clarity using the project context
- Is written as a clear, actionable positive business impact statement
- Has up to 200 characters

Project context:
- Domain: {domain}
- Primary stakeholder: {stakeholder}
- Business objective: {business_objective}
- Project summary: {project_summary}

Brief descriptions:
{brief_descriptions}

You MUST return ONLY a valid JSON array (no markdown, no explanation) with exactly {quantity} strings, one refined sentence per brief description, in the same order.
"""


GENERATE_POSITIVE_IMPACT_SYSTEM_PROMPT = """You are a business analyst specializing in requirements engineering.

Based on the project context below, generate {quantity} desired positive business impact statements that the project aims to achieve for its stakeholders.

Each statement should:
- Be a clear, actionable positive business impact
- Be directly related to the project domain and objectives
- Represent a distinct benefit or value the project delivers
- Have up to 200 characters

Project context:
- Domain: {domain}
- Primary stakeholder: {stakeholder}
- Business objective: {business_objective}
- Project summary: {project_summary}

You MUST return ONLY a valid JSON array (no markdown, no explanation) with exactly {quantity} strings, each being a positive business impact statement.
"""


def _format_requirements(existing_requirements: List[Dict[str, Any]]) -> str:
    """Format requirements list as readable text for prompts."""
    if not existing_requirements:
        return "No existing requirements available."
    return "\n".join(
        f"- [{r.get('requirement_id', 'N/A')}] ({r.get('type', 'N/A')}) {r.get('description', '')}"
        for r in existing_requirements
    )


def _strip_markdown_fences(raw: str) -> str:
    """Remove markdown code fences from LLM response if present."""
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3].strip()
    return raw


def _compute_similarity(text_a: str, text_b: str) -> float:
    """Compute similarity ratio (0.0–1.0) between two strings using SequenceMatcher."""
    return SequenceMatcher(None, text_a.lower(), text_b.lower()).ratio()


async def refine_positive_impacts(
    brief_descriptions: List[str],
    data_context: "DataContext",
    model_provider: str,
) -> tuple[List[str], List[int]]:
    """
    Refine user-provided brief descriptions into elaborated positive business
    impact statements using LLM + project context.
    Returns (refined_list, similarity_percentages).
    """
    if not brief_descriptions:
        return [], []

    descriptions_text = "\n".join(
        f"{i + 1}. {desc}" for i, desc in enumerate(brief_descriptions)
    )
    prompt = REFINE_POSITIVE_IMPACT_SYSTEM_PROMPT.format(
        domain=data_context.domain,
        stakeholder=data_context.stakeholder,
        business_objective=data_context.business_objective,
        project_summary=data_context.project_summary,
        brief_descriptions=descriptions_text,
        quantity=len(brief_descriptions),
    )

    model = get_model(provider=model_provider, temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw = _strip_markdown_fences(extract_text(response.content).strip())
        refined_list: List[str] = json.loads(raw)

        results: List[str] = []
        similarities: List[int] = []
        for i, brief in enumerate(brief_descriptions):
            refined = refined_list[i] if i < len(refined_list) else brief
            sim_pct = round(_compute_similarity(brief, refined) * 100)
            print(f"  [Similarity] {sim_pct}% — {brief!r} → {refined!r}")
            results.append(refined)
            similarities.append(sim_pct)
        return results, similarities

    except (json.JSONDecodeError, Exception) as e:
        print(f"[Positive Impact] Error refining brief descriptions: {e}")
        return list(brief_descriptions), [100] * len(brief_descriptions)


async def generate_positive_impacts(
    quantity: int,
    data_context: "DataContext",
    model_provider: str,
) -> List[str]:
    """
    Generate positive business impact statements from scratch using LLM +
    project context. Returns a list of impact strings.
    """
    prompt = GENERATE_POSITIVE_IMPACT_SYSTEM_PROMPT.format(
        domain=data_context.domain,
        stakeholder=data_context.stakeholder,
        business_objective=data_context.business_objective,
        project_summary=data_context.project_summary,
        quantity=quantity,
    )

    model = get_model(provider=model_provider, temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw = _strip_markdown_fences(extract_text(response.content).strip())
        return json.loads(raw)

    except (json.JSONDecodeError, Exception) as e:
        print(f"[Positive Impact] Error generating impacts: {e}")
        return []


async def extract_project_context(
    vision_extracted_text: Optional[str],
    existing_requirements: List[Dict[str, Any]],
    model_provider: str,
) -> Dict[str, Any]:
    """
    Extract stakeholder, domain, business objective, and a concise
    project summary in a single LLM call. The summary replaces the raw vision
    document in all downstream prompts. Falls back to defaults if extraction fails.
    """
    prompt = CONTEXT_EXTRACTION_SYSTEM_PROMPT.format(
        vision_text=vision_extracted_text or "No vision document available.",
        requirements=_format_requirements(existing_requirements),
    )

    model = get_model(provider=model_provider, temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw_content = _strip_markdown_fences(extract_text(response.content).strip())
        result: Dict[str, str] = json.loads(raw_content)
        return {
            "stakeholder": result.get("stakeholder", "end user"),
            "domain": result.get("domain", "general software"),
            "summary": result.get("summary", "No vision document available."),
            "business_objective": result.get("business_objective", "No business objective identified."),
        }

    except (json.JSONDecodeError, Exception) as e:
        print(f"Error extracting project context: {e}")
        return {
            "stakeholder": "end user",
            "domain": "general software",
            "summary": "No vision document available.",
            "business_objective": "No business objective identified.",
        }


KNOWN_KNOWNS_BATCH_SIZE = 10


async def _build_known_knowns_batch(
    batch_entities: List[str],
    project_summary: str,
    batch_number: int,
    total_batches: int,
    model_provider: str,
) -> List[Dict[str, str]]:
    """Process a single batch of entities for Known Knowns mapping."""
    entities_text = "\n".join(f"- {entity}" for entity in batch_entities)

    prompt = KNOWN_KNOWNS_SYSTEM_PROMPT.format(
        entities=entities_text,
        project_summary=project_summary,
    )

    model = get_model(provider=model_provider, temperature=0)

    try:
        print(f"  [Known Knowns] Batch {batch_number}/{total_batches} — {len(batch_entities)} entities")
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw_content = _strip_markdown_fences(extract_text(response.content).strip())
        known_knowns: List[Dict[str, str]] = json.loads(raw_content)
        print(f"  [Known Knowns] Batch {batch_number}/{total_batches} — returned {len(known_knowns)} entities")
        return known_knowns

    except (json.JSONDecodeError, Exception) as e:
        print(f"  [Known Knowns] Batch {batch_number}/{total_batches} error: {e}")
        return [{"entity": entity, "meaning": "NOT_DEFINED"} for entity in batch_entities]


async def build_known_knowns(
    domain_entities: List[str],
    project_summary: str,
    model_provider: str,
    batch_size: int = KNOWN_KNOWNS_BATCH_SIZE,
) -> List[Dict[str, str]]:
    """
    Use LLM to define meanings for all domain entities based on the project summary.
    Processes in batches to keep prompts small. Returns a Known Knowns mapping.
    """
    if not domain_entities:
        return []

    batches = [
        domain_entities[i:i + batch_size]
        for i in range(0, len(domain_entities), batch_size)
    ]
    total_batches = len(batches)

    print(f"[Known Knowns] {len(domain_entities)} entities → {total_batches} batch(es) of up to {batch_size}")

    all_known_knowns: List[Dict[str, str]] = []
    for idx, batch in enumerate(batches, start=1):
        batch_result = await _build_known_knowns_batch(
            batch, project_summary,
            batch_number=idx, total_batches=total_batches,
            model_provider=model_provider,
        )
        all_known_knowns.extend(batch_result)

    print(f"[Known Knowns] All batches completed — {len(all_known_knowns)} entities processed")
    return all_known_knowns


async def build_unknown_knowns(
    undefined_entities: List[str],
    stakeholder: str,
    domain: str,
    project_summary: str,
    existing_requirements: List[Dict[str, Any]],
    model_provider: str,
) -> List[Dict[str, str]]:
    """
    Simulate a stakeholder persona to articulate meanings for entities
    that were not defined from the documents alone (Unknown Knowns).
    """
    if not undefined_entities:
        return []

    entities_text = "\n".join(f"- {entity}" for entity in undefined_entities)

    prompt = UNKNOWN_KNOWNS_SYSTEM_PROMPT.format(
        stakeholder=stakeholder,
        domain=domain,
        entities=entities_text,
        project_summary=project_summary,
        requirements=_format_requirements(existing_requirements),
    )

    model = get_model(provider=model_provider, temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw_content = _strip_markdown_fences(extract_text(response.content).strip())
        unknown_knowns: List[Dict[str, str]] = json.loads(raw_content)
        return unknown_knowns

    except (json.JSONDecodeError, Exception) as e:
        print(f"Error building unknown_knowns mapping: {e}")
        return [
            {"entity": entity, "meaning": "NOT_INFERRED"}
            for entity in undefined_entities
        ]


async def elicitation_node(state: WorkflowState, config: Optional[RunnableConfig] = None):
    """
    Extract requirements from input document.

    Uses GPT-4o to process user messages and generate task steps
    through the generative UI tool. Builds a unified KnowledgeGraph
    with entities, meanings, and relationships.
    """

    # not emmiting intermediate messages
    config = copilotkit_customize_config(config, emit_messages=False)

    context = extract_copilotkit_context(state)
    require_brief_description = context['require_brief_description']
    current_project_id = context['current_project_id']
    quantity_req_batch = context['quantity_req_batch']
    model_provider = context['model']

    # Fetch vision document text and existing requirements from Supabase
    vision_extracted_text, existing_requirements = await fetch_project_context(
        current_project_id,
        requirement_types=["functional", "non_functional"],
    )

    # Step 1: Extract stakeholder, domain, project summary, and business needs (single LLM call)
    # After this step, the raw vision document is no longer used in LLM prompts.
    project_context = await extract_project_context(
        vision_extracted_text, existing_requirements, model_provider
    )
    project_summary = project_context["summary"]
    domain = project_context["domain"]
    stakeholder = project_context["stakeholder"]
    business_objective = project_context["business_objective"]
    print(f"[Context] Project summary ({len(project_summary)} chars): {project_summary[:120]}...")
    print(f"[Context] Domain: {domain}")
    print(f"[Context] Stakeholder: {stakeholder}")
    print(f"[Context] Business objective: {business_objective}")

    data_context = DataContext(
        vision_raw=vision_extracted_text,
        project_summary=project_summary,
        domain=domain,
        stakeholder=stakeholder,
        business_objective=business_objective,
    )

    # Step 2: Obtain positive business impact statements
    # If user provides brief descriptions → refine via LLM + compute similarity
    # Otherwise → generate from scratch via LLM using project context
    positive_impacts: List[str] = []
    similarity: List[int] = []
    if require_brief_description == True:
        payload = interrupt(
            {"type": "hitl_brief_description", "quantity_req_batch": quantity_req_batch},
        )
        print(f"[Elicitation] payload: {payload}")

        brief_descriptions: List[str] = payload.get("brief_descriptions", [])
        print(f"[Positive Impact] Received {len(brief_descriptions)} brief description(s) from user.")

        if brief_descriptions:
            positive_impacts, similarity = await refine_positive_impacts(brief_descriptions, data_context, model_provider)
            for pi in positive_impacts:
                print(f"  [Refined] {pi!r}")
    else:
        print("[Positive Impact] Generating impacts from project context...")
        positive_impacts = await generate_positive_impacts(quantity_req_batch, data_context, model_provider)
        similarity = [0] * len(positive_impacts)
        for pi in positive_impacts:
            print(f"  [Generated] {pi!r}")

    data_context.conjectural_data = [
        ConjecturalData(positive_impact=pi, positive_impact_similarity=sim)
        for pi, sim in zip(positive_impacts, similarity)
    ]
    print(f"[Positive Impact] Total: {len(positive_impacts)} statement(s)")

    return Command(
        update={
            "messages": state.get("messages", []),
            "data_context": data_context.model_dump(),
            "step1_elicitation": True,
            "pending_progress": True,
        }
    )
