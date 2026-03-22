"""
Text Translator Service

Translates text to en-US using the user's configured LLM provider,
preserving the original formatting and structure.
"""

from app.agent.llm_config import get_model, extract_text, LLMProvider


async def translate_to_english(text: str, provider: LLMProvider = "gemini") -> str:
    """
    Translate the given text to en-US.

    Returns the translated text, or the original text
    if translation fails.
    """
    if not text or not text.strip():
        return text

    prompt = f"""Translate the following text to American English (en-US).
Preserve the original formatting, structure, paragraph breaks, and any technical terms.
Return ONLY the translated text, with no explanations, notes, or additional commentary.
If the text is already in English, return it unchanged.

Text:
{text}"""

    try:
        llm = get_model(provider=provider, temperature=0)
        response = await llm.ainvoke(prompt)
        translated = extract_text(response.content).strip()
        if translated:
            return translated
        return text
    except Exception:
        return text
