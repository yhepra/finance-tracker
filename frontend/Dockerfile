# ============================================
# Stage 1: Build
# ============================================
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Build args for environment variables at build time
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

# Build the production bundle
RUN npm run build

# ============================================
# Stage 2: Serve with Nginx
# ============================================
FROM nginx:alpine AS runtime

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose the frontend port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
