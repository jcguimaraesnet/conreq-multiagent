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
from app.agent.utils.project_data import fetch_project_context

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

    # Fetch vision document text and existing requirements from Supabase
    vision_extracted_text, existing_requirements = await fetch_project_context(current_project_id)

    # Get the conversation context
    messages = state.get('messages', [])
    last_message = str(messages[-1].content) if messages else ""
    print(f"Last message from chat: {last_message}")

    # Initialize the model
    model = get_model(provider=model_provider, temperature=1.0)

    # Build requirements context from fetched data
    functional = [r for r in existing_requirements if r.get("type") == "functional"]
    non_functional = [r for r in existing_requirements if r.get("type") == "non_functional"]
    conjectural = [r for r in existing_requirements if r.get("type") == "conjectural"]
    requirements_summary = f"{len(functional)} functional, {len(non_functional)} non-functional, {len(conjectural)} conjectural"

    requirements_list = "\n".join(
        f"- [{r.get('requirement_id')}] ({r.get('type')}): {r.get('description')}"
        for r in existing_requirements
    ) if existing_requirements else "No requirements registered yet."

    system_message = SystemMessage(content=GENERIC_RESPONSE_PROMPT.format(
        vision_extracted_text=vision_extracted_text or "No vision document available.",
        requirements_summary=requirements_summary,
        requirements_list=requirements_list,
    ))

    conversation = [system_message] + messages

    try:
        response = await model.ainvoke(conversation, config_internal)
        print(f"Generic response: {extract_text(response.content)[:100]}...")

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

# System prompt for generic conversational responses
GENERIC_RESPONSE_PROMPT = """You are a helpful assistant for a requirements engineering application.

## Rules
- Answer ONLY and EXACTLY what the user asked. Do not add extra information, suggestions, or follow-up questions unless explicitly requested.
- Keep your answer short and direct.
- If the question is unrelated to the software project and its requirements, reply briefly that it is outside your scope.
- Respond in the same language the user is using.
- Base your answer solely on the project context provided below.

## Project Vision Document
{vision_extracted_text}

## Existing Requirements ({requirements_summary})
{requirements_list}
"""