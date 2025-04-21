# backend/app/main.py
import json
import os
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
import redis
import logging
from contextlib import asynccontextmanager
from urllib.parse import urljoin # Needed again for inactive redirects

from . import crud, models, schemas, utils
from .database import engine, get_db, Base
from .cache import get_redis, DEFAULT_CACHE_TTL_SECONDS, redis_pool
from .models import LinkStatus # Re-add LinkStatus import
from .dependencies import get_current_user

# Import routers
from .routes_auth import router as auth_router
from .routes_links import router as links_router # Keep this include

# Configure basic logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- Get Frontend Base URL ---
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", os.getenv("DEV_PUBLIC_URL", "http://localhost:3000"))
logger.info(f"Using frontend base URL for inactive redirects: {FRONTEND_BASE_URL}")

# --- Check if running in test mode ---
IS_TESTING = os.getenv("TESTING", "false").lower() == "true"


# --- Constants ---
CACHE_KEY_PREFIX = "linkly:short_code:"

# --- Helper Function for Cache ---
def build_cache_key(short_code: str) -> str:
    return f"{CACHE_KEY_PREFIX}{short_code}"

# --- Lifespan for Startup/Shutdown ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup sequence initiated...")

    if not IS_TESTING:
        logger.info("Attempting to create database tables (if they don't exist)...")
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables check/creation complete.")
        except Exception as e_db:
            logger.error(f"CRITICAL: Error during initial 'create_all': {e_db}", exc_info=True)

        logger.info("Attempting to connect to Redis and PING...")
        redis_conn_check = None
        if redis_pool:
            try:
                redis_conn_check = redis.Redis(connection_pool=redis_pool)
                ping_response = redis_conn_check.ping()
                if ping_response:
                    logger.info("Redis PING successful, connection is healthy")
                else:
                    logger.warning("Redis PING returned false, connection may be unstable")
            except redis.exceptions.ConnectionError as e_redis_conn:
                logger.error(f"CRITICAL: Failed to connect to Redis on startup: {e_redis_conn}", exc_info=True)
                # Continue application startup even if Redis is unavailable
                logger.warning("Will continue application startup despite Redis connection failure")
            except Exception as e_redis_other:
                logger.error(f"CRITICAL: An unexpected error occurred during Redis PING: {e_redis_other}", exc_info=True)
                # Continue application startup even if Redis fails for unknown reasons
                logger.warning("Will continue application startup despite Redis error")
            finally:
                if redis_conn_check:
                    logger.debug("Cleaning up Redis connection check")
        else:
            logger.error("CRITICAL: Redis connection pool not available on startup.")
    else:
        logger.info("TESTING mode detected, skipping DB create_all and Redis PING during startup.")

    yield # Application runs here

    logger.info("Application shutdown sequence initiated...")


