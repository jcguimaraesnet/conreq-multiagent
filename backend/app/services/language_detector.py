"""
Language Detector Service

Detects the language of a given text using the user's configured LLM provider,
returning a locale tag in the format language-country (e.g., pt-br, en-us).
"""

from app.agent.llm_config import get_model, extract_text, LLMProvider


async def detect_language(text: str, provider: LLMProvider = "gemini") -> str | None:
    """
    Detect the language of the given text.

    Returns a locale string like "pt-br", "en-us", "es-es",
    or None if detection fails.
    """
    if not text or not text.strip():
        return None

    # Use only the first 500 characters — enough for reliable detection
    sample = text[:500]

    prompt = f"""Detect the language of the following text and respond with ONLY the locale code in lowercase language-country format (e.g., pt-br, en-us, es-es, fr-fr, de-de). No explanation, no extra text — just the locale code.

Text:
{sample}"""

    try:
        llm = get_model(provider=provider, temperature=0)
        response = await llm.ainvoke(prompt)
        locale = extract_text(response.content).strip().lower()
        # Validate format: xx-xx
        if len(locale) == 5 and locale[2] == "-" and locale[:2].isalpha() and locale[3:].isalpha():
            return locale
        return None
    except Exception:
        return None
