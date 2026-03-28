"""
Analysis Node - Analyze ambiguity in knowledge graph entities.

This node retrieves the knowledge graph built by the Elicitation node,
identifies ambiguous terms via an LLM call, computes a non-ambiguity
metric, and stores the results back in the knowledge graph and state.
"""

import asyncio
import json
import re
from typing import Optional, List, Dict, Any

from langchain_core.runnables.config import RunnableConfig
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from app.agent.llm_config import get_model, extract_text
from langgraph.types import Command
from copilotkit.langgraph import copilotkit_emit_state, copilotkit_customize_config

from app.agent.state import WorkflowState
from app.agent.models.data_context import DataContext, QuestionAnswer
from app.agent.utils.context_utils import extract_copilotkit_context
from app.agent.prompts.factory import get_prompt
from app.agent.prompts.analysis_contextual_questions_prompt import ANALYSIS_CONTEXTUAL_QUESTIONS_PROMPT
from app.agent.prompts.analysis_impact_uncertainty_detection_prompt import ANALYSIS_IMPACT_UNCERTAINTY_DETECTION_PROMPT
from app.agent.prompts.analysis_conjectural_hypothesis_prompt import ANALYSIS_CONJECTURAL_HYPOTHESIS_PROMPT
from app.agent.prompts.analysis_synthesize_desired_behavior_prompt import ANALYSIS_SYNTHESIZE_DESIRED_BEHAVIOR_PROMPT
from app.agent.prompts.analysis_whatif_questions_prompt import ANALYSIS_WHATIF_QUESTIONS_PROMPT
from app.agent.prompts.analysis_identify_uncertainty_prompt import ANALYSIS_IDENTIFY_UNCERTAINTY_PROMPT
from app.agent.models.knowledge_graph import (
    BusinessUncertainty,
    KnowledgeGraph,
    kg_from_state,
    kg_to_state,
)


def _strip_markdown_fences(raw: str) -> str:
    """Remove markdown code fences from LLM response if present."""
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3].strip()
    return raw


