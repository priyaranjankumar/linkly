# Linkly - Full-Stack URL Shortener

Linkly is a web application that allows registered users to shorten long URLs, manage their created links (activate/deactivate, delete), and view basic statistics like click counts. It features a React frontend and a FastAPI backend, containerized using Docker.

## Features

*   User Registration and Login (JWT-based authentication)
*   Shorten long URLs to unique short codes.
*   View history of created links, including:
    *   Original URL
    *   Short URL (clickable)
    *   QR Code for the short URL
    *   Visit count
    *   Creation date
    *   Current status (Active/Inactive)
*   Activate or Deactivate existing short links.
*   Delete short links (soft delete by marking as inactive).
*   Redirection from short URL to the original URL.
*   Display user email when logged in.

## Tech Stack

*   **Frontend:**
    *   React (Vite)
    *   Tailwind CSS
    *   Axios (for API calls)
    *   React Router
    *   `qrcode.react`
    *   `react-copy-to-clipboard`
*   **Backend:**
    *   Python 3.11+
    *   FastAPI
    *   SQLAlchemy (ORM)
    *   PostgreSQL (Database - inferred from typical FastAPI/SQLAlchemy setups)
    *   Redis (Caching)
    *   Uvicorn (ASGI Server)
    *   Passlib (Password Hashing)
    *   python-jose (JWT Handling)
    *   Pydantic (Data Validation)
*   **Infrastructure:**
    *   Docker & Docker Compose
    *   Nginx (Frontend static file serving & reverse proxy)

## Prerequisites

*   Docker Desktop or Docker Engine/CLI
*   Docker Compose
*   Git (for cloning)

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Create Environment File:**
    This project likely requires environment variables for configuration (database connection, secrets, etc.). Create a `.env` file in the project root directory. You might need to consult `docker-compose.yml` or backend configuration files (`app/config.py`, `app/database.py` if they exist, or `app/main.py`) for the exact variables needed. Common variables include:

    ```dotenv
    # backend/app/.env (or root .env, depending on setup)
    DATABASE_URL=postgresql://user:password@db:5432/linklydb
    REDIS_URL=redis://redis:6379/0
    SECRET_KEY=your_very_secret_key_here_please_change
    ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    FRONTEND_BASE_URL=http://localhost:3000 # Or your frontend domain

    # May also need these if not defined elsewhere, check docker-compose.yml
    # POSTGRES_USER=user
    # POSTGRES_PASSWORD=password
    # POSTGRES_DB=linklydb
    ```
    *Note: Ensure this `.env` file is added to your `.gitignore` and never committed.*

3.  **Build and Run with Docker Compose:**
    From the project root directory (where `docker-compose.yml` is located):
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Forces Docker to build the images using the Dockerfiles.
    *   `-d`: Runs the containers in detached mode (in the background).

## Running the Application

*   **Frontend:** Open your web browser and navigate to `http://localhost:3000` (or the port mapped in your `docker-compose.yml` for the frontend service).
*   **Backend API:** The API is likely accessible via `http://localhost:8000` (or the port mapped for the backend service).
*   **API Docs:** FastAPI automatically generates interactive API documentation, usually available at `http://localhost:8000/docs`.

## Key API Endpoints (Backend)

*   `POST /api/auth/register`: Register a new user.
*   `POST /api/auth/login`: Authenticate a user and receive a JWT token.
*   `POST /api/shorten`: Create a new short URL (requires authentication).
*   `GET /api/links`: Get the link history for the authenticated user.
*   `PATCH /api/links/{short_code}/status`: Update the status (Active/Inactive) of a link (requires authentication).
*   `DELETE /api/links/{short_code}`: Soft delete a link (marks as inactive) (requires authentication).
*   `GET /{short_code}`: Redirect to the original URL (or inactive page if status is Inactive).

## Project Structure

```
.
├── backend/              # FastAPI backend application
│   ├── app/              # Core application logic
│   │   ├── __init__.py
│   │   ├── auth.py         # Authentication logic
│   │   ├── cache.py        # Redis cache functions
│   │   ├── crud.py         # Database CRUD operations
│   │   ├── database.py     # Database setup & session
│   │   ├── dependencies.py # FastAPI dependencies (e.g., get_current_user)
│   │   ├── main.py         # FastAPI app creation & core routes
│   │   ├── models.py       # SQLAlchemy ORM models
│   │   ├── routes_auth.py  # Authentication specific routes
│   │   ├── routes_links.py # Link management specific routes
│   │   ├── schemas.py      # Pydantic schemas
│   │   └── utils.py        # Utility functions (e.g., short code generation)
│   ├── tests/            # Backend tests
│   └── Dockerfile        # Dockerfile for backend
│   └── requirements.txt  # Python dependencies
├── frontend/             # React frontend application
│   ├── public/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── context/      # React context (e.g., AuthContext)
│   │   ├── App.jsx       # Main application component
│   │   ├── index.css     # Global styles
│   │   └── main.jsx      # Application entry point
│   ├── .gitignore
│   ├── Dockerfile        # Dockerfile for frontend build & Nginx server
│   ├── index.html
│   ├── nginx.conf        # Nginx configuration
│   ├── package.json
│   ├── postcss.config.js # PostCSS config
│   ├── tailwind.config.js# Tailwind CSS config
│   └── vite.config.js    # Vite config
├── .gitignore
├── docker-compose.yml    # Docker Compose configuration
└── README.md             # This file
```
