from dataclasses import dataclass
from typing import Any

from supabase import create_client, Client
from supabase._async.client import create_client as create_async_client, AsyncClient
from app.config import get_settings


@dataclass
class _EmptyResponse:
    """Placeholder for PostgREST 204 (No Content) responses."""
    data: Any = None
    count: Any = None


def safe_maybe_single_execute(query):
    """Execute a query that uses maybe_single(), handling PostgREST 204 responses.

    Local Supabase (PostgREST) returns HTTP 204 when maybe_single() finds no row,
    which causes postgrest-py to either raise an exception or return None.
    This wrapper handles both cases and returns a consistent empty response.
    """
    try:
        result = query.execute()
        if result is None:
            return _EmptyResponse()
        return result
    except Exception as e:
        if "204" in str(e) or "Missing response" in str(e):
            return _EmptyResponse()
        raise


def get_supabase_client() -> Client:
    """Create and return a Supabase client instance with service role key.

    Uses service_role_key to bypass RLS for backend operations.
    Falls back to anon_key if service_role_key is not configured.
    """
    settings = get_settings()
    # Use service role key for backend operations (bypasses RLS)
    # Fall back to anon key if service role key is not set
    key = settings.supabase_service_role_key or settings.next_public_supabase_anon_key
    return create_client(
        settings.next_public_supabase_url,
        key
    )


async def get_async_supabase_client() -> AsyncClient:
    """Create and return an async Supabase client instance with service role key.

    Uses service_role_key to bypass RLS for backend operations.
    Falls back to anon_key if service_role_key is not configured.
    """
    settings = get_settings()
    key = settings.supabase_service_role_key or settings.next_public_supabase_anon_key
    return await create_async_client(
        settings.next_public_supabase_url,
        key
    )
