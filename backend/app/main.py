# backend/app/main.py

from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import redis
import logging
# Import contextlib for lifespan
from contextlib import asynccontextmanager

# Import components from the current application package
from . import crud, models, schemas, utils
# Import engine directly and get_db dependency function
from .database import engine, get_db, Base
# Import Redis dependency and TTL setting
from .cache import get_redis, DEFAULT_CACHE_TTL_SECONDS

# Configure basic logging - SET TO DEBUG FOR TROUBLESHOOTING
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s' # Added format
)
logger = logging.getLogger(__name__)
logger.info("Logger configured at DEBUG level.") # Confirm logging starts

# --- IMPORTANT: Ensure create_all is NOT called at module level ---
# models.Base.metadata.create_all(bind=engine) # <<< MUST BE COMMENTED OUT HERE


# --- Define the lifespan context manager for startup/shutdown events ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown events.
    Creates database tables and checks Redis connection on startup.
    """
    # Code here runs BEFORE the application starts receiving requests
    logger.info("Application startup sequence initiated...")

    # --- Verify DB Table Creation ---
    logger.info("Attempting to create database tables (if they don't exist)...")
    try:
        # Create tables using the engine imported from database.py
        models.Base.metadata.create_all(bind=engine)
        logger.info("Database tables check/creation complete.")
    except Exception as e_db:
        logger.error(f"CRITICAL: Error creating database tables on startup: {e_db}", exc_info=True)
        # raise e_db # Optionally re-raise

    # --- Verify Redis Connection --- ### THIS SECTION WAS MISSING ###
    logger.info("Attempting to connect to Redis and PING...")
    redis_conn_check = None
    try:
        # Get a connection using the dependency function
        redis_conn_check = get_redis()
        # Execute PING command
        ping_response = redis_conn_check.ping()
        if ping_response:
            logger.info(f"Redis connection successful (PING response: {ping_response})")
        else:
            logger.error("Redis PING command returned an unexpected non-true value.")
    except redis.exceptions.ConnectionError as e_redis_conn:
        logger.error(f"CRITICAL: Failed to connect to Redis on startup: {e_redis_conn}", exc_info=True)
        # raise e_redis_conn # Optionally re-raise
    except Exception as e_redis_other:
        logger.error(f"CRITICAL: An unexpected error occurred during Redis PING: {e_redis_other}", exc_info=True)
        # raise e_redis_other # Optionally re-raise
    finally:
        # No explicit close needed for pool connections generally
        pass
    # --- END OF REDIS CHECK --- ###

    yield # Application runs here

    # --- Shutdown ---
    logger.info("Application shutdown sequence initiated...")


# --- Initialize FastAPI app ---
# Register the lifespan context manager
app = FastAPI(
    title="Linkly Backend API",
    description="API for creating and redirecting shortened URLs.",
    version="1.0.0",
    lifespan=lifespan, # Register the lifespan context manager
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# --- Health check endpoint ---
@app.get("/api/health", status_code=status.HTTP_200_OK, tags=["Health"])
def health_check():
    """Basic health check endpoint to verify service is running."""
    logger.debug("Health check endpoint called") # Now visible due to DEBUG level
    return {"status": "ok", "message": "Linkly backend is healthy"}


# --- API Endpoints ---

@app.post("/api/shorten", response_model=schemas.URLShortenResponse, status_code=status.HTTP_201_CREATED, tags=["URLs"])
def shorten_url_endpoint(
    request: Request,
    url_request: schemas.URLCreateRequest,
    db: Session = Depends(get_db),
    cache: redis.Redis = Depends(get_redis) # Get cache dependency
):
    """
    Creates a short URL for the given original URL.

    - **url**: The original URL to shorten (must be a valid HTTP/HTTPS URL).
    """
    logger.info(f"Received request to shorten URL: {url_request.url}")
    try:
        db_url = crud.create_short_url(db=db, url=url_request)
    except ValueError as ve:
         logger.error(f"ValueError during URL shortening process: {ve}", exc_info=True)
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal error during shortening: {ve}")
    except Exception as e:
        logger.error(f"Unexpected database error creating short URL: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create short URL due to a database error.")

    if not db_url.short_code:
         logger.error(f"Short code is None after creation for ID {db_url.id}. This should not happen.")
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate short code.")

    short_url = utils.generate_full_short_url(db_url.short_code)
    cache_key = f"linkly:short_code:{db_url.short_code}"
    logger.info(f"Attempting to cache: {cache_key} -> {db_url.original_url}") # Log before attempt
    try:
        cache.set(cache_key, db_url.original_url, ex=DEFAULT_CACHE_TTL_SECONDS)
        logger.info(f"Successfully cached new entry: {cache_key}") # Log success
    except redis.RedisError as e:
        logger.error(f"Redis Error: Failed setting cache after creation for {cache_key}: {e}", exc_info=True)

    response_data = schemas.URLShortenResponse.from_orm({**db_url.__dict__, "short_url": short_url})
    logger.info(f"Successfully shortened {url_request.url} to {short_url}")
    return response_data


@app.get("/api/links", response_model=schemas.URLListResponse, tags=["URLs"])
def read_links_endpoint(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Retrieves a list of recently shortened URLs (for history display).

    - **skip**: Number of records to skip (for pagination).
    - **limit**: Maximum number of records to return.
    """
    logger.info(f"Request received for link history: skip={skip}, limit={limit}")
    try:
        db_links = crud.get_all_urls(db=db, skip=skip, limit=limit)
        logger.info(f"Retrieved {len(db_links)} links from database.")
    except Exception as e:
        logger.error(f"Database error fetching links: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve link history.")

    link_infos = []
    for link in db_links:
        if link.short_code: # Ensure short_code exists before generating URL
            try:
                short_url = utils.generate_full_short_url(link.short_code)
                link_infos.append(schemas.URLMappingInfo.from_orm({**link.__dict__, "short_url": short_url}))
            except Exception as e:
                 logger.error(f"Error processing link ID {link.id} for history: {e}", exc_info=True)
        else:
             logger.warning(f"Link with ID {link.id} found in history has no short_code.")

    return {"links": link_infos}


