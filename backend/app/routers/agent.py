"""
Agent Router

Exposes the LangGraph agent via FastAPI endpoints.
Compatible with CopilotKit's LangGraphAgent integration.
"""

from typing import Any, Dict, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from copilotkit import CopilotKitSDK, LangGraphAGUIAgent
from copilotkit.integrations.fastapi import add_fastapi_endpoint

from app.agent import graph


router = APIRouter(prefix="/agent", tags=["Agent"])


# ============================================================================
# Pydantic Models
# ============================================================================

class ChatMessage(BaseModel):
    """A single chat message."""
    role: str  # "user", "assistant", "system"
    content: str


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    messages: list[ChatMessage]
    thread_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    message: ChatMessage
    thread_id: str


# ============================================================================
# CopilotKit SDK Setup
# ============================================================================

# Initialize CopilotKit SDK with our LangGraph agent
sdk = CopilotKitSDK(
    agents=[
        LangGraphAGUIAgent(
            name="conjec-req-agent",
            description="A requirements engineering assistant that can specify conjectural requirements for a software project.",
            graph=graph,
        )
    ]
)


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("")
async def agent_endpoint(request: Request):
    """
    Main agent endpoint compatible with CopilotKit.
    Handles the AG-UI protocol for streaming agent responses.
    """
    body = await request.json()
    return await sdk.handle_request(body)


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Simple chat endpoint for direct interaction with the agent.
    Use this for testing or non-streaming interactions.
    """
    try:
        # Convert messages to LangChain format
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages
        ]
        
        # Generate thread_id if not provided
        thread_id = request.thread_id or str(uuid4())
        
        # Invoke the graph
        config = {"configurable": {"thread_id": thread_id}}
        result = await graph.ainvoke(
            {"messages": messages},
            config=config
        )
        
        # Extract the last assistant message
        last_message = result["messages"][-1]
        
        return ChatResponse(
            message=ChatMessage(
                role="assistant",
                content=last_message.content
            ),
            thread_id=thread_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def agent_health():
    """Health check for the agent service."""
    return {
        "status": "healthy",
        "agent": "conjec-req-agent",
        "tools": ["analyze_requirement", "classify_requirement", "suggest_acceptance_criteria"]
    }


@router.get("/info")
async def agent_info():
    """Get information about the available agent and its capabilities."""
    return {
        "name": "conjec-req-agent",
        "description": "A requirements engineering assistant for the Conjectural Assist application.",
        "capabilities": [
            {
                "name": "analyze_requirement",
                "description": "Analyze a requirement text and provide feedback on its quality."
            },
            {
                "name": "classify_requirement", 
                "description": "Classify a requirement as Functional, Non-Functional, or Conjectural."
            },
            {
                "name": "suggest_acceptance_criteria",
                "description": "Generate acceptance criteria suggestions for a given requirement."
            }
        ],
        "model": "gpt-4o-mini (configurable via OPENAI_MODEL env var)"
    }
