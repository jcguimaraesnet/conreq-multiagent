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
from app.agent.models.data_context import DataContext
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


IMPACT_UNCERTAINTY_DETECTION_PROMPT = """You are a software requirements engineering expert specializing in risk and uncertainty analysis.

For each positive business impact statement listed below, identify exactly ONE key uncertainty — an aspect that is unclear, underspecified, or could prevent the desired impact from being realized. Focus on gaps in knowledge, vague scope, missing constraints, untested assumptions, or risks that need validation.

Context:
- Project summary: {project_summary}
- Domain: {domain}
- Business objective: {business_objective}
- Primary stakeholder: {stakeholder}

Positive business impacts:
{positive_impacts}

You MUST return ONLY a valid JSON array of strings (no markdown, no explanation) where each string is a concise description of the key uncertainty (up to 200 characters). Return exactly {quantity} strings, one per positive impact, in the same order.
"""


CONJECTURAL_HYPOTHESIS_PROMPT = """You are a software requirements engineering expert specializing in lean experimentation and hypothesis-driven development.

You are given a list of desired positive business impacts and their associated uncertainties. For each pair, propose ONE experiment hypothesis — a verifiable, testable solution assumption that, if validated, would eliminate (or significantly reduce) the uncertainty and help achieve the desired positive impact.

Each hypothesis MUST be:
- Verifiable: can be tested with a concrete experiment
- Measurable: has clear success/failure criteria
- Focused: directly addresses the uncertainty
- Actionable: describes what to build, test, or measure

Context:
- Project summary: {project_summary}
- Domain: {domain}
- Business objective: {business_objective}
- Primary stakeholder: {stakeholder}

Positive impacts and uncertainties:
{impacts_and_uncertainties}

You MUST return ONLY a valid JSON array of strings (no markdown, no explanation) where each string is a concise experiment hypothesis (up to 300 characters). Return exactly {quantity} strings, one per impact-uncertainty pair, in the same order.
"""


def _strip_markdown_fences(raw: str) -> str:
    """Remove markdown code fences from LLM response if present."""
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3].strip()
    return raw


async def _detect_impact_uncertainties(
    data_context: DataContext,
) -> List[str]:
    """Call the LLM to identify one uncertainty per positive business impact. Returns list of uncertainty strings (index-aligned)."""
    impacts = [cd.positive_impact for cd in data_context.conjectural_data]
    if not impacts:
        return []

    impacts_text = "\n".join(f"- {pi}" for pi in impacts)

    prompt = IMPACT_UNCERTAINTY_DETECTION_PROMPT.format(
        positive_impacts=impacts_text,
        project_summary=data_context.project_summary,
        domain=data_context.domain,
        stakeholder=data_context.stakeholder,
        business_objective=data_context.business_objective,
        quantity=len(impacts),
    )

    model = get_model(temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw_content = _strip_markdown_fences(extract_text(response.content).strip())
        return json.loads(raw_content)

    except (json.JSONDecodeError, Exception) as e:
        print(f"[Analysis] Error detecting impact uncertainties: {e}")
        return ["Unable to determine uncertainty."] * len(impacts)


async def _generate_conjectural_hypotheses(
    data_context: DataContext,
) -> List[str]:
    """Call the LLM to generate a verifiable experiment hypothesis per impact+uncertainty pair. Returns list of hypothesis strings (index-aligned)."""
    impacts = [cd.positive_impact for cd in data_context.conjectural_data]
    uncertainties = [cd.uncertainty for cd in data_context.conjectural_data]
    if not impacts or not uncertainties:
        return []

    pairs_text = "\n".join(
        f"- Impact: {impact}\n  Uncertainty: {uncertainty}"
        for impact, uncertainty in zip(impacts, uncertainties)
    )

    prompt = CONJECTURAL_HYPOTHESIS_PROMPT.format(
        impacts_and_uncertainties=pairs_text,
        project_summary=data_context.project_summary,
        domain=data_context.domain,
        stakeholder=data_context.stakeholder,
        business_objective=data_context.business_objective,
        quantity=len(impacts),
    )

    model = get_model(temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw_content = _strip_markdown_fences(extract_text(response.content).strip())
        return json.loads(raw_content)

    except (json.JSONDecodeError, Exception) as e:
        print(f"[Analysis] Error generating conjectural hypotheses: {e}")
        return ["Unable to generate hypothesis."] * len(impacts)


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

    # Recover elicitation context from state
    data_context = DataContext.model_validate(state.get("data_context", {}))
    print(f"[Analysis] Elicitation context loaded — {len(data_context.conjectural_data)} positive impact(s)")

    # Step A: Detect one uncertainty per positive impact
    uncertainties_list = await _detect_impact_uncertainties(data_context)
    for cd, uncertainty in zip(data_context.conjectural_data, uncertainties_list):
        cd.uncertainty = uncertainty
        print(f"  [Uncertainty] {cd.positive_impact!r} → {uncertainty!r}")

    # Step B: Generate a verifiable experiment hypothesis per impact+uncertainty pair
    hypotheses_list = await _generate_conjectural_hypotheses(data_context)
    for cd, hypothesis in zip(data_context.conjectural_data, hypotheses_list):
        cd.supposition_solution = hypothesis
        print(f"  [Hypothesis] {cd.positive_impact!r} → {hypothesis!r}")

    print(f"[Analysis] Completed — {len(data_context.conjectural_data)} conjectural data entries")

    return Command(
        update={
            "messages": state.get("messages", []),
            "data_context": data_context.model_dump(),
            "step1_elicitation": True,
            "step2_analysis": True,
            "pending_progress": True,
            "spec_attempt": 0,
        }
    )
