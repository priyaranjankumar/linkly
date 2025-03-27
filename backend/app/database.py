import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv() # Load .env file variables into environment

# Construct the database URL from environment variables
# Fallback is provided but should rely on docker-compose env definition
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db/linklydb")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency function to inject DB session into route handlers
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()