# backend/app/dependencies.py
import os
from fastapi import Depends, HTTPException, status
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from . import models # Changed to relative import
from .database import get_db # Changed to relative import
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Use environment variable for secret key
SECRET_KEY = os.getenv("SECRET_KEY", "your-default-secret-key-if-not-set")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if SECRET_KEY == "your-default-secret-key-if-not-set":
        # Log a warning if the default key is used - should be set via env
        print("WARNING: Using default SECRET_KEY for JWT. Set SECRET_KEY environment variable.")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        # Optional: Log this case? Could indicate deleted user with valid token
        raise credentials_exception
    return user
