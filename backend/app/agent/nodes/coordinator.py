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

# Progress messages for each phase (normal flow)
PHASE_MESSAGES = {
    "elicitation": "Generating positive business impacts...",
    "analysis": "Analyzing and generating contextual questions...",
    "specification": "Generating conjectural requirements...",
    "validation": "Evaluating requirements quality...",
    "done": "",
}

# Progress messages for multi-turn dialogue tasks
TASK_MESSAGES = {
    "elicitation:answer_questions": "Answering contextual questions...",
    "elicitation:answer_whatif_questions": "Answering What-If questions...",
    "analysis:synthesize_and_generate_whatif": "Synthesizing desired behavior...",
    "analysis:identify_uncertainty_and_continue": "Identifying uncertainties...",
}


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
    node_task = state.get("node_task")
    print(f"[Coordinator] Current phase: {phase}")

    # Multi-turn dialogue routing: when node_task is set, a dialogue is in progress.
    # Emit state for frontend awareness but keep step flags consistent (analysis still in progress).
    if node_task:
        print(f"[Coordinator] Dialogue routing: phase={phase}, node_task={node_task}")
        msg = TASK_MESSAGES.get(node_task, PHASE_MESSAGES.get(phase, ""))
        state["pending_progress"] = True
        state["progress_message"] = msg

        # Set step flags based on which node is about to run,
        # so the frontend progress indicator reflects the active node.
        if phase == "elicitation":
            state["step1_elicitation"] = False
            state["step2_analysis"] = False
        elif phase == "analysis":
            state["step1_elicitation"] = True
            state["step2_analysis"] = False

        await copilotkit_emit_state(config, state)
        return Command(
            update={
                "pending_progress": True,
                "progress_message": msg,
                "step1_elicitation": state["step1_elicitation"],
                "step2_analysis": state["step2_analysis"],
            }
        )

    msg = PHASE_MESSAGES.get(phase, "")

    if phase == "elicitation":
        state["pending_progress"] = True
        state["step1_elicitation"] = False
        state["progress_message"] = msg
        await copilotkit_emit_state(config, state)
        return Command(
            update={
                "pending_progress": True,
                "step1_elicitation": False,
                "progress_message": msg,
            }
        )

    elif phase == "analysis":
        state["step1_elicitation"] = True
        state["step2_analysis"] = False
        state["pending_progress"] = True
        state["progress_message"] = msg
        await copilotkit_emit_state(config, state)
        return Command(
            update={
                "step1_elicitation": True,
                "step2_analysis": False,
                "pending_progress": True,
                "progress_message": msg,
            }
        )

    elif phase == "specification":
        state["step1_elicitation"] = True
        state["step2_analysis"] = True
        state["step3_specification"] = False
        state["pending_progress"] = True
        state["progress_message"] = msg
        await copilotkit_emit_state(config, state)
        return Command(
            update={
                "step1_elicitation": True,
                "step2_analysis": True,
                "step3_specification": False,
                "pending_progress": True,
                "progress_message": msg,
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
        state["progress_message"] = msg
        await copilotkit_emit_state(config, state)
        return Command(
            update={
                "step1_elicitation": True,
                "step2_analysis": True,
                "step3_specification": True,
                "step4_validation": False,
                "pending_progress": True,
                "spec_attempt": new_spec_attempt,
                "progress_message": msg,
            }
        )

    elif phase == "done":
        state["step1_elicitation"] = True
        state["step2_analysis"] = True
        state["step3_specification"] = True
        state["step4_validation"] = True
        state["pending_progress"] = False
        state["progress_message"] = msg
        await copilotkit_emit_state(config, state)
        return Command(
            update={
                "step1_elicitation": True,
                "step2_analysis": True,
                "step3_specification": True,
                "step4_validation": True,
                "pending_progress": False,
                "progress_message": msg,
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
