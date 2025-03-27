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

/frontend/src/components/UrlShortenerForm.jsx

```jsx
import React, { useState } from "react";
import axios from "axios";
import { CopyToClipboard } from "react-copy-to-clipboard"; // Use this for easy copy

function UrlShortenerForm({ onNewUrl, apiBaseUrl }) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState(null); // Store the last successful result
  const [copied, setCopied] = useState(false); // State for copy feedback

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLastResult(null);
    setCopied(false); // Reset copied state on new submission

    if (!url.trim()) {
      setError("Please enter a URL.");
      return;
    }

    setIsLoading(true);

    try {
      // Use the correct endpoint path based on API_BASE_URL
      const response = await axios.post(`${apiBaseUrl}/shorten`, { url });

      if (response.status === 201 && response.data) {
        onNewUrl(response.data); // Notify parent (App.jsx)
        setLastResult(response.data); // Show result below the form
        setUrl(""); // Clear input field
      } else {
        // This case might not happen often with axios unless backend sends non-201 on success
        setError("Failed to shorten URL. Unexpected response status.");
      }
    } catch (err) {
      console.error("Shortening error:", err);
      if (err.response && err.response.data && err.response.data.detail) {
        // Handle FastAPI validation errors or specific error details
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          // Pydantic validation error format
          setError(
            `Invalid input: ${
              detail[0].loc ? detail[0].loc.join(".") + ": " : ""
            }${detail[0].msg}`
          );
        } else if (typeof detail === "string") {
          // Simple string error from HTTPException
          setError(detail);
        } else {
          setError("An unexpected error occurred during validation.");
        }
      } else if (err.request) {
        setError("Could not reach the server. Please check your connection.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Show "Copied!" for 2 seconds
  };

  return (
    <section className="mb-10 p-6 bg-gray-800 rounded-lg shadow-xl">
      {" "}
      {/* Increased shadow */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-center gap-4"
      >
        <label htmlFor="url-input" className="sr-only">
          Enter URL to shorten
        </label>
        <input
          id="url-input"
          type="url"
          placeholder="Enter the link here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          aria-required="true"
          aria-describedby={error ? "error-message" : undefined}
          className="flex-grow w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-100 placeholder-gray-400 text-lg" // Slightly larger text
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-semibold transition duration-200 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed text-lg" // Slightly larger text
        >
          {isLoading ? "Processing..." : "Shorten Now!"}
        </button>
      </form>
      {error && (
        <p
          id="error-message"
          role="alert"
          className="text-red-400 mt-3 text-sm"
        >
          {error}
        </p>
      )}
      {lastResult && (
        <div className="mt-5 p-4 bg-gray-700/50 rounded text-center border border-gray-600">
          <p className="text-gray-300 mb-2">Your shortened link:</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href={lastResult.short_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline break-all text-lg font-medium"
            >
              {/* Display the user-facing short URL nicely */}
              {lastResult.short_url.replace(/^https?:\/\//, "")}
            </a>
            <CopyToClipboard text={lastResult.short_url} onCopy={handleCopy}>
              <button
                title="Copy short link"
                className={`px-3 py-1 text-sm rounded ${
                  copied ? "bg-green-600" : "bg-gray-600 hover:bg-gray-500"
                } text-white transition-colors duration-150`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </CopyToClipboard>
          </div>
        </div>
      )}
    </section>
  );
}

export default UrlShortenerForm;
```

/frontend/src/components/LinkHistoryTable.jsx

