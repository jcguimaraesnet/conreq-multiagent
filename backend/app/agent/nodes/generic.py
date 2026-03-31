"""
Generic Node - Handles non-requirement conversational responses.

This node processes general questions, greetings, help requests, and
informational queries that don't require the full requirement generation workflow.
"""

from typing import Optional

from langchain_core.runnables.config import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.agent.llm_config import get_model, extract_text
from langgraph.graph import END
from langgraph.types import Command
from copilotkit.langgraph import copilotkit_customize_config, copilotkit_emit_message

from app.agent.state import WorkflowState
from app.agent.utils.context_utils import extract_copilotkit_context
from app.agent.utils.project_data import fetch_project_summary
from app.agent.prompts.f01_generic_tool_followup_prompt import GENERIC_TOOL_FOLLOWUP_PROMPT
from app.agent.prompts.f02_generic_response_prompt import GENERIC_RESPONSE_PROMPT

async def generic_node(state: WorkflowState, config: Optional[RunnableConfig] = None):
    """
    Generic response node for conversational interactions.

    Handles greetings, help requests, informational queries, and any
    messages that don't require the requirement generation workflow.

    This node ends the workflow after responding.
    """
    config_internal = copilotkit_customize_config(config, emit_messages=True)

    context = extract_copilotkit_context(state)
    current_project_id = context['current_project_id']
    model_provider = context['model']
    provider_param = "gpt_azure" if model_provider == "llama_azure" else model_provider

    # Fetch vision document text and requirement counts from Supabase
    project_summary = await fetch_project_summary(current_project_id)

    # Get the conversation context
    messages = state.get('messages', [])
    last_message = str(messages[-1].content) if messages else ""
    print(f"Last message from chat: {last_message}")

    # Initialize the model with frontend tools
    model = get_model(provider=provider_param, temperature=1.0)
    all_tools = state.get("tools", [])
    frontend_tools = all_tools
    if frontend_tools:
        model = model.bind_tools(frontend_tools)

    # Build requirements summary from counts
    requirements_summary = (
        f"{project_summary.functional_count} functional, "
        f"{project_summary.non_functional_count} non-functional, "
        f"{project_summary.conjectural_count} conjectural"
    )

    system_message = SystemMessage(content=GENERIC_RESPONSE_PROMPT.format(
        project_title=project_summary.title or "current project",
        vision_extracted_text=project_summary.vision_extracted_text or "No vision document available.",
        requirements_summary=requirements_summary,
    ))

    conversation = [system_message] + messages

    try:
        response = await model.ainvoke(conversation, config_internal)
        print(f"Generic response: {extract_text(response.content)[:100]}...")

        # If the LLM returned only a tool call with no text, generate a friendly follow-up message
        if hasattr(response, 'tool_calls') and response.tool_calls and not extract_text(response.content).strip():
            tool_call = response.tool_calls[0]
            tool_name = tool_call.get("name", "")
            tool_args = tool_call.get("args", {})

            followup_model = get_model(provider=provider_param, temperature=1.0)
            followup_prompt = GENERIC_TOOL_FOLLOWUP_PROMPT.format(
                tool_name=tool_name,
                tool_args=tool_args,
                last_message=last_message,
            )
            followup_response = await followup_model.ainvoke(
                [SystemMessage(content=followup_prompt)],
                config_internal,
            )
            followup_response.content = extract_text(followup_response.content)
            return Command(
                update={
                    "messages": messages + [followup_response, response]
                }
            )

    except Exception as e:
        print(f"Generic node error: {e}")
        msg_exception = "I'm sorry, I encountered an error processing your request. How can I help you with requirements engineering today?"
        response = AIMessage(content=msg_exception)

    response.content = extract_text(response.content)

    return Command(
        update={
            "messages": messages + [response]
        }
    )

