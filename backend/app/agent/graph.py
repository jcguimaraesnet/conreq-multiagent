"""
LangGraph Agent Definition - Orchestrated Workflow

Workflow for requirement elicitation and validation in Conjectural Assist.
The orchestrator node classifies user intent and routes to the appropriate workflow.

Flow:
  orchestrator → [DECISION]
                    ├── (conjectural_requirement_generate_response) → elicitation → analysis → specification ⇄ validation → final → END
                    │                                                                          (loops up to 3 attempts)
                    └── (generic_response) → generic → END
"""

import os

from langgraph.graph import START, END, StateGraph

from app.agent.state import WorkflowState
from app.agent.nodes import (
    orchestrator_node,
    elicitation_node,
    analysis_node,
    specification_node,
    validation_node,
    generic_node,
    final_node
)


def route_after_orchestrator(state: WorkflowState) -> str:
    """
    Routing function for conditional edges after orchestrator node.
    
    Routes based on the intent classification stored in state:
    - conjectural_requirement_generate_response: routes to elicitation workflow
    - generic_response: routes to generic node
    """
    intent = state.get("intent", "")
    if intent == "conjectural_requirement_generate_response":
        return "elicitation_node"
    return "generic_node"


def route_after_validation(state: WorkflowState) -> str:
    """
    Routing function for conditional edges after validation node.

    Routes back to specification for another attempt if spec_attempt < spec_attempts,
    otherwise proceeds to final_node.
    """
    from app.agent.utils.context_utils import extract_copilotkit_context
    context = extract_copilotkit_context(state)
    spec_attempts = context.get("spec_attempts", 3)
    spec_attempt = state.get("spec_attempt", 0)
    if spec_attempt < spec_attempts:
        return "specification_node"
    return "final_node"


def create_graph():
    workflow = StateGraph(WorkflowState)

    # Add nodes
    workflow.add_node("orchestrator_node", orchestrator_node)
    workflow.add_node("elicitation_node", elicitation_node)
    workflow.add_node("analysis_node", analysis_node)
    workflow.add_node("specification_node", specification_node)
    workflow.add_node("validation_node", validation_node)
    workflow.add_node("generic_node", generic_node)
    workflow.add_node("final_node", final_node)

    # Set entry point to orchestrator
    workflow.set_entry_point("orchestrator_node")
    workflow.add_edge(START, "orchestrator_node")
    
    # Conditional routing from orchestrator based on intent
    workflow.add_conditional_edges(
        "orchestrator_node",
        route_after_orchestrator,
        {
            "elicitation_node": "elicitation_node",
            "generic_node": "generic_node"
        }
    )

    # Sequential edges for the conjectural requirement pipeline
    workflow.add_edge("elicitation_node", "analysis_node")
    workflow.add_edge("analysis_node", "specification_node")
    workflow.add_edge("specification_node", "validation_node")

    # Conditional routing after validation: retry specification or finish
    workflow.add_conditional_edges(
        "validation_node",
        route_after_validation,
        {
            "specification_node": "specification_node",
            "final_node": "final_node",
        }
    )

    workflow.add_edge("final_node", END)
    workflow.add_edge("generic_node", END)

    # Conditionally use a checkpointer based on the environment
    is_fast_api = os.environ.get("LANGGRAPH_FAST_API", "false").lower() == "true"

    # Compile the graph
    if is_fast_api:
        # For CopilotKit and other contexts, use MemorySaver
        from langgraph.checkpoint.memory import MemorySaver
        memory = MemorySaver()
        return workflow.compile(checkpointer=memory)
    else:
        # When running in LangGraph API/dev, don't use a custom checkpointer
        return workflow.compile()

# Export the compiled graph
graph = create_graph()
