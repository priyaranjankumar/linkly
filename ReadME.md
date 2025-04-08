# Linkly - URL Shortener

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://www.docker.com/)

Linkly is a full-stack URL shortening service built with **FastAPI** (Python) for the backend and **React** (JavaScript) for the frontend. It is containerized using **Docker Compose** and includes features like link history, click counts, QR codes, Redis caching, and active/inactive link status management.

---

## ✨ Features

- **URL Shortening:** Convert long URLs into compact short links.
- **Redirection:** Short links redirect users to the original URL.
- **Link History:** View a table of previously shortened links.
- **QR Code Generation:** Automatically generates a QR code for each short link.
- **Click Tracking:** Counts how many times each short link is visited.
- **Link Status Management:**
  - Activate or deactivate links directly from the history table UI.
  - Inactive links will not redirect to the original URL.
- **Inactive Link Handling:** Clicking an inactive short link redirects the user to an informative page on the frontend.
- **Caching:** Utilizes Redis to cache redirects for faster performance.
- **Dockerized:** Easy setup and deployment using Docker and Docker Compose.
- **API Documentation:** Interactive API docs available via Swagger UI (`/api/docs`).

---

## 💻 Technology Stack

### Backend:

- **FastAPI** (Python 3.11)
- **SQLAlchemy** (ORM) with PostgreSQL adapter (`psycopg2-binary`)
- **Pydantic** (Data Validation)
- **Uvicorn** (ASGI Server)
- **Redis** (`redis-py`) (Caching)
- **Pytest** (Testing)

### Frontend:

- **React 18**
- **Vite** (Build Tool)
- **Tailwind CSS** (Styling)
- **Axios** (HTTP Client)
- **react-router-dom** (Routing)
- **qrcode.react** (QR Code Component)
- **Vitest** (Testing)

### Infrastructure:

- **Database:** PostgreSQL
- **Cache:** Redis
- **Web Server/Proxy:** Nginx (serving frontend static files and proxying API/redirects)
- **Containerization:** Docker, Docker Compose

---

## 📁 Project Structure

```
linkly/
├── backend/                # FastAPI backend service
│   ├── app/                # Application code
│   │   ├── __init__.py
│   │   ├── cache.py        # Redis connection and caching
│   │   ├── crud.py         # Database operations
│   │   ├── database.py     # Database connection
│   │   ├── main.py         # FastAPI application
│   │   ├── models.py       # SQLAlchemy models
│   │   ├── schemas.py      # Pydantic schemas
│   │   └── utils.py        # Utility functions
│   ├── tests/              # Backend tests
│   ├── Dockerfile          # Backend container config
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # React frontend service
│   ├── public/             # Static assets
│   ├── src/                # React source code
│   │   ├── components/     # UI components
│   │   │   ├── Header.jsx
│   │   │   ├── InactiveLinkPage.jsx # Page for inactive links
│   │   │   ├── LinkHistoryRow.jsx   # Includes toggle button
│   │   │   ├── LinkHistoryTable.jsx
│   │   │   └── UrlShortenerForm.jsx
│   │   ├── App.jsx         # Main application component with Routing
│   │   ├── App.test.jsx    # Component tests
│   │   ├── index.css       # Global styles (Tailwind)
│   │   └── main.jsx        # Application entry point with Router
│   ├── Dockerfile          # Frontend container config
│   ├── index.html          # HTML template
│   ├── nginx.conf          # Nginx configuration (updated)
│   ├── package.json        # npm dependencies
│   ├── tailwind.config.js  # Tailwind CSS config
│   └── vite.config.js      # Vite bundler config
│
├── .env                    # Environment variables (DATABASE CREDS HERE)
├── docker-compose.yml      # Services orchestration (updated)
└── README.md               # Project documentation (This file)
```

---

## 🚀 Setup and Running

**Prerequisites:**

- Docker Desktop (or Docker Engine + Docker Compose) installed.
- Git (to clone the repository).

**Steps:**

1. **Clone the Repository:**

   ```bash
   git clone <your-repository-url>
   cd linkly
   ```

