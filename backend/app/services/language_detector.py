"""
Language Detector Service

Detects the language of a given text using Google Gemini,
returning a locale tag in the format language-country (e.g., pt-br, en-us).
"""

from google import genai
from app.config import get_settings
from app.agent.llm_config import DEFAULT_GEMINI_FLASH_MODEL


async def detect_language(text: str) -> str | None:
    """
    Detect the language of the given text using Gemini.

    Returns a locale string like "pt-br", "en-us", "es-es",
    or None if detection fails.
    """
    if not text or not text.strip():
        return None

    settings = get_settings()
    client = genai.Client(api_key=settings.gemini_api_key)

    # Use only the first 500 characters — enough for reliable detection
    sample = text[:500]

    prompt = f"""Detect the language of the following text and respond with ONLY the locale code in lowercase language-country format (e.g., pt-br, en-us, es-es, fr-fr, de-de). No explanation, no extra text — just the locale code.

Text:
{sample}"""

    try:
        response = await client.aio.models.generate_content(
            model=DEFAULT_GEMINI_FLASH_MODEL,
            contents=prompt,
        )
        locale = response.text.strip().lower()
        # Validate format: xx-xx
        if len(locale) == 5 and locale[2] == "-" and locale[:2].isalpha() and locale[3:].isalpha():
            return locale
        return None
    except Exception:
        return None