```jsx
import React from "react";
import LinkHistoryRow from "./LinkHistoryRow";

function LinkHistoryTable({ links, loading, apiBaseUrl }) {
  return (
    <section className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
      <h2 className="text-xl font-semibold p-4 border-b border-gray-700 text-gray-200">
        Shortened URL History
      </h2>
      <div className="overflow-x-auto">
        {loading && (
          <p className="p-6 text-center text-gray-400">Loading history...</p>
        )}
        {!loading && links.length === 0 && (
          <p className="p-6 text-center text-gray-500">
            You haven't shortened any links yet.
          </p>
        )}
        {!loading && links.length > 0 && (
          <table className="w-full text-left text-sm table-auto">
            {" "}
            {/* Added table-auto for better column sizing */}
            <thead className="bg-gray-700 text-gray-400 uppercase tracking-wider text-xs">
              <tr>
                <th scope="col" className="px-5 py-3">
                  Short Link
                </th>
                <th scope="col" className="px-5 py-3">
                  Original Link
                </th>
                <th scope="col" className="px-5 py-3 text-center">
                  QR Code
                </th>
                <th scope="col" className="px-5 py-3 text-center">
                  Clicks
                </th>
                <th scope="col" className="px-5 py-3 text-center">
                  Status
                </th>
                <th scope="col" className="px-5 py-3">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 text-gray-300">
              {/* Render only a subset if list gets very long, or add pagination */}
              {links.slice(0, 50).map(
                (
                  link // Example: limit to 50 entries client-side
                ) => (
                  <LinkHistoryRow
                    key={link.id || link.short_code}
                    link={link}
                    apiBaseUrl={apiBaseUrl}
                  />
                )
              )}
            </tbody>
          </table>
        )}
      </div>
      {!loading && links.length > 50 && (
        <p className="p-4 text-center text-xs text-gray-500">
          Showing latest 50 entries.
        </p>
      )}
    </section>
  );
}

export default LinkHistoryTable;
```

/frontend/src/components/LinkHistoryRow.jsx

```jsx
import React, { useState } from "react";
import QRCode from "qrcode.react";
import { CopyToClipboard } from "react-copy-to-clipboard";

function LinkHistoryRow({ link }) {
  // Removed apiBaseUrl prop, assuming full URL in link object
  const [copied, setCopied] = useState(false);

  // Use the full short_url provided by the backend response
  const fullShortUrl = link.short_url;

  // Function to truncate long URLs for better display
  const truncateUrl = (url, startLength = 30, endLength = 15) => {
    if (!url || url.length <= startLength + endLength + 3) return url;
    // Keep start, add ellipsis, keep end
    return (
      url.substring(0, startLength) +
      "..." +
      url.substring(url.length - endLength)
    );
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500); // Feedback duration
  };

  // Format date nicely
  const formattedDate = link.created_at
    ? new Date(link.created_at).toLocaleDateString("en-CA") // YYYY-MM-DD format
    : "N/A";

  return (
    <tr className="hover:bg-gray-700/50 transition-colors duration-150 ease-in-out">
      {/* Short Link & Copy Button */}
      <td className="px-5 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <a
            href={fullShortUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Visit ${fullShortUrl}`}
            className="text-purple-400 hover:text-purple-300 hover:underline font-medium"
          >
            {/* Display relative path or just code */}
            {link.short_code || fullShortUrl?.split("/").pop()}
          </a>
          <CopyToClipboard text={fullShortUrl} onCopy={handleCopy}>
            <button
              title="Copy short link"
              className={`ml-1 px-2 py-0.5 text-xs rounded transition-colors duration-150 ${
                copied
                  ? "bg-green-600 text-white"
                  : "bg-gray-600 hover:bg-gray-500 text-gray-200"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </CopyToClipboard>
        </div>
      </td>

      {/* Original Link */}
      <td className="px-5 py-4 max-w-xs" title={link.original_url}>
        {" "}
        {/* Set max width */}
        <a
          href={link.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-200 transition duration-150 block overflow-hidden text-ellipsis whitespace-nowrap" // Style for truncation
        >
          {/* Use a utility or just display truncated */}
          {truncateUrl(link.original_url)}
        </a>
      </td>

      {/* QR Code */}
      <td className="px-5 py-4 text-center align-middle">
        <div className="inline-block p-1 bg-white rounded-sm shadow">
          {" "}
          {/* White background for QR */}
          <QRCode
            value={fullShortUrl}
            size={40} // Smaller size for table row
            level="L" // Lower error correction for smaller size
            renderAs="svg" // SVG is usually sharper
            // bgColor="#ffffff" // Background handled by wrapper div
            fgColor="#000000" // Standard black foreground
          />
        </div>
      </td>

      {/* Clicks */}
      <td className="px-5 py-4 text-center align-middle font-mono text-gray-300">
        {link.visit_count ?? 0}
      </td>

      {/* Status */}
      <td className="px-5 py-4 text-center align-middle">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
            link.status === "Active"
              ? "bg-green-200 text-green-800"
              : "bg-red-200 text-red-800"
          }`}
        >
          {link.status}
        </span>
      </td>

      {/* Date */}
      <td className="px-5 py-4 whitespace-nowrap text-gray-400">
        {formattedDate}
      </td>
    </tr>
  );
}

