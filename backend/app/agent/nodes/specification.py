"""
Specification Node - Generate conjectural requirement specification.

This node generates conjectural requirement specifications based on the
project summary, business domain, and primary stakeholder extracted
from the knowledge graph built by the Elicitation node.
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
from app.agent.utils.context_utils import extract_copilotkit_context
from app.agent.prompts.factory import get_prompt
from app.agent.models.data_context import DataContext, ConjecturalRequirement
from app.agent.prompts.specification_conjectural_specification_prompt import SPECIFICATION_CONJECTURAL_SPECIFICATION_PROMPT
from app.agent.prompts.specification_conjectural_refinement_prompt import SPECIFICATION_CONJECTURAL_REFINEMENT_PROMPT
from app.agent.models.knowledge_graph import (
    KnowledgeGraph,
    kg_from_state,
)


def _format_evaluation(evaluation) -> str:
    """Format an Evaluation object as readable text for the refinement prompt."""
    if evaluation is None:
        return "No evaluation available."
    lines = []
    for criterion, score in evaluation.scores.items():
        justification = evaluation.justifications.get(criterion, "")
        line = f"- **{criterion}**: {score}/5"
        if justification:
            line += f' — "{justification}"'
        lines.append(line)
    return "\n".join(lines)


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


async def specification_node(state: WorkflowState, config: Optional[RunnableConfig] = None):
    """
    Generate conjectural requirement specification.

    1. Retrieves the knowledge graph from the Elicitation/Analysis nodes
    2. Extracts project summary, domain, stakeholder, and domain entities
    3. Calls the LLM to generate conjectural requirements based on
       project summary, business domain, and primary stakeholder
    4. Stores the results in the state
    """
    config = copilotkit_customize_config(config, emit_messages=False)
    print("Specification node started.")

    # Extract quantity_req_batch from context (same logic as elicitation node)
    context = extract_copilotkit_context(state)
    quantity_req_batch = context['quantity_req_batch']
    model_provider = context['model']

    # --- Step 1: Retrieve elicitation context from state ---
    data_context = DataContext.model_validate(state.get("data_context", {}))
    stakeholder = data_context.stakeholder
    domain = data_context.domain
    project_summary = data_context.project_summary
    business_objective = data_context.business_objective
    print(f"[Specification] Stakeholder: {stakeholder} | Domain: {domain}")
    print(f"[Specification] Project summary ({len(project_summary)} chars): {project_summary[:120]}...")
    print(f"[Specification] Business objective: {business_objective}")
    print(f"[Specification] Conjectural descriptions ({len(data_context.conjectural_data)}):")
    for cd in data_context.conjectural_data:
        print(f"  [Impact] {cd.positive_impact[:60]} → [Uncertainty] {cd.uncertainty[:60]} → [Hypothesis] {cd.supposition_solution[:80]}")

    # --- Step 3: Call LLM to generate conjectural requirements (one per ConjecturalData) ---
    model = get_model(provider=model_provider, temperature=1)

    print(f"[Specification] Generating {quantity_req_batch} conjectural requirement(s)...")

    spec_attempt = state.get("spec_attempt", 0)
    print(f"[Specification] Current spec_attempt: {spec_attempt}")

    for i, cd in enumerate(data_context.conjectural_data[:quantity_req_batch]):
        req_num = i + 1
        print(f"[Specification] Generating requirement #{req_num}...")

        if spec_attempt == 0:
            # First attempt: generate from scratch using elicitation/analysis data
            prompt = get_prompt(SPECIFICATION_CONJECTURAL_SPECIFICATION_PROMPT, data_context.language).format(
                project_summary=project_summary,
                domain=domain,
                stakeholder=stakeholder,
                business_objective=business_objective,
                positive_impact=cd.positive_impact,
                uncertainty=cd.uncertainty,
                supposition_solution=cd.supposition_solution,
            )
        else:
            # Subsequent attempts: refine based on last requirement + its LLM evaluation
            last_cr = cd.conjectural_requirements[-1]
            prompt = get_prompt(SPECIFICATION_CONJECTURAL_REFINEMENT_PROMPT, data_context.language).format(
                project_summary=project_summary,
                domain=domain,
                stakeholder=stakeholder,
                business_objective=business_objective,
                prev_desired_behavior=last_cr.ferc.desired_behavior,
                prev_positive_impact=last_cr.ferc.positive_impact,
                prev_uncertainties="; ".join(last_cr.ferc.uncertainties),
                prev_solution_assumption=last_cr.qess.solution_assumption,
                prev_uncertainty_evaluated=last_cr.qess.uncertainty_evaluated,
                prev_observation_analysis=last_cr.qess.observation_analysis,
                evaluation_summary=_format_evaluation(last_cr.llm_evaluation),
            )
            print(f"[Specification] Using refinement prompt for requirement #{req_num} (attempt {spec_attempt + 1})")

        try:
            response = await model.ainvoke([HumanMessage(content=prompt)])
            raw_content = _strip_markdown_fences(extract_text(response.content).strip())
            raw_dict: Dict[str, Any] = json.loads(raw_content)
            cr = ConjecturalRequirement.model_validate(raw_dict)
            cr.attempt = len(cd.conjectural_requirements) + 1
            cd.conjectural_requirements.append(cr)

            print(f"  --- Conjectural Requirement #{req_num} (attempt {cr.attempt}) ---")
            print(f"  [FERC] Desired behavior: {cr.ferc.desired_behavior}")
            print(f"  [FERC] Positive impact: {cr.ferc.positive_impact}")
            for j, uncertainty in enumerate(cr.ferc.uncertainties, start=1):
                print(f"  [FERC] Uncertainty {j}: {uncertainty}")
            print(f"  [QESS] Solution assumption: {cr.qess.solution_assumption}")
            print(f"  [QESS] Uncertainty evaluated: {cr.qess.uncertainty_evaluated}")
            print(f"  [QESS] Observation & analysis: {cr.qess.observation_analysis}")

        except (json.JSONDecodeError, Exception) as e:
            print(f"[Specification] Error generating requirement #{req_num}: {e}")

    print(f"[Specification] Finished generating conjectural requirements.")

    messages = state.get("messages", [])

    return Command(
        update={
            "messages": messages,
            "data_context": data_context.model_dump(),
            "step1_elicitation": True,
            "step2_analysis": True,
            "step3_specification": True,
            "pending_progress": True,
            "spec_attempt": state.get("spec_attempt", 0) + 1,
        }
    )