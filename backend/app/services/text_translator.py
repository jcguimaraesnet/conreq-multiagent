"""
Text Translator Service

Translates text to en-US using Google Gemini,
preserving the original formatting and structure.
"""

from google import genai
from app.config import get_settings
from app.agent.llm_config import DEFAULT_GEMINI_MODEL


async def translate_to_english(text: str) -> str:
    """
    Translate the given text to en-US using Gemini.

    Returns the translated text, or the original text
    if translation fails.
    """
    if not text or not text.strip():
        return text

    settings = get_settings()
    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = f"""Translate the following text to American English (en-US).
Preserve the original formatting, structure, paragraph breaks, and any technical terms.
Return ONLY the translated text, with no explanations, notes, or additional commentary.
If the text is already in English, return it unchanged.

Text:
{text}"""

    try:
        response = await client.aio.models.generate_content(
            model=DEFAULT_GEMINI_MODEL,
            contents=prompt,
        )
        translated = response.text.strip()
        if translated:
            return translated
        return text
    except Exception:
        return text
