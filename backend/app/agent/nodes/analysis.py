"""
Analysis Node - Analyze ambiguity in knowledge graph entities.

This node retrieves the knowledge graph built by the Elicitation node,
identifies ambiguous terms via an LLM call, computes a non-ambiguity
metric, and stores the results back in the knowledge graph and state.
"""

import asyncio
import json
from typing import Optional, List, Dict, Any

from langchain_core.runnables.config import RunnableConfig
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from app.agent.llm_config import get_model, extract_text
from langgraph.types import Command
from copilotkit.langgraph import copilotkit_emit_state, copilotkit_customize_config

from app.agent.state import WorkflowState
from app.agent.models.knowledge_graph import (
    BusinessUncertainty,
    KnowledgeGraph,
    kg_from_state,
    kg_to_state,
)


AMBIGUITY_DETECTION_PROMPT = """From the list below, identify terms that are ambiguous (subjective, vague, not measurable). Examples of ambiguous terms: "fast", "secure", "easy", "efficient", "flexible".

Consider domain, business objective, and stakeholder context when evaluating ambiguity. A term may be unambiguous in one context but ambiguous in another.
Domain: {domain}
Business objective: {business_objective}
Stakeholder: {stakeholder}

Return ONLY a JSON array with the first 1 ambiguous term names found. If none, return [].

Domain entities:
{entities}
"""


UNCERTAINTY_DETECTION_PROMPT = """You are a software requirements engineering expert specializing in risk and uncertainty analysis.

For each business need listed below, identify exactly ONE key uncertainty — an aspect that is unclear, underspecified, or could lead to misunderstandings during implementation. Focus on gaps in knowledge, vague scope, missing constraints, or assumptions that need validation.

Context:
- Project summary: {project_summary}
- Domain: {domain}
- Business objective: {business_objective}
- Primary stakeholder: {stakeholder}

Business needs:
{business_needs}

You MUST return ONLY a valid JSON array (no markdown, no explanation) where each element has:
- "business_need": the original business need statement (string)
- "uncertainty": a concise description of the key uncertainty for that need (up to 200 characters, string)

Return exactly {quantity} elements, one per business need.
"""


def _strip_markdown_fences(raw: str) -> str:
    """Remove markdown code fences from LLM response if present."""
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3].strip()
    return raw


