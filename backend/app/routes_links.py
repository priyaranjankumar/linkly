# backend/app/routes_links.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import redis # Import redis for RedisError and type hint
import logging # Import logging

# Use relative imports for modules within the same package
from . import crud, schemas, utils # Ensure utils is imported for generate_full_short_url
from .database import get_db
from .dependencies import get_current_user
from .models import User, LinkStatus # Import User and LinkStatus
from .cache import get_redis # Import cache dependency

# Setup logger for this file
logger = logging.getLogger(__name__)

# Define the router
router = APIRouter(
    prefix="/api/links",
    tags=["links"],
    responses={404: {"description": "Not found"}},
)

# Helper function (can also be imported from main or utils if centralized)
CACHE_KEY_PREFIX = "linkly:short_code:"
def build_cache_key(short_code: str) -> str:
    return f"{CACHE_KEY_PREFIX}{short_code}"

@router.patch("/{short_code}/status", response_model=schemas.URLMappingInfo, tags=["Links"])
def update_link_status_endpoint(
    short_code: str,
    status_update: schemas.URLStatusUpdateRequest,
    db: Session = Depends(get_db),
    cache: redis.Redis = Depends(get_redis), # Added cache dependency
    current_user: User = Depends(get_current_user)
):
    """Updates the status (Active/Inactive) of a short link owned by the current user."""
    logger.info(f"Request received to update status for {short_code} to {status_update.status.value} by user {current_user.id}")
    db_url = None
    try:
        db_url = crud.get_url_by_short_code(db=db, short_code=short_code)
    except Exception as e:
        logger.error(f"DB error fetching link {short_code} for status update: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error retrieving link for update.")

    if db_url is None:
        logger.warning(f"Status update failed: Short code {short_code} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short code not found")

    if db_url.owner_id != current_user.id:
        logger.warning(f"User {current_user.id} attempted to modify status of link {short_code} owned by {db_url.owner_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short code not found or permission denied")

    try:
        updated_db_url = crud.update_url_status(db=db, db_url=db_url, new_status=status_update.status)
    except ValueError as ve:
        logger.error(f"Error updating status for {short_code}: {ve}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not update status: {ve}")
    except Exception as e:
        logger.error(f"Unexpected error updating status for {short_code}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred while updating status.")

    # --- Add Cache Invalidation --- <<< MODIFIED
    cache_key = build_cache_key(short_code)
    try:
        deleted_count = cache.delete(cache_key)
        if deleted_count > 0:
            logger.info(f"Invalidated cache entry for {short_code} due to status update.")
        else:
            logger.debug(f"No cache entry found for {short_code} to invalidate during status update.")
    except redis.RedisError as e:
        logger.error(f"Redis Error: Failed deleting cache for {cache_key} after status update: {e}")
    # --- End Cache Invalidation ---

    short_url = utils.generate_full_short_url(updated_db_url.short_code)
    return schemas.URLMappingInfo.model_validate({**updated_db_url.__dict__, "short_url": short_url}, from_attributes=True)

@router.delete("/{short_code}", status_code=status.HTTP_204_NO_CONTENT, tags=["Links"])
def soft_delete_link_route(
    short_code: str,
    db: Session = Depends(get_db),
    cache: redis.Redis = Depends(get_redis), # Added cache dependency
    current_user: User = Depends(get_current_user)
):
    """Soft deletes (marks as inactive) a specific link owned by the current user."""
    logger.info(f"Request received to soft delete link with short_code: {short_code} by user {current_user.id}")
    link_to_delete = crud.get_url_by_short_code(db, short_code=short_code)

    if not link_to_delete:
        logger.warning(f"Soft delete failed: Short code {short_code} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    if link_to_delete.owner_id != current_user.id:
        logger.warning(f"User {current_user.id} attempted to delete link {short_code} owned by {link_to_delete.owner_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found or permission denied")

    if link_to_delete.status == LinkStatus.INACTIVE:
        logger.info(f"Link {short_code} is already inactive. No action taken.")
        return

    try:
        crud.update_url_status(db=db, db_url=link_to_delete, new_status=LinkStatus.INACTIVE)
        logger.info(f"Successfully marked link {short_code} as inactive.")
    except ValueError as e:
        logger.error(f"Error marking link {short_code} as inactive: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    # --- Add Cache Invalidation --- <<< MODIFIED
    cache_key = build_cache_key(short_code)
    try:
        deleted_count = cache.delete(cache_key)
        if deleted_count > 0:
            logger.info(f"Invalidated cache entry for {short_code} due to soft delete.")
        else:
             logger.debug(f"No cache entry found for {short_code} to invalidate during soft delete.")
    except redis.RedisError as e:
        logger.error(f"Redis Error: Failed deleting cache for {cache_key} after soft delete: {e}")
    # --- End Cache Invalidation ---

    return
