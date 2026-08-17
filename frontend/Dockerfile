# ── React frontend — multi-stage build (Phase 8) ─────────────────────────
# Stage 1: compile static assets with Node.
# Stage 2: serve them from nginx:alpine on port 80.

# ── Build stage ──────────────────────────────────────────────────────────
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ── Runtime stage ────────────────────────────────────────────────────────
FROM nginx:alpine

# Reverse-proxy /api to the Node.js gateway container (browser only ever
# talks to same-origin relative URLs).
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