export default LinkHistoryRow;
```

/frontend/src/components/Header.jsx

```jsx
import React from "react";

function Header() {
  return (
    <header className="text-center mb-10">
      {" "}
      {/* Increased margin bottom */}
      <h1 className="text-5xl font-bold text-purple-400 mb-2 animate-pulse">
        {" "}
        {/* Slightly larger text, subtle pulse */}
        Linkly
      </h1>
      <p className="text-xl text-gray-400">
        {" "}
        {/* Slightly larger text */}
        Shorten Your Looooong Links :)
      </p>
    </header>
  );
}

export default Header;
```

/frontend/src/App.jsx

```jsx
import React from "react";

function Header() {
  return (
    <header className="text-center mb-10">
      {" "}
      {/* Increased margin bottom */}
      <h1 className="text-5xl font-bold text-purple-400 mb-2 animate-pulse">
        {" "}
        {/* Slightly larger text, subtle pulse */}
        Linkly
      </h1>
      <p className="text-xl text-gray-400">
        {" "}
        {/* Slightly larger text */}
        Shorten Your Looooong Links :)
      </p>
    </header>
  );
}

export default Header;
```

/frontend/src/App.test.jsx

```jsx
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import App from "./App";

// --- Mocks ---
vi.mock("axios"); // Mock the entire axios library

// Mock child components to isolate testing App.jsx logic
vi.mock("./components/Header", () => ({
  default: () => <header data-testid="mock-header">Linkly Header</header>,
}));

// Mock UrlShortenerForm, allowing us to trigger its callback `onNewUrl`
// We also check if apiBaseUrl prop is passed correctly
let triggerNewUrl; // Function to simulate form submission callback
vi.mock("./components/UrlShortenerForm", () => ({
  default: ({ onNewUrl, apiBaseUrl }) => {
    triggerNewUrl = onNewUrl; // Assign the callback for use in tests
    return (
      <form data-testid="mock-form">
        <p>API Base URL Prop: {apiBaseUrl}</p> {/* Check prop passing */}
        <button
          onClick={() =>
            triggerNewUrl &&
            triggerNewUrl({
              id: 99,
              short_url: "http://mock.co/new",
              short_code: "new",
              original_url: "https://newlyadded.com",
              status: "Active",
              created_at: new Date().toISOString(),
              visit_count: 0,
            })
          }
        >
          Simulate Shorten
        </button>
      </form>
    );
  },
}));

// Mock LinkHistoryTable to verify props passed down (links, loading)
vi.mock("./components/LinkHistoryTable", () => ({
  default: ({ links, loading, apiBaseUrl }) => (
    <div data-testid="mock-table">
      <p>History Loading: {loading ? "true" : "false"}</p>
      <p>API Base URL Prop (Table): {apiBaseUrl}</p> {/* Check prop passing */}
      <p>Link Count: {links.length}</p>
      {links.map((link) => (
        <div key={link.id}>Link: {link.original_url}</div>
      ))}
    </div>
  ),
}));

// Mock qrcode.react (might be needed if rendering fails in JSDOM)
vi.mock("qrcode.react", () => ({
  default: ({ value }) => (
    <canvas data-testid="mock-qrcode" data-value={value}></canvas>
  ),
}));

// Mock react-copy-to-clipboard
vi.mock("react-copy-to-clipboard", () => ({
  CopyToClipboard: ({ children }) => <div>{children}</div>, // Simple wrapper
}));

