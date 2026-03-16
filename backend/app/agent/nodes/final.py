"""
Final Node - Executes after validation to call the consoleLog tool.

This node calls the consoleLog tool with a celebratory message
after the validation step completes successfully.
"""

from typing import Optional

from langchain_core.runnables.config import RunnableConfig
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage
from langchain_core.tools import tool
from app.agent.llm_config import get_model
from langgraph.types import Command

from app.agent.state import WorkflowState
from app.agent.utils.context_utils import extract_copilotkit_context
from copilotkit.langgraph import copilotkit_customize_config, copilotkit_emit_state, copilotkit_emit_message


# @tool
# def show_requirements(json_requirements: str):
#     """Tool function to show requirements, called from the final node."""
#     # get current state
#     return "Conjectural requirements are created successfully!"

@tool
def show_requirements(requirement_ids: str):
    """Tool function to show requirements, called from the final node."""
    # get current state
    return {"message1": "Wow1!", "message2": "Wow2!"}


async def final_node(state: WorkflowState, config: Optional[RunnableConfig] = None):
    """
    Final node that calls the consoleLog tool with 'Woww!' message.
    """
    # config = copilotkit_customize_config(config, emit_messages=False, emit_tool_calls=False)

    if config is None:
        config = RunnableConfig(recursion_limit=25)

    context = extract_copilotkit_context(state)
    model_provider = context['model']
    model = get_model(provider=model_provider, temperature=0)
    model_with_tools = model.bind_tools([show_requirements, *state.get("tools", [])])

    data_context = state.get("data_context", {})
    conjectural_data = data_context.get("conjectural_data", [])

    requirements_by_index: dict[str, list[dict]] = {}
    for idx, entry in enumerate(conjectural_data, start=1):
        key = f"requirement{idx}"
        attempts = []
        for cr in entry.get("conjectural_requirements", []):
            ferc = cr.get("ferc", {})
            qess = cr.get("qess", {})
            attempts.append({
                "requirement_number": idx,
                "attempt": cr.get("attempt", 1),
                "desired_behavior": ferc.get("desired_behavior", ""),
                "positive_impact": ferc.get("positive_impact", ""),
                "uncertainties": ", ".join(ferc.get("uncertainties", [])),
                "solution_assumption": qess.get("solution_assumption", ""),
                "uncertainty_evaluated": qess.get("uncertainty_evaluated", ""),
                "observation_analysis": qess.get("observation_analysis", ""),
            })
        requirements_by_index[key] = attempts

    import json
    json_requirements = json.dumps(requirements_by_index)
    print("json_requirements", json_requirements)

    # get IDs of best (rank = 1) conjectural requirements of conjectural_data and pass to tool
    best_requirement_ids = []
    for entry in conjectural_data:
        for cr in entry.get("conjectural_requirements", []):
            if cr.get("ranking") == 1 and cr.get("db_id"):
                best_requirement_ids.append(cr["db_id"])


    response = await model_with_tools.ainvoke(
        [
            # HumanMessage(content=f"You ONLY should CALL show_requirements tool with json_requirements: {json_requirements}"),
            # HumanMessage(content=f"You ONLY should CALL show_requirements tool with json_requirements: {json_requirements}"),
            HumanMessage(content=f"You ONLY should CALL show_requirements tool with requirement_ids: {json.dumps(best_requirement_ids) }"),
        ],
        config,
    )

    messages_to_add = [response]
    print("[Final node] response", response)

    for tc in getattr(response, "tool_calls", []) or []:
        print("[Final node] tc=", tc)
        if tc["name"] == "show_requirements":
            # Execute the tool (args shape must match your tool definition)
            result = show_requirements.invoke(tc["args"])  # returns {"message1": ..., "message2": ...}
            print("[Final node] result=", result)
            # messages_to_add.append(
            #     ToolMessage(content=json.dumps(result), tool_call_id=tc["id"])  # MUST match tc id
            # )
            messages_to_add = messages_to_add + [
                ToolMessage(content=json.dumps(result), tool_call_id=tc["id"])  # MUST match tc id
            ]
            print("[Final node] messages_to_add=", messages_to_add)

    return Command(
        update={
            "messages": state.get("messages", []) + messages_to_add,
        }
    )
