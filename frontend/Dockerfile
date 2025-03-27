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

# Copy built assets from the 'dist' directory of the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration file into the container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (standard HTTP port Nginx listens on)
EXPOSE 80

# Start Nginx in the foreground when the container launches
CMD ["nginx", "-g", "daemon off;"]