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
from typing import Optional, List

from langchain_core.runnables.config import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.agent.llm_config import get_model, extract_text, LLMProvider
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
from app.agent.models.data_context import DataContext, ConjecturalData, QuestionAnswer
from app.agent.prompts.factory import get_prompt
from app.agent.prompts.b01_elicitation_refine_business_need_prompt import ELICITATION_REFINE_BUSINESS_NEED_PROMPT
from app.agent.prompts.b02_elicitation_generate_business_need_prompt import ELICITATION_GENERATE_BUSINESS_NEED_PROMPT
from app.agent.prompts.b03_elicitation_answer_contextual_questions_prompt import ELICITATION_ANSWER_CONTEXTUAL_QUESTIONS_PROMPT
from app.agent.prompts.b04_elicitation_answer_whatif_questions_prompt import ELICITATION_ANSWER_WHATIF_QUESTIONS_PROMPT
from app.services.embedding_service import (
    generate_embeddings,
    fetch_existing_embeddings,
    select_most_diverse,
    select_most_diverse_among,
    is_similar_to_existing,
)


# Processing mode: "quick" (default) or "extended"
# Quick  → Steps 1-2 only (1 LLM call + NLP), simple KnowledgeGraph
# Extended → Steps 1-7 (multiple LLM calls), full KnowledgeGraph with meanings
PROCESSING_MODE = "quick"




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


