"""
Requirement Extractor Service

Uses pdfplumber for table extraction and Google Gemini for AI-powered
requirement extraction from PDF documents.
"""

import io
import json
import pdfplumber
from google import genai
from app.config import get_settings
from app.agent.llm_config import DEFAULT_GEMINI_FLASH_MODEL
from app.models.schemas import (
    FunctionalRequirement,
    NonFunctionalRequirement,
    ExtractedRequirements,
    NFRCategory,
)


def extract_tables_from_pdf(file_content: bytes) -> list[list[list[str]]]:
    """
    Extract all tables from a PDF document using pdfplumber.
    
    Args:
        file_content: The PDF file content as bytes.
        
    Returns:
        A list of tables, where each table is a list of rows,
        and each row is a list of cell values.
    """
    tables = []
    
    with pdfplumber.open(io.BytesIO(file_content)) as pdf:
        for page in pdf.pages:
            page_tables = page.extract_tables()
            if page_tables:
                for table in page_tables:
                    # Clean up table data
                    cleaned_table = []
                    for row in table:
                        cleaned_row = [
                            cell.strip() if cell else "" 
                            for cell in row
                        ]
                        # Skip empty rows
                        if any(cell for cell in cleaned_row):
                            cleaned_table.append(cleaned_row)
                    if cleaned_table:
                        tables.append(cleaned_table)
    
    return tables


def extract_text_from_pdf_plumber(file_content: bytes) -> str:
    """
    Extract text from PDF using pdfplumber (better for structured documents).
    
    Args:
        file_content: The PDF file content as bytes.
        
    Returns:
        The extracted text as a string.
    """
    text_parts = []
    
    with pdfplumber.open(io.BytesIO(file_content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    
    return "\n\n".join(text_parts)


async def extract_requirements_with_ai(file_content: bytes) -> ExtractedRequirements:
    """
    Extract functional and non-functional requirements from a PDF using AI.
    
    This function first extracts tables and text from the PDF using pdfplumber,
    then uses Google Gemini to analyze and structure the requirements.
    
    Args:
        file_content: The PDF file content as bytes.
        
    Returns:
        ExtractedRequirements containing lists of functional and non-functional requirements.
    """
    settings = get_settings()
    
    # Configure Gemini client
    client = genai.Client(api_key=settings.gemini_api_key)
    
    # Extract content from PDF
    tables = extract_tables_from_pdf(file_content)
    text = extract_text_from_pdf_plumber(file_content)
    
    # Prepare content for AI analysis
    content_parts = []
    
    if text:
        content_parts.append(f"Document Text:\n{text}")
    
    if tables:
        tables_text = []
        for i, table in enumerate(tables, 1):
            table_str = f"\nTable {i}:\n"
            for row in table:
                table_str += " | ".join(row) + "\n"
            tables_text.append(table_str)
        content_parts.append(f"Extracted Tables:{chr(10).join(tables_text)}")
    
    document_content = "\n\n".join(content_parts)
    
    # AI prompt for requirement extraction
    prompt = f"""Analyze the following document content and extract software requirements.

IMPORTANT: Extract requirements EXACTLY as they appear in the document. Do not invent or modify requirements.

Categorize each requirement as either:
1. Functional Requirement (FR): Features and behaviors the system must have
2. Non-Functional Requirement (NFR): Quality attributes and constraints

For Non-Functional Requirements, assign one of these categories:
- interoperability: Integration with other systems
- reliability: System dependability and fault tolerance
- performance: Speed, throughput, response time
- availability: System uptime and accessibility
- scalability: Ability to handle growth
- maintainability: Ease of maintenance and updates
- portability: Ability to run on different platforms
- security: Protection of data and access control
- usability: User experience and ease of use
- regulatory: Legal and compliance requirements
- constraint: Technical or business constraints

Document Content:
{document_content}

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{{
    "functional": [
        {{"id": "REQ-F001", "description": "requirement description"}}
    ],
    "non_functional": [
        {{"id": "REQ-NF001", "description": "requirement description", "category": "category_name"}}
    ]
}}

If no requirements are found, return empty arrays. Ensure all IDs are unique and follow the pattern REQ-FXXX for functional and REQ-NFXXX for non-functional requirements."""

    # Call Gemini API
    response = await client.aio.models.generate_content(
        model=DEFAULT_GEMINI_FLASH_MODEL,
        contents=prompt
    )
    response_text = response.text.strip()
    
    # Clean up response (remove markdown code blocks if present)
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        # Remove first and last lines (``` markers)
        lines = [l for l in lines if not l.strip().startswith("```")]
        response_text = "\n".join(lines)
    
    # Parse JSON response
    try:
        data = json.loads(response_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse AI response as JSON: {str(e)}")
    
    # Convert to Pydantic models
    functional_reqs = []
    for req in data.get("functional", []):
        functional_reqs.append(FunctionalRequirement(
            id=req.get("id", ""),
            description=req.get("description", "")
        ))
    
    non_functional_reqs = []
    for req in data.get("non_functional", []):
        category_str = req.get("category", "constraint").lower()
        try:
            category = NFRCategory(category_str)
        except ValueError:
            category = NFRCategory.CONSTRAINT
            
        non_functional_reqs.append(NonFunctionalRequirement(
            id=req.get("id", ""),
            description=req.get("description", ""),
            category=category
        ))
    
    return ExtractedRequirements(
        functional=functional_reqs,
        non_functional=non_functional_reqs
    )