// --- Tests ---
describe("App Component", () => {
  const mockApiBaseUrl = "/api"; // Consistent with VITE_API_BASE_URL usage
  const initialLink = {
    id: 1,
    short_code: "abc",
    original_url: "https://google.com",
    short_url: "http://mock.co/abc",
    status: "Active",
    created_at: new Date().toISOString(),
    visit_count: 5,
  };

  beforeEach(() => {
    // Reset mocks and state before each test
    vi.resetAllMocks();
    triggerNewUrl = undefined; // Reset trigger function

    // Default mock for successful initial fetch
    axios.get.mockResolvedValue({
      data: { links: [initialLink] },
    });
  });

  it("renders header and passes correct API base URL to children", async () => {
    render(<App />);
    // Check header is rendered
    expect(screen.getByTestId("mock-header")).toBeInTheDocument();
    // Check API URL prop passed to form
    expect(
      screen.getByText(`API Base URL Prop: ${mockApiBaseUrl}`)
    ).toBeInTheDocument();
    // Check API URL prop passed to table (needs to wait for render)
    await waitFor(() => {
      expect(
        screen.getByText(`API Base URL Prop (Table): ${mockApiBaseUrl}`)
      ).toBeInTheDocument();
    });
  });

  it("fetches link history on initial load and displays it", async () => {
    render(<App />);

    // Check loading state is shown initially in the mocked table
    expect(screen.getByText("History Loading: true")).toBeInTheDocument();

    // Wait for the API call to resolve and links to be rendered
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(1);
      // Ensure the correct endpoint relative to the base URL is called
      expect(axios.get).toHaveBeenCalledWith(`${mockApiBaseUrl}/links`);
      // Check loading state is false after fetch
      expect(screen.getByText("History Loading: false")).toBeInTheDocument();
      // Check link count and content rendered by mock table
      expect(screen.getByText("Link Count: 1")).toBeInTheDocument();
      expect(
        screen.getByText(`Link: ${initialLink.original_url}`)
      ).toBeInTheDocument();
    });
  });

  it("displays an error message if fetching history fails", async () => {
    const errorMessage = "Network Error";
    axios.get.mockRejectedValueOnce(new Error(errorMessage)); // Simulate API error

    render(<App />);

    // Check loading state initially
    expect(screen.getByText("History Loading: true")).toBeInTheDocument();

    // Wait for the error message to be displayed
    await waitFor(() => {
      expect(
        screen.getByText(
          "Failed to fetch link history. Please try again later."
        )
      ).toBeInTheDocument();
      // Ensure loading state is false even on error
      expect(screen.getByText("History Loading: false")).toBeInTheDocument();
      // Ensure link count is 0 on error
      expect(screen.getByText("Link Count: 0")).toBeInTheDocument();
    });
  });

  it("adds a new link to the history when handleNewUrl is called", async () => {
    render(<App />);

    // Wait for initial load to complete
    await waitFor(() => {
      expect(
        screen.getByText(`Link: ${initialLink.original_url}`)
      ).toBeInTheDocument();
      expect(screen.getByText("Link Count: 1")).toBeInTheDocument();
    });

    // Simulate the UrlShortenerForm calling the onNewUrl callback
    const simulateButton = screen.getByRole("button", {
      name: /Simulate Shorten/i,
    });
    expect(triggerNewUrl).toBeDefined(); // Ensure the callback function was captured
    fireEvent.click(simulateButton); // This indirectly calls triggerNewUrl(newLinkData)

    // Wait for the App component's state to update and re-render the mock table
    await waitFor(() => {
      // Check that the new link is now displayed
      expect(
        screen.getByText("Link: https://newlyadded.com")
      ).toBeInTheDocument();
      // Check that the link count has increased
      expect(screen.getByText("Link Count: 2")).toBeInTheDocument();
      // Check if the old link is still there (prepended)
      expect(
        screen.getByText(`Link: ${initialLink.original_url}`)
      ).toBeInTheDocument();
    });
  });
});
```

/frontend/src/index.css

```css
/* Import Tailwind CSS directives */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Optional: Add custom base styles or component styles here */
body {
  @apply bg-gray-900 text-gray-200; /* Apply base dark theme */
}
```

/frontend/src/index.css

```css
/* Import Tailwind CSS directives */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Optional: Add custom base styles or component styles here */
body {
  @apply bg-gray-900 text-gray-200; /* Apply base dark theme */
}
```

/frontend/src/main.jsx

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css"; // Import Tailwind base styles

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

/frontend/src/Dockerfile

```dockerfile
# Stage 1: Build the React application and Run Tests
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for testing)
RUN npm install

# Copy the rest of the application code
COPY . .

