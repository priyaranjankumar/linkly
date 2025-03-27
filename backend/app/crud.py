from sqlalchemy.orm import Session
from . import models, schemas, utils
import logging

logger = logging.getLogger(__name__) # Add logger instance
# --- Read Operations ---

def get_url_by_short_code(db: Session, short_code: str) -> models.URLMapping | None:
    """Fetches a URL mapping by its short code."""
    return db.query(models.URLMapping).filter(models.URLMapping.short_code == short_code).first()

def get_url_by_original_url(db: Session, original_url: str) -> models.URLMapping | None:
    """Fetches a URL mapping by its original URL (optional, for checking duplicates)."""
    return db.query(models.URLMapping).filter(models.URLMapping.original_url == original_url).first()

def get_all_urls(db: Session, skip: int = 0, limit: int = 100) -> list[models.URLMapping]:
    """Fetches a list of URL mappings, ordered by creation date descending."""
    return db.query(models.URLMapping).order_by(models.URLMapping.created_at.desc()).offset(skip).limit(limit).all()

def create_short_url(db: Session, url: schemas.URLCreateRequest) -> models.URLMapping:
    """Creates a new URL mapping entry in the database using flush."""
    # Create the ORM object instance
    db_url = models.URLMapping(original_url=str(url.url))

    # Add it to the session - it's now 'pending'
    db.add(db_url)

    # Flush the session to send the INSERT to the DB and get the ID generated.
    # Flushing does NOT commit the transaction.
    try:
        db.flush()
        # Refresh to get the auto-generated 'id' and server defaults like created_at
        # Necessary because the object's state doesn't automatically update after flush
        db.refresh(db_url)
    except Exception as e:
        db.rollback() # Rollback the transaction if flush or refresh fails
        logger.error(f"Database error during flush/refresh for {url.url}: {e}", exc_info=True)
        # Re-raise the exception to be caught by the endpoint handler
        raise ValueError(f"Failed to generate ID during flush: {e}") from e

    # Now db_url.id *should* be populated (if flush was successful)
    if db_url.id is None:
         # This indicates a problem with the DB setup or flush mechanism
         db.rollback()
         logger.error(f"Failed to get generated ID after flush for {url.url}.")
         raise ValueError("Failed to get generated ID after flush.")

    # Generate the short code based on the now available ID
    try:
        short_code = utils.encode_base62(db_url.id)
        db_url.short_code = short_code # Update the object attribute in the session
    except Exception as e:
        db.rollback()
        logger.error(f"Error encoding base62 for ID {db_url.id}: {e}", exc_info=True)
        raise ValueError(f"Failed during short code generation: {e}") from e

    # Commit the entire transaction
    # This persists the initial INSERT and the subsequent UPDATE to short_code
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database error during final commit for {url.url} (ID: {db_url.id}): {e}", exc_info=True)
        raise ValueError(f"Failed during final commit: {e}") from e

    # Optional: Refresh again to get the absolute final state from DB after commit
    # db.refresh(db_url)
    return db_url

def increment_visit_count(db: Session, db_url: models.URLMapping):
    """Increments the visit count for a given URL mapping."""
    db_url.visit_count += 1
    db.commit()
    # No need to refresh usually, unless the updated count is immediately needed
    # db.refresh(db_url)