# --- Initialize FastAPI app ---
app = FastAPI(
    title="Linkly Backend API",
    description="API for creating and redirecting shortened URLs.",
    version="1.4.0", # Incremented version again
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# --- Include Routers ---
app.include_router(auth_router)
app.include_router(links_router) # Make sure this includes the updated routes_links

# --- Middleware for logging ---
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.debug(f"Request: {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        logger.debug(f"Response: {response.status_code}")
        return response
    except Exception as e:
        logger.exception(f"Unhandled exception during request: {request.method} {request.url.path}")
        raise e

# --- Health check endpoint ---
@app.get("/api/health", status_code=status.HTTP_200_OK, tags=["Health"])
def health_check():
    logger.debug("Health check endpoint called")
    return {"status": "ok", "message": "Linkly backend is healthy"}


# --- API Endpoints (defined directly in main.py) ---

@app.post("/api/shorten", response_model=schemas.URLShortenResponse, status_code=status.HTTP_201_CREATED, tags=["URLs"])
def shorten_url_endpoint(
    url_request: schemas.URLCreateRequest,
    db: Session = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
    current_user: models.User = Depends(get_current_user)
):
    """Creates a short URL for the given original URL."""
    logger.info(f"Received request to shorten URL: {url_request.url}")
    try:
        db_url = crud.create_short_url(db=db, url=url_request, owner_id=current_user.id)
    except ValueError as ve:
         logger.error(f"ValueError during URL shortening process: {ve}", exc_info=True)
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal error during shortening: {ve}")
    except Exception as e:
        if "UndefinedTable" in str(e):
             logger.error(f"Database table 'url_mappings' likely missing: {e}", exc_info=True)
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database table setup incomplete. Please check logs.")
        logger.error(f"Unexpected database error creating short URL: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create short URL due to a database error.")

    if not db_url.short_code:
         logger.error(f"Short code is None after creation for ID {db_url.id}.")
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate short code.")

    short_url = utils.generate_full_short_url(db_url.short_code)
    cache_key = build_cache_key(db_url.short_code)
    # Re-add status to cache data
    cache_data = json.dumps({"url": str(db_url.original_url), "status": db_url.status.value})

    logger.debug(f"Attempting to cache new entry: {cache_key} -> {cache_data}")
    try:
        cache.set(cache_key, cache_data, ex=DEFAULT_CACHE_TTL_SECONDS)
        logger.info(f"Successfully cached new entry: {cache_key}")
    except redis.RedisError as e:
        logger.error(f"Redis Error: Failed setting cache after creation for {cache_key}: {e}", exc_info=True)

    # Response schema now includes status again
    response_data = schemas.URLShortenResponse.model_validate({**db_url.__dict__, "short_url": short_url}, from_attributes=True)
    logger.info(f"Successfully shortened {url_request.url} to {short_url}")
    return response_data


@app.get("/api/links", response_model=schemas.URLListResponse, tags=["URLs"])
def read_links_endpoint(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Retrieves a list of recently shortened URLs for the current user."""
    logger.info(f"Request received for link history: skip={skip}, limit={limit}")
    try:
        # Consider filtering by status=ACTIVE in crud.get_all_urls if desired default
        db_links = crud.get_all_urls(db=db, skip=skip, limit=limit, owner_id=current_user.id)
    except Exception as e:
        if "UndefinedTable" in str(e):
             logger.error(f"Database table 'url_mappings' likely missing: {e}", exc_info=True)
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database table setup incomplete. Please check logs.")
        logger.error(f"Database error fetching links: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve link history.")

    link_infos = []
    for link in db_links:
        if link.short_code:
            try:
                short_url = utils.generate_full_short_url(link.short_code)
                # Schema includes status again
                link_info = schemas.URLMappingInfo.model_validate({**link.__dict__, "short_url": short_url}, from_attributes=True)
                link_infos.append(link_info)
            except Exception as e:
                 logger.error(f"Error processing link ID {link.id} for history: {e}", exc_info=True)
        else:
             logger.warning(f"Link with ID {link.id} found in history has no short_code.")

    return {"links": link_infos}


@app.get("/api/links/{short_code}", response_model=schemas.URLMappingInfo, tags=["URLs"])
def read_single_link_endpoint(
    short_code: str,
    db: Session = Depends(get_db)
):
    """Retrieves details for a single short code."""
    logger.debug(f"Request received for single link details: {short_code}")
    db_url = None
    try:
        db_url = crud.get_url_by_short_code(db=db, short_code=short_code)
    except Exception as e:
        if "UndefinedTable" in str(e):
             logger.error(f"Database table 'url_mappings' likely missing: {e}", exc_info=True)
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database table setup incomplete. Please check logs.")
        logger.error(f"DB error fetching single link {short_code}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error retrieving link details.")

    if db_url is None:
        logger.warning(f"Single link request: Short code {short_code} not found in DB.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short code not found")

    short_url = utils.generate_full_short_url(db_url.short_code)
    # Schema includes status again
    return schemas.URLMappingInfo.model_validate({**db_url.__dict__, "short_url": short_url}, from_attributes=True)


# PATCH /api/links/{short_code}/status is now defined in routes_links.py and included via router


@app.get(
    "/{short_code}",
    tags=["Redirection"],
    response_model=None # Keep as None or use Union[RedirectResponse, JSONResponse]
)
async def redirect_to_original_endpoint(
    short_code: str,
    db: Session = Depends(get_db),
    cache: redis.Redis = Depends(get_redis)
) -> RedirectResponse | JSONResponse: # Explicit union type hint
    """
    Redirects an active short code to its original URL (307).
    If inactive, redirects to a frontend page explaining the status (302).
    If not found, returns 404.
    """
    logger.debug(f"Redirect request received for short_code: {short_code}")
    cache_key = build_cache_key(short_code)
    original_url = None
    link_status = None
    db_url_for_increment = None

    # 1. Check Cache
    try:
        cached_data_str = cache.get(cache_key)
        if cached_data_str:
            logger.info(f"Cache hit for {short_code}.")
            try:
                cached_data = json.loads(cached_data_str)
                original_url = cached_data.get("url")
                status_str = cached_data.get("status") # Read status from cache
                link_status = LinkStatus(status_str) if status_str else None

                if not original_url or link_status is None:
                    logger.warning(f"Invalid data in cache for {short_code}. Treating as miss.")
                    original_url = None; link_status = None
                elif link_status == LinkStatus.INACTIVE:
                    # Redirect inactive link from cache
                    logger.warning(f"Redirecting inactive link (from cache) {short_code} to frontend info page.")
                    inactive_redirect_url = urljoin(FRONTEND_BASE_URL, f"/inactive?code={short_code}")
                    return RedirectResponse(url=inactive_redirect_url, status_code=status.HTTP_302_FOUND)

            except (json.JSONDecodeError, ValueError, TypeError) as e:
                logger.error(f"Error decoding cache for {short_code}: {e}. Treating as miss.", exc_info=True)
                original_url = None; link_status = None
                try: cache.delete(cache_key)
                except redis.RedisError: pass
        else:
            logger.info(f"Cache miss for {short_code}.")

    except redis.RedisError as e:
        logger.error(f"Redis Error getting cache for {cache_key}: {e}", exc_info=True)

    # 2. Cache Miss -> Check Database
    if original_url is None:
        logger.debug(f"Querying database for {short_code} after cache miss.")
        db_url = None
        try:
            db_url = crud.get_url_by_short_code(db=db, short_code=short_code)
        except Exception as e:
            if "UndefinedTable" in str(e):
                logger.error(f"Database table 'url_mappings' likely missing: {e}", exc_info=True)
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database table setup incomplete.")
            logger.error(f"DB error looking up {short_code}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error retrieving redirect info.")

        if db_url is None:
            logger.warning(f"Short code {short_code} not found in database.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short URL not found")

        original_url = str(db_url.original_url)
        link_status = db_url.status # Get status from DB object
        db_url_for_increment = db_url
        logger.info(f"DB hit for {short_code}. URL: {original_url}, Status: {link_status.value}")

        # 3. Validate DB result status
        if link_status == LinkStatus.INACTIVE:
            # Redirect inactive link from DB
            logger.warning(f"Redirecting inactive link (from DB) {short_code} to frontend info page.")
            inactive_redirect_url = urljoin(FRONTEND_BASE_URL, f"/inactive?code={short_code}")
            return RedirectResponse(url=inactive_redirect_url, status_code=status.HTTP_302_FOUND)

        # 4. Update Cache after DB hit (only if active)
        logger.debug(f"Attempting cache SET for {cache_key} after DB hit.")
        # Cache includes status again
        cache_data = json.dumps({"url": original_url, "status": link_status.value})
        try:
            cache.set(cache_key, cache_data, ex=DEFAULT_CACHE_TTL_SECONDS)
            logger.info(f"Successfully populated cache for {short_code} after DB hit.")
        except redis.RedisError as e:
            logger.error(f"Redis Error setting cache after DB hit for {cache_key}: {e}", exc_info=True)

    # --- If we reach here, the link is ACTIVE ---
    if not original_url:
        logger.error(f"Logic error: original_url is None before active redirect for {short_code}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to resolve original URL.")

    # 5. Increment visit count (only for active links that were successfully resolved)
    if db_url_for_increment is None: # If resolved via cache, need to fetch from DB for increment
        try:
            db_url_for_increment = crud.get_url_by_short_code(db=db, short_code=short_code)
        except Exception as e:
            logger.error(f"DB error fetching {short_code} for count increment: {e}", exc_info=True)
            db_url_for_increment = None

    # Ensure it's still active before incrementing (could have changed between cache read and now)
    if db_url_for_increment and db_url_for_increment.status == LinkStatus.ACTIVE:
        try:
            crud.increment_visit_count(db=db, db_url=db_url_for_increment)
            logger.debug(f"Incremented visit count for active link {short_code}.")
        except Exception as e:
            logger.error(f"Error during count increment for {short_code}: {e}", exc_info=True)
    else:
        logger.warning(f"Skipping count increment for {short_code} (Not found in DB for increment or status is not ACTIVE).")

    # 6. Perform The ACTUAL Redirect (for active links)
    logger.info(f"Performing redirect for active link: {short_code} -> {original_url}")
    return RedirectResponse(url=original_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
