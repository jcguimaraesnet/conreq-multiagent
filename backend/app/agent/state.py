"""
State definitions for the LangGraph workflow.

Contains the WorkflowState and Step models used across all nodes.
"""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from typing_extensions import NotRequired
from copilotkit import CopilotKitState


class Step(BaseModel):
    """
    A step in a task.
    """
    step1_elicitation: bool = Field(
        default=False,
        description="Whether this step was elicited in step 1"
    )
    step2_analysis: bool = Field(
        default=False,
        description="Whether this step was analyzed in step 2"
    )
    step3_specification: bool = Field(
        default=False,
        description="Whether this step was specified in step 3"
    )
    step4_validation: bool = Field(
        default=False,
        description="Whether this step was validated in step 4"
    )


class IntentClassification(BaseModel):
    """
    Represents the routing decision made by the orchestrator.
    Used for structured LLM output when classifying user intent.
    """
    intent: Literal["conjectural_requirement_generate_response", "generic_response"] = Field(
        description="The classified intent: conjectural_requirement_generate_response for generating conjectural requirements, generic_response for conversational/informational requests"
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Confidence score for the classification (0-1)"
    )
    reasoning: str = Field(
        default="",
        description="Brief explanation of why this intent was classified"
    )


class WorkflowState(CopilotKitState):
    """
    Agent state for requirement workflow with chat support.
    """
    tools: List[Any]

    run_id: Optional[str]
    user_id: str
    project_id: str
    require_brief_description: bool
    batch_mode: bool
    quantity_req_batch: int
    json_brief_description: str

    # Orchestrator routing field
    intent: Optional[str]

    # NLP extracted data
    domain_entities: List[str]

    # Data context: project summary, domain, stakeholder, business objective, positive impacts
    # Serialized from DataContext Pydantic model via .model_dump()
    data_context: Dict[str, Any]

    # Domain knowledge graph: entities (nodes), relations (edges), stakeholder, domain
    # Serialized from KnowledgeGraph Pydantic model via kg_to_state()
    knowledge_graph: Dict[str, Any]

    # Ambiguity analysis results from the analysis node
    ambiguous_terms: List[str]
    non_ambiguity_metric: float

    # Existing functional and non-functional requirements for the current project
    existing_requirements: List[Dict[str, Any]]

    pending_progress: bool
    step1_elicitation: bool
    step2_analysis: bool
    step3_specification: bool
    step4_validation: bool

    # Specification attempt counter (incremented each cycle through specification → validation)
    spec_attempt: int

    # Flags to track evaluation completion (avoid re-evaluation on resume)
    human_evaluated: bool
    llm_evaluated: bool
