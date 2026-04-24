"""
Centralized plain-text logging configuration.

Shared by both the FastAPI backend and the LangGraph agent.
Each service calls setup_logging(service=...) once at startup,
producing human-readable lines to stdout. Fluent Bit collects the
Docker json-file wrapper and ships the raw line to Elasticsearch.
"""

import logging
import sys
import os


class _PlainTextFormatter(logging.Formatter):
    """Plain-text formatter that also flattens structlog event_dicts.

    Structlog configured with `ProcessorFormatter.wrap_for_formatter` expects the
    stdlib handler to use `ProcessorFormatter`; when it doesn't, the event_dict
    leaks through as `record.msg` and renders as an ugly Python dict repr.
    We detect that case and flatten it to `event key=value key=value`.
    """

    _DROP_KEYS = {"event", "timestamp", "level", "logger"}

    def format(self, record: logging.LogRecord) -> str:
        if isinstance(record.msg, dict):
            payload = dict(record.msg)
            event = payload.pop("event", "")
            for k in ("timestamp", "level", "logger"):
                payload.pop(k, None)
            kvs = " ".join(f"{k}={v}" for k, v in payload.items())
            record.msg = f"{event} {kvs}".strip()
            record.args = None
        return super().format(record)


_configured = False


def setup_logging(service: str = "backend") -> None:
    """Configure all loggers to emit plain text to stdout.

    Idempotent: the first caller wins. This matters because the agent's
    graph module calls setup_logging(service="agent") on import, and the
    backend's main.py imports that module transitively — without this guard
    the backend's `[backend]` label gets overwritten to `[agent]`.
    """
    global _configured
    if _configured:
        return
    _configured = True

    level = os.environ.get("LOG_LEVEL", "INFO").upper()

    formatter = _PlainTextFormatter(fmt="%(message)s")

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    # Root logger
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(getattr(logging, level, logging.INFO))

    # Override uvicorn loggers so they also emit JSON
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        uv_logger = logging.getLogger(name)
        uv_logger.handlers.clear()
        uv_logger.addHandler(handler)
        uv_logger.propagate = False


def get_logger(name: str) -> logging.Logger:
    """Return a named logger (call after setup_logging)."""
    return logging.getLogger(name)