2. **Create Environment File:**
   Create a `.env` file in the project's root directory (`linkly/`). Copy the contents from the example below and **replace the placeholder values** with your desired database credentials.

   ```dotenv
   # .env (in project root)

   # PostgreSQL Credentials - REQUIRED
   POSTGRES_USER=your_db_user       # Replace with your desired username
   POSTGRES_PASSWORD=your_db_password # Replace with a strong password
   POSTGRES_DB=linklydb           # Replace with your desired database name

   # Optional: Specify Redis port if not default 6379
   # REDIS_PORT=6379
   ```

   _Note: Other variables like `DEV_PUBLIC_URL` and `FRONTEND_BASE_URL` are now set directly in `docker-compose.yml` for convenience in local development._

3. **Build and Run Services:**
   Open a terminal in the project's root directory (`linkly/`) and run:

   ```bash
   # Build images (runs tests) and start containers in detached mode
   # Use --no-cache for the very first build or after major changes
   docker compose build --no-cache
   docker compose up -d
   ```

   This command will:

   - Build the Docker images for the `frontend` and `backend` services (running tests during the build process).
   - Pull the official images for `postgres` and `redis`.
   - Create and start containers for all services defined in `docker-compose.yml`.
   - Create the necessary Docker network and volumes.

4. **Access the Application:**

   - **Frontend:** Open your web browser and navigate to `http://localhost:3000`.
   - **Backend API Docs (Swagger UI):** Navigate to `http://localhost:8000/api/docs`.

5. **Stopping the Application:**
   To stop and remove the containers, network, and volumes (optional for volumes), run:
   ```bash
   docker compose down
   # Add -v to remove volumes (database/cache data will be lost)
   # docker compose down -v
   ```

---

## ⚙️ Environment Variables

- **`.env` File (Required):**
  - `POSTGRES_USER`: Username for the PostgreSQL database.
  - `POSTGRES_PASSWORD`: Password for the PostgreSQL user.
  - `POSTGRES_DB`: Name of the PostgreSQL database to use.
- **`docker-compose.yml` (Set Directly):**
  - `DATABASE_URL` (Backend): Constructed automatically from `.env` variables and service names.
  - `REDIS_HOST` (Backend): Set to the name of the Redis service (`cache`).
  - `REDIS_PORT` (Backend): Port for Redis (defaults to 6379).
  - `DEFAULT_CACHE_TTL_SECONDS` (Backend): Cache expiry time in seconds.
  - `DEV_PUBLIC_URL` (Backend): Base URL used by the backend to generate full short links (`http://localhost:3000` for local dev).
  - `FRONTEND_BASE_URL` (Backend): Base URL of the frontend app, used for redirecting inactive links (`http://localhost:3000` for local dev).
  - `VITE_API_BASE_URL` (Frontend Build Arg): Relative path for API requests, proxied by Nginx (`/api`).

---

## 🔗 API Endpoints (Primary)

- `POST /api/shorten`: Creates a new short URL.
  - Body: `{ "url": "string (valid URL)" }`
- `GET /api/links`: Retrieves a list of shortened URL history.
- `GET /api/links/{short_code}`: Retrieves details for a single short code.
- `PATCH /api/links/{short_code}/status`: Updates the status (Active/Inactive) of a link.
  - Body: `{ "status": "Active" | "Inactive" }`
- `GET /{short_code}`: Redirects to the original URL (if active) or the frontend inactive page (if inactive).
- `GET /api/health`: Health check endpoint for the backend service.

_(See `http://localhost:8000/api/docs` for full interactive documentation)_

---

## ✅ Running Tests

- **Backend:** Tests (`pytest`) are automatically executed during the `docker compose build` process for the `backend` service. If tests fail, the build will stop.
- **Frontend:** Tests (`vitest`) are automatically executed during the `docker compose build` process for the `frontend` service. If tests fail, the build will stop.
  - To run frontend tests manually:
    ```bash
    cd frontend
    npm test
    ```

---

## 🔮 Potential Improvements / TODO

- User Authentication/Authorization (associate links with users).
- Custom short code aliases.
- Link expiration dates.
- More detailed analytics (timestamps, referrers, etc.).
- Edit original URL functionality.
- Error handling improvements on the frontend.
- Pagination for link history.
- More comprehensive testing.
- Deployment configuration examples (e.g., using Traefik/Caddy, managed DB/Redis).
