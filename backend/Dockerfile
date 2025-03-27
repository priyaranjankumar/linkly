# Stage 1: Build dependencies and Run Tests
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build tools needed for psycopg2 etc.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .

# Install runtime and test dependencies using wheels for efficiency
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# Install wheels now in the builder stage to run tests
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt

# Copy application code AND tests needed for the test run
COPY ./app ./app
COPY ./tests ./tests

# --- Run Tests ---
# Set PYTHONPATH to include the current directory (.) so 'from app...' works
# This command will run pytest. If tests fail, the docker build will stop.
RUN PYTHONPATH=. pytest tests

# If tests pass, builder stage is complete

# Stage 2: Production image (leaner)
FROM python:3.11-slim

WORKDIR /app

# Create a non-root user for security
RUN useradd --create-home appuser
# --- Add the user's local bin directory to the PATH ---
ENV PATH="/home/appuser/.local/bin:${PATH}"

USER appuser
# --- Corrected comment or remove comment ---
WORKDIR /home/appuser/app # Switch to user home directory

# Copy installed WHEELS from builder stage
COPY --from=builder /wheels /wheels
# Copy requirements.txt again to install only runtime dependencies
COPY requirements.txt .
# This pip install runs as 'appuser', placing executables in ~/.local/bin
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt

# Copy application code ONLY from builder stage (no tests needed in final image)
COPY --chown=appuser:appuser --from=builder /app/app ./app

# Expose port
EXPOSE 8000

# --- Use the correct full path in the user's local bin directory ---
CMD ["/home/appuser/.local/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]