# --- Run Tests ---
# This command runs the test script defined in package.json ('vitest').
# If tests fail, the docker build will stop here.
RUN npm test -- --reporter verbose

# --- Build Application (only if tests pass) ---
# Set API base URL (can be overridden via --build-arg in docker-compose)
# Use a relative path or path handled by proxy (like /api)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build the static assets
RUN npm run build


# Stage 2: Serve the application with Nginx (production stage)
FROM nginx:1.25-alpine

# Add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built assets from the 'dist' directory of the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration file into the container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create temporary directories and a custom Nginx configuration
RUN mkdir -p /tmp/nginx && \
    chown -R appuser:appgroup /tmp/nginx /var/cache/nginx /var/log/nginx /usr/share/nginx/html /etc/nginx && \
    # Create a custom main nginx.conf that uses a PID file in /tmp
    echo 'pid /tmp/nginx/nginx.pid;' > /etc/nginx/nginx.conf && \
    echo 'events { worker_connections 1024; }' >> /etc/nginx/nginx.conf && \
    echo 'http { include /etc/nginx/conf.d/*.conf; include /etc/nginx/mime.types; }' >> /etc/nginx/nginx.conf

# Switch to non-root user
USER appuser

# Expose port 80 (standard HTTP port Nginx listens on)
EXPOSE 80

# Start Nginx in the foreground when the container launches
CMD ["nginx", "-g", "daemon off;"]
```

/frontend/src/nginx.conf

```nginx
server {
    listen 80;
    server_name localhost; # Or your domain in production

    # Increase max body size if needed for other potential API calls
    client_max_body_size 1M;

    # Serve React static files (HTML, CSS, JS)
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html; # Handle SPA routing
    }

    # Proxy API requests starting with /api/ to the backend service
    location /api/ {
        # Use the backend service name defined in docker-compose.yml
        proxy_pass http://backend:8000/api/;

        # Set headers for the backend application
        proxy_set_header Host $host; # Forward original host header
        proxy_set_header X-Real-IP $remote_addr; # Forward client IP
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; # Forward proxy chain IPs
        proxy_set_header X-Forwarded-Proto $scheme; # Forward original scheme (http/https)

        # Optional: Increase timeouts if backend requests can be long
        # proxy_connect_timeout       60s;
        # proxy_send_timeout          60s;
        # proxy_read_timeout          60s;
    }

     # Proxy redirection requests (root paths matching potential short codes) to the backend
     # Adjust regex as needed based on your short code format (e.g., length, characters)
     location ~ ^/(\w+)$ {
        proxy_pass http://backend:8000/$1; # Pass the captured short code

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
     }

    # Optional: Add error pages
    # error_page 500 502 503 504 /50x.html;
    # location = /50x.html {
    #     root /usr/share/nginx/html;
    # }

    # Optional: Disable logging for static assets to reduce noise
    # location ~* \.(?:css|js|jpg|jpeg|gif|png|ico|svg)$ {
    #     access_log off;
    #     expires 1d; # Cache static assets in browser
    # }
}
```

/backend/app/cache.py

```python
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

