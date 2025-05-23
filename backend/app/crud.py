# backend/app/crud.py
from sqlalchemy.orm import Session
from . import models, schemas, utils
from .models import LinkStatus # Import Enum
import logging

logger = logging.getLogger(__name__)

# --- Read Operations ---

def get_url_by_short_code(db: Session, short_code: str) -> models.URLMapping | None:
    """Fetches a URL mapping by its short code."""
    logger.debug(f"Querying DB for short_code: {short_code}")
    result = db.query(models.URLMapping).filter(models.URLMapping.short_code == short_code).first()
    if result:
        logger.debug(f"Found URL in DB for short_code {short_code}: ID {result.id}, Status {result.status}")
    else:
        logger.debug(f"No URL found in DB for short_code {short_code}")
    return result

def get_url_by_original_url(db: Session, original_url: str) -> models.URLMapping | None:
    """Fetches a URL mapping by its original URL (optional, for checking duplicates)."""
    return db.query(models.URLMapping).filter(models.URLMapping.original_url == original_url).first()

# Removed get_link_by_id

def get_all_urls(db: Session, skip: int = 0, limit: int = 100, owner_id: int = None) -> list[models.URLMapping]:
    """Fetches a list of URL mappings, ordered by creation date descending.
       By default, only fetches ACTIVE links, unless specifically requested otherwise (future enhancement maybe).
    """
    logger.debug(f"Querying DB for all URLs: skip={skip}, limit={limit}, owner_id={owner_id}")
    query = db.query(models.URLMapping)
    if owner_id is not None:
        query = query.filter(models.URLMapping.owner_id == owner_id)

    # Commonly, you might only want to show active links by default
    # query = query.filter(models.URLMapping.status == LinkStatus.ACTIVE)
    # Or allow filtering via parameter: def get_all_urls(..., status: Optional[LinkStatus] = LinkStatus.ACTIVE):
    # if status:
    #     query = query.filter(models.URLMapping.status == status)

    results = query.order_by(models.URLMapping.created_at.desc()).offset(skip).limit(limit).all()
    logger.debug(f"Retrieved {len(results)} URLs from DB.")
    return results

# --- Create Operation ---

def create_short_url(db: Session, url: schemas.URLCreateRequest, owner_id: int) -> models.URLMapping:
    """Creates a new URL mapping entry in the database using flush."""
    logger.info(f"Attempting to create short URL for: {url.url}")
    # Status defaults to ACTIVE based on the model definition
    db_url = models.URLMapping(original_url=str(url.url), owner_id=owner_id)
    db.add(db_url)

    try:
        db.flush() # Get ID
        db.refresh(db_url) # Load ID and defaults like created_at, status into the object
        logger.info(f"Flushed URL, got ID: {db_url.id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Database error during flush/refresh for {url.url}: {e}", exc_info=True)
        raise ValueError(f"Failed to generate ID during flush: {e}") from e

    if db_url.id is None:
         db.rollback()
         logger.error(f"Failed to get generated ID after flush for {url.url}.")
         raise ValueError("Failed to get generated ID after flush.")

    try:
        short_code = utils.encode_base62(db_url.id)
        db_url.short_code = short_code
        logger.info(f"Generated short_code {short_code} for ID {db_url.id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error encoding base62 for ID {db_url.id}: {e}", exc_info=True)
        raise ValueError(f"Failed during short code generation: {e}") from e

    try:
        db.commit() # Commit INSERT and UPDATE (short_code)
        logger.info(f"Committed new URL mapping: ID {db_url.id}, short_code {short_code}, Status: {db_url.status.value}")
    except Exception as e:
        db.rollback()
        logger.error(f"Database error during final commit for {url.url} (ID: {db_url.id}): {e}", exc_info=True)
        raise ValueError(f"Failed during final commit: {e}") from e

    return db_url

# --- Update Operations ---

def increment_visit_count(db: Session, db_url: models.URLMapping) -> models.URLMapping:
    """
    Increments the visit count for a given URL mapping and commits the change.
    Returns the updated object.
    """
    try:
        db_url.visit_count += 1
        db.commit()
        db.refresh(db_url)
        logger.debug(f"Incremented visit count for ID {db_url.id} (short_code {db_url.short_code}) to {db_url.visit_count}")
        return db_url
    except Exception as e:
        db.rollback()
        logger.error(f"Database error incrementing visit count for ID {db_url.id}: {e}", exc_info=True)
        raise ValueError(f"Failed to increment visit count: {e}") from e

# Re-add update_url_status function
def update_url_status(db: Session, db_url: models.URLMapping, new_status: LinkStatus) -> models.URLMapping:
    """Updates the status of a given URL mapping and commits the change."""
    logger.info(f"Attempting to update status for ID {db_url.id} (short_code {db_url.short_code}) to {new_status.value}")
    try:
        db_url.status = new_status
        db.commit()
        db.refresh(db_url) # Ensure the object reflects the committed state
        logger.info(f"Successfully updated status for ID {db_url.id} to {db_url.status.value}")
        return db_url
    except Exception as e:
        db.rollback()
        logger.error(f"Database error updating status for ID {db_url.id}: {e}", exc_info=True)
        raise ValueError(f"Failed to update status: {e}") from e

# Removed physical delete_link function
