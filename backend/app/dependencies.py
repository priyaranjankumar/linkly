# backend/app/dependencies.py
import os
import logging # Import logging
from fastapi import Depends, HTTPException, status
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from . import models
from .database import get_db
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Setup logger for this file
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Use environment variable for secret key
SECRET_KEY = os.getenv("SECRET_KEY", "your-default-secret-key-if-not-set")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    logger.debug(f"Attempting to get current user from token: {token[:10]}..." if token else "No token received") # Log start and partial token
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if SECRET_KEY == "your-default-secret-key-if-not-set":
        logger.warning("Using default SECRET_KEY for JWT. Set SECRET_KEY environment variable.")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        logger.debug(f"Token decoded successfully. Payload email (sub): {email}")
        if email is None:
            logger.warning("Token payload missing 'sub' (email).")
            raise credentials_exception
    except JWTError as e:
        logger.error(f"JWTError decoding token: {e}")
        raise credentials_exception from e
    except Exception as e:
        logger.error(f"An unexpected error occurred during token decoding: {e}", exc_info=True)
        raise credentials_exception from e

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        logger.warning(f"User with email '{email}' from token not found in database.")
        raise credentials_exception

    logger.debug(f"Successfully authenticated user: {user.email} (ID: {user.id})")
    return user
