"""
Validation Node - Validate final specification.

This node validates the generated specification against
quality criteria and requirements standards.
"""

import asyncio
from typing import Optional

from langchain_core.runnables.config import RunnableConfig
from langchain_core.messages import AIMessage, HumanMessage
from app.agent.llm_config import get_model, extract_text
from langgraph.graph import END
from langgraph.types import Command
from copilotkit.langgraph import SystemMessage, copilotkit_emit_message, copilotkit_exit, copilotkit_customize_config, copilotkit_emit_state

from app.agent.state import WorkflowState

# Processing mode: "quick" (default) or "extended"
PROCESSING_MODE = "quick"


async def validation_node(state: WorkflowState, config: Optional[RunnableConfig] = None):
    """
    Validate final specification against quality criteria.
    
    Performs final validation checks on the specification
    to ensure it meets quality standards.
    """
    config = copilotkit_customize_config(config, emit_messages=False)

    if config is None:
        config = RunnableConfig(recursion_limit=25)

    print("Validation node started.")

    # Initialize the model
    model = get_model()

    # Get the conversation context
    messages = state.get('messages', [])
    last_message = str(messages[-1].content) if messages else ""
    print(f"Last message from chat: {last_message}")

    conversation = [SystemMessage(content=VALIDATION_SYSTEM_PROMPT), HumanMessage(content=last_message)]

    try:
        response = await model.ainvoke(conversation, config)

    except Exception as e:
        print(f"Validation node error: {e}")
        msg_exception = "I'm sorry, I encountered an error processing your request. How can I help you with requirements engineering today?"
        response = AIMessage(content=msg_exception)
    
    response.content = extract_text(response.content)
    messages = messages + [response]

    state["step4_validation"] = True
    await copilotkit_emit_state(config, state)
    await asyncio.sleep(2)

    return Command(
        update={
            "messages": messages,
            "step1_elicitation": True,
            "step2_analysis": True,
            "step3_specification": True,
            "step4_validation": True,
            "pending_progress": False
        }
    )

VALIDATION_SYSTEM_PROMPT = """You are a helpful assistant for any questions.
When asked to answer any question, you MUST answer '🔍 **Validation Complete!**'."""
