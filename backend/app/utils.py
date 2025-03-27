# backend/app/utils.py
import string
import os
from fastapi import Request # Ensure Request is imported if needed, though we might not use it now
import logging # Add logging

logger = logging.getLogger(__name__)

# Characters to use for base62 encoding
BASE62_CHARS = string.digits + string.ascii_letters # 0-9a-zA-Z
BASE = len(BASE62_CHARS)

def encode_base62(num: int) -> str:
    """Encodes a non-negative integer into a base62 string."""
    if num == 0:
        return BASE62_CHARS[0]
    if num < 0:
        raise ValueError("Cannot encode negative numbers.")

    encoded = ""
    while num > 0:
        num, rem = divmod(num, BASE)
        encoded = BASE62_CHARS[rem] + encoded
    return encoded

# --- NEW VERSION ---
def generate_full_short_url(short_code: str) -> str:
    """
    Generates the full clickable short URL using environment variables.
    Prioritizes PUBLIC_URL (for production), then DEV_PUBLIC_URL (for local dev).
    """
    # 1. Use PUBLIC_URL if defined (for production)
    base_url = os.getenv("PUBLIC_URL")

    # 2. Fallback to DEV_PUBLIC_URL if PUBLIC_URL is not set (for local dev)
    if not base_url:
        base_url = os.getenv("DEV_PUBLIC_URL")

    # 3. If neither is set, log a warning and use a sensible default (or raise error)
    if not base_url:
        default_local_url = "http://localhost:3000" # Default for local setup
        logger.warning(
            f"Neither PUBLIC_URL nor DEV_PUBLIC_URL environment variables are set. "
            f"Falling back to default '{default_local_url}'. Set DEV_PUBLIC_URL in your .env file for local development."
        )
        base_url = default_local_url
        # Alternatively, raise an error if you want to force configuration:
        # raise ValueError("Missing required environment variable: PUBLIC_URL or DEV_PUBLIC_URL")

    # Ensure base_url ends with a slash
    if not base_url.endswith('/'):
        base_url += '/'

    # Append the short code
    full_url = f"{base_url}{short_code}"
    logger.debug(f"Generated full short URL: {full_url}")
    return full_url