@app.get("/{short_code}", status_code=status.HTTP_307_TEMPORARY_REDIRECT, tags=["Redirection"])
def redirect_to_original_endpoint(
    short_code: str,
    request: Request, # For logging or potential future use
    db: Session = Depends(get_db),
    cache: redis.Redis = Depends(get_redis) # Get cache dependency
):
    """
    Redirects a valid and active short code to its original URL.
    Implements Cache-Aside pattern and increments the visit count.
    """
    logger.debug(f"Redirect request received for short_code: {short_code}") # Now visible
    original_url = None
    cache_key = f"linkly:short_code:{short_code}"
    logger.debug(f"Attempting cache GET for key: {cache_key}") # Log before attempt

    # 1. Check Cache
    try:
        original_url = cache.get(cache_key)
        if original_url:
            logger.info(f"Cache hit for {short_code}. Value: {original_url}")
            # ... (rest of cache hit logic) ...
            return RedirectResponse(url=original_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    except redis.RedisError as e:
        logger.error(f"Redis Error: Failed getting cache for {cache_key}: {e}", exc_info=True)

    logger.info(f"Cache miss for {short_code}. Querying database.")
    # 2. Cache Miss -> Check Database
    try:
        db_url = crud.get_url_by_short_code(db=db, short_code=short_code)
    except Exception as e:
        logger.error(f"Database error looking up short code {short_code}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error retrieving redirect information.")

    # 3. Validate DB result
    if db_url is None or db_url.status != models.LinkStatus.ACTIVE:
        logger.warning(f"Short URL not found in DB or inactive: {short_code}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short URL not found or is inactive")

    original_url = db_url.original_url
    logger.info(f"Database hit for {short_code}. Original URL: {original_url}")

    # 4. Update Cache after DB hit
    logger.info(f"Attempting cache SET for key {cache_key} after DB hit.") # Log before attempt
    try:
        cache.set(cache_key, original_url, ex=DEFAULT_CACHE_TTL_SECONDS)
        logger.info(f"Successfully populated cache for {short_code} after DB hit.") # Log success
    except redis.RedisError as e:
        logger.error(f"Redis Error: Failed setting cache after DB hit for {cache_key}: {e}", exc_info=True)

    # 5. Increment visit count
    try:
        crud.increment_visit_count(db=db, db_url=db_url)
        logger.debug(f"Incremented visit count for {short_code}.") # Now visible
    except Exception as e:
         logger.error(f"Database error incrementing count for {short_code}: {e}", exc_info=True)

    # 6. Perform Redirect
    logger.info(f"Performing redirect: {short_code} -> {original_url}")
    return RedirectResponse(url=original_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)