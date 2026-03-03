"""
LLM Configuration — centralised model factory.

Allows every agent node to obtain a ChatModel instance without
hard-coding the provider.  Change DEFAULT_LLM_PROVIDER to switch
the whole pipeline between OpenAI and Google Gemini.
"""

import os
from typing import Any, Literal, Optional

from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from google.genai.types import AutomaticFunctionCallingConfig

# ---------------------------------------------------------------------------
# Provider / model constants
# ---------------------------------------------------------------------------

LLMProvider = Literal["openai", "gemini"]

DEFAULT_LLM_PROVIDER: LLMProvider = "gemini"
DEFAULT_OPENAI_MODEL = "gpt-4o"
DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview"


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_model(
    provider: Optional[LLMProvider] = None,
    model: Optional[str] = None,
    temperature: float = 1.0,
):
    """Return a LangChain ChatModel for the chosen provider.

    Parameters
    ----------
    provider : "openai" | "gemini" | None
        Which LLM backend to use.  Defaults to ``DEFAULT_LLM_PROVIDER``.
    model : str | None
        Model name override.  When *None* the provider default is used.
    temperature : float
        Sampling temperature forwarded to the model.
    """
    provider = provider or DEFAULT_LLM_PROVIDER

    if provider == "openai":
        return ChatOpenAI(
            model=model or DEFAULT_OPENAI_MODEL,
            temperature=temperature,
        )

    if provider == "gemini":
        llm = ChatGoogleGenerativeAI(
            model=model or DEFAULT_GEMINI_MODEL,
            temperature=temperature,
            api_key=os.environ.get("GEMINI_API_KEY"),
        )
        # Disable Automatic Function Calling (AFC) — the google-genai SDK
        # defaults to AFC with 10 remote calls, which adds latency.
        # Using .bind() injects this kwarg into every invoke/ainvoke call,
        # reaching GenerateContentConfig where it is actually honoured.
        return llm.bind(
            automatic_function_calling=AutomaticFunctionCallingConfig(
                disable=True,
            ),
        )

    raise ValueError(f"Unsupported LLM provider: {provider!r}")


def extract_text(content: Any) -> str:
    """Extract plain text from an LLM response content field.

    OpenAI returns ``str``; Gemini may return a list of content blocks
    like ``[{"type": "text", "text": "..."}]``.  This helper normalises
    both into a plain string.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and "text" in block:
                parts.append(block["text"])
            elif isinstance(block, str):
                parts.append(block)
        return "\n".join(parts)
    return str(content)
