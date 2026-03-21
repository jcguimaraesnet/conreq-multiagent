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
from app.agent.utils.project_data import fetch_project_context_fields
from app.agent.utils.nlp_entity_extractor import extract_domain_entities, extract_entity_relations
from app.agent.models.knowledge_graph import (
    EntityNode,
    EntityRelation,
    KnowledgeGraph,
    kg_to_state,
    to_networkx,
)
from app.agent.models.data_context import DataContext, ConjecturalData
from app.agent.prompts.factory import get_prompt
from app.agent.prompts.elicitation_refine_positive_impact_prompt import ELICITATION_REFINE_POSITIVE_IMPACT_PROMPT
from app.agent.prompts.elicitation_generate_positive_impact_prompt import ELICITATION_GENERATE_POSITIVE_IMPACT_PROMPT
from app.services.embedding_service import (
    generate_embeddings,
    fetch_existing_embeddings,
    select_most_diverse,
    is_similar_to_existing,
)


# Processing mode: "quick" (default) or "extended"
# Quick  → Steps 1-2 only (1 LLM call + NLP), simple KnowledgeGraph
# Extended → Steps 1-7 (multiple LLM calls), full KnowledgeGraph with meanings
PROCESSING_MODE = "quick"




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
    project_id: Optional[str] = None,
) -> tuple[List[str], List[int]]:
    """
    Refine user-provided brief descriptions into elaborated positive business
    impact statements using LLM + project context.

    After refinement, checks each impact against existing embeddings in the DB.
    If a refined impact is too similar to an existing one, falls back to
    generate_positive_impacts (3 candidates, pick most diverse).

    Returns (refined_list, similarity_percentages).
    """
    if not brief_descriptions:
        return [], []

    descriptions_text = "\n".join(
        f"{i + 1}. {desc}" for i, desc in enumerate(brief_descriptions)
    )
    prompt = get_prompt(ELICITATION_REFINE_POSITIVE_IMPACT_PROMPT, data_context.language).format(
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

        # Check refined impacts against existing embeddings in DB
        if project_id:
            existing_rows = await fetch_existing_embeddings(project_id)
            existing_embs = [row["embedding"] for row in existing_rows if row.get("embedding")]

            if existing_embs:
                print(f"[Positive Impact] Checking {len(results)} refined impact(s) against {len(existing_embs)} existing embedding(s)...")
                try:
                    refined_embeddings = await generate_embeddings(results)
                except Exception as e:
                    print(f"[Positive Impact] Error generating embeddings for similarity check: {e}")
                    return results, similarities

                for i, (refined_emb, refined_text) in enumerate(zip(refined_embeddings, list(results))):
                    if is_similar_to_existing(refined_emb, existing_embs):
                        print(f"  [Positive Impact] Refined impact #{i+1} is too similar to existing. Falling back to generation...")
                        fallback = await generate_positive_impacts(1, data_context, model_provider, project_id)
                        if fallback:
                            results[i] = fallback[0]
                            similarities[i] = 0  # auto-generated, not user-refined

        return results, similarities

    except (json.JSONDecodeError, Exception) as e:
        print(f"[Positive Impact] Error refining brief descriptions: {e}")
        return list(brief_descriptions), [100] * len(brief_descriptions)


async def generate_positive_impacts(
    quantity: int,
    data_context: "DataContext",
    model_provider: str,
    project_id: Optional[str] = None,
) -> List[str]:
    """
    Generate positive business impact statements from scratch using LLM +
    project context. Generates quantity*3 candidates, then selects the
    `quantity` most diverse via embedding similarity against existing
    requirements in the database. Returns a list of impact strings.
    """
    candidate_count = quantity * 3
    print(f"[Positive Impact] Generating {candidate_count} candidates (quantity={quantity} x 3)...")

    prompt = get_prompt(ELICITATION_GENERATE_POSITIVE_IMPACT_PROMPT, data_context.language).format(
        domain=data_context.domain,
        stakeholder=data_context.stakeholder,
        business_objective=data_context.business_objective,
        project_summary=data_context.project_summary,
        quantity=candidate_count,
    )

    model = get_model(provider=model_provider, temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw = _strip_markdown_fences(extract_text(response.content).strip())
        candidates: List[str] = json.loads(raw)
    except (json.JSONDecodeError, Exception) as e:
        print(f"[Positive Impact] Error generating impacts: {e}")
        return []

    if not candidates:
        return []

    print(f"[Positive Impact] Got {len(candidates)} candidates. Selecting {quantity} most diverse...")

    # Generate embeddings for all candidates
    try:
        candidate_embeddings = await generate_embeddings(candidates)
    except Exception as e:
        print(f"[Positive Impact] Error generating embeddings, falling back to first {quantity}: {e}")
        return candidates[:quantity]

    # Fetch existing embeddings from the database
    existing_rows = await fetch_existing_embeddings(project_id) if project_id else []
    existing_embeddings = [row["embedding"] for row in existing_rows if row.get("embedding")]
    print(f"[Positive Impact] Found {len(existing_embeddings)} existing embedding(s) in DB for comparison")

    # Select the most diverse candidates
    selected_indices = select_most_diverse(candidates, candidate_embeddings, existing_embeddings, quantity)
    return [candidates[i] for i in selected_indices]


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

    # Fetch project context fields directly from the projects table
    project_ctx = await fetch_project_context_fields(current_project_id)
    vision_extracted_text = project_ctx.vision_extracted_text
    project_summary = project_ctx.summary
    domain = project_ctx.domain
    stakeholder = project_ctx.stakeholder
    business_objective = project_ctx.business_objective
    language = project_ctx.language
    print(f"[Context] Project summary ({len(project_summary)} chars): {project_summary[:120]}...")
    print(f"[Context] Domain: {domain}")
    print(f"[Context] Stakeholder: {stakeholder}")
    print(f"[Context] Business objective: {business_objective}")
    print(f"[Context] Language: {language}")

    data_context = DataContext(
        vision_raw=vision_extracted_text,
        project_summary=project_summary,
        domain=domain,
        stakeholder=stakeholder,
        business_objective=business_objective,
        language=language,
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
            positive_impacts, similarity = await refine_positive_impacts(brief_descriptions, data_context, model_provider, project_id=current_project_id)
            for pi in positive_impacts:
                print(f"  [Positive Impact Refined] {pi}")
    else:
        print("[Positive Impact] Generating impacts from project context...")
        positive_impacts = await generate_positive_impacts(quantity_req_batch, data_context, model_provider, project_id=current_project_id)
        similarity = [0] * len(positive_impacts)
        for pi in positive_impacts:
            print(f"  [Positive Impact Generated] {pi}")

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
