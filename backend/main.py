"""
Conjectural Assist Backend API

FastAPI application for handling project and requirement management,
including document processing and AI-powered requirement extraction.
"""

from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import projects, requirements, conjectural_requirements, agent, dashboard


# Initialize settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="CONREQ Multi-Agent API",
    description="Backend API for CONREQ Multi-Agent - An approach to generating software requirements specifications with uncertainty.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(projects.router, prefix="/api")
app.include_router(requirements.router, prefix="/api")
app.include_router(conjectural_requirements.router, prefix="/api")
app.include_router(agent.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint - API health check."""
    return {
        "message": f"CONREQ Multi-Agent - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
