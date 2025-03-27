import os
import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST", "cache") # Use service name from docker-compose
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

# Redis connection pool (consider async redis if using async db driver/endpoints)
redis_pool = redis.ConnectionPool(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)

# Dependency function to inject Redis connection
def get_redis():
    # In a real app, consider more robust connection handling / error checking
    return redis.Redis(connection_pool=redis_pool)

# Placeholder for user-defined TTL - Default to 1 hour (3600 seconds)
# [User to specify: Desired default cache TTL, e.g., '1 hour', '24 hours']
# Example: If user specifies '24 hours', set DEFAULT_CACHE_TTL_SECONDS = 86400 below
DEFAULT_CACHE_TTL_SECONDS = int(os.getenv("DEFAULT_CACHE_TTL_SECONDS", 3600))