async def refine_business_needs(
    brief_descriptions: List[str],
    data_context: "DataContext",
    model_provider: LLMProvider,
    project_id: Optional[str] = None,
) -> tuple[List[str], List[int]]:
    """
    Refine user-provided brief descriptions into elaborated business need
    statements using LLM + project context.

    After refinement, checks each business need against existing embeddings in the DB.
    If a refined business need is too similar to an existing one, falls back to
    generate_business_needs (3 candidates, pick most diverse).

    Returns (refined_list, similarity_percentages).
    """
    if not brief_descriptions:
        return [], []

    descriptions_text = "\n".join(
        f"{i + 1}. {desc}" for i, desc in enumerate(brief_descriptions)
    )
    prompt = get_prompt(ELICITATION_REFINE_BUSINESS_NEED_PROMPT, data_context.language).format(
        domain=data_context.domain,
        stakeholder=data_context.stakeholder,
        business_objective=data_context.business_objective,
        project_summary=data_context.project_summary,
        brief_descriptions=descriptions_text,
        quantity=len(brief_descriptions),
        language=data_context.language,
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
                print(f"[Business Need] Checking {len(results)} refined business need(s) against {len(existing_embs)} existing embedding(s)...")
                try:
                    refined_embeddings = await generate_embeddings(results)
                except Exception as e:
                    print(f"[Business Need] Error generating embeddings for similarity check: {e}")
                    return results, similarities

                for i, (refined_emb, refined_text) in enumerate(zip(refined_embeddings, list(results))):
                    if is_similar_to_existing(refined_emb, existing_embs):
                        print(f"  [Business Need] Refined business need #{i+1} is too similar to existing. Falling back to generation...")
                        fallback = await generate_business_needs(1, data_context, model_provider, project_id)
                        if fallback:
                            results[i] = fallback[0]
                            similarities[i] = 0  # auto-generated, not user-refined

        return results, similarities

    except (json.JSONDecodeError, Exception) as e:
        print(f"[Business Need] Error refining brief descriptions: {e}")
        return list(brief_descriptions), [100] * len(brief_descriptions)


async def generate_business_needs(
    quantity: int,
    data_context: "DataContext",
    model_provider: LLMProvider,
    project_id: Optional[str] = None,
) -> List[str]:
    """
    Generate business need statements from scratch using LLM +
    project context. Generates quantity*3 candidates, then selects the
    `quantity` most diverse via embedding similarity against existing
    requirements in the database. Returns a list of business need strings.
    """
    candidate_count = quantity * 3
    print(f"[Business Need] Generating {candidate_count} candidates (quantity={quantity} x 3)...")

    # Build exclusion list from existing business needs (top 10 most diverse among themselves)
    exclusion_list_text = ""
    if project_id:
        existing_rows = await fetch_existing_embeddings(project_id)
        existing_with_text = [r for r in existing_rows if r.get("embedding") and r.get("business_need")]
        if existing_with_text:
            texts = [r["business_need"] for r in existing_with_text]
            embs = [r["embedding"] for r in existing_with_text]
            max_exclusion = min(10, len(texts))
            diverse_indices = select_most_diverse_among(texts, embs, max_exclusion)
            exclusion_items = [texts[i] for i in diverse_indices]
            print(f"[Business Need] Exclusion list ({len(exclusion_items)} items):")
            for item in exclusion_items:
                print(f"  - {item}")
            exclusion_list_text = "\n".join(f"- {item}" for item in exclusion_items)

    prompt = get_prompt(ELICITATION_GENERATE_BUSINESS_NEED_PROMPT, data_context.language).format(
        quantity=candidate_count,
        project_summary=data_context.project_summary,
        domain=data_context.domain,
        business_objective=data_context.business_objective,
        stakeholder=data_context.stakeholder,
        exclusion_list=exclusion_list_text,
        language=data_context.language,
    )

    model = get_model(provider=model_provider, temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw = _strip_markdown_fences(extract_text(response.content).strip())
        candidates: List[str] = json.loads(raw)
    except (json.JSONDecodeError, Exception) as e:
        print(f"[Business Need] Error generating business needs: {e}")
        return []

    if not candidates:
        return []

    print(f"[Business Need] Got {len(candidates)} candidates. Selecting {quantity} most diverse...")

    # Generate embeddings for all candidates
    try:
        candidate_embeddings = await generate_embeddings(candidates)
    except Exception as e:
        print(f"[Business Need] Error generating embeddings, falling back to first {quantity}: {e}")
        return candidates[:quantity]

    # Fetch existing embeddings from the database
    existing_rows = await fetch_existing_embeddings(project_id) if project_id else []
    existing_embeddings = [row["embedding"] for row in existing_rows if row.get("embedding")]
    print(f"[Business Need] Found {len(existing_embeddings)} existing embedding(s) in DB for comparison")

    # Select the most diverse candidates
    selected_indices = select_most_diverse(candidates, candidate_embeddings, existing_embeddings, quantity)

    # Log all candidates with their max similarity against existing embeddings
    if existing_embeddings:
        from app.services.embedding_service import _cosine_similarity
        print(f"[Business Need] All candidates and their max similarity to existing embeddings:")
        for i, (text, c_emb) in enumerate(zip(candidates, candidate_embeddings)):
            max_sim = max(_cosine_similarity(c_emb, e_emb) for e_emb in existing_embeddings)
            marker = " <-- SELECTED" if i in selected_indices else ""
            print(f"  [{i}] (max_sim={max_sim:.4f}) {text}{marker}")
    else:
        print(f"[Business Need] All candidates (no existing embeddings for comparison):")
        for i, text in enumerate(candidates):
            marker = " <-- SELECTED" if i in selected_indices else ""
            print(f"  [{i}] {text}{marker}")

    return [candidates[i] for i in selected_indices]



async def _answer_contextual_questions(
    data_context: DataContext,
    model_provider: LLMProvider,
) -> List[List[str]]:
    """Call the LLM to answer contextual questions for each business need. Returns list of lists of answer strings (index-aligned)."""
    all_answers: List[List[str]] = []

    for cd in data_context.conjectural_data:
        questions = [qa.question for qa in cd.raw_desired_behavior_questions_answers]
        if not questions:
            all_answers.append([])
            continue

        questions_text = "\n".join(f"{i + 1}. {q}" for i, q in enumerate(questions))

        prompt = get_prompt(ELICITATION_ANSWER_CONTEXTUAL_QUESTIONS_PROMPT, data_context.language).format(
            business_need=cd.raw_business_need,
            questions=questions_text,
            project_summary=data_context.project_summary,
            domain=data_context.domain,
            stakeholder=data_context.stakeholder,
            business_objective=data_context.business_objective,
            language=data_context.language,
        )

        model = get_model(provider=model_provider, temperature=0)

        try:
            response = await model.ainvoke([HumanMessage(content=prompt)])
            raw = _strip_markdown_fences(extract_text(response.content).strip())
            answers: List[str] = json.loads(raw)
            all_answers.append(answers)
        except (json.JSONDecodeError, Exception) as e:
            print(f"[Elicitation] Error answering contextual questions: {e}")
            all_answers.append(["Unable to generate answer."] * len(questions))

    return all_answers


async def _task_answer_questions(
    state: WorkflowState,
    config: RunnableConfig,
    data_context: DataContext,
    model_provider: LLMProvider,
) -> dict:
    """Task: Answer contextual questions generated by Analysis."""
    print(f"[Elicitation] Answering contextual questions for {len(data_context.conjectural_data)} business need(s)")

    answers_list = await _answer_contextual_questions(data_context, model_provider)
    for idx, (cd, answers) in enumerate(zip(data_context.conjectural_data, answers_list), start=1):
        for qa, answer in zip(cd.raw_desired_behavior_questions_answers, answers):
            qa.answer = answer
            print(f"  [Answer] Business Need [{idx}]: Q: {qa.question}")
            print(f"  [Answer] Business Need [{idx}]: A: {answer}")

    print("[Elicitation] Questions answered — routing back to Analysis")
    return {
        "data_context": data_context.model_dump(),
        "coordinator_phase": "analysis",
        "node_task": "analysis:generate_desired_behavior_and_whatif_questions",
    }


async def _answer_whatif_questions(
    data_context: DataContext,
    model_provider: LLMProvider,
) -> List[List[str]]:
    """Call the LLM to answer What-If questions for each desired behavior. Returns list of lists of answer strings (index-aligned)."""
    all_answers: List[List[str]] = []

    for cd in data_context.conjectural_data:
        questions = [qa.question for qa in cd.raw_uncertainty_questions_answers]
        if not questions:
            all_answers.append([])
            continue

        questions_text = "\n".join(f"{i + 1}. {q}" for i, q in enumerate(questions))

        prompt = get_prompt(ELICITATION_ANSWER_WHATIF_QUESTIONS_PROMPT, data_context.language).format(
            desired_behavior=cd.raw_desired_behavior,
            questions=questions_text,
            project_summary=data_context.project_summary,
            domain=data_context.domain,
            stakeholder=data_context.stakeholder,
            business_objective=data_context.business_objective,
            language=data_context.language,
        )

        model = get_model(provider=model_provider, temperature=0)

        try:
            response = await model.ainvoke([HumanMessage(content=prompt)])
            raw = _strip_markdown_fences(extract_text(response.content).strip())
            try:
                answers: List[str] = json.loads(raw)
            except json.JSONDecodeError:
                # Try extracting just the first valid JSON value (ignores trailing text)
                answers, _ = json.JSONDecoder().raw_decode(raw)
            all_answers.append(answers)
        except (json.JSONDecodeError, Exception) as e:
            print(f"[Elicitation] Error answering What-If questions: {e}")
            all_answers.append(["Unable to generate answer."] * len(questions))

    return all_answers


async def _task_answer_whatif_questions(
    state: WorkflowState,
    config: RunnableConfig,
    data_context: DataContext,
    model_provider: LLMProvider,
) -> dict:
    """Task: Answer What-If questions generated by Analysis for uncertainty identification."""
    print(f"[Elicitation] Answering What-If questions for {len(data_context.conjectural_data)} business need(s)")

    answers_list = await _answer_whatif_questions(data_context, model_provider)
    for idx, (cd, answers) in enumerate(zip(data_context.conjectural_data, answers_list), start=1):
        for qa, answer in zip(cd.raw_uncertainty_questions_answers, answers):
            qa.answer = answer
            print(f"  [What-If Answer] Business Need [{idx}]: Q: {qa.question}")
            print(f"  [What-If Answer] Business Need [{idx}]: A: {answer}")

    print("[Elicitation] What-If questions answered — routing back to Analysis")
    return {
        "data_context": data_context.model_dump(),
        "coordinator_phase": "analysis",
        "node_task": "analysis:generate_uncertainty_and_supposition_solution",
    }


async def _task_generate_business_needs(
    state: WorkflowState,
    config: RunnableConfig,
    data_context: DataContext,
    model_provider: LLMProvider,
) -> dict:
    """Task: Generate or refine business need statements (default full flow)."""
    context = extract_copilotkit_context(state)
    require_brief_description = context['require_brief_description']
    current_project_id = context['current_project_id']
    quantity_req_batch = context['quantity_req_batch']
    spec_attempts = context["spec_attempts"]
    print(f"[Elicitation] require_brief_description = {context['require_brief_description']}")
    print(f"[Elicitation] require_evaluation = {context['require_evaluation']}")
    print(f"[Elicitation] quantity_req_batch = {context['quantity_req_batch']}")
    print(f"[Elicitation] spec_attempts = {spec_attempts}")
    print(f"[Elicitation] model = {model_provider}")

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

    # Build fresh DataContext from database (ignores parameter — first entry has no data_context)
    data_context = DataContext(
        vision_raw=vision_extracted_text,
        project_summary=project_summary,
        domain=domain,
        stakeholder=stakeholder,
        business_objective=business_objective,
        language=language,
    )

    messages = state.get("messages", [])

    # Obtain business need statements
    # If user provides brief descriptions → refine via LLM + compute similarity
    # Otherwise → generate from scratch via LLM using project context
    business_needs: List[str] = []
    similarity: List[int] = []
    if require_brief_description == True:
        payload = interrupt(
            {"type": "hitl_brief_description", "quantity_req_batch": quantity_req_batch},
        )
        print(f"[Elicitation] payload: {payload}")

        interrupt_message = "📝 **User input** received successfully. Please wait while it is processed."
        messages = messages + [AIMessage(content=interrupt_message)]
        await copilotkit_emit_message(config, interrupt_message)

        brief_descriptions: List[str] = payload.get("brief_descriptions", [])
        print(f"[Business Need] Received {len(brief_descriptions)} brief description(s) from user.")

        if brief_descriptions:
            business_needs, similarity = await refine_business_needs(brief_descriptions, data_context, model_provider, project_id=current_project_id)
            for bn in business_needs:
                print(f"  [Business Need Refined] {bn}")
    else:
        print("[Business Need] Generating business needs from project context...")
        business_needs = await generate_business_needs(quantity_req_batch, data_context, model_provider, project_id=current_project_id)
        similarity = [0] * len(business_needs)
        for bn in business_needs:
            print(f"  [Business Need Generated] {bn}")

    data_context.conjectural_data = [
        ConjecturalData(raw_business_need=bn, raw_business_need_similarity=sim)
        for bn, sim in zip(business_needs, similarity)
    ]
    print(f"[Business Need] Total: {len(business_needs)} statement(s)")

    return {
        "messages": messages,
        "data_context": data_context.model_dump(),
        "coordinator_phase": "analysis",
    }


# Task registry: maps task names to handler functions
ELICITATION_TASKS = {
    "generate_business_needs": _task_generate_business_needs,
    "answer_questions": _task_answer_questions,
    "answer_whatif_questions": _task_answer_whatif_questions,
}


async def elicitation_node(state: WorkflowState, config: Optional[RunnableConfig] = None):
    """
    Elicitation node with task dispatch.

    Default task (first entry): generate positive business impacts.
    Dispatched tasks: answer contextual questions, answer What-If questions.
    """
    print("Elicitation node started.")
    config = copilotkit_customize_config(config, emit_messages=False)

    context = extract_copilotkit_context(state)
    model_provider = context['model']
    data_context = DataContext.model_validate(state.get("data_context", {}))

    raw_task = state.get("node_task") or ""
    task_name = raw_task.split(":", 1)[1] if raw_task.startswith("elicitation:") else None

    if task_name and task_name in ELICITATION_TASKS:
        handler = ELICITATION_TASKS[task_name]
        print(f"[Elicitation] Dispatching task: {task_name}")
    else:
        handler = ELICITATION_TASKS["generate_business_needs"]
        print("[Elicitation] Running default task: generate_business_needs")

    update = await handler(state, config, data_context, model_provider)
    if "messages" not in update:
        update["messages"] = state.get("messages", [])
    return Command(update=update)
