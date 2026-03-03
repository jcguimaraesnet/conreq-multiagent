"""
Elicitation Node - Extract requirements from input.

This node uses an LLM to extract and generate requirements
based on user input and context. It builds a domain Knowledge Graph
containing entities (Known Knowns and Unknown Knowns) and their
relationships, serialized for downstream nodes.
"""

import asyncio
import json
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

You MUST return ONLY a valid JSON object (no markdown, no explanation) with:
- "stakeholder": the primary stakeholder role identified (string)
- "domain": the project domain identified (string)
- "summary": the concise project summary (string)

If you cannot identify a clear stakeholder, use "end user".
If you cannot identify a clear domain, use "general software".
If no documents are provided, set summary to "No project documentation available.".

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


async def extract_project_context(
    vision_extracted_text: Optional[str],
    existing_requirements: List[Dict[str, Any]],
) -> Dict[str, str]:
    """
    Extract stakeholder, domain, and a concise project summary in a single LLM call.
    The summary replaces the raw vision document in all downstream prompts.
    Falls back to defaults if extraction fails.
    """
    prompt = CONTEXT_EXTRACTION_SYSTEM_PROMPT.format(
        vision_text=vision_extracted_text or "No vision document available.",
        requirements=_format_requirements(existing_requirements),
    )

    model = get_model(temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw_content = _strip_markdown_fences(extract_text(response.content).strip())
        result: Dict[str, str] = json.loads(raw_content)
        return {
            "stakeholder": result.get("stakeholder", "end user"),
            "domain": result.get("domain", "general software"),
            "summary": result.get("summary", "No vision document available."),
        }

    except (json.JSONDecodeError, Exception) as e:
        print(f"Error extracting project context: {e}")
        return {
            "stakeholder": "end user",
            "domain": "general software",
            "summary": "No vision document available.",
        }


KNOWN_KNOWNS_BATCH_SIZE = 10


async def _build_known_knowns_batch(
    batch_entities: List[str],
    project_summary: str,
    batch_number: int,
    total_batches: int,
) -> List[Dict[str, str]]:
    """Process a single batch of entities for Known Knowns mapping."""
    entities_text = "\n".join(f"- {entity}" for entity in batch_entities)

    prompt = KNOWN_KNOWNS_SYSTEM_PROMPT.format(
        entities=entities_text,
        project_summary=project_summary,
    )

    model = get_model(temperature=0)

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

    model = get_model(temperature=0)

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
    config = copilotkit_customize_config(config, emit_messages=False)

    print(f"Elicitation node initialized! (mode: {PROCESSING_MODE})")
    context = extract_copilotkit_context(state)
    require_brief_description = context['require_brief_description']
    current_project_id = context['current_project_id']

    # Fetch vision document text and existing requirements from Supabase
    vision_extracted_text, existing_requirements = await fetch_project_context(
        current_project_id,
        requirement_types=["functional", "non_functional"],
    )

    # Step 1: Extract stakeholder, domain, and project summary (single LLM call)
    # After this step, the raw vision document is no longer used in LLM prompts.
    project_context = await extract_project_context(
        vision_extracted_text, existing_requirements
    )
    stakeholder = project_context["stakeholder"]
    domain = project_context["domain"]
    project_summary = project_context["summary"]
    print(f"[Context] Stakeholder: {stakeholder} | Domain: {domain}")
    print(f"[Context] Project summary ({len(project_summary)} chars): {project_summary[:120]}...")

    # Step 2: Extract domain entities from project summary using NLP (spaCy NER + TF-IDF)
    domain_entities = await extract_domain_entities(project_summary, language="pt")
    print(f"[Step 2] Domain entities extracted: {len(domain_entities)}")

    if PROCESSING_MODE == "extended":
        # Step 3: Build Known Knowns mapping in batches (using project summary)
        known_knowns_raw = await build_known_knowns(
            domain_entities, project_summary
        )

        # Elicitation metrics
        total_entities = len(known_knowns_raw)
        defined_count = sum(1 for kk in known_knowns_raw if kk.get("meaning", "NOT_DEFINED") != "NOT_DEFINED")
        undefined_count = total_entities - defined_count
        elicitation_ratio = defined_count / total_entities if total_entities > 0 else 0.0

        print(f"[Elicitation Metrics] Total entities: {total_entities}")
        print(f"[Elicitation Metrics] Entities with meaning (Known Knowns): {defined_count}")
        print(f"[Elicitation Metrics] Entities without meaning: {undefined_count}")
        print(f"[Elicitation Metrics] Known Knowns ratio: {elicitation_ratio:.2f}")

        # Preview Known Knowns (up to 5)
        kk_preview = [kk for kk in known_knowns_raw if kk.get("meaning", "NOT_DEFINED") != "NOT_DEFINED"][:5]
        for kk in kk_preview:
            print(f"  [Known Known] {kk['entity']}: {kk['meaning'][:80]}...")

        # Step 4: Build Unknown Knowns (persona simulation for undefined entities)
        undefined_entity_names = [
            kk["entity"] for kk in known_knowns_raw if kk.get("meaning", "NOT_DEFINED") == "NOT_DEFINED"
        ]
        unknown_knowns_raw: List[Dict[str, str]] = []

        if undefined_entity_names:
            unknown_knowns_raw = await build_unknown_knowns(
                undefined_entity_names, stakeholder, domain,
                project_summary, existing_requirements,
            )
            print(f"[Unknown Knowns] {len(unknown_knowns_raw)} entities inferred via persona simulation")

            # Preview Unknown Knowns (up to 5)
            for uk in unknown_knowns_raw[:5]:
                print(f"  [Unknown Known] {uk['entity']}: {uk['meaning'][:80]}...")
        else:
            print("[Unknown Knowns] No undefined entities — skipping persona simulation")

        # Step 5: Build EntityNode list (all entities unified, with meanings)
        all_nodes: List[EntityNode] = []

        for kk in known_knowns_raw:
            if kk.get("meaning", "NOT_DEFINED") != "NOT_DEFINED":
                all_nodes.append(EntityNode(entity=kk["entity"], meaning=kk["meaning"], source="extracted"))

        for uk in unknown_knowns_raw:
            if uk.get("meaning", "NOT_INFERRED") != "NOT_INFERRED":
                all_nodes.append(EntityNode(entity=uk["entity"], meaning=uk["meaning"], source="inferred"))

    else:
        # Quick mode: build simple EntityNodes (no LLM meaning extraction)
        all_nodes = [
            EntityNode(entity=e, meaning="", source="extracted")
            for e in domain_entities
        ]

    # Extract entity relations via textacy SVO triples (uses raw vision text, no LLM cost)
    entity_names = {node.entity for node in all_nodes}
    raw_relations = await extract_entity_relations(
        vision_extracted_text, entity_names, language="pt"
    )
    relations = [
        EntityRelation(source=r["source"], target=r["target"], relation=r["relation"])
        for r in raw_relations
    ]
    print(f"[Knowledge Graph] Nodes: {len(all_nodes)} | Edges: {len(relations)}")

    # Preview edges (up to 5)
    for edge in relations[:5]:
        print(f"  {edge.source} --{edge.relation}--> {edge.target}")

    # Step 7: Assemble KnowledgeGraph
    kg = KnowledgeGraph(
        nodes=all_nodes,
        edges=relations,
        stakeholder=stakeholder,
        domain=domain,
    )

    # Validate with NetworkX (in-memory)
    G = to_networkx(kg)
    print(f"[Knowledge Graph] NetworkX DiGraph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    # Handle interrupt for brief description if required
    if require_brief_description == True:
        state["json_brief_description"] = interrupt(
            "Before we start generating requirements, please provide a brief description of your project or requirements context:"
        )

    print("Elicitation node completed.")
    state["step1_elicitation"] = False
    await copilotkit_emit_state(config, state)
    await asyncio.sleep(1)

    # Initialize the model
    model = get_model()

    # Get the conversation context
    messages = state.get('messages', [])
    last_message = str(messages[-1].content) if messages else ""
    print(f"Last message from chat: {last_message}")

    conversation = [SystemMessage(content=ELICITATION_SYSTEM_PROMPT), HumanMessage(content=last_message)]

    try:
        response = await model.ainvoke(conversation, config)

    except Exception as e:
        print(f"Elicitation node error: {e}")
        msg_exception = "I'm sorry, I encountered an error processing your request. How can I help you with requirements engineering today?"
        response = AIMessage(content=msg_exception)

    messages = messages

    return Command(
        update={
            "messages": messages,
            "knowledge_graph": kg_to_state(kg),
            "existing_requirements": existing_requirements,
            "step1_elicitation": True,
            "pending_progress": True,
        }
    )
