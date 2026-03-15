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


async def orchestrator_node(state: WorkflowState, config: Optional[RunnableConfig] = None):

    context = extract_copilotkit_context(state)

    print(f"CurrentUser Id = {context['current_user_id']}")
    print(f"CurrentUser FirstName = {context['current_user_first_name']}")
    print(f"CurrentProjectId = {context['current_project_id']}")
    print(f"require_brief_description = {context['require_brief_description']}")
    print(f"require_evaluation = {context['require_evaluation']}")
    print(f"quantity_req_batch = {context['quantity_req_batch']}")
    print(f"model = {context['model']}")

    if config is None:
        config = RunnableConfig(recursion_limit=25)

    # await copilotkit_emit_message(config, "Routing your message...")
    state["pending_progress"] = False
    await copilotkit_emit_state(config, state)

    # run_id = config["metadata"]["run_id"] if "metadata" in config and "run_id" in config["metadata"] else "unknown_run_id"
    # state["run_id"] = run_id
    # print(f"run id orchestrator: {run_id}")
    # await copilotkit_emit_state(config, state)

    # Extract the last user message for classification
    print("Run id state before classification:", state.get("run_id", "No run_id in state"))
    messages = state.get('messages', [])
    last_message = str(messages[-1].content) if messages else ""
    print(f"Last message from chat: {last_message}")
    
    print(f"Last message from chat: {last_message}")

    config_internal = copilotkit_customize_config(config, emit_messages=False)

    # model = ChatOpenAI(model="gpt-4o")
    # prompt = "Randomly return one of the two words: left_intent or right_intent. Be very strict, returning only one of the two words."
    # response = await model.ainvoke(prompt, config_internal)

    # Classify the intent
    classification = await classify_intent(last_message, config_internal, context['model'])
    print(f"Intent classification result: {classification}")

    # Route based on intent
    if classification.intent == "conjectural_requirement_generate_response":
        return Command(
            update={
                "messages": messages,
                "intent": classification.intent,
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
    
    prompt = INTENT_CLASSIFICATION_PROMPT.format(user_input=user_input)

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

# System prompt for intent classification
INTENT_CLASSIFICATION_PROMPT = """You are an intent classifier for a conjectural requirements engineering chatbot called "Conjectural Assist".

Your task is to analyze the user's message and determine their intent:

1. **conjectural_requirement_generate_response**: The user wants to generate conjectural requirements specs for a software project.
   Examples:
   - "generate conjectural requirements"
   - "create conjectural requirements for my project"
   - "generate conjectural requirements"
   - "gerar requisitos conjecturais" (Portuguese)
   - "start conjectural requirements generation"
   - "I need conjectural requirements for my software"
   - "help me with conjectural requirements generation"

2. **generic_response**: The user wants to find general information about the current project (information query only)
   Examples:
   - "How many requirements there are?"
   - "Are there any conjectural requirements? How many?"
   - "Tell me about the project"
   - "How many functional requirements there are"

Be strict with `conjectural_requirement_generate_response` - the user needs to mention both of the following words:

1 - "conjectural requirement"
2 - "create" (or synonyms: generate, build, elaborate, etc.)

If in doubt, use `generic_response` as the default.

Analyze the following user message and classify the intent:
User message: {user_input}

Respond with a JSON object containing:
- intent: "conjectural_requirement_generate_response" or "generic_response"
- confidence: a number between 0 and 1
- reasoning: brief explanation of your classification
"""