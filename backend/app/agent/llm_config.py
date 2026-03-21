"""
LLM Configuration — centralised model factory.

Allows every agent node to obtain a ChatModel instance without
hard-coding the provider.  Change DEFAULT_LLM_PROVIDER to switch
the whole pipeline between OpenAI and Google Gemini.
"""

import os
from contextvars import ContextVar
from typing import Any, Literal, Optional

from pydantic import SecretStr
from langchain_openai import AzureChatOpenAI, ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from google.genai.types import AutomaticFunctionCallingConfig

# ---------------------------------------------------------------------------
# Provider / model constants
# ---------------------------------------------------------------------------

LLMProvider = Literal["gpt", "gemini", "gpt_azure", "llama_azure"]

DEFAULT_LLM_PROVIDER: LLMProvider = "gemini"
DEFAULT_OPENAI_MODEL = "gpt-4o"
DEFAULT_GEMINI_MODEL = "gemini-3-pro-preview"
DEFAULT_GEMINI_FLASH_MODEL = "gemini-2.5-flash"
DEFAULT_AZURE_OPENAI_MODEL = "gpt-4o"
DEFAULT_AZURE_OPENAI_JUDGE_MODEL = "gpt-5.4-pro-deployment"
DEFAULT_AZURE_AI_MODEL = "Llama-3.3-70B-Instruct"

# ---------------------------------------------------------------------------
# Per-request provider (set once in orchestrator, read by all nodes)
# ---------------------------------------------------------------------------

_current_provider: ContextVar[LLMProvider] = ContextVar(
    "_current_provider", default=DEFAULT_LLM_PROVIDER
)


def set_model_provider(provider: LLMProvider):
    """Set the LLM provider for the current async context (request)."""
    _current_provider.set(provider)


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
    provider : "gpt" | "gemini" | "gpt_azure" | "llama_azure" | None
        Which LLM backend to use.  Defaults to the per-request provider
        set via ``set_model_provider()``, or ``DEFAULT_LLM_PROVIDER``.
    model : str | None
        Model name override.  When *None* the provider default is used.
    temperature : float
        Sampling temperature forwarded to the model.
    """
    provider = provider or _current_provider.get()

    if provider == "gpt":
        return ChatOpenAI(
            model=model or DEFAULT_OPENAI_MODEL,
            temperature=temperature,
        )

    if provider == "gpt_azure":
        azure_openai_key = os.environ.get("AZURE_OPENAI_API_KEY")
        return AzureChatOpenAI(
            azure_deployment=os.environ.get(
                "AZURE_OPENAI_DEPLOYMENT_NAME", model or DEFAULT_AZURE_OPENAI_MODEL
            ),
            azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
            api_key=SecretStr(azure_openai_key) if azure_openai_key else None,
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2025-04-01-preview"),
            use_responses_api=True,
            # temperature=temperature # não suporta em nenhum modelo
        )

    if provider == "llama_azure":
        azure_ai_key = os.environ.get("AZURE_AI_API_KEY")
        return ChatOpenAI(
            model=model or DEFAULT_AZURE_AI_MODEL,
            base_url=os.environ["AZURE_AI_ENDPOINT"],
            api_key=SecretStr(azure_ai_key) if azure_ai_key else None,
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