```

/backend/app/crud.py

````python
from sqlalchemy.orm import Session
from . import models, schemas, utils
import logging

logger = logging.getLogger(__name__) # Add logger instance
# --- Read Operations ---

def get_url_by_short_code(db: Session, short_code: str) -> models.URLMapping | None:
    """Fetches a URL mapping by its short code."""
    return db.query(models.URLMapping).filter(models.URLMapping.short_code == short_code).first()

def get_url_by_original_url(db: Session, original_url: str) -> models.URLMapping | None:
    """Fetches a URL mapping by its original URL (optional, for checking duplicates)."""
    return db.query(models.URLMapping).filter(models.URLMapping.original_url == original_url).first()

def get_all_urls(db: Session, skip: int = 0, limit: int = 100) -> list[models.URLMapping]:
    """Fetches a list of URL mappings, ordered by creation date descending."""
    return db.query(models.URLMapping).order_by(models.URLMapping.created_at.desc()).offset(skip).limit(limit).all()

def create_short_url(db: Session, url: schemas.URLCreateRequest) -> models.URLMapping:
    """Creates a new URL mapping entry in the database using flush."""
    # Create the ORM object instance
    db_url = models.URLMapping(original_url=str(url.url))

    # Add it to the session - it's now 'pending'
    db.add(db_url)

    # Flush the session to send the INSERT to the DB and get the ID generated.
    # Flushing does NOT commit the transaction.
    try:
        db.flush()
        # Refresh to get the auto-generated 'id' and server defaults like created_at
        # Necessary because the object's state doesn't automatically update after flush
        db.refresh(db_url)
    except Exception as e:
        db.rollback() # Rollback the transaction if flush or refresh fails
        logger.error(f"Database error during flush/refresh for {url.url}: {e}", exc_info=True)
        # Re-raise the exception to be caught by the endpoint handler
        raise ValueError(f"Failed to generate ID during flush: {e}") from e

    # Now db_url.id *should* be populated (if flush was successful)
    if db_url.id is None:
         # This indicates a problem with the DB setup or flush mechanism
         db.rollback()
         logger.error(f"Failed to get generated ID after flush for {url.url}.")
         raise ValueError("Failed to get generated ID after flush.")

    # Generate the short code based on the now available ID
    try:
        short_code = utils.encode_base62(db_url.id)
        db_url.short_code = short_code # Update the object attribute in the session
    except Exception as e:
        db.rollback()
        logger.error(f"Error encoding base62 for ID {db_url.id}: {e}", exc_info=True)
        raise ValueError(f"Failed during short code generation: {e}") from e

    # Commit the entire transaction
    # This persists the initial INSERT and the subsequent UPDATE to short_code
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database error during final commit for {url.url} (ID: {db_url.id}): {e}", exc_info=True)
        raise ValueError(f"Failed during final commit: {e}") from e

    # Optional: Refresh again to get the absolute final state from DB after commit
    # db.refresh(db_url)
    return db_url

def increment_visit_count(db: Session, db_url: models.URLMapping):
    """Increments the visit count for a given URL mapping."""
    db_url.visit_count += 1
    db.commit()
    # No need to refresh usually, unless the updated count is immediately needed
    # db.refresh(db_url)
    ```
/backend/app/database.py
```python
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
        ```
/backend/app/main.py
```python
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
````

/backend/app/models.py

```python
# backend/app/models.py
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLAlchemyEnum # Ensure Integer is imported
from sqlalchemy.sql import func
from .database import Base
import enum

# Define possible statuses using Python Enum
class LinkStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"

# SQLAlchemy model for the URL mapping table
class URLMapping(Base):
    __tablename__ = "url_mappings"

    # Use Integer for ID - better compatibility with SQLite autoincrement in tests
    id = Column(Integer, primary_key=True, index=True)
    # Short code is generated after initial insertion based on ID
    short_code = Column(String, unique=True, index=True, nullable=True)
    original_url = Column(String, index=True, nullable=False)
    visit_count = Column(Integer, default=0, nullable=False)
    status = Column(SQLAlchemyEnum(LinkStatus), default=LinkStatus.ACTIVE, nullable=False)
    # Automatically set creation timestamp on the database side
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Optional: Automatically update timestamp on modification
    # updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

/backend/app/schemas.py

```python
from pydantic import BaseModel, HttpUrl, Field
from datetime import datetime
from typing import List, Optional
from .models import LinkStatus # Import the enum

# Schema for validating the incoming URL shortening request body
class URLCreateRequest(BaseModel):
    url: HttpUrl # Pydantic automatically validates if it's a valid HTTP/HTTPS URL

# Base schema for URL mapping data, used for inheritance
class URLMappingBase(BaseModel):
    original_url: HttpUrl
    short_code: Optional[str] = None # Short code might not exist initially

# Schema for the response returned after successfully creating a short URL
class URLShortenResponse(URLMappingBase):
    id: int
    visit_count: int
    status: LinkStatus
    created_at: datetime
    short_url: str # The full clickable short URL (e.g., http://localhost:3000/abc)

    # Pydantic V2 config
    class Config:
        from_attributes = True # Replaces orm_mode=True in Pydantic V2

# Schema used when retrieving details of a single link (can reuse URLShortenResponse)
class URLMappingInfo(URLShortenResponse):
    pass

# Schema for the API response returning a list of links for the history table
class URLListResponse(BaseModel):
    links: List[URLMappingInfo]
```

