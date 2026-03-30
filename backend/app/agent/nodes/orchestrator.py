"""
Orchestrator Node - Entry point for the workflow with intent classification.

This node analyzes user prompts from the chatbot to determine intent and routes
to either the requirement generation workflow or a generic response node.

Routes:
- requirement_generation: elicitation → analysis → specification → validation → END
- generic_response: generic_node → END
"""

import json
from typing import Optional, Any, cast
from urllib import response

from langchain_core.runnables.config import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage
from app.agent.llm_config import get_model
from copilotkit.langgraph import (
  copilotkit_emit_message, 
  copilotkit_emit_state,
  copilotkit_customize_config, 
  copilotkit_exit
)
from langgraph.types import Command

from app.agent.state import WorkflowState, IntentClassification
from app.agent.utils.context_utils import extract_copilotkit_context
from app.agent.prompts.a01_orchestrator_intent_classification_prompt import ORCHESTRATOR_INTENT_CLASSIFICATION_PROMPT


async def orchestrator_node(state: WorkflowState, config: Optional[RunnableConfig] = None):

    context = extract_copilotkit_context(state)

    print(f"[Orchestrator] CurrentUser Id = {context['current_user_id']}")
    print(f"[Orchestrator] CurrentUser FirstName = {context['current_user_first_name']}")
    print(f"[Orchestrator] CurrentProjectId = {context['current_project_id']}")
    if not context.get("current_project_id"):
        raise ValueError("current_project_id is required but was not provided. Please select a project before proceeding.")
    print(f"[Orchestrator] model = {context['model']}")

    if config is None:
        config = RunnableConfig(recursion_limit=25)

    # await copilotkit_emit_message(config, "Routing your message...")
    state["pending_progress"] = False
    await copilotkit_emit_state(config, state)

    # Extract the last user message for classification
    messages = state.get('messages', [])
    last_message = str(messages[-1].content) if messages else ""
    print(f"[Orchestrator] Last message from chat: {last_message}")
    
    config_internal = copilotkit_customize_config(config, emit_messages=False)

    # model = ChatOpenAI(model="gpt-4o")
    # prompt = "Randomly return one of the two words: left_intent or right_intent. Be very strict, returning only one of the two words."
    # response = await model.ainvoke(prompt, config_internal)

    # Classify the intent
    classification = await classify_intent(last_message, config_internal, context['model'])
    print(f"[Orchestrator] Intent classification result: {classification}")

    # Route based on intent
    if classification.intent == "conjectural_requirement_generate_response":
        return Command(
            update={
                "messages": messages,
                "intent": classification.intent,
                "coordinator_phase": "elicitation",
                "step1_elicitation": False,
                "step2_analysis": False,
                "step3_specification": False,
                "step4_validation": False,
                "pending_progress": True,
            }
        )
    else:
        # Route to generic node for conversational response
        return Command(
            update={
                "messages": messages,
                "intent": classification.intent,
                "pending_progress": False,
            }
        )


async def classify_intent(user_input: str, config: Optional[RunnableConfig] = None, model_provider: str = "gemini") -> IntentClassification:
    """
    Use LLM to classify the user's intent from their message.
    
    Args:
        user_input: The user's message to classify
        config: Optional RunnableConfig for the LLM call
        
    Returns:
        IntentClassification with intent, confidence, and reasoning
    """

    config_internal = copilotkit_customize_config(config, emit_messages=False)

    if not user_input or user_input.strip() == "":
        # Empty message defaults to generic response
        return IntentClassification(
            intent="generic_response",
            confidence=1.0,
            reasoning="Empty or whitespace-only message"
        )
    
    model = get_model(provider=model_provider)

    # Use structured output for reliable classification
    structured_model = cast(Any, model).with_structured_output(IntentClassification)
    
    prompt = ORCHESTRATOR_INTENT_CLASSIFICATION_PROMPT.format(user_input=user_input)

    try:
        result = await structured_model.ainvoke([
            SystemMessage(content=prompt),
            HumanMessage(content=user_input),
        ], config_internal)
        return IntentClassification(**dict(result))
    
    except Exception as e:
        # On error, default to generic response
        print(f"Intent classification error: {e}")
        return IntentClassification(
            intent="generic_response",
            confidence=0.5,
            reasoning=f"Classification failed, defaulting to generic: {str(e)}"
        )

