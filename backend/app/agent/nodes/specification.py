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
from app.agent.prompts.d01_specification_conjectural_specification_prompt import SPECIFICATION_CONJECTURAL_SPECIFICATION_PROMPT
from app.agent.prompts.d02_specification_conjectural_refinement_prompt import SPECIFICATION_CONJECTURAL_REFINEMENT_PROMPT
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


async def _task_generate(
    state: WorkflowState,
    config: RunnableConfig,
    data_context: DataContext,
    model_provider: str,
) -> dict:
    """Task: Generate or refine conjectural requirement specifications."""
    context = extract_copilotkit_context(state)
    quantity_req_batch = context['quantity_req_batch']

    stakeholder = data_context.stakeholder
    domain = data_context.domain
    project_summary = data_context.project_summary
    business_objective = data_context.business_objective
    print(f"[Specification] Stakeholder: {stakeholder} | Domain: {domain}")
    print(f"[Specification] Project summary ({len(project_summary)} chars): {project_summary[:120]}...")
    print(f"[Specification] Business objective: {business_objective}")
    print(f"[Specification] Conjectural descriptions ({len(data_context.conjectural_data)}):")
    for cd in data_context.conjectural_data:
        print(f"  [Business Need] {cd.raw_business_need[:60]} → [Uncertainty] {cd.raw_uncertainty[:60]} → [Hypothesis] {cd.raw_supposition_solution[:80]}")

    model = get_model(provider=model_provider, temperature=1)

    print(f"[Specification] Generating {quantity_req_batch} conjectural requirement(s)...")

    spec_attempt = state.get("spec_attempt", 0)
    print(f"[Specification] Current spec_attempt: {spec_attempt}")

    for i, cd in enumerate(data_context.conjectural_data[:quantity_req_batch]):
        req_num = i + 1
        print(f"[Specification] Generating requirement #{req_num}...")

        if spec_attempt == 0:
            prompt = get_prompt(SPECIFICATION_CONJECTURAL_SPECIFICATION_PROMPT, data_context.language).format(
                domain=domain,
                business_objective=business_objective,
                desired_behavior=cd.raw_desired_behavior,
                business_need=cd.raw_business_need,
                uncertainty=cd.raw_uncertainty,
                supposition_solution=cd.raw_supposition_solution,
                language=data_context.language,
            )
        else:
            last_cr = cd.conjectural_requirements[-1]
            prompt = get_prompt(SPECIFICATION_CONJECTURAL_REFINEMENT_PROMPT, data_context.language).format(
                project_summary=project_summary,
                domain=domain,
                stakeholder=stakeholder,
                business_objective=business_objective,
                prev_desired_behavior=last_cr.ferc.desired_behavior,
                prev_business_need=last_cr.ferc.business_need,
                prev_uncertainties=last_cr.ferc.uncertainty,
                prev_solution_assumption=last_cr.qess.solution_assumption,
                prev_uncertainty_evaluated=last_cr.qess.uncertainty_evaluated,
                prev_observation_analysis=last_cr.qess.observation_analysis,
                evaluation_summary=_format_evaluation(last_cr.llm_evaluation),
                language=data_context.language,
            )
            print(f"[Specification] Using refinement prompt for requirement #{req_num} (attempt {spec_attempt + 1})")

        try:
            response = await model.ainvoke([HumanMessage(content=prompt)])
            print(f"[Specification] Raw LLM response for requirement #{req_num}:\n\n{response.content}\n\n")
            raw_content = _strip_markdown_fences(extract_text(response.content).strip())
            raw_dict: Dict[str, Any] = json.loads(raw_content)
            cr = ConjecturalRequirement.model_validate(raw_dict)
            cr.attempt = len(cd.conjectural_requirements) + 1
            cd.conjectural_requirements.append(cr)

            print(f"  --- Conjectural Requirement #{req_num} (attempt {cr.attempt}) ---")
            print(f"  [FERC] Desired behavior: {cr.ferc.desired_behavior}")
            print(f"  [FERC] Business need: {cr.ferc.business_need}")
            print(f"  [FERC] Uncertainty: {cr.ferc.uncertainty}")
            print(f"  [QESS] Solution assumption: {cr.qess.solution_assumption}")
            print(f"  [QESS] Uncertainty evaluated: {cr.qess.uncertainty_evaluated}")
            print(f"  [QESS] Observation & analysis: {cr.qess.observation_analysis}")

        except (json.JSONDecodeError, Exception) as e:
            print(f"[Specification] Error generating requirement #{req_num}: {e}")

    print(f"[Specification] Finished generating conjectural requirements.")

    return {
        "data_context": data_context.model_dump(),
        "coordinator_phase": "validation",
    }


# Task registry: maps task names to handler functions
SPECIFICATION_TASKS = {
    "generate": _task_generate,
}


async def specification_node(state: WorkflowState, config: Optional[RunnableConfig] = None):
    """
    Specification node with task dispatch.

    Default task (first entry): generate conjectural requirement specifications.
    """
    print("Specification node started.")
    config = copilotkit_customize_config(config, emit_messages=False)

    context = extract_copilotkit_context(state)
    model_provider = context['model']
    data_context = DataContext.model_validate(state.get("data_context", {}))

    raw_task = state.get("node_task") or ""
    task_name = raw_task.split(":", 1)[1] if raw_task.startswith("specification:") else None

    if task_name and task_name in SPECIFICATION_TASKS:
        handler = SPECIFICATION_TASKS[task_name]
        print(f"[Specification] Dispatching task: {task_name}")
    else:
        handler = SPECIFICATION_TASKS["generate"]
        print("[Specification] Running default task: generate")

    update = await handler(state, config, data_context, model_provider)
    if "messages" not in update:
        update["messages"] = state.get("messages", [])
    return Command(update=update)