async def _detect_business_uncertainties(
    business_needs: List[str],
    project_summary: str,
    domain: str,
    stakeholder: str,
    business_objective: str,
) -> List[BusinessUncertainty]:
    """Call the LLM to identify one uncertainty per business need."""
    if not business_needs:
        return []

    needs_text = "\n".join(f"- {need}" for need in business_needs)

    prompt = UNCERTAINTY_DETECTION_PROMPT.format(
        business_needs=needs_text,
        project_summary=project_summary,
        domain=domain,
        stakeholder=stakeholder,
        business_objective=business_objective,
        quantity=len(business_needs),
    )

    model = get_model(temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw_content = _strip_markdown_fences(extract_text(response.content).strip())
        raw_list: List[Dict[str, str]] = json.loads(raw_content)
        return [BusinessUncertainty.model_validate(item) for item in raw_list]

    except (json.JSONDecodeError, Exception) as e:
        print(f"[Analysis] Error detecting business uncertainties: {e}")
        return [
            BusinessUncertainty(business_need=need, uncertainty="Unable to determine uncertainty.")
            for need in business_needs
        ]


async def _detect_ambiguous_terms(
    entity_names: List[str],
    domain: str,
    stakeholder: str,
    business_objective: str,
) -> List[str]:
    """Call the LLM to identify which entities are ambiguous."""
    if not entity_names:
        return []

    entities_text = "\n".join(f"- {entity}" for entity in entity_names)

    prompt = AMBIGUITY_DETECTION_PROMPT.format(
        entities=entities_text,
        domain=domain,
        stakeholder=stakeholder,
        business_objective=business_objective,
    )

    model = get_model(temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw_content = _strip_markdown_fences(extract_text(response.content).strip())
        ambiguous_terms: List[str] = json.loads(raw_content)

        # Validate: only keep terms that actually exist in our entity list
        entity_set = {e.lower() for e in entity_names}
        validated = [t for t in ambiguous_terms if t.lower() in entity_set]
        return validated

    except (json.JSONDecodeError, Exception) as e:
        print(f"[Analysis] Error detecting ambiguous terms: {e}")
        return []


async def analysis_node(state: WorkflowState, config: Optional[RunnableConfig] = None):
    """
    Analyze knowledge graph entities for ambiguity.

    1. Retrieves the knowledge graph from the Elicitation node
    2. Extracts all entity names
    3. Calls the LLM to identify ambiguous terms
    4. Computes non-ambiguity metric: (total - ambiguous) / total
    5. Stores results in the knowledge graph and state
    """
    print("Analysis node started.")
    config = copilotkit_customize_config(config, emit_messages=False)

    # --- Step 1: Retrieve the knowledge graph from state ---
    kg = kg_from_state(state["knowledge_graph"])
    print(f"[Analysis] Knowledge graph loaded: {len(kg.nodes)} nodes, {len(kg.edges)} edges")

    # --- Step 2: Extract all entity names ---
    entity_names = [node.entity for node in kg.nodes]
    total_terms = len(entity_names)
    print(f"[Analysis] Total entities to analyze: {total_terms}")

    # # --- Step 3 (old): Call LLM to detect ambiguous terms ---
    # ambiguous_terms = await _detect_ambiguous_terms(
    #     entity_names, kg.domain, kg.stakeholder, kg.business_objective
    # )
    # ambiguous_count = len(ambiguous_terms)
    # print(f"[Analysis] Ambiguous terms detected: {ambiguous_count}")
    # for term in ambiguous_terms:
    #     print(f"  [Ambiguous] {term}")

    # # --- Step 4 (old): Calculate non-ambiguity metric ---
    # non_ambiguous_count = total_terms - ambiguous_count
    # non_ambiguity_metric = non_ambiguous_count / total_terms
    # print(f"[Analysis Metrics] Total terms: {total_terms}")
    # print(f"[Analysis Metrics] Non-ambiguous terms: {non_ambiguous_count}")
    # print(f"[Analysis Metrics] Ambiguous terms: {ambiguous_count}")
    # print(f"[Analysis Metrics] Non-ambiguity metric: {non_ambiguity_metric:.2f}")

    # # --- Step 5 (old): Store ambiguous terms in the knowledge graph ---
    # ambiguous_set = {t.lower() for t in ambiguous_terms}
    # for node in kg.nodes:
    #     node.is_ambiguous = node.entity.lower() in ambiguous_set
    # kg.ambiguous_terms = ambiguous_terms
    # kg.non_ambiguity_metric = non_ambiguity_metric
    # print(f"[Analysis] Knowledge graph updated with ambiguity data.")

    # --- Step 3: Detect uncertainties for each business need ---
    business_uncertainties = await _detect_business_uncertainties(
        kg.business_needs,
        kg.project_summary,
        kg.domain,
        kg.stakeholder,
        kg.business_objective,
    )
    print(f"[Analysis] Business uncertainties detected: {len(business_uncertainties)}")
    for item in business_uncertainties:
        print(f"  [Uncertainty] {item.business_need[:60]}... → {item.uncertainty[:80]}...")

    kg.business_uncertainties = business_uncertainties

    print(f"[Analysis] Knowledge graph updated with business uncertainties.")

    messages = state.get("messages", [])

    return Command(
        update={
            "messages": messages,
            "knowledge_graph": kg_to_state(kg),
            "step1_elicitation": True,
            "step2_analysis": True,
            "pending_progress": True,
        }
    )