async def _generate_contextual_questions(
    data_context: DataContext,
    model_provider: str,
) -> List[List[str]]:
    """Call the LLM to generate 3 contextual questions per positive business impact. Returns list of lists of question strings (index-aligned)."""
    impacts = [cd.raw_positive_impact for cd in data_context.conjectural_data]
    if not impacts:
        return []

    impacts_text = "\n".join(f"- {pi}" for pi in impacts)

    prompt = get_prompt(ANALYSIS_CONTEXTUAL_QUESTIONS_PROMPT, data_context.language).format(
        positive_impacts=impacts_text,
        project_summary=data_context.project_summary,
        domain=data_context.domain,
        business_objective=data_context.business_objective,
        quantity=len(impacts),
        language=data_context.language,
    )

    model = get_model(provider=model_provider, temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw_content = _strip_markdown_fences(extract_text(response.content).strip())
        try:
            return json.loads(raw_content)
        except json.JSONDecodeError:
            # Attempt to fix unescaped double quotes inside strings by replacing them with single quotes
            fixed = re.sub(r'(?<=\w)"(?=\w)', "'", raw_content)
            return json.loads(fixed)

    except (json.JSONDecodeError, Exception) as e:
        print(f"[Analysis] Error generating contextual questions: {e}")
        return [["Unable to generate question."] * 3] * len(impacts)


async def _detect_impact_uncertainties(
    data_context: DataContext,
    model_provider: str,
) -> List[str]:
    """Call the LLM to identify one uncertainty per positive business impact. Returns list of uncertainty strings (index-aligned)."""
    impacts = [cd.raw_positive_impact for cd in data_context.conjectural_data]
    if not impacts:
        return []

    impacts_text = "\n".join(f"- {pi}" for pi in impacts)

    prompt = get_prompt(ANALYSIS_IMPACT_UNCERTAINTY_DETECTION_PROMPT, data_context.language).format(
        positive_impacts=impacts_text,
        project_summary=data_context.project_summary,
        domain=data_context.domain,
        stakeholder=data_context.stakeholder,
        business_objective=data_context.business_objective,
        quantity=len(impacts),
        language=data_context.language,
    )

    model = get_model(provider=model_provider, temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw_content = _strip_markdown_fences(extract_text(response.content).strip())
        return json.loads(raw_content)

    except (json.JSONDecodeError, Exception) as e:
        print(f"[Analysis] Error detecting impact uncertainties: {e}")
        return ["Unable to determine uncertainty."] * len(impacts)


async def _generate_conjectural_hypotheses(
    data_context: DataContext,
    model_provider: str,
) -> List[str]:
    """Call the LLM to generate a verifiable experiment hypothesis per impact+uncertainty pair. Returns list of hypothesis strings (index-aligned)."""
    impacts = [cd.raw_positive_impact for cd in data_context.conjectural_data]
    uncertainties = [cd.raw_uncertainty for cd in data_context.conjectural_data]
    if not impacts or not uncertainties:
        return []

    pairs_text = "\n".join(
        f"- Impact: {impact}\n  Uncertainty: {uncertainty}"
        for impact, uncertainty in zip(impacts, uncertainties)
    )

    prompt = get_prompt(ANALYSIS_CONJECTURAL_HYPOTHESIS_PROMPT, data_context.language).format(
        impacts_and_uncertainties=pairs_text,
        project_summary=data_context.project_summary,
        domain=data_context.domain,
        stakeholder=data_context.stakeholder,
        business_objective=data_context.business_objective,
        quantity=len(impacts),
        language=data_context.language,
    )

    model = get_model(provider=model_provider, temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw_content = _strip_markdown_fences(extract_text(response.content).strip())
        return json.loads(raw_content)

    except (json.JSONDecodeError, Exception) as e:
        print(f"[Analysis] Error generating conjectural hypotheses: {e}")
        return ["Unable to generate hypothesis."] * len(impacts)


async def _synthesize_desired_behavior(
    cd: "ConjecturalData",
    data_context: DataContext,
    model_provider: str,
) -> str:
    """Call the LLM to synthesize a desired behavior statement from Q&A pairs for a single ConjecturalData entry."""
    qa_text = "\n".join(
        f"- P: {qa.question}\n  R: {qa.answer}"
        for qa in cd.raw_desired_behavior_questions_answers
    )

    prompt = get_prompt(ANALYSIS_SYNTHESIZE_DESIRED_BEHAVIOR_PROMPT, data_context.language).format(
        positive_impact=cd.raw_positive_impact,
        questions_answers=qa_text,
        project_summary=data_context.project_summary,
        domain=data_context.domain,
        business_objective=data_context.business_objective,
        language=data_context.language,
    )

    model = get_model(provider=model_provider, temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        return extract_text(response.content).strip()
    except Exception as e:
        print(f"[Analysis] Error synthesizing desired behavior: {e}")
        return ""


async def _generate_whatif_questions(
    cd: "ConjecturalData",
    data_context: DataContext,
    model_provider: str,
) -> List[str]:
    """Call the LLM to generate 3 What-If questions exploring edge cases for a desired behavior."""
    prompt = get_prompt(ANALYSIS_WHATIF_QUESTIONS_PROMPT, data_context.language).format(
        desired_behavior=cd.raw_desired_behavior,
        project_summary=data_context.project_summary,
        domain=data_context.domain,
        business_objective=data_context.business_objective,
        language=data_context.language,
    )

    model = get_model(provider=model_provider, temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw_content = _strip_markdown_fences(extract_text(response.content).strip())
        try:
            return json.loads(raw_content)
        except json.JSONDecodeError:
            fixed = re.sub(r'(?<=\w)"(?=\w)', "'", raw_content)
            return json.loads(fixed)
    except (json.JSONDecodeError, Exception) as e:
        print(f"[Analysis] Error generating What-If questions: {e}")
        return ["Unable to generate question."] * 3


async def _identify_uncertainty_from_qa(
    cd: "ConjecturalData",
    data_context: DataContext,
    model_provider: str,
) -> str:
    """Call the LLM to identify the key uncertainty from What-If Q&A pairs."""
    qa_text = "\n".join(
        f"- What-If: {qa.question}\n  Resposta: {qa.answer}"
        for qa in cd.raw_uncertainty_questions_answers
    )

    prompt = get_prompt(ANALYSIS_IDENTIFY_UNCERTAINTY_PROMPT, data_context.language).format(
        desired_behavior=cd.raw_desired_behavior,
        questions_answers=qa_text,
        project_summary=data_context.project_summary,
        domain=data_context.domain,
        business_objective=data_context.business_objective,
        language=data_context.language,
    )

    model = get_model(provider=model_provider, temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        return extract_text(response.content).strip()
    except Exception as e:
        print(f"[Analysis] Error identifying uncertainty: {e}")
        return "Unable to determine uncertainty."


async def _detect_ambiguous_terms(
    entity_names: List[str],
    domain: str,
    stakeholder: str,
    business_objective: str,
    model_provider: str,
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

    model = get_model(provider=model_provider, temperature=0)

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


async def _task_generate_questions(
    state: WorkflowState,
    config: RunnableConfig,
    data_context: DataContext,
    model_provider: str,
) -> dict:
    """Task: Generate contextual questions per positive impact, then pause for Elicitation to answer."""
    print(f"[Analysis] Elicitation context loaded — {len(data_context.conjectural_data)} positive impact(s)")

    questions_list = await _generate_contextual_questions(data_context, model_provider)
    for idx, (cd, questions) in enumerate(zip(data_context.conjectural_data, questions_list), start=1):
        cd.raw_desired_behavior_questions_answers = [
            QuestionAnswer(question=q) for q in questions
        ]
        for q in questions:
            print(f"  [Questions] Impact [{idx}]: {q}")

    print("[Analysis] Questions generated — routing to Elicitation for answers")
    return {
        "data_context": data_context.model_dump(),
        "coordinator_phase": "elicitation",
        "node_task": "elicitation:answer_questions",
    }


async def _task_synthesize_and_generate_whatif(
    state: WorkflowState,
    config: RunnableConfig,
    data_context: DataContext,
    model_provider: str,
) -> dict:
    """Task: Synthesize desired behavior from Q&A, then generate What-If questions and route to Elicitation."""
    # Synthesize raw_desired_behavior from Q&A pairs
    for idx, cd in enumerate(data_context.conjectural_data, start=1):
        cd.raw_desired_behavior = await _synthesize_desired_behavior(cd, data_context, model_provider)
        print(f"  [Desired Behavior] Impact [{idx}]: {cd.raw_desired_behavior}")

    # Generate What-If questions per desired behavior
    for idx, cd in enumerate(data_context.conjectural_data, start=1):
        questions = await _generate_whatif_questions(cd, data_context, model_provider)
        cd.raw_uncertainty_questions_answers = [
            QuestionAnswer(question=q) for q in questions
        ]
        for q in questions:
            print(f"  [What-If] Impact [{idx}]: {q}")

    print("[Analysis] What-If questions generated — routing to Elicitation for answers")
    return {
        "data_context": data_context.model_dump(),
        "coordinator_phase": "elicitation",
        "node_task": "elicitation:answer_whatif_questions",
    }


async def _task_identify_uncertainty_and_continue(
    state: WorkflowState,
    config: RunnableConfig,
    data_context: DataContext,
    model_provider: str,
) -> dict:
    """Task: Identify uncertainty from What-If Q&A, then generate hypotheses."""
    # Identify uncertainty from What-If Q&A pairs
    for idx, cd in enumerate(data_context.conjectural_data, start=1):
        cd.raw_uncertainty = await _identify_uncertainty_from_qa(cd, data_context, model_provider)
        print(f"  [Uncertainty] Impact [{idx}]: {cd.raw_uncertainty}")

    # Generate a verifiable experiment hypothesis per impact+uncertainty pair
    hypotheses_list = await _generate_conjectural_hypotheses(data_context, model_provider)
    for cd, hypothesis in zip(data_context.conjectural_data, hypotheses_list):
        cd.raw_supposition_solution = hypothesis
        print(f"  [Hypothesis] {cd.raw_positive_impact!r} → {hypothesis!r}")

    print(f"[Analysis] Completed — {len(data_context.conjectural_data)} conjectural data entries")
    return {
        "data_context": data_context.model_dump(),
        "coordinator_phase": "specification",
        "node_task": None,
        "spec_attempt": 0,
    }


# Task registry: maps task names to handler functions
ANALYSIS_TASKS = {
    "generate_questions": _task_generate_questions,
    "synthesize_and_generate_whatif": _task_synthesize_and_generate_whatif,
    "identify_uncertainty_and_continue": _task_identify_uncertainty_and_continue,
}


async def analysis_node(state: WorkflowState, config: Optional[RunnableConfig] = None):
    """
    Analysis node with task dispatch for multi-turn dialogues.

    Default task (first entry): generate contextual questions and route to Elicitation.
    Dispatched tasks: synthesize desired behavior and continue with uncertainty/hypothesis.
    """
    print("Analysis node started.")
    config = copilotkit_customize_config(config, emit_messages=False)

    context = extract_copilotkit_context(state)
    model_provider = context['model']
    data_context = DataContext.model_validate(state.get("data_context", {}))

    raw_task = state.get("node_task") or ""
    task_name = raw_task.split(":", 1)[1] if raw_task.startswith("analysis:") else None

    if task_name and task_name in ANALYSIS_TASKS:
        handler = ANALYSIS_TASKS[task_name]
        print(f"[Analysis] Dispatching task: {task_name}")
    else:
        handler = ANALYSIS_TASKS["generate_questions"]
        print("[Analysis] Running default task: generate_questions")

    update = await handler(state, config, data_context, model_provider)
    update["messages"] = state.get("messages", [])
    return Command(update=update)
