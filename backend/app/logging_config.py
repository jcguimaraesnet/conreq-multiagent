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


def setup_logging(service: str = "backend") -> None:
    """Configure all loggers to emit plain text to stdout."""
    level = os.environ.get("LOG_LEVEL", "INFO").upper()

    formatter = logging.Formatter(
        fmt=f"%(asctime)s %(levelname)-8s [{service}] %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

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
