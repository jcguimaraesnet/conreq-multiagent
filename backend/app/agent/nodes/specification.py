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
from pydantic import BaseModel, Field

from app.agent.state import WorkflowState
from app.agent.utils.context_utils import extract_copilotkit_context
from app.agent.models.knowledge_graph import (
    KnowledgeGraph,
    kg_from_state,
    kg_to_state,
)


class FERC(BaseModel):
    """Writing Format for Conjectural Requirements."""
    desired_behavior: str = Field(description="The desired system behavior")
    positive_impact: str = Field(description="The need or positive impact of the desired attribute")
    uncertainties: List[str] = Field(description="Uncertainties associated with this requirement")


class QESS(BaseModel):
    """Solution Assumption Experimentation Framework."""
    solution_assumption: str = Field(description="Description of the solution assumption being tested")
    uncertainty_evaluated: str = Field(description="The single uncertainty that will be evaluated")
    observation_analysis: str = Field(description="Observation and analysis that will update the uncertainty")


class ConjecturalRequirement(BaseModel):
    """A conjectural software requirement specified using FERC and QESS."""
    ferc: FERC
    qess: QESS


CONJECTURAL_SPECIFICATION_PROMPT = """You are an expert in software requirements specification with uncertainties.

This app's main goal is to generate a type of software requirements specification with uncertainties,
here called a "conjectural requirement."

## Information Sources

**Project Summary:**
{project_summary}

**Business Domain:** {domain}

**Primary Stakeholder:** {stakeholder}

**Business Objective:** {business_objective}

## Business Needs and Associated Uncertainties

Each conjectural requirement MUST be based on one of the following business needs and its associated uncertainty:

{business_uncertainties_text}

## Instruction

For each business need and its associated uncertainty listed above, generate exactly ONE conjectural requirement specification following the FERC writing format and the QESS framework described below.

The FERC's "desired behavior" should address the business need, the "positive impact" should relate to the business objective, and the "uncertainties" MUST include the associated uncertainty identified above (you may add additional uncertainties if relevant).

The QESS framework should propose an experiment to resolve the associated uncertainty.

Generate exactly {count} conjectural requirement(s) in total.

---

## Template for Conjectural Requirement Specification

**Writing Format for Conjectural Requirements (FERC):**
**It is expected that the software system has** [desired behavior]
**So that** [need or positive impact of the desired attribute]
**However, we do not know:**
- **Uncertainty:** [uncertainty associated with this requirement — one or many]
- **Uncertainty:** [uncertainty associated with this requirement — one or many]

**Solution Assumption Experimentation Framework (QESS):**
**We expect that** [description of the solution assumption]
**Will result in updating the uncertainties about** [only one of the uncertainties that will be evaluated]
**As a result of** [description of the observation and analysis that will result in updating the uncertainties]

---

## Examples

**Example 1:**
FERC:
**It is expected that the software system has** low-cost equipment
**So that** the product can be sold at a lower price than other products currently on the market with similar functions.
**However, we do not know:**
- **Uncertainty:** which equipment (sensors, wearables, cables, connectors, and display) are functional and have the lowest cost.
QESS:
**We expect that** using a finger clip to obtain data on oxygenation, temperature, and heart rate of a patient for display on a screen controlled by a low-cost NodeMCU processor
**Will result in updating the uncertainties about** the low-cost device configuration that will be used for building the software system
**As a result of** observation of the operation of the finger clip oximeter and the data generated.

**Example 2:**
FERC:
**It is expected that the software system has** easy-to-assemble equipment
**So that** the equipment can be assembled quickly by people without electronics knowledge.
**However, we do not know:**
- **Uncertainty:** which cable and connector models facilitate assembly.
- **Uncertainty:** the acceptable assembly time.
QESS:
**We expect that** using a finger clip to obtain data on oxygenation, temperature, and heart rate of a patient for display on a screen controlled by a low-cost NodeMCU processor through a single data cable
**Will result in updating the uncertainties about** the ease of assembly of the low-cost device that will be used for building the software system
**As a result of** observation of the operation of the finger clip oximeter with a single data cable and the data generated.

**Example 3:**
FERC:
**It is expected that the software system has** reliability
**So that** signal measurement is performed without interference from external lighting.
**However, we do not know:**
- **Uncertainty:** which type of device allows measurement without harmful interference.
QESS:
**We expect that** using an elastic wristband with two sensor compartments to obtain data on oxygenation, temperature, and heart rate of a patient for display on a screen controlled by a low-cost NodeMCU processor
**Will result in updating the uncertainties about** the reliability of vital signs measurement (measurement without external interference) of the low-cost device that will be used for building the software system
**As a result of** observation of the operation of the oximeter with the elastic wristband and the data generated.

**Example 4:**
FERC:
**It is expected that the software system has** stability
**So that** signal measurement remains consistent in the same patient over a long period, considering body movements.
**However, we do not know:**
- **Uncertainty:** which sensor models guarantee measurement stability over long periods, considering body movements.
QESS:
**We expect that** using a rigid half-moon shaped wristband with two sensor compartments to obtain data on oxygenation, temperature, and heart rate of a patient for display on a screen controlled by a low-cost NodeMCU processor through a single digital data cable with RJ11 connector
**Will result in updating the uncertainties about** the stability of the sensors on the patient's arm of the low-cost device that will be used for building the software system
**As a result of** observation of the operation of the oximeter with the rigid wristband and the data generated.

---

You MUST return ONLY a valid JSON array with exactly {count} element(s) (no markdown, no explanation) where each element has:
- "ferc": an object with:
  - "desired_behavior": the [desired behavior] part of the FERC (string)
  - "positive_impact": the [need or positive impact] part of the FERC (string)
  - "uncertainties": list of uncertainty strings (array of strings)
- "qess": an object with:
  - "solution_assumption": the [description of the solution assumption] (string)
  - "uncertainty_evaluated": the [one uncertainty that will be evaluated] (string)
  - "observation_analysis": the [observation and analysis description] (string)
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
    await asyncio.sleep(1)

    # Extract quantity_req_batch from context (same logic as elicitation node)
    context = extract_copilotkit_context(state)
    batch_mode = context['batch_mode']
    quantity_req_batch = 1 if batch_mode == False else context['quantity_req_batch']

    # --- Step 1: Retrieve the knowledge graph from state ---
    kg = kg_from_state(state["knowledge_graph"])
    stakeholder = kg.stakeholder
    domain = kg.domain
    project_summary = kg.project_summary
    business_objective = kg.business_objective
    business_uncertainties = kg.business_uncertainties
    print(f"[Specification] Stakeholder: {stakeholder} | Domain: {domain}")
    print(f"[Specification] Project summary ({len(project_summary)} chars): {project_summary[:120]}...")
    print(f"[Specification] Business objective: {business_objective}")
    print(f"[Specification] Business uncertainties ({len(business_uncertainties)}):")
    for bu in business_uncertainties:
        print(f"  [Need] {bu.business_need[:60]} → [Uncertainty] {bu.uncertainty[:80]}")

    # --- Step 3: Call LLM to generate conjectural requirements ---
    business_uncertainties_text = "\n".join(
        f"- **Business Need:** {bu.business_need}\n  **Associated Uncertainty:** {bu.uncertainty}"
        for bu in business_uncertainties
    )
    prompt = CONJECTURAL_SPECIFICATION_PROMPT.format(
        project_summary=project_summary,
        domain=domain,
        stakeholder=stakeholder,
        business_objective=business_objective,
        business_uncertainties_text=business_uncertainties_text,
        count=quantity_req_batch,
    )

    model = get_model(temperature=0)

    conjectural_requirements: List[ConjecturalRequirement] = []

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw_content = _strip_markdown_fences(extract_text(response.content).strip())
        raw_list: List[Dict[str, Any]] = json.loads(raw_content)
        conjectural_requirements = [ConjecturalRequirement.model_validate(item) for item in raw_list]
        print(f"[Specification] Conjectural requirements generated: {len(conjectural_requirements)}")

        for i, cr in enumerate(conjectural_requirements, start=1):
            print(f"  --- Conjectural Requirement #{i} ---")
            print(f"  [FERC] Desired behavior: {cr.ferc.desired_behavior}")
            print(f"  [FERC] Positive impact: {cr.ferc.positive_impact}")
            for j, uncertainty in enumerate(cr.ferc.uncertainties, start=1):
                print(f"  [FERC] Uncertainty {j}: {uncertainty}")
            print(f"  [QESS] Solution assumption: {cr.qess.solution_assumption}")
            print(f"  [QESS] Uncertainty evaluated: {cr.qess.uncertainty_evaluated}")
            print(f"  [QESS] Observation & analysis: {cr.qess.observation_analysis}")

    except (json.JSONDecodeError, Exception) as e:
        print(f"[Specification] Error generating conjectural requirements: {e}")

    # --- Store conjectural requirements in the knowledge graph ---
    kg.conjectural_requirements = [cr.model_dump() for cr in conjectural_requirements]
    print(f"[Specification] Knowledge graph updated with {len(kg.conjectural_requirements)} conjectural requirement(s).")

    messages = state.get("messages", [])

    return Command(
        update={
            "messages": messages,
            "knowledge_graph": kg_to_state(kg),
            "step1_elicitation": True,
            "step2_analysis": True,
            "step3_specification": True,
            "pending_progress": True,
        }
    )