"""
Coordinator Node - Central hub for the conjectural requirement pipeline.

This node acts as the hub in a hub-and-spoke architecture, controlling the
sequential flow through Elicitation → Analysis → Specification → Validation,
managing step flags, pending_progress, and the specification/validation loop.

Flow:
  Coordinator ←→ Elicitation
              ←→ Analysis
              ←→ Specification
              ←→ Validation
              → END
"""

from typing import Optional

from langchain_core.runnables.config import RunnableConfig
from langgraph.types import Command
from copilotkit.langgraph import copilotkit_emit_state, copilotkit_customize_config

from app.agent.state import WorkflowState


async def coordinator_node(state: WorkflowState, config: Optional[RunnableConfig] = None):
    """
    Central coordinator that routes to worker nodes based on the current phase.

    Reads coordinator_phase from state and:
    - Sets step flags and pending_progress centrally
    - Routing is handled by route_after_coordinator in graph.py via conditional edges
    - Controls the specification/validation loop via spec_attempt
    """
    config = copilotkit_customize_config(config, emit_messages=False)

    phase = state.get("coordinator_phase", "elicitation")
    print(f"[Coordinator] Current phase: {phase}")

    if phase == "elicitation":
        state["pending_progress"] = True
        state["step1_elicitation"] = False
        await copilotkit_emit_state(config, state)
        return Command(
            update={
                "pending_progress": True,
                "step1_elicitation": False,
            }
        )

    elif phase == "analysis":
        state["step1_elicitation"] = True
        state["step2_analysis"] = False
        state["pending_progress"] = True
        await copilotkit_emit_state(config, state)
        return Command(
            update={
                "step1_elicitation": True,
                "step2_analysis": False,
                "pending_progress": True,
            }
        )

    elif phase == "specification":
        state["step1_elicitation"] = True
        state["step2_analysis"] = True
        state["step3_specification"] = False
        state["pending_progress"] = True
        await copilotkit_emit_state(config, state)
        return Command(
            update={
                "step1_elicitation": True,
                "step2_analysis": True,
                "step3_specification": False,
                "pending_progress": True,
            }
        )

    elif phase == "validation":
        new_spec_attempt = state.get("spec_attempt", 0) + 1
        state["step1_elicitation"] = True
        state["step2_analysis"] = True
        state["step3_specification"] = True
        state["step4_validation"] = False
        state["pending_progress"] = True
        state["spec_attempt"] = new_spec_attempt
        await copilotkit_emit_state(config, state)
        return Command(
            update={
                "step1_elicitation": True,
                "step2_analysis": True,
                "step3_specification": True,
                "step4_validation": False,
                "pending_progress": True,
                "spec_attempt": new_spec_attempt,
            }
        )

    elif phase == "done":
        state["step1_elicitation"] = True
        state["step2_analysis"] = True
        state["step3_specification"] = True
        state["step4_validation"] = True
        state["pending_progress"] = False
        await copilotkit_emit_state(config, state)
        return Command(
            update={
                "step1_elicitation": True,
                "step2_analysis": True,
                "step3_specification": True,
                "step4_validation": True,
                "pending_progress": False,
            }
        )

    else:
        print(f"[Coordinator] Unknown phase: {phase}, defaulting to done")
        return Command(
            update={
                "coordinator_phase": "done",
                "step1_elicitation": True,
                "step2_analysis": True,
                "step3_specification": True,
                "step4_validation": True,
                "pending_progress": False,
            }
        )
