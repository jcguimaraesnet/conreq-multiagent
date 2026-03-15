"""
Final Node - Executes after validation to call the consoleLog tool.

This node calls the consoleLog tool with a celebratory message
after the validation step completes successfully.
"""

from typing import Optional

from langchain_core.runnables.config import RunnableConfig
from langchain_core.messages import HumanMessage
from app.agent.llm_config import get_model
from langgraph.types import Command

from app.agent.state import WorkflowState
from app.agent.utils.context_utils import extract_copilotkit_context


async def final_node(state: WorkflowState, config: Optional[RunnableConfig] = None):
    """
    Final node that calls the consoleLog tool with 'Woww!' message.

    Runs after validation_node and ends the workflow.
    """
    messages = state.get("messages", [])

    context = extract_copilotkit_context(state)
    model_provider = context['model']
    model = get_model(provider=model_provider, temperature=0)
    model_with_tools = model.bind_tools(
        [
            *state.get("tools", []),
        ],
    )

    response = await model_with_tools.ainvoke(
        [
            HumanMessage(content="CALL consoleLog tool with message: Woww!"),
        ],
        config,
    )

    messages = messages + [response]

    return Command(
        update={
            "messages": messages,
        }
    )