/backend/app/utils.py

```python
# backend/app/utils.py
import string
import os
from fastapi import Request # Ensure Request is imported if needed, though we might not use it now
import logging # Add logging

logger = logging.getLogger(__name__)

# Characters to use for base62 encoding
BASE62_CHARS = string.digits + string.ascii_letters # 0-9a-zA-Z
BASE = len(BASE62_CHARS)

def encode_base62(num: int) -> str:
    """Encodes a non-negative integer into a base62 string."""
    if num == 0:
        return BASE62_CHARS[0]
    if num < 0:
        raise ValueError("Cannot encode negative numbers.")

    encoded = ""
    while num > 0:
        num, rem = divmod(num, BASE)
        encoded = BASE62_CHARS[rem] + encoded
    return encoded

# --- NEW VERSION ---
def generate_full_short_url(short_code: str) -> str:
    """
    Generates the full clickable short URL using environment variables.
    Prioritizes PUBLIC_URL (for production), then DEV_PUBLIC_URL (for local dev).
    """
    # 1. Use PUBLIC_URL if defined (for production)
    base_url = os.getenv("PUBLIC_URL")

    # 2. Fallback to DEV_PUBLIC_URL if PUBLIC_URL is not set (for local dev)
    if not base_url:
        base_url = os.getenv("DEV_PUBLIC_URL")

    # 3. If neither is set, log a warning and use a sensible default (or raise error)
    if not base_url:
        default_local_url = "http://localhost:3000" # Default for local setup
        logger.warning(
            f"Neither PUBLIC_URL nor DEV_PUBLIC_URL environment variables are set. "
            f"Falling back to default '{default_local_url}'. Set DEV_PUBLIC_URL in your .env file for local development."
        )
        base_url = default_local_url
        # Alternatively, raise an error if you want to force configuration:
        # raise ValueError("Missing required environment variable: PUBLIC_URL or DEV_PUBLIC_URL")

    # Ensure base_url ends with a slash
    if not base_url.endswith('/'):
        base_url += '/'

    # Append the short code
    full_url = f"{base_url}{short_code}"
    logger.debug(f"Generated full short URL: {full_url}")
    return full_url
```

/backend/Dockerfile

```dockerfile
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
```

/backend/tests/test_main.py

