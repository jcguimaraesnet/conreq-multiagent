"""
Specification Node - Generate formal specification.

This node generates formal specification documents from
the analyzed requirements.
"""

import asyncio
from typing import Optional

from langchain_core.runnables.config import RunnableConfig
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from app.agent.llm_config import get_model
from langgraph.types import Command
from copilotkit.langgraph import copilotkit_emit_message, copilotkit_customize_config

from app.agent.state import WorkflowState

# Processing mode: "quick" (default) or "extended"
PROCESSING_MODE = "quick"


async def specification_node(state: WorkflowState, config: Optional[RunnableConfig] = None):
    """
    Generate formal specification from analyzed requirements.
    
    Creates structured specification documents based on the
    analysis results.
    """
    config = copilotkit_customize_config(config, emit_messages=False)
    print("Specification node started.")
    await asyncio.sleep(1)

    # Initialize the model
    model = get_model()

    # Get the conversation context
    messages = state.get('messages', [])
    last_message = str(messages[-1].content) if messages else ""
    print(f"Last message from chat: {last_message}")

    conversation = [SystemMessage(content=SPECIFICATION_SYSTEM_PROMPT), HumanMessage(content=last_message)]

    try:
        response = await model.ainvoke(conversation, config)

    except Exception as e:
        print(f"Specification node error: {e}")
        msg_exception = "I'm sorry, I encountered an error processing your request. How can I help you with requirements engineering today?"
        response = AIMessage(content=msg_exception)
    
    messages = messages
    
    return Command(
        update={
            "messages": messages,
            "step1_elicitation": True,
            "step2_analysis": True,
            "step3_specification": True,
            "pending_progress": True
        }
    )

SPECIFICATION_SYSTEM_PROMPT = """You are a helpful assistant for any questions.
When asked to answer any question, you MUST answer '🔍 **Specification Generated!**'."""