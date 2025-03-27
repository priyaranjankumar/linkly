# Linkly - Modern URL Shortener

<div align="center">

![Linkly Logo](https://img.shields.io/badge/Linkly-URL%20Shortener-blue?style=for-the-badge&logo=link&logoColor=white)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

</div>

Linkly is a modern, full-stack URL shortener application that provides a simple way to create shortened links with powerful tracking and management capabilities. Built with FastAPI and React, it offers a clean, responsive interface with real-time feedback and performance-optimized backend operations.

## ✨ Features

- **Instant URL Shortening**: Transform long URLs into concise, shareable links
- **QR Code Generation**: Automatically generate scannable QR codes for each shortened URL
- **Click Tracking**: Monitor engagement with detailed visit counts
- **Link Management**: Toggle link status between active and inactive
- **Performance Optimized**:
  - Redis caching for high-speed redirects
  - PostgreSQL for reliable data persistence
  - Efficient base62 encoding algorithm
- **Responsive UI**: Clean, mobile-friendly interface built with React and TailwindCSS
- **Dockerized**: Easy deployment with Docker Compose
- **Production Ready**: Includes error handling, logging, and comprehensive testing

## 🏗️ Architecture

Linkly follows a modern microservices architecture:

```
┌─────────────┐      ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Database   │
│    React    │      │   FastAPI   │     │ PostgreSQL  │
└─────────────┘      └─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │    Cache    │
                    │    Redis    │
                    └─────────────┘
```

- **Frontend**: React application served via Nginx
- **Backend**: FastAPI application with SQLAlchemy ORM
- **Database**: PostgreSQL for persistent storage
- **Cache**: Redis for high-speed redirects and reduced database load

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/linkly.git
cd linkly
```

2. Create an `.env` file in the root directory:

```env
# PostgreSQL Configuration
POSTGRES_DB=linklydb
POSTGRES_USER=linklyuser
POSTGRES_PASSWORD=your_secure_password

# Redis Configuration
REDIS_HOST=cache
REDIS_PORT=6379

# Backend Configuration
DEV_PUBLIC_URL=http://localhost:3000
```

3. Start the application:

```bash
docker-compose up -d
```

4. Access the application:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

## 📋 Usage

### Shortening a URL

1. Enter a valid URL in the input field
2. Click "Shorten Now!"
3. Copy the generated short link or scan the QR code

### Managing Links

The history table displays all your shortened URLs with:

- Short link
- Original URL
- QR code
- Click count
- Status (Active/Inactive)
- Creation date

You can click on the status button to toggle a link between active and inactive.

## 🔌 API Endpoints

| Endpoint        | Method | Description                 |
| --------------- | ------ | --------------------------- |
| `/api/shorten`  | POST   | Create a shortened URL      |
| `/api/links`    | GET    | Retrieve all shortened URLs |
| `/{short_code}` | GET    | Redirect to original URL    |
| `/api/health`   | GET    | Check API health status     |

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
│   │   │   ├── LinkHistoryRow.jsx
│   │   │   ├── LinkHistoryTable.jsx
│   │   │   └── UrlShortenerForm.jsx
│   │   ├── App.jsx         # Main application component
│   │   ├── App.test.jsx    # Component tests
│   │   ├── index.css       # Global styles (Tailwind)
│   │   └── main.jsx        # Application entry point
│   ├── Dockerfile          # Frontend container config
│   ├── index.html          # HTML template
│   ├── nginx.conf          # Nginx configuration
│   ├── package.json        # npm dependencies
│   ├── tailwind.config.js  # Tailwind CSS config
│   └── vite.config.js      # Vite bundler config
│
├── .env                    # Environment variables
├── docker-compose.yml      # Services orchestration
└── README.md               # Project documentation
```

## ⚙️ Development

### Running in Development Mode

For local development without Docker:

#### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Testing

#### Backend Tests

```bash
cd backend
pytest
```

#### Frontend Tests

```bash
cd frontend
npm test
```

## 🔍 How It Works

1. **URL Shortening Process**:

   - User submits a URL through the frontend
   - Backend validates the URL format
   - A unique ID is generated in the database
   - The ID is encoded using Base62 to create a short code
   - The mapping between short code and original URL is stored

2. **Redirection Process**:
   - When a user visits a short URL, the system first checks Redis cache
   - If found in cache, it redirects immediately
   - If not in cache, it checks the database
   - On successful lookup, it caches the result and increments visit count
   - User is redirected to the original URL

## 📈 Performance Considerations

- **Caching Strategy**: Redis stores frequently accessed URLs to reduce database load
- **Database Indexing**: Optimized indexes on `short_code` for quick lookups
- **Efficient Encoding**: Base62 encoding creates compact, URL-safe short codes
- **Connection Pooling**: Both PostgreSQL and Redis use connection pooling
- **Response Optimization**: Uses HTTP 307 redirects for proper handling

## 🛡️ Security Considerations

- Non-root Docker users for enhanced container security
- Proper input validation using Pydantic schemas
- Environment-based configuration for sensitive information
- Containerized isolation between services

## 🌐 Deployment

### Production Considerations

For production deployment:

1. Update the `.env` file with production values
2. Set `PUBLIC_URL` to your domain name
3. Consider using a managed PostgreSQL and Redis service
4. Set up HTTPS with a proper certificate
5. Implement rate limiting for the API endpoints

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  Built with ❤️ using FastAPI, React, PostgreSQL, and Redis
</div>
