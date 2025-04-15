# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create .env file with build-time variables
ARG VITE_API_URL
RUN echo "VITE_API_URL=${VITE_API_URL:-'http://annotation-backend:8000'}" > .env

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create a shell script for entrypoint
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'sed -i "s|__VITE_API_URL__|${VITE_API_URL:-http://annotation-backend:8000}|g" /usr/share/nginx/html/index.html' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Use explicit shell to run the entrypoint script
CMD ["/bin/sh", "/docker-entrypoint.sh"] 