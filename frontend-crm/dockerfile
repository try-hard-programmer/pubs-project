# Builder: build Vite (WITHOUT runtime credentials)
FROM node:22 AS builder
WORKDIR /app

# Build with placeholder values (will be replaced at runtime)
ENV VITE_SUPABASE_URL=__SUPABASE_URL_PLACEHOLDER__ \
    VITE_SUPABASE_PUBLISHABLE_KEY=__SUPABASE_KEY_PLACEHOLDER__ \
    VITE_SUPABASE_PROJECT_ID=__SUPABASE_PROJECT_ID_PLACEHOLDER__ \
    VITE_AGENT_API_URL=__AGENT_API_URL_PLACEHOLDER__

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime: Nginx serve dist with runtime env injection
FROM nginx:1.25-alpine

# Install bash for entrypoint script
RUN apk add --no-cache bash

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set entrypoint to inject runtime config
ENTRYPOINT ["/entrypoint.sh"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
