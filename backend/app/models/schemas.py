"""
Pydantic schemas for request/response models.
"""

from enum import Enum
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


# Enums
class RequirementType(str, Enum):
    FUNCTIONAL = "functional"
    NON_FUNCTIONAL = "non_functional"
    CONJECTURAL = "conjectural"


class NFRCategory(str, Enum):
    INTEROPERABILITY = "interoperability"
    RELIABILITY = "reliability"
    PERFORMANCE = "performance"
    AVAILABILITY = "availability"
    SCALABILITY = "scalability"
    MAINTAINABILITY = "maintainability"
    PORTABILITY = "portability"
    SECURITY = "security"
    USABILITY = "usability"
    REGULATORY = "regulatory"
    CONSTRAINT = "constraint"


# Requirement Models
class FunctionalRequirement(BaseModel):
    id: str = Field(..., description="Requirement ID (e.g., REQ-F001)")
    description: str = Field(..., description="Requirement description")


class NonFunctionalRequirement(BaseModel):
    id: str = Field(..., description="Requirement ID (e.g., REQ-NF001)")
    description: str = Field(..., description="Requirement description")
    category: NFRCategory = Field(..., description="NFR category")


class ExtractedRequirements(BaseModel):
    functional: list[FunctionalRequirement] = Field(default_factory=list)
    non_functional: list[NonFunctionalRequirement] = Field(default_factory=list)


# Vision Document Models
class VisionExtractionResponse(BaseModel):
    text: str = Field(..., description="Extracted text from vision document")
    metadata: dict = Field(default_factory=dict, description="PDF metadata")
    char_count: int = Field(..., description="Character count of extracted text")
    page_count: int = Field(..., description="Number of pages in the document")


# Project Models
class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    vision_document_name: Optional[str] = None
    vision_extracted_text: Optional[str] = None
    requirements_document_name: Optional[str] = None


class ProjectResponse(BaseModel):
    id: UUID
    user_id: UUID
    project_id: Optional[str]
    title: str
    description: Optional[str]
    author_first_name: Optional[str] = None
    author_last_name: Optional[str] = None
    vision_document_name: Optional[str]
    vision_extracted_text: Optional[str]
    summary: Optional[str] = None
    business_domain: Optional[str] = None
    business_objective: Optional[str] = None
    stakeholder: Optional[str] = None
    requirements_document_name: Optional[str]
    # Note: document data fields are excluded from response to avoid large payloads
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RequirementCounts(BaseModel):
    functional: int = 0
    non_functional: int = 0
    conjectural: int = 0


class ProjectDetailsResponse(ProjectResponse):
    requirement_counts: RequirementCounts


# Requirement Database Models
class RequirementCreate(BaseModel):
    project_id: UUID
    requirement_id: str = Field(..., description="External ID like REQ-F001")
    type: RequirementType
    description: str
    category: Optional[NFRCategory] = None


class RequirementResponse(BaseModel):
    id: UUID
    project_id: UUID
    requirement_id: str
    type: RequirementType
    description: str
    category: Optional[NFRCategory]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# API Response Models
class SuccessResponse(BaseModel):
    success: bool = True
    message: str


class ProjectCreatedResponse(BaseModel):
    success: bool = True
    project_id: UUID
    message: str = "Project created successfully"
    requirements_count: int = 0