```python
# backend/tests/test_main.py

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import logging
import fakeredis # <<< IMPORT FAKEREDIS

# Adjust imports if your structure differs
from app.main import app, get_db
# --- Import get_redis dependency ---
from app.cache import get_redis
from app.database import Base
from app.models import LinkStatus # Import LinkStatus

# Configure basic logging for tests
logging.basicConfig(level=logging.DEBUG) # Use DEBUG to see more info
logger = logging.getLogger(__name__)

# --- Database Setup for Testing ---
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:" # Use in-memory SQLite

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}, # Required for SQLite
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables once for all tests
@pytest.fixture(scope="session", autouse=True)
def setup_database():
    logger.info("Setting up test database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Test database schema setup complete.")
    yield
    # Optional: Base.metadata.drop_all(bind=engine) if needed

# --- Dependency Overrides ---
def override_get_db():
    """Dependency override for test database sessions."""
    database = None
    try:
        # logger.debug("Creating test DB session.") # Can add if needed
        database = TestingSessionLocal()
        yield database
    finally:
        if database:
            # logger.debug("Closing test DB session.") # Can add if needed
            database.close()

# --- Override Redis with FakeRedis ---
@pytest.fixture(scope="session") # Use session scope for fake redis instance
def fake_redis_server():
    # Use FakeServer for a more complete simulation if needed,
    # or just FakeStrictRedis for simpler cases.
    logger.debug("Creating FakeRedis server.")
    server = fakeredis.FakeServer()
    return server

# This fixture depends on fake_redis_server and overrides get_redis
# It needs to be defined *before* app.dependency_overrides uses it
# or used implicitly via pytest's dependency injection mechanism if applied later
@pytest.fixture
def override_redis_dependency(fake_redis_server: fakeredis.FakeServer):
    """Fixture to override the get_redis dependency for the duration of a test."""
    def override_get_redis_with_fake():
        # Create a new fake client connected to the fake server for each test
        # decode_responses=True matches the setting in the real cache.py
        client = fakeredis.FakeStrictRedis(server=fake_redis_server, decode_responses=True)
        # Ensure the client is flushed before each test function
        client.flushall()
        logger.debug("Providing FakeRedis client.")
        try:
            yield client
        finally:
            client.flushall() # Optional: Clear after test

    original_override = app.dependency_overrides.get(get_redis)
    app.dependency_overrides[get_redis] = override_get_redis_with_fake
    yield # Let the test run with the override
    # Restore original override or remove it after the test
    if original_override:
        app.dependency_overrides[get_redis] = original_override
    else:
        del app.dependency_overrides[get_redis]


# Apply the DB override globally
app.dependency_overrides[get_db] = override_get_db

# --- Test Client ---
@pytest.fixture
def client(override_redis_dependency): # <<< Make client depend on the redis override fixture
     # Now the override_redis_dependency fixture ensures Redis is mocked before client is created
     logger.debug("--- Registered Routes Before Test ---")
     route_list = []
     for route in app.routes:
         route_info = f"Path: {route.path}, Name: {getattr(route, 'name', 'N/A')}, Methods: {getattr(route, 'methods', None)}"
         route_list.append(route_info)
         logger.debug(route_info)
     logger.debug("-----------------------------------")
     # Basic check if the route path exists at all
     if not any("/api/health" in r for r in route_list):
         logger.error("CRITICAL: /api/health route path not found in registered routes!")

     yield TestClient(app)


# --- Test Functions ---

def test_health_check(client):
    logger.debug("--- Running test_health_check ---")
    request_path = "/api/health"
    logger.debug(f"Requesting path: {request_path}")
    response = client.get(request_path)
    logger.debug(f"Health check response status: {response.status_code}")
    logger.debug(f"Health check response body: {response.text}")
    assert response.status_code == 200 # Expect 200
    assert response.json() == {"status": "ok", "message": "Linkly backend is healthy"} # Ensure assertion matches actual response

# --- Updated Test ---
def test_shorten_url_success(client):
    logger.debug("--- Running test_shorten_url_success ---")
    test_url = "https://www.google.com/"
    response = client.post("/api/shorten", json={"url": test_url})
    logger.debug(f"Shorten response status: {response.status_code}")
    logger.debug(f"Shorten response body: {response.text}") # Log body to see generated URL
    assert response.status_code == 201
    data = response.json()
    assert data["original_url"] == test_url
    assert "short_code" in data
    assert isinstance(data["short_code"], str) and len(data["short_code"]) > 0
    assert data["status"] == LinkStatus.ACTIVE.value
    assert "short_url" in data
    assert data["short_code"] in data["short_url"]
    # --- UPDATE ASSERTION HERE ---
    # Expect the fallback URL from utils.py since .env is not loaded during build
    expected_base_url = "http://localhost:3000"
    assert data["short_url"].startswith(expected_base_url), f"Expected URL to start with {expected_base_url} but got {data['short_url']}"
    logger.info("test_shorten_url_success passed assertions.")


def test_redirect_success(client):
    logger.debug("--- Running test_redirect_success ---")
    test_url = "https://www.example.com/path?query=1"
    # 1. Create a link
    create_response = client.post("/api/shorten", json={"url": test_url})
    assert create_response.status_code == 201, f"Failed to create link: {create_response.text}"
    short_code = create_response.json()["short_code"]
    assert short_code is not None

    # 2. Attempt redirect (mocked Redis should be checked by the endpoint now)
    logger.debug(f"Attempting redirect for short code: {short_code}")
    redirect_response = client.get(f"/{short_code}", follow_redirects=False)
    logger.debug(f"Redirect response status: {redirect_response.status_code}")
    logger.debug(f"Redirect response headers: {redirect_response.headers}")
    assert redirect_response.status_code == 307
    assert redirect_response.headers["location"] == test_url

def test_shorten_invalid_url(client):
    response = client.post("/api/shorten", json={"url": "not-a-valid-url"})
    assert response.status_code == 422

def test_shorten_missing_url_payload(client):
    response = client.post("/api/shorten", json={})
    assert response.status_code == 422

def test_redirect_not_found(client):
    response = client.get("/nonexistentcode123", follow_redirects=False)